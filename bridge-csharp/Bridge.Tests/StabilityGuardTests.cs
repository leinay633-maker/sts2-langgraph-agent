using Sts2LangGraphAgent.Bridge.Core;
using Xunit;

namespace Sts2LangGraphAgent.Bridge.Tests;

public sealed class StabilityGuardTests
{
    [Fact]
    public void BridgeRuntimeAdapterStartsStable()
    {
        var adapter = new BridgeRuntimeAdapter();
        var guard = new StabilityGuard();
        Assert.True(guard.IsStable(adapter.ReadState()));
    }

    [Fact]
    public void ActionResolverRejectsUnknownAction()
    {
        var adapter = new BridgeRuntimeAdapter();
        var resolver = new ActionResolver(adapter, new StabilityGuard());
        var response = resolver.ExecuteIfLegal("missing");
        Assert.Equal("rejected", response.Status);
    }
}
