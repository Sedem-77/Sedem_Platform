from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..database import get_database
from ..models import User
from ..services.github_service import GitHubService
import httpx
import os
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer()
github_service = GitHubService()

class GitHubLoginRequest(BaseModel):
    code: str

@router.post("/github/login")
async def github_login(request: GitHubLoginRequest, db: Session = Depends(get_database)):
    """Exchange GitHub authorization code for access token and create/update user"""
    
    try:
        # Exchange code for access token
        token_data = await github_service.exchange_code_for_token(request.code)
        access_token = token_data["access_token"]
        
        # Get user information from GitHub
        user_info = await github_service.get_user_info(access_token)
        
        # Check if user exists
        db_user = db.query(User).filter(User.github_id == user_info["id"]).first()
        
        if db_user:
            # Update existing user
            db_user.username = user_info["login"]
            db_user.email = user_info.get("email")
            db_user.full_name = user_info.get("name")
            db_user.avatar_url = user_info.get("avatar_url")
            db_user.github_access_token = access_token
        else:
            # Create new user
            db_user = User(
                github_id=user_info["id"],
                username=user_info["login"],
                email=user_info.get("email"),
                full_name=user_info.get("name"),
                avatar_url=user_info.get("avatar_url"),
                github_access_token=access_token
            )
            db.add(db_user)
        
        db.commit()
        db.refresh(db_user)
        
        # Generate JWT token
        jwt_token = github_service.create_jwt_token({"user_id": db_user.id})
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "email": db_user.email,
                "full_name": db_user.full_name,
                "avatar_url": db_user.avatar_url
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub authentication failed: {str(e)}"
        )

@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_database)
):
    """Get current authenticated user information"""
    
    try:
        # Verify JWT token
        payload = github_service.verify_jwt_token(credentials.credentials)
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user from database
        db_user = db.query(User).filter(User.id == user_id).first()
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "avatar_url": db_user.avatar_url,
            "created_at": db_user.created_at,
            "is_active": db_user.is_active
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_database)
):
    """Logout user (invalidate token on client side)"""
    
    # Note: JWT tokens are stateless, so we can't truly invalidate them
    # The client should remove the token from storage
    return {"message": "Successfully logged out"}

@router.get("/github/repos")
async def get_user_repos(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_database)
):
    """Get user's GitHub repositories"""
    
    try:
        # Verify user
        payload = github_service.verify_jwt_token(credentials.credentials)
        user_id = payload.get("user_id")
        
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user or not db_user.github_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub token not found"
            )
        
        # Get repositories from GitHub
        repos = await github_service.get_user_repositories(db_user.github_access_token)
        
        return {"repositories": repos}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch repositories: {str(e)}"
        )