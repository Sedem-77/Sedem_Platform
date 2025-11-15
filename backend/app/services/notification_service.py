import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timedelta
import asyncio
from typing import List

try:
    from jinja2 import Template
    HAS_JINJA2 = True
except ImportError:
    HAS_JINJA2 = False

from ..database import SessionLocal
from ..models import User, Project, Notification, Task, GitHubRepo

class NotificationService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
    
    async def send_daily_reminders(self):
        """Send daily reminders to all active users"""
        
        db = SessionLocal()
        try:
            # Get all active users
            users = db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                await self._send_user_daily_reminder(db, user)
        
        finally:
            db.close()
    
    async def _send_user_daily_reminder(self, db, user: User):
        """Send daily reminder to a specific user"""
        
        try:
            # Check if user has been inactive
            yesterday = datetime.utcnow() - timedelta(days=1)
            
            # Check recent activity
            recent_commits = db.query(GitHubRepo).filter(
                GitHubRepo.user_id == user.id,
                GitHubRepo.last_push_date >= yesterday
            ).count()
            
            # Get pending tasks
            pending_tasks = db.query(Task).join(Project).filter(
                Project.owner_id == user.id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date.isnot(None)
            ).all()
            
            # Check for overdue tasks
            overdue_tasks = [t for t in pending_tasks if t.due_date < datetime.utcnow()]
            
            # Get active projects without recent activity
            inactive_projects = db.query(Project).filter(
                Project.owner_id == user.id,
                Project.status == "active",
                Project.updated_at < yesterday
            ).all()
            
            # Generate reminder content
            reminder_data = {
                "user_name": user.full_name or user.username,
                "has_recent_commits": recent_commits > 0,
                "overdue_tasks": len(overdue_tasks),
                "pending_tasks": len(pending_tasks),
                "inactive_projects": len(inactive_projects),
                "projects": [
                    {
                        "title": p.title,
                        "progress": p.progress_percentage,
                        "last_update": p.updated_at
                    }
                    for p in inactive_projects[:3]
                ]
            }
            
            # Only send reminder if there's something to remind about
            if (not reminder_data["has_recent_commits"] or 
                reminder_data["overdue_tasks"] > 0 or 
                reminder_data["inactive_projects"] > 0):
                
                await self._send_email_reminder(user, reminder_data)
                await self._create_notification(db, user, reminder_data)
        
        except Exception as e:
            print(f"Error sending daily reminder to {user.username}: {str(e)}")
    
    async def _send_email_reminder(self, user: User, data: dict):
        """Send email reminder"""
        
        if not self.smtp_username or not user.email:
            return
        
        try:
            # Email template
            email_template = Template("""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">📊 Sedem Daily Productivity Reminder</h2>
                
                <p>Hi {{ user_name }},</p>
                
                <p>Here's your daily research productivity summary:</p>
                
                {% if not has_recent_commits %}
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #d97706; margin: 0;">⚠️ No Recent GitHub Activity</h3>
                    <p>You haven't pushed any code in the last 24 hours. Don't break your streak!</p>
                </div>
                {% endif %}
                
                {% if overdue_tasks > 0 %}
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #dc2626; margin: 0;">🚨 Overdue Tasks: {{ overdue_tasks }}</h3>
                    <p>You have {{ overdue_tasks }} overdue task(s) that need attention.</p>
                </div>
                {% endif %}
                
                {% if pending_tasks > 0 %}
                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #2563eb; margin: 0;">📋 Pending Tasks: {{ pending_tasks }}</h3>
                    <p>You have {{ pending_tasks }} task(s) in progress or pending.</p>
                </div>
                {% endif %}
                
                {% if inactive_projects > 0 %}
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #374151; margin: 0;">💤 Inactive Projects: {{ inactive_projects }}</h3>
                    <p>These projects haven't been updated recently:</p>
                    <ul>
                    {% for project in projects %}
                        <li>{{ project.title }} ({{ project.progress }}% complete)</li>
                    {% endfor %}
                    </ul>
                </div>
                {% endif %}
                
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #059669; margin: 0;">💪 Keep Going!</h3>
                    <p>Small consistent progress leads to big results. What will you accomplish today?</p>
                </div>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:3000" 
                       style="background: #2563eb; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Open Sedem Dashboard
                    </a>
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; text-align: center;">
                    You're receiving this because you have daily reminders enabled in Sedem.<br>
                    <a href="#" style="color: #2563eb;">Manage notification preferences</a>
                </p>
            </body>
            </html>
            """)
            
            html_content = email_template.render(**data)
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"📊 Daily Productivity Reminder - {datetime.now().strftime('%B %d')}"
            msg["From"] = self.smtp_username
            msg["To"] = user.email
            
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
        
        except Exception as e:
            print(f"Error sending email to {user.email}: {str(e)}")
    
    async def _create_notification(self, db, user: User, data: dict):
        """Create in-app notification"""
        
        try:
            # Create notification summary
            title = "Daily Productivity Reminder"
            
            message_parts = []
            if not data["has_recent_commits"]:
                message_parts.append("No GitHub activity in 24h")
            if data["overdue_tasks"] > 0:
                message_parts.append(f"{data['overdue_tasks']} overdue tasks")
            if data["inactive_projects"] > 0:
                message_parts.append(f"{data['inactive_projects']} inactive projects")
            
            message = " • ".join(message_parts) if message_parts else "Keep up the great work!"
            
            notification = Notification(
                title=title,
                message=message,
                notification_type="reminder",
                user_id=user.id,
                scheduled_for=datetime.utcnow()
            )
            
            db.add(notification)
            db.commit()
        
        except Exception as e:
            print(f"Error creating notification for {user.username}: {str(e)}")
    
    async def send_duplicate_alert(self, user_id: int, duplicate_info: dict):
        """Send alert about duplicate work detected"""
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            
            notification = Notification(
                title="Duplicate Work Detected",
                message=f"Similar analysis found: {duplicate_info.get('description', 'Check your scripts')}",
                notification_type="duplicate",
                user_id=user_id,
                metadata=duplicate_info
            )
            
            db.add(notification)
            db.commit()
        
        finally:
            db.close()
    
    async def send_deadline_reminder(self, task_id: int):
        """Send reminder for approaching task deadline"""
        
        db = SessionLocal()
        try:
            task = db.query(Task).join(Project).first()
            if not task or not task.project:
                return
            
            notification = Notification(
                title="Task Deadline Approaching",
                message=f"Task '{task.title}' is due soon in project '{task.project.title}'",
                notification_type="deadline",
                user_id=task.assignee_id,
                project_id=task.project_id
            )
            
            db.add(notification)
            db.commit()
        
        finally:
            db.close()


# Global instance
notification_service = NotificationService()

# Async function to be called by scheduler
async def send_daily_reminders():
    await notification_service.send_daily_reminders()