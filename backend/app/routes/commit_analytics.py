from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any
import calendar

from ..database import get_database
from ..models import GitHubCommit, GitHubRepo, User, Project
from ..services.github_service import GitHubService

router = APIRouter()
github_service = GitHubService()

async def get_current_user(credentials, db: Session = Depends(get_database)):
    """Get current authenticated user"""
    payload = github_service.verify_jwt_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user

@router.get("/activity/heatmap")
async def get_commit_heatmap(
    days: int = Query(365, description="Number of days to include"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get commit activity heatmap data for the specified number of days"""
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    # Get user's repositories
    user_repos = db.query(GitHubRepo).filter(GitHubRepo.user_id == current_user.id).all()
    repo_ids = [repo.id for repo in user_repos]
    
    if not repo_ids:
        return {"heatmap_data": [], "total_commits": 0, "streak_data": {"current_streak": 0, "longest_streak": 0}}
    
    # Query commits grouped by date
    commits_by_date = db.query(
        func.date(GitHubCommit.commit_date).label('date'),
        func.count(GitHubCommit.id).label('commits'),
        func.sum(GitHubCommit.additions).label('additions'),
        func.sum(GitHubCommit.deletions).label('deletions')
    ).filter(
        and_(
            GitHubCommit.repo_id.in_(repo_ids),
            func.date(GitHubCommit.commit_date) >= start_date,
            func.date(GitHubCommit.commit_date) <= end_date
        )
    ).group_by(func.date(GitHubCommit.commit_date)).all()
    
    # Convert to dictionary for easy lookup
    commits_dict = {row.date: {
        'commits': row.commits,
        'additions': row.additions or 0,
        'deletions': row.deletions or 0
    } for row in commits_by_date}
    
    # Generate heatmap data for all days in range
    heatmap_data = []
    current_date = start_date
    
    while current_date <= end_date:
        day_data = commits_dict.get(current_date, {'commits': 0, 'additions': 0, 'deletions': 0})
        heatmap_data.append({
            'date': current_date.isoformat(),
            'commits': day_data['commits'],
            'additions': day_data['additions'],
            'deletions': day_data['deletions'],
            'level': min(4, day_data['commits']) if day_data['commits'] > 0 else 0  # 0-4 intensity levels
        })
        current_date += timedelta(days=1)
    
    # Calculate streaks
    streak_data = calculate_commit_streaks(commits_dict, start_date, end_date)
    
    total_commits = sum(day['commits'] for day in heatmap_data)
    
    return {
        "heatmap_data": heatmap_data,
        "total_commits": total_commits,
        "streak_data": streak_data,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        }
    }

@router.get("/activity/trends")
async def get_commit_trends(
    period: str = Query("weekly", description="Time period: daily, weekly, monthly"),
    days: int = Query(90, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get commit trend analysis over time"""
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    # Get user's repositories
    user_repos = db.query(GitHubRepo).filter(GitHubRepo.user_id == current_user.id).all()
    repo_ids = [repo.id for repo in user_repos]
    
    if not repo_ids:
        return {"trends": [], "summary": {}}
    
    # Query commits in date range
    commits = db.query(GitHubCommit).filter(
        and_(
            GitHubCommit.repo_id.in_(repo_ids),
            func.date(GitHubCommit.commit_date) >= start_date,
            func.date(GitHubCommit.commit_date) <= end_date
        )
    ).all()
    
    # Group by period
    if period == "daily":
        trends = group_commits_by_day(commits, start_date, end_date)
    elif period == "weekly":
        trends = group_commits_by_week(commits, start_date, end_date)
    else:  # monthly
        trends = group_commits_by_month(commits, start_date, end_date)
    
    # Calculate summary statistics
    total_commits = len(commits)
    total_additions = sum(c.additions or 0 for c in commits)
    total_deletions = sum(c.deletions or 0 for c in commits)
    
    avg_commits_per_day = total_commits / max(1, days) if total_commits > 0 else 0
    
    summary = {
        "total_commits": total_commits,
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "net_lines": total_additions - total_deletions,
        "avg_commits_per_day": round(avg_commits_per_day, 2),
        "active_days": len(set(c.commit_date.date() for c in commits)),
        "repositories_touched": len(set(c.repo_id for c in commits))
    }
    
    return {"trends": trends, "summary": summary}

@router.get("/activity/languages")
async def get_language_stats(
    days: int = Query(90, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get programming language statistics from repository data"""
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    # Get user's repositories with recent commits
    repo_commits = db.query(
        GitHubRepo.name,
        GitHubRepo.full_name,
        func.count(GitHubCommit.id).label('commit_count'),
        func.sum(GitHubCommit.additions).label('additions'),
        func.sum(GitHubCommit.deletions).label('deletions')
    ).join(
        GitHubCommit, GitHubRepo.id == GitHubCommit.repo_id
    ).filter(
        and_(
            GitHubRepo.user_id == current_user.id,
            func.date(GitHubCommit.commit_date) >= start_date,
            func.date(GitHubCommit.commit_date) <= end_date
        )
    ).group_by(GitHubRepo.id).order_by(desc('commit_count')).all()
    
    # For now, we'll return repository-based stats
    # In a more advanced version, we could analyze file extensions from commit data
    language_stats = []
    for repo_stat in repo_commits:
        language_stats.append({
            "repository": repo_stat.full_name,
            "commits": repo_stat.commit_count,
            "additions": repo_stat.additions or 0,
            "deletions": repo_stat.deletions or 0,
            "net_changes": (repo_stat.additions or 0) - (repo_stat.deletions or 0)
        })
    
    return {"language_stats": language_stats}

@router.get("/activity/achievements")
async def get_coding_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get coding achievements and milestones"""
    
    # Get user's repositories
    user_repos = db.query(GitHubRepo).filter(GitHubRepo.user_id == current_user.id).all()
    repo_ids = [repo.id for repo in user_repos]
    
    if not repo_ids:
        return {"achievements": [], "milestones": {}}
    
    # Get all-time commit stats
    all_commits = db.query(GitHubCommit).filter(GitHubCommit.repo_id.in_(repo_ids)).all()
    
    total_commits = len(all_commits)
    total_additions = sum(c.additions or 0 for c in all_commits)
    total_repos = len(user_repos)
    
    # Calculate achievements
    achievements = []
    
    # Commit milestones
    commit_milestones = [10, 50, 100, 500, 1000, 5000]
    for milestone in commit_milestones:
        if total_commits >= milestone:
            achievements.append({
                "title": f"{milestone} Commits",
                "description": f"Reached {milestone} total commits",
                "icon": "🎯",
                "earned": True,
                "date_earned": "2024-01-01"  # You'd want to track this properly
            })
    
    # Lines of code milestones
    loc_milestones = [1000, 10000, 50000, 100000]
    for milestone in loc_milestones:
        if total_additions >= milestone:
            achievements.append({
                "title": f"{milestone:,} Lines",
                "description": f"Wrote {milestone:,} lines of code",
                "icon": "📝",
                "earned": True,
                "date_earned": "2024-01-01"
            })
    
    # Repository milestones
    repo_milestones = [5, 10, 25, 50]
    for milestone in repo_milestones:
        if total_repos >= milestone:
            achievements.append({
                "title": f"{milestone} Repositories",
                "description": f"Worked on {milestone} repositories",
                "icon": "📁",
                "earned": True,
                "date_earned": "2024-01-01"
            })
    
    # Calculate current milestones progress
    next_commit_milestone = next((m for m in commit_milestones if m > total_commits), commit_milestones[-1])
    next_loc_milestone = next((m for m in loc_milestones if m > total_additions), loc_milestones[-1])
    
    milestones = {
        "total_commits": total_commits,
        "total_additions": total_additions,
        "total_repositories": total_repos,
        "next_commit_milestone": next_commit_milestone,
        "next_loc_milestone": next_loc_milestone,
        "commit_progress": (total_commits / next_commit_milestone) * 100 if next_commit_milestone else 100,
        "loc_progress": (total_additions / next_loc_milestone) * 100 if next_loc_milestone else 100
    }
    
    return {"achievements": achievements, "milestones": milestones}

def calculate_commit_streaks(commits_dict: Dict, start_date: date, end_date: date) -> Dict:
    """Calculate current and longest commit streaks"""
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    # Start from most recent date and work backwards for current streak
    current_date = end_date
    while current_date >= start_date:
        if commits_dict.get(current_date, {}).get('commits', 0) > 0:
            if current_date == end_date or temp_streak > 0:
                temp_streak += 1
                if current_date == end_date:
                    current_streak = temp_streak
        else:
            if temp_streak > longest_streak:
                longest_streak = temp_streak
            if current_date == end_date:
                current_streak = 0
            temp_streak = 0
        current_date -= timedelta(days=1)
    
    if temp_streak > longest_streak:
        longest_streak = temp_streak
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak
    }

def group_commits_by_day(commits: List, start_date: date, end_date: date) -> List[Dict]:
    """Group commits by day"""
    commits_by_date = {}
    for commit in commits:
        commit_date = commit.commit_date.date()
        if commit_date not in commits_by_date:
            commits_by_date[commit_date] = {'commits': 0, 'additions': 0, 'deletions': 0}
        commits_by_date[commit_date]['commits'] += 1
        commits_by_date[commit_date]['additions'] += commit.additions or 0
        commits_by_date[commit_date]['deletions'] += commit.deletions or 0
    
    trends = []
    current_date = start_date
    while current_date <= end_date:
        day_data = commits_by_date.get(current_date, {'commits': 0, 'additions': 0, 'deletions': 0})
        trends.append({
            'period': current_date.isoformat(),
            'commits': day_data['commits'],
            'additions': day_data['additions'],
            'deletions': day_data['deletions']
        })
        current_date += timedelta(days=1)
    
    return trends

def group_commits_by_week(commits: List, start_date: date, end_date: date) -> List[Dict]:
    """Group commits by week"""
    commits_by_week = {}
    for commit in commits:
        # Get Monday of the week
        commit_date = commit.commit_date.date()
        week_start = commit_date - timedelta(days=commit_date.weekday())
        
        if week_start not in commits_by_week:
            commits_by_week[week_start] = {'commits': 0, 'additions': 0, 'deletions': 0}
        commits_by_week[week_start]['commits'] += 1
        commits_by_week[week_start]['additions'] += commit.additions or 0
        commits_by_week[week_start]['deletions'] += commit.deletions or 0
    
    return [
        {
            'period': week_start.isoformat(),
            'commits': data['commits'],
            'additions': data['additions'],
            'deletions': data['deletions']
        }
        for week_start, data in sorted(commits_by_week.items())
    ]

def group_commits_by_month(commits: List, start_date: date, end_date: date) -> List[Dict]:
    """Group commits by month"""
    commits_by_month = {}
    for commit in commits:
        commit_date = commit.commit_date.date()
        month_start = commit_date.replace(day=1)
        
        if month_start not in commits_by_month:
            commits_by_month[month_start] = {'commits': 0, 'additions': 0, 'deletions': 0}
        commits_by_month[month_start]['commits'] += 1
        commits_by_month[month_start]['additions'] += commit.additions or 0
        commits_by_month[month_start]['deletions'] += commit.deletions or 0
    
    return [
        {
            'period': month_start.isoformat(),
            'commits': data['commits'],
            'additions': data['additions'],
            'deletions': data['deletions']
        }
        for month_start, data in sorted(commits_by_month.items())
    ]