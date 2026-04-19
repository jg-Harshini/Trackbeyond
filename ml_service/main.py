import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import os

app = FastAPI(title="Dementia Behavioral Analysis Service")

# Path to models relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "Behavioural_analysis.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "models", "Behavioural_analysis_scaler.pkl")

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
    patient_id: str
    features: List[float]

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
        raise HTTPException(status_code=500, detail="No model available for prediction")
    
    if len(data.features) != 10:
        raise HTTPException(status_code=400, detail=f"Expected 10 features, got {len(data.features)}")
    
    try:
        # Reshape and scale
        features_array = np.array(data.features).reshape(1, -1)
        scaled_features = p_scaler.transform(features_array)
        
        # Predict: IsolationForest returns -1 for outliers, 1 for inliers
        prediction = p_model.predict(scaled_features)
        
        # Calculate decision score (lower score = more anomalous)
        score = p_model.decision_function(scaled_features)[0]
        
        return {
            "prediction": int(prediction[0]),
            "score": float(score),
            "status": "success",
            "model_type": "patient_specific" if data.patient_id in patient_models else "global"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/{patient_id}")
def train(patient_id: str):
    csv_path = os.path.join(BASE_DIR, "data", "patients", f"{patient_id}_baseline.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"Baseline data not found for {patient_id}")
    
    try:
        # Load data
        df = pd.read_csv(csv_path)
        # Drop timestamp
        X = df.drop(columns=['timestamp'])
        
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
        
        return {"status": "success", "message": f"Model trained and saved for patient {patient_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
