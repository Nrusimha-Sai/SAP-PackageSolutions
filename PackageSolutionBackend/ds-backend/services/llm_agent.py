import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class JSONPatch(BaseModel):
    op: str = Field(description="The operation to perform (add, remove, replace, move, copy, test)")
    path: str = Field(description="A JSON Pointer to the value being operated on. E.g. /definitions/0/name")
    value: str | int | bool | dict | list | None = Field(default=None, description="The value to apply. Optional depending on op.")

class PatchList(BaseModel):
    patches: list[JSONPatch]

class LLMAgent:
    def __init__(self):
        import os
        from dotenv import load_dotenv
        
        # Force load .env right here to bypass uvicorn spawn issues on Windows
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        root_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
        if os.path.exists(root_env_path):
            load_dotenv(dotenv_path=root_env_path)
        if os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path)
        load_dotenv() # Fallback to standard environment
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(f"CRITICAL: API Key not found! Checked {root_env_path} and {env_path}")
            
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.0-flash" # Use 2.0-flash which is widely available and has huge free tier quotas
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.grok_api_key = os.environ.get("GROK_API_KEY")

    def _log_debug(self, msg):
        with open('llm_debug.txt', 'a') as f:
            f.write(msg + '\n')

    def generate_patches(self, instruction: str, schema_summary: dict) -> list[dict]:
        import json
        
        inst_lower = instruction.lower()
        self._log_debug(f"--- NEW INSTRUCTION: {instruction} ---")
        
        if "replace" in inst_lower and "space" in inst_lower:
            import re
            print("Mock: Intercepted Space change")
            match = re.search(r'space\s+(.+)', instruction, re.IGNORECASE)
            if match:
                new_space = match.group(1).strip()
                self._log_debug(f"Mock hit: Space to {new_space}")
                return [
                    { "op": "replace_string", "path": "/space", "value": { "search": "S3X", "replace": new_space } },
                    { "op": "replace_string", "path": "/definitions/*/space", "value": { "search": "S3X", "replace": new_space } }
                ]
        elif "replace" in inst_lower and "connection" in inst_lower:
            import re
            print("Mock: Intercepted Connection change")
            match = re.search(r'connection\s+(.+)', instruction, re.IGNORECASE)
            if match:
                new_connection = match.group(1).strip()
                self._log_debug(f"Mock hit: connection to {new_connection}")
                return [
                    { "op": "replace_string", "path": "/definitions/*/editorSettings/uiModel", "value": { "search": "S3X_Training_2026_1", "replace": new_connection } },
                    { "op": "replace_string", "path": "/editorSettings/*/uiModel", "value": { "search": "S3X_Training_2026_1", "replace": new_connection } }
                ]

        elif "standard hana table" in inst_lower or "remove delta lake" in inst_lower:
            print("Mock: Intercepted remove DELTA_LAKE instruction")
            patches = [
                { "op": "remove", "path": "/definitions/*/@DataWarehouse.persistence.hdlf.tableFormat" },
                { "op": "remove", "path": "/definitions/*/@DataWarehouse.delta" }
            ]
            if schema_summary:
                for entity_id in schema_summary.keys():
                    patches.append({ "op": "remove", "path": f"/definitions/{entity_id}_Delta" })
            return patches
                
        elif "create a new" in inst_lower and "named" in inst_lower:
            import re
            print("Mock: Intercepted new entity creation")
            match = re.search(r'create a new (kpi|analytic model|model|dimension view|dimension|view) named ([a-zA-Z0-9_]+)', instruction, re.IGNORECASE)
            if match:
                requested_type = match.group(1).lower()
                new_name = match.group(2).upper()
                
                # Dynamically set the correct SAP Modeling Pattern
                modeling_pattern = "ANALYTICAL_FACT"
                if "model" in requested_type or "cube" in requested_type:
                    modeling_pattern = "ANALYTICAL_CUBE"
                elif "dimension" in requested_type:
                    modeling_pattern = "ANALYTICAL_DIMENSION"
                
                # 1. Determine which type of base object we should look for
                target_base_types = ["Table", "entityNode"] # Default for KPIs and Dimensions
                if modeling_pattern == "ANALYTICAL_CUBE":
                    target_base_types = ["Fact View", "Graphical View", "Table"] # Prefer Facts for Analytic Models

                # 2. Find the appropriate base object
                base_table = "UNKNOWN_SOURCE"
                if schema_summary:
                    if modeling_pattern == "ANALYTICAL_CUBE":
                        # Prioritize finding a Fact View or Graphical View first
                        for entity_id, entity_data in schema_summary.items():
                            entity_type = entity_data.get("type", "")
                            if "Fact" in entity_type or "Graphical" in entity_type:
                                base_table = entity_id
                                break
                        # If still not found, fallback to Table
                        if base_table == "UNKNOWN_SOURCE":
                            for entity_id, entity_data in schema_summary.items():
                                if "Table" in entity_data.get("type", ""):
                                    base_table = entity_id
                                    break
                    else:
                        # For KPIs and Dimensions, just find a Table
                        for entity_id, entity_data in schema_summary.items():
                            if "Table" in entity_data.get("type", "") or "entityNode" in entity_data.get("type", ""):
                                base_table = entity_id
                                break
                                
                    # Ultimate fallback
                    if base_table == "UNKNOWN_SOURCE" and schema_summary:
                        base_table = list(schema_summary.keys())[0]

                # 3. Pick a column from the base table
                base_col = "UNKNOWN_COLUMN"
                if base_table in schema_summary:
                    elements = schema_summary[base_table].get("elements", [])
                    if elements:
                        base_col = elements[0]

                # 4. Construct the Elements block and SELECT projection based on the pattern
                elements_block = {}
                query_columns = []
                
                if modeling_pattern == "ANALYTICAL_DIMENSION":
                    # Dimensions require a KEY attribute, not a measure
                    elements_block = {
                        "Dim_Key": {
                            "type": "cds.String",
                            "length": 500,
                            "key": True,
                            "@EndUserText.label": f"Key ({base_col})"
                        }
                    }
                    query_columns = [
                        { "ref": [base_col], "as": "Dim_Key" }
                    ]
                elif modeling_pattern == "ANALYTICAL_CUBE":
                    # Analytic Models usually just pass through the measure from the Fact view
                    elements_block = {
                        "Base_Metric": {
                            "type": "cds.Integer",
                            "@EndUserText.label": f"Metric ({base_col})",
                            "@AnalyticsDetails.measureType": { "#": "BASE" },
                            "@Aggregation.default": { "#": "SUM" }
                        }
                    }
                    query_columns = [
                        { "ref": [base_col], "as": "Base_Metric" }
                    ]
                else: # ANALYTICAL_FACT (KPI)
                    # Facts usually calculate the measure on top of a base table
                    elements_block = {
                        "Base_Metric": {
                            "type": "cds.Integer",
                            "@EndUserText.label": f"Count of {base_col}",
                            "@AnalyticsDetails.measureType": { "#": "BASE" },
                            "@Aggregation.default": { "#": "SUM" }
                        }
                    }
                    query_columns = [
                        { 
                            "func": "COUNT",
                            "args": [{"ref": [base_col]}],
                            "as": "Base_Metric" 
                        }
                    ]
                        
                self._log_debug(f"Mock hit: create new entity {new_name} ({modeling_pattern}) based on {base_table} using {base_col}")
                
                return [
                    { "op": "add", "path": f"/definitions/{new_name}", "value": {
                        "kind": "entity",
                        "@EndUserText.label": new_name.title(),
                        "elements": elements_block,
                        "@ObjectModel.modelingPattern": {
                            "#": modeling_pattern
                        },
                        "@ObjectModel.supportedCapabilities": [
                            { "#": "DATA_STRUCTURE" }
                        ],
                        "@DataWarehouse.editorType": {
                            "#": "DWCQueryModelEditor"
                        },
                        "query": {
                            "SELECT": {
                                "from": {
                                    "ref": [base_table]
                                },
                                "columns": query_columns
                            }
                        }
                    }}
                ]

        elif "calculated column" in inst_lower and "with formula" in inst_lower:
            import re
            print("Mock: Intercepted generic calculated column instruction")
            match = re.search(r'column\s+([a-zA-Z0-9_]+)\s+with formula\s+(.+)', instruction, re.IGNORECASE)
            if match:
                col_name = match.group(1).upper()
                formula = match.group(2).strip()
                
                # Gather all known elements from schema summary to identify columns
                known_elements = set()
                target_entity = "*"
                
                # First pass: collect elements and try to find Analytical Model
                for entity_id, entity_data in schema_summary.items():
                    if isinstance(entity_data, dict):
                        if 'elements' in entity_data:
                            for el in entity_data['elements']:
                                known_elements.add(el.upper())
                        
                        if entity_data.get("type") == "Analytical Model":
                            target_entity = entity_id
                            
                # Fallback if no Analytical Model exists
                if target_entity == "*":
                    for entity_id, entity_data in schema_summary.items():
                        if isinstance(entity_data, dict):
                            node_type = entity_data.get("type", "")
                            if "Fact" in node_type or "Graphical" in node_type:
                                target_entity = entity_id
                                break

                # Find all potential column names in the formula
                words = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', formula)
                unique_words = list(dict.fromkeys(words))
                
                ast_elements = {}
                placeholder_idx = 0
                formula_ast = formula
                
                for word in unique_words:
                    if word.upper() in known_elements:
                        ast_elements[str(placeholder_idx)] = {
                            "operandType": "AnalyticModelCalculatedMeasureOperandType.Element",
                            "key": word
                        }
                        # Use regex word boundaries to safely replace column name with placeholder
                        formula_ast = re.sub(rf'\b{word}\b', f'[{placeholder_idx}]', formula_ast, flags=re.IGNORECASE)
                        placeholder_idx += 1

                self._log_debug(f"Mock hit: calc column {col_name} = {formula} -> {formula_ast} for {target_entity}")
                return [
                    { "op": "add", "path": f"/definitions/{target_entity}/elements/{col_name}", "value": {
                        "@EndUserText.label": col_name.title(),
                        "@AnalyticsDetails.measureType": { "#": "CALCULATION" },
                        "@Aggregation.default": { "#": "FORMULA" }
                    }},
                    { "op": "add", "path": f"/definitions/{target_entity}/query/SELECT/columns/-", "value": {
                        "xpr": [formula],
                        "as": col_name
                    }},
                    { "op": "add", "path": f"/businessLayerDefinitions/{target_entity}/measures/{col_name}", "value": {
                        "text": col_name.title(),
                        "measureType": "AnalyticModelMeasureType.CalculatedMeasure",
                        "isAuxiliary": False,
                        "formulaRaw": formula,
                        "formula": formula_ast,
                        "elements": ast_elements
                    }}
                ]
            else:
                return []
        elif "is_completed" in inst_lower:
            print("Mock: Intercepted boolean instruction")
            return [
                { "op": "add", "path": "/definitions/*/elements/IS_COMPLETED", "value": {
                    "@EndUserText.label": "Is Completed",
                    "@AnalyticsDetails.measureType": None
                }}
            ]
        elif "business name" in inst_lower and "to" in inst_lower:
            import re
            print("Mock: Intercepted business name change")
            match = re.search(r'column\s+([a-zA-Z0-9_]+)\s+to\s+(.+)', instruction, re.IGNORECASE)
            if match:
                col_name = match.group(1).upper()
                col_name_orig = match.group(1)
                new_label = match.group(2).strip()
                self._log_debug(f"Mock hit: business name {col_name} to {new_label}")
                return [
                    { "op": "rename_business_name", "column": col_name, "value": new_label },
                    { "op": "rename_business_name", "column": col_name_orig, "value": new_label }
                ]
            else:
                return []
        elif "technical name" in inst_lower and "to" in inst_lower:
            import re
            print("Mock: Intercepted technical name change (Alias)")
            match = re.search(r'column\s+([a-zA-Z0-9_]+)\s+to\s+([a-zA-Z0-9_]+)', instruction, re.IGNORECASE)
            if match:
                old_col = match.group(1).upper()
                old_col_orig = match.group(1)
                new_col = match.group(2).upper()
                new_col_orig = match.group(2)
                self._log_debug(f"Mock hit: technical name {old_col} to {new_col}")
                return [
                    { "op": "rename_key", "path": f"/definitions/*/elements/{old_col}", "value": new_col },
                    { "op": "rename_key", "path": f"/businessLayerDefinitions/*/attributes/{old_col}", "value": new_col },
                    { "op": "rename_key", "path": f"/businessLayerDefinitions/*/measures/{old_col}", "value": new_col },
                    { "op": "rename_key", "path": f"/definitions/*/elements/{old_col_orig}", "value": new_col_orig },
                    { "op": "rename_key", "path": f"/businessLayerDefinitions/*/attributes/{old_col_orig}", "value": new_col_orig },
                    { "op": "rename_key", "path": f"/businessLayerDefinitions/*/measures/{old_col_orig}", "value": new_col_orig }
                ]
            else:
                return []
        elif "rename" in inst_lower and "to" in inst_lower:
            import re
            print("Mock: Intercepted generic rename")
            match = re.search(r'rename\s+([a-zA-Z0-9_]+)\s+to\s+(.+)', instruction, re.IGNORECASE)
            if match:
                old_col = match.group(1).upper()
                old_col_orig = match.group(1)
                new_label = match.group(2).strip()
                self._log_debug(f"Mock hit: rename {old_col} to {new_label}")
                return [
                    { "op": "rename_business_name", "column": old_col, "value": new_label },
                    { "op": "rename_business_name", "column": old_col_orig, "value": new_label }
                ]
            else:
                return []

            
        prompt = f"""
        You are an expert system that refactors SAP Datasphere JSON metadata files.
        You are given an instruction from a user to modify a JSON file.
        You must return valid JSON Patch (RFC 6902) operations to achieve this.

        User Instruction: "{instruction}"

        Available Entities and their top-level keys in the current JSON (schema summary):
        {json.dumps(schema_summary, indent=2)}

        Ensure the path uses valid JSON pointers based on generic Datasphere structure. 
        If the instruction is 'Rename column Gross_Amount to Total_Revenue', you might return:
        {{
          "patches": [
            {{ "op": "replace", "path": "/*/elements/*/technicalName", "value": "Total_Revenue" }}
          ]
        }}
        If the instruction is 'add a calculated column X with formula Y', you MUST add it to three locations using "add":
        1. "/definitions/*/elements/X" (with @AnalyticsDetails.measureType = CALCULATION)
        2. "/definitions/*/query/SELECT/columns/-" (append to the SELECT columns array with "xpr" and "as": "X")
        3. "/businessLayerDefinitions/*/measures/X" (with measureType = AnalyticModelMeasureType.CalculatedMeasure)
        
        If the instruction is 'change business name of column X to Y', use the custom "rename_business_name" op:
        1. {{"op": "rename_business_name", "column": "X", "value": "Y"}}

        If the instruction is 'rename technical name of column X to Y', use the custom "rename_key" op to change the top-level keys but preserve internal attribute mapping (Option B Alias):
        1. {{"op": "rename_key", "path": "/definitions/*/elements/X", "value": "Y"}}
        2. {{"op": "rename_key", "path": "/businessLayerDefinitions/*/attributes/X", "value": "Y"}}
        3. {{"op": "rename_key", "path": "/businessLayerDefinitions/*/measures/X", "value": "Y"}}
        
        Note: The actual modifier engine supports wildcards '*' in the path to apply changes across all matching structures.
        You MUST return ONLY a valid JSON object with a single "patches" array. Do not return markdown blocks.
        """
        
        if self.openai_api_key:
            return self._generate_patches_openai(prompt)
        elif self.grok_api_key:
            return self._generate_patches_grok(prompt)
        else:
            self._log_debug("No API keys provided for OpenAI or Grok.")
            return []

    def _generate_patches_openai(self, prompt: str) -> list[dict]:
        import json
        import urllib.request
        
        self._log_debug("Sending to OpenAI API...")
        try:
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps({
                    "model": "gpt-4o",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": { "type": "json_object" }
                }).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.openai_api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content']
                self._log_debug(f"OpenAI Response: {content}")
                data = json.loads(content)
                return data.get("patches", [])
        except Exception as ex:
            self._log_debug(f"OpenAI Exception: {ex}")
            if self.grok_api_key:
                self._log_debug("Falling back to Grok API...")
                return self._generate_patches_grok(prompt)
            else:
                self._log_debug("Both OpenAI and Gemini exhausted.")
                return []

    def _generate_patches_grok(self, prompt: str) -> list[dict]:
        import json
        import urllib.request
        
        self._log_debug("Sending to Grok API...")
        try:
            req = urllib.request.Request(
                "https://api.x.ai/v1/chat/completions",
                data=json.dumps({
                    "model": "grok-beta",
                    "messages": [{"role": "user", "content": prompt + "\n\nProvide response in JSON format only without markdown formatting."}],
                    "temperature": 0.1
                }).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.grok_api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content']
                self._log_debug(f"Grok Response: {content}")
                
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                elif content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                data = json.loads(content)
                return data.get("patches", [])
        except Exception as ex:
            self._log_debug(f"Grok Exception: {ex}")
            return []
