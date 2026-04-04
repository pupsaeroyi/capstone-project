import pandas as pd


# -----------------------------
# 1) RANK → SCORE MAPPING
# -----------------------------
RANK_TO_SCORE = {
    "Beginner": 100,
    "Intermediate": 300,
    "Advanced": 500,
    "Professional": 700
}


# -----------------------------
# 2) ASSIGN INITIAL SCORE (single value)
# -----------------------------
def get_initial_score(rank: str) -> int:
    """
    Convert rank → initial rating score
    """
    return RANK_TO_SCORE.get(rank, 100)  # default = Beginner


# -----------------------------
# 3) APPLY TO DATAFRAME
# -----------------------------
def assign_initial_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add 'rating_score' column based on 'rank'
    """
    df = df.copy()

    if 'rank' not in df.columns:
        raise ValueError("DataFrame must contain 'rank' column")

    df['rating_score'] = df['rank'].map(RANK_TO_SCORE).fillna(100)

    return df


# -----------------------------
# 4) MAIN PIPELINE (OPTIONAL)
# -----------------------------
def apply_initial_rating(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main entry function
    """
    return assign_initial_score(df)