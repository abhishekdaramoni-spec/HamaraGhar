// HamaraGhar — Location Hazard Intelligence & IS 1893 Audit Controller
const RiskStudio = {
    currentCity: 'Bengaluru',
    currentState: 'Karnataka',

    async init() {
        // Load city from saved project configuration if present
        let saved = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { saved = JSON.parse(raw); } catch(e) {}
            }
        }

        if (saved && saved.city) {
            this.currentCity = saved.city;
            this.currentState = saved.state || '';
        }

        const input = document.getElementById('cityInput');
        if (input) {
            input.value = this.currentCity;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.analyzeLocation(input.value);
                }
            });
        }

        const btnAnalyze = document.getElementById('btnAnalyze');
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', () => {
                const val = document.getElementById('cityInput')?.value;
                this.analyzeLocation(val);
            });
        }

        await this.analyzeLocation(this.currentCity);
    },

    selectCity(cityName) {
        const input = document.getElementById('cityInput');
        if (input) input.value = cityName;
        this.analyzeLocation(cityName);
    },

    async analyzeLocation(city) {
        city = (city || 'Bengaluru').trim();
        if (!city) return;

        const btn = document.getElementById('btnAnalyze');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>Analyzing...</span>`;
        }

        try {
            if (!window.RiskEngine) return;
            const data = await window.RiskEngine.analyze(city);
            this.renderData(data);
        } catch(e) {
            console.error('Error analyzing location:', e);
            if (window.Utils?.notify) window.Utils.notify('Failed to load risk data for ' + city, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>Analyze City</span>`;
            }
        }
    },

    renderData(data) {
        const titleEl = document.getElementById('displayLocationName');
        const scoreEl = document.getElementById('resilienceScoreVal');
        const zoneBadge = document.getElementById('badgeSeismicZone');

        if (titleEl) {
            titleEl.textContent = `${data.city}, ${data.state || 'India'}`;
        }
        if (scoreEl) {
            scoreEl.textContent = data.resilience_score || 85;
            scoreEl.style.color = data.resilience_score >= 80 ? '#22c55e' : (data.resilience_score >= 65 ? '#eab308' : '#ef4444');
        }
        if (zoneBadge) {
            zoneBadge.textContent = `Seismic Zone ${data.seismic_zone} (${data.seismic_risk})`;
            zoneBadge.className = `badge ${this.getBadgeClass(data.seismic_risk)}`;
        }

        // 1. Seismic
        this.updateCard('Seismic', `Zone ${data.seismic_zone} (${data.seismic_risk})`, this.getBadgeClass(data.seismic_risk), 
            `Structural seismic hazard evaluated at IS 1893:2016 Zone ${data.seismic_zone}. Requires structural ductile detailing according to Peak Ground Acceleration standards.`,
            `Recommendation: Employ continuous RCC ring beams and 135° seismic hooks on column stirrups.`);

        // 2. Flood
        this.updateCard('Flood', data.flood, this.getBadgeClass(data.flood),
            `Urban flooding and surface waterlogging risk evaluated as ${data.flood}. Low-lying road corridors susceptible to stormwater accumulation.`,
            `Recommendation: Elevate finished ground floor plinth by min. 600mm above municipal road level.`);

        // 3. Rainfall
        this.updateCard('Rainfall', `${data.rainfall} Precipitation`, this.getBadgeClass(data.rainfall),
            `Seasonal monsoon volume classified as ${data.rainfall}. Requires multi-tier terrace waterproofing and gradient roof drainage.`,
            `Recommendation: Dual-coat elastomeric waterproofing with 1:100 slope to rainwater downspouts.`);

        // 4. Heat
        this.updateCard('Heat', `${data.heat} Thermal Load`, this.getBadgeClass(data.heat),
            `Summer temperature profile and peak solar insolation index classified as ${data.heat}.`,
            `Recommendation: Incorporate 600mm window chajjas and high-reflectance (SRI > 78) roof tiles.`);

        // 5. Wind
        this.updateCard('Wind', `${data.wind} Gust Velocity`, this.getBadgeClass(data.wind),
            `IS 875 Part 3 basic wind speed index classified as ${data.wind} across residential structures.`,
            `Recommendation: Solid RCC parapet coping at 1.05m height and mechanical roof truss anchors.`);

        // 6. Cyclone
        this.updateCard('Cyclone', `${data.cyclone} Coastal Hazard`, this.getBadgeClass(data.cyclone),
            `Coastal storm surge and marine saline corrosion vulnerability classified as ${data.cyclone}.`,
            `Recommendation: ${data.cyclone === 'High' ? 'Use epoxy-coated rebar and heavy-duty storm-resistant shutters.' : 'Standard galvanized hardware and mild steel structural framing.'}`);

        // Recommendations List
        const listEl = document.getElementById('recommendationList');
        if (listEl && Array.isArray(data.recommendations)) {
            listEl.innerHTML = data.recommendations.map(r => `
                <li>
                    <span class="rec-bullet">✓</span>
                    <div>${this.escapeHtml(r)}</div>
                </li>
            `).join('');
        }
    },

    updateCard(prefix, badgeText, badgeClass, descText, recText) {
        const badge = document.getElementById('badge' + prefix);
        const desc = document.getElementById('desc' + prefix);
        const rec = document.getElementById('rec' + prefix);

        if (badge) {
            badge.textContent = badgeText;
            badge.className = `badge ${badgeClass}`;
        }
        if (desc) desc.textContent = descText;
        if (rec) rec.textContent = recText;
    },

    getBadgeClass(level) {
        const l = (level || '').toLowerCase();
        if (l.includes('low') || l.includes('basic') || l.includes('inland')) return 'badge-success';
        if (l.includes('medium') || l.includes('moderate')) return 'badge-warning';
        return 'badge-danger';
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    RiskStudio.init();
});
