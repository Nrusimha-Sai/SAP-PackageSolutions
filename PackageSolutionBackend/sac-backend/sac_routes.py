from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from rich.console import Console
from rich.panel import Panel
import json
import concurrent.futures
import asyncio

from utils.models import (
    GenerateStoryRequest, SimulateDriftRequest, StoryResponse, DriftResponse,
    RecommendChartsRequest, RecommendChartsResponse, ChartSelectionRequest
)
from agents.profiler import profile_fields, build_shape
from agents.selector import select_charts
from utils.design import load_guidelines, style_for_chart, check_accessibility
from agents.builder import build_widget_payload, build_story_payload
from agents.drift import find_missing_fields, propose_repairs, triage, apply_repair
from clients import sap_client
from agents.data_generator import generate_mock_dataset

router = APIRouter()
console = Console()

@router.get("/")
def health_check():
    return {"status": "SAC Agent router is running and ready."}

@router.post("/recommend-charts")
async def recommend_charts(req: RecommendChartsRequest):
    model_ids_str = ", ".join([f"{m.space_id}/{m.model_id}" for m in req.models])
    console.print(Panel(f"[bold cyan]=== New Real-Time Request: Recommend Charts for {model_ids_str} ===[/bold cyan]"))
    
    async def generate():
        yield "data: " + json.dumps({"status": f"Connecting to SAP Datasphere for {len(req.models)} models...", "step": 1, "total": 4}) + "\n\n"
        
        shapes = []
        all_metadata_dicts = {"dimensions": {}, "measures": {}}
        all_mock_datasets = {}
        
        def fetch_for_model(m):
            console.print(f"[cyan]0. Fetching Live Metadata from SAP Datasphere ({m.space_id}/{m.model_id})...[/cyan]")
            metadata = sap_client.fetch_datasphere_metadata(m.space_id, m.model_id)
            if not metadata:
                return None
            
            fields = profile_fields(metadata)
            
            field_output = [f"\n[cyan]1. Profiling BDC metadata for {m.model_id}...[/cyan]"]
            for f in fields:
                field_output.append(f"  {f.name:<20} role={f.role.value:<10} type={f.data_type}")
            console.print("\n".join(field_output))
                
            console.print(f"\n[cyan]1.5 Fetching Live Data Preview for {m.model_id}...[/cyan]")
            live_data = sap_client.fetch_live_data_preview(m.space_id, m.model_id, limit=10)
            
            shape = build_shape(fields, live_data_preview=live_data)
            shape.model_id = m.model_id
            
            avail_dims = [f.name for f in fields if f.role.value in ("dimension", "time")]
            avail_meas = [f.name for f in fields if f.role.value == "measure"]
            
            mock_ds = generate_mock_dataset(fields, live_data, num_rows=20) if live_data else None
            return {
                "model_id": m.model_id,
                "shape": shape,
                "dims": avail_dims,
                "meas": avail_meas,
                "mock_ds": mock_ds
            }

        yield "data: " + json.dumps({"status": "Fetching and Profiling all metadata in parallel...", "step": 2, "total": 4}) + "\n\n"
        
        results = []
        loop = asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(5, max(1, len(req.models)))) as executor:
            futures = [loop.run_in_executor(executor, fetch_for_model, m) for m in req.models]
            completed = 0
            for coro in asyncio.as_completed(futures):
                res = await coro
                completed += 1
                if res:
                    results.append(res)
                    yield "data: " + json.dumps({"status": f"Fetched metadata for {res['model_id']} ({completed}/{len(req.models)})...", "step": 2, "total": 4}) + "\n\n"
                    
        if not results:
            yield "data: " + json.dumps({"error": "Failed to fetch metadata for any of the requested models. Check .env configuration and logs."}) + "\n\n"
            return
            
        for res in results:
            shapes.append(res["shape"])
            all_metadata_dicts["dimensions"][res["model_id"]] = res["dims"]
            all_metadata_dicts["measures"][res["model_id"]] = res["meas"]
            if res["mock_ds"]:
                all_mock_datasets[res["model_id"]] = res["mock_ds"]

        yield "data: " + json.dumps({"status": "Agentic LLM deeply analyzing data and charting optimal dashboard...", "step": 3, "total": 4}) + "\n\n"

        console.print("\n[cyan]2. Chart selection (Multi-Widget Blueprint) for multiple models...[/cyan]")
        recs = await asyncio.to_thread(select_charts, shapes)
        
        yield "data: " + json.dumps({"status": "Aggregating dynamic realistic mock dataset for UI preview...", "step": 4, "total": 4}) + "\n\n"
        
        final_response = RecommendChartsResponse(
            recommendations=recs,
            metadata=all_metadata_dicts,
            mock_dataset=all_mock_datasets
        )
        
        resp_dict = final_response.dict() if hasattr(final_response, "dict") else final_response.model_dump()
        yield "data: " + json.dumps({"result": resp_dict}) + "\n\n"

    return StreamingResponse(
        generate(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/generate-story", response_model=StoryResponse)
def generate_story(req: ChartSelectionRequest):
    console.print(Panel(f"[bold cyan]=== New Real-Time Request: Generate Story for {req.space_id}/{req.model_id} ===[/bold cyan]"))
    
    model_id = req.model_id
    recs = req.selected_recommendations
    
    widgets = []
    kpi_widgets = []
    guidelines = load_guidelines()
    
    for i, rec in enumerate(recs):
        console.print(f"  [bold yellow]Widget {i+1}: {rec.chart_type} (confidence={rec.confidence})[/bold yellow]")
        console.print(f"  rationale: {rec.rationale}")
        
        # 3. Applying design guidelines
        style = style_for_chart(rec, guidelines)
        issues = check_accessibility(style, guidelines)
        if issues:
            console.print(f"  [bold red]accessibility issues:[/bold red] {issues}")
            
        widget_id = f"w_{i}_{rec.chart_type}"
        actual_model_id = rec.source_model if rec.source_model else model_id
        widget_payload = build_widget_payload(widget_id, rec, style, model_id=actual_model_id)
        
        if rec.chart_type in ("numeric_point", "kpi_card"):
            kpi_widgets.append(widget_payload)
        else:
            widgets.append(widget_payload)
            
    # 4. Generate declarative story
    console.print("\n[cyan]4. Generating SAC Story JSON...[/cyan]")
    story_id = f"story_{model_id.lower()}_{hash(tuple(r.chart_type for r in recs))}"
    story_payload = build_story_payload(
        story_id,
        f"Auto Dashboard: {model_id}",
        widgets,
        max_widgets_per_page=4,
        kpis=kpi_widgets
    )
    
    # 5. Publish to SAC
    console.print("\n[cyan]5. Publishing to SAP Analytics Cloud...[/cyan]")
    success = sap_client.publish_sac_story(story_payload)
    
    if not success:
        console.print("[bold red]Failed to publish to SAC. Returning payload anyway.[/bold red]")
        return StoryResponse(status="partial_success_publish_failed", story=story_payload)

    console.print("[bold green]Story Generation and Publish Complete![/bold green]")
    return StoryResponse(status="success", story=story_payload)

@router.post("/simulate-drift", response_model=DriftResponse)
def simulate_drift(request: SimulateDriftRequest):
    console.print(Panel("[bold magenta]=== New Request: Simulate Schema Drift ===[/bold magenta]"))
    
    old_fields = profile_fields(request.old_metadata)
    new_fields = profile_fields(request.new_metadata)

    console.print("[magenta]1. Finding missing fields...[/magenta]")
    missing = find_missing_fields(old_fields, new_fields)
    missing_names = [f.technical_name for f in missing]
    console.print(f"  Missing fields: [bold red]{missing_names}[/bold red]")

    console.print("\n[magenta]2. Proposing repairs...[/magenta]")
    proposals = propose_repairs(missing, new_fields)
    auto, review = triage(proposals)

    auto_dicts = []
    for p in auto:
        console.print(f"  [bold green]Auto-repair candidate:[/bold green] {p.old_field.technical_name} -> {p.new_field.technical_name} (confidence {p.confidence})")
        auto_dicts.append({"old": p.old_field.technical_name, "new": p.new_field.technical_name, "confidence": p.confidence})
        
    review_dicts = []
    for p in review:
        console.print(f"  [bold yellow]Needs human review:[/bold yellow] {p.old_field.technical_name} -> {p.new_field.technical_name} (confidence {p.confidence})")
        review_dicts.append({"old": p.old_field.technical_name, "new": p.new_field.technical_name, "confidence": p.confidence})

    # For demo purposes, we will mock a basic story payload to apply repairs to
    mock_story = {
        "version": 1,
        "pages": [{
            "widgets": [{
                "bindings": {
                    "dimensions": missing_names,
                    "measures": []
                }
            }]
        }]
    }

    console.print("\n[magenta]3. Applying auto-repairs...[/magenta]")
    for repair in auto:
        mock_story = apply_repair(mock_story, repair)
        console.print(f"  Applied repair for {repair.old_field.technical_name}")

    console.print("[bold green]Drift Analysis Complete![/bold green]")
    return DriftResponse(
        status="success",
        missing_fields=missing_names,
        auto_repaired=auto_dicts,
        needs_review=review_dicts,
        story_version=mock_story.get("version", 1),
        repair_log=mock_story.get("repairLog")
    )
