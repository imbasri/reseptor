import { createLineJsonStream, getOllamaHost, getSelectedModel } from '../../../../lib/ollama'
export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
  const { ingredients='', diet='', allergies='', time='30', servings='2', query='' } = await req.json()
  const ollama = getOllamaHost()
  const model = await getSelectedModel(req)
  const q = (query||'').trim()
  const prompt = `Asisten resep cepat.
Pantry: ${ingredients}.
Diet: ${diet}. Alergi: ${allergies}. Waktu: ${time}min. Porsi: ${servings}.
${q? `Kata kunci: "${q}". WAJIB relevan!`:''}

Format singkat:
JUDUL RESEP
Bahan: (list bernomor)
Langkah: (list bernomor, ringkas)
Kalori/porsi: X
Tips: singkat

${q? '1-2':'2-3'} resep. Pisah dengan 1 baris kosong. Tanpa nomor judul.`
  const upstream = await fetch(`${ollama}/api/generate`, { 
    method:'POST', 
    headers:{
      'Content-Type':'application/json'
    }, 
    body: JSON.stringify({ 
      model: model, 
      prompt, 
      stream: true,
      options: {
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        repeat_last_n: 64,
        repeat_penalty: 1.1,
        num_predict: -1,
        num_ctx: 2048,
        num_batch: 8,
        num_gpu: -1,
        main_gpu: 0,
        low_vram: false,
        numa: false,
        mirostat: 0,
        mirostat_eta: 0.1,
        mirostat_tau: 5.0,
        penalize_newline: true,
        stop: ["\n\n\n", "---", "==="]
      }
    }) 
  })
    if(!upstream.ok){ return new Response(await upstream.text(), { status: 500 }) }
  const stream = createLineJsonStream(upstream, (obj)=> obj.response ?? '')
  return new Response(stream, { 
    headers:{ 
      'Content-Type':'text/plain; charset=utf-8',
      'Cache-Control':'no-store, no-cache, must-revalidate',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    } 
  })
  }catch(e){ return new Response(e.message, { status: 500 }) }
}
