import re
import json
import os
from typing import Dict, List, Tuple, Any, Optional
import argparse

def strip_leading_number(clue: str) -> str:
    """Remove leading number, dot/comma, and spaces from clue"""
    return re.sub(r"^\s*\d+[\.,]?\s*", "", clue)


def detect_clue_numbers(grid: List[List[str]]) -> Dict[str, List[Tuple[int, int, int]]]:
    """
    Detect clue numbers and positions from grid layout
    Returns mapping of clue positions and numbers
    """
    rows = len(grid)
    cols = max(len(row) for row in grid) if grid else 0
    clue_numbers = []
    num = 1
    clue_map = {"across": [], "down": []}
    
    for r in range(rows):
        for c in range(len(grid[r])):
            if grid[r][c] == "#":
                continue
                
            # Check if this is start of an across clue
            is_across = (c == 0 or grid[r][c-1] == "#") and (c+1 < len(grid[r]) and grid[r][c+1] == " ")
            
            # Check if this is start of a down clue
            is_down = (r == 0 or grid[r-1][c] == "#") and (r+1 < rows and c < len(grid[r+1]) and grid[r+1][c] == " ")
            
            if is_across or is_down:
                if is_across:
                    clue_map["across"].append((r, c, num))
                if is_down:
                    clue_map["down"].append((r, c, num))
                num += 1
                
    return clue_map


def grid_to_xd(grid: List[List[str]]) -> str:
    """Convert grid array to XD format string"""
    lines = []
    for row in grid:
        line = ''
        for cell in row:
            if cell == "#":
                line += "#"
            else:
                line += "_"
        lines.append(line)
    return '\n'.join(lines)


def clues_to_xd(clues: Dict[str, List[str]], clue_map: Dict[str, List[Tuple[int, int, int]]]) -> str:
    """Convert clues dictionary to XD format string"""
    clue_lines = []
    clue_lines.append('')
    
    # Across clues
    for idx, clue in enumerate(clues.get('across', [])):
        clue = strip_leading_number(clue)
        if idx < len(clue_map["across"]):
            num = clue_map["across"][idx][2]
        else:
            num = "?"
        clue_lines.append(f"A{num}. {clue} ~")
    
    clue_lines.append('')
    
    # Down clues
    for idx, clue in enumerate(clues.get('down', [])):
        clue = strip_leading_number(clue)
        if idx < len(clue_map["down"]):
            num = clue_map["down"][idx][2]
        else:
            num = "?"
        clue_lines.append(f"D{num}. {clue} ~")
        
    return '\n'.join(clue_lines)


def create_xd_from_json(grid_json_path: str, clues_json_path: str, output_xd_path: str) -> Dict[str, Any]:
    """
    Main API function to create XD file from JSON files
    
    Args:
        grid_json_path: Path to grid.json file
        clues_json_path: Path to clues.json file  
        output_xd_path: Path where output.xd will be saved
        
    Returns:
        Dictionary with success status and details
    """
    try:
        # Load grid
        if not os.path.exists(grid_json_path):
            return {"success": False, "error": f"Grid JSON file not found: {grid_json_path}"}
            
        with open(grid_json_path, 'r') as f:
            grid = json.load(f)
        
        # Load clues
        if not os.path.exists(clues_json_path):
            return {"success": False, "error": f"Clues JSON file not found: {clues_json_path}"}
            
        with open(clues_json_path, 'r') as f:
            clues = json.load(f)
        
        # Detect clue numbers from grid
        clue_map = detect_clue_numbers(grid)
        
        # Create output directory if it doesn't exist
        out_dir = os.path.dirname(output_xd_path)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        
        # Write to .xd format
        with open(output_xd_path, 'w', encoding='utf-8') as f:
            f.write(grid_to_xd(grid))
            f.write('\n')
            f.write(clues_to_xd(clues, clue_map))
        
        return {
            "success": True,
            "xd_file_path": output_xd_path,
            "grid_size": {
                "rows": len(grid),
                "cols": max(len(row) for row in grid) if grid else 0
            },
            "clue_counts": {
                "across": len(clues.get('across', [])),
                "down": len(clues.get('down', []))
            },
            "detected_clue_numbers": {
                "across_count": len(clue_map["across"]),
                "down_count": len(clue_map["down"])
            },
            "clue_map": clue_map
        }
        
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"JSON parsing error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


def create_xd_from_data(grid: List[List[str]], clues: Dict[str, List[str]], output_xd_path: str) -> Dict[str, Any]:
    """
    Create XD file directly from grid and clues data (alternative API function)
    
    Args:
        grid: 2D list representing the crossword grid
        clues: Dictionary with 'across' and 'down' clue lists
        output_xd_path: Path where output.xd will be saved
        
    Returns:
        Dictionary with success status and details
    """
    try:
        # Detect clue numbers from grid
        clue_map = detect_clue_numbers(grid)
        
        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_xd_path), exist_ok=True)
        
        # Write to .xd format
        with open(output_xd_path, 'w', encoding='utf-8') as f:
            f.write(grid_to_xd(grid))
            f.write('\n')
            f.write(clues_to_xd(clues, clue_map))
        
        return {
            "success": True,
            "xd_file_path": output_xd_path,
            "grid_size": {
                "rows": len(grid),
                "cols": max(len(row) for row in grid) if grid else 0
            },
            "clue_counts": {
                "across": len(clues.get('across', [])),
                "down": len(clues.get('down', []))
            },
            "detected_clue_numbers": {
                "across_count": len(clue_map["across"]),
                "down_count": len(clue_map["down"])
            },
            "clue_map": clue_map
        }
        
    except Exception as e:
        return {"success": False, "error": f"Error creating XD file: {str(e)}"}


def validate_grid_and_clues(grid: List[List[str]], clues: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Validate grid and clues data before creating XD file
    
    Returns:
        Dictionary with validation results and any warnings
    """
    warnings = []
    errors = []
    
    # Validate grid
    if not grid:
        errors.append("Grid is empty")
    else:
        # Check if grid is rectangular
        row_lengths = [len(row) for row in grid]
        if len(set(row_lengths)) > 1:
            warnings.append(f"Grid rows have different lengths: {row_lengths}")
        
        # Check for valid characters
        for r, row in enumerate(grid):
            for c, cell in enumerate(row):
                if cell not in [" ", "#"]:
                    warnings.append(f"Invalid cell character '{cell}' at position ({r}, {c})")
    
    # Validate clues
    if not clues.get('across') and not clues.get('down'):
        errors.append("No clues found (both across and down are empty)")
    
    # Detect clue positions and compare with clue counts
    if not errors:  # Only if grid is valid
        clue_map = detect_clue_numbers(grid)
        
        across_expected = len(clue_map["across"])
        across_provided = len(clues.get('across', []))
        if across_expected != across_provided:
            warnings.append(f"Across clue count mismatch: expected {across_expected}, got {across_provided}")
        
        down_expected = len(clue_map["down"])
        down_provided = len(clues.get('down', []))
        if down_expected != down_provided:
            warnings.append(f"Down clue count mismatch: expected {down_expected}, got {down_provided}")
    
    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "grid_info": {
            "rows": len(grid) if grid else 0,
            "cols": max(len(row) for row in grid) if grid else 0
        } if not errors else None
    }



def main():
    """
    Legacy main function for backwards compatibility.
    Accepts an optional input directory (defaults to 'json_files') or a single JSON path,
    and an optional output path.

    Usage:
      python xd_from_json.py [input_dir_or_json] [-o OUTPUT]
    Examples:
      python xd_from_json.py                 # uses ./json_files/grid.json and ./json_files/clues.json
      python xd_from_json.py my_inputs       # uses my_inputs/grid.json and my_inputs/clues.json
      python xd_from_json.py ./json_files/grid.json -o ./out/output.xd
    """
    parser = argparse.ArgumentParser(description="Create .xd from grid/clues JSON")
    parser.add_argument('input', nargs='?', default='json_files',
                        help="Directory containing grid.json and clues.json or path to a single json file (default: json_files)")
    parser.add_argument('-o', '--output', default='output.xd',
                        help="Output .xd file path (default: output.xd)")
    args = parser.parse_args()

    input_path = args.input
    # Determine grid and clues paths
    if os.path.isdir(input_path):
        grid_path = os.path.join(input_path, 'grid.json')
        clues_path = os.path.join(input_path, 'clues.json')
    else:
        # input_path is a file path (could be grid.json or clues.json)
        base = os.path.dirname(input_path) or '.'
        name = os.path.basename(input_path).lower()
        if name == 'grid.json':
            grid_path = input_path
            clues_path = os.path.join(base, 'clues.json')
        elif name == 'clues.json':
            clues_path = input_path
            grid_path = os.path.join(base, 'grid.json')
        else:
            # If a non-specific json file given, assume directory containing it has the two files
            grid_path = os.path.join(base, 'grid.json')
            clues_path = os.path.join(base, 'clues.json')

    output_path = args.output


    print("DEBUG input_path:", input_path)
    print("DEBUG grid_path:", grid_path)
    print("DEBUG clues_path:", clues_path)
    print("DEBUG output_path:", output_path)

    result = create_xd_from_json(grid_path, clues_path, output_path)

    if result.get("success"):
        print(f"✅ XD file created successfully: {result['xd_file_path']}")
        print(f"📊 Grid: {result['grid_size']['rows']}x{result['grid_size']['cols']}")
        print(f"🔤 Clues: {result['clue_counts']['across']} across, {result['clue_counts']['down']} down")
    else:
        print(f"❌ Error: {result.get('error')}")

# ...existing code...
if __name__ == "__main__":
    main()