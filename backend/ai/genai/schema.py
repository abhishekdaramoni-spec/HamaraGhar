"""
Pydantic Schemas and Physical Building Code Validators for LLM Output.
Ensures conversational outputs comply with NBC 2016 physical norms and mathematical bounds.
"""
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator


class ParsedHouseRequirements(BaseModel):
    """Structured architectural design requirements extracted from natural language."""
    plot_width: float = Field(default=30.0, ge=15.0, le=120.0, description="Plot width in feet")
    plot_length: float = Field(default=50.0, ge=20.0, le=160.0, description="Plot length in feet")
    plot_area_sqft: float = Field(default=1500.0, ge=300.0, le=15000.0, description="Calculated plot area")
    bhk: int = Field(default=3, ge=1, le=6, description="Bedroom count")
    floors: int = Field(default=1, ge=1, le=4, description="Number of stories (G+0 to G+3)")
    city: str = Field(default="Bangalore", description="Target municipality in India")
    facing_direction: str = Field(default="East", description="Road frontage direction (North, South, East, West)")
    target_budget_lakhs: Optional[float] = Field(default=60.0, ge=5.0, le=1000.0, description="Target budget in Lakhs INR")
    finishing_tier: str = Field(default="Standard", description="Basic, Standard, Premium, Luxury")
    features: List[str] = Field(
        default_factory=lambda: ["Parking", "Balcony", "Pooja Room", "Utility"],
        description="Special architectural amenities"
    )
    vastu_priority: bool = Field(default=True, description="Strict Vastu adherence")
    confidence_score: float = Field(default=0.92, ge=0.0, le=1.0, description="LLM extraction confidence")
    architectural_notes: str = Field(default="", description="Design notes and spatial zoning advice")
    is_fallback: bool = Field(default=False, description="True if extracted via fallback parser")
    fallback_reason: Optional[str] = None

    @field_validator("facing_direction")
    def validate_facing(cls, v):
        valid = ["North", "South", "East", "West"]
        clean = v.capitalize() if isinstance(v, str) else "East"
        return clean if clean in valid else "East"

    @field_validator("finishing_tier")
    def validate_tier(cls, v):
        valid = ["Basic", "Standard", "Premium", "Luxury"]
        clean = v.capitalize() if isinstance(v, str) else "Standard"
        return clean if clean in valid else "Standard"


def validate_physical_constraints(req: ParsedHouseRequirements) -> Tuple[ParsedHouseRequirements, List[str]]:
    """
    Enforces physical reality and National Building Code (NBC 2016) constraints.
    Prevents LLM hallucinations such as 4BHKs crammed into 300 sq.ft plots.
    """
    warnings = []
    
    # 1. Recalculate area
    computed_area = round(req.plot_width * req.plot_length, 1)
    req.plot_area_sqft = computed_area
    
    # 2. Aspect Ratio sanity
    aspect_ratio = req.plot_length / max(req.plot_width, 1.0)
    if aspect_ratio > 3.5:
        warnings.append(f"Extreme plot aspect ratio ({aspect_ratio:.1f}:1). May require specialized structural shear walls.")
    elif aspect_ratio < 0.5:
        warnings.append(f"Very shallow plot frontage. Living zones will be aligned linearly.")
        
    # 3. Minimum livable carpet area per BHK (NBC 2016 Part 3 Clause 4.2)
    min_area_per_bhk = {1: 350.0, 2: 600.0, 3: 950.0, 4: 1400.0, 5: 1900.0, 6: 2400.0}
    required_min = min_area_per_bhk.get(req.bhk, 950.0)
    total_built_up_potential = computed_area * req.floors * 0.75  # 75% max permissible ground coverage
    
    if total_built_up_potential < required_min:
        old_bhk = req.bhk
        # Auto-adjust BHK downward to satisfy physical law
        if total_built_up_potential >= 600.0:
            req.bhk = 2
        elif total_built_up_potential >= 350.0:
            req.bhk = 1
        else:
            req.bhk = 1
        warnings.append(
            f"Physical Constraint Auto-Correction: {old_bhk} BHK requested on {computed_area:.0f} sq.ft plot ({req.floors} floor) "
            f"violates NBC 2016 minimum habitable room standards. Adjusted to {req.bhk} BHK."
        )
        
    # 4. Budget feasibility check against CPWD minimum base rate
    if req.target_budget_lakhs is not None:
        min_possible_cost_lakhs = (total_built_up_potential * 1350.0) / 100000.0  # Basic ₹1350/sqft
        if req.target_budget_lakhs < min_possible_cost_lakhs * 0.70:
            warnings.append(
                f"Budget Feasibility Warning: Target budget of INR {req.target_budget_lakhs:.1f} Lakhs is significantly below "
                f"CPWD basic structural minimum (INR {min_possible_cost_lakhs:.1f} Lakhs for {total_built_up_potential:.0f} sq.ft built-up)."
            )
            
    return req, warnings
