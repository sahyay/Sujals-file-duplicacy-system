# This file makes the routes directory a Python package

def register_routes(app):
    """Register all routes with the Flask app"""
    from routes.file_routes import register_file_routes
    from routes.dashboard import register_dashboard_routes
    
    register_file_routes(app)
    register_dashboard_routes(app)