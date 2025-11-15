import React, { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { withAuth } from '../hooks/useAuth'
import { 
  PlusIcon,
  BeakerIcon,
  CpuChipIcon,
  ChartBarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import { api, endpoints } from '../utils/api'

const SampleDataPage: NextPage = () => {
  const [loading, setLoading] = useState(false)

  const sampleProjects = [
    {
      title: "Machine Learning Research",
      description: "Exploring neural networks for predictive modeling in climate science",
      abstract: "This research investigates the application of deep learning techniques to improve weather prediction accuracy using satellite data and atmospheric measurements.",
      category: "Data Science",
      keywords: ["machine learning", "climate science", "neural networks", "python"],
      tags: ["research", "ML", "climate"],
      priority: "high"
    },
    {
      title: "Social Media Analytics",
      description: "Analyzing user behavior patterns on social platforms",
      abstract: "A comprehensive study of user engagement metrics and sentiment analysis across multiple social media platforms to understand digital communication trends.",
      category: "Analytics",
      keywords: ["social media", "analytics", "sentiment analysis", "data mining"],
      tags: ["social", "analytics", "behavior"],
      priority: "medium"
    },
    {
      title: "Blockchain Security Analysis",
      description: "Investigating security vulnerabilities in smart contracts",
      abstract: "This project examines common security flaws in Ethereum smart contracts and proposes novel detection mechanisms using static analysis tools.",
      category: "Security",
      keywords: ["blockchain", "security", "smart contracts", "ethereum"],
      tags: ["security", "blockchain", "crypto"],
      priority: "high"
    }
  ]

  const sampleTasks = [
    {
      title: "Literature Review - Neural Networks",
      description: "Review recent papers on CNN architectures for time series prediction",
      priority: "high",
      estimated_hours: 8
    },
    {
      title: "Data Collection Setup",
      description: "Set up automated weather data collection from NOAA APIs",
      priority: "medium", 
      estimated_hours: 4
    },
    {
      title: "Baseline Model Implementation",
      description: "Implement LSTM baseline model for weather prediction",
      priority: "high",
      estimated_hours: 12
    },
    {
      title: "Social Media API Integration", 
      description: "Connect to Twitter and Facebook APIs for data collection",
      priority: "medium",
      estimated_hours: 6
    },
    {
      title: "Smart Contract Audit Tool",
      description: "Develop automated tool for detecting reentrancy vulnerabilities",
      priority: "high",
      estimated_hours: 16
    }
  ]

  const createSampleData = async () => {
    try {
      setLoading(true)
      
      // Create projects
      const createdProjects = []
      for (const project of sampleProjects) {
        const response = await api.post(endpoints.projects.create, project)
        if (response.success && response.data) {
          createdProjects.push(response.data)
        }
      }

      // Create tasks and link to projects
      let taskIndex = 0
      for (const project of createdProjects) {
        // Create 1-2 tasks per project
        const projectTasks = taskIndex === 0 ? sampleTasks.slice(0, 3) : 
                           taskIndex === 1 ? sampleTasks.slice(3, 4) : 
                           sampleTasks.slice(4, 5)
        
        for (const task of projectTasks) {
          await api.post(endpoints.tasks.create, {
            ...task,
            project_id: (project as any).id
          })
        }
        taskIndex++
      }

      toast.success(`Created ${createdProjects.length} projects and ${sampleTasks.length} tasks!`)
      
    } catch (error) {
      console.error('Error creating sample data:', error)
      toast.error('Failed to create sample data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Setup Sample Data - Sedem</title>
        <meta name="description" content="Initialize your platform with sample research data" />
      </Head>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <BeakerIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Let's Get Your Platform Started! 
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create sample research projects and tasks to see all the features in action
          </p>
        </div>

        {/* Sample Data Preview */}
        <div className="bg-white shadow rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🎯 What We'll Create For You
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {sampleProjects.map((project, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  {index === 0 ? <CpuChipIcon className="h-6 w-6 text-blue-500 mr-2" /> :
                   index === 1 ? <ChartBarIcon className="h-6 w-6 text-green-500 mr-2" /> :
                   <AcademicCapIcon className="h-6 w-6 text-purple-500 mr-2" />}
                  <h3 className="font-semibold text-gray-900">{project.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                <div className="flex flex-wrap gap-1">
                  {project.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">✨ This will create:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>• <strong>3 Research Projects</strong> - Machine Learning, Social Analytics, Blockchain Security</li>
              <li>• <strong>5 Research Tasks</strong> - Literature reviews, implementations, data collection</li>
              <li>• <strong>Project Categories</strong> - Data Science, Analytics, Security</li>
              <li>• <strong>Keywords & Tags</strong> - Organized with proper metadata</li>
              <li>• <strong>Priority Levels</strong> - High, medium priority assignments</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={createSampleData}
            disabled={loading}
            className="inline-flex items-center px-8 py-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Creating Sample Data...
              </>
            ) : (
              <>
                <PlusIcon className="h-6 w-6 mr-3" />
                Create Sample Research Projects
              </>
            )}
          </button>
          
          <p className="mt-4 text-sm text-gray-500">
            This will populate your platform with realistic research data so you can explore all features
          </p>
        </div>

        {/* Next Steps */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🚀 After Creating Sample Data:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to <strong>Projects</strong> to see your research projects</li>
            <li>Visit <strong>Tasks</strong> to view and manage your research tasks</li>
            <li>Check <strong>Analytics</strong> to see productivity insights</li>
            <li>Try <strong>GitHub Integration</strong> to sync your repositories</li>
            <li>Explore <strong>Commit Activity</strong> to see your coding patterns</li>
          </ol>
        </div>
      </div>
    </>
  )
}

export default withAuth(SampleDataPage)