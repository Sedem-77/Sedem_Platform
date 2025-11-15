import httpx
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
import asyncio
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

class GitHubService:
    def __init__(self):
        self.client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.jwt_algorithm = "HS256"
        
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange GitHub authorization code for access token"""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"}
            )
            
            if response.status_code != 200:
                raise Exception(f"GitHub token exchange failed: {response.text}")
            
            token_data = response.json()
            
            # Check for OAuth error response
            if "error" in token_data:
                error_msg = token_data.get("error_description", token_data.get("error", "Unknown error"))
                raise Exception(f"OAuth error: {error_msg}")
            
            return token_data
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from GitHub API"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get user info: {response.text}")
            
            return response.json()
    
    async def get_user_repositories(self, access_token: str, per_page: int = 100) -> List[Dict[str, Any]]:
        """Get user's GitHub repositories"""
        
        repos = []
        page = 1
        
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    "https://api.github.com/user/repos",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={
                        "per_page": per_page,
                        "page": page,
                        "sort": "updated",
                        "type": "all"
                    }
                )
                
                if response.status_code != 200:
                    break
                
                page_repos = response.json()
                if not page_repos:
                    break
                
                repos.extend(page_repos)
                page += 1
                
                # Limit to prevent excessive API calls
                if len(repos) >= 500:
                    break
        
        return repos
    
    async def get_repository_commits(self, access_token: str, owner: str, repo: str, since: str = None) -> List[Dict[str, Any]]:
        """Get commits from a specific repository"""
        
        params = {"per_page": 100}
        if since:
            params["since"] = since
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/commits",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params
            )
            
            if response.status_code != 200:
                return []
            
            return response.json()
    
    async def get_commit_details(self, access_token: str, owner: str, repo: str, sha: str) -> Dict[str, Any]:
        """Get detailed information about a specific commit"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                return {}
            
            return response.json()
    
    def create_jwt_token(self, data: Dict[str, Any], expires_delta: timedelta = None) -> str:
        """Create JWT token"""
        
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=30)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except JWTError:
            raise Exception("Invalid token")
    
    async def sync_all_repositories(self):
        """Sync all user repositories (called by scheduler)"""
        from ..database import SessionLocal
        from ..models import User, GitHubRepo, GitHubCommit
        
        db = SessionLocal()
        try:
            # Get all active users with GitHub tokens
            users = db.query(User).filter(
                User.is_active == True,
                User.github_access_token.isnot(None)
            ).all()
            
            for user in users:
                await self._sync_user_repositories(db, user)
            
            db.commit()
        finally:
            db.close()
    
    async def _sync_user_repositories(self, db, user):
        """Sync repositories for a specific user"""
        from ..models import GitHubRepo, GitHubCommit
        try:
            # Get user's repositories from GitHub
            repos = await self.get_user_repositories(user.github_access_token)
            
            for repo_data in repos:
                # Update or create repository record
                db_repo = db.query(GitHubRepo).filter(
                    GitHubRepo.full_name == repo_data["full_name"],
                    GitHubRepo.user_id == user.id
                ).first()
                
                if not db_repo:
                    db_repo = GitHubRepo(
                        name=repo_data["name"],
                        full_name=repo_data["full_name"],
                        url=repo_data["html_url"],
                        clone_url=repo_data["clone_url"],
                        default_branch=repo_data.get("default_branch", "main"),
                        user_id=user.id
                    )
                    db.add(db_repo)
                    db.flush()
                
                # Sync recent commits
                await self._sync_repository_commits(db, db_repo, user.github_access_token)
        
        except Exception as e:
            print(f"Error syncing repositories for user {user.username}: {str(e)}")
    
    async def _sync_repository_commits(self, db, repo, access_token):
        """Sync commits for a specific repository"""
        from ..models import GitHubCommit
        try:
            owner, repo_name = repo.full_name.split("/")
            
            # Get recent commits (last 24 hours)
            since = (datetime.utcnow() - timedelta(days=1)).isoformat()
            commits = await self.get_repository_commits(access_token, owner, repo_name, since)
            
            for commit_data in commits:
                # Check if commit already exists
                existing_commit = db.query(GitHubCommit).filter(
                    GitHubCommit.sha == commit_data["sha"]
                ).first()
                
                if not existing_commit:
                    # Create new commit record
                    commit = GitHubCommit(
                        sha=commit_data["sha"],
                        message=commit_data["commit"]["message"],
                        author_name=commit_data["commit"]["author"]["name"],
                        author_email=commit_data["commit"]["author"]["email"],
                        commit_date=datetime.fromisoformat(
                            commit_data["commit"]["author"]["date"].replace("Z", "+00:00")
                        ),
                        repo_id=repo.id
                    )
                    db.add(commit)
            
            # Update repository's last push date
            if commits:
                repo.last_push_date = datetime.fromisoformat(
                    commits[0]["commit"]["author"]["date"].replace("Z", "+00:00")
                )
                repo.last_commit_sha = commits[0]["sha"]
        
        except Exception as e:
            print(f"Error syncing commits for repository {repo.full_name}: {str(e)}")