export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { targetName, targetId, reason, details, flaggedBy } = req.body

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'BasketSplit Flags <onboarding@resend.dev>',
      to: ['gregory.a.castellanos@gmail.com'],
      subject: `🚩 New Flag: ${reason} — ${targetName}`,
      html: `
        <h2>New Problem Report</h2>
        <table>
          <tr><td><strong>Product:</strong></td><td>${targetName}</td></tr>
          <tr><td><strong>Barcode:</strong></td><td>${targetId}</td></tr>
          <tr><td><strong>Reason:</strong></td><td>${reason}</td></tr>
          <tr><td><strong>Details:</strong></td><td>${details || 'None provided'}</td></tr>
          <tr><td><strong>Flagged by:</strong></td><td>${flaggedBy || 'Unknown'}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${new Date().toLocaleString()}</td></tr>
        </table>
        <p><a href="https://supabase.com/dashboard/project/ljqlmlpvasmfrixjoyxb/editor">
          View in Supabase →
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
