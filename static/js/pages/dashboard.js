// Dashboard page logic
document.addEventListener('DOMContentLoaded', async () => {
    await loadProjects();
});

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

async function loadProjects() {
    const container = document.getElementById('projectGrid');
    if (!container) return;
    
    try {
        const projects = await window.API.getProjects();
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No projects found. Create a new one!</p></div>';
            return;
        }
        
        container.innerHTML = projects.map(p => renderProjectCard(p)).join('');
        
        // Populate stats
        const statTotalProjects = document.getElementById('statTotalProjects');
        const statTotalRooms = document.getElementById('statTotalRooms');
        const statBudgetRange = document.getElementById('statBudgetRange');
        
        if (statTotalProjects) statTotalProjects.textContent = projects.length;
        if (statTotalRooms) {
            const totalRooms = projects.reduce((acc, p) => acc + (p.rooms || 0), 0);
            statTotalRooms.textContent = totalRooms || 0;
        }
        if (statBudgetRange) {
            statBudgetRange.textContent = '₹10L - ₹1Cr'; // example range
        }
        
    } catch(e) {
        container.innerHTML = '<div class="empty-state"><p>Error loading projects. Try again later.</p></div>';
    }
}

function renderProjectCard(project) {
    const name = escapeHtml(project.name || 'Untitled Project');
    const date = project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A';
    
    return `
        <article class="project-card">
            <h3>${name}</h3>
            <p>Created: ${date}</p>
            <div class="card-actions">
                <button class="btn btn-outline" onclick="openProject('${project.id}')">Open</button>
                <button class="btn btn-ghost text-danger" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </article>
    `;
}

async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await window.API.deleteProject(id);
            window.Utils.notify('Project deleted successfully', 'success');
            loadProjects();
        } catch (e) {
            window.Utils.notify('Failed to delete project', 'error');
        }
    }
}

function openProject(id) {
    window.Utils.saveLocal('current_project_id', id);
    window.location.href = '/builder';
}
