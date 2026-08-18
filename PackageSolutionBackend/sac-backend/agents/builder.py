"""
Generates declarative SAC payloads.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Any, List
from utils.models import ChartRecommendation

def build_widget_payload(widget_id: str, rec: ChartRecommendation, style: Dict[str, Any], model_id: str) -> Dict[str, Any]:
    return {
        "id": widget_id,
        "type": rec.chart_type,
        "dataSource": {
            "modelId": model_id,
        },
        "bindings": rec.binding,
        "style": style,
    }


def build_story_payload(story_id: str, name: str, widgets: List[Dict[str, Any]], max_widgets_per_page: int = 4, kpis: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    pages = []
    
    # Chunk widgets into pages of max_widgets_per_page
    for i in range(0, len(widgets), max_widgets_per_page):
        chunk = widgets[i:i + max_widgets_per_page]
        page_index = (i // max_widgets_per_page) + 1
        pages.append({
            "id": f"page_{page_index}",
            "name": f"Page_{page_index}",
            "layout": "responsive",
            "widgets": chunk,
        })
        
    return {
        "id": story_id,
        "name": name,
        "version": 1,
        "kpis": kpis or [],
        "pages": pages,
    }


def save_story_locally(story_payload: Dict[str, Any], path: str | Path) -> None:
    with open(path, "w") as f:
        json.dump(story_payload, f, indent=2)
