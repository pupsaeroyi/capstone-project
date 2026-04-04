import pandas as pd
import numpy as np


# -----------------------------
# 1) MAPPING FUNCTIONS
# -----------------------------
def map_positions(df):
    pos_map = {
        "Libero": "L",
        "Setter": "S",
        "Opposite": "OP",
        "Outside Hitter": "OH",
        "Middle Blocker": "MB"
    }

    for col in ['pos1', 'pos2', 'pos3']:
        if col in df.columns:
            df[col] = df[col].map(pos_map).fillna(df[col])

    return df


# def map_from_image1(df):
#     df['from_image1'] = df['from_image1'].map({
#         "Libero": 10,
#         "Setter": 5
#     }).fillna(0)

#     return df
    
def map_experience(df):
    experience_map = {
        "More than 3 years":  10,
        "1-3 years":          7.5,
        "6 months - 1 year":  5,
        "3-6 months":         2.5,
        "Less than 3 months": 0,
    }
    df['experience'] = df['experience'].map(experience_map).fillna(0)
    return df

def map_often(df):  
    often_map = {
        "More than 18 times per month": 10,
        "17-18 times per month": 9,
        "15-16 times per month": 8,
        "13-14 times per month": 7,
        "11-12 times per month": 6,
        "9-10 times per month": 5,
        "7-8 times per month": 4,
        "5-6 times per month": 3,
        "3-4 times per month": 2,
        "1-2 times per month": 1,
        "Once a month or less": 0
    }
    df['often'] = df['often'].map(often_map).fillna(0)
    return df

def map_uni_team(df):
    uni_team_map = {
        "Currently playing": 10,
        "Previously": 7,
        "Never": 0,
    }
    df['uni_team'] = df['uni_team'].map(uni_team_map).fillna(0)
    return df

def map_intensity(df):
    intensity_map = {
        "90+ minutes":   10,
        "60-90 minutes": 7.5,
        "30-60 minutes": 5,
        "15-30 minutes": 2.5,
        "< 15 minutes":  0,
    }
    df['intensity'] = df['intensity'].map(intensity_map).fillna(0)
    return df


# -----------------------------
# 2) PREPROCESS PIPELINE
# -----------------------------
def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Mapping
    df = map_positions(df)
    df = map_experience(df)
    df = map_often(df)
    df = map_uni_team(df)
    df = map_intensity(df) 
    # df = map_from_image1(df)

    # Fill NaN numeric columns
    df = df.fillna(0)

    return df


# -----------------------------
# 2.5) APPLY WEIGHTS TO PPS
# -----------------------------

# -----------------------------
# SKILL COLUMNS
# -----------------------------
pps = [
    "serve",
    "serve_receive",
    "spike",
    "spike_receive",
    "set",
    "block"
]

# -----------------------------
# POSITION-BASED SKILL WEIGHTS
# -----------------------------
POSITION_SKILL_WEIGHTS = {
    "OH": {
        "serve": 1.0,
        "serve_receive": 1.0,
        "spike": 1.0,
        "spike_receive": 0.6,
        "set": 0.4,
        "block": 0.5
    },
    "MB": {
        "serve": 0.6,
        "serve_receive": 0.3,
        "spike": 1.0,
        "spike_receive": 0.3,
        "set": 0.7,
        "block": 1.0
    },
    "OP": {
        "serve": 0.8,
        "serve_receive": 0.3,
        "spike": 0.8,
        "spike_receive": 0.5,
        "set": 0.6,
        "block": 1.0
    },
    "S": {
        "serve": 0.7,
        "serve_receive": 0.0,
        "spike": 0.3,
        "spike_receive": 0.4,
        "set": 1.0,
        "block": 0.8
    },
    "L": {
        "serve": 0.0,
        "serve_receive": 1.0,
        "spike": 0.0,
        "spike_receive": 1.0,
        "set": 0.8,
        "block": 0.0
    },
}

POS_MULTIPLIERS = {
    "pos1": 1.0,
    "pos2": 0.5,
    "pos3": 0.25
}

# -----------------------------
# CREATE EFFECTIVE SKILL WEIGHTS
# -----------------------------
def create_effective_skill_weights(df_user: pd.DataFrame) -> pd.DataFrame:
    n = len(df_user)
    w_eff = {s: np.zeros(n, dtype=float) for s in pps}

    for pos_col, mult in POS_MULTIPLIERS.items():
        pos_series = df_user[pos_col]

        for s in pps:
            mapping = {p: POSITION_SKILL_WEIGHTS[p][s] for p in POSITION_SKILL_WEIGHTS}
            w = pos_series.map(mapping).fillna(0).astype(float).values
            w_eff[s] += mult * w

    df_w_eff = pd.DataFrame(
        {f"w_eff_{s}": w_eff[s] for s in pps},
        index=df_user.index
    )
    return df_w_eff

# -----------------------------
# NORMALIZE EFFECTIVE WEIGHTS
# target_sum=6 means final weight sum per user = 6
# so weighted skill total stays comparable to original 6-skill sum
# -----------------------------
def normalize_effective_weights(df_w_eff: pd.DataFrame, target_sum: float = 6.0) -> pd.DataFrame:
    df_norm = df_w_eff.copy()
    row_sum = df_norm.sum(axis=1)

    # กันหารด้วย 0
    row_sum = row_sum.replace(0, np.nan)

    df_norm = df_norm.div(row_sum, axis=0) * target_sum
    df_norm = df_norm.fillna(0)

    return df_norm

# -----------------------------
# APPLY WEIGHTS TO ORIGINAL SKILLS
# -----------------------------
def replace_skills_with_weighted(df_user: pd.DataFrame, df_w_eff_norm: pd.DataFrame) -> pd.DataFrame:
    df = df_user.copy()

    for s in pps:
        weight_col = f"w_eff_{s}"
        df[s] = df[s].astype(float) * df_w_eff_norm[weight_col].astype(float)

    return df

# -----------------------------
# 3) COMPUTE SCORE
# -----------------------------
def compute_total_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Experience group
    pe = ['experience', 'often', 'uni_team', 'intensity', 'rule']

    # 1) create position-based effective weights
    df_w_eff = create_effective_skill_weights(df)

    # 2) normalize weights
    df_w_eff_norm = normalize_effective_weights(df_w_eff, target_sum=6)

    # 3) apply weighted skill replacement
    df_weighted = replace_skills_with_weighted(df, df_w_eff_norm)

    # 4) compute totals
    df_weighted['total_pe'] = df_weighted[pe].astype(float).sum(axis=1)
    df_weighted['total_pps'] = df_weighted[pps].astype(float).sum(axis=1)

    # Final total score
    df_weighted['total'] = df_weighted['total_pe'] + df_weighted['total_pps']

    return df_weighted


# -----------------------------
# 4) ASSIGN RANK (OPTIONAL)
# -----------------------------
# Example centroids (you should replace with your trained values)
CENTROIDS = np.array([23.0920637 , 44.8949472 , 65.20136984, 81.51450138])
TIERS = ["Beginner", "Intermediate", "Advanced", "Professional"]


def assign_rank(score: float):
    idx = int(np.argmin(np.abs(CENTROIDS - score)))
    return TIERS[idx]


def assign_rank_to_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['rank'] = df['total'].apply(assign_rank)
    return df


# -----------------------------
# 5) MAIN FUNCTION (USE THIS)
# -----------------------------
def score_user(df_input: pd.DataFrame, assign_rank_flag=True) -> pd.DataFrame:
    """
    Main pipeline:
    - preprocess
    - compute score
    - optionally assign rank
    """

    df = preprocess(df_input)
    df = compute_total_score(df)

    if assign_rank_flag:
        df = assign_rank_to_df(df)

    return df