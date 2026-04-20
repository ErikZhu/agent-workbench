import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useCouncil, type AgentResponse, type CouncilRound, type SynthesisState } from '../hooks/useCouncil'
import VoiceButton from './VoiceButton'
import { t, type Lang } from '../lib/i18n'

const NEON_MAP: Record<string, string> = {
  green: '#00ff88',
  blue: '#00d4ff',
  orange: '#ff9500',
  purple: '#bf5fff',
  gray: '#6b7280',
}

const SYNTHESIS_COLOR = '#818cf8'

function getNeon(colorName: string): string {
  return NEON_MAP[colorName] || '#00d4ff'
}

// ── Anchor nav types ──────────────────────────────────────────────────────────

interface AnchorItem {
  id: string        // DOM element id to scroll to
  label: string
  color: string
  type: 'question' | 'agent' | 'synthesis'
  done?: boolean
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function CouncilView({ lang }: { lang: Lang }) {
  const { rounds, streaming, ask, stop, clear } = useCouncil()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rounds])

  function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    ask(text)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleVoice(text: string) {
    setInput(prev => (prev ? prev + ' ' : '') + text)
    textareaRef.current?.focus()
  }

  function scrollToAnchor(id: string) {
    const el = document.getElementById(id)
    if (!el || !scrollRef.current) return
    const container = scrollRef.current
    const top = el.offsetTop - 16
    container.scrollTo({ top, behavior: 'smooth' })
  }

  // Build anchor list from all rounds
  const anchors: AnchorItem[] = rounds.flatMap(round => {
    const items: AnchorItem[] = [
      { id: `q-${round.id}`, label: round.question.slice(0, 18) + (round.question.length > 18 ? '…' : ''), color: 'rgba(255,255,255,0.6)', type: 'question', done: true },
    ]
    const ordered = [...round.responses].sort((a, b) => (a.startedAt ?? Infinity) - (b.startedAt ?? Infinity))
    for (const r of ordered) {
      items.push({ id: `a-${round.id}-${r.agentId}`, label: r.name, color: getNeon(r.color), type: 'agent', done: r.done })
    }
    if (round.synthesis) {
      items.push({ id: `s-${round.id}`, label: 'SYNTHESIS', color: SYNTHESIS_COLOR, type: 'synthesis', done: round.synthesis.done })
    }
    return items
  })

  return (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 90px)' }}>

      {/* Main scroll area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header bar */}
        <div className="flex-shrink-0 px-6 pt-5 pb-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2
                className="text-sm font-black uppercase tracking-widest"
                style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', textShadow: 'var(--glow-sm)' }}
              >
                {t(lang, 'councilView.title')}
              </h2>
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--fg-dim)', letterSpacing: '0.08em' }}>
                // {t(lang, 'councilView.subtitle')}
              </span>
            </div>
            {rounds.length > 0 && (
              <button
                className="text-xs uppercase tracking-widest transition-all"
                style={{ color: 'var(--fg-dim)', opacity: 0.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff3366'; (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-dim)'; (e.currentTarget as HTMLButtonElement).style.opacity = '0.5' }}
                onClick={clear}
              >
                [ {t(lang, 'councilView.clear')} ]
              </button>
            )}
          </div>
          <hr className="cyber-hr mt-3 max-w-2xl mx-auto" />
        </div>

        {/* Rounds scroll container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
          <div className="max-w-2xl mx-auto space-y-10 pb-6">
            {rounds.length === 0 ? (
              <CouncilEmpty lang={lang} />
            ) : (
              rounds.map(round => (
                <CouncilRoundView key={round.id} round={round} lang={lang} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'rgba(10,10,15,0.9)' }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <span
                  className="absolute left-3 top-3 text-xs pointer-events-none select-none"
                  style={{ color: 'var(--accent)', opacity: 0.7, fontFamily: 'JetBrains Mono' }}
                >
                  ⬡
                </span>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t(lang, 'placeholder.council')}
                  rows={1}
                  className="w-full outline-none resize-none text-sm leading-relaxed transition-all"
                  style={{
                    paddingLeft: 28, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    fontFamily: 'JetBrains Mono, monospace',
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,255,136,0.3)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  onInput={e => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                  }}
                />
              </div>

              <VoiceButton lang={lang} onTranscript={handleVoice} disabled={streaming} />

              {streaming ? (
                <button
                  onClick={stop}
                  className="cyber-clip-sm flex-shrink-0 text-xs uppercase tracking-widest px-4 h-10 transition-all"
                  style={{ border: '1px solid #ff336660', color: '#ff6688', background: '#ff336510' }}
                >
                  {t(lang, 'councilView.stop')}
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="cyber-clip-sm flex-shrink-0 text-xs font-bold uppercase tracking-widest px-5 h-10 transition-all"
                  style={{
                    border: input.trim() ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: input.trim() ? 'var(--bg)' : 'var(--fg-dim)',
                    background: input.trim() ? 'var(--accent)' : 'transparent',
                    boxShadow: input.trim() ? 'var(--glow)' : 'none',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.35,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {t(lang, 'councilView.send')}
                </button>
              )}
            </div>
            <p className="text-xs mt-2 pl-1 uppercase tracking-wider" style={{ color: 'var(--fg-dim)', opacity: 0.35, fontSize: 10 }}>
              {t(lang, 'councilView.hint')}
            </p>
          </div>
        </div>
      </div>

      {/* Right anchor nav */}
      {anchors.length > 0 && (
        <AnchorNav anchors={anchors} onClickAnchor={scrollToAnchor} />
      )}
    </div>
  )
}

// ── Right-side anchor navigation ──────────────────────────────────────────────

function AnchorNav({ anchors, onClickAnchor }: { anchors: AnchorItem[]; onClickAnchor: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      className="flex-shrink-0 flex flex-col items-center py-6 gap-0"
      style={{ width: 48, borderLeft: '1px solid var(--border)', background: 'rgba(10,10,15,0.6)', overflowY: 'auto' }}
    >
      {anchors.map((anchor, i) => {
        const isQ = anchor.type === 'question'
        const isS = anchor.type === 'synthesis'
        const isHovered = hovered === anchor.id
        const size = isQ ? 8 : isS ? 7 : 6

        return (
          <div key={anchor.id} className="flex flex-col items-center">
            {/* Connector line above (skip first) */}
            {i > 0 && (
              <div style={{ width: 1, height: 12, background: `${anchors[i - 1].color}30` }} />
            )}

            {/* Milestone dot */}
            <button
              title={anchor.label}
              onClick={() => onClickAnchor(anchor.id)}
              onMouseEnter={() => setHovered(anchor.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'relative',
                width: size + 8,
                height: size + 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  background: anchor.done ? anchor.color : 'transparent',
                  border: `1.5px solid ${anchor.color}`,
                  transform: isQ ? 'none' : 'rotate(45deg)',
                  borderRadius: isQ ? '50%' : 0,
                  boxShadow: isHovered
                    ? `0 0 8px ${anchor.color}, 0 0 16px ${anchor.color}60`
                    : anchor.done
                    ? `0 0 4px ${anchor.color}80`
                    : 'none',
                  transition: 'box-shadow 0.15s',
                  animation: !anchor.done ? 'neonPulse 1.2s ease-in-out infinite' : 'none',
                }}
              />

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    right: 'calc(100% + 8px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--card)',
                    border: `1px solid ${anchor.color}40`,
                    color: anchor.color,
                    padding: '3px 8px',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                    zIndex: 100,
                    clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)',
                    boxShadow: `0 0 8px ${anchor.color}30`,
                  }}
                >
                  {anchor.label}
                </div>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function CouncilEmpty({ lang }: { lang: Lang }) {
  const agentNeons = ['#00ff88', '#00d4ff', '#ff9500', '#bf5fff']
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-6">
        <div className="flex justify-center items-center -space-x-2">
          {agentNeons.map((neon, i) => (
            <div
              key={i}
              style={{
                width: 32, height: 32,
                background: `${neon}10`,
                border: `1px solid ${neon}40`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                zIndex: i,
              }}
            />
          ))}
        </div>
        <div>
          <p
            className="text-xs font-black uppercase tracking-widest cyber-cursor"
            style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', textShadow: 'var(--glow-sm)' }}
          >
            {t(lang, 'councilView.title')}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--fg-dim)', opacity: 0.5 }}>
            {t(lang, 'councilView.subtitle')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Round ─────────────────────────────────────────────────────────────────────

function CouncilRoundView({ round, lang }: { round: CouncilRound; lang: Lang }) {
  const orderedResponses = [...round.responses].sort((a, b) => (a.startedAt ?? Infinity) - (b.startedAt ?? Infinity))

  return (
    <div className="space-y-3">
      {/* User question — right-aligned, bright distinct style */}
      <div id={`q-${round.id}`} className="flex justify-end">
        <div
          className="max-w-[70%] text-sm leading-relaxed whitespace-pre-wrap px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderLeft: '3px solid rgba(255,255,255,0.7)',
            color: '#f0f0f0',
            clipPath: 'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
            fontWeight: 500,
          }}
        >
          {round.question}
        </div>
      </div>

      {/* Gathering indicator */}
      {!round.finished && round.responses.length === 0 && (
        <GatheringIndicator />
      )}

      {/* Agent messages — timeline / arrival order */}
      {orderedResponses.map(resp => (
        <div key={resp.agentId} id={`a-${round.id}-${resp.agentId}`}>
          <AgentMessage response={resp} lang={lang} />
        </div>
      ))}

      {/* Synthesis */}
      {round.synthesis && (
        <div id={`s-${round.id}`}>
          <SynthesisMessage synthesis={round.synthesis} lang={lang} />
        </div>
      )}
    </div>
  )
}

// ── Gathering indicator ───────────────────────────────────────────────────────

function GatheringIndicator() {
  return (
    <div className="flex items-center gap-3 pl-1 py-1">
      <span className="flex gap-1.5">
        {(['#00ff88', '#00d4ff', '#ff9500', '#bf5fff'] as const).map((c, i) => (
          <span
            key={i}
            style={{
              width: 5, height: 5, background: c, transform: 'rotate(45deg)', display: 'inline-block',
              boxShadow: `0 0 4px ${c}`,
              animation: `blink 1.2s step-end ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </span>
    </div>
  )
}

// ── Agent message (WeChat-style left-aligned, dark card) ──────────────────────

function AgentMessage({ response, lang }: { response: AgentResponse; lang: Lang }) {
  const neon = getNeon(response.color)

  return (
    <div className="flex gap-3 items-start">
      {/* Diamond avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center mt-1"
        style={{
          width: 28, height: 28,
          background: `${neon}12`,
          border: `1px solid ${neon}40`,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      >
        <div
          style={{
            width: 7, height: 7,
            background: neon,
            transform: 'rotate(45deg)',
            boxShadow: response.done ? `0 0 4px ${neon}` : `0 0 8px ${neon}, 0 0 16px ${neon}`,
            animation: !response.done ? 'neonPulse 1s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Agent name label */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ fontFamily: 'Orbitron, monospace', color: neon, textShadow: `0 0 6px ${neon}80`, fontSize: 9 }}
          >
            {response.name}
          </span>
          {!response.done && <TypingIndicator neon={neon} />}
          {response.done && response.error && (
            <span className="text-xs uppercase tracking-wider" style={{ color: '#ff3366', fontSize: 9 }}>ERR</span>
          )}
        </div>

        {/* Bubble — dark card with neon left-border accent */}
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap px-4 py-3 inline-block max-w-full"
          style={{
            background: 'var(--card)',
            border: `1px solid ${neon}18`,
            borderLeft: `2px solid ${neon}80`,
            color: response.error ? '#ff6688' : 'var(--fg)',
            opacity: response.error ? 1 : 0.85,
            clipPath: 'polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)',
            fontFamily: response.error ? 'JetBrains Mono, monospace' : undefined,
          }}
        >
          {response.error ? (
            `> ERROR: ${response.error}`
          ) : response.text ? (
            <>
              {response.text}
              {!response.done && (
                <span
                  className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
                  style={{ background: neon, boxShadow: `0 0 4px ${neon}`, animation: 'blink 1s step-end infinite' }}
                />
              )}
            </>
          ) : (
            <span className="text-xs uppercase tracking-wider" style={{ color: neon, opacity: 0.5, fontSize: 10 }}>
              {t(lang, 'councilView.thinking')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Synthesis message ─────────────────────────────────────────────────────────

function SynthesisMessage({ synthesis, lang }: { synthesis: SynthesisState; lang: Lang }) {
  return (
    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${SYNTHESIS_COLOR}20` }}>
      {/* Header badge */}
      <div className="flex items-center gap-2 mb-3">
        <div
          style={{
            width: 22, height: 22,
            background: `${SYNTHESIS_COLOR}15`,
            border: `1px solid ${SYNTHESIS_COLOR}50`,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 6, height: 6,
              background: SYNTHESIS_COLOR,
              transform: 'rotate(45deg)',
              boxShadow: synthesis.done ? `0 0 4px ${SYNTHESIS_COLOR}` : `0 0 8px ${SYNTHESIS_COLOR}, 0 0 16px ${SYNTHESIS_COLOR}`,
              animation: !synthesis.done ? 'neonPulse 1s ease-in-out infinite' : 'none',
            }}
          />
        </div>
        <span
          className="text-xs font-black uppercase tracking-widest"
          style={{ fontFamily: 'Orbitron, monospace', color: SYNTHESIS_COLOR, textShadow: `0 0 8px ${SYNTHESIS_COLOR}60`, fontSize: 9 }}
        >
          {t(lang, 'councilView.synthesisLabel')}
        </span>
        {!synthesis.done && <TypingIndicator neon={SYNTHESIS_COLOR} />}
      </div>

      {/* Content */}
      <div
        className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          background: `${SYNTHESIS_COLOR}08`,
          border: `1px solid ${SYNTHESIS_COLOR}25`,
          borderLeft: `2px solid ${SYNTHESIS_COLOR}80`,
          color: 'var(--fg)',
          opacity: 0.9,
          clipPath: 'polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)',
        }}
      >
        {synthesis.text ? (
          <>
            {synthesis.text}
            {!synthesis.done && (
              <span
                className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
                style={{ background: SYNTHESIS_COLOR, boxShadow: `0 0 4px ${SYNTHESIS_COLOR}`, animation: 'blink 1s step-end infinite' }}
              />
            )}
          </>
        ) : (
          <span className="text-xs uppercase tracking-wider" style={{ color: SYNTHESIS_COLOR, opacity: 0.6, fontSize: 10 }}>
            {t(lang, 'councilView.synthesisThinking')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ neon }: { neon: string }) {
  return (
    <span className="flex gap-1 items-center">
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          style={{
            width: 3, height: 3,
            background: neon,
            transform: 'rotate(45deg)',
            opacity: 0.6,
            boxShadow: `0 0 3px ${neon}`,
            display: 'inline-block',
            animation: `blink 1.2s step-end ${delay}s infinite`,
          }}
        />
      ))}
    </span>
  )
}
