import { supabase } from '../lib/supabase'

const KEY = 'squrry_custom_stores'

const oldStores = localStorage.getItem('basketsplit_custom_stores')
if (oldStores) {
  localStorage.setItem('squrry_custom_stores', oldStores)
  localStorage.removeItem('basketsplit_custom_stores')
}

export function getCustomStores() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export async function addCustomStore(store) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('store_candidates').insert({
    name: store.name,
    address: store.address ?? null,
    city: store.location ?? null,
    state: 'CA',
    lat: store.lat ?? null,
    lng: store.lng ?? null,
    store_type: null,
    source: 'user_submitted',
    status: 'candidate',
    submitted_by: user?.id ?? null,
    notes: store.notes ?? null,
  })
  if (error) {
    console.error('[customStores] store_candidates insert failed:', error)
    return
  }
  fetch('/api/send-store-candidate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: store.name,
      address: store.address ?? null,
      city: store.location ?? null,
      lat: store.lat ?? null,
      lng: store.lng ?? null,
      submittedBy: user?.id ?? null,
    }),
  }).catch(() => {})
}
