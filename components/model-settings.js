'use client'
import { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'

export default function ModelSettings({ onModelChange }) {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [host, setHost] = useState('')

  const fetchModels = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/models')
      const data = await response.json()
      
      if (data.success) {
        setModels(data.models)
        setHost(data.host)
        
        // Get saved model from localStorage or use first available
        const savedModel = localStorage.getItem('selectedOllamaModel')
        const availableModelNames = data.models.map(m => m.name)
        
        if (savedModel && availableModelNames.includes(savedModel)) {
          setSelectedModel(savedModel)
          onModelChange?.(savedModel)
        } else if (data.models.length > 0) {
          const firstModel = data.models[0].name
          setSelectedModel(firstModel)
          onModelChange?.(firstModel)
          localStorage.setItem('selectedOllamaModel', firstModel)
        }
      } else {
        setError(data.error || 'Gagal mengambil daftar model')
      }
    } catch (err) {
      setError('Tidak dapat terhubung ke Ollama: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleModelSelect = (modelName) => {
    setSelectedModel(modelName)
    localStorage.setItem('selectedOllamaModel', modelName)
    onModelChange?.(modelName)
  }

  useEffect(() => {
    fetchModels()
  }, [])

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Model Ollama</h3>
        <Button 
          onClick={fetchModels} 
          size="sm" 
          variant="ghost"
          loading={loading}
        >
          🔄 Refresh
        </Button>
      </div>
      
      {error && (
        <div className="text-red-600 text-xs mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      
      {host && (
        <div className="text-xs text-gray-500 mb-2">
          Host: {host}
        </div>
      )}
      
      {selectedModel && (
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          🎯 Model aktif: <strong>{selectedModel}</strong>
        </div>
      )}
      
      {models.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">
            {models.length} model tersedia - Pilih model:
          </div>
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
            {models.map((model) => (
              <button
                key={model.name}
                onClick={() => handleModelSelect(model.name)}
                className={`flex items-center justify-between p-2 rounded text-xs text-left transition-colors ${
                  selectedModel === model.name
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium flex items-center">
                    {selectedModel === model.name && '✓ '}
                    {model.name}
                    {model.name.includes('vision') && ' 👁️'}
                  </div>
                  <div className="text-gray-500">
                    {model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB` : 'Unknown size'}
                  </div>
                </div>
                <div className="text-gray-400 text-xs">
                  {model.digest}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : !loading ? (
        <div className="text-gray-500 text-xs">
          Tidak ada model ditemukan. Pastikan Ollama berjalan dan ada model yang terinstall.
        </div>
      ) : null}
    </Card>
  )
}
