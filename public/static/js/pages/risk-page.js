// HamaraGhar — Location Hazard Intelligence Controller
const RiskStudio = {
    currentCity: 'Ahmedabad',
    currentState: 'Gujarat',

    cityPositions: {
        'Ahmedabad': { x: 130, y: 230, coords: '23.0225° N, 72.5714° E' },
        'Mumbai': { x: 140, y: 290, coords: '19.0760° N, 72.8777° E' },
        'Bengaluru': { x: 210, y: 410, coords: '12.9716° N, 77.5946° E' },
        'Delhi': { x: 210, y: 140, coords: '28.6139° N, 77.2090° E' },
        'Chennai': { x: 260, y: 410, coords: '13.0827° N, 80.2707° E' },
        'Hyderabad': { x: 230, y: 320, coords: '17.3850° N, 78.4867° E' },
        'Kolkata': { x: 370, y: 230, coords: '22.5726° N, 88.3639° E' }
    },

    async init() {
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

        const chips = document.querySelectorAll('.preset-chip');
        chips.forEach(c => {
            if (c.textContent.trim().toLowerCase() === cityName.toLowerCase()) c.classList.add('active');
            else c.classList.remove('active');
        });

        this.analyzeLocation(cityName);
    },

    async analyzeLocation(city) {
        city = (city || 'Ahmedabad').trim();
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
                btn.innerHTML = `<span>Analyze</span>`;
            }
        }
    },

    renderData(data) {
        const titleEl = document.getElementById('displayLocationName');
        const scoreEl = document.getElementById('resilienceScoreVal');
        const displayCoords = document.getElementById('displayCoords');

        if (titleEl) {
            titleEl.textContent = `${data.city}, ${data.state || 'India'}`;
        }
        if (scoreEl) {
            scoreEl.textContent = data.resilience_score || 84;
            scoreEl.style.color = data.resilience_score >= 80 ? 'var(--color-success)' : (data.resilience_score >= 65 ? 'var(--color-warning)' : 'var(--color-danger)');
        }

        // Update Map Pin
        const pos = this.cityPositions[data.city] || { x: 210, y: 260, coords: '20.5937° N, 78.9629° E' };
        const pinGroup = document.getElementById('mapPinGroup');
        const pinText = document.getElementById('mapPinText');
        if (pinGroup) pinGroup.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        if (pinText) pinText.textContent = data.city;
        if (displayCoords) displayCoords.textContent = pos.coords;

        // Update Hazard Overview Items
        this.updateItem('Seismic', `Zone ${data.seismic_zone} &bull; ${data.seismic_risk}`,
            `Structural seismic hazard evaluated at IS 1893:2016 Zone ${data.seismic_zone}. Ductile detailing of column-beam joints required.`,
            this.getBadgeClass(data.seismic_risk));

        this.updateItem('Flood', data.flood,
            `Inundation vulnerability classified as ${data.flood}. Finished plinth height +450mm above municipal road level recommended.`,
            this.getBadgeClass(data.flood));

        this.updateItem('Cyclone', data.cyclone,
            `Wind & cyclone exposure classified as ${data.cyclone}. Basic design wind speed 39 m/s (IS 875 Part 3). Solid parapet coping advised.`,
            this.getBadgeClass(data.cyclone));

        this.updateItem('Heat', data.heat,
            `Summer thermal load classified as ${data.heat}. AAC blocks and high-reflectance roof coating (SRI > 78) recommended.`,
            this.getBadgeClass(data.heat));
    },

    updateItem(prefix, badgeHtml, descText, badgeClass) {
        const badge = document.getElementById('badge' + prefix);
        const desc = document.getElementById('desc' + prefix);

        if (badge) {
            badge.innerHTML = badgeHtml;
            badge.className = `badge ${badgeClass}`;
        }
        if (desc) desc.textContent = descText;
    },

    getBadgeClass(level) {
        const l = (level || '').toLowerCase();
        if (l.includes('low') || l.includes('basic')) return 'badge-success';
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
