// HamaraGhar — Cost Intelligence & BOQ Estimation Page Controller
const CostStudio = {
    config: {},
    currentTier: 'standard',
    currentBreakdown: null,

    async init() {
        // 1. Load project configuration
        let saved = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { saved = JSON.parse(raw); } catch(e) {}
            }
        }

        this.config = saved || {
            plot_width: 40,
            plot_length: 50,
            plotWidth: 40,
            plotLength: 50,
            floors: 2,
            rooms: 3,
            bedrooms: 3,
            budget: 4500000,
            wallMaterial: 'brick',
            floorMaterial: 'tile',
            roofType: 'flat',
            compound: true,
            garden: true
        };

        // 2. Fetch live cost rates from API if available
        try {
            if (window.API && typeof window.API.getCostRates === 'function') {
                const rates = await window.API.getCostRates();
                if (rates && window.CostEngine) {
                    window.CostEngine.rates = Object.assign({}, window.CostEngine.rates, rates);
                }
            }
        } catch(e) {
            console.warn('Using standard CPWD benchmark rates:', e);
        }

        this.setupEventListeners();
        this.renderAll();
    },

    setupEventListeners() {
        const btnSave = document.getElementById('btnSaveProject');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveCostToProject());
        }
    },

    setTier(tier) {
        this.currentTier = tier;
        document.querySelectorAll('.quality-pill-btn').forEach(btn => {
            const nameEl = btn.querySelector('.quality-pill-name');
            const isActive = nameEl && nameEl.textContent.trim().toLowerCase() === tier.toLowerCase();
            btn.classList.toggle('active', isActive);
        });
        this.renderAll();
    },

    renderAll() {
        this.updateConfigSummary();
        this.calculateAndRenderForecasts();
        this.calculateAndRenderBOQ();
    },

    updateConfigSummary() {
        const pW = Number(this.config.plotWidth || this.config.plot_width) || 40;
        const pL = Number(this.config.plotLength || this.config.plot_length) || 50;
        const floors = Math.max(1, Number(this.config.floors) || 1);
        const rooms = Number(this.config.rooms || this.config.bedrooms || 3) * floors;
        
        let builtup = Number(this.config.builtup_area) || Math.round(pW * pL * 0.7 * floors);

        const confArea = document.getElementById('confArea');
        const confFloors = document.getElementById('confFloors');
        const confRooms = document.getElementById('confRooms');
        const confWallMat = document.getElementById('confWallMat');
        const confFloorMat = document.getElementById('confFloorMat');
        const confRoofType = document.getElementById('confRoofType');

        if (confArea) confArea.textContent = `${builtup.toLocaleString('en-IN')} sq ft`;
        if (confFloors) confFloors.textContent = floors > 1 ? `G+${floors - 1} (${floors} Levels)` : 'Ground Floor Only';
        if (confRooms) confRooms.textContent = `${rooms} Living Spaces`;
        
        const wallNames = { brick: 'Fired Red Brick', concrete: 'AAC Light Block', wood: 'Timber Accents' };
        const floorNames = { tile: 'Glazed Vitrified', wood: 'Hardwood Flooring', concrete: 'Polished Concrete' };
        const roofNames = { flat: 'RCC Flat Terrace', sloped: 'Sloped Clay Tile' };

        if (confWallMat) confWallMat.textContent = wallNames[this.config.wallMaterial] || 'Fired Brick';
        if (confFloorMat) confFloorMat.textContent = floorNames[this.config.floorMaterial] || 'Vitrified Tile';
        if (confRoofType) confRoofType.textContent = roofNames[this.config.roofType] || 'RCC Flat';
    },

    calculateAndRenderForecasts() {
        const pW = Number(this.config.plotWidth || this.config.plot_width) || 40;
        const pL = Number(this.config.plotLength || this.config.plot_length) || 50;
        const floors = Math.max(1, Number(this.config.floors) || 1);
        const builtup = Number(this.config.builtup_area) || Math.round(pW * pL * 0.7 * floors);

        // Calculate 3 tiers
        const lowCost = Math.round(builtup * 1450);
        const expectedCost = Math.round(builtup * 1850);
        const highCost = Math.round(builtup * 2650);

        const rLow = document.getElementById('costRangeLow');
        const rExpected = document.getElementById('costRangeExpected');
        const rHigh = document.getElementById('costRangeHigh');

        if (rLow) rLow.textContent = this.formatINR(lowCost);
        if (rExpected) rExpected.textContent = this.formatINR(expectedCost);
        if (rHigh) rHigh.textContent = this.formatINR(highCost);
    },

    calculateAndRenderBOQ() {
        const pW = Number(this.config.plotWidth || this.config.plot_width) || 40;
        const pL = Number(this.config.plotLength || this.config.plot_length) || 50;
        const floors = Math.max(1, Number(this.config.floors) || 1);
        const rooms = Number(this.config.rooms || this.config.bedrooms || 3);
        const builtup = Number(this.config.builtup_area) || Math.round(pW * pL * 0.7 * floors);

        const rates = {
            basic: 1200,
            standard: 1800,
            premium: 2800,
            luxury: 4500
        };
        const baseRate = rates[this.currentTier] || 1800;
        const civilBase = Math.round(builtup * baseRate);

        const items = [
            {
                category: 'Substructure',
                name: 'Earthwork & RCC Foundation',
                baseline: 'IS 456 Isolated Footings, M20 Concrete & Anti-Termite Treatment',
                amount: Math.round(civilBase * 0.16)
            },
            {
                category: 'Superstructure',
                name: 'RCC Columns, Beams & Roof Slabs',
                baseline: 'Fe550D TMT Reinforcement, M25 Design Mix, Centering & Shuttering',
                amount: Math.round(civilBase * 0.36)
            },
            {
                category: 'Masonry',
                name: 'External & Internal Partition Walls',
                baseline: '9" Perimeter AAC/Brick Walls, 4.5" Internal Partitions with Cement Mortar',
                amount: Math.round(civilBase * 0.12)
            },
            {
                category: 'Joinery',
                name: 'Doors, Windows & Ventilators',
                baseline: 'UPVC 3-Track Windows with Mosquito Mesh & Teak Frame Flush Doors',
                amount: Math.round(builtup * 160)
            },
            {
                category: 'MEP Systems',
                name: 'Electrical Conduit & Concealed Wiring',
                baseline: 'FRLS Copper Wiring, Modular Switches, Distribution Board & Earthing',
                amount: Math.round(builtup * 95)
            },
            {
                category: 'Sanitary',
                name: 'Plumbing & Drainage Engineering',
                baseline: 'CPVC Internal Hot/Cold Lines, SWR Drainage, Overhead Tank & Fixtures',
                amount: Math.round(builtup * 75)
            },
            {
                category: 'Finishes',
                name: 'Plastering, Flooring & Painting',
                baseline: 'Internal Gypsum/Cement Plaster, Vitrified Tiles & Premium Emulsion',
                amount: Math.round(civilBase * 0.14)
            },
            {
                category: 'Site Labor',
                name: 'Structural Labor & Site Supervision',
                baseline: 'Certified Masonry, Carpentry, Bar Bending & Construction Supervision',
                amount: Math.round(civilBase * 0.22)
            }
        ];

        // Infrastructure additions
        if (this.config.compound) {
            const perimeter = (pW * 2 + pL * 2);
            items.push({
                category: 'Site Works',
                name: 'Boundary Compound Wall & Main Gate',
                baseline: '6ft Height Solid Block Wall with MS Designer Entry Gate',
                amount: Math.round(perimeter * 750)
            });
        }

        if (this.config.garden) {
            items.push({
                category: 'Landscape',
                name: 'Landscaped Lawn & Concrete Pavers',
                baseline: 'Selected Bermuda Turf, Stone Bordering & Driveway Pavers',
                amount: Math.round(pW * pL * 0.15 * 140)
            });
        }

        const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
        const contingency = Math.round(subtotal * 0.08);
        const grandTotal = subtotal + contingency;

        this.currentBreakdown = { items, subtotal, contingency, grandTotal };

        // Render Table Rows
        const tbody = document.getElementById('costBreakdownBody');
        const itemCount = document.getElementById('boqItemCount');
        if (itemCount) itemCount.textContent = `${items.length} Work Categories`;

        if (tbody) {
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>
                        <span class="boq-cat-tag">${this.escapeHtml(item.category)}</span>
                        <div style="font-weight: 600; margin-top: 4px;">${this.escapeHtml(item.name)}</div>
                    </td>
                    <td style="font-size: 11px; color: var(--color-text-muted); line-height: 1.4;">${this.escapeHtml(item.baseline)}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 12px;">₹ ${item.amount.toLocaleString('en-IN')}</td>
                </tr>
            `).join('');
        }

        // Render Totals
        const subEl = document.getElementById('costSubtotal');
        const contEl = document.getElementById('costContingency');
        const totEl = document.getElementById('costTotal');

        if (subEl) subEl.textContent = `₹ ${subtotal.toLocaleString('en-IN')}`;
        if (contEl) contEl.textContent = `₹ ${contingency.toLocaleString('en-IN')}`;
        if (totEl) totEl.textContent = `₹ ${grandTotal.toLocaleString('en-IN')}`;

        // Render Target Budget Comparison
        this.renderBudgetComparison(grandTotal);
    },

    renderBudgetComparison(grandTotal) {
        const userBudget = Number(this.config.budget) || 4500000;
        const lblBudget = document.getElementById('lblBudget');
        const lblEstimate = document.getElementById('lblEstimate');
        const progressFill = document.getElementById('budgetProgress');
        const statusMsg = document.getElementById('budgetStatusMsg');

        if (lblBudget) lblBudget.textContent = this.formatINR(userBudget);
        if (lblEstimate) lblEstimate.textContent = this.formatINR(grandTotal);

        const ratio = grandTotal / userBudget;
        const pct = Math.min(100, Math.max(10, Math.round(ratio * 100)));

        if (progressFill) {
            progressFill.style.width = `${pct}%`;
            if (ratio <= 1.0) {
                progressFill.style.background = 'var(--color-success)';
            } else if (ratio <= 1.15) {
                progressFill.style.background = 'var(--color-warning)';
            } else {
                progressFill.style.background = 'var(--color-danger)';
            }
        }

        if (statusMsg) {
            const diff = Math.abs(userBudget - grandTotal);
            const diffStr = this.formatINR(diff);
            if (ratio <= 1.0) {
                statusMsg.textContent = `${diffStr} under target`;
                statusMsg.style.color = 'var(--color-success)';
            } else if (ratio <= 1.15) {
                statusMsg.textContent = `${diffStr} minor variance (+${Math.round((ratio - 1) * 100)}%)`;
                statusMsg.style.color = 'var(--color-warning)';
            } else {
                statusMsg.textContent = `${diffStr} exceeds target (+${Math.round((ratio - 1) * 100)}%)`;
                statusMsg.style.color = 'var(--color-danger)';
            }
        }
    },

    async saveCostToProject() {
        if (!this.currentBreakdown) return;
        const btn = document.getElementById('btnSaveProject');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>Saving...</span>`;
        }

        this.config.estimated_cost = this.currentBreakdown.grandTotal;
        this.config.total_cost = this.currentBreakdown.grandTotal;
        this.config.cost_tier = this.currentTier;

        if (window.Utils && typeof window.Utils.saveLocal === 'function') {
            window.Utils.saveLocal('house_data', this.config);
            window.Utils.saveLocal('smartbuild_config', this.config);
        } else {
            localStorage.setItem('house_data', JSON.stringify(this.config));
        }

        const projId = window.Utils ? window.Utils.loadLocal('current_project_id') : localStorage.getItem('current_project_id');
        if (projId && window.API && typeof window.API.updateProject === 'function') {
            try {
                await window.API.updateProject(projId, {
                    name: this.config.projectName || 'House Plan',
                    data: this.config
                });
            } catch(e) {
                console.warn('Cloud save skipped:', e);
            }
        }

        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('BOQ and cost estimate saved to workspace!', 'success');
        } else {
            alert('Cost estimate saved!');
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span>Save Estimate to Project</span>
            `;
        }
    },

    formatINR(num) {
        if (!num || isNaN(num)) return '₹ 0';
        num = Math.round(num);
        if (num >= 10000000) {
            return `₹ ${(num / 10000000).toFixed(2)} Cr`;
        } else if (num >= 100000) {
            return `₹ ${(num / 100000).toFixed(2)} L`;
        } else {
            return `₹ ${num.toLocaleString('en-IN')}`;
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CostStudio.init();
});
