// HamaraGhar — 2D CAD Blueprint Floor Plan Studio Controller
// Synchronizes project data, deterministic CAD geometry, room schedule, technical specs, and multi-floor views.

const FloorPlanStudio = {
    canvas: null,
    ctx: null,
    projectId: null,
    projectName: '',
    config: {},
    currentPlan: null,
    activeFloor: 0,
    activeVariant: 0,
    showDimensions: true,
    scale: 8, // pixels per foot
    offsetX: 60,
    offsetY: 60,

    async init() {
        this.canvas = document.getElementById('floorPlanCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }

        // 1. Resolve active project from:
        // a) URL query parameter (?project_id=...)
        // b) Server-rendered JSON element (#server-project-data)
        // c) Local storage / Utils
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
            this.projectName = serverData.name || 'House Plan';
            this.config = serverData.data || {};
        } else if (paramId) {
            this.projectId = parseInt(paramId, 10);
            try {
                if (window.API && typeof window.API.getProject === 'function') {
                    const res = await window.API.getProject(this.projectId);
                    const p = res.data || res;
                    this.projectName = p.name || 'House Plan';
                    this.config = p.data || {};
                }
            } catch (e) {
                console.warn('Failed to fetch project via API:', e);
            }
        }

        // Fallback if no project in server data or URL
        if (!this.config || Object.keys(this.config).length === 0) {
            let saved = null;
            if (window.Utils && typeof window.Utils.loadLocal === 'function') {
                saved = window.Utils.loadLocal('house_data') || window.Utils.loadLocal('smartbuild_config');
            } else {
                const raw = localStorage.getItem('house_data') || localStorage.getItem('smartbuild_config');
                if (raw) {
                    try { saved = JSON.parse(raw); } catch (e) {}
                }
            }
            this.config = saved || {
                plot_width: 40,
                plot_length: 50,
                plotWidth: 40,
                plotLength: 50,
                bhk: 3,
                bedrooms: 3,
                floors: 2,
                projectName: 'Modern Residence'
            };
            this.projectName = this.config.projectName || this.config.name || 'House Plan';
        }

        // Synchronize local storage so downstream pages share active project
        if (window.Utils && typeof window.Utils.saveConfig === 'function') {
            window.Utils.saveConfig(this.config);
            if (this.projectId) window.Utils.saveLocal('current_project_id', this.projectId);
        }

        this.setupUI();
        await this.loadFloorPlan(this.activeFloor, this.activeVariant);
    },

    setupUI() {
        // Metadata in header
        const nameEl = document.getElementById('displayProjectName');
        const plotEl = document.getElementById('displayPlotSize');
        const pW = this.config.plotWidth || this.config.plot_width || 40;
        const pL = this.config.plotLength || this.config.plot_length || 50;

        if (nameEl) nameEl.textContent = this.projectName || this.config.projectName || 'House Plan';
        if (plotEl) plotEl.textContent = `Plot: ${pW} × ${pL} ft (${Math.round(pW * pL).toLocaleString('en-IN')} sq ft)`;

        // Update links with project_id
        if (this.projectId) {
            ['btnGo3D', 'linkBuilder'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.href = `/builder?project_id=${this.projectId}`;
            });
            const linkCost = document.getElementById('linkCost');
            if (linkCost) linkCost.href = `/cost?project_id=${this.projectId}`;
            const linkRisk = document.getElementById('linkRisk');
            if (linkRisk) linkRisk.href = `/risk?project_id=${this.projectId}`;
        }

        // Toolbar buttons
        const btnRegen = document.getElementById('btnRegenerate');
        if (btnRegen) {
            btnRegen.addEventListener('click', async () => {
                this.activeVariant = (this.activeVariant + 1) % 3;
                await this.regenerateVariant(this.activeVariant);
            });
        }

        const btnToggleDims = document.getElementById('btnToggleDims');
        if (btnToggleDims) {
            btnToggleDims.addEventListener('click', () => {
                this.showDimensions = !this.showDimensions;
                btnToggleDims.classList.toggle('active', this.showDimensions);
                this.draw();
            });
        }

        const btnDownload = document.getElementById('btnDownload');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => this.downloadPNG());
        }

        // Floors configuration
        const totalFloors = Number(this.config.floors) || 1;
        const btnFloor1 = document.getElementById('btnFloor1');
        if (btnFloor1 && totalFloors < 2) {
            btnFloor1.style.display = 'none';
        }
    },

    async switchFloor(floorIndex) {
        this.activeFloor = floorIndex;
        document.querySelectorAll('.segmented-option').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === floorIndex);
        });
        await this.loadFloorPlan(floorIndex, this.activeVariant);
    },

    async loadFloorPlan(floorIndex, variant = 0) {
        let layout = null;
        let hybridData = null;

        // 1. Fetch from Hybrid Architectural Intelligence Engine (ML + NBC + CPWD)
        try {
            const payload = Object.assign({}, this.config, {
                plot_width: this.config.plotWidth || this.config.plot_width || 40,
                plot_length: this.config.plotLength || this.config.plot_length || 50,
                bhk: this.config.bedrooms || this.config.bhk || 3,
                floors: this.config.floors || 1,
                city: this.config.city || 'Bangalore',
                finishing_tier: this.config.finishing_tier || this.config.style || 'Standard',
                floor: floorIndex,
                variant: variant
            });

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
            console.warn('Hybrid plan endpoint fetch error, trying legacy/client fallback:', e);
        }

        // 2. Fallback to project API or client PlanGenerator
        if (!layout && this.projectId && window.API) {
            try {
                const res = await window.API.get(`/api/projects/${this.projectId}/floor-plan?floor=${floorIndex}&variant=${variant}`);
                if (res && res.layout) {
                    layout = res.layout;
                }
            } catch (e) {
                console.warn('Could not fetch layout from API:', e);
            }
        }

        if (!layout && window.PlanGenerator) {
            layout = window.PlanGenerator.generate(this.config, floorIndex, variant);
        }

        if (!layout) return;

        this.currentPlan = layout;
        this.updateScheduleAndStats(layout);
        if (hybridData) {
            this.updateHybridPanels(hybridData);
        }
        this.adjustScaleAndOffsets();
        this.draw();
    },

    async regenerateVariant(variant) {
        await this.loadFloorPlan(this.activeFloor, variant);
        if (window.Utils?.notify) {
            window.Utils.notify(`Switched to: ${this.currentPlan?.variantName || 'Alternative Layout'}`, 'info');
        }
    },

    updateHybridPanels(data) {
        if (!data) return;

        // 1. NBC 2016 Compliance Audit
        const nbc = data.nbc_compliance;
        if (nbc) {
            const scoreEl = document.getElementById('nbcScoreBadge');
            const setbackEl = document.getElementById('nbcSetbackSummary');
            const collisionEl = document.getElementById('nbcCollisionStatus');
            const roomStatusEl = document.getElementById('nbcRoomStatus');
            const warnBox = document.getElementById('nbcWarningContainer');

            if (scoreEl) {
                scoreEl.textContent = `Score: ${nbc.compliance_score}/100`;
                scoreEl.className = nbc.is_compliant ? 'badge badge-accent' : 'badge badge-outline';
            }

            if (setbackEl && data.geometry?.setbacks) {
                const sb = data.geometry.setbacks;
                setbackEl.textContent = `F: ${sb.front}ft | R: ${sb.rear}ft | S: ${sb.side}ft`;
            }

            if (collisionEl) {
                if (nbc.overlap_detected) {
                    collisionEl.textContent = 'Room Collision Detected!';
                    collisionEl.style.color = '#ef4444';
                } else {
                    collisionEl.textContent = '0 Overlaps (Disjoint)';
                    collisionEl.style.color = '#0d9488';
                }
            }

            if (roomStatusEl) {
                if (nbc.warnings && nbc.warnings.length > 0) {
                    roomStatusEl.textContent = `${nbc.warnings.length} Notices Active`;
                    roomStatusEl.style.color = '#d97706';
                } else {
                    roomStatusEl.textContent = 'NBC Minimums Met';
                    roomStatusEl.style.color = '#0d9488';
                }
            }

            if (warnBox) {
                const msgs = [ ...(nbc.violations || []), ...(nbc.warnings || []) ];
                if (msgs.length > 0) {
                    warnBox.style.display = 'block';
                    warnBox.innerHTML = msgs.slice(0, 3).map(m => `<div>&bull; ${m}</div>`).join('');
                } else {
                    warnBox.style.display = 'none';
                }
            }
        }

        // 2. Real Kaggle ML Property Valuation
        const ml = data.property_valuation_ml;
        if (ml && ml.prediction) {
            const valEl = document.getElementById('mlValuationAmount');
            const rateEl = document.getElementById('mlRatePerSqft');
            const ciEl = document.getElementById('mlConfidenceInterval');
            const driversEl = document.getElementById('mlDriversList');

            if (valEl) valEl.textContent = `₹ ${ml.prediction.property_price_lakhs.toLocaleString('en-IN')} Lakhs`;
            if (rateEl) rateEl.textContent = `₹ ${Math.round(ml.prediction.market_price_per_sqft_inr).toLocaleString('en-IN')} / sq.ft`;
            if (ciEl && ml.prediction.confidence_interval_90) {
                const ci = ml.prediction.confidence_interval_90;
                ciEl.textContent = `₹ ${ci.lower_lakhs} - ${ci.upper_lakhs} L`;
            }
            if (driversEl && Array.isArray(ml.valuation_drivers)) {
                driversEl.innerHTML = ml.valuation_drivers.slice(0, 2).map(d => 
                    `<div>&bull; <strong>${d.driver}:</strong> ${d.impact}</div>`
                ).join('');
            }
        }

        // 3. Deterministic CPWD DSR 2024 Construction Cost
        const cpwd = data.construction_cost_cpwd;
        if (cpwd && cpwd.calculation) {
            const cpwdEl = document.getElementById('cpwdCostAmount');
            const cpwdRateEl = document.getElementById('cpwdRatePerSqft');
            const cpwdTierEl = document.getElementById('cpwdFinishingTier');

            if (cpwdEl) cpwdEl.textContent = `₹ ${cpwd.calculation.total_construction_cost_lakhs.toLocaleString('en-IN')} Lakhs`;
            if (cpwdRateEl) cpwdRateEl.textContent = `₹ ${Math.round(cpwd.calculation.rate_per_sqft_inr).toLocaleString('en-IN')} / sq.ft`;
            if (cpwdTierEl && cpwd.parameters_applied) {
                cpwdTierEl.textContent = `${cpwd.parameters_applied.finishing_tier} Tier`;
            }
        }

        // 4. ML Layout Quality & Manifold Proximity Assessment
        const mlLayout = data.ml_layout_assessment;
        if (mlLayout) {
            const overallScoreEl = document.getElementById('mlOverallScore');
            const tierTextEl = document.getElementById('mlTierText');
            const refIdEl = document.getElementById('mlReferenceId');
            const daylightEl = document.getElementById('mlDaylightScore');
            const circEl = document.getElementById('mlCirculationScore');
            const aspectEl = document.getElementById('mlAspectScore');
            const privacyEl = document.getElementById('mlPrivacyScore');
            const vastuEl = document.getElementById('mlVastuScore');
            const rankBadgeEl = document.getElementById('mlQualityRankBadge');

            if (overallScoreEl) overallScoreEl.textContent = `${mlLayout.overall_ml_score} / 100`;
            const typName = mlLayout.predicted_typology || 'Zoned Family Residence';
            if (tierTextEl) tierTextEl.textContent = `Typology: ${typName} (${mlLayout.quality_tier})`;
            if (refIdEl) {
                if (mlLayout.closest_cubicasa_id) {
                    refIdEl.textContent = `Ref: ${mlLayout.closest_cubicasa_id}`;
                    refIdEl.title = `Closest verified CubiCasa5K sample: ${mlLayout.closest_cubicasa_id}`;
                } else {
                    refIdEl.textContent = '';
                }
            }

            const subs = mlLayout.sub_scores || {};
            if (daylightEl && subs.daylight_exposure !== undefined) daylightEl.textContent = `${subs.daylight_exposure}%`;
            if (circEl && subs.circulation_efficiency !== undefined) circEl.textContent = `${subs.circulation_efficiency}%`;
            if (aspectEl && subs.aspect_ratio_quality !== undefined) aspectEl.textContent = `${subs.aspect_ratio_quality}%`;
            if (privacyEl && subs.zoning_privacy !== undefined) privacyEl.textContent = `${subs.zoning_privacy}%`;
            if (vastuEl && subs.vastu_compliance !== undefined) vastuEl.textContent = `${subs.vastu_compliance}%`;

            if (rankBadgeEl) {
                const rank = data.summary?.ml_rank || 1;
                const isRec = data.summary?.is_recommended;
                rankBadgeEl.textContent = `Rank #${rank}${isRec ? ' (Recommended)' : ''}`;
                rankBadgeEl.className = isRec ? 'badge badge-accent' : 'badge badge-outline';
            }
        }

        // 5. Populate Ranked Candidates List
        const candidatesList = document.getElementById('mlCandidateVariantsList');
        if (candidatesList && Array.isArray(data.candidate_rankings)) {
            const activeVariant = data.variant;
            candidatesList.innerHTML = data.candidate_rankings.map(c => {
                const isActive = (c.variant_id === activeVariant);
                const recBadge = c.is_recommended ? '<span style="color:#0d9488; font-weight:700;">★ Best</span>' : '';
                return `
                    <button type="button" class="btn ${isActive ? 'btn-primary' : 'btn-outline'}" 
                        style="width: 100%; justify-content: space-between; padding: 5px 8px; font-size: 11px; text-align: left; display: flex; align-items: center;"
                        onclick="FloorPlanStudio.regenerateVariant(${c.variant_id})">
                        <span><strong>#${c.rank}</strong> ${c.variant_name}</span>
                        <span><b style="color:${c.overall_ml_score >= 80 ? '#0d9488' : '#eab308'};">${c.overall_ml_score}</b> ${recBadge}</span>
                    </button>
                `;
            }).join('');
        }
    },

    adjustScaleAndOffsets() {
        if (!this.canvas || !this.currentPlan) return;
        const dims = this.currentPlan.dimensions;
        const pW = dims.width;
        const pL = dims.length;

        const availableW = this.canvas.width - 140;
        const availableH = this.canvas.height - 120;
        const scaleX = availableW / pW;
        const scaleY = availableH / pL;
        this.scale = Math.min(scaleX, scaleY, 12);

        this.offsetX = Math.round((this.canvas.width - pW * this.scale) / 2);
        this.offsetY = Math.round((this.canvas.height - pL * this.scale) / 2) + 10;
    },

    draw() {
        if (!this.ctx || !this.currentPlan) return;
        const ctx = this.ctx;
        const plan = this.currentPlan;
        const dims = plan.dimensions;

        // 1. Clear & Blueprint Dark Background
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Blueprint Grid
        this.drawGrid(ctx);

        // 3. Outer Plot Boundary (Dashed line)
        this.drawPlotBoundary(ctx, dims);

        // 4. Rooms (Fill & Architectural Walls)
        this.drawRooms(ctx, plan.rooms);

        // 5. Doors & Windows
        this.drawDoors(ctx, plan.doors);
        this.drawWindows(ctx, plan.windows);

        // 6. CAD Dimension Extension Lines
        if (this.showDimensions) {
            this.drawDimensions(ctx, dims, plan.rooms);
        }

        // 7. True North Compass
        this.drawCompass(ctx);

        // 8. Technical Title Block (Bottom-Right)
        this.drawTitleBlock(ctx, dims);
    },

    drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const step = 20;
        for (let x = 0; x < this.canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    },

    drawPlotBoundary(ctx, dims) {
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(this.offsetX, this.offsetY, dims.width * this.scale, dims.length * this.scale);

        // Setback label
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(`PLOT BOUNDARY: ${dims.width}' × ${dims.length}'`, this.offsetX + 8, this.offsetY - 8);
        ctx.restore();
    },

    drawRooms(ctx, rooms) {
        rooms.forEach(r => {
            const rx = this.offsetX + r.x * this.scale;
            const ry = this.offsetY + r.y * this.scale;
            const rw = r.width * this.scale;
            const rh = r.height * this.scale;

            // Room Background Fill
            ctx.save();
            ctx.fillStyle = r.color || 'rgba(30, 41, 59, 0.6)';
            ctx.globalAlpha = 0.50;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.restore();

            // Wall Outline
            ctx.save();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.restore();

            // Room Text Labels
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Room Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(r.name, rx + rw / 2, ry + rh / 2 - 8);

            // Dimension String
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.fillText(`${r.width}' × ${r.height}' (${Math.round(r.width * r.height)} sq ft)`, rx + rw / 2, ry + rh / 2 + 8);
            ctx.restore();
        });
    },

    drawDoors(ctx, doors) {
        doors.forEach(d => {
            const dx = this.offsetX + d.x * this.scale;
            const dy = this.offsetY + d.y * this.scale;
            const dw = (d.width || 3) * this.scale;

            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.75;

            // Door Opening Line
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + dw, dy);
            ctx.stroke();

            // Door Swing Arc
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(dx, dy, dw, 0, Math.PI / 2, false);
            ctx.stroke();

            ctx.restore();
        });
    },

    drawWindows(ctx, windows) {
        windows.forEach(w => {
            const wx = this.offsetX + w.x * this.scale;
            const wy = this.offsetY + w.y * this.scale;
            const ww = (w.width || 4) * this.scale;

            ctx.save();
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;

            if (w.wall === 'north' || w.wall === 'south') {
                ctx.fillRect(wx - ww / 2, wy - 2, ww, 4);
                ctx.strokeRect(wx - ww / 2, wy - 2, ww, 4);
            } else {
                ctx.fillRect(wx - 2, wy - ww / 2, 4, ww);
                ctx.strokeRect(wx - 2, wy - ww / 2, 4, ww);
            }
            ctx.restore();
        });
    },

    drawDimensions(ctx, dims, rooms) {
        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.lineWidth = 1;

        // Top build width dimension
        const topY = this.offsetY - 20;
        const bStartX = this.offsetX + (dims.width - dims.buildWidth) / 2 * this.scale;
        const bEndX = bStartX + dims.buildWidth * this.scale;

        ctx.beginPath();
        ctx.moveTo(bStartX, topY);
        ctx.lineTo(bEndX, topY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bStartX, topY - 4);
        ctx.lineTo(bStartX, topY + 4);
        ctx.moveTo(bEndX, topY - 4);
        ctx.lineTo(bEndX, topY + 4);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillText(`${dims.buildWidth}'0" BUILDABLE SPAN`, (bStartX + bEndX) / 2, topY - 6);

        // Left build length dimension
        const leftX = this.offsetX - 24;
        const bStartY = this.offsetY + (dims.length - dims.buildLength) / 2 * this.scale;
        const bEndY = bStartY + dims.buildLength * this.scale;

        ctx.beginPath();
        ctx.moveTo(leftX, bStartY);
        ctx.lineTo(leftX, bEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(leftX - 4, bStartY);
        ctx.lineTo(leftX + 4, bStartY);
        ctx.moveTo(leftX - 4, bEndY);
        ctx.lineTo(leftX + 4, bEndY);
        ctx.stroke();

        ctx.save();
        ctx.translate(leftX - 8, (bStartY + bEndY) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${dims.buildLength}'0" DEPTH`, 0, 0);
        ctx.restore();

        ctx.restore();
    },

    drawCompass(ctx) {
        ctx.save();
        const cx = this.canvas.width - 50;
        const cy = 46;

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#c2410c'; // Terracotta north arrow

        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx + 8, cy + 8);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx - 8, cy + 8);
        ctx.lineTo(cx, cy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, cy - 24);
        ctx.restore();
    },

    drawTitleBlock(ctx, dims) {
        ctx.save();
        const boxW = 210;
        const boxH = 68;
        const tx = this.canvas.width - boxW - 16;
        const ty = this.canvas.height - boxH - 16;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(tx, ty, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, boxW, boxH);

        const pName = this.projectName || 'House Plan';
        const floorName = this.activeFloor === 0 ? 'GROUND FLOOR' : 'FIRST FLOOR';

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`HAMARAGHAR CAD SUITE`, tx + 10, ty + 16);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText(`PLAN: ${pName.toUpperCase()}`, tx + 10, ty + 30);
        ctx.fillText(`LEVEL: ${floorName} (1:100)`, tx + 10, ty + 44);
        ctx.fillText(`STYLE: ${this.currentPlan?.variantName || 'Vastu Classic'}`, tx + 10, ty + 58);

        ctx.restore();
    },

    updateScheduleAndStats(plan) {
        // Variant badge
        const badgeVar = document.getElementById('badgeVariant');
        if (badgeVar && plan.variantName) {
            badgeVar.textContent = plan.variantName;
        }

        // Room Schedule Table
        const tbody = document.getElementById('roomScheduleBody');
        const badgeCount = document.getElementById('badgeRoomCount');
        if (badgeCount) badgeCount.textContent = `${plan.rooms.length} Spaces`;

        if (tbody) {
            tbody.innerHTML = plan.rooms.map(r => {
                const area = Math.round(r.width * r.height);
                return `
                    <tr style="border-bottom: 1px solid var(--color-border); height: 28px;">
                        <td style="padding: 4px 2px; font-weight: 500;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${r.color}; margin-right:4px;"></span>
                            ${r.name}
                        </td>
                        <td style="padding: 4px 2px; font-family: monospace; color: var(--color-text-muted);">${r.width}'×${r.height}'</td>
                        <td style="padding: 4px 2px; text-align: right; font-weight: 600; color: var(--color-accent);">${area} sq ft</td>
                    </tr>
                `;
            }).join('');
        }

        // Stats
        const statRooms = document.getElementById('statRooms');
        const statDoors = document.getElementById('statDoors');
        const statWindows = document.getElementById('statWindows');
        const barCarpet = document.getElementById('barCarpetArea');
        const barBuiltup = document.getElementById('barBuiltupArea');
        const barEff = document.getElementById('barEfficiency');

        if (statRooms) statRooms.textContent = plan.rooms.length;
        if (statDoors) statDoors.textContent = plan.doors.length;
        if (statWindows) statWindows.textContent = plan.windows.length;
        if (barCarpet) barCarpet.textContent = `${plan.carpetArea.toLocaleString('en-IN')} sq ft`;
        if (barBuiltup) barBuiltup.textContent = `${plan.builtupArea.toLocaleString('en-IN')} sq ft`;
        if (barEff) barEff.textContent = `${plan.efficiency}%`;
    },

    downloadPNG() {
        if (!this.canvas) return;
        const link = document.createElement('a');
        link.download = `HamaraGhar-Blueprint-${this.projectName || 'Plan'}-Level${this.activeFloor}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FloorPlanStudio.init();
});
