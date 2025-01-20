import { Suspense } from 'react'
import GameClient from './game-client'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-lg text-gray-600">Loading game...</p>
      </div>
    </div>
  )
}

export default function GamePage({
  params,
}: {
  params: { id: string }
}) {
  console.log('GamePage rendering with params:', params)

  if (!params.id) {
    console.error('No game ID provided in params')
    return <div>Game not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingScreen />}>
        <GameClient id={params.id} />
      </Suspense>
    </div>
  )
} 