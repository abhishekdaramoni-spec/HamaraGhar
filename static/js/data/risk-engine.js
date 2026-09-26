// HamaraGhar — Location Hazard Intelligence & IS 1893 Resilience Engine
const RiskEngine = {
    // Comprehensive offline dictionary for major Indian hubs
    cityDatabase: {
        "bengaluru": {
            state: "Karnataka",
            seismic_zone: "II",
            seismic_risk: "Low",
            flood: "Medium",
            heat: "Low",
            rainfall: "Medium",
            wind: "Low",
            cyclone: "Low",
            waterlogging: "High",
            resilience_score: 88,
            recommendations: [
                "Elevate finished plinth level by at least 600mm above road grade to eliminate urban runoff backflow.",
                "Implement dual-layer rooftop waterproofing with minimum 1:100 slope to rainwater downspouts.",
                "Ensure Seismic Zone II nominal ductile detailing in accordance with IS 1893:2016 Part 1.",
                "Construct a dedicated rainwater harvesting percolation pit (min. 10,000L) to recharge groundwater."
            ]
        },
        "mumbai": {
            state: "Maharashtra",
            seismic_zone: "III",
            seismic_risk: "Moderate",
            flood: "High",
            heat: "Medium",
            rainfall: "High",
            wind: "Medium",
            cyclone: "Medium",
            waterlogging: "Severe",
            resilience_score: 68,
            recommendations: [
                "Elevate plinth level by minimum 900mm above road level and install dual automated sump pumps.",
                "Apply crystalline waterproofing to all foundation walls, basement retaining slabs, and plinth beams.",
                "Use hot-dip galvanized or epoxy-coated reinforcement near coastal zones to resist salt corrosion.",
                "Ensure strict compliance with IS 1893:2016 Zone III ductile frame confinement detailing."
            ]
        },
        "delhi": {
            state: "Delhi NCR",
            seismic_zone: "IV",
            seismic_risk: "High",
            flood: "Low",
            heat: "Severe",
            rainfall: "Low",
            wind: "Medium",
            cyclone: "Low",
            waterlogging: "Medium",
            resilience_score: 72,
            recommendations: [
                "Mandatory structural compliance with IS 1893 Zone IV: close-spaced stirrups (100mm) at all column-beam joints.",
                "Incorporate external wall cavity insulation (50mm XPS or Rockwool) to buffer 45°C summer heat.",
                "Apply high-solar-reflectance index (SRI > 80) cool roof coatings to reduce top-floor heat load.",
                "Incorporate airtight window seals and mechanical ventilation with air filtration."
            ]
        },
        "chennai": {
            state: "Tamil Nadu",
            seismic_zone: "III",
            seismic_risk: "Moderate",
            flood: "High",
            heat: "High",
            rainfall: "High",
            wind: "High",
            cyclone: "High",
            waterlogging: "High",
            resilience_score: 64,
            recommendations: [
                "Elevate plinth level by at least 750mm and construct peripheral perimeter drainage channels.",
                "Install cyclone-rated window anchors and laminated safety glass on coastal-facing facades.",
                "Use anti-corrosion zinc-rich primer on all structural steel and exterior railings.",
                "Comply with IS 1893 Zone III ductile reinforcement standards."
            ]
        },
        "hyderabad": {
            state: "Telangana",
            seismic_zone: "II",
            seismic_risk: "Low",
            flood: "Medium",
            heat: "High",
            rainfall: "Medium",
            wind: "Low",
            cyclone: "Low",
            waterlogging: "Medium",
            resilience_score: 84,
            recommendations: [
                "Raise plinth level by 600mm to safeguard against flash flooding in rocky terrain.",
                "Implement deep window chajjas (600mm) on South and West elevations to cut severe summer heat.",
                "Ensure standard Seismic Zone II nominal ductile framing.",
                "Install rainwater harvesting pits to recharge local granite borehole aquifers."
            ]
        },
        "kolkata": {
            state: "West Bengal",
            seismic_zone: "III",
            seismic_risk: "Moderate",
            flood: "High",
            heat: "High",
            rainfall: "High",
            wind: "High",
            cyclone: "High",
            waterlogging: "High",
            resilience_score: 65,
            recommendations: [
                "Conduct pile soil bearing test (deep soft alluvial clay soil requires engineered raft or pile foundation).",
                "Raise plinth level by at least 750mm to mitigate tidal and monsoon waterlogging.",
                "Apply heavy-duty anti-termite and damp-proof membrane beneath ground floor slabs.",
                "Secure all rooftop structures and sheet roofing with cyclone-rated anchor bolts."
            ]
        },
        "pune": {
            state: "Maharashtra",
            seismic_zone: "III",
            seismic_risk: "Moderate",
            flood: "Medium",
            heat: "Medium",
            rainfall: "Medium",
            wind: "Medium",
            cyclone: "Low",
            waterlogging: "Medium",
            resilience_score: 82,
            recommendations: [
                "Ensure Seismic Zone III compliance with 135-degree seismic hooks on all structural column ties.",
                "Elevate plinth level by 600mm above road grade.",
                "Plan proper roof drainage slopes for intense seasonal monsoon showers.",
                "Integrate solar rooftop orientation facing south at 18-degree tilt."
            ]
        }
    },

    async analyze(cityName) {
        cityName = (cityName || 'Bengaluru').trim();
        const key = cityName.toLowerCase();

        // 1. Try fetching from backend API endpoint
        if (window.API && typeof window.API.getLocationRisk === 'function') {
            try {
                const apiRes = await window.API.getLocationRisk(cityName);
                if (apiRes && apiRes.data) {
                    return this.normalizeApiData(cityName, apiRes.data);
                }
            } catch(e) {
                console.info('Using local risk dataset for', cityName);
            }
        }

        // 2. Check local database
        if (this.cityDatabase[key]) {
            const d = this.cityDatabase[key];
            return {
                city: cityName,
                state: d.state,
                seismic_zone: d.seismic_zone,
                seismic_risk: d.seismic_risk,
                flood: d.flood,
                heat: d.heat,
                rainfall: d.rainfall,
                wind: d.wind,
                cyclone: d.cyclone,
                waterlogging: d.waterlogging,
                resilience_score: d.resilience_score,
                recommendations: d.recommendations
            };
        }

        // 3. Fallback generic baseline for unlisted Indian cities
        return {
            city: cityName,
            state: 'India',
            seismic_zone: 'III',
            seismic_risk: 'Moderate',
            flood: 'Medium',
            heat: 'Medium',
            rainfall: 'Medium',
            wind: 'Medium',
            cyclone: 'Low',
            waterlogging: 'Medium',
            resilience_score: 78,
            recommendations: [
                "Elevate finished plinth level by min. 600mm above road level.",
                "Follow IS 1893:2016 ductile frame reinforcement standards.",
                "Ensure multi-layer terrace waterproofing and rainwater harvesting.",
                "Conduct localized soil bearing test prior to foundation excavation."
            ]
        };
    },

    normalizeApiData(cityName, raw) {
        return {
            city: cityName,
            state: raw.state || 'India',
            seismic_zone: raw.seismic_zone || 'III',
            seismic_risk: raw.seismic_risk || 'Moderate',
            flood: raw.flood || 'Medium',
            heat: raw.heat || 'Medium',
            rainfall: raw.rainfall || 'Medium',
            wind: raw.wind || 'Medium',
            cyclone: raw.cyclone || 'Low',
            waterlogging: raw.waterlogging || 'Medium',
            resilience_score: this.calculateResilience(raw),
            recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [
                "Elevate plinth level by at least 600mm above road level.",
                "Follow IS 1893:2016 earthquake-resistant construction codes.",
                "Ensure proper roof waterproofing and slope to drainage downspouts."
            ]
        };
    },

    calculateResilience(data) {
        let score = 95;
        const weights = { Low: 0, Medium: 6, Moderate: 6, High: 12, Severe: 18 };
        score -= (weights[data.seismic_risk] || 6);
        score -= (weights[data.flood] || 6);
        score -= (weights[data.heat] || 4);
        score -= (weights[data.rainfall] || 4);
        score -= (weights[data.cyclone] || 2);
        return Math.max(50, Math.min(98, score));
    }
};

window.RiskEngine = RiskEngine;
