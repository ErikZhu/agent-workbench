import { useState } from 'react'
import { useAgents, useSkills } from './hooks/useAgents'
import AgentCard from './components/AgentCard'
import SkillsPanel from './components/SkillsPanel'
import LogStream from './components/LogStream'

type Tab = 'agents' | 'skills' | 'logs'

export default function App() {
  const agents = useAgents()
  const skills = useSkills()
  const [tab, setTab] = useState<Tab>('agents')

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'agents', label: 'Agents', count: agents.length },
    { id: 'skills', label: 'Skills', count: skills.length },
    { id: 'logs', label: 'Live Logs' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold">A</div>
            <span className="font-semibold text-white">Agent Workbench</span>
            <span className="text-xs text-white/30 font-mono">Erik's Claude System</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/40">API :3001</span>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <div className="border-b border-white/8 px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${tab === t.id ? 'border-white/60 text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs bg-white/8 text-white/40 px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'agents' && (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <div className="text-white/30 text-sm text-center py-12">
                Loading agents… (make sure <code className="text-white/50 bg-white/5 px-1.5 py-0.5 rounded">npm run server</code> is running)
              </div>
            ) : (
              agents.map(agent => <AgentCard key={agent.id} agent={agent} />)
            )}
          </div>
        )}

        {tab === 'skills' && (
          <SkillsPanel skills={skills} />
        )}

        {tab === 'logs' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30">
              Streaming events from Claude Watch hook server. Requires the bridge to be running.
            </p>
            <LogStream />
          </div>
        )}
      </main>
    </div>
  )
}
