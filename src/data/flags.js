import { supabase } from '../lib/supabase'

export async function reportFlag({ type, targetId, targetName, reason, details, userId }) {
  return supabase.from('flags').insert({
    type,
    target_id: targetId,
    target_name: targetName,
    reason,
    details,
    flagged_by: userId,
  })
}
