# 架构说明

```text
LangGraph Runner
  ├─ observe_state
  ├─ planner
  ├─ actor
  ├─ verifier
  ├─ execute_action
  └─ memory_update
       ↓ MCP stdio
Node MCP Server
       ↓ localhost HTTP
C# Bridge 或 Mock Bridge
       ↓
Game Runtime / Scenario
```

默认 `npm run demo` 使用 Mock Bridge。真实游戏接入时，MCP Server 和 LangGraph Runner 不需要改，只替换 Bridge 后端。
