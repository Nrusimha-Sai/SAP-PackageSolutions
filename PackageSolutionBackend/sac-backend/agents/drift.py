"""
Schema drift detection and repair.
"""

from __future__ import annotations
from difflib import SequenceMatcher
from utils.models import FieldMetadata, RepairCandidate
from typing import List, Tuple, Dict, Any

AUTO_REPAIR_THRESHOLD = 0.90


def _name_similarity(a: FieldMetadata, b: FieldMetadata) -> float:
    return SequenceMatcher(None, a.technical_name.lower(), b.technical_name.lower()).ratio()


def _type_match(a: FieldMetadata, b: FieldMetadata) -> float:
    return 1.0 if a.data_type == b.data_type and a.role == b.role else 0.0


def _position_match(a: FieldMetadata, b: FieldMetadata) -> float:
    if a.position == b.position:
        return 1.0
    distance = abs(a.position - b.position)
    return max(0.0, 1.0 - distance * 0.2)


def _cardinality_similarity(a: FieldMetadata, b: FieldMetadata) -> float:
    if a.cardinality is None or b.cardinality is None:
        return 0.5
    if a.cardinality == 0 and b.cardinality == 0:
        return 1.0
    ratio = min(a.cardinality, b.cardinality) / max(a.cardinality, b.cardinality, 1)
    return ratio


SIGNALS = [
    (_name_similarity, 0.35),
    (_type_match, 0.30),
    (_position_match, 0.20),
    (_cardinality_similarity, 0.15),
]


def score_candidate(old_field: FieldMetadata, new_field: FieldMetadata) -> RepairCandidate:
    signal_scores = {}
    total = 0.0
    for fn, weight in SIGNALS:
        score = fn(old_field, new_field)
        signal_scores[fn.__name__] = round(score, 2)
        total += score * weight

    return RepairCandidate(
        old_field=old_field,
        new_field=new_field,
        confidence=round(total, 2),
        signals=signal_scores,
    )


def find_missing_fields(bound_fields: List[FieldMetadata], current_metadata: List[FieldMetadata]) -> List[FieldMetadata]:
    current_names = {f.technical_name for f in current_metadata}
    return [f for f in bound_fields if f.technical_name not in current_names]


def propose_repairs(
    missing_fields: List[FieldMetadata],
    current_metadata: List[FieldMetadata],
) -> List[RepairCandidate]:
    proposals = []
    for missing in missing_fields:
        candidates = [score_candidate(missing, new) for new in current_metadata]
        if candidates:
            best = max(candidates, key=lambda c: c.confidence)
            proposals.append(best)
    return proposals


def triage(proposals: List[RepairCandidate]) -> Tuple[List[RepairCandidate], List[RepairCandidate]]:
    auto = [p for p in proposals if p.confidence >= AUTO_REPAIR_THRESHOLD]
    review = [p for p in proposals if p.confidence < AUTO_REPAIR_THRESHOLD]
    return auto, review


def apply_repair(story_payload: Dict[str, Any], repair: RepairCandidate) -> Dict[str, Any]:
    import copy
    patched = copy.deepcopy(story_payload)
    old_name = repair.old_field.technical_name
    new_name = repair.new_field.technical_name

    for page in patched.get("pages", []):
        for widget in page.get("widgets", []):
            binding = widget.get("bindings", {})
            for key in ("measures", "dimensions"):
                binding[key] = [new_name if f == old_name else f for f in binding.get(key, [])]

    patched["version"] = patched.get("version", 1) + 1
    patched.setdefault("repairLog", []).append({
        "field": old_name,
        "replacedWith": new_name,
        "confidence": repair.confidence,
        "signals": repair.signals,
    })
    return patched
