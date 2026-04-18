import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
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
