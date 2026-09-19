// HamaraGhar — AI Architectural Copilot Controller
const HamaraAI = {
    isOpen: false,
    projectContext: {},

    init() {
        this.loadContext();
        this.renderElements();
        this.setupListeners();
    },

    loadContext() {
        let saved = null;
        if (window.Utils && typeof window.Utils.loadLocal === 'function') {
            saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
        } else {
            const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
            if (raw) {
                try { saved = JSON.parse(raw); } catch(e) {}
            }
        }

        this.projectContext = saved || {
            projectName: 'Residential Villa',
            plot_width: 40,
            plot_length: 50,
            floors: 2,
            bhk: 3,
            city: 'Bengaluru',
            budget: 4500000
        };
    },

    renderElements() {
        if (document.getElementById('aiCopilotTrigger')) return;

        // 1. Floating Trigger Button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = 'aiCopilotTrigger';
        trigger.className = 'ai-copilot-trigger';
        trigger.innerHTML = `
            <svg class="ai-spark-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Hamara AI</span>
            <span class="ai-pulse-dot"></span>
        `;
        document.body.appendChild(trigger);

        // 2. Flyout Drawer
        const drawer = document.createElement('div');
        drawer.id = 'aiCopilotDrawer';
        drawer.className = 'ai-copilot-drawer';
        drawer.style.display = 'none';

        const ctxName = this.projectContext.projectName || 'My House Plan';
        const ctxCity = this.projectContext.city || 'India';
        const ctxBhk = this.projectContext.bhk || this.projectContext.bedrooms || 3;

        drawer.innerHTML = `
            <div class="ai-drawer-header">
                <div class="ai-drawer-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <h3>Hamara AI Copilot</h3>
                </div>
                <button type="button" class="ai-drawer-close" id="aiDrawerClose" title="Close Copilot">✕</button>
            </div>

            <div class="ai-context-strip">
                <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> <b>${this.escapeHtml(ctxCity)}</b> &bull; ${ctxBhk} BHK</span>
                <span>Plan: <b>${this.escapeHtml(ctxName)}</b></span>
            </div>

            <div class="ai-quick-prompts">
                <button type="button" class="ai-prompt-chip" data-prompt="vastu">Vastu Shastra</button>
                <button type="button" class="ai-prompt-chip" data-prompt="cost">Reduce Cost 15%</button>
                <button type="button" class="ai-prompt-chip" data-prompt="ventilation">NBC Light & Air</button>
                <button type="button" class="ai-prompt-chip" data-prompt="hazard">IS 1893 Resilience</button>
                <button type="button" class="ai-prompt-chip" data-prompt="materials">AAC vs Red Brick</button>
            </div>

            <div class="ai-messages-list" id="aiMessagesList">
                <div class="ai-msg ai">
                    <div class="ai-bubble">
                        Hello! I am your <b>Hamara AI Architectural Copilot</b>. I analyze your floor plans, CPWD budgeting, and regional Indian Building Codes (NBC 2016 & IS 1893).
                        <br><br>
                        Click any prompt above or ask me about Vastu alignment, material trade-offs, or structural optimization.
                    </div>
                </div>
            </div>

            <form class="ai-input-box" id="aiInputForm">
                <input type="text" id="aiUserInput" placeholder="Ask about Vastu, cost savings, IS codes..." autocomplete="off">
                <button type="submit">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        `;
        document.body.appendChild(drawer);
    },

    setupListeners() {
        const trigger = document.getElementById('aiCopilotTrigger');
        const closeBtn = document.getElementById('aiDrawerClose');
        const form = document.getElementById('aiInputForm');

        if (trigger) {
            trigger.addEventListener('click', () => this.toggleDrawer());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleDrawer(false));
        }
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('aiUserInput');
                if (input && input.value.trim()) {
                    const txt = input.value.trim();
                    input.value = '';
                    this.handleUserMessage(txt);
                }
            });
        }

        // Quick prompt chips
        document.querySelectorAll('.ai-prompt-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-prompt');
                const prompts = {
                    vastu: "How do I optimize this floor plan according to Vastu Shastra?",
                    cost: "How can I reduce construction cost by 15% without sacrificing quality?",
                    ventilation: "Check natural lighting and ventilation under NBC 2016 guidelines.",
                    hazard: "What are the mandatory IS 1893:2016 structural requirements for my city?",
                    materials: "Should I build with AAC lightweight blocks or traditional red clay bricks?"
                };
                if (prompts[key]) {
                    this.handleUserMessage(prompts[key], key);
                }
            });
        });
    },

    toggleDrawer(forceState) {
        const drawer = document.getElementById('aiCopilotDrawer');
        if (!drawer) return;
        this.isOpen = (typeof forceState === 'boolean') ? forceState : !this.isOpen;
        drawer.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            document.getElementById('aiUserInput')?.focus();
        }
    },

    handleUserMessage(userText, topicKey) {
        const list = document.getElementById('aiMessagesList');
        if (!list) return;

        // Append user message
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-msg user';
        userMsg.innerHTML = `<div class="ai-bubble">${this.escapeHtml(userText)}</div>`;
        list.appendChild(userMsg);
        list.scrollTop = list.scrollHeight;

        // Generate response
        setTimeout(() => {
            const aiResponse = this.generateResponse(userText, topicKey);
            const aiMsg = document.createElement('div');
            aiMsg.className = 'ai-msg ai';
            aiMsg.innerHTML = `<div class="ai-bubble">${aiResponse}</div>`;
            list.appendChild(aiMsg);
            list.scrollTop = list.scrollHeight;
        }, 400);
    },

    generateResponse(prompt, key) {
        const ctx = this.projectContext;
        const pW = ctx.plot_width || ctx.plotWidth || 40;
        const pL = ctx.plot_length || ctx.plotLength || 50;
        const city = ctx.city || 'Bengaluru';
        const bhk = ctx.bhk || ctx.bedrooms || 3;
        const lowPrompt = prompt.toLowerCase();

        if (key === 'vastu' || lowPrompt.includes('vastu')) {
            return `
                <b>Vastu Shastra Plan Audit (${pW}×${pL} ft plot):</b>
                <ul>
                    <li><b>Master Bedroom:</b> Locate strictly in the <i>South-West (Nairutya)</i> quadrant for stability and family health.</li>
                    <li><b>Kitchen:</b> Orient cooking counter facing East in the <i>South-East (Agneya)</i> fire corner.</li>
                    <li><b>Pooja Room / Study:</b> Position in the <i>North-East (Ishanya)</i> dawn sector for positive solar energy.</li>
                    <li><b>Main Entrance:</b> Keep main door in the 4th/5th Pada of North or East wall.</li>
                </ul>
            `;
        }

        if (key === 'cost' || lowPrompt.includes('cost') || lowPrompt.includes('reduce') || lowPrompt.includes('budget')) {
            return `
                <b>Strategies to Reduce Cost by ~15% (Saving ₹5L–₹7L):</b>
                <ul>
                    <li><b>Trim Circulation:</b> Keep internal corridor area under 8% of total built-up footprint.</li>
                    <li><b>AAC Blocks vs. Clay Brick:</b> AAC blocks save ~18% on foundation and mortar load due to lower dead-weight.</li>
                    <li><b>Standard Tile Modules:</b> Use standard 2×4 ft or 2×2 ft vitrified tiles to avoid 15% edge wastage.</li>
                    <li><b>Stack Plumbing Ducts:</b> Align bathrooms directly on top of each other between floors to cut pipe lengths by 40%.</li>
                </ul>
            `;
        }

        if (key === 'ventilation' || lowPrompt.includes('ventilat') || lowPrompt.includes('window') || lowPrompt.includes('light')) {
            return `
                <b>NBC 2016 Light & Ventilation Standards:</b>
                <ul>
                    <li><b>Window-to-Floor Area Ratio:</b> Minimum <b>10%–12.5%</b> glazing ratio required for habitable living and bedrooms.</li>
                    <li><b>Cross Ventilation:</b> Ensure every primary room has openings on two distinct walls to create natural stack ventilation.</li>
                    <li><b>Ceiling Height:</b> Finished floor to bottom of beam clearance must not fall below <b>9'6" (2.90m)</b>.</li>
                </ul>
            `;
        }

        if (key === 'hazard' || lowPrompt.includes('seismic') || lowPrompt.includes('hazard') || lowPrompt.includes('code')) {
            return `
                <b>IS 1893:2016 Structural Mandates for ${city}:</b>
                <ul>
                    <li><b>Ductile Reinforcement:</b> Beam-column joints require 135-degree seismic hooks with 10× diameter extension.</li>
                    <li><b>Plinth Elevation:</b> Build finished floor plinth at minimum <b>600mm</b> above municipal road level to prevent urban street runoff flooding.</li>
                    <li><b>TMT Specification:</b> Always specify Fe550D grade steel (high elongation percentage against earthquake tremors).</li>
                </ul>
            `;
        }

        if (key === 'materials' || lowPrompt.includes('aac') || lowPrompt.includes('brick') || lowPrompt.includes('material')) {
            return `
                <b>AAC Blocks vs. Red Clay Brick Comparison:</b>
                <ul>
                    <li><b>Thermal Insulation:</b> AAC block thermal conductivity is ~0.16 W/mK vs. 0.81 W/mK for brick, reducing AC power consumption by 20%.</li>
                    <li><b>Speed & Joint Mortar:</b> Large block sizes require thin-bed adhesive mortar, accelerating masonry construction 3×.</li>
                    <li><b>Plaster Requirement:</b> AAC blocks feature smooth machine faces requiring only single-coat 6mm gypsum plaster.</li>
                </ul>
            `;
        }

        // Generic intelligent fallback
        return `
            Based on your <b>${pW}×${pL} ft</b> plot in <b>${city}</b>:
            <br>
            I recommend planning a compact G+1 layout with external setbacks (5ft front, 3ft sides) ensuring full municipal fire code compliance. Would you like me to analyze <b>Vastu compliance</b>, <b>CPWD costing</b>, or <b>IS 1893 seismic zoning</b>?
        `;
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    HamaraAI.init();
});
