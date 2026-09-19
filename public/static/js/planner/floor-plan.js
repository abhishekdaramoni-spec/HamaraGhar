// HamaraGhar — 2D CAD Blueprint Floor Plan Studio Logic
const FloorPlanStudio = {
    canvas: null,
    ctx: null,
    config: {},
    currentPlan: null,
    activeFloor: 0,
    showDimensions: true,
    scale: 8, // pixels per foot
    offsetX: 60,
    offsetY: 60,

    init() {
        this.canvas = document.getElementById('floorPlanCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }

        // Load project data
        let saved = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { saved = JSON.parse(raw); } catch(e) {}
            }
        }
        this.config = saved || {
            plot_width: 40,
            plot_length: 50,
            plotWidth: 40,
            plotLength: 50,
            bhk: 3,
            bedrooms: 3,
            floors: 2,
            projectName: 'Greenwood Villa'
        };

        this.setupUI();
        this.renderFloor(0);
    },

    setupUI() {
        // Populate header metadata
        const nameEl = document.getElementById('displayProjectName');
        const plotEl = document.getElementById('displayPlotSize');
        const pName = this.config.projectName || this.config.name || 'Residential Plan';
        const pW = this.config.plotWidth || this.config.plot_width || 40;
        const pL = this.config.plotLength || this.config.plot_length || 50;

        if (nameEl) nameEl.textContent = pName;
        if (plotEl) plotEl.textContent = `Plot: ${pW} × ${pL} ft (${Math.round(pW * pL).toLocaleString('en-IN')} sq ft)`;

        // Setup toolbar buttons
        const btnRegen = document.getElementById('btnRegenerate');
        if (btnRegen) {
            btnRegen.addEventListener('click', () => {
                this.renderFloor(this.activeFloor);
                if (window.Utils?.notify) window.Utils.notify('Layout refreshed', 'info');
            });
        }

        const btnToggleDims = document.getElementById('btnToggleDims');
        if (btnToggleDims) {
            btnToggleDims.addEventListener('click', () => {
                this.showDimensions = !this.showDimensions;
                btnToggleDims.classList.toggle('active', this.showDimensions);
                this.draw();
            });
        }

        const btnDownload = document.getElementById('btnDownload');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => this.downloadPNG());
        }

        // Check if project has multiple floors to show/hide first floor tab
        const totalFloors = Number(this.config.floors) || 1;
        const btnFloor1 = document.getElementById('btnFloor1');
        if (btnFloor1 && totalFloors < 2) {
            btnFloor1.style.display = 'none';
        }
    },

    switchFloor(floorIndex) {
        this.activeFloor = floorIndex;
        document.querySelectorAll('.segmented-option').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === floorIndex);
        });
        this.renderFloor(floorIndex);
    },

    renderFloor(floorIndex) {
        if (!window.PlanGenerator) return;

        this.currentPlan = window.PlanGenerator.generate(this.config, floorIndex);
        this.updateScheduleAndStats(this.currentPlan);
        this.adjustScaleAndOffsets();
        this.draw();
    },

    adjustScaleAndOffsets() {
        if (!this.canvas || !this.currentPlan) return;
        const dims = this.currentPlan.dimensions;
        const pW = dims.width;
        const pL = dims.length;

        // Calculate responsive scale to fit canvas with padding
        const availableW = this.canvas.width - 140;
        const availableH = this.canvas.height - 120;
        const scaleX = availableW / pW;
        const scaleY = availableH / pL;
        this.scale = Math.min(scaleX, scaleY, 12); // clamp max scale

        this.offsetX = Math.round((this.canvas.width - pW * this.scale) / 2);
        this.offsetY = Math.round((this.canvas.height - pL * this.scale) / 2) + 10;
    },

    draw() {
        if (!this.ctx || !this.currentPlan) return;
        const ctx = this.ctx;
        const plan = this.currentPlan;
        const dims = plan.dimensions;

        // 1. Clear & Background
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Blueprint Grid
        this.drawGrid(ctx);

        // 3. Outer Plot Boundary (Dashed line)
        this.drawPlotBoundary(ctx, dims);

        // 4. Rooms (Fill & Thick Walls)
        this.drawRooms(ctx, plan.rooms);

        // 5. Doors & Windows
        this.drawDoors(ctx, plan.doors);
        this.drawWindows(ctx, plan.windows);

        // 6. CAD Dimension Extension Lines
        if (this.showDimensions) {
            this.drawDimensions(ctx, dims, plan.rooms);
        }

        // 7. True North Compass
        this.drawCompass(ctx);

        // 8. Technical Title Block (Bottom-Right)
        this.drawTitleBlock(ctx, dims);
    },

    drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const step = 20;
        for (let x = 0; x < this.canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    },

    drawPlotBoundary(ctx, dims) {
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(this.offsetX, this.offsetY, dims.width * this.scale, dims.length * this.scale);

        // Setback label
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(`PLOT BOUNDARY: ${dims.width}' × ${dims.length}'`, this.offsetX + 8, this.offsetY - 8);
        ctx.restore();
    },

    drawRooms(ctx, rooms) {
        rooms.forEach(r => {
            const rx = this.offsetX + r.x * this.scale;
            const ry = this.offsetY + r.y * this.scale;
            const rw = r.width * this.scale;
            const rh = r.height * this.scale;

            // Room Background Fill
            ctx.save();
            ctx.fillStyle = r.color || 'rgba(30, 41, 59, 0.6)';
            ctx.globalAlpha = 0.45;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.restore();

            // Wall Outline (Outer perimeter / Inner walls)
            ctx.save();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.restore();

            // Room Text Labels
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Room Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(r.name, rx + rw / 2, ry + rh / 2 - 10);

            // Dimension String
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px "SF Mono", monospace';
            ctx.fillText(`${r.width}'0" × ${r.height}'0"`, rx + rw / 2, ry + rh / 2 + 6);

            // Area (Sq Ft)
            ctx.fillStyle = '#f97316';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`${Math.round(r.width * r.height)} sq ft`, rx + rw / 2, ry + rh / 2 + 20);
            ctx.restore();
        });
    },

    drawDoors(ctx, doors) {
        ctx.save();
        ctx.strokeStyle = '#d97706'; // brass/door color
        ctx.lineWidth = 2;

        doors.forEach(d => {
            const dx = this.offsetX + d.x * this.scale;
            const dy = this.offsetY + d.y * this.scale;
            const radius = (d.width || 3) * this.scale;

            ctx.beginPath();
            ctx.arc(dx, dy, radius, 0, Math.PI / 2);
            ctx.stroke();

            // Door leaf line
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + radius, dy);
            ctx.stroke();
        });
        ctx.restore();
    },

    drawWindows(ctx, windows) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8'; // glass cyan
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 3;

        windows.forEach(w => {
            const wx = this.offsetX + w.x * this.scale;
            const wy = this.offsetY + w.y * this.scale;
            const span = (w.width || 3.5) * this.scale;

            if (w.wall === 'north' || w.wall === 'south') {
                ctx.strokeRect(wx, wy - 2, span, 4);
                ctx.fillRect(wx, wy - 2, span, 4);
            } else {
                ctx.strokeRect(wx - 2, wy, 4, span);
                ctx.fillRect(wx - 2, wy, 4, span);
            }
        });
        ctx.restore();
    },

    drawDimensions(ctx, dims, rooms) {
        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.font = '11px monospace';

        const bx = this.offsetX + (plan => plan.setbacks.side * this.scale)(this.currentPlan);
        const by = this.offsetY + (plan => plan.setbacks.front * this.scale)(this.currentPlan);
        const bw = this.currentPlan.dimensions.buildWidth * this.scale;
        const bh = this.currentPlan.dimensions.buildLength * this.scale;

        // Top dimension line
        const topY = by - 16;
        ctx.beginPath();
        ctx.moveTo(bx, topY);
        ctx.lineTo(bx + bw, topY);
        ctx.stroke();
        // Tick marks
        ctx.beginPath();
        ctx.moveTo(bx, topY - 5); ctx.lineTo(bx, topY + 5);
        ctx.moveTo(bx + bw, topY - 5); ctx.lineTo(bx + bw, topY + 5);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillText(`${this.currentPlan.dimensions.buildWidth}'0" BUILD SPAN`, bx + bw / 2, topY - 6);

        // Left dimension line
        const leftX = bx - 16;
        ctx.beginPath();
        ctx.moveTo(leftX, by);
        ctx.lineTo(leftX, by + bh);
        ctx.stroke();
        // Tick marks
        ctx.beginPath();
        ctx.moveTo(leftX - 5, by); ctx.lineTo(leftX + 5, by);
        ctx.moveTo(leftX - 5, by + bh); ctx.lineTo(leftX + 5, by + bh);
        ctx.stroke();

        ctx.save();
        ctx.translate(leftX - 8, by + bh / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${this.currentPlan.dimensions.buildLength}'0" DEPTH`, 0, 0);
        ctx.restore();

        ctx.restore();
    },

    drawCompass(ctx) {
        ctx.save();
        const cx = this.canvas.width - 50;
        const cy = 46;

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#c2410c'; // Terracotta north arrow

        // North arrow head
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx + 8, cy + 8);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        // South arrow tail
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx - 8, cy + 8);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, cy - 24);
        ctx.restore();
    },

    drawTitleBlock(ctx, dims) {
        ctx.save();
        const boxW = 200;
        const boxH = 64;
        const tx = this.canvas.width - boxW - 16;
        const ty = this.canvas.height - boxH - 16;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(tx, ty, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, boxW, boxH);

        const pName = this.config.projectName || 'House Plan';
        const floorName = this.activeFloor === 0 ? 'GROUND FLOOR' : 'FIRST FLOOR';

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`HAMARAGHAR CAD SUITE`, tx + 10, ty + 16);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText(`PLAN: ${pName.toUpperCase()}`, tx + 10, ty + 30);
        ctx.fillText(`LEVEL: ${floorName} (1:100)`, tx + 10, ty + 44);
        ctx.fillText(`DATE: ${new Date().toLocaleDateString('en-IN')}`, tx + 10, ty + 56);

        ctx.restore();
    },

    updateScheduleAndStats(plan) {
        // Room Schedule Table
        const tbody = document.getElementById('roomScheduleBody');
        const badgeCount = document.getElementById('badgeRoomCount');
        if (badgeCount) badgeCount.textContent = `${plan.rooms.length} Spaces`;

        if (tbody) {
            tbody.innerHTML = plan.rooms.map(r => {
                const area = Math.round(r.width * r.height);
                return `
                    <tr style="border-bottom: 1px solid var(--color-border); height: 28px;">
                        <td style="padding: 4px 2px; font-weight: 500;">${r.name}</td>
                        <td style="padding: 4px 2px; font-family: monospace; color: var(--color-text-muted);">${r.width}'×${r.height}'</td>
                        <td style="padding: 4px 2px; text-align: right; font-weight: 600; color: var(--color-accent);">${area} sq ft</td>
                    </tr>
                `;
            }).join('');
        }

        // Stats
        const statRooms = document.getElementById('statRooms');
        const statDoors = document.getElementById('statDoors');
        const statWindows = document.getElementById('statWindows');
        const barCarpet = document.getElementById('barCarpetArea');
        const barBuiltup = document.getElementById('barBuiltupArea');
        const barEff = document.getElementById('barEfficiency');

        if (statRooms) statRooms.textContent = plan.rooms.length;
        if (statDoors) statDoors.textContent = plan.doors.length;
        if (statWindows) statWindows.textContent = plan.windows.length;
        if (barCarpet) barCarpet.textContent = `${plan.carpetArea.toLocaleString('en-IN')} sq ft`;
        if (barBuiltup) barBuiltup.textContent = `${plan.builtupArea.toLocaleString('en-IN')} sq ft`;
        if (barEff) barEff.textContent = `${plan.efficiency}%`;
    },

    downloadPNG() {
        if (!this.canvas) return;
        const link = document.createElement('a');
        link.download = `HamaraGhar-Blueprint-${this.config.projectName || 'Plan'}-Level${this.activeFloor}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FloorPlanStudio.init();
});
