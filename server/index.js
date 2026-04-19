import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { execSync, spawn } from 'child_process'
import os from 'os'
import { createStorage } from './storage.js'

// ── Config from .env ───────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf-8')
    const env = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return { ...process.env, ...env }
  } catch {
    return process.env
  }
}

const env = loadEnv()
const PORT = parseInt(env.PORT || '3001')
const HOOK_SERVER = env.HOOK_SERVER || 'http://127.0.0.1:7860'

const storage = createStorage(env)

const SKILL_AGENT_MAP = {
  'ship': 'vibe-coder',
  'new-component': 'vibe-coder',
  'watch-dev': 'vibe-coder',
  'cyberpunk-ui': 'vibe-coder',
  'deep-research': 'learn-master',
  'learning-plan': 'learn-master',
  'day-plan': 'team-biz-manager',
  'meeting-prep': 'team-biz-manager',
  'weekly-review': 'team-biz-manager',
  'weekly-checkin': 'health-coach',
  'skin-audit': 'health-coach',
}

// ── App ────────────────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// ── Agents ─────────────────────────────────────────────────────────────────

app.get('/api/agents', (req, res) => {
  res.json(storage.listAgents())
})

app.get('/api/agents/:id', (req, res) => {
  const agent = storage.getAgent(req.params.id)
  if (!agent) return res.status(404).json({ error: 'not found' })
  res.json(agent)
})

// ── Memory ─────────────────────────────────────────────────────────────────

app.get('/api/memory/:agentId', (req, res) => {
  res.json(storage.listMemory(req.params.agentId))
})

app.get('/api/memory/:agentId/:file', (req, res) => {
  const content = storage.getMemoryFile(req.params.agentId, req.params.file)
  if (!content) return res.status(404).json({ error: 'not found' })
  res.json({ content })
})

app.put('/api/memory/:agentId/:file', (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })
  storage.putMemoryFile(req.params.agentId, req.params.file, content)
  res.json({ ok: true })
})

// ── Skills ─────────────────────────────────────────────────────────────────

app.get('/api/skills', (req, res) => {
  res.json(storage.listSkills(SKILL_AGENT_MAP))
})

// ── SSE log stream ─────────────────────────────────────────────────────────

const clients = new Set()

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

app.post('/api/log', (req, res) => {
  const event = JSON.stringify({ ...req.body, ts: Date.now() })
  for (const client of clients) client.write(`data: ${event}\n\n`)
  res.json({ ok: true })
})

// ── Chat (SSE stream) ──────────────────────────────────────────────────────

app.post('/api/chat', (req, res) => {
  const { agentId, message } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  // Build agent context: load agent harness as system prefix if available
  const agent = storage.getAgent(agentId)
  const agentFlag = agentId ? ['--agent', agentId] : []

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
  }

  // Use claude CLI: claude --print --verbose --output-format stream-json
  const args = ['--print', '--output-format', 'stream-json', '--verbose']
  if (agent?.body) args.push('--system-prompt', agent.body)
  args.push(message)

  const proc = spawn('claude', args, {
    env: { ...process.env, HOME: process.env.HOME, PATH: process.env.PATH },
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: os.homedir(),
  })

  let buffer = ''

  function parseStreamLine(line) {
    try {
      const parsed = JSON.parse(line)
      // stream-json v2 format:
      // { type: 'assistant', message: { content: [{ type: 'text', text: '...' }] } }
      // { type: 'result', result: '...', subtype: 'success' }
      if (parsed.type === 'assistant') {
        const parts = parsed.message?.content || []
        for (const part of parts) {
          if (part.type === 'text' && part.text) sendEvent('delta', { text: part.text })
        }
      } else if (parsed.type === 'result') {
        sendEvent('done', { text: parsed.result || '' })
      }
    } catch {
      // ignore non-JSON lines (system init, etc.)
    }
  }

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete line
    for (const line of lines) {
      if (line.trim()) parseStreamLine(line)
    }
  })

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    if (text.includes('Error') || text.includes('error')) {
      sendEvent('error', { message: text.trim() })
    }
  })

  proc.on('close', (code) => {
    if (buffer.trim()) parseStreamLine(buffer)
    sendEvent('end', { code })
    res.end()
  })

  res.on('close', () => {
    if (!res.writableEnded) proc.kill()
  })
})

// ── Council (parallel multi-agent SSE) ────────────────────────────────────

app.post('/api/council', (req, res) => {
  const { message, agentIds } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Determine which agents to consult
  const allAgents = storage.listAgents()
  const targets = agentIds?.length
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents

  if (targets.length === 0) {
    sendEvent({ type: 'error', message: 'No agents available' })
    res.end()
    return
  }

  sendEvent({ type: 'start', agents: targets.map(a => ({ id: a.id, name: a.name, color: a.color })) })

  const procs = []
  let finished = 0
  const agentTexts = new Map()      // agentId -> accumulated delta text
  const agentFinalTexts = new Map() // agentId -> result event text (clean final answer)

  function runSynthesis() {
    const councilMaster = storage.getAgent('council-master')
    if (!councilMaster) {
      sendEvent({ type: 'end' })
      res.end()
      return
    }

    const agentSummaries = targets.map(a => {
      const text = agentFinalTexts.get(a.id) || agentTexts.get(a.id) || '(no response)'
      return `[${a.name}]: ${text}`
    }).join('\n\n')

    const synthesisPrompt = `以下是多个 Agent 对问题「${message}」的回答：\n\n${agentSummaries}\n\n请综合以上观点，总结要点并给出下一步行动建议。`

    sendEvent({ type: 'synthesis-start' })

    const synthArgs = ['--print', '--output-format', 'stream-json', '--verbose']
    if (councilMaster.body) synthArgs.push('--system-prompt', councilMaster.body)
    synthArgs.push(synthesisPrompt)

    const synthProc = spawn('claude', synthArgs, {
      env: { ...process.env, HOME: process.env.HOME, PATH: process.env.PATH },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: os.homedir(),
    })
    procs.push(synthProc)

    let synthBuf = ''
    const parseSynthLine = (line) => {
      try {
        const parsed = JSON.parse(line)
        if (parsed.type === 'assistant') {
          const parts = parsed.message?.content || []
          for (const part of parts) {
            if (part.type === 'text' && part.text) sendEvent({ type: 'synthesis-delta', text: part.text })
          }
        } else if (parsed.type === 'result') {
          sendEvent({ type: 'synthesis-done', text: parsed.result || '' })
        }
      } catch {}
    }

    synthProc.stdout.on('data', (chunk) => {
      synthBuf += chunk.toString()
      const lines = synthBuf.split('\n')
      synthBuf = lines.pop()
      for (const line of lines) { if (line.trim()) parseSynthLine(line) }
    })

    synthProc.on('close', () => {
      if (synthBuf.trim()) parseSynthLine(synthBuf)
      sendEvent({ type: 'end' })
      res.end()
    })
  }

  for (const agent of targets) {
    const args = ['--print', '--output-format', 'stream-json', '--verbose']
    if (agent.body) args.push('--system-prompt', agent.body)
    args.push(message)

    const proc = spawn('claude', args, {
      env: { ...process.env, HOME: process.env.HOME, PATH: process.env.PATH },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: os.homedir(),
    })
    procs.push(proc)

    let buf = ''
    let agentBuf = ''

    const parseAgentLine = (line) => {
      try {
        const parsed = JSON.parse(line)
        if (parsed.type === 'assistant') {
          const parts = parsed.message?.content || []
          for (const part of parts) {
            if (part.type === 'text' && part.text) {
              agentBuf += part.text
              agentTexts.set(agent.id, agentBuf)
              sendEvent({ type: 'delta', agentId: agent.id, text: part.text })
            }
          }
        } else if (parsed.type === 'result') {
          agentFinalTexts.set(agent.id, parsed.result || '')
          sendEvent({ type: 'done', agentId: agent.id, text: parsed.result || '' })
        }
      } catch {}
    }

    proc.stdout.on('data', (chunk) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (line.trim()) parseAgentLine(line)
      }
    })

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      if (text.includes('Error') || text.includes('error')) {
        sendEvent({ type: 'agent-error', agentId: agent.id, message: text.trim() })
      }
    })

    proc.on('close', () => {
      if (buf.trim()) parseAgentLine(buf)
      sendEvent({ type: 'agent-end', agentId: agent.id })
      finished++
      if (finished === targets.length) {
        runSynthesis()
      }
    })
  }

  res.on('close', () => {
    if (!res.writableEnded) {
      for (const proc of procs) {
        try { proc.kill() } catch {}
      }
    }
  })
})

// ── Trigger skill ──────────────────────────────────────────────────────────

app.post('/api/trigger', (req, res) => {
  const { skill, prompt } = req.body
  if (!skill && !prompt) return res.status(400).json({ error: 'skill or prompt required' })
  const cmd = skill ? `claude -p "/${skill}"` : `claude -p "${prompt}"`
  try {
    execSync(`nohup ${cmd} > /tmp/workbench-trigger.log 2>&1 &`)
    res.json({ ok: true, cmd })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Health check (useful for remote deployment) ────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    adapter: env.STORAGE_ADAPTER || 'local',
    hookServer: HOOK_SERVER,
    ts: Date.now(),
  })
})

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent Workbench API  →  http://localhost:${PORT}`)
  console.log(`Storage adapter      →  ${env.STORAGE_ADAPTER || 'local'}`)
  console.log(`Hook server          →  ${HOOK_SERVER}`)
})
