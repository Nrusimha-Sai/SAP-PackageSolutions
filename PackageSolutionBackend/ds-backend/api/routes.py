from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from pydantic import BaseModel
import json
import base64
import httpx
from typing import List, Optional
from services.graph_engine import GraphEngine
from services.llm_agent import LLMAgent
from services.modifier import JSONModifier

router = APIRouter()

# In-memory storage for simplicity in this local-first app
import copy

class AppState:
    def __init__(self):
        self.original_json = None
        self.current_json = None
        self.original_graph = None
        self.previous_graph = None
        self.undo_stack = []
        self.redo_stack = []
        self.graph_engine = GraphEngine()
        self.llm_agent = LLMAgent()
        self.modifier = JSONModifier()

app_state = AppState()

class InstructionRequest(BaseModel):
    instruction: str

@router.post("/upload")
async def upload_file(files: List[UploadFile] = File(...)):
    # Validate files
    for file in files:
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    try:
        bundled_json = {}
        
        print(f"1. Receiving {len(files)} files...")
        for file in files:
            content = await file.read()
            data = json.loads(content)
            # Merge all root keys dynamically to preserve $version, $syntax, meta,
            # businessLayerDefinitions, editorSettings, definitions, etc.
            # The FIRST file's top-level scalar/metadata keys ($version, $syntax, meta) win.
            for root_key, root_value in data.items():
                if root_key not in bundled_json:
                    bundled_json[root_key] = copy.deepcopy(root_value)
                elif isinstance(root_value, dict) and isinstance(bundled_json[root_key], dict):
                    bundled_json[root_key].update(root_value)
                elif isinstance(root_value, list) and isinstance(bundled_json[root_key], list):
                    bundled_json[root_key].extend(root_value)
                # For scalar keys ($version, $syntax etc.) already set, keep the first file's value
                
        print(f"2. Bundled and compressed JSON successfully.")
        
        print("3. Parsing original JSON...")
        app_state.original_json = copy.deepcopy(bundled_json)
        print("4. Parsing current JSON...")
        app_state.current_json = bundled_json
        
        app_state.undo_stack.clear()
        app_state.redo_stack.clear()
        app_state.previous_graph = None
        app_state.original_graph = None
        
        print("5. Building Graph...")
        app_state.graph_engine.build_graph(app_state.current_json)
        app_state.original_graph = copy.deepcopy(app_state.graph_engine.graph)
        print("6. Graph Built! Getting Graph Data...")
        graph_data = app_state.graph_engine.get_graph_data()
        
        print("7. Success! Returning response...")
        return {"message": f"{len(files)} files uploaded and bundled successfully", "graph": graph_data}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file found in upload")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/instruct")
def process_instruction(req: InstructionRequest):
    if not app_state.current_json:
        raise HTTPException(status_code=400, detail="No JSON file uploaded")
    
    try:
        # Ask LLM for patches based on instruction and current context
        # We pass a summary of the schema to the LLM to help it generate accurate patches
        schema_summary = app_state.graph_engine.get_schema_summary()
        patches = app_state.llm_agent.generate_patches(req.instruction, schema_summary)
        
        # Save to undo stack and apply patches
        app_state.undo_stack.append(copy.deepcopy(app_state.current_json))
        app_state.redo_stack.clear()
        app_state.previous_graph = copy.deepcopy(app_state.graph_engine.graph)
        
        updated_json = app_state.modifier.apply_patches(app_state.current_json, patches)
        app_state.current_json = updated_json
        
        # Rebuild DAG
        app_state.graph_engine.build_graph(updated_json)
        graph_data = app_state.graph_engine.get_graph_data(app_state.original_graph)
        
        return {
            "message": "Instruction applied successfully",
            "patches": patches,
            "graph": graph_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export_json():
    if not app_state.current_json:
        raise HTTPException(status_code=400, detail="No JSON file available for export")
    return app_state.current_json

@router.get("/state")
async def get_state():
    if not app_state.current_json:
        raise HTTPException(status_code=400, detail="No JSON file available")
    return {
        "original_json": app_state.original_json,
        "current_json": app_state.current_json
    }

@router.post("/undo")
async def undo_action():
    if not app_state.undo_stack:
        raise HTTPException(status_code=400, detail="Nothing to undo")
    
    app_state.redo_stack.append(copy.deepcopy(app_state.current_json))
    app_state.previous_graph = copy.deepcopy(app_state.graph_engine.graph)
    app_state.current_json = app_state.undo_stack.pop()
    
    app_state.graph_engine.build_graph(app_state.current_json)
    graph_data = app_state.graph_engine.get_graph_data(app_state.original_graph)
    
    return {"message": "Undo successful", "graph": graph_data}

@router.post("/redo")
async def redo_action():
    if not app_state.redo_stack:
        raise HTTPException(status_code=400, detail="Nothing to redo")
    
    app_state.undo_stack.append(copy.deepcopy(app_state.current_json))
    app_state.previous_graph = copy.deepcopy(app_state.graph_engine.graph)
    app_state.current_json = app_state.redo_stack.pop()
    
    app_state.graph_engine.build_graph(app_state.current_json)
    graph_data = app_state.graph_engine.get_graph_data(app_state.original_graph)
    
    return {"message": "Redo successful", "graph": graph_data}

# ─────────────────────────────────────────────────────────────────────────────
# GitHub Export
# ─────────────────────────────────────────────────────────────────────────────

class DsPushGithubRequest(BaseModel):
    target_repo_url: str
    target_token: str
    original_filename: str
    project_name: str

def _source_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

async def _list_target_folder(
    client: httpx.AsyncClient,
    owner: str, repo: str, folder_path: str, token: str
) -> list:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{folder_path}"
    r = await client.get(url, headers=_source_headers(token))
    if r.status_code == 404:
        return []
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else []

def _resolve_target_filename(existing_names: set, filename: str) -> str:
    if filename not in existing_names:
        return filename
    stem, _, ext = filename.rpartition(".")
    if not stem:
        stem, ext = filename, ""
    counter = 1
    while True:
        candidate = f"{stem}({counter}).{ext}" if ext else f"{stem}({counter})"
        if candidate not in existing_names:
            return candidate
        counter += 1

async def _push_file(
    client: httpx.AsyncClient,
    owner: str, repo: str, path: str,
    content_bytes: bytes, token: str,
    commit_message: str = "chore: add Datasphere JSON export"
) -> None:
    payload = {
        "message": commit_message,
        "content": base64.b64encode(content_bytes).decode(),
    }
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    r = await client.put(url, json=payload, headers=_source_headers(token))
    if not r.is_success:
        detail = r.json().get("message", r.text) if r.content else r.text
        raise HTTPException(status_code=r.status_code, detail=f"GitHub push failed for '{path}': {detail}")

@router.post("/export-to-github")
async def export_to_github(req: DsPushGithubRequest):
    if not app_state.current_json:
        raise HTTPException(status_code=400, detail="No JSON file available for export")
    
    target_url = req.target_repo_url.strip().rstrip("/")
    if target_url.endswith(".git"):
        target_url = target_url[:-4]
    
    target_token = req.target_token.strip()
    if not target_url or not target_token:
        raise HTTPException(status_code=400, detail="target_repo_url and target_token are required.")

    parts = target_url.split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid target_repo_url format.")
    t_owner, t_repo = parts[-2], parts[-1]

    # Convert in-memory json to string
    json_str = json.dumps(app_state.current_json, indent=2)
    content_bytes = json_str.encode("utf-8")

    # Target folder logic
    target_folder = req.project_name.strip()
    if not target_folder:
        target_folder = "DatasphereAgent-Updations"
    
    # Filename resolution
    original = req.original_filename
    if original.lower().endswith(".json"):
        stem = original[:-5]
        base_export_name = f"{stem}_updated.json"
    else:
        base_export_name = f"{original}_updated.json"
        
    async with httpx.AsyncClient(timeout=60) as client:
        # Get existing files
        existing_items = await _list_target_folder(client, t_owner, t_repo, target_folder, target_token)
        existing_names = {item["name"] for item in existing_items if item.get("type") == "file"}

        resolved_name = _resolve_target_filename(existing_names, base_export_name)
        target_path = f"{target_folder}/{resolved_name}"

        # Push to github
        await _push_file(
            client, t_owner, t_repo, target_path,
            content_bytes, target_token,
            commit_message=f"chore: export Datasphere JSON as {resolved_name}"
        )

    return {"message": "Success", "pushed_file": target_path}
