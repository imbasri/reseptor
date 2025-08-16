export function createLineJsonStream(upstream, pickToken){
  const enc = new TextEncoder()
  const dec = new TextDecoder('utf-8', { stream: true })
  return new ReadableStream({
    async start(controller){
      const reader = upstream.body.getReader()
      let buf = ''
      let chunkCount = 0
      
      while(true){
        const { value, done } = await reader.read()
        if(done) break
        
        buf += dec.decode(value, { stream: true })
        chunkCount++
        
        // Process lines more efficiently
        let lineStart = 0
        let lineEnd = buf.indexOf('\n', lineStart)
        
        while(lineEnd !== -1) {
          const line = buf.slice(lineStart, lineEnd).trim()
          if(line) {
            try{
              const obj = JSON.parse(line)
              const token = pickToken(obj)
              if(token) {
                controller.enqueue(enc.encode(token))
              }
            }catch{ /* ignore malformed JSON */ }
          }
          lineStart = lineEnd + 1
          lineEnd = buf.indexOf('\n', lineStart)
        }
        
        // Keep remaining incomplete line
        buf = buf.slice(lineStart)
        
        // Prevent buffer from growing too large
        if(buf.length > 8192) {
          console.warn('Stream buffer too large, truncating')
          buf = buf.slice(-4096)
        }
      }
      
      // Process final buffer content
      if(buf.trim()){
        try{ 
          const obj = JSON.parse(buf.trim())
          const token = pickToken(obj)
          if(token) controller.enqueue(enc.encode(token))
        }catch{}
      }
      controller.close()
    }
  })
}

export function getOllamaHost(){
  return process.env.OLLAMA_HOST || 'http://localhost:11434'
}

export function getOllamaModel(){
  return process.env.OLLAMA_MODEL || 'granite3.2-vision:2b'
}

// Get available models from Ollama
export async function getAvailableModels() {
  try {
    const host = getOllamaHost()
    const response = await fetch(`${host}/api/tags`)
    if (!response.ok) throw new Error('Failed to fetch models')
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error('Error fetching models:', error)
    return []
  }
}

// Get the best available model (prioritize by capabilities)
export async function getBestAvailableModel(preferredModel = null) {
  // If a preferred model is provided, try to use it first
  if (preferredModel) {
    const models = await getAvailableModels()
    const modelExists = models.find(m => m.name === preferredModel)
    if (modelExists) {
      return preferredModel
    }
  }
  
  const models = await getAvailableModels()
  if (models.length === 0) return getOllamaModel() // fallback
  
  // Priority order: vision models > large models > any model
  const priorities = [
    /vision/i,
    /granite.*3\./i,
    /llama.*3/i,
    /granite/i,
    /llama/i,
    /.*/
  ]
  
  for (const pattern of priorities) {
    const found = models.find(m => pattern.test(m.name))
    if (found) return found.name
  }
  
  return models[0].name // return first available
}

// Get model with client preference support
export async function getSelectedModel(req = null) {
  // Try to get preferred model from request headers (client-side selection)
  let preferredModel = null
  
  if (req && req.headers) {
    preferredModel = req.headers.get('x-preferred-model')
  }
  
  return await getBestAvailableModel(preferredModel)
}

export function extractFirstJson(text=''){
  // Try code-fenced JSON first
  const fence = text.match(/```\s*json\s*([\s\S]*?)```/i)
  if(fence){
    try{ return JSON.parse(fence[1]) }catch{}
  }
  // Balanced object scan
  const obj = scanBalanced(text, '{', '}')
  if(obj){ try{ return JSON.parse(obj) }catch{} }
  // Balanced array scan
  const arr = scanBalanced(text, '\\[', '\\]')
  if(arr){ try{ return JSON.parse(arr) }catch{} }
  return null
}

function scanBalanced(text, openSym, closeSym){
  const open = new RegExp(openSym, 'g')
  const close = new RegExp(closeSym, 'g')
  for(let i=0;i<text.length;i++){
    // find first open
    open.lastIndex = i
    const m = open.exec(text)
    if(!m) break
    let depth = 1
    let j = open.lastIndex
    while(j < text.length){
      open.lastIndex = j
      close.lastIndex = j
      const mo = open.exec(text)
      const mc = close.exec(text)
      if(mc && (!mo || mc.index < mo.index)){
        depth--
        j = mc.index + 1
        if(depth === 0){
          return text.slice(m.index, mc.index+1)
        }
      }else if(mo){
        depth++
        j = mo.index + 1
      }else{
        break
      }
    }
    i = m.index
  }
  return null
}
