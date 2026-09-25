// API client for all backend calls
const API = {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      throw error;
    }
  },

  async get(url) { return this.request(url, { method: 'GET' }); },
  async post(url, data) { return this.request(url, { method: 'POST', body: JSON.stringify(data) }); },
  async put(url, data) { return this.request(url, { method: 'PUT', body: JSON.stringify(data) }); },
  async delete(url) { return this.request(url, { method: 'DELETE' }); },
  
  // Auth
  async login(email, password) { return this.post('/api/auth/login', {email, password}); },
  async register(name, email, password) { return this.post('/api/auth/register', {name, email, password}); },
  async logout() { return this.get('/api/auth/logout'); },
  async getMe() { return this.get('/api/auth/me'); },
  
  // Projects
  async getProjects() { return this.get('/api/projects'); },
  async createProject(nameOrPayload, data) {
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      return this.post('/api/projects', nameOrPayload);
    }
    return this.post('/api/projects', { name: nameOrPayload, data });
  },
  async updateProject(id, nameOrPayload, data) {
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      return this.put(`/api/projects/${id}`, nameOrPayload);
    }
    return this.put(`/api/projects/${id}`, { name: nameOrPayload, data });
  },
  async deleteProject(id) { return this.delete(`/api/projects/${id}`); },
  
  // Data
  async getMaterials() { return this.get('/api/data/materials'); },
  async getCostRates() { return this.get('/api/data/cost-rates'); },
  async getRisk(city) { return this.get(`/api/data/risk/${encodeURIComponent(city)}`); },
  async getLayouts() { return this.get('/api/data/layouts'); }
};
