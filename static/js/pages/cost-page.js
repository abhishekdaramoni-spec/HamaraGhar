// Cost estimation page logic
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || { plotLength: 30, plotWidth: 40, floors: 1, materialQuality: 'standard' }) : {};
  try {
      if (window.API) {
          const rates = await window.API.getCostRates();
          if (rates) window.CostEngine.rates = { ...window.CostEngine.rates, ...rates };
      }
  } catch(e) { console.warn("Failed to load live rates, using defaults."); }
  renderCostBreakdown(config);
});

function renderCostBreakdown(config) {
  if (!window.CostEngine) return;
  const breakdown = window.CostEngine.calculate(config);
  
  const tbody = document.getElementById('cost-table-body');
  if (tbody) {
      tbody.innerHTML = breakdown.items.map(item => `
          <tr>
              <td>${item.label}</td>
              <td style="text-align:right;">${window.CostEngine.format(item.amount)}</td>
          </tr>
      `).join('');
      
      // Totals
      tbody.innerHTML += `
          <tr style="font-weight:bold; background:#f5f5f5;">
              <td>Subtotal</td>
              <td style="text-align:right;">${window.CostEngine.format(breakdown.subtotal)}</td>
          </tr>
          <tr>
              <td>Contingency (8%)</td>
              <td style="text-align:right;">${window.CostEngine.format(breakdown.contingency)}</td>
          </tr>
          <tr style="font-weight:bold; font-size:1.1em; background:#e0f7fa;">
              <td>Estimated Total</td>
              <td style="text-align:right;">${window.CostEngine.format(breakdown.total)}</td>
          </tr>
      `;
  }
  
  // Budget Comparison
  if (config.budget) {
      const budgetStatus = window.CostEngine.compareWithBudget(breakdown.total, config.budget);
      const statusEl = document.getElementById('budget-status');
      if (statusEl) {
          statusEl.innerHTML = `<span class="badge badge-${budgetStatus.color}">${budgetStatus.label}</span>`;
      }
  }
}
