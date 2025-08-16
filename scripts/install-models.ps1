# Reseptor Model Installer (PowerShell) - Install additional Ollama models

Write-Host "🤖 Reseptor Model Installer" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host ""

# Check if Ollama container is running
$ollamaRunning = docker ps | Select-String "reseptor-ollama"
if (-not $ollamaRunning) {
    Write-Host "❌ Ollama container not running. Please start Docker Compose first:" -ForegroundColor Red
    Write-Host "   docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Current installed models:" -ForegroundColor Cyan
docker exec reseptor-ollama ollama list
Write-Host ""

Write-Host "📦 Available models to install:" -ForegroundColor Yellow
Write-Host "1. llama3.2:3b      (3GB - Fast, good for chat)"
Write-Host "2. llama3.2:1b      (1GB - Very fast, basic)"
Write-Host "3. codestral:latest (4GB - Code generation)"
Write-Host "4. llama3.2-vision:11b (7GB - Image analysis)"
Write-Host "5. granite3.1:8b    (5GB - Alternative granite)"
Write-Host "6. Custom model"
Write-Host ""

$choice = Read-Host "Choose model to install (1-6)"

switch ($choice) {
    "1" { $MODEL = "llama3.2:3b" }
    "2" { $MODEL = "llama3.2:1b" }
    "3" { $MODEL = "codestral:latest" }
    "4" { $MODEL = "llama3.2-vision:11b" }
    "5" { $MODEL = "granite3.1:8b" }
    "6" { $MODEL = Read-Host "Enter custom model name" }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📥 Installing model: $MODEL" -ForegroundColor Blue
Write-Host "⏳ This may take several minutes depending on model size..." -ForegroundColor Yellow
Write-Host ""

# Install the model
$result = docker exec reseptor-ollama ollama pull $MODEL
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ Model $MODEL installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Updated model list:" -ForegroundColor Cyan
    docker exec reseptor-ollama ollama list
    Write-Host ""
    Write-Host "🎉 You can now select this model in the Reseptor UI!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to install model $MODEL" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
}
