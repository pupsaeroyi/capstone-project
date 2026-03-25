# match_evaluation.py

import pandas as pd


# -----------------------------
# 1) RANK BOUNDARIES
# -----------------------------
def get_rank_from_score(score: float) -> str:
    """
    Convert numeric rating score -> rank
    """
    if score < 200:
        return "Beginner"
    elif score < 400:
        return "Intermediate"
    elif score < 600:
        return "Advanced"
    else:
        return "Professional"


# -----------------------------
# 2) EVALUATION -> SCORE CHANGE
# -----------------------------
def compute_score_delta(
    peer_scores: list[float],
    self_score: float | None = None,
    peer_weight: float = 1.0,
    self_weight: float = 0.3,
    scale_factor: float = 20.0,
    neutral_score: float = 5.0,
) -> float:
    """
    Convert match evaluation into rating score change.

    Assumption:
    - evaluation is on a 0-10 scale
    - 5 = neutral
    - above 5 => gain score
    - below 5 => lose score
    """

    if not peer_scores:
        raise ValueError("peer_scores must contain at least one score")

    peer_avg = sum(peer_scores) / len(peer_scores)

    if self_score is None:
        final_eval = peer_avg
    else:
        final_eval = (
            peer_weight * peer_avg + self_weight * self_score
        ) / (peer_weight + self_weight)

    delta = (final_eval - neutral_score) * scale_factor
    return delta


# -----------------------------
# 3) UPDATE PLAYER RATING
# -----------------------------
def update_player_rating(
    current_score: float,
    peer_scores: list[float],
    self_score: float | None = None,
    min_score: float = 0,
    max_score: float = 800,
) -> dict:
    """
    Update player's rating after a match.
    """

    old_rank = get_rank_from_score(current_score)

    delta = compute_score_delta(
        peer_scores=peer_scores,
        self_score=self_score
    )

    new_score = current_score + delta
    new_score = max(min_score, min(max_score, new_score))

    new_rank = get_rank_from_score(new_score)

    return {
        "old_score": round(current_score, 2),
        "delta": round(delta, 2),
        "new_score": round(new_score, 2),
        "old_rank": old_rank,
        "new_rank": new_rank,
        "rank_changed": old_rank != new_rank
    }


# -----------------------------
# 4) APPLY TO DATAFRAME
# -----------------------------
def apply_match_evaluation(df: pd.DataFrame) -> pd.DataFrame:
    """
    Expected columns:
    - rating_score
    - peer_scores   (list of numbers)
    - self_score    (optional)

    Returns dataframe with updated score + rank
    """
    df = df.copy()

    required_cols = ["rating_score", "peer_scores"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"DataFrame must contain '{col}' column")

    results = df.apply(
        lambda row: update_player_rating(
            current_score=row["rating_score"],
            peer_scores=row["peer_scores"],
            self_score=row["self_score"] if "self_score" in df.columns else None
        ),
        axis=1
    )

    results_df = pd.DataFrame(results.tolist(), index=df.index)

    df["old_score"] = results_df["old_score"]
    df["delta"] = results_df["delta"]
    df["rating_score"] = results_df["new_score"]
    df["old_rank"] = results_df["old_rank"]
    df["rank"] = results_df["new_rank"]
    df["rank_changed"] = results_df["rank_changed"]

    return df