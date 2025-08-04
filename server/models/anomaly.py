import numpy as np
from sklearn.ensemble import IsolationForest
from config import mongo

# Initialize anomaly detection model
anomaly_model = None

def init_anomaly_model():
    """Initialize the anomaly detection model with historical data if available"""
    global anomaly_model
    
    # Get historical file upload data
    files = list(mongo.db.files.find({}, {'size': 1, 'upload_hour': 1}))
    
    if len(files) > 10:  # Only train if we have enough data
        features = [[file.get('size', 0), file.get('upload_hour', 12)] for file in files]
        # Reduced contamination to make model less sensitive
        anomaly_model = IsolationForest(contamination=0.1, random_state=42)
        anomaly_model.fit(features)
    else:
        # Default model with more realistic file size distribution
        mock_sizes = np.concatenate([
            np.random.lognormal(mean=15, sigma=2, size=80),  # Normal files (KB to few MB)
            np.random.lognormal(mean=16.5, sigma=1.5, size=15),  # Larger files (5-15MB)
            np.random.lognormal(mean=18, sigma=1, size=5)  # Very large files (20MB+)
        ])
        
        # Business hours are more common (8-18)
        hours = np.concatenate([
            np.random.randint(8, 19, size=85),  # Business hours
            np.random.randint(0, 24, size=15)   # Any hour
        ])
        
        mock_data = np.column_stack([mock_sizes, hours])
        anomaly_model = IsolationForest(contamination=0.1, random_state=42)
        anomaly_model.fit(mock_data)

def detect_anomaly(file_size, upload_hour):
    """Detect if a file upload is anomalous based on size and time"""
    global anomaly_model
    
    if anomaly_model is None:
        init_anomaly_model()
    
    # Skip anomaly detection for files under 20MB
    if file_size < 20 * 1024 * 1024:
        return False, {}
    
    # Only consider uploads between 11PM and 5AM as potentially anomalous for time
    time_anomaly = upload_hour >= 23 or upload_hour < 5
    
    # For very large files, do additional checks
    if file_size > 30 * 1024 * 1024:
        # Prepare features
        features = np.array([[file_size, upload_hour]]).reshape(1, -1)
        
        # Predict
        prediction = anomaly_model.predict(features)
        
        # -1 indicates anomaly, 1 indicates normal
        is_anomaly = prediction[0] == -1 and time_anomaly
    else:
        is_anomaly = False
    
    details = {}
    if is_anomaly:
        # Determine why it's anomalous
        if file_size > 30 * 1024 * 1024:  # 30MB
            details['size'] = 'File size is unusually large'
        
        if time_anomaly:
            details['time'] = 'Upload time is outside normal business hours'
    
    return is_anomaly, details