import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import os

app = FastAPI(title="Dementia Behavioral Analysis Service")

# Path to models
MODEL_PATH = os.path.join("models", "Behavioural_analysis.pkl")
SCALER_PATH = os.path.join("models", "Behavioural_analysis_scaler.pkl")

# Load models
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("Models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    model = None
    scaler = None

class SensorData(BaseModel):
    features: List[float]

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict")
def predict(data: SensorData):
    if not model or not scaler:
        raise HTTPException(status_code=500, detail="Models not loaded")
    
    if len(data.features) != 10:
        raise HTTPException(status_code=400, detail=f"Expected 10 features, got {len(data.features)}")
    
    try:
        # Reshape and scale
        features_array = np.array(data.features).reshape(1, -1)
        scaled_features = scaler.transform(features_array)
        
        # Predict
        prediction = model.predict(scaled_features)
        probability = model.predict_proba(scaled_features).tolist()[0] if hasattr(model, "predict_proba") else None
        
        return {
            "prediction": int(prediction[0]),
            "probability": probability,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
