# Data Sources for SmartBuild 3D

This document outlines the data sources, assumptions, and methodologies used to power the planning estimates and risk analyses in SmartBuild 3D.

## Construction Cost Rates
- **Source**: Industry standard estimates for Tier-1 Indian cities (Mumbai, Bengaluru, Delhi, etc.)
- **Dataset**: `cost_rates.json`
- **Date Accessed**: 2024 Estimates
- **How it's used**: Used to calculate approximate base construction costs per square foot depending on material quality (basic, standard, premium, luxury).
- **License**: Proprietary estimation model for educational use.

## Material Data
- **Source**: Aggregate market rates across major hardware and construction suppliers.
- **Dataset**: `materials.json`
- **Date Accessed**: 2024 Estimates
- **How it's used**: Provides users with options to customize the finish of their home (walls, floors, roof, etc.) and adjusts total costs accordingly.
- **License**: Created for demonstration and educational purposes.

## Location Risk Data
- **Source**: 
  - National Disaster Management Authority (NDMA) vulnerability profiles.
  - Indian Meteorological Department (IMD) historical data for rainfall, cyclones, and heat.
  - Bureau of Indian Standards (BIS) IS:1893 for Seismic Zones.
- **Dataset**: `location_risk.json`
- **Date Accessed**: 2024 (based on latest available public zoning maps)
- **How it's used**: To provide users with early-stage warnings about environmental risks (floods, earthquakes) in their city, along with general architectural recommendations.
- **License**: Aggregated public domain data, structured for educational use.

## Layout Templates
- **Source**: Standard residential planning norms and building bylaws in India.
- **Dataset**: `house_layouts.json`
- **How it's used**: Gives users a realistic starting point for floor plans based on their plot size and BHK requirements.
- **License**: Custom templates.

---

## ⚠️ Important Disclaimers

> **Educational & Planning Purposes Only**
> All data provided in this application is strictly for preliminary educational and conceptual planning purposes.

1. **Cost Estimates**: The construction rates are approximate 2024 estimates for India. Actual costs will vary significantly depending on the specific location, contractor rates, fluctuations in material costs, and site conditions.
2. **Risk Data**: The risk data is based on broad NDMA zones and IMD data. It does not replace a professional site-specific survey.
3. **Layout Norms**: The layout templates are based on standard Indian residential planning norms but do not guarantee compliance with local municipal bylaws.
4. **Professional Consultation**: Always consult licensed architects, structural engineers, and local municipal authorities before beginning any actual construction or purchasing land.
