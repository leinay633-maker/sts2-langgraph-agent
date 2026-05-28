# STS2 LangGraph Agent

《杀戮尖塔2》长时程 LLM Agent 控制系统。

项目将单机游戏运行时包装为可观测、可调用、可复盘的 Agent 环境：C# Bridge 负责游戏侧状态与动作边界，Node MCP Server 负责工具协议与调用链路，TypeScript LangGraph Runner 负责编排观察、规划、行动、复核、执行和记忆更新。

## Architecture

```text
C# Bridge
  ↓ localhost HTTP
Node MCP Server
  ↓ stdio MCP
LangGraph Runner
  ├─ Observe
  ├─ Planner
  ├─ Actor
  ├─ Verifier
  ├─ Execute
  └─ Memory
```

## Core Design

- **Runtime Bridge**：统一输出结构化游戏状态、稳定态标记、合法动作集合和执行结果。
- **Action Boundary**：模型只能选择当前 `legal_actions` 中的 `action_id`，不能直接生成游戏操作。
- **MCP Tool Layer**：将状态读取、动作执行、摘要更新和自动化控制封装为标准工具。
- **LangGraph Orchestration**：用显式状态图拆分 Observe、Planner、Actor、Verifier、Execute、Memory。
- **Risk Control**：结束回合、跳过奖励、删牌、精英路线等高风险动作进入 Verifier；fatal 风险直接 halt。
- **Structured Memory**：按 facts、strategy、risks、events 分层记录，方便复盘与长时程恢复。

## Quick Start

```bash
npm install
npm run build
npm run test
npm run agent:run
```

运行后会在 `runs/<run_id>/` 生成一次完整 Agent 回放：

- `graph-events.jsonl`
- `mcp-tools.jsonl`
- `memory.json`
- `final-state.json`
- `transcript.md`

仓库中也保留了一份参考运行输出：

```text
examples/reference-run/
```

## Model Configuration

Planner 和 Actor 节点支持模型驱动决策：

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

CI 和回归测试保留确定性策略路径，用来验证 Bridge、MCP、LangGraph、Verifier 和 Memory 的完整控制链路。

## Quality Gates

```bash
npm run verify
npm run check:csharp
```

GitHub Actions 会执行 TypeScript build、单元测试、完整 Agent loop、C# Bridge build 和 C# tests。

## Repository Layout

```text
bridge-csharp/        C# Bridge core, HTTP server, action resolver, stability guard
bridge-runtime/       Runtime bridge used by tests and replay
mcp-server/           MCP tools and Bridge HTTP client
langgraph-runner/     LangGraph state machine and node implementations
shared/               Shared TypeScript contracts and schemas
docs/                 Architecture and adapter notes
examples/             Reference run output
tests/                Routing, Bridge runtime, and tool boundary tests
```

## Agent Loop

```text
observe_state
  → route_after_observe
  → planner? 
  → actor
  → verifier?
  → execute_action
  → memory_update
  → observe_state
```

大部分路由由代码决定，不交给模型自由判断。Planner 只在奖励、地图、商店、事件等关键节点运行；Verifier 只审高风险动作；Memory 只写结构化 diff。

## Engineering Highlights

- 无官方 Agent API 场景下的游戏运行时封装
- MCP 工具边界与 LLM 动作约束
- LangGraph 长时程状态机编排
- 高风险动作复核与异常 halt
- 结构化记忆、日志和回放体系
- 可测试、可复现的 Agent 工程链路
