# MCP Tools

MCP Server 是外部协议层，不读游戏对象，只调用 Bridge HTTP API。

## 工具列表

- `get_game_state`：读取当前状态。
- `list_legal_actions`：读取合法动作。
- `execute_action`：执行一个 `action_id`。
- `step`：执行动作后立即读取下一状态。
- `get_run_summary`：读取结构化记忆。
- `update_run_summary`：写入策略和风险 diff。
- `search_kb`：检索知识库。
- `read_kb_section`：读取知识库章节。
- `start_autoslay` / `stop_autoslay`：控制 Bridge 侧启发式 baseline。

## 安全边界

MCP 只做参数和协议校验，真正的游戏规则校验仍在 Bridge。知识库工具只能读 `knowledge/` 目录，不能读任意路径。
