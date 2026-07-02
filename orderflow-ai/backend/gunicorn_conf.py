# Gunicorn configuration for FastAPI/ASGI apps on Render
# This allows Render's default gunicorn detection to work with uvicorn workers

bind = "0.0.0.0:8000"
workers = 1
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
preload_app = False
