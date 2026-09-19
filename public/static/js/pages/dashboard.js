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
    const statTotalArea = document.getElementById('statTotalArea');
    const statTotalBudget = document.getElementById('statTotalBudget');

    if (statTotalProjects) {
        statTotalProjects.textContent = allProjects.length;
    }

    let totalArea = 0;
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
        totalArea += area;

        let cost = Number(d.total_cost) || Number(d.estimated_cost) || Number(d.budget) || 0;
        if (!cost && area) {
            cost = area * 1950;
        }
        totalBudget += cost;
    });

    if (statTotalArea) {
        statTotalArea.textContent = `${totalArea.toLocaleString('en-IN')} sq ft`;
    }
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
            <div class="dhp-canvas-wrapper">
                <div class="dhp-grid-lines"></div>
                
                <div class="dhp-iso-model">
                    <svg viewBox="0 0 540 320" width="100%" height="100%" class="dhp-iso-svg">
                        <defs>
                            <linearGradient id="wallSun" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#ffffff" />
                                <stop offset="100%" stop-color="#f1f5f9" />
                            </linearGradient>
                            <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#e2e8f0" />
                                <stop offset="100%" stop-color="#cbd5e1" />
                            </linearGradient>
                            <linearGradient id="accentTerracotta" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stop-color="#c2410c" />
                                <stop offset="100%" stop-color="#9a3412" />
                            </linearGradient>
                            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stop-color="rgba(2, 132, 199, 0.4)" />
                                <stop offset="100%" stop-color="rgba(224, 242, 254, 0.7)" />
                            </linearGradient>
                        </defs>
                        <polygon points="270,40 500,160 270,280 40,160" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
                        <polygon points="240,80 440,180 280,260 80,160" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1" />
                        <polygon points="360,140 480,200 400,245 280,185" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1" />
                        
                        <polygon points="170,180 270,230 270,160 170,110" fill="url(#wallShade)" stroke="#94a3b8" stroke-width="1" />
                        <polygon points="270,230 390,170 390,100 270,160" fill="url(#wallSun)" stroke="#94a3b8" stroke-width="1" />
                        <polygon points="285,215 375,170 375,120 285,165" fill="url(#glassGrad)" stroke="#0284c7" stroke-width="1.2" />
                        <polygon points="180,170 210,185 210,125 180,110" fill="url(#accentTerracotta)" stroke="#7c2d12" stroke-width="1" />

                        <polygon points="190,115 290,165 290,95 190,45" fill="#334155" stroke="#1e293b" stroke-width="1" />
                        <polygon points="290,165 370,125 370,55 290,95" fill="url(#wallSun)" stroke="#94a3b8" stroke-width="1" />
                        <polygon points="205,105 275,140 275,70 205,35" fill="url(#glassGrad)" stroke="#0284c7" stroke-width="1.2" />
                        <polygon points="290,165 330,145 330,125 290,145" fill="rgba(2, 132, 199, 0.3)" stroke="#0284c7" stroke-width="1.2" />

                        <polygon points="280,30 385,82 285,135 180,82" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
                    </svg>
                </div>

                <div class="dhp-floating-card top-left">
                    <div class="dhp-card-inner">
                        <div class="progress-ring-box">
                            <svg width="34" height="34" viewBox="0 0 36 36" class="ring-svg">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" stroke-width="3"></circle>
                                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-accent)" stroke-width="3" 
                                    stroke-dasharray="88" stroke-dashoffset="${88 - (88 * progress / 100)}" stroke-linecap="round"></circle>
                            </svg>
                            <span class="ring-text">${progress}%</span>
                        </div>
                        <div class="dhp-card-text">
                            <span class="dhp-label">PROJECT PROGRESS</span>
                            <span class="dhp-val">${progress}% Completed</span>
                        </div>
                    </div>
                </div>

                <div class="dhp-floating-card top-right">
                    <div class="dhp-card-inner">
                        <div class="dhp-icon-badge">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <div class="dhp-card-text">
                            <span class="dhp-label">ESTIMATED COST</span>
                            <span class="dhp-val text-accent">${formatINR(cost)}</span>
                        </div>
                    </div>
                </div>

                <div class="dhp-floating-card bottom-left">
                    <div class="dhp-card-inner">
                        <div class="dhp-icon-badge">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path></svg>
                        </div>
                        <div class="dhp-card-text">
                            <span class="dhp-label">BUILT-UP AREA</span>
                            <span class="dhp-val">${Number(area).toLocaleString('en-IN')} sq.ft &bull; ${floors} &bull; ${bhk}</span>
                        </div>
                    </div>
                </div>

                <div class="dhp-floating-nav bottom-right">
                    <span class="dhp-nav-label">PROJECT OVERVIEW</span>
                    <div class="dhp-nav-buttons">
                        <button class="dhp-nav-btn" onclick="openProject('${currentProject.id}', 'floor-plan')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="12" x2="21" y2="12"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                            <span>Floor Plan</span>
                        </button>
                        <button class="dhp-nav-btn primary" onclick="openProject('${currentProject.id}', 'builder')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            <span>3D View</span>
                        </button>
                        <button class="dhp-nav-btn" onclick="openProject('${currentProject.id}', 'cost')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            <span>Cost</span>
                        </button>
                        <button class="dhp-nav-btn" onclick="openProject('${currentProject.id}', 'risk')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            <span>Risk</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
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
                    <button class="btn btn-ghost btn-icon-only" onclick="renameProjectPrompt('${id}', '${name.replace(/'/g, "\\'")}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon-only text-danger" onclick="deleteProjectPrompt('${id}')">
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
    }
    
    const routes = {
        'builder': '/builder',
        'floor-plan': '/floor-plan',
        'cost': '/cost',
        'risk': '/risk',
        'summary': '/summary'
    };
    
    const url = routes[targetPage] || '/builder';
    window.location.href = url;
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
