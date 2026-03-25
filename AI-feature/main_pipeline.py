# main_pipeline.py

import pandas as pd

from score_calculation import score_user
from initial_rank_score import apply_initial_rating
from match_evaluation import apply_match_evaluation


# -----------------------------
# 1) INITIAL PIPELINE
# test -> rank -> initial rating
# -----------------------------
def run_initial_pipeline(df_input: pd.DataFrame) -> pd.DataFrame:
    """
    Input:
        Raw test answers dataframe

    Output:
        Dataframe with:
        - total_pe
        - total_pps
        - total
        - rank
        - rating_score
    """
    df = df_input.copy()

    # Step 1: compute rank from test
    df = score_user(df)

    # Step 2: convert rank -> initial numeric rating
    df = apply_initial_rating(df)

    return df


# -----------------------------
# 2) MATCH UPDATE PIPELINE
# rating -> updated rating after match evaluation
# -----------------------------
def run_match_pipeline(df_players: pd.DataFrame) -> pd.DataFrame:
    """
    Expected columns:
        - rating_score
        - peer_scores
        - self_score (optional)

    Output:
        Updated dataframe with:
        - old_score
        - delta
        - rating_score
        - old_rank
        - rank
        - rank_changed
    """
    df = df_players.copy()
    df = apply_match_evaluation(df)
    return df


# -----------------------------
# 3) FULL PIPELINE
# initial test + optional match update
# -----------------------------
def run_full_pipeline(
    df_input: pd.DataFrame,
    apply_match_update: bool = False
) -> pd.DataFrame:
    """
    Full SPIKE ranking pipeline

    Step 1: initial test scoring
    Step 2: assign initial rating
    Step 3: optional match evaluation update
    """
    df = run_initial_pipeline(df_input)

    if apply_match_update:
        if "peer_scores" not in df.columns:
            raise ValueError("peer_scores column is required when apply_match_update=True")
        df = run_match_pipeline(df)

    return df


# -----------------------------
# 4) EXAMPLE USAGE
# -----------------------------
if __name__ == "__main__":
    sample = pd.DataFrame([{
        "pos1": "Setter",
        "pos2": "Outside Hitter",
        "pos3": "Libero",
        "experience": "1-3 ปี",
        "often": "7-8 ครั้งต่อเดือน",
        "uni_team": "เคย",
        "intensity": "60-90 นาที",
        "rule": 6,
        "serve": 7,
        "serve_receive": 6,
        "spike": 5,
        "spike_receive": 4,
        "set": 9,
        "block": 3
    }])

    # Initial ranking only
    df_initial = run_initial_pipeline(sample)
    print("=== INITIAL PIPELINE ===")
    print(df_initial[["total_pe", "total_pps", "total", "rank", "rating_score"]])

    # Example after a match
    df_initial["peer_scores"] = [[7, 8, 6, 7]]
    df_initial["self_score"] = [7]

    df_updated = run_match_pipeline(df_initial)
    print("\n=== AFTER MATCH EVALUATION ===")
    print(df_updated[[
        "old_score", "delta", "rating_score",
        "old_rank", "rank", "rank_changed"
    ]])