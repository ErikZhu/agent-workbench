import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  pending?: boolean
}

const STORAGE_KEY = (agentId: string) => `chat_history_${agentId}`

export function useChat(agentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(agentId))
      if (!raw) return []
      const parsed = JSON.parse(raw) as ChatMessage[]
      // Clear any in-flight pending messages from a previous session
      return parsed.map(m => m.pending ? { ...m, pending: false } : m)
    } catch {
      return []
    }
  })
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(agentId), JSON.stringify(messages))
    } catch {
      // localStorage may be unavailable (private browsing / quota exceeded)
    }
  }, [agentId, messages])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: '', pending: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)
    setError(null)

    const ctrl = new AbortController()
    abortRef.current = () => ctrl.abort()

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message: text }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'delta') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, text: m.text + event.text } : m
              ))
            } else if (event.type === 'done') {
              // replace full text with final result if provided
              if (event.text) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, text: event.text, pending: false } : m
                ))
              } else {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, pending: false } : m
                ))
              }
            } else if (event.type === 'end') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, pending: false } : m
              ))
            } else if (event.type === 'error') {
              setError(event.message)
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, pending: false } : m
              ))
            }
          } catch {}
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message)
      }
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, pending: false } : m
      ))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [agentId, streaming])

  const stop = useCallback(() => {
    abortRef.current?.()
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
    localStorage.removeItem(STORAGE_KEY(agentId))
  }, [agentId])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { messages, streaming, error, send, stop, clear, clearError }
}
