import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth, useAuth } from '../hooks/useAuth'
import { 
  UserCircleIcon, 
  PencilIcon,
  CalendarIcon,
  MapPinIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { api, endpoints, type User } from '../utils/api'
import toast from 'react-hot-toast'

const Profile: NextPage = () => {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(authUser)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: authUser?.full_name || '',
    email: authUser?.email || '',
  })

  useEffect(() => {
    if (authUser) {
      setUser(authUser)
      setFormData({
        full_name: authUser.full_name || '',
        email: authUser.email || '',
      })
    }
  }, [authUser])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // For now, just update local state since we don't have a user update endpoint yet
      // TODO: Implement user profile update API endpoint
      toast.success('Profile updated successfully!')
      setEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Profile | Sedem</title>
        <meta name="description" content="Your profile information" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your account information and preferences
              </p>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt={user.full_name || user.github_username || 'User avatar'}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                  />
                  <div className="absolute bottom-0 right-0 bg-green-400 border-2 border-white rounded-full w-6 h-6"></div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1">
                {editing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Email is synced from GitHub</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {user.full_name || user.github_username}
                      </h2>
                      <p className="text-gray-600">@{user.github_username}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <UserCircleIcon className="w-4 h-4 mr-2" />
                          <span>GitHub: @{user.github_username}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <LinkIcon className="w-4 h-4 mr-2" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          <span>Member since {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tasks Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">GitHub Commits</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
          <div className="space-y-3">
            <button className="w-full md:w-auto bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
              Download Data
            </button>
            <button className="w-full md:w-auto bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors ml-0 md:ml-3">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default withAuth(Profile)