// =========================================================================
// HamaraGhar — Canonical Architectural HouseModel (Source of Truth)
// Unified, strongly-typed architectural specification driving both
// 2D Technical Blueprints and Procedural 3D WebGL Visualization.
// =========================================================================

/**
 * Coordinate System & Unit Standard:
 * - Internal architectural dimensions: Feet (ft) and Square Feet (sq.ft)
 * - Three.js WebGL spatial coordinates: 1 foot = 0.3048 units (meters)
 * - Elevation / Z-axis in 3D: Y is Up in Three.js (X = width, Y = height, Z = depth)
 * - 2D Canvas coordinates: X = frontage width, Y = plot depth (north to south)
 */

export const HouseModelSchema = {
    UNITS: {
        LENGTH: 'ft',
        AREA: 'sq.ft',
        THREE_SCALE: 0.3048 // 1 foot = 0.3048 Three.js world units (meters)
    },

    ROOM_TYPES: {
        LIVING: 'living',
        MASTER_BED: 'masterBed',
        BEDROOM: 'bedroom',
        KITCHEN: 'kitchen',
        BATH: 'bath',
        POOJA: 'pooja',
        DINING: 'dining',
        PARKING: 'parking',
        BALCONY: 'balcony',
        STAIRS: 'stairs',
        CORRIDOR: 'corridor',
        UTILITY: 'utility',
        STUDY: 'study'
    },

    FINISH_MATERIALS: {
        CONCRETE: 'concrete',
        BRICK: 'brick',
        WHITE_PLASTER: 'white_plaster',
        WARM_PLASTER: 'warm_plaster',
        TERRACOTTA: 'terracotta',
        WOOD_PARQUET: 'wood_parquet',
        CERAMIC_TILE: 'ceramic_tile',
        POLISHED_MARBLE: 'polished_marble',
        GLASS: 'glass',
        GRASS: 'grass',
        PAVER: 'paver',
        METAL_RAILING: 'metal_railing'
    }
};

/**
 * Creates an empty, valid HouseModel instance.
 */
export function createDefaultHouseModel() {
    return {
        metadata: {
            id: 'hg-project-001',
            name: 'Modern Residence',
            client: 'HamaraGhar User',
            version: '2.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            units: 'ft'
        },
        plot: {
            width: 40.0,
            length: 50.0,
            area: 2000.0,
            setbacks: {
                front: 5.0,
                rear: 4.0,
                sideLeft: 3.0,
                sideRight: 3.0
            },
            facing: 'East'
        },
        floors: [
            {
                id: 'floor-0',
                index: 0,
                name: 'Ground Floor',
                elevationFt: 0.0,
                heightFt: 10.0,
                slabThicknessFt: 0.75,
                rooms: [],
                walls: [],
                doors: [],
                windows: [],
                stairs: [],
                balconies: [],
                furniture: []
            }
        ],
        site: {
            hasCompoundWall: true,
            wallHeightFt: 5.0,
            hasGate: true,
            hasDriveway: true,
            hasGarden: true,
            drivewayWidthFt: 12.0,
            trees: []
        },
        summary: {
            totalCarpetArea: 0.0,
            totalBuiltupArea: 0.0,
            efficiencyPct: 0.0,
            bedroomCount: 0,
            bathroomCount: 0,
            floorCount: 1,
            parkingSlots: 1,
            estimatedCostInr: 0,
            estimatedValuationInr: 0
        }
    };
}

/**
 * Validates a HouseModel structure and ensures all entities have stable, valid IDs.
 */
export function validateHouseModel(model) {
    if (!model || typeof model !== 'object') {
        throw new Error('Invalid HouseModel: model must be an object');
    }
    if (!model.plot || typeof model.plot.width !== 'number' || typeof model.plot.length !== 'number') {
        throw new Error('Invalid HouseModel: plot width and length must be numbers');
    }
    if (!Array.isArray(model.floors) || model.floors.length === 0) {
        throw new Error('Invalid HouseModel: model must have at least one floor');
    }

    const seenIds = new Set();
    const checkId = (id, type) => {
        if (!id) throw new Error(`Missing ID for ${type}`);
        if (seenIds.has(id)) {
            console.warn(`Duplicate ID detected in HouseModel: ${id} (${type})`);
        }
        seenIds.add(id);
    };

    model.floors.forEach((fl, fIdx) => {
        fl.id = fl.id || `floor-${fIdx}`;
        (fl.rooms || []).forEach(r => checkId(r.id, 'room'));
        (fl.walls || []).forEach(w => checkId(w.id, 'wall'));
        (fl.doors || []).forEach(d => checkId(d.id, 'door'));
        (fl.windows || []).forEach(w => checkId(w.id, 'window'));
        (fl.furniture || []).forEach(f => checkId(f.id, 'furniture'));
    });

    return true;
}

/**
 * Deep clones a HouseModel instance.
 */
export function cloneHouseModel(model) {
    return JSON.parse(JSON.stringify(model));
}

// Global browser attachment for vanilla ES6 interoperability
if (typeof window !== 'undefined') {
    window.HouseModelSchema = HouseModelSchema;
    window.createDefaultHouseModel = createDefaultHouseModel;
    window.validateHouseModel = validateHouseModel;
    window.cloneHouseModel = cloneHouseModel;
}
