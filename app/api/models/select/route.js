// Get the currently selected model from localStorage or best available
export async function POST(req) {
  try {
    const { action, model } = await req.json()
    
    if (action === 'get') {
      // Return the currently selected model
      return Response.json({ 
        success: true, 
        selectedModel: null // Client-side will handle localStorage
      })
    }
    
    if (action === 'set' && model) {
      // This endpoint could be extended to store preferences server-side
      return Response.json({ 
        success: true, 
        message: 'Model preference saved (client-side)'
      })
    }
    
    return Response.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 })
    
  } catch (error) {
    console.error('Model selection error:', error)
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
