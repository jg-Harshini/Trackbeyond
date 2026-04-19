import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import os

app = FastAPI(title="Dementia Behavioral Analysis Service")

# Path to models relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "model_patient_sample_001.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler_patient_sample_001.pkl")

# 8 features: lat, lon, accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma
# (hour and minute are excluded — they are metadata, not predictive features)
FEATURE_COUNT = 8

# Load global models
try:
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print(f"Global models loaded successfully from {MODEL_PATH}")
    else:
        print(f"Global model files not found at {MODEL_PATH}")
        model = None
        scaler = None
except Exception as e:
    print(f"Error loading global models: {e}")
    model = None
    scaler = None

# Cache for patient models
patient_models = {}
patient_scalers = {}

class SensorData(BaseModel):
    patient_id: str = Field(alias="patientId")
    features: List[float]

    # Handle both Pydantic v1 and v2 naming for field aliases
    class Config:
        allow_population_by_field_name = True # v1
        populate_by_name = True # v2

def get_patient_model(patient_id: str):
    """Load patient-specific model and scaler if they exist"""
    if patient_id in patient_models:
        return patient_models[patient_id], patient_scalers[patient_id]
    
    p_model_path = os.path.join(BASE_DIR, "models", f"model_{patient_id}.pkl")
    p_scaler_path = os.path.join(BASE_DIR, "models", f"scaler_{patient_id}.pkl")
    
    if os.path.exists(p_model_path) and os.path.exists(p_scaler_path):
        try:
            p_model = joblib.load(p_model_path)
            p_scaler = joblib.load(p_scaler_path)
            patient_models[patient_id] = p_model
            patient_scalers[patient_id] = p_scaler
            return p_model, p_scaler
        except Exception as e:
            print(f"Error loading model for {patient_id}: {e}")
    
    # Fallback to global model
    return model, scaler

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict")
def predict(data: SensorData):
    p_model, p_scaler = get_patient_model(data.patient_id)
    
    if not p_model or not p_scaler:
        print(f"Prediction failed: No model found for patient {data.patient_id}")
        raise HTTPException(status_code=500, detail="No model available for prediction")
    
    if len(data.features) != FEATURE_COUNT:
        raise HTTPException(status_code=400, detail=f"Expected {FEATURE_COUNT} features, got {len(data.features)}")
    
    try:
        # Reshape and scale
        features_array = np.array(data.features).reshape(1, -1)
        scaled_features = p_scaler.transform(features_array)
        
        # Predict: IsolationForest returns -1 for outliers, 1 for inliers
        prediction = p_model.predict(scaled_features)[0]
        
        # Calculate decision score (lower score = more anomalous)
        score = p_model.decision_function(scaled_features)[0]
        
        print(f"--- ML PREDICTION ---")
        print(f"Patient ID: {data.patient_id}")
        print(f"Features: {data.features}")
        print(f"Score: {score:.4f} | Prediction: {'NORMAL' if prediction == 1 else 'ANOMALY'}")
        print(f"---------------------")
        
        return {
            "prediction": int(prediction),
            "score": float(score),
            "status": "success",
            "modelType": "patient_specific" if data.patient_id in patient_models else "global"
        }
    except Exception as e:
        print(f"Predict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/{patient_id}")
def train(patient_id: str):
    csv_path = os.path.join(BASE_DIR, "data", "patients", f"{patient_id}_baseline.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"Baseline data not found for {patient_id}")
    
    try:
        # Load data
        df = pd.read_csv(csv_path)
        
        # Drop timestamp, hour, and minute — keep only sensor + GPS features
        drop_cols = [c for c in ['timestamp', 'hour', 'minute'] if c in df.columns]
        X = df.drop(columns=drop_cols)
        
        # Feature scaling
        p_scaler = StandardScaler()
        X_scaled = p_scaler.fit_transform(X)
        
        # Train Isolation Forest
        p_model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
        p_model.fit(X_scaled)
        
        # Save models
        os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
        joblib.dump(p_model, os.path.join(BASE_DIR, "models", f"model_{patient_id}.pkl"))
        joblib.dump(p_scaler, os.path.join(BASE_DIR, "models", f"scaler_{patient_id}.pkl"))
        
        # Update cache
        patient_models[patient_id] = p_model
        patient_scalers[patient_id] = p_scaler
        
        return {"status": "success", "message": f"Model trained and saved for patient {patient_id}", "features_used": list(X.columns)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
