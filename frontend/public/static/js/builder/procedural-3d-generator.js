// =========================================================================
// HamaraGhar — Procedural Three.js 3D Architectural House Generator
// Commercial-Grade Real-Time Architectural Studio Engine
// Renders the Canonical HouseModel with physically based PBR materials,
// procedural textures, realistic architectural scale and proportions,
// authentic doors, windows, stairs, balconies, roof parapets, modular
// designer furniture, architectural landscaping, and studio lighting.
// =========================================================================

// =========================================================================
// 1. PROCEDURAL PBR TEXTURE FACTORY
// Generates seamless architectural textures dynamically via HTML5 Canvas
// Zero external network dependencies, instant load, crisp procedural detail
// =========================================================================
class ProceduralTextureFactory {
    constructor() {
        this.cache = new Map();
    }

    _getOrCreate(key, generatorFn) {
        if (this.cache.has(key)) return this.cache.get(key);
        if (typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            generatorFn(canvas);
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            this.cache.set(key, texture);
            return texture;
        } catch (e) {
            console.warn('Canvas texture creation error for:', key, e);
            return null;
        }
    }

    getPlasterTexture(baseHex = '#f8fafc') {
        const key = `plaster_${baseHex}`;
        return this._getOrCreate(key, (canvas) => {
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = baseHex;
            ctx.fillRect(0, 0, 256, 256);

            const imgData = ctx.getImageData(0, 0, 256, 256);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 14;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
                data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
            }
            ctx.putImageData(imgData, 0, 0);
        });
    }

    getWoodTexture(baseHex = '#78350f', plankCount = 8) {
        const key = `wood_${baseHex}_${plankCount}`;
        return this._getOrCreate(key, (canvas) => {
            canvas.width = 512; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = baseHex;
            ctx.fillRect(0, 0, 512, 256);

            const plankH = 256 / plankCount;
            for (let y = 0; y < 256; y += plankH) {
                // Subtle plank shade variation
                ctx.fillStyle = (Math.random() > 0.5) ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
                ctx.fillRect(0, y, 512, plankH);

                // Plank seam
                ctx.strokeStyle = 'rgba(20, 10, 5, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, y); ctx.lineTo(512, y);
                ctx.stroke();

                // Wood grain lines
                ctx.strokeStyle = 'rgba(40, 20, 10, 0.12)';
                ctx.lineWidth = 1;
                for (let k = 0; k < 6; k++) {
                    const gy = y + Math.random() * plankH;
                    ctx.beginPath();
                    ctx.moveTo(0, gy);
                    ctx.bezierCurveTo(150, gy + (Math.random() - 0.5) * 6, 350, gy + (Math.random() - 0.5) * 6, 512, gy);
                    ctx.stroke();
                }
            }
        });
    }

    getTravertineTexture() {
        return this._getOrCreate('travertine', (canvas) => {
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f1ebe1'; // Warm Italian ivory travertine
            ctx.fillRect(0, 0, 512, 512);

            // Horizontal sediment veins
            for (let i = 0; i < 40; i++) {
                const y = Math.random() * 512;
                const h = 4 + Math.random() * 16;
                const alpha = 0.03 + Math.random() * 0.07;
                ctx.fillStyle = `rgba(180, 160, 140, ${alpha})`;
                ctx.fillRect(0, y, 512, h);
            }
            // Micro mineral pores
            ctx.fillStyle = 'rgba(140, 120, 100, 0.08)';
            for (let p = 0; p < 90; p++) {
                const px = Math.random() * 512;
                const py = Math.random() * 512;
                ctx.fillRect(px, py, 6 + Math.random() * 12, 2 + Math.random() * 3);
            }
        });
    }

    getConcreteTexture() {
        return this._getOrCreate('concrete', (canvas) => {
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#cbd5e1'; // Architectural board-formed gray
            ctx.fillRect(0, 0, 512, 512);

            // Horizontal formwork seams
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
            ctx.lineWidth = 2;
            for (let y = 0; y <= 512; y += 128) {
                ctx.beginPath();
                ctx.moveTo(0, y); ctx.lineTo(512, y);
                ctx.stroke();

                if (y < 512) {
                    for (let x = 64; x < 512; x += 128) {
                        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
                        ctx.beginPath();
                        ctx.arc(x, y + 64, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            const imgData = ctx.getImageData(0, 0, 512, 512);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const n = (Math.random() - 0.5) * 12;
                data[i] += n; data[i+1] += n; data[i+2] += n;
            }
            ctx.putImageData(imgData, 0, 0);
        });
    }

    getJaliTexture() {
        return this._getOrCreate('jali_terracotta', (canvas) => {
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#c2410c'; // Terracotta clay
            ctx.fillRect(0, 0, 256, 256);

            ctx.fillStyle = '#1e0c05'; // Lattice void
            const cellSize = 32;
            for (let x = 4; x < 256; x += cellSize) {
                for (let y = 4; y < 256; y += cellSize) {
                    ctx.fillRect(x, y, 24, 24);
                    // Lattice cross
                    ctx.fillStyle = '#c2410c';
                    ctx.fillRect(x + 10, y + 2, 4, 20);
                    ctx.fillRect(x + 2, y + 10, 20, 4);
                    ctx.fillStyle = '#1e0c05';
                }
            }
        });
    }

    getMarbleTileTexture() {
        return this._getOrCreate('marble_tile', (canvas) => {
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f8fafc'; // White marble base
            ctx.fillRect(0, 0, 512, 512);

            // Subtle veins
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * 512, 0);
                ctx.bezierCurveTo(Math.random() * 512, 180, Math.random() * 512, 340, Math.random() * 512, 512);
                ctx.stroke();
            }
            // 2x2 large format tiles
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 256, 256);
            ctx.strokeRect(256, 0, 256, 256);
            ctx.strokeRect(0, 256, 256, 256);
            ctx.strokeRect(256, 256, 256, 256);
        });
    }

    getPaverTexture() {
        return this._getOrCreate('stone_paver', (canvas) => {
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#475569'; // Slate driveway paver
            ctx.fillRect(0, 0, 512, 512);

            const paverW = 128;
            const paverH = 64;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 3;

            for (let row = 0; row < 512 / paverH; row++) {
                const y = row * paverH;
                const offset = (row % 2 === 0) ? 0 : paverW / 2;
                ctx.beginPath();
                ctx.moveTo(0, y); ctx.lineTo(512, y);
                ctx.stroke();

                for (let x = -offset; x <= 512; x += paverW) {
                    ctx.beginPath();
                    ctx.moveTo(x, y); ctx.lineTo(x, y + paverH);
                    ctx.stroke();
                }
            }
        });
    }

    getLawnTexture() {
        return this._getOrCreate('lawn_grass', (canvas) => {
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#1e3a1f'; // Deep rich manicured lawn
            ctx.fillRect(0, 0, 256, 256);

            for (let i = 0; i < 500; i++) {
                const gx = Math.random() * 256;
                const gy = Math.random() * 256;
                const gColor = ['#15803d', '#166534', '#14532d', '#22c55e'][Math.floor(Math.random() * 4)];
                ctx.fillStyle = gColor;
                ctx.fillRect(gx, gy, 2, 4);
            }
        });
    }
}

const textureFactory = new ProceduralTextureFactory();

// =========================================================================
// 2. MAIN PROCEDURAL 3D ARCHITECTURAL GENERATOR
// =========================================================================
export class Procedural3DGenerator {
    constructor(container, options = {}) {
        this.container = container;
        this.model = null;
        this.activeFloorIndex = 0;
        this.selectedRoomId = null;
        this.renderingMode = 'interior'; // 'exterior', 'interior' (dollhouse cutaway), 'construction', 'exploded'

        // Architectural Visibility Toggles
        this.visibility = {
            walls: true,
            furniture: true,
            roof: false,
            dimensions: true,
            labels: true,
            site: true
        };
        this.debugMode = options.debugMode || false;

        // Three.js Core Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Architectural Scene Groups
        this.houseGroup = new THREE.Group();
        this.siteGroup = new THREE.Group();
        this.interiorLightingGroup = new THREE.Group();
        this.floorGroups = [];
        this.roomMeshes = new Map(); // roomId -> mesh

        // Animation / Frame loop
        this.animId = null;

        // Material Palette Cache
        this.materials = {};

        // Callbacks
        this.onRoomSelected = options.onRoomSelected || null;

        this._initThree();
        this._setupRaycasting();
    }

    _initThree() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a); // Deep architectural slate studio
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.007);

        // Camera (42 deg FOV for realistic architectural perspective)
        this.camera = new THREE.PerspectiveCamera(42, width / height, 0.4, 1200);
        this.camera.position.set(24, 28, 38);

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;

        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.06;
            this.controls.maxPolarAngle = Math.PI / 2.02; // Prevent going underground
            this.controls.minDistance = 4;
            this.controls.maxDistance = 160;
            this.controls.target.set(0, 2, 0);
        }

        // Lighting System
        this._setupLighting();

        // Add Root Groups
        this.scene.add(this.siteGroup);
        this.scene.add(this.houseGroup);
        this.scene.add(this.interiorLightingGroup);

        // Resize Listener
        window.addEventListener('resize', () => this._onResize());

        // Start Loop
        this._animate();
    }

    _setupLighting() {
        // Clear lights
        const lightsToRemove = [];
        this.scene.children.forEach(c => {
            if (c.isLight && c !== this.sunLight && c !== this.hemiLight && c !== this.bounceLight) {
                // Keep managed lights
            }
        });

        // 1. Hemisphere Sky Ambient (soft blue sky + warm earth bounce)
        this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.68);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);

        // 2. Primary Architectural Sun Key Light (Warm 45-degree angle sun)
        this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
        this.sunLight.position.set(32, 48, 28);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 140;
        this.sunLight.shadow.camera.left = -32;
        this.sunLight.shadow.camera.right = 32;
        this.sunLight.shadow.camera.top = 32;
        this.sunLight.shadow.camera.bottom = -32;
        this.sunLight.shadow.bias = -0.0001;
        this.sunLight.shadow.normalBias = 0.035;
        this.scene.add(this.sunLight);

        // 3. Gentle Architectural Fill Bounce Light (soft fill for shadow contrast)
        this.bounceLight = new THREE.DirectionalLight(0x93c5fd, 0.25);
        this.bounceLight.position.set(-25, 20, -25);
        this.scene.add(this.bounceLight);
    }

    _initMaterials() {
        const ext = this.model?.exterior || {};
        const styleKey = ext.styleKey || 'modern';
        const facadeHex = ext.facadeColor || '#f8fafc';

        // 1. Exterior Wall Material based on Active Style
        let extMap = textureFactory.getPlasterTexture(facadeHex);
        let extRough = 0.82;
        let extMetal = 0.05;

        if (styleKey === 'luxury') {
            extMap = textureFactory.getTravertineTexture();
            extRough = 0.55;
        } else if (styleKey === 'contemporary') {
            extMap = textureFactory.getConcreteTexture();
            extRough = 0.75;
        }

        const extWallMat = new THREE.MeshStandardMaterial({
            map: extMap,
            roughness: extRough,
            metalness: extMetal
        });
        if (extMap) extMap.repeat.set(3, 2);

        // 2. Interior Wall Material (Soft warm white architectural plaster)
        const intPlasterMap = textureFactory.getPlasterTexture('#f8fafc');
        const intWallMat = new THREE.MeshStandardMaterial({
            map: intPlasterMap,
            color: 0xf8fafc,
            roughness: 0.88,
            metalness: 0.02
        });
        if (intPlasterMap) intPlasterMap.repeat.set(2, 2);

        // 3. Structural Slab Material
        const slabMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.85,
            metalness: 0.1
        });

        // 4. Parapet Coping Trim Material
        const copingMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.6,
            metalness: 0.1
        });

        // 5. High-Fidelity Architectural Glass (Physically based)
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xebf8ff,
            transmission: 0.92,
            opacity: 0.35,
            transparent: true,
            roughness: 0.05,
            metalness: 0.05,
            ior: 1.52,
            reflectivity: 0.95
        });

        // 6. Smoked Glass for Luxury Balconies
        const smokedGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x0f172a,
            transmission: 0.65,
            opacity: 0.55,
            transparent: true,
            roughness: 0.08,
            metalness: 0.1,
            ior: 1.52
        });

        // 7. Metal Window/Door Frames (Anodized Dark Aluminum)
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.72,
            roughness: 0.28
        });

        // 8. Hardware Handles (Brushed Stainless Steel)
        const hardwareMat = new THREE.MeshStandardMaterial({
            color: 0xd4d4d8,
            metalness: 0.88,
            roughness: 0.2
        });

        // 9. Warm Wood Texture for Doors, Stairs, and Battens
        const woodMap = textureFactory.getWoodTexture('#78350f', 8);
        const woodMat = new THREE.MeshStandardMaterial({
            map: woodMap,
            roughness: 0.42,
            metalness: 0.05
        });
        if (woodMap) woodMap.repeat.set(1, 2);

        // 10. Floor Finishes
        const parquetMap = textureFactory.getWoodTexture('#92400e', 12);
        const parquetMat = new THREE.MeshStandardMaterial({ map: parquetMap, roughness: 0.38, metalness: 0.05 });
        if (parquetMap) parquetMap.repeat.set(4, 4);

        const marbleMap = textureFactory.getMarbleTileTexture();
        const marbleMat = new THREE.MeshStandardMaterial({ map: marbleMap, roughness: 0.18, metalness: 0.12 });
        if (marbleMap) marbleMap.repeat.set(3, 3);

        const paverMap = textureFactory.getPaverTexture();
        const paverMat = new THREE.MeshStandardMaterial({ map: paverMap, roughness: 0.82 });
        if (paverMap) paverMap.repeat.set(5, 5);

        const tileMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.05 });

        // 11. Lawn Grass
        const lawnMap = textureFactory.getLawnTexture();
        const lawnMat = new THREE.MeshStandardMaterial({ map: lawnMap, roughness: 0.95 });
        if (lawnMap) lawnMap.repeat.set(8, 8);

        // 12. Terracotta Jali Material
        const jaliMap = textureFactory.getJaliTexture();
        const jaliMat = new THREE.MeshStandardMaterial({ map: jaliMap, roughness: 0.85 });
        if (jaliMap) jaliMap.repeat.set(4, 2);

        // 13. Champagne Bronze Accent Fins
        const bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xc49b71,
            metalness: 0.82,
            roughness: 0.25
        });

        this.materials = {
            extWallMat,
            intWallMat,
            slabMat,
            copingMat,
            glassMat,
            smokedGlassMat,
            frameMat,
            hardwareMat,
            woodMat,
            parquetMat,
            marbleMat,
            paverMat,
            tileMat,
            lawnMat,
            jaliMat,
            bronzeMat
        };
    }

    _setupRaycasting() {
        this.renderer.domElement.addEventListener('click', (e) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const clickable = Array.from(this.roomMeshes.values());
            const intersects = this.raycaster.intersectObjects(clickable, true);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && !obj.userData?.roomId && obj.parent) {
                    obj = obj.parent;
                }
                if (obj && obj.userData?.roomId) {
                    const rId = obj.userData.roomId;
                    this.setSelectedRoom(rId);
                    if (this.onRoomSelected) {
                        this.onRoomSelected(rId, obj.userData.roomData);
                    }
                }
            }
        });
    }

    _onResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    _animate() {
        this.animId = requestAnimationFrame(() => this._animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // =========================================================================
    // MODEL INGESTION & PROCEDURAL GENERATION
    // =========================================================================

    setModel(model, floorIndex = 0) {
        this.model = model;
        this.activeFloorIndex = floorIndex;
        this.build();
    }

    setFloor(floorIndex) {
        this.activeFloorIndex = floorIndex;
        this._updateFloorVisibility();
    }

    setRenderingMode(mode) {
        this.renderingMode = mode; // 'exterior', 'interior', 'construction', 'exploded'
        this.build();
    }

    toggleVisibility(key, val) {
        if (this.visibility.hasOwnProperty(key)) {
            this.visibility[key] = (val !== undefined) ? val : !this.visibility[key];
            this._applyVisibility();
        }
    }

    setSelectedRoom(roomId) {
        this.selectedRoomId = roomId;
        this._highlightSelectedRoom();
    }

    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        this.build();
    }

    build() {
        if (!this.model) return;

        // Re-initialize materials based on active exterior style & palette
        this._initMaterials();

        // Clear existing scene groups
        while (this.siteGroup.children.length > 0) {
            this.siteGroup.remove(this.siteGroup.children[0]);
        }
        while (this.houseGroup.children.length > 0) {
            this.houseGroup.remove(this.houseGroup.children[0]);
        }
        while (this.interiorLightingGroup.children.length > 0) {
            this.interiorLightingGroup.remove(this.interiorLightingGroup.children[0]);
        }
        this.floorGroups = [];
        this.roomMeshes.clear();

        const S = 0.3048; // Architectural scale: 1 foot = 0.3048 meters
        const plotW = (this.model.plot?.width || 40.0) * S;
        const plotL = (this.model.plot?.length || 50.0) * S;
        const centerX = plotW / 2;
        const centerZ = plotL / 2;

        // 1. Build Site / Plot Landscaping
        this._buildSite(plotW, plotL, S);

        // 2. Build Each Floor
        (this.model.floors || []).forEach((floor, idx) => {
            const flGroup = new THREE.Group();
            flGroup.name = `floor-${idx}`;

            let elevY = (floor.elevationFt || 0) * S;
            if (this.renderingMode === 'exploded') {
                elevY += idx * 6.5; // Exploded vertical separation (~20ft)
            }
            flGroup.position.set(-centerX, elevY, -centerZ);

            // Floor Slabs
            this._buildFloorSlabs(flGroup, floor, S);

            // Structural Walls
            this._buildWalls(flGroup, floor, S);

            // Doors
            this._buildDoors(flGroup, floor, S);

            // Windows
            this._buildWindows(flGroup, floor, S);

            // Stairs
            this._buildStairs(flGroup, floor, S);

            // Balconies
            this._buildBalconies(flGroup, floor, S);

            // Modular Furniture
            this._buildFurniture(flGroup, floor, S);

            // Roof & Parapets
            if (this.visibility.roof || this.renderingMode === 'exterior') {
                this._buildRoof(flGroup, floor, S);
            }

            // Exterior Façade Design Elements
            this._buildExteriorFaçadeDecorations(flGroup, floor, S);

            // Visual Geometry Overlap Collisions Debugger
            if (this.debugMode) {
                this._buildDebugOverlaps(flGroup, floor, S);
            }

            this.houseGroup.add(flGroup);
            this.floorGroups.push(flGroup);
        });

        // 3. Interior Warm Lighting (Recessed Downlights for Cozy Architectural Ambiance)
        if (this.renderingMode === 'interior') {
            this._buildInteriorLighting(S, centerX, centerZ);
        }

        // 4. Center camera focus with automatic bounding box framing (65-80% viewport fill)
        this._frameCameraOnHouse();

        this._applyVisibility();
        this._updateFloorVisibility();
        this._highlightSelectedRoom();
    }

    _frameCameraOnHouse() {
        if (!this.controls || !this.camera) return;

        try {
            const box = new THREE.Box3().setFromObject(this.houseGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 8);

            this.controls.target.set(center.x, Math.max(1.5, center.y), center.z);

            const fov = this.camera.fov * (Math.PI / 180);
            let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.35;
            cameraDist = Math.max(16, Math.min(cameraDist, 42));

            this.camera.position.set(
                center.x + cameraDist * 0.72,
                center.y + cameraDist * 0.72,
                center.z + cameraDist * 0.88
            );
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        } catch (e) {
            console.warn('Camera auto-frame error:', e);
        }
    }

    // =========================================================================
    // 3. SITE, TERRAIN & ARCHITECTURAL LANDSCAPING
    // =========================================================================
    _buildSite(plotW, plotL, S) {
        const m = this.materials;

        // Ground Terrain with Grass Texture
        const groundGeo = new THREE.PlaneGeometry(plotW + 28, plotL + 28);
        const ground = new THREE.Mesh(groundGeo, m.lawnMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        this.siteGroup.add(ground);

        // Plot Base Pavers
        const plotGeo = new THREE.BoxGeometry(plotW, 0.1, plotL);
        const plotBase = new THREE.Mesh(plotGeo, m.paverMat);
        plotBase.position.set(0, -0.05, 0);
        plotBase.receiveShadow = true;
        this.siteGroup.add(plotBase);

        // Driveway / Pathway from Front to Parking
        const drivewayW = Math.min(plotW * 0.38, 4.5);
        const drivewayL = plotL * 0.42;
        const driveGeo = new THREE.BoxGeometry(drivewayW, 0.02, drivewayL);
        const driveway = new THREE.Mesh(driveGeo, m.paverMat);
        driveway.position.set(-plotW * 0.22, 0.01, plotL * 0.28);
        driveway.receiveShadow = true;
        this.siteGroup.add(driveway);

        // Manicured Boxwood Hedges along front boundary
        const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
        const hedgeGeo = new THREE.BoxGeometry(plotW * 0.42, 0.5, 0.4);
        const hedgeLeft = new THREE.Mesh(hedgeGeo, hedgeMat);
        hedgeLeft.position.set(plotW * 0.24, 0.25, plotL / 2 - 0.3);
        hedgeLeft.castShadow = true;
        this.siteGroup.add(hedgeLeft);

        // Perimeter Compound Wall with Coping Cap Trim
        if (this.model.site?.hasCompoundWall) {
            const wallH = 1.35; // 4.5 feet
            const wallThick = 0.22;
            const cMat = m.extWallMat;
            const capMat = m.copingMat;

            // North Wall
            const nWall = new THREE.Mesh(new THREE.BoxGeometry(plotW, wallH, wallThick), cMat);
            nWall.position.set(0, wallH / 2, -plotL / 2);
            nWall.castShadow = true; nWall.receiveShadow = true;
            this.siteGroup.add(nWall);

            // North Wall Coping Cap
            const nCap = new THREE.Mesh(new THREE.BoxGeometry(plotW + 0.08, 0.05, wallThick + 0.06), capMat);
            nCap.position.set(0, wallH + 0.025, -plotL / 2);
            this.siteGroup.add(nCap);

            // West Wall
            const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, plotL), cMat);
            wWall.position.set(-plotW / 2, wallH / 2, 0);
            wWall.castShadow = true; wWall.receiveShadow = true;
            this.siteGroup.add(wWall);

            // West Wall Coping Cap
            const wCap = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.06, 0.05, plotL + 0.08), capMat);
            wCap.position.set(-plotW / 2, wallH + 0.025, 0);
            this.siteGroup.add(wCap);

            // East Wall
            const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, plotL), cMat);
            eWall.position.set(plotW / 2, wallH / 2, 0);
            eWall.castShadow = true; eWall.receiveShadow = true;
            this.siteGroup.add(eWall);

            // East Wall Coping Cap
            const eCap = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.06, 0.05, plotL + 0.08), capMat);
            eCap.position.set(plotW / 2, wallH + 0.025, 0);
            this.siteGroup.add(eCap);

            // South Front Wall with Entry Gate Opening
            const gateW = Math.min(plotW * 0.36, 4.4);
            const sideW = (plotW - gateW) / 2;

            const sWall1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, wallThick), cMat);
            sWall1.position.set(-plotW / 2 + sideW / 2, wallH / 2, plotL / 2);
            sWall1.castShadow = true;
            this.siteGroup.add(sWall1);

            const sWall2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, wallThick), cMat);
            sWall2.position.set(plotW / 2 - sideW / 2, wallH / 2, plotL / 2);
            sWall2.castShadow = true;
            this.siteGroup.add(sWall2);

            // Modern Horizontal Slat Entry Gate
            const gateGroup = new THREE.Group();
            gateGroup.position.set(-plotW / 2 + sideW + gateW / 2, 0, plotL / 2);
            const gateFrameMat = m.frameMat;
            const slatCount = 7;
            for (let s = 0; s < slatCount; s++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(gateW * 0.95, 0.08, 0.04), gateFrameMat);
                slat.position.set(0, 0.2 + s * 0.16, 0);
                gateGroup.add(slat);
            }
            this.siteGroup.add(gateGroup);
        }

        // Multi-Tier Stylized Low-Poly Architectural Trees
        const trees = this.model.site?.trees || [
            { x: 5, y: 8, radiusFt: 3.5 },
            { x: 35, y: 12, radiusFt: 3.0 }
        ];

        trees.forEach(t => {
            const treeGroup = new THREE.Group();
            const tx = t.x * S - plotW / 2;
            const tz = t.y * S - plotL / 2;
            treeGroup.position.set(tx, 0, tz);

            // Natural Tapered Wooden Trunk
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 2.2, 8), trunkMat);
            trunk.position.y = 1.1;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            // Layered Foliage Canopies (Faceted Architectural Look)
            const foliageColors = [0x15803d, 0x16a34a, 0x22c55e];
            const tiers = 3;
            for (let k = 0; k < tiers; k++) {
                const tierR = ((t.radiusFt || 3.0) * S) * (1.0 - k * 0.22);
                const tierGeo = new THREE.ConeGeometry(tierR, 1.4, 7);
                const fMat = new THREE.MeshStandardMaterial({
                    color: foliageColors[k % foliageColors.length],
                    roughness: 0.65,
                    flatShading: true
                });
                const cone = new THREE.Mesh(tierGeo, fMat);
                cone.position.y = 2.2 + k * 0.85;
                cone.castShadow = true;
                treeGroup.add(cone);
            }

            this.siteGroup.add(treeGroup);
        });
    }

    // =========================================================================
    // 4. STRUCTURAL SLABS & ROOM FLOOR FINISHES
    // =========================================================================
    _buildFloorSlabs(flGroup, floor, S) {
        const rooms = floor.rooms || [];
        if (rooms.length === 0) return;
        const m = this.materials;

        // 1. Monolithic structural base slab spanning the entire floor footprint
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        rooms.forEach(r => {
            const b = r.bounds;
            if (!b) return;
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.width > maxX) maxX = b.x + b.width;
            if (b.y + b.height > maxY) maxY = b.y + b.height;
        });

        if (minX < Infinity && maxX > -Infinity) {
            const baseW = (maxX - minX) * S;
            const baseL = (maxY - minY) * S;
            const baseCenterX = (minX + (maxX - minX) / 2) * S;
            const baseCenterZ = (minY + (maxY - minY) / 2) * S;
            const baseThick = 0.18; // Structural concrete slab

            const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseThick, baseL), m.slabMat);
            baseMesh.position.set(baseCenterX, -baseThick / 2, baseCenterZ);
            baseMesh.receiveShadow = true;
            baseMesh.name = 'structural-base-slab';
            flGroup.add(baseMesh);
        }

        // 2. Room finish floorings inset from walls to eliminate coplanar Z-fighting
        const inset = 0.025; // 1-inch inset inside walls
        const finishThick = 0.015;

        rooms.forEach(r => {
            const b = r.bounds;
            if (!b) return;
            const rw = Math.max(0.05, b.width * S - inset * 2);
            const rl = Math.max(0.05, b.height * S - inset * 2);
            const rx = (b.x + b.width / 2) * S;
            const rz = (b.y + b.height / 2) * S;

            let mat = m.marbleMat; // Default polished marble
            if (r.type === 'masterBed' || r.type === 'bedroom') {
                mat = m.parquetMat; // Warm hardwood oak parquet
            } else if (r.type === 'living' || r.type === 'dining') {
                mat = m.marbleMat; // Polished Italian marble tiles
            } else if (r.type === 'kitchen' || r.type === 'bath') {
                mat = m.tileMat; // Matte ceramic tile
            } else if (r.type === 'parking') {
                mat = m.paverMat; // Heavy duty paver stone
            } else if (r.type === 'balcony') {
                mat = m.paverMat;
            }

            const slab = new THREE.Mesh(new THREE.BoxGeometry(rw, finishThick, rl), mat);
            slab.position.set(rx, finishThick / 2, rz);
            slab.receiveShadow = true;

            // Attach user data for raycasting
            slab.userData = { roomId: r.id, roomData: r };
            this.roomMeshes.set(r.id, slab);

            flGroup.add(slab);
        });
    }

    // =========================================================================
    // 5. ARCHITECTURAL WALL SYSTEM
    // =========================================================================
    _buildWalls(flGroup, floor, S) {
        const fullHeight = (floor.heightFt || 10.0) * S;
        // In 'interior' mode, walls are cut to 1.35m (4.4 ft) with clean architectural cap molding
        const wallH = (this.renderingMode === 'interior') ? 1.35 : fullHeight;
        const extThick = 0.23; // 9-inch structural brick/concrete
        const intThick = 0.12; // 4.5-inch partition wall
        const m = this.materials;

        if (floor.walls && floor.walls.length > 0) {
            floor.walls.forEach(w => {
                const sx = w.start.x * S;
                const sy = w.start.y * S;
                const ex = w.end.x * S;
                const ey = w.end.y * S;

                const dx = ex - sx;
                const dz = ey - sy;
                const len = Math.hypot(dx, dz);
                if (len < 0.1) return;

                const isExt = (w.type === 'exterior');
                const thick = isExt ? extThick : intThick;
                const wallMat = isExt ? m.extWallMat : m.intWallMat;

                const wallGroup = new THREE.Group();

                // Core Wall Body
                const wallGeo = new THREE.BoxGeometry(len, wallH, thick);
                const wallMesh = new THREE.Mesh(wallGeo, wallMat);
                wallMesh.position.y = wallH / 2;
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                wallGroup.add(wallMesh);

                // Architectural Cap Molding on top edge in Interior dollhouse mode
                if (this.renderingMode === 'interior') {
                    const capGeo = new THREE.BoxGeometry(len + 0.02, 0.04, thick + 0.02);
                    const capMesh = new THREE.Mesh(capGeo, m.copingMat);
                    capMesh.position.y = wallH + 0.02;
                    wallGroup.add(capMesh);
                }

                // Interior Skirting Board Baseboard (0.08m height)
                if (!isExt || this.renderingMode === 'interior') {
                    const skirtGeo = new THREE.BoxGeometry(len, 0.08, thick + 0.015);
                    const skirtMesh = new THREE.Mesh(skirtGeo, m.copingMat);
                    skirtMesh.position.y = 0.04;
                    wallGroup.add(skirtMesh);
                }

                // Midpoint and Rotation
                const midX = (sx + ex) / 2;
                const midZ = (sy + ey) / 2;
                wallGroup.position.set(midX, 0, midZ);
                const angle = Math.atan2(dz, dx);
                wallGroup.rotation.y = -angle;

                flGroup.add(wallGroup);
            });
        }
    }

    // =========================================================================
    // 6. ARCHITECTURAL DOORS
    // =========================================================================
    _buildDoors(flGroup, floor, S) {
        const doorH = 2.15; // 7 feet residential standard
        const doorThick = 0.04;
        const m = this.materials;

        (floor.doors || []).forEach(d => {
            const dw = (d.widthFt || 3.0) * S;
            const dx = d.position.x * S;
            const dz = d.position.y * S;

            const isVertical = (d.orientation === 'vertical' || d.wall === 'east' || d.wall === 'west');

            const doorGroup = new THREE.Group();
            doorGroup.position.set(dx, 0, dz);

            if (isVertical) {
                doorGroup.rotation.y = Math.PI / 2;
            } else if (d.rotationDeg) {
                doorGroup.rotation.y = -(d.rotationDeg * Math.PI) / 180;
            }

            // 1. Extruded Door Casing Frame (Jambs + Header)
            const frameW = 0.05;
            const frameD = 0.09;
            const frameMat = m.frameMat;

            // Left Jamb
            const lJamb = new THREE.Mesh(new THREE.BoxGeometry(frameW, doorH, frameD), frameMat);
            lJamb.position.set(-frameW / 2, doorH / 2, 0);
            doorGroup.add(lJamb);

            // Right Jamb
            const rJamb = new THREE.Mesh(new THREE.BoxGeometry(frameW, doorH, frameD), frameMat);
            rJamb.position.set(dw + frameW / 2, doorH / 2, 0);
            doorGroup.add(rJamb);

            // Top Header
            const header = new THREE.Mesh(new THREE.BoxGeometry(dw + frameW * 2, frameW, frameD), frameMat);
            header.position.set(dw / 2, doorH + frameW / 2, 0);
            doorGroup.add(header);

            // 2. Door Panel Slab (Recessed 0.02m inside casing)
            const panel = new THREE.Mesh(new THREE.BoxGeometry(dw, doorH, doorThick), m.woodMat);
            panel.position.set(dw / 2, doorH / 2, 0);
            panel.castShadow = true;
            doorGroup.add(panel);

            // 3. Brushed Metallic Lever Handle with Rose Plate on both sides
            const handleGroup = new THREE.Group();
            handleGroup.position.set(dw * 0.85, 1.0, 0);

            // Escutcheon rose plate
            const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12), m.hardwareMat);
            rose.rotation.x = Math.PI / 2;
            handleGroup.add(rose);

            // Lever bar
            const leverFront = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.015), m.hardwareMat);
            leverFront.position.set(-0.04, 0, 0.04);
            handleGroup.add(leverFront);

            const leverBack = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.015), m.hardwareMat);
            leverBack.position.set(-0.04, 0, -0.04);
            handleGroup.add(leverBack);

            doorGroup.add(handleGroup);
            flGroup.add(doorGroup);
        });
    }

    // =========================================================================
    // 7. ARCHITECTURAL WINDOWS
    // =========================================================================
    _buildWindows(flGroup, floor, S) {
        const m = this.materials;

        (floor.windows || []).forEach(w => {
            const ww = (w.widthFt || 4.0) * S;
            const wh = (w.heightFt || 4.5) * S;
            const sillH = (w.sillHeightFt || 3.0) * S;
            const wx = w.position.x * S;
            const wz = w.position.y * S;

            const isVertical = (w.orientation === 'vertical' || w.wall === 'east' || w.wall === 'west');

            const winGroup = new THREE.Group();
            winGroup.position.set(wx, sillH + wh / 2, wz);

            if (isVertical) {
                winGroup.rotation.y = Math.PI / 2;
            } else if (w.rotationDeg) {
                winGroup.rotation.y = -(w.rotationDeg * Math.PI) / 180;
            }

            // 1. Physically-Based Glass Pane (Recessed)
            const pane = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.035), m.glassMat);
            winGroup.add(pane);

            // 2. Anodized Aluminum Outer Casing Frame
            const frameMat = m.frameMat;
            const fThick = 0.05;
            const fDepth = 0.10;

            // Frame sides
            const lPost = new THREE.Mesh(new THREE.BoxGeometry(fThick, wh, fDepth), frameMat);
            lPost.position.set(-ww / 2 + fThick / 2, 0, 0);
            winGroup.add(lPost);

            const rPost = new THREE.Mesh(new THREE.BoxGeometry(fThick, wh, fDepth), frameMat);
            rPost.position.set(ww / 2 - fThick / 2, 0, 0);
            winGroup.add(rPost);

            // Frame top & bottom
            const topBar = new THREE.Mesh(new THREE.BoxGeometry(ww, fThick, fDepth), frameMat);
            topBar.position.set(0, wh / 2 - fThick / 2, 0);
            winGroup.add(topBar);

            const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(ww, fThick, fDepth), frameMat);
            bottomBar.position.set(0, -wh / 2 + fThick / 2, 0);
            winGroup.add(bottomBar);

            // 3. Central Vertical Mullion for realistic architectural proportion
            if (ww > 1.0) {
                const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.035, wh, fDepth * 0.9), frameMat);
                winGroup.add(mullion);
            }

            // 4. Projecting Exterior Window Sill with Drip Edge
            const sill = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.04, 0.16), m.copingMat);
            sill.position.set(0, -wh / 2 - 0.02, 0.05);
            winGroup.add(sill);

            flGroup.add(winGroup);
        });
    }

    // =========================================================================
    // 8. ARCHITECTURAL STAIRCASE
    // =========================================================================
    _buildStairs(flGroup, floor, S) {
        const m = this.materials;

        (floor.stairs || []).forEach(st => {
            const sx = st.position.x * S;
            const sz = st.position.y * S;
            const sw = (st.widthFt || 3.5) * S;
            const sl = (st.lengthFt || 9.0) * S;
            const steps = st.stepCount || 15;
            const totalH = (floor.heightFt || 10.0) * S;

            const treadL = sl / steps;
            const stepH = totalH / steps;

            const stairGroup = new THREE.Group();

            for (let i = 0; i < steps; i++) {
                const yPos = (i + 1) * stepH;
                const zPos = sz + i * treadL + treadL / 2;

                // 1. Solid Tread Board with Bullnose Overhang (0.045m thick)
                const tread = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.045, treadL + 0.025), m.woodMat);
                tread.position.set(sx + sw / 2, yPos, zPos);
                tread.castShadow = true;
                stairGroup.add(tread);

                // 2. Closed Riser Board
                const riser = new THREE.Mesh(new THREE.BoxGeometry(sw, stepH, 0.025), m.copingMat);
                riser.position.set(sx + sw / 2, yPos - stepH / 2, sz + i * treadL);
                stairGroup.add(riser);
            }

            // 3. Modern Tempered Glass Balustrade with Top Handrail
            const railH = 0.95; // 38 inches
            const railLen = Math.hypot(sl, totalH);
            const railAngle = Math.atan2(totalH, sl);

            const glassRailing = new THREE.Mesh(new THREE.BoxGeometry(0.02, railH, railLen), m.glassMat);
            glassRailing.position.set(sx + sw - 0.02, totalH / 2 + railH / 2, sz + sl / 2);
            glassRailing.rotation.x = railAngle;
            stairGroup.add(glassRailing);

            // Cylindrical Top Handrail
            const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, railLen, 12), m.hardwareMat);
            handrail.position.set(sx + sw - 0.02, totalH / 2 + railH, sz + sl / 2);
            handrail.rotation.x = railAngle;
            stairGroup.add(handrail);

            flGroup.add(stairGroup);
        });
    }

    // =========================================================================
    // 9. ARCHITECTURAL BALCONIES
    // =========================================================================
    _buildBalconies(flGroup, floor, S) {
        const m = this.materials;
        const ext = this.model?.exterior || {};
        const railStyle = ext.balconyRailing || 'frameless_glass';

        (floor.balconies || []).forEach(b => {
            const bx = (b.bounds.x + b.bounds.width / 2) * S;
            const bz = (b.bounds.y + b.bounds.height / 2) * S;
            const bw = b.bounds.width * S;
            const bl = b.bounds.height * S;
            const rh = (b.railingHeightFt || 3.5) * S;

            const bGroup = new THREE.Group();

            // 1. Structural Cantilever Balcony Slab (0.16m thick with drip edge)
            const slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.16, bl), m.slabMat);
            slab.position.set(bx, 0.08, bz);
            slab.receiveShadow = true;
            bGroup.add(slab);

            // 2. Balcony Railing matching active exterior style
            if (railStyle === 'frameless_smoked_glass') {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, rh, 0.04), m.smokedGlassMat);
                rail.position.set(bx, 0.16 + rh / 2, bz - bl / 2 + 0.02);
                bGroup.add(rail);

                const cap = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.04, 0.06), m.bronzeMat);
                cap.position.set(bx, 0.16 + rh, bz - bl / 2 + 0.02);
                bGroup.add(cap);
            } else if (railStyle === 'louvered_steel') {
                const louverCount = Math.floor(bw / 0.12);
                for (let lv = 0; lv < louverCount; lv++) {
                    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.03, rh, 0.06), m.frameMat);
                    louver.position.set(bx - bw / 2 + 0.06 + lv * 0.12, 0.16 + rh / 2, bz - bl / 2 + 0.02);
                    bGroup.add(louver);
                }
                const cap = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.04, 0.08), m.frameMat);
                cap.position.set(bx, 0.16 + rh, bz - bl / 2 + 0.02);
                bGroup.add(cap);
            } else if (railStyle === 'ornamental_wrought_iron') {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, rh, 0.03), m.frameMat);
                rail.position.set(bx, 0.16 + rh / 2, bz - bl / 2 + 0.02);
                bGroup.add(rail);

                const woodCap = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05, 0.08), m.woodMat);
                woodCap.position.set(bx, 0.16 + rh, bz - bl / 2 + 0.02);
                bGroup.add(woodCap);
            } else {
                // Default: Frameless Clear Architectural Glass
                const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, rh, 0.03), m.glassMat);
                rail.position.set(bx, 0.16 + rh / 2, bz - bl / 2 + 0.02);
                bGroup.add(rail);

                const cap = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.035, 0.05), m.frameMat);
                cap.position.set(bx, 0.16 + rh, bz - bl / 2 + 0.02);
                bGroup.add(cap);
            }

            flGroup.add(bGroup);
        });
    }

    // =========================================================================
    // 10. ROOF & TERRACE PARAPET SYSTEM
    // =========================================================================
    _buildRoof(flGroup, floor, S) {
        const m = this.materials;
        const fullH = (floor.heightFt || 10.0) * S;
        const rooms = floor.rooms || [];
        if (rooms.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        rooms.forEach(r => {
            const b = r.bounds;
            if (!b) return;
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.width > maxX) maxX = b.x + b.width;
            if (b.y + b.height > maxY) maxY = b.y + b.height;
        });

        if (minX === Infinity) return;

        const roofGroup = new THREE.Group();
        roofGroup.name = 'roof';

        const rw = (maxX - minX) * S;
        const rl = (maxY - minY) * S;
        const rx = (minX + (maxX - minX) / 2) * S;
        const rz = (minY + (maxY - minY) / 2) * S;

        // 1. Terrace Concrete Floor Slab with Pavers
        const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.22, rl), m.paverMat);
        slabMesh.position.set(rx, fullH + 0.11, rz);
        slabMesh.castShadow = true;
        roofGroup.add(slabMesh);

        // 2. Perimeter Parapet Wall (1.0m height, 0.20m thickness)
        const pH = 1.0;
        const pThick = 0.20;

        // North Parapet
        const nParapet = new THREE.Mesh(new THREE.BoxGeometry(rw, pH, pThick), m.extWallMat);
        nParapet.position.set(rx, fullH + 0.22 + pH / 2, rz - rl / 2 + pThick / 2);
        roofGroup.add(nParapet);

        // South Parapet
        const sParapet = new THREE.Mesh(new THREE.BoxGeometry(rw, pH, pThick), m.extWallMat);
        sParapet.position.set(rx, fullH + 0.22 + pH / 2, rz + rl / 2 - pThick / 2);
        roofGroup.add(sParapet);

        // West Parapet
        const wParapet = new THREE.Mesh(new THREE.BoxGeometry(pThick, pH, rl), m.extWallMat);
        wParapet.position.set(rx - rw / 2 + pThick / 2, fullH + 0.22 + pH / 2, rz);
        roofGroup.add(wParapet);

        // East Parapet
        const eParapet = new THREE.Mesh(new THREE.BoxGeometry(pThick, pH, rl), m.extWallMat);
        eParapet.position.set(rx + rw / 2 - pThick / 2, fullH + 0.22 + pH / 2, rz);
        roofGroup.add(eParapet);

        // 3. Continuous Architectural Coping Stone Cap (0.05m overhang)
        const cOver = 0.05;
        const nCap = new THREE.Mesh(new THREE.BoxGeometry(rw + cOver * 2, 0.06, pThick + cOver * 2), m.copingMat);
        nCap.position.set(rx, fullH + 0.22 + pH + 0.03, rz - rl / 2 + pThick / 2);
        roofGroup.add(nCap);

        const sCap = new THREE.Mesh(new THREE.BoxGeometry(rw + cOver * 2, 0.06, pThick + cOver * 2), m.copingMat);
        sCap.position.set(rx, fullH + 0.22 + pH + 0.03, rz + rl / 2 - pThick / 2);
        roofGroup.add(sCap);

        const wCap = new THREE.Mesh(new THREE.BoxGeometry(pThick + cOver * 2, 0.06, rl + cOver * 2), m.copingMat);
        wCap.position.set(rx - rw / 2 + pThick / 2, fullH + 0.22 + pH + 0.03, rz);
        roofGroup.add(wCap);

        const eCap = new THREE.Mesh(new THREE.BoxGeometry(pThick + cOver * 2, 0.06, rl + cOver * 2), m.copingMat);
        eCap.position.set(rx + rw / 2 - pThick / 2, fullH + 0.22 + pH + 0.03, rz);
        roofGroup.add(eCap);

        // 4. Roof Stair Bulkhead (Headroom doghouse connecting stairs to terrace)
        if (floor.index > 0) {
            const bulkW = 2.4;
            const bulkL = 3.0;
            const bulkH = 2.4;
            const bulkMesh = new THREE.Mesh(new THREE.BoxGeometry(bulkW, bulkH, bulkL), m.extWallMat);
            bulkMesh.position.set(rx * 0.5, fullH + 0.22 + bulkH / 2, rz * 0.5);
            bulkMesh.castShadow = true;
            roofGroup.add(bulkMesh);
        }

        flGroup.add(roofGroup);
    }

    // =========================================================================
    // 11. EXTERIOR FAÇADE ACCENTS & DETAILS
    // =========================================================================
    _buildExteriorFaçadeDecorations(flGroup, floor, S) {
        if (!this.model?.exterior) return;
        const ext = this.model.exterior;
        const m = this.materials;
        const styleKey = ext.styleKey || 'modern';
        const canopyStyle = ext.entranceCanopy || 'cantilever_slab';
        const colStyle = ext.columns || 'none';

        if (floor.index === 0 && floor.doors && floor.doors.length > 0) {
            const frontDoor = floor.doors.reduce((prev, curr) => (curr.position.y < prev.position.y ? curr : prev), floor.doors[0]);
            const dx = (frontDoor.position?.x || 5) * S;
            const dz = (frontDoor.position?.y || 4) * S;
            const porchY = (floor.heightFt || 10.0) * S * 0.85;

            // Entrance Canopy
            const canopyW = 5.5 * S;
            const canopyL = 3.8 * S;

            if (canopyStyle === 'pergola_wood') {
                // Contemporary Timber Pergola with Rafters
                const pGroup = new THREE.Group();
                pGroup.position.set(dx, porchY, dz - canopyL / 2);
                for (let r = 0; r < 6; r++) {
                    const rafter = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.12, 0.08), m.woodMat);
                    rafter.position.set(0, 0, -canopyL / 2 + r * (canopyL / 5));
                    pGroup.add(rafter);
                }
                flGroup.add(pGroup);
            } else if (canopyStyle === 'tiled_sloped_chhajja') {
                // Traditional Sloping Mangalore Clay Tile Chhajja
                const chhajjaGeo = new THREE.ConeGeometry(canopyW * 0.6, 0.6, 4);
                const tileMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
                const chhajja = new THREE.Mesh(chhajjaGeo, tileMat);
                chhajja.rotation.y = Math.PI / 4;
                chhajja.position.set(dx, porchY + 0.3, dz - canopyL / 2);
                flGroup.add(chhajja);
            } else {
                // Modern / Luxury Cantilever Concrete Slab
                const slab = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.14, canopyL), (styleKey === 'luxury') ? m.bronzeMat : m.copingMat);
                slab.position.set(dx, porchY, dz - canopyL / 2);
                slab.castShadow = true;
                flGroup.add(slab);
            }

            // Columns / Pillars
            if (colStyle === 'fluted_stone_pillars' || colStyle === 'travertine_monolith' || colStyle === 'square_concrete') {
                const colGeo = new THREE.CylinderGeometry(0.16, 0.18, porchY, 12);
                const colLeft = new THREE.Mesh(colGeo, m.copingMat);
                colLeft.position.set(dx - canopyW / 2 + 0.2, porchY / 2, dz - canopyL + 0.2);
                colLeft.castShadow = true;
                flGroup.add(colLeft);

                const colRight = new THREE.Mesh(colGeo, m.copingMat);
                colRight.position.set(dx + canopyW / 2 - 0.2, porchY / 2, dz - canopyL + 0.2);
                colRight.castShadow = true;
                flGroup.add(colRight);
            }
        }
    }

    // =========================================================================
    // 12. MODULAR ARCHITECTURAL DESIGNER FURNITURE SYSTEM
    // =========================================================================
    _buildFurniture(flGroup, floor, S) {
        const m = this.materials;

        (floor.furniture || []).forEach(f => {
            const fx = (f.position.x + f.size.width / 2) * S;
            const fz = (f.position.y + f.size.length / 2) * S;
            const fw = f.size.width * S;
            const fl = f.size.length * S;
            const fh = f.size.height * S;

            const fGroup = new THREE.Group();
            fGroup.position.set(fx, 0, fz);
            if (f.rotationDeg) fGroup.rotation.y = -(f.rotationDeg * Math.PI) / 180;

            if (f.type === 'bed') {
                // Modern Platform Bed with Upholstered Headboard, Mattress & Duvet
                const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
                const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 });
                const duvetMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
                const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

                // Low Wooden/Padded Platform Base
                const base = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.20, fl), frameMat);
                base.position.y = 0.10;
                base.castShadow = true;
                fGroup.add(base);

                // Headboard against rear wall
                const headboard = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.95, 0.12), frameMat);
                headboard.position.set(0, (fh * 0.95) / 2, -fl / 2 + 0.06);
                headboard.castShadow = true;
                fGroup.add(headboard);

                // Recessed Mattress
                const mattress = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.92, 0.22, fl * 0.88), mattressMat);
                mattress.position.set(0, 0.20 + 0.11, 0.04);
                fGroup.add(mattress);

                // Folded Designer Duvet Blanket
                const duvet = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.93, 0.06, fl * 0.52), duvetMat);
                duvet.position.set(0, 0.20 + 0.22 + 0.03, 0.22);
                fGroup.add(duvet);

                // Dual Pillows
                const pW = fw * 0.38;
                const pL = fl * 0.18;
                const pil1 = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.10, pL), pillowMat);
                pil1.position.set(-fw * 0.24, 0.20 + 0.22 + 0.05, -fl * 0.26);
                const pil2 = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.10, pL), pillowMat);
                pil2.position.set(fw * 0.24, 0.20 + 0.22 + 0.05, -fl * 0.26);
                fGroup.add(pil1); fGroup.add(pil2);

                // Bedside Nightstand Table
                const stand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.40, 0.40), m.woodMat);
                stand.position.set(fw / 2 + 0.32, 0.20, -fl / 2 + 0.3);
                fGroup.add(stand);

                // Bedside Mini Lamp
                const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.22, 12), m.hardwareMat);
                lamp.position.set(fw / 2 + 0.32, 0.51, -fl / 2 + 0.3);
                fGroup.add(lamp);

            } else if (f.type === 'sofa') {
                // Architectural Sectional Sofa with Cushions and Armrests
                const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
                const cushionMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });

                // Plinth Base with Slim Legs
                const seatH = fh * 0.42;
                const base = new THREE.Mesh(new THREE.BoxGeometry(fw, seatH, fl), sofaMat);
                base.position.y = seatH / 2;
                base.castShadow = true;
                fGroup.add(base);

                // Backrest
                const backH = fh * 0.75;
                const backrest = new THREE.Mesh(new THREE.BoxGeometry(fw, backH, fl * 0.24), sofaMat);
                backrest.position.set(0, backH / 2, -fl / 2 + (fl * 0.24) / 2);
                fGroup.add(backrest);

                // Left & Right Armrests
                const armW = fw * 0.12;
                const armH = fh * 0.62;
                const lArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, fl), sofaMat);
                lArm.position.set(-fw / 2 + armW / 2, armH / 2, 0);
                const rArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, fl), sofaMat);
                rArm.position.set(fw / 2 - armW / 2, armH / 2, 0);
                fGroup.add(lArm); fGroup.add(rArm);

                // Low Architectural Coffee Table in front of Sofa
                const ctW = fw * 0.65;
                const ctL = fl * 0.45;
                const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(ctW, 0.04, ctL), m.woodMat);
                coffeeTable.position.set(0, 0.32, fl * 0.95);
                coffeeTable.castShadow = true;
                fGroup.add(coffeeTable);

                // Slim Metal Legs for Coffee Table
                for (let lx of [-ctW * 0.4, ctW * 0.4]) {
                    for (let lz of [-ctL * 0.35, ctL * 0.35]) {
                        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.30), m.frameMat);
                        leg.position.set(lx, 0.15, fl * 0.95 + lz);
                        fGroup.add(leg);
                    }
                }

                // Soft Area Rug
                const rugMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
                const rug = new THREE.Mesh(new THREE.BoxGeometry(fw * 1.2, 0.01, fl * 1.8), rugMat);
                rug.position.set(0, 0.005, fl * 0.6);
                fGroup.add(rug);

            } else if (f.type === 'kitchen_counter' || f.type === 'kitchen') {
                // Modern Kitchen Suite: Lower Cabinets, Quartz Counter, Undermount Sink & Upper Cabinets
                const cabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
                const counterMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.08 });

                // Base Cabinet with Recessed Toe-Kick (0.08m)
                const baseH = fh * 0.85;
                const baseCab = new THREE.Mesh(new THREE.BoxGeometry(fw, baseH, fl * 0.95), cabMat);
                baseCab.position.set(0, baseH / 2 + 0.04, 0);
                fGroup.add(baseCab);

                // Polished Countertop with Overhang
                const counter = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.04, 0.04, fl), counterMat);
                counter.position.set(0, baseH + 0.06, 0);
                counter.castShadow = true;
                fGroup.add(counter);

                // Undermount Stainless Sink & Gooseneck Faucet
                const sink = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.35, 0.02, fl * 0.6), m.hardwareMat);
                sink.position.set(0, baseH + 0.081, 0);
                fGroup.add(sink);

                const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25), m.hardwareMat);
                faucet.position.set(0, baseH + 0.20, -fl * 0.25);
                fGroup.add(faucet);

            } else if (f.type === 'bathroom' || f.type === 'toilet') {
                // Modern Bathroom: Floating Vanity with Ceramic Vessel Basin & Wall-hung Toilet
                const vanity = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.35, fl), m.woodMat);
                vanity.position.set(0, 0.65, 0);
                fGroup.add(vanity);

                const basin = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.55, 0.12, fl * 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }));
                basin.position.set(0, 0.88, 0);
                fGroup.add(basin);

                // Wall-Hung Mirror
                const mirror = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.75, 0.75, 0.02), m.hardwareMat);
                mirror.position.set(0, 1.45, -fl / 2 + 0.02);
                fGroup.add(mirror);

            } else if (f.type === 'dining' || f.type === 'dining_table') {
                // Contemporary Dining Table with 4 Chairs
                const tableTop = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.04, fl), m.woodMat);
                tableTop.position.set(0, 0.74, 0);
                tableTop.castShadow = true;
                fGroup.add(tableTop);

                // Table legs
                for (let tx of [-fw * 0.42, fw * 0.42]) {
                    for (let tz of [-fl * 0.42, fl * 0.42]) {
                        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.72), m.frameMat);
                        leg.position.set(tx, 0.36, tz);
                        fGroup.add(leg);
                    }
                }

            } else if (f.type === 'vehicle_car') {
                // Modern Executive Sedan in Parking Porch
                const carMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.22 });
                const glassMat = m.smokedGlassMat;

                const chassis = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.52, fl), carMat);
                chassis.position.y = (fh * 0.52) / 2 + 0.06;
                chassis.castShadow = true;
                fGroup.add(chassis);

                const cabin = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.82, fh * 0.45, fl * 0.55), glassMat);
                cabin.position.set(0, (fh * 0.52) + (fh * 0.45) / 2 + 0.06, -fl * 0.05);
                fGroup.add(cabin);

            } else {
                // Default Clean Contemporary Storage Credenza
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fl), m.woodMat);
                mesh.position.y = fh / 2;
                mesh.castShadow = true;
                fGroup.add(mesh);
            }

            fGroup.name = 'furniture';
            flGroup.add(fGroup);
        });
    }

    // =========================================================================
    // 13. INTERIOR ARCHITECTURAL LIGHTING (Warm Ambiance)
    // =========================================================================
    _buildInteriorLighting(S, centerX, centerZ) {
        if (!this.model?.floors) return;

        this.model.floors.forEach((floor, idx) => {
            const elevY = (floor.elevationFt || 0) * S;
            const fullH = (floor.heightFt || 10.0) * S;
            const lightY = elevY + fullH * 0.88;

            (floor.rooms || []).forEach(r => {
                const b = r.bounds;
                if (!b) return;

                // Center coordinates in world space
                const lx = (b.x + b.width / 2) * S - centerX;
                const lz = (b.y + b.height / 2) * S - centerZ;

                // Warm 3000K recessed architectural downlight
                const downlight = new THREE.PointLight(0xffedd5, 0.75, 7.5, 1.8);
                downlight.position.set(lx, lightY, lz);
                this.interiorLightingGroup.add(downlight);

                // Small visual downlight fixture ring on ceiling
                const fixture = new THREE.Mesh(
                    new THREE.RingGeometry(0.04, 0.08, 16),
                    new THREE.MeshBasicMaterial({ color: 0xfff7ed, side: THREE.DoubleSide })
                );
                fixture.rotation.x = Math.PI / 2;
                fixture.position.set(lx, lightY, lz);
                this.interiorLightingGroup.add(fixture);
            });
        });
    }

    // =========================================================================
    // 14. VISIBILITY & SELECTION
    // =========================================================================
    _applyVisibility() {
        this.siteGroup.visible = this.visibility.site;

        this.floorGroups.forEach(flGroup => {
            flGroup.traverse(child => {
                if (child.name === 'furniture') {
                    child.visible = this.visibility.furniture;
                } else if (child.name === 'roof') {
                    child.visible = this.visibility.roof;
                }
            });
        });
    }

    _updateFloorVisibility() {
        this.floorGroups.forEach((flGroup, idx) => {
            if (this.activeFloorIndex === -1 || this.activeFloorIndex === 'all') {
                flGroup.visible = true;
            } else {
                flGroup.visible = (idx === this.activeFloorIndex);
            }
        });
    }

    _highlightSelectedRoom() {
        this.roomMeshes.forEach((mesh, rId) => {
            const isSel = (rId === this.selectedRoomId);
            if (mesh.material) {
                if (isSel) {
                    mesh.material.emissive = new THREE.Color(0x0284c7);
                    mesh.material.emissiveIntensity = 0.55;
                } else {
                    mesh.material.emissive = new THREE.Color(0x000000);
                    mesh.material.emissiveIntensity = 0.0;
                }
            }
        });
    }

    _buildDebugOverlaps(flGroup, floor, S) {
        const rooms = floor.rooms || [];
        const debugGroup = new THREE.Group();
        debugGroup.name = 'debugOverlaps';

        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 1; j < rooms.length; j++) {
                const r1 = rooms[i];
                const r2 = rooms[j];
                const b1 = r1.bounds;
                const b2 = r2.bounds;
                if (!b1 || !b2) continue;

                const ix1 = Math.max(b1.x, b2.x);
                const iy1 = Math.max(b1.y, b2.y);
                const ix2 = Math.min(b1.x + b1.width, b2.x + b2.width);
                const iy2 = Math.min(b1.y + b1.height, b2.y + b2.height);

                const iw = ix2 - ix1;
                const il = iy2 - iy1;

                if (iw > 0.05 && il > 0.05) {
                    const area = iw * il;
                    if (area > 0.01) {
                        const cx = (ix1 + iw / 2) * S;
                        const cz = (iy1 + il / 2) * S;
                        const cw = iw * S;
                        const cl = il * S;
                        const ch = 1.6;

                        const boxGeo = new THREE.BoxGeometry(cw, ch, cl);
                        const boxMat = new THREE.MeshBasicMaterial({
                            color: 0xef4444,
                            transparent: true,
                            opacity: 0.75,
                            depthTest: false
                        });
                        const debugBox = new THREE.Mesh(boxGeo, boxMat);
                        debugBox.position.set(cx, ch / 2, cz);
                        debugGroup.add(debugBox);

                        const wireGeo = new THREE.EdgesGeometry(boxGeo);
                        const wireMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 });
                        const wire = new THREE.LineSegments(wireGeo, wireMat);
                        wire.position.set(cx, ch / 2, cz);
                        debugGroup.add(wire);
                    }
                }
            }
        }

        flGroup.add(debugGroup);
    }

    // =========================================================================
    // 15. 10 PROFESSIONAL CAMERA PRESETS & BOUNDING BOX AUTO-FRAMING
    // =========================================================================
    setCameraView(viewName) {
        if (!this.camera || !this.controls) return;
        const target = this.controls.target;

        let dist = 24;
        try {
            const box = new THREE.Box3().setFromObject(this.houseGroup);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.z, 8);
            dist = Math.max(16, maxDim * 1.35);
        } catch (e) {
            dist = 24;
        }

        switch (viewName.toLowerCase()) {
            case 'top':
                // Plan / Orthographic view from directly above
                this.camera.position.set(target.x, target.y + dist * 1.35, target.z + 0.001);
                break;
            case 'front':
                // South / Front Elevation
                this.camera.position.set(target.x, target.y + 1.8, target.z + dist);
                break;
            case 'rear':
            case 'back':
                // North / Rear Elevation
                this.camera.position.set(target.x, target.y + 1.8, target.z - dist);
                break;
            case 'left':
                // West / Left Elevation
                this.camera.position.set(target.x - dist, target.y + 1.8, target.z);
                break;
            case 'right':
                // East / Right Elevation
                this.camera.position.set(target.x + dist, target.y + 1.8, target.z);
                break;
            case 'iso':
            case 'isometric':
                // Architectural Axonometric View
                this.camera.position.set(target.x + dist * 0.72, target.y + dist * 0.75, target.z + dist * 0.85);
                break;
            case 'interior':
                // Eye-Level Walkthrough View inside the residence
                this.camera.position.set(target.x - 2, target.y + 1.6, target.z + 4);
                break;
            case 'ground':
                // Focus on Ground Floor
                this.camera.position.set(target.x + dist * 0.6, target.y + 3.5, target.z + dist * 0.7);
                break;
            case 'first':
                // Focus on First Floor
                this.camera.position.set(target.x + dist * 0.6, target.y + 6.5, target.z + dist * 0.7);
                break;
            case 'orbit':
            case 'reset':
            default:
                // Overall House Perspective Framing (occupying 70-80% of visualization area)
                this.camera.position.set(target.x + dist * 0.68, target.y + dist * 0.65, target.z + dist * 0.88);
                break;
        }

        this.camera.lookAt(target);
        this.controls.update();
    }

    resetCamera() {
        this.setCameraView('reset');
    }
}

// Global browser window attachment
if (typeof window !== 'undefined') {
    window.Procedural3DGenerator = Procedural3DGenerator;
}
