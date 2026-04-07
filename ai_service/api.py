from fastapi import FastAPI
import pandas as pd
from main_pipeline import run_initial_pipeline

app = FastAPI()

@app.get("/")
def root():
    return {"status": "ok"}

# Basic Health Check
@app.get("/health")
def health():
    return {"status": "healthy"}


# Deep Health Check
@app.get("/health/deep")
def deep_health():
    checks = {}

    # pandas check
    try:
        import pandas as pd
        _ = pd.DataFrame({"test": [1]})
        checks["pandas"] = "ok"
    except Exception as e:
        checks["pandas"] = f"error: {str(e)}"

    # pipeline import check
    try:
        from main_pipeline import run_initial_pipeline
        checks["pipeline_import"] = "ok"
    except Exception as e:
        checks["pipeline_import"] = f"error: {str(e)}"
    

    # pipeline execution check with dummy data
    try:
        test_df = pd.DataFrame([{
            "pos1": "Setter",
            "pos2": "Outside Hitter",
            "pos3": "Libero",
            "experience": "1-3 years",
            "often": "7-8 times per month",
            "uni_team": "Previously",
            "intensity": "60-90 minutes",
            "rule": 6,
            "serve": 7,
            "serve_receive": 6,
            "spike": 5,
            "spike_receive": 4,
            "set": 9,
            "block": 3
        }])

        result = run_initial_pipeline(test_df)
        # verify expected columns exist
        required_cols = ["total", "rank", "rating_score"]
        for col in required_cols:
            if col not in result.columns:
                raise ValueError(f"Missing column: {col}")

        checks["pipeline_execution"] = "ok"

    except Exception as e:
        checks["pipeline_execution"] = f"error: {str(e)}"

    # Final status report
    status = "healthy" if all(v == "ok" for v in checks.values()) else "unhealthy"
    return {"status": status, "checks": checks}


@app.post("/score")
def score_user_api(data: dict):
    try:

        df = pd.DataFrame([data])
        result = run_initial_pipeline(df)

        row = result.iloc[0]

        return {
            "total": float(row["total"]),
            "rank": row["rank"],
            "rating_score": float(row["rating_score"]),
            "pos1": data["pos1"],
            "pos2": data["pos2"],
            "pos3": data["pos3"],
        }

    except Exception as e:
        return {"error": str(e)}