const RequirementsForm = {
    currentStep: 1,
    totalSteps: 5,
    data: {},
    
    init() {
        this.data = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || {}) : {};
        
        const nextBtn = document.getElementById('btnNext');
        const prevBtn = document.getElementById('btnPrev');
        const submitBtn = document.getElementById('btnSubmit');
        
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
        
        const form = document.getElementById('requirementsForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }
        
        const budgetInput = document.getElementById('budget');
        if (budgetInput) {
            budgetInput.addEventListener('input', () => this.updateBudgetDisplay());
        }
        
        const plotLength = document.getElementById('plotLength');
        const plotWidth = document.getElementById('plotWidth');
        if (plotLength) plotLength.addEventListener('input', () => this.updatePlotPreview());
        if (plotWidth) plotWidth.addEventListener('input', () => this.updatePlotPreview());
        
        this.goToStep(this.currentStep);
    },
    
    goToStep(n) {
        if (n < 1 || n > this.totalSteps) return;
        this.currentStep = n;
        
        document.querySelectorAll('.form-step').forEach((el, index) => {
            el.style.display = (index + 1 === n) ? 'block' : 'none';
        });
        
        const prevBtn = document.getElementById('btnPrev');
        const nextBtn = document.getElementById('btnNext');
        const submitBtn = document.getElementById('btnSubmit');
        
        if (prevBtn) prevBtn.style.display = n === 1 ? 'none' : 'inline-block';
        if (nextBtn) nextBtn.style.display = n === this.totalSteps ? 'none' : 'inline-block';
        if (submitBtn) submitBtn.style.display = n === this.totalSteps ? 'inline-block' : 'none';
        
        if (n === 2) this.updatePlotPreview();
        if (n === 3) this.showRuleRecommendation();
        if (n === 5) this.updateBudgetDisplay();
    },
    
    nextStep() { 
        if (this.validateCurrentStep()) {
            this.saveCurrentStep();
            this.goToStep(this.currentStep + 1);
        }
    },
    
    prevStep() { 
        this.saveCurrentStep();
        this.goToStep(this.currentStep - 1); 
    },
    
    validateCurrentStep() { 
        return true; 
    },
    
    saveCurrentStep() {
        const fields = [
            'country', 'state', 'city',
            'plotLength', 'plotWidth',
            'familySize', 'bedrooms', 'bathrooms', 'floors', 'roomsPerFloor',
            'kitchenType', 'projectName', 'budget', 'landCost'
        ];
        
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                this.data[f] = el.value;
            }
        });
        
        const styleSelected = document.querySelector('input[name="style"]:checked');
        if (styleSelected) this.data.style = styleSelected.value;
        
        const features = [];
        document.querySelectorAll('input[name="features"]:checked').forEach(cb => features.push(cb.value));
        this.data.features = features;

        if (window.Utils) window.Utils.saveLocal('smartbuild_config', this.data);
    },
    
    updatePlotPreview() {
        const length = parseFloat(document.getElementById('plotLength')?.value) || 0;
        const width = parseFloat(document.getElementById('plotWidth')?.value) || 0;
        const area = length * width;
        
        const areaDisplay = document.getElementById('areaDisplay');
        if (areaDisplay) areaDisplay.textContent = area;
        
        const plotPreview = document.getElementById('plotPreview');
        if (plotPreview) {
            plotPreview.textContent = `${length}ft x ${width}ft`;
            if (length > 0 && width > 0) {
                plotPreview.style.width = '100%';
                plotPreview.style.height = '100px';
                plotPreview.style.backgroundColor = '#e0e0e0';
            }
        }
    },
    
    updateBudgetDisplay() {
        const budgetInput = document.getElementById('budget');
        const budgetAmount = document.getElementById('budgetAmount');
        const budgetCategory = document.getElementById('budgetCategory');
        
        if (budgetInput && budgetAmount && budgetCategory) {
            const val = parseInt(budgetInput.value) || 0;
            budgetAmount.textContent = '₹' + val.toLocaleString('en-IN');
            
            if (val < 1500000) {
                budgetCategory.textContent = 'Economy';
            } else if (val < 5000000) {
                budgetCategory.textContent = 'Standard';
            } else {
                budgetCategory.textContent = 'Premium';
            }
        }
    },
    
    showRuleRecommendation() {
        if (window.RuleEngine) {
            const recs = window.RuleEngine.analyze(this.data);
            const ruleEngineNote = document.getElementById('ruleEngineNote');
            const recBHK = document.getElementById('recBHK');
            
            if (ruleEngineNote && recBHK) {
                ruleEngineNote.style.display = 'block';
                recBHK.textContent = `${recs.recommendedBedrooms} BHK with ${recs.recommendedFloors} Floor(s)`;
            }
        }
    },
    
    async submit() {
        this.saveCurrentStep();
        if (window.Utils) {
            window.Utils.notify('Requirements saved!', 'success');
        }
        setTimeout(() => { window.location.href = '/builder'; }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => RequirementsForm.init());
