import { useLogs } from '../hooks/useLogs'

const TYPE_STYLE: Record<string, string> = {
  'tool-output': 'text-blue-400/70',
  'permission': 'text-amber-400/80',
  'stop': 'text-green-400/70',
  'error': 'text-red-400/80',
  'notification': 'text-purple-400/70',
}

export default function LogStream() {
  const logs = useLogs()

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${logs.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs text-white/50">Live Hook Stream</span>
        </div>
        <span className="text-xs text-white/20 font-mono">127.0.0.1:7860</span>
      </div>

      <div className="overflow-y-auto font-mono text-xs" style={{ height: 280 }}>
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/20">
            Waiting for events…
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-white/20 flex-shrink-0 tabular-nums">
                  {new Date(log.ts).toLocaleTimeString('en', { hour12: false })}
                </span>
                <span className={`flex-shrink-0 w-24 ${TYPE_STYLE[log.type] || 'text-white/40'}`}>
                  {log.type}
                </span>
                <span className="text-white/50 truncate">
                  {log.tool || log.content || JSON.stringify(log).slice(0, 80)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
