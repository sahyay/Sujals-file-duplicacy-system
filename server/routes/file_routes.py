from flask import request, jsonify, send_file
from bson.objectid import ObjectId
import io
from config import mongo, fs, socketio, app
from utils.time_utils import get_local_time
from utils.file_utils import compute_checksum, get_file_content_type
from models.anomaly import detect_anomaly

def register_file_routes(app):
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
                'timezone': str(app.config.get('LOCAL_TIMEZONE'))
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
            "timezone": str(app.config.get('LOCAL_TIMEZONE')),
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