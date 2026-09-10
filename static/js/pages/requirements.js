// Multi-step requirements form logic
const RequirementsForm = {
  currentStep: 1,
  totalSteps: 5,
  data: {},
  
  init() {
      this.data = window.Utils ? (window.Utils.loadLocal('smartbuild_config') || {}) : {};
      this.goToStep(this.currentStep);
      // Attach listeners
      const nextBtn = document.getElementById('next-btn');
      const prevBtn = document.getElementById('prev-btn');
      if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
      if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
  },
  
  goToStep(n) {
      if (n < 1 || n > this.totalSteps) return;
      this.currentStep = n;
      // Hide all steps, show target step
      document.querySelectorAll('.form-step').forEach((el, index) => {
          el.style.display = (index + 1 === n) ? 'block' : 'none';
      });
      // Update buttons
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      if (prevBtn) prevBtn.style.display = n === 1 ? 'none' : 'inline-block';
      if (nextBtn) nextBtn.innerText = n === this.totalSteps ? 'Submit' : 'Next';
      
      this.updatePlotPreview();
      if (n === 2) this.showRuleRecommendation();
  },
  
  nextStep() { 
      if (this.validateCurrentStep()) {
          this.saveCurrentStep();
          if (this.currentStep === this.totalSteps) {
              this.submit();
          } else {
              this.goToStep(this.currentStep + 1);
          }
      }
  },
  
  prevStep() { 
      this.goToStep(this.currentStep - 1); 
  },
  
  validateCurrentStep() { 
      // Basic validation logic
      return true; 
  },
  
  saveCurrentStep() { 
      // In reality, read DOM elements and update this.data
      if (window.Utils) window.Utils.saveLocal('smartbuild_config', this.data);
  },
  
  updatePlotPreview() { 
      // Update visual plot box dimensions based on length/width
  },
  
  updateBudgetDisplay() { 
      // Format and show budget
  },
  
  showRuleRecommendation() { 
      if (window.RuleEngine) {
          const recs = window.RuleEngine.analyze(this.data);
          const recEl = document.getElementById('recommendations');
          if (recEl) {
              recEl.innerHTML = `Recommended Floors: ${recs.recommendedFloors}, Bedrooms: ${recs.recommendedBedrooms}`;
          }
      }
  },
  
  async submit() {
      if (window.Utils) {
          window.Utils.saveLocal('smartbuild_config', this.data);
          window.Utils.notify('Requirements saved!', 'success');
      }
      setTimeout(() => { window.location.href = '/floor-plan.html'; }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => RequirementsForm.init());
