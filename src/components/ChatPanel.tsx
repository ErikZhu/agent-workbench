import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Agent } from '../hooks/useAgents'
import { useChat } from '../hooks/useChat'
import VoiceButton from './VoiceButton'
import { t, type Lang } from '../lib/i18n'

const NEON_MAP: Record<string, string> = {
  green: '#00ff88',
  blue: '#00d4ff',
  orange: '#ff9500',
  purple: '#bf5fff',
  gray: '#6b7280',
}

export default function ChatPanel({ agent, lang }: { agent: Agent; lang: Lang }) {
  const neon = NEON_MAP[agent.color] || NEON_MAP.gray
  const { messages, streaming, error, send, stop, clear, clearError } = useChat(agent.id)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    send(text)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleVoiceTranscript(text: string) {
    setInput(prev => prev ? prev + ' ' + text : text)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 240px)', minHeight: 360 }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-2 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              {/* Agent diamond icon */}
              <div className="flex justify-center">
                <div
                  className="cyber-clip flex items-center justify-center"
                  style={{
                    width: 44, height: 44,
                    border: `1px solid ${neon}40`,
                    background: `${neon}0a`,
                  }}
                >
                  <div style={{ width: 10, height: 10, background: neon, transform: 'rotate(45deg)', boxShadow: `0 0 8px ${neon}` }} />
                </div>
              </div>
              <div>
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ fontFamily: 'Orbitron, monospace', color: neon, textShadow: `0 0 8px ${neon}` }}
                >
                  {agent.name}
                </p>
                <p className="text-xs mt-1 cyber-cursor" style={{ color: 'var(--fg-dim)' }}>
                  {t(lang, `agentDesc.${agent.id}`)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} role={msg.role} text={msg.text} pending={msg.pending} neon={neon} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-3 px-3 py-2 text-xs flex items-center justify-between"
          style={{ border: '1px solid #ff336640', background: '#ff336610', color: '#ff6688' }}
        >
          <span>&gt; ERROR: {error}</span>
          <button onClick={clearError} style={{ color: '#ff6688', opacity: 0.6 }}>×</button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <span
              className="absolute left-3 top-3 text-xs pointer-events-none select-none"
              style={{ color: 'var(--accent)', opacity: 0.6, fontFamily: 'JetBrains Mono' }}
            >
              &gt;
            </span>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(lang, 'placeholder.chat', { name: agent.name })}
              rows={1}
              className="w-full outline-none resize-none text-sm leading-relaxed transition-all"
              style={{
                paddingLeft: 24, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                background: 'var(--card)',
                border: `1px solid var(--border)`,
                color: 'var(--fg)',
                fontFamily: 'JetBrains Mono, monospace',
                maxHeight: 120,
                overflowY: 'auto',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = neon; e.currentTarget.style.boxShadow = `0 0 0 1px ${neon}40` }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
          </div>

          <VoiceButton lang={lang} onTranscript={handleVoiceTranscript} disabled={streaming} />

          {streaming ? (
            <button
              onClick={stop}
              className="cyber-clip-sm flex-shrink-0 flex items-center justify-center text-sm transition-all"
              style={{
                width: 40, height: 40,
                border: '1px solid #ff336660',
                color: '#ff6688',
                background: '#ff336610',
              }}
              title={lang === 'zh' ? '停止' : 'Stop'}
            >
              ■
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="cyber-clip-sm flex-shrink-0 flex items-center justify-center text-sm font-bold transition-all"
              style={{
                width: 40, height: 40,
                border: input.trim() ? `1px solid ${neon}` : '1px solid var(--border)',
                background: input.trim() ? `${neon}15` : 'transparent',
                color: input.trim() ? neon : 'var(--fg-dim)',
                boxShadow: input.trim() ? `0 0 8px ${neon}40` : 'none',
                opacity: input.trim() ? 1 : 0.3,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              ↑
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-dim)', opacity: 0.4, fontSize: 10 }}>
            {lang === 'zh' ? 'ENTER 发送 // SHIFT+ENTER 换行' : 'ENTER TO SEND // SHIFT+ENTER NEWLINE'}
          </span>
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="text-xs uppercase tracking-wider transition-all"
              style={{ color: 'var(--fg-dim)', opacity: 0.4, fontSize: 10 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff3366'; (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-dim)'; (e.currentTarget as HTMLButtonElement).style.opacity = '0.4' }}
            >
              [ {lang === 'zh' ? '清空' : 'CLEAR'} ]
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ role, text, pending, neon }: { role: 'user' | 'assistant'; text: string; pending?: boolean; neon: string }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--fg)',
            clipPath: 'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
          }}
        >
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      {/* Agent indicator */}
      <div
        className="flex-shrink-0 mt-1 flex items-center justify-center"
        style={{
          width: 24, height: 24,
          border: `1px solid ${neon}40`,
          background: `${neon}0a`,
          clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))',
        }}
      >
        <div style={{ width: 6, height: 6, background: neon, transform: 'rotate(45deg)', boxShadow: `0 0 4px ${neon}` }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--fg)', opacity: 0.85 }}>
          {text || (pending && <TypingIndicator neon={neon} />)}
        </div>
        {pending && text && (
          <span
            className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
            style={{ background: neon, boxShadow: `0 0 4px ${neon}`, animation: 'blink 1s step-end infinite' }}
          />
        )}
      </div>
    </div>
  )
}

function TypingIndicator({ neon }: { neon: string }) {
  return (
    <span className="flex gap-1.5 items-center h-5">
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          style={{
            width: 4, height: 4,
            background: neon,
            transform: 'rotate(45deg)',
            opacity: 0.6,
            boxShadow: `0 0 4px ${neon}`,
            display: 'inline-block',
            animation: `blink 1.2s step-end ${delay}s infinite`,
          }}
        />
      ))}
    </span>
  )
}
