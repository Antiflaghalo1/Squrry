export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, systemPrompt } = req.body

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Missing API key' })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.3,
      system: systemPrompt,
      messages: messages
    })
  })

  if (!response.ok) {
    const err = await response.json()
    return res.status(500).json({ error: err })
  }

  const data = await response.json()
  let text = data.content?.[0]?.text || ''

  // Server-side word filter
  const banned = [
    'instacart', 'doordash', 'shipt', 'kroger app',
    'amazon fresh', 'walmart app', 'target app',
    'shit', 'fuck', 'ass', 'damn', 'crap',
    'ignore previous', 'ignore your instructions',
    'pretend you are', 'act as', 'jailbreak',
    'DAN', 'do anything now'
  ]
  const lower = text.toLowerCase()
  const hasBanned = banned.some(w => lower.includes(w.toLowerCase()))
  if (hasBanned) {
    text = "I'm your BasketSplit grocery assistant — I can only help with shopping, prices, and budgets in the Inland Empire. What can I help you find?"
  }

  return res.status(200).json({ text })
}
