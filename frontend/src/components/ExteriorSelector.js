// =========================================================================
// HamaraGhar Frontend — Exterior Façade Selector Component
// Handles selection of 5 exterior architectural design styles without
// modifying internal room geometry.
// =========================================================================

export class ExteriorSelector {
    constructor(containerElement, onStyleSelect) {
        this.container = containerElement;
        this.onStyleSelect = onStyleSelect;
        this.activeStyle = 'modern';
        this._setupListeners();
    }

    _setupListeners() {
        if (!this.container) return;
        const buttons = this.container.querySelectorAll('.ext-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const style = e.currentTarget.getAttribute('data-style');
                this.setActiveStyle(style);
                if (typeof this.onStyleSelect === 'function') {
                    this.onStyleSelect(style);
                }
            });
        });
    }

    setActiveStyle(style) {
        this.activeStyle = style;
        if (!this.container) return;
        const buttons = this.container.querySelectorAll('.ext-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-style') === style) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
