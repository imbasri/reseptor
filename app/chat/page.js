'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'

export default function Chat(){
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])
  useEffect(()=>{
    try{
      const saved = JSON.parse(localStorage.getItem('chatHistory')||'[]')
      if(saved?.length) setMessages(saved)
    }catch{}
  },[])

  const send = async () => {
    if(!input.trim()) return
    const newMsgs = [...messages, { role:'user', content: input }]
    setMessages(newMsgs)
    setInput('')
    const controller = new AbortController()
    abortRef.current = controller
    setIsStreaming(true)
    try{
      const res = await fetch('/api/chat/stream', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: newMsgs }), signal: controller.signal })
      if(!res.ok){
        const t = await res.text(); setMessages([...newMsgs, { role:'assistant', content: 'Error: '+t }]); return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setMessages(curr=>[...curr, { role:'assistant', content: '' }])
      while(true){
        let read
        try{ read = await reader.read() }catch(e){ break }
        const { value, done } = read || {}
        if(done) break
        acc += decoder.decode(value)
        setMessages(curr=>{
          const copy = curr.slice()
          copy[copy.length-1] = { role:'assistant', content: acc }
          return copy
        })
      }
      try{ localStorage.setItem('chatHistory', JSON.stringify([...newMsgs, { role:'assistant', content: acc }])) }catch{}
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chatbot Granite AI</h1>
      <Card>
        <div className="h-[50vh] overflow-y-auto space-y-3 p-2">
          {messages.map((m,i)=> (
            <div key={i} className={`rounded-lg p-3 ${m.role==='user'?'bg-blue-50 dark:bg-white/10 ml-auto max-w-[80%]':'bg-white dark:bg-white/5 max-w-[85%]'}`}>
              {m.role==='assistant' ? (
                <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatListHtml(m.content) }} />
              ) : m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Input className="flex-1 min-w-0" value={input} onChange={e=>setInput(e.target.value)} placeholder="Contoh: Apa resep sehat dengan tomat dan tahu?" onKeyDown={e=>{if(e.key==='Enter'){send()}}}/>
          <Button onClick={send} loading={isStreaming} disabled={isStreaming}>Kirim</Button>
          {isStreaming && <Button variant="outline" size="sm" onClick={stop}>Stop</Button>}
          <Button variant="ghost" size="sm" onClick={clearAll}>Reset</Button>
          <Button variant="ghost" size="sm" onClick={clearLast}>Clear Terakhir</Button>
        </div>
      </Card>
    </div>
  )
}

function formatListHtml(text=''){
  try{
    // Split into paragraphs and lists; convert lines starting with N. into <ol>
    const lines = text.split(/\r?\n/)
    const chunks = []
    let ol = []
    const flushOl = ()=>{ if(ol.length){ chunks.push('<ol class="pl-5 list-decimal">'+ ol.map(li=>`<li>${escapeHtml(li)}</li>`).join('') + '</ol>'); ol=[] } }
    for(const line of lines){
      const m = line.match(/^\s*(\d+)\.|^-\s+|^\*\s+/)
      if(m){
        const item = line.replace(/^\s*(\d+)\.|^-\s+|^\*\s+/,'').trim()
        ol.push(item)
      }else{
        flushOl()
        if(line.trim()) chunks.push('<p>'+escapeHtml(line)+'</p>')
      }
    }
    flushOl()
    return chunks.join('') || escapeHtml(text)
  }catch{ return escapeHtml(text) }
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))
}
