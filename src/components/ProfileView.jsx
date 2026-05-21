import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfileView({ user, onSignOut, onMyScans }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count: c }) => setCount(c ?? 0))
  }, [user.id])

  return (
    <div className="profile-view">
      <p className="profile-email profile-view-email">{user.email}</p>
      <div className="profile-stat">
        <span className="profile-stat-num">{count ?? '—'}</span>
        <span className="profile-stat-label">My Submissions</span>
      </div>
      <button className="drawer-menu-row" onClick={onMyScans}>📦 My Recent Scans →</button>
      <button className="profile-signout-btn profile-view-signout" onClick={onSignOut}>
        Sign Out
      </button>
    </div>
  )
}
