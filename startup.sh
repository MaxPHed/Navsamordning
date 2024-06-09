#!/bin/bash

echo "Starting application"

# Kontrollera om vi kör lokalt eller på Azure
if [ -d "venv/Scripts" ]; then
    # Lokalt på Windows
    source venv/Scripts/activate
else
    # På Azure
    source /home/site/wwwroot/venv/bin/activate
fi

# Exekvera gunicorn med rätt sökväg
if command -v gunicorn &> /dev/null; then
    exec gunicorn --bind 0.0.0.0:8000 run:app
else
    echo "Gunicorn is not installed or not in the PATH"
fi
