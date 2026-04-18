import { useState } from 'react'
import type { Agent } from '../hooks/useAgents'
import { useMemory } from '../hooks/useAgents'
import MemoryPanel from './MemoryPanel'

const COLOR_MAP: Record<string, string> = {
  blue: '#6366f1',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  gray: '#6b7280',
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const memory = useMemory(showMemory ? agent.id : '')
  const color = COLOR_MAP[agent.color] || COLOR_MAP.gray

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 cursor-pointer"
      style={{ borderColor: expanded ? `${color}40` : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">{agent.name}</span>
            <span className="text-xs text-white/30 font-mono">{agent.model}</span>
          </div>
        </div>
        <span className="text-white/20 text-xs">{expanded ? '↑' : '↓'}</span>
      </div>

      {/* Description preview */}
      <p className="text-xs text-white/40 mt-2 leading-relaxed line-clamp-2">
        {agent.description.split('Trigger keywords:')[0].trim()}
      </p>

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 border-t border-white/8 pt-4" onClick={e => e.stopPropagation()}>
          {/* Actions */}
          <div className="flex gap-2 mb-4">
            {agent.hasMemory && (
              <button
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                onClick={() => setShowMemory(m => !m)}
              >
                {showMemory ? 'Hide Memory' : 'View Memory'}
              </button>
            )}
          </div>

          {/* Memory panel */}
          {showMemory && memory.length > 0 && (
            <MemoryPanel agentId={agent.id} files={memory} />
          )}
        </div>
      )}
    </div>
  )
}
