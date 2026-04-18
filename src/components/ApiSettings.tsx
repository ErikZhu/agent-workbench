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
    <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-4">
      <div>
        <p className="text-sm font-medium text-white mb-1">API Server URL</p>
        <p className="text-xs text-white/40 leading-relaxed">
          本地开发留空（走 Vite proxy）。公网访问时填入 ngrok 地址，例如{' '}
          <code className="text-white/60 bg-white/5 px-1 rounded">https://xxxx.ngrok-free.app</code>
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://xxxx.ngrok-free.app"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors"
        />
        <button
          onClick={save}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
        {url && (
          <button onClick={clear} className="px-3 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-sm transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="text-xs text-white/25 font-mono">
        Current: {getApiBase() || '(local proxy)'}
      </div>
    </div>
  )
}
