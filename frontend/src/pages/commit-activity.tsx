import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { 
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  CalendarDaysIcon,
  CodeBracketIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { api, endpoints, type CommitHeatmapData, type CommitTrends, type CodingAchievements, type LanguageStats } from '../utils/api'

const CommitActivityPage: NextPage = () => {
  const [heatmapData, setHeatmapData] = useState<CommitHeatmapData | null>(null)
  const [trendsData, setTrendsData] = useState<CommitTrends | null>(null)
  const [achievementsData, setAchievementsData] = useState<CodingAchievements | null>(null)
  const [languageStats, setLanguageStats] = useState<LanguageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('weekly')
  const [selectedDays, setSelectedDays] = useState(90)

  useEffect(() => {
    fetchCommitData()
  }, [selectedPeriod, selectedDays])

  const fetchCommitData = async () => {
    try {
      setLoading(true)
      
      const [heatmap, trends, achievements, languages] = await Promise.all([
        api.get<CommitHeatmapData>(`${endpoints.commits.heatmap}?days=365`),
        api.get<CommitTrends>(`${endpoints.commits.trends}?period=${selectedPeriod}&days=${selectedDays}`),
        api.get<CodingAchievements>(endpoints.commits.achievements),
        api.get<LanguageStats>(`${endpoints.commits.languages}?days=${selectedDays}`)
      ])

      if (heatmap.success && heatmap.data) {
        setHeatmapData(heatmap.data)
      }

      if (trends.success && trends.data) {
        setTrendsData(trends.data)
      }

      if (achievements.success && achievements.data) {
        setAchievementsData(achievements.data)
      }

      if (languages.success && languages.data) {
        setLanguageStats(languages.data)
      }
    } catch (error) {
      console.log('Error fetching commit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHeatmapColor = (level: number) => {
    const colors = [
      'bg-gray-100', // 0 commits
      'bg-green-200', // 1-2 commits  
      'bg-green-300', // 3-4 commits
      'bg-green-400', // 5-6 commits
      'bg-green-500'  // 7+ commits
    ]
    return colors[Math.min(level, 4)]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short' 
    })
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
        <meta name="description" content="Track your coding activity and productivity" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
            Commit Activity Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Track your coding productivity and development patterns
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                      {heatmapData?.total_commits || 0}
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
                      {heatmapData?.streak_data?.current_streak || 0} days
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
                  <TrophyIcon className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Longest Streak
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {heatmapData?.streak_data?.longest_streak || 0} days
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
                      Avg Daily Commits
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {trendsData?.summary?.avg_commits_per_day || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commit Heatmap */}
        {heatmapData && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
              Commit Activity Heatmap
            </h3>
            
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid grid-cols-53 gap-1 text-xs">
                  {/* Month labels */}
                  <div className="col-span-53 grid grid-cols-53 gap-1 mb-2">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div key={i} className="col-span-4 text-gray-500">
                        {formatMonth(new Date(2024, i, 1).toISOString())}
                      </div>
                    ))}
                  </div>
                  
                  {/* Heatmap squares */}
                  {heatmapData.heatmap_data.map((day, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.level)} border border-gray-200`}
                      title={`${day.commits} commits on ${formatDate(day.date)}`}
                    />
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-end mt-4 text-xs text-gray-500">
                  <span className="mr-2">Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-sm ${getHeatmapColor(level)} border border-gray-200 mx-1`}
                    />
                  ))}
                  <span className="ml-2">More</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends and Achievements Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Commit Trends */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Commit Trends
              </h3>
              <div className="flex space-x-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            </div>
            
            {trendsData && trendsData.trends.length > 0 ? (
              <div className="space-y-3">
                {/* Simple bar chart visualization */}
                <div className="space-y-2">
                  {trendsData.trends.slice(-10).map((trend, index) => {
                    const maxCommits = Math.max(...trendsData.trends.map(t => t.commits))
                    const barWidth = maxCommits > 0 ? (trend.commits / maxCommits) * 100 : 0
                    
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-16 text-xs text-gray-500">
                          {formatDate(trend.period)}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div 
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(barWidth, 8)}%` }}
                          >
                            <span className="text-white text-xs font-medium">
                              {trend.commits}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No commit data available for the selected period
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Coding Achievements
            </h3>
            
            {achievementsData ? (
              <div className="space-y-4">
                {/* Progress bars for next milestones */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Commits Progress</span>
                      <span>{achievementsData.milestones.total_commits}/{achievementsData.milestones.next_commit_milestone}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(achievementsData.milestones.commit_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Lines of Code Progress</span>
                      <span>{achievementsData.milestones.total_additions.toLocaleString()}/{achievementsData.milestones.next_loc_milestone.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(achievementsData.milestones.loc_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recent achievements */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Achievements</h4>
                  <div className="space-y-2">
                    {achievementsData.achievements.slice(-5).map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <span className="text-lg">{achievement.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{achievement.title}</div>
                          <div className="text-xs text-gray-500">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No achievements data available
              </div>
            )}
          </div>
        </div>

        {/* Repository Activity */}
        {languageStats && languageStats.language_stats.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Repository Activity
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Repository
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Additions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deletions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {languageStats.language_stats.map((repo, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {repo.repository}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {repo.commits}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        +{repo.additions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        -{repo.deletions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {repo.net_changes >= 0 ? '+' : ''}{repo.net_changes.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default withAuth(CommitActivityPage)