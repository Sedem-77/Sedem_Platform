import os
import hashlib
import ast
import re
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import asyncio

try:
    import pandas as pd
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False

from ..database import SessionLocal
from ..models import ScriptFile, DuplicateAlert, Project, User
from ..services.notification_service import notification_service

class ScriptAnalyzer:
    def __init__(self):
        self.supported_extensions = {'.py', '.R', '.ipynb'}
        if HAS_ML_LIBS:
            self.vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=1000,
                ngram_range=(1, 2)
            )
        else:
            self.vectorizer = None
    
    async def analyze_all_scripts(self):
        """Analyze all scripts across all projects for duplicates"""
        
        db = SessionLocal()
        try:
            # Get all active projects
            projects = db.query(Project).filter(Project.status == "active").all()
            
            for project in projects:
                if project.github_repo_url:
                    await self._analyze_project_scripts(db, project)
        
        finally:
            db.close()
    
    async def _analyze_project_scripts(self, db, project: Project):
        """Analyze scripts for a specific project"""
        
        try:
            # This would typically clone the repo locally for analysis
            # For now, we'll simulate script analysis
            
            # In a real implementation, you would:
            # 1. Clone the repository locally
            # 2. Scan for Python/R files
            # 3. Extract metadata and content
            # 4. Compare with existing scripts
            
            print(f"Analyzing scripts for project: {project.title}")
            
            # Simulated script files (replace with actual file scanning)
            script_files = self._get_project_script_files(project)
            
            for script_file in script_files:
                await self._process_script_file(db, script_file, project)
        
        except Exception as e:
            print(f"Error analyzing scripts for project {project.title}: {str(e)}")
    
    def _get_project_script_files(self, project: Project) -> List[Dict]:
        """Get script files from project (simulated for now)"""
        
        # This would be replaced with actual file system scanning
        return [
            {
                "path": "analysis/data_cleaning.py",
                "name": "data_cleaning.py",
                "type": ".py",
                "content": "import pandas as pd\ndef clean_data(df): return df.dropna()"
            },
            {
                "path": "models/regression.R",
                "name": "regression.R", 
                "type": ".R",
                "content": "library(lm)\nmodel <- lm(y ~ x, data=df)"
            }
        ]
    
    async def _process_script_file(self, db, file_data: Dict, project: Project):
        """Process a single script file"""
        
        try:
            # Calculate content hash
            content_hash = hashlib.md5(file_data["content"].encode()).hexdigest()
            
            # Check if file already exists
            existing_file = db.query(ScriptFile).filter(
                ScriptFile.file_path == file_data["path"],
                ScriptFile.project_id == project.id
            ).first()
            
            if existing_file and existing_file.content_hash == content_hash:
                # File hasn't changed, skip analysis
                return
            
            # Extract metadata from file
            metadata = self._extract_file_metadata(file_data)
            
            # Create or update script file record
            if existing_file:
                existing_file.content_hash = content_hash
                existing_file.metadata = metadata
                script_file = existing_file
            else:
                script_file = ScriptFile(
                    file_path=file_data["path"],
                    file_name=file_data["name"],
                    file_type=file_data["type"],
                    content_hash=content_hash,
                    metadata=metadata,
                    project_id=project.id
                )
                db.add(script_file)
            
            db.flush()
            
            # Check for duplicates
            await self._check_for_duplicates(db, script_file, file_data["content"])
        
        except Exception as e:
            print(f"Error processing script file {file_data['path']}: {str(e)}")
    
    def _extract_file_metadata(self, file_data: Dict) -> Dict:
        """Extract metadata from script file"""
        
        content = file_data["content"]
        file_type = file_data["type"]
        metadata = {
            "functions": [],
            "imports": [],
            "plots": [],
            "models": [],
            "line_count": len(content.splitlines())
        }
        
        if file_type == ".py":
            metadata.update(self._analyze_python_file(content))
        elif file_type == ".R":
            metadata.update(self._analyze_r_file(content))
        elif file_type == ".ipynb":
            metadata.update(self._analyze_notebook_file(content))
        
        return metadata
    
    def _analyze_python_file(self, content: str) -> Dict:
        """Analyze Python file content"""
        
        metadata = {
            "functions": [],
            "classes": [],
            "imports": [],
            "plots": [],
            "models": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    metadata["functions"].append(node.name)
                elif isinstance(node, ast.ClassDef):
                    metadata["classes"].append(node.name)
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        metadata["imports"].append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        for alias in node.names:
                            metadata["imports"].append(f"{node.module}.{alias.name}")
            
            # Detect plotting libraries
            plot_libraries = ["matplotlib", "seaborn", "plotly", "bokeh"]
            for imp in metadata["imports"]:
                if any(lib in imp for lib in plot_libraries):
                    metadata["plots"].append(imp)
            
            # Detect ML libraries
            ml_libraries = ["sklearn", "tensorflow", "pytorch", "keras", "xgboost"]
            for imp in metadata["imports"]:
                if any(lib in imp for lib in ml_libraries):
                    metadata["models"].append(imp)
        
        except SyntaxError:
            # File has syntax errors, skip AST analysis
            pass
        
        return metadata
    
    def _analyze_r_file(self, content: str) -> Dict:
        """Analyze R file content"""
        
        metadata = {
            "functions": [],
            "libraries": [],
            "plots": [],
            "models": []
        }
        
        lines = content.splitlines()
        
        for line in lines:
            line = line.strip()
            
            # Extract library calls
            if line.startswith("library(") or line.startswith("require("):
                match = re.search(r'(?:library|require)\(([^)]+)\)', line)
                if match:
                    metadata["libraries"].append(match.group(1).strip('"\''))
            
            # Extract function definitions
            if " <- function(" in line:
                func_name = line.split(" <- function(")[0].strip()
                metadata["functions"].append(func_name)
            
            # Detect plotting
            plot_functions = ["ggplot", "plot", "hist", "boxplot", "barplot"]
            if any(func in line for func in plot_functions):
                metadata["plots"].append(line.strip()[:50])
            
            # Detect modeling
            model_functions = ["lm(", "glm(", "randomForest(", "svm("]
            if any(func in line for func in model_functions):
                metadata["models"].append(line.strip()[:50])
        
        return metadata
    
    def _analyze_notebook_file(self, content: str) -> Dict:
        """Analyze Jupyter notebook file"""
        
        # This would parse the JSON structure of notebooks
        # For now, return basic metadata
        return {
            "cell_count": content.count('"cell_type"'),
            "code_cells": content.count('"cell_type": "code"'),
            "markdown_cells": content.count('"cell_type": "markdown"')
        }
    
    async def _check_for_duplicates(self, db, script_file: ScriptFile, content: str):
        """Check if script file has duplicates"""
        
        try:
            # Get all other script files in the same project and other user projects
            other_files = db.query(ScriptFile).filter(
                ScriptFile.id != script_file.id,
                ScriptFile.file_type == script_file.file_type
            ).all()
            
            if not other_files:
                return
            
            # Compare content similarity
            for other_file in other_files:
                similarity = self._calculate_content_similarity(
                    script_file.metadata, 
                    other_file.metadata
                )
                
                if similarity > 0.7:  # 70% similarity threshold
                    await self._create_duplicate_alert(db, script_file, other_file, similarity)
        
        except Exception as e:
            print(f"Error checking duplicates for {script_file.file_path}: {str(e)}")
    
    def _calculate_content_similarity(self, metadata1: Dict, metadata2: Dict) -> float:
        """Calculate similarity between two script files based on metadata"""
        
        try:
            # Compare functions/classes
            functions1 = set(metadata1.get("functions", []))
            functions2 = set(metadata2.get("functions", []))
            
            if functions1 and functions2:
                function_similarity = len(functions1 & functions2) / len(functions1 | functions2)
            else:
                function_similarity = 0
            
            # Compare imports/libraries
            imports1 = set(metadata1.get("imports", []) + metadata1.get("libraries", []))
            imports2 = set(metadata2.get("imports", []) + metadata2.get("libraries", []))
            
            if imports1 and imports2:
                import_similarity = len(imports1 & imports2) / len(imports1 | imports2)
            else:
                import_similarity = 0
            
            # Weighted similarity score
            total_similarity = (function_similarity * 0.6) + (import_similarity * 0.4)
            
            return total_similarity
        
        except Exception as e:
            print(f"Error calculating similarity: {str(e)}")
            return 0
    
    async def _create_duplicate_alert(self, db, script_file: ScriptFile, similar_file: ScriptFile, similarity: float):
        """Create duplicate alert"""
        
        try:
            # Check if alert already exists
            existing_alert = db.query(DuplicateAlert).filter(
                DuplicateAlert.script_file_id == script_file.id,
                DuplicateAlert.similar_file_id == similar_file.id,
                DuplicateAlert.status == "pending"
            ).first()
            
            if existing_alert:
                return
            
            # Get project owner
            project = db.query(Project).filter(Project.id == script_file.project_id).first()
            if not project:
                return
            
            # Create alert
            alert = DuplicateAlert(
                alert_type="similar_script",
                similarity_score=similarity,
                description=f"Found similar script: {similar_file.file_name} "
                           f"({similarity:.1%} similarity)",
                script_file_id=script_file.id,
                similar_file_id=similar_file.id,
                user_id=project.owner_id
            )
            
            db.add(alert)
            db.commit()
            
            # Send notification
            await notification_service.send_duplicate_alert(
                project.owner_id,
                {
                    "file1": script_file.file_name,
                    "file2": similar_file.file_name,
                    "similarity": f"{similarity:.1%}",
                    "description": alert.description
                }
            )
        
        except Exception as e:
            print(f"Error creating duplicate alert: {str(e)}")


# Global instance
script_analyzer = ScriptAnalyzer()

# Function to be called by scheduler
async def analyze_all_scripts():
    await script_analyzer.analyze_all_scripts()