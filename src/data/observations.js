const OBS_KEY = 'basketsplit_observations'
const WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwTmseGRgylNkJTN7j35U91GHO3NNRKIkA5lFbn3XO0vtL-4WLE9CJDQYF4MRTwYFNA-Q/exec'

export function addObservation(obs) {
  try {
    const prev = JSON.parse(localStorage.getItem(OBS_KEY) || '[]')
    localStorage.setItem(OBS_KEY, JSON.stringify([obs, ...prev]))
  } catch {}

  fetch(WEBHOOK_URL, {
    method: 'POST',
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
