namespace Sts2LangGraphAgent.Bridge.Core;

public sealed class SampleGameAdapter : IGameAdapter
{
    private int _step;
    private bool _autoslay;

    public string RunId { get; } = $"sample-{Guid.NewGuid():N}";
    public bool IsAutoslayRunning => _autoslay;

    public GameStateDto ReadState()
    {
        var action = new LegalActionDto(
            "sample_end_turn",
            "end_turn",
            "结束回合",
            "Sample adapter action.",
            "high",
            new Dictionary<string, object?>());

        return new GameStateDto(
            RunId,
            _step,
            "stable",
            _step >= 1 ? "victory" : "combat",
            _step >= 1 ? "victory" : "combat",
            $"sample:{_step}",
            new PlayerSnapshot(70, 80, 8, 3, 99, new[] { "Strike", "Defend" }, new[] { "Burning Blood" }, Array.Empty<string>()),
            _step >= 1 ? Array.Empty<EnemySnapshot>() : new[] { new EnemySnapshot("sample_enemy", "Training Dummy", 10, "Attack", 5) },
            _step >= 1 ? Array.Empty<LegalActionDto>() : new[] { action },
            _step >= 1,
            _step >= 1 ? "victory" : null,
            null);
    }

    public IReadOnlyList<LegalActionDto> ListLegalActions() => ReadState().LegalActions;

    public ExecuteActionResponse ExecuteAction(string actionId)
    {
        var state = ReadState();
        var action = state.LegalActions.FirstOrDefault(item => item.ActionId == actionId);
        if (action is null)
        {
            return new ExecuteActionResponse("rejected", "illegal sample action", null, state);
        }

        _step++;
        return new ExecuteActionResponse("accepted", null, action, ReadState());
    }

    public RunSummaryDto ReadSummary() => new(
        new Dictionary<string, object?> { ["source"] = "sample-adapter", ["step"] = _step },
        new Dictionary<string, object?> { ["build_direction"] = "sample" },
        new Dictionary<string, object?>(),
        Array.Empty<RunEventDto>());

    public RunSummaryDto UpdateSummary(IReadOnlyDictionary<string, object?> diff) => ReadSummary();
    public void StartAutoslay() => _autoslay = true;
    public void StopAutoslay() => _autoslay = false;
}
