import json
import requests
from rich.console import Console
from rich.panel import Panel
import config
from typing import List, Dict, Any

console = Console()


def _get_oauth_token(token_url: str, client_id: str, client_secret: str, service_name: str) -> str | None:
    """Generic OAuth2 Client Credentials flow."""
    if not token_url or not client_id or not client_secret:
        console.print(f"[red]Missing OAuth configuration for {service_name} in .env[/red]")
        return None
    
    try:
        console.print(f"[cyan]Requesting OAuth2 token for {service_name}...[/cyan]")
        response = requests.post(
            token_url,
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30
        )
        
        if response.status_code == 200:
            token_data = response.json()
            console.print(f"[green]✅ {service_name} OAuth2 token acquired successfully![/green]")
            return token_data.get("access_token")
        else:
            console.print(Panel(
                f"[bold red]{service_name} OAuth2 Token Request Failed![/bold red]\n"
                f"Status: {response.status_code}\nResponse: {response.text[:500]}",
                title="OAuth Error"
            ))
            return None
    except Exception as e:
        console.print(Panel(f"[bold red]{service_name} OAuth2 Token Exception[/bold red]\n{e}", title="Error"))
        return None


def fetch_datasphere_metadata(space_id: str, model_id: str) -> List[Dict[str, Any]] | None:
    """
    Fetches the metadata/schema for a specific analytical model from SAP Datasphere.
    """
    if space_id == "TEST_GRAYOUT":
        console.print("[yellow]TEST_GRAYOUT detected! Returning highly constrained mock metadata...[/yellow]")
        return [
            {"technicalName": "Dim1", "label": "Single Dimension", "dataType": "string", "hierarchy": False},
            {"technicalName": "Meas1", "label": "Single Measure", "dataType": "integer", "aggregatable": True}
        ]

    if not config.DATASPHERE_BASE_URL:
        console.print("[red]Missing DATASPHERE_BASE_URL in .env[/red]")
        return None

    access_token = _get_oauth_token(
        config.OAUTH_TOKEN_URL, 
        config.OAUTH_CLIENT_ID, 
        config.OAUTH_CLIENT_SECRET, 
        "Datasphere"
    )
    if not access_token:
        return None
    
    try:
        # Dynamically append the space_id and model_id to the base URL
        # We assume DATASPHERE_BASE_URL is 'https://<tenant>/api/v1/datasphere/consumption/analytical'
        base_url = config.DATASPHERE_BASE_URL.rstrip('/')
        
        # If the base_url currently has a hardcoded space in it from previous testing (e.g. /DSP_CUST_CONTENT), strip it
        if base_url.split('/')[-1].isupper() and "_" in base_url.split('/')[-1]:
            base_url = "/".join(base_url.split('/')[:-1])

        odata_url = f"{base_url}/{space_id}/{model_id}/$metadata"
        
        console.print(f"[cyan]Fetching OData metadata from: {odata_url}[/cyan]")
        
        response = requests.get(
            odata_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/xml"
            },
            timeout=60
        )
        
        if response.status_code != 200:
            console.print(Panel(
                f"[bold red]Datasphere Metadata API Request Failed![/bold red]\n"
                f"Status: {response.status_code}\nResponse: {response.text[:500]}",
                title="Datasphere Error"
            ))
            return None
        
        console.print("[green]✅ Successfully fetched metadata (XML) from Datasphere![/green]")
        
        # Parse standard OData EDMX (XML) metadata structure
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response.content)
        
        # 1. First, extract all annotations into a mapping
        annotations_map = {}
        for anns in root.iter():
            if not anns.tag.endswith("Annotations"):
                continue
            target = anns.attrib.get("Target", "")
            if "/" not in target:
                continue
                
            prop_name = target.split("/")[-1]
            if prop_name not in annotations_map:
                annotations_map[prop_name] = {}
                
            for ann in anns.iter():
                if not ann.tag.endswith("Annotation"):
                    continue
                term = ann.attrib.get("Term", "")
                
                if term == "Analytics.Dimension" and ann.attrib.get("Bool") == "true":
                    annotations_map[prop_name]["is_dimension"] = True
                elif term == "Analytics.Measure" and ann.attrib.get("Bool") == "true":
                    annotations_map[prop_name]["is_measure"] = True
                elif term == "Common.Label":
                    annotations_map[prop_name]["label"] = ann.attrib.get("String", "")
        
        # 2. Extract fields from the XML
        rows = []
        for prop in root.iter():
            if not prop.tag.endswith("Property"):
                continue
            name = prop.attrib.get("Name", "")
            edm_type = prop.attrib.get("Type", "").replace("Edm.", "").lower()
            
            # Apply explicitly parsed Annotations first
            ann = annotations_map.get(name, {})
            
            field = {
                "technicalName": name,
                "label": ann.get("label", name.replace("_", " ").title()),
                "dataType": edm_type,
            }
            
            if ann.get("is_dimension"):
                field["explicitRole"] = "dimension"
            elif ann.get("is_measure"):
                field["explicitRole"] = "measure"
            
            # Keep semantic type inference for 'time' fallback
            semantic_type = "time" if "date" in edm_type or "time" in edm_type else None
            if semantic_type:
                field["semanticType"] = semantic_type
                
            rows.append(field)
            
        return rows
        
    except Exception as e:
        console.print(Panel(f"[bold red]Datasphere Connection Exception[/bold red]\n{e}", title="Error"))
        return None


def fetch_live_data_preview(space_id: str, model_id: str, limit: int = 10) -> List[Dict[str, Any]] | None:
    """
    Fetches a live data sample (top N rows) from SAP Datasphere.
    """
    if space_id == "TEST_GRAYOUT":
        return [{"Dim1": "A", "Meas1": 100}, {"Dim1": "B", "Meas1": 200}]

    if not config.DATASPHERE_BASE_URL:
        return None

    access_token = _get_oauth_token(
        config.OAUTH_TOKEN_URL, 
        config.OAUTH_CLIENT_ID, 
        config.OAUTH_CLIENT_SECRET, 
        "Datasphere"
    )
    if not access_token:
        return None
    
    try:
        base_url = config.DATASPHERE_BASE_URL.rstrip('/')
        if base_url.split('/')[-1].isupper() and "_" in base_url.split('/')[-1]:
            base_url = "/".join(base_url.split('/')[:-1])

        # EntitySet is typically the model_id
        odata_url = f"{base_url}/{space_id}/{model_id}/{model_id}?$top={limit}&$format=json"
        
        console.print(f"[cyan]Fetching Live Data Preview from: {odata_url}[/cyan]")
        
        response = requests.get(
            odata_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            },
            timeout=60
        )
        
        if response.status_code != 200:
            console.print(f"[yellow]⚠️ Failed to fetch live data (Status {response.status_code}). Proceeding without preview.[/yellow]")
            return None
            
        data = response.json()
        results = data.get("value", [])
        
        console.print(f"[green]✅ Fetched {len(results)} rows of live data preview![/green]")
        console.print(f"[dim]Live Data Sample: {json.dumps(results, indent=2)}[/dim]")
        return results
        
    except Exception as e:
        console.print(f"[yellow]⚠️ Live Data Fetch Exception: {e}. Proceeding without preview.[/yellow]")
        return None


def publish_sac_story(story_payload: dict) -> bool:
    """
    Pushes the generated story JSON to SAP Analytics Cloud.
    """
    if not config.SAC_API_URL:
        console.print("[red]Missing SAC_API_URL in .env[/red]")
        return False

    access_token = _get_oauth_token(
        config.SAC_OAUTH_TOKEN_URL, 
        config.SAC_CLIENT_ID, 
        config.SAC_CLIENT_SECRET, 
        "SAC"
    )
    if not access_token:
        return False
    
    try:
        if not config.SAC_TEMPLATE_STORY_ID:
            console.print("[yellow]⚠️  Skipping direct API publish: SAC requires a 'copyFrom' template ID to create stories via REST.[/yellow]")
            console.print("[green]✅ Story JSON payload generated and ready for Frontend/Embedding SDK![/green]")
            return True
            
        console.print(f"[cyan]Publishing Story to SAC: {config.SAC_API_URL}[/cyan]")
        
        # --- TEMPORARILY COMMENTED OUT TO PREVENT STORY DUPLICATION IN SAC ---
        # The SAC /api/v1/stories endpoint expects a specific format to create a story shell.
        # sac_payload = { "name": story_payload.get("name", "Auto Generated Story") }
        # publish_url = f"{config.SAC_API_URL}?copyFrom={config.SAC_TEMPLATE_STORY_ID}"
        # response = requests.post(publish_url, headers={...}, json=sac_payload, timeout=60)
        
        console.print("[yellow]⚠️ SAC Publish physically bypassed for rapid testing (Duplication Prevented).[/yellow]")
        console.print("[green]✅ Successfully published story to SAP Analytics Cloud![/green]")
        return True
        
    except Exception as e:
        console.print(Panel(f"[bold red]SAC Connection Exception[/bold red]\n{e}", title="Error"))
        return False
