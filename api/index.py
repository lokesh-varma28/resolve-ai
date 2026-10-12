import sys
import os

# Ensure ai-service directory is on sys.path
ai_service_dir = os.path.join(os.path.dirname(__file__), "..", "ai-service")
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

from app.main import app
