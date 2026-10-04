#!/bin/bash
# Startup script for Azure Linux App Service (FastAPI / Uvicorn)
PORT="${PORT:-8000}"
echo "Starting CiviLanka.Agent on 0.0.0.0:${PORT}..."
python -m uvicorn main:app --host 0.0.0.0 --port "${PORT}"
