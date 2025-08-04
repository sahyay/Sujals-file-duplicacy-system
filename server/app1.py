import os
from config import app, socketio, LOCAL_TIMEZONE
from models.anomaly import init_anomaly_model
from routes import register_routes
from utils.time_utils import get_local_time

# Register all routes
register_routes(app)

# Initialize the anomaly model when the app starts
@app.before_request
def before_first_request():
    init_anomaly_model()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting server with timezone: {LOCAL_TIMEZONE}")
    print(f"Current local time: {get_local_time().strftime('%Y-%m-%d %I:%M:%S %p %Z')}")
    socketio.run(app, port=port, debug=True)