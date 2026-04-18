/**
 * Storage Adapter
 *
 * Abstracts all data access so the server routes stay the same
 * regardless of where the data lives.
 *
 * MIGRATION: to move off local filesystem, implement a new adapter
 * class with the same interface and set STORAGE_ADAPTER=remote in .env
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

function resolvePath(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p
}

// ── Interface (what every adapter must implement) ──────────────────────────
//
// listAgents()                     → Agent[]
// getAgent(id)                     → Agent | null
// listMemory(agentId)              → MemoryFile[]
// getMemoryFile(agentId, file)     → string | null
// putMemoryFile(agentId, file, content) → void
// listSkills()                     → Skill[]

// ── Local filesystem adapter ───────────────────────────────────────────────

export class LocalAdapter {
  constructor({ agentsDir, memoryDir, skillsDir }) {
    this.agentsDir = resolvePath(agentsDir)
    this.memoryDir = resolvePath(memoryDir)
    this.skillsDir = resolvePath(skillsDir)
  }

  _readMd(filePath) {
    try { return fs.readFileSync(filePath, 'utf-8') } catch { return null }
  }

  _parseFrontmatter(content) {
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

  listAgents() {
    const files = fs.readdirSync(this.agentsDir).filter(f => f.endsWith('.md'))
    return files.map(file => {
      const content = this._readMd(path.join(this.agentsDir, file))
      const { meta, body } = this._parseFrontmatter(content)
      const id = file.replace('.md', '')
      return {
        id,
        name: meta.name || id,
        description: meta.description || '',
        color: meta.color || 'gray',
        model: meta.model || 'inherit',
        body,
        hasMemory: fs.existsSync(path.join(this.memoryDir, id)),
      }
    })
  }

  getAgent(id) {
    const content = this._readMd(path.join(this.agentsDir, `${id}.md`))
    if (!content) return null
    const { meta, body } = this._parseFrontmatter(content)
    return { id, ...meta, body }
  }

  listMemory(agentId) {
    const dir = path.join(this.memoryDir, agentId)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(file => {
        const content = this._readMd(path.join(dir, file))
        const { meta, body } = this._parseFrontmatter(content)
        return { file, name: meta.name || file, type: meta.type || 'note', description: meta.description || '', body }
      })
  }

  getMemoryFile(agentId, file) {
    return this._readMd(path.join(this.memoryDir, agentId, file))
  }

  putMemoryFile(agentId, file, content) {
    fs.writeFileSync(path.join(this.memoryDir, agentId, file), content, 'utf-8')
  }

  listSkills(skillAgentMap = {}) {
    return fs.readdirSync(this.skillsDir)
      .filter(d => {
        const p = path.join(this.skillsDir, d)
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'))
      })
      .map(dir => {
        const content = this._readMd(path.join(this.skillsDir, dir, 'SKILL.md'))
        const { meta, body } = this._parseFrontmatter(content)
        return { id: dir, name: meta.name || dir, description: meta.description || '', agent: skillAgentMap[dir] || null, body }
      })
  }
}

// ── Remote adapter stub (implement when migrating to cloud) ────────────────

export class RemoteAdapter {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl
  }

  async _get(path) {
    const res = await fetch(`${this.baseUrl}${path}`)
    return res.json()
  }

  async _put(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  listAgents()                          { return this._get('/api/agents') }
  getAgent(id)                          { return this._get(`/api/agents/${id}`) }
  listMemory(agentId)                   { return this._get(`/api/memory/${agentId}`) }
  getMemoryFile(agentId, file)          { return this._get(`/api/memory/${agentId}/${file}`).then(r => r.content) }
  putMemoryFile(agentId, file, content) { return this._put(`/api/memory/${agentId}/${file}`, { content }) }
  listSkills()                          { return this._get('/api/skills') }
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createStorage(env) {
  if (env.STORAGE_ADAPTER === 'remote') {
    if (!env.REMOTE_API_BASE) throw new Error('REMOTE_API_BASE must be set when STORAGE_ADAPTER=remote')
    return new RemoteAdapter({ baseUrl: env.REMOTE_API_BASE })
  }
  return new LocalAdapter({
    agentsDir: env.AGENTS_DIR || '~/.claude/agents',
    memoryDir: env.MEMORY_DIR || '~/.claude/agent-memory',
    skillsDir: env.SKILLS_DIR || '~/.claude/skills',
  })
}
