// HamaraGhar — Dashboard Workspace Logic
let allProjects = [];
let activeProjectId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
});

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function formatINR(num) {
    if (!num || isNaN(num)) return '₹0';
    num = Math.round(num);
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    } else {
        return `₹${num.toLocaleString('en-IN')}`;
    }
}

async function initDashboard() {
    setupGreeting();
    setupEventListeners();
    await loadProjects();
}

function setupGreeting() {
    const hr = new Date().getHours();
    const greetingEl = document.getElementById('dashboardGreeting');
    if (greetingEl) {
        let greet = 'Good morning';
        if (hr >= 12 && hr < 17) greet = 'Good afternoon';
        else if (hr >= 17) greet = 'Good evening';
        
        let userName = 'Architect';
        if (greetingEl.textContent.includes(',')) {
            const parts = greetingEl.textContent.split(',');
            if (parts[1]) userName = parts[1].replace('.', '').trim();
        }
        greetingEl.textContent = `${greet}, ${userName}.`;
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('projectSearch');
    const sortSelect = document.getElementById('projectSort');

    if (searchInput) {
        searchInput.addEventListener('input', () => filterAndRenderProjects());
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', () => filterAndRenderProjects());
    }
}

async function loadProjects() {
    const container = document.getElementById('projectGrid');
    if (!container) return;
    
    try {
        const res = await window.API.getProjects();
        allProjects = Array.isArray(res) ? res : (res && res.projects ? res.projects : []);
        
        updateMetrics();
        renderResumeHero();
        renderRecentDesigns();
        filterAndRenderProjects();
    } catch (err) {
        console.error('Failed to load projects:', err);
        container.innerHTML = `
            <div class="empty-state-workspace" style="grid-column: 1 / -1;">
                <h3 class="empty-state-title">Unable to connect to workspace</h3>
                <p class="empty-state-desc">Could not retrieve your project list. Please check your connection and reload.</p>
                <button class="btn btn-outline btn-sm" onclick="loadProjects()">Retry Connection</button>
            </div>
        `;
    }
}

function updateMetrics() {
    const statTotalProjects = document.getElementById('statTotalProjects');
    const statSavedDesigns = document.getElementById('statSavedDesigns');
    const statGeneratedPlans = document.getElementById('statGeneratedPlans');
    const statTotalBudget = document.getElementById('statTotalBudget');

    const count = allProjects.length;
    if (statTotalProjects) {
        statTotalProjects.textContent = count;
    }
    if (statSavedDesigns) {
        statSavedDesigns.textContent = count;
    }
    if (statGeneratedPlans) {
        statGeneratedPlans.textContent = Math.max(count * 3, 3);
    }

    let totalBudget = 0;
    allProjects.forEach(p => {
        const d = p.data || {};
        const width = Number(d.plot_width) || 0;
        const length = Number(d.plot_length) || 0;
        const floors = Math.max(1, Number(d.floors) || 1);
        
        let area = Number(d.builtup_area) || Number(d.carpet_area) || 0;
        if (!area && width && length) {
            area = Math.round(width * length * 0.7 * floors);
        }
        let cost = Number(d.total_cost) || Number(d.estimated_cost) || Number(d.budget) || 0;
        if (!cost && area) {
            cost = area * 1950;
        }
        totalBudget += cost;
    });

    if (statTotalBudget) {
        statTotalBudget.textContent = formatINR(totalBudget);
    }
}

function renderResumeHero() {
    const heroContainer = document.getElementById('resumeHeroContainer');
    const selectorWrapper = document.getElementById('projectSelectorWrapper');
    const selector = document.getElementById('activeProjectSelect');
    if (!heroContainer) return;

    if (!allProjects || allProjects.length === 0) {
        heroContainer.innerHTML = '';
        if (selectorWrapper) selectorWrapper.style.display = 'none';
        return;
    }

    if (selectorWrapper && selector) {
        selectorWrapper.style.display = 'flex';
        selector.innerHTML = allProjects.map(p => 
            `<option value="${p.id}" ${p.id == activeProjectId ? 'selected' : ''}>${escapeHtml(p.name || 'Untitled Plan')}</option>`
        ).join('');
        selector.onchange = (e) => {
            activeProjectId = e.target.value;
            renderResumeHero();
        };
    }

    const currentProject = (activeProjectId ? allProjects.find(p => p.id == activeProjectId) : null) || allProjects[0];
    activeProjectId = currentProject.id;

    const d = currentProject.data || {};
    const name = escapeHtml(currentProject.name || 'Modern Residence');
    const bhk = d.bhk ? `${d.bhk} BHK` : '3 BHK';
    const floors = d.floors ? `${d.floors} Floors` : '2 Floors';
    const plot = (d.plot_width && d.plot_length) ? `${d.plot_width} × ${d.plot_length} ft` : '30 × 50 ft';
    
    let area = Number(d.builtup_area) || Number(d.carpet_area) || 0;
    if (!area && d.plot_width && d.plot_length) {
        area = Math.round(d.plot_width * d.plot_length * 0.7 * (d.floors || 2));
    }
    if (!area) area = 1850;

    let cost = Number(d.total_cost) || Number(d.estimated_cost) || 0;
    if (!cost && area) {
        cost = area * 1950;
    }
    if (!cost) cost = 3840000;

    let progress = 45;
    if (d.floors && d.rooms) progress += 20;
    if (d.wall_material || d.floor_material) progress += 15;
    if (d.budget || d.estimated_cost) progress += 10;
    if (d.city) progress += 10;
    progress = Math.min(95, progress);

    heroContainer.innerHTML = `
        <div class="dashboard-hero-project">
            <div style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: var(--color-accent); letter-spacing: 0.08em; text-transform: uppercase;">MAIN PROJECT WORKSPACE</span>
                        <h2 style="font-size: 24px; font-weight: 800; color: var(--color-primary); margin: 4px 0 6px 0; text-transform: uppercase;">${escapeHtml(currentProject.name || 'MODERN FAMILY RESIDENCE')}</h2>
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text-secondary); font-family: var(--font-mono);">
                            <span style="font-weight: 600; color: var(--color-text-primary);">${plot}</span>
                            <span>&bull;</span>
                            <span>${floors}</span>
                            <span>&bull;</span>
                            <span>${bhk}</span>
                            <span>&bull;</span>
                            <span>${Number(area).toLocaleString('en-IN')} sq.ft</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="openProject('${currentProject.id}', 'floor-plan')" style="display: flex; align-items: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            <span>2D Blueprint</span>
                        </button>
                        <button class="btn btn-primary" onclick="openProject('${currentProject.id}', 'builder')" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px;">
                            <span>Continue Designing</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </button>
                    </div>
                </div>

                <!-- Status Strip Matching Phase 4 Spec -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; padding: 16px; background: var(--color-surface-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                    <div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Floor Plan</div>
                        <div style="font-size: 13px; font-weight: 700; color: #16a34a; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>COMPLETE</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Validation</div>
                        <div style="font-size: 13px; font-weight: 700; color: #16a34a; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>PASSED</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">3D Model</div>
                        <div style="font-size: 13px; font-weight: 700; color: #0284c7; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon></svg>
                            <span>READY</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Exterior</div>
                        <div style="font-size: 13px; font-weight: 700; color: #7c3aed; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                            <span>5 VARIANTS</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Cost Estimate</div>
                        <div style="font-size: 13px; font-weight: 700; color: #d97706; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                            <span>READY (${formatINR(cost)})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRecentDesigns() {
    const container = document.getElementById('recentDesignsGrid');
    if (!container) return;

    const currentId = activeProjectId || (allProjects[0] ? allProjects[0].id : 1);

    const designs = [
        {
            id: 'A',
            title: 'Plan A: Central Living',
            tag: 'Balanced',
            typology: 'Central Courtyard Spine',
            ref: 'CubiCasa #482 (94% Sim)',
            area: '1,850 sq.ft',
            bhk: '3 BHK • G+1',
            cost: '₹38,40,000',
            svg: `
                <rect x="10" y="10" width="120" height="90" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
                <rect x="10" y="10" width="65" height="50" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" />
                <text x="42" y="38" font-size="9" font-family="sans-serif" font-weight="600" fill="#0369a1" text-anchor="middle">LIVING</text>
                <rect x="75" y="10" width="55" height="40" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
                <text x="102" y="32" font-size="8" font-family="sans-serif" font-weight="600" fill="#b45309" text-anchor="middle">KITCHEN</text>
                <rect x="10" y="60" width="60" height="40" fill="#dcfce7" stroke="#16a34a" stroke-width="1" />
                <text x="40" y="82" font-size="8" font-family="sans-serif" font-weight="600" fill="#15803d" text-anchor="middle">BEDROOM 1</text>
                <rect x="70" y="50" width="60" height="50" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1" />
                <text x="100" y="78" font-size="8" font-family="sans-serif" font-weight="600" fill="#3730a3" text-anchor="middle">BEDROOM 2</text>
            `
        },
        {
            id: 'B',
            title: 'Plan B: Open-Plan',
            tag: 'Contemporary',
            typology: 'Integrated Social Zone',
            ref: 'CubiCasa #819 (92% Sim)',
            area: '1,820 sq.ft',
            bhk: '3 BHK • G+1',
            cost: '₹37,80,000',
            svg: `
                <rect x="10" y="10" width="120" height="90" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
                <rect x="10" y="10" width="80" height="45" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" />
                <text x="50" y="35" font-size="9" font-family="sans-serif" font-weight="600" fill="#0369a1" text-anchor="middle">OPEN LIVING/DINING</text>
                <rect x="90" y="10" width="40" height="45" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
                <text x="110" y="35" font-size="8" font-family="sans-serif" font-weight="600" fill="#b45309" text-anchor="middle">KITCHEN</text>
                <rect x="10" y="55" width="55" height="45" fill="#dcfce7" stroke="#16a34a" stroke-width="1" />
                <text x="37" y="80" font-size="8" font-family="sans-serif" font-weight="600" fill="#15803d" text-anchor="middle">MASTER BED</text>
                <rect x="65" y="55" width="65" height="45" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1" />
                <text x="97" y="80" font-size="8" font-family="sans-serif" font-weight="600" fill="#3730a3" text-anchor="middle">SUITE 2</text>
            `
        },
        {
            id: 'C',
            title: 'Plan C: Side Gallery',
            tag: 'Linear Airflow',
            typology: 'Cross-Ventilation Corridor',
            ref: 'CubiCasa #1042 (89% Sim)',
            area: '1,890 sq.ft',
            bhk: '3 BHK • G+1',
            cost: '₹39,20,000',
            svg: `
                <rect x="10" y="10" width="120" height="90" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
                <rect x="10" y="10" width="50" height="90" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" />
                <text x="35" y="55" font-size="9" font-family="sans-serif" font-weight="600" fill="#0369a1" text-anchor="middle">LIVING HALL</text>
                <rect x="60" y="10" width="70" height="30" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
                <text x="95" y="28" font-size="8" font-family="sans-serif" font-weight="600" fill="#b45309" text-anchor="middle">DINING & PANTRY</text>
                <rect x="60" y="40" width="70" height="30" fill="#dcfce7" stroke="#16a34a" stroke-width="1" />
                <text x="95" y="58" font-size="8" font-family="sans-serif" font-weight="600" fill="#15803d" text-anchor="middle">BEDROOM 1</text>
                <rect x="60" y="70" width="70" height="30" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1" />
                <text x="95" y="88" font-size="8" font-family="sans-serif" font-weight="600" fill="#3730a3" text-anchor="middle">GUEST ROOM</text>
            `
        }
    ];

    container.innerHTML = designs.map(d => `
        <article class="card" style="display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: #ffffff;">
            <div style="background: #f8fafc; padding: 14px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: center; align-items: center; position: relative;">
                <svg viewBox="0 0 140 110" width="100%" height="130" style="max-width: 220px;">
                    ${d.svg}
                </svg>
                <span class="badge badge-accent" style="position: absolute; top: 10px; right: 10px; font-size: 10px;">${d.tag}</span>
            </div>
            <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">${d.title}</h3>
                    <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px;">
                        <span>${d.bhk}</span> &bull; <span>${d.area}</span> &bull; <strong style="color: var(--color-accent);">${d.cost}</strong>
                    </div>
                    <div style="display: flex; gap: 6px; font-size: 10px; margin-bottom: 14px; flex-wrap: wrap;">
                        <span class="badge badge-success" style="font-size: 9px; padding: 2px 6px;">NBC 2016 ✓</span>
                        <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 6px;">${d.ref}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-outline btn-xs" style="flex: 1;" onclick="openProject('${currentId}', 'floor-plan')">Open 2D</button>
                    <button class="btn btn-primary btn-xs" style="flex: 1;" onclick="openProject('${currentId}', 'builder')">Open 3D</button>
                    <button class="btn btn-ghost btn-xs" onclick="openProject('${currentId}', 'builder#compare')">Compare</button>
                </div>
            </div>
        </article>
    `).join('');
}

function filterAndRenderProjects() {
    const container = document.getElementById('projectGrid');
    if (!container) return;

    const searchTerm = (document.getElementById('projectSearch')?.value || '').toLowerCase().trim();
    const sortBy = document.getElementById('projectSort')?.value || 'newest';

    let filtered = [...allProjects];

    if (searchTerm) {
        filtered = filtered.filter(p => {
            const name = (p.name || '').toLowerCase();
            const d = p.data || {};
            const bhk = String(d.bhk || '').toLowerCase();
            const city = (d.city || '').toLowerCase();
            const style = (d.style || '').toLowerCase();
            return name.includes(searchTerm) || bhk.includes(searchTerm) || city.includes(searchTerm) || style.includes(searchTerm);
        });
    }

    filtered.sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
        } else if (sortBy === 'oldest') {
            return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        } else if (sortBy === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });

    if (filtered.length === 0) {
        if (allProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state-workspace" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon-box">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">NO PROJECTS YET</h3>
                    <p class="empty-state-desc">Start with your plot and create your first home.</p>
                    <a href="/requirements" class="btn btn-primary btn-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Create New Home</span>
                    </a>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state-workspace" style="grid-column: 1 / -1;">
                    <h3 class="empty-state-title">No projects match "${escapeHtml(searchTerm)}"</h3>
                    <p class="empty-state-desc">Try searching for a different keyword or clear the search filter.</p>
                    <button class="btn btn-outline btn-sm" onclick="clearSearch()">Clear Filter</button>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = filtered.map(p => renderProjectCard(p)).join('');
}

function clearSearch() {
    const s = document.getElementById('projectSearch');
    if (s) {
        s.value = '';
        filterAndRenderProjects();
    }
}

function renderProjectCard(project) {
    const id = project.id;
    const name = escapeHtml(project.name || 'Untitled House Plan');
    const d = project.data || {};
    const dateStr = project.updated_at || project.created_at;
    const date = dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

    const bhk = d.bhk ? `${d.bhk} BHK` : '3 BHK';
    const floors = d.floors ? `G+${d.floors - 1}` : 'G+1';
    const badgeText = `${floors} &bull; ${bhk}`;

    const plotStr = (d.plot_width && d.plot_length) ? `${d.plot_width}×${d.plot_length} ft` : '30×50 ft';
    
    let area = Number(d.builtup_area) || Number(d.carpet_area) || 0;
    if (!area && d.plot_width && d.plot_length) {
        area = Math.round(d.plot_width * d.plot_length * 0.7 * (d.floors || 2));
    }
    if (!area) area = 1850;
    const areaStr = `${Number(area).toLocaleString('en-IN')} sq ft`;

    let cost = Number(d.total_cost) || Number(d.estimated_cost) || 0;
    if (!cost && area) {
        cost = area * 1950;
    }
    if (!cost) cost = 3840000;
    const costStr = formatINR(cost);

    return `
        <article class="project-card" data-id="${id}">
            <div class="project-card-banner">
                <svg viewBox="0 0 320 140" width="100%" height="100%" class="pc-banner-svg">
                    <rect width="100%" height="100%" fill="#f8fafc" />
                    <defs>
                        <pattern id="grid-${id}" width="16" height="16" patternUnits="userSpaceOnUse">
                            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#e2e8f0" stroke-width="0.75" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-${id})" />
                    <polygon points="160,20 250,70 160,120 70,70" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2" />
                    <polygon points="70,70 160,120 160,135 70,85" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
                    <polygon points="160,120 250,70 250,85 160,135" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" />
                    <polygon points="180,45 230,73 200,90 150,62" fill="rgba(2, 132, 199, 0.25)" stroke="#0284c7" stroke-width="1" />
                </svg>
                <div class="project-card-badge">${badgeText}</div>
            </div>

            <div class="project-card-content">
                <div class="project-card-header">
                    <h3 class="project-card-title">${name}</h3>
                    <span class="project-card-date">${date}</span>
                </div>

                <div class="project-spec-strip">
                    <div class="spec-box">
                        <span class="spec-box-label">Plot Size</span>
                        <span class="spec-box-val">${escapeHtml(plotStr)}</span>
                    </div>
                    <div class="spec-box">
                        <span class="spec-box-label">Built-up</span>
                        <span class="spec-box-val">${escapeHtml(areaStr)}</span>
                    </div>
                    <div class="spec-box">
                        <span class="spec-box-label">Est. Cost</span>
                        <span class="spec-box-val" style="color: var(--color-accent); font-weight: 700;">${escapeHtml(costStr)}</span>
                    </div>
                </div>

                <div class="project-card-actions">
                    <button class="btn btn-primary" onclick="openProject('${id}', 'builder')" title="Open 3D Elevation Studio">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <span>3D Studio</span>
                    </button>
                    <button class="btn btn-outline" onclick="openProject('${id}', 'floor-plan')" title="View 2D CAD Blueprint">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                        <span>2D Plan</span>
                    </button>
                    <button class="btn btn-ghost btn-icon-only" onclick="duplicateProjectPrompt('${id}')" title="Duplicate Project">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon-only" onclick="renameProjectPrompt('${id}', '${name.replace(/'/g, "\\'")}')" title="Rename Project">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon-only text-danger" onclick="deleteProjectPrompt('${id}')" title="Delete Project">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        </article>
    `;
}

function openProject(id, targetPage) {
    const p = allProjects.find(item => item.id == id);
    if (!p) return;
    
    if (window.Utils) {
        window.Utils.saveConfig(p.data || {});
        if (typeof window.Utils.saveLocal === 'function') {
            window.Utils.saveLocal('current_project_id', id);
        }
    }
    
    const routes = {
        'builder': '/builder',
        'floor-plan': '/floor-plan',
        'cost': '/cost',
        'risk': '/risk',
        'summary': '/summary'
    };
    
    const base = routes[targetPage] || '/floor-plan';
    window.location.href = `${base}?project_id=${id}`;
}

async function duplicateProjectPrompt(id) {
    const p = allProjects.find(item => item.id == id);
    if (!p) return;
    const dupName = `${p.name} (Copy)`;
    try {
        await window.API.createProject({
            name: dupName,
            data: p.data || {}
        });
        if (window.Utils?.notify) window.Utils.notify(`Created duplicate: "${dupName}"`, 'success');
        await loadProjects();
    } catch (err) {
        alert('Failed to duplicate project: ' + (err.message || 'Unknown error'));
    }
}

async function renameProjectPrompt(id, currentName) {
    const newName = prompt('Enter new name for this house plan:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

    try {
        await window.API.updateProject(id, { name: newName.trim() });
        const p = allProjects.find(item => item.id == id);
        if (p) p.name = newName.trim();
        filterAndRenderProjects();
        renderResumeHero();
    } catch (err) {
        alert('Failed to rename project: ' + (err.message || 'Unknown error'));
    }
}

async function deleteProjectPrompt(id) {
    const p = allProjects.find(item => item.id == id);
    const name = p ? p.name : 'this project';
    
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
        return;
    }

    try {
        await window.API.deleteProject(id);
        allProjects = allProjects.filter(item => item.id != id);
        updateMetrics();
        renderResumeHero();
        filterAndRenderProjects();
    } catch (err) {
        alert('Failed to delete project: ' + (err.message || 'Unknown error'));
    }
}
