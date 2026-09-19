// HamaraGhar — Architectural 2D Plan Generator
// Generates realistic multi-floor room layouts, setbacks, doors, and windows based on requirements
const PlanGenerator = {
    generate(config, floor = 0, variant = 0) {
        config = config || {};
        const plotWidth = Math.max(20, Number(config.plotWidth || config.plot_width) || 40);
        const plotLength = Math.max(25, Number(config.plotLength || config.plot_length) || 50);
        const bhk = Math.max(1, Number(config.bedrooms || config.bhk) || 3);
        const bathrooms = Math.max(1, Number(config.bathrooms) || 2);
        const features = Array.isArray(config.features) ? config.features : ['Parking', 'Balcony', 'Garden', 'Compound Wall', 'Pooja Room'];
        const style = config.style || 'Modern';

        // Setbacks: Front 5ft, Sides 3ft each, Rear 4ft
        const setbackFront = 5;
        const setbackRear = 4;
        const setbackSide = 3;

        const buildWidth = Math.max(14, plotWidth - setbackSide * 2);
        const buildLength = Math.max(16, plotLength - setbackFront - setbackRear);
        const startX = setbackSide;
        const startY = setbackFront;

        const rooms = [];
        const doors = [];
        const windows = [];

        // Colors per zone (Blueprint theme)
        const COLORS = {
            living: '#1e3a5f',
            masterBed: '#0d9488',
            bedroom: '#0284c7',
            kitchen: '#d97706',
            bath: '#475569',
            pooja: '#7c3aed',
            parking: '#334155',
            balcony: '#059669',
            corridor: '#1e293b'
        };

        if (floor === 0) {
            // --- GROUND FLOOR ---
            // Front section: Living Room + optional Parking/Porch
            let livingWidth = buildWidth;
            let livingLength = Math.round(buildLength * 0.38);

            if (features.includes('Parking') && buildWidth >= 24) {
                const parkingW = Math.round(buildWidth * 0.38);
                rooms.push({
                    type: 'parking',
                    name: 'Car Porch',
                    x: startX,
                    y: startY,
                    width: parkingW,
                    height: livingLength,
                    color: COLORS.parking,
                    floorName: 'Stone Pavers'
                });

                rooms.push({
                    type: 'living',
                    name: 'Living Room',
                    x: startX + parkingW,
                    y: startY,
                    width: buildWidth - parkingW,
                    height: livingLength,
                    color: COLORS.living,
                    floorName: 'Vitrified Tiles'
                });
            } else {
                rooms.push({
                    type: 'living',
                    name: 'Living Room & Foyer',
                    x: startX,
                    y: startY,
                    width: buildWidth,
                    height: livingLength,
                    color: COLORS.living,
                    floorName: 'Italian Vitrified Tiles'
                });
            }

            // Middle section: Dining & Kitchen (left) + Master Bedroom or Guest Bed (right)
            const midY = startY + livingLength;
            const midLength = Math.round(buildLength * 0.34);
            const midSplit = Math.round(buildWidth * 0.46);

            rooms.push({
                type: 'kitchen',
                name: 'Kitchen & Dining',
                x: startX,
                y: midY,
                width: midSplit,
                height: midLength,
                color: COLORS.kitchen,
                floorName: 'Anti-Skid Ceramic Tiles'
            });

            if (features.includes('Pooja Room') && buildWidth >= 20) {
                const poojaW = Math.min(6, Math.round(midSplit * 0.35));
                const poojaL = Math.min(6, Math.round(midLength * 0.45));
                rooms.push({
                    type: 'pooja',
                    name: 'Pooja',
                    x: startX + midSplit - poojaW,
                    y: midY + midLength - poojaL,
                    width: poojaW,
                    height: poojaL,
                    color: COLORS.pooja,
                    floorName: 'White Marble'
                });
            }

            const bed1W = buildWidth - midSplit;
            rooms.push({
                type: 'masterBed',
                name: bhk > 1 ? 'Master Bedroom' : 'Bedroom',
                x: startX + midSplit,
                y: midY,
                width: bed1W,
                height: midLength,
                color: COLORS.masterBed,
                floorName: 'Wooden Finish Tiles'
            });

            // Rear section: Common Bath, Utility, and extra Bedroom if single floor
            const rearY = midY + midLength;
            const rearLength = Math.max(8, buildLength - (livingLength + midLength));
            const bathW = Math.min(8, Math.round(buildWidth * 0.28));

            rooms.push({
                type: 'bath',
                name: 'Common Bath',
                x: startX,
                y: rearY,
                width: bathW,
                height: rearLength,
                color: COLORS.bath,
                floorName: 'Ceramic Tiles'
            });

            const remainingRearW = buildWidth - bathW;
            if (bhk >= 3 && floor === 0 && Number(config.floors) === 1) {
                rooms.push({
                    type: 'bedroom',
                    name: 'Bedroom 2',
                    x: startX + bathW,
                    y: rearY,
                    width: remainingRearW,
                    height: rearLength,
                    color: COLORS.bedroom,
                    floorName: 'Vitrified Tiles'
                });
            } else {
                rooms.push({
                    type: 'corridor',
                    name: 'Utility & Rear Sit-Out',
                    x: startX + bathW,
                    y: rearY,
                    width: remainingRearW,
                    height: rearLength,
                    color: COLORS.corridor,
                    floorName: 'Granite Flooring'
                });
            }

        } else {
            // --- FIRST FLOOR ---
            const familyL = Math.round(buildLength * 0.35);
            const frontSplit = Math.round(buildWidth * 0.55);

            rooms.push({
                type: 'living',
                name: 'Family Lounge',
                x: startX,
                y: startY,
                width: frontSplit,
                height: familyL,
                color: COLORS.living,
                floorName: 'Vitrified Tiles'
            });

            rooms.push({
                type: 'balcony',
                name: 'Open Balcony',
                x: startX + frontSplit,
                y: startY,
                width: buildWidth - frontSplit,
                height: familyL,
                color: COLORS.balcony,
                floorName: 'Weather-proof Stone'
            });

            const midY = startY + familyL;
            const midL = Math.round(buildLength * 0.38);
            const halfW = Math.round(buildWidth * 0.5);

            rooms.push({
                type: 'bedroom',
                name: 'Bedroom 2 (Guest)',
                x: startX,
                y: midY,
                width: halfW,
                height: midL,
                color: COLORS.bedroom,
                floorName: 'Vitrified Tiles'
            });

            rooms.push({
                type: 'bedroom',
                name: 'Bedroom 3 (Kids)',
                x: startX + halfW,
                y: midY,
                width: buildWidth - halfW,
                height: midL,
                color: COLORS.bedroom,
                floorName: 'Wooden Flooring'
            });

            const rearY = midY + midL;
            const rearL = Math.max(8, buildLength - (familyL + midL));
            rooms.push({
                type: 'bath',
                name: 'Upper Bath & Terrace Access',
                x: startX,
                y: rearY,
                width: buildWidth,
                height: rearL,
                color: COLORS.bath,
                floorName: 'Anti-Skid Tiles'
            });
        }

        // Generate perimeter doors & windows
        rooms.forEach((r, idx) => {
            // Perimeter windows on front and back
            if (r.y === startY) {
                windows.push({ x: r.x + r.width * 0.4, y: r.y, width: 4, wall: 'north' });
            }
            if (Math.abs((r.y + r.height) - (startY + buildLength)) < 1) {
                windows.push({ x: r.x + r.width * 0.4, y: r.y + r.height, width: 4, wall: 'south' });
            }
            // Side windows
            if (r.x === startX) {
                windows.push({ x: r.x, y: r.y + r.height * 0.35, width: 3.5, wall: 'west' });
            }
            if (Math.abs((r.x + r.width) - (startX + buildWidth)) < 1) {
                windows.push({ x: r.x + r.width, y: r.y + r.height * 0.35, width: 3.5, wall: 'east' });
            }
            // Doors
            doors.push({ x: r.x + 2, y: r.y + r.height, width: 3, swing: 'inward' });
        });

        const totalCarpet = rooms.reduce((acc, r) => acc + (r.width * r.height), 0);
        const builtup = Math.round(buildWidth * buildLength);

        return {
            rooms: rooms,
            doors: doors,
            windows: windows,
            setbacks: { front: setbackFront, rear: setbackRear, side: setbackSide },
            dimensions: { length: plotLength, width: plotWidth, buildLength, buildWidth },
            carpetArea: Math.round(totalCarpet),
            builtupArea: builtup,
            efficiency: Math.round((totalCarpet / builtup) * 100)
        };
    }
};

window.PlanGenerator = PlanGenerator;
