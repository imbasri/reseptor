import { createLineJsonStream, getOllamaHost, getOllamaModel } from '../../../../lib/ollama'
export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
  const { ingredients='', diet='', allergies='', time='30', servings='2', query='' } = await req.json()
  const ollama = getOllamaHost()
  const model = getOllamaModel()
  const q = (query||'').trim()
  const prompt = `Anda adalah asisten resep.
Bahan pantry (prioritas, jangan menambahkan bahan di luar ini kecuali bumbu dasar umum): ${ingredients}.
Preferensi diet: ${diet}. Alergi: ${allergies}. Waktu masak maksimal: ${time} menit. Porsi: ${servings}.
${q? `Kata kunci pencarian: "${q}". WAJIB relevan dengan kata kunci ini. Judul resep harus memuat kata kunci atau padanan sangat dekatnya. Jika tidak mungkin, berikan 1 alternatif terdekat yang masih relevan, jelaskan alasannya singkat.`:''}
Format jawaban:
Judul Resep
1. Bahan (list bernomor, gunakan bahan pantry yang tersedia)
2. Langkah Masak (list bernomor, ringkas)
3. Estimasi Kalori per Porsi
4. Tips Singkat
Berikan ${q? '1–2':'2–3'} resep. Hindari hasil yang tidak relevan.
Pisahkan setiap resep dengan satu baris kosong dan JANGAN menomori judul resep.`
  const upstream = await fetch(`${ollama}/api/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: model, prompt, stream:true }) })
    if(!upstream.ok){ return new Response(await upstream.text(), { status: 500 }) }
  const stream = createLineJsonStream(upstream, (obj)=> obj.response ?? '')
    return new Response(stream, { headers:{ 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' } })
  }catch(e){ return new Response(e.message, { status: 500 }) }
}
