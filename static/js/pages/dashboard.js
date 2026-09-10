// Dashboard page logic
document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
});

async function loadProjects() {
  const container = document.getElementById('projects-container');
  if (!container) return;
  try {
      const projects = await window.API.getProjects();
      if (!projects || projects.length === 0) {
          container.innerHTML = '<p>No projects found. Create a new one!</p>';
          return;
      }
      container.innerHTML = projects.map(p => renderProjectCard(p)).join('');
  } catch(e) {
      container.innerHTML = '<p>Error loading projects. Try again later.</p>';
  }
}

function renderProjectCard(project) {
  return `
      <div class="project-card">
          <h3>${project.name || 'Untitled Project'}</h3>
          <p>Created: ${new Date(project.createdAt).toLocaleDateString()}</p>
          <button onclick="openProject('${project.id}')">Open</button>
          <button onclick="deleteProject('${project.id}')" style="background:#f44336;color:white;">Delete</button>
      </div>
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
  window.location.href = '/builder.html'; // Assuming this route
}
