"""
Shared Pydantic data models for the Junior SAC Agent FastAPI backend.
"""

from __future__ import annotations
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FieldRole(str, Enum):
    DIMENSION = "dimension"
    MEASURE = "measure"
    TIME = "time"
    HIERARCHY = "hierarchy"


class FieldMetadata(BaseModel):
    """One column/field as read from the BDC model."""
    name: str
    technical_name: str
    data_type: str            # e.g. "string", "decimal", "date"
    role: FieldRole
    cardinality: Optional[int] = None      # distinct value count, if known
    hierarchy_depth: Optional[int] = None  # only set when role == HIERARCHY
    position: int = 0                      # column ordinal, used for drift matching
    unit: Optional[str] = None             # currency/unit tag from the catalog
    is_geo: bool = False                   # True if geographical (e.g. Country, Region)
    semantic_type: Optional[str] = None    # "currency", "quantity", "ratio", "balance"
    sample_values: List[str] = Field(default_factory=list) # sample distinct values for low cardinality


class DataShape(BaseModel):
    """The 'signature' of a candidate field set, used to drive chart selection."""
    measures: List[FieldMetadata]
    dimensions: List[FieldMetadata]
    has_time: bool
    has_geo: bool
    measure_types: Dict[str, int]          # count of currencies, quantities, etc.
    max_cardinality: int = 0
    hierarchy_depth: int = 0
    row_count_estimate: Optional[int] = None
    live_data_preview: Optional[List[Dict[str, Any]]] = None
    model_id: str = ""


class ChartRecommendation(BaseModel):
    chart_type: str
    confidence: float           # 0.0 - 1.0
    rationale: str
    source_model: Optional[str] = None                      # Identifier of the model this chart draws from
    binding: Dict[str, Any] = Field(default_factory=dict)   # field -> chart role mapping
    is_recommended: bool = True
    is_applicable: bool = True


class RepairCandidate(BaseModel):
    old_field: FieldMetadata
    new_field: FieldMetadata
    confidence: float
    signals: Dict[str, float] = Field(default_factory=dict)   # signal name -> score, for auditability

# Request/Response models for the API

class ModelIdentifier(BaseModel):
    space_id: str
    model_id: str

class RecommendChartsRequest(BaseModel):
    models: List[ModelIdentifier]

class ModelMetadata(BaseModel):
    # Mapping of model_id -> dimensions/measures
    dimensions: Dict[str, List[str]]
    measures: Dict[str, List[str]]

class RecommendChartsResponse(BaseModel):
    recommendations: List[ChartRecommendation]
    metadata: Optional[ModelMetadata] = None
    mock_dataset: Optional[Dict[str, List[Dict[str, Any]]]] = None

class ChartSelectionRequest(BaseModel):
    space_id: str
    model_id: str
    selected_recommendations: List[ChartRecommendation]
    available_metadata: Optional[ModelMetadata] = None

class GenerateStoryRequest(BaseModel):
    metadata: List[Dict[str, Any]]

class SimulateDriftRequest(BaseModel):
    old_metadata: List[Dict[str, Any]]
    new_metadata: List[Dict[str, Any]]

class StoryResponse(BaseModel):
    status: str
    story: Dict[str, Any]

class DriftResponse(BaseModel):
    status: str
    missing_fields: List[str]
    auto_repaired: List[Dict[str, Any]]
    needs_review: List[Dict[str, Any]]
    story_version: int
    repair_log: Optional[List[Dict[str, Any]]] = None
