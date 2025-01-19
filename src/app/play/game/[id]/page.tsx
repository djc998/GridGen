import { Suspense } from 'react'
import GameClient from './game-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: PageProps) {
  const resolvedParams = await params
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameClient id={resolvedParams.id} />
    </Suspense>
  )
} 