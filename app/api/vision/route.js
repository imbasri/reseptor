export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
    const { image } = await req.json()
    const base64 = image.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
    const ollama = process.env.OLLAMA_HOST || 'http://localhost:11434'
    const prompt = `Analisis gambar bahan dapur/kulkas. Sebutkan daftar bahan makanan yang terlihat dengan kuantitas kira-kira. Balas hanya JSON array: [{"name":"...","quantity":"..."}] tanpa komentar.`
    const r = await fetch(`${ollama}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ model: 'granite3.2-vision:2b', prompt, images: [base64], stream: false })
    })
    if(!r.ok){
      const t = await r.text()
      return Response.json({ error: 'ollama error', details: t }, { status: 500 })
    }
    const data = await r.json()
    return Response.json({ output: data.response })
  }catch(e){
    return Response.json({ error: e.message }, { status: 500 })
  }
}
