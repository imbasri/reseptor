export function createLineJsonStream(upstream, pickToken){
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  return new ReadableStream({
    async start(controller){
      const reader = upstream.body.getReader()
      let buf = ''
      while(true){
        const { value, done } = await reader.read()
        if(done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for(const line of lines){
          const s = line.trim(); if(!s) continue
          try{
            const obj = JSON.parse(s)
            const token = pickToken(obj)
            if(token) controller.enqueue(enc.encode(token))
          }catch{ /* ignore partials */ }
        }
      }
      if(buf.trim()){
        try{ const obj = JSON.parse(buf.trim()); const token = pickToken(obj); if(token) controller.enqueue(enc.encode(token)) }catch{}
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
