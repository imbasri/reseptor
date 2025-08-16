#!/bin/bash
# Reseptor Model Installer - Install additional Ollama models

echo "🤖 Reseptor Model Installer"
echo "=========================="
echo ""

# Check if Ollama container is running
if ! docker ps | grep -q "reseptor-ollama"; then
    echo "❌ Ollama container not running. Please start Docker Compose first:"
    echo "   docker-compose up -d"
    exit 1
fi

echo "📋 Current installed models:"
docker exec reseptor-ollama ollama list
echo ""

echo "📦 Available models to install:"
echo "1. llama3.2:3b      (3GB - Fast, good for chat)"
echo "2. llama3.2:1b      (1GB - Very fast, basic)"
echo "3. codestral:latest (4GB - Code generation)"
echo "4. llama3.2-vision:11b (7GB - Image analysis)"
echo "5. granite3.1:8b    (5GB - Alternative granite)"
echo "6. Custom model"
echo ""

read -p "Choose model to install (1-6): " choice

case $choice in
    1)
        MODEL="llama3.2:3b"
        ;;
    2)
        MODEL="llama3.2:1b"
        ;;
    3)
        MODEL="codestral:latest"
        ;;
    4)
        MODEL="llama3.2-vision:11b"
        ;;
    5)
        MODEL="granite3.1:8b"
        ;;
    6)
        read -p "Enter custom model name: " MODEL
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📥 Installing model: $MODEL"
echo "⏳ This may take several minutes depending on model size..."
echo ""

# Install the model
docker exec reseptor-ollama ollama pull "$MODEL"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Model $MODEL installed successfully!"
    echo ""
    echo "📋 Updated model list:"
    docker exec reseptor-ollama ollama list
    echo ""
    echo "🎉 You can now select this model in the Reseptor UI!"
else
    echo ""
    echo "❌ Failed to install model $MODEL"
    echo "Please check your internet connection and try again."
fi
