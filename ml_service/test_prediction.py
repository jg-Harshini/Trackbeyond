import requests
import json
import time

def test_behavior_analysis(patient_id):
    url = "http://localhost:8000/predict"
    
    print(f"--- Testing Behavior Analysis for {patient_id} ---")
    
    # scenario 1: Normal Walking (close to the baseline we generated)
    # Features: [lat, lon, accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma, hour, minute]
    normal_data = {
        "patient_id": patient_id,
        "features": [9.9308, 78.0905, 0.2, 0.2, 9.8, 0.05, 0.05, 0.05, 14, 30]
    }
    
    # scenario 2: Abnormal Behavior (Erratic Movement + High Acceleration)
    abnormal_data = {
        "patient_id": patient_id,
        "features": [9.9308, 78.0905, 15.5, 20.1, 45.0, 5.5, 4.2, 8.1, 14, 30]
    }

    try:
        print("\nSending 'Normal' behavior data...")
        r1 = requests.post(url, json=normal_data)
        res1 = r1.json()
        print(f"Result: {'NORMAL' if res1['prediction'] == 1 else 'ANOMALY'}")
        print(f"Score: {res1['score']:.4f} (higher is more normal)")

        print("\nSending 'Abnormal' behavior data...")
        r2 = requests.post(url, json=abnormal_data)
        res2 = r2.json()
        print(f"Result: {'NORMAL' if res2['prediction'] == 1 else 'ANOMALY'}")
        print(f"Score: {res2['score']:.4f} (higher is more normal)")
        
        if res2['prediction'] == -1:
            print("\nSUCCESS: The model correctly identified the abnormal movement!")
        else:
            print("\nNOTE: The discrepancy wasn't large enough to trigger an anomaly. Try more extreme values.")

    except Exception as e:
        print(f"Error connecting to ML service: {e}")
        print("Make sure the ML service is running on http://localhost:8000 (python main.py)")

if __name__ == "__main__":
    # Test with the patient we trained
    test_behavior_analysis("patient_sample_001")
