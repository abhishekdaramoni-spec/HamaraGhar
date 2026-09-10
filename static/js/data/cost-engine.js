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
    // config: { plotLength, plotWidth, floors, rooms, bedrooms, bathrooms, style, materialQuality,
    //           parking, balcony, garden, compound, balconyArea, gardenArea, perimeter }
    const builtUpArea = config.plotLength * config.plotWidth * 0.6 * config.floors;
    const rate = this.rates.construction_per_sqft[config.materialQuality || 'standard'];
    const civilCost = builtUpArea * rate;
    
    const breakdown = {
      builtUpArea,
      items: [
        { label: 'Civil Construction', amount: civilCost },
        { label: 'Foundation', amount: civilCost * this.rates.foundation_multiplier },
        { label: 'Doors & Windows', amount: builtUpArea * 150 }, // approx 150/sqft
        { label: 'Electrical Works', amount: builtUpArea * this.rates.electrical_per_sqft },
        { label: 'Plumbing & Sanitary', amount: builtUpArea * this.rates.plumbing_per_sqft },
        { label: 'Painting & Finishing', amount: builtUpArea * 1.5 * this.rates.painting_per_sqft_wall }, // approx wall area
        { label: 'Interior Furnishing', amount: (config.rooms || 3) * this.rates.interior_per_room[config.style || 'minimal'] },
        { label: 'Labor Charges', amount: civilCost * this.rates.labor_multiplier },
      ],
      subtotal: 0,
      contingency: 0,
      total: 0,
      disclaimer: 'This is a planning estimate only. Actual costs may vary. Consult a licensed contractor.'
    };
    
    if (config.floors > 1) breakdown.items.push({ label: 'Staircase', amount: (config.floors - 1) * this.rates.staircase_per_floor });
    if (config.parking) breakdown.items.push({ label: 'Parking', amount: this.rates.parking_cost });
    if (config.compound) breakdown.items.push({ label: 'Compound Wall', amount: (config.perimeter || (config.plotLength*2 + config.plotWidth*2)) * this.rates.compound_wall_per_rft });
    if (config.garden) breakdown.items.push({ label: 'Garden', amount: (config.gardenArea || (config.plotLength*config.plotWidth*0.2)) * this.rates.garden_per_sqft });
    if (config.balcony) breakdown.items.push({ label: 'Balcony', amount: (config.balconyArea || 50) * this.rates.balcony_per_sqft });

    breakdown.subtotal = breakdown.items.reduce((sum, item) => sum + item.amount, 0);
    breakdown.contingency = breakdown.subtotal * this.rates.contingency_multiplier;
    breakdown.total = breakdown.subtotal + breakdown.contingency;
    
    return breakdown;
  },
  
  format(amount) { return '₹' + amount.toLocaleString('en-IN'); },
  
  compareWithBudget(total, budget) {
    if (!budget) return { status: 'ok', label: 'No Budget Provided', color: 'info' };
    const diff = budget - total;
    const ratio = total / budget;
    if (ratio <= 0.85) return { status: 'under', label: 'Well within budget', color: 'success' };
    if (ratio <= 1.0) return { status: 'ok', label: 'Within budget', color: 'success' };
    if (ratio <= 1.15) return { status: 'slight', label: 'Slightly over budget', color: 'warning' };
    return { status: 'over', label: 'Over budget', color: 'danger' };
  }
};
