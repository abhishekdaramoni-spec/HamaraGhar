// =========================================================================
// HamaraGhar — 3D Elevation Studio Controller
// Connects UI Controls with HouseBuilder 3D Engine & CostEngine
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const sceneEl = document.getElementById('scene');
    const houseEl = document.getElementById('house');

    if (window.HouseBuilder && sceneEl && houseEl) {
        // 1. Load configuration from project/localStorage or defaults
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
            projectName: 'Greenwood Villa'
        };

        // Normalize land area vs plot dimensions
        if (!config.land && (config.plot_width || config.plotWidth)) {
            const w = config.plot_width || config.plotWidth || 40;
            const l = config.plot_length || config.plotLength || 50;
            config.land = Math.round(w * l);
        }

        // 2. Initialize 3D Engine
        window.HouseBuilder.init(sceneEl, houseEl);
        window.HouseBuilder.buildHouse(config);

        // 3. Sync UI Controls
        syncUiControls(config);

        // 4. Attach Event Listeners
        setupFormListeners();
        setupCameraPresetListeners();
        setupColorSwatches();
        setupSaveProject();
        setupElementInspection();

        // 5. Update UI summaries & Cost Bar
        updateCostAndSummary();
    }
});

function syncUiControls(cfg) {
    const fFloors = document.getElementById('floors');
    const fRooms = document.getElementById('rooms');
    const fLand = document.getElementById('land');
    const fCompound = document.getElementById('compound');
    const fGarden = document.getElementById('garden');
    const fWallMat = document.getElementById('wallMaterial');
    const fFloorMat = document.getElementById('floorMaterial');
    const fRoofType = document.getElementById('roofType');
    const fProjName = document.getElementById('builderProjectName');

    if (fFloors && cfg.floors) fFloors.value = cfg.floors;
    if (fRooms && (cfg.rooms || cfg.roomsPerFloor)) fRooms.value = cfg.rooms || cfg.roomsPerFloor;
    if (fLand && cfg.land) fLand.value = cfg.land;
    if (fCompound) fCompound.checked = cfg.compound !== undefined ? Boolean(cfg.compound) : true;
    if (fGarden) fGarden.checked = cfg.garden !== undefined ? Boolean(cfg.garden) : true;
    if (fWallMat && cfg.wallMaterial) fWallMat.value = cfg.wallMaterial;
    if (fFloorMat && cfg.floorMaterial) fFloorMat.value = cfg.floorMaterial;
    if (fRoofType && cfg.roofType) fRoofType.value = cfg.roofType;
    if (fProjName) fProjName.textContent = cfg.projectName || cfg.name || 'House Plan';

    // View Mode segmented controls
    const isSketch = cfg.viewMode === 'sketch';
    const rFull = document.getElementById('viewModeFull');
    const rSketch = document.getElementById('viewModeSketch');
    const segFull = document.getElementById('segModeFull');
    const segSketch = document.getElementById('segModeSketch');

    if (rFull) rFull.checked = !isSketch;
    if (rSketch) rSketch.checked = isSketch;
    if (segFull) segFull.classList.toggle('active', !isSketch);
    if (segSketch) segSketch.classList.toggle('active', isSketch);

    updateViewLabel(cfg.viewMode || 'full');
}

function setupFormListeners() {
    const btnRebuild = document.getElementById('btnRebuild');

    function triggerRebuild() {
        const floors = parseInt(document.getElementById('floors')?.value) || 2;
        const rooms = parseInt(document.getElementById('rooms')?.value) || 3;
        const land = parseInt(document.getElementById('land')?.value) || 2000;
        const compound = document.getElementById('compound')?.checked ?? true;
        const garden = document.getElementById('garden')?.checked ?? true;
        const wallMaterial = document.getElementById('wallMaterial')?.value || 'brick';
        const floorMaterial = document.getElementById('floorMaterial')?.value || 'tile';
        const roofType = document.getElementById('roofType')?.value || 'flat';
        const viewMode = document.querySelector('input[name="viewMode"]:checked')?.value || 'full';

        const currentConfig = window.HouseBuilder.getConfig();
        const newConfig = {
            ...currentConfig,
            floors,
            rooms,
            land,
            compound,
            garden,
            wallMaterial,
            floorMaterial,
            roofType,
            viewMode
        };

        window.HouseBuilder.buildHouse(newConfig);
        updateViewLabel(viewMode);
        updateCostAndSummary();

        // Persist local state
        if (window.Utils && typeof window.Utils.saveLocal === 'function') {
            window.Utils.saveLocal('house_data', newConfig);
            window.Utils.saveLocal('smartbuild_config', newConfig);
        }
    }

    if (btnRebuild) {
        btnRebuild.addEventListener('click', triggerRebuild);
    }

    // Live updates on form inputs
    ['floors', 'rooms', 'land', 'compound', 'garden', 'wallMaterial', 'floorMaterial', 'roofType'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', triggerRebuild);
    });

    // View mode segmented controls
    const segFull = document.getElementById('segModeFull');
    const segSketch = document.getElementById('segModeSketch');
    const rFull = document.getElementById('viewModeFull');
    const rSketch = document.getElementById('viewModeSketch');

    if (segFull && rFull) {
        segFull.addEventListener('click', () => {
            rFull.checked = true;
            segFull.classList.add('active');
            segSketch?.classList.remove('active');
            window.HouseBuilder.setViewMode('full');
            updateViewLabel('full');
        });
    }

    if (segSketch && rSketch) {
        segSketch.addEventListener('click', () => {
            rSketch.checked = true;
            segSketch.classList.add('active');
            segFull?.classList.remove('active');
            window.HouseBuilder.setViewMode('sketch');
            updateViewLabel('sketch');
        });
    }
}

function updateViewLabel(mode) {
    const lbl = document.getElementById('currentViewLabel');
    if (lbl) {
        lbl.textContent = (mode === 'sketch') ? 'Wireframe CAD Sketch' : 'Full 3D Elevation';
    }
}

function setupCameraPresetListeners() {
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
        btnIso.addEventListener('click', () => {
            if (window.HouseBuilder.setCameraAngle) {
                window.HouseBuilder.setCameraAngle(-25, 45);
            }
        });
    }

    if (btnFront) {
        btnFront.addEventListener('click', () => {
            if (window.HouseBuilder.setCameraAngle) {
                window.HouseBuilder.setCameraAngle(0, 0);
            }
        });
    }

    if (btnTop) {
        btnTop.addEventListener('click', () => {
            if (window.HouseBuilder.setCameraAngle) {
                window.HouseBuilder.setCameraAngle(-85, 0);
            }
        });
    }
}

function setupColorSwatches() {
    const swatches = document.querySelectorAll('.swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.getAttribute('data-color');
            if (color && window.HouseBuilder) {
                window.HouseBuilder.setWallColor(color);
                const currentCfg = window.HouseBuilder.getConfig();
                if (window.Utils && typeof window.Utils.saveLocal === 'function') {
                    window.Utils.saveLocal('house_data', currentCfg);
                    window.Utils.saveLocal('smartbuild_config', currentCfg);
                }
            }
        });
    });
}

function setupElementInspection() {
    const sceneEl = document.getElementById('scene');
    const propsEl = document.getElementById('propertiesContent');
    if (!sceneEl || !propsEl) return;

    sceneEl.addEventListener('click', (e) => {
        const cuboid = e.target.closest('.cuboid');
        if (!cuboid) return;

        const id = cuboid.id || 'Structural Element';
        const style = window.getComputedStyle(cuboid);
        const w = parseInt(style.width) || 200;
        const h = parseInt(style.height) || 120;

        propsEl.innerHTML = `
            <div style="background: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-accent);">${escapeHtml(id)}</span>
                    <span class="badge badge-outline" style="font-size: 10px;">Inspected</span>
                </div>
                <div style="font-size: 11px; color: var(--color-text); line-height: 1.6;">
                    <div><b>Span:</b> ${Math.round(w / 10)}' 0"</div>
                    <div><b>Height:</b> ${Math.round(h / 10)}' 0"</div>
                    <div><b>Wall Spec:</b> 9" Outer Masonry</div>
                    <div><b>IS Code:</b> IS 1893 Ductile Joint</div>
                </div>
            </div>
        `;
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function updateCostAndSummary() {
    if (!window.HouseBuilder) return;
    const cfg = window.HouseBuilder.getConfig();
    const floors = parseInt(cfg.floors) || 2;
    const rooms = parseInt(cfg.rooms) || 3;
    const land = parseInt(cfg.land) || 2000;

    // Built-up footprint estimate
    const builtUpArea = Math.round(floors * rooms * 200);

    // Update Summary Sidebar
    const sumFloors = document.getElementById('sumFloors');
    const sumRooms = document.getElementById('sumRooms');
    const sumArea = document.getElementById('sumArea');
    if (sumFloors) sumFloors.textContent = floors;
    if (sumRooms) sumRooms.textContent = floors * rooms;
    if (sumArea) sumArea.textContent = builtUpArea.toLocaleString('en-IN');

    // Cost calculation
    let totalCost = 0;
    if (window.CostEngine && typeof window.CostEngine.calculate === 'function') {
        const costConfig = {
            plotLength: Math.round(Math.sqrt(land)),
            plotWidth: Math.round(Math.sqrt(land)),
            floors: floors,
            rooms: rooms,
            materialQuality: cfg.wallMaterial === 'brick' ? 'standard' : (cfg.wallMaterial === 'concrete' ? 'basic' : 'premium'),
            compound: cfg.compound,
            garden: cfg.garden
        };
        const breakdown = window.CostEngine.calculate(costConfig);
        totalCost = breakdown.total || (builtUpArea * 1800);
    } else {
        totalCost = builtUpArea * 1800;
    }

    // Cost Bar update
    const barArea = document.getElementById('barArea');
    const barCost = document.getElementById('barCost');
    const barBudget = document.getElementById('barBudget');
    const barStatus = document.getElementById('barStatus');

    if (barArea) barArea.textContent = builtUpArea.toLocaleString('en-IN');
    if (barCost) {
        barCost.textContent = (window.Utils && typeof window.Utils.formatCurrency === 'function') 
            ? window.Utils.formatCurrency(totalCost) 
            : `₹ ${totalCost.toLocaleString('en-IN')}`;
    }

    const userBudget = cfg.budget || 4500000;
    if (barBudget) {
        barBudget.textContent = (window.Utils && typeof window.Utils.formatCurrency === 'function') 
            ? window.Utils.formatCurrency(userBudget) 
            : `₹ ${userBudget.toLocaleString('en-IN')}`;
    }

    if (barStatus) {
        if (totalCost <= userBudget) {
            barStatus.textContent = 'Within Target';
            barStatus.className = 'badge badge-success';
        } else if (totalCost <= userBudget * 1.15) {
            barStatus.textContent = '+10% Minor Variance';
            barStatus.className = 'badge badge-warning';
        } else {
            barStatus.textContent = 'Exceeds Budget';
            barStatus.className = 'badge badge-danger';
        }
    }
}

function setupSaveProject() {
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        if (!window.API || !window.HouseBuilder) return;
        const cfg = window.HouseBuilder.getConfig();
        const projName = document.getElementById('builderProjectName')?.textContent || 'Greenwood Villa';

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span>Saving...</span>`;
            const existingId = window.Utils ? window.Utils.loadLocal('current_project_id') : localStorage.getItem('current_project_id');

            if (existingId) {
                await window.API.updateProject(existingId, { name: projName, data: cfg });
            } else {
                const res = await window.API.createProject({ name: projName, data: cfg });
                if (res && res.project && res.project.id) {
                    if (window.Utils) window.Utils.saveLocal('current_project_id', res.project.id);
                    localStorage.setItem('current_project_id', res.project.id);
                }
            }

            if (window.Utils && typeof window.Utils.notify === 'function') {
                window.Utils.notify('3D House Elevation saved to workspace!', 'success');
            } else {
                alert('House plan saved successfully!');
            }
        } catch (err) {
            console.error('Save failed:', err);
            if (window.Utils && typeof window.Utils.notify === 'function') {
                window.Utils.notify('Failed to save project.', 'error');
            } else {
                alert('Failed to save project.');
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span>Save Project</span>
            `;
        }
    });
}
