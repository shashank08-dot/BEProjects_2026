import cv2
import numpy as np
import json
import pytesseract
import os
import base64
from typing import List, Tuple, Dict, Any, Optional

# If Tesseract is not on PATH, set it manually
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string for API response"""
    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')


def base64_to_image(base64_str: str) -> np.ndarray:
    """Convert base64 string back to OpenCV image"""
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def crop_region(image: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Crop a specific region from image using coordinates"""
    return image[y:y + h, x:x + w]


def crop_multiple_regions(image: np.ndarray, coordinates: List[Tuple[int, int, int, int]]) -> List[np.ndarray]:
    """Crop multiple regions from the same image using list of coordinates"""
    regions = []
    for x, y, w, h in coordinates:
        cropped = crop_region(image, x, y, w, h)
        regions.append(cropped)
    return regions


def detect_initial_grid(grid_img: np.ndarray, rows: int, cols: int) -> List[List[str]]:
    """Detect black/white cells in crossword grid automatically"""
    gray = cv2.cvtColor(grid_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)

    h, w = thresh.shape
    cell_h, cell_w = h // rows, w // cols

    grid = []
    
    for i in range(rows):
        row_data = []
        for j in range(cols):
            cell = thresh[i * cell_h:(i + 1) * cell_h, j * cell_w:(j + 1) * cell_w]
            black_ratio = np.sum(cell == 0) / cell.size
            if black_ratio > 0.5:
                row_data.append("#")
            else:
                row_data.append(" ")
        grid.append(row_data)
    
    return grid


def create_grid_preview(grid_img: np.ndarray, grid: List[List[str]], rows: int, cols: int) -> np.ndarray:
    """Create visual preview of the grid with current state"""
    h, w = grid_img.shape[:2]
    cell_h, cell_w = h // rows, w // cols
    
    preview = grid_img.copy()
    
    for i in range(rows):
        for j in range(cols):
            x1, y1 = j * cell_w, i * cell_h
            x2, y2 = (j + 1) * cell_w, (i + 1) * cell_h
            
            if grid[i][j] == "#":
                # Fill cell completely black
                cv2.rectangle(preview, (x1, y1), (x2, y2), (0, 0, 0), -1)
            else:
                # Draw white cell with border
                cv2.rectangle(preview, (x1, y1), (x2, y2), (255, 255, 255), -1)
                cv2.rectangle(preview, (x1, y1), (x2, y2), (100, 100, 100), 1)
    
    return preview


def process_grid_api(grid_img: np.ndarray, rows: int, cols: int, output_json: Optional[str] = None) -> Dict[str, Any]:
    """
    Process grid for API - detect initial grid and return data for Flutter to display/edit
    """
    if output_json is None:
        output_json = os.path.join(os.path.dirname(__file__), "..", "json_files", "grid.json")
    os.makedirs(os.path.dirname(output_json), exist_ok=True)

    # Detect initial grid
    grid = detect_initial_grid(grid_img, rows, cols)
    
    # Create preview image
    preview = create_grid_preview(grid_img, grid, rows, cols)
    
    # Save initial grid
    with open(output_json, "w") as f:
        json.dump(grid, f, indent=2)
    
    return {
        "grid": grid,
        "preview_image": image_to_base64(preview),
        "rows": rows,
        "cols": cols,
        "grid_saved_path": output_json
    }


def update_grid_api(grid_img: np.ndarray, grid: List[List[str]], rows: int, cols: int, 
                   output_json: Optional[str] = None) -> Dict[str, Any]:
    """
    Update grid with user changes and return new preview
    """
    if output_json is None:
        output_json = os.path.join(os.path.dirname(__file__), "..", "json_files", "grid.json")
    
    # Create updated preview
    preview = create_grid_preview(grid_img, grid, rows, cols)
    
    # Save updated grid
    with open(output_json, "w") as f:
        json.dump(grid, f, indent=2)
    
    return {
        "grid": grid,
        "preview_image": image_to_base64(preview),
        "grid_saved_path": output_json
    }


def ocr_regions(regions: List[np.ndarray]) -> List[str]:
    """Perform OCR on multiple regions and return extracted text"""
    extracted_texts = []
    
    for i, region in enumerate(regions):
        print(f"Processing region {i+1}...")
        text = pytesseract.image_to_string(region)
        if text.strip():
            # Split by lines and clean up
            lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
            extracted_texts.extend(lines)
    
    return extracted_texts


# def process_clues_api(image: np.ndarray, across_coordinates: List[Tuple[int, int, int, int]], 
#                      down_coordinates: List[Tuple[int, int, int, int]], 
#                      output_json: Optional[str] = None) -> Dict[str, Any]:
#     """
#     Process clues for API - crop regions and perform OCR
#     """
#     if output_json is None:
#         output_json = os.path.join(os.path.dirname(__file__), "..", "json_files", "clues.json")
#     os.makedirs(os.path.dirname(output_json), exist_ok=True)
    
#     clues_data = {"across": [], "down": []}
    
#     # Process ACROSS clues
#     if across_coordinates:
#         across_regions = crop_multiple_regions(image, across_coordinates)
#         clues_data["across"] = ocr_regions(across_regions)
    
#     # Process DOWN clues  
#     if down_coordinates:
#         down_regions = crop_multiple_regions(image, down_coordinates)
#         clues_data["down"] = ocr_regions(down_regions)
    
#     # Save initial OCR results
#     with open(output_json, "w") as f:
#         json.dump(clues_data, f, indent=2)

#     print(f"Processing {len(across_coordinates)} across crop areas")

    
#     return {
#         "clues": clues_data,
#         "clues_saved_path": output_json,
#         "across_count": len(clues_data["across"]),
#         "down_count": len(clues_data["down"])
#     }


def save_crop_previews(image: np.ndarray, across_coordinates: List[Tuple[int, int, int, int]], 
                      down_coordinates: List[Tuple[int, int, int, int]], session_id: str) -> None:
    """
    Save cropped regions as preview images for debugging
    """
    # Create preview directory
    preview_dir = os.path.join("debug_previews", session_id)
    os.makedirs(preview_dir, exist_ok=True)
    
    print(f"📸 Saving crop previews to: {preview_dir}")
    
    # Save original image with crop rectangles drawn
    preview_image = image.copy()
    
    # Draw across crop rectangles in blue
    for i, (x, y, w, h) in enumerate(across_coordinates):
        print(f"Drawing across crop {i+1}: x={x}, y={y}, w={w}, h={h}")
        cv2.rectangle(preview_image, (x, y), (x + w, y + h), (255, 0, 0), 2)  # Blue
        cv2.putText(preview_image, f"A{i+1}", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
    
    # Draw down crop rectangles in green
    for i, (x, y, w, h) in enumerate(down_coordinates):
        print(f"Drawing down crop {i+1}: x={x}, y={y}, w={w}, h={h}")
        cv2.rectangle(preview_image, (x, y), (x + w, y + h), (0, 255, 0), 2)  # Green
        cv2.putText(preview_image, f"D{i+1}", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Save the main preview image
    main_preview_path = os.path.join(preview_dir, "main_with_crops.png")
    cv2.imwrite(main_preview_path, preview_image)
    print(f"💾 Saved main preview: {main_preview_path}")
    
    # Save individual across crops
    for i, (x, y, w, h) in enumerate(across_coordinates):
        crop = crop_region(image, x, y, w, h)
        crop_path = os.path.join(preview_dir, f"across_crop_{i+1}.png")
        cv2.imwrite(crop_path, crop)
        print(f"💾 Saved across crop {i+1}: {crop_path} (size: {crop.shape[1]}x{crop.shape[0]})")
    
    # Save individual down crops
    for i, (x, y, w, h) in enumerate(down_coordinates):
        crop = crop_region(image, x, y, w, h)
        crop_path = os.path.join(preview_dir, f"down_crop_{i+1}.png")
        cv2.imwrite(crop_path, crop)
        print(f"💾 Saved down crop {i+1}: {crop_path} (size: {crop.shape[1]}x{crop.shape[0]})")

def show_crop_preview_window(image: np.ndarray, across_coordinates: List[Tuple[int, int, int, int]], 
                            down_coordinates: List[Tuple[int, int, int, int]]) -> None:
    """
    Show interactive preview window with crops highlighted
    """
    preview_image = image.copy()
    
    # Draw across crops in blue
    for i, (x, y, w, h) in enumerate(across_coordinates):
        cv2.rectangle(preview_image, (x, y), (x + w, y + h), (255, 0, 0), 2)
        cv2.putText(preview_image, f"Across {i+1}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
    
    # Draw down crops in green
    for i, (x, y, w, h) in enumerate(down_coordinates):
        cv2.rectangle(preview_image, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(preview_image, f"Down {i+1}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    # Resize image for display if too large
    h, w = preview_image.shape[:2]
    if w > 1200 or h > 800:
        scale = min(1200/w, 800/h)
        new_w, new_h = int(w * scale), int(h * scale)
        preview_image = cv2.resize(preview_image, (new_w, new_h))
        print(f"🔍 Resized preview from {w}x{h} to {new_w}x{new_h} for display")
    
    cv2.imshow("Crop Preview - Press any key to close", preview_image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

def validate_crop_coordinates(image: np.ndarray, coordinates: List[Tuple[int, int, int, int]], 
                             coord_type: str) -> List[Tuple[int, int, int, int]]:
    """
    Validate crop coordinates and fix any issues
    """
    h, w = image.shape[:2]
    valid_coords = []
    
    print(f"🔍 Validating {len(coordinates)} {coord_type} coordinates against image size {w}x{h}")
    
    for i, (x, y, width, height) in enumerate(coordinates):
        print(f"  Checking {coord_type} crop {i+1}: x={x}, y={y}, w={width}, h={height}")
        
        # Check bounds
        if x < 0 or y < 0:
            print(f"    ⚠️ Negative coordinates detected: x={x}, y={y}")
        
        if x + width > w:
            print(f"    ⚠️ Crop extends beyond image width: {x + width} > {w}")
        
        if y + height > h:
            print(f"    ⚠️ Crop extends beyond image height: {y + height} > {h}")
        
        # Fix coordinates
        fixed_x = max(0, min(x, w - 1))
        fixed_y = max(0, min(y, h - 1))
        fixed_width = max(1, min(width, w - fixed_x))
        fixed_height = max(1, min(height, h - fixed_y))
        
        if (fixed_x, fixed_y, fixed_width, fixed_height) != (x, y, width, height):
            print(f"    🔧 Fixed coordinates: ({x},{y},{width},{height}) -> ({fixed_x},{fixed_y},{fixed_width},{fixed_height})")
        
        valid_coords.append((fixed_x, fixed_y, fixed_width, fixed_height))
    
    return valid_coords

# Updated process_clues_api function with preview
def process_clues_api(image: np.ndarray, across_coordinates: List[Tuple[int, int, int, int]], 
                     down_coordinates: List[Tuple[int, int, int, int]], 
                     output_json: Optional[str] = None, session_id: str = None,
                     enable_preview: bool = True) -> Dict[str, Any]:
    """
    Process clues for API - crop regions and perform OCR with preview
    """
    if output_json is None:
        output_json = os.path.join(os.path.dirname(__file__), "..", "json_files", "clues.json")
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    
    print(f"🖼️ Image dimensions: {image.shape[1]}x{image.shape[0]} (WxH)")
    print(f"📍 Received {len(across_coordinates)} across coordinates: {across_coordinates}")
    print(f"📍 Received {len(down_coordinates)} down coordinates: {down_coordinates}")
    
    # Validate coordinates
    across_coordinates = validate_crop_coordinates(image, across_coordinates, "across")
    down_coordinates = validate_crop_coordinates(image, down_coordinates, "down")
    
    # Save preview images if enabled
    if enable_preview and session_id:
        save_crop_previews(image, across_coordinates, down_coordinates, session_id)
        # Uncomment next line to show interactive preview (will pause execution)
        # show_crop_preview_window(image, across_coordinates, down_coordinates)
    
    clues_data = {"across": [], "down": []}
    
    # Process ACROSS clues
    if across_coordinates:
        print(f"🔍 Processing {len(across_coordinates)} across regions...")
        across_regions = crop_multiple_regions(image, across_coordinates)
        clues_data["across"] = ocr_regions(across_regions)
    
    # Process DOWN clues  
    if down_coordinates:
        print(f"🔍 Processing {len(down_coordinates)} down regions...")
        down_regions = crop_multiple_regions(image, down_coordinates)
        clues_data["down"] = ocr_regions(down_regions)
    
    # Save initial OCR results
    with open(output_json, "w") as f:
        json.dump(clues_data, f, indent=2)
    
    print(f"✅ Final result: {len(clues_data['across'])} across clues, {len(clues_data['down'])} down clues")
    
    return {
        "clues": clues_data,
        "clues_saved_path": output_json,
        "across_count": len(clues_data["across"]),
        "down_count": len(clues_data["down"])
    }

def update_clues_api(clues_data: Dict[str, List[str]], output_json: Optional[str] = None) -> Dict[str, Any]:
    """
    Update clues with user edits
    """
    if output_json is None:
        output_json = os.path.join(os.path.dirname(__file__), "..", "json_files", "clues.json")
    
    # Save updated clues
    with open(output_json, "w") as f:
        json.dump(clues_data, f, indent=2)
    
    return {
        "clues": clues_data,
        "clues_saved_path": output_json,
        "across_count": len(clues_data.get("across", [])),
        "down_count": len(clues_data.get("down", []))
    }


def load_and_prepare_image(image_path: str) -> Optional[np.ndarray]:
    """
    Load image from path and return OpenCV image
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            print(f"❌ Could not load image: {image_path}")
            return None
        return image
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return None


# API-ready functions for the REST endpoints
def get_image_preview(image_path: str) -> Dict[str, Any]:
    """
    Load image and return base64 preview for cropping in Flutter
    """
    image = load_and_prepare_image(image_path)
    if image is None:
        return {"error": "Could not load image"}
    
    return {
        "success": True,
        "preview_image": image_to_base64(image),
        "height": image.shape[0],
        "width": image.shape[1]
    }


def process_cropped_grid(image_path: str, crop_coordinates: Tuple[int, int, int, int], 
                        rows: int, cols: int) -> Dict[str, Any]:
    """
    Process cropped grid region for API
    """
    image = load_and_prepare_image(image_path)
    if image is None:
        return {"error": "Could not load image"}
    
    # Crop the grid region
    x, y, w, h = crop_coordinates
    grid_crop = crop_region(image, x, y, w, h)
    
    return process_grid_api(grid_crop, rows, cols)


def process_cropped_clues(image_path: str, across_coordinates: List[Tuple[int, int, int, int]], 
                         down_coordinates: List[Tuple[int, int, int, int]]) -> Dict[str, Any]:
    """
    Process cropped clue regions for API
    """
    image = load_and_prepare_image(image_path)
    if image is None:
        return {"error": "Could not load image"}
    
    return process_clues_api(image, across_coordinates, down_coordinates)


# Legacy wrapper functions (if you need backwards compatibility)
def main():
    """
    Legacy main function - now prints API usage instructions
    """
    print("🎯 Crossword Processing Tool - API Mode")
    print("=====================================")
    print("This tool has been converted for REST API usage.")
    print("Use the following functions in your Flask/FastAPI app:")
    print("- get_image_preview(image_path)")
    print("- process_cropped_grid(image_path, crop_coords, rows, cols)")
    print("- process_cropped_clues(image_path, across_coords, down_coords)")
    print("- update_grid_api(grid_img, grid, rows, cols)")
    print("- update_clues_api(clues_data)")


if __name__ == "__main__":
    main()