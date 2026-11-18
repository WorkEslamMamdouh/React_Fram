#nullable enable
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ERP.Realtime
{
    // W1-1: server-side push helpers. Browser method name is "Notify"; device handlers per 4.9.
    public class RealtimeNotifier
    {
        private readonly IHubContext<AppHub> _app;
        private readonly IHubContext<DeviceHub> _dev;

        public RealtimeNotifier(IHubContext<AppHub> app, IHubContext<DeviceHub> dev)
        {
            _app = app; _dev = dev;
        }

        public Task NotifyUserAsync(int userId, RealtimeMessage msg)
            => _app.Clients.Group($"user:{userId}").SendAsync("Notify", msg);

        public Task NotifyGroupAsync(int compCode, int branchCode, string channel, RealtimeMessage msg)
            => _app.Clients.Group($"co:{compCode}:br:{branchCode}:{channel}").SendAsync("Notify", msg);

        // device hub: server -> bridge handlers
        public Task JobOfferAsync(int bridgeDeviceId, JobEnvelope env)
            => _dev.Clients.Group($"device:{bridgeDeviceId}").SendAsync("JobOffer", env);

        public Task CommandAsync(int bridgeDeviceId, CommandEnvelope env)
            => _dev.Clients.Group($"device:{bridgeDeviceId}").SendAsync("Command", env);

        public Task ConfigChangedAsync(int bridgeDeviceId, string configVersion)
            => _dev.Clients.Group($"device:{bridgeDeviceId}").SendAsync("ConfigChanged", new { v = 1, configVersion });

        public Task RevokedAsync(int bridgeDeviceId, string reason)
            => _dev.Clients.Group($"device:{bridgeDeviceId}").SendAsync("Revoked", new { v = 1, reason });
    }
}
