"""
Design guideline engine.
"""

from __future__ import annotations
import json
from pathlib import Path
from utils.models import ChartRecommendation
from typing import Dict, Any, Optional, List

DEFAULT_CONFIG_PATH = Path(__file__).parent / "design_guidelines.json"


def load_guidelines(path: Path = DEFAULT_CONFIG_PATH) -> Dict[str, Any]:
    with open(path) as f:
        return json.load(f)


def style_for_chart(rec: ChartRecommendation, guidelines: Dict[str, Any], kpi_metric: Optional[str] = None) -> Dict[str, Any]:
    style = {
        "colorPalette": guidelines["palette"]["categorical"],
        "fontFamily": guidelines["typography"]["font_family"],
        "legendPosition": guidelines["chart_style"]["legend_position"],
        "gridlines": guidelines["chart_style"]["gridlines"],
    }

    max_categories = guidelines["chart_style"]["max_categories_before_top_n"]
    if rec.chart_type in {"bar_chart", "stacked_bar_100pct"}:
        style["topN"] = max_categories
        style["otherBucketLabel"] = guidelines["chart_style"]["top_n_bucket_label"]

    if rec.chart_type == "kpi_card" and kpi_metric and kpi_metric in guidelines["kpi_thresholds"]:
        style["thresholds"] = guidelines["kpi_thresholds"][kpi_metric]

    return style


def check_accessibility(style: Dict[str, Any], guidelines: Dict[str, Any]) -> List[str]:
    issues = []
    if guidelines["accessibility"]["colorblind_safe"] and len(style.get("colorPalette", [])) > 6:
        issues.append(
            "More than 6 categorical colors requested -- consider top-N bucketing "
            "to stay within a colorblind-safe palette size."
        )
    return issues
