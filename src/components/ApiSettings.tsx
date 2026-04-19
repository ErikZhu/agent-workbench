import { useState } from 'react'
import { getApiBase } from '../lib/api'

export default function ApiSettings({ onSave }: { onSave: () => void }) {
  const [url, setUrl] = useState(getApiBase())
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('apiBase', url.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onSave() }, 800)
  }

  function clear() {
    localStorage.removeItem('apiBase')
    setUrl('')
    onSave()
  }

  return (
    <div className="p-5 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)', fontFamily: 'Orbitron, monospace' }}>
          API_SERVER_URL
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-dim)' }}>
          本地开发留空（走 Vite proxy）。公网访问填入 ngrok 地址：
          <code className="ml-1 px-1" style={{ color: 'var(--accent3)', background: 'rgba(0,212,255,0.08)' }}>
            https://xxxx.ngrok-free.app
          </code>
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            style={{ color: 'var(--accent)', opacity: 0.6, fontFamily: 'JetBrains Mono' }}
          >
            &gt;
          </span>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://xxxx.ngrok-free.app"
            className="w-full outline-none text-sm transition-all"
            style={{
              paddingLeft: 24, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,255,136,0.25)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        <button
          onClick={save}
          className="cyber-clip-sm text-xs uppercase tracking-widest px-4 py-2 font-bold transition-all flex-shrink-0"
          style={{
            border: '1px solid var(--accent)',
            background: saved ? 'var(--accent)' : 'var(--accent-dim)',
            color: saved ? 'var(--bg)' : 'var(--accent)',
            fontFamily: 'JetBrains Mono, monospace',
            boxShadow: 'var(--glow-sm)',
          }}
        >
          {saved ? '✓ OK' : 'SAVE'}
        </button>
        {url && (
          <button
            onClick={clear}
            className="cyber-clip-sm text-xs uppercase tracking-widest px-3 py-2 transition-all flex-shrink-0"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--fg-dim)',
              background: 'transparent',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff3366'; (e.currentTarget as HTMLButtonElement).style.color = '#ff6688' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-dim)' }}
          >
            CLR
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--fg-dim)', opacity: 0.4, fontFamily: 'JetBrains Mono' }}>
        &gt; current: {getApiBase() || '(local proxy)'}
      </p>
    </div>
  )
}
