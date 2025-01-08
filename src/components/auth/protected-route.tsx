'use client'

import { type ReactElement } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: ReactElement | ReactElement[]
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): ReactElement => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute 