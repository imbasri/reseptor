# Reseptor Docker Quick Start (PowerShell)
Write-Host "🚀 Starting Reseptor with Ollama..." -ForegroundColor Green
Write-Host "📦 This will:" -ForegroundColor Yellow
Write-Host "   - Start Ollama service"
Write-Host "   - Download granite3.3:8b model automatically"
Write-Host "   - Start Reseptor web application"
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "📋 Starting Docker Compose..." -ForegroundColor Blue
docker-compose up -d

Write-Host ""
Write-Host "⏳ Services starting up..." -ForegroundColor Yellow
Write-Host "   - Ollama: http://localhost:11434"
Write-Host "   - Reseptor: http://localhost:3000"
Write-Host ""
Write-Host "📥 Model download will happen automatically in background" -ForegroundColor Cyan
Write-Host "   Check progress: docker-compose logs -f ollama-init"
Write-Host ""
Write-Host "🎉 Once ready, open: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Blue
Write-Host "   docker-compose logs -f          # View logs"
Write-Host "   docker-compose down             # Stop services"
Write-Host "   docker-compose restart          # Restart services"
