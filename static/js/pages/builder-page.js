// =========================================================================
// Builder Page Controller - Connects UI Controls with HouseBuilder & CostEngine
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const sceneEl = document.getElementById('scene');
  const houseEl = document.getElementById('house');

  if (window.HouseBuilder && sceneEl && houseEl) {
    // 1. Load configuration from localStorage or defaults
    const savedConfig = (window.Utils && window.Utils.loadLocal('smartbuild_config')) || {
      land: 500,
      floors: 2,
      rooms: 3,
      compound: false,
      garden: false,
      viewMode: 'full',
      wallColor: '#90caf9',
      roofColor: '#546e7a',
      roofType: 'flat',
      budget: 2500000,
      projectName: 'Modern House'
    };

    // 2. Initialize 3D Engine
    window.HouseBuilder.init(sceneEl, houseEl);
    window.HouseBuilder.buildHouse(savedConfig);

    // 3. Sync UI Controls to Configuration
    syncUiControls(savedConfig);

    // 4. Attach Event Listeners
    setupFormListeners();
    setupOverlayListeners();
    setupColorSwatches();
    setupSaveProject();

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
  if (fRooms && cfg.rooms) fRooms.value = cfg.rooms;
  if (fLand && cfg.land) fLand.value = cfg.land;
  if (fCompound) fCompound.checked = Boolean(cfg.compound);
  if (fGarden) fGarden.checked = Boolean(cfg.garden);
  if (fWallMat && cfg.wallMaterial) fWallMat.value = cfg.wallMaterial;
  if (fFloorMat && cfg.floorMaterial) fFloorMat.value = cfg.floorMaterial;
  if (fRoofType && cfg.roofType) fRoofType.value = cfg.roofType;
  if (fProjName && cfg.projectName) fProjName.textContent = cfg.projectName;

  // View Mode radio buttons
  if (cfg.viewMode === 'sketch') {
    const radioSketch = document.getElementById('viewModeSketch');
    if (radioSketch) radioSketch.checked = true;
  } else {
    const radioFull = document.getElementById('viewModeFull');
    if (radioFull) radioFull.checked = true;
  }
  updateViewLabel(cfg.viewMode || 'full');
}

function setupFormListeners() {
  const form = document.getElementById('builderForm');
  const btnRebuild = document.getElementById('btnRebuild');

  function triggerRebuild() {
    const floors = parseInt(document.getElementById('floors')?.value) || 2;
    const rooms = parseInt(document.getElementById('rooms')?.value) || 3;
    const land = parseInt(document.getElementById('land')?.value) || 500;
    const compound = document.getElementById('compound')?.checked || false;
    const garden = document.getElementById('garden')?.checked || false;
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

    // Persist in localStorage
    if (window.Utils) {
      window.Utils.saveLocal('smartbuild_config', newConfig);
    }
  }

  if (btnRebuild) {
    btnRebuild.addEventListener('click', triggerRebuild);
  }

  // Live updates on form field changes
  ['floors', 'rooms', 'land', 'compound', 'garden', 'wallMaterial', 'floorMaterial', 'roofType'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', triggerRebuild);
    }
  });

  // View mode changes
  const viewRadios = document.querySelectorAll('input[name="viewMode"]');
  viewRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      window.HouseBuilder.setViewMode(e.target.value);
      updateViewLabel(e.target.value);
    });
  });
}

function updateViewLabel(mode) {
  const lbl = document.getElementById('currentViewLabel');
  if (lbl) {
    lbl.textContent = (mode === 'sketch') ? 'Sketch (Wireframe)' : 'Full 3D';
  }
}

function setupOverlayListeners() {
  const btnReset = document.getElementById('btnResetView');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');

  if (btnReset) {
    btnReset.addEventListener('click', () => window.HouseBuilder.resetCamera());
  }
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => window.HouseBuilder.zoomIn());
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => window.HouseBuilder.zoomOut());
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
        if (window.Utils) {
          window.Utils.saveLocal('smartbuild_config', currentCfg);
        }
      }
    });
  });
}

function updateCostAndSummary() {
  if (!window.HouseBuilder) return;
  const cfg = window.HouseBuilder.getConfig();
  const floors = parseInt(cfg.floors) || 2;
  const rooms = parseInt(cfg.rooms) || 3;
  const land = parseInt(cfg.land) || 500;

  // Approx 150 sqft per room
  const builtUpArea = Math.round(floors * rooms * 150);

  // House Summary update
  const sumFloors = document.getElementById('sumFloors');
  const sumRooms = document.getElementById('sumRooms');
  const sumArea = document.getElementById('sumArea');
  if (sumFloors) sumFloors.textContent = floors;
  if (sumRooms) sumRooms.textContent = floors * rooms;
  if (sumArea) sumArea.textContent = builtUpArea;

  // Cost calculation
  let totalCost = 0;
  if (window.CostEngine) {
    const costConfig = {
      plotLength: Math.sqrt(land),
      plotWidth: Math.sqrt(land),
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

  if (barArea) barArea.textContent = builtUpArea;
  if (barCost) {
    barCost.textContent = (window.Utils && window.Utils.formatCurrency) ? window.Utils.formatCurrency(totalCost) : `₹ ${totalCost.toLocaleString('en-IN')}`;
  }
  const userBudget = cfg.budget || 2500000;
  if (barBudget) {
    barBudget.textContent = (window.Utils && window.Utils.formatCurrency) ? window.Utils.formatCurrency(userBudget) : `₹ ${userBudget.toLocaleString('en-IN')}`;
  }

  if (barStatus) {
    if (totalCost <= userBudget) {
      barStatus.textContent = 'Within Budget';
      barStatus.className = 'badge badge-success';
    } else if (totalCost <= userBudget * 1.15) {
      barStatus.textContent = 'Slightly Over Budget';
      barStatus.className = 'badge badge-warning';
    } else {
      barStatus.textContent = 'Over Budget';
      barStatus.className = 'badge badge-danger';
    }
  }
}

function setupSaveProject() {
  const saveBtn = document.querySelector('.top-actions .btn-outline') || document.getElementById('save-project-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    if (!window.API || !window.HouseBuilder) return;
    const cfg = window.HouseBuilder.getConfig();
    const projName = document.getElementById('builderProjectName')?.textContent || 'My Smart House';

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      const existingId = window.Utils ? window.Utils.loadLocal('current_project_id') : null;

      if (existingId) {
        await window.API.updateProject(existingId, projName, cfg);
      } else {
        const res = await window.API.createProject(projName, cfg);
        if (res && res.id && window.Utils) {
          window.Utils.saveLocal('current_project_id', res.id);
        }
      }

      if (window.Utils && window.Utils.notify) {
        window.Utils.notify('House project saved successfully!', 'success');
      } else {
        alert('House project saved successfully!');
      }
    } catch (err) {
      console.error(err);
      if (window.Utils && window.Utils.notify) {
        window.Utils.notify('Failed to save project.', 'error');
      } else {
        alert('Failed to save project.');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });
}
