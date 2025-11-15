from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Union
from enum import Enum

from ..database import get_database
from ..models import (
    User, Project, Task, Milestone, GitHubCommit, GitHubRepo, 
    Activity, Notification, ScriptFile, DuplicateAlert
)
from ..services.github_service import GitHubService

router = APIRouter()
github_service = GitHubService()
security = HTTPBearer()

class ActivityType(str, Enum):
    PROJECT = "project"
    TASK = "task"
    MILESTONE = "milestone"
    COMMIT = "commit" 
    NOTIFICATION = "notification"
    SCRIPT = "script"
    DUPLICATE = "duplicate"
    ALL = "all"

class TimelineActivity:
    """Unified timeline activity model"""
    def __init__(
        self,
        id: int,
        type: str,
        title: str,
        description: str,
        timestamp: datetime,
        metadata: Dict[str, Any] = None,
        project_id: Optional[int] = None,
        project_name: Optional[str] = None,
        entity_id: Optional[int] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        link: Optional[str] = None
    ):
        self.id = id
        self.type = type
        self.title = title
        self.description = description
        self.timestamp = timestamp
        self.metadata = metadata or {}
        self.project_id = project_id
        self.project_name = project_name
        self.entity_id = entity_id
        self.icon = icon
        self.color = color
        self.link = link

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "description": self.description,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
            "project_id": self.project_id,
            "project_name": self.project_name,
            "entity_id": self.entity_id,
            "icon": self.icon,
            "color": self.color,
            "link": self.link
        }

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_database)
):
    """Get current authenticated user"""
    payload = github_service.verify_jwt_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user

@router.get("")
async def get_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database),
    activity_type: ActivityType = Query(ActivityType.ALL, description="Filter by activity type"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(50, ge=1, le=200, description="Number of activities to return"),
    offset: int = Query(0, ge=0, description="Number of activities to skip"),
    search: Optional[str] = Query(None, description="Search in titles and descriptions")
):
    """
    Get unified timeline of all user activities
    """
    try:
        activities = []
        
        # Set default date range if not provided
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        # 1. Get Project Activities
        if activity_type in [ActivityType.PROJECT, ActivityType.ALL]:
            projects = db.query(Project).filter(
                Project.owner_id == current_user.id
            )
            
            if project_id:
                projects = projects.filter(Project.id == project_id)
            
            projects = projects.filter(
                and_(
                    Project.created_at >= start_date,
                    Project.created_at <= end_date
                )
            )
            
            if search:
                projects = projects.filter(
                    or_(
                        Project.title.ilike(f"%{search}%"),
                        Project.description.ilike(f"%{search}%")
                    )
                )

            for project in projects:
                activities.append(TimelineActivity(
                    id=f"project_{project.id}",
                    type="project_created",
                    title=f"Created project: {project.title}",
                    description=project.description or "New project created",
                    timestamp=project.created_at,
                    metadata={
                        "status": project.status,
                        "priority": project.priority,
                        "progress": project.progress_percentage,
                        "category": project.category
                    },
                    project_id=project.id,
                    project_name=project.title,
                    entity_id=project.id,
                    icon="folder",
                    color="blue",
                    link=f"/projects/{project.id}"
                ))

        # 2. Get Task Activities  
        if activity_type in [ActivityType.TASK, ActivityType.ALL]:
            tasks = db.query(Task).join(Project).filter(
                Task.assignee_id == current_user.id
            )
            
            if project_id:
                tasks = tasks.filter(Task.project_id == project_id)
                
            tasks = tasks.filter(
                and_(
                    Task.created_at >= start_date,
                    Task.created_at <= end_date
                )
            )
            
            if search:
                tasks = tasks.filter(
                    or_(
                        Task.title.ilike(f"%{search}%"),
                        Task.description.ilike(f"%{search}%")
                    )
                )

            for task in tasks:
                # Task created
                activities.append(TimelineActivity(
                    id=f"task_created_{task.id}",
                    type="task_created",
                    title=f"Created task: {task.title}",
                    description=task.description or "New task created",
                    timestamp=task.created_at,
                    metadata={
                        "status": task.status,
                        "priority": task.priority,
                        "estimated_hours": task.estimated_hours
                    },
                    project_id=task.project_id,
                    project_name=task.project.title if task.project else None,
                    entity_id=task.id,
                    icon="check-circle",
                    color="green",
                    link=f"/tasks/{task.id}"
                ))
                
                # Task completed
                if task.completed_at and start_date <= task.completed_at <= end_date:
                    activities.append(TimelineActivity(
                        id=f"task_completed_{task.id}",
                        type="task_completed",
                        title=f"Completed task: {task.title}",
                        description=f"Task completed successfully",
                        timestamp=task.completed_at,
                        metadata={
                            "actual_hours": task.actual_hours,
                            "estimated_hours": task.estimated_hours,
                            "efficiency": task.actual_hours / task.estimated_hours if task.actual_hours and task.estimated_hours else None
                        },
                        project_id=task.project_id,
                        project_name=task.project.title if task.project else None,
                        entity_id=task.id,
                        icon="check-circle",
                        color="green",
                        link=f"/tasks/{task.id}"
                    ))

        # 3. Get Milestone Activities
        if activity_type in [ActivityType.MILESTONE, ActivityType.ALL]:
            milestones = db.query(Milestone).join(Project).filter(
                Project.owner_id == current_user.id
            )
            
            if project_id:
                milestones = milestones.filter(Milestone.project_id == project_id)
                
            milestones = milestones.filter(
                and_(
                    Milestone.created_at >= start_date,
                    Milestone.created_at <= end_date
                )
            )
            
            if search:
                milestones = milestones.filter(
                    or_(
                        Milestone.title.ilike(f"%{search}%"),
                        Milestone.description.ilike(f"%{search}%")
                    )
                )

            for milestone in milestones:
                activities.append(TimelineActivity(
                    id=f"milestone_{milestone.id}",
                    type="milestone_created",
                    title=f"Created milestone: {milestone.title}",
                    description=milestone.description or "New milestone created",
                    timestamp=milestone.created_at,
                    metadata={
                        "status": milestone.status,
                        "due_date": milestone.due_date.isoformat() if milestone.due_date else None
                    },
                    project_id=milestone.project_id,
                    project_name=milestone.project.title if milestone.project else None,
                    entity_id=milestone.id,
                    icon="flag",
                    color="purple",
                    link=f"/projects/{milestone.project_id}#milestone-{milestone.id}"
                ))

        # 4. Get GitHub Commit Activities
        if activity_type in [ActivityType.COMMIT, ActivityType.ALL]:
            commits = db.query(GitHubCommit).join(GitHubRepo).join(Project).filter(
                Project.owner_id == current_user.id
            )
            
            if project_id:
                commits = commits.filter(GitHubRepo.project_id == project_id)
                
            commits = commits.filter(
                and_(
                    GitHubCommit.commit_date >= start_date,
                    GitHubCommit.commit_date <= end_date
                )
            )
            
            if search:
                commits = commits.filter(
                    GitHubCommit.message.ilike(f"%{search}%")
                )

            for commit in commits:
                activities.append(TimelineActivity(
                    id=f"commit_{commit.id}",
                    type="commit",
                    title=f"Committed to {commit.repo.name}",
                    description=commit.message or "No commit message",
                    timestamp=commit.commit_date,
                    metadata={
                        "sha": commit.sha[:8],
                        "additions": commit.additions,
                        "deletions": commit.deletions,
                        "files_changed": len(commit.files_changed or []),
                        "author": commit.author_name
                    },
                    project_id=commit.repo.project_id,
                    project_name=commit.repo.project.title if commit.repo.project else None,
                    entity_id=commit.id,
                    icon="code-bracket",
                    color="gray",
                    link=f"/github/commits/{commit.sha}"
                ))

        # 5. Get Activity Log entries (explicit user activities)
        explicit_activities = db.query(Activity).filter(
            Activity.user_id == current_user.id
        )
        
        if project_id:
            explicit_activities = explicit_activities.filter(Activity.project_id == project_id)
            
        explicit_activities = explicit_activities.filter(
            and_(
                Activity.created_at >= start_date,
                Activity.created_at <= end_date
            )
        )
        
        if search:
            explicit_activities = explicit_activities.filter(
                or_(
                    Activity.description.ilike(f"%{search}%"),
                    Activity.action.ilike(f"%{search}%")
                )
            )

        for activity in explicit_activities:
            activities.append(TimelineActivity(
                id=f"activity_{activity.id}",
                type=f"{activity.entity_type}_{activity.action}",
                title=f"{activity.action.replace('_', ' ').title()} {activity.entity_type}",
                description=activity.description or f"User {activity.action} a {activity.entity_type}",
                timestamp=activity.created_at,
                metadata=activity.activity_metadata or {},
                project_id=activity.project_id,
                project_name=activity.project.title if activity.project else None,
                entity_id=activity.entity_id,
                icon="activity",
                color="indigo",
                link=f"/{activity.entity_type}s/{activity.entity_id}" if activity.entity_id else None
            ))

        # Sort all activities by timestamp (most recent first)
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        total_count = len(activities)
        paginated_activities = activities[offset:offset + limit]
        
        # Convert to dictionaries
        timeline_data = [activity.to_dict() for activity in paginated_activities]
        
        return {
            "success": True,
            "data": {
                "activities": timeline_data,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                },
                "filters": {
                    "activity_type": activity_type,
                    "project_id": project_id,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "search": search
                }
            }
        }

    except Exception as e:
        print(f"Error getting timeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch timeline")

@router.get("/summary")
async def get_timeline_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """
    Get timeline activity summary and statistics
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get activity counts by type
        project_count = db.query(Project).filter(
            and_(
                Project.owner_id == current_user.id,
                Project.created_at >= start_date
            )
        ).count()
        
        task_count = db.query(Task).filter(
            and_(
                Task.assignee_id == current_user.id,
                Task.created_at >= start_date
            )
        ).count()
        
        completed_task_count = db.query(Task).filter(
            and_(
                Task.assignee_id == current_user.id,
                Task.completed_at >= start_date,
                Task.status == "completed"
            )
        ).count()
        
        commit_count = db.query(GitHubCommit).join(GitHubRepo).join(Project).filter(
            and_(
                Project.owner_id == current_user.id,
                GitHubCommit.commit_date >= start_date
            )
        ).count()
        
        # Get daily activity breakdown
        daily_activities = []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            day_tasks = db.query(Task).filter(
                and_(
                    Task.assignee_id == current_user.id,
                    Task.created_at >= day_start,
                    Task.created_at < day_end
                )
            ).count()
            
            day_commits = db.query(GitHubCommit).join(GitHubRepo).join(Project).filter(
                and_(
                    Project.owner_id == current_user.id,
                    GitHubCommit.commit_date >= day_start,
                    GitHubCommit.commit_date < day_end
                )
            ).count()
            
            daily_activities.append({
                "date": day_start.date().isoformat(),
                "tasks": day_tasks,
                "commits": day_commits,
                "total": day_tasks + day_commits
            })
        
        return {
            "success": True,
            "data": {
                "period": {
                    "days": days,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "summary": {
                    "projects_created": project_count,
                    "tasks_created": task_count,
                    "tasks_completed": completed_task_count,
                    "commits_made": commit_count,
                    "total_activities": project_count + task_count + commit_count,
                    "completion_rate": round((completed_task_count / task_count * 100) if task_count > 0 else 0, 1)
                },
                "daily_breakdown": daily_activities,
                "activity_types": {
                    "projects": project_count,
                    "tasks": task_count,
                    "commits": commit_count,
                    "completed_tasks": completed_task_count
                }
            }
        }

    except Exception as e:
        print(f"Error getting timeline summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch timeline summary")