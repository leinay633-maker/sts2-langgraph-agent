# Memory 与 Risk

结构化记忆分四层：

- `facts`：只能由 Bridge 状态同步，模型不能写。
- `strategy`：Planner 写入，必须带理由。
- `risks`：Actor/Verifier 写入，必须带触发条件。
- `events`：系统 append，用于复盘。

## 高风险动作

以下动作必须进入 Verifier：

- `end_turn`
- `skip_reward`
- `remove_card`
- `choose_elite_route`
- 昂贵购买或不可逆选择
- Bridge 或 Actor 标记为 high/fatal 的动作

fatal 风险时不 POST 动作，进入 halt，输出快照给人工判断。
