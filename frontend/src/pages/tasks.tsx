import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { withAuth } from '../hooks/useAuth'
import { PlusIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { api, endpoints, type Task, type Project } from '../utils/api'

const Tasks: NextPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Form state for creating new task
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    project_id: '',
    due_date: ''
  })

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await api.get<Task[]>(endpoints.tasks.list)
      if (response.success && response.data) {
        setTasks(response.data)
      } else {
        console.log('Failed to fetch tasks:', response.error)
        setTasks([]) // Set empty array and show empty state gracefully
      }
    } catch (error) {
      console.log('Error fetching tasks:', error)
      setTasks([]) // Set empty array for any network errors
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get<Project[]>(endpoints.projects.list)
      if (response.success && response.data) {
        setProjects(response.data)
      }
    } catch (error) {
      console.error('Error fetching projects')
    }
  }

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

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const response = await api.post<Task>(endpoints.tasks.create, formData)
      if (response.success && response.data) {
        setTasks(prev => [response.data!, ...prev])
        setShowCreateModal(false)
        setFormData({ title: '', description: '', priority: 'medium', project_id: '', due_date: '' })
        toast.success('Task created successfully!')
      } else {
        toast.error(response.error || 'Failed to create task')
      }
    } catch (error) {
      toast.error('Error creating task')
    } finally {
      setCreateLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: number, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      const response = await api.put<Task>(endpoints.tasks.update(taskId), { status: newStatus })
      if (response.success && response.data) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? response.data! : task
        ))
        toast.success('Task updated successfully!')
      } else {
        toast.error(response.error || 'Failed to update task')
      }
    } catch (error) {
      toast.error('Error updating task')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const getProjectTitle = (projectId: number) => {
    const project = projects.find(p => p.id === projectId)
    return project?.title || 'Unknown Project'
  }

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
                        <span className="font-medium">{getProjectTitle(task.project_id)}</span>
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
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Start Task
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                      className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded text-sm font-medium hover:bg-yellow-100 transition-colors"
                    >
                      Reopen
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

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
              
              <form onSubmit={createTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter task title"
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
                    placeholder="Describe the task"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project *
                    </label>
                    <select
                      name="project_id"
                      value={formData.project_id}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    {createLoading ? 'Creating...' : 'Create Task'}
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

export default withAuth(Tasks)