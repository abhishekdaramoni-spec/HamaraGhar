// Location risk analysis engine
// Uses pre-loaded location_risk.json data
// IMPORTANT: For educational/planning purposes only
const RiskEngine = {
  riskData: {
      "mumbai": { seismic: "Medium", flood: "High", wind: "Medium", soil: "Low" },
      "delhi": { seismic: "High", flood: "Medium", wind: "Low", soil: "Medium" },
      "bangalore": { seismic: "Low", flood: "Low", wind: "Medium", soil: "Low" },
      "chennai": { seismic: "Medium", flood: "High", wind: "High", soil: "Medium" },
      "kolkata": { seismic: "Medium", flood: "High", wind: "Very High", soil: "High" },
      "default": { seismic: "Medium", flood: "Medium", wind: "Medium", soil: "Medium" }
  },
  
  async loadData() { 
      // In a real app, fetch from /api/data/risk endpoint
      // this.riskData = await API.getRisk();
  },
  
  async analyze(city, state) {
    const normalizedCity = (city || '').trim().toLowerCase();
    const data = this.riskData[normalizedCity] || this.riskData["default"];
    return {
        city: city,
        categories: {
            Seismic: { level: data.seismic, score: this.getScore(data.seismic) },
            Flood: { level: data.flood, score: this.getScore(data.flood) },
            Wind: { level: data.wind, score: this.getScore(data.wind) },
            Soil: { level: data.soil, score: this.getScore(data.soil) }
        },
        overallScore: this.getOverallScore(data)
    };
  },
  
  getScore(level) {
      const scores = { Low: 10, Medium: 40, High: 75, 'Very High': 95 };
      return scores[level] || 50;
  },
  
  getLevelColor(level) {
    const colors = { Low: 'low', Medium: 'medium', High: 'high', 'Very High': 'high' };
    return colors[level] || 'unknown';
  },
  
  getLevelIcon(level) {
    const icons = { Low: '✅', Medium: '⚠️', High: '🔴', 'Very High': '🚨' };
    return icons[level] || '❓';
  },
  
  getRecommendations(riskData) {
    const recs = [];
    if (riskData.categories.Seismic.score > 50) recs.push("Consider earthquake-resistant structural design (IS 1893).");
    if (riskData.categories.Flood.score > 50) recs.push("Elevate plinth level to prevent water logging.");
    if (riskData.categories.Wind.score > 50) recs.push("Ensure adequate roof tie-downs and window reinforcement.");
    if (riskData.categories.Soil.score > 50) recs.push("Deep foundation / pile foundation may be necessary. Conduct soil test.");
    if (recs.length === 0) recs.push("Standard construction practices should suffice.");
    return recs;
  },
  
  getOverallScore(data) {
    const total = this.getScore(data.seismic) + this.getScore(data.flood) + this.getScore(data.wind) + this.getScore(data.soil);
    return Math.round(total / 4);
  }
};

window.RiskEngine = RiskEngine;

