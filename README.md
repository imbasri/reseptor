# Reseptor (Next.js + Ollama Granite)

Asisten masak & gizi lokal tanpa login. Fitur: kelola bahan (pantry), resep dinamis, planner mingguan, daftar belanja, statistik, dan chatbot Granite AI.

## Prasyarat
- Node.js 18+
- Ollama terpasang dan model `granite3.2-vision:2b` sudah di-pull
- Windows PowerShell (perintah di bawah sesuai PowerShell)

## Setup
```powershell
# install deps
npm install

# jalankan dev server
npm run dev
```
Aplikasi: http://localhost:3000

Jika Ollama bukan default localhost:11434, set variabel:
```powershell
$env:OLLAMA_HOST = "http://127.0.0.1:11434"; npm run dev
```

## Menggunakan
- Resep AI: /recipes
- Planner & belanja: /planner (export PDF & kirim WA)
- Statistik: /stats
- Chatbot: /chat

Semua data disimpan di localStorage jika tidak ada penyimpanan lain.

## Catatan
- Model Granite dipanggil via API routes: `/api/vision`, `/api/recipes`, `/api/mealplan`, `/api/chat`.
- UI tanpa TypeScript, tampilan responsif dan dark mode.
