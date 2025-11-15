import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { 
  ChartBarIcon,
  FireIcon,
  CodeBracketIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'
import { api, endpoints } from '../utils/api'

interface CommitAnalytics {
  total_commits: number
  total_additions: number
  total_deletions: number
  daily_commits: Array<{
    date: string
    commits: number
  }>
  weekly_stats: {
    avg_commits_per_day: number
    most_active_day: [string, number]
    current_streak: number
  }
  recent_commits: Array<{
    sha: string
    message: string
    author_name: string
    commit_date: string
    additions: number
    deletions: number
    repository: string
  }>
}

interface ActivityData {
  heatmap_data: Array<{
    date: string
    count: number
    additions: number
    deletions: number
  }>
}

const CommitDashboard: NextPage = () => {
  const [analytics, setAnalytics] = useState<CommitAnalytics | null>(null)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const [analyticsResponse, activityResponse] = await Promise.all([
        api.get<CommitAnalytics>(`${endpoints.github.analytics}?days=${timeRange}`),
        api.get<ActivityData>(endpoints.github.activity)
      ])

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data)
      }

      if (activityResponse.success && activityResponse.data) {
        setActivityData(activityResponse.data)
      }
    } catch (error) {
      console.log('Error fetching commit analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCommitIntensity = (count: number): string => {
    if (count === 0) return 'bg-gray-100'
    if (count <= 2) return 'bg-green-200'
    if (count <= 5) return 'bg-green-400'
    if (count <= 10) return 'bg-green-600'
    return 'bg-green-800'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCommitMessage = (message: string): string => {
    return message.length > 60 ? message.substring(0, 60) + '...' : message
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Commit Activity Dashboard - Sedem</title>
        <meta name="description" content="Track your GitHub commit activity and coding statistics" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
                Commit Activity Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Track your coding activity and development progress
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="timeRange" className="text-sm font-medium text-gray-700">
                Time Range:
              </label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 3 months</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CodeBracketIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Commits
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics.total_commits.toLocaleString()}
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
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Lines Added
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        +{analytics.total_additions.toLocaleString()}
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
                    <FireIcon className="h-8 w-8 text-orange-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Current Streak
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics.weekly_stats.current_streak} days
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
                    <CalendarIcon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Avg Daily Commits
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics.weekly_stats.avg_commits_per_day.toFixed(1)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Commit Activity Chart */}
          {analytics && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Daily Commit Activity
              </h3>
              <div className="space-y-4">
                {analytics.daily_commits.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center">
                    <div className="w-20 text-sm text-gray-500 text-right pr-4">
                      {formatDate(day.date)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div 
                          className="bg-blue-500 h-4 rounded"
                          style={{
                            width: `${Math.max((day.commits / Math.max(...analytics.daily_commits.map(d => d.commits))) * 100, 2)}%`
                          }}
                        ></div>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {day.commits}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commits */}
          {analytics && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Commits
              </h3>
              <div className="space-y-4">
                {analytics.recent_commits.slice(0, 10).map((commit) => (
                  <div key={commit.sha} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <CommandLineIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatCommitMessage(commit.message)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {commit.repository} • {formatDate(commit.commit_date)} • 
                        <span className="text-green-600 ml-1">+{commit.additions}</span>
                        <span className="text-red-600 ml-1">-{commit.deletions}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {analytics.recent_commits.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No recent commits found. Start coding to see your activity!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity Heatmap */}
        {activityData && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Contribution Activity
            </h3>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-53 gap-1 text-xs">
                {activityData.heatmap_data.slice(-365).map((day) => (
                  <div
                    key={day.date}
                    className={`w-3 h-3 rounded-sm ${getCommitIntensity(day.count)}`}
                    title={`${day.date}: ${day.count} commits`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">Less</span>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-200"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-800"></div>
                </div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        )}

        {!analytics && !loading && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No commit data available</h3>
            <p className="text-gray-500">
              Sync your GitHub repositories to start tracking your commit activity.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default withAuth(CommitDashboard)