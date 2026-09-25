// =========================================================================
// HamaraGhar — Professional 2D Architectural CAD Blueprint Renderer
// Renders technical architectural floor plans directly from the Canonical
// HouseModel with high precision, interactive room selection, dimensioning,
// door swings, windows, stairs, balconies, and parking.
// =========================================================================

export class FloorPlan2DRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.model = null;
        this.activeFloorIndex = 0;
        this.selectedRoomId = null;
        this.hoveredRoomId = null;
        this.activeTool = 'select'; // 'select', 'room', 'wall', 'door', 'window', 'stairs', 'furniture', 'measure'

        this.scale = 10; // pixels per foot
        this.offsetX = 50;
        this.offsetY = 50;
        this.showDimensions = true;
        this.showGrid = true;
        this.showFurniture = true;
        this.showLabels = true;

        // Interactive dragging & resizing state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isDraggingRoom = false;
        this.draggedRoom = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.activeResizeHandle = null;

        // Callbacks
        this.onRoomSelected = options.onRoomSelected || null;
        this.onModelChanged = options.onModelChanged || null;

        this._setupEvents();
    }

    setModel(model, floorIndex = 0) {
        this.model = model;
        this.activeFloorIndex = floorIndex;
        this.fitToView();
        this.render();
    }

    setFloor(floorIndex) {
        this.activeFloorIndex = floorIndex;
        this.render();
    }

    setSelectedRoom(roomId) {
        this.selectedRoomId = roomId;
        this.render();
    }

    setTool(tool) {
        this.activeTool = tool;
        if (this.canvas) {
            this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
        }
    }

    toggleDimensions(show) {
        this.showDimensions = (show !== undefined) ? show : !this.showDimensions;
        this.render();
    }

    toggleFurniture(show) {
        this.showFurniture = (show !== undefined) ? show : !this.showFurniture;
        this.render();
    }

    toggleLabels(show) {
        this.showLabels = (show !== undefined) ? show : !this.showLabels;
        this.render();
    }

    fitToView() {
        if (!this.canvas || !this.model) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = (rect.width || 600) * dpr;
        this.canvas.height = (rect.height || 500) * dpr;
        this.ctx.scale(dpr, dpr);

        const plotW = this.model.plot?.width || 40.0;
        const plotL = this.model.plot?.length || 50.0;
        const padX = 80;
        const padY = 80;
        const availW = rect.width - padX;
        const availH = rect.height - padY;

        this.scale = Math.max(6, Math.min(availW / plotW, availH / plotL, 16));
        this.offsetX = Math.round((rect.width - plotW * this.scale) / 2);
        this.offsetY = Math.round((rect.height - plotL * this.scale) / 2);
    }

    _setupEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

        window.addEventListener('resize', () => {
            this.fitToView();
            this.render();
        });
    }

    _getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    _toFeet(pt) {
        return {
            x: (pt.x - this.offsetX) / this.scale,
            y: (pt.y - this.offsetY) / this.scale
        };
    }

    _toPixels(ftPt) {
        return {
            x: this.offsetX + ftPt.x * this.scale,
            y: this.offsetY + ftPt.y * this.scale
        };
    }

    _getActiveFloor() {
        if (!this.model || !this.model.floors) return null;
        return this.model.floors.find(f => f.index === this.activeFloorIndex) || this.model.floors[0];
    }

    _onMouseDown(e) {
        const pt = this._getCanvasCoords(e);
        const ft = this._toFeet(pt);
        const floor = this._getActiveFloor();
        if (!floor) return;

        // Middle click or space+click for panning
        if (e.button === 1 || e.altKey) {
            this.isPanning = true;
            this.panStartX = pt.x - this.offsetX;
            this.panStartY = pt.y - this.offsetY;
            return;
        }

        // Room selection or interactive placement
        const hitRoom = this._hitTestRoom(floor.rooms, ft.x, ft.y);

        if (this.activeTool === 'select') {
            if (hitRoom) {
                this.selectedRoomId = hitRoom.id;
                this.isDraggingRoom = true;
                this.draggedRoom = hitRoom;
                this.dragStartX = ft.x - hitRoom.bounds.x;
                this.dragStartY = ft.y - hitRoom.bounds.y;

                if (this.onRoomSelected) {
                    this.onRoomSelected(hitRoom.id, hitRoom);
                }
            } else {
                this.selectedRoomId = null;
                if (this.onRoomSelected) {
                    this.onRoomSelected(null, null);
                }
            }
            this.render();
        } else if (this.activeTool === 'door') {
            // Add a door at clicked position
            if (hitRoom) {
                const newDoor = {
                    id: `door-f${this.activeFloorIndex}-${Date.now().toString().slice(-4)}`,
                    position: { x: Math.round(ft.x * 2) / 2, y: Math.round(ft.y * 2) / 2 },
                    widthFt: 3.0,
                    heightFt: 7.0,
                    swing: 'inward',
                    roomId: hitRoom.id,
                    floorIndex: this.activeFloorIndex,
                    orientation: 'horizontal'
                };
                floor.doors = floor.doors || [];
                floor.doors.push(newDoor);
                if (this.onModelChanged) this.onModelChanged(this.model, 'add_door');
                this.render();
            }
        } else if (this.activeTool === 'window') {
            // Add a window at clicked position
            if (hitRoom) {
                const newWindow = {
                    id: `window-f${this.activeFloorIndex}-${Date.now().toString().slice(-4)}`,
                    position: { x: Math.round(ft.x * 2) / 2, y: Math.round(ft.y * 2) / 2 },
                    widthFt: 4.0,
                    heightFt: 4.5,
                    sillHeightFt: 3.0,
                    wall: 'north',
                    roomId: hitRoom.id,
                    floorIndex: this.activeFloorIndex
                };
                floor.windows = floor.windows || [];
                floor.windows.push(newWindow);
                if (this.onModelChanged) this.onModelChanged(this.model, 'add_window');
                this.render();
            }
        }
    }

    _onMouseMove(e) {
        const pt = this._getCanvasCoords(e);

        if (this.isPanning) {
            this.offsetX = pt.x - this.panStartX;
            this.offsetY = pt.y - this.panStartY;
            this.render();
            return;
        }

        const ft = this._toFeet(pt);
        const floor = this._getActiveFloor();
        if (!floor) return;

        if (this.isDraggingRoom && this.draggedRoom) {
            // Snap to 0.5 ft grid
            const newX = Math.round((ft.x - this.dragStartX) * 2) / 2;
            const newY = Math.round((ft.y - this.dragStartY) * 2) / 2;
            this.draggedRoom.bounds.x = Math.max(this.model.plot.setbacks.sideLeft, newX);
            this.draggedRoom.bounds.y = Math.max(this.model.plot.setbacks.front, newY);
            if (this.onModelChanged) this.onModelChanged(this.model, 'update_room');
            this.render();
            return;
        }

        // Hover test
        const hitRoom = this._hitTestRoom(floor.rooms, ft.x, ft.y);
        const newHover = hitRoom ? hitRoom.id : null;
        if (newHover !== this.hoveredRoomId) {
            this.hoveredRoomId = newHover;
            this.render();
        }
    }

    _onMouseUp() {
        this.isPanning = false;
        this.isDraggingRoom = false;
        this.draggedRoom = null;
    }

    _onWheel(e) {
        e.preventDefault();
        const pt = this._getCanvasCoords(e);
        const prevFt = this._toFeet(pt);

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale = Math.max(4, Math.min(this.scale * zoomFactor, 32));

        // Keep cursor point invariant
        this.offsetX = pt.x - prevFt.x * this.scale;
        this.offsetY = pt.y - prevFt.y * this.scale;
        this.render();
    }

    _hitTestRoom(rooms, fx, fy) {
        if (!rooms) return null;
        for (let i = rooms.length - 1; i >= 0; i--) {
            const r = rooms[i];
            const b = r.bounds;
            if (fx >= b.x && fx <= b.x + b.width && fy >= b.y && fy <= b.y + b.height) {
                return r;
            }
        }
        return null;
    }

    // =========================================================================
    // RENDERING PIPELINE
    // =========================================================================

    render() {
        if (!this.canvas || !this.ctx) return;
        const rect = this.canvas.getBoundingClientRect();
        const ctx = this.ctx;

        // Clear Canvas
        ctx.fillStyle = '#0f172a'; // Deep slate architectural CAD background
        ctx.fillRect(0, 0, rect.width, rect.height);

        if (!this.model) return;

        const floor = this._getActiveFloor();
        if (!floor) return;

        // 1. Grid
        if (this.showGrid) this._drawGrid(ctx, rect);

        // 2. Plot Boundary & Setback Envelope
        this._drawPlotAndSetbacks(ctx);

        // 3. Site Elements (Driveway, Garden, Parking Bay)
        if (floor.index === 0) {
            this._drawSiteElements(ctx);
        }

        // 4. Floor Slab & Rooms Fill
        this._drawRooms(ctx, floor.rooms || []);

        // 5. Architectural Walls (Perimeter & Partitions)
        this._drawWalls(ctx, floor.walls || [], floor.rooms || []);

        // 6. Doors (Openings & Swing Arcs)
        this._drawDoors(ctx, floor.doors || []);

        // 7. Windows (CAD Glazing Symbol)
        this._drawWindows(ctx, floor.windows || []);

        // 8. Stairs
        this._drawStairs(ctx, floor.stairs || []);

        // 9. Balconies & Railings
        this._drawBalconies(ctx, floor.balconies || []);

        // 10. Furniture
        if (this.showFurniture) {
            this._drawFurniture(ctx, floor.furniture || []);
        }

        // 11. Dimension Extension Lines
        if (this.showDimensions) {
            this._drawDimensions(ctx, floor.rooms || []);
        }

        // 12. Compass & Scale Indicator
        this._drawCompass(ctx, rect);
    }

    _drawGrid(ctx, rect) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        const gridStep = Math.max(15, this.scale * 2); // 2-foot grid lines

        for (let x = this.offsetX % gridStep; x < rect.width; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }
        for (let y = this.offsetY % gridStep; y < rect.height; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawPlotAndSetbacks(ctx) {
        const plot = this.model.plot;
        if (!plot) return;

        const px = this.offsetX;
        const py = this.offsetY;
        const pw = plot.width * this.scale;
        const pl = plot.length * this.scale;

        // Plot Boundary (dashed goldenrod/amber line)
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(px, py, pw, pl);

        // Plot Dimensions Label
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`PLOT BOUNDARY: ${plot.width}'0" × ${plot.length}'0" (${plot.area.toLocaleString()} sq.ft)`, px + 8, py - 8);

        // Buildable Envelope (Inside Setbacks)
        const sb = plot.setbacks || { front: 5, rear: 4, sideLeft: 3, sideRight: 3 };
        const envX = px + sb.sideLeft * this.scale;
        const envY = py + sb.front * this.scale;
        const envW = (plot.width - sb.sideLeft - sb.sideRight) * this.scale;
        const envH = (plot.length - sb.front - sb.rear) * this.scale;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(envX, envY, envW, envH);
        ctx.restore();
    }

    _drawSiteElements(ctx) {
        const plot = this.model.plot;
        const sb = plot.setbacks;
        const px = this.offsetX;
        const py = this.offsetY;

        // Front Garden Zone
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // Soft architectural green
        ctx.fillRect(px, py, plot.width * this.scale, sb.front * this.scale);

        // Driveway Pavers
        const driveW = Math.min(14, plot.width * 0.32) * this.scale;
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
        ctx.fillRect(px, py, driveW, sb.front * this.scale);

        // Trees / Shrubs
        const trees = this.model.site?.trees || [];
        trees.forEach(t => {
            const tx = px + t.x * this.scale;
            const ty = py + t.y * this.scale;
            const tr = (t.radiusFt || 2.5) * this.scale;

            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.beginPath();
            ctx.arc(tx, ty, tr, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#047857';
            ctx.beginPath();
            ctx.arc(tx, ty, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    _drawRooms(ctx, rooms) {
        rooms.forEach(r => {
            const rx = this.offsetX + r.bounds.x * this.scale;
            const ry = this.offsetY + r.bounds.y * this.scale;
            const rw = r.bounds.width * this.scale;
            const rh = r.bounds.height * this.scale;

            const isSelected = (r.id === this.selectedRoomId);
            const isHovered = (r.id === this.hoveredRoomId);

            ctx.save();

            // Room Floor Fill
            ctx.fillStyle = r.color || '#1e3a5f';
            ctx.globalAlpha = isSelected ? 0.65 : (isHovered ? 0.50 : 0.35);
            ctx.fillRect(rx, ry, rw, rh);

            // Selection Accent Border
            if (isSelected) {
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = '#38bdf8'; // Electric blue selection border
                ctx.lineWidth = 3.5;
                ctx.strokeRect(rx - 1, ry - 1, rw + 2, rh + 2);
            } else if (isHovered) {
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2.0;
                ctx.strokeRect(rx, ry, rw, rh);
            }

            // Room Typography & Dimensions
            if (this.showLabels) {
                ctx.globalAlpha = 1.0;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Room Name
                ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
                ctx.font = `bold ${Math.max(10, Math.min(13, Math.round(this.scale * 1.0)))}px "DM Sans", Inter, sans-serif`;
                ctx.fillText(r.name.toUpperCase(), rx + rw / 2, ry + rh / 2 - 8);

                // Dimension Text (e.g. 14' × 12')
                ctx.fillStyle = '#94a3b8';
                ctx.font = `${Math.max(9, Math.min(11, Math.round(this.scale * 0.85)))}px "JetBrains Mono", monospace`;
                ctx.fillText(`${r.bounds.width}'0" × ${r.bounds.height}'0"`, rx + rw / 2, ry + rh / 2 + 7);

                // Area Text (e.g. 168 sq.ft)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.font = '9px "JetBrains Mono", monospace';
                ctx.fillText(`${r.areaSqFt} sq.ft`, rx + rw / 2, ry + rh / 2 + 20);
            }

            ctx.restore();
        });
    }

    _drawWalls(ctx, walls, rooms) {
        ctx.save();
        ctx.lineCap = 'square';

        if (walls && walls.length > 0) {
            walls.forEach(w => {
                const sx = this.offsetX + w.start.x * this.scale;
                const sy = this.offsetY + w.start.y * this.scale;
                const ex = this.offsetX + w.end.x * this.scale;
                const ey = this.offsetY + w.end.y * this.scale;
                const isExt = (w.type === 'exterior');

                ctx.strokeStyle = isExt ? '#f8fafc' : '#cbd5e1';
                ctx.lineWidth = Math.max(2, (w.thicknessFt || (isExt ? 0.75 : 0.38)) * this.scale);

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            });
        } else {
            // Draw room wall outlines if discrete walls array is empty
            rooms.forEach(r => {
                const rx = this.offsetX + r.bounds.x * this.scale;
                const ry = this.offsetY + r.bounds.y * this.scale;
                const rw = r.bounds.width * this.scale;
                const rh = r.bounds.height * this.scale;

                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(rx, ry, rw, rh);
            });
        }

        ctx.restore();
    }

    _drawDoors(ctx, doors) {
        ctx.save();
        doors.forEach(d => {
            const dx = this.offsetX + d.position.x * this.scale;
            const dy = this.offsetY + d.position.y * this.scale;
            const dw = (d.widthFt || 3.0) * this.scale;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;

            // Clear wall opening gap
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + dw, dy);
            ctx.stroke();

            // Door leaf
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + dw * 0.85, dy - dw * 0.5);
            ctx.stroke();

            // Swing Arc (dashed)
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.arc(dx, dy, dw, 0, -Math.PI / 3, true);
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawWindows(ctx, windows) {
        ctx.save();
        windows.forEach(w => {
            const wx = this.offsetX + w.position.x * this.scale;
            const wy = this.offsetY + w.position.y * this.scale;
            const ww = (w.widthFt || 4.0) * this.scale;

            // Double line CAD architectural window
            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;

            if (w.wall === 'north' || w.wall === 'south') {
                ctx.fillRect(wx - ww / 2, wy - 3, ww, 6);
                ctx.strokeRect(wx - ww / 2, wy - 3, ww, 6);
                ctx.beginPath();
                ctx.moveTo(wx - ww / 2, wy);
                ctx.lineTo(wx + ww / 2, wy);
                ctx.stroke();
            } else {
                ctx.fillRect(wx - 3, wy - ww / 2, 6, ww);
                ctx.strokeRect(wx - 3, wy - ww / 2, 6, ww);
                ctx.beginPath();
                ctx.moveTo(wx, wy - ww / 2);
                ctx.lineTo(wx, wy + ww / 2);
                ctx.stroke();
            }
        });
        ctx.restore();
    }

    _drawStairs(ctx, stairs) {
        ctx.save();
        stairs.forEach(st => {
            const sx = this.offsetX + st.position.x * this.scale;
            const sy = this.offsetY + st.position.y * this.scale;
            const sw = st.widthFt * this.scale;
            const sl = st.lengthFt * this.scale;
            const steps = st.stepCount || 14;

            // Stairwell outline
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(sx, sy, sw, sl);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx, sy, sw, sl);

            // Step Treads
            const stepH = sl / steps;
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            for (let i = 1; i < steps; i++) {
                ctx.beginPath();
                ctx.moveTo(sx, sy + i * stepH);
                ctx.lineTo(sx + sw, sy + i * stepH);
                ctx.stroke();
            }

            // Direction Arrow
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx + sw / 2, sy + sl - 10);
            ctx.lineTo(sx + sw / 2, sy + 15);
            ctx.lineTo(sx + sw / 2 - 5, sy + 25);
            ctx.moveTo(sx + sw / 2, sy + 15);
            ctx.lineTo(sx + sw / 2 + 5, sy + 25);
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('UP', sx + sw / 2, sy + sl - 14);
        });
        ctx.restore();
    }

    _drawBalconies(ctx, balconies) {
        ctx.save();
        balconies.forEach(b => {
            const bx = this.offsetX + b.bounds.x * this.scale;
            const by = this.offsetY + b.bounds.y * this.scale;
            const bw = b.bounds.width * this.scale;
            const bh = b.bounds.height * this.scale;

            // Balcony Railing Pattern (Double line with cross-hatch)
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(bx, by, bw, bh);
        });
        ctx.restore();
    }

    _drawFurniture(ctx, furniture) {
        ctx.save();
        furniture.forEach(f => {
            const fx = this.offsetX + f.position.x * this.scale;
            const fy = this.offsetY + f.position.y * this.scale;
            const fw = f.size.width * this.scale;
            const fl = f.size.length * this.scale;

            ctx.save();
            ctx.translate(fx + fw / 2, fy + fl / 2);
            if (f.rotationDeg) ctx.rotate((f.rotationDeg * Math.PI) / 180);

            if (f.type === 'bed') {
                // Bed frame
                ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.25;
                ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
                ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
                // Pillows
                ctx.fillStyle = '#ffffff';
                const pilW = fw * 0.35;
                const pilL = fl * 0.22;
                ctx.fillRect(-fw / 2 + 4, -fl / 2 + 4, pilW, pilL);
                ctx.fillRect(fw / 2 - pilW - 4, -fl / 2 + 4, pilW, pilL);
            } else if (f.type === 'sofa') {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.25;
                ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
                ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
            } else if (f.type === 'vehicle_car') {
                // Car schematic in parking bay
                ctx.fillStyle = 'rgba(71, 85, 105, 0.4)';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                // Car chassis
                ctx.beginPath();
                ctx.roundRect(-fw / 2, -fl / 2, fw, fl, 6);
                ctx.fill();
                ctx.stroke();
                // Windshield
                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(-fw / 2 + 4, -fl * 0.2);
                ctx.lineTo(fw / 2 - 4, -fl * 0.2);
                ctx.stroke();
            } else {
                // Generic furniture footprint
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
                ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
            }

            ctx.restore();
        });
        ctx.restore();
    }

    _drawDimensions(ctx, rooms) {
        if (!rooms || rooms.length === 0) return;
        const plot = this.model.plot;
        const px = this.offsetX;
        const py = this.offsetY;
        const pw = plot.width * this.scale;
        const pl = plot.length * this.scale;

        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.font = '10px "JetBrains Mono", monospace';

        // Top Exterior Dimension Line (Frontage)
        const dimY = py - 24;
        ctx.beginPath();
        ctx.moveTo(px, dimY);
        ctx.lineTo(px + pw, dimY);
        ctx.stroke();
        // End ticks
        ctx.beginPath();
        ctx.moveTo(px, dimY - 4); ctx.lineTo(px, dimY + 4);
        ctx.moveTo(px + pw, dimY - 4); ctx.lineTo(px + pw, dimY + 4);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillText(`${plot.width}'0" FRONTAGE`, px + pw / 2, dimY - 6);

        // Left Exterior Dimension Line (Depth)
        const dimX = px - 24;
        ctx.beginPath();
        ctx.moveTo(dimX, py);
        ctx.lineTo(dimX, py + pl);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dimX - 4, py); ctx.lineTo(dimX + 4, py);
        ctx.moveTo(dimX - 4, py + pl); ctx.lineTo(dimX + 4, py + pl);
        ctx.stroke();

        ctx.save();
        ctx.translate(dimX - 8, py + pl / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${plot.length}'0" DEPTH`, 0, 0);
        ctx.restore();

        ctx.restore();
    }

    _drawCompass(ctx, rect) {
        ctx.save();
        const cx = rect.width - 45;
        const cy = 45;

        // Compass arrow
        ctx.fillStyle = '#ef4444'; // North red
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx + 6, cy + 6);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#94a3b8'; // South gray
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx - 6, cy + 6);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, cy - 22);
        ctx.restore();
    }

    downloadPNG(filename = 'hamaraghar_blueprint.png') {
        if (!this.canvas) return;
        this.render();
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Global browser attachment
if (typeof window !== 'undefined') {
    window.FloorPlan2DRenderer = FloorPlan2DRenderer;
}
