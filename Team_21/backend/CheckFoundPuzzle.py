import time
import json
import os
from copy import deepcopy
import numpy as np
import argparse
from tqdm import tqdm
from ParseClues import parse_them
from Readftmodel import Model
from typing import Dict, Any, Optional, List, Tuple


def solve_crossword_puzzle(model_path: str, xd_file_path: str, alpha: float, 
                          output_json_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Main API function to solve crossword puzzle
    
    Args:
        model_path: Path to the fasttext model
        xd_file_path: Path to the .xd file
        alpha: Threshold for solving clues
        output_json_path: Path to save solved puzzle JSON (optional)
        
    Returns:
        Dictionary with solving results and solved board
    """
    try:
        start_time = time.time()
        
        # Check if required files exist
        if not os.path.exists(model_path):
            return {"success": False, "error": f"Model file not found: {model_path}"}
        
        if not os.path.exists(xd_file_path):
            return {"success": False, "error": f"XD file not found: {xd_file_path}"}
        
        # Parse the crossword puzzle
        try:
            down, across, board, location_dict, answer = parse_them(xd_file_path)
        except Exception as e:
            return {"success": False, "error": f"Failed to parse XD file: {str(e)}"}
        
        # Load the model
        try:
            model = Model(model_path)
        except Exception as e:
            return {"success": False, "error": f"Failed to load model: {str(e)}"}
        
        # Get clue precedence
        precedence = model.get_precedence(across, down)
        
        # Solve the puzzle
        try:
            solved_board = complete_the_puzzle(model, [(1, board)], location_dict, alpha, precedence)
        except Exception as e:
            return {"success": False, "error": f"Failed to solve puzzle: {str(e)}"}
        
        end_time = time.time()
        solving_time = end_time - start_time
        
        # Convert numpy array to list for JSON serialization
        solved_board_list = solved_board.tolist() if isinstance(solved_board, np.ndarray) else solved_board
        
        # Count unsolved cells
        # num_dots = np.count_nonzero(solved_board == ".") if isinstance(solved_board, np.ndarray) else 0
        # total_cells = solved_board.size if isinstance(solved_board, np.ndarray) else len(solved_board) * len(solved_board[0])
        num_dots = np.count_nonzero(solved_board == ".") if isinstance(solved_board, np.ndarray) else sum(1 for row in solved_board for cell in row if cell == ".")
        total_cells = np.sum(solved_board != '*') if isinstance(solved_board, np.ndarray) else sum(1 for row in solved_board for cell in row if cell != '*')
        completion_percentage = ((total_cells - num_dots) / total_cells) * 100 if total_cells > 0 else 0
        
        print("\n========== DEBUG: CELL COUNTS ==========")
        print(solved_board[0])
        print(solved_board[1])
        print(f"Total cells (excluding #): {total_cells}")
        print(f"Unsolved cells (.): {num_dots}")
        print(f"Solved cells: {total_cells - num_dots}")
        print(f"Completion %: {completion_percentage:.2f}%")
        print(f"Board shape: {solved_board.shape if isinstance(solved_board, np.ndarray) else (len(solved_board), len(solved_board[0]))}")


        # Prepare output data
        result_data = {
            "success": True,
            "solved_board": solved_board_list,
            "solving_time": solving_time,
            "completion_stats": {
                "total_cells": int(total_cells),
                "unsolved_cells": int(num_dots),
                "solved_cells": int(total_cells - num_dots),
                "completion_percentage": float(completion_percentage)
            },
            "puzzle_info": {
                "across_clues": len(across) if across else 0,
                "down_clues": len(down) if down else 0,
                "grid_size": {
                    "rows": solved_board.shape[0] if isinstance(solved_board, np.ndarray) else len(solved_board),
                    "cols": solved_board.shape[1] if isinstance(solved_board, np.ndarray) else len(solved_board[0])
                }
            },
            "alpha_threshold": alpha
        }
        
        # Save to JSON file if path provided
        if output_json_path:
            try:
                os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
                with open(output_json_path, "w", encoding="utf-8") as f:
                    json.dump(result_data, f, indent=2)
                result_data["output_file_path"] = output_json_path
            except Exception as e:
                result_data["warning"] = f"Failed to save JSON file: {str(e)}"
        
        return result_data
        
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


def solve_and_save_json(model_path: str, xd_file_path: str, alpha: float, 
                       output_json_path: str) -> Dict[str, Any]:
    """
    Convenience function that always saves to JSON
    """
    return solve_crossword_puzzle(model_path, xd_file_path, alpha, output_json_path)


def get_puzzle_preview(xd_file_path: str) -> Dict[str, Any]:
    """
    Get puzzle information without solving (for preview purposes)
    
    Args:
        xd_file_path: Path to the .xd file
        
    Returns:
        Dictionary with puzzle preview information
    """
    try:
        if not os.path.exists(xd_file_path):
            return {"success": False, "error": f"XD file not found: {xd_file_path}"}
        
        # Parse the puzzle to get basic info
        down, across, board, location_dict, answer = parse_them(xd_file_path)
        
        # Convert board to list for JSON response
        board_list = board.tolist() if isinstance(board, np.ndarray) else board
        
        return {
            "success": True,
            "puzzle_info": {
                "across_clues": len(across) if across else 0,
                "down_clues": len(down) if down else 0,
                "grid_size": {
                    "rows": board.shape[0] if isinstance(board, np.ndarray) else len(board),
                    "cols": board.shape[1] if isinstance(board, np.ndarray) else len(board[0])
                },
                # "total_cells": int(board.size) if isinstance(board, np.ndarray) else len(board) * len(board[0]),
                "total_cells": int(np.sum(board != '#')) if isinstance(board, np.ndarray) else sum(1 for row in board for cell in row if cell != '#'),
                "empty_cells": int(np.count_nonzero(board == ".")) if isinstance(board, np.ndarray) else 0
            },
            "initial_board": board_list,
            "clues": {
                "across": across if across else [],
                "down": down if down else []
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Failed to parse puzzle: {str(e)}"}


def complete_the_puzzle(model, branches: List[Tuple], location_dict: Dict, 
                       alpha: float, precedence: List) -> np.ndarray:
    """
    Recursive function to complete the crossword puzzle
    """
    if '.' not in branches[0][1] or not precedence:
        ret = branches[0][1]
        return ret
    
    print(f"Branches: {len(branches)}")
    
    # Display current board state
    for row in branches[0][1]:
        print(' '.join(row))

    leafs = []
    item = precedence[0]
    begin = time.time()
    
    for board in tqdm(branches):
        temp_board = deepcopy(board)
        pct_board = add_word(item, model, temp_board, location_dict, alpha, item[3])
        leafs += pct_board
    
    leafs = sorted(leafs, key=lambda x: x[0], reverse=True)
    
    if len(leafs) == 0:
        leafs = branches
    
    lim = leafs[0][0]
    leafs = [leaf for leaf in leafs if leaf[0] >= alpha * lim]
    precedence.pop(0)
    
    return complete_the_puzzle(model, leafs, location_dict, alpha, precedence)


# def complete_the_puzzle_stream(model, branches: List[Tuple], location_dict: Dict, 
#                                alpha: float, precedence: List):
#     """
#     Recursive generator that yields log messages instead of printing
#     """
#     if '.' not in branches[0][1] or not precedence:
#         yield "Puzzle completed or no precedence left.\n"
#         ret = branches[0][1]
#         yield {"solved_board": ret}  # Send final board
#         return

#     yield f"Branches: {len(branches)}\n"

#     # Yield current board state
#     board = branches[0][1]
#     board_str = "\n".join([" ".join(row) for row in board])
#     yield f"{board_str}\n"

#     leafs = []
#     item = precedence[0]
    
#     for board in branches:
#         temp_board = deepcopy(board)
#         pct_board = add_word(item, model, temp_board, location_dict, alpha, item[3])
#         leafs += pct_board

#     leafs = sorted(leafs, key=lambda x: x[0], reverse=True)
#     if len(leafs) == 0:
#         leafs = branches

#     lim = leafs[0][0]
#     leafs = [leaf for leaf in leafs if leaf[0] >= alpha * lim]
#     precedence.pop(0)

#     # Recurse
#     yield from complete_the_puzzle_stream(model, leafs, location_dict, alpha, precedence)



def add_word(item, model, board: Tuple, location_dict: Dict, max_score: float, beta: float) -> List[Tuple]:
    """
    Add word candidates to the board
    """
    sims = []

    dir = item[0]
    index = item[1]
    clue = item[2]

    partial = get_partial(index, dir, board[1], location_dict)
    regex = "^" + partial + "$"
    pct, words = model.clue_to_list_of_words(clue, regex)
    
    for pct, word in zip(pct, words):
        temp_board = deepcopy(board[1])
        temp_board = write_word(word, index, dir, temp_board, location_dict)
        sims.append((pct * board[0], temp_board))
    
    return sims


def get_board(board: np.ndarray, location_dict: Dict = {}) -> Tuple[Dict, np.ndarray]:
    """
    Process board to create location dictionary
    """
    for i in range(board.shape[0]):
        for j in range(board.shape[1]):
            if board[i][j] != '*':
                location_dict[board[i][j]] = (i, j)
                board[i][j] = '.'
    return location_dict, board


def get_partial(num: int, direction: str, board: np.ndarray, loc_dict: Dict) -> str:
    """
    Get partial word from board for a given clue number and direction
    """
    if direction == 'down':
        i, j = loc_dict[num]
        partial = ''
        while i < np.shape(board)[0]:
            if board[i][j] != '*':
                partial += board[i][j]
                i += 1
            else:
                break
    else:  # across
        i, j = loc_dict[num]
        partial = ''
        while j < np.shape(board)[1]:
            if board[i][j] != '*':
                partial += board[i][j]
                j += 1
            else:
                break
    return partial


def write_word(word: str, num: int, direction: str, board: np.ndarray, loc_dict: Dict) -> np.ndarray:
    """
    Write word to board at specified location and direction
    """
    if direction == 'down':
        i, j = loc_dict[num]
        for char in word:
            board[i][j] = char
            i += 1
    else:  # across
        i, j = loc_dict[num]
        for char in word:
            board[i][j] = char
            j += 1
    return board


# Legacy main function for backwards compatibility
def main(model_path: str, fp: str, alpha: float):
    """
    Original main function for backwards compatibility
    """
    result = solve_crossword_puzzle(model_path, fp, alpha, "solved_puzzle.json")
    
    if result["success"]:
        print(f"✅ Puzzle solved successfully!")
        print(f"⏱️ Time: {result['solving_time']:.2f} seconds")
        print(f"🎯 Completion: {result['completion_stats']['completion_percentage']:.1f}%")
        print(f"💾 Saved to: solved_puzzle.json")
    else:
        print(f"❌ Error: {result['error']}")


if __name__ == "__main__":
    my_parser = argparse.ArgumentParser(description='Solve crossword puzzle from XD file.')
    my_parser.add_argument('-m', '--model', help='The path to the fasttext model.', required=True)
    my_parser.add_argument('-xd', '--xd_path', help='Path to the XD file', required=True)
    my_parser.add_argument('-a', '--alpha', type=float, help='Threshold to solve the clues.', required=True)
    args = my_parser.parse_args()
    
    main(model_path=args.model, fp=args.xd_path, alpha=args.alpha)