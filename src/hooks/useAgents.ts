import { useEffect, useState } from 'react'

export interface Agent {
  id: string
  name: string
  description: string
  color: string
  model: string
  body: string
  hasMemory: boolean
}

export interface MemoryFile {
  file: string
  name: string
  type: string
  description: string
  body: string
}

export interface Skill {
  id: string
  name: string
  description: string
  agent: string | null
  body: string
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(setAgents)
  }, [])
  return agents
}

export function useMemory(agentId: string) {
  const [files, setFiles] = useState<MemoryFile[]>([])
  useEffect(() => {
    if (!agentId) return
    fetch(`/api/memory/${agentId}`).then(r => r.json()).then(setFiles)
  }, [agentId])
  return files
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills)
  }, [])
  return skills
}
