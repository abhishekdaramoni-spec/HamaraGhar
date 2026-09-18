// Project summary page logic
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || {}) : {};
  
  const safeConfig = {
    projectName: config.projectName || 'My Dream Home',
    style: config.style || 'Modern',
    plotLength: parseFloat(config.plotLength) || 40,
    plotWidth: parseFloat(config.plotWidth) || 30,
    floors: parseInt(config.floors) || 1,
    bedrooms: parseInt(config.bedrooms) || 2,
    bathrooms: parseInt(config.bathrooms) || 2,
    budget: parseInt(config.budget) || 3500000,
    city: config.city || 'Bangalore',
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

  renderHeader(safeConfig);
  renderScores(safeConfig, costBreakdown, riskData);
  renderCostDetails(safeConfig, costBreakdown);
  renderRiskDetails(safeConfig, riskData);
  renderRecommendations(safeConfig, riskData);
  setupActions(safeConfig, costBreakdown);
});

function renderHeader(config) {
  const nameEl = document.getElementById('sumProjectName');
  const styleEl = document.getElementById('sumStyle');
  const dateEl = document.getElementById('sumDate');

  if (nameEl) nameEl.textContent = config.projectName;
  if (styleEl) styleEl.textContent = config.style;
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderScores(config, cost, risk) {
  const plotArea = (parseFloat(config.plotLength) || 1) * (parseFloat(config.plotWidth) || 1);
  const builtArea = cost && cost.builtUpArea ? cost.builtUpArea : plotArea * 0.7;
  const spaceRatio = Math.min(1, builtArea / (plotArea * (config.floors || 1)));
  const spaceScore = (spaceRatio * 9 + 1).toFixed(1);

  const budget = parseFloat(config.budget) || 1;
  const totalCost = cost ? cost.total : budget;
  const costRatio = totalCost / budget;
  const budgetScore = costRatio <= 1 ? (9.5 - costRatio * 1.5).toFixed(1) : Math.max(3, 10 - costRatio * 4).toFixed(1);

  const designScore = (8.5).toFixed(1);

  const riskScoreVal = risk && risk.overallScore ? risk.overallScore : 25;
  const climateScore = Math.max(1, (10 - (riskScoreVal / 10))).toFixed(1);

  const elSpace = document.getElementById('scoreSpace');
  const elBudget = document.getElementById('scoreBudget');
  const elDesign = document.getElementById('scoreDesign');
  const elClimate = document.getElementById('scoreClimate');

  if (elSpace) elSpace.textContent = `${spaceScore}/10`;
  if (elBudget) elBudget.textContent = `${budgetScore}/10`;
  if (elDesign) elDesign.textContent = `${designScore}/10`;
  if (elClimate) elClimate.textContent = `${climateScore}/10`;
}

function renderCostDetails(config, cost) {
  const elCost = document.getElementById('sumCost');
  const elTargetBudget = document.getElementById('sumTargetBudget');
  const elArea = document.getElementById('sumArea');
  const elCostPerSqft = document.getElementById('sumCostPerSqft');

  if (!cost || !window.CostEngine) return;

  if (elCost) elCost.textContent = window.CostEngine.format(cost.total);
  if (elTargetBudget) elTargetBudget.textContent = window.CostEngine.format(config.budget || 0);
  if (elArea) elArea.textContent = cost.builtUpArea.toLocaleString('en-IN');
  if (elCostPerSqft && cost.builtUpArea > 0) {
    const rate = Math.round(cost.total / cost.builtUpArea);
    elCostPerSqft.textContent = `₹${rate.toLocaleString('en-IN')}`;
  }
}

function renderRiskDetails(config, risk) {
  const listEl = document.getElementById('sumRiskList');
  if (!listEl) return;

  if (!risk) {
    listEl.innerHTML = `<li>Location: <strong>${config.city || 'Standard City'}</strong></li><li>Risk Level: <strong>Low to Moderate</strong></li>`;
    return;
  }

  listEl.innerHTML = `
    <li><strong>Location:</strong> <span>${risk.city || config.city}</span></li>
    <li><strong>Overall Risk:</strong> <span class="badge ${risk.overallScore > 50 ? 'badge-danger' : 'badge-success'}">${risk.overallScore}/100</span></li>
    <li><strong>Seismic Zone:</strong> <span>${risk.seismicZone || 'Zone II/III'}</span></li>
    <li><strong>Flood Hazard:</strong> <span>${risk.floodRisk || 'Low'}</span></li>
  `;
}

function renderRecommendations(config, risk) {
  const container = document.getElementById('finalRecommendations');
  if (!container) return;

  const recs = [];
  if (window.RiskEngine && risk) {
    const riskRecs = window.RiskEngine.getRecommendations(risk);
    if (Array.isArray(riskRecs)) recs.push(...riskRecs);
  }

  if (recs.length === 0) {
    recs.push('Ensure proper soil testing and RCC structural foundation design.');
    recs.push('Use certified M25 grade concrete for slab casting and columns.');
    recs.push('Incorporate rainwater harvesting and cross-ventilation in floor layout.');
  }

  container.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
}

function setupActions(config, cost) {
  const btnSave = document.getElementById('btnFinalSave');
  const btnPrint = document.getElementById('btnPrint');

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!window.API) return;
      try {
        btnSave.disabled = true;
        btnSave.textContent = 'Saving...';
        const payload = {
          name: config.projectName || 'My House Plan',
          data: {
            config: config,
            cost: cost,
            savedAt: new Date().toISOString()
          }
        };
        await window.API.createProject(payload);
        if (window.Utils) window.Utils.notify('Project successfully saved to Dashboard!', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1200);
      } catch (err) {
        if (window.Utils) window.Utils.notify('Failed to save project. Please log in.', 'error');
        btnSave.disabled = false;
        btnSave.textContent = 'Save Project';
      }
    });
  }
}
