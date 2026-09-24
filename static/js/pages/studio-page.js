// =========================================================================
// HamaraGhar — Architectural 2D ↔ 3D Synchronized Studio Controller
// Integrates Canonical HouseModel, 2D Floor Plan Canvas, WebGL Three.js,
// ML Typology, NBC Validation, CPWD Costing, and Kaggle Valuation.
// =========================================================================

import { HouseModelAdapter } from '../core/house-model-adapter.js';
import { FloorPlan2DRenderer } from '../planner/floorplan-2d-renderer.js';
import { Procedural3DGenerator } from '../builder/procedural-3d-generator.js';
import { StudioSyncManager } from '../core/studio-sync-manager.js';

class ArchitecturalStudioApp {
    constructor() {
        this.renderer2d = null;
        this.renderer3d = null;
        this.syncManager = null;
        this.currentConfig = {};
        this.projectId = null;
    }

    async init() {
        const canvas2d = document.getElementById('floorPlan2DCanvas');
        const container3d = document.getElementById('three3DContainer');

        if (!canvas2d || !container3d) {
            console.warn('Studio containers not found in DOM.');
            return;
        }

        // 1. Initialize Renderers
        this.renderer2d = new FloorPlan2DRenderer(canvas2d);
        this.renderer3d = new Procedural3DGenerator(container3d);
        this.syncManager = new StudioSyncManager({
            renderer2d: this.renderer2d,
            renderer3d: this.renderer3d
        });

        // Make globally available for inline event handlers and tests
        window.StudioSync = this.syncManager;
        window.StudioApp = this;

        // 2. Resolve Active Project & Configuration
        await this._resolveProjectConfig();

        // 3. Setup UI Listeners
        this._setupTopBarListeners();
        this._setupCADToolbarListeners();
        this._setupCameraControlListeners();
        this._setupViewOptionsListeners();
        this._setupKeyboardShortcuts();

        // 4. Fetch Hybrid Plan & Ingest into Canonical HouseModel
        await this.loadPlan();
    }

    async _resolveProjectConfig() {
        const urlParams = new URLSearchParams(window.location.search);
        const paramId = urlParams.get('project_id');

        let serverData = null;
        const serverScript = document.getElementById('server-project-data');
        if (serverScript && serverScript.textContent.trim()) {
            try {
                serverData = JSON.parse(serverScript.textContent);
            } catch (e) {
                console.warn('Could not parse server project data:', e);
            }
        }

        if (serverData && (!paramId || String(serverData.id) === String(paramId))) {
            this.projectId = serverData.id;
            this.currentConfig = serverData.data || {};
        } else if (paramId) {
            this.projectId = parseInt(paramId, 10);
            try {
                if (window.API && typeof window.API.getProject === 'function') {
                    const res = await window.API.getProject(this.projectId);
                    const p = res.data || res;
                    this.currentConfig = p.data || {};
                }
            } catch (e) {
                console.warn('Failed to fetch project via API:', e);
            }
        }

        if (!this.currentConfig || Object.keys(this.currentConfig).length === 0) {
            let saved = null;
            if (window.Utils && typeof window.Utils.loadLocal === 'function') {
                saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
            } else {
                const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
                if (raw) {
                    try { saved = JSON.parse(raw); } catch (e) {}
                }
            }

            this.currentConfig = saved || {
                plot_width: 40.0,
                plot_length: 50.0,
                plotWidth: 40.0,
                plotLength: 50.0,
                bhk: 3,
                bedrooms: 3,
                bathrooms: 3,
                floors: 1,
                city: 'Bangalore',
                finishing_tier: 'Standard',
                features: ['Parking', 'Balcony', 'Pooja Room', 'Utility'],
                projectName: 'Modern Residence'
            };
        }
    }

    async loadPlan(variant = 0) {
        let hybridData = null;
        let layout = null;

        const payload = Object.assign({}, this.currentConfig, {
            plot_width: this.currentConfig.plotWidth || this.currentConfig.plot_width || 40.0,
            plot_length: this.currentConfig.plotLength || this.currentConfig.plot_length || 50.0,
            bhk: this.currentConfig.bedrooms || this.currentConfig.bhk || 3,
            bathrooms: this.currentConfig.bathrooms || 3,
            floors: this.currentConfig.floors || 1,
            city: this.currentConfig.city || 'Bangalore',
            finishing_tier: this.currentConfig.finishing_tier || 'Standard',
            floor: 0,
            variant: variant
        });

        // 1. Fetch from ML Hybrid Engine
        try {
            const res = await fetch('/api/ml/hybrid-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                hybridData = await res.json();
                if (hybridData && hybridData.geometry) {
                    layout = hybridData.geometry;
                }
            }
        } catch (e) {
            console.warn('Hybrid plan endpoint fetch failed, falling back to client generator:', e);
        }

        // 2. Client-side PlanGenerator fallback
        if (!layout && window.PlanGenerator && typeof window.PlanGenerator.generate === 'function') {
            layout = window.PlanGenerator.generate(this.currentConfig, 0, variant);
        }

        if (layout) {
            // Incorporate ML & Cost details into layout object
            if (hybridData) {
                if (hybridData.property_valuation_ml?.prediction) {
                    this.currentConfig.estimatedValuation = Math.round(hybridData.property_valuation_ml.prediction.property_price_lakhs * 100000);
                }
                if (hybridData.construction_cost_cpwd?.calculation) {
                    this.currentConfig.estimatedCost = Math.round(hybridData.construction_cost_cpwd.calculation.total_construction_cost_lakhs * 100000);
                }
                this._displayMLBadges(hybridData);
            }

            // Adapt into Canonical HouseModel
            const canonicalModel = HouseModelAdapter.fromLegacyPlan(layout, this.currentConfig);
            this.syncManager.loadModel(canonicalModel, 0);

            // Populate floor dropdown based on actual floor count
            this._populateFloorDropdown(canonicalModel.floors.length);
        }
    }

    _displayMLBadges(data) {
        const mlBadge = document.getElementById('studioMLTypologyBadge');
        const nbcBadge = document.getElementById('studioNBCBadge');
        const simBadge = document.getElementById('studioManifoldBadge');

        if (mlBadge && data.ml_layout_assessment) {
            const typ = data.ml_layout_assessment.predicted_typology || 'Zoned Residence';
            const score = data.ml_layout_assessment.overall_ml_score || 88;
            mlBadge.textContent = `Typology: ${typ} (${score}/100)`;
            mlBadge.style.display = 'inline-block';
        }

        if (nbcBadge && data.nbc_compliance) {
            const isComp = data.nbc_compliance.is_compliant;
            nbcBadge.textContent = isComp ? 'NBC 2016 ✓' : 'NBC Warnings';
            nbcBadge.className = isComp ? 'badge badge-accent' : 'badge badge-warning';
            nbcBadge.style.display = 'inline-block';
        }

        if (simBadge && data.ml_layout_assessment?.closest_cubicasa_id) {
            simBadge.textContent = `Ref: ${data.ml_layout_assessment.closest_cubicasa_id}`;
            simBadge.style.display = 'inline-block';
        }
    }

    _populateFloorDropdown(floorCount) {
        const select = document.getElementById('studioFloorSelect');
        if (!select) return;

        select.innerHTML = '';
        select.innerHTML += `<option value="0">Ground Floor</option>`;
        if (floorCount > 1) {
            select.innerHTML += `<option value="1">First Floor</option>`;
        }
        if (floorCount > 2) {
            select.innerHTML += `<option value="2">Second Floor</option>`;
        }
        select.innerHTML += `<option value="all">All Floors</option>`;

        select.value = "0";
    }

    _setupTopBarListeners() {
        // Mode Switcher: [2D] [3D] [Split]
        document.querySelectorAll('.st-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.st-mode-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const mode = target.getAttribute('data-mode');
                this.syncManager.setViewMode(mode);
            });
        });

        // Floor Dropdown
        const floorSelect = document.getElementById('studioFloorSelect');
        if (floorSelect) {
            floorSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const idx = (val === 'all') ? 'all' : parseInt(val, 10);
                this.syncManager.setFloor(idx);
            });
        }

        // Undo & Redo
        const btnUndo = document.getElementById('btnStudioUndo');
        if (btnUndo) btnUndo.addEventListener('click', () => this.syncManager.undo());
        const btnRedo = document.getElementById('btnStudioRedo');
        if (btnRedo) btnRedo.addEventListener('click', () => this.syncManager.redo());

        // Save Project
        const btnSave = document.getElementById('btnStudioSave');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                await this.saveProject();
            });
        }

        // Export Blueprint
        const btnExport = document.getElementById('btnStudioExport');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                this.renderer2d.downloadPNG();
            });
        }
    }

    async saveProject() {
        const saveIndicator = document.getElementById('saveStatusIndicator');
        if (saveIndicator) saveIndicator.innerHTML = '<span style="color:#eab308;">Saving...</span>';

        const payload = {
            name: this.syncManager.model?.metadata?.name || 'Modern Residence',
            data: Object.assign({}, this.currentConfig, {
                canonicalModel: this.syncManager.model,
                lastSavedAt: new Date().toISOString()
            })
        };

        try {
            if (this.projectId && window.API) {
                await window.API.updateProject(this.projectId, payload);
            } else if (window.API) {
                const res = await window.API.createProject(payload);
                if (res && res.id) this.projectId = res.id;
            }
            if (saveIndicator) {
                saveIndicator.innerHTML = '<span style="color:#10b981;">Saved ✓</span>';
            }
        } catch (e) {
            console.warn('API save error, saving to localStorage:', e);
            localStorage.setItem('house_data', JSON.stringify(payload.data));
            if (saveIndicator) {
                saveIndicator.innerHTML = '<span style="color:#10b981;">Saved Locally ✓</span>';
            }
        }
    }

    _setupCADToolbarListeners() {
        document.querySelectorAll('.cad-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.cad-tool-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const tool = target.getAttribute('data-tool');
                this.renderer2d.setTool(tool);
            });
        });
    }

    _setupCameraControlListeners() {
        document.querySelectorAll('.cam-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const camView = e.currentTarget.getAttribute('data-cam');
                this.renderer3d.setCameraView(camView);
            });
        });
    }

    _setupViewOptionsListeners() {
        // Toggles: Walls, Furniture, Roof, Dimensions, Labels, Site
        const toggleMap = [
            { id: 'toggleWalls', key: 'walls' },
            { id: 'toggleFurniture', key: 'furniture' },
            { id: 'toggleRoof', key: 'roof' },
            { id: 'toggleDimensions', key: 'dimensions' },
            { id: 'toggleLabels', key: 'labels' },
            { id: 'toggleSite', key: 'site' }
        ];

        toggleMap.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    this.renderer3d.toggleVisibility(item.key, checked);
                    if (item.key === 'dimensions') this.renderer2d.toggleDimensions(checked);
                    if (item.key === 'furniture') this.renderer2d.toggleFurniture(checked);
                    if (item.key === 'labels') this.renderer2d.toggleLabels(checked);
                });
            }
        });

        // 3D Rendering Modes: [Exterior] [Interior] [Construction] [Exploded]
        document.querySelectorAll('.vo-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.vo-mode-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const mode = target.getAttribute('data-render-mode');
                this.renderer3d.setRenderingMode(mode);
            });
        });
    }

    _setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.syncManager.redo();
                else this.syncManager.undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.syncManager.redo();
            }
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ArchitecturalStudioApp();
    app.init();
});
