'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Don't show navbar on login or signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center"
            >
              <span className="text-xl font-bold text-blue-600">GridGen</span>
            </Link>
          </div>

          <div className="flex items-center">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/dashboard"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/upload"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      Upload
                    </Link>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="text-red-600 hover:text-red-500"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/login"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 