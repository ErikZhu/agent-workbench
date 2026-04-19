import { useState } from 'react'
import type { Agent, Skill } from '../hooks/useAgents'
import { useMemory, useSkills } from '../hooks/useAgents'
import { useLogs } from '../hooks/useLogs'
import MemoryPanel from './MemoryPanel'
import ChatPanel from './ChatPanel'
import { apiUrl } from '../lib/api'
import { t, type Lang } from '../lib/i18n'

type InnerTab = 'chat' | 'skills' | 'memory' | 'mcp' | 'harness'

// Parse MCP tools from agent body (looks for Harness section listing MCP tools)
function parseMcpTools(body: string): { name: string; allowed: boolean }[] {
  const tools: { name: string; allowed: boolean }[] = []
  const lines = body.split('\n')
  let inHarness = false
  let inAllowed = false
  let inBlocked = false

  for (const line of lines) {
    if (/^##\s*(harness|工具使用约束)/i.test(line)) { inHarness = true; continue }
    if (inHarness && /^##\s/.test(line) && !/^###/.test(line)) { inHarness = false }
    if (!inHarness) continue

    if (/允许使用|allowed/i.test(line)) { inAllowed = true; inBlocked = false; continue }
    if (/不使用|blocked|禁止/i.test(line)) { inBlocked = true; inAllowed = false; continue }
    if (/^###/.test(line)) { inAllowed = false; inBlocked = false; continue }

    const match = line.match(/[`*-]\s*[`']?([a-z][\w-]*(?:-mcp)?)[`']?/i)
    if (match) {
      const name = match[1]
      if (inAllowed) tools.push({ name, allowed: true })
      else if (inBlocked) tools.push({ name, allowed: false })
    }
  }
  return tools
}

const NEON_MAP: Record<string, string> = {
  green: '#00ff88',
  blue: '#00d4ff',
  orange: '#ff9500',
  purple: '#bf5fff',
  gray: '#6b7280',
}

export default function AgentWorkspace({ agent, lang }: { agent: Agent; lang: Lang }) {
  const [innerTab, setInnerTab] = useState<InnerTab>('chat')
  const memory = useMemory(innerTab === 'memory' ? agent.id : '')
  const allSkills = useSkills()
  const agentSkills = allSkills.filter(s => s.agent === agent.id)
  const neon = NEON_MAP[agent.color] || NEON_MAP.gray

  const innerTabs: InnerTab[] = ['chat', 'skills', 'memory', 'mcp', 'harness']

  return (
    <div className="h-full flex flex-col">
      {/* Agent identity bar + inner tabs */}
      <div className="flex-shrink-0 px-6" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(18,18,26,0.6)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Agent identity */}
          <div className="flex items-center gap-3 py-2.5">
            <div
              style={{
                width: 7, height: 7,
                background: neon,
                transform: 'rotate(45deg)',
                boxShadow: `0 0 6px ${neon}, 0 0 12px ${neon}60`,
                flexShrink: 0,
              }}
            />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace', color: neon, textShadow: `0 0 8px ${neon}` }}
            >
              {agent.name}
            </span>
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--fg-dim)', letterSpacing: '0.08em' }}>
              // {t(lang, `agentDesc.${agent.id}`)}
            </span>
            <span className="text-xs ml-auto" style={{ color: 'var(--fg-dim)', opacity: 0.4, fontFamily: 'JetBrains Mono' }}>
              {agent.model}
            </span>
          </div>

          {/* Inner sub-tabs */}
          <div className="flex">
            {innerTabs.map(tabId => (
              <button
                key={tabId}
                onClick={() => setInnerTab(tabId)}
                className="px-3 py-2 text-xs uppercase tracking-widest transition-all"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: innerTab === tabId ? neon : 'var(--fg-dim)',
                  textShadow: innerTab === tabId ? `0 0 6px ${neon}` : 'none',
                  borderBottom: innerTab === tabId ? `2px solid ${neon}` : '2px solid transparent',
                  background: innerTab === tabId ? `${neon}08` : 'transparent',
                  opacity: innerTab === tabId ? 1 : 0.5,
                }}
              >
                {t(lang, `tabs.${tabId}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-6xl mx-auto h-full">
          {innerTab === 'chat' && (
            <ChatPanel agent={agent} lang={lang} />
          )}
          {innerTab === 'skills' && (
            <SkillsTab lang={lang} skills={agentSkills} color={neon} />
          )}
          {innerTab === 'memory' && (
            <MemoryPanel agentId={agent.id} files={memory} lang={lang} />
          )}
          {innerTab === 'mcp' && (
            <McpTab lang={lang} agentBody={agent.body} color={neon} />
          )}
          {innerTab === 'harness' && (
            <HarnessTab lang={lang} agent={agent} color={neon} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Skills ──────────────────────────────────────────────────────────────────

function SkillsTab({ lang, skills, color }: { lang: Lang; skills: Skill[]; color: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggered, setTriggered] = useState<string | null>(null)

  async function trigger(skill: Skill) {
    setTriggering(skill.id)
    try {
      await fetch(apiUrl('/api/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skill.name }),
      })
    } catch {}
    setTriggering(null)
    setTriggered(skill.id)
    setTimeout(() => setTriggered(null), 2000)
  }

  if (skills.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-white/20 text-sm">{t(lang, 'skills.noSkills')}</p>
        <p className="text-white/10 text-xs font-mono">{t(lang, 'skills.noSkillsHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {skills.map(skill => {
        const isExpanded = selected === skill.id
        const isTriggering = triggering === skill.id
        const wasTriggered = triggered === skill.id
        return (
          <div
            key={skill.id}
            className={`rounded-xl border transition-all ${
              isExpanded ? 'border-white/15 bg-white/[0.04]' : 'border-white/8 hover:border-white/12 bg-white/[0.02]'
            }`}
          >
            <div
              className="flex items-start gap-3 p-4 cursor-pointer"
              onClick={() => setSelected(isExpanded ? null : skill.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-sm font-medium text-white/80 font-mono">/{skill.name}</span>
                </div>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2 ml-3.5">
                  {skill.description}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); trigger(skill) }}
                disabled={!!triggering}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  wasTriggered
                    ? 'border-green-500/40 text-green-400 bg-green-500/10'
                    : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-40'
                }`}
              >
                {isTriggering ? t(lang, 'skills.triggering') : wasTriggered ? '✓' : t(lang, 'skills.trigger')}
              </button>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4">
                <div className="border-t border-white/8 pt-3">
                  <pre className="text-xs text-white/50 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                    {skill.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── MCP ─────────────────────────────────────────────────────────────────────

function McpTab({ lang, agentBody, color }: { lang: Lang; agentBody: string; color: string }) {
  const tools = parseMcpTools(agentBody)

  const allowed = tools.filter(t => t.allowed)
  const blocked = tools.filter(t => !t.allowed)

  if (tools.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-white/20 text-sm">{t(lang, 'mcp.noTools')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Allowed */}
      {allowed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
            <span className="text-xs font-medium text-white/50">{t(lang, 'mcp.allowed')}</span>
          </div>
          <div className="space-y-1.5">
            {allowed.map(tool => (
              <div
                key={tool.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 bg-white/[0.02]"
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm font-mono text-white/70">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked */}
      {blocked.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
            <span className="text-xs font-medium text-white/50">{t(lang, 'mcp.blocked')}</span>
          </div>
          <div className="space-y-1.5">
            {blocked.map(tool => (
              <div
                key={tool.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.01] opacity-50"
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400/40" />
                <span className="text-sm font-mono text-white/40 line-through">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Harness ─────────────────────────────────────────────────────────────────

function HarnessTab({ lang, agent, color }: { lang: Lang; agent: Agent; color: string }) {
  // Extract sections from agent body
  const sections = parseHarnessSections(agent.body)

  return (
    <div className="space-y-4" style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-xs text-white/40 font-mono">
          {t(lang, 'harness.title', { name: agent.name })}
        </span>
      </div>

      {sections.length > 0 ? (
        sections.map((section, i) => (
          <HarnessSection key={i} section={section} color={color} />
        ))
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <pre className="text-xs text-white/40 font-mono leading-relaxed whitespace-pre-wrap">
            {agent.body}
          </pre>
        </div>
      )}
    </div>
  )
}

interface Section { heading: string; body: string; level: number }

function parseHarnessSections(body: string): Section[] {
  const lines = body.split('\n')
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of lines) {
    const headMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headMatch) {
      if (current) sections.push(current)
      current = { heading: headMatch[2], body: '', level: headMatch[1].length }
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line
    }
  }
  if (current) sections.push(current)
  return sections.filter(s => s.body.trim())
}

function HarnessSection({ section, color }: { section: Section; color: string }) {
  const [collapsed, setCollapsed] = useState(section.level <= 2 ? false : true)

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div
            className="flex-shrink-0"
            style={{
              width: `${Math.max(4, 6 - section.level)}px`,
              height: `${Math.max(4, 6 - section.level)}px`,
              borderRadius: '50%',
              background: color,
              opacity: 1 - (section.level - 1) * 0.2,
            }}
          />
          <span
            className="font-medium text-white/70"
            style={{ fontSize: section.level === 1 ? 14 : 13 }}
          >
            {section.heading}
          </span>
        </div>
        <span className="text-white/20 text-xs flex-shrink-0 ml-2">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 border-t border-white/5">
          <pre className="text-xs text-white/50 font-mono leading-relaxed whitespace-pre-wrap mt-3 overflow-x-auto">
            {section.body.trim()}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Logs tab (moved from top-level) ─────────────────────────────────────────

export function LogsTab({ lang }: { lang: Lang }) {
  const logs = useLogs()

  const TYPE_STYLE: Record<string, string> = {
    'tool-output': 'text-blue-400/70',
    'permission': 'text-amber-400/80',
    'stop': 'text-green-400/70',
    'error': 'text-red-400/80',
    'notification': 'text-purple-400/70',
  }

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${logs.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs text-white/50">{t(lang, 'logsTab.stream')}</span>
        </div>
        <span className="text-xs text-white/20 font-mono">127.0.0.1:7860</span>
      </div>
      <div className="overflow-y-auto font-mono text-xs" style={{ height: 320 }}>
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/20">
            {t(lang, 'logsTab.waiting')}
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-white/20 flex-shrink-0 tabular-nums">
                  {new Date(log.ts).toLocaleTimeString('en', { hour12: false })}
                </span>
                <span className={`flex-shrink-0 w-24 ${TYPE_STYLE[log.type] || 'text-white/40'}`}>
                  {log.type}
                </span>
                <span className="text-white/50 truncate">
                  {log.tool || log.content || JSON.stringify(log).slice(0, 80)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
