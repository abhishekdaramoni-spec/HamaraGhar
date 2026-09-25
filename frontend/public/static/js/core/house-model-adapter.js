// =========================================================================
// HamaraGhar — HouseModel Adapter
// Converts existing hybrid floor-plan output and CAD generator data
// into the Canonical HouseModel (Single Source of Truth).
// =========================================================================

export const HouseModelAdapter = {
    /**
     * Converts a raw floor-plan payload (from /api/ml/hybrid-plan or PlanGenerator)
     * and project configuration into a complete Canonical HouseModel.
     */
    fromLegacyPlan(planData, config = {}) {
        if (!planData) {
            return window.createDefaultHouseModel ? window.createDefaultHouseModel() : {};
        }

        const dims = planData.dimensions || {};
        const plotWidth = Number(dims.width || config.plotWidth || config.plot_width || 40.0);
        const plotLength = Number(dims.length || config.plotLength || config.plot_length || 50.0);
        const plotArea = Math.round(plotWidth * plotLength);

        const setbacks = planData.setbacks || {};
        const setbackFront = Number(setbacks.front || 5.0);
        const setbackRear = Number(setbacks.rear || 4.0);
        const setbackSide = Number(setbacks.side || 3.0);

        const totalFloors = Math.max(1, Number(config.floors || (planData.floors ? planData.floors.length : 1)));
        const bhk = Number(config.bhk || config.bedrooms || 3);
        const projectName = config.projectName || config.name || 'Modern Residence';

        // 1. Build Base Model
        const model = {
            metadata: {
                id: `hg-proj-${Date.now()}`,
                name: projectName,
                client: config.clientName || 'Homeowner',
                variant: planData.variant || 0,
                variantName: planData.variantName || 'Vastu-Aligned Classic',
                units: 'ft',
                updatedAt: new Date().toISOString()
            },
            plot: {
                width: plotWidth,
                length: plotLength,
                area: plotArea,
                setbacks: {
                    front: setbackFront,
                    rear: setbackRear,
                    sideLeft: setbackSide,
                    sideRight: setbackSide
                },
                facing: config.facing || 'East'
            },
            floors: [],
            site: {
                hasCompoundWall: true,
                wallHeightFt: 5.0,
                hasGate: true,
                hasDriveway: true,
                hasGarden: true,
                drivewayWidthFt: Math.min(14.0, Math.max(10.0, plotWidth * 0.28)),
                trees: [
                    { id: 'tree-01', x: setbackSide * 0.5, y: plotLength - setbackRear * 0.5, radiusFt: 3.0 },
                    { id: 'tree-02', x: plotWidth - setbackSide * 0.5, y: plotLength - setbackRear * 0.5, radiusFt: 2.5 }
                ]
            },
            summary: {
                totalCarpetArea: Number(planData.carpetArea || 0),
                totalBuiltupArea: Number(planData.builtupArea || Math.round(plotWidth * plotLength * 0.72)),
                efficiencyPct: Number(planData.efficiency || 82.0),
                bedroomCount: bhk,
                bathroomCount: Number(config.bathrooms || 2),
                floorCount: totalFloors,
                parkingSlots: (config.features && config.features.includes('Parking')) ? 1 : 1,
                estimatedCostInr: Number(config.estimatedCost || 3840000),
                estimatedValuationInr: Number(config.estimatedValuation || 4800000)
            }
        };

        // 2. Generate Floor 0 (Ground Floor)
        const groundRooms = this._adaptRooms(planData.rooms || [], 0);
        const groundWalls = this._adaptWalls(planData.walls || [], groundRooms, dims, 0);
        const groundDoors = this._adaptDoors(planData.doors || [], groundRooms, 0);
        const groundWindows = this._adaptWindows(planData.windows || [], groundRooms, dims, 0);
        const groundStairs = this._adaptStairs(groundRooms, totalFloors, 0);
        const groundBalconies = this._adaptBalconies(groundRooms, 0);
        const groundFurniture = this._generateFurniture(groundRooms, 0);

        model.floors.push({
            id: 'floor-0',
            index: 0,
            name: 'Ground Floor',
            elevationFt: 0.0,
            heightFt: 10.0,
            slabThicknessFt: 0.75,
            rooms: groundRooms,
            walls: groundWalls,
            doors: groundDoors,
            windows: groundWindows,
            stairs: groundStairs,
            balconies: groundBalconies,
            furniture: groundFurniture
        });

        // 3. Generate Multi-Floor (Floor 1) if duplex/multi-story
        if (totalFloors > 1) {
            let f1Layout = null;
            if (window.PlanGenerator && typeof window.PlanGenerator.generate === 'function') {
                try {
                    f1Layout = window.PlanGenerator.generate(config, 1, planData.variant || 0);
                } catch (e) {
                    console.warn('Could not generate Floor 1 layout via PlanGenerator:', e);
                }
            }

            const rawF1Rooms = (f1Layout && f1Layout.rooms) ? f1Layout.rooms : this._synthesizeUpperFloorRooms(groundRooms, dims);
            const f1Rooms = this._adaptRooms(rawF1Rooms, 1);
            const f1Walls = this._adaptWalls((f1Layout && f1Layout.walls) ? f1Layout.walls : [], f1Rooms, dims, 1);
            const f1Doors = this._adaptDoors((f1Layout && f1Layout.doors) ? f1Layout.doors : [], f1Rooms, 1);
            const f1Windows = this._adaptWindows((f1Layout && f1Layout.windows) ? f1Layout.windows : [], f1Rooms, dims, 1);
            const f1Stairs = this._adaptStairs(f1Rooms, totalFloors, 1);
            const f1Balconies = this._adaptBalconies(f1Rooms, 1);
            const f1Furniture = this._generateFurniture(f1Rooms, 1);

            model.floors.push({
                id: 'floor-1',
                index: 1,
                name: 'First Floor',
                elevationFt: 10.0,
                heightFt: 10.0,
                slabThicknessFt: 0.75,
                rooms: f1Rooms,
                walls: f1Walls,
                doors: f1Doors,
                windows: f1Windows,
                stairs: f1Stairs,
                balconies: f1Balconies,
                furniture: f1Furniture
            });
        }

        return model;
    },

    _adaptRooms(rawRooms, floorIndex) {
        return rawRooms.map((r, idx) => {
            const rid = r.id ? `room-f${floorIndex}-${r.id}` : `room-f${floorIndex}-${idx + 1}`;
            const w = Number(r.width || 12.0);
            const h = Number(r.height || 12.0);
            const x = Number(r.x || 0.0);
            const y = Number(r.y || 0.0);
            const area = Number(r.area || Math.round(w * h));

            return {
                id: rid,
                legacyId: r.id || `r_${idx}`,
                name: r.name || 'Room',
                type: r.type || 'living',
                zone: r.zone || 'public',
                floorIndex: floorIndex,
                bounds: { x, y, width: w, height: h },
                areaSqFt: area,
                color: r.color || '#1e3a5f',
                floorMaterial: r.floorName || (r.type === 'bath' ? 'ceramic_tile' : r.type === 'masterBed' ? 'wood_parquet' : 'vitrified_tiles'),
                wallColor: '#f8fafc',
                ceilingHeightFt: 10.0
            };
        });
    },

    _adaptWalls(rawWalls, rooms, dims, floorIndex) {
        const walls = [];
        let wallCounter = 1;

        if (rawWalls && rawWalls.length > 0) {
            rawWalls.forEach(w => {
                walls.push({
                    id: `wall-f${floorIndex}-${w.id || wallCounter++}`,
                    start: { x: Number(w.x1), y: Number(w.y1) },
                    end: { x: Number(w.x2), y: Number(w.y2) },
                    thicknessFt: Number(w.thickness || (w.type === 'exterior' ? 0.75 : 0.38)),
                    heightFt: 10.0,
                    floorIndex: floorIndex,
                    type: w.type || 'interior',
                    material: w.type === 'exterior' ? 'brick' : 'white_plaster'
                });
            });
            return walls;
        }

        // Synthesize perimeter and interior partition walls from rooms if not provided
        if (rooms.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            rooms.forEach(r => {
                minX = Math.min(minX, r.bounds.x);
                minY = Math.min(minY, r.bounds.y);
                maxX = Math.max(maxX, r.bounds.x + r.bounds.width);
                maxY = Math.max(maxY, r.bounds.y + r.bounds.height);
            });

            // 4 Exterior perimeter walls
            walls.push({ id: `wall-f${floorIndex}-ext-north`, start: { x: minX, y: minY }, end: { x: maxX, y: minY }, thicknessFt: 0.75, heightFt: 10.0, floorIndex, type: 'exterior', material: 'brick' });
            walls.push({ id: `wall-f${floorIndex}-ext-south`, start: { x: minX, y: maxY }, end: { x: maxX, y: maxY }, thicknessFt: 0.75, heightFt: 10.0, floorIndex, type: 'exterior', material: 'brick' });
            walls.push({ id: `wall-f${floorIndex}-ext-west`, start: { x: minX, y: minY }, end: { x: minX, y: maxY }, thicknessFt: 0.75, heightFt: 10.0, floorIndex, type: 'exterior', material: 'brick' });
            walls.push({ id: `wall-f${floorIndex}-ext-east`, start: { x: maxX, y: minY }, end: { x: maxX, y: maxY }, thicknessFt: 0.75, heightFt: 10.0, floorIndex, type: 'exterior', material: 'brick' });

            // Interior walls derived from room boundaries
            rooms.forEach((r, idx) => {
                const rx = r.bounds.x;
                const ry = r.bounds.y;
                const rw = r.bounds.width;
                const rh = r.bounds.height;

                if (Math.abs((rx + rw) - maxX) > 0.3) {
                    walls.push({ id: `wall-f${floorIndex}-int-${wallCounter++}`, start: { x: rx + rw, y: ry }, end: { x: rx + rw, y: ry + rh }, thicknessFt: 0.38, heightFt: 10.0, floorIndex, type: 'interior', material: 'warm_plaster' });
                }
                if (Math.abs((ry + rh) - maxY) > 0.3) {
                    walls.push({ id: `wall-f${floorIndex}-int-${wallCounter++}`, start: { x: rx, y: ry + rh }, end: { x: rx + rw, y: ry + rh }, thicknessFt: 0.38, heightFt: 10.0, floorIndex, type: 'interior', material: 'warm_plaster' });
                }
            });
        }

        return walls;
    },

    _adaptDoors(rawDoors, rooms, floorIndex) {
        const doors = [];
        let counter = 1;

        if (rawDoors && rawDoors.length > 0) {
            rawDoors.forEach(d => {
                // Find associated room
                const assocRoom = rooms.find(r => 
                    d.x >= r.bounds.x - 0.5 && d.x <= r.bounds.x + r.bounds.width + 0.5 &&
                    d.y >= r.bounds.y - 0.5 && d.y <= r.bounds.y + r.bounds.height + 0.5
                );
                doors.push({
                    id: `door-f${floorIndex}-${counter++}`,
                    position: { x: Number(d.x), y: Number(d.y) },
                    widthFt: Number(d.width || 3.0),
                    heightFt: 7.0,
                    swing: d.swing || 'inward',
                    roomId: assocRoom ? assocRoom.id : null,
                    floorIndex: floorIndex,
                    orientation: (d.orientation || 'horizontal')
                });
            });
            return doors;
        }

        // Generate one canonical entrance door per room
        rooms.forEach(r => {
            if (r.type === 'balcony' || r.type === 'parking') return;
            doors.push({
                id: `door-f${floorIndex}-${counter++}`,
                position: { x: r.bounds.x + Math.min(2.5, r.bounds.width * 0.3), y: r.bounds.y + r.bounds.height },
                widthFt: 3.0,
                heightFt: 7.0,
                swing: 'inward',
                roomId: r.id,
                floorIndex: floorIndex,
                orientation: 'horizontal'
            });
        });

        return doors;
    },

    _adaptWindows(rawWindows, rooms, dims, floorIndex) {
        const windows = [];
        let counter = 1;

        if (rawWindows && rawWindows.length > 0) {
            rawWindows.forEach(w => {
                const assocRoom = rooms.find(r => 
                    w.x >= r.bounds.x - 0.5 && w.x <= r.bounds.x + r.bounds.width + 0.5 &&
                    w.y >= r.bounds.y - 0.5 && w.y <= r.bounds.y + r.bounds.height + 0.5
                );
                windows.push({
                    id: `window-f${floorIndex}-${counter++}`,
                    position: { x: Number(w.x), y: Number(w.y) },
                    widthFt: Number(w.width || 4.0),
                    heightFt: 4.5,
                    sillHeightFt: 3.0,
                    wall: w.wall || 'north',
                    roomId: assocRoom ? assocRoom.id : null,
                    floorIndex: floorIndex
                });
            });
            return windows;
        }

        // Generate outward-facing windows on room perimeters
        rooms.forEach(r => {
            if (r.type === 'bath') {
                windows.push({
                    id: `window-f${floorIndex}-${counter++}`,
                    position: { x: r.bounds.x + r.bounds.width * 0.5, y: r.bounds.y },
                    widthFt: 2.0,
                    heightFt: 2.0,
                    sillHeightFt: 6.0,
                    wall: 'north',
                    roomId: r.id,
                    floorIndex: floorIndex
                });
            } else if (r.type !== 'parking' && r.type !== 'corridor') {
                windows.push({
                    id: `window-f${floorIndex}-${counter++}`,
                    position: { x: r.bounds.x + r.bounds.width * 0.5, y: r.bounds.y },
                    widthFt: 4.0,
                    heightFt: 4.5,
                    sillHeightFt: 3.0,
                    wall: 'north',
                    roomId: r.id,
                    floorIndex: floorIndex
                });
            }
        });

        return windows;
    },

    _adaptStairs(rooms, totalFloors, floorIndex) {
        if (totalFloors <= 1) return [];
        // Place stairs connecting Ground and Upper floor in living or dedicated stair zone
        const hostRoom = rooms.find(r => r.type === 'living' || r.type === 'corridor') || rooms[0];
        if (!hostRoom) return [];

        return [{
            id: `stair-f${floorIndex}-01`,
            roomId: hostRoom.id,
            position: { x: hostRoom.bounds.x + hostRoom.bounds.width - 7.5, y: hostRoom.bounds.y + 1.5 },
            widthFt: 3.5,
            lengthFt: 9.0,
            stepCount: 16,
            treadDepthFt: 0.85,
            riserHeightFt: 0.625,
            direction: 'up',
            floorIndex: floorIndex
        }];
    },

    _adaptBalconies(rooms, floorIndex) {
        const balcRoom = rooms.find(r => r.type === 'balcony');
        if (!balcRoom) return [];

        return [{
            id: `balcony-f${floorIndex}-01`,
            roomId: balcRoom.id,
            bounds: { ...balcRoom.bounds },
            railingHeightFt: 3.5,
            floorIndex: floorIndex
        }];
    },

    _generateFurniture(rooms, floorIndex) {
        const furniture = [];
        let fId = 1;

        rooms.forEach(r => {
            const rx = r.bounds.x;
            const ry = r.bounds.y;
            const rw = r.bounds.width;
            const rh = r.bounds.height;

            if (r.type === 'masterBed' || r.type === 'bedroom') {
                // Bed centered against rear wall
                const bedW = 6.0;
                const bedL = 6.5;
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'bed',
                    name: 'Queen Bed',
                    roomId: r.id,
                    position: { x: rx + (rw - bedW) / 2, y: ry + 1.0 },
                    size: { width: bedW, length: bedL, height: 2.2 },
                    rotationDeg: 0
                });
                // Wardrobe against side wall
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'wardrobe',
                    name: 'Wardrobe Unit',
                    roomId: r.id,
                    position: { x: rx + 0.8, y: ry + rh - 2.5 },
                    size: { width: Math.min(5.5, rw * 0.4), length: 2.0, height: 7.0 },
                    rotationDeg: 0
                });
                // Nightstands
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'nightstand',
                    name: 'Side Table',
                    roomId: r.id,
                    position: { x: rx + (rw - bedW) / 2 - 2.0, y: ry + 1.0 },
                    size: { width: 1.5, length: 1.5, height: 1.8 },
                    rotationDeg: 0
                });
            } else if (r.type === 'living') {
                // Sofa & Coffee Table
                const sofaW = Math.min(7.0, rw * 0.55);
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'sofa',
                    name: 'Sectional Sofa',
                    roomId: r.id,
                    position: { x: rx + 2.0, y: ry + 2.0 },
                    size: { width: sofaW, length: 3.2, height: 2.8 },
                    rotationDeg: 0
                });
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'coffee_table',
                    name: 'Coffee Table',
                    roomId: r.id,
                    position: { x: rx + 2.5, y: ry + 6.0 },
                    size: { width: 3.5, length: 2.0, height: 1.4 },
                    rotationDeg: 0
                });
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'tv_unit',
                    name: 'Entertainment Credenza',
                    roomId: r.id,
                    position: { x: rx + rw - 2.0, y: ry + 2.5 },
                    size: { width: 1.6, length: 6.0, height: 2.0 },
                    rotationDeg: 90
                });
            } else if (r.type === 'kitchen') {
                // L-shaped Countertop
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'kitchen_counter',
                    name: 'Modular Granite Counter',
                    roomId: r.id,
                    position: { x: rx + 0.8, y: ry + 0.8 },
                    size: { width: rw - 1.6, length: 2.2, height: 2.8 },
                    rotationDeg: 0
                });
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'refrigerator',
                    name: 'Double Door Refrigerator',
                    roomId: r.id,
                    position: { x: rx + rw - 3.2, y: ry + rh - 3.2 },
                    size: { width: 2.5, length: 2.5, height: 6.0 },
                    rotationDeg: 0
                });
            } else if (r.type === 'dining') {
                // Dining Table with 6 chairs
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'dining_table',
                    name: '6-Seater Dining Table',
                    roomId: r.id,
                    position: { x: rx + (rw - 5.5) / 2, y: ry + (rh - 3.5) / 2 },
                    size: { width: 5.5, length: 3.5, height: 2.6 },
                    rotationDeg: 0
                });
            } else if (r.type === 'bath') {
                // Toilet & Basin
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'toilet',
                    name: 'Wall-Hung Commode',
                    roomId: r.id,
                    position: { x: rx + 1.2, y: ry + rh - 2.5 },
                    size: { width: 1.5, length: 2.2, height: 2.5 },
                    rotationDeg: 0
                });
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'wash_basin',
                    name: 'Vanity Counter Basin',
                    roomId: r.id,
                    position: { x: rx + rw - 2.5, y: ry + 1.2 },
                    size: { width: 2.0, length: 1.6, height: 2.8 },
                    rotationDeg: 0
                });
            } else if (r.type === 'parking') {
                furniture.push({
                    id: `furn-f${floorIndex}-${fId++}`,
                    type: 'vehicle_car',
                    name: 'Family Sedan / SUV',
                    roomId: r.id,
                    position: { x: rx + (rw - 6.2) / 2, y: ry + (rh - 14.5) / 2 },
                    size: { width: 6.2, length: 14.5, height: 4.8 },
                    rotationDeg: 0
                });
            }
        });

        return furniture;
    },

    _synthesizeUpperFloorRooms(groundRooms, dims) {
        // Upper floor mirrors ground floor structural walls, converting public lounge to terrace & suites
        return groundRooms.map((r, i) => {
            let name = r.name;
            let type = r.type;
            let color = r.color;

            if (r.type === 'parking') {
                name = 'Open Terrace Balcony';
                type = 'balcony';
                color = '#059669';
            } else if (r.type === 'living') {
                name = 'Family Upper Lounge';
                type = 'living';
                color = '#1e3a5f';
            } else if (r.type === 'kitchen') {
                name = 'Study / Home Office';
                type = 'study';
                color = '#4338ca';
            }

            return {
                id: `f1_${r.legacyId || i}`,
                name: name,
                type: type,
                zone: r.zone,
                x: r.bounds.x,
                y: r.bounds.y,
                width: r.bounds.width,
                height: r.bounds.height,
                color: color,
                floorName: 'Laminated Wood Flooring'
            };
        });
    }
};

// Global browser attachment
if (typeof window !== 'undefined') {
    window.HouseModelAdapter = HouseModelAdapter;
}
