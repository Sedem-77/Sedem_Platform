import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { withAuth } from '../hooks/useAuth'
import { 
  LinkIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  StarIcon,
  EyeIcon,
  CalendarIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'
import { api, endpoints, type GitHubRepository, type Project } from '../utils/api'

const GitHubPage: NextPage = () => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [linkingRepo, setLinkingRepo] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch repositories and projects in parallel
      const [reposResponse, projectsResponse] = await Promise.all([
        api.get<{ repositories: GitHubRepository[] }>(endpoints.github.repositories),
        api.get<Project[]>(endpoints.projects.list)
      ])

      if (reposResponse.success && reposResponse.data) {
        setRepositories(reposResponse.data.repositories)
      }

      if (projectsResponse.success && projectsResponse.data) {
        setProjects(projectsResponse.data)
      }
    } catch (error) {
      console.log('Error fetching GitHub data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await api.post(endpoints.github.sync)
      
      if (response.success) {
        toast.success('Repositories synced successfully!')
        await fetchData() // Refresh the data
      } else {
        toast.error(response.error || 'Failed to sync repositories')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Error syncing repositories')
    } finally {
      setSyncing(false)
    }
  }

  const handleLinkToProject = async (repoId: number, projectId: number) => {
    try {
      setLinkingRepo(repoId)
      const response = await api.post(`${endpoints.github.link(repoId)}?project_id=${projectId}`)
      
      if (response.success) {
        toast.success('Repository linked to project!')
        await fetchData() // Refresh the data
      } else {
        toast.error(response.error || 'Failed to link repository')
      }
    } catch (error) {
      console.error('Link error:', error)
      toast.error('Error linking repository')
    } finally {
      setLinkingRepo(null)
    }
  }

  const getProjectName = (projectId: number | undefined) => {
    if (!projectId) return 'Not linked'
    const project = projects.find(p => p.id === projectId)
    return project?.title || 'Unknown project'
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
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
        <title>GitHub Integration - Sedem</title>
        <meta name="description" content="Manage GitHub repository integration" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CodeBracketIcon className="h-8 w-8 text-gray-900 mr-3" />
                GitHub Integration
              </h1>
              <p className="mt-2 text-gray-600">
                Sync and manage your GitHub repositories
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Repositories'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CodeBracketIcon className="h-8 w-8 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Repositories
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {repositories.length}
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
                  <LinkIcon className="h-8 w-8 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Linked to Projects
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {repositories.filter(r => r.project_id).length}
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
                      Last Activity
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {repositories.length > 0 
                        ? formatDate(repositories
                            .filter(r => r.last_push_date)
                            .sort((a, b) => new Date(b.last_push_date!).getTime() - new Date(a.last_push_date!).getTime())[0]?.last_push_date)
                        : 'No activity'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Repository List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Repositories
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage your GitHub repositories and link them to projects
            </p>
          </div>
          
          {repositories.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Click "Sync Repositories" to import your GitHub repositories.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {repositories.map((repo) => (
                <li key={repo.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <CommandLineIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1 ml-4">
                        <div className="flex items-center">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 truncate"
                          >
                            {repo.full_name}
                          </a>
                          {repo.is_private && (
                            <EyeIcon className="h-4 w-4 text-gray-400 ml-2" />
                          )}
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <span>{repo.language || 'Unknown language'}</span>
                          {repo.stars_count !== undefined && (
                            <>
                              <span className="mx-2">•</span>
                              <StarIcon className="h-4 w-4 mr-1" />
                              <span>{repo.stars_count}</span>
                            </>
                          )}
                          <span className="mx-2">•</span>
                          <span>Updated {formatDate(repo.last_push_date)}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Project: <span className="font-medium">{getProjectName(repo.project_id)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={repo.project_id || ''}
                        onChange={(e) => {
                          const projectId = parseInt(e.target.value)
                          if (projectId) {
                            handleLinkToProject(repo.id, projectId)
                          }
                        }}
                        disabled={linkingRepo === repo.id}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Link to project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                      {linkingRepo === repo.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

export default withAuth(GitHubPage)