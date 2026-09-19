// =========================================================================
// HamaraGhar — Architectural Hero 3D Scene Controller
// Renders a modern architectural residence with realistic materials,
// shadows, cantilevered masses, glass balconies, and interactive orbit.
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const heroViewport = document.getElementById('heroScene');
    if (!heroViewport) return;

    let rotX = -18;
    let rotY = 32;
    let zoom = 1400;
    let isDragging = false;
    let lastX = 0, lastY = 0;
    let autoRotate = true;

    // Create 3D Container
    heroViewport.style.perspective = ${zoom}px;
    heroViewport.style.overflow = 'hidden';

    const stage = document.createElement('div');
    stage.className = 'hero-3d-stage';
    heroViewport.appendChild(stage);

    function updateStage() {
        stage.style.transform = 	ranslate(-50%, -46%) rotateX(deg) rotateY(deg);
    }
    updateStage();

    // Create Architectural Villa Elements
    function createBox(w, h, d, x, y, z, bg, border, extraClass = '') {
        const box = document.createElement('div');
        box.className = rch-cuboid ;
        box.style.width = ${w}px;
        box.style.height = ${h}px;
        box.style.transform = 	ranslate3d(px, px, px);

        const faces = [
            { name: 'front', transform: 	ranslateZ(px), w: w, h: h },
            { name: 'back', transform: 
otateY(180deg) translateZ(px), w: w, h: h },
            { name: 'right', transform: 
otateY(90deg) translateZ(px), w: d, h: h },
            { name: 'left', transform: 
otateY(-90deg) translateZ(px), w: d, h: h },
            { name: 'top', transform: 
otateX(90deg) translateZ(px), w: w, h: d },
            { name: 'bottom', transform: 
otateX(-90deg) translateZ(px), w: w, h: d }
        ];

        faces.forEach(f => {
            const face = document.createElement('div');
            face.className = rch-face face-;
            face.style.width = ${f.w}px;
            face.style.height = ${f.h}px;
            face.style.backgroundColor = bg;
            if (border) face.style.border = border;
            face.style.transform = f.transform;
            box.appendChild(face);
        });

        stage.appendChild(box);
        return box;
    }

    // 1. Land & Site Platform (Turf + Paved Driveway)
    createBox(340, 8, 300, -170, 70, -150, '#e2e8f0', '1px solid #cbd5e1', 'site-platform');
    // Green Turf
    createBox(200, 4, 180, -160, 66, -140, '#86efac', 'none', 'site-lawn');
    // Paved Car Porch
    createBox(120, 6, 260, 40, 67, -130, '#94a3b8', '1px solid #64748b', 'site-driveway');

    // 2. Ground Floor Main Volume (Living & Dining) - Off-white travertine
    createBox(180, 70, 140, -110, -5, -70, '#f8fafc', '1px solid #e2e8f0', 'ground-mass');
    
    // Timber feature accent wall on ground floor
    createBox(40, 68, 142, 65, -4, -71, '#9a3412', '1px solid #7c2d12', 'timber-accent');

    // Ground Floor Large Glazed Windows
    const gWindow = document.createElement('div');
    gWindow.className = 'arch-glazing ground-glazing';
    gWindow.style.transform = 'translate3d(-80px, 15px, 72px)';
    stage.appendChild(gWindow);

    // 3. First Floor Cantilevered Master Suite (Charcoal + Wood)
    createBox(160, 65, 120, -70, -75, -50, '#334155', '1px solid #1e293b', 'first-floor-mass');

    // First floor modern panoramic window
    const fWindow = document.createElement('div');
    fWindow.className = 'arch-glazing first-glazing';
    fWindow.style.transform = 'translate3d(-50px, -60px, 72px)';
    stage.appendChild(fWindow);

    // 4. Cantilevered Glass Balcony with Metal Handrail
    createBox(90, 24, 40, -60, -34, 75, 'rgba(2, 132, 199, 0.25)', '1px solid rgba(2, 132, 199, 0.6)', 'glass-balcony');

    // 5. Extended Minimalist RCC Flat Roof with Soffit Overhang
    createBox(180, 8, 140, -80, -83, -60, '#0f172a', '1px solid #334155', 'roof-slab');

    // 6. Perimeter Modern Architectural Boundary Wall
    createBox(336, 18, 4, -168, 52, 148, '#cbd5e1', '1px solid #94a3b8');
    createBox(4, 18, 296, -168, 52, -148, '#cbd5e1', '1px solid #94a3b8');

    // Interactive Drag & Orbit
    heroViewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        autoRotate = false;
        lastX = e.clientX;
        lastY = e.clientY;
        heroViewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        heroViewport.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        rotY += dx * 0.4;
        rotX -= dy * 0.4;
        rotX = Math.max(-55, Math.min(10, rotX));
        updateStage();
    });

    // Gentle Auto-Rotation
    function animate() {
        if (autoRotate) {
            rotY += 0.15;
            updateStage();
        }
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
});
