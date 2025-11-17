import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'

const TimelinePage: NextPage = () => {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication safely
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    setIsAuthenticated(!!token)
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Timeline Access</h1>
        <p>Please log in to view your timeline</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Activity Timeline - Sedem</title>
      </Head>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Activity Timeline</h1>
        <p>Timeline page with proper Next.js structure</p>
      </div>
    </>
  )
}

export default TimelinePage