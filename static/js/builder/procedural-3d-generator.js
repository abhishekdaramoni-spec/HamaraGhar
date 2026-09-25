// =========================================================================
// HamaraGhar — Procedural Three.js 3D Architectural House Generator
// Generates fully interactive 3D residences from the Canonical HouseModel.
// Features: Extruded structural walls with cutouts, floor slabs, doors,
// windows, stairs, balconies, furniture, site landscaping, camera presets,
// and bidirectional raycast room selection.
// =========================================================================

export class Procedural3DGenerator {
    constructor(container, options = {}) {
        this.container = container;
        this.model = null;
        this.activeFloorIndex = 0;
        this.selectedRoomId = null;
        this.renderingMode = 'interior'; // 'exterior', 'interior' (dollhouse cutaway), 'construction', 'exploded'

        // Visibility Toggles
        this.visibility = {
            walls: true,
            furniture: true,
            roof: false,
            dimensions: true,
            labels: true,
            site: true
        };

        // Three.js Core Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Scene Groups
        this.houseGroup = new THREE.Group();
        this.siteGroup = new THREE.Group();
        this.floorGroups = [];
        this.roomMeshes = new Map(); // roomId -> mesh

        // Animation / Walk mode
        this.isWalkMode = false;
        this.walkKeys = { forward: false, backward: false, left: false, right: false };
        this.animId = null;

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
        this.scene.background = new THREE.Color(0x0b132b); // Deep architectural twilight
        this.scene.fog = new THREE.FogExp2(0x0b132b, 0.008);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
        this.camera.position.set(22, 28, 38);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath ground
            this.controls.minDistance = 5;
            this.controls.maxDistance = 180;
            this.controls.target.set(0, 2, 0);
        }

        // Lighting
        this._setupLighting();

        // Add Groups
        this.scene.add(this.siteGroup);
        this.scene.add(this.houseGroup);

        // Resize Listener
        window.addEventListener('resize', () => this._onResize());

        // Start Loop
        this._animate();
    }

    _setupLighting() {
        // Ambient soft fill
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // Main Sun Light (Warm morning sun angle)
        const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.25);
        sunLight.position.set(30, 45, 25);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 120;
        sunLight.shadow.camera.left = -35;
        sunLight.shadow.camera.right = 35;
        sunLight.shadow.camera.top = 35;
        sunLight.shadow.camera.bottom = -35;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        // Gentle interior bounce light
        const bounceLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
        bounceLight.position.set(-25, 20, -20);
        this.scene.add(bounceLight);
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
                // Find parent room container
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

    build() {
        if (!this.model) return;

        // Clear existing scene groups
        while (this.siteGroup.children.length > 0) {
            this.siteGroup.remove(this.siteGroup.children[0]);
        }
        while (this.houseGroup.children.length > 0) {
            this.houseGroup.remove(this.houseGroup.children[0]);
        }
        this.floorGroups = [];
        this.roomMeshes.clear();

        const S = 0.3048; // Three.js world scale: 1 foot = 0.3048 units (meters)
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

            // Exploded view vertical spacing
            let elevY = floor.elevationFt * S;
            if (this.renderingMode === 'exploded') {
                elevY += idx * 6.5; // Separate floors vertically by ~20 feet
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

            // Furniture
            this._buildFurniture(flGroup, floor, S);

            // Ceilings / Roof
            if (this.visibility.roof || this.renderingMode === 'exterior') {
                this._buildRoof(flGroup, floor, S);
            }

            // Exterior Façade Design Elements
            this._buildExteriorFaçadeDecorations(flGroup, floor, S);

            this.houseGroup.add(flGroup);
            this.floorGroups.push(flGroup);
        });

        // 3. Center camera focus
        if (this.controls) {
            this.controls.target.set(0, 2.5, 0);
        }

        this._applyVisibility();
        this._updateFloorVisibility();
        this._highlightSelectedRoom();
    }

    _buildSite(plotW, plotL, S) {
        // Ground Earth / Grass Terrain
        const groundGeo = new THREE.PlaneGeometry(plotW + 20, plotL + 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a1f, // Deep rich lawn green
            roughness: 0.9,
            metalness: 0.05
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        this.siteGroup.add(ground);

        // Plot Base Pavers
        const plotGeo = new THREE.BoxGeometry(plotW, 0.1, plotL);
        const plotMat = new THREE.MeshStandardMaterial({
            color: 0x334155, // Clean slate paver
            roughness: 0.8
        });
        const plotBase = new THREE.Mesh(plotGeo, plotMat);
        plotBase.position.set(0, -0.05, 0);
        plotBase.receiveShadow = true;
        this.siteGroup.add(plotBase);

        // Compound Perimeter Wall
        if (this.model.site?.hasCompoundWall) {
            const wallH = 1.4; // ~4.5 feet
            const wallThick = 0.25;
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });

            // North Wall
            const nWall = new THREE.Mesh(new THREE.BoxGeometry(plotW, wallH, wallThick), wallMat);
            nWall.position.set(0, wallH / 2, -plotL / 2);
            nWall.castShadow = true; nWall.receiveShadow = true;
            this.siteGroup.add(nWall);

            // West Wall
            const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, plotL), wallMat);
            wWall.position.set(-plotW / 2, wallH / 2, 0);
            wWall.castShadow = true; wWall.receiveShadow = true;
            this.siteGroup.add(wWall);

            // East Wall
            const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, plotL), wallMat);
            eWall.position.set(plotW / 2, wallH / 2, 0);
            eWall.castShadow = true; eWall.receiveShadow = true;
            this.siteGroup.add(eWall);

            // South Wall with Entry Gate Opening
            const gateW = Math.min(plotW * 0.35, 4.2);
            const sideW = (plotW - gateW) / 2;

            const sWall1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, wallThick), wallMat);
            sWall1.position.set(-plotW / 2 + sideW / 2, wallH / 2, plotL / 2);
            this.siteGroup.add(sWall1);

            const sWall2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, wallThick), wallMat);
            sWall2.position.set(plotW / 2 - sideW / 2, wallH / 2, plotL / 2);
            this.siteGroup.add(sWall2);
        }

        // Trees & Greenery
        const trees = this.model.site?.trees || [];
        trees.forEach(t => {
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 });

            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.8, 8), trunkMat);
            trunk.position.set(t.x * S - plotW / 2, 0.9, t.y * S - plotL / 2);
            trunk.castShadow = true;
            this.siteGroup.add(trunk);

            const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry((t.radiusFt || 2.5) * S, 1), leafMat);
            foliage.position.set(t.x * S - plotW / 2, 2.5, t.y * S - plotL / 2);
            foliage.castShadow = true;
            this.siteGroup.add(foliage);
        });
    }

    _buildFloorSlabs(flGroup, floor, S) {
        (floor.rooms || []).forEach(r => {
            const b = r.bounds;
            const rx = (b.x + b.width / 2) * S;
            const rz = (b.y + b.height / 2) * S;
            const rw = b.width * S;
            const rl = b.height * S;
            const slabThick = 0.2; // ~8 inches

            // Choose appropriate floor material
            let color = 0xd1d5db;
            let roughness = 0.5;
            let metalness = 0.1;

            if (r.type === 'masterBed' || r.type === 'bedroom') {
                color = 0x92400e; // Warm hardwood teak parquet
                roughness = 0.4;
            } else if (r.type === 'living' || r.type === 'dining') {
                color = 0xf8fafc; // Polished Italian marble tiles
                roughness = 0.2;
                metalness = 0.15;
            } else if (r.type === 'kitchen' || r.type === 'bath') {
                color = 0x64748b; // Anti-skid ceramic tile
                roughness = 0.6;
            } else if (r.type === 'parking') {
                color = 0x475569; // Heavy duty paver stone
                roughness = 0.85;
            }

            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: roughness,
                metalness: metalness
            });

            const slab = new THREE.Mesh(new THREE.BoxGeometry(rw, slabThick, rl), mat);
            slab.position.set(rx, -slabThick / 2, rz);
            slab.receiveShadow = true;

            // Attach user data for raycasting
            slab.userData = { roomId: r.id, roomData: r };
            this.roomMeshes.set(r.id, slab);

            flGroup.add(slab);
        });
    }

    _buildWalls(flGroup, floor, S) {
        // In 'interior' mode, walls are cut to 4.0 ft height for a dollhouse overview
        const fullHeight = (floor.heightFt || 10.0) * S;
        const wallH = (this.renderingMode === 'interior') ? 1.35 : fullHeight; // ~4.4 ft or full
        const extThick = 0.28; // ~9 inch brick
        const intThick = 0.14; // ~4.5 inch partition

        let extColorVal = 0xf1f5f9;
        if (this.model?.exterior?.facadeColor) {
            extColorVal = parseInt(this.model.exterior.facadeColor.replace('#', '0x'), 16);
        }

        const extMat = new THREE.MeshStandardMaterial({
            color: extColorVal, // Dynamic exterior façade color from active exterior style
            roughness: 0.85
        });
        const intMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Soft warm plaster
            roughness: 0.9
        });

        // Use discrete walls array if available
        if (floor.walls && floor.walls.length > 0) {
            floor.walls.forEach(w => {
                const sx = w.start.x * S;
                const sy = w.start.y * S;
                const ex = w.end.x * S;
                const ey = w.end.y * S;

                const dx = ex - sx;
                const dz = ey - sy;
                const len = Math.sqrt(dx * dx + dz * dz);
                if (len < 0.1) return;

                const thick = (w.type === 'exterior') ? extThick : intThick;
                const mat = (w.type === 'exterior') ? extMat : intMat;

                const wallGeo = new THREE.BoxGeometry(len, wallH, thick);
                const wallMesh = new THREE.Mesh(wallGeo, mat);

                // Position at midpoint
                const midX = (sx + ex) / 2;
                const midZ = (sy + ey) / 2;
                wallMesh.position.set(midX, wallH / 2, midZ);

                // Rotation angle along Y axis
                const angle = Math.atan2(dz, dx);
                wallMesh.rotation.y = -angle;

                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                flGroup.add(wallMesh);
            });
        }
    }

    _buildDoors(flGroup, floor, S) {
        const doorH = 2.15; // 7 feet
        const doorThick = 0.05;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 }); // Solid walnut
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2 });

        (floor.doors || []).forEach(d => {
            const dw = (d.widthFt || 3.0) * S;
            const dx = d.position.x * S;
            const dz = d.position.y * S;

            const doorGroup = new THREE.Group();
            doorGroup.position.set(dx, 0, dz);

            // Door panel
            const panel = new THREE.Mesh(new THREE.BoxGeometry(dw, doorH, doorThick), woodMat);
            panel.position.set(dw / 2, doorH / 2, 0);
            panel.castShadow = true;
            doorGroup.add(panel);

            // Handle
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), handleMat);
            handle.rotation.z = Math.PI / 2;
            handle.position.set(dw * 0.85, 1.0, 0.04);
            doorGroup.add(handle);

            flGroup.add(doorGroup);
        });
    }

    _buildWindows(flGroup, floor, S) {
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xbae6fd,
            transmission: 0.85,
            opacity: 0.6,
            transparent: true,
            roughness: 0.1,
            ior: 1.5,
            reflectivity: 0.9
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 }); // Black aluminum frame

        (floor.windows || []).forEach(w => {
            const ww = (w.widthFt || 4.0) * S;
            const wh = (w.heightFt || 4.5) * S;
            const sillH = (w.sillHeightFt || 3.0) * S;
            const wx = w.position.x * S;
            const wz = w.position.y * S;

            const winGroup = new THREE.Group();
            winGroup.position.set(wx, sillH + wh / 2, wz);

            // Glass pane
            const pane = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.04), glassMat);
            winGroup.add(pane);

            // Outer Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.06, wh + 0.06, 0.08), frameMat);
            winGroup.add(frame);

            flGroup.add(winGroup);
        });
    }

    _buildStairs(flGroup, floor, S) {
        const treadMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.4 });
        const riserMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

        (floor.stairs || []).forEach(st => {
            const sx = st.position.x * S;
            const sz = st.position.y * S;
            const sw = st.widthFt * S;
            const sl = st.lengthFt * S;
            const steps = st.stepCount || 15;
            const totalH = (floor.heightFt || 10.0) * S;

            const treadL = sl / steps;
            const stepH = totalH / steps;

            for (let i = 0; i < steps; i++) {
                // Tread
                const tread = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.05, treadL), treadMat);
                tread.position.set(sx + sw / 2, (i + 1) * stepH, sz + i * treadL + treadL / 2);
                tread.castShadow = true;
                flGroup.add(tread);

                // Riser
                const riser = new THREE.Mesh(new THREE.BoxGeometry(sw, stepH, 0.04), riserMat);
                riser.position.set(sx + sw / 2, i * stepH + stepH / 2, sz + i * treadL);
                flGroup.add(riser);
            }
        });
    }

    _buildBalconies(flGroup, floor, S) {
        const railStyle = this.model?.exterior?.balconyRailing || 'frameless_glass';
        let railMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.2 });
        let glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, opacity: 0.45, transparent: true, roughness: 0.1 });

        if (railStyle === 'ornamental_wrought_iron') {
            railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
            glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, wireframe: true });
        } else if (railStyle === 'louvered_steel' || railStyle === 'ms_grill') {
            railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
            glassMat = new THREE.MeshStandardMaterial({ color: 0x475569, opacity: 0.8, transparent: true });
        } else if (railStyle === 'frameless_smoked_glass') {
            glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, opacity: 0.65, transparent: true, roughness: 0.1 });
        }

        (floor.balconies || []).forEach(b => {
            const bx = (b.bounds.x + b.bounds.width / 2) * S;
            const bz = (b.bounds.y + b.bounds.height / 2) * S;
            const bw = b.bounds.width * S;
            const bl = b.bounds.height * S;
            const rh = (b.railingHeightFt || 3.5) * S;

            // Balcony Glass Railing
            const railGeo = new THREE.BoxGeometry(bw, rh, 0.05);
            const railing = new THREE.Mesh(railGeo, glassMat);
            railing.position.set(bx, rh / 2, bz - bl / 2);
            flGroup.add(railing);

            // Metal Handrail Top
            const cap = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.06, 0.08), railMat);
            cap.position.set(bx, rh, bz - bl / 2);
            flGroup.add(cap);
        });
    }

    _buildFurniture(flGroup, floor, S) {
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
                // Mattress & Frame
                const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
                const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
                const pillowMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });

                const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.25, fl), frameMat);
                frame.position.y = 0.125;
                frame.castShadow = true;
                fGroup.add(frame);

                const mattress = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.95, fh * 0.45, fl * 0.95), sheetMat);
                mattress.position.y = 0.25 + (fh * 0.45) / 2;
                fGroup.add(mattress);

                // Pillows
                const pil1 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.35, 0.12, fl * 0.2), pillowMat);
                pil1.position.set(-fw * 0.25, 0.25 + fh * 0.45 + 0.06, -fl * 0.35);
                const pil2 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.35, 0.12, fl * 0.2), pillowMat);
                pil2.position.set(fw * 0.25, 0.25 + fh * 0.45 + 0.06, -fl * 0.35);
                fGroup.add(pil1); fGroup.add(pil2);
            } else if (f.type === 'sofa') {
                const sofaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
                const cushionMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });

                const base = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.45, fl), sofaMat);
                base.position.y = (fh * 0.45) / 2;
                base.castShadow = true;
                fGroup.add(base);

                const back = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.75, fl * 0.25), cushionMat);
                back.position.set(0, (fh * 0.75) / 2, -fl * 0.38);
                fGroup.add(back);
            } else if (f.type === 'vehicle_car') {
                // Stylized modern car in parking porch
                const carMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
                const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 });

                const chassis = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.55, fl), carMat);
                chassis.position.y = (fh * 0.55) / 2;
                chassis.castShadow = true;
                fGroup.add(chassis);

                const cabin = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.85, fh * 0.45, fl * 0.55), glassMat);
                cabin.position.set(0, (fh * 0.55) + (fh * 0.45) / 2, -fl * 0.05);
                fGroup.add(cabin);
            } else {
                // General furniture cuboid
                const genMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fl), genMat);
                mesh.position.y = fh / 2;
                mesh.castShadow = true;
                fGroup.add(mesh);
            }

            fGroup.name = 'furniture';
            flGroup.add(fGroup);
        });
    }

    _buildRoof(flGroup, floor, S) {
        // Ceiling / Flat RCC Slab
        (floor.rooms || []).forEach(r => {
            const b = r.bounds;
            const rx = (b.x + b.width / 2) * S;
            const rz = (b.y + b.height / 2) * S;
            const rw = b.width * S;
            const rl = b.height * S;
            const fullH = (floor.heightFt || 10.0) * S;

            const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
            const roof = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.25, rl), roofMat);
            roof.position.set(rx, fullH + 0.125, rz);
            roof.name = 'roof';
            roof.castShadow = true;
            flGroup.add(roof);
        });
    }

    _buildExteriorFaçadeDecorations(flGroup, floor, S) {
        if (!this.model?.exterior) return;
        const ext = this.model.exterior;
        const canopyStyle = ext.entranceCanopy || 'cantilever_slab';
        const colStyle = ext.columns || 'none';

        if (floor.index === 0 && floor.doors && floor.doors.length > 0) {
            const frontDoor = floor.doors.reduce((prev, curr) => (curr.position.y < prev.position.y ? curr : prev), floor.doors[0]);
            const dx = (frontDoor.position?.x || 5) * S;
            const dz = (frontDoor.position?.y || 4) * S;
            const canopyW = 6.0 * S;
            const canopyL = 4.0 * S;
            const canopyH = 0.15;
            const porchY = (floor.heightFt || 10.0) * S * 0.85;

            let canopyColor = 0x1e293b;
            if (canopyStyle === 'pergola_wood') canopyColor = 0x78350f;
            else if (canopyStyle === 'tiled_sloped_chhajja') canopyColor = 0x9a3412;
            else if (canopyStyle === 'double_height_portal') canopyColor = 0xd97706;

            const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.5 });
            const slab = new THREE.Mesh(new THREE.BoxGeometry(canopyW, canopyH, canopyL), canopyMat);
            slab.position.set(dx, porchY, dz - canopyL / 2);
            slab.castShadow = true;
            flGroup.add(slab);

            if (colStyle === 'fluted_stone_pillars' || colStyle === 'travertine_monolith' || colStyle === 'square_concrete') {
                const colGeo = new THREE.CylinderGeometry(0.18, 0.2, porchY, 16);
                const colMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
                const colLeft = new THREE.Mesh(colGeo, colMat);
                colLeft.position.set(dx - canopyW / 2 + 0.2, porchY / 2, dz - canopyL + 0.2);
                colLeft.castShadow = true;
                flGroup.add(colLeft);

                const colRight = new THREE.Mesh(colGeo, colMat);
                colRight.position.set(dx + canopyW / 2 - 0.2, porchY / 2, dz - canopyL + 0.2);
                colRight.castShadow = true;
                flGroup.add(colRight);
            }
        }
    }

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
                    mesh.material.emissiveIntensity = 0.45;
                } else {
                    mesh.material.emissive = new THREE.Color(0x000000);
                    mesh.material.emissiveIntensity = 0.0;
                }
            }
        });
    }

    // =========================================================================
    // CAMERA PRESETS
    // =========================================================================

    setCameraView(viewName) {
        if (!this.camera || !this.controls) return;
        const target = this.controls.target;
        const dist = 38;

        switch (viewName.toLowerCase()) {
            case 'top':
                this.camera.position.set(target.x, target.y + dist * 1.2, target.z + 0.001);
                break;
            case 'front':
                this.camera.position.set(target.x, target.y + 4, target.z + dist);
                break;
            case 'left':
                this.camera.position.set(target.x - dist, target.y + 4, target.z);
                break;
            case 'right':
                this.camera.position.set(target.x + dist, target.y + 4, target.z);
                break;
            case 'iso':
            case 'isometric':
                this.camera.position.set(target.x + 24, target.y + 26, target.z + 28);
                break;
            case 'orbit':
            case 'reset':
            default:
                this.camera.position.set(target.x + 22, target.y + 24, target.z + 32);
                break;
        }

        this.camera.lookAt(target);
        this.controls.update();
    }

    resetCamera() {
        this.setCameraView('reset');
    }
}

// Global browser attachment
if (typeof window !== 'undefined') {
    window.Procedural3DGenerator = Procedural3DGenerator;
}
