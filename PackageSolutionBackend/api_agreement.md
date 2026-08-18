# Unified Backend API Agreement

This document outlines all the available endpoints in the unified backend, running on port `8000`.

## Base URL
`http://localhost:8000`

---

## 1. DS (Datasphere Automator) Endpoints
**Prefix:** `/api/ds`

| Endpoint | Method | Description |
|---|---|---|
| `/api/ds/upload` | `POST` | Uploads one or more `.json` files, bundles them, and builds the initial graph state. |
| `/api/ds/instruct` | `POST` | Accepts a natural language instruction (`{ "instruction": "string" }`) and uses the LLM to patch the current JSON state. |
| `/api/ds/export` | `GET` | Returns the current (modified) JSON state. |
| `/api/ds/state` | `GET` | Returns an object containing both the `original_json` and `current_json`. |
| `/api/ds/undo` | `POST` | Undoes the last instruction patch applied. |
| `/api/ds/redo` | `POST` | Redoes the last instruction patch reverted. |

---

## 2. SAC (Junior BI Developer) Endpoints
**Prefix:** `/api/sac`

| Endpoint | Method | Description |
|---|---|---|
| `/api/sac/` | `GET` | Health check to verify the SAC router is running. |
| `/api/sac/recommend-charts` | `POST` | Accepts a list of models and streams back real-time chart recommendations and mock data via SSE (`text/event-stream`). |
| `/api/sac/generate-story` | `POST` | Accepts selected charts and generates a declarative JSON payload for a SAP Analytics Cloud (SAC) Story. |
| `/api/sac/simulate-drift` | `POST` | Compares old and new metadata schemas, finding missing fields and proposing automatic/manual repairs. |

---

## 3. PE (Package Explorer) Endpoints
**Prefix:** `/api/pe`

Source repository is configured via environment variables:
- `PE_SOURCE_GITHUB_REPO_URL` — full GitHub URL of the source repo
- `PE_SOURCE_GITHUB_TOKEN` — PAT with `Contents: read` access to the source repo

> Change these env vars anytime to switch source repositories. No code changes required.

---

### `POST /api/pe/pulljson`

Pulls KPI JSON files from the source GitHub repo. All JSON files inside each KPI folder are returned (one folder can contain multiple `.json` files). Folder matching is **case-insensitive**.

**Request Body:**
```json
{
  "kpi_names": ["Balance Sheet", "Profit and Loss"]
}
```
- `kpi_names` *(optional)*: list of KPI names to pull. If omitted or `null` → pulls **all** KPI folders found in the root.

**Response:**
```json
{
  "pulled": [
    {
      "kpi_name": "Balance Sheet",
      "folder_name": "Balance Sheet",
      "files": [
        { "file_name": "BalanceSheet.json", "content_base64": "<base64>" }
      ]
    }
  ],
  "failed": [
    { "kpi_name": "Unknown KPI", "error": "Folder 'Unknown KPI' not found in source repo." }
  ]
}
```

**Sample curl:**
```bash
curl -X POST http://localhost:8000/api/pe/pulljson \
  -H "Content-Type: application/json" \
  -d '{"kpi_names": ["Balance Sheet", "Profit and Loss"]}'
```

---

### `POST /api/pe/pushjson`

Pulls the selected KPI JSON files from the source repo, then pushes them to a user-supplied target GitHub repo under `Business Metrics Catalog/<kpi-folder-name>/`.

- Target repo URL and token are provided **at runtime** (not stored or configured in env).
- If a file already exists in the target folder, it is pushed with a numeric suffix: e.g. `BalanceSheet (1).json`, `BalanceSheet (2).json`.
- Supports pushing multiple `.json` files per KPI folder.

**Request Body:**
```json
{
  "target_repo_url": "https://github.com/your-org/target-repo",
  "target_token": "github_pat_...",
  "kpi_names": ["Balance Sheet", "Profit and Loss"]
}
```
- `target_repo_url` *(required)*: full URL of the target GitHub repository.
- `target_token` *(required)*: PAT with `Contents: read & write` access to the target repo.
- `kpi_names` *(optional)*: list of KPI names to export. If omitted or `null` → exports **all** KPIs.

**Response:**
```json
{
  "target_repo": "your-org/target-repo",
  "results": [
    {
      "kpi_name": "Balance Sheet",
      "pushed_files": ["Business Metrics Catalog/Balance Sheet/BalanceSheet.json"],
      "skipped_files": [],
      "error": null
    },
    {
      "kpi_name": "Profit and Loss",
      "pushed_files": ["Business Metrics Catalog/Profit and Loss/ProfitAndLoss (1).json"],
      "skipped_files": [],
      "error": null
    }
  ],
  "total_pushed": 2,
  "total_failed": 0
}
```

**Sample curl:**
```bash
curl -X POST http://localhost:8000/api/pe/pushjson \
  -H "Content-Type: application/json" \
  -d '{
    "target_repo_url": "https://github.com/your-org/target-repo",
    "target_token": "github_pat_your_token_here",
    "kpi_names": ["Balance Sheet", "Profit and Loss", "Accounts Payable"]
  }'
```

**To export ALL KPIs:**
```bash
curl -X POST http://localhost:8000/api/pe/pushjson \
  -H "Content-Type: application/json" \
  -d '{
    "target_repo_url": "https://github.com/your-org/target-repo",
    "target_token": "github_pat_your_token_here"
  }'
```
