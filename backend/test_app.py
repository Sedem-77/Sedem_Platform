"""
Sedem Test Application - Minimal Version for Testing
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(
    title="Sedem API - Test Mode",
    description="Research Productivity Platform - Test Server",
    version="1.0.0-test",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🎉 Welcome to Sedem API!", 
        "version": "1.0.0-test",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "projects": "/api/projects (coming soon)",
            "auth": "/api/auth (coming soon)"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "message": "Sedem API is running perfectly! 🚀",
        "environment": "test"
    }

@app.get("/api/test")
async def test_endpoint():
    """Test endpoint to verify API functionality"""
    return {
        "success": True,
        "message": "API is working correctly!",
        "features": [
            "✅ FastAPI server running",
            "✅ CORS enabled for frontend",
            "✅ JSON responses working",
            "✅ Ready for frontend integration"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Sedem Test Server...")
    print("📍 Server: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)