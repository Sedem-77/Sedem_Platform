import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { PlusIcon, FolderOpenIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'

interface Project {
  id: number
  title: string
  description: string
  category: string
  progress_percentage: number
  status: string
  created_at: string
  due_date?: string
  owner_name: string
  task_count: number
}

const Projects: NextPage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // TODO: Fetch projects from API
    // For now, show placeholder data
    setProjects([
      {
        id: 1,
        title: "GDP-FDI Nexus Analysis",
        description: "Analyzing the relationship between GDP growth and foreign direct investment in emerging markets",
        category: "Economics",
        progress_percentage: 75,
        status: "active",
        created_at: "2024-11-01",
        due_date: "2024-12-15",
        owner_name: "You",
        task_count: 8
      },
      {
        id: 2,
        title: "Education Impact Study",
        description: "Measuring the impact of education policies on student outcomes",
        category: "Education",
        progress_percentage: 45,
        status: "active",
        created_at: "2024-10-15",
        due_date: "2025-01-20",
        owner_name: "You",
        task_count: 12
      },
      {
        id: 3,
        title: "Climate Data Analysis",
        description: "Analyzing temperature trends and climate patterns over the past decade",
        category: "Environmental",
        progress_percentage: 10,
        status: "planning",
        created_at: "2024-11-10",
        due_date: "2025-03-30",
        owner_name: "You",
        task_count: 15
      }
    ])
    setLoading(false)
  }, [])

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
                  <div className="flex items-center">
                    <FolderOpenIcon className="w-4 h-4 mr-2" />
                    <span>{project.category}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Due {new Date(project.due_date || '').toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>{project.task_count} tasks</span>
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

        {/* Create Project Modal Placeholder */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
              <p className="text-gray-600 mb-4">
                Project creation functionality will be implemented in the next update.
              </p>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default withAuth(Projects)