// Risk analysis page logic
document.addEventListener('DOMContentLoaded', () => {
  const config = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || {}) : {};
  if (config.city) {
      const cityEl = document.getElementById('city');
      const stateEl = document.getElementById('state');
      if (cityEl) cityEl.value = config.city;
      if (stateEl) stateEl.value = config.state || '';
      analyzeLocation();
  }
  
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
      analyzeBtn.addEventListener('click', analyzeLocation);
  }
});

async function analyzeLocation() {
  const cityEl = document.getElementById('city');
  if (!cityEl) return;
  const city = cityEl.value.trim();
  if (!city) { 
      if (window.Utils) window.Utils.notify('Please enter a city name', 'error'); 
      return; 
  }
  
  if (window.RiskEngine) {
      const riskData = await window.RiskEngine.analyze(city);
      renderRiskCards(riskData);
      renderRecommendations(riskData);
  }
}

function renderRiskCards(riskData) {
  const container = document.getElementById('risk-cards');
  if (!container || !window.RiskEngine) return;
  
  container.innerHTML = Object.entries(riskData.categories).map(([key, data]) => {
      const color = window.RiskEngine.getLevelColor(data.level);
      const icon = window.RiskEngine.getLevelIcon(data.level);
      return `
          <div class="card risk-card risk-${color}">
              <h3>${icon} ${key} Risk</h3>
              <p style="font-size: 1.2em; font-weight: bold;">${data.level}</p>
          </div>
      `;
  }).join('');
}

function renderRecommendations(riskData) {
  const container = document.getElementById('risk-recommendations');
  if (!container || !window.RiskEngine) return;
  
  const recs = window.RiskEngine.getRecommendations(riskData);
  container.innerHTML = '<ul>' + recs.map(r => `<li>${r}</li>`).join('') + '</ul>';
}
