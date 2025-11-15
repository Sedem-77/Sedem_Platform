from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from .database import engine, SessionLocal, Base
from .routes import auth, projects, tasks, analytics, github_integration
from .services.scheduler import start_scheduler
from .utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Sedem API",
    description="Research Productivity and Project Management Platform",
    version="1.0.0",
)

# Setup logging
logger = setup_logger()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://sedem-platform.vercel.app",
        "https://sedem-platform-git-main-denis-folitses-projects.vercel.app",
        "https://sedem-platform-gg2t3sfbb-denis-folitses-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(github_integration.router, prefix="/api/github", tags=["GitHub"])

@app.on_event("startup")
async def startup_event():
    """Initialize application services on startup"""
    logger.info("Starting Sedem API...")
    start_scheduler()
    logger.info("Sedem API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("Shutting down Sedem API...")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Sedem API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Sedem API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)