namespace Sts2LangGraphAgent.Bridge.Core;

public interface IGameAdapter
{
    string RunId { get; }
    bool IsAutoslayRunning { get; }
    GameStateDto ReadState();
    IReadOnlyList<LegalActionDto> ListLegalActions();
    ExecuteActionResponse ExecuteAction(string actionId);
    RunSummaryDto ReadSummary();
    RunSummaryDto UpdateSummary(IReadOnlyDictionary<string, object?> diff);
    void StartAutoslay();
    void StopAutoslay();
}
