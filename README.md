# STS2 LangGraph Agent

一个用于作品集展示的《杀戮尖塔2》长时程 LLM Agent 架构仓库。

它把知识库里的设想落成了代码：C# Bridge 负责游戏侧事实和合法动作，Node MCP Server 负责工具协议，TypeScript LangGraph Runner 负责编排 Planner/Actor/Verifier/Memory。仓库默认使用 Mock Bridge，所以没有真实游戏和 API Key 也能跑完整流程。

## 架构

```text
C# Mod Bridge / Mock Bridge
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

## 快速运行

```bash
npm install
npm run build
npm run test
npm run demo
```

Demo 会启动 Mock Bridge、MCP Server 和 LangGraph Runner，并在 `runs/<run_id>/` 下生成：

- `graph-events.jsonl`
- `mcp-tools.jsonl`
- `memory.json`
- `final-state.json`
- `transcript.md`

## 目录

- `bridge-csharp/`：C# Bridge 源码。当前本机需要安装 .NET 9 SDK 才能构建。
- `mock-bridge/`：TypeScript Mock Bridge，模拟一局短流程。
- `mcp-server/`：MCP tools 层。
- `langgraph-runner/`：LangGraph 状态图。
- `knowledge/`：整理版内置知识库。
- `docs/`：真实游戏接入和架构说明。

## 真实接入状态

仓库包含 C# Bridge 的核心源码和 Mod 外壳，但没有伪造真实游戏内部类型。当前可验证路径是 Mock Demo；真实接游戏时，需要基于游戏程序集补 `IGameAdapter` 的具体实现。

这个选择是刻意的：作品集里展示的是正确的工程边界，而不是把不可验证的字段名写死。

## 面试讲法

我没有把整个 Agent 写成一个大 prompt，而是拆成了显式状态图。Bridge 负责事实，MCP 负责工具边界，LangGraph 负责编排，模型只在合法动作集合中选择 `action_id`。高风险动作进入 Verifier，fatal 风险 halt，不会继续 POST 副作用动作。
