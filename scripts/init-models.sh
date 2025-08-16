#!/bin/bash

# Docker init script for Ollama model setup
echo "🚀 Starting Ollama model initialization..."

# Wait for Ollama service to be fully ready
echo "⏳ Waiting for Ollama service..."
until curl -s http://ollama:11434/api/tags > /dev/null 2>&1; do
    echo "   Ollama not ready yet, waiting 5 seconds..."
    sleep 5
done

echo "✅ Ollama service is ready!"

# List existing models
echo "📋 Checking existing models..."
EXISTING_MODELS=$(ollama list 2>/dev/null | grep granite3.3:8b || echo "")

if [ -n "$EXISTING_MODELS" ]; then
    echo "✅ granite3.3:8b already exists, skipping download"
else
    echo "📥 Pulling granite3.3:8b model (this may take several minutes)..."
    
    # Pull the model with progress
    if ollama pull granite3.3:8b; then
        echo "✅ Successfully pulled granite3.3:8b!"
    else
        echo "❌ Failed to pull granite3.3:8b, trying alternative..."
        
        # Fallback to smaller model if granite3.3:8b fails
        echo "📥 Trying fallback model: granite3.1:8b..."
        if ollama pull granite3.1:8b; then
            echo "✅ Successfully pulled granite3.1:8b as fallback!"
        else
            echo "📥 Trying minimal model: granite:3b..."
            ollama pull granite:3b || echo "❌ All model pulls failed"
        fi
    fi
fi

# List all available models
echo "📋 Available models after initialization:"
ollama list

echo "🎉 Model initialization complete!"
