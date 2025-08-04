from datetime import datetime, timezone
from config import LOCAL_TIMEZONE

def get_local_time():
    """Get current time in local timezone"""
    # Create a timezone-aware UTC datetime
    utc_now = datetime.now(timezone.utc)
    # Convert to local timezone
    local_now = utc_now.astimezone(LOCAL_TIMEZONE)
    return local_now