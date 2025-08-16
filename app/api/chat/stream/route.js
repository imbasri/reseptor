import { createLineJsonStream, getOllamaHost, getSelectedModel } from '../../../../lib/ollama'
export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
  const { messages=[] } = await req.json()
  const sys = { role: 'system', content: 'Format jawaban secara rapi. Jika memberikan langkah atau daftar, gunakan list bernomor (1., 2., 3.) dan poin singkat yang mudah dibaca. Gunakan subjudul pendek jika perlu.' }
  const payload = Array.isArray(messages) && messages[0]?.role === 'system' ? messages : [sys, ...messages]
  const ollama = getOllamaHost()
  const model = await getSelectedModel(req)
    const upstream = await fetch(`${ollama}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
  body: JSON.stringify({ model, messages: payload, stream: true })
    })
    if(!upstream.ok){
      const t = await upstream.text()
      return new Response(t || 'ollama error', { status: 500 })
    }
  const stream = createLineJsonStream(upstream, (obj)=> obj.message?.content ?? obj.response ?? '')
    return new Response(stream, { headers: { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' } })
  }catch(e){
    return new Response(e.message, { status: 500 })
  }
}
