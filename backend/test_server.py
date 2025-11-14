#!/usr/bin/env python3
"""
Sedem Backend Test Runner
Run this script to test the Sedem backend API
"""

import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.main import app
    import uvicorn
    
    print("🚀 Starting Sedem Backend Test Server...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the server")
    print("-" * 50)
    
    # Run the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("\nMake sure you've installed all dependencies:")
    print("pip install fastapi uvicorn sqlalchemy python-dotenv")
    
except Exception as e:
    print(f"❌ Error starting server: {e}")
    print("\nCheck your configuration and try again.")