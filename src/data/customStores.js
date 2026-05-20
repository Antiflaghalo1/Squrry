const KEY = 'basketsplit_custom_stores'

export function getCustomStores() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function addCustomStore(store) {
  try {
    const prev = getCustomStores()
    localStorage.setItem(KEY, JSON.stringify([...prev, store]))
  } catch {}
}
