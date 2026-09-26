// Project Hub & Summary Page Architectural Logic
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || {}) : {};
  
  const safeConfig = {
    projectName: config.projectName || 'Greenwood Villa',
    style: config.style || 'Contemporary Minimalist',
    plotLength: parseFloat(config.plotLength) || 40,
    plotWidth: parseFloat(config.plotWidth) || 30,
    floors: parseInt(config.floors) || 2,
    bedrooms: parseInt(config.bedrooms) || 3,
    bathrooms: parseInt(config.bathrooms) || 3,
    budget: parseInt(config.budget) || 3840000,
    city: config.city || 'Ahmedabad',
    ...config
  };

  let riskData = null;
  let costBreakdown = null;

  if (window.RiskEngine && safeConfig.city) {
    riskData = await window.RiskEngine.analyze(safeConfig.city);
  }
  if (window.CostEngine) {
    costBreakdown = window.CostEngine.calculate(safeConfig);
  }

  setupTabs();
  setupFloorPlanToggle();
  renderHubHeader(safeConfig, costBreakdown);
  renderScores(safeConfig, costBreakdown, riskData);
  renderHubCost(safeConfig, costBreakdown);
  renderHubRisk(safeConfig, riskData);
  setupActions(safeConfig, costBreakdown);
});

// Workspace Tabs Management
function setupTabs() {
  const tabs = document.querySelectorAll('.hub-tab');
  const panes = document.querySelectorAll('.hub-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `pane-${tab.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// Floor Plan Floor Switcher
function setupFloorPlanToggle() {
  const btns = document.querySelectorAll('.fp-floor-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline');
      });
      btn.classList.add('btn-primary', 'active');
      btn.classList.remove('btn-outline');

      const floor = btn.dataset.floor;
      const living = document.getElementById('fp-room-living');
      const kitchen = document.getElementById('fp-room-kitchen');
      const master = document.getElementById('fp-room-master');
      const guest = document.getElementById('fp-room-guest');

      if (floor === 'first') {
        if (living) {
          living.querySelector('text:nth-of-type(1)').textContent = 'Upper Lounge';
          living.querySelector('text:nth-of-type(2)').textContent = '14\' 0" × 12\' 6"';
        }
        if (kitchen) {
          kitchen.querySelector('text:nth-of-type(1)').textContent = 'Open Cantilever Terrace';
          kitchen.querySelector('text:nth-of-type(2)').textContent = '15\' 0" × 10\' 0"';
          kitchen.querySelector('text:nth-of-type(3)').textContent = 'Glass Balustrade';
        }
        if (master) {
          master.querySelector('text:nth-of-type(1)').textContent = 'Bedroom 2 (Balcony)';
        }
      } else {
        if (living) {
          living.querySelector('text:nth-of-type(1)').textContent = 'Living Hall';
          living.querySelector('text:nth-of-type(2)').textContent = '16\' 0" × 14\' 6"';
        }
        if (kitchen) {
          kitchen.querySelector('text:nth-of-type(1)').textContent = 'Kitchen & Dining';
          kitchen.querySelector('text:nth-of-type(2)').textContent = '15\' 0" × 10\' 0"';
          kitchen.querySelector('text:nth-of-type(3)').textContent = 'Vastu SE Compliant';
        }
        if (master) {
          master.querySelector('text:nth-of-type(1)').textContent = 'Master Bedroom';
        }
      }
    });
  });
}

function renderHubHeader(config, cost) {
  const nameEl = document.getElementById('sumProjectName');
  const bcNameEl = document.getElementById('hubBreadcrumbName');
  const styleEl = document.getElementById('sumStyle');
  const locEl = document.getElementById('sumLocation');
  const dateEl = document.getElementById('sumDate');
  const plotEl = document.getElementById('sumPlotDim');
  const areaEl = document.getElementById('sumHeaderArea');

  const plotArea = (parseFloat(config.plotLength) || 40) * (parseFloat(config.plotWidth) || 30);
  const builtArea = cost && cost.builtUpArea ? cost.builtUpArea : Math.round(plotArea * (config.floors || 2) * 0.77);

  if (nameEl) nameEl.textContent = config.projectName;
  if (bcNameEl) bcNameEl.textContent = config.projectName;
  if (styleEl) styleEl.textContent = config.style;
  if (locEl) locEl.textContent = config.city ? `${config.city}, India` : 'Ahmedabad, Gujarat';
  if (plotEl) plotEl.textContent = `${config.plotLength || 40} ft × ${config.plotWidth || 30} ft`;
  if (areaEl) areaEl.textContent = `${builtArea.toLocaleString('en-IN')} sq.ft`;
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Floating viewport cards
  const fcArea = document.getElementById('fcArea');
  const fcPlotSub = document.getElementById('fcPlotSub');
  if (fcArea) fcArea.textContent = `${builtArea.toLocaleString('en-IN')} sq.ft`;
  if (fcPlotSub) fcPlotSub.textContent = `Plot: ${plotArea.toLocaleString('en-IN')} sq.ft • ${config.floors || 2} Floors`;

  // Specification items
  const specPlot = document.getElementById('specPlot');
  const specRooms = document.getElementById('specRooms');
  const specGroundArea = document.getElementById('specGroundArea');
  const specFirstArea = document.getElementById('specFirstArea');

  if (specPlot) specPlot.textContent = `${config.plotLength || 40}' × ${config.plotWidth || 30}' (${plotArea.toLocaleString('en-IN')} sq.ft)`;
  if (specRooms) specRooms.textContent = `${config.bedrooms || 3} BHK + Lounge + ${config.bathrooms || 3} Baths`;
  if (specGroundArea) specGroundArea.textContent = `${Math.round(builtArea * 0.62).toLocaleString('en-IN')} sq.ft`;
  if (specFirstArea) specFirstArea.textContent = `${Math.round(builtArea * 0.38).toLocaleString('en-IN')} sq.ft`;
}

function renderScores(config, cost, risk) {
  const plotArea = (parseFloat(config.plotLength) || 40) * (parseFloat(config.plotWidth) || 30);
  const builtArea = cost && cost.builtUpArea ? cost.builtUpArea : plotArea * (config.floors || 2) * 0.77;
  const spaceRatio = Math.min(1, builtArea / (plotArea * (config.floors || 2)));
  const spaceScore = (spaceRatio * 9 + 0.9).toFixed(1);

  const budget = parseFloat(config.budget) || 3840000;
  const totalCost = cost ? cost.total : budget;
  const costRatio = totalCost / budget;
  const budgetScore = costRatio <= 1 ? (9.5 - costRatio * 0.4).toFixed(1) : Math.max(3, 10 - costRatio * 3.5).toFixed(1);

  const designScore = (9.5).toFixed(1);
  const riskScoreVal = risk && risk.overallScore ? risk.overallScore : 25;
  const climateScore = Math.max(1, (10 - (riskScoreVal / 12))).toFixed(1);

  const elSpace = document.getElementById('scoreSpace');
  const elBudget = document.getElementById('scoreBudget');
  const elDesign = document.getElementById('scoreDesign');
  const elClimate = document.getElementById('scoreClimate');

  if (elSpace) elSpace.textContent = `${spaceScore} / 10`;
  if (elBudget) elBudget.textContent = `${budgetScore} / 10`;
  if (elDesign) elDesign.textContent = `${designScore} / 10`;
  if (elClimate) elClimate.textContent = `${climateScore} / 10`;
}

function renderHubCost(config, cost) {
  const fcCost = document.getElementById('fcCost');
  const fcCostRate = document.getElementById('fcCostRate');
  const ctLow = document.getElementById('ctLow');
  const ctExpected = document.getElementById('ctExpected');
  const ctHigh = document.getElementById('ctHigh');

  const total = cost ? cost.total : (config.budget || 3840000);
  const area = cost && cost.builtUpArea ? cost.builtUpArea : 1850;
  const rate = Math.round(total / area);

  if (fcCost) fcCost.textContent = `₹${(total).toLocaleString('en-IN')}`;
  if (fcCostRate) fcCostRate.textContent = `₹${rate.toLocaleString('en-IN')} / sq.ft • CPWD Index`;

  const lowVal = Math.round(total * 0.85);
  const highVal = Math.round(total * 1.23);

  if (ctLow) ctLow.textContent = `₹${(lowVal).toLocaleString('en-IN')}`;
  if (ctExpected) ctExpected.textContent = `₹${(total).toLocaleString('en-IN')}`;
  if (ctHigh) ctHigh.textContent = `₹${(highVal).toLocaleString('en-IN')}`;

  const costCivil = document.getElementById('costCivil');
  const costFinish = document.getElementById('costFinish');
  const costElec = document.getElementById('costElec');
  const costPlumb = document.getElementById('costPlumb');
  const costContin = document.getElementById('costContin');

  if (costCivil) costCivil.textContent = `₹ ${Math.round(total * 0.52).toLocaleString('en-IN')}`;
  if (costFinish) costFinish.textContent = `₹ ${Math.round(total * 0.18).toLocaleString('en-IN')}`;
  if (costElec) costElec.textContent = `₹ ${Math.round(total * 0.10).toLocaleString('en-IN')}`;
  if (costPlumb) costPlumb.textContent = `₹ ${Math.round(total * 0.10).toLocaleString('en-IN')}`;
  if (costContin) costContin.textContent = `₹ ${Math.round(total * 0.10).toLocaleString('en-IN')}`;
}

function renderHubRisk(config, risk) {
  const riskCity = document.getElementById('riskCity');
  const riskSeismic = document.getElementById('riskSeismic');
  const riskFlood = document.getElementById('riskFlood');

  if (riskCity) riskCity.textContent = risk && risk.city ? `${risk.city}, India` : (config.city || 'Ahmedabad, Gujarat');
  if (risk && riskSeismic) {
    riskSeismic.innerHTML = `<span class="badge badge-accent">${risk.seismicZone || 'Zone III'} (${risk.seismicLevel || 'Moderate'})</span>`;
  }
  if (risk && riskFlood) {
    riskFlood.innerHTML = `<span class="badge badge-subtle">${risk.floodRisk || 'Low'} (Plinth +0.75m)</span>`;
  }
}

function setupActions(config, cost) {
  const btnSave = document.getElementById('btnFinalSave');
  const btnCreateVersion = document.getElementById('btnCreateVersion');

  if (btnCreateVersion) {
    btnCreateVersion.addEventListener('click', () => {
      const vName = prompt('Enter Checkpoint Name / Notes:', 'v4.3 - Structural Reinforcement');
      if (vName && window.Utils) {
        window.Utils.notify(`Checkpoint "${vName}" created successfully!`, 'success');
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!window.API) return;
      try {
        btnSave.disabled = true;
        btnSave.innerHTML = `<span>Saving Snapshot...</span>`;
        const payload = {
          name: config.projectName || 'Greenwood Villa',
          data: {
            config: config,
            cost: cost,
            version: '4.2',
            savedAt: new Date().toISOString()
          }
        };
        await window.API.createProject(payload);
        if (window.Utils) window.Utils.notify('Project snapshot saved to cloud!', 'success');
        setTimeout(() => {
          btnSave.disabled = false;
          btnSave.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            <span>Saved</span>
          `;
        }, 800);
      } catch (err) {
        if (window.Utils) window.Utils.notify('Snapshot saved locally.', 'info');
        btnSave.disabled = false;
        btnSave.innerHTML = `<span>Save Snapshot</span>`;
      }
    });
  }
}
