import os
from pathlib import Path
from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parent
_env_path = _project_root / ".env"
_parent_env_path = _project_root.parent / ".env"

if _env_path.exists():
    load_dotenv(_env_path)
elif _parent_env_path.exists():
    load_dotenv(_parent_env_path)
else:
    print(f"⚠️  No .env file found at {_env_path} or {_parent_env_path}.")

# SAP Datasphere OData Configuration
DATASPHERE_BASE_URL = os.getenv("DATASPHERE_BASE_URL")
OAUTH_TOKEN_URL = os.getenv("OAUTH_TOKEN_URL")
OAUTH_CLIENT_ID = os.getenv("OAUTH_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.getenv("OAUTH_CLIENT_SECRET")

# SAP Analytics Cloud Configuration
SAC_API_URL = os.getenv("SAC_API_URL")
SAC_OAUTH_TOKEN_URL = os.getenv("SAC_OAUTH_TOKEN_URL")
SAC_CLIENT_ID = os.getenv("SAC_CLIENT_ID")
SAC_CLIENT_SECRET = os.getenv("SAC_CLIENT_SECRET")
SAC_TEMPLATE_STORY_ID = os.getenv("SAC_TEMPLATE_STORY_ID")

# LLM Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "gemini")
PRIMARY_MODEL = os.getenv("PRIMARY_MODEL", "gemini-2.5-flash")
SECONDARY_PROVIDER = os.getenv("SECONDARY_PROVIDER", "gemini")
SECONDARY_MODEL = os.getenv("SECONDARY_MODEL", "gemini-2.5-flash-lite")
THIRD_PROVIDER = os.getenv("THIRD_PROVIDER", "groq")
THIRD_MODEL = os.getenv("THIRD_MODEL", "llama-3.3-70b-versatile")
FOURTH_PROVIDER = os.getenv("FOURTH_PROVIDER", "groq")
FOURTH_MODEL = os.getenv("FOURTH_MODEL", "qwen/qwen3-32b")
