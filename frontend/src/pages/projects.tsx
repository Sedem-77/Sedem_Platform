import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { withAuth } from '../hooks/useAuth'
import { PlusIcon, FolderOpenIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'
import { api, endpoints, type Project } from '../utils/api'

const Projects: NextPage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Form state for creating new project
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    due_date: ''
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get<Project[]>(endpoints.projects.list)
      if (response.success && response.data) {
        setProjects(response.data)
      } else {
        console.log('Failed to fetch projects:', response.error)
        // Don't show error toast for authentication issues, just show empty state
        if (!response.error?.includes('authentication') && !response.error?.includes('Unauthorized')) {
          toast.error(response.error || 'Failed to fetch projects')
        }
        setProjects([]) // Set empty array instead of keeping loading state
      }
    } catch (error) {
      console.log('Error fetching projects:', error)
      setProjects([]) // Set empty array for any network errors
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'planning':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const response = await api.post<Project>(endpoints.projects.create, formData)
      if (response.success && response.data) {
        setProjects(prev => [response.data!, ...prev])
        setShowCreateModal(false)
        setFormData({ title: '', description: '', category: '', due_date: '' })
        toast.success('Project created successfully!')
      } else {
        toast.error(response.error || 'Failed to create project')
      }
    } catch (error) {
      toast.error('Error creating project')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-600'
    if (progress >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
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
        <title>Projects | Sedem</title>
        <meta name="description" content="Manage your research projects" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="mt-1 text-sm text-gray-600">
                Organize and track your research projects
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {project.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{project.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress_percentage)}`}
                      style={{ width: `${project.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  {project.category && (
                    <div className="flex items-center">
                      <FolderOpenIcon className="w-4 h-4 mr-2" />
                      <span>{project.category}</span>
                    </div>
                  )}
                  {project.due_date && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      <span>Due {new Date(project.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>{project.task_count || 0} tasks</span>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 bg-primary-50 text-primary-700 py-2 px-3 rounded text-sm font-medium hover:bg-primary-100 transition-colors">
                    View Details
                  </button>
                  <button className="flex-1 bg-gray-50 text-gray-700 py-2 px-3 rounded text-sm font-medium hover:bg-gray-100 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FolderOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first research project.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
              
              <form onSubmit={createProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter project title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Describe your research project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="Economics">Economics</option>
                    <option value="Education">Education</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Health">Health</option>
                    <option value="Technology">Technology</option>
                    <option value="Social Sciences">Social Sciences</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {createLoading ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default withAuth(Projects)