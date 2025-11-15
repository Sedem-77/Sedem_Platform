import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { 
  UserCircleIcon, 
  BellIcon, 
  ShieldCheckIcon,
  KeyIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface User {
  id: number
  github_username: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}

interface Settings {
  notifications: {
    email_tasks: boolean
    email_deadlines: boolean
    email_weekly_summary: boolean
    push_notifications: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private'
    activity_tracking: boolean
    analytics_sharing: boolean
  }
  github: {
    sync_repositories: boolean
    track_commits: boolean
    auto_create_tasks: boolean
  }
}

const Settings: NextPage = () => {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      email_tasks: true,
      email_deadlines: true,
      email_weekly_summary: false,
      push_notifications: true
    },
    privacy: {
      profile_visibility: 'private',
      activity_tracking: true,
      analytics_sharing: false
    },
    github: {
      sync_repositories: true,
      track_commits: true,
      auto_create_tasks: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    // TODO: Fetch user and settings from API
    // For now, show placeholder data
    setUser({
      id: 1,
      github_username: "github-user",
      email: "user@example.com",
      full_name: "GitHub User",
      avatar_url: "https://github.com/github.png",
      created_at: "2024-11-01"
    })
    setLoading(false)
  }, [])

  const handleSettingChange = (section: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    // TODO: Save settings to API
    setTimeout(() => {
      setSaving(false)
      // Show success message
    }, 1000)
  }

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion
    console.log('Account deletion requested')
    setShowDeleteModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Settings | Sedem</title>
        <meta name="description" content="Account settings and preferences" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center">
            <UserCircleIcon className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <img 
                  src={user?.avatar_url || '/default-avatar.png'} 
                  alt="Profile"
                  className="w-20 h-20 rounded-full"
                />
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      value={user?.full_name || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      value={user?.email || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email is synced from your GitHub account</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GitHub Username</label>
                    <input 
                      type="text" 
                      value={user?.github_username || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center">
            <BellIcon className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Task Updates</h3>
                  <p className="text-sm text-gray-500">Get notified when tasks are created or updated</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications.email_tasks}
                    onChange={(e) => handleSettingChange('notifications', 'email_tasks', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Deadline Reminders</h3>
                  <p className="text-sm text-gray-500">Get reminded about upcoming task deadlines</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications.email_deadlines}
                    onChange={(e) => handleSettingChange('notifications', 'email_deadlines', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Weekly Summary</h3>
                  <p className="text-sm text-gray-500">Receive a weekly productivity summary via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications.email_weekly_summary}
                    onChange={(e) => handleSettingChange('notifications', 'email_weekly_summary', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive browser notifications for important updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications.push_notifications}
                    onChange={(e) => handleSettingChange('notifications', 'push_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center">
            <ShieldCheckIcon className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Privacy & Security</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Profile Visibility</h3>
                  <p className="text-sm text-gray-500">Control who can see your profile and activity</p>
                </div>
                <select 
                  value={settings.privacy.profile_visibility}
                  onChange={(e) => handleSettingChange('privacy', 'profile_visibility', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Activity Tracking</h3>
                  <p className="text-sm text-gray-500">Allow tracking of your activity for analytics</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.privacy.activity_tracking}
                    onChange={(e) => handleSettingChange('privacy', 'activity_tracking', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Analytics Sharing</h3>
                  <p className="text-sm text-gray-500">Share anonymized analytics data to improve the platform</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.privacy.analytics_sharing}
                    onChange={(e) => handleSettingChange('privacy', 'analytics_sharing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center">
            <KeyIcon className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">GitHub Integration</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Sync Repositories</h3>
                  <p className="text-sm text-gray-500">Automatically sync your GitHub repositories</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.github.sync_repositories}
                    onChange={(e) => handleSettingChange('github', 'sync_repositories', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Track Commits</h3>
                  <p className="text-sm text-gray-500">Include GitHub commits in your productivity analytics</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.github.track_commits}
                    onChange={(e) => handleSettingChange('github', 'track_commits', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Auto-create Tasks</h3>
                  <p className="text-sm text-gray-500">Automatically create tasks from GitHub issues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.github.auto_create_tasks}
                    onChange={(e) => handleSettingChange('github', 'auto_create_tasks', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <button 
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-md font-medium hover:bg-red-700 transition-colors flex items-center"
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            Delete Account
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center mb-4">
                <TrashIcon className="w-8 h-8 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and will 
                permanently delete all your projects, tasks, and analytics data.
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes, Delete Account
                </button>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default withAuth(Settings)