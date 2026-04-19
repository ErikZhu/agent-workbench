import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

export interface AgentResponse {
  agentId: string
  name: string
  color: string
  text: string
  done: boolean
  error?: string
  startedAt?: number  // timestamp of first delta, used for arrival-order rendering
}

export interface SynthesisState {
  text: string
  done: boolean
}

export interface CouncilRound {
  id: string
  question: string
  responses: AgentResponse[]
  synthesis: SynthesisState | null
  finished: boolean
}

const COUNCIL_STORAGE_KEY = 'council_rounds'

function loadRounds(): CouncilRound[] {
  try {
    const raw = localStorage.getItem(COUNCIL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CouncilRound[]
  } catch {
    return []
  }
}

export function useCouncil() {
  const [rounds, setRounds] = useState<CouncilRound[]>(() => loadRounds())
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)

  // Persist to localStorage on every change (cap to last 20 rounds)
  useEffect(() => {
    try {
      localStorage.setItem(COUNCIL_STORAGE_KEY, JSON.stringify(rounds.slice(-20)))
    } catch {}
  }, [rounds])

  const ask = useCallback(async (message: string, agentIds?: string[]) => {
    if (!message.trim() || streaming) return

    const roundId = crypto.randomUUID()
    const newRound: CouncilRound = {
      id: roundId,
      question: message,
      responses: [],
      synthesis: null,
      finished: false,
    }

    setRounds(prev => [...prev, newRound])
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = () => ctrl.abort()

    try {
      const res = await fetch(apiUrl('/api/council'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, agentIds }),
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

            if (event.type === 'start') {
              const initialResponses: AgentResponse[] = event.agents.map(
                (a: { id: string; name: string; color: string }) => ({
                  agentId: a.id, name: a.name, color: a.color, text: '', done: false,
                })
              )
              setRounds(prev => prev.map(r =>
                r.id === roundId ? { ...r, responses: initialResponses } : r
              ))
            } else if (event.type === 'delta') {
              setRounds(prev => prev.map(r => {
                if (r.id !== roundId) return r
                const now = Date.now()
                const responses = r.responses.map(resp =>
                  resp.agentId === event.agentId
                    ? {
                        ...resp,
                        text: resp.text + event.text,
                        startedAt: resp.startedAt ?? now,
                      }
                    : resp
                )
                return { ...r, responses }
              }))
            } else if (event.type === 'done') {
              if (event.text) {
                setRounds(prev => prev.map(r => {
                  if (r.id !== roundId) return r
                  const responses = r.responses.map(resp =>
                    resp.agentId === event.agentId
                      ? { ...resp, text: event.text }
                      : resp
                  )
                  return { ...r, responses }
                }))
              }
            } else if (event.type === 'agent-end') {
              setRounds(prev => prev.map(r => {
                if (r.id !== roundId) return r
                const responses = r.responses.map(resp =>
                  resp.agentId === event.agentId ? { ...resp, done: true } : resp
                )
                return { ...r, responses }
              }))
            } else if (event.type === 'agent-error') {
              setRounds(prev => prev.map(r => {
                if (r.id !== roundId) return r
                const responses = r.responses.map(resp =>
                  resp.agentId === event.agentId
                    ? { ...resp, error: event.message, done: true }
                    : resp
                )
                return { ...r, responses }
              }))
            } else if (event.type === 'synthesis-start') {
              setRounds(prev => prev.map(r =>
                r.id === roundId ? { ...r, synthesis: { text: '', done: false } } : r
              ))
            } else if (event.type === 'synthesis-delta') {
              setRounds(prev => prev.map(r => {
                if (r.id !== roundId || !r.synthesis) return r
                return { ...r, synthesis: { ...r.synthesis, text: r.synthesis.text + event.text } }
              }))
            } else if (event.type === 'synthesis-done') {
              setRounds(prev => prev.map(r => {
                if (r.id !== roundId) return r
                const finalText = event.text || r.synthesis?.text || ''
                return { ...r, synthesis: { text: finalText, done: true } }
              }))
            } else if (event.type === 'end') {
              setRounds(prev => prev.map(r =>
                r.id === roundId ? { ...r, finished: true } : r
              ))
            }
          } catch {}
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setRounds(prev => prev.map(r =>
          r.id === roundId ? { ...r, finished: true } : r
        ))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [streaming])

  const stop = useCallback(() => {
    abortRef.current?.()
    setStreaming(false)
    setRounds(prev => prev.map(r => ({
      ...r,
      finished: true,
      responses: r.responses.map(resp => ({ ...resp, done: true })),
      synthesis: r.synthesis ? { ...r.synthesis, done: true } : null,
    })))
  }, [])

  const clear = useCallback(() => {
    setRounds([])
    localStorage.removeItem(COUNCIL_STORAGE_KEY)
  }, [])

  return { rounds, streaming, ask, stop, clear }
}
