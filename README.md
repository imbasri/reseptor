# 🍳 Reseptor - Asisten Masak Keluarga

**Next.js + Ollama AI** untuk asisten kuliner lokal dan privat

🍳 **Kelola pantry, temukan resep sehat, simpan resep favorit, dan kelola todolist memasak.** Semua lokal via Ollama + Granite — cepat, privat, tanpa login.

## ✨ Fitur Utama

- 🥘 **Generator Resep AI** - Buat resep berdasarkan bahan pantry dengan Ollama
- 📝 **Todolist Masak** - Checklist langkah masak dengan edit interaktif  
- 🗂️ **Manajemen Pantry** - Kelola bahan makanan dengan qty, satuan, dan kategori
- 💬 **Chat dengan Granite** - Konsultasi masak dan gizi dengan AI lokal
- 🎯 **Model Selector** - Pilih model Ollama sesuai kebutuhan dan hardware
- 🌙 **Dark/Light Mode** - UI responsif dengan tema yang bisa beralih
- 💾 **Simpan Resep** - Koleksi pribadi resep favorit tersimpan lokal
- 🔒 **100% Privat** - Semua data tersimpan di browser, tidak ada cloud

## 🚀 Prasyarat

- [Ollama](https://ollama.ai) sudah terinstall dan running
- [Node.js](https://nodejs.org) 18+ (untuk development)
- [Docker](https://docker.com) & Docker Compose (untuk deployment)
- Model Ollama minimal 1 model terinstall (misal: `granite3.3:8b`, `llama3.2:3b`)

## 📦 Setup & Installation

### Option 1: Local Development

```bash
# Clone repository
git clone https://github.com/imbasri/reseptor.git
cd reseptor

# Install dependencies
npm install

# Setup environment (optional)
cp .env.example .env.local

# Pastikan Ollama running dan pull model
ollama pull granite3.3:8b

# Start development server
npm run dev
```

Akses aplikasi di: `http://localhost:3000`

### Option 2: Docker Deployment

**Quick Start** - Auto-download `granite3.3:8b` model:

```powershell
# Windows PowerShell
.\scripts\start.ps1
```

```bash
# Linux/macOS
./scripts/start.sh
```

**Manual Setup:**
```bash
# Pull model yang diinginkan
ollama pull granite3.3:8b
# atau model lain: llama3.2:3b, codestral:latest

# Start services
docker-compose up -d
```

## ⚙️ Konfigurasi

### Environment Variables (Optional)

`.env.local`:
```bash
# Ollama host (default: http://localhost:11434)
OLLAMA_HOST=http://localhost:11434

# Default model (aplikasi akan auto-detect jika kosong)
# OLLAMA_MODEL=granite3.3:8b
```

### Custom Ollama Host

Jika Ollama berjalan di host/port berbeda:
```bash
# Local development
OLLAMA_HOST=http://192.168.1.100:11434

# Docker environment
OLLAMA_HOST=http://host.docker.internal:11434
```

## 🎯 Manajemen Model

### Model Selection UI

- **Auto-Detection**: Aplikasi otomatis mendeteksi model Ollama yang tersedia
- **Manual Selection**: Gunakan Model Selector di navbar untuk memilih model
- **Persistent Choice**: Pilihan tersimpan di localStorage browser
- **Real-time Switch**: Ganti model kapan saja tanpa restart aplikasi

### Prioritas Model (Auto-Selection)

1. **Vision Models**: `llava:*`, `llama3.2-vision:*` (untuk fitur deteksi makanan)
2. **Granite Series**: `granite3.3:*`, `granite3.1:*` (optimal untuk resep)
3. **Llama Series**: `llama3.2:*`, `llama3.1:*` (general purpose)
4. **Lainnya**: Model compatible lainnya

### Cara Menggunakan Model Selector

1. Buka aplikasi dan klik icon **Settings** di navbar
2. Pilih model dari daftar yang tersedia
3. Klik **Refresh Models** untuk update daftar model terbaru
4. Model terpilih otomatis tersimpan dan digunakan untuk semua fitur AI

## 🏗️ Struktur Aplikasi

```
📁 Reseptor Project
├── app/
│   ├── page.js              # Homepage dengan overview fitur
│   ├── recipes/             # Generator resep dari pantry
│   ├── todolist/            # Todolist masak dengan checklist
│   ├── chat/                # Chat kuliner dengan Granite AI
│   ├── detect/              # Deteksi makanan (future feature)
│   └── api/
│       ├── models/          # API daftar model Ollama
│       ├── recipes/         # API generate resep
│       ├── chat/            # API chat kuliner
│       ├── mealplan/        # API meal planning
│       └── vision/          # API vision processing
├── components/
│   ├── model-settings.js    # UI selector model Ollama
│   ├── navbar.js            # Navigation dengan model settings
│   └── ui/                  # Komponen UI base (Button, Card, dll)
├── lib/
│   ├── ollama.js            # Integrasi Ollama core
│   └── ai.js                # Utilities AI
└── docker-compose.yml       # Multi-service deployment
```

## 🛠️ API Endpoints

### Core APIs

- `GET /api/models` - List model Ollama yang tersedia
- `POST /api/chat` - Chat kuliner dengan AI
- `POST /api/recipes` - Generate resep dari bahan pantry
- `POST /api/recipes/stream` - Streaming recipe generation
- `POST /api/mealplan` - Meal planning suggestions
- `POST /api/vision` - Image analysis (future)

### Request Headers

```javascript
// Set preferred model via header
fetch('/api/recipes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-preferred-model': 'granite3.3:8b'  // Optional
  },
  body: JSON.stringify({ ingredients: ['ayam', 'bawang'] })
})
```

## 🐳 Docker Deployment

### Quick Start

```powershell
# Windows - Auto download granite3.3:8b
.\scripts\start.ps1
```

```bash
# Linux/macOS - Auto download granite3.3:8b  
./scripts/start.sh
```

### Monitor Setup

```bash
# Check download progress
docker-compose logs -f ollama-init

# Verify model installed
docker exec -it kokita_ollama ollama list

# Check application status
docker-compose ps
```

**Download time**: 5-15 menit (granite3.3:8b ~4.9GB)

### Docker Services

- **reseptor**: Next.js application (port 3000)
- **ollama**: Ollama AI server (port 11434)  
- **ollama-init**: Auto-download granite3.3:8b model

## ⚡ Development

### Local Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Lint check (currently skipped)
```

### Testing Multiple Models

```bash
# Install berbagai model untuk testing
ollama pull granite3.3:8b
ollama pull llama3.2:3b
ollama pull codestral:latest

# Test model selector di aplikasi
npm run dev
# Buka http://localhost:3000, klik Settings, test switch model
```

### Development Features

- **Hot Reload**: Perubahan code langsung reflect di browser
- **Model Switching**: Ganti model real-time via UI tanpa restart
- **Error Handling**: Connection issues ditangani dengan graceful fallback
- **Responsive UI**: Mobile-first design dengan Tailwind CSS
- **Dark Mode**: Theme switching dengan next-themes

## 🎨 UI/UX Features

### Design System
- **Components**: Custom UI components dengan Radix primitives
- **Icons**: Lucide React icon set yang konsisten
- **Styling**: Tailwind CSS dengan custom design tokens
- **Theme**: Dark/Light mode dengan system preference detection
- **Layout**: Responsive grid system untuk mobile & desktop

### User Experience
- **No Login Required**: Langsung gunakan tanpa registrasi
- **Offline First**: Semua data tersimpan di localStorage
- **Fast Loading**: Next.js optimization dengan static generation
- **Progressive Enhancement**: Bekerja dengan dan tanpa JavaScript

## 🐛 Troubleshooting

### Ollama Connection Issues

```bash
# Check Ollama status
ollama list
curl http://localhost:11434/api/tags

# Restart Ollama service
ollama serve

# Test connection
curl http://localhost:11434/api/generate -d '{"model":"granite3.3:8b","prompt":"hello"}'
```

### Docker Issues

```bash
# Reset all containers
docker-compose down -v
docker-compose up -d

# Check service logs
docker-compose logs reseptor
docker-compose logs ollama
docker-compose logs ollama-init

# Verify model installation
docker exec -it kokita_ollama ollama list
```

### Model Issues

**Model tidak tersedia**
- Verify model pulled: `ollama list`
- Check spelling model name
- Use Model Selector untuk pilih model lain
- Pull model manual: `ollama pull <model-name>`

**Model lambat/error**
- Check hardware requirements (RAM minimal 8GB untuk model 3B)
- Monitor resource usage: `docker stats`
- Try model yang lebih kecil: `llama3.2:1b`

### Performance Tips

- **Hardware**: Gunakan model sesuai RAM (3B=8GB, 8B=16GB+)
- **Concurrency**: Set `OLLAMA_NUM_PARALLEL` untuk multiple requests
- **Storage**: Pastikan cukup disk space untuk model download
- **Network**: Untuk Docker, pastikan port 11434 tidak terblokir

## 📱 Fitur per Halaman

### 🏠 Homepage (`/`)
- Overview aplikasi dengan value proposition
- Quick links ke fitur utama (Recipes, Todolist, Chat)
- Feature cards yang menjelaskan capabilities
- Responsive hero section dengan gradient

### 🥘 Recipes (`/recipes`) 
- Input bahan-bahan pantry
- Generate resep AI berdasarkan ingredients
- Save resep ke koleksi favorites
- Share dan export resep

### 📝 Todolist (`/todolist`)
- Checklist langkah masak interaktif  
- Edit steps secara real-time
- Mark complete/incomplete steps
- Progress tracking per resep

### 💬 Chat (`/chat`)
- Chat interface dengan Granite AI
- Konsultasi masak, gizi, dan tips kuliner
- Streaming responses untuk experience yang smooth
- Context-aware conversations

### 🔧 Model Settings (Component)
- Real-time list model Ollama tersedia
- One-click model switching
- Model priority dan recommendations
- Refresh model list functionality

## 📝 Contributing

### Development Workflow

1. Fork repository dari GitHub
2. Create feature branch: `git checkout -b feature/nama-fitur`
3. Follow existing code style dan patterns
4. Test dengan multiple Ollama models
5. Update documentation jika ada perubahan API
6. Submit Pull Request dengan description lengkap

### Code Guidelines

- **JavaScript**: Modern ES6+ dengan async/await
- **React**: Functional components dengan hooks
- **Styling**: Tailwind CSS classes, minimal custom CSS
- **API**: RESTful endpoints dengan proper error handling
- **Testing**: Manual testing dengan berbagai model Ollama

## 📄 License

MIT License - lihat file `LICENSE` untuk detail lengkap.

## 🙏 Acknowledgments

- **[Ollama](https://ollama.ai)** - Local AI model runtime yang powerful
- **[IBM Granite](https://github.com/ibm-granite)** - Foundation model untuk kuliner
- **[Next.js](https://nextjs.org)** - React framework dengan excellent DX
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Radix UI](https://radix-ui.com)** - Accessible primitive components
- **[Lucide Icons](https://lucide.dev)** - Beautiful & consistent icon set
