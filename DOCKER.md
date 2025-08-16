# 🐳 Reseptor Docker Setup

## Quick Start Guide

### Prerequisites
- Docker Desktop installed and running
- At least 8GB free disk space (for Ollama models)
- Internet connection for model download

### One-Click Setup

```powershell
# Windows PowerShell - Full setup with model download
.\scripts\start.ps1

# Test complete setup
.\scripts\test-setup.ps1

# Monitor status
.\scripts\status.ps1

# Install additional models
.\scripts\install-models.ps1
```

```bash
# Linux/Mac Bash
./scripts/start.sh

# Install additional models
./scripts/install-models.sh
```

### What Happens During Setup

1. **Ollama Service**: Starts on port 11434 with health checks
2. **Model Download**: Auto-downloads `granite3.3:8b` (~4.9GB) if not exists
3. **App Service**: Starts Reseptor on port 3000 after model ready
4. **Health Monitoring**: Ensures all services are ready before proceeding

### Manual Setup

```powershell
# Start all services with auto model download
docker-compose up -d

# Monitor model download progress
docker-compose logs -f ollama-init

# Check when ready
docker-compose ps
```

## What Happens During Startup

1. **Ollama Service** starts on port 11434
2. **Model Initializer** automatically downloads `granite3.3:8b`
3. **Reseptor App** starts on port 3000 after model is ready

## Access Points

- **Reseptor Web App**: http://localhost:3000
- **Ollama API**: http://localhost:11434

## Monitoring & Management

### Check Status
```powershell
# Service status
docker-compose ps

# View logs
docker-compose logs -f

# Check models
docker exec reseptor-ollama ollama list
```

### Troubleshooting
```powershell
# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Reset everything (removes models)
docker-compose down -v
```

### Resource Usage
- **granite3.3:8b**: ~5GB disk space
- **Total Docker setup**: ~8GB
- **RAM usage**: 4-8GB depending on model usage

## Model Alternatives

If `granite3.3:8b` download fails, the init script will try:
1. `granite3.1:8b` (fallback)
2. `granite:3b` (minimal)

You can also manually pull other models:
```powershell
docker exec reseptor-ollama ollama pull llama3.2:3b
docker exec reseptor-ollama ollama pull granite3.1:8b
```

## Production Notes

- Data persists in Docker volume `ollama_data`
- Models survive container restarts
- Health checks ensure services are ready
- Auto-restart on failure
