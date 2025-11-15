import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { PlusIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Task {
  id: number
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'completed'
  due_date?: string
  created_at: string
  project_title: string
  project_id: number
}

const Tasks: NextPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // TODO: Fetch tasks from API
    // For now, show placeholder data
    setTasks([
      {
        id: 1,
        title: "Complete data analysis for GDP study",
        description: "Perform regression analysis on the GDP and FDI dataset using Python",
        priority: 'high',
        status: 'in_progress',
        due_date: "2024-11-20",
        created_at: "2024-11-10",
        project_title: "GDP-FDI Nexus Analysis",
        project_id: 1
      },
      {
        id: 2,
        title: "Review regression model results",
        description: "Validate the statistical significance of the regression coefficients",
        priority: 'medium',
        status: 'todo',
        due_date: "2024-11-22",
        created_at: "2024-11-10",
        project_title: "GDP-FDI Nexus Analysis",
        project_id: 1
      },
      {
        id: 3,
        title: "Update project documentation",
        description: "Document methodology and findings in the research paper",
        priority: 'low',
        status: 'todo',
        due_date: "2024-11-25",
        created_at: "2024-11-10",
        project_title: "GDP-FDI Nexus Analysis",
        project_id: 1
      },
      {
        id: 4,
        title: "Collect education policy data",
        description: "Gather data from government databases and education institutions",
        priority: 'high',
        status: 'completed',
        due_date: "2024-11-15",
        created_at: "2024-10-20",
        project_title: "Education Impact Study",
        project_id: 2
      },
      {
        id: 5,
        title: "Design survey questionnaire",
        description: "Create questionnaire for student outcome measurement",
        priority: 'medium',
        status: 'in_progress',
        due_date: "2024-11-28",
        created_at: "2024-11-05",
        project_title: "Education Impact Study",
        project_id: 2
      }
    ])
    setLoading(false)
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'todo':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'in_progress':
        return <ClockIcon className="w-5 h-5 text-blue-600" />
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus
    const priorityMatch = filterPriority === 'all' || task.priority === filterPriority
    return statusMatch && priorityMatch
  })

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
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
        <title>Tasks | Sedem</title>
        <meta name="description" content="Manage your research tasks" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="mt-1 text-sm text-gray-600">
                Track and manage your research tasks
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Task
            </button>
          </div>
          
          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white shadow rounded-lg">
          <div className="divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 pt-1">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {task.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium">{task.project_title}</span>
                        {task.due_date && (
                          <>
                            <span className="mx-2">•</span>
                            <span className={isOverdue(task.due_date) ? 'text-red-600' : ''}>
                              Due {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue(task.due_date) && ' (Overdue)'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  {task.status === 'todo' && (
                    <button className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-100 transition-colors">
                      Start Task
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm font-medium hover:bg-green-100 transition-colors">
                      Mark Complete
                    </button>
                  )}
                  <button className="bg-gray-50 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-6">
              {filterStatus !== 'all' || filterPriority !== 'all' 
                ? 'No tasks match your current filters.'
                : 'Get started by creating your first task.'
              }
            </p>
            {(filterStatus !== 'all' || filterPriority !== 'all') ? (
              <button 
                onClick={() => {
                  setFilterStatus('all')
                  setFilterPriority('all')
                }}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700 transition-colors"
              >
                Create Your First Task
              </button>
            )}
          </div>
        )}

        {/* Create Task Modal Placeholder */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
              <p className="text-gray-600 mb-4">
                Task creation functionality will be implemented in the next update.
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

export default withAuth(Tasks)