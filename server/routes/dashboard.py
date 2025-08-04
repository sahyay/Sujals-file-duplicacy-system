from flask import jsonify
from datetime import datetime, timedelta
from config import mongo, app, LOCAL_TIMEZONE
from utils.time_utils import get_local_time

def register_dashboard_routes(app):
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