from flask import Flask, Response, request, jsonify, stream_with_context, send_from_directory, render_template
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime
import json
from typing import Dict, Any, List, Tuple
from flask_cors import CORS

from Readftmodel import Model
# app = Flask(__name__)
app = Flask(__name__, static_folder="static", template_folder="templates")
# CORS(app)  # allow all origins (for dev)

CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})
# Import your modules
from ParseClues import parse_them
from input_proc import (
    get_image_preview,
    process_clues_api, 
    process_cropped_grid, 
    process_cropped_clues,
    update_grid_api,
    update_clues_api,
    load_and_prepare_image,
    base64_to_image,
    image_to_base64
)
from xd_from_json import (
    create_xd_from_json,
    create_xd_from_data,
    validate_grid_and_clues
)
from CheckFoundPuzzle import (
    complete_the_puzzle,
    solve_crossword_puzzle,
    get_puzzle_preview,
    solve_and_save_json
)



# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['JSON_FOLDER'] = 'json_files'
app.config['XD_FOLDER'] = 'xd_files'
app.config['SOLVED_FOLDER'] = 'solved_puzzles'

# Ensure directories exist
for folder in [app.config['UPLOAD_FOLDER'], app.config['JSON_FOLDER'], 
               app.config['XD_FOLDER'], app.config['SOLVED_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif'}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_session_id():
    """Generate unique session ID for tracking user sessions"""
    return str(uuid.uuid4())


def get_session_paths(session_id: str):
    """Get file paths for a specific session"""
    return {
        'image': os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.jpg"),
        'grid_json': os.path.join(app.config['JSON_FOLDER'], f"{session_id}_grid.json"),
        'clues_json': os.path.join(app.config['JSON_FOLDER'], f"{session_id}_clues.json"),
        'xd_file': os.path.join(app.config['XD_FOLDER'], f"{session_id}.xd"),
        'solved_json': os.path.join(app.config['SOLVED_FOLDER'], f"{session_id}_solved.json")
    }


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large"}), 413


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Crossword Processing API"
    })


@app.route('/api/upload', methods=['POST'])
def upload_image():
    """
    Upload crossword image and get preview for cropping
    Returns session_id and image preview
    """
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Allowed: png, jpg, jpeg, bmp, tiff"}), 400
        
        # Generate session ID and save file
        session_id = generate_session_id()
        paths = get_session_paths(session_id)
        
        # Save uploaded file
        file.save(paths['image'])
        
        # Get image preview
        preview_result = get_image_preview(paths['image'])
        
        if not preview_result.get('success'):
            return jsonify({"error": preview_result.get('error', 'Failed to process image')}), 400
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "image_info": {
                "width": preview_result['width'],
                "height": preview_result['height'],
                "preview_image": preview_result['preview_image']
            },
            "message": "Image uploaded successfully. Ready for cropping."
        })
        
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@app.route('/api/process-grid', methods=['POST'])
def process_grid():
    """
    Process cropped grid region
    Expects: session_id, crop_coordinates (x,y,w,h), rows, cols
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        crop_coords = data.get('crop_coordinates')  # [x, y, w, h]
        rows = data.get('rows')
        cols = data.get('cols')
        print(crop_coords)
        
        if not all([session_id, crop_coords, rows, cols]):
            return jsonify({"error": "Missing required fields: session_id, crop_coordinates, rows, cols"}), 400
        
        paths = get_session_paths(session_id)
        
        if not os.path.exists(paths['image']):
            return jsonify({"error": "Session image not found. Please upload image first."}), 404
        
        # Process the grid
        result = process_cropped_grid(
            paths['image'], 
            tuple(crop_coords), 
            rows, 
            cols
        )
        
        if result.get('error'):
            return jsonify({"error": result['error']}), 400
        
        # Save grid JSON to session-specific path
        with open(paths['grid_json'], 'w') as f:
            json.dump(result['grid'], f, indent=2)
        
        return jsonify({
            "success": True,
            "grid": result['grid'],
            "preview_image": result['preview_image'],
            "grid_info": {
                "rows": result['rows'],
                "cols": result['cols']
            },
            "session_id": session_id,
            "message": "Grid processed successfully. You can now edit if needed."
        })
        
    except Exception as e:
        return jsonify({"error": f"Grid processing failed: {str(e)}"}), 500


# @app.route('/api/process-clues', methods=['POST'])
# def process_clues():
#     """
#     Process cropped clue regions
#     Expects: session_id, across_coordinates, down_coordinates
#     """
#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({"error": "No JSON data provided"}), 400
        
#         session_id = data.get('session_id')
#         across_coords = data.get('across_coordinates', [])  # List of [x,y,w,h]
#         down_coords = data.get('down_coordinates', [])
        
#         if not session_id:
#             return jsonify({"error": "Missing session_id"}), 400
        
#         paths = get_session_paths(session_id)
        
#         if not os.path.exists(paths['image']):
#             return jsonify({"error": "Session image not found. Please upload image first."}), 404
        
#         # Convert coordinates to tuples
#         across_coords = [tuple(coord) for coord in across_coords]
#         down_coords = [tuple(coord) for coord in down_coords]
        
#         # Process the clues
#         result = process_cropped_clues(paths['image'], across_coords, down_coords)
        
#         if result.get('error'):
#             return jsonify({"error": result['error']}), 400
        
#         # Save clues JSON to session-specific path
#         with open(paths['clues_json'], 'w') as f:
#             json.dump(result['clues'], f, indent=2)
        
#         return jsonify({
#             "success": True,
#             "clues": result['clues'],
#             "clue_counts": {
#                 "across": result['across_count'],
#                 "down": result['down_count']
#             },
#             "session_id": session_id,
#             "message": "Clues processed successfully. You can now edit if needed."
#         })
        
#     except Exception as e:
#         return jsonify({"error": f"Clue processing failed: {str(e)}"}), 500


# Updated Flask route with preview
@app.route('/api/process-clues', methods=['POST'])
def process_clues():
    """
    Process cropped clue regions with debug preview
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        across_coords = data.get('across_coordinates', [])
        down_coords = data.get('down_coordinates', [])
        
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        if not os.path.exists(paths['image']):
            return jsonify({"error": "Session image not found. Please upload image first."}), 404
        
        # Convert coordinates to tuples
        across_coords = [tuple(coord) for coord in across_coords]
        down_coords = [tuple(coord) for coord in down_coords]
        
        print(f"🚀 Processing clues for session: {session_id}")
        print(f"📥 Received across coordinates: {across_coords}")
        print(f"📥 Received down coordinates: {down_coords}")
        
        # Load image for processing
        image = load_and_prepare_image(paths['image'])
        if image is None:
            return jsonify({"error": "Could not load image"}), 400
        
        # Process with preview enabled
        result = process_clues_api(image, across_coords, down_coords, 
                                 session_id=session_id, enable_preview=True)
        
        if result.get('error'):
            return jsonify({"error": result['error']}), 400
        
        # Save clues JSON
        with open(paths['clues_json'], 'w') as f:
            json.dump(result['clues'], f, indent=2)
        
        return jsonify({
            "success": True,
            "clues": result['clues'],
            "clue_counts": {
                "across": result['across_count'],
                "down": result['down_count']
            },
            "session_id": session_id,
            "preview_path": f"debug_previews/{session_id}",
            "message": "Clues processed successfully. Check debug_previews folder for crop images."
        })
        
    except Exception as e:
        print(f"❌ Error processing clues: {str(e)}")
        return jsonify({"error": f"Clue processing failed: {str(e)}"}), 500

@app.route('/api/update-grid', methods=['POST'])
def update_grid():
    """
    Update grid with user modifications
    Expects: session_id, grid (2D array)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        grid = data.get('grid')
        
        if not all([session_id, grid]):
            return jsonify({"error": "Missing required fields: session_id, grid"}), 400
        
        paths = get_session_paths(session_id)
        
        # Load original image for preview generation
        image = load_and_prepare_image(paths['image'])
        if image is None:
            return jsonify({"error": "Session image not found"}), 404
        
        rows = len(grid)
        cols = max(len(row) for row in grid) if grid else 0
        
        # Update grid
        result = update_grid_api(image, grid, rows, cols, paths['grid_json'])
        
        return jsonify({
            "success": True,
            "grid": result['grid'],
            "preview_image": result['preview_image'],
            "session_id": session_id,
            "message": "Grid updated successfully."
        })
        
    except Exception as e:
        return jsonify({"error": f"Grid update failed: {str(e)}"}), 500


@app.route('/api/update-clues', methods=['POST'])
def update_clues():
    """
    Update clues with user modifications
    Expects: session_id, clues (dict with 'across' and 'down' lists)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        clues = data.get('clues')
        
        if not all([session_id, clues]):
            return jsonify({"error": "Missing required fields: session_id, clues"}), 400
        
        paths = get_session_paths(session_id)
        
        # Update clues
        result = update_clues_api(clues, paths['clues_json'])
        
        return jsonify({
            "success": True,
            "clues": result['clues'],
            "clue_counts": {
                "across": result['across_count'],
                "down": result['down_count']
            },
            "session_id": session_id,
            "message": "Clues updated successfully."
        })
        
    except Exception as e:
        return jsonify({"error": f"Clues update failed: {str(e)}"}), 500


@app.route('/api/validate', methods=['POST'])
def validate_puzzle():
    """
    Validate grid and clues before creating XD file
    Expects: session_id
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        # Load grid and clues
        try:
            with open(paths['grid_json'], 'r') as f:
                grid = json.load(f)
            with open(paths['clues_json'], 'r') as f:
                clues = json.load(f)
        except FileNotFoundError as e:
            return jsonify({"error": "Grid or clues not found. Please process them first."}), 404
        
        # Validate
        validation_result = validate_grid_and_clues(grid, clues)
        
        return jsonify({
            "success": True,
            "validation": validation_result,
            "session_id": session_id,
            "ready_for_xd": validation_result['is_valid']
        })
        
    except Exception as e:
        return jsonify({"error": f"Validation failed: {str(e)}"}), 500


@app.route('/api/create-xd', methods=['POST'])
def create_xd():
    """
    Create XD file from processed grid and clues
    Expects: session_id
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        # Create XD file
        result = create_xd_from_json(
            paths['grid_json'], 
            paths['clues_json'], 
            paths['xd_file']
        )
        
        if not result['success']:
            return jsonify({"error": result['error']}), 400
        
        return jsonify({
            "success": True,
            "xd_info": result,
            "session_id": session_id,
            "message": "XD file created successfully. Ready for solving."
        })
        
    except Exception as e:
        return jsonify({"error": f"XD creation failed: {str(e)}"}), 500


@app.route('/api/puzzle-preview', methods=['POST'])
def puzzle_preview():
    """
    Get puzzle preview without solving
    Expects: session_id
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        if not os.path.exists(paths['xd_file']):
            return jsonify({"error": "XD file not found. Please create XD file first."}), 404
        
        # Get puzzle preview
        result = get_puzzle_preview(paths['xd_file'])
        
        if not result['success']:
            return jsonify({"error": result['error']}), 400
        
        return jsonify({
            "success": True,
            "puzzle_preview": result,
            "session_id": session_id
        })
        
    except Exception as e:
        return jsonify({"error": f"Preview failed: {str(e)}"}), 500


@app.route('/api/solve', methods=['POST'])
def solve_puzzle():
    """
    Solve the crossword puzzle
    Expects: session_id, alpha (threshold)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        alpha = data.get('alpha', 0.2)  # Default threshold
        
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        if not os.path.exists(paths['xd_file']):
            return jsonify({"error": "XD file not found. Please create XD file first."}), 404
        
        # Use correct model path - same directory as api.py
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(backend_dir, 'model.bin')
        
        if not os.path.exists(model_path):
            return jsonify({
                "error": f"Model file not found at {model_path}",
                "debug_info": {
                    "backend_dir": backend_dir,
                    "expected_path": model_path,
                    "backend_dir_contents": os.listdir(backend_dir)
                }
            }), 404
        
        # Solve the puzzle
        result = solve_crossword_puzzle(
            model_path, 
            paths['xd_file'], 
            alpha, 
            paths['solved_json']
        )
        
        if not result['success']:
            return jsonify({"error": result['error']}), 400
        
        return jsonify({
            "success": True,
            "solution": result,
            "session_id": session_id,
            "message": f"Puzzle solved! {result['completion_stats']['completion_percentage']:.1f}% complete"
        })
        
    except Exception as e:
        return jsonify({"error": f"Solving failed: {str(e)}"}), 500

# @app.route("/api/solve_stream", methods=["GET"])
# def solve_stream():
#     session_id = request.args.get("session_id")
#     model_path = request.args.get("model_path", "model.bin")
#     alpha = float(request.args.get("alpha", 0.7))

#     if not session_id:
#         return "Missing session_id", 400

#     paths = get_session_paths(session_id)
#     xd_file_path = paths['xd_file']

#     @stream_with_context
#     def event_stream():
#         # Yield initial line immediately
#         yield "data: 🔄 Connection opened, starting solver...\n\n"

#         try:
#             down, across, board, location_dict, answer = parse_them(xd_file_path)
#             model = Model(model_path)
#             precedence = model.get_precedence(across, down)

#             for msg in complete_the_puzzle_stream(model, [(1, board)], location_dict, alpha, precedence):
#                 if isinstance(msg, dict):
#                     yield f"data: {json.dumps(msg)}\n\n"
#                 else:
#                     # Break multi-line messages into single-line SSE messages
#                     for line in str(msg).splitlines():
#                         yield f"data: {line}\n\n"

#         except Exception as e:
#             yield f"data: ❌ Error: {str(e)}\n\n"

#     return Response(event_stream(), mimetype="text/event-stream")


@app.route('/api/session-status', methods=['POST'])
def session_status():
    """
    Get status of a session - what files exist and what steps are complete
    Expects: session_id
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        
        status = {
            "session_id": session_id,
            "steps": {
                "image_uploaded": os.path.exists(paths['image']),
                "grid_processed": os.path.exists(paths['grid_json']),
                "clues_processed": os.path.exists(paths['clues_json']),
                "xd_created": os.path.exists(paths['xd_file']),
                "puzzle_solved": os.path.exists(paths['solved_json'])
            },
            "files": {
                "image": paths['image'] if os.path.exists(paths['image']) else None,
                "grid_json": paths['grid_json'] if os.path.exists(paths['grid_json']) else None,
                "clues_json": paths['clues_json'] if os.path.exists(paths['clues_json']) else None,
                "xd_file": paths['xd_file'] if os.path.exists(paths['xd_file']) else None,
                "solved_json": paths['solved_json'] if os.path.exists(paths['solved_json']) else None
            }
        }
        
        # Calculate progress percentage
        completed_steps = sum(status['steps'].values())
        total_steps = len(status['steps'])
        status['progress_percentage'] = (completed_steps / total_steps) * 100
        
        return jsonify({
            "success": True,
            "status": status
        })
        
    except Exception as e:
        return jsonify({"error": f"Status check failed: {str(e)}"}), 500


@app.route('/api/cleanup', methods=['POST'])
def cleanup_session():
    """
    Clean up session files
    Expects: session_id
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({"error": "Missing session_id"}), 400
        
        paths = get_session_paths(session_id)
        deleted_files = []
        
        for file_type, file_path in paths.items():
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    deleted_files.append(file_type)
                except Exception as e:
                    print(f"Failed to delete {file_path}: {e}")
        
        return jsonify({
            "success": True,
            "message": f"Session {session_id} cleaned up",
            "deleted_files": deleted_files
        })
        
    except Exception as e:
        return jsonify({"error": f"Cleanup failed: {str(e)}"}), 500


@app.route("/")
def serve_frontend():
    return render_template("index.html")


if __name__ == '__main__':
    print("🎯 Crossword Processing REST API Server")
    print("=====================================")
    print("Available endpoints:")
    print("POST /api/upload - Upload crossword image")
    print("POST /api/process-grid - Process grid region")
    print("POST /api/process-clues - Process clue regions") 
    print("POST /api/update-grid - Update grid manually")
    print("POST /api/update-clues - Update clues manually")
    print("POST /api/validate - Validate puzzle data")
    print("POST /api/create-xd - Create XD file")
    print("POST /api/puzzle-preview - Get puzzle preview")
    print("POST /api/solve - Solve the puzzle")
    print("POST /api/session-status - Check session status")
    print("POST /api/cleanup - Clean up session files")
    print("GET  /api/health - Health check")
    print("\n🚀 Starting server on http://localhost:5000")
    
    # print(f"🎯 API URL: {API_BASE_URL}")
    # app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(host='0.0.0.0', port=7860,debug=False)


