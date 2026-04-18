import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

export interface LogEntry {
  ts: number
  type: string
  tool?: string
  content?: string
  [key: string]: unknown
}

export function useLogs(maxEntries = 200) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(apiUrl('/events'))
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry
        setLogs(prev => [entry, ...prev].slice(0, maxEntries))
      } catch {}
    }
    return () => es.close()
  }, [maxEntries])

  return logs
}
