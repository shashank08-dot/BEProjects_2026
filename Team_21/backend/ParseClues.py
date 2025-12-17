import numpy as np
import re
import argparse
from copy import deepcopy

def parse_them(fp):
    across_clues = {}
    down_clues = {}
    # fp = open(fp, 'r')
    fp = open(fp, 'r', encoding='utf-8')
    board = []
    for i in fp:
        if i == "\n":
            continue
        # if "." not in i and i.replace("#", "").isupper():
        if set(i.strip()) <= set("#_"):
            row = np.array(list(i))
            board.append(row[:-1])
            continue
        if not board:
            continue
        answers = np.vstack(board)
        answers[answers == "#"] = "*"
        clear_board = deepcopy(answers)
        clear_board[clear_board != "*"] = "."
        pattern = re.compile(r"^A[0-9]+\..*")
        if pattern.match(i):
            clue = i.split(". ", 1)
            clue_number = clue[0][1:]
            clue_text = clue[1].split(" ~")[0]
            across_clues[clue_number] = clue_text
            continue
        pattern = re.compile(r"^D[0-9]+\..*")
        if pattern.match(i):
            clue = i.split(". ", 1)
            clue_number = clue[0][1:]
            clue_text = clue[1].split(" ~")[0]
            down_clues[clue_number] = clue_text
            continue
    fp.close()
    location_dict = get_locations(clear_board)
    return down_clues, across_clues, clear_board, location_dict, answers

def get_locations(clear_board):
    location_dict = {}
    j = 0
    k = 1
    for i in range(clear_board.shape[0]):
        for j in range(clear_board.shape[1]):
            if (i == 0 and clear_board[i][j] == '.') or (j == 0 and clear_board[i][j] == '.'):
                location_dict[str(k)] = (i, j)
                k += 1
                continue
            if ((clear_board[i-1][j] == '*' and clear_board[i][j] == ".") or (clear_board[i][j-1] == '*' and clear_board[i][j] == ".")):
                location_dict[str(k)] = (i, j)
                k += 1
                continue
    return location_dict

if __name__ == "__main__":
    my_parser = argparse.ArgumentParser(description='Scrape the data from the website.')
    my_parser.add_argument('-xd','--xdfile', help='The path to the xd file.', required=True)
    
    down, across, board, location_dict ,answ= parse_them(my_parser.parse_args().xdfile)
    print("Across clues:", across)
    print("Down clues:", down)
    print("Locations:", location_dict)
    # main(my_parser.parse_args().xdfile)



# import numpy as np
# import re
# import argparse
# from copy import deepcopy

# def parse_them(fp):
#     across_clues = {}
#     down_clues = {}
#     fp = open(fp, 'r')
#     board = []
#     for i in fp:
#         if i == "\n":
#             continue
#         # Only parse the grid structure (assume grid is empty or has only structure, not solutions)
#         # if "." not in i and i.replace("#", "").isupper():
#         #     row = np.array(list(i))
#         #     board.append(row[:-1])
#         #     continue
#         if set(i.strip()) <= set("#_"):
#             row = np.array(list(i))
#             board.append(row)
#             continue
#         if not board:
#             continue
#         answers = np.vstack(board)
#         answers[answers == "#"] = "*"
#         clear_board = deepcopy(answers)
# #         # Iterate across array and replace all characters that are not # with .
#         clear_board[clear_board != "*"] = "."
#         # No need to convert to clear_board or replace with dots
#         # Just keep the structure for clue location mapping
#         # Check to see if the string has A, number, then .
#         pattern = re.compile("^A[0-9]+\..*")
#         if pattern.match(i):
#             clue = i.split(". ", 1)
#             clue_number = clue[0][1:]
#             clue_text = clue[1].split(" ~")[0]
#             across_clues[clue_number] = clue_text
#             continue
#         # Check to see if the string has D, number, then .
#         pattern = re.compile("^D[0-9]+\..*")
#         if pattern.match(i):
#             clue = i.split(". ", 1)
#             clue_number = clue[0][1:]
#             clue_text = clue[1].split(" ~")[0]
#             down_clues[clue_number] = clue_text
#             continue
#         fp.close()
#     location_dict = get_locations(clear_board)
#     return down_clues, across_clues, clear_board, location_dict,answers

# def get_locations(clear_board):
#     location_dict = {}
#     j=0
#     k = 1
#     for i in range(clear_board.shape[0]):
#         for j in range(clear_board.shape[1]):
#             if (i == 0 and clear_board[i][j] == '.') or (j == 0 and clear_board[i][j] == '.'):
#                 location_dict[str(k)] = (i, j)
#                 k += 1
#                 continue
#             if ((clear_board[i-1][j] == '*' and clear_board[i][j] == ".") or (clear_board[i][j-1] == '*' and clear_board[i][j] == ".")):
#                 location_dict[str(k)] = (i, j)
#                 k += 1
#                 continue
#     return location_dict

# if __name__ == "__main__":
#     my_parser = argparse.ArgumentParser(description='Scrape the data from the website.')
#     my_parser.add_argument('-xd','--xdfile', help='The path to the xd file.', required=True)
#     # Just parse and print for demonstration
#     down, across, board, location_dict ,answ= parse_them(my_parser.parse_args().xdfile)
#     print("Across clues:", across)
#     print("Down clues:", down)
#     print("Locations:", location_dict)
#     main(my_parser.parse_args().xdfile)