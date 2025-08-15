import { extractFirstJson, getOllamaHost, getOllamaModel } from '../../../lib/ollama'
export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
    const { budget='300000', goal='' } = await req.json()
  const ollama = getOllamaHost()
  const model = getOllamaModel()
    const prompt = `Buat planner makan 7 hari (sarapan, makan siang, makan malam) untuk keluarga 3-4 orang. Tujuan diet: ${goal}. Budget total: Rp ${budget} per minggu.
Kembalikan HANYA JSON valid di dalam satu blok code-fence json:
\n\n\u0060\u0060\u0060json
{ "schedule": { "Senin":["..."],"Selasa":["..."],"Rabu":[],"Kamis":[],"Jumat":[],"Sabtu":[],"Minggu":[] },
  "shopping": [{"item":"...","qty":"..."}],
  "budget": ${Number(budget)||budget},
  "goal": "${goal}"
}
\u0060\u0060\u0060
\n\nPastikan ekonomis, bergizi seimbang, dan bahan mudah didapat.`
  const r = await fetch(`${ollama}/api/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: model, prompt, stream:false }) })
    if(!r.ok){ return Response.json({ error: await r.text() }, { status: 500 }) }
    const data = await r.json()
  const text = data.response || ''
    let parsed = extractFirstJson(text)

    // Retry once with stricter instruction if parse failed
    if(!parsed){
      const retryPrompt = `${prompt}\n\nUlangi output: HANYA blok kode JSON valid tanpa teks lain.`
  const r2 = await fetch(`${ollama}/api/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: model, prompt: retryPrompt, stream:false }) })
      if(r2.ok){
        const d2 = await r2.json()
        parsed = extractFirstJson(d2.response||'')
      }
    }

    if(parsed){
      const schedule = parsed?.schedule || {}
      const shopping = parsed?.shopping || []
      const plan = { schedule, shopping, budget: parsed?.budget ?? (Number(budget)||budget), goal: parsed?.goal ?? goal }
      return Response.json({ plan, shopping })
    }

    // Safe fallback if still failing
    const plan = {
      schedule: {
        'Senin': ['Sarapan: Oat + buah', 'Siang: Nasi + sayur + telur', 'Malam: Sup sayur']
      },
      shopping: [ { item: 'Sayur campur', qty: '1 kg' }, { item: 'Telur', qty: '10 butir' } ],
      budget: Number(budget)||budget,
      goal
    }
    return Response.json({ plan, shopping: plan.shopping, warning: 'AI tidak mengembalikan JSON yang valid; memakai fallback minimal.' })
  }catch(e){ return Response.json({ error: e.message }, { status: 500 }) }
}
