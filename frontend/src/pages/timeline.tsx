import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { withAuth } from '../hooks/useAuth'
import { 
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FolderIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  FlagIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { api, endpoints, type TimelineData, type TimelineSummary, type TimelineActivity } from '../utils/api'

const TimelinePage: NextPage = () => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [summaryData, setSummaryData] = useState<TimelineSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and search
  const [activityType, setActivityType] = useState('all')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState(30) // days
  const [currentPage, setCurrentPage] = useState(0)
  
  const itemsPerPage = 20

  useEffect(() => {
    fetchTimelineData()
    fetchSummaryData()
  }, [activityType, projectFilter, searchQuery, dateRange, currentPage])

  const fetchTimelineData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        activity_type: activityType,
        limit: itemsPerPage.toString(),
        offset: (currentPage * itemsPerPage).toString(),
        days: dateRange.toString()
      })
      
      if (projectFilter) {
        params.append('project_id', projectFilter)
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      const response = await api.get<TimelineData>(`${endpoints.timeline.activities}?${params}`)
      
      if (response.success && response.data) {
        setTimelineData(response.data)
      } else {
        setError(response.error || 'Failed to load timeline data')
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error)
      setError('Failed to load timeline data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummaryData = async () => {
    try {
      const response = await api.get<TimelineSummary>(`${endpoints.timeline.summary}?days=${dateRange}`)
      
      if (response.success && response.data) {
        setSummaryData(response.data)
      }
    } catch (error) {
      console.error('Error fetching summary data:', error)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return FolderIcon
      case 'task_created':
      case 'task_completed':
        return CheckCircleIcon
      case 'milestone_created':
        return FlagIcon
      case 'commit':
        return CodeBracketIcon
      default:
        return ClockIcon
    }
  }

  const getActivityColor = (color?: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600'
      case 'green': return 'bg-green-100 text-green-600'
      case 'purple': return 'bg-purple-100 text-purple-600'
      case 'gray': return 'bg-gray-100 text-gray-600'
      case 'indigo': return 'bg-indigo-100 text-indigo-600'
      default: return 'bg-blue-100 text-blue-600'
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / 1000 / 60)
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60))
      return `${days}d ago`
    }
  }

  const handleFilterChange = (filter: string, value: string) => {
    setCurrentPage(0) // Reset to first page when filters change
    
    switch (filter) {
      case 'type':
        setActivityType(value)
        break
      case 'project':
        setProjectFilter(value)
        break
      case 'search':
        setSearchQuery(value)
        break
      case 'dateRange':
        setDateRange(parseInt(value))
        break
    }
  }

  const loadMore = () => {
    if (timelineData?.pagination.has_more) {
      setCurrentPage(prev => prev + 1)
    }
  }

  if (loading && !timelineData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (error && !timelineData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => fetchTimelineData()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Activity Timeline - Sedem</title>
        <meta name="description" content="Unified timeline of all your productivity activities" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600 mr-3" />
            Activity Timeline
          </h1>
          <p className="mt-2 text-gray-600">
            Complete chronological view of your productivity activities
          </p>
        </div>

        {/* Summary Stats */}
        {summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Activities
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData.summary.total_activities}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tasks Completed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData.summary.tasks_completed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CodeBracketIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Commits Made
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData.summary.commits_made}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FolderIcon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completion Rate
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData.summary.completion_rate}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={activityType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Activities</option>
                <option value="project">Projects</option>
                <option value="task">Tasks</option>
                <option value="milestone">Milestones</option>
                <option value="commit">Commits</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white shadow rounded-lg">
          {timelineData?.activities?.length === 0 ? (
            <div className="text-center py-16">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || activityType !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Start creating projects and tasks to see your activity timeline'
                }
              </p>
              {!searchQuery && activityType === 'all' && (
                <Link
                  href="/projects"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg inline-flex items-center"
                >
                  <FolderIcon className="h-5 w-5 mr-2" />
                  Create Project
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {timelineData?.activities?.map((activity) => {
                const IconComponent = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.color)
                
                return (
                  <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {activity.link ? (
                              <Link href={activity.link} className="hover:text-blue-600">
                                {activity.title}
                              </Link>
                            ) : (
                              activity.title
                            )}
                          </h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                        
                        <p className="mt-1 text-sm text-gray-600">
                          {activity.description}
                        </p>
                        
                        <div className="mt-2 flex items-center space-x-4">
                          {activity.project_name && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {activity.project_name}
                            </span>
                          )}
                          
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="flex items-center space-x-2">
                              {activity.metadata.status && (
                                <span className="text-xs text-gray-500">
                                  Status: {activity.metadata.status}
                                </span>
                              )}
                              {activity.metadata.additions && (
                                <span className="text-xs text-green-600">
                                  +{activity.metadata.additions}
                                </span>
                              )}
                              {activity.metadata.deletions && (
                                <span className="text-xs text-red-600">
                                  -{activity.metadata.deletions}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load More */}
          {timelineData?.pagination.has_more && (
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More Activities'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default withAuth(TimelinePage)