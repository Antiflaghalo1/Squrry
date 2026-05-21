import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfileMenu({ user, onSignOut, onClose }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count: c }) => setCount(c ?? 0))
  }, [user.id])

  return (
    <div className="profile-backdrop" onClick={onClose}>
      <div className="profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="profile-sheet-handle" />
        <p className="profile-email">{user.email}</p>
        <div className="profile-stat">
          <span className="profile-stat-num">{count ?? '—'}</span>
          <span className="profile-stat-label">My Submissions</span>
        </div>
        <button className="profile-signout-btn" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
