#!/bin/bash

echo "Starting application"

# Activate the virtual environment
source /home/site/wwwroot/venv/bin/activate

flask db upgrade

# Start the application
exec gunicorn --bind 0.0.0.0:8000 run:app