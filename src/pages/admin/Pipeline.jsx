import React from 'react'
import MatchPipelineView from '../../component/MatchPipelineView'
import { useAuth } from '../../hooks/useAuth'

/**
 * Admin oversight of the match acceptance pipeline (database/match_.sql).
 * Shows every accepted match across tenant -> agent -> landlord -> admin and
 * exposes the admin sign-off that unlocks scheduling.
 */
export default function Pipeline() {
  const { user } = useAuth()
  return (
    <div className="w-full">
      <MatchPipelineView role="admin" currentUserId={user?.id} theme="light" />
    </div>
  )
}
