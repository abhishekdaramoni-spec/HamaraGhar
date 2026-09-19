// Construction cost estimation engine
// IMPORTANT: All outputs are ESTIMATES, not official quotations
const CostEngine = {
  // Default rates (overridden by API data)
  rates: {
    construction_per_sqft: { basic: 1200, standard: 1800, premium: 2800, luxury: 4500 },
    foundation_multiplier: 0.15,
    labor_multiplier: 0.25,
    contingency_multiplier: 0.08,
    electrical_per_sqft: 80,
    plumbing_per_sqft: 65,
    painting_per_sqft_wall: 20,
    interior_per_room: { modern: 45000, minimal: 35000, traditional: 55000, luxury: 120000 },
    parking_cost: 80000,
    balcony_per_sqft: 600,
    compound_wall_per_rft: 800,
    garden_per_sqft: 150,
    staircase_per_floor: 35000
  },
  
  calculate(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    const pLength = Math.max(10, Math.min(500, parseFloat(cfg.plotLength || cfg.plot_length) || 40));
    const pWidth = Math.max(10, Math.min(500, parseFloat(cfg.plotWidth || cfg.plot_width) || 30));
    const floors = Math.max(1, Math.min(10, parseInt(cfg.floors) || 1));
    const rooms = Math.max(1, Math.min(20, parseInt(cfg.rooms || cfg.bedrooms) || 3));
    const builtUpArea = Math.round(pLength * pWidth * 0.7 * floors);
    
    const quality = (cfg.materialQuality && this.rates.construction_per_sqft[cfg.materialQuality]) ? cfg.materialQuality : 'standard';
    const rate = this.rates.construction_per_sqft[quality];
    const style = (cfg.style && this.rates.interior_per_room[cfg.style]) ? cfg.style : 'minimal';
    const interiorRate = this.rates.interior_per_room[style];
    const civilCost = builtUpArea * rate;
    
    const breakdown = {
      builtUpArea,
      items: [
        { label: 'Civil Construction', amount: Math.round(civilCost) },
        { label: 'Foundation', amount: Math.round(civilCost * this.rates.foundation_multiplier) },
        { label: 'Doors & Windows', amount: Math.round(builtUpArea * 150) },
        { label: 'Electrical Works', amount: Math.round(builtUpArea * this.rates.electrical_per_sqft) },
        { label: 'Plumbing & Sanitary', amount: Math.round(builtUpArea * this.rates.plumbing_per_sqft) },
        { label: 'Painting & Finishing', amount: Math.round(builtUpArea * 1.5 * this.rates.painting_per_sqft_wall) },
        { label: 'Interior Furnishing', amount: Math.round(rooms * interiorRate) },
        { label: 'Labor Charges', amount: Math.round(civilCost * this.rates.labor_multiplier) },
      ],
      subtotal: 0,
      contingency: 0,
      total: 0,
      disclaimer: 'This is a planning estimate only (CPWD DSR 2024–2026). Consult a licensed structural engineer and contractor.'
    };
    
    if (floors > 1) breakdown.items.push({ label: 'Staircase', amount: (floors - 1) * this.rates.staircase_per_floor });
    if (cfg.parking) breakdown.items.push({ label: 'Parking', amount: this.rates.parking_cost });
    if (cfg.compound) {
      const perim = Math.max(40, parseFloat(cfg.perimeter) || (pLength * 2 + pWidth * 2));
      breakdown.items.push({ label: 'Compound Wall', amount: Math.round(perim * this.rates.compound_wall_per_rft) });
    }
    if (cfg.garden) {
      const gArea = Math.max(20, parseFloat(cfg.gardenArea) || (pLength * pWidth * 0.2));
      breakdown.items.push({ label: 'Garden', amount: Math.round(gArea * this.rates.garden_per_sqft) });
    }
    if (cfg.balcony) {
      const bArea = Math.max(20, parseFloat(cfg.balconyArea) || 50);
      breakdown.items.push({ label: 'Balcony', amount: Math.round(bArea * this.rates.balcony_per_sqft) });
    }

    breakdown.subtotal = Math.round(breakdown.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
    breakdown.contingency = Math.round(breakdown.subtotal * this.rates.contingency_multiplier);
    breakdown.total = breakdown.subtotal + breakdown.contingency;
    
    return breakdown;
  },
  
  format(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const val = Math.max(0, Math.round(Number(amount)));
    return '₹' + val.toLocaleString('en-IN');
  },
  
  compareWithBudget(total, budget) {
    const t = Number(total) || 0;
    const b = Number(budget) || 0;
    if (!b || b <= 0) return { status: 'ok', label: 'No Budget Provided', color: 'info' };
    const ratio = t / b;
    if (ratio <= 0.85) return { status: 'under', label: 'Well within budget', color: 'success' };
    if (ratio <= 1.0) return { status: 'ok', label: 'Within budget', color: 'success' };
    if (ratio <= 1.15) return { status: 'slight', label: 'Slightly over budget', color: 'warning' };
    return { status: 'over', label: 'Over budget', color: 'danger' };
  }
};

window.CostEngine = CostEngine;

