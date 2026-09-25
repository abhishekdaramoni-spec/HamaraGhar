# HamaraGhar — Frontend Presentation Layer

The frontend is the presentation and interactive visualization layer for HamaraGhar. It is responsible for user experience, input forms, 2D technical CAD blueprint rendering, WebGL Three.js 3D rendering, exterior design selection, and design comparison.

---

## 1. Directory Structure

```
frontend/
├── src/
│   ├── components/            # Reusable UI components (CandidateSwitcher, ExteriorSelector, CompareModal)
│   ├── pages/                 # Page controllers (studio-page.js, dashboard.js, etc.)
│   ├── layouts/               # Base page layouts & HTML shells
│   ├── services/              # API client (api.js) communicating with Backend
│   ├── hooks/                 # Lifecycle and reactive subscription helpers
│   ├── state/                 # Canonical HouseModel & StudioSyncManager
│   ├── utils/                 # Unit formatters & geometry math
│   ├── 2d/                    # 2D CAD blueprint canvas renderer (floorplan-2d-renderer.js)
│   ├── 3d/                    # Three.js 3D generator & exterior façade engine (procedural-3d-generator.js)
│   └── styles/                # CSS design system (main.css, pages.css, builder.css)
│
├── public/                    # Static views, templates, images, Three.js vendor scripts
├── package.json               # Frontend package definition & dev scripts
└── README.md                  # This documentation
```

---

## 2. Architectural Principles & Isolation

1. **No Backend Execution**: The frontend never directly queries the database or runs Python ML models.
2. **Canonical Model Synchronization**: All 2D and 3D scenes are driven strictly by the canonical `HouseModel` received from the backend API.
3. **HTTP API Communication**: Communicates with the backend exclusively via documented REST endpoints (`/api/ml/hybrid-plan`, `/api/projects`, `/api/data/*`).
4. **Environment Configuration**: Set `FRONTEND_API_URL` or proxy settings to point to the backend server.

---

## 3. Running the Frontend

### Development Server
```bash
cd frontend
npm install
npm run dev
```

### Static Preview
```bash
cd frontend
npx serve public -l 3000
```
Open `http://localhost:3000` in any modern web browser.
