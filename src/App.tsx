import { useState } from 'react'
import { useAgents } from './hooks/useAgents'
import AgentWorkspace, { LogsTab } from './components/AgentWorkspace'
import CouncilView from './components/CouncilView'
import ApiSettings from './components/ApiSettings'
import { getApiBase } from './lib/api'
import { t, type Lang } from './lib/i18n'

type TopTab = string

// Neon colors mapped to agent color keys
const NEON_MAP: Record<string, string> = {
  green: '#00ff88',
  blue: '#00d4ff',
  orange: '#ff9500',
  purple: '#bf5fff',
  gray: '#6b7280',
}

export default function App() {
  const [lang, setLang] = useState<Lang>('zh')
  const [tab, setTab] = useState<TopTab>('')
  const [apiBase, setApiBase] = useState(getApiBase())
  const agents = useAgents()

  const activeTab = tab || 'council'
  const isConnected = agents.length > 0

  return (
    <div className="min-h-screen flex flex-col circuit-bg" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Background animation layers */}
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="bg-scan" />
      <Particles />

      {/* Header */}
      <header className="flex-shrink-0 px-6 py-3" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border)', background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Rothko-style color field painting */}
            <div style={{ width: 32, height: 28, flexShrink: 0, overflow: 'hidden', borderRadius: 1 }}>
              <svg width="32" height="28" viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="rko-blur">
                    <feGaussianBlur stdDeviation="1.2" />
                  </filter>
                  <filter id="rko-edge-blur">
                    <feGaussianBlur stdDeviation="0.6" />
                  </filter>
                </defs>
                {/* Dark background field */}
                <rect width="32" height="28" fill="#1a0a0a" />
                {/* Top color band — deep crimson */}
                <rect x="1" y="1" width="30" height="11" fill="#8b1a1a" filter="url(#rko-blur)" opacity="0.95" />
                <rect x="2" y="1.5" width="28" height="10" fill="#b52020" filter="url(#rko-edge-blur)" opacity="0.7" />
                {/* Middle thin gap — nearly invisible */}
                {/* Bottom color band — warm ochre/orange */}
                <rect x="1" y="14" width="30" height="12" fill="#c45a00" filter="url(#rko-blur)" opacity="0.92" />
                <rect x="2" y="14.5" width="28" height="11" fill="#e06820" filter="url(#rko-edge-blur)" opacity="0.65" />
                {/* Soft luminous center glow */}
                <rect x="4" y="10" width="24" height="8" fill="#ff8830" filter="url(#rko-blur)" opacity="0.25" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-sm font-bold uppercase tracking-widest"
                style={{ fontFamily: 'Orbitron, monospace', color: 'var(--fg)' }}
              >
                {t(lang, 'appName')}
              </span>
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>
                // {t(lang, 'appSub')}
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              className="cyber-clip-sm text-xs px-3 py-1 uppercase tracking-widest transition-all"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                border: '1px solid var(--border)',
                color: 'var(--fg-dim)',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--glow-sm)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-dim)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>

            {/* Settings */}
            <button
              onClick={() => setTab('settings')}
              className="cyber-clip-sm text-xs px-3 py-1 uppercase tracking-widest transition-all"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                border: activeTab === 'settings' ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: activeTab === 'settings' ? 'var(--accent)' : 'var(--fg-dim)',
                background: activeTab === 'settings' ? 'var(--accent-dim)' : 'transparent',
                boxShadow: activeTab === 'settings' ? 'var(--glow-sm)' : 'none',
              }}
            >
              {t(lang, 'settings')}
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-1.5 pl-2" style={{ borderLeft: '1px solid var(--border)' }}>
              <div
                className={isConnected ? 'animate-pulse' : ''}
                style={{
                  width: 6, height: 6, borderRadius: 0,
                  background: isConnected ? 'var(--accent)' : 'var(--fg-dim)',
                  boxShadow: isConnected ? 'var(--glow-sm)' : 'none',
                  transform: 'rotate(45deg)',
                }}
              />
              <span className="text-xs uppercase tracking-widest" style={{ color: isConnected ? 'var(--accent)' : 'var(--fg-dim)', fontSize: 10 }}>
                {isConnected ? t(lang, 'connected') : t(lang, 'disconnected')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 px-6 overflow-x-auto" style={{ position: 'sticky', top: 45, zIndex: 49, borderBottom: '1px solid var(--border)', background: 'rgba(18,18,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto flex">

          {/* Council — first, special style */}
          <TabButton
            active={activeTab === 'council'}
            onClick={() => setTab('council')}
            neonColor="#818cf8"
          >
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono' }}>⬡</span>
            <span>{t(lang, 'council')}</span>
            <span className="hidden sm:inline text-xs opacity-40 tracking-wider">{t(lang, 'councilSub')}</span>
          </TabButton>

          {/* Agent tabs — or disconnected hint */}
          {agents.filter(a => a.id !== 'council-master').length === 0 && (
            <button
              onClick={() => setTab('settings')}
              className="flex items-center gap-1.5 px-4 py-3 text-xs uppercase tracking-widest whitespace-nowrap flex-shrink-0"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: '#ff6688',
                opacity: 0.7,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 9 }}>⚠</span>
              <span>{lang === 'zh' ? '未连接 server — 点击配置' : 'No server — click to configure'}</span>
            </button>
          )}
          {agents.filter(a => a.id !== 'council-master').map(agent => {
            const neon = NEON_MAP[agent.color] || NEON_MAP.gray
            return (
              <TabButton
                key={agent.id}
                active={activeTab === agent.id}
                onClick={() => setTab(agent.id)}
                neonColor={neon}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 0,
                    background: neon,
                    transform: 'rotate(45deg)',
                    flexShrink: 0,
                    display: 'inline-block',
                    boxShadow: activeTab === agent.id ? `0 0 6px ${neon}` : 'none',
                  }}
                />
                <span>{agent.name}</span>
                {lang === 'zh' && (
                  <span className="hidden sm:inline text-xs opacity-35 tracking-wider">
                    {t(lang, `agentDesc.${agent.id}`)}
                  </span>
                )}
              </TabButton>
            )
          })}

          {/* Logs — push right */}
          <TabButton
            active={activeTab === 'logs'}
            onClick={() => setTab('logs')}
            neonColor="var(--fg-dim)"
            className="ml-auto"
          >
            <span>{t(lang, 'logs')}</span>
          </TabButton>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ position: 'relative', zIndex: 2 }}>
        {activeTab === 'settings' ? (
          <SettingsPanel lang={lang} apiBase={apiBase} onSave={() => {
            setApiBase(getApiBase())
            setTab('council')
            window.location.reload()
          }} />
        ) : activeTab === 'council' ? (
          <CouncilView lang={lang} />
        ) : activeTab === 'logs' ? (
          <div className="max-w-6xl mx-auto px-6 py-6">
            <LogsTab lang={lang} />
          </div>
        ) : (
          agents.filter(a => a.id !== 'council-master').map(agent => (
            <div key={agent.id} className={activeTab === agent.id ? 'h-full' : 'hidden'}>
              <AgentWorkspace agent={agent} lang={lang} />
            </div>
          ))
        )}

        {/* No agents state */}
        {agents.length === 0 && !['settings', 'logs', 'council'].includes(activeTab) && (
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="text-center py-16 space-y-4">
              <p className="text-sm terminal-prefix" style={{ color: 'var(--fg-dim)' }}>{t(lang, 'noAgent')}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-dim)', opacity: 0.6 }}>{t(lang, 'noAgentHint')}</p>
              <button
                onClick={() => setTab('settings')}
                className="text-xs uppercase tracking-widest transition-all"
                style={{ color: 'var(--accent)', textShadow: '0 0 8px var(--accent)' }}
              >
                {t(lang, 'goSettings')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  neonColor,
  children,
  className = '',
}: {
  active: boolean
  onClick: () => void
  neonColor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest whitespace-nowrap flex-shrink-0 transition-all relative ${className}`}
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        color: active ? neonColor : 'var(--fg-dim)',
        textShadow: active ? `0 0 8px ${neonColor}` : 'none',
        borderBottom: active ? `2px solid ${neonColor}` : '2px solid transparent',
        background: active ? `${neonColor}08` : 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ lang, apiBase, onSave }: { lang: Lang; apiBase: string; onSave: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="max-w-lg space-y-6">
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-1"
            style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', textShadow: '0 0 8px var(--accent)' }}
          >
            // API_CONNECTION
          </h2>
          <p className="text-xs" style={{ color: 'var(--fg-dim)' }}>
            {lang === 'zh' ? '配置工作台连接的 API server 地址' : 'Configure the API server URL for the workbench'}
          </p>
        </div>

        <ApiSettings onSave={onSave} />

        <div className="p-4 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
            &gt; ngrok {lang === 'zh' ? '快速启动' : 'quick_start'}
          </p>
          <pre className="text-xs leading-relaxed" style={{ color: 'var(--fg-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {lang === 'zh'
              ? `# 1. 安装 ngrok (一次性)\nbrew install ngrok\n\n# 2. 每次使用前启动\nnpm run server  # 终端1\nngrok http 3001  # 终端2\n\n# 3. 复制 Forwarding URL 填到上方`
              : `# 1. Install ngrok (one-time)\nbrew install ngrok\n\n# 2. Start before each session\nnpm run server  # terminal 1\nngrok http 3001  # terminal 2\n\n# 3. Paste the Forwarding URL above`
            }
          </pre>
        </div>

        <p className="text-xs" style={{ color: 'var(--fg-dim)', fontFamily: 'JetBrains Mono', opacity: 0.5 }}>
          &gt; current: {apiBase || '(local proxy)'}
        </p>
      </div>
    </div>
  )
}

// ── Background Particles ──────────────────────────────────────────────────────

const PARTICLE_DEFS = [
  { x: '8%',  y: '15%', color: '#00ff88', size: 3, dur: '6s',  delay: '0s'   },
  { x: '22%', y: '72%', color: '#00d4ff', size: 2, dur: '9s',  delay: '1.5s' },
  { x: '45%', y: '30%', color: '#bf5fff', size: 2, dur: '7s',  delay: '3s'   },
  { x: '67%', y: '85%', color: '#00ff88', size: 3, dur: '11s', delay: '0.8s' },
  { x: '78%', y: '20%', color: '#ff9500', size: 2, dur: '8s',  delay: '2.2s' },
  { x: '90%', y: '55%', color: '#00d4ff', size: 2, dur: '10s', delay: '4s'   },
  { x: '33%', y: '60%', color: '#ff9500', size: 2, dur: '7.5s',delay: '1s'   },
  { x: '55%', y: '45%', color: '#bf5fff', size: 3, dur: '12s', delay: '2.8s' },
  { x: '13%', y: '88%', color: '#00ff88', size: 2, dur: '9.5s',delay: '3.5s' },
  { x: '84%', y: '38%', color: '#00d4ff', size: 2, dur: '6.5s',delay: '0.3s' },
  { x: '3%',  y: '50%', color: '#bf5fff', size: 2, dur: '13s', delay: '5s'   },
  { x: '60%', y: '10%', color: '#00ff88', size: 2, dur: '8.5s',delay: '1.8s' },
]

function Particles() {
  return (
    <div className="bg-particles">
      {PARTICLE_DEFS.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            transform: 'rotate(45deg)',
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `particleFade ${p.dur} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
