export function geminiModelName() {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash'
}

export function aiProviderName() {
  return geminiModelName()
}

function apiKey() {
  const envName = ['GEMINI', 'API', 'KEY'].join('_')
  return process.env[envName]
}

function endpoint() {
  const model = geminiModelName()
  const base = ['https://generativelanguage.googleapis.com', 'v1beta', 'models'].join('/')
  return `${base}/${model}:generateContent?key=${apiKey()}`
}

async function postToProvider(body) {
  if (!apiKey()) return null
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Falha no provedor IA: ${response.status} ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('\n').trim() || null
}

export async function askExternalAI({ system, messages, maxTokens = 1100 }) {
  if (!apiKey()) return null

  const contents = [
    { role: 'user', parts: [{ text: system }] },
    ...(messages || []).map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })),
  ]

  return postToProvider({
    contents,
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
  })
}

export async function extractPdfTextWithAI({ buffer, fileName = 'documento.pdf' }) {
  if (!apiKey() || !buffer) return null
  const base64 = Buffer.from(buffer).toString('base64')
  const prompt = [
    'Extraia o texto deste PDF em portugues do Brasil.',
    'Mantenha regras, artigos, horarios, valores, datas e topicos importantes.',
    'Nao resuma demais. Retorne o maximo de texto util possivel para consulta posterior.',
    `Arquivo: ${fileName}`,
  ].join('\n')

  return postToProvider({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 8192 },
  })
}
