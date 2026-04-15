import joblib
import pandas as pd
import sys

def inspect_model(model_path, scaler_path):
    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        print(f"Model type: {type(model)}")
        print(f"Scaler type: {type(scaler)}")
        
        if hasattr(model, 'feature_names_in_'):
            print(f"Feature names in model: {model.feature_names_in_}")
        elif hasattr(scaler, 'feature_names_in_'):
            print(f"Feature names in scaler: {scaler.feature_names_in_}")
        else:
            print("Could not find feature names automatically.")
            
        if hasattr(model, 'n_features_in_'):
            print(f"Number of features: {model.n_features_in_}")
        
        if hasattr(model, 'classes_'):
            print(f"Classes: {model.classes_}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_model("Behavioural_analysis.pkl", "Behavioural_analysis_scaler.pkl")
