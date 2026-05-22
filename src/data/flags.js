import { supabase } from '../lib/supabase'

export async function reportFlag({ type, targetId, targetName, reason, details, userId }) {
  const { error } = await supabase.from('flags').insert({
    type,
    target_id: targetId,
    target_name: targetName,
    reason,
    details,
    flagged_by: userId,
  })

  if (!error) {
    // Fire and forget — don't block UI on email
    fetch('/api/send-flag-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetName,
        targetId,
        reason,
        details,
        flaggedBy: userId
      })
    }).catch(() => {}) // silent fail — Supabase insert already succeeded
  }

  return { error }
}
