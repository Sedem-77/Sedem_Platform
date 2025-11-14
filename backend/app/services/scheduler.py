from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger("sedem.scheduler")

scheduler = AsyncIOScheduler()

async def daily_reminder_job():
    """Daily reminder job to notify users about inactive projects"""
    from ..services.notification_service import send_daily_reminders
    
    try:
        logger.info("Running daily reminder job...")
        await send_daily_reminders()
        logger.info("Daily reminder job completed successfully")
    except Exception as e:
        logger.error(f"Error in daily reminder job: {str(e)}")

async def github_sync_job():
    """Job to sync GitHub repositories and commits"""
    from ..services.github_service import sync_all_repositories
    
    try:
        logger.info("Running GitHub sync job...")
        await sync_all_repositories()
        logger.info("GitHub sync job completed successfully")
    except Exception as e:
        logger.error(f"Error in GitHub sync job: {str(e)}")

async def duplicate_detection_job():
    """Job to analyze scripts for duplicate work"""
    from ..services.script_analyzer import analyze_all_scripts
    
    try:
        logger.info("Running duplicate detection job...")
        await analyze_all_scripts()
        logger.info("Duplicate detection job completed successfully")
    except Exception as e:
        logger.error(f"Error in duplicate detection job: {str(e)}")

def start_scheduler():
    """Start the task scheduler"""
    if scheduler.running:
        return
    
    # Add daily reminder job (every day at 9:00 AM)
    scheduler.add_job(
        daily_reminder_job,
        CronTrigger(hour=9, minute=0),
        id='daily_reminders',
        name='Daily Reminder Notifications',
        replace_existing=True
    )
    
    # Add GitHub sync job (every 30 minutes)
    scheduler.add_job(
        github_sync_job,
        CronTrigger(minute='*/30'),
        id='github_sync',
        name='GitHub Repository Sync',
        replace_existing=True
    )
    
    # Add duplicate detection job (every 2 hours)
    scheduler.add_job(
        duplicate_detection_job,
        CronTrigger(minute=0, hour='*/2'),
        id='duplicate_detection',
        name='Script Duplicate Detection',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started with jobs: daily_reminders, github_sync, duplicate_detection")

def stop_scheduler():
    """Stop the task scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")