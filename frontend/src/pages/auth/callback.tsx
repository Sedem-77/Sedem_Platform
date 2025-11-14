import React, { useEffect, useState } from 'react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useAuth } from '../../hooks/useAuth'

const AuthCallback: NextPage = () => {
  const router = useRouter()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      const { code, error: authError } = router.query

      if (authError) {
        setError('Authentication was cancelled or failed')
        setIsLoading(false)
        return
      }

      if (code && typeof code === 'string') {
        try {
          await login(code)
          // Redirect will be handled by the login function
        } catch (err: any) {
          setError(err.message || 'Authentication failed')
          setIsLoading(false)
        }
      } else if (router.isReady) {
        setError('No authorization code received')
        setIsLoading(false)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query, login])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Authentication Failed</h2>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Authenticating...</h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we complete your GitHub authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback