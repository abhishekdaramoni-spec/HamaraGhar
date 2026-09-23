"""
Domain-Grounded Synthetic Dataset Generator for HamaraGhar ML Models.
Generates:
1. synthetic_archetype_dataset.csv (5,000 samples for layout archetype classification)
2. synthetic_cost_dataset.csv (5,000 samples for construction cost regression)

Grounding:
- CPWD Delhi Schedule of Rates (DSR 2023-2024)
- National Building Code of India (NBC 2016)
- IS 13920 (Ductile Design and Detailing of Reinforced Concrete Structures)
- IS 2911 (Design and Construction of Pile Foundations in Expansive Soils)
"""
import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add repo root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.data.schema import (
    HouseDesignRecord,
    ConstructionCostRecord,
    LayoutArchetype,
    FacingDirection,
    SoilType,
    SeismicZone,
    ClimateZone,
    FinishingTier,
)


def generate_archetype_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generates synthetic house design and layout archetype dataset."""
    rng = np.random.RandomState(seed)
    
    records = []
    directions = [d.value for d in FacingDirection]
    
    for _ in range(n_samples):
        # Truncated realistic residential plot dimensions in feet
        width = round(float(rng.uniform(18.0, 75.0)), 1)
        # Length generally >= width for typical urban/suburban plots, with some wide plots
        aspect_ratio_raw = float(rng.uniform(0.7, 2.8))
        length = round(width * aspect_ratio_raw, 1)
        length = max(22.0, min(140.0, length))
        
        # Realized aspect ratio & area
        aspect_ratio = round(length / width, 3)
        plot_area = round(width * length, 1)
        
        # BHK selection conditioned on plot area
        if plot_area < 700:
            bhk = 1 if rng.rand() < 0.85 else 2
        elif plot_area < 1300:
            bhk = rng.choice([1, 2, 3], p=[0.15, 0.70, 0.15])
        elif plot_area < 2400:
            bhk = rng.choice([2, 3, 4], p=[0.15, 0.65, 0.20])
        elif plot_area < 3800:
            bhk = rng.choice([3, 4, 5], p=[0.20, 0.60, 0.20])
        else:
            bhk = rng.choice([4, 5, 6], p=[0.40, 0.40, 0.20])
            
        # Floor count conditioned on plot area & BHK
        if bhk >= 4 or plot_area < 1000:
            floors = rng.choice([1, 2, 3], p=[0.20, 0.60, 0.20])
        else:
            floors = rng.choice([1, 2, 3], p=[0.50, 0.40, 0.10])
            
        # Family size
        family_size = int(np.clip(round(rng.normal(loc=bhk * 1.3 + 1, scale=1.2)), 1, 10))
        parking_spaces = 0 if plot_area < 700 else (1 if plot_area < 2200 else rng.choice([1, 2, 3], p=[0.3, 0.5, 0.2]))
        facing = rng.choice(directions, p=[0.35, 0.20, 0.30, 0.15])  # East & North preferred in Indian market
        vastu = rng.rand() < 0.75
        
        # Determine archetype via architectural logic + stochastic human preference variance
        # 1. Deep / Narrow plots -> Central Spine Split (provides light & ventilation down long axis)
        # 2. Wide / Courtyard-friendly plots -> L-Shaped Courtyard
        # 3. Compact urban plots -> Compact Linear
        # 4. Large multi-level luxury villas -> Villa Perimeter
        # 5. Balanced modern homes -> Wrap-Around Open Plan
        
        if aspect_ratio >= 1.75:
            archetype_rule = LayoutArchetype.CENTRAL_SPINE_SPLIT
            base_circulation = 0.16
        elif 0.80 <= aspect_ratio <= 1.35 and plot_area >= 1500 and (facing in ["North", "East"]):
            archetype_rule = LayoutArchetype.L_SHAPED_COURTYARD
            base_circulation = 0.18
        elif plot_area <= 950 or (bhk <= 2 and plot_area <= 1200):
            archetype_rule = LayoutArchetype.COMPACT_LINEAR
            base_circulation = 0.11
        elif plot_area >= 2500 and floors >= 2 and bhk >= 4:
            archetype_rule = LayoutArchetype.VILLA_PERIMETER
            base_circulation = 0.20
        else:
            archetype_rule = LayoutArchetype.WRAP_AROUND_OPEN_PLAN
            base_circulation = 0.14
            
        # Introduce 6% realistic label noise (architectural stylistic variation)
        if rng.rand() < 0.06:
            all_archetype_vals = [a.value for a in LayoutArchetype]
            chosen_archetype_val = str(rng.choice(all_archetype_vals))
        else:
            chosen_archetype_val = archetype_rule.value
            
        # Circulation ratio varies around archetype base
        circ_noise = float(rng.normal(0.0, 0.012))
        circulation_ratio = round(float(np.clip(base_circulation + circ_noise, 0.09, 0.25)), 3)
        
        # Validate through Pydantic
        record = HouseDesignRecord(
            plot_width=width,
            plot_length=length,
            plot_area_sqft=plot_area,
            aspect_ratio=aspect_ratio,
            floors=int(floors),
            bhk=int(bhk),
            family_size=family_size,
            parking_spaces=int(parking_spaces),
            facing_direction=FacingDirection(facing),
            vastu_priority=vastu,
            layout_archetype=LayoutArchetype(chosen_archetype_val),
            circulation_ratio=circulation_ratio,
        )
        records.append(record.model_dump())
        
    return pd.DataFrame(records)


def generate_cost_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generates synthetic empirical construction cost dataset.
    Incorporates CPWD DSR benchmarks, IS 13920 seismic multipliers, and geotechnical soil penalties.
    """
    rng = np.random.RandomState(seed + 100)
    
    soils = [s.value for s in SoilType]
    seismic_zones = [z.value for z in SeismicZone]
    climates = [c.value for c in ClimateZone]
    tiers = [t.value for t in FinishingTier]
    
    records = []
    
    # Baseline CPWD rates per tier (₹/sqft)
    base_tier_rates = {
        "Basic": 1350.0,
        "Standard": 1850.0,
        "Premium": 2750.0,
        "Luxury": 4200.0,
    }
    
    # Geotechnical Soil multiplier (IS 2911 deep footing & pile foundation requirements)
    soil_multipliers = {
        "Rocky": 0.95,        # High bearing capacity, minimal footing depth
        "Sandy Loam": 1.00,   # Standard isolated footing
        "Clay": 1.07,         # Raft or deepened combined footings
        "Black Cotton": 1.19, # Expansive montmorillonite clay requiring bored under-reamed piles
    }
    
    # Seismic ductile detailing multiplier (IS 13920 reinforcement steel weight)
    seismic_multipliers = {
        "II": 1.00,   # Low risk, standard detailing
        "III": 1.04,  # Moderate risk
        "IV": 1.10,   # High risk (special confinement rebar hoops)
        "V": 1.16,    # Very high risk (shear walls, high steel density)
    }
    
    for _ in range(n_samples):
        floors = int(rng.choice([1, 2, 3], p=[0.40, 0.45, 0.15]))
        bhk = int(rng.choice([1, 2, 3, 4, 5], p=[0.10, 0.35, 0.35, 0.15, 0.05]))
        
        # Footprint per floor
        footprint_sqft = rng.uniform(450.0, 2400.0)
        built_up_area = round(footprint_sqft * floors, 1)
        built_up_area = max(350.0, min(9500.0, built_up_area))
        
        city_tier = int(rng.choice([1, 2, 3], p=[0.45, 0.40, 0.15]))
        soil = rng.choice(soils, p=[0.40, 0.15, 0.25, 0.20])
        seismic = rng.choice(seismic_zones, p=[0.30, 0.35, 0.25, 0.10])
        climate = rng.choice(climates, p=[0.40, 0.25, 0.15, 0.15, 0.05])
        tier = rng.choice(tiers, p=[0.15, 0.50, 0.25, 0.10])
        
        has_basement = bool(rng.rand() < 0.12 if floors >= 2 else False)
        has_lift = bool(rng.rand() < 0.18 if (floors >= 3 or tier == "Luxury") else False)
        
        # Calculation of empirical cost
        base_rate = base_tier_rates[tier]
        f_soil = soil_multipliers[soil]
        f_seismic = seismic_multipliers[seismic]
        
        # City tier labor & material logistics multiplier
        city_mult = 1.08 if city_tier == 1 else (1.00 if city_tier == 2 else 0.92)
        
        # Multi-story vertical staging and economies of scale
        # Vertical concrete pumping / scaffolding cost vs shared roof/foundation economy
        if floors == 1:
            f_vertical = 1.03  # Full roof & foundation borne by 1 floor
        elif floors == 2:
            f_vertical = 0.98  # Optimal structural economy
        else:
            f_vertical = 1.04  # Pumping, staging, structural column sizing
            
        # Large scale economy (diminishing return per sqft)
        scale_discount = max(0.92, 1.0 - (built_up_area / 40000.0))
        
        # Specific structural additions
        basement_penalty = 1.14 if has_basement else 1.00
        lift_fixed_cost = 450000.0 if has_lift else 0.0
        
        # Market stochastic variation (Gaussian noise ~ 3.5%)
        noise = rng.normal(1.0, 0.035)
        
        cost_per_sqft = base_rate * f_soil * f_seismic * city_mult * f_vertical * scale_discount * basement_penalty * noise
        cost_per_sqft = round(float(cost_per_sqft), 1)
        
        total_cost = round(float(cost_per_sqft * built_up_area + lift_fixed_cost), 0)
        
        record = ConstructionCostRecord(
            built_up_area_sqft=built_up_area,
            floors=floors,
            bhk=bhk,
            city_tier=city_tier,
            soil_type=SoilType(soil),
            seismic_zone=SeismicZone(seismic),
            climate_zone=ClimateZone(climate),
            finishing_tier=FinishingTier(tier),
            has_basement=has_basement,
            has_lift=has_lift,
            cost_per_sqft_inr=cost_per_sqft,
            total_cost_inr=total_cost,
        )
        records.append(record.model_dump())
        
    return pd.DataFrame(records)


def main():
    root = Path(__file__).resolve().parent.parent.parent
    raw_dir = root / "ml" / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    print("Generating Archetype Classification Dataset (5,000 samples)...")
    df_archetype = generate_archetype_dataset(n_samples=5000, seed=42)
    archetype_path = raw_dir / "synthetic_archetype_dataset.csv"
    df_archetype.to_csv(archetype_path, index=False)
    print(f" Saved: {archetype_path} (Shape: {df_archetype.shape})")
    print(f" Archetype distribution:\n{df_archetype['layout_archetype'].value_counts(normalize=True)}")
    
    print("\nGenerating Construction Cost Regressor Dataset (5,000 samples)...")
    df_cost = generate_cost_dataset(n_samples=5000, seed=42)
    cost_path = raw_dir / "synthetic_cost_dataset.csv"
    df_cost.to_csv(cost_path, index=False)
    print(f" Saved: {cost_path} (Shape: {df_cost.shape})")
    print(f" Cost per sqft summary:\n{df_cost['cost_per_sqft_inr'].describe()}")


if __name__ == "__main__":
    main()
