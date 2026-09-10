// =========================================================================
// HouseBuilder - 3D CSS Cuboid House Engine
// PRESERVES & ENHANCES YOUR ORIGINAL 3D HOUSE BUILDER IMPLEMENTATION
// Features: Multi-floor, multiple rooms per floor, balconies, compound wall,
//           garden, sketch & full 3D modes, roof, doors & windows, color presets,
//           dimension labels, interactive orbit drag & scroll zoom.
// =========================================================================

const HouseBuilder = {
  // State
  config: {
    land: 500,
    floors: 2,
    rooms: 3,
    compound: false,
    garden: false,
    viewMode: 'full',
    wallColor: '#90caf9',
    roofColor: '#546e7a',
    roofType: 'flat'
  },

  rotX: -20,
  rotY: 0,
  zoom: 1500,
  isDragging: false,
  lastX: 0,
  lastY: 0,

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

    // Mouse drag to rotate (PRESERVED from original implementation)
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

      this.rotY += dx * 0.5;
      this.rotX += dy * 0.5;
      this.rotX = Math.min(80, Math.max(-80, this.rotX));

      this.updateTransform();
    });

    // Touch support for mobile devices
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

      this.rotY += dx * 0.6;
      this.rotX += dy * 0.6;
      this.rotX = Math.min(80, Math.max(-80, this.rotX));

      this.updateTransform();
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Scroll wheel to zoom (changes 3D perspective distance)
    this.sceneEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += e.deltaY * 1.5;
      this.zoom = Math.max(500, Math.min(3000, this.zoom));
      this.sceneEl.style.perspective = `${this.zoom}px`;
    }, { passive: false });
  },

  updateTransform() {
    if (this.houseEl) {
      this.houseEl.style.transform = `translate(-50%, -50%) rotateX(${this.rotX}deg) rotateY(${this.rotY}deg)`;
    }
  },

  resetCamera() {
    this.rotX = -20;
    this.rotY = 0;
    this.zoom = 1500;
    if (this.sceneEl) this.sceneEl.style.perspective = '1500px';
    this.updateTransform();
  },

  zoomIn() {
    this.zoom = Math.max(500, this.zoom - 200);
    if (this.sceneEl) this.sceneEl.style.perspective = `${this.zoom}px`;
  },

  zoomOut() {
    this.zoom = Math.min(3000, this.zoom + 200);
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

  // =========================================================================
  // Color Utility Helpers (PRESERVED EXACTLY FROM YOUR ORIGINAL CODE)
  // =========================================================================
  hexToRgb(hex) {
    if (!hex) return { r: 144, g: 202, b: 249 };
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(h => h + h).join('');
    }
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

  lighten(hex, factor) {
    const c = this.hexToRgb(hex);
    const r = Math.min(255, c.r + 255 * factor);
    const g = Math.min(255, c.g + 255 * factor);
    const b = Math.min(255, c.b + 255 * factor);
    return this.rgbToHex(r, g, b);
  },

  darken(hex, factor) {
    const c = this.hexToRgb(hex);
    const r = Math.max(0, c.r - 255 * factor);
    const g = Math.max(0, c.g - 255 * factor);
    const b = Math.max(0, c.b - 255 * factor);
    return this.rgbToHex(r, g, b);
  },

  // =========================================================================
  // Face & Cuboid Generation (PRESERVED EXACTLY FROM YOUR ORIGINAL CODE)
  // =========================================================================
  createFace(w, h, bg, border) {
    const f = document.createElement('div');
    f.className = 'face';
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    f.style.background = bg;
    f.style.border = '1px solid ' + border;
    return f;
  },

  createFaceSketch(w, h, borderColor) {
    const f = document.createElement('div');
    f.className = 'face';
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    f.style.background = 'transparent';
    f.style.border = `1.5px dashed ${borderColor}`;
    return f;
  },

  createCuboid(x, y, z, w, h, d, baseColor, viewMode) {
    const cuboid = document.createElement('div');
    cuboid.className = 'cuboid';
    cuboid.style.width = w + 'px';
    cuboid.style.height = h + 'px';
    cuboid.style.transform = `translate3d(${x}px, ${-y - h/2}px, ${z}px)`;
    cuboid.style.transformStyle = 'preserve-3d';

    if (viewMode === 'full') {
      const front = this.createFace(w, h, baseColor, this.darken(baseColor, 0.3));
      front.style.transform = `translateZ(${d/2}px)`;
      cuboid.appendChild(front);

      const back = this.createFace(w, h, this.darken(baseColor, 0.8), this.darken(baseColor, 0.9));
      back.style.transform = `rotateY(180deg) translateZ(${d/2}px)`;
      cuboid.appendChild(back);

      const right = this.createFace(d, h, this.darken(baseColor, 0.5), this.darken(baseColor, 0.7));
      right.style.transform = `rotateY(90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(right);

      const left = this.createFace(d, h, this.darken(baseColor, 0.5), this.darken(baseColor, 0.7));
      left.style.transform = `rotateY(-90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(left);

      const top = this.createFace(w, d, this.lighten(baseColor, 0.3), this.darken(baseColor, 0.6));
      top.style.transform = `rotateX(90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(top);

      const bottom = this.createFace(w, d, this.darken(baseColor, 0.6), this.darken(baseColor, 0.8));
      bottom.style.transform = `rotateX(-90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(bottom);
    } else if (viewMode === 'sketch') {
      const edgeColor = '#333333';

      const front = this.createFaceSketch(w, h, edgeColor);
      front.style.transform = `translateZ(${d/2}px)`;
      cuboid.appendChild(front);

      const back = this.createFaceSketch(w, h, edgeColor);
      back.style.transform = `rotateY(180deg) translateZ(${d/2}px)`;
      cuboid.appendChild(back);

      const right = this.createFaceSketch(d, h, edgeColor);
      right.style.transform = `rotateY(90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(right);

      const left = this.createFaceSketch(d, h, edgeColor);
      left.style.transform = `rotateY(-90deg) translateZ(${w/2}px)`;
      cuboid.appendChild(left);

      const top = this.createFaceSketch(w, d, edgeColor);
      top.style.transform = `rotateX(90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(top);

      const bottom = this.createFaceSketch(w, d, edgeColor);
      bottom.style.transform = `rotateX(-90deg) translateZ(${h/2}px)`;
      cuboid.appendChild(bottom);
    }

    return cuboid;
  },

  createLabel(text) {
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = text;
    return label;
  },

  // =========================================================================
  // buildHouse() — PRESERVES ORIGINAL ARCHITECTURE WITH PRODUCTION ENHANCEMENTS
  // =========================================================================
  buildHouse(customConfig) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    if (!this.houseEl) return;

    this.clearHouse();

    const floors = parseInt(this.config.floors) || 2;
    const rooms = parseInt(this.config.rooms) || 3;
    const compound = Boolean(this.config.compound);
    const garden = Boolean(this.config.garden);
    const viewMode = this.config.viewMode || 'full';
    const wallColor = this.config.wallColor || '#90caf9';
    const roofColor = this.config.roofColor || '#546e7a';

    // Dimensions in px (PRESERVED from original geometry)
    const roomW = 80;
    const roomD = 80;
    const floorH = 50;
    const gap = 12;

    const houseW = rooms * (roomW + gap) - gap;
    const houseD = roomD;

    // Ground base (land)
    const groundW = houseW + 200;
    const groundD = houseD + 200;
    const groundH = 10;
    const groundColor = (viewMode === 'full') ? '#7c7c7c' : 'transparent';
    const groundCuboid = this.createCuboid(
      houseW / 2 - groundW / 2,
      -groundH / 2,
      houseD / 2 - groundD / 2,
      groundW,
      groundH,
      groundD,
      groundColor,
      viewMode
    );
    this.houseEl.appendChild(groundCuboid);

    const landLabel = this.createLabel(`Land / Ground\n(${groundW}×${groundH}×${groundD}px)`);
    landLabel.style.whiteSpace = 'pre';
    landLabel.style.transform = `translate3d(${houseW / 2 - groundW / 2 - 50}px, ${-groundH - 20}px, ${houseD / 2 - groundD / 2 + 10}px)`;
    this.houseEl.appendChild(landLabel);

    // Build Floors and Rooms
    for (let f = 0; f < floors; f++) {
      for (let r = 0; r < rooms; r++) {
        const x = r * (roomW + gap);
        const y = f * (floorH + gap) + groundH;
        const z = 0;
        const roomColor = wallColor;
        const roomCuboid = this.createCuboid(x, y, z, roomW, floorH, roomD, roomColor, viewMode);

        // Click interaction: Show object properties in properties panel
        roomCuboid.style.cursor = 'pointer';
        roomCuboid.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showProperties(`Floor ${f + 1} - Room ${r + 1}`, {
            width: `${roomW} px (approx ${(roomW/8).toFixed(1)} ft)`,
            length: `${roomD} px (approx ${(roomD/8).toFixed(1)} ft)`,
            height: `${floorH} px (approx ${(floorH/5).toFixed(1)} ft)`,
            color: roomColor,
            floor: f + 1,
            roomNumber: r + 1,
            material: this.config.wallMaterial || 'Brick / Block'
          });
        });

        // Architectural details: Front Door on ground floor room 1
        if (viewMode === 'full' && f === 0 && r === 0) {
          const door = document.createElement('div');
          door.style.position = 'absolute';
          door.style.width = '24px';
          door.style.height = '38px';
          door.style.background = '#4e342e';
          door.style.border = '2px solid #271406';
          door.style.borderRadius = '3px 3px 0 0';
          door.style.left = `${(roomW - 24) / 2}px`;
          door.style.bottom = '0px';
          door.style.transform = `translateZ(${roomD / 2 + 1}px)`;
          door.title = 'Main Entrance Door';
          roomCuboid.appendChild(door);
        }

        // Architectural details: Windows on front faces
        if (viewMode === 'full') {
          const win = document.createElement('div');
          win.style.position = 'absolute';
          win.style.width = '20px';
          win.style.height = '18px';
          win.style.background = '#e1f5fe';
          win.style.border = '2px solid #0288d1';
          win.style.borderRadius = '2px';
          win.style.left = (f === 0 && r === 0) ? '6px' : `${(roomW - 20) / 2}px`;
          win.style.top = '10px';
          win.style.transform = `translateZ(${roomD / 2 + 1}px)`;
          win.title = 'Window';
          roomCuboid.appendChild(win);
        }

        this.houseEl.appendChild(roomCuboid);

        // Floor label once per floor near first room
        if (r === 0) {
          const floorLabel = this.createLabel(`Floor ${f + 1}`);
          floorLabel.style.transform = `translate3d(${x + 10}px, ${-y - floorH - 15}px, ${z + 10}px)`;
          this.houseEl.appendChild(floorLabel);
        }

        // Room label with dimensions
        const roomLabel = this.createLabel(`Room\n(${roomW}×${floorH}×${roomD}px)`);
        roomLabel.style.whiteSpace = 'pre';
        roomLabel.style.transform = `translate3d(${x + 10}px, ${-y - floorH / 2}px, ${z + roomD / 2 + 20}px)`;
        this.houseEl.appendChild(roomLabel);

        // Balcony for every room (front center) (PRESERVED from original code)
        const balW = roomW * 0.9;
        const balH = floorH * 0.6;
        const balD = roomD * 0.3;
        const balX = x + (roomW - balW) / 2;
        const balY = y + floorH * 0.4;
        const balZ = z + roomD / 2 + balD / 2;
        const balColor = (viewMode === 'full') ? '#fdd835' : '#333333';
        const balconyCuboid = this.createCuboid(balX, balY, balZ, balW, balH, balD, balColor, viewMode);

        balconyCuboid.style.cursor = 'pointer';
        balconyCuboid.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showProperties(`Floor ${f + 1} - Balcony`, {
            width: `${Math.round(balW)} px`,
            length: `${Math.round(balD)} px`,
            height: `${Math.round(balH)} px`,
            feature: 'Cantilever Balcony Railing'
          });
        });

        this.houseEl.appendChild(balconyCuboid);

        const balLabel = this.createLabel(`Balcony\n(${Math.round(balW)}×${Math.round(balH)}×${Math.round(balD)}px)`);
        balLabel.style.whiteSpace = 'pre';
        balLabel.style.transform = `translate3d(${balX}px, ${-balY}px, ${balZ + balD / 2 + 10}px)`;
        this.houseEl.appendChild(balLabel);
      }
    }

    // ROOF (Top Level Cover Enhancement)
    const roofY = floors * (floorH + gap) + groundH;
    const roofW = houseW + 20;
    const roofD = houseD + 20;
    const roofH = 10;
    const roofCuboid = this.createCuboid(
      houseW / 2 - roofW / 2,
      roofY + roofH / 2,
      houseD / 2 - roofD / 2,
      roofW,
      roofH,
      roofD,
      (viewMode === 'full') ? roofColor : '#333333',
      viewMode
    );
    roofCuboid.style.cursor = 'pointer';
    roofCuboid.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showProperties('Roof Structure', {
        type: this.config.roofType || 'Flat RCC Terrace',
        width: `${roofW} px`,
        length: `${roofD} px`,
        features: 'Waterproofing membrane & parapet edge'
      });
    });
    this.houseEl.appendChild(roofCuboid);

    const roofLabel = this.createLabel(`Roof Slab\n(${roofW}×${roofH}×${roofD}px)`);
    roofLabel.style.whiteSpace = 'pre';
    roofLabel.style.transform = `translate3d(${houseW / 2 - roofW / 2}px, ${-roofY - roofH - 18}px, ${houseD / 2}px)`;
    this.houseEl.appendChild(roofLabel);

    // COMPOUND WALL (PRESERVED from original code)
    if (compound) {
      const wallThick = 15;
      const wallH = floorH * 0.6;
      const wallColorCompound = '#5d4037';

      const wallW = groundW + wallThick * 2;
      const wallD = groundD + wallThick * 2;

      // Front wall
      const frontWall = this.createCuboid(
        houseW / 2 - wallW / 2,
        wallH / 2,
        houseD / 2 - wallD / 2 - wallThick / 2,
        wallW,
        wallH,
        wallThick,
        wallColorCompound,
        viewMode
      );
      this.houseEl.appendChild(frontWall);

      // Back wall
      const backWall = this.createCuboid(
        houseW / 2 - wallW / 2,
        wallH / 2,
        houseD / 2 + wallD / 2 - wallThick / 2,
        wallW,
        wallH,
        wallThick,
        wallColorCompound,
        viewMode
      );
      this.houseEl.appendChild(backWall);

      // Left wall
      const leftWall = this.createCuboid(
        houseW / 2 - wallW / 2 - wallThick / 2,
        wallH / 2,
        houseD / 2 - wallD / 2,
        wallThick,
        wallH,
        wallD,
        wallColorCompound,
        viewMode
      );
      this.houseEl.appendChild(leftWall);

      // Right wall
      const rightWall = this.createCuboid(
        houseW / 2 + wallW / 2 - wallThick / 2,
        wallH / 2,
        houseD / 2 - wallD / 2,
        wallThick,
        wallH,
        wallD,
        wallColorCompound,
        viewMode
      );
      this.houseEl.appendChild(rightWall);

      const wallLabel = this.createLabel(`Compound Wall\n(${wallW}×${wallH}×${wallD}px)`);
      wallLabel.style.whiteSpace = 'pre';
      wallLabel.style.transform = `translate3d(${houseW / 2 - wallW / 2}px, ${-wallH - 20}px, ${houseD / 2 - wallD / 2}px)`;
      this.houseEl.appendChild(wallLabel);
    }

    // GARDENING AREA (PRESERVED from original code)
    if (garden) {
      const gardenW = houseW * 0.8;
      const gardenD = 80;
      const gardenH = 20;
      const gardenColor = '#388e3c';

      const gardenX = houseW / 2 - gardenW / 2;
      const gardenY = gardenH / 2;
      const gardenZ = houseD / 2 + gardenD / 2 + 20;
      const gardenCuboid = this.createCuboid(
        gardenX,
        gardenY,
        gardenZ,
        gardenW,
        gardenH,
        gardenD,
        gardenColor,
        viewMode
      );
      this.houseEl.appendChild(gardenCuboid);

      const gardenLabel = this.createLabel(`Gardening Area\n(${Math.round(gardenW)}×${gardenH}×${gardenD}px)`);
      gardenLabel.style.whiteSpace = 'pre';
      gardenLabel.style.transform = `translate3d(${gardenX}px, ${-gardenY - 20}px, ${gardenZ + gardenD / 2 + 10}px)`;
      this.houseEl.appendChild(gardenLabel);
    }

    this.updateTransform();
  },

  showProperties(title, details) {
    const container = document.getElementById('propertiesContent');
    if (!container) return;

    let html = `<h4 style="margin: 0 0 10px 0; color: var(--color-primary);">${title}</h4><ul style="list-style: none; padding: 0; margin: 0; font-size: 13px;">`;
    for (const [key, value] of Object.entries(details)) {
      html += `<li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-gray-200);">
        <strong style="text-transform: capitalize; color: var(--color-gray-600);">${key}:</strong>
        <span>${value}</span>
      </li>`;
    }
    html += '</ul>';
    container.innerHTML = html;
  }
};

window.HouseBuilder = HouseBuilder;
