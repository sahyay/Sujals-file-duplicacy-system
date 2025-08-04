from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_pymongo import PyMongo
import gridfs
import os
from dotenv import load_dotenv
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