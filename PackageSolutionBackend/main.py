import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

# Load .env from the same directory as main.py (works regardless of working directory)
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

base_dir = os.path.dirname(os.path.abspath(__file__))
ds_dir  = os.path.join(base_dir, 'ds-backend')
sac_dir = os.path.join(base_dir, 'sac-backend')
pe_dir  = os.path.join(base_dir, 'pe-backend')

# Add all sub-backends to sys.path
sys.path.append(ds_dir)
sys.path.append(sac_dir)
sys.path.append(pe_dir)

# Import DS router (from ds-backend/api/routes.py)
from api.routes import router as ds_router  # type: ignore

# Import SAC router (from sac-backend/sac_routes.py)
from sac_routes import router as sac_router  # type: ignore

# Import PE router (from pe-backend/pe_routes.py)
from pe_routes import router as pe_router  # type: ignore

app = FastAPI(title="Unified Backend – DS, SAC & PE")

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the routers with the requested prefixes
app.include_router(ds_router, prefix="/api/ds", tags=["DS"])
app.include_router(sac_router, prefix="/api/sac", tags=["SAC"])
app.include_router(pe_router, prefix="/api/pe", tags=["PE"])

@app.get("/")
def read_root():
    return {"message": "Unified Backend API is running"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
