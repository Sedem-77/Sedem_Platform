from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_database
from ..models import GitHubRepo, GitHubCommit, Project, User
from ..services.github_service import GitHubService

router = APIRouter()
github_service = GitHubService()

async def get_current_user(credentials, db: Session = Depends(get_database)):
    """Get current authenticated user"""
    payload = github_service.verify_jwt_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return db_user

@router.get("/repositories")
async def get_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get user's connected GitHub repositories"""
    
    repositories = db.query(GitHubRepo).filter(
        GitHubRepo.user_id == current_user.id,
        GitHubRepo.is_active == True
    ).all()
    
    return {
        "repositories": [
            {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "url": repo.url,
                "default_branch": repo.default_branch,
                "last_push_date": repo.last_push_date,
                "last_commit_sha": repo.last_commit_sha,
                "project_id": repo.project_id,
                "created_at": repo.created_at
            }
            for repo in repositories
        ]
    }

@router.post("/sync")
async def sync_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Manually trigger repository synchronization"""
    
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub access token found"
        )
    
    try:
        await github_service._sync_user_repositories(db, current_user)
        db.commit()
        
        return {"message": "Repository synchronization completed successfully"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync repositories: {str(e)}"
        )

@router.post("/repositories/{repo_id}/link")
async def link_repository_to_project(
    repo_id: int,
    project_id: int = Query(..., description="Project ID to link"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Link a GitHub repository to a project"""
    
    # Verify repository ownership
    repository = db.query(GitHubRepo).filter(
        GitHubRepo.id == repo_id,
        GitHubRepo.user_id == current_user.id
    ).first()
    
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Link repository to project
    repository.project_id = project_id
    project.github_repo_url = repository.url
    
    db.commit()
    
    return {"message": "Repository linked to project successfully"}

@router.delete("/repositories/{repo_id}/unlink")
async def unlink_repository(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Unlink a repository from its project"""
    
    repository = db.query(GitHubRepo).filter(
        GitHubRepo.id == repo_id,
        GitHubRepo.user_id == current_user.id
    ).first()
    
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Remove project link
    if repository.project_id:
        project = db.query(Project).filter(Project.id == repository.project_id).first()
        if project:
            project.github_repo_url = None
    
    repository.project_id = None
    
    db.commit()
    
    return {"message": "Repository unlinked successfully"}

@router.get("/repositories/{repo_id}/commits")
async def get_repository_commits(
    repo_id: int,
    limit: int = Query(50, description="Number of commits to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get commits for a specific repository"""
    
    repository = db.query(GitHubRepo).filter(
        GitHubRepo.id == repo_id,
        GitHubRepo.user_id == current_user.id
    ).first()
    
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    commits = repository.commits[-limit:] if repository.commits else []
    
    return {
        "repository": {
            "id": repository.id,
            "name": repository.name,
            "full_name": repository.full_name
        },
        "commits": [
            {
                "sha": commit.sha,
                "message": commit.message,
                "author_name": commit.author_name,
                "author_email": commit.author_email,
                "commit_date": commit.commit_date,
                "files_changed": commit.files_changed,
                "additions": commit.additions,
                "deletions": commit.deletions
            }
            for commit in reversed(commits)
        ]
    }

@router.post("/webhook")
async def github_webhook(
    payload: dict,
    db: Session = Depends(get_database)
):
    """Handle GitHub webhook events"""
    
    event_type = payload.get("action", "")
    repository_data = payload.get("repository", {})
    
    if not repository_data:
        return {"message": "No repository data in payload"}
    
    full_name = repository_data.get("full_name")
    if not full_name:
        return {"message": "No repository full name in payload"}
    
    # Find repository in database
    repository = db.query(GitHubRepo).filter(
        GitHubRepo.full_name == full_name
    ).first()
    
    if not repository:
        return {"message": "Repository not tracked"}
    
    # Handle push events
    if event_type == "push":
        commits_data = payload.get("commits", [])
        
        for commit_data in commits_data:
            # Process new commits
            pass  # Implementation would go here
    
    return {"message": "Webhook processed"}