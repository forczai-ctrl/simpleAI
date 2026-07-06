@echo off
cd /d "%~dp0"
set PYTHONPATH=%CD%
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002
