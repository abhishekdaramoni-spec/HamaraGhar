// =========================================================================
// HamaraGhar — Canonical Coordinate Transformation Utility
// Single Source of Truth for converting between Architectural Feet
// and WebGL Three.js World Coordinates.
// =========================================================================

export const ARCHITECTURAL_SCALE = 0.3048; // 1 foot = 0.3048 Three.js world units (meters)

/**
 * Converts architectural position in feet to Three.js World Coordinates.
 * Architectural:
 *   - X: West to East (feet)
 *   - Y: North to South (feet)
 *   - Elevation: Height above ground (feet)
 * Three.js World:
 *   - X: Right/Left centered around origin
 *   - Y: Up (elevation)
 *   - Z: Forward/Backward centered around origin
 *
 * @param {number} archX - Architectural X (ft)
 * @param {number} archY - Architectural Y (ft)
 * @param {number} elevationFt - Architectural vertical elevation (ft)
 * @param {number} plotWidthFt - Total plot width (ft)
 * @param {number} plotLengthFt - Total plot length (ft)
 * @returns {{ x: number, y: number, z: number }}
 */
export function architecturalToWorld(archX, archY, elevationFt = 0.0, plotWidthFt = 40.0, plotLengthFt = 50.0) {
    const S = ARCHITECTURAL_SCALE;
    const centerX = (plotWidthFt * S) / 2;
    const centerZ = (plotLengthFt * S) / 2;

    return {
        x: Number((archX * S - centerX).toFixed(4)),
        y: Number((elevationFt * S).toFixed(4)),
        z: Number((archY * S - centerZ).toFixed(4))
    };
}

/**
 * Converts Three.js World Coordinates back to Architectural Feet.
 * @param {number} worldX - World X (units)
 * @param {number} worldZ - World Z (units)
 * @param {number} plotWidthFt - Total plot width (ft)
 * @param {number} plotLengthFt - Total plot length (ft)
 * @returns {{ x: number, y: number }}
 */
export function worldToArchitectural(worldX, worldZ, plotWidthFt = 40.0, plotLengthFt = 50.0) {
    const S = ARCHITECTURAL_SCALE;
    const centerX = (plotWidthFt * S) / 2;
    const centerZ = (plotLengthFt * S) / 2;

    return {
        x: Number(((worldX + centerX) / S).toFixed(2)),
        y: Number(((worldZ + centerZ) / S).toFixed(2))
    };
}

/**
 * Converts architectural dimension (ft) to Three.js world unit length.
 */
export function feetToWorldUnits(feet) {
    return Number((Number(feet) * ARCHITECTURAL_SCALE).toFixed(4));
}

/**
 * Converts Three.js world units to architectural feet.
 */
export function worldUnitsToFeet(units) {
    return Number((Number(units) / ARCHITECTURAL_SCALE).toFixed(2));
}

// Global browser attachment
if (typeof window !== 'undefined') {
    window.CoordinateTransform = {
        ARCHITECTURAL_SCALE,
        architecturalToWorld,
        worldToArchitectural,
        feetToWorldUnits,
        worldUnitsToFeet
    };
}
