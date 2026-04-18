import { useState } from 'react'
import type { Skill } from '../hooks/useAgents'

const AGENT_COLOR: Record<string, string> = {
  'vibe-coder': '#22c55e',
  'learn-master': '#6366f1',
  'team-biz-manager': '#f97316',
  'health-coach': '#a855f7',
}

export default function SkillsPanel({ skills }: { skills: Skill[] }) {
  const [selected, setSelected] = useState<Skill | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const agents = ['all', 'vibe-coder', 'learn-master', 'team-biz-manager', 'health-coach']
  const filtered = filter === 'all' ? skills : skills.filter(s => s.agent === filter)

  async function trigger(skill: Skill) {
    setTriggering(skill.id)
    await fetch('/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: skill.name }),
    })
    setTimeout(() => setTriggering(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {agents.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === a ? 'border-white/30 text-white bg-white/8' : 'border-white/8 text-white/40 hover:text-white/60'}`}
          >
            {a === 'all' ? 'All' : a}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(skill => {
          const color = AGENT_COLOR[skill.agent || ''] || '#6b7280'
          const isSelected = selected?.id === skill.id
          return (
            <div
              key={skill.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${isSelected ? 'border-white/20 bg-white/[0.04]' : 'border-white/8 hover:border-white/15 bg-white/[0.01]'}`}
              onClick={() => setSelected(isSelected ? null : skill)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium text-white">/{skill.name}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-2">{skill.description}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); trigger(skill) }}
                  disabled={!!triggering}
                  className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
                >
                  {triggering === skill.id ? '▶ …' : '▶'}
                </button>
              </div>

              {/* Expanded body */}
              {isSelected && (
                <pre className="mt-3 pt-3 border-t border-white/8 text-xs text-white/50 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {skill.body}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
