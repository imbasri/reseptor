import { createLineJsonStream, getOllamaHost, getSelectedModel } from '../../../../lib/ollama'
export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
    const { messages=[] } = await req.json()
    const sys = { 
      role: 'system', 
      content: 'Kamu adalah asisten kuliner AI yang ahli. Jawab dengan cepat, praktis, dan mudah dipahami. Format jawaban secara rapi dengan list bernomor (1., 2., 3.) untuk langkah-langkah dan bullet points (-) untuk daftar bahan. Gunakan bahasa Indonesia yang santai tapi informatif. Berikan tips bonus jika relevan.' 
    }
    const payload = Array.isArray(messages) && messages[0]?.role === 'system' ? messages : [sys, ...messages]
    const ollama = getOllamaHost()
    const model = await getSelectedModel(req)
    
    const upstream = await fetch(`${ollama}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ 
        model, 
        messages: payload, 
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          num_predict: 2048,
          stop: ["Human:", "Assistant:", "\n\nHuman:", "\n\nAssistant:"]
        }
      })
    })
    
    if(!upstream.ok){
      const t = await upstream.text()
      return new Response(t || 'ollama error', { status: 500 })
    }
    
    const stream = createLineJsonStream(upstream, (obj)=> obj.message?.content ?? obj.response ?? '')
    return new Response(stream, { 
      headers: { 
        'Content-Type':'text/plain; charset=utf-8', 
        'Cache-Control':'no-store',
        'X-Accel-Buffering': 'no', // Disable nginx buffering for faster streaming
        'Connection': 'keep-alive'
      } 
    })
  }catch(e){
    console.error('Chat stream error:', e)
    return new Response(e.message, { status: 500 })
  }
}
