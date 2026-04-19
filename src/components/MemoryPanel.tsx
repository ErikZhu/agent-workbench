import { useState } from 'react'
import type { MemoryFile } from '../hooks/useAgents'
import { apiUrl } from '../lib/api'
import { t, type Lang } from '../lib/i18n'

const TYPE_COLOR: Record<string, string> = {
  user: '#6366f1',
  feedback: '#f97316',
  project: '#22c55e',
  reference: '#a855f7',
  note: '#6b7280',
}

export default function MemoryPanel({
  agentId,
  files,
  lang = 'zh',
}: {
  agentId: string
  files: MemoryFile[]
  lang?: Lang
}) {
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
    await fetch(apiUrl(`/api/memory/${agentId}/${selected.file}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft }),
    })
    setSaving(false)
    setEditing(false)
    selected.body = draft
  }

  if (files.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-white/20 text-sm">{t(lang, 'memory.noFiles')}</p>
      </div>
    )
  }

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 260px)', minHeight: 320 }}>
      {/* File list */}
      <div className="w-48 flex-shrink-0 overflow-y-auto space-y-0.5">
        {files.map(f => {
          const typeColor = TYPE_COLOR[f.type] || TYPE_COLOR.note
          const isActive = selected?.file === f.file
          return (
            <button
              key={f.file}
              onClick={() => openFile(f)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                <span className="truncate font-medium">{f.name || f.file}</span>
              </div>
              <div className="ml-3.5 mt-0.5 text-white/25 truncate">{f.description}</div>
            </button>
          )
        })}
      </div>

      {/* Content pane */}
      <div className="flex-1 min-w-0 border border-white/8 rounded-xl overflow-hidden flex flex-col">
        {selected ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: TYPE_COLOR[selected.type] || TYPE_COLOR.note }}
                />
                <span className="text-xs text-white/50 font-mono truncate">{selected.file}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-white/30 font-mono flex-shrink-0"
                  style={{ background: `${TYPE_COLOR[selected.type] || TYPE_COLOR.note}18` }}
                >
                  {t(lang, `memory.types.${selected.type}`) || selected.type}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      {t(lang, 'memory.cancel')}
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      {saving ? t(lang, 'memory.saving') : t(lang, 'memory.save')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    {t(lang, 'memory.edit')}
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            {editing ? (
              <textarea
                className="flex-1 w-full bg-transparent text-xs text-white/70 p-4 resize-none outline-none font-mono leading-relaxed"
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
            ) : (
              <pre className="flex-1 overflow-y-auto p-4 text-xs text-white/60 font-mono leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </pre>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-white/20">
            {t(lang, 'memory.selectFile')}
          </div>
        )}
      </div>
    </div>
  )
}
