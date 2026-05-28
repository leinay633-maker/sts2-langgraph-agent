using Sts2LangGraphAgent.Bridge.Core;
using Xunit;

namespace Sts2LangGraphAgent.Bridge.Tests;

public sealed class StabilityGuardTests
{
    [Fact]
    public void LocalRuntimeAdapterStartsStable()
    {
        var adapter = new LocalRuntimeAdapter();
        var guard = new StabilityGuard();
        Assert.True(guard.IsStable(adapter.ReadState()));
    }

    [Fact]
    public void ActionResolverRejectsUnknownAction()
    {
        var adapter = new LocalRuntimeAdapter();
        var resolver = new ActionResolver(adapter, new StabilityGuard());
        var response = resolver.ExecuteIfLegal("missing");
        Assert.Equal("rejected", response.Status);
    }
}
