from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_database
from ..models import Project, Milestone, User, Activity
from ..services.github_service import GitHubService

router = APIRouter()
security = HTTPBearer()
github_service = GitHubService()

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    abstract: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    github_repo_url: Optional[str] = None
    end_date: Optional[datetime] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    abstract: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    github_repo_url: Optional[str] = None
    end_date: Optional[datetime] = None

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    order_index: Optional[int] = 0

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
async def get_projects(
    status_filter: Optional[str] = Query(None, description="Filter by project status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, description="Limit number of results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get user's projects with optional filters"""
    
    query = db.query(Project).filter(Project.owner_id == current_user.id)
    
    if status_filter:
        query = query.filter(Project.status == status_filter)
    
    if category:
        query = query.filter(Project.category == category)
    
    projects = query.order_by(desc(Project.updated_at)).offset(offset).limit(limit).all()
    
    return {
        "projects": [
            {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "category": p.category,
                "status": p.status,
                "priority": p.priority,
                "progress_percentage": p.progress_percentage,
                "start_date": p.start_date,
                "end_date": p.end_date,
                "github_repo_url": p.github_repo_url,
                "last_commit_date": p.last_commit_date,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "keywords": p.keywords,
                "tags": p.tags
            }
            for p in projects
        ]
    }

@router.post("/")
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Create a new project"""
    
    db_project = Project(
        title=project.title,
        description=project.description,
        abstract=project.abstract,
        category=project.category,
        keywords=project.keywords,
        tags=project.tags,
        github_repo_url=project.github_repo_url,
        end_date=project.end_date,
        owner_id=current_user.id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Create default milestones
    default_milestones = [
        ("Data Collection", "Gather and acquire necessary data for the project"),
        ("Data Cleaning", "Clean, preprocess, and validate the collected data"),
        ("Exploratory Analysis", "Perform initial analysis and data exploration"),
        ("Modeling", "Build and train statistical or machine learning models"),
        ("Validation", "Validate and test model performance"),
        ("Documentation", "Document findings and prepare manuscript/report")
    ]
    
    for idx, (title, description) in enumerate(default_milestones):
        milestone = Milestone(
            title=title,
            description=description,
            order_index=idx,
            project_id=db_project.id
        )
        db.add(milestone)
    
    # Log activity
    activity = Activity(
        action="created",
        entity_type="project",
        entity_id=db_project.id,
        description=f"Created project '{project.title}'",
        user_id=current_user.id,
        project_id=db_project.id
    )
    db.add(activity)
    
    db.commit()
    
    return {
        "id": db_project.id,
        "title": db_project.title,
        "status": db_project.status,
        "created_at": db_project.created_at
    }

@router.get("/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get a specific project with its milestones and tasks"""
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "abstract": project.abstract,
        "category": project.category,
        "keywords": project.keywords,
        "tags": project.tags,
        "status": project.status,
        "priority": project.priority,
        "progress_percentage": project.progress_percentage,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "github_repo_url": project.github_repo_url,
        "last_commit_date": project.last_commit_date,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "status": m.status,
                "order_index": m.order_index,
                "due_date": m.due_date,
                "completed_at": m.completed_at,
                "task_count": len(m.tasks),
                "completed_tasks": len([t for t in m.tasks if t.status == "completed"])
            }
            for m in sorted(project.milestones, key=lambda x: x.order_index)
        ]
    }

@router.put("/{project_id}")
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Update a project"""
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Update fields
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    
    # Log activity
    activity = Activity(
        action="updated",
        entity_type="project",
        entity_id=project.id,
        description=f"Updated project '{project.title}'",
        user_id=current_user.id,
        project_id=project.id
    )
    db.add(activity)
    
    db.commit()
    
    return {"message": "Project updated successfully"}

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Delete a project"""
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Log activity before deletion
    activity = Activity(
        action="deleted",
        entity_type="project",
        entity_id=project.id,
        description=f"Deleted project '{project.title}'",
        user_id=current_user.id
    )
    db.add(activity)
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@router.post("/{project_id}/milestones")
async def create_milestone(
    project_id: int,
    milestone: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Create a new milestone for a project"""
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    db_milestone = Milestone(
        title=milestone.title,
        description=milestone.description,
        due_date=milestone.due_date,
        order_index=milestone.order_index,
        project_id=project_id
    )
    
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    
    return {
        "id": db_milestone.id,
        "title": db_milestone.title,
        "status": db_milestone.status,
        "created_at": db_milestone.created_at
    }

@router.get("/categories")
async def get_project_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get all project categories used by the user"""
    
    categories = db.query(Project.category).filter(
        Project.owner_id == current_user.id,
        Project.category.isnot(None)
    ).distinct().all()
    
    return {"categories": [cat[0] for cat in categories if cat[0]]}

@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get dashboard data including active projects, recent activities, and statistics"""
    
    # Active projects
    active_projects = db.query(Project).filter(
        Project.owner_id == current_user.id,
        Project.status == "active"
    ).order_by(desc(Project.updated_at)).limit(5).all()
    
    # Recent activities
    recent_activities = db.query(Activity).filter(
        Activity.user_id == current_user.id
    ).order_by(desc(Activity.created_at)).limit(10).all()
    
    # Project statistics
    total_projects = db.query(func.count(Project.id)).filter(Project.owner_id == current_user.id).scalar()
    completed_projects = db.query(func.count(Project.id)).filter(
        Project.owner_id == current_user.id,
        Project.status == "completed"
    ).scalar()
    
    # Recent GitHub activity (if available)
    last_commit_date = db.query(func.max(Project.last_commit_date)).filter(
        Project.owner_id == current_user.id
    ).scalar()
    
    return {
        "active_projects": [
            {
                "id": p.id,
                "title": p.title,
                "progress_percentage": p.progress_percentage,
                "last_commit_date": p.last_commit_date,
                "updated_at": p.updated_at
            }
            for p in active_projects
        ],
        "recent_activities": [
            {
                "id": a.id,
                "action": a.action,
                "entity_type": a.entity_type,
                "description": a.description,
                "created_at": a.created_at
            }
            for a in recent_activities
        ],
        "statistics": {
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "completion_rate": round((completed_projects / total_projects * 100) if total_projects > 0 else 0, 1),
            "last_commit_date": last_commit_date
        }
    }