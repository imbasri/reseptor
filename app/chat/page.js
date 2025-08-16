'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import ModelSettings from '../../components/model-settings'

export default function Chat(){
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [typingDots, setTypingDots] = useState('')

  // Typing animation for AI response
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setTypingDots(prev => {
          if (prev === '...') return ''
          return prev + '.'
        })
      }, 500)
      return () => clearInterval(interval)
    } else {
      setTypingDots('')
    }
  }, [isStreaming])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])
  useEffect(()=>{
    try{
      const saved = JSON.parse(localStorage.getItem('chatHistory')||'[]')
      if(saved?.length) setMessages(saved)
    }catch{}
  },[])

  const send = async () => {
    if(!input.trim()) return
    const userMessage = { role:'user', content: input, timestamp: Date.now() }
    const newMsgs = [...messages, userMessage]
    setMessages(newMsgs)
    setInput('')
    const controller = new AbortController()
    abortRef.current = controller
    setIsStreaming(true)
    
    try{
      const res = await fetch('/api/chat/stream', { 
        method:'POST', 
        headers:{
          'Content-Type':'application/json',
          'x-preferred-model': selectedModel || ''
        }, 
        body: JSON.stringify({ messages: newMsgs }), 
        signal: controller.signal 
      })
      
      if(!res.ok){
        const t = await res.text()
        setMessages([...newMsgs, { 
          role:'assistant', 
          content: 'Error: '+t, 
          timestamp: Date.now(),
          isError: true 
        }])
        return
      }
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      let buffer = ''
      
      // Add initial assistant message
      setMessages(curr=>[...curr, { 
        role:'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true 
      }])
      
      while(true){
        let read
        try{ read = await reader.read() }catch(e){ break }
        const { value, done } = read || {}
        if(done) break
        
        buffer += decoder.decode(value, { stream: true })
        acc += decoder.decode(value, { stream: true })
        
        // Update message with buffer optimization - update every few characters for smoother experience
        if (buffer.length > 5 || done) {
          setMessages(curr=>{
            const copy = curr.slice()
            copy[copy.length-1] = { 
              role:'assistant', 
              content: acc, 
              timestamp: copy[copy.length-1].timestamp,
              isStreaming: true 
            }
            return copy
          })
          buffer = ''
        }
      }
      
      // Final update - mark as completed
      setMessages(curr=>{
        const copy = curr.slice()
        copy[copy.length-1] = { 
          role:'assistant', 
          content: acc, 
          timestamp: copy[copy.length-1].timestamp,
          isStreaming: false 
        }
        return copy
      })
      
      try{ 
        localStorage.setItem('chatHistory', JSON.stringify([...newMsgs, { 
          role:'assistant', 
          content: acc, 
          timestamp: Date.now() 
        }])) 
      }catch{}
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    try{ abortRef.current?.abort() }catch{}
  }

  const clearLast = () => {
    setMessages(curr=>{
      if(!curr.length) return curr
      if(curr[curr.length-1].role === 'assistant'){
        const next = curr.slice(0, -1)
        try{ localStorage.setItem('chatHistory', JSON.stringify(next)) }catch{}
        return next
      }
      return curr
    })
  }

  const clearAll = () => {
    setMessages([])
    try{ localStorage.removeItem('chatHistory') }catch{}
  }

  const quickActions = [
    "Resep masakan sehat dengan bahan seadanya",
    "Tips memasak untuk pemula",
    "Resep dessert mudah dan lezat",
    "Menu diet seimbang untuk seminggu"
  ]

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      // Could add a toast notification here
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI Chat Assistant
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Powered by Granite AI • Realtime Streaming
          </p>
        </div>
        
        <ModelSettings onModelChange={setSelectedModel} />
        
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <div className="h-[60vh] overflow-y-auto space-y-4 p-6 scroll-smooth">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-6 max-w-md">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      Mulai Percakapan
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Tanyakan apa saja tentang resep masakan atau tips kuliner
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Coba tanyakan:</p>
                    <div className="grid gap-2">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(action)}
                          className="p-3 text-left bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-600"
                        >
                          💡 {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((m,i)=> (
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`group relative max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  m.role==='user'
                    ?'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    :m.isError
                      ?'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      :'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-md'
                }`}>
                  {m.role==='user' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium opacity-90">You</span>
                    </div>
                  )}
                  
                  {m.role==='assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI Assistant</span>
                      {m.isStreaming && (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={m.role==='user' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}>
                    {m.role==='assistant' ? (
                      <div className="prose prose-slate dark:prose-invert max-w-none prose-sm" 
                           dangerouslySetInnerHTML={{ __html: formatListHtml(m.content) }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                  
                  {/* Message actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-2">
                    <button
                      onClick={() => copyMessage(m.content)}
                      className="p-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                      title="Copy message"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Timestamp */}
                  {m.timestamp && (
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isStreaming && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-md rounded-2xl p-4 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI Assistant</span>
                    <span className="text-blue-500 text-sm">typing{typingDots}</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
          
          {/* Input area */}
          <div className="border-t border-slate-200 dark:border-slate-600 p-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 relative">
                <Input 
                  className="pr-12 border-2 focus:border-blue-500 transition-colors bg-white dark:bg-slate-700" 
                  value={input} 
                  onChange={e=>setInput(e.target.value)} 
                  placeholder="Tanyakan tentang resep masakan, tips kuliner, atau apapun..." 
                  onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); send()}}}
                  disabled={isStreaming}
                />
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <Button 
                onClick={send} 
                loading={isStreaming} 
                disabled={isStreaming || !input.trim()}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6"
              >
                {isStreaming ? 'Sending...' : 'Send'}
              </Button>
              
              {isStreaming && (
                <Button variant="outline" size="sm" onClick={stop} className="border-red-200 text-red-600 hover:bg-red-50">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                  </svg>
                  Stop
                </Button>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearLast} disabled={!messages.length}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                  Undo Last
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={!messages.length}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All
                </Button>
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {messages.length} messages • Model: {selectedModel || 'default'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function formatListHtml(text=''){
  try{
    if (!text.trim()) return ''
    
    const lines = text.split(/\r?\n/)
    const chunks = []
    let ol = []
    let ul = []
    
    const flushOl = () => { 
      if(ol.length){ 
        chunks.push('<ol class="pl-5 list-decimal space-y-1 my-2">'+ ol.map(li=>`<li class="text-slate-700 dark:text-slate-200">${escapeHtml(li)}</li>`).join('') + '</ol>') 
        ol=[] 
      } 
    }
    
    const flushUl = () => { 
      if(ul.length){ 
        chunks.push('<ul class="pl-5 list-disc space-y-1 my-2">'+ ul.map(li=>`<li class="text-slate-700 dark:text-slate-200">${escapeHtml(li)}</li>`).join('') + '</ul>') 
        ul=[] 
      } 
    }
    
    for(const line of lines){
      const trimmed = line.trim()
      if (!trimmed) {
        flushOl()
        flushUl()
        if (chunks.length > 0) chunks.push('<br>')
        continue
      }
      
      // Numbered lists
      const numberedMatch = trimmed.match(/^\s*(\d+)\.\s*(.+)/)
      if(numberedMatch){
        flushUl()
        ol.push(numberedMatch[2])
        continue
      }
      
      // Bullet lists
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/)
      if(bulletMatch){
        flushOl()
        ul.push(bulletMatch[1])
        continue
      }
      
      // Headings
      const headingMatch = trimmed.match(/^#+\s*(.+)/)
      if(headingMatch){
        flushOl()
        flushUl()
        const level = Math.min(headingMatch[0].indexOf(' '), 4)
        chunks.push(`<h${level + 2} class="font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2">${escapeHtml(headingMatch[1])}</h${level + 2}>`)
        continue
      }
      
      // Bold text processing
      let processedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
      
      // Regular paragraphs
      flushOl()
      flushUl()
      if(trimmed) {
        chunks.push(`<p class="text-slate-700 dark:text-slate-200 mb-2">${processedText.includes('<strong') ? processedText : escapeHtml(processedText)}</p>`)
      }
    }
    
    flushOl()
    flushUl()
    
    return chunks.join('') || `<p class="text-slate-700 dark:text-slate-200">${escapeHtml(text)}</p>`
  }catch{ 
    return `<p class="text-slate-700 dark:text-slate-200">${escapeHtml(text)}</p>`
  }
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))
}
