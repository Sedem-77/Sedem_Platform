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

@router.get("/analytics/commits")
async def get_commit_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get commit analytics for the user"""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get user's repositories
    user_repos = db.query(GitHubRepo).filter(GitHubRepo.user_id == current_user.id).all()
    repo_ids = [repo.id for repo in user_repos]
    
    if not repo_ids:
        return {
            "total_commits": 0,
            "daily_commits": [],
            "weekly_stats": {},
            "language_stats": {},
            "recent_commits": []
        }
    
    # Get commits in date range
    commits_query = db.query(GitHubCommit).filter(
        GitHubCommit.repo_id.in_(repo_ids),
        GitHubCommit.commit_date >= start_date,
        GitHubCommit.commit_date <= end_date
    )
    
    all_commits = commits_query.all()
    
    # Daily commit counts
    daily_commits = {}
    for commit in all_commits:
        date_str = commit.commit_date.strftime('%Y-%m-%d')
        daily_commits[date_str] = daily_commits.get(date_str, 0) + 1
    
    # Fill in missing days with 0
    current_date = start_date
    daily_commit_list = []
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        daily_commit_list.append({
            "date": date_str,
            "commits": daily_commits.get(date_str, 0)
        })
        current_date += timedelta(days=1)
    
    # Weekly stats
    total_commits = len(all_commits)
    total_additions = sum(commit.additions for commit in all_commits)
    total_deletions = sum(commit.deletions for commit in all_commits)
    
    # Recent commits (last 10)
    recent_commits = commits_query.order_by(GitHubCommit.commit_date.desc()).limit(10).all()
    
    return {
        "total_commits": total_commits,
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "daily_commits": daily_commit_list,
        "weekly_stats": {
            "avg_commits_per_day": total_commits / days if days > 0 else 0,
            "most_active_day": max(daily_commits.items(), key=lambda x: x[1]) if daily_commits else ("", 0),
            "current_streak": _calculate_commit_streak(daily_commit_list)
        },
        "recent_commits": [
            {
                "sha": commit.sha,
                "message": commit.message,
                "author_name": commit.author_name,
                "commit_date": commit.commit_date,
                "additions": commit.additions,
                "deletions": commit.deletions,
                "repository": next((repo.name for repo in user_repos if repo.id == commit.repo_id), "Unknown")
            }
            for commit in recent_commits
        ]
    }

def _calculate_commit_streak(daily_commits):
    """Calculate current commit streak"""
    streak = 0
    for day in reversed(daily_commits):
        if day["commits"] > 0:
            streak += 1
        else:
            break
    return streak

@router.get("/analytics/activity")
async def get_activity_heatmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get activity heatmap data (365 days)"""
    from datetime import datetime, timedelta
    
    # Calculate one year range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=365)
    
    # Get user's repositories
    user_repos = db.query(GitHubRepo).filter(GitHubRepo.user_id == current_user.id).all()
    repo_ids = [repo.id for repo in user_repos]
    
    if not repo_ids:
        return {"heatmap_data": []}
    
    # Get commits for the year
    commits = db.query(GitHubCommit).filter(
        GitHubCommit.repo_id.in_(repo_ids),
        GitHubCommit.commit_date >= start_date,
        GitHubCommit.commit_date <= end_date
    ).all()
    
    # Group by date
    daily_activity = {}
    for commit in commits:
        date_str = commit.commit_date.strftime('%Y-%m-%d')
        if date_str not in daily_activity:
            daily_activity[date_str] = {
                "date": date_str,
                "count": 0,
                "additions": 0,
                "deletions": 0
            }
        daily_activity[date_str]["count"] += 1
        daily_activity[date_str]["additions"] += commit.additions
        daily_activity[date_str]["deletions"] += commit.deletions
    
    # Fill in all days
    heatmap_data = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        if date_str in daily_activity:
            heatmap_data.append(daily_activity[date_str])
        else:
            heatmap_data.append({
                "date": date_str,
                "count": 0,
                "additions": 0,
                "deletions": 0
            })
        current_date += timedelta(days=1)
    
    return {"heatmap_data": heatmap_data}

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