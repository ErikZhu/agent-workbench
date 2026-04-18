import { useState } from 'react'
import type { MemoryFile } from '../hooks/useAgents'

const TYPE_COLOR: Record<string, string> = {
  user: '#6366f1',
  feedback: '#f97316',
  project: '#22c55e',
  reference: '#a855f7',
  note: '#6b7280',
}

export default function MemoryPanel({ agentId, files }: { agentId: string; files: MemoryFile[] }) {
  const [selected, setSelected] = useState<MemoryFile | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function openFile(f: MemoryFile) {
    setSelected(f)
    setDraft(f.body)
    setEditing(false)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/memory/${agentId}/${selected.file}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft }),
    })
    setSaving(false)
    setEditing(false)
    selected.body = draft
  }

  return (
    <div className="flex gap-3 mt-2" style={{ height: 280 }}>
      {/* File list */}
      <div className="w-44 flex-shrink-0 overflow-y-auto space-y-1">
        {files.map(f => (
          <button
            key={f.file}
            onClick={() => openFile(f)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selected?.file === f.file ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[f.type] || TYPE_COLOR.note }} />
              <span className="truncate">{f.name || f.file}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border border-white/8 rounded-xl overflow-hidden flex flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
              <span className="text-xs text-white/40">{selected.file}</span>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="text-xs text-white/30 hover:text-white/60">Cancel</button>
                    <button onClick={save} disabled={saving} className="text-xs text-indigo-400 hover:text-indigo-300">{saving ? 'Saving…' : 'Save'}</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs text-white/30 hover:text-white/60">Edit</button>
                )}
              </div>
            </div>
            {editing ? (
              <textarea
                className="flex-1 w-full bg-transparent text-xs text-white/70 p-3 resize-none outline-none font-mono leading-relaxed"
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
            ) : (
              <pre className="flex-1 overflow-y-auto p-3 text-xs text-white/60 font-mono leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </pre>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-white/20">
            Select a memory file
          </div>
        )}
      </div>
    </div>
  )
}
