from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_database
from ..models import Task, Project, Milestone, User, Activity
from ..services.github_service import GitHubService

router = APIRouter()
security = HTTPBearer()
github_service = GitHubService()

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    milestone_id: Optional[int] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    file_links: Optional[List[str]] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    milestone_id: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    file_links: Optional[List[str]] = None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_database)):
    """Get current authenticated user"""
    payload = github_service.verify_jwt_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return db_user

@router.get("/")
async def get_tasks(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    milestone_id: Optional[int] = Query(None, description="Filter by milestone ID"),
    status_filter: Optional[str] = Query(None, description="Filter by task status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    due_soon: bool = Query(False, description="Show only tasks due in next 7 days"),
    limit: int = Query(50, description="Limit number of results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get user's tasks with optional filters"""
    
    query = db.query(Task).join(Project).filter(Project.owner_id == current_user.id)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    if milestone_id:
        query = query.filter(Task.milestone_id == milestone_id)
    
    if status_filter:
        query = query.filter(Task.status == status_filter)
    
    if priority:
        query = query.filter(Task.priority == priority)
    
    if due_soon:
        from datetime import timedelta
        week_from_now = datetime.utcnow() + timedelta(days=7)
        query = query.filter(
            Task.due_date.isnot(None),
            Task.due_date <= week_from_now,
            Task.status != "completed"
        )
    
    tasks = query.order_by(desc(Task.updated_at)).offset(offset).limit(limit).all()
    
    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date,
                "completed_at": t.completed_at,
                "estimated_hours": t.estimated_hours,
                "actual_hours": t.actual_hours,
                "file_links": t.file_links,
                "project_id": t.project_id,
                "project_title": t.project.title,
                "milestone_id": t.milestone_id,
                "milestone_title": t.milestone.title if t.milestone else None,
                "created_at": t.created_at,
                "updated_at": t.updated_at
            }
            for t in tasks
        ]
    }

@router.post("/")
async def create_task(
    task: TaskCreate,
    project_id: int = Query(..., description="Project ID for the task"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Create a new task"""
    
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Verify milestone if provided
    if task.milestone_id:
        milestone = db.query(Milestone).filter(
            Milestone.id == task.milestone_id,
            Milestone.project_id == project_id
        ).first()
        
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    
    db_task = Task(
        title=task.title,
        description=task.description,
        milestone_id=task.milestone_id,
        due_date=task.due_date,
        priority=task.priority,
        estimated_hours=task.estimated_hours,
        file_links=task.file_links,
        project_id=project_id,
        assignee_id=current_user.id
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Log activity
    activity = Activity(
        action="created",
        entity_type="task",
        entity_id=db_task.id,
        description=f"Created task '{task.title}' in project '{project.title}'",
        user_id=current_user.id,
        project_id=project_id
    )
    db.add(activity)
    db.commit()
    
    return {
        "id": db_task.id,
        "title": db_task.title,
        "status": db_task.status,
        "created_at": db_task.created_at
    }

@router.get("/{task_id}")
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get a specific task"""
    
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "completed_at": task.completed_at,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "file_links": task.file_links,
        "project": {
            "id": task.project.id,
            "title": task.project.title
        },
        "milestone": {
            "id": task.milestone.id,
            "title": task.milestone.title
        } if task.milestone else None,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }

@router.put("/{task_id}")
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Update a task"""
    
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Update fields
    update_data = task_update.dict(exclude_unset=True)
    
    # Handle status change to completed
    if "status" in update_data and update_data["status"] == "completed" and task.status != "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    
    # Log activity
    activity = Activity(
        action="updated",
        entity_type="task",
        entity_id=task.id,
        description=f"Updated task '{task.title}'",
        user_id=current_user.id,
        project_id=task.project_id
    )
    db.add(activity)
    
    db.commit()
    
    return {"message": "Task updated successfully"}

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Delete a task"""
    
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Log activity before deletion
    activity = Activity(
        action="deleted",
        entity_type="task",
        entity_id=task.id,
        description=f"Deleted task '{task.title}'",
        user_id=current_user.id,
        project_id=task.project_id
    )
    db.add(activity)
    
    db.delete(task)
    db.commit()
    
    return {"message": "Task deleted successfully"}

@router.get("/today")
async def get_today_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get today's focus tasks - due today or high priority incomplete tasks"""
    
    today = datetime.utcnow().date()
    
    # Tasks due today
    due_today = db.query(Task).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.status != "completed",
        func.date(Task.due_date) == today
    ).all()
    
    # High priority incomplete tasks
    high_priority = db.query(Task).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.status != "completed",
        Task.priority == "high"
    ).limit(5).all()
    
    # Recently updated tasks
    recent_tasks = db.query(Task).join(Project).filter(
        Project.owner_id == current_user.id,
        Task.status == "in_progress"
    ).order_by(desc(Task.updated_at)).limit(3).all()
    
    return {
        "due_today": [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "project_title": t.project.title,
                "due_date": t.due_date
            }
            for t in due_today
        ],
        "high_priority": [
            {
                "id": t.id,
                "title": t.title,
                "project_title": t.project.title,
                "updated_at": t.updated_at
            }
            for t in high_priority
        ],
        "in_progress": [
            {
                "id": t.id,
                "title": t.title,
                "project_title": t.project.title,
                "updated_at": t.updated_at
            }
            for t in recent_tasks
        ]
    }

@router.post("/{task_id}/complete")
async def complete_task(
    task_id: int,
    actual_hours: Optional[float] = Query(None, description="Actual hours spent"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Mark a task as completed"""
    
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is already completed")
    
    # Update task
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    if actual_hours:
        task.actual_hours = actual_hours
    task.updated_at = datetime.utcnow()
    
    # Log activity
    activity = Activity(
        action="completed",
        entity_type="task",
        entity_id=task.id,
        description=f"Completed task '{task.title}'",
        user_id=current_user.id,
        project_id=task.project_id
    )
    db.add(activity)
    
    db.commit()
    
    return {"message": "Task marked as completed"}