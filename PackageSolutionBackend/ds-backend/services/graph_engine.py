import networkx as nx

class GraphEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.schema_summary = {}

    def build_graph(self, json_data):
        self.graph.clear()
        self.schema_summary = {}
        
        if isinstance(json_data, dict):
            # Check if this is a standard SAP CSN format (Datasphere exports)
            if 'definitions' in json_data and isinstance(json_data['definitions'], dict):
                self._parse_csn(json_data['definitions'])
            else:
                self._parse_node("Root", json_data)
            
    def _parse_csn(self, definitions):
        # 1. Create all nodes first
        for entity_id, entity_data in definitions.items():
            if not isinstance(entity_data, dict):
                continue
                
            # Skip context definitions as they are just spaces, not graph nodes
            if entity_data.get('kind') == 'context':
                continue
                
            # Skip internal delta/history tracking entities to prevent duplicates in the graph
            if '@DataWarehouse.enclosingObject' in entity_data or entity_id.endswith('_Delta'):
                continue
            
            # Use @EndUserText.label or kind as label
            label = entity_data.get('@EndUserText.label', entity_id)
            
            # Extract Space
            space = 'DSP_CUST_CONTENT'
            if '.' in entity_id:
                space = entity_id.split('.')[0]
                
            # Determine specific entity type using SAP annotations
            base_kind = entity_data.get('kind', 'Entity').capitalize()
            node_type = base_kind
            
            modeling_pattern = entity_data.get('@ObjectModel.modelingPattern', {}).get('#')
            editor_type = entity_data.get('@DataWarehouse.editorType', {}).get('#')
            data_category = entity_data.get('dataCategory')
            
            if modeling_pattern == 'ANALYTICAL_CUBE' or data_category == 'CUBE':
                node_type = 'Analytical Model'
            elif modeling_pattern == 'ANALYTICAL_DIMENSION' or data_category == 'DIMENSION':
                node_type = 'Dimension View'
            elif modeling_pattern == 'FACT' or data_category == 'SQLFACT':
                node_type = 'Fact View'
            elif data_category == 'TEXT':
                node_type = 'Text View'
            elif data_category == 'HIERARCHY_WITH_DIRECTORY':
                node_type = 'Hierarchy with Directory'
            elif data_category == 'HIERARCHY':
                node_type = 'Hierarchy View'
            elif editor_type == 'SQLView':
                node_type = 'SQL View'
            elif editor_type == 'DWCQueryModelEditor' or 'query' in entity_data or data_category:
                node_type = 'Graphical View'
            elif base_kind == 'Entity' and 'query' not in entity_data:
                node_type = 'Table (Local/Remote)'
            
            # Extract elements (columns/measures) for detailed view
            elements = entity_data.get('elements', {})
            formatted_elements = []
            if isinstance(elements, dict):
                for col_name, col_data in elements.items():
                    if isinstance(col_data, dict):
                        col_label = col_data.get('@EndUserText.label', col_name)
                        col_type = 'Measure' if '@AnalyticsDetails.measureType' in col_data else 'Dimension'
                        formatted_elements.append({"name": col_name, "label": col_label, "type": col_type})
            
            self.graph.add_node(entity_id, type=node_type, label=label, elements=formatted_elements, space=space)
            # Add rich metadata to schema summary for the LLM context
            self.schema_summary[entity_id] = {
                "type": node_type,
                "label": label,
                "space": space,
                "elements": [el['name'] for el in formatted_elements]
            }
            
        # 2. Extract dependencies for edges
        for entity_id, entity_data in definitions.items():
            if not isinstance(entity_data, dict):
                continue
                
            # Scan for 'ref' arrays inside the entity (usually in query -> SELECT -> from)
            refs = self._find_refs(entity_data)
            # Use a dict to keep track of unique refs and prioritize 'association' type if both exist
            unique_refs = {}
            for ref, edge_type in refs:
                if ref not in unique_refs or edge_type == 'association':
                    unique_refs[ref] = edge_type
                    
            for ref, edge_type in unique_refs.items():
                if ref != entity_id and self.graph.has_node(ref):
                    # Edge from source (ref) to target (entity_id)
                    self.graph.add_edge(ref, entity_id, edge_type=edge_type)
                    
    def _find_refs(self, data, refs=None):
        if refs is None:
            refs = []
            
        if isinstance(data, dict):
            if 'ref' in data and isinstance(data['ref'], list) and len(data['ref']) > 0:
                # Add the root reference (e.g. ["F_SO_PROCESSING_TIME"] -> "F_SO_PROCESSING_TIME")
                refs.append((str(data['ref'][0]), 'sql'))
            if 'target' in data and isinstance(data['target'], str):
                # Associations in CSN often specify the dependency in a 'target' field
                # Use 'association' type for these to show special markers
                refs.append((data['target'], 'association'))
                
            for value in data.values():
                self._find_refs(value, refs)
        elif isinstance(data, list):
            for item in data:
                self._find_refs(item, refs)
                
        return refs
        
    def _parse_node(self, parent_id, node_data, dict_key=None):
        if isinstance(node_data, dict):
            # Look for recognizable entity markers
            potential_keys = ['technicalName', 'name', 'id', 'ID', 'elementName', 'objectName', 'viewName', 'tableName']
            node_id = next((str(node_data.get(k)) for k in potential_keys if node_data.get(k)), None)
            
            # Failsafe: if no explicit ID is found, use the dictionary key from the parent!
            if not node_id:
                if dict_key and isinstance(dict_key, str) and not dict_key.startswith('['):
                    node_id = dict_key
                else:
                    node_id = parent_id
            
            if node_id != parent_id:
                node_type = node_data.get('@type') or node_data.get('type') or 'Object'
                self.graph.add_node(node_id, type=node_type)
                if parent_id != node_id and self.graph.has_node(parent_id):
                    self.graph.add_edge(parent_id, node_id)
                self.schema_summary[node_id] = list(node_data.keys())
                parent_id = node_id

            # Parse columns or elements explicitly if they exist
            columns = node_data.get('elements') or node_data.get('columns')
            if columns and isinstance(columns, list):
                for col in columns:
                    if isinstance(col, dict):
                        col_name = col.get('technicalName') or col.get('name') or col.get('id')
                        if col_name:
                            col_id = f"{parent_id}.{col_name}"
                            self.graph.add_node(col_id, type="Column", label=col_name)
                            self.graph.add_edge(parent_id, col_id)
                        
            # Recursive check to map the entire JSON tree
            for key, value in node_data.items():
                if key not in ['elements', 'columns']:
                    if isinstance(value, (dict, list)):
                        self._parse_node(parent_id, value, dict_key=key)
                        
        elif isinstance(node_data, list):
            for i, item in enumerate(node_data):
                self._parse_node(parent_id, item, dict_key=f"[{i}]")

    def get_graph_data(self, previous_graph=None):
        # Convert to format suitable for React Flow
        nodes = []
        edges = []
        
        all_node_ids = set(self.graph.nodes())
        if previous_graph:
            all_node_ids.update(previous_graph.nodes())
            
        for i, node_id in enumerate(all_node_ids):
            status = 'unchanged'
            node_data = {}
            column_diff = []
            
            if node_id in self.graph:
                node_data = self.graph.nodes[node_id]
                current_elements = {el['name']: el for el in node_data.get('elements', [])}
                
                if previous_graph and node_id not in previous_graph:
                    status = 'added'
                    column_diff = [{**el, "status": "added"} for el in current_elements.values()]
                elif previous_graph and node_id in previous_graph:
                    prev_node = previous_graph.nodes[node_id]
                    prev_elements = {el['name']: el for el in prev_node.get('elements', [])}
                    
                    for name, el in prev_elements.items():
                        if name not in current_elements:
                            column_diff.append({**el, "status": "removed"})
                            status = 'changed'
                            
                    for name, el in current_elements.items():
                        if name not in prev_elements:
                            column_diff.append({**el, "status": "added"})
                            status = 'changed'
                        else:
                            prev_el = prev_elements[name]
                            if el.get('label') != prev_el.get('label') or el.get('type') != prev_el.get('type'):
                                column_diff.append({**el, "status": "changed"})
                                status = 'changed'
                            else:
                                column_diff.append({**el, "status": "unchanged"})
                else:
                    column_diff = [{**el, "status": "unchanged"} for el in current_elements.values()]
            else:
                node_data = previous_graph.nodes[node_id]
                status = 'removed'
                prev_elements = {el['name']: el for el in node_data.get('elements', [])}
                column_diff = [{**el, "status": "removed"} for el in prev_elements.values()]
                
            nodes.append({
                "id": str(node_id),
                "data": {"label": str(node_id), "status": status, "column_diff": column_diff, **node_data},
                "position": {"x": (i % 5) * 150, "y": (i // 5) * 100},
                "type": "entityNode"
            })
            
        all_edges = set(self.graph.edges())
        if previous_graph:
            all_edges.update(previous_graph.edges())
            
        for edge in all_edges:
            status = 'unchanged'
            edge_type = 'sql'
            
            if edge in self.graph.edges():
                edge_data = self.graph.edges[edge]
                edge_type = edge_data.get('edge_type', 'sql')
                if previous_graph and edge not in previous_graph.edges():
                    status = 'added'
            else:
                status = 'removed'
                
            edges.append({
                "id": f"e-{edge[0]}-{edge[1]}",
                "source": str(edge[0]),
                "target": str(edge[1]),
                "animated": True,
                "data": {"status": status, "edge_type": edge_type}
            })
            
        return {"nodes": nodes, "edges": edges}

    def get_schema_summary(self):
        return self.schema_summary
