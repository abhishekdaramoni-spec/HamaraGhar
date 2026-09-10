// Rule-based house recommendation engine
// DO NOT call this AI - it is a RULE-BASED system
const RuleEngine = {
  analyze(requirements) {
    // requirements: { familySize, plotLength, plotWidth, budget, bedrooms, bathrooms, floors, style, parking, balcony, garden }
    
    const plotArea = requirements.plotLength * requirements.plotWidth;
    const result = {
      recommendedBedrooms: 0,
      recommendedBathrooms: 0,
      recommendedFloors: 0,
      recommendedRoomsPerFloor: 0,
      builtUpArea: 0,
      builtUpRatio: 0,
      materialQuality: '',
      layoutId: '',
      warnings: [],
      suggestions: []
    };
    
    // Rules for bedrooms based on family size
    if (requirements.familySize <= 2) result.recommendedBedrooms = 1;
    else if (requirements.familySize <= 4) result.recommendedBedrooms = 2;
    else if (requirements.familySize <= 6) result.recommendedBedrooms = 3;
    else result.recommendedBedrooms = 4;
    
    // Rules for floors based on plot area and bedrooms
    if (plotArea < 800 && result.recommendedBedrooms > 2) {
        result.recommendedFloors = 2;
    } else {
        result.recommendedFloors = 1;
    }

    result.recommendedBathrooms = Math.max(1, result.recommendedBedrooms - 1);
    result.recommendedRoomsPerFloor = Math.ceil(result.recommendedBedrooms / result.recommendedFloors) + 1; // +1 for living/kitchen

    // Ground coverage rules
    result.builtUpArea = plotArea * 0.6; // 60% ground coverage allowed typically
    result.builtUpRatio = 0.6;
    
    // Rules for material quality based on budget
    result.materialQuality = this.getBudgetCategory(requirements.budget);
    
    // Warnings
    if (requirements.budget < 1000000) {
        result.warnings.push("Budget is very tight for standard construction.");
    }
    if (plotArea < 400) {
        result.warnings.push("Plot area is extremely small, consider vertical building.");
    }

    // Suggestions
    if (requirements.parking && plotArea < 600) {
        result.suggestions.push("Stilt parking is recommended for small plots.");
    }
    
    result.layoutId = this.getLayoutTemplate(result.recommendedBedrooms, plotArea);
    
    return result;
  },
  
  getLayoutTemplate(bhk, plotArea) { 
      if (plotArea < 600) return 'layout_compact_1';
      if (bhk === 1) return 'layout_1bhk';
      if (bhk === 2) return 'layout_2bhk';
      return 'layout_3bhk_plus';
  },
  
  getBudgetCategory(budget) {
    if (budget < 1500000) return 'basic';
    if (budget < 3000000) return 'standard';
    if (budget < 6000000) return 'premium';
    return 'luxury';
  },
  
  getPlotCategory(area) {
    if (area < 600) return 'compact';
    if (area < 1200) return 'medium';
    if (area < 2400) return 'large';
    return 'estate';
  }
};
