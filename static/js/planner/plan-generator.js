// HamaraGhar — Architectural 2D Plan Generator
// Deterministic, constraint-aware CAD layout generation based on plot boundaries, BHK, floors, amenities, and Vastu zoning.

const PlanGenerator = {
    // Architectural Palette
    COLORS: {
        living: '#1e3a5f',
        masterBed: '#0d9488',
        bedroom: '#0284c7',
        kitchen: '#d97706',
        bath: '#475569',
        pooja: '#7c3aed',
        parking: '#334155',
        balcony: '#059669',
        corridor: '#1e293b',
        study: '#4338ca'
    },

    VARIANT_NAMES: [
        'Vastu-Aligned Classic',
        'Modern Open-Plan Living',
        'Linear High-Efficiency Circulation'
    ],

    generate(config, floor = 0, variant = 0) {
        config = config || {};
        const plotWidth = Math.max(20, Number(config.plotWidth || config.plot_width) || 40);
        const plotLength = Math.max(25, Number(config.plotLength || config.plot_length) || 50);
        const bhk = Math.max(1, Number(config.bedrooms || config.bhk) || 3);
        const bathrooms = Math.max(1, Number(config.bathrooms) || 2);
        const totalFloors = Math.max(1, Number(config.floors) || 1);
        const features = Array.isArray(config.features) ? config.features : ['Parking', 'Balcony', 'Pooja Room', 'Utility'];
        const style = config.style || 'Modern';

        floor = Number(floor) || 0;
        variant = (Number(variant) || 0) % 3;

        // Calculate setbacks dynamically per National Building Code / Municipal bye-laws
        const setbackFront = Math.round(Math.max(4.0, Math.min(8.0, plotLength * 0.10)) * 10) / 10;
        const setbackRear = Math.round(Math.max(3.0, Math.min(6.0, plotLength * 0.08)) * 10) / 10;
        const setbackSide = Math.round(Math.max(2.5, Math.min(5.0, plotWidth * 0.08)) * 10) / 10;

        const buildWidth = Math.round(Math.max(14.0, plotWidth - setbackSide * 2) * 10) / 10;
        const buildLength = Math.round(Math.max(16.0, plotLength - setbackFront - setbackRear) * 10) / 10;
        const startX = setbackSide;
        const startY = setbackFront;

        const rooms = [];
        const doors = [];
        const windows = [];

        if (floor === 0) {
            // ==========================================
            // GROUND FLOOR
            // ==========================================
            const hasParking = (features.includes('Parking') || features.includes('Car Porch')) && buildWidth >= 22.0;

            if (variant === 0) {
                // Variant 0: Vastu-Aligned Classic
                // Front zone: Living + optional Car Porch
                const frontLen = Math.round(buildLength * 0.38 * 10) / 10;
                if (hasParking) {
                    const parkW = Math.round(buildWidth * 0.38 * 10) / 10;
                    rooms.push({
                        id: 'g_park',
                        name: 'Car Porch',
                        type: 'parking',
                        zone: 'service',
                        x: startX,
                        y: startY,
                        width: parkW,
                        height: frontLen,
                        color: this.COLORS.parking,
                        floorName: 'Heavy Duty Pavers'
                    });
                    const livW = Math.round((buildWidth - parkW) * 10) / 10;
                    rooms.push({
                        id: 'g_living',
                        name: 'Living & Foyer',
                        type: 'living',
                        zone: 'public',
                        x: Math.round((startX + parkW) * 10) / 10,
                        y: startY,
                        width: livW,
                        height: frontLen,
                        color: this.COLORS.living,
                        floorName: 'Vitrified Tiles'
                    });
                } else {
                    rooms.push({
                        id: 'g_living',
                        name: 'Living & Entrance Foyer',
                        type: 'living',
                        zone: 'public',
                        x: startX,
                        y: startY,
                        width: buildWidth,
                        height: frontLen,
                        color: this.COLORS.living,
                        floorName: 'Italian Marble Tiles'
                    });
                }

                // Mid zone: Kitchen & Dining (East/SE) + Bedroom / Guest Bed (West/SW)
                const midY = Math.round((startY + frontLen) * 10) / 10;
                const midLen = Math.round(buildLength * 0.34 * 10) / 10;
                const midSplit = Math.round(buildWidth * 0.48 * 10) / 10;

                // Pooja room option (Ishanya zone)
                const hasPooja = (features.includes('Pooja Room') || features.includes('Pooja')) && buildWidth >= 20.0;
                if (hasPooja) {
                    const poojaW = Math.round(Math.min(6.0, midSplit * 0.35) * 10) / 10;
                    const poojaL = Math.round(Math.min(6.0, midLen * 0.40) * 10) / 10;
                    rooms.push({
                        id: 'g_pooja',
                        name: 'Pooja Mandir',
                        type: 'pooja',
                        zone: 'public',
                        x: Math.round((startX + midSplit - poojaW) * 10) / 10,
                        y: midY,
                        width: poojaW,
                        height: poojaL,
                        color: this.COLORS.pooja,
                        floorName: 'White Makrana Marble'
                    });
                    const kitLen = Math.round((midLen - poojaL) * 10) / 10;
                    rooms.push({
                        id: 'g_kitchen',
                        name: 'Modular Kitchen & Dining',
                        type: 'kitchen',
                        zone: 'service',
                        x: startX,
                        y: Math.round((midY + poojaL) * 10) / 10,
                        width: midSplit,
                        height: kitLen,
                        color: this.COLORS.kitchen,
                        floorName: 'Anti-Skid Vitrified'
                    });
                } else {
                    rooms.push({
                        id: 'g_kitchen',
                        name: 'Kitchen & Dining Space',
                        type: 'kitchen',
                        zone: 'service',
                        x: startX,
                        y: midY,
                        width: midSplit,
                        height: midLen,
                        color: this.COLORS.kitchen,
                        floorName: 'Anti-Skid Vitrified'
                    });
                }

                const bed1W = Math.round((buildWidth - midSplit) * 10) / 10;
                const bed1Name = totalFloors === 1 ? 'Master Bedroom (SW)' : 'Guest / Parents Bedroom';
                rooms.push({
                    id: 'g_bed1',
                    name: bed1Name,
                    type: totalFloors === 1 ? 'masterBed' : 'bedroom',
                    zone: 'private',
                    x: Math.round((startX + midSplit) * 10) / 10,
                    y: midY,
                    width: bed1W,
                    height: midLen,
                    color: totalFloors === 1 ? this.COLORS.masterBed : this.COLORS.bedroom,
                    floorName: 'Wooden Textured Tiles'
                });

                // Rear zone: Bathrooms, Utility & Bedroom if single floor multi-BHK
                const rearY = Math.round((midY + midLen) * 10) / 10;
                const rearLen = Math.round(Math.max(7.0, buildLength - (frontLen + midLen)) * 10) / 10;
                const bathW = Math.round(Math.min(8.0, Math.max(5.0, buildWidth * 0.28)) * 10) / 10;

                rooms.push({
                    id: 'g_bath',
                    name: 'Common Bath & Toilet',
                    type: 'bath',
                    zone: 'wet',
                    x: startX,
                    y: rearY,
                    width: bathW,
                    height: rearLen,
                    color: this.COLORS.bath,
                    floorName: 'Ceramic Matte'
                });

                const remW = Math.round((buildWidth - bathW) * 10) / 10;
                if (totalFloors === 1 && bhk >= 2) {
                    rooms.push({
                        id: 'g_bed2',
                        name: 'Bedroom 2',
                        type: 'bedroom',
                        zone: 'private',
                        x: Math.round((startX + bathW) * 10) / 10,
                        y: rearY,
                        width: remW,
                        height: rearLen,
                        color: this.COLORS.bedroom,
                        floorName: 'Vitrified Tiles'
                    });
                } else {
                    const utilW = Math.round(remW * 0.45 * 10) / 10;
                    const sitoutW = Math.round((remW - utilW) * 10) / 10;
                    rooms.push({
                        id: 'g_util',
                        name: 'Utility & Wash Area',
                        type: 'corridor',
                        zone: 'service',
                        x: Math.round((startX + bathW) * 10) / 10,
                        y: rearY,
                        width: utilW,
                        height: rearLen,
                        color: this.COLORS.corridor,
                        floorName: 'Granite Slabs'
                    });
                    rooms.push({
                        id: 'g_sitout',
                        name: 'Rear Courtyard / Sit-Out',
                        type: 'balcony',
                        zone: 'public',
                        x: Math.round((startX + bathW + utilW) * 10) / 10,
                        y: rearY,
                        width: sitoutW,
                        height: rearLen,
                        color: this.COLORS.balcony,
                        floorName: 'Stone Decking'
                    });
                }

            } else if (variant === 1) {
                // Variant 1: Modern Open-Concept
                const frontLen = Math.round(buildLength * 0.42 * 10) / 10;
                const kitW = Math.round(buildWidth * 0.38 * 10) / 10;
                const livW = Math.round((buildWidth - kitW) * 10) / 10;

                rooms.push({
                    id: 'g_greatroom',
                    name: 'Grand Living & Lounge',
                    type: 'living',
                    zone: 'public',
                    x: startX,
                    y: startY,
                    width: livW,
                    height: frontLen,
                    color: this.COLORS.living,
                    floorName: 'Polished Italian Marble'
                });
                rooms.push({
                    id: 'g_island_kitchen',
                    name: 'Open Island Kitchen & Pantry',
                    type: 'kitchen',
                    zone: 'service',
                    x: Math.round((startX + livW) * 10) / 10,
                    y: startY,
                    width: kitW,
                    height: frontLen,
                    color: this.COLORS.kitchen,
                    floorName: 'Quartz Finish Flooring'
                });

                // Mid / Rear zones
                const rearY = Math.round((startY + frontLen) * 10) / 10;
                const rearLen = Math.round((buildLength - frontLen) * 10) / 10;
                const bedW = Math.round(buildWidth * 0.58 * 10) / 10;
                const bathW = Math.round((buildWidth - bedW) * 10) / 10;

                rooms.push({
                    id: 'g_ground_suite',
                    name: 'Ground Floor Suite',
                    type: 'masterBed',
                    zone: 'private',
                    x: startX,
                    y: rearY,
                    width: bedW,
                    height: rearLen,
                    color: this.COLORS.masterBed,
                    floorName: 'Engineered Hardwood'
                });
                const bathHalf = Math.round(rearLen * 0.5 * 10) / 10;
                rooms.push({
                    id: 'g_suite_bath',
                    name: 'Ensuite Bath',
                    type: 'bath',
                    zone: 'wet',
                    x: Math.round((startX + bedW) * 10) / 10,
                    y: rearY,
                    width: bathW,
                    height: bathHalf,
                    color: this.COLORS.bath,
                    floorName: 'Porcelain Tile'
                });
                rooms.push({
                    id: 'g_powder_room',
                    name: 'Powder Room & Laundry',
                    type: 'corridor',
                    zone: 'service',
                    x: Math.round((startX + bedW) * 10) / 10,
                    y: Math.round((rearY + bathHalf) * 10) / 10,
                    width: bathW,
                    height: Math.round((rearLen - bathHalf) * 10) / 10,
                    color: this.COLORS.corridor,
                    floorName: 'Ceramic Tile'
                });

            } else {
                // Variant 2: Linear Efficient Circulation
                const frontLen = Math.round(buildLength * 0.32 * 10) / 10;
                rooms.push({
                    id: 'g_linear_living',
                    name: 'Formal Living Room',
                    type: 'living',
                    zone: 'public',
                    x: startX,
                    y: startY,
                    width: buildWidth,
                    height: frontLen,
                    color: this.COLORS.living,
                    floorName: 'Vitrified Tiles'
                });

                const midY = Math.round((startY + frontLen) * 10) / 10;
                const midLen = Math.round(buildLength * 0.38 * 10) / 10;
                const colW = Math.round((buildWidth / 3.0) * 10) / 10;

                rooms.push({
                    id: 'g_dining_hall',
                    name: 'Dining Hall',
                    type: 'living',
                    zone: 'public',
                    x: startX,
                    y: midY,
                    width: colW,
                    height: midLen,
                    color: this.COLORS.living,
                    floorName: 'Vitrified Tiles'
                });
                rooms.push({
                    id: 'g_compact_kitchen',
                    name: 'Kitchen',
                    type: 'kitchen',
                    zone: 'service',
                    x: Math.round((startX + colW) * 10) / 10,
                    y: midY,
                    width: colW,
                    height: midLen,
                    color: this.COLORS.kitchen,
                    floorName: 'Anti-Skid Tiles'
                });
                rooms.push({
                    id: 'g_guest_bed',
                    name: 'Bedroom (Guest)',
                    type: 'bedroom',
                    zone: 'private',
                    x: Math.round((startX + colW * 2) * 10) / 10,
                    y: midY,
                    width: Math.round((buildWidth - colW * 2) * 10) / 10,
                    height: midLen,
                    color: this.COLORS.bedroom,
                    floorName: 'Wooden Flooring'
                });

                const rearY = Math.round((midY + midLen) * 10) / 10;
                const rearLen = Math.round(Math.max(6.0, buildLength - (frontLen + midLen)) * 10) / 10;
                const halfW = Math.round(buildWidth * 0.5 * 10) / 10;
                rooms.push({
                    id: 'g_bath_rear',
                    name: 'Bath & Washroom',
                    type: 'bath',
                    zone: 'wet',
                    x: startX,
                    y: rearY,
                    width: halfW,
                    height: rearLen,
                    color: this.COLORS.bath,
                    floorName: 'Anti-Skid Tiles'
                });
                rooms.push({
                    id: 'g_rear_veranda',
                    name: 'Verandah & Storage',
                    type: 'corridor',
                    zone: 'service',
                    x: Math.round((startX + halfW) * 10) / 10,
                    y: rearY,
                    width: Math.round((buildWidth - halfW) * 10) / 10,
                    height: rearLen,
                    color: this.COLORS.corridor,
                    floorName: 'Kota Stone'
                });
            }

        } else {
            // ==========================================
            // FIRST FLOOR (Private Retreat & Family Suite)
            // ==========================================
            const frontLen = Math.round(buildLength * 0.35 * 10) / 10;
            const balconyW = Math.round(buildWidth * 0.40 * 10) / 10;
            const loungeW = Math.round((buildWidth - balconyW) * 10) / 10;

            rooms.push({
                id: 'f1_lounge',
                name: 'Upper Family Lounge',
                type: 'living',
                zone: 'public',
                x: startX,
                y: startY,
                width: loungeW,
                height: frontLen,
                color: this.COLORS.living,
                floorName: 'Vitrified Tiles'
            });
            rooms.push({
                id: 'f1_balcony',
                name: 'Front Sunset Balcony',
                type: 'balcony',
                zone: 'public',
                x: Math.round((startX + loungeW) * 10) / 10,
                y: startY,
                width: balconyW,
                height: frontLen,
                color: this.COLORS.balcony,
                floorName: 'Weatherproof Deck Tiles'
            });

            // Mid zone: Master Suite with Walk-In Dress & Luxury Ensuite
            const midY = Math.round((startY + frontLen) * 10) / 10;
            const midLen = Math.round(buildLength * 0.40 * 10) / 10;
            const masterW = Math.round(buildWidth * 0.60 * 10) / 10;
            const bathW = Math.round((buildWidth - masterW) * 10) / 10;

            rooms.push({
                id: 'f1_master_suite',
                name: 'Master Bedroom Suite',
                type: 'masterBed',
                zone: 'private',
                x: startX,
                y: midY,
                width: masterW,
                height: midLen,
                color: this.COLORS.masterBed,
                floorName: 'Solid Wood Parquet'
            });

            const dressLen = Math.round(midLen * 0.45 * 10) / 10;
            rooms.push({
                id: 'f1_master_bath',
                name: 'Master Ensuite Bath',
                type: 'bath',
                zone: 'wet',
                x: Math.round((startX + masterW) * 10) / 10,
                y: midY,
                width: bathW,
                height: dressLen,
                color: this.COLORS.bath,
                floorName: 'Italian Porcelain Tiles'
            });
            rooms.push({
                id: 'f1_walkin_dress',
                name: 'Walk-In Wardrobe / Dress',
                type: 'corridor',
                zone: 'private',
                x: Math.round((startX + masterW) * 10) / 10,
                y: Math.round((midY + dressLen) * 10) / 10,
                width: bathW,
                height: Math.round((midLen - dressLen) * 10) / 10,
                color: this.COLORS.corridor,
                floorName: 'Hardwood Flooring'
            });

            // Rear zone: Bedroom 2 (Kids) and optional Bedroom 3 or Study
            const rearY = Math.round((midY + midLen) * 10) / 10;
            const rearLen = Math.round(Math.max(7.0, buildLength - (frontLen + midLen)) * 10) / 10;

            if (bhk >= 4 || features.includes('Study Room') || features.includes('Home Office')) {
                const bed2W = Math.round(buildWidth * 0.58 * 10) / 10;
                const studyW = Math.round((buildWidth - bed2W) * 10) / 10;
                rooms.push({
                    id: 'f1_bed2',
                    name: 'Bedroom 2 (Children)',
                    type: 'bedroom',
                    zone: 'private',
                    x: startX,
                    y: rearY,
                    width: bed2W,
                    height: rearLen,
                    color: this.COLORS.bedroom,
                    floorName: 'Laminated Wood Flooring'
                });
                rooms.push({
                    id: 'f1_study',
                    name: 'Study / Home Office',
                    type: 'study',
                    zone: 'private',
                    x: Math.round((startX + bed2W) * 10) / 10,
                    y: rearY,
                    width: studyW,
                    height: rearLen,
                    color: this.COLORS.study,
                    floorName: 'Acoustic Hardwood'
                });
            } else {
                rooms.push({
                    id: 'f1_bed2',
                    name: 'Bedroom 2 (Kids Room)',
                    type: 'bedroom',
                    zone: 'private',
                    x: startX,
                    y: rearY,
                    width: buildWidth,
                    height: rearLen,
                    color: this.COLORS.bedroom,
                    floorName: 'Laminated Wood Flooring'
                });
            }
        }

        // Calculate dynamic dimensions, doors & window openings
        let totalCarpet = 0;
        rooms.forEach((r) => {
            r.width = Math.round(r.width * 10) / 10;
            r.height = Math.round(r.height * 10) / 10;
            r.area = Math.round(r.width * r.height);
            totalCarpet += r.area;

            // Perimeter windows along outer walls
            if (Math.abs(r.y - startY) < 0.2) {
                windows.push({ x: Math.round((r.x + r.width * 0.5) * 10) / 10, y: r.y, width: 4.0, wall: 'north' });
            }
            if (Math.abs((r.y + r.height) - (startY + buildLength)) < 0.2) {
                windows.push({ x: Math.round((r.x + r.width * 0.5) * 10) / 10, y: Math.round((r.y + r.height) * 10) / 10, width: 4.0, wall: 'south' });
            }
            if (Math.abs(r.x - startX) < 0.2) {
                windows.push({ x: r.x, y: Math.round((r.y + r.height * 0.5) * 10) / 10, width: 3.5, wall: 'west' });
            }
            if (Math.abs((r.x + r.width) - (startX + buildWidth)) < 0.2) {
                windows.push({ x: Math.round((r.x + r.width) * 10) / 10, y: Math.round((r.y + r.height * 0.5) * 10) / 10, width: 3.5, wall: 'east' });
            }

            // Interior entry doors
            doors.push({ x: Math.round((r.x + 2.0) * 10) / 10, y: Math.round((r.y + r.height) * 10) / 10, width: 3.0, swing: 'inward' });
        });
        // Canonical wall boundaries
        const walls = [
            { id: 'wall_ext_north', x1: startX, y1: startY, x2: Math.round((startX + buildWidth) * 10) / 10, y2: startY, thickness: 0.75, type: 'exterior' },
            { id: 'wall_ext_south', x1: startX, y1: Math.round((startY + buildLength) * 10) / 10, x2: Math.round((startX + buildWidth) * 10) / 10, y2: Math.round((startY + buildLength) * 10) / 10, thickness: 0.75, type: 'exterior' },
            { id: 'wall_ext_west', x1: startX, y1: startY, x2: startX, y2: Math.round((startY + buildLength) * 10) / 10, thickness: 0.75, type: 'exterior' },
            { id: 'wall_ext_east', x1: Math.round((startX + buildWidth) * 10) / 10, y1: startY, x2: Math.round((startX + buildWidth) * 10) / 10, y2: Math.round((startY + buildLength) * 10) / 10, thickness: 0.75, type: 'exterior' }
        ];

        const builtup = Math.round(buildWidth * buildLength);
        const efficiency = builtup > 0 ? Math.round((totalCarpet / builtup) * 1000) / 10 : 0;

        return {
            floor: floor,
            floors: Array.from({ length: totalFloors }, (_, i) => i),
            variant: variant,
            variantName: this.VARIANT_NAMES[variant],
            rooms: rooms,
            walls: walls,
            doors: doors,
            windows: windows,
            setbacks: { front: setbackFront, rear: setbackRear, side: setbackSide },
            dimensions: { length: plotLength, width: plotWidth, buildLength, buildWidth },
            carpetArea: Math.round(totalCarpet),
            builtupArea: builtup,
            efficiency: efficiency,
            roomCount: rooms.length,
            doorCount: doors.length,
            windowCount: windows.length
        };
    }
};

window.PlanGenerator = PlanGenerator;
