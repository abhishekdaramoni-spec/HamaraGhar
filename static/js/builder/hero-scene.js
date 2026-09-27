// =========================================================================
// HamaraGhar — Architectural Hero 3D Scene Controller (Three.js WebGL)
// Renders an elegant modernist residential villa with realistic materials,
// sunlight shadows, cantilevered master suite, glass balconies, and orbit.
// Fully contained within the canvas container — zero escaping DOM elements.
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('heroScene');
    if (!container) return;

    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded for hero scene.');
        return;
    }

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 380;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep architectural slate
    scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 500);
    camera.position.set(28, 22, 32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    container.appendChild(canvas);

    // 2. Camera Controls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 18;
        controls.maxDistance = 55;
        controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't look from underground
        controls.target.set(0, 3, 0);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
    }

    // 3. Architectural Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    sunLight.position.set(24, 35, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0008;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-20, 15, -15);
    scene.add(fillLight);

    // 4. Materials
    const whiteTravertine = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
        metalness: 0.05
    });
    const charcoalSlate = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.45,
        metalness: 0.15
    });
    const warmTimber = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.6,
        metalness: 0.05
    });
    const architecturalGlass = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.6,
        ior: 1.5
    });
    const darkMullion = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.8
    });
    const siteLawnMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.85
    });
    const siteDrivewayMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.7
    });
    const sitePavingMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.6
    });

    const houseGroup = new THREE.Group();

    // Helper to create box meshes
    function addBox(w, h, d, x, y, z, mat, castShadow = true, receiveShadow = true) {
        const geom = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        houseGroup.add(mesh);
        return mesh;
    }

    // Site Base
    addBox(32, 0.6, 26, 0, -0.6, 0, sitePavingMat, false, true);
    // Green Lawn front-left
    addBox(14, 0.2, 10, -7, 0, 7, siteLawnMat, false, true);
    // Driveway right
    addBox(10, 0.15, 24, 9, 0, 0, siteDrivewayMat, false, true);

    // Ground Floor: Main Living volume (Travertine White)
    addBox(14, 4.2, 12, -4, 0, -1, whiteTravertine);

    // Ground Floor: Timber Accent entrance volume
    addBox(4.5, 4.2, 8, 3.5, 0, -3, warmTimber);

    // Large Ground Floor Glazing Window
    const gw = addBox(7, 3.2, 0.2, -4.5, 0.5, 5.05, architecturalGlass, false, false);
    // Dark window frame
    addBox(7.2, 0.15, 0.3, -4.5, 0.45, 5.05, darkMullion, false, false);
    addBox(7.2, 0.15, 0.3, -4.5, 3.75, 5.05, darkMullion, false, false);

    // First Floor: Cantilevered Master Suite (Charcoal Slate)
    // Projecting forward by 2m for classic architectural massing
    addBox(13, 3.8, 10, -2.5, 4.2, 1, charcoalSlate);

    // First floor panoramic window
    addBox(6.5, 2.6, 0.2, -3.5, 4.8, 6.05, architecturalGlass, false, false);
    addBox(6.7, 0.12, 0.3, -3.5, 4.75, 6.05, darkMullion, false, false);
    addBox(6.7, 0.12, 0.3, -3.5, 7.42, 6.05, darkMullion, false, false);

    // Glass Balcony with Metal Railing
    addBox(5, 1.1, 2.5, 3.5, 4.2, 5, architecturalGlass, false, false);
    addBox(5.1, 0.08, 0.08, 3.5, 5.3, 6.25, darkMullion, false, false);

    // Roof Slab with clean overhang
    addBox(14.5, 0.4, 11.5, -2.5, 8.0, 1, whiteTravertine);

    // Parapet roof rim
    addBox(14.5, 0.5, 0.2, -2.5, 8.4, 6.65, charcoalSlate);
    addBox(14.5, 0.5, 0.2, -2.5, 8.4, -4.65, charcoalSlate);

    // Boundary Wall with gate opening
    addBox(31.5, 1.2, 0.3, 0, 0, 12.8, whiteTravertine);
    addBox(0.3, 1.2, 25.5, -15.8, 0, 0, whiteTravertine);

    scene.add(houseGroup);

    // Center model at origin
    houseGroup.position.set(0, 0, 0);

    // 5. Resize Handling
    function onResize() {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // 6. Interaction pauses auto-rotate
    container.addEventListener('pointerdown', () => {
        if (controls) controls.autoRotate = false;
    });

    // 7. Render Animation Loop
    let animId = null;
    function animate() {
        animId = requestAnimationFrame(animate);
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
    animate();
});
