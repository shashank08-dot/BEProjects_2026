import pandas as pd
import numpy as np
from pyDecision.algorithm import fuzzy_ahp_method as fahp
import skfuzzy as fuzz
from skfuzzy import control as ctrl

# ---------------------------
# Load OpenFace CSV
# ---------------------------

hiring_ctrl = None  # Global variable for fuzzy control system
hiring_sim = None  # Global variable for fuzzy control system simulation
# ---------------------------
# Helper functions
# ---------------------------
def categorize(value, low=2, high=3):
    """Map continuous AU/head values to Low=1, Medium=2, High=3"""
    if value <= low:
        return 1
    elif value <= high:
        return 2
    else:
        return 3

def classify_score(score):
    """Map normalized score to discrete level 1,2,3"""
    if score <= 1/3:
        return 1
    elif score <= 2/3:
        return 2
    else:
        return 3

def compute_trait(df,features, comparison_matrix, trait_name):
    fuzzy_weights, defuzzified_weights, normalized_weights, rc = fahp(comparison_matrix)
    df[trait_name + "_score"] = 0
    for feature, weight in zip(features, normalized_weights):
        df[trait_name + "_score"] += df[feature] * weight
    min_score = np.sum(np.array(normalized_weights) * 1)
    max_score = np.sum(np.array(normalized_weights) * 3)
    df["norm_" + trait_name + "_score"] = (df[trait_name + "_score"] - min_score) / (max_score - min_score)
    df[trait_name + "_level"] = df["norm_" + trait_name + "_score"].apply(classify_score)
    print(f"\n{trait_name.capitalize()} Levels:")
    print(df[[trait_name + "_score", "norm_" + trait_name + "_score", trait_name + "_level"]].head())

def compute_hire_likert(row, hiring_ctrl):
    sim = ctrl.ControlSystemSimulation(hiring_ctrl)
    try:
        sim.input['Openness'] = np.clip(float(row['openness_level']), 1, 3)
        sim.input['Conscientiousness'] = np.clip(float(row['conscientiousness_level']), 1, 3)
        sim.input['Extraversion'] = np.clip(float(row['extraversion_level']), 1, 3)
        sim.input['Agreeableness'] = np.clip(float(row['agreeableness_level']), 1, 3)
        sim.input['Neuroticism'] = np.clip(float(row['neuroticism_level']), 1, 3)
        sim.compute()
        return sim.output.get('Hire', np.nan)  # fallback if nothing fires
    except Exception as e:
        print("Fuzzy error:", e, row[['openness_level','conscientiousness_level',
                                        'extraversion_level','agreeableness_level',
                                        'neuroticism_level']].to_dict())
        return np.nan


def ocean_to_hire(path=r"C:\Users\mmm\Downloads\OpenFace_2.2.0_win_x64\output\update_frames.csv", Segment_ID=None):

    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    df["Segment_ID"] = Segment_ID
    # -----------------------------
    # Step 1: Define fuzzy variables
    # -----------------------------
    O = ctrl.Antecedent(np.arange(1, 3.1, 0.1), 'Openness')
    C = ctrl.Antecedent(np.arange(1, 3.1, 0.1), 'Conscientiousness')
    E = ctrl.Antecedent(np.arange(1, 3.1, 0.1), 'Extraversion')
    A = ctrl.Antecedent(np.arange(1, 3.1, 0.1), 'Agreeableness')
    N = ctrl.Antecedent(np.arange(1, 3.1, 0.1), 'Neuroticism')

    Hire = ctrl.Consequent(np.arange(1, 7.1, 0.1), 'Hire')

    # -----------------------------
    # Step 2: Membership functions
    # -----------------------------
    for var in [O, C, E, A, N]:
        var['low'] = fuzz.trimf(var.universe, [1, 1, 2])
        var['med'] = fuzz.trimf(var.universe, [1.5, 2, 2.5])
        var['high'] = fuzz.trimf(var.universe, [2, 3, 3])

    Hire['very_low'] = fuzz.trimf(Hire.universe, [1, 1, 2])
    Hire['low'] = fuzz.trimf(Hire.universe, [2, 3, 3])
    Hire['neutral'] = fuzz.trimf(Hire.universe, [3, 4, 4])
    Hire['medium'] = fuzz.trimf(Hire.universe, [4, 5, 5])
    Hire['high'] = fuzz.trimf(Hire.universe, [5, 6, 6])
    Hire['very_high'] = fuzz.trimf(Hire.universe, [6, 7, 7])

    rules = [
    ctrl.Rule(C['high'] & N['low'], Hire['very_high']),
    ctrl.Rule(C['med'] & (E['med'] | A['med']), Hire['medium']),
    ctrl.Rule(E['high'] & A['high'], Hire['high']),
    ctrl.Rule(O['high'], Hire['medium']),
    ctrl.Rule(N['high'], Hire['low'])
    ]

   

    # ---------------------------
    # 1. Categorize relevant AUs & head movements
    # ---------------------------

    # Openness
    df["AU01_level"] = df["AU01_r"].apply(categorize)
    df["AU02_level"] = df["AU02_r"].apply(categorize)
    df["AU05_level"] = df["AU05_r"].apply(categorize)
    df["head_nod_level"] = df["pose_Rx"].apply(lambda x: categorize(abs(x), low=0.05, high=0.15))
    df["head_tilt_level"] = df["pose_Rz"].apply(lambda x: categorize(abs(x), low=0.05, high=0.15))

    # Conscientiousness
    df["AU23_level"] = df["AU23_r"].apply(categorize)
    df["AU14_level"] = df["AU14_r"].apply(categorize)
    df["AU07_level"] = df["AU07_r"].apply(categorize)
    df["head_still_level"] = df["pose_Ry"].apply(lambda x: categorize(abs(x), low=0.05, high=0.15))

    # Extraversion
    df["AU12_level"] = df["AU12_r"].apply(categorize)
    df["AU06_level"] = df["AU06_r"].apply(categorize)

    # Agreeableness
    df["AU04_level"] = df["AU04_r"].apply(categorize)

    # Neuroticism
    df["AU15_level"] = df["AU15_r"].apply(categorize)
    df["AU14_level"] = df["AU14_r"].apply(categorize)

    # ---------------------------
    # 2. OCEAN trait computations
    # ---------------------------

    # Openness
    openness_matrix = [
        [(1,1,1), (1/3,1/2,1), (1/5,1/4,1/3), (1/7,1/6,1/5)],
        [(3,2,1), (1,1,1), (1/3,1/2,1), (1/5,1/4,1/3)],
        [(5,4,3), (3,2,1), (1,1,1), (1/3,1/2,1)],
        [(7,6,5), (5,4,3), (3,2,1), (1,1,1)]
    ]
    compute_trait(df,["AU01_level","AU02_level","AU05_level","head_nod_level"], openness_matrix, "openness")

    # Conscientiousness
    consc_matrix = [
        [(1,1,1), (1/2, 1/2, 1), (1/3, 1/2, 1), (1/4, 1/3, 1/2)],
        [(2,2,1), (1,1,1), (1/2, 1/2, 1), (1/3, 1/2,1)],
        [(3,2,1), (2,2,1), (1,1,1), (1/2,1/2,1)],
        [(4,3,2), (3,2,1), (2,2,1), (1,1,1)]
    ]
    compute_trait(df,["AU23_level","AU14_level","AU07_level","head_still_level"], consc_matrix, "conscientiousness")

    # Extraversion
    extra_matrix = [
        [(1,1,1), (1/2,1/2,1), (1/4,1/3,1/2)],
        [(2,2,1), (1,1,1), (1/3,1/2,1)],
        [(4,3,2), (3,2,1), (1,1,1)]
    ]
    compute_trait(df,["AU12_level","AU06_level","head_nod_level"], extra_matrix, "extraversion")

    # Agreeableness
    agree_matrix = [
        [(1,1,1), (1/2,1/2,1), (1/4,1/3,1/2)],
        [(2,2,1), (1,1,1), (1/3,1/2,1)],
        [(4,3,2), (3,2,1), (1,1,1)]
    ]
    compute_trait(df,["AU12_level","AU04_level","head_tilt_level"], agree_matrix, "agreeableness")

    # Neuroticism
    neuro_matrix = [
        [(1,1,1), (1/2,1/2,1), (1/4,1/3,1/2)],
        [(2,2,1), (1,1,1), (1/3,1/2,1)],
        [(4,3,2), (3,2,1), (1,1,1)]
    ]
    compute_trait(df,["AU04_level","AU15_level","AU14_level"], neuro_matrix, "neuroticism")
    print(df.columns)
    hiring_ctrl = ctrl.ControlSystem(rules)
    hiring_sim = ctrl.ControlSystemSimulation(hiring_ctrl)
    df["hire_likert"] = df.apply(compute_hire_likert, axis=1, hiring_ctrl=hiring_ctrl)
    print(df[["hire_likert"]])
    df.to_csv("ocean_hire_output_rt.csv", index=False)
    return df