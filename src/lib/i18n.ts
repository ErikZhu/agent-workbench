export type Lang = 'zh' | 'en'

export const ui = {
  zh: {
    appName: 'Erik 的 Agent 体系工作台',
    appSub: 'Erik 的 Claude 体系',
    council: '协同决策',
    councilSub: '多 Agent 协作',
    tabs: {
      chat: '对话',
      skills: '技能',
      memory: '记忆',
      mcp: '工具',
      harness: '规范',
    },
    agentDesc: {
      'vibe-coder': '编码 · 网站 · Demo',
      'learn-master': '学习 · 调研 · 前沿',
      'team-biz-manager': '团队 · 效能 · OKR',
      'health-coach': '健康 · 运动 · 体态',
    } as Record<string, string>,
    connected: '已连接',
    disconnected: '未连接',
    noAgent: '无法连接 API Server',
    noAgentHint: '本地：确保 npm run server 在运行 · 公网：在设置中填入 ngrok 地址',
    goSettings: '→ 前往设置',
    settings: '设置',
    logs: '实时日志',
    placeholder: {
      chat: '向 {name} 发送消息… (Enter 发送)',
      council: '描述你的任务或决策需求，多个 Agent 将协同给出建议…',
    },
    comingSoon: '即将在 Phase {n} 实现',
    councilView: {
      title: '协同决策',
      subtitle: '向所有 Agent 发送任务，获得多角度建议',
      send: '发起协同',
      sending: '协同中…',
      stop: '停止',
      clear: '清空',
      thinking: '思考中…',
      empty: '暂无建议',
      hint: 'Enter 发送 · 所有 Agent 将并行响应',
      agentCount: '{n} 个 Agent 参与',
      synthesisLabel: '⬡ SYNTHESIS',
      synthesisThinking: '综合分析中…',
    },
    memory: {
      noFiles: '暂无记忆文件',
      selectFile: '选择一个记忆文件',
      edit: '编辑',
      cancel: '取消',
      save: '保存',
      saving: '保存中…',
      types: {
        user: '用户',
        feedback: '反馈',
        project: '项目',
        reference: '参考',
        note: '笔记',
      },
    },
    skills: {
      noSkills: '暂无技能数据',
      noSkillsHint: '确保 API server 在运行',
      trigger: '触发',
      triggering: '运行中…',
      all: '全部',
      expandBody: '展开',
    },
    harness: {
      title: '{name} 规范文档',
    },
    mcp: {
      title: 'MCP 工具',
      noTools: '未配置 MCP 工具',
      allowed: '允许',
      blocked: '禁止',
      source: '来源',
    },
    logsTab: {
      stream: '实时 Hook 流',
      waiting: '等待事件…',
    },
  },
  en: {
    appName: "Erik's Agent Workbench",
    appSub: "Erik's Claude System",
    council: 'Council',
    councilSub: 'Multi-Agent Collaboration',
    tabs: {
      chat: 'Chat',
      skills: 'Skills',
      memory: 'Memory',
      mcp: 'MCP',
      harness: 'Harness',
    },
    agentDesc: {
      'vibe-coder': 'Code · Web · Demo',
      'learn-master': 'Learn · Research · Frontier',
      'team-biz-manager': 'Team · Productivity · OKR',
      'health-coach': 'Health · Fitness · Vitality',
    } as Record<string, string>,
    connected: 'Connected',
    disconnected: 'Disconnected',
    noAgent: 'Cannot reach API Server',
    noAgentHint: 'Local: make sure npm run server is running · Remote: set ngrok URL in Settings',
    goSettings: '→ Go to Settings',
    settings: 'Settings',
    logs: 'Live Logs',
    placeholder: {
      chat: 'Message {name}… (Enter to send)',
      council: 'Describe your task. Agents will collaborate to give the best recommendation…',
    },
    comingSoon: 'Coming in Phase {n}',
    councilView: {
      title: 'Council',
      subtitle: 'Send a task to all agents and get multi-perspective recommendations',
      send: 'Ask Council',
      sending: 'Gathering…',
      stop: 'Stop',
      clear: 'Clear',
      thinking: 'Thinking…',
      empty: 'No responses yet',
      hint: 'Enter to send · All agents respond in parallel',
      agentCount: '{n} agents participating',
      synthesisLabel: '⬡ SYNTHESIS',
      synthesisThinking: 'Synthesizing…',
    },
    memory: {
      noFiles: 'No memory files',
      selectFile: 'Select a memory file',
      edit: 'Edit',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving…',
      types: {
        user: 'User',
        feedback: 'Feedback',
        project: 'Project',
        reference: 'Reference',
        note: 'Note',
      },
    },
    skills: {
      noSkills: 'No skills loaded',
      noSkillsHint: 'Make sure API server is running',
      trigger: 'Run',
      triggering: 'Running…',
      all: 'All',
      expandBody: 'Expand',
    },
    harness: {
      title: '{name} Harness',
    },
    mcp: {
      title: 'MCP Tools',
      noTools: 'No MCP tools configured',
      allowed: 'Allowed',
      blocked: 'Blocked',
      source: 'Source',
    },
    logsTab: {
      stream: 'Live Hook Stream',
      waiting: 'Waiting for events…',
    },
  },
} as const

export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  const keys = key.split('.')
  let val: unknown = ui[lang]
  for (const k of keys) {
    if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k]
    else return key
  }
  if (typeof val !== 'string') return key
  if (!vars) return val
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val)
}
