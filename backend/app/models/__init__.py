from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    github_access_token = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="owner")
    tasks = relationship("Task", back_populates="assignee")
    notifications = relationship("Notification", back_populates="user")
    activities = relationship("Activity", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    abstract = Column(Text)
    category = Column(String(100))
    keywords = Column(JSON)  # Store as JSON array
    tags = Column(JSON)      # Store as JSON array
    status = Column(String(50), default="active")  # active, completed, paused, archived
    priority = Column(String(20), default="medium")  # low, medium, high
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    owner_id = Column(Integer, ForeignKey("users.id"))
    github_repo_url = Column(String(500))
    last_commit_date = Column(DateTime)
    progress_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    github_repos = relationship("GitHubRepo", back_populates="project")
    activities = relationship("Activity", back_populates="project")

class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="not_started")  # not_started, in_progress, completed
    order_index = Column(Integer, default=0)
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    project_id = Column(Integer, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="milestones")
    tasks = relationship("Task", back_populates="milestone", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="todo")  # todo, in_progress, completed, cancelled
    priority = Column(String(20), default="medium")  # low, medium, high
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    estimated_hours = Column(Float)
    actual_hours = Column(Float)
    file_links = Column(JSON)  # Store file paths/URLs as JSON array
    project_id = Column(Integer, ForeignKey("projects.id"))
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    milestone = relationship("Milestone", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")

class GitHubRepo(Base):
    __tablename__ = "github_repos"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    full_name = Column(String(500), nullable=False)  # owner/repo
    url = Column(String(500), nullable=False)
    clone_url = Column(String(500))
    default_branch = Column(String(100), default="main")
    last_push_date = Column(DateTime)
    last_commit_sha = Column(String(255))
    is_active = Column(Boolean, default=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="github_repos")
    commits = relationship("GitHubCommit", back_populates="repo")

class GitHubCommit(Base):
    __tablename__ = "github_commits"
    
    id = Column(Integer, primary_key=True, index=True)
    sha = Column(String(255), unique=True, nullable=False)
    message = Column(Text)
    author_name = Column(String(255))
    author_email = Column(String(255))
    commit_date = Column(DateTime)
    files_changed = Column(JSON)  # Store list of changed files
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    repo_id = Column(Integer, ForeignKey("github_repos.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    repo = relationship("GitHubRepo", back_populates="commits")

class ScriptFile(Base):
    __tablename__ = "script_files"
    
    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(1000), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(10))  # .py, .R, .ipynb
    content_hash = Column(String(255))  # For duplicate detection
    file_metadata = Column(JSON)  # Functions, plots, models, etc.
    last_modified = Column(DateTime)
    size_bytes = Column(Integer)
    project_id = Column(Integer, ForeignKey("projects.id"))
    repo_id = Column(Integer, ForeignKey("github_repos.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - Fixed foreign key ambiguity
    duplicates_as_primary = relationship("DuplicateAlert", foreign_keys="DuplicateAlert.script_file_id", back_populates="script_file")
    duplicates_as_similar = relationship("DuplicateAlert", foreign_keys="DuplicateAlert.similar_file_id", back_populates="similar_file")

class DuplicateAlert(Base):
    __tablename__ = "duplicate_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50))  # function, plot, model, analysis
    similarity_score = Column(Float)  # 0.0 to 1.0
    description = Column(Text)
    status = Column(String(20), default="pending")  # pending, dismissed, merged
    script_file_id = Column(Integer, ForeignKey("script_files.id"))
    similar_file_id = Column(Integer, ForeignKey("script_files.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships - Fixed foreign key ambiguity
    script_file = relationship("ScriptFile", foreign_keys=[script_file_id], back_populates="duplicates_as_primary")
    similar_file = relationship("ScriptFile", foreign_keys=[similar_file_id], back_populates="duplicates_as_similar")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    notification_type = Column(String(50))  # reminder, duplicate, deadline, github
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    scheduled_for = Column(DateTime)
    sent_at = Column(DateTime)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)  # created, updated, completed, etc.
    entity_type = Column(String(50))  # project, task, milestone, commit
    entity_id = Column(Integer)
    description = Column(Text)
    activity_metadata = Column(JSON)  # Additional context
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="activities")
    project = relationship("Project", back_populates="activities")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    reminder_frequency = Column(Integer, default=24)  # hours
    email_notifications = Column(Boolean, default=True)
    desktop_notifications = Column(Boolean, default=True)
    gamification_enabled = Column(Boolean, default=True)
    timezone = Column(String(50), default="UTC")
    productivity_goals = Column(JSON)  # Daily/weekly goals
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)