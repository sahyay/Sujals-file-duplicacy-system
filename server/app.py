from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_pymongo import PyMongo
import gridfs
from bson.objectid import ObjectId
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
import hashlib
import io
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import magic
import tempfile
import time
import pytz

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')
app.config['MONGO_URI'] = os.getenv('MONGO_URI')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

# Set your local timezone - change 'Asia/Kolkata' to your timezone
# Common options: 'Asia/Kolkata' (India), 'America/New_York', 'Europe/London'
LOCAL_TIMEZONE = pytz.timezone('Asia/Kolkata')

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize MongoDB
mongo = PyMongo(app)
fs = gridfs.GridFS(mongo.db)

# Initialize anomaly detection model
anomaly_model = None

def get_local_time():
    """Get current time in local timezone"""
    # Create a timezone-aware UTC datetime
    utc_now = datetime.now(timezone.utc)
    # Convert to local timezone
    local_now = utc_now.astimezone(LOCAL_TIMEZONE)
    return local_now

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

def compute_checksum(file_content):
    """Compute SHA-256 checksum for a file"""
    return hashlib.sha256(file_content).hexdigest()

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

def compute_text_similarity(uploaded_content, existing_content):
    """Compute similarity between text contents using TF-IDF and LSA"""
    try:
        # Convert binary content to text (assuming UTF-8 encoding)
        uploaded_text = uploaded_content.decode('utf-8', errors='ignore')
        existing_text = existing_content.decode('utf-8', errors='ignore')
        
        # If either text is empty, return 0 similarity
        if not uploaded_text.strip() or not existing_text.strip():
            return 0.0
            
        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer(stop_words='english')
        
        # Check if we have enough content to vectorize
        if len(uploaded_text.split()) < 2 or len(existing_text.split()) < 2:
            # For very short content, do direct comparison
            return 100.0 if uploaded_text == existing_text else 0.0
            
        tfidf_matrix = vectorizer.fit_transform([uploaded_text, existing_text])
        
        # If the matrix is empty, return 0
        if tfidf_matrix.nnz == 0:
            return 0.0
            
        # Apply LSA for dimensionality reduction if we have enough features
        if tfidf_matrix.shape[1] > 1:
            n_components = min(100, tfidf_matrix.shape[1] - 1)
            lsa_model = TruncatedSVD(n_components=n_components)
            lsa_matrix = lsa_model.fit_transform(tfidf_matrix)
            
            # Compute cosine similarity
            similarity = cosine_similarity(lsa_matrix[0:1], lsa_matrix[1:2])[0][0]
        else:
            # For single feature, compare directly
            similarity = 1.0 if tfidf_matrix[0,0] == tfidf_matrix[1,0] else 0.0
        
        # Convert to percentage and round to 2 decimal places
        similarity = round(similarity * 100, 2)
        
        return similarity
    except Exception as e:
        print(f"Error computing text similarity: {e}")
        return 0.0

def get_file_content_type(file_content):
    """Determine the content type of a file using python-magic"""
    mime = magic.Magic(mime=True)
    return mime.from_buffer(file_content)

def is_text_file(content_type):
    """Check if a file is a text file based on its content type"""
    text_types = [
        'text/plain', 'text/html', 'text/css', 'text/javascript',
        'application/json', 'application/xml', 'text/xml',
        'application/javascript', 'application/x-javascript'
    ]
    return any(text_type in content_type for text_type in text_types)

def can_compute_similarity(content_type):
    """Check if we can compute similarity for this file type"""
    # Text files
    if is_text_file(content_type):
        return True
    
    # Document files
    document_types = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    return any(doc_type in content_type for doc_type in document_types)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload with duplicate and anomaly detection"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Read file content
    file_content = file.read()
    
    # Get file size
    file_size = len(file_content)
    
    # Get current time in local timezone
    local_time = get_local_time()
    current_hour = local_time.hour
    
    # Detect anomalies
    is_anomaly, anomaly_details = detect_anomaly(file_size, current_hour)
    
    if is_anomaly:
        # Log anomaly
        mongo.db.anomalies.insert_one({
            'filename': file.filename,
            'size': file_size,
            'upload_hour': current_hour,
            'details': anomaly_details,
            'timestamp': local_time,
            'timezone': str(LOCAL_TIMEZONE)
        })
        
        # Emit socket event
        socketio.emit('anomaly_detected', {
            'filename': file.filename,
            'details': anomaly_details
        })
        
        return jsonify({
            'error': 'Anomaly detected!',
            'details': anomaly_details
        }), 400
    
    # Compute checksum for duplicate detection
    checksum = compute_checksum(file_content)
    
    # Check if file already exists
    existing_file = mongo.db.files.find_one({"checksum": checksum})
    
    if existing_file:
        # If checksums match, it's a 100% match regardless of content type
        similarity = 1.0
        content_type = get_file_content_type(file_content)
        
        # Debug logging
        print(f"Duplicate detection: {file.filename}")
        print(f"  Checksum: {checksum}")
        print(f"  Content type: {content_type}")
        print(f"  Similarity: {similarity}%")
        
        # Emit socket event
        socketio.emit('duplicate_detected', {
            'filename': file.filename,
            'existing_filename': existing_file['filename']
        })
        
        return jsonify({
            'error': 'Duplicate file detected!',
            'existing_file': {
                'filename': existing_file['filename'],
                'upload_date': existing_file['upload_date'],
                '_id': str(existing_file['_id'])
            },
            'similarity': similarity
        }), 400
    
    # Save file to GridFS
    content_type = get_file_content_type(file_content)
    file_id = fs.put(
        file_content,
        filename=file.filename,
        content_type=content_type,
        upload_date=local_time  # This is now a timezone-aware datetime
    )
    
    # Save metadata to MongoDB
    file_doc = {
        "filename": file.filename,
        "checksum": checksum,
        "file_id": file_id,
        "content_type": content_type,
        "size": file_size,
        "upload_date": local_time,
        "upload_hour": local_time.hour,
        "timezone": str(LOCAL_TIMEZONE),
        "analysis": {
            "duplicate_check": {
                "is_duplicate": False
            },
            "anomaly_check": {
                "is_anomaly": False
            }
        }
    }
    
    file_id = mongo.db.files.insert_one(file_doc).inserted_id
    
    # Emit socket event
    socketio.emit('file_uploaded', {
        'filename': file.filename,
        'id': str(file_id)
    })
    
    return jsonify({
        'message': 'File uploaded successfully!',
        'file_id': str(file_id)
    }), 200

@app.route('/api/files', methods=['GET'])
def get_files():
    """Get all files"""
    files = list(mongo.db.files.find().sort('upload_date', -1))
    
    # Convert ObjectId to string for JSON serialization
    for file in files:
        file['_id'] = str(file['_id'])
        file['file_id'] = str(file['file_id'])
        
        # Format upload_date for display
        if 'upload_date' in file:
            file['upload_date_formatted'] = file['upload_date'].strftime('%Y-%m-%d %I:%M:%S %p %Z')
    
    return jsonify(files)

@app.route('/api/files/<file_id>', methods=['GET'])
def get_file(file_id):
    """Get file details by ID"""
    try:
        file = mongo.db.files.find_one({"_id": ObjectId(file_id)})
        
        if not file:
            return jsonify({'error': 'File not found'}), 404
        
        # Convert ObjectId to string for JSON serialization
        file['_id'] = str(file['_id'])
        file['file_id'] = str(file['file_id'])
        
        # Format upload_date for display
        if 'upload_date' in file:
            file['upload_date_formatted'] = file['upload_date'].strftime('%Y-%m-%d %I:%M:%S %p %Z')
        
        return jsonify(file)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>/download', methods=['GET'])
def download_file(file_id):
    """Download a file by ID"""
    try:
        file = mongo.db.files.find_one({"_id": ObjectId(file_id)})
        
        if not file:
            return jsonify({'error': 'File not found'}), 404
        
        # Get file from GridFS
        grid_out = fs.get(file['file_id'])
        
        # Create a file-like object
        file_data = io.BytesIO(grid_out.read())
        
        return send_file(
            file_data,
            mimetype=file.get('content_type', 'application/octet-stream'),
            as_attachment=True,
            download_name=file['filename']
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>/preview', methods=['GET'])
def preview_file(file_id):
    """Get a preview of an image file"""
    try:
        file = mongo.db.files.find_one({"_id": ObjectId(file_id)})
        
        if not file:
            return jsonify({'error': 'File not found'}), 404
        
        # Check if it's an image file
        if not file.get('content_type', '').startswith('image/'):
            return jsonify({'error': 'Not an image file'}), 400
        
        # Get file from GridFS
        grid_out = fs.get(file['file_id'])
        
        # Create a file-like object
        file_data = io.BytesIO(grid_out.read())
        
        return send_file(
            file_data,
            mimetype=file['content_type']
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get dashboard statistics and data"""
    try:
        # Get current time in local timezone
        current_local_time = get_local_time()
        
        # Get total files count
        total_files = mongo.db.files.count_documents({})
        
        # Get duplicates detected count
        duplicates_detected = mongo.db.files.count_documents({"analysis.duplicate_check.is_duplicate": True})
        
        # Get anomalies detected count
        anomalies_detected = mongo.db.anomalies.count_documents({})
        
        # Get total storage used
        total_storage = sum(file.get('size', 0) for file in mongo.db.files.find({}, {'size': 1}))
        
        # Get recent activity
        recent_activity = []
        
        # Get recent file uploads
        recent_uploads = list(mongo.db.files.find().sort('upload_date', -1).limit(5))
        for upload in recent_uploads:
            recent_activity.append({
                'type': 'upload',
                'message': f"File '{upload['filename']}' was uploaded",
                'timestamp': upload['upload_date']
            })
        
        # Get recent anomalies
        recent_anomalies = list(mongo.db.anomalies.find().sort('timestamp', -1).limit(5))
        for anomaly in recent_anomalies:
            recent_activity.append({
                'type': 'anomaly',
                'message': f"Anomaly detected in file '{anomaly['filename']}'",
                'timestamp': anomaly['timestamp']
            })
        
        # Sort combined activity by timestamp
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activity = recent_activity[:10]  # Limit to 10 most recent
        
        # Format timestamps for JSON serialization
        for activity in recent_activity:
            activity['timestamp_iso'] = activity['timestamp'].isoformat()
            activity['timestamp_formatted'] = activity['timestamp'].strftime('%Y-%m-%d %I:%M:%S %p %Z')
            activity['timestamp'] = activity['timestamp_iso']  # Keep original format for compatibility
        
        # Get uploads by day for the last 7 days
        uploads_by_day = []
        today = current_local_time.date()
        
        for i in range(7):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time(), tzinfo=LOCAL_TIMEZONE)
            day_end = datetime.combine(day, datetime.max.time(), tzinfo=LOCAL_TIMEZONE)
            
            count = mongo.db.files.count_documents({
                'upload_date': {'$gte': day_start, '$lte': day_end}
            })
            
            uploads_by_day.append({
                'day': day.strftime('%a'),
                'date': day.strftime('%Y-%m-%d'),
                'uploads': count
            })
        
        # Reverse to get chronological order
        uploads_by_day.reverse()
        
        return jsonify({
            'stats': {
                'totalFiles': total_files,
                'duplicatesDetected': duplicates_detected,
                'anomaliesDetected': anomalies_detected,
                'totalStorage': total_storage,
                'totalStorageFormatted': f"{total_storage / (1024 * 1024):.2f} MB"
            },
            'recentActivity': recent_activity,
            'uploadsByDay': uploads_by_day,
            'currentTime': {
                'iso': current_local_time.isoformat(),
                'formatted': current_local_time.strftime('%Y-%m-%d %I:%M:%S %p %Z'),
                'timezone': str(LOCAL_TIMEZONE)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize the anomaly model when the app starts
@app.before_request
def before_first_request():
    init_anomaly_model()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting server with timezone: {LOCAL_TIMEZONE}")
    print(f"Current local time: {get_local_time().strftime('%Y-%m-%d %I:%M:%S %p %Z')}")
    socketio.run(app, port=port, debug=True)    