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
        this.fetchAndRenderMLValuation();
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

        // Top Hero Amount & Donut Center
        const cehMainTotal = document.getElementById('cehMainTotal');
        const donutTotalVal = document.getElementById('donutTotalVal');
        if (cehMainTotal) cehMainTotal.textContent = this.formatINR(grandTotal);
        if (donutTotalVal) donutTotalVal.textContent = this.formatINR(grandTotal);

        // Group into Civil, Materials, Finishing, Electrical, Plumbing (Total must equal subtotal)
        let civilAmt = 0, matAmt = 0, finishAmt = 0, elecAmt = 0, plumbAmt = 0;
        items.forEach(it => {
            const cat = (it.category || '').toLowerCase();
            if (cat === 'substructure' || cat === 'superstructure' || cat === 'site labor') {
                civilAmt += it.amount;
            } else if (cat === 'masonry' || cat === 'joinery' || cat === 'roofing' || cat === 'site works') {
                matAmt += it.amount;
            } else if (cat === 'flooring' || cat === 'finishes' || cat === 'landscape') {
                finishAmt += it.amount;
            } else if (cat === 'mep systems' || cat === 'electrical') {
                elecAmt += it.amount;
            } else if (cat === 'sanitary' || cat === 'plumbing') {
                plumbAmt += it.amount;
            } else {
                civilAmt += it.amount;
            }
        });

        const safeSubtotal = Math.max(1, subtotal);
        const pCiv = Math.round((civilAmt / safeSubtotal) * 100);
        const pMat = Math.round((matAmt / safeSubtotal) * 100);
        const pFin = Math.round((finishAmt / safeSubtotal) * 100);
        const pEle = Math.round((elecAmt / safeSubtotal) * 100);
        const pPlu = Math.max(0, 100 - (pCiv + pMat + pFin + pEle)); // Balance remainder to 100%

        const bCiv = document.getElementById('barValCivil');
        const bMat = document.getElementById('barValMaterials');
        const bFin = document.getElementById('barValFinishing');
        const bEle = document.getElementById('barValElectrical');
        const bPlu = document.getElementById('barValPlumbing');

        if (bCiv) bCiv.textContent = `${this.formatINR(civilAmt)} (${pCiv}%)`;
        if (bMat) bMat.textContent = `${this.formatINR(matAmt)} (${pMat}%)`;
        if (bFin) bFin.textContent = `${this.formatINR(finishAmt)} (${pFin}%)`;
        if (bEle) bEle.textContent = `${this.formatINR(elecAmt)} (${pEle}%)`;
        if (bPlu) bPlu.textContent = `${this.formatINR(plumbAmt)} (${pPlu}%)`;

        // Update progress bar widths in the DOM
        const fills = document.querySelectorAll('.cdc-bars-col .bar-group .bar-fill');
        if (fills.length >= 5) {
            fills[0].style.width = `${pCiv}%`;
            fills[1].style.width = `${pMat}%`;
            fills[2].style.width = `${pFin}%`;
            fills[3].style.width = `${pEle}%`;
            fills[4].style.width = `${pPlu}%`;
        }

        // Update SVG Donut chart segments dynamically (circumference = 289)
        const donutCircles = document.querySelectorAll('.cdc-donut-svg circle:not(:first-child)');
        if (donutCircles.length >= 5) {
            const circ = 289;
            const segCiv = (pCiv / 100) * circ;
            const segMat = (pMat / 100) * circ;
            const segFin = (pFin / 100) * circ;
            const segEle = (pEle / 100) * circ;
            const segPlu = (pPlu / 100) * circ;

            donutCircles[0].setAttribute('stroke-dasharray', `${segCiv.toFixed(1)} ${(circ - segCiv).toFixed(1)}`);
            donutCircles[0].setAttribute('stroke-dashoffset', '0');

            donutCircles[1].setAttribute('stroke-dasharray', `${segMat.toFixed(1)} ${(circ - segMat).toFixed(1)}`);
            donutCircles[1].setAttribute('stroke-dashoffset', `-${segCiv.toFixed(1)}`);

            donutCircles[2].setAttribute('stroke-dasharray', `${segFin.toFixed(1)} ${(circ - segFin).toFixed(1)}`);
            donutCircles[2].setAttribute('stroke-dashoffset', `-${(segCiv + segMat).toFixed(1)}`);

            donutCircles[3].setAttribute('stroke-dasharray', `${segEle.toFixed(1)} ${(circ - segEle).toFixed(1)}`);
            donutCircles[3].setAttribute('stroke-dashoffset', `-${(segCiv + segMat + segFin).toFixed(1)}`);

            donutCircles[4].setAttribute('stroke-dasharray', `${segPlu.toFixed(1)} ${(circ - segPlu).toFixed(1)}`);
            donutCircles[4].setAttribute('stroke-dashoffset', `-${(segCiv + segMat + segFin + segEle).toFixed(1)}`);
        }

        // Render Target Budget Comparison
        this.renderBudgetComparison(grandTotal);
    },

    renderBudgetComparison(grandTotal) {
        const userBudget = Number(this.config.budget) || 4500000;
        const lblBudget = document.getElementById('lblBudget');
        const lblEstimate = document.getElementById('lblEstimate');
        const progressFill = document.getElementById('budgetProgress');
        const statusMsg = document.getElementById('budgetStatusMsg');
        const varianceBadge = document.getElementById('budgetVarianceBadge');

        if (lblBudget) lblBudget.textContent = this.formatINR(userBudget);
        if (lblEstimate) lblEstimate.textContent = this.formatINR(grandTotal);

        const ratio = userBudget > 0 ? (grandTotal / userBudget) : 1;
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

        const diff = Math.abs(userBudget - grandTotal);
        const diffStr = this.formatINR(diff);
        const varPct = Math.round(Math.abs(ratio - 1) * 100);

        if (ratio <= 1.0) {
            if (varianceBadge) {
                varianceBadge.textContent = ratio === 1 ? 'On Target' : `-${varPct}%`;
                varianceBadge.className = 'budget-variance-badge success';
            }
            if (statusMsg) {
                statusMsg.textContent = `${diffStr} under target budget`;
                statusMsg.className = 'budget-status-row success';
            }
        } else if (ratio <= 1.15) {
            if (varianceBadge) {
                varianceBadge.textContent = `+${varPct}%`;
                varianceBadge.className = 'budget-variance-badge warning';
            }
            if (statusMsg) {
                statusMsg.textContent = `${diffStr} minor variance (+${varPct}%)`;
                statusMsg.className = 'budget-status-row warning';
            }
        } else {
            if (varianceBadge) {
                varianceBadge.textContent = `+${varPct}%`;
                varianceBadge.className = 'budget-variance-badge danger';
            }
            if (statusMsg) {
                statusMsg.textContent = `${diffStr} exceeds target budget (+${varPct}%)`;
                statusMsg.className = 'budget-status-row danger';
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
        if (!num || isNaN(num)) return '₹\u00A00';
        num = Math.round(num);
        if (num >= 10000000) {
            return `₹\u00A0${(num / 10000000).toFixed(2)}\u00A0Cr`;
        } else if (num >= 100000) {
            return `₹\u00A0${(num / 100000).toFixed(2)}\u00A0L`;
        } else {
            return `₹\u00A0${num.toLocaleString('en-IN')}`;
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    async fetchAndRenderMLValuation() {
        const pW = Number(this.config.plotWidth || this.config.plot_width) || 40;
        const pL = Number(this.config.plotLength || this.config.plot_length) || 50;
        const floors = Math.max(1, Number(this.config.floors) || 1);
        const builtup = Number(this.config.builtup_area) || Math.round(pW * pL * 0.7 * floors);
        const bhk = Number(this.config.bedrooms || this.config.bhk || 3);
        const city = this.config.city || 'Bangalore';

        const cpwdDisplay = document.getElementById('mlCpwdCostDisplay');
        const priceDisplay = document.getElementById('mlPriceValuationDisplay');
        const priceSubtext = document.getElementById('mlPriceSubtext');
        const equityDisplay = document.getElementById('mlEquityMarginDisplay');
        const equityRatioText = document.getElementById('mlEquityRatioText');

        // Immediate deterministic calculation baseline so cards are NEVER blank
        const grandTotal = this.currentBreakdown ? this.currentBreakdown.grandTotal : (builtup * 1850);
        let cpwdLakhs = Math.round((grandTotal / 100000) * 100) / 100;
        const cityRates = { 'Mumbai': 18500, 'Bangalore': 6500, 'Bengaluru': 6500, 'Pune': 5800, 'Hyderabad': 5800, 'Delhi': 7200, 'Chennai': 6200, 'Jaipur': 3800 };
        const baseRate = cityRates[city] || 5400;
        let mlPriceLakhs = Math.round(((builtup * baseRate) / 100000) * 100) / 100;

        if (cpwdDisplay) cpwdDisplay.textContent = `₹ ${cpwdLakhs.toLocaleString('en-IN')} Lakhs`;
        if (priceDisplay) priceDisplay.textContent = `₹ ${mlPriceLakhs.toLocaleString('en-IN')} Lakhs`;
        if (priceSubtext) priceSubtext.textContent = `Preliminary market valuation based on ${city} standard rate (₹${baseRate.toLocaleString('en-IN')}/sq.ft).`;

        let diff = mlPriceLakhs - cpwdLakhs;
        if (equityDisplay) {
            equityDisplay.textContent = `₹ ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} Lakhs`;
            equityDisplay.style.color = diff >= 0 ? '#0d9488' : '#e11d48';
        }
        if (equityRatioText) {
            const pct = cpwdLakhs > 0 ? ((diff / cpwdLakhs) * 100).toFixed(1) : '0.0';
            equityRatioText.innerHTML = `<strong>Equity Margin:</strong> ${diff >= 0 ? '+' : ''}${pct}% projected asset appreciation above construction outlay.`;
        }

        const payload = {
            square_ft: builtup,
            built_up_area_sqft: builtup,
            bhk: bhk,
            floors: floors,
            city: city,
            finishing_tier: this.currentTier
        };

        try {
            const res = await fetch('/api/ml/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                const ml = data.property_valuation_ml;
                const cpwd = data.construction_cost_cpwd;

                if (cpwd && cpwd.calculation) {
                    cpwdLakhs = cpwd.calculation.total_construction_cost_lakhs;
                    if (cpwdDisplay) {
                        cpwdDisplay.textContent = `₹ ${cpwdLakhs.toLocaleString('en-IN')} Lakhs`;
                    }
                }

                if (ml && ml.prediction) {
                    mlPriceLakhs = ml.prediction.property_price_lakhs;
                    if (priceDisplay) {
                        priceDisplay.textContent = `₹ ${mlPriceLakhs.toLocaleString('en-IN')} Lakhs`;
                    }
                    if (priceSubtext) {
                        const ci = ml.prediction.confidence_interval_90;
                        const rate = Math.round(ml.prediction.market_price_per_sqft_inr);
                        priceSubtext.textContent = `Predicted market value (90% CI: ₹${ci.lower_lakhs} - ${ci.upper_lakhs} L). Rate: ₹${rate.toLocaleString('en-IN')}/sqft.`;
                    }
                }

                if (cpwdLakhs > 0 && mlPriceLakhs > 0) {
                    diff = mlPriceLakhs - cpwdLakhs;
                    if (equityDisplay) {
                        equityDisplay.textContent = `₹ ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} Lakhs`;
                        equityDisplay.style.color = diff >= 0 ? '#0d9488' : '#e11d48';
                    }
                    if (equityRatioText) {
                        const pct = ((diff / cpwdLakhs) * 100).toFixed(1);
                        equityRatioText.innerHTML = `<strong>Equity Margin:</strong> ${diff >= 0 ? '+' : ''}${pct}% projected asset appreciation above construction outlay.`;
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch ML valuation:', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CostStudio.init();
});
