import React from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { withAuth } from '../hooks/useAuth'
import { ClockIcon } from '@heroicons/react/24/outline'

const TimelineTestPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Timeline Test - Sedem</title>
        <meta name="description" content="Timeline test page" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600 mr-3" />
            Timeline Test
          </h1>
          <p className="mt-2 text-gray-600">
            Simple test page to verify timeline functionality
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-800">
            Timeline page is loading successfully. This confirms the basic setup is working.
          </p>
        </div>
      </div>
    </>
  )
}

export default withAuth(TimelineTestPage)