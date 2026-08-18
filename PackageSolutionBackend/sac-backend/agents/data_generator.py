import random
from typing import List, Dict, Any
from utils.models import FieldMetadata

def generate_mock_dataset(fields: List[FieldMetadata], live_data: List[Dict[str, Any]], num_rows: int = 50) -> List[Dict[str, Any]]:
    """
    Generates a realistic mock dataset based on the distribution and values of a live data sample.
    """
    if not live_data:
        # Fallback if no live data is provided
        return []

    dataset = []
    
    # Pre-compute min/max for measures and unique values for dimensions based on live sample
    dimension_values = {}
    measure_ranges = {}
    
    for f in fields:
        field_name = f.technical_name
        values_in_sample = [row.get(field_name) for row in live_data if row.get(field_name) is not None]
        
        if f.role.value in ("dimension", "time"):
            dimension_values[field_name] = list(set(values_in_sample)) if values_in_sample else [f"Mock {field_name} A", f"Mock {field_name} B"]
        elif f.role.value == "measure":
            # Extract numeric values
            numeric_vals = []
            for v in values_in_sample:
                try:
                    numeric_vals.append(float(v))
                except (ValueError, TypeError):
                    pass
                    
            if numeric_vals:
                measure_ranges[field_name] = (min(numeric_vals), max(numeric_vals))
            else:
                measure_ranges[field_name] = (10.0, 1000.0)
                
    # First, use up to 10 real live data rows, filling in missing fields randomly
    for real_row in live_data[:10]:
        row = {}
        for f in fields:
            field_name = f.technical_name
            if real_row.get(field_name) is not None:
                val = real_row[field_name]
                # Cast measures to float if needed
                if f.role.value == "measure":
                    try:
                        val = float(val)
                    except:
                        val = 0.0
                row[field_name] = val
            else:
                if f.role.value in ("dimension", "time"):
                    row[field_name] = random.choice(dimension_values[field_name])
                elif f.role.value == "measure":
                    min_val, max_val = measure_ranges[field_name]
                    variance = max((max_val - min_val) * 0.2, 10)
                    val = random.uniform(max(0, min_val - variance), max_val + variance)
                    row[field_name] = round(val, 2)
        dataset.append(row)
                
    # Generate the remaining rows
    remaining_rows = max(0, num_rows - len(dataset))
    for _ in range(remaining_rows):
        row = {}
        for f in fields:
            field_name = f.technical_name
            if f.role.value in ("dimension", "time"):
                row[field_name] = random.choice(dimension_values[field_name])
            elif f.role.value == "measure":
                min_val, max_val = measure_ranges[field_name]
                # Add some variance (+- 20%) to make it look dynamic but realistic
                variance = max((max_val - min_val) * 0.2, 10)
                val = random.uniform(max(0, min_val - variance), max_val + variance)
                row[field_name] = round(val, 2)
        dataset.append(row)
        
    return dataset
