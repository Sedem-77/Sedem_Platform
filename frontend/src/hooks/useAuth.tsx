import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { api, endpoints, type User } from '../utils/api'

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

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.get<User>(endpoints.auth.me)
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        // Token is invalid, remove it
        api.clearToken()
      }
    } catch (error) {
      // Token is invalid, remove it
      api.clearToken()
    } finally {
      setLoading(false)
    }
  }

  const login = async (code: string) => {
    try {
      setLoading(true)
      const response = await api.post<{access_token: string, user: User}>(endpoints.auth.callback, { code })
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed')
      }

      const { access_token, user: userData } = response.data

      // Store token and set it in API client
      api.setToken(access_token)
      
      // Set user data
      setUser(userData)
      
      toast.success('Successfully logged in!')
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Clear local state first
      api.clearToken()
      setUser(null)
      
      toast.success('Successfully logged out')
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
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