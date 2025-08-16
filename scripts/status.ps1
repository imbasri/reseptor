# Reseptor Status Monitor (PowerShell)

Write-Host "📊 Reseptor Docker Status Monitor" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check Docker services
Write-Host "🐳 Docker Services Status:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""

# Check Ollama models
Write-Host "🤖 Installed Ollama Models:" -ForegroundColor Yellow
$ollamaRunning = docker ps | Select-String "reseptor-ollama"
if ($ollamaRunning) {
    docker exec reseptor-ollama ollama list
} else {
    Write-Host "   ⚠️  Ollama container not running" -ForegroundColor Red
}
Write-Host ""

# Check model download progress
Write-Host "📥 Model Download Progress:" -ForegroundColor Magenta
$initContainer = docker ps -a | Select-String "reseptor-ollama-init"
if ($initContainer) {
    Write-Host "   Last 10 lines from ollama-init:"
    docker logs --tail 10 reseptor-ollama-init
} else {
    Write-Host "   ⚠️  Init container not found"
}
Write-Host ""

# Check application health
Write-Host "🌐 Application Health:" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/models" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Reseptor API responding" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Reseptor API not responding" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Ollama API responding" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Ollama API not responding" -ForegroundColor Red
}
Write-Host ""

# Provide helpful commands
Write-Host "⚡ Useful Commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose logs -f [service-name]"
Write-Host "   Restart: docker-compose restart"
Write-Host "   Stop all: docker-compose down"
Write-Host "   Install models: .\scripts\install-models.ps1"
Write-Host ""

Write-Host "🔗 URLs:" -ForegroundColor Green
Write-Host "   Reseptor App: http://localhost:3000"
Write-Host "   Ollama API: http://localhost:11434"
