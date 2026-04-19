import joblib
import pandas as pd
import numpy as np
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

def train_patient_model(patient_id):
    # Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "data", "patients", f"{patient_id}_baseline.csv")
    model_dir = os.path.join(base_dir, "models")
    
    if not os.path.exists(csv_path):
        print(f"Error: Dataset for {patient_id} not found at {csv_path}")
        return

    print(f"Loading dataset: {csv_path}...")
    try:
        # Load the data
        df = pd.read_csv(csv_path)
        
        # Drop non-feature columns (timestamp)
        # Features are: lat, lon, accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma, hour, minute
        X = df.drop(columns=['timestamp'])
        
        print("Preprocessing data...")
        # Scale the features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        print(f"Training ML Model (Algorithm: Isolation Forest) for {patient_id}...")
        # We use Isolation Forest for anomaly detection.
        # contamination=0.1 means we expect roughly 10% of the training data might be 'noisy'
        # Higher contamination makes the model more sensitive to anomalies.
        model = IsolationForest(
            n_estimators=100, 
            contamination=0.1, 
            random_state=42
        )
        model.fit(X_scaled)
        
        # Save the model and scaler
        os.makedirs(model_dir, exist_ok=True)
        model_name = f"model_{patient_id}.pkl"
        scaler_name = f"scaler_{patient_id}.pkl"
        
        joblib.dump(model, os.path.join(model_dir, model_name))
        joblib.dump(scaler, os.path.join(model_dir, scaler_name))
        
        print("-" * 30)
        print("TRAINING SUCCESSFUL")
        print(f"Algorithm: Isolation Forest")
        print(f"Patient ID: {patient_id}")
        print(f"Total Samples: {len(X)}")
        print(f"Model saved to: {os.path.join(model_dir, model_name)}")
        print(f"Scaler saved to: {os.path.join(model_dir, scaler_name)}")
        print("-" * 30)

    except Exception as e:
        print(f"An error occurred during training: {e}")

if __name__ == "__main__":
    # Correcting common typo if needed
    target_id = "patient_sample_001"
    train_patient_model(target_id)
