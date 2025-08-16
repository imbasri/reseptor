# Reseptor Docker Test Setup (PowerShell)

Write-Host "🧪 Testing Reseptor Docker Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Step 1: Validate configuration
Write-Host "1️⃣ Validating Docker Compose configuration..." -ForegroundColor Blue
$config = docker-compose config 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Configuration valid" -ForegroundColor Green
} else {
    Write-Host "   ❌ Configuration invalid:" -ForegroundColor Red
    Write-Host $config
    exit 1
}

# Step 2: Check Docker availability
Write-Host "2️⃣ Checking Docker availability..." -ForegroundColor Blue
try {
    docker info | Out-Null
    Write-Host "   ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker is not running" -ForegroundColor Red
    exit 1
}

# Step 3: Build images
Write-Host "3️⃣ Building application image..." -ForegroundColor Blue
docker-compose build reseptor
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Image built successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Image build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Start services
Write-Host "4️⃣ Starting services..." -ForegroundColor Blue
docker-compose up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Services started" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 5: Wait and monitor
Write-Host "5️⃣ Monitoring startup progress..." -ForegroundColor Blue
Write-Host "   📊 Container status:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "   📥 Model download progress (will take 5-15 minutes):" -ForegroundColor Yellow
Write-Host "      Run in another terminal: docker-compose logs -f ollama-init"

Write-Host ""
Write-Host "✅ Test setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for model download: docker-compose logs -f ollama-init"
Write-Host "   2. Check status: .\scripts\status.ps1"
Write-Host "   3. Open app: http://localhost:3000"
Write-Host "   4. Install more models: .\scripts\install-models.ps1"
Write-Host ""
Write-Host "STOP: To stop services run: docker-compose down" -ForegroundColor Red
