from fastapi import FastAPI
import pandas as pd
from main_pipeline import run_initial_pipeline

app = FastAPI()

def infer_positions(data: dict) -> dict:
    position_scores = {
        "OH": (data["serve"] + data["serve_receive"] + data["spike"]) / 3,
        "MB": (data["block"] + data["spike"]) / 2,
        "OP": (data["block"] + data["spike"] + data["serve"]) / 3,
        "S":  data["set"],
        "L":  (data["serve_receive"] + data["spike_receive"]) / 2,
    }

    ranked = sorted(position_scores.items(), key=lambda x: x[1], reverse=True)

    return {
        "pos1": ranked[0][0],
        "pos2": ranked[1][0],
        "pos3": ranked[2][0],
    }

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/score")
def score_user_api(data: dict):
    try:
        # infer positions from skill scores
        positions = infer_positions(data)
        data.update(positions)  # adds pos1, pos2, pos3 into data

        df = pd.DataFrame([data])
        result = run_initial_pipeline(df)

        row = result.iloc[0]

        return {
            "total": float(row["total"]),
            "rank": row["rank"],
            "rating_score": float(row["rating_score"]),
            "pos1": positions["pos1"],
            "pos2": positions["pos2"],
            "pos3": positions["pos3"],
        }

    except Exception as e:
        return {"error": str(e)}