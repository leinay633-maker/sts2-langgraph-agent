using System.Text.Json;
using Sts2LangGraphAgent.Bridge.Core;

namespace Sts2LangGraphAgent.Bridge.Mod;

public sealed class ModEntry
{
    private HttpBridgeServer? _server;

    public void Start()
    {
        var config = BridgeConfig.Load();

        // Replace SampleGameAdapter with a real Slay the Spire 2 adapter once
        // the target game assemblies/types are available to this project.
        IGameAdapter adapter = new SampleGameAdapter();

        _server = new HttpBridgeServer(adapter, config.Port);
        _server.Start();
    }

    public void Stop()
    {
        _server?.Dispose();
        _server = null;
    }
}

public sealed record BridgeConfig(int Port)
{
    public static BridgeConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "STS2_MCP.conf");
        if (!File.Exists(path)) return new BridgeConfig(15526);

        var raw = File.ReadAllText(path);
        var doc = JsonSerializer.Deserialize<Dictionary<string, int>>(raw);
        return new BridgeConfig(doc?.GetValueOrDefault("port", 15526) ?? 15526);
    }
}
