// =========================================================================
// HamaraGhar Frontend — Candidate Switcher Component
// Renders layout alternative buttons (Plan A, B, C), handles candidate
// selection, and triggers seed-based regeneration.
// =========================================================================

export class CandidateSwitcher {
    constructor(containerElement, onCandidateSelect, onGenerateAgain) {
        this.container = containerElement;
        this.onCandidateSelect = onCandidateSelect;
        this.onGenerateAgain = onGenerateAgain;
        this.candidates = [];
        this.activeCandidateIndex = 0;
    }

    render(candidates, activeIndex = 0) {
        this.candidates = candidates || [];
        this.activeCandidateIndex = activeIndex;
        if (!this.container) return;

        this.container.innerHTML = '';
        this.candidates.forEach((cand, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `cand-btn ${cand.variant_id === this.activeCandidateIndex ? 'active' : ''}`;
            btn.setAttribute('data-variant', cand.variant_id);

            const letter = String.fromCharCode(65 + idx);
            const topLabel = (cand.topology || 'standard').replace(/_/g, ' ');
            btn.textContent = `Plan ${letter}: ${topLabel}`;
            btn.addEventListener('click', () => {
                if (typeof this.onCandidateSelect === 'function') {
                    this.onCandidateSelect(cand.variant_id);
                }
            });
            this.container.appendChild(btn);
        });
    }

    setActiveIndex(index) {
        this.activeCandidateIndex = index;
        if (!this.container) return;
        const buttons = this.container.querySelectorAll('.cand-btn');
        buttons.forEach(btn => {
            const variantId = parseInt(btn.getAttribute('data-variant'), 10);
            if (variantId === index) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
