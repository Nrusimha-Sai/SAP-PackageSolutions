import json

class JSONModifier:
    def __init__(self):
        pass

    def apply_patches(self, json_data: dict, patches: list[dict]) -> dict:
        """
        Applies JSON patches to the given JSON data.
        Supports standard RFC 6902 with custom wildcard '*' support in paths.
        """
        new_data = json.loads(json.dumps(json_data))
        
        for patch in patches:
            op = patch.get('op')
            
            if op == 'rename_business_name':
                column_id = patch.get('column')
                new_label = patch.get('value')
                self._handle_rename_business_name(new_data, column_id, new_label)
                continue
                
            path = patch.get('path')
            value = patch.get('value')
            
            if not path or not path.startswith('/'):
                continue
                
            path_parts = path.strip('/').split('/')
            self._apply_patch_recursive(new_data, path_parts, op, value)
            
        return new_data

    def _handle_rename_business_name(self, new_data, column_id, new_label):
        old_label = None
        actual_column_id = column_id
        
        # 1. Find the old label and resolve actual technical column_id if necessary
        defs = new_data.get('definitions', {})
        for ent_id, ent_data in defs.items():
            if isinstance(ent_data, dict) and 'elements' in ent_data:
                # Direct match on technical name
                if column_id in ent_data['elements']:
                    el = ent_data['elements'][column_id]
                    if isinstance(el, dict):
                        old_label = el.get('@EndUserText.label')
                        break
                
                # Reverse lookup: maybe column_id is actually the old business name
                found = False
                for el_id, el_data in ent_data['elements'].items():
                    if isinstance(el_data, dict) and el_data.get('@EndUserText.label') == column_id:
                        old_label = column_id
                        actual_column_id = el_id
                        found = True
                        break
                if found:
                    break

        column_id = actual_column_id
        
        # 2. Standard Replacements
        for ent_id, ent_data in defs.items():
            if isinstance(ent_data, dict) and 'elements' in ent_data:
                el = ent_data['elements'].get(column_id)
                if isinstance(el, dict) and '@EndUserText.label' in el:
                    el['@EndUserText.label'] = new_label

        bld = new_data.get('businessLayerDefinitions', {})
        for ent_id, ent_data in bld.items():
            if isinstance(ent_data, dict):
                attrs = ent_data.get('attributes', {})
                if column_id in attrs and 'text' in attrs[column_id]:
                    attrs[column_id]['text'] = new_label
                    
                meas = ent_data.get('measures', {})
                if column_id in meas and 'text' in meas[column_id]:
                    meas[column_id]['text'] = new_label

        # 3. Update uiModel safely
        for ent_id, ent_data in defs.items():
            if isinstance(ent_data, dict) and 'uiModel' in ent_data:
                try:
                    ui_model = json.loads(ent_data['uiModel'])
                    contents = ui_model.get('contents', {})
                    for node_id, node_data in contents.items():
                        # Update elements in uiModel
                        if isinstance(node_data, dict) and 'classDefinition' in node_data:
                            if node_data.get('name') == column_id and 'label' in node_data:
                                node_data['label'] = new_label
                                
                        if isinstance(node_data, dict) and 'elements' in node_data:
                            for el_id, el_data in node_data['elements'].items():
                                if isinstance(el_data, dict) and el_data.get('name') == column_id:
                                    el_data['label'] = new_label
                    
                    ent_data['uiModel'] = json.dumps(ui_model)
                except Exception as e:
                    print(f"Error parsing uiModel for {ent_id}: {e}")


    def _global_replace_string(self, target, search_str, replace_str):
        if isinstance(target, dict):
            for k, v in target.items():
                if isinstance(v, str):
                    target[k] = v.replace(search_str, replace_str)
                elif isinstance(v, (dict, list)):
                    self._global_replace_string(v, search_str, replace_str)
        elif isinstance(target, list):
            for i, v in enumerate(target):
                if isinstance(v, str):
                    target[i] = v.replace(search_str, replace_str)
                elif isinstance(v, (dict, list)):
                    self._global_replace_string(v, search_str, replace_str)

    def _apply_patch_recursive(self, current_node, path_parts, op, value):
        if not path_parts:
            return
            
        part = path_parts[0]
        
        # Base case: we are at the target property
        if len(path_parts) == 1:
            if part == '*':
                if isinstance(current_node, dict):
                    for k in current_node:
                        self._execute_op(current_node, k, op, value)
                elif isinstance(current_node, list):
                    for i in range(len(current_node)):
                        self._execute_op(current_node, i, op, value)
            else:
                self._execute_op(current_node, part, op, value)
            return

        # Recursive case
        if part == '*':
            if isinstance(current_node, dict):
                for k, v in current_node.items():
                    if isinstance(v, (dict, list)):
                        self._apply_patch_recursive(v, path_parts[1:], op, value)
            elif isinstance(current_node, list):
                for item in current_node:
                    if isinstance(item, (dict, list)):
                        self._apply_patch_recursive(item, path_parts[1:], op, value)
        else:
            if isinstance(current_node, dict) and part in current_node:
                self._apply_patch_recursive(current_node[part], path_parts[1:], op, value)
            elif isinstance(current_node, list) and part.isdigit() and int(part) < len(current_node):
                self._apply_patch_recursive(current_node[int(part)], path_parts[1:], op, value)

    def _execute_op(self, target, key, op, value):
        if op == 'replace':
            if isinstance(target, dict) and key in target:
                target[key] = value
            elif isinstance(target, list) and isinstance(key, int):
                target[key] = value
        elif op == 'add':
            if isinstance(target, dict):
                target[key] = value
            elif isinstance(target, list) and isinstance(key, int):
                target.insert(key, value)
            elif isinstance(target, list) and key == '-':
                target.append(value)
        elif op == 'remove':
            if isinstance(target, dict) and key in target:
                del target[key]
            elif isinstance(target, list) and isinstance(key, int):
                del target[key]
        elif op == 'rename_key':
            if isinstance(target, dict) and key in target:
                target[value] = target.pop(key)
        elif op == 'replace_string':
            if isinstance(target, dict) and key in target and isinstance(target[key], str):
                search_str = value.get('search')
                replace_str = value.get('replace')
                if search_str and replace_str:
                    target[key] = target[key].replace(search_str, replace_str)
