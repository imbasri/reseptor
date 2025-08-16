#!/bin/bash

# Reseptor Docker Quick Start
echo "🚀 Starting Reseptor with Ollama..."
echo "📦 This will:"
echo "   - Start Ollama service"
echo "   - Download granite3.3:8b model automatically"
echo "   - Start Reseptor web application"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "📋 Starting Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Services starting up..."
echo "   - Ollama: http://localhost:11434"
echo "   - Reseptor: http://localhost:3000"
echo ""
echo "📥 Model download will happen automatically in background"
echo "   Check progress: docker-compose logs -f ollama-init"
echo ""
echo "🎉 Once ready, open: http://localhost:3000"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f          # View logs"
echo "   docker-compose down             # Stop services"
echo "   docker-compose restart          # Restart services"
