from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract
from datetime import datetime, timedelta
from typing import Dict, List

from ..database import get_database
from ..models import User, Project, Task, Activity, GitHubCommit
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

@router.get("/productivity")
async def get_productivity_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get productivity analytics for the specified period"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Task completion stats
    total_tasks = db.query(func.count(Task.id)).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.created_at >= start_date
    ).scalar()
    
    completed_tasks = db.query(func.count(Task.id)).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.status == "completed",
        Task.completed_at >= start_date
    ).scalar()
    
    # GitHub commits
    total_commits = db.query(func.count(GitHubCommit.id)).join(
        GitHubRepo
    ).join(Project).filter(
        Project.owner_id == current_user.id,
        GitHubCommit.commit_date >= start_date
    ).scalar()
    
    # Daily activity
    daily_activities = db.query(
        func.date(Activity.created_at).label('date'),
        func.count(Activity.id).label('count')
    ).filter(
        Activity.user_id == current_user.id,
        Activity.created_at >= start_date
    ).group_by(func.date(Activity.created_at)).all()
    
    # Project progress
    project_stats = db.query(
        Project.category,
        func.count(Project.id).label('count'),
        func.avg(Project.progress_percentage).label('avg_progress')
    ).filter(
        Project.owner_id == current_user.id
    ).group_by(Project.category).all()
    
    return {
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
            "total_commits": total_commits,
            "avg_daily_commits": round(total_commits / days, 1) if days > 0 else 0
        },
        "daily_activity": [
            {
                "date": str(day.date),
                "activities": day.count
            }
            for day in daily_activities
        ],
        "project_categories": [
            {
                "category": stat.category or "Uncategorized",
                "project_count": stat.count,
                "avg_progress": round(stat.avg_progress, 1) if stat.avg_progress else 0
            }
            for stat in project_stats
        ]
    }

@router.get("/timeline")
async def get_activity_timeline(
    limit: int = Query(50, description="Number of activities to return"),
    activity_type: str = Query(None, description="Filter by activity type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get activity timeline for the user"""
    
    query = db.query(Activity).filter(Activity.user_id == current_user.id)
    
    if activity_type:
        query = query.filter(Activity.action == activity_type)
    
    activities = query.order_by(desc(Activity.created_at)).limit(limit).all()
    
    return {
        "activities": [
            {
                "id": a.id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "description": a.description,
                "created_at": a.created_at,
                "project_id": a.project_id,
                "metadata": a.metadata
            }
            for a in activities
        ]
    }

@router.get("/github-stats")
async def get_github_statistics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get GitHub commit and repository statistics"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Commit frequency
    commits_by_day = db.query(
        func.date(GitHubCommit.commit_date).label('date'),
        func.count(GitHubCommit.id).label('count')
    ).join(GitHubRepo).join(Project).filter(
        Project.owner_id == current_user.id,
        GitHubCommit.commit_date >= start_date
    ).group_by(func.date(GitHubCommit.commit_date)).all()
    
    # Repository activity
    repo_activity = db.query(
        GitHubRepo.name,
        func.count(GitHubCommit.id).label('commit_count'),
        func.max(GitHubCommit.commit_date).label('last_commit')
    ).join(GitHubCommit).join(Project).filter(
        Project.owner_id == current_user.id,
        GitHubCommit.commit_date >= start_date
    ).group_by(GitHubRepo.name).all()
    
    # Days since last commit
    last_commit = db.query(func.max(GitHubCommit.commit_date)).join(
        GitHubRepo
    ).join(Project).filter(
        Project.owner_id == current_user.id
    ).scalar()
    
    days_since_commit = (datetime.utcnow() - last_commit).days if last_commit else None
    
    return {
        "summary": {
            "days_since_last_commit": days_since_commit,
            "total_repositories": len(repo_activity),
            "total_commits_period": sum(day.count for day in commits_by_day)
        },
        "daily_commits": [
            {
                "date": str(day.date),
                "commits": day.count
            }
            for day in commits_by_day
        ],
        "repository_activity": [
            {
                "repository": repo.name,
                "commits": repo.commit_count,
                "last_commit": repo.last_commit
            }
            for repo in repo_activity
        ]
    }

@router.get("/weekly-summary")
async def get_weekly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get weekly productivity summary"""
    
    # Get start of current week (Monday)
    today = datetime.utcnow()
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Tasks completed this week
    completed_this_week = db.query(func.count(Task.id)).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.status == "completed",
        Task.completed_at >= week_start
    ).scalar()
    
    # Tasks created this week
    created_this_week = db.query(func.count(Task.id)).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.created_at >= week_start
    ).scalar()
    
    # GitHub commits this week
    commits_this_week = db.query(func.count(GitHubCommit.id)).join(
        GitHubRepo
    ).join(Project).filter(
        Project.owner_id == current_user.id,
        GitHubCommit.commit_date >= week_start
    ).scalar()
    
    # Active projects this week
    active_projects = db.query(func.count(func.distinct(Activity.project_id))).filter(
        Activity.user_id == current_user.id,
        Activity.created_at >= week_start,
        Activity.project_id.isnot(None)
    ).scalar()
    
    # Time tracking (if available)
    total_hours = db.query(func.sum(Task.actual_hours)).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.completed_at >= week_start
    ).scalar()
    
    return {
        "week_start": week_start,
        "tasks_completed": completed_this_week,
        "tasks_created": created_this_week,
        "github_commits": commits_this_week,
        "active_projects": active_projects,
        "total_hours_logged": round(total_hours, 1) if total_hours else 0,
        "productivity_score": calculate_productivity_score(
            completed_this_week, commits_this_week, active_projects
        )
    }

@router.get("/trends")
async def get_productivity_trends(
    weeks: int = Query(12, description="Number of weeks to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get productivity trends over time"""
    
    weekly_data = []
    
    for i in range(weeks):
        week_start = datetime.utcnow() - timedelta(weeks=i+1)
        week_end = week_start + timedelta(days=7)
        
        # Tasks completed that week
        tasks_completed = db.query(func.count(Task.id)).join(Project).filter(
            Project.owner_id == current_user.id,
            Task.status == "completed",
            Task.completed_at >= week_start,
            Task.completed_at < week_end
        ).scalar()
        
        # Commits that week
        commits = db.query(func.count(GitHubCommit.id)).join(
            GitHubRepo
        ).join(Project).filter(
            Project.owner_id == current_user.id,
            GitHubCommit.commit_date >= week_start,
            GitHubCommit.commit_date < week_end
        ).scalar()
        
        weekly_data.append({
            "week_start": week_start.date(),
            "tasks_completed": tasks_completed,
            "commits": commits,
            "productivity_score": calculate_productivity_score(tasks_completed, commits, 1)
        })
    
    return {"weekly_trends": list(reversed(weekly_data))}

def calculate_productivity_score(tasks_completed: int, commits: int, active_projects: int) -> int:
    """Calculate a simple productivity score (0-100)"""
    
    # Weight factors
    task_weight = 40
    commit_weight = 30
    project_weight = 30
    
    # Normalize values (assuming reasonable weekly targets)
    task_score = min(tasks_completed * 10, 100) * (task_weight / 100)
    commit_score = min(commits * 20, 100) * (commit_weight / 100)
    project_score = min(active_projects * 25, 100) * (project_weight / 100)
    
    total_score = task_score + commit_score + project_score
    return round(min(total_score, 100))