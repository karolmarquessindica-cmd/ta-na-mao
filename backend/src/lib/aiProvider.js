export function aiProviderName() {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash'
}

export async function askExternalAI({ system, messages, maxTokens = 1100 }) {
  const envName = ['GEMINI', 'API', 'KEY'].join('_')
  const key = process.env[envName]
  if (!key) return null

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const base = ['https://generativelanguage.googleapis.com', 'v1beta', 'models'].join('/')
  const endpoint = `${base}/${model}:generateContent?key=${key}`

  const contents = [
    { role: 'user', parts: [{ text: system }] },
    ...(messages || []).map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })),
  ]

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Falha no provedor IA: ${response.status} ${body.slice(0, 180)}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('\n').trim() || null
}
