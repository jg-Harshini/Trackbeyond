import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_patient_data(patient_id, num_rows=10000):
    # Set seed for reproducibility
    np.random.seed(42)
    
    # Base location (Madurai, Tamil Nadu region based on coords)
    base_lat = 9.930897
    base_lon = 78.090558
    
    # Time window: Yesterday and the day before
    now = datetime(2026, 4, 19, 17, 0, 0)
    start_time = now - timedelta(days=2)
    
    data = []
    
    for i in range(num_rows):
        # Increment time by ~10 seconds per row
        current_time = start_time + timedelta(seconds=i * 10)
        
        # Location: small random walk
        lat = base_lat + np.random.normal(0, 0.0001)
        lon = base_lon + np.random.normal(0, 0.0001)
        
        # Accelerometer: Normal walking oscillations around gravity (9.8 on Z)
        # Assuming phone is in pocket (vertical-ish)
        accX = np.random.normal(0, 0.5)
        accY = np.random.normal(0, 0.5)
        accZ = 9.8 + np.sin(i * 0.5) * 2.0 + np.random.normal(0, 0.3) # Walking gait
        
        # Gyroscope: Small rotations
        gyroAlpha = np.random.normal(0, 0.1)
        gyroBeta = np.random.normal(0, 0.1)
        gyroGamma = np.random.normal(0, 0.1)
        
        hour = current_time.hour
        minute = current_time.minute
        
        data.append([
            current_time.strftime('%Y-%m-%d %H:%M:%S'),
            lat, lon, accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma, hour, minute
        ])
    
    df = pd.DataFrame(data, columns=[
        'timestamp', 'lat', 'lon', 'accX', 'accY', 'accZ', 
        'gyroAlpha', 'gyroBeta', 'gyroGamma', 'hour', 'minute'
    ])
    
    # Ensure directory exists
    os.makedirs('data/patients', exist_ok=True)
    
    file_path = f'data/patients/{patient_id}_baseline.csv'
    df.to_csv(file_path, index=False)
    print(f"Generated {num_rows} rows of sample data for patient {patient_id} at {file_path}")

if __name__ == "__main__":
    # Example patient ID
    generate_patient_data("patient_sample_001")
