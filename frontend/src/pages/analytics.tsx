import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { withAuth } from '../hooks/useAuth'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { api, endpoints, type Analytics } from '../utils/api'

const AnalyticsPage: NextPage = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch productivity analytics
      const productivityResponse = await api.get<Analytics['productivity']>(
        `${endpoints.analytics.productivity}?days=${timeRange}`
      )
      
      // Fetch weekly summary
      const weeklyResponse = await api.get<Analytics['weekly_summary']>(
        endpoints.analytics.weekly
      )
      
      // Fetch trends
      const trendsResponse = await api.get<Analytics['trends']>(
        endpoints.analytics.trends
      )

      if (productivityResponse.success && weeklyResponse.success && trendsResponse.success) {
        setAnalytics({
          productivity: productivityResponse.data || {
            total_tasks: 0,
            completed_tasks: 0,
            completion_rate: 0,
            total_commits: 0,
            avg_daily_commits: 0
          },
          weekly_summary: weeklyResponse.data || {
            tasks_completed: 0,
            tasks_created: 0,
            commits: 0,
            active_projects: 0,
            productivity_score: 0
          },
          trends: trendsResponse.data || [],
          daily_activity: []
        })
      } else {
        console.log('Analytics data not available')
        // Set default empty data
        setAnalytics({
          productivity: {
            total_tasks: 0,
            completed_tasks: 0,
            completion_rate: 0,
            total_commits: 0,
            avg_daily_commits: 0
          },
          weekly_summary: {
            tasks_completed: 0,
            tasks_created: 0,
            commits: 0,
            active_projects: 0,
            productivity_score: 0
          },
          trends: [],
          daily_activity: []
        })
      }
    } catch (error) {
      console.log('Error fetching analytics:', error)
      // Set default empty data without showing error toast for auth issues
      setAnalytics({
        productivity: {
          total_tasks: 0,
          completed_tasks: 0,
          completion_rate: 0,
          total_commits: 0,
          avg_daily_commits: 0
        },
        weekly_summary: {
          tasks_completed: 0,
          tasks_created: 0,
          commits: 0,
          active_projects: 0,
          productivity_score: 0
        },
        trends: [],
        daily_activity: []
      })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <>
      <Head>
        <title>Analytics | Sedem</title>
        <meta name="description" content="Productivity analytics and insights" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">
                Track your productivity and research progress
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Productivity Score Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Weekly Productivity Score</h2>
            <ArrowTrendingUpIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex items-center justify-center">
            <div className={`text-6xl font-bold rounded-full w-32 h-32 flex items-center justify-center ${getScoreColor(analytics.weekly_summary.productivity_score)}`}>
              {analytics.weekly_summary.productivity_score}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-gray-900">{analytics.weekly_summary.tasks_completed}</div>
              <div className="text-sm text-gray-500">Tasks Completed</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{analytics.weekly_summary.commits}</div>
              <div className="text-sm text-gray-500">GitHub Commits</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.productivity.total_tasks}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.productivity.completion_rate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Commits</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.productivity.total_commits}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Daily Avg Commits</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.productivity.avg_daily_commits}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Productivity Trends</h2>
            <p className="text-sm text-gray-600">Weekly productivity score over time</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.trends.map((week, index) => (
                <div key={week.week_start} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-900">
                      Week of {formatDate(week.week_start)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{week.tasks_completed} tasks</span>
                      <span>•</span>
                      <span>{week.commits} commits</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(week.productivity_score)}`}>
                    {week.productivity_score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">This Week's Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tasks Created</span>
                  <span className="text-lg font-semibold text-gray-900">{analytics.weekly_summary.tasks_created}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tasks Completed</span>
                  <span className="text-lg font-semibold text-green-600">{analytics.weekly_summary.tasks_completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GitHub Commits</span>
                  <span className="text-lg font-semibold text-purple-600">{analytics.weekly_summary.commits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Projects</span>
                  <span className="text-lg font-semibold text-blue-600">{analytics.weekly_summary.active_projects}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Insights</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 mt-1" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-900">Great Progress!</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        You've completed {analytics.weekly_summary.tasks_completed} tasks this week, 
                        which is above your average.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="w-5 h-5 text-green-600 mt-1" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-900">Consistent Activity</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your productivity score has been steadily improving over the past 4 weeks.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="w-5 h-5 text-yellow-600 mt-1" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-900">Room for Improvement</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Consider breaking down large tasks into smaller, manageable pieces.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default withAuth(AnalyticsPage)