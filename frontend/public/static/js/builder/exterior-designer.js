// =========================================================================
// HamaraGhar — Exterior Design System (Separate Architectural Design Layer)
// Enables generating 5 distinct exterior façade variations while strictly locking
// and preserving internal floor-plan geometry, walls, doors, and room layout.
// =========================================================================

export const EXTERIOR_STYLES = {
    modern: {
        id: 'modern',
        name: 'Modern Minimalist',
        description: 'Crisp white stippled plaster, slate composite panels, cedar slat accents, frameless glass railings, and slim charcoal window profiles.',
        facadeColor: '#f8fafc',
        accentColor: '#1e293b',
        secondaryAccent: '#b45309',
        claddingMaterial: 'cedar_louvers',
        windowFrameColor: '#0f172a',
        balconyRailing: 'frameless_glass',
        parapetStyle: 'clean_flat',
        parapetHeightFt: 3.2,
        entranceCanopy: 'cantilever_slab',
        columns: 'none',
        lightingType: 'warm_vertical_led',
        trimFinish: 'Matte Charcoal Aluminum',
        roofCovering: 'RCC Flat Slab with Solar Reflective Coating'
    },
    contemporary: {
        id: 'contemporary',
        name: 'Contemporary Terracotta Jali',
        description: 'Exposed architectural concrete texture, perforated terracotta clay jali screens, engineered timber pergola, and warm atmospheric downlighting.',
        facadeColor: '#e2e8f0',
        accentColor: '#c2410c',
        secondaryAccent: '#78350f',
        claddingMaterial: 'terracotta_jali',
        windowFrameColor: '#334155',
        balconyRailing: 'louvered_steel',
        parapetStyle: 'perforated_terracotta',
        parapetHeightFt: 3.5,
        entranceCanopy: 'pergola_wood',
        columns: 'square_concrete',
        lightingType: 'recessed_warm',
        trimFinish: 'Textured Anthracite',
        roofCovering: 'Clay Paver Deck'
    },
    traditional: {
        id: 'traditional',
        name: 'Traditional Indian Heritage',
        description: 'Warm limestone ivory plaster, sloping Mangalore clay tile chhajjas, classical verandah pillars with carved stone bases, and brass lantern fixtures.',
        facadeColor: '#fef3c7',
        accentColor: '#9a3412',
        secondaryAccent: '#78350f',
        claddingMaterial: 'mangalore_tile',
        windowFrameColor: '#78350f',
        balconyRailing: 'ornamental_wrought_iron',
        parapetStyle: 'corniced_moulding',
        parapetHeightFt: 3.0,
        entranceCanopy: 'tiled_sloped_chhajja',
        columns: 'fluted_stone_pillars',
        lightingType: 'brass_lantern',
        trimFinish: 'Solid Teak Wood Trim',
        roofCovering: 'Terracotta Sloped Gable & Cornice'
    },
    luxury: {
        id: 'luxury',
        name: 'Luxury Travertine Villa',
        description: 'Veined Italian travertine cladding, brushed champagne bronze fins, double-height grand entrance portal, and illuminated glass balustrades.',
        facadeColor: '#f1f5f9',
        accentColor: '#d97706',
        secondaryAccent: '#0284c7',
        claddingMaterial: 'champagne_bronze_fins',
        windowFrameColor: '#b45309',
        balconyRailing: 'frameless_smoked_glass',
        parapetStyle: 'illuminated_glass',
        parapetHeightFt: 3.6,
        entranceCanopy: 'double_height_portal',
        columns: 'travertine_monolith',
        lightingType: 'linear_facade_grazing',
        trimFinish: 'Brushed Champagne Bronze Anodized',
        roofCovering: 'Italian Porcelain Terrace Tile'
    },
    simple: {
        id: 'simple',
        name: 'Simple & Cost-Effective',
        description: 'Clean weather-shield acrylic emulsion, stone-gray accent bands, white UPVC double-glazed windows, and durable powder-coated steel railings.',
        facadeColor: '#ffffff',
        accentColor: '#64748b',
        secondaryAccent: '#0d9488',
        claddingMaterial: 'weather_band',
        windowFrameColor: '#ffffff',
        balconyRailing: 'ms_grill',
        parapetStyle: 'solid_masonry',
        parapetHeightFt: 3.0,
        entranceCanopy: 'simple_chhajja',
        columns: 'wall_return',
        lightingType: 'minimal_bulkhead',
        trimFinish: 'White UPVC Profiles',
        roofCovering: 'Waterproof Screed with China Mosaic'
    }
};

export class ExteriorDesigner {
    /**
     * Generates 5 distinct exterior variations for a given canonical HouseModel.
     * GUARANTEE: The floor plan geometry, room boundaries, walls, doors, and windows
     * are 100% locked and strictly identical across all 5 variations.
     */
    static generateFiveVariations(baseHouseModel) {
        if (!baseHouseModel) return [];

        const styleKeys = ['modern', 'contemporary', 'traditional', 'luxury', 'simple'];
        return styleKeys.map((key, idx) => {
            const variantModel = JSON.parse(JSON.stringify(baseHouseModel));
            const styleConfig = EXTERIOR_STYLES[key];

            variantModel.exterior = {
                variantIndex: idx,
                variantLetter: String.fromCharCode(65 + idx), // A, B, C, D, E
                styleKey: key,
                ...styleConfig
            };

            // Update metadata to reflect exterior variant without modifying geometry
            variantModel.metadata = variantModel.metadata || {};
            variantModel.metadata.exteriorVariant = `Exterior ${String.fromCharCode(65 + idx)} (${styleConfig.name})`;
            variantModel.metadata.activeExteriorStyle = key;

            return variantModel;
        });
    }

    /**
     * Applies an exterior style to an existing HouseModel in-place.
     * Keeps internal room geometry untouched.
     */
    static applyStyle(houseModel, styleKey) {
        const style = EXTERIOR_STYLES[styleKey] || EXTERIOR_STYLES.modern;
        houseModel.exterior = Object.assign({}, houseModel.exterior || {}, {
            styleKey: style.id,
            ...style
        });
        if (houseModel.metadata) {
            houseModel.metadata.activeExteriorStyle = style.id;
        }
        return houseModel;
    }
}

if (typeof window !== 'undefined') {
    window.EXTERIOR_STYLES = EXTERIOR_STYLES;
    window.ExteriorDesigner = ExteriorDesigner;
}
