const OBS_KEY = 'basketsplit_observations'
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL

export function addObservation(obs) {
  try {
    const prev = JSON.parse(localStorage.getItem(OBS_KEY) || '[]')
    localStorage.setItem(OBS_KEY, JSON.stringify([obs, ...prev]))
  } catch {}

  fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...obs, device: navigator.userAgent }),
  }).catch(() => {})
}

export function getObservations() {
  try {
    return JSON.parse(localStorage.getItem(OBS_KEY) || '[]')
  } catch {
    return []
  }
}