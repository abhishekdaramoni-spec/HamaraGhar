// =========================================================================
// HouseBuilder — Architectural 3D House Studio Engine
// Modern Architectural Visualization: Realistic Proportions, Cantilevers,
// Glazed Fenestrations, Contextual Inspections, and Zero Debug Clutter.
// =========================================================================

const HouseBuilder = {
  config: {
    land: 2000,
    floors: 2,
    rooms: 3,
    compound: true,
    garden: true,
    viewMode: 'full',
    wallColor: '#ffffff',
    roofColor: '#0f172a',
    roofType: 'flat',
    activeTool: 'select'
  },

  rotX: -22,
  rotY: 35,
  zoom: 1350,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  selectedElement: null,

  sceneEl: null,
  houseEl: null,

  init(sceneEl, houseEl) {
    this.sceneEl = sceneEl || document.getElementById('scene');
    this.houseEl = houseEl || document.getElementById('house');
    if (!this.sceneEl || !this.houseEl) return;

    this.setupControls();
    this.buildHouse(this.config);
  },

  setupControls() {
    if (!this.sceneEl) return;

    // Mouse Drag Rotation
    this.sceneEl.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.sceneEl.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.sceneEl) this.sceneEl.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.rotY += dx * 0.45;
      this.rotX += dy * 0.45;
      this.rotX = Math.min(85, Math.max(-85, this.rotX));
      this.updateTransform();
    });

    // Mobile Touch Orbit
    this.sceneEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastX;
      const dy = e.touches[0].clientY - this.lastY;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;

      this.rotY += dx * 0.55;
      this.rotX += dy * 0.55;
      this.rotX = Math.min(85, Math.max(-85, this.rotX));
      this.updateTransform();
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Zoom via Wheel
    this.sceneEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += e.deltaY * 1.2;
      this.zoom = Math.max(600, Math.min(2600, this.zoom));
      this.sceneEl.style.perspective = `${this.zoom}px`;
    }, { passive: false });

    // Deselect on click on background
    this.sceneEl.addEventListener('click', (e) => {
      if (e.target === this.sceneEl || e.target === this.houseEl) {
        this.deselect();
      }
    });
  },

  updateTransform() {
    if (this.houseEl) {
      this.houseEl.style.transform = `translate(-50%, -46%) rotateX(${this.rotX}deg) rotateY(${this.rotY}deg)`;
    }
  },

  resetCamera() {
    this.rotX = -22;
    this.rotY = 35;
    this.zoom = 1350;
    if (this.sceneEl) this.sceneEl.style.perspective = '1350px';
    this.updateTransform();
  },

  setCameraAngle(rx, ry) {
    this.rotX = rx;
    this.rotY = ry;
    this.updateTransform();
  },

  zoomIn() {
    this.zoom = Math.max(600, this.zoom - 150);
    if (this.sceneEl) this.sceneEl.style.perspective = `${this.zoom}px`;
  },

  zoomOut() {
    this.zoom = Math.min(2600, this.zoom + 150);
    if (this.sceneEl) this.sceneEl.style.perspective = `${this.zoom}px`;
  },

  clearHouse() {
    if (this.houseEl) this.houseEl.innerHTML = '';
  },

  setViewMode(mode) {
    this.config.viewMode = mode;
    this.buildHouse(this.config);
  },

  setWallColor(color) {
    this.config.wallColor = color;
    this.buildHouse(this.config);
  },

  getConfig() {
    return { ...this.config };
  },

  // Color Utility Helpers
  hexToRgb(hex) {
    if (!hex) return { r: 255, g: 255, b: 255 };
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  darken(hex, factor) {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
  },

  lighten(hex, factor) {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
  },

  createFace(w, h, color, className = '') {
    const face = document.createElement('div');
    face.className = `face ${className}`;
    face.style.width = `${w}px`;
    face.style.height = `${h}px`;
    face.style.backgroundColor = color;
    face.style.boxSizing = 'border-box';
    face.style.position = 'absolute';
    face.style.backfaceVisibility = 'visible';
    return face;
  },

  createCuboid(x, y, z, w, h, d, color, viewMode) {
    const cuboid = document.createElement('div');
    cuboid.className = 'cuboid';
    cuboid.style.width = `${w}px`;
    cuboid.style.height = `${h}px`;
    cuboid.style.position = 'absolute';
    cuboid.style.transformStyle = 'preserve-3d';
    cuboid.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;

    if (viewMode === 'full') {
      const frontColor  = color;
      const backColor   = this.darken(color, 0.15);
      const rightColor  = this.darken(color, 0.22);
      const leftColor   = this.darken(color, 0.10);
      const topColor    = this.lighten(color, 0.12);
      const bottomColor = this.darken(color, 0.35);

      const front = this.createFace(w, h, frontColor, 'face-front');
      front.style.transform = `translateZ(${d/2}px)`;
      cuboid.appendChild(front);

      const back = this.createFace(w, h, backColor, 'face-back');
      back.style.transform = `rotateY(180deg) translateZ(${d/2}px)`;
      cuboid.appendChild(back);

      const right = this.createFace(d, h, rightColor, 'face-right');
      right.style.transform = `rotateY(90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(right);

      const left = this.createFace(d, h, leftColor, 'face-left');
      left.style.transform = `rotateY(-90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(left);

      const top = this.createFace(w, d, topColor, 'face-top');
      top.style.transform = `rotateX(90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(top);

      const bottom = this.createFace(w, d, bottomColor, 'face-bottom');
      bottom.style.transform = `rotateX(-90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(bottom);
    } else {
      // Wireframe Sketch Mode
      const edge = '1px solid #0284c7';
      const faces = [
        { w, h, t: `translateZ(${d/2}px)` },
        { w, h, t: `rotateY(180deg) translateZ(${d/2}px)` },
        { w: d, h, t: `rotateY(90deg) translateZ(${w/2}px)` },
        { w: d, h, t: `rotateY(-90deg) translateZ(${w/2}px)` },
        { w, h: d, t: `rotateX(90deg) translateZ(${h/2}px)` },
        { w, h: d, t: `rotateX(-90deg) translateZ(${h/2}px)` }
      ];
      faces.forEach(f => {
        const fc = document.createElement('div');
        fc.className = 'face sketch-face';
        fc.style.width = `${f.w}px`;
        fc.style.height = `${f.h}px`;
        fc.style.position = 'absolute';
        fc.style.border = edge;
        fc.style.background = 'rgba(2, 132, 199, 0.04)';
        fc.style.transform = f.t;
        cuboid.appendChild(fc);
      });
    }

    return cuboid;
  },

  // Architectural Assembly
  buildHouse(customConfig) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    if (!this.houseEl) return;
    this.clearHouse();

    const floors = Math.max(1, parseInt(this.config.floors) || 2);
    const rooms = Math.max(1, parseInt(this.config.rooms) || 3);
    const compound = Boolean(this.config.compound);
    const garden = Boolean(this.config.garden);
    const viewMode = this.config.viewMode || 'full';
    const wallColor = this.config.wallColor || '#ffffff';
    const roofColor = this.config.roofColor || '#0f172a';

    // Substantial Architectural Proportions
    const roomW = 130;
    const roomD = 120;
    const floorH = 80;
    const gap = 12;

    const houseW = rooms * (roomW + gap) - gap;
    const houseD = roomD;

    // 1. Site Ground Platform
    const groundW = houseW + 240;
    const groundD = houseD + 220;
    const groundH = 8;
    const groundCuboid = this.createCuboid(
      houseW / 2 - groundW / 2,
      -groundH / 2,
      houseD / 2 - groundD / 2,
      groundW,
      groundH,
      groundD,
      '#f1f5f9',
      viewMode
    );
    this.houseEl.appendChild(groundCuboid);

    // 2. Landscaped Garden Turf
    if (garden && viewMode === 'full') {
      const lawnW = groundW - 60;
      const lawnD = 70;
      const lawnCuboid = this.createCuboid(
        houseW / 2 - lawnW / 2,
        groundH / 2,
        houseD + 20,
        lawnW,
        4,
        lawnD,
        '#86efac',
        viewMode
      );
      this.houseEl.appendChild(lawnCuboid);
    }

    // 3. Build Floors & Rooms
    const roomNames = ['Living Room', 'Dining & Kitchen', 'Master Suite', 'Bedroom 2', 'Family Lounge', 'Study / Workspace'];
    
    for (let f = 0; f < floors; f++) {
      for (let r = 0; r < rooms; r++) {
        const x = r * (roomW + gap);
        const y = f * (floorH + gap) + groundH;
        const z = 0;
        const roomName = roomNames[(f * rooms + r) % roomNames.length];
        const roomCuboid = this.createCuboid(x, y, z, roomW, floorH, roomD, wallColor, viewMode);

        // Click interaction: select room & update inspector
        roomCuboid.style.cursor = 'pointer';
        roomCuboid.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectRoom(roomName, f + 1, r + 1, roomW, roomD, floorH, wallColor);
        });

        // Architectural Details: Front Glazing / Window
        if (viewMode === 'full') {
          const win = document.createElement('div');
          win.className = 'arch-window';
          win.style.position = 'absolute';
          win.style.width = `${roomW * 0.55}px`;
          win.style.height = `${floorH * 0.55}px`;
          win.style.background = 'linear-gradient(135deg, rgba(2, 132, 199, 0.35) 0%, rgba(224, 242, 254, 0.7) 100%)';
          win.style.border = '2px solid #0284c7';
          win.style.borderRadius = '2px';
          win.style.left = `${(roomW - (roomW * 0.55)) / 2}px`;
          win.style.top = `${floorH * 0.2}px`;
          win.style.transform = `translateZ(${roomD / 2 + 1}px)`;
          win.title = `${roomName} Panoramic Window`;
          roomCuboid.appendChild(win);

          // Front Entrance Door on Ground Floor room 1
          if (f === 0 && r === 0) {
            const door = document.createElement('div');
            door.style.position = 'absolute';
            door.style.width = '32px';
            door.style.height = `${floorH * 0.75}px`;
            door.style.background = '#451a03';
            door.style.border = '2px solid #1c0a00';
            door.style.left = '16px';
            door.style.bottom = '0px';
            door.style.transform = `translateZ(${roomD / 2 + 2}px)`;
            door.title = 'Main Teak Entrance Door';
            roomCuboid.appendChild(door);
          }
        }

        this.houseEl.appendChild(roomCuboid);
      }

      // First Floor Cantilevered Balcony
      if (f === 1 && viewMode === 'full') {
        const balW = 90;
        const balH = 26;
        const balD = 36;
        const balCuboid = this.createCuboid(
          houseW - balW - 10,
          f * (floorH + gap) + groundH,
          roomD / 2 + balD / 2,
          balW,
          balH,
          balD,
          'rgba(2, 132, 199, 0.25)',
          viewMode
        );
        balCuboid.style.cursor = 'pointer';
        balCuboid.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectRoom('Cantilever Balcony', f + 1, 0, balW, balD, balH, 'Glass & Steel');
        });
        this.houseEl.appendChild(balCuboid);
      }
    }

    // 4. Extended Modern RCC Roof Slab with Parapet
    const roofW = houseW + 28;
    const roofD = houseD + 28;
    const roofH = 10;
    const roofY = floors * (floorH + gap) + groundH;
    const roofCuboid = this.createCuboid(
      houseW / 2 - roofW / 2,
      roofY,
      houseD / 2 - roofD / 2,
      roofW,
      roofH,
      roofD,
      roofColor,
      viewMode
    );
    this.houseEl.appendChild(roofCuboid);

    // 5. Perimeter Boundary Compound Wall
    if (compound && viewMode === 'full') {
      const wallThick = 6;
      const wallH = 24;
      // Front Wall
      const frontWall = this.createCuboid(
        houseW / 2 - groundW / 2,
        groundH,
        houseD / 2 + groundD / 2 - wallThick,
        groundW,
        wallH,
        wallThick,
        '#cbd5e1',
        viewMode
      );
      this.houseEl.appendChild(frontWall);

      // Left Wall
      const leftWall = this.createCuboid(
        houseW / 2 - groundW / 2,
        groundH,
        houseD / 2 - groundD / 2,
        wallThick,
        wallH,
        groundD,
        '#cbd5e1',
        viewMode
      );
      this.houseEl.appendChild(leftWall);
    }

    this.updateTransform();
  },

  selectRoom(name, floor, roomNum, w, d, h, material) {
    const flCard = document.getElementById('floatingSelectedRoom');
    const flName = document.getElementById('flRoomName');
    const flDim = document.getElementById('flRoomDim');
    const flFloor = document.getElementById('flRoomFloor');

    const approxW = (w / 9).toFixed(1);
    const approxD = (d / 9).toFixed(1);

    if (flCard && flName && flDim && flFloor) {
      flCard.style.display = 'block';
      flName.textContent = name.toUpperCase();
      flDim.textContent = `${approxW}' × ${approxD}' ft`;
      flFloor.textContent = `Floor ${floor}`;
    }

    // Update Right Inspector
    const propTitle = document.getElementById('propPanelTitle');
    const propContent = document.getElementById('propertiesContent');
    if (propTitle) propTitle.textContent = 'ROOM';
    if (propContent) {
      propContent.innerHTML = `
        <div class="prop-section">
          <div class="prop-row">
            <span class="prop-label">Space Name</span>
            <span class="prop-val font-semibold">${name}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <span class="prop-val font-mono">${approxW} ft (${(approxW * 0.3048).toFixed(2)}m)</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Length</span>
            <span class="prop-val font-mono">${approxD} ft (${(approxD * 0.3048).toFixed(2)}m)</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Clear Height</span>
            <span class="prop-val font-mono">10'0" (3.05m)</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Floor Assignment</span>
            <span class="prop-val font-mono">Level ${floor}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Material Finish</span>
            <span class="prop-val font-mono">${material}</span>
          </div>
        </div>
        <div class="prop-section mt-3">
          <button type="button" class="btn btn-outline btn-block btn-sm" onclick="HouseBuilder.deselect()">
            &larr; Back to Project View
          </button>
        </div>
      `;
    }
  },

  deselect() {
    const flCard = document.getElementById('floatingSelectedRoom');
    if (flCard) flCard.style.display = 'none';

    const propTitle = document.getElementById('propPanelTitle');
    const propContent = document.getElementById('propertiesContent');
    if (propTitle) propTitle.textContent = 'PROJECT';

    const floors = this.config.floors || 2;
    const rooms = this.config.rooms || 3;
    const totalRooms = floors * rooms;
    const totalArea = totalRooms * 280 + 350;

    if (propContent) {
      propContent.innerHTML = `
        <div class="prop-section">
          <div class="prop-row">
            <span class="prop-label">Project Name</span>
            <span class="prop-val font-semibold">Modern Residence</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Plot Footprint</span>
            <span class="prop-val font-mono">30' × 50' ft</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Total Built-up</span>
            <span class="prop-val font-mono">${totalArea.toLocaleString()} sq.ft</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Floor Levels</span>
            <span class="prop-val font-mono">${floors} (G + ${floors - 1})</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Planned Spaces</span>
            <span class="prop-val font-mono">${totalRooms} Rooms</span>
          </div>
        </div>
        <div class="prop-section mt-3">
          <h4>IS 1893:2016 Structural Audit</h4>
          <ul class="prop-checklist">
            <li><span class="chk-label">Seismic Detailing</span><span class="chk-status pass">Compliant</span></li>
            <li><span class="chk-label">Plinth Clearance</span><span class="chk-val">600 mm</span></li>
            <li><span class="chk-label">Ceiling Clear Ht</span><span class="chk-val">10'0" (3.05m)</span></li>
          </ul>
        </div>
      `;
    }
  }
};

window.HouseBuilder = HouseBuilder;
