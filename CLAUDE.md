# Agent Workbench — CLAUDE.md

## 项目定位
Erik 的 Claude Code Agent 体系可视化工作台。
展示并管理运行在 `~/.claude/` 下的四个 agent 及其 skills、memory，支持实时日志和 skill 触发。

## 归属 Agent
本项目由 `vibe-coder` agent 管理。

## 技术栈
- Vite + React 19 + TypeScript
- Tailwind CSS v4（`@import "tailwindcss"` 语法）
- 本地 API server：Express（`server/index.js`，端口 3001）
- 前端开发服务器：Vite（端口 5173，代理 /api 和 /events 到 3001）

## 目录结构
```
src/
  App.tsx              — 主布局，三个 tab：Agents / Skills / Logs
  index.css            — 全局样式，暗色主题
  components/
    AgentCard.tsx      — Agent 卡片，展开查看 memory
    MemoryPanel.tsx    — memory 文件列表 + 内容查看/编辑
    SkillsPanel.tsx    — skills 列表，按 agent 过滤，支持触发
    LogStream.tsx      — SSE 实时日志流
  hooks/
    useAgents.ts       — useAgents / useMemory / useSkills
    useLogs.ts         — SSE 订阅 /events
server/
  index.js             — Express API server
```

## 数据来源路径（不要硬编码，从 HOME 拼接）
- Agents: `~/.claude/agents/*.md`
- Memory: `~/.claude/agent-memory/{agentId}/*.md`
- Skills: `~/.claude/skills/{skillName}/SKILL.md`
- Hook server: `http://127.0.0.1:7860`（claude-watch bridge）

## 本地开发
```bash
# 终端 1：启动 API server
npm run server

# 终端 2：启动前端
npm run dev
```

## 代码规范
- 暗色主题，风格参考 Linear（`#0a0a0a` 背景，`border-white/8` 边框）
- 组件文件 PascalCase，hook 文件 camelCase
- 不使用路由库，单页三 tab 即可
- API 请求统一走 `/api/*`（由 Vite proxy 转发到 3001）

## 部署
- 前端：Vercel（`npm run build` 产出 `dist/`）
- API server：本地运行，不部署公网（读取本地 ~/.claude/ 文件）
