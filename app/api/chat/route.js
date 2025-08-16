import { getOllamaHost, getSelectedModel } from '../../../lib/ollama'

export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
  const { messages=[] } = await req.json()
  const sys = { role: 'system', content: 'Format jawaban secara rapi. Jika memberikan langkah atau daftar, gunakan list bernomor (1., 2., 3.) dan poin singkat yang mudah dibaca. Gunakan subjudul pendek jika perlu.' }
  const payload = Array.isArray(messages) && messages[0]?.role === 'system' ? messages : [sys, ...messages]
  const ollama = getOllamaHost()
  const model = await getSelectedModel(req)
    const r = await fetch(`${ollama}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
  body: JSON.stringify({ model, messages: payload, stream: false })
    })
    if(!r.ok){
      return Response.json({ error: await r.text() }, { status: 500 })
    }
    const data = await r.json()
    const last = data.message?.content || data.message || data.response || ''
    return Response.json({ output: last })
  }catch(e){
    return Response.json({ error: e.message }, { status: 500 })
  }
}
