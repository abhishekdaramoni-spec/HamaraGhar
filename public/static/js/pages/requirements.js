// HamaraGhar — House Planning Requirements Wizard Logic
const RequirementsWizard = {
    currentStep: 1,
    totalSteps: 5,
    data: {
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        plotLength: 50,
        plotWidth: 40,
        familySize: 4,
        bedrooms: 3,
        bathrooms: 3,
        floors: 2,
        roomsPerFloor: 3,
        vastuDirection: 'East',
        style: 'Modern',
        features: ['Parking', 'Balcony', 'Garden', 'Compound Wall', 'Pooja Room'],
        kitchenType: 'Closed',
        projectName: 'Greenwood Villa',
        budget: 4500000,
        landCost: 0
    },

    init() {
        // Load stored configuration if available
        let saved = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { saved = JSON.parse(raw); } catch(e) {}
            }
        }
        if (saved && typeof saved === 'object') {
            this.data = Object.assign({}, this.data, saved);
        }

        this.syncInputsFromData();
        this.setupEventListeners();
        this.goToStep(1);
        this.updatePlotPreview();
        this.updateBudgetDisplay();
        this.showRuleRecommendation();
    },

    syncInputsFromData() {
        const fields = ['country', 'state', 'city', 'plotLength', 'plotWidth', 'roomsPerFloor', 'vastuDirection', 'kitchenType', 'projectName', 'budget', 'landCost'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el && this.data[f] !== undefined) {
                el.value = this.data[f];
            }
        });

        // Counters
        ['familySize', 'bedrooms', 'bathrooms', 'floors'].forEach(k => {
            const v = this.data[k] || 1;
            const input = document.getElementById(k);
            const display = document.getElementById('val_' + k);
            if (input) input.value = v;
            if (display) display.textContent = v;
        });

        // Style
        if (this.data.style) {
            const radio = document.querySelector(`input[name="style"][value="${this.data.style}"]`);
            if (radio) radio.checked = true;
        }

        // Features
        if (Array.isArray(this.data.features)) {
            document.querySelectorAll('input[name="features"]').forEach(cb => {
                cb.checked = this.data.features.includes(cb.value);
            });
        }
    },

    setupEventListeners() {
        const nextBtn = document.getElementById('btnNext');
        const prevBtn = document.getElementById('btnPrev');
        const form = document.getElementById('requirementsForm');

        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }

        const plotLength = document.getElementById('plotLength');
        const plotWidth = document.getElementById('plotWidth');
        if (plotLength) plotLength.addEventListener('input', () => this.updatePlotPreview());
        if (plotWidth) plotWidth.addEventListener('input', () => this.updatePlotPreview());

        const budget = document.getElementById('budget');
        if (budget) budget.addEventListener('input', () => this.updateBudgetDisplay());
    },

    goToStep(n) {
        if (n < 1 || n > this.totalSteps) return;
        this.saveCurrentStep();
        this.currentStep = n;

        // Update form step visibility
        document.querySelectorAll('.form-step').forEach((el, index) => {
            el.style.display = (index + 1 === n) ? 'block' : 'none';
        });

        // Update progress step dots
        document.querySelectorAll('.step-dot-wrapper').forEach((el, index) => {
            const stepNum = index + 1;
            el.classList.remove('active', 'completed');
            if (stepNum === n) {
                el.classList.add('active');
            } else if (stepNum < n) {
                el.classList.add('completed');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('btnPrev');
        const nextBtn = document.getElementById('btnNext');
        const submitBtn = document.getElementById('btnSubmit');

        if (prevBtn) prevBtn.style.display = n === 1 ? 'none' : 'inline-flex';
        
        if (n === this.totalSteps) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) {
                nextBtn.style.display = 'inline-flex';
                const nextLabels = [
                    'Continue to Plot & Setback',
                    'Continue to Rooms & Family',
                    'Continue to Architectural Style',
                    'Continue to Budget Setup'
                ];
                const span = nextBtn.querySelector('span');
                if (span) span.textContent = nextLabels[n - 1] || 'Continue';
            }
            if (submitBtn) submitBtn.style.display = 'none';
        }

        if (n === 2) this.updatePlotPreview();
        if (n === 3) this.showRuleRecommendation();
        if (n === 5) this.updateBudgetDisplay();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    nextStep() {
        if (this.validateCurrentStep()) {
            this.goToStep(this.currentStep + 1);
        }
    },

    prevStep() {
        this.goToStep(this.currentStep - 1);
    },

    validateCurrentStep() {
        if (this.currentStep === 1) {
            const city = document.getElementById('city')?.value?.trim();
            const state = document.getElementById('state')?.value?.trim();
            if (!city || !state) {
                if (window.Utils?.notify) window.Utils.notify('Please enter your city and state.', 'error');
                return false;
            }
        } else if (this.currentStep === 2) {
            const len = parseFloat(document.getElementById('plotLength')?.value);
            const wid = parseFloat(document.getElementById('plotWidth')?.value);
            if (!len || !wid || len < 15 || wid < 10) {
                if (window.Utils?.notify) window.Utils.notify('Please specify valid plot dimensions (min 15x10 ft).', 'error');
                return false;
            }
        }
        return true;
    },

    setCity(city, state) {
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        if (cityInput) cityInput.value = city;
        if (stateInput) stateInput.value = state;
        this.data.city = city;
        this.data.state = state;

        document.querySelectorAll('.preset-chips .chip-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.trim() === city);
        });
    },

    stepCounter(field, delta) {
        const input = document.getElementById(field);
        const display = document.getElementById('val_' + field);
        if (!input) return;

        let val = parseInt(input.value) || 1;
        val += delta;

        const limits = {
            familySize: { min: 1, max: 15 },
            bedrooms: { min: 1, max: 8 },
            bathrooms: { min: 1, max: 8 },
            floors: { min: 1, max: 4 }
        };

        const limit = limits[field] || { min: 1, max: 10 };
        val = Math.max(limit.min, Math.min(limit.max, val));

        input.value = val;
        if (display) display.textContent = val;
        this.data[field] = val;

        this.showRuleRecommendation();
        this.updateBudgetDisplay();
    },

    updatePlotPreview() {
        const length = parseFloat(document.getElementById('plotLength')?.value) || 50;
        const width = parseFloat(document.getElementById('plotWidth')?.value) || 40;
        const area = Math.round(length * width);
        const maxCoverage = Math.round(area * 0.7);

        const areaEl = document.getElementById('plotAreaVal');
        const coverageEl = document.getElementById('groundCoverageVal');
        if (areaEl) areaEl.textContent = `${area.toLocaleString('en-IN')} sq ft`;
        if (coverageEl) coverageEl.textContent = `${maxCoverage.toLocaleString('en-IN')} sq ft (70%)`;

        // Render clean SVG diagram showing boundaries and setbacks
        const diagram = document.getElementById('plotDiagram');
        if (!diagram) return;

        const pad = 24;
        const maxW = 280;
        const maxH = 140;
        const aspect = width / length;
        
        let svgW, svgH;
        if (aspect >= 1) {
            svgW = maxW;
            svgH = Math.max(70, Math.min(maxH, maxW / aspect));
        } else {
            svgH = maxH;
            svgW = Math.max(90, Math.min(maxW, maxH * aspect));
        }

        // Building footprint with setbacks: front 5ft, rear 4ft, sides 3ft each
        const insetX = Math.round((3 / width) * svgW);
        const insetYFront = Math.round((5 / length) * svgH);
        const insetYRear = Math.round((4 / length) * svgH);
        const buildW = Math.max(20, svgW - insetX * 2);
        const buildH = Math.max(20, svgH - insetYFront - insetYRear);

        diagram.innerHTML = `
            <svg width="${svgW + pad*2}" height="${svgH + pad*2}" viewBox="0 0 ${svgW + pad*2} ${svgH + pad*2}">
                <!-- Outer Plot Boundary -->
                <rect x="${pad}" y="${pad}" width="${svgW}" height="${svgH}" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4 3"/>
                <!-- Setback Zone Hatch -->
                <rect x="${pad}" y="${pad}" width="${svgW}" height="${svgH}" fill="rgba(255,255,255,0.04)"/>
                <!-- Permissible Footprint -->
                <rect x="${pad + insetX}" y="${pad + insetYRear}" width="${buildW}" height="${buildH}" fill="rgba(194, 65, 12, 0.25)" stroke="#c2410c" stroke-width="2"/>
                <!-- Labels -->
                <text x="${pad + svgW/2}" y="${pad - 8}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">ROAD FRONT: ${width} ft</text>
                <text x="${pad - 8}" y="${pad + svgH/2}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle" transform="rotate(-90 ${pad - 8} ${pad + svgH/2})">DEPTH: ${length} ft</text>
                <text x="${pad + insetX + buildW/2}" y="${pad + insetYRear + buildH/2}" fill="#f97316" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central">Permissible Ground Footprint</text>
            </svg>
        `;
    },

    updateBudgetDisplay() {
        const budgetInput = document.getElementById('budget');
        const budgetAmount = document.getElementById('budgetAmount');
        const budgetCategory = document.getElementById('budgetCategory');

        if (!budgetInput) return;
        const val = parseInt(budgetInput.value) || 4500000;
        
        let formatted = '';
        if (val >= 10000000) {
            formatted = `₹${(val / 10000000).toFixed(2)} Crores`;
        } else {
            formatted = `₹${(val / 100000).toFixed(2)} Lakhs`;
        }
        if (budgetAmount) budgetAmount.textContent = formatted;

        // Compute approx rate per sq ft based on estimated builtup
        const length = parseFloat(document.getElementById('plotLength')?.value) || 50;
        const width = parseFloat(document.getElementById('plotWidth')?.value) || 40;
        const floors = parseInt(document.getElementById('floors')?.value) || 2;
        const builtup = Math.round(length * width * 0.7 * floors);
        const ratePerSqFt = builtup > 0 ? Math.round(val / builtup) : 1800;

        let tier = 'Standard Tier';
        if (ratePerSqFt < 1600) {
            tier = 'Economy Tier';
        } else if (ratePerSqFt < 2400) {
            tier = 'Standard Tier';
        } else if (ratePerSqFt < 3500) {
            tier = 'Premium Tier';
        } else {
            tier = 'Luxury Tier';
        }

        if (budgetCategory) {
            budgetCategory.textContent = `${tier} (~₹${ratePerSqFt.toLocaleString('en-IN')}/sqft)`;
        }
    },

    showRuleRecommendation() {
        const familySize = parseInt(document.getElementById('familySize')?.value) || 4;
        const recBHK = document.getElementById('recBHK');
        
        let recommendedBedrooms = Math.min(6, Math.max(1, Math.ceil(familySize * 0.75)));
        let recommendedFloors = familySize > 5 ? 2 : 1;
        
        if (window.RuleEngine && typeof window.RuleEngine.analyze === 'function') {
            try {
                const res = window.RuleEngine.analyze({ familySize: familySize });
                if (res) {
                    recommendedBedrooms = res.recommendedBedrooms || recommendedBedrooms;
                    recommendedFloors = res.recommendedFloors || recommendedFloors;
                }
            } catch(e) {}
        }

        if (recBHK) {
            recBHK.textContent = `Recommended ${recommendedBedrooms} BHK on G+${recommendedFloors - 1} with ${Math.min(recommendedBedrooms, 3)} Bathrooms for ${familySize} occupants.`;
        }
    },

    saveCurrentStep() {
        const fields = ['country', 'state', 'city', 'plotLength', 'plotWidth', 'roomsPerFloor', 'vastuDirection', 'kitchenType', 'projectName', 'budget', 'landCost'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) this.data[f] = el.value;
        });

        ['familySize', 'bedrooms', 'bathrooms', 'floors'].forEach(k => {
            const el = document.getElementById(k);
            if (el) this.data[k] = parseInt(el.value) || 1;
        });

        const styleRadio = document.querySelector('input[name="style"]:checked');
        if (styleRadio) this.data.style = styleRadio.value;

        const features = [];
        document.querySelectorAll('input[name="features"]:checked').forEach(cb => features.push(cb.value));
        this.data.features = features;

        // Calculate estimated builtup area
        const length = parseFloat(this.data.plotLength) || 50;
        const width = parseFloat(this.data.plotWidth) || 40;
        const floors = parseInt(this.data.floors) || 1;
        this.data.plot_width = width;
        this.data.plot_length = length;
        this.data.bhk = this.data.bedrooms || 3;
        this.data.builtup_area = Math.round(length * width * 0.7 * floors);
        this.data.carpet_area = Math.round(this.data.builtup_area * 0.75);
        this.data.total_cost = parseInt(this.data.budget) || 4500000;

        if (window.Utils && typeof window.Utils.saveLocal === 'function') {
            window.Utils.saveLocal('house_data', this.data);
            window.Utils.saveLocal('smartbuild_config', this.data);
        } else {
            localStorage.setItem('house_data', JSON.stringify(this.data));
            localStorage.setItem('smartbuild_config', JSON.stringify(this.data));
        }
    },

    async submit() {
        this.saveCurrentStep();
        const submitBtn = document.getElementById('btnSubmit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite; margin-right:8px;"></span>
                <span>Generating Blueprint & 3D Model...</span>
            `;
        }

        try {
            // Save project to backend
            const projectName = this.data.projectName || 'My House Plan';
            if (window.API && typeof window.API.createProject === 'function') {
                const res = await window.API.createProject({
                    name: projectName,
                    data: this.data
                });
                if (res && res.project && res.project.id) {
                    if (window.Utils && typeof window.Utils.saveLocal === 'function') {
                        window.Utils.saveLocal('current_project_id', res.project.id);
                    } else {
                        localStorage.setItem('current_project_id', res.project.id);
                    }
                }
            }
        } catch(e) {
            console.warn('API save skipped or failed, proceeding with local configuration:', e);
        }

        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('Requirements saved! Generating your 2D CAD blueprint...', 'success');
        }

        // Navigate to 2D Floor Plan CAD Studio with created project ID
        setTimeout(() => {
            const currentId = window.Utils?.loadLocal ? window.Utils.loadLocal('current_project_id') : localStorage.getItem('current_project_id');
            if (currentId) {
                window.location.href = `/floor-plan?project_id=${currentId}`;
            } else {
                window.location.href = '/floor-plan';
            }
        }, 600);
    }
};

document.addEventListener('DOMContentLoaded', () => RequirementsWizard.init());
