// HamaraGhar — Dashboard Workspace Logic
let allProjects = [];

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
    setupEventListeners();
    await loadProjects();
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
        updateStats();
        renderResumeHero();
        filterAndRenderProjects();
    } catch(e) {
        console.error('Error loading projects:', e);
        container.innerHTML = `
            <div class="empty-state-workspace">
                <h3 class="empty-state-title" style="color: var(--color-danger);">Unable to load projects</h3>
                <p class="empty-state-desc">There was a problem connecting to your workspace. Please refresh or try again.</p>
                <button class="btn btn-outline btn-sm" onclick="loadProjects()">Retry</button>
            </div>
        `;
    }
}

function updateStats() {
    const statTotalProjects = document.getElementById('statTotalProjects');
    const statTotalArea = document.getElementById('statTotalArea');
    const statTotalBudget = document.getElementById('statTotalBudget');

    if (statTotalProjects) statTotalProjects.textContent = allProjects.length;

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
            cost = area * 1800; // standard CPWD baseline
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
    if (!heroContainer) return;

    if (!allProjects || allProjects.length === 0) {
        heroContainer.innerHTML = '';
        return;
    }

    // Latest modified project is first after sorting by updated_at or created_at
    const sorted = [...allProjects].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
    });

    const latest = sorted[0];
    const d = latest.data || {};
    const name = escapeHtml(latest.name || 'Untitled House Plan');
    const bhk = d.bhk ? `${d.bhk} BHK` : 'Custom';
    const floors = d.floors ? `${d.floors} Floor${d.floors > 1 ? 's' : ''}` : '1 Floor';
    const plot = (d.plot_width && d.plot_length) ? `${d.plot_width} × ${d.plot_length} ft` : 'Standard Plot';
    const cost = Number(d.total_cost) || Number(d.estimated_cost) || (d.plot_width && d.plot_length ? Math.round(d.plot_width * d.plot_length * 0.7 * (d.floors || 1) * 1800) : 3500000);

    heroContainer.innerHTML = `
        <div class="resume-hero-card">
            <div class="resume-hero-body">
                <div class="resume-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <span>Active House Plan</span>
                </div>
                <h2 class="resume-title">${name}</h2>
                <div class="resume-specs">
                    <span class="resume-spec-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        ${bhk} (${floors})
                    </span>
                    <span>&bull;</span>
                    <span class="resume-spec-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                        ${plot}
                    </span>
                    <span>&bull;</span>
                    <span class="resume-spec-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        Est. ${formatINR(cost)}
                    </span>
                </div>
            </div>
            <div class="resume-hero-actions">
                <button class="btn btn-primary" onclick="openProject('${latest.id}', 'builder')">
                    <span>Open 3D Studio</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <div class="resume-subactions">
                    <a href="javascript:void(0)" onclick="openProject('${latest.id}', 'floor-plan')">2D Plan</a>
                    <a href="javascript:void(0)" onclick="openProject('${latest.id}', 'cost')">Cost BOQ</a>
                    <a href="javascript:void(0)" onclick="openProject('${latest.id}', 'risk')">Risk Audit</a>
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
                <div class="empty-state-workspace">
                    <div class="empty-state-icon-box">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No house projects yet</h3>
                    <p class="empty-state-desc">Define your plot dimensions, room requirements, and architectural preferences to generate your custom 2D CAD blueprint and 3D model.</p>
                    <a href="/requirements" class="btn btn-primary btn-lg">
                        <span>Start First Project</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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

    const bhk = d.bhk ? `${d.bhk} BHK` : 'Custom';
    const floors = d.floors ? `G+${d.floors - 1}` : 'G';
    const badgeText = `${floors} • ${bhk}`;

    const plotStr = (d.plot_width && d.plot_length) ? `${d.plot_width}×${d.plot_length} ft` : '40×50 ft';
    
    let area = Number(d.builtup_area) || Number(d.carpet_area) || 0;
    if (!area && d.plot_width && d.plot_length) {
        area = Math.round(d.plot_width * d.plot_length * 0.7 * (d.floors || 1));
    }
    const areaStr = area ? `${area.toLocaleString('en-IN')} sq ft` : '1,800 sq ft';

    let cost = Number(d.total_cost) || Number(d.estimated_cost) || 0;
    if (!cost && area) {
        cost = area * 1800;
    }
    const costStr = cost ? formatINR(cost) : '₹32.4 L';

    return `
        <article class="project-card" data-id="${id}">
            <div class="project-card-banner">
                <div class="banner-blueprint-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </div>
                <div class="project-card-badge">${escapeHtml(badgeText)}</div>
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
                        <span class="spec-box-val" style="color: var(--color-accent);">${escapeHtml(costStr)}</span>
                    </div>
                </div>

                <div class="project-card-actions">
                    <button class="btn btn-primary" onclick="openProject('${id}', 'builder')" title="Open 3D Elevation Studio">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <span>3D Studio</span>
                    </button>
                    <button class="btn btn-outline" onclick="openProject('${id}', 'floor-plan')" title="View 2D Blueprint">
                        <span>2D CAD</span>
                    </button>
                    <button class="btn-icon-only" onclick="renameProject('${id}', '${escapeHtml(project.name || '')}')" title="Rename Plan">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon-only btn-delete" onclick="deleteProject('${id}')" title="Delete Plan">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    `;
}

function openProject(id, page = 'builder') {
    if (window.Utils && typeof window.Utils.saveLocal === 'function') {
        window.Utils.saveLocal('current_project_id', id);
    } else {
        localStorage.setItem('current_project_id', id);
    }
    
    // Also fetch project data into localStorage so other pages have immediate access
    const project = allProjects.find(p => String(p.id) === String(id));
    if (project && project.data) {
        if (window.Utils && typeof window.Utils.saveLocal === 'function') {
            window.Utils.saveLocal('house_data', project.data);
            window.Utils.saveLocal('current_project_name', project.name);
        } else {
            localStorage.setItem('house_data', JSON.stringify(project.data));
            localStorage.setItem('current_project_name', project.name);
        }
    }

    const routeMap = {
        'builder': '/builder',
        'floor-plan': '/floor-plan',
        'cost': '/cost',
        'risk': '/risk',
        'summary': '/summary'
    };
    window.location.href = routeMap[page] || '/builder';
}

async function renameProject(id, currentName) {
    const newName = prompt('Enter a new name for your house project:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

    try {
        const project = allProjects.find(p => String(p.id) === String(id));
        const data = project ? project.data : {};
        await window.API.updateProject(id, { name: newName.trim(), data: data });
        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('Project renamed successfully', 'success');
        }
        await loadProjects();
    } catch(e) {
        console.error('Rename failed:', e);
        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('Failed to rename project', 'error');
        } else {
            alert('Failed to rename project.');
        }
    }
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to permanently delete this house project? This action cannot be undone.')) {
        return;
    }
    try {
        await window.API.deleteProject(id);
        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('Project deleted successfully', 'success');
        }
        await loadProjects();
    } catch (e) {
        console.error('Delete failed:', e);
        if (window.Utils && typeof window.Utils.notify === 'function') {
            window.Utils.notify('Failed to delete project', 'error');
        } else {
            alert('Failed to delete project.');
        }
    }
}
