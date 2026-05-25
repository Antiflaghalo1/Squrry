export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, address, city, lat, lng, submittedBy } = req.body

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' })
  }

  const locationParts = [address, city].filter(Boolean)
  const locationStr = locationParts.length ? locationParts.join(', ') : 'Not provided'
  const coordsStr = (lat != null && lng != null) ? `${lat}, ${lng}` : 'Not available'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'BasketSplit Stores <onboarding@resend.dev>',
      to: ['gregory.a.castellanos@gmail.com'],
      subject: `🏪 New Store Candidate: ${name}`,
      html: `
        <h2>New Store Candidate Submitted</h2>
        <table>
          <tr><td><strong>Store Name:</strong></td><td>${name}</td></tr>
          <tr><td><strong>Location:</strong></td><td>${locationStr}</td></tr>
          <tr><td><strong>Lat/Lng:</strong></td><td>${coordsStr}</td></tr>
          <tr><td><strong>Submitted by:</strong></td><td>${submittedBy || 'Unknown'}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${new Date().toLocaleString()}</td></tr>
        </table>
        <p>This store is pending review in the <strong>store_candidates</strong> table.</p>
        <p><a href="https://supabase.com/dashboard/project/ljqlmlpvasmfrixjoyxb/editor">
          Review in Supabase →
        </a></p>
      `
    })
  })

  if (!response.ok) {
    const err = await response.json()
    return res.status(500).json({ error: err })
  }

  return res.status(200).json({ success: true })
}
