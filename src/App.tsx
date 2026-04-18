import { useState } from 'react'
import { useAgents, useSkills } from './hooks/useAgents'
import AgentCard from './components/AgentCard'
import SkillsPanel from './components/SkillsPanel'
import LogStream from './components/LogStream'
import ApiSettings from './components/ApiSettings'
import { getApiBase } from './lib/api'

type Tab = 'agents' | 'skills' | 'logs' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('agents')
  const [apiBase, setApiBase] = useState(getApiBase())
  const agents = useAgents()
  const skills = useSkills()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'agents', label: 'Agents', count: agents.length },
    { id: 'skills', label: 'Skills', count: skills.length },
    { id: 'logs', label: 'Live Logs' },
    { id: 'settings', label: 'Settings' },
  ]

  const isConnected = agents.length > 0

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
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <span className="text-xs text-white/40 font-mono">
              {apiBase ? apiBase.replace('https://', '').slice(0, 24) + '…' : ':3001'}
            </span>
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
              <div className="text-center py-12 space-y-3">
                <p className="text-white/30 text-sm">无法连接 API server</p>
                <p className="text-white/20 text-xs">
                  本地：确保 <code className="text-white/40 bg-white/5 px-1 rounded">npm run server</code> 在跑
                  <br />
                  公网：在 Settings 填入 ngrok 地址
                </p>
                <button onClick={() => setTab('settings')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  → 去设置 API 地址
                </button>
              </div>
            ) : (
              agents.map(agent => <AgentCard key={agent.id} agent={agent} />)
            )}
          </div>
        )}

        {tab === 'skills' && <SkillsPanel skills={skills} />}

        {tab === 'logs' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30">
              Streaming events from Claude Watch hook server. Requires the bridge to be running.
            </p>
            <LogStream />
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-lg space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">API Connection</h2>
              <p className="text-xs text-white/40">配置工作台连接的 API server 地址</p>
            </div>
            <ApiSettings onSave={() => {
              setApiBase(getApiBase())
              setTab('agents')
              window.location.reload()
            }} />
            <div className="border border-white/8 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-white/60">ngrok 快速启动</p>
              <code className="block text-xs text-white/40 bg-white/[0.03] rounded-lg p-3 font-mono leading-relaxed">
                # 1. 安装 ngrok (一次性)<br />
                brew install ngrok<br />
                <br />
                # 2. 每次使用前启动<br />
                npm run server  # 终端1<br />
                ngrok http 3001  # 终端2<br />
                <br />
                # 3. 复制 Forwarding URL 填到上方
              </code>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
