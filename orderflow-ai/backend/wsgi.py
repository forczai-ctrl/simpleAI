# WSGI entrypoint for Render's gunicorn auto-detection
from app.main import app

application = app
