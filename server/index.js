import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { createServer } from 'http'

const app = express()
const PORT = 3001
const HOME = process.env.HOME || '/Users/erikkkk'

const AGENTS_DIR = path.join(HOME, '.claude/agents')
const MEMORY_DIR = path.join(HOME, '.claude/agent-memory')
const SKILLS_DIR = path.join(HOME, '.claude/skills')
const HOOK_SERVER = 'http://127.0.0.1:7860'

app.use(cors())
app.use(express.json())

// ── Helpers ────────────────────────────────────────────────────────────────

function readMd(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8') } catch { return null }
}

function parseFrontmatter(content) {
  if (!content?.startsWith('---')) return { meta: {}, body: content || '' }
  const end = content.indexOf('---', 3)
  if (end === -1) return { meta: {}, body: content }
  const raw = content.slice(3, end).trim()
  const body = content.slice(end + 3).trim()
  const meta = {}
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '')
    meta[key] = val
  }
  return { meta, body }
}

// ── Agents ─────────────────────────────────────────────────────────────────

app.get('/api/agents', (req, res) => {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))
  const agents = files.map(file => {
    const content = readMd(path.join(AGENTS_DIR, file))
    const { meta, body } = parseFrontmatter(content)
    const id = file.replace('.md', '')
    const memDir = path.join(MEMORY_DIR, id)
    const hasMemory = fs.existsSync(memDir)
    return { id, name: meta.name || id, description: meta.description || '', color: meta.color || 'gray', model: meta.model || 'inherit', body, hasMemory }
  })
  res.json(agents)
})

app.get('/api/agents/:id', (req, res) => {
  const file = path.join(AGENTS_DIR, `${req.params.id}.md`)
  const content = readMd(file)
  if (!content) return res.status(404).json({ error: 'not found' })
  const { meta, body } = parseFrontmatter(content)
  res.json({ id: req.params.id, ...meta, body })
})

// ── Memory ─────────────────────────────────────────────────────────────────

app.get('/api/memory/:agentId', (req, res) => {
  const dir = path.join(MEMORY_DIR, req.params.agentId)
  if (!fs.existsSync(dir)) return res.json([])
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
  const items = files.map(file => {
    const content = readMd(path.join(dir, file))
    const { meta, body } = parseFrontmatter(content)
    return { file, name: meta.name || file, type: meta.type || 'note', description: meta.description || '', body }
  })
  res.json(items)
})

app.get('/api/memory/:agentId/:file', (req, res) => {
  const filePath = path.join(MEMORY_DIR, req.params.agentId, req.params.file)
  const content = readMd(filePath)
  if (!content) return res.status(404).json({ error: 'not found' })
  res.json({ content })
})

app.put('/api/memory/:agentId/:file', (req, res) => {
  const filePath = path.join(MEMORY_DIR, req.params.agentId, req.params.file)
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })
  fs.writeFileSync(filePath, content, 'utf-8')
  res.json({ ok: true })
})

// ── Skills ─────────────────────────────────────────────────────────────────

// Map skills to their agent based on SKILL.md description
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

app.get('/api/skills', (req, res) => {
  const dirs = fs.readdirSync(SKILLS_DIR).filter(d => {
    const p = path.join(SKILLS_DIR, d)
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'))
  })
  const skills = dirs.map(dir => {
    const content = readMd(path.join(SKILLS_DIR, dir, 'SKILL.md'))
    const { meta, body } = parseFrontmatter(content)
    return {
      id: dir,
      name: meta.name || dir,
      description: meta.description || '',
      agent: SKILL_AGENT_MAP[dir] || null,
      body,
    }
  })
  res.json(skills)
})

// ── SSE log stream (proxy from claude-watch hook server) ───────────────────

const clients = new Set()

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  clients.add(res)
  req.on('close', () => clients.delete(res))
})

// Receive forwarded events from hook server (or direct hook calls)
app.post('/api/log', (req, res) => {
  const event = JSON.stringify({ ...req.body, ts: Date.now() })
  for (const client of clients) {
    client.write(`data: ${event}\n\n`)
  }
  res.json({ ok: true })
})

// ── Trigger skill ──────────────────────────────────────────────────────────

app.post('/api/trigger', (req, res) => {
  const { skill, prompt } = req.body
  if (!skill && !prompt) return res.status(400).json({ error: 'skill or prompt required' })
  // Launches a new claude session with the skill/prompt
  // Non-blocking — just fires and returns immediately
  const cmd = skill ? `claude -p "/${skill}"` : `claude -p "${prompt}"`
  try {
    execSync(`nohup ${cmd} > /tmp/workbench-trigger.log 2>&1 &`)
    res.json({ ok: true, cmd })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent Workbench API running on http://localhost:${PORT}`)
  console.log(`  Agents:  ${AGENTS_DIR}`)
  console.log(`  Memory:  ${MEMORY_DIR}`)
  console.log(`  Skills:  ${SKILLS_DIR}`)
})
