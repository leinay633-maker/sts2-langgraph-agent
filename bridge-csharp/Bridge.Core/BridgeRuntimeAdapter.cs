using System.Text.Json;

namespace Sts2LangGraphAgent.Bridge.Core;

public sealed class BridgeRuntimeAdapter : IGameAdapter
{
    private enum Phase
    {
        CombatOpen,
        CombatAfterStrike,
        CombatAfterDefend,
        Reward,
        Map,
        Shop,
        ShopAfterBuy,
        BossOpen,
        BossAfterBash,
        Victory
    }

    private Phase _phase = Phase.CombatOpen;
    private int _step;
    private int _busyReadsRemaining;
    private bool _autoslay;
    private readonly List<RunEventDto> _events = new();
    private readonly Dictionary<string, object?> _strategy = new();
    private readonly Dictionary<string, object?> _risks = new();

    public string RunId { get; } = $"run-{Guid.NewGuid():N}";
    public bool IsAutoslayRunning => _autoslay;

    public GameStateDto ReadState()
    {
        if (_busyReadsRemaining > 0)
        {
            _busyReadsRemaining--;
            return BuildState("busy", "busy", Array.Empty<LegalActionDto>(), "Action animation resolving");
        }

        return StableState();
    }

    public IReadOnlyList<LegalActionDto> ListLegalActions() => ReadState().LegalActions;

    public ExecuteActionResponse ExecuteAction(string actionId)
    {
        var state = StableState();
        var action = state.LegalActions.FirstOrDefault(item => item.ActionId == actionId);
        if (action is null)
        {
            return new ExecuteActionResponse("rejected", $"action_id is not currently legal: {actionId}", null, state);
        }

        _events.Add(new RunEventDto(_step, action.ActionType, action.Label, "system"));
        _phase = NextPhase(actionId);
        _step++;
        _busyReadsRemaining = _phase == Phase.Victory ? 0 : 1;

        return new ExecuteActionResponse("accepted", null, action, ReadState());
    }

    public RunSummaryDto ReadSummary() => new(CurrentFacts(), _strategy, _risks, _events);

    public RunSummaryDto UpdateSummary(IReadOnlyDictionary<string, object?> diff)
    {
        ApplyMap(diff, "strategy", _strategy);
        ApplyMap(diff, "risks", _risks);

        _events.Add(new RunEventDto(_step, "summary_diff", "Structured memory diff applied", "model"));
        return ReadSummary();
    }

    public void StartAutoslay() => _autoslay = true;
    public void StopAutoslay() => _autoslay = false;

    private GameStateDto StableState()
    {
        return _phase switch
        {
            Phase.CombatOpen => BuildState("stable", "combat", new[]
            {
                Action("play_strike_louse", "play_card", "打出 Strike", "对酸液史莱姆造成 6 点伤害。", "low", new Dictionary<string, object?> { ["target_id"] = "louse" }),
                Action("play_defend", "play_card", "打出 Defend", "获得 5 点格挡。", "low"),
                Action("end_turn", "end_turn", "结束回合", "敌人将造成 5 点伤害，结束前需要确认防御。", "high")
            }),
            Phase.CombatAfterStrike => BuildState("stable", "combat", new[]
            {
                Action("play_defend", "play_card", "打出 Defend", "获得 5 点格挡，覆盖本回合伤害。", "low"),
                Action("end_turn", "end_turn", "结束回合", "当前格挡不足时存在掉血风险。", "high")
            }),
            Phase.CombatAfterDefend => BuildState("stable", "combat", new[]
            {
                Action("end_turn", "end_turn", "结束回合", "格挡足够，结束回合进入奖励页。", "high")
            }),
            Phase.Reward => BuildState("stable", "reward", new[]
            {
                Action("choose_reward_inflame", "choose_reward", "选择 Inflame", "补强力量成长，符合 Ironclad 方向。", "low"),
                Action("skip_reward", "skip_reward", "跳过奖励", "跳过当前关键成长牌。", "high")
            }),
            Phase.Map => BuildState("stable", "map", new[]
            {
                Action("choose_safe_route", "choose_map_node", "选择安全路线", "保留血量，进入商店。", "low"),
                Action("choose_elite_route", "choose_elite_route", "选择精英路线", "收益更高但当前防御偏弱。", "high")
            }),
            Phase.Shop => BuildState("stable", "shop", new[]
            {
                Action("buy_card_draw", "buy_item", "购买 Battle Trance", "补充过牌能力。", "medium", new Dictionary<string, object?> { ["cost"] = 75 }),
                Action("remove_strike", "remove_card", "删除 Strike", "优化牌组，但会消耗大部分金币。", "high", new Dictionary<string, object?> { ["cost"] = 90 }),
                Action("leave_shop", "leave_shop", "离开商店", "保留金币前往 Boss。", "low")
            }),
            Phase.ShopAfterBuy => BuildState("stable", "shop", new[]
            {
                Action("leave_shop", "leave_shop", "离开商店", "过牌已补足，进入 Boss。", "low")
            }),
            Phase.BossOpen => BuildState("stable", "combat", new[]
            {
                Action("play_bash_boss", "play_card", "对 Boss 打出 Bash", "施加易伤，准备爆发。", "low", new Dictionary<string, object?> { ["target_id"] = "guardian" }),
                Action("end_turn", "end_turn", "结束回合", "Boss 即将造成 18 点伤害，高风险。", "fatal")
            }),
            Phase.BossAfterBash => BuildState("stable", "combat", new[]
            {
                Action("play_heavy_blade", "play_card", "打出 Heavy Blade", "利用力量和易伤斩杀 Boss。", "low", new Dictionary<string, object?> { ["target_id"] = "guardian" }),
                Action("end_turn", "end_turn", "结束回合", "不斩杀会吃 18 点伤害。", "fatal")
            }),
            Phase.Victory => BuildState("stable", "victory", Array.Empty<LegalActionDto>(), "Victory"),
            _ => BuildState("not_ready", "not_ready", Array.Empty<LegalActionDto>(), "Unknown phase")
        };
    }

    private GameStateDto BuildState(string status, string stateType, IReadOnlyList<LegalActionDto> actions, string? message = null)
    {
        var isTerminal = stateType is "victory" or "defeat" or "game_over";

        return new GameStateDto(
            RunId,
            _step,
            status,
            stateType,
            stateType,
            $"{_phase}:{_step}:{string.Join('|', actions.Select(item => item.ActionId))}",
            Player(),
            stateType == "combat" ? Enemies() : Array.Empty<EnemySnapshot>(),
            actions,
            isTerminal,
            stateType == "victory" ? "victory" : null,
            message);
    }

    private PlayerSnapshot Player()
    {
        var deck = new List<string> { "Strike", "Strike", "Defend", "Defend", "Bash" };
        if (_phase >= Phase.Reward) deck.Add("Inflame");
        if (_phase >= Phase.ShopAfterBuy) deck.Add("Battle Trance");

        return new PlayerSnapshot(
            _phase >= Phase.BossOpen ? 58 : 68,
            80,
            _phase == Phase.CombatAfterDefend ? 5 : 0,
            3,
            _phase >= Phase.ShopAfterBuy ? 35 : 110,
            deck,
            new[] { "Burning Blood", "Anchor" },
            new[] { "Fire Potion" });
    }

    private IReadOnlyList<EnemySnapshot> Enemies()
    {
        if (_phase is Phase.BossOpen or Phase.BossAfterBash)
        {
            return new[] { new EnemySnapshot("guardian", "Guardian", _phase == Phase.BossAfterBash ? 18 : 46, "Attack", 18) };
        }

        return new[] { new EnemySnapshot("louse", "Acid Louse", _phase == Phase.CombatOpen ? 12 : 6, "Attack", 5) };
    }

    private IReadOnlyDictionary<string, object?> CurrentFacts() => new Dictionary<string, object?>
    {
        ["deck"] = Player().Deck,
        ["relics"] = Player().Relics,
        ["hp"] = new Dictionary<string, object?> { ["current"] = Player().Hp, ["max"] = Player().MaxHp },
        ["gold"] = Player().Gold,
        ["phase"] = _phase.ToString(),
        ["source_step"] = _step,
        ["source"] = "bridge"
    };

    private Phase NextPhase(string actionId) => actionId switch
    {
        "play_strike_louse" => Phase.CombatAfterStrike,
        "play_defend" => Phase.CombatAfterDefend,
        "end_turn" when _phase == Phase.CombatAfterDefend => Phase.Reward,
        "choose_reward_inflame" => Phase.Map,
        "skip_reward" => Phase.Map,
        "choose_safe_route" => Phase.Shop,
        "choose_elite_route" => Phase.Shop,
        "buy_card_draw" => Phase.ShopAfterBuy,
        "remove_strike" => Phase.ShopAfterBuy,
        "leave_shop" => Phase.BossOpen,
        "play_bash_boss" => Phase.BossAfterBash,
        "play_heavy_blade" => Phase.Victory,
        _ => _phase
    };

    private static LegalActionDto Action(
        string id,
        string type,
        string label,
        string description,
        string risk,
        IReadOnlyDictionary<string, object?>? metadata = null)
    {
        return new LegalActionDto(id, type, label, description, risk, metadata ?? new Dictionary<string, object?>());
    }

    private static void ApplyMap(
        IReadOnlyDictionary<string, object?> diff,
        string key,
        IDictionary<string, object?> target)
    {
        if (!diff.TryGetValue(key, out var value)) return;

        foreach (var item in ToObjectMap(value))
        {
            target[item.Key] = item.Value;
        }
    }

    private static IReadOnlyDictionary<string, object?> ToObjectMap(object? value)
    {
        return value switch
        {
            IReadOnlyDictionary<string, object?> map => map,
            JsonElement { ValueKind: JsonValueKind.Object } element => element
                .EnumerateObject()
                .ToDictionary(item => item.Name, item => FromJsonElement(item.Value)),
            _ => new Dictionary<string, object?>()
        };
    }

    private static object? FromJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element
                .EnumerateObject()
                .ToDictionary(item => item.Name, item => FromJsonElement(item.Value)),
            JsonValueKind.Array => element.EnumerateArray().Select(FromJsonElement).ToArray(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var number) => number,
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }
}
