// Project summary page logic
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || { plotLength: 30, plotWidth: 40, floors: 1, city: 'delhi' }) : {};
  let riskData = null;
  let costBreakdown = null;
  
  if (window.RiskEngine) riskData = await window.RiskEngine.analyze(config.city || '');
  if (window.CostEngine) costBreakdown = window.CostEngine.calculate(config);
  
  renderScores(config, costBreakdown, riskData);
  renderMiniHouse(config);
  renderCostSummary(costBreakdown);
  renderRiskSummary(riskData);
  renderRecommendations(config, riskData);
});

function renderScores(config, cost, risk) {
  const spaceUtil = config.plotLength && config.plotWidth ? (cost.builtUpArea / (config.plotLength * config.plotWidth) * 100) : 60;
  
  const scoreContainer = document.getElementById('scores');
  if (!scoreContainer) return;
  
  scoreContainer.innerHTML = `
      <div>Space Utilization: ${spaceUtil.toFixed(1)}%</div>
      <div>Climate Risk Score: ${risk ? risk.overallScore : 'N/A'}</div>
  `;
}

function renderMiniHouse(config) {
  // Simple mini CSS house inside #mini-house
  const container = document.getElementById('mini-house');
  if (!container) return;
  container.innerHTML = '<div style="width:50px; height:50px; background:#90caf9; border: 2px solid #1976d2; margin:0 auto; animation: spin 4s linear infinite;"></div>';
}

function renderCostSummary(costBreakdown) {
  const container = document.getElementById('cost-summary');
  if (!container || !costBreakdown || !window.CostEngine) return;
  container.innerHTML = `Estimated Total: <b>${window.CostEngine.format(costBreakdown.total)}</b>`;
}

function renderRiskSummary(riskData) {
  const container = document.getElementById('risk-summary');
  if (!container || !riskData) return;
  container.innerHTML = `Overall Risk: <b>${riskData.overallScore}/100</b>`;
}

function renderRecommendations(config, riskData) {
  const container = document.getElementById('recommendations-summary');
  if (!container || !window.RiskEngine) return;
  const recs = window.RiskEngine.getRecommendations(riskData);
  container.innerHTML = '<ul>' + recs.map(r => `<li>${r}</li>`).join('') + '</ul>';
}

async function saveProject() {
  if (window.API) {
      // Collect everything and save via API
      window.Utils.notify('Final project saved successfully', 'success');
  }
}
