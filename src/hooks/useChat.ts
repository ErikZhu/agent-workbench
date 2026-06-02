import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

export interface ToolUseBlock {
  toolId: string
  toolName: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheWrite: number
  costUsd: number
  durationMs: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  pending?: boolean
  toolCalls?: ToolUseBlock[]
  usage?: TokenUsage
}

const STORAGE_KEY = (agentId: string) => `chat_history_${agentId}`

export function useChat(agentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(agentId))
      if (!raw) return []
      const parsed = JSON.parse(raw) as ChatMessage[]
      return parsed.map(m => m.pending ? { ...m, pending: false } : m)
    } catch {
      return []
    }
  })
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(agentId), JSON.stringify(messages))
    } catch {}
  }, [agentId, messages])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      pending: true,
      toolCalls: [],
    }

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

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

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

            } else if (event.type === 'tool_use') {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsg.id) return m
                const newCall: ToolUseBlock = {
                  toolId: event.toolId,
                  toolName: event.toolName,
                  input: event.input || {},
                }
                return { ...m, toolCalls: [...(m.toolCalls || []), newCall] }
              }))

            } else if (event.type === 'tool_result') {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsg.id) return m
                const toolCalls = (m.toolCalls || []).map(tc =>
                  tc.toolId === event.toolId
                    ? { ...tc, result: event.content, isError: event.isError }
                    : tc
                )
                return { ...m, toolCalls }
              }))

            } else if (event.type === 'done') {
              // Store usage, do NOT replace text (deltas are already accumulated)
              const usage: TokenUsage | undefined = event.usage ? {
                inputTokens: event.usage.input_tokens || 0,
                outputTokens: event.usage.output_tokens || 0,
                cacheRead: event.usage.cache_read_input_tokens || 0,
                cacheWrite: event.usage.cache_creation_input_tokens || 0,
                costUsd: event.costUsd || 0,
                durationMs: event.durationMs || 0,
              } : undefined
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, pending: false, usage } : m
              ))

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
    // Also clear server-side session so next message starts fresh
    fetch(apiUrl(`/api/chat/${agentId}/session`), { method: 'DELETE' }).catch(() => {})
  }, [agentId])

  const clearError = useCallback(() => setError(null), [])

  return { messages, streaming, error, send, stop, clear, clearError }
}
