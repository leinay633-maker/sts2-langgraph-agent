# 架构总览

本项目把《杀戮尖塔2》长时程 Agent 拆成四层：

1. C# Mod Bridge：读取真实状态、枚举合法动作、执行动作、判断稳定态。
2. Node MCP Server：把 Bridge 能力包装为 MCP tools，负责协议、参数校验、日志和上下文检索。
3. LangGraph Runner：把 Observe、Planner、Actor、Verifier、Execute、Memory 显式拆成状态图。
4. Agent Context：给 Planner/Actor 提供可检索的策略和工程背景。

关键原则：LangGraph 不直接控制游戏，不生成自由文本动作。所有动作必须来自 `legal_actions`，最终只 POST `action_id`。

## 工程边界

- Bridge 负责事实：血量、能量、手牌、敌人意图、地图、奖励、商店、合法动作。
- MCP 负责工具边界：参数校验、路径隔离、调用日志。
- LangGraph 负责编排：何时规划、何时执行、何时复核、何时更新记忆。
- 模型负责判断：策略、理由、风险解释，但不能改写事实层。
