// API utility functions for making HTTP requests to the backend

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://sedem-platform-production.up.railway.app' 
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

// API endpoints
export const endpoints = {
  auth: {
    me: '/auth/me',
    login: '/auth/login',
    callback: '/auth/callback',
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
}