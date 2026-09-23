"""
Pydantic schemas for data validation in HamaraGhar ML pipeline.
Enforces physical realism, domain bounds, and valid categorical enums.
"""
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class FacingDirection(str, Enum):
    NORTH = "North"
    SOUTH = "South"
    EAST = "East"
    WEST = "West"


class SoilType(str, Enum):
    SANDY_LOAM = "Sandy Loam"
    ROCKY = "Rocky"
    CLAY = "Clay"
    BLACK_COTTON = "Black Cotton"


class SeismicZone(str, Enum):
    ZONE_II = "II"
    ZONE_III = "III"
    ZONE_IV = "IV"
    ZONE_V = "V"


class ClimateZone(str, Enum):
    COMPOSITE = "Composite"
    WARM_HUMID = "Warm-Humid"
    HOT_DRY = "Hot-Dry"
    MODERATE = "Moderate"
    COLD = "Cold"


class FinishingTier(str, Enum):
    BASIC = "Basic"
    STANDARD = "Standard"
    PREMIUM = "Premium"
    LUXURY = "Luxury"


class LayoutArchetype(str, Enum):
    CENTRAL_SPINE_SPLIT = "CENTRAL_SPINE_SPLIT"
    L_SHAPED_COURTYARD = "L_SHAPED_COURTYARD"
    WRAP_AROUND_OPEN_PLAN = "WRAP_AROUND_OPEN_PLAN"
    COMPACT_LINEAR = "COMPACT_LINEAR"
    VILLA_PERIMETER = "VILLA_PERIMETER"


class HouseDesignRecord(BaseModel):
    """Schema for Layout Archetype & Zoning dataset record."""
    plot_width: float = Field(..., ge=15.0, le=120.0, description="Plot frontage width in feet")
    plot_length: float = Field(..., ge=20.0, le=160.0, description="Plot depth length in feet")
    plot_area_sqft: float = Field(..., ge=300.0, le=15000.0, description="Plot area in square feet")
    aspect_ratio: float = Field(..., ge=0.3, le=4.0, description="Length / Width ratio")
    floors: int = Field(..., ge=1, le=4, description="Number of stories (G+0 to G+3)")
    bhk: int = Field(..., ge=1, le=6, description="Bedrooms-Hall-Kitchen count")
    family_size: int = Field(..., ge=1, le=12, description="Target occupant count")
    parking_spaces: int = Field(..., ge=0, le=4, description="Dedicated vehicle parking spots")
    facing_direction: FacingDirection
    vastu_priority: bool = Field(default=True, description="Strict adherence to Vastu orientation")
    
    # Targets
    layout_archetype: LayoutArchetype
    circulation_ratio: float = Field(..., ge=0.08, le=0.28, description="Ratio of carpet area allocated to corridors/stairwells")

    @field_validator("aspect_ratio")
    def validate_aspect_ratio(cls, v, values):
        data = getattr(values, 'data', values)
        if isinstance(data, dict) and "plot_length" in data and "plot_width" in data:
            expected = round(data["plot_length"] / data["plot_width"], 3)
            if abs(v - expected) > 0.05:
                raise ValueError(f"Aspect ratio {v} does not match length/width ({expected})")
        return v


class ConstructionCostRecord(BaseModel):
    """Schema for Construction Cost & Site Variance dataset record."""
    built_up_area_sqft: float = Field(..., ge=300.0, le=15000.0, description="Total constructed floor area")
    floors: int = Field(..., ge=1, le=4, description="Floor count")
    bhk: int = Field(..., ge=1, le=6, description="BHK count")
    city_tier: int = Field(..., ge=1, le=3, description="1: Metro, 2: Tier-2 city, 3: Tier-3 town")
    soil_type: SoilType
    seismic_zone: SeismicZone
    climate_zone: ClimateZone
    finishing_tier: FinishingTier
    has_basement: bool = Field(default=False)
    has_lift: bool = Field(default=False)

    # Targets
    cost_per_sqft_inr: float = Field(..., ge=900.0, le=8500.0, description="Total construction cost per sq.ft")
    total_cost_inr: float = Field(..., ge=200000.0, le=100000000.0, description="Total estimated cost")
