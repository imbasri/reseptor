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
    <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
      <span className="text-sm text-slate-600 dark:text-slate-400">🤖</span>
      <select
        value={selectedModel}
        onChange={(e) => handleModelSelect(e.target.value)}
        disabled={loading || models.length === 0}
        className="text-sm border-0 dark:bg-slate-800/50 bg-transparent text-slate-700 dark:text-slate-300 flex-1 min-w-0 focus:outline-none"
      >
        {models.length === 0 ? (
          <option value="">Loading models...</option>
        ) : (
          models.map((model) => (
            <option key={model.name} value={model.name} className='dark:bg-slate-800/50 bg-transparent text-slate-700 dark:text-slate-300'>
              {model.name} ({model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB` : 'Unknown'})
            </option>
          ))
        )}
      </select>
      
      <button 
        onClick={fetchModels} 
        disabled={loading}
        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded transition-colors"
        title="Refresh models"
      >
        {loading ? (
          <span className="animate-spin">🔄</span>
        ) : (
          '↻'
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500" title={error}>
          ⚠️
        </span>
      )}
    </div>
  )
}
