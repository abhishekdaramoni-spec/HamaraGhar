// =========================================================================
// HamaraGhar — Studio Synchronization Manager
// Bridges the Canonical HouseModel with 2D Blueprint & 3D Three.js Engine.
// Enforces Single Source of Truth, Bidirectional Room Selection,
// Live Geometry Edits, Real-time CPWD Costing, and Kaggle Valuation.
// =========================================================================

export class StudioSyncManager {
    constructor(options = {}) {
        this.renderer2d = options.renderer2d || null;
        this.renderer3d = options.renderer3d || null;
        this.model = null;
        this.selectedRoomId = null;
        this.activeFloorIndex = 0;
        this.viewMode = 'split'; // '2d', '3d', 'split'

        // History for Undo/Redo
        this.undoStack = [];
        this.redoStack = [];

        this._setupCallbacks();
    }

    setRenderers(renderer2d, renderer3d) {
        this.renderer2d = renderer2d;
        this.renderer3d = renderer3d;
        this._setupCallbacks();
    }

    _setupCallbacks() {
        if (this.renderer2d) {
            this.renderer2d.onRoomSelected = (roomId, roomData) => {
                this.selectRoom(roomId, '2d');
            };
            this.renderer2d.onModelChanged = (updatedModel, action) => {
                this.pushHistory();
                this.model = updatedModel;
                this._onModelModified();
            };
        }

        if (this.renderer3d) {
            this.renderer3d.onRoomSelected = (roomId, roomData) => {
                this.selectRoom(roomId, '3d');
            };
        }
    }

    loadModel(canonicalModel, floorIndex = 0) {
        this.model = canonicalModel;
        this.activeFloorIndex = floorIndex;
        this.undoStack = [];
        this.redoStack = [];

        if (this.renderer2d) {
            this.renderer2d.setModel(this.model, this.activeFloorIndex);
        }
        if (this.renderer3d) {
            this.renderer3d.setModel(this.model, this.activeFloorIndex);
        }

        this.updateUI();
    }

    selectRoom(roomId, source = 'system') {
        this.selectedRoomId = roomId;

        if (source !== '2d' && this.renderer2d) {
            this.renderer2d.setSelectedRoom(roomId);
        }
        if (source !== '3d' && this.renderer3d) {
            this.renderer3d.setSelectedRoom(roomId);
        }

        this._updateSelectedRoomPanel();
    }

    setFloor(floorIndex) {
        this.activeFloorIndex = floorIndex;

        if (this.renderer2d) {
            this.renderer2d.setFloor(floorIndex);
        }
        if (this.renderer3d) {
            this.renderer3d.setFloor(floorIndex);
        }

        this.updateUI();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const container2d = document.getElementById('panel2D');
        const container3d = document.getElementById('panel3D');
        const splitWorkspace = document.getElementById('studioSplitWorkspace');

        if (!container2d || !container3d || !splitWorkspace) return;

        splitWorkspace.classList.remove('mode-2d', 'mode-3d', 'mode-split');
        splitWorkspace.classList.add(`mode-${mode}`);

        if (mode === '2d') {
            container2d.style.display = 'block';
            container2d.style.flex = '1';
            container3d.style.display = 'none';
        } else if (mode === '3d') {
            container2d.style.display = 'none';
            container3d.style.display = 'block';
            container3d.style.flex = '1';
        } else {
            // Split view (50% / 50%)
            container2d.style.display = 'block';
            container2d.style.flex = '1';
            container3d.style.display = 'block';
            container3d.style.flex = '1.1';
        }

        // Trigger resize so canvases adapt
        if (this.renderer2d) this.renderer2d.fitToView();
        if (this.renderer3d) this.renderer3d._onResize();
    }

    // =========================================================================
    // EDITING & MUTATION PIPELINE (SINGLE SOURCE OF TRUTH)
    // =========================================================================

    updateRoomDimensions(roomId, newWidth, newHeight) {
        if (!this.model) return;
        this.pushHistory();

        let targetRoom = null;
        for (const fl of this.model.floors) {
            targetRoom = fl.rooms.find(r => r.id === roomId);
            if (targetRoom) break;
        }

        if (targetRoom) {
            targetRoom.bounds.width = Math.max(4.0, Number(newWidth));
            targetRoom.bounds.height = Math.max(4.0, Number(newHeight));
            targetRoom.areaSqFt = Math.round(targetRoom.bounds.width * targetRoom.bounds.height);

            this._onModelModified();
        }
    }

    addDoorToSelectedRoom() {
        if (!this.model || !this.selectedRoomId) return;
        const room = this._getSelectedRoomObj();
        if (!room) return;

        this.pushHistory();
        const fl = this.model.floors.find(f => f.index === room.floorIndex) || this.model.floors[0];
        fl.doors = fl.doors || [];

        const newDoor = {
            id: `door-f${fl.index}-${Date.now().toString().slice(-4)}`,
            position: { x: room.bounds.x + 2.0, y: room.bounds.y + room.bounds.height },
            widthFt: 3.0,
            heightFt: 7.0,
            swing: 'inward',
            roomId: room.id,
            floorIndex: fl.index,
            orientation: 'horizontal'
        };
        fl.doors.push(newDoor);
        this._onModelModified();
    }

    removeLastDoorFromSelectedRoom() {
        if (!this.model || !this.selectedRoomId) return;
        const room = this._getSelectedRoomObj();
        if (!room) return;

        this.pushHistory();
        const fl = this.model.floors.find(f => f.index === room.floorIndex) || this.model.floors[0];
        if (fl.doors && fl.doors.length > 0) {
            const dIdx = fl.doors.findIndex(d => d.roomId === room.id);
            if (dIdx !== -1) {
                fl.doors.splice(dIdx, 1);
                this._onModelModified();
            }
        }
    }

    addWindowToSelectedRoom() {
        if (!this.model || !this.selectedRoomId) return;
        const room = this._getSelectedRoomObj();
        if (!room) return;

        this.pushHistory();
        const fl = this.model.floors.find(f => f.index === room.floorIndex) || this.model.floors[0];
        fl.windows = fl.windows || [];

        const newWindow = {
            id: `window-f${fl.index}-${Date.now().toString().slice(-4)}`,
            position: { x: room.bounds.x + room.bounds.width * 0.5, y: room.bounds.y },
            widthFt: 4.0,
            heightFt: 4.5,
            sillHeightFt: 3.0,
            wall: 'north',
            roomId: room.id,
            floorIndex: fl.index
        };
        fl.windows.push(newWindow);
        this._onModelModified();
    }

    _onModelModified() {
        // Recalculate built-up, carpet, and costs
        this._recalculateTotals();

        // Synchronize 2D view
        if (this.renderer2d) {
            this.renderer2d.render();
        }

        // Synchronize 3D view (rebuild procedural geometry)
        if (this.renderer3d) {
            this.renderer3d.build();
        }

        // Update HTML panels
        this.updateUI();
        this._updateSelectedRoomPanel();
    }

    _recalculateTotals() {
        if (!this.model) return;
        let totalCarpet = 0;
        let maxBuildW = 0;
        let maxBuildL = 0;

        (this.model.floors || []).forEach(fl => {
            (fl.rooms || []).forEach(r => {
                totalCarpet += (r.areaSqFt || 0);
                maxBuildW = Math.max(maxBuildW, r.bounds.x + r.bounds.width);
                maxBuildL = Math.max(maxBuildL, r.bounds.y + r.bounds.height);
            });
        });

        const builtup = Math.round(totalCarpet * 1.18);
        this.model.summary.totalCarpetArea = totalCarpet;
        this.model.summary.totalBuiltupArea = builtup;
        this.model.summary.efficiencyPct = builtup > 0 ? Math.round((totalCarpet / builtup) * 1000) / 10 : 82.0;

        // CPWD DSR Rate (~₹2,150 / sq.ft standard)
        this.model.summary.estimatedCostInr = Math.round(builtup * 2150);

        // Kaggle Real Estate Capital Valuation (~₹4,500 / sq.ft)
        this.model.summary.estimatedValuationInr = Math.round(builtup * 4500);
    }

    _getSelectedRoomObj() {
        if (!this.model || !this.selectedRoomId) return null;
        for (const fl of this.model.floors) {
            const r = fl.rooms.find(rm => rm.id === this.selectedRoomId);
            if (r) return r;
        }
        return null;
    }

    _updateSelectedRoomPanel() {
        const room = this._getSelectedRoomObj();
        const card = document.getElementById('selectedRoomInfoPanel');
        if (!card) return;

        if (!room) {
            card.innerHTML = `
                <div class="empty-room-state" style="color: var(--color-text-muted); font-size: 11px; padding: 6px 0;">
                    Click any room in the 2D Plan or 3D House to inspect properties and edit dimensions.
                </div>
            `;
            return;
        }

        const fl = this.model.floors.find(f => f.index === room.floorIndex) || this.model.floors[0];
        const doorCount = (fl.doors || []).filter(d => d.roomId === room.id).length;
        const windowCount = (fl.windows || []).filter(w => w.roomId === room.id).length;
        const furnList = (fl.furniture || []).filter(f => f.roomId === room.id).map(f => f.name).join(', ') || 'Standard Decor';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #38bdf8;">${room.name}</h4>
                    <span style="font-size: 10px; color: var(--color-text-muted); font-family: monospace;">ID: ${room.id} &bull; ${fl.name}</span>
                </div>
                <span class="badge badge-accent" style="font-size: 9px;">${room.zone.toUpperCase()} ZONE</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px; margin-bottom: 8px;">
                <div class="stat-pill" style="background: rgba(255,255,255,0.04); padding: 5px 8px; border-radius: 4px;">
                    <div style="color: var(--color-text-muted); font-size: 9px;">WIDTH × DEPTH</div>
                    <div style="font-weight: 600; font-family: monospace;">${room.bounds.width}' × ${room.bounds.height}'</div>
                </div>
                <div class="stat-pill" style="background: rgba(255,255,255,0.04); padding: 5px 8px; border-radius: 4px;">
                    <div style="color: var(--color-text-muted); font-size: 9px;">CARPET AREA</div>
                    <div style="font-weight: 600; color: #10b981;">${room.areaSqFt} sq.ft</div>
                </div>
                <div class="stat-pill" style="background: rgba(255,255,255,0.04); padding: 5px 8px; border-radius: 4px;">
                    <div style="color: var(--color-text-muted); font-size: 9px;">DOORS / WINDOWS</div>
                    <div style="font-weight: 600;">${doorCount} Door(s) &bull; ${windowCount} Win</div>
                </div>
                <div class="stat-pill" style="background: rgba(255,255,255,0.04); padding: 5px 8px; border-radius: 4px;">
                    <div style="color: var(--color-text-muted); font-size: 9px;">FLOOR FINISH</div>
                    <div style="font-weight: 500; font-size: 10px; text-transform: capitalize;">${(room.floorMaterial || 'Vitrified').replace('_', ' ')}</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; font-size: 11px;">
                <button type="button" class="btn btn-outline btn-xs" onclick="window.StudioSync.modifyRoomWidth('${room.id}', 1)">+1ft Width</button>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.StudioSync.modifyRoomWidth('${room.id}', -1)">-1ft Width</button>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.StudioSync.addDoorToSelectedRoom()">+ Add Door</button>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.StudioSync.removeLastDoorFromSelectedRoom()">- Remove Door</button>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.StudioSync.addWindowToSelectedRoom()">+ Add Window</button>
            </div>
        `;
    }

    modifyRoomWidth(roomId, deltaFt) {
        const room = this._getSelectedRoomObj();
        if (room && room.id === roomId) {
            this.updateRoomDimensions(roomId, room.bounds.width + deltaFt, room.bounds.height);
        }
    }

    updateUI() {
        if (!this.model) return;
        const s = this.model.summary;

        // Top bar title
        const pName = document.getElementById('builderProjectName');
        if (pName) pName.textContent = this.model.metadata.name;

        // Bottom Summary Cards
        const elBuiltup = document.getElementById('summaryBuiltupArea');
        const elBedrooms = document.getElementById('summaryBedrooms');
        const elBathrooms = document.getElementById('summaryBathrooms');
        const elFloors = document.getElementById('summaryFloors');
        const elCost = document.getElementById('summaryEstimatedCost');
        const elValuation = document.getElementById('summaryEstimatedValuation');

        if (elBuiltup) elBuiltup.textContent = `${s.totalBuiltupArea.toLocaleString('en-IN')} sq.ft`;
        if (elBedrooms) elBedrooms.textContent = s.bedroomCount;
        if (elBathrooms) elBathrooms.textContent = s.bathroomCount;
        if (elFloors) elFloors.textContent = s.floorCount;

        const costCr = (s.estimatedCostInr / 10000000).toFixed(2);
        const costLakhs = (s.estimatedCostInr / 100000).toFixed(1);
        if (elCost) {
            elCost.textContent = s.estimatedCostInr >= 10000000 ? `₹ ${costCr} Crore` : `₹ ${costLakhs} Lakhs`;
        }

        const valCr = (s.estimatedValuationInr / 10000000).toFixed(2);
        const valLakhs = (s.estimatedValuationInr / 100000).toFixed(1);
        if (elValuation) {
            elValuation.textContent = s.estimatedValuationInr >= 10000000 ? `₹ ${valCr} Crore` : `₹ ${valLakhs} Lakhs`;
        }
    }

    pushHistory() {
        if (!this.model) return;
        try {
            const snap = JSON.parse(JSON.stringify(this.model));
            this.undoStack.push(snap);
            if (this.undoStack.length > 20) this.undoStack.shift();
            this.redoStack = [];
        } catch (e) {}
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const current = JSON.parse(JSON.stringify(this.model));
        this.redoStack.push(current);
        const prev = this.undoStack.pop();
        this.loadModel(prev, this.activeFloorIndex);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const current = JSON.parse(JSON.stringify(this.model));
        this.undoStack.push(current);
        const next = this.redoStack.pop();
        this.loadModel(next, this.activeFloorIndex);
    }
}

// Global browser attachment
if (typeof window !== 'undefined') {
    window.StudioSyncManager = StudioSyncManager;
}
