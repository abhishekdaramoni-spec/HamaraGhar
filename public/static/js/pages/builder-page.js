// =========================================================================
// HamaraGhar — Architectural 3D Studio Controller
// Synchronizes CAD Toolbars, Camera Presets, Inspector, and Cost Strip
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const sceneEl = document.getElementById('scene');
    const houseEl = document.getElementById('house');

    if (window.HouseBuilder && sceneEl && houseEl) {
        let savedConfig = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            savedConfig = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { savedConfig = JSON.parse(raw); } catch(e) {}
            }
        }

        const config = savedConfig || {
            land: 2000,
            floors: 2,
            rooms: 3,
            compound: true,
            garden: true,
            viewMode: 'full',
            wallColor: '#ffffff',
            wallMaterial: 'brick',
            floorMaterial: 'tile',
            roofType: 'flat',
            budget: 4500000,
            projectName: 'Modern Residence'
        };

        if (!config.land && (config.plot_width || config.plotWidth)) {
            const w = config.plot_width || config.plotWidth || 40;
            const l = config.plot_length || config.plotLength || 50;
            config.land = Math.round(w * l);
        }

        // Initialize 3D Studio Engine
        window.HouseBuilder.init(sceneEl, houseEl);
        window.HouseBuilder.buildHouse(config);

        // Setup Studio Controls
        setupCADToolbar();
        setupCameraControls();
        setupFloorControls();
        setupColorSwatches();
        setupFloatingBadges(config);
        setupSaveAndShare();
        setupFloatingRoomClose();
    }
});

function setupCADToolbar() {
    const toolButtons = document.querySelectorAll('.cad-tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tool = btn.getAttribute('data-tool');
            if (window.HouseBuilder) {
                window.HouseBuilder.config.activeTool = tool;
            }
        });
    });
}

function setupCameraControls() {
    const btnReset = document.getElementById('btnResetView');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnIso = document.getElementById('btnCamIso');
    const btnFront = document.getElementById('btnCamFront');
    const btnTop = document.getElementById('btnCamTop');

    if (btnReset) btnReset.addEventListener('click', () => window.HouseBuilder.resetCamera());
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => window.HouseBuilder.zoomIn());
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => window.HouseBuilder.zoomOut());

    if (btnIso) {
        btnIso.addEventListener('click', () => window.HouseBuilder.setCameraAngle(-22, 35));
    }
    if (btnFront) {
        btnFront.addEventListener('click', () => window.HouseBuilder.setCameraAngle(0, 0));
    }
    if (btnTop) {
        btnTop.addEventListener('click', () => window.HouseBuilder.setCameraAngle(-85, 0));
    }
}

function setupFloorControls() {
    const floorPills = document.querySelectorAll('.sbs-floor-pill');
    floorPills.forEach(pill => {
        pill.addEventListener('click', () => {
            floorPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    const btnAddFloor = document.getElementById('btnAddFloor');
    if (btnAddFloor) {
        btnAddFloor.addEventListener('click', () => {
            const currentFloors = parseInt(window.HouseBuilder.config.floors) || 2;
            if (currentFloors < 4) {
                window.HouseBuilder.config.floors = currentFloors + 1;
                window.HouseBuilder.buildHouse(window.HouseBuilder.config);
                updateFloatingBadges(window.HouseBuilder.config);
            } else {
                alert('Maximum 4 residential floor levels supported in standard zone.');
            }
        });
    }
}

function setupColorSwatches() {
    const swatches = document.querySelectorAll('#wallColors .swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.getAttribute('data-color');
            if (window.HouseBuilder && color) {
                window.HouseBuilder.setWallColor(color);
            }
        });
    });
}

function setupFloatingRoomClose() {
    const closeBtn = document.getElementById('closeFloatingRoom');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.HouseBuilder) window.HouseBuilder.deselect();
        });
    }
}

function setupFloatingBadges(cfg) {
    updateFloatingBadges(cfg);
}

function updateFloatingBadges(cfg) {
    const flName = document.getElementById('flProjectName');
    const flFloors = document.getElementById('flFloors');
    const flRooms = document.getElementById('flRooms');
    const flArea = document.getElementById('flArea');
    const flCost = document.getElementById('flCost');

    const floors = parseInt(cfg.floors) || 2;
    const rooms = parseInt(cfg.rooms) || 3;
    const totalRooms = floors * rooms;
    const area = totalRooms * 280 + 350;
    const cost = area * 1950;

    if (flName) flName.textContent = cfg.projectName || cfg.name || 'Modern Residence';
    if (flFloors) flFloors.textContent = `${floors} Floors`;
    if (flRooms) flRooms.textContent = `${totalRooms} Rooms`;
    if (flArea) flArea.textContent = `${area.toLocaleString('en-IN')} sq.ft`;
    if (flCost) flCost.textContent = formatINR(cost);
}

function formatINR(num) {
    if (!num || isNaN(num)) return '₹0';
    num = Math.round(num);
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    } else {
        return `₹${num.toLocaleString('en-IN')}`;
    }
}

function setupSaveAndShare() {
    const btnSave = document.getElementById('save-project-btn');
    const saveIndicator = document.getElementById('saveStatusIndicator');

    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const cfg = window.HouseBuilder.getConfig();
            const projName = document.getElementById('builderProjectName')?.textContent || 'Modern Residence';

            if (saveIndicator) {
                saveIndicator.innerHTML = '<span style="color:#b45309;">Saving...</span>';
            }

            try {
                if (window.API && typeof window.API.createProject === 'function') {
                    await window.API.createProject({
                        name: projName,
                        data: cfg
                    });
                }
                if (window.Utils && typeof window.Utils.saveLocal === 'function') {
                    window.Utils.saveLocal('house_data', cfg);
                }

                if (saveIndicator) {
                    saveIndicator.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Saved</span>
                    `;
                }
            } catch (err) {
                console.error('Save error:', err);
                if (saveIndicator) {
                    saveIndicator.innerHTML = '<span style="color:#b91c1c;">Saved locally</span>';
                }
            }
        });
    }

    const btnShare = document.getElementById('btnShareStudio');
    if (btnShare) {
        btnShare.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Project studio link copied to clipboard!');
            }
        });
    }

    const btnExport = document.getElementById('btnExportStudio');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            window.location.href = '/floor-plan';
        });
    }
}
