// API utility functions for making HTTP requests to the backend

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://web-production-bff53.up.railway.app'
  : 'http://localhost:8000'

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = API_BASE_URL
    this.loadToken()
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      if (response.status === 401) {
        // Token expired or invalid
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return { success: false, error: 'Unauthorized' }
      }

      const data = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: data.detail || data.message || 'Request failed' 
        }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })
      return this.handleResponse<T>(response)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
      return this.handleResponse<T>(response)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })
      return this.handleResponse<T>(response)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      return this.handleResponse<T>(response)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }
}

// Create a singleton instance
export const api = new ApiClient()

// Type definitions for API responses
export interface User {
  id: number
  github_username: string
  email: string
  full_name?: string
  avatar_url?: string
  github_access_token?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  title: string
  description?: string
  category?: string
  status: 'active' | 'completed' | 'archived'
  progress_percentage: number
  created_at: string
  updated_at: string
  due_date?: string
  owner_id: number
  task_count?: number
  completed_tasks?: number
}

export interface Task {
  id: number
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'completed'
  due_date?: string
  created_at: string
  updated_at: string
  completed_at?: string
  project_id: number
  project?: Project
}

export interface Analytics {
  productivity: {
    total_tasks: number
    completed_tasks: number
    completion_rate: number
    total_commits: number
    avg_daily_commits: number
  }
  weekly_summary: {
    tasks_completed: number
    tasks_created: number
    commits: number
    active_projects: number
    productivity_score: number
  }
  trends: Array<{
    week_start: string
    tasks_completed: number
    commits: number
    productivity_score: number
  }>
  daily_activity: Array<{
    date: string
    activities: number
  }>
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  url: string
  default_branch: string
  last_push_date?: string
  last_commit_sha?: string
  project_id?: number
  created_at: string
  description?: string
  language?: string
  stars_count?: number
  forks_count?: number
  is_private?: boolean
}

export interface GitHubCommit {
  id: number
  sha: string
  message: string
  author_name: string
  author_email: string
  commit_date: string
  files_changed?: string[]
  additions: number
  deletions: number
  repo_id: number
}

export interface GitHubActivity {
  date: string
  commits: number
  repositories: string[]
  total_additions: number
  total_deletions: number
}

export interface CommitHeatmapDay {
  date: string
  commits: number
  additions: number
  deletions: number
  level: number // 0-4 intensity level
}

export interface CommitHeatmapData {
  heatmap_data: CommitHeatmapDay[]
  total_commits: number
  streak_data: {
    current_streak: number
    longest_streak: number
  }
  date_range: {
    start: string
    end: string
  }
}

export interface CommitTrendData {
  period: string
  commits: number
  additions: number
  deletions: number
}

export interface CommitTrends {
  trends: CommitTrendData[]
  summary: {
    total_commits: number
    total_additions: number
    total_deletions: number
    net_lines: number
    avg_commits_per_day: number
    active_days: number
    repositories_touched: number
  }
}

export interface LanguageStats {
  language_stats: Array<{
    repository: string
    commits: number
    additions: number
    deletions: number
    net_changes: number
  }>
}

export interface Achievement {
  title: string
  description: string
  icon: string
  earned: boolean
  date_earned: string
}

export interface CodingAchievements {
  achievements: Achievement[]
  milestones: {
    total_commits: number
    total_additions: number
    total_repositories: number
    next_commit_milestone: number
    next_loc_milestone: number
    commit_progress: number
    loc_progress: number
  }
}

// Timeline types
export interface TimelineActivity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  metadata: Record<string, any>
  project_id?: number
  project_name?: string
  entity_id?: number
  icon?: string
  color?: string
  link?: string
}

export interface TimelineData {
  activities: TimelineActivity[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
  filters: {
    activity_type: string
    project_id?: number
    start_date: string
    end_date: string
    search?: string
  }
}

export interface TimelineSummary {
  period: {
    days: number
    start_date: string
    end_date: string
  }
  summary: {
    projects_created: number
    tasks_created: number
    tasks_completed: number
    commits_made: number
    total_activities: number
    completion_rate: number
  }
  daily_breakdown: Array<{
    date: string
    tasks: number
    commits: number
    total: number
  }>
  activity_types: {
    projects: number
    tasks: number
    commits: number
    completed_tasks: number
  }
}

// API endpoints
export const endpoints = {
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/github/login',
    callback: '/api/auth/github/login',
  },
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: number) => `/api/projects/${id}`,
    update: (id: number) => `/api/projects/${id}`,
    delete: (id: number) => `/api/projects/${id}`,
  },
  tasks: {
    list: '/api/tasks',
    create: '/api/tasks',
    get: (id: number) => `/api/tasks/${id}`,
    update: (id: number) => `/api/tasks/${id}`,
    delete: (id: number) => `/api/tasks/${id}`,
  },
  analytics: {
    productivity: '/api/analytics/productivity',
    weekly: '/api/analytics/weekly-summary',
    trends: '/api/analytics/trends',
    timeline: '/api/analytics/timeline',
  },
  github: {
    repositories: '/api/github/repositories',
    sync: '/api/github/sync',
    link: (repoId: number) => `/api/github/repositories/${repoId}/link`,
    commits: (repoId: number) => `/api/github/repositories/${repoId}/commits`,
    activity: '/api/github/activity',
    analytics: '/api/github/analytics',
  },
  commits: {
    heatmap: '/api/commits/activity/heatmap',
    trends: '/api/commits/activity/trends',
    languages: '/api/commits/activity/languages',
    achievements: '/api/commits/activity/achievements',
  },
  timeline: {
    activities: '/api/timeline/timeline',
    summary: '/api/timeline/summary',
  },
}