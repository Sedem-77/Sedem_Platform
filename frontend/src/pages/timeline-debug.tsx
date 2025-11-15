import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { api, endpoints } from '../utils/api'

const TimelinePage: NextPage = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timelineData, setTimelineData] = useState<any>(null)

  useEffect(() => {
    fetchTimelineData()
  }, [])

  const fetchTimelineData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Test the API call
      const response = await api.get(`${endpoints.timeline.activities}`)
      
      if (response.success) {
        setTimelineData(response.data)
      } else {
        setError(response.error || 'Failed to load timeline data')
      }
    } catch (error) {
      console.error('Timeline error:', error)
      setError('Failed to load timeline data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={fetchTimelineData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
          <p className="text-sm text-gray-500 mt-4">
            API Endpoint: {endpoints.timeline.activities}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Activity Timeline - Sedem</title>
        <meta name="description" content="Unified timeline of all your activities" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600 mr-3" />
            Activity Timeline
          </h1>
          <p className="mt-2 text-gray-600">
            Complete chronological view of your productivity activities
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {timelineData?.activities?.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium mb-4">
                Found {timelineData.activities.length} activities
              </h3>
              <div className="space-y-4">
                {timelineData.activities.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="border-b pb-4">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Yet</h3>
              <p className="text-gray-500">
                Start creating projects and tasks to see your timeline.
              </p>
            </div>
          )}
        </div>

        {/* Debug info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h4 className="font-medium mb-2">Debug Information:</h4>
          <pre className="text-xs text-gray-700 overflow-auto">
            {JSON.stringify(timelineData, null, 2)}
          </pre>
        </div>
      </div>
    </>
  )
}

export default withAuth(TimelinePage)