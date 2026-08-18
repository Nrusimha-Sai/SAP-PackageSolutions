"""
Chart selection engine.
"""

from __future__ import annotations
import json
from utils.models import DataShape, ChartRecommendation
from typing import List
from clients.llm_client import generate_recommendation
from rich.console import Console

console = Console()

def select_charts(shapes: List[DataShape]) -> List[ChartRecommendation]:
    """
    Uses the Centralized LLM Engine to determine the optimal dashboard layout (multiple charts) from multiple models.
    """
    system_prompt = """
    You are a Master SAP Analytics Cloud (SAC) Data Architect and an Expert React ECharts Developer. You are provided with 'DataShape' profiles of MULTIPLE datasets (their measures, dimensions, and properties).
    Your ultimate goal is to design a world-class, deeply insightful data storytelling dashboard. 
    You must evaluate all 27 available chart types, but you must be EXTREMELY SELECTIVE. ONLY recommend a chart if it provides exceptional, unique analytical value for these specific datasets. Discard weak, redundant, or generic chart options. 
    CRITICAL REQUIREMENT: You MUST include exactly 3 or 4 'numeric_point' (KPI) charts in your recommendations. These should represent the absolute most important top-level metrics across all datasets.
    
    To achieve this, you MUST follow this analytical framework:
    PHASE 1 (Metadata Deep Dive): Map semantic roles across the provided models. Are there time-series fields? Are there geographic hierarchies? What are the core transactional measures vs calculated ratios?
    PHASE 2 (Live Data Interrogation): Look explicitly at the 'LIVE DATA PREVIEW' for each model. Understand cardinality, detect mostly null columns, and identify the exact data shapes.
    PHASE 3 (Perfect Binding Selection): Pick the EXACT right fields based on the data shape. DO NOT mix fields from different source models in the same chart. A chart MUST ONLY bind fields that belong to the SAME `source_model`.
    
    Your rationales MUST read like a Senior Data Scientist explaining their visualization choices to a CEO, explicitly citing findings from the live data.
    
    You must output a pure JSON object containing a 'recommendations' array of widget recommendations. No markdown, no markdown backticks, just the raw JSON.
    
    Format for the output object:
    {
      "recommendations": [
        {
          "chart_type": "<chart_id>",
          "confidence": 0.95,
          "source_model": "<model_id_from_metadata>",
          "rationale": "Why this chart fits these fields",
          "binding": {
             "measures": ["measure1", "measure2"],
             "dimensions": ["dimension1"]
          }
        }
      ]
    }
    
    Available Chart Types (chart_id):
    bar_column, line, numeric_point, gauge, combination_column_line, pareto, stacked_bar_column,
    combination_stacked_column_line, area, stacked_area, pie, donut, bullet, time_series, heat_map,
    waterfall, tree_map, box_plot, marimekko, bubble, histogram, scatterplot, cluster_bubble,
    radar, funnel, sankey, table
    
    STRICT CHART BINDING LIMITS:
    You MUST adhere strictly to these min/max field limits for each chart type. If you violate these, the frontend will crash!
    - table: 1 to 20 Measures, 1 to 20 Dimensions (Virtually unlimited, use for heavy data grids).
    - pie / donut: EXACTLY 1 Measure, EXACTLY 1 Dimension.
    - numeric_point / gauge / kpi_card: EXACTLY 1 Measure, 0 Dimensions.
    - combination / pareto: REQUIRES 2 to 5 Measures, 1 to 2 Dimensions.
    - scatterplot / bubble / cluster_bubble: REQUIRES 2 to 3 Measures, 1 to 2 Dimensions.
    - heat_map / marimekko / sankey: EXACTLY 1 Measure, EXACTLY 2 Dimensions.
    - tree_map: EXACTLY 1 Measure, 1 to 3 Dimensions.
    - radar: 1 to 5 Measures, EXACTLY 1 Dimension.
    - waterfall: 1 to 10 Measures, 0 to 1 Dimensions.
    - ALL OTHER CHARTS (bar_column, line, area, etc.): 1 to 5 Measures, 1 to 2 Dimensions (for visual clarity).
    
    Guidelines:
    - time_series / line: MUST be used if there is a 'has_time' property or time dimension.
    - numeric_point / gauge: Best for single headline KPIs (1 measure, no dimensions).
    - pie / donut: Use for composition when cardinality is very low (< 7).
    - tree_map / marimekko: Use for composition with hierarchical data or high cardinality.
    - combination_column_line / pareto: Use when correlating two distinct measures against a shared dimension, ESPECIALLY if mixing 'currency' and 'quantity' or 'ratio'.
    - scatterplot / bubble: Use when correlating 2 or 3 measures against a high cardinality dimension.
    - waterfall: Use for financial flow or incremental measure changes.
    - sankey: Use for flow data (needs 'Source' and 'Target' style dimensions).
    - box_plot / histogram: Use for statistical distribution analysis of a measure.
    - heat_map: Use for matrix analysis (requires 2 dimensions and 1 measure), or if `has_geo` is true (as a pseudo-map).
    - funnel: MUST be used if dimension sample_values indicate a pipeline or sequence (e.g., Lead, Proposal, Closed).
    - If `has_geo` is true, strongly prefer heat_map or tree_map over standard charts.
    - Always include at least one 'table' showing detailed data.
    - Pick fields that actually exist in the provided shape.
    - CRITICAL INSTRUCTION: If a chart type supports multiple dimensions or measures (like combination charts, scatterplot, heat_map, bubble, stacked charts), you MUST bind multiple relevant fields to it. Do NOT restrict yourself to just 1 measure and 1 dimension if the chart thrives on multiple bindings. Act like a highly experienced SAC developer maximizing the data visualization!
    """
    
    # Extract detailed metadata to give the LLM full visibility
    detailed_metadata = []
    live_data_previews = {}
    summary_stats = {}

    for shape in shapes:
        model_id = shape.model_id
        for m in shape.measures:
            detailed_metadata.append({"model_id": model_id, "name": m.technical_name, "role": "Measure", "type": m.data_type, "semantic_type": m.semantic_type})
        for d in shape.dimensions:
            detailed_metadata.append({"model_id": model_id, "name": d.technical_name, "role": "Dimension", "type": d.data_type, "is_geo": d.is_geo, "sample_values": d.sample_values})
        live_data_previews[model_id] = shape.live_data_preview
        summary_stats[model_id] = {
            "Has Time": shape.has_time,
            "Has Geo": shape.has_geo,
            "Measure Types Profile": shape.measure_types,
            "Max Cardinality": shape.max_cardinality,
            "Hierarchy Depth": shape.hierarchy_depth
        }

    user_prompt = f"""
    FULL METADATA INVENTORY ACROSS ALL MODELS (JSON):
    {json.dumps(detailed_metadata, indent=2)}
    
    LIVE DATA PREVIEWS (Top Sample Rows by Model):
    {json.dumps(live_data_previews, indent=2)}

    DataShape Summaries by Model:
    {json.dumps(summary_stats, indent=2)}
    """
    
    console.print("[cyan]Requesting dashboard blueprint from Centralized LLM...[/cyan]")
    response_text = generate_recommendation(system_prompt, user_prompt)
    
    recommendations = []
    
    if response_text:
        try:
            # Strip potential markdown formatting if the LLM leaked it despite instructions
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            data = json.loads(cleaned_text.strip())
            
            if isinstance(data, dict):
                if "recommendations" in data:
                    data = data["recommendations"]
                else:
                    for val in data.values():
                        if isinstance(val, list):
                            data = val
                            break
                    else:
                        data = [data]
            
            for item in data:
                recommendations.append(ChartRecommendation(**item))
                
        except Exception as e:
            console.print(f"[bold red]Failed to parse LLM JSON: {e}[/bold red]")
            console.print(f"Raw response: {response_text}")
            
    # Fallback if LLM fails or is not configured
    if not recommendations and shapes:
        console.print("[yellow]Falling back to hardcoded default table layout.[/yellow]")
        recommendations = [
            ChartRecommendation(
                chart_type="table",
                confidence=0.4,
                source_model=shapes[0].model_id,
                rationale="Fallback default table.",
                binding={
                    "measures": [m.technical_name for m in shapes[0].measures],
                    "dimensions": [d.technical_name for d in shapes[0].dimensions],
                }
            )
        ]
        
    return evaluate_all_charts(shapes[0] if shapes else None, recommendations)

def evaluate_all_charts(shape: DataShape, llm_recs: List[ChartRecommendation]) -> List[ChartRecommendation]:
    ALL_CHART_TYPES = [
        'bar_column', 'line', 'numeric_point', 'gauge', 'combination_column_line', 
        'pareto', 'stacked_bar_column', 'combination_stacked_column_line', 'area', 
        'stacked_area', 'pie', 'donut', 'bullet', 'time_series', 'heat_map', 
        'waterfall', 'tree_map', 'box_plot', 'marimekko', 'bubble', 'histogram', 
        'scatterplot', 'cluster_bubble', 'radar', 'funnel', 'sankey', 'table'
    ]
    
    num_meas = len(shape.measures)
    num_dims = len(shape.dimensions)
    
    comprehensive_list = []
    
    # Map LLM recommendations by type for easy lookup
    llm_map = {rec.chart_type: rec for rec in llm_recs}
    
    time_dims = [d for d in shape.dimensions if d.role.value == 'time']
    
    for ctype in ALL_CHART_TYPES:
        is_applicable = True
        reason = "Applicable, but not the top LLM recommendation for this dataset."
        
        # Determine specific binding needs
        chart_meas = []
        chart_dims = []
        
        if num_meas > 0:
            if ctype in ('combination_column_line', 'pareto', 'combination_stacked_column_line', 'bubble', 'scatterplot', 'bullet'):
                chart_meas = [m.technical_name for m in shape.measures[:2]]
            else:
                chart_meas = [shape.measures[0].technical_name]
                
        if num_dims > 0:
            if ctype in ('heat_map', 'sankey', 'marimekko'):
                chart_dims = [d.technical_name for d in shape.dimensions[:2]]
            elif ctype == 'table':
                chart_dims = [d.technical_name for d in shape.dimensions[:5]]
                chart_meas = [m.technical_name for m in shape.measures[:5]]
            elif ctype in ('time_series', 'line') and time_dims:
                chart_dims = [time_dims[0].technical_name]
            else:
                chart_dims = [shape.dimensions[0].technical_name]
        
        # Heuristic rules
        if ctype == 'time_series' and not shape.has_time:
            is_applicable = False
            reason = "Requires a time dimension (has_time=true)."
        elif ctype in ('combination_column_line', 'pareto', 'combination_stacked_column_line', 'bubble', 'scatterplot', 'bullet') and num_meas < 2:
            is_applicable = False
            reason = "Requires at least 2 measures."
        elif ctype in ('heat_map', 'sankey', 'marimekko') and num_dims < 2:
            is_applicable = False
            reason = "Requires at least 2 dimensions."
        elif ctype in ('numeric_point', 'gauge') and num_meas < 1:
            is_applicable = False
            reason = "Requires at least 1 measure."
        elif ctype in ('pie', 'donut') and num_dims < 1:
            is_applicable = False
            reason = "Requires at least 1 dimension."
            
        if ctype in llm_map:
            # It was recommended by the LLM
            rec = llm_map[ctype]
            comprehensive_list.append(ChartRecommendation(
                chart_type=ctype,
                confidence=rec.confidence,
                source_model=rec.source_model or shape.model_id,
                rationale=rec.rationale,
                binding=rec.binding,
                is_recommended=True,
                is_applicable=True
            ))
        else:
            comprehensive_list.append(ChartRecommendation(
                chart_type=ctype,
                confidence=0.1,
                source_model=shape.model_id,
                rationale=reason,
                binding={"measures": chart_meas, "dimensions": chart_dims},
                is_recommended=False,
                is_applicable=is_applicable
            ))
            
    # Sort so recommended ones are at the top, then applicable, then non-applicable
    comprehensive_list.sort(key=lambda x: (not x.is_recommended, not x.is_applicable))
    
    return comprehensive_list
