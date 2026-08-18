"""
pe_routes.py  –  Package Explorer Backend
==========================================
Endpoints:
  POST /api/pe/pulljson  – Pull KPI JSON files from the source GitHub repo (env-configured)
  POST /api/pe/pushjson  – Pull from source, then push to a user-supplied target GitHub repo
                           under Business Metrics Catalog/<kpi-folder>/
"""

import os
import re
import base64
from pathlib import Path
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Ensure .env is always loaded (resolves to PackageSolutionBackend/.env)
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Source repo config – read from environment (never hardcoded)
# ─────────────────────────────────────────────────────────────────────────────

def _get_source_config():
    url = os.getenv("PE_SOURCE_GITHUB_REPO_URL", "").strip().rstrip("/").removesuffix(".git")
    token = os.getenv("PE_SOURCE_GITHUB_TOKEN", "").strip()
    if not url:
        raise HTTPException(status_code=500, detail="PE_SOURCE_GITHUB_REPO_URL is not configured in environment.")
    if not token:
        raise HTTPException(status_code=500, detail="PE_SOURCE_GITHUB_TOKEN is not configured in environment.")
    parts = url.rstrip("/").split("/")
    owner, repo = parts[-2], parts[-1]
    return owner, repo, token


def _source_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
    }


def _raw_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.raw",
    }


# ─────────────────────────────────────────────────────────────────────────────
# KPI folder name resolution (case-insensitive)
# ─────────────────────────────────────────────────────────────────────────────

# Canonical mapping from frontend KPI name → preferred source folder name spellings
# (Used only as hints; actual resolution is always case-insensitive against repo listing)
KPI_FOLDER_HINTS = {
    "accounts receivable":    ["Accounts Receivable"],
    "accounts payable":       ["Accounts payable"],
    "balance sheet":          ["Balance Sheet"],
    "customer performance":   ["Customer Performance"],
    "days sales outstanding":  ["Days sales outstanding"],
    "delivery lead time":     ["Delivery Lead Time"],
    "inventory analysis":     ["Inventory Analysis"],
    "material performance":   ["Material Performance"],
    "profit and loss":        ["Profit and Loss"],
    "sales revenue":          ["Sales Revenue"],
    "spend analysis":         ["Spend Analysis"],
    "stock overview":         ["Stock Overview"],
    "supplier score card":    ["Supplier score card"],
    "trial balance":          ["Trial Balance"],
}


def _find_folder(root_items: list, kpi_name: str) -> Optional[dict]:
    """
    Case-insensitive lookup of a KPI folder inside root_items (GitHub Contents API response).
    Strips non-alphanumeric characters before comparing so that spacing / punctuation
    differences don't matter.
    """
    def normalise(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", s.lower())

    target = normalise(kpi_name)
    for item in root_items:
        if item.get("type") == "dir" and normalise(item["name"]) == target:
            return item

    # Fallback: contains-match
    for item in root_items:
        if item.get("type") == "dir" and target in normalise(item["name"]):
            return item

    return None


# ─────────────────────────────────────────────────────────────────────────────
# GitHub helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _list_root(client: httpx.AsyncClient, owner: str, repo: str, token: str) -> list:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents"
    r = await client.get(url, headers=_source_headers(token))
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Source repository '{owner}/{repo}' not found or token lacks access.")
    if r.status_code == 401 or r.status_code == 403:
        error_msg = r.json().get("message", r.text) if r.content else "No response body"
        raise HTTPException(status_code=403, detail=f"Source GitHub token is invalid or lacks read access. GitHub says: {error_msg}")
    r.raise_for_status()
    return r.json()


async def _list_folder(client: httpx.AsyncClient, folder_url: str, token: str) -> list:
    r = await client.get(folder_url, headers=_source_headers(token))
    r.raise_for_status()
    return r.json()


async def _fetch_raw_file(client: httpx.AsyncClient, file_url: str, token: str) -> bytes:
    r = await client.get(file_url, headers=_raw_headers(token))
    r.raise_for_status()
    return r.content


async def _get_existing_sha(
    client: httpx.AsyncClient,
    owner: str, repo: str, path: str, token: str
) -> Optional[str]:
    """Return the SHA of an existing file in the target repo, or None if it doesn't exist."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    r = await client.get(url, headers=_source_headers(token))
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json().get("sha")


async def _list_target_folder(
    client: httpx.AsyncClient,
    owner: str, repo: str, folder_path: str, token: str
) -> list:
    """List files in a target repo folder. Returns [] if folder doesn't exist."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{folder_path}"
    r = await client.get(url, headers=_source_headers(token))
    if r.status_code == 404:
        return []
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else []


def _resolve_target_filename(existing_names: set, filename: str) -> str:
    """
    If `filename` already exists in the target folder, append (1), (2), … suffix
    before the extension until a unique name is found.
    e.g.  BalanceSheet.json  →  BalanceSheet (1).json
    """
    if filename not in existing_names:
        return filename
    stem, _, ext = filename.rpartition(".")
    if not stem:
        stem, ext = filename, ""
    counter = 1
    while True:
        candidate = f"{stem} ({counter}).{ext}" if ext else f"{stem} ({counter})"
        if candidate not in existing_names:
            return candidate
        counter += 1


async def _push_file(
    client: httpx.AsyncClient,
    owner: str, repo: str, path: str,
    content_bytes: bytes, token: str,
    sha: Optional[str] = None,
    commit_message: str = "chore: add Business Metrics Catalog JSON"
) -> None:
    payload = {
        "message": commit_message,
        "content": base64.b64encode(content_bytes).decode(),
    }
    if sha:
        payload["sha"] = sha

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    r = await client.put(url, json=payload, headers=_source_headers(token))
    if not r.is_success:
        detail = r.json().get("message", r.text) if r.content else r.text
        raise HTTPException(status_code=r.status_code, detail=f"GitHub push failed for '{path}': {detail}")


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class PullJsonRequest(BaseModel):
    kpi_names: Optional[List[str]] = None  # If empty/None → pull all KPIs


class PullJsonFileResult(BaseModel):
    kpi_name: str
    folder_name: str
    files: List[dict]            # [{file_name, content_base64}]
    error: Optional[str] = None


class PullJsonResponse(BaseModel):
    pulled: List[PullJsonFileResult]
    failed: List[dict]           # [{kpi_name, error}]


class PushJsonRequest(BaseModel):
    target_repo_url: str
    target_token: str
    kpi_names: Optional[List[str]] = None  # If empty → push all KPIs


class PushJsonResult(BaseModel):
    kpi_name: str
    pushed_files: List[str]
    skipped_files: List[str]
    error: Optional[str] = None


class PushJsonResponse(BaseModel):
    target_repo: str
    results: List[PushJsonResult]
    total_pushed: int
    total_failed: int


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: POST /api/pe/pulljson
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/pulljson", response_model=PullJsonResponse)
async def pull_json(body: PullJsonRequest):
    """
    Pull JSON file(s) from the source GitHub repo (configured via PE_SOURCE_GITHUB_REPO_URL
    and PE_SOURCE_GITHUB_TOKEN env vars).

    - If `kpi_names` is empty or null → pulls all KPI folders found in the root.
    - Matching is case-insensitive (e.g., "balance sheet" matches "Balance Sheet" folder).
    - Every .json file inside each KPI folder is returned.
    """
    owner, repo, token = _get_source_config()

    async with httpx.AsyncClient(timeout=30) as client:
        root_items = await _list_root(client, owner, repo, token)

        # Determine which KPIs to pull
        if body.kpi_names:
            target_kpis = body.kpi_names
        else:
            # Pull all directories found in root
            target_kpis = [item["name"] for item in root_items if item.get("type") == "dir"]

        pulled: List[PullJsonFileResult] = []
        failed: List[dict] = []

        for kpi_name in target_kpis:
            folder_item = _find_folder(root_items, kpi_name)
            if not folder_item:
                failed.append({"kpi_name": kpi_name, "error": f"Folder '{kpi_name}' not found in source repo."})
                continue

            try:
                folder_contents = await _list_folder(client, folder_item["url"], token)
                json_files = [f for f in folder_contents if f.get("type") == "file" and f["name"].lower().endswith(".json")]

                if not json_files:
                    failed.append({"kpi_name": kpi_name, "error": f"No .json files found in folder '{folder_item['name']}'."})
                    continue

                file_results = []
                for jf in json_files:
                    raw_bytes = await _fetch_raw_file(client, jf["url"], token)
                    file_results.append({
                        "file_name": jf["name"],
                        "content_base64": base64.b64encode(raw_bytes).decode(),
                    })

                pulled.append(PullJsonFileResult(
                    kpi_name=kpi_name,
                    folder_name=folder_item["name"],
                    files=file_results,
                ))

            except HTTPException:
                raise
            except Exception as e:
                failed.append({"kpi_name": kpi_name, "error": str(e)})

    return PullJsonResponse(pulled=pulled, failed=failed)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: POST /api/pe/pushjson
# ─────────────────────────────────────────────────────────────────────────────

TARGET_BASE_FOLDER = "Business Metrics Catalog"


@router.post("/pushjson", response_model=PushJsonResponse)
async def push_json(body: PushJsonRequest):
    """
    1. Pull selected KPI JSON files from the source repo (env-configured).
    2. Push them to the user-supplied target repo under:
         Business Metrics Catalog/<source-folder-name>/<filename>.json

    - `kpi_names`: list of KPI names to export. If empty/null → exports all.
    - Folder name matching in source repo is case-insensitive.
    - If a file already exists in the target folder, the new file is pushed
      with a suffix: (1), (2), … (e.g., BalanceSheet (1).json).
    - Target repo URL and token are provided at runtime (not stored).
    """
    # Resolve target repo owner/repo
    target_url = body.target_repo_url.strip().rstrip("/").removesuffix(".git")
    target_token = body.target_token.strip()
    if not target_url or not target_token:
        raise HTTPException(status_code=400, detail="target_repo_url and target_token are required.")

    parts = target_url.split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid target_repo_url format.")
    t_owner, t_repo = parts[-2], parts[-1]

    # Pull from source
    pull_result = await pull_json(PullJsonRequest(kpi_names=body.kpi_names))

    results: List[PushJsonResult] = []
    total_pushed = 0
    total_failed = 0

    async with httpx.AsyncClient(timeout=60) as client:
        for pulled_kpi in pull_result.pulled:
            pushed_files = []
            skipped_files = []

            try:
                target_folder = f"{TARGET_BASE_FOLDER}/{pulled_kpi.folder_name}"

                # Get existing file names in target folder for suffix resolution
                existing_items = await _list_target_folder(client, t_owner, t_repo, target_folder, target_token)
                existing_names = {item["name"] for item in existing_items if item.get("type") == "file"}

                for file_info in pulled_kpi.files:
                    original_name = file_info["file_name"]
                    resolved_name = _resolve_target_filename(existing_names, original_name)

                    # If a suffix was applied, no need to fetch SHA (it's a new file)
                    sha = None
                    if resolved_name == original_name and original_name in existing_names:
                        # Same name exists → get SHA for update
                        sha = await _get_existing_sha(
                            client, t_owner, t_repo,
                            f"{target_folder}/{resolved_name}", target_token
                        )

                    content_bytes = base64.b64decode(file_info["content_base64"])
                    commit_msg = (
                        f"chore: export {pulled_kpi.kpi_name}/{resolved_name} "
                        f"to Business Metrics Catalog"
                    )
                    await _push_file(
                        client, t_owner, t_repo,
                        f"{target_folder}/{resolved_name}",
                        content_bytes, target_token, sha, commit_msg
                    )

                    # Track resolved name to avoid intra-batch collisions
                    existing_names.add(resolved_name)
                    pushed_files.append(f"{target_folder}/{resolved_name}")
                    total_pushed += 1

                results.append(PushJsonResult(
                    kpi_name=pulled_kpi.kpi_name,
                    pushed_files=pushed_files,
                    skipped_files=skipped_files,
                ))

            except HTTPException as he:
                results.append(PushJsonResult(
                    kpi_name=pulled_kpi.kpi_name,
                    pushed_files=pushed_files,
                    skipped_files=skipped_files,
                    error=he.detail,
                ))
                total_failed += 1
            except Exception as e:
                results.append(PushJsonResult(
                    kpi_name=pulled_kpi.kpi_name,
                    pushed_files=pushed_files,
                    skipped_files=skipped_files,
                    error=str(e),
                ))
                total_failed += 1

        # Also record failures from the pull phase
        for f in pull_result.failed:
            results.append(PushJsonResult(
                kpi_name=f["kpi_name"],
                pushed_files=[],
                skipped_files=[],
                error=f["error"],
            ))
            total_failed += 1

    return PushJsonResponse(
        target_repo=f"{t_owner}/{t_repo}",
        results=results,
        total_pushed=total_pushed,
        total_failed=total_failed,
    )
