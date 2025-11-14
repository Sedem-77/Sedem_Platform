import logging
import sys
import os
from datetime import datetime

def setup_logger():
    """Setup application logger"""
    
    # Create logger
    logger = logging.getLogger("sedem")
    logger.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Add handlers to logger
    if not logger.handlers:
        logger.addHandler(console_handler)
        
        # Only add file handler if logs directory exists or can be created
        try:
            # Create logs directory if it doesn't exist
            os.makedirs("logs", exist_ok=True)
            file_handler = logging.FileHandler(f"logs/sedem_{datetime.now().strftime('%Y%m%d')}.log")
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except (OSError, PermissionError):
            # If we can't create files (like in production), just use console logging
            logger.warning("Could not create log file, using console logging only")
    
    return logger