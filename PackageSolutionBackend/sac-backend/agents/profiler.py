"""
Data understanding layer.
"""

from __future__ import annotations
from utils.models import FieldMetadata, FieldRole, DataShape
from typing import List, Dict, Any

NUMERIC_TYPES = {"decimal", "integer", "double", "float", "currency"}
TIME_TYPES = {"date", "datetime", "timestamp", "fiscalperiod"}


def classify_field(raw: Dict[str, Any], position: int) -> FieldMetadata:
    """Infer FieldRole from a raw metadata record."""
    data_type = raw.get("dataType", "string").lower()
    is_hierarchy = bool(raw.get("hierarchy"))
    explicit_role = raw.get("explicitRole")

    if is_hierarchy:
        role = FieldRole.HIERARCHY
    elif explicit_role == "measure":
        role = FieldRole.MEASURE
    elif explicit_role == "dimension":
        role = FieldRole.DIMENSION
        # Still attempt to upgrade a standard dimension to a TIME dimension
        if data_type in TIME_TYPES or raw.get("semanticType") == "time" or any(t in raw["technicalName"].lower() for t in ["date", "month", "year"]):
            role = FieldRole.TIME
    else:
        # Fallback to hardcoded type inference if annotations are missing
        if data_type in TIME_TYPES or raw.get("semanticType") == "time" or any(t in raw["technicalName"].lower() for t in ["date", "month", "year"]):
            role = FieldRole.TIME
        elif data_type in NUMERIC_TYPES and raw.get("aggregatable", True):
            role = FieldRole.MEASURE
        else:
            role = FieldRole.DIMENSION

    # Semantic Enrichment
    name_lower = raw["technicalName"].lower()
    is_geo = any(g in name_lower for g in ["country", "region", "city", "state", "geo", "lat", "lon"])
    
    semantic_type = None
    if role == FieldRole.MEASURE:
        if any(r in name_lower for r in ["%", "ratio", "rate", "margin"]):
            semantic_type = "ratio"
        elif any(c in name_lower for c in ["amount", "price", "cost", "revenue", "value"]) or raw.get("unit") in ["USD", "EUR"]:
            semantic_type = "currency"
        elif any(q in name_lower for q in ["qty", "quantity", "count", "volume"]):
            semantic_type = "quantity"
            
    # Mock extracting sample values for low cardinality if available
    cardinality = raw.get("distinctCount")
    sample_values = []
    if role == FieldRole.DIMENSION and cardinality and cardinality < 10:
        # Simulate extraction from real data
        if "status" in name_lower:
            sample_values = ["Open", "In Progress", "Closed"]
        elif "stage" in name_lower:
            sample_values = ["Lead", "Qualified", "Proposal", "Won"]
        else:
            sample_values = [f"Val{i}" for i in range(cardinality)]

    return FieldMetadata(
        name=raw.get("label", raw["technicalName"]),
        technical_name=raw["technicalName"],
        data_type=data_type,
        role=role,
        cardinality=cardinality,
        hierarchy_depth=raw.get("hierarchyDepth") if is_hierarchy else None,
        position=position,
        unit=raw.get("unit"),
        is_geo=is_geo,
        semantic_type=semantic_type,
        sample_values=sample_values
    )


def profile_fields(raw_fields: List[Dict[str, Any]]) -> List[FieldMetadata]:
    return [classify_field(f, i) for i, f in enumerate(raw_fields)]


def build_shape(fields: List[FieldMetadata], live_data_preview: List[Dict] = None) -> DataShape:
    """
    Constructs the DataShape profile from the categorized fields.
    """
    measures = [f for f in fields if f.role == FieldRole.MEASURE]
    dimensions = [f for f in fields if f.role in (FieldRole.DIMENSION, FieldRole.TIME)]
    
    has_time = any(f.role == FieldRole.TIME or f.semantic_type == 'time' for f in dimensions)
    has_geo = any(f.is_geo for f in dimensions)
    
    measure_types = {}
    for m in measures:
        t = m.semantic_type or m.data_type
        measure_types[t] = measure_types.get(t, 0) + 1
        
    return DataShape(
        measures=measures,
        dimensions=dimensions,
        has_time=has_time,
        has_geo=has_geo,
        measure_types=measure_types,
        max_cardinality=max([f.cardinality for f in dimensions if f.cardinality], default=0),
        hierarchy_depth=0,
        row_count_estimate=1000,
        live_data_preview=live_data_preview
    )
