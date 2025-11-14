import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

interface User {
  id: number
  username: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  login: (code: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Configure axios defaults
  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [])

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get(`${API_URL}/api/auth/me`)
      setUser(response.data)
    } catch (error) {
      // Token is invalid, remove it
      Cookies.remove('auth_token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (code: string) => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_URL}/api/auth/github/login`, { code })
      
      const { access_token, user: userData } = response.data

      // Store token in cookie
      Cookies.set('auth_token', access_token, { expires: 30 }) // 30 days
      
      // Set axios default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Set user data
      setUser(userData)
      
      toast.success('Successfully logged in!')
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.detail || 'Login failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint
      await axios.post(`${API_URL}/api/auth/logout`)
    } catch (error) {
      // Ignore errors, logout anyway
    } finally {
      // Clear local state
      Cookies.remove('auth_token')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
      
      toast.success('Successfully logged out')
      
      // Redirect to login
      router.push('/login')
    }
  }

  const value = {
    user,
    login,
    logout,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/login')
      }
    }, [user, loading, router])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}