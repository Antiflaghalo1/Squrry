import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditProfileView({ user, firstName, lastName, onBack, onSave }) {
  const [newFirst, setNewFirst] = useState(firstName || '')
  const [newLast, setNewLast] = useState(lastName || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // 'saved' | error string | null

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: newFirst.trim() || null,
        last_name: newLast.trim() || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setStatus(error.message || 'Something went wrong.')
      return
    }
    onSave(newFirst.trim(), newLast.trim())
    setStatus('saved')
    setTimeout(() => {
      setStatus(null)
      onBack()
    }, 1000)
  }

  return (
    <div className="edit-profile-view">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="edit-profile-title">Edit Profile</h2>

      <label className="edit-profile-label">First Name</label>
      <input
        className="scan-input edit-profile-input"
        type="text"
        value={newFirst}
        onChange={e => setNewFirst(e.target.value)}
        placeholder="First name"
      />

      <label className="edit-profile-label">Last Name</label>
      <input
        className="scan-input edit-profile-input"
        type="text"
        value={newLast}
        onChange={e => setNewLast(e.target.value)}
        placeholder="Last name"
      />

      <button className="cta-btn edit-profile-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : status === 'saved' ? 'Saved! ✓' : 'Save Changes →'}
      </button>

      {status && status !== 'saved' && (
        <p className="edit-profile-error">{status}</p>
      )}
    </div>
  )
}
