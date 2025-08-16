import { getOllamaHost } from '../../../lib/ollama'

export async function GET() {
  try {
    const host = getOllamaHost()
    const response = await fetch(`${host}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    const models = data.models || []
    
    // Return models with additional info
    const modelList = models.map(model => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at,
      digest: model.digest.substring(0, 12) + '...',
    }))

    return Response.json({ 
      success: true, 
      models: modelList,
      count: modelList.length,
      host: host
    })
  } catch (error) {
    console.error('Error fetching Ollama models:', error)
    return Response.json({ 
      success: false, 
      error: error.message,
      models: [],
      count: 0
    }, { status: 500 })
  }
}
