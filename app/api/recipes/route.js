export const dynamic = 'force-dynamic'

export async function POST(req){
  try{
  const { ingredients='', diet='', allergies='', time='30', servings='2', query='' } = await req.json()
  const ollama = process.env.OLLAMA_HOST || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'granite3.2-vision:2b'
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
  const r = await fetch(`${ollama}/api/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: model, prompt, stream:false }) })
    if(!r.ok){ return Response.json({ error: await r.text() }, { status: 500 }) }
    const data = await r.json()
    return Response.json({ output: data.response })
  }catch(e){ return Response.json({ error: e.message }, { status: 500 }) }
}
