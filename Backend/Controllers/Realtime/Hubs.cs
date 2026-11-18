#nullable enable
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ERP.Common;

namespace ERP.Realtime
{
    // Builds the BridgeConfig returned to a bridge on Hello (printers + attendance devices of this bridge).
    public interface IDeviceConfigService
    {
        Task<BridgeConfig> BuildConfigAsync(int bridgeDeviceId);
    }

    // W1-1: browser hub (JWT). Groups: user:{UserID} and co:{c}:br:{b}:{channel}.
    [Authorize]
    public class AppHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var uid = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(uid))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{uid}");
            await base.OnConnectedAsync();
        }

        public async Task Subscribe(string channel, int compCode, int branchCode)
        {
            var allowed = new[] { "print", "devices", "att", "jobs" };
            if (!allowed.Contains(channel)) throw new HubException("unknown channel");
            var uid = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(uid, out var userId)) throw new HubException("unauthorized");

            // membership check
            var row = await RuntimeDb.FirstAsync(
                "SELECT TOP 1 1 AS ok FROM dbo.Sys_RoleUsers WHERE UserID=@u AND CompCode=@c AND BranchCode=@b AND ISNULL(ISActive,0)=1",
                ("@u", userId), ("@c", compCode), ("@b", branchCode));
            if (row == null) throw new HubException("not a member of that company/branch");

            await Groups.AddToGroupAsync(Context.ConnectionId, $"co:{compCode}:br:{branchCode}:{channel}");
        }

        public async Task Unsubscribe(string channel, int compCode, int branchCode)
            => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"co:{compCode}:br:{branchCode}:{channel}");
    }

    // W1-1 / 4.9: device hub (device token scheme). Methods are exact per contract.
    [Authorize(AuthenticationSchemes = "Device")]
    public class DeviceHub : Hub
    {
        private readonly DeviceConnectionRegistry _registry;
        private readonly IDeviceConfigService _config;

        public DeviceHub(DeviceConnectionRegistry registry, IDeviceConfigService config)
        {
            _registry = registry; _config = config;
        }

        private int DeviceId => int.TryParse(Context.User?.FindFirst("device_id")?.Value, out var id) ? id : 0;

        public override async Task OnConnectedAsync()
        {
            var id = DeviceId;
            if (id > 0)
            {
                _registry.Set(id, Context.ConnectionId);
                await Groups.AddToGroupAsync(Context.ConnectionId, $"device:{id}");
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Devices SET IsOnline=1, LastSeenAtUtc=SYSUTCDATETIME() WHERE DeviceId=@id", ("@id", id));
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            var id = _registry.Remove(Context.ConnectionId);
            if (id.HasValue)
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Devices SET IsOnline=0 WHERE DeviceId=@id", ("@id", id.Value));
            await base.OnDisconnectedAsync(ex);
        }

        public async Task<BridgeConfig> Hello(HelloDto dto)
        {
            var id = DeviceId;
            await RuntimeDb.ExecuteAsync(
                "UPDATE dbo.Sys_Devices SET IsOnline=1, LastSeenAtUtc=SYSUTCDATETIME(), AgentVersion=@v, MachineName=@m, CapabilitiesJson=@c, InstalledPrintersJson=@p WHERE DeviceId=@id",
                ("@v", dto.agentVersion), ("@m", dto.machineName),
                ("@c", dto.capabilities != null ? Newtonsoft.Json.JsonConvert.SerializeObject(dto.capabilities) : null),
                ("@p", dto.installedPrinters != null ? Newtonsoft.Json.JsonConvert.SerializeObject(dto.installedPrinters) : null),
                ("@id", id));
            return await _config.BuildConfigAsync(id);
        }

        public async Task Heartbeat(HeartbeatDto dto)
            => await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Devices SET IsOnline=1, LastSeenAtUtc=SYSUTCDATETIME() WHERE DeviceId=@id", ("@id", DeviceId));

        public async Task JobAccepted(string jobId)
        {
            if (Guid.TryParse(jobId, out var g))
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_PrintJobs SET Status='accepted' WHERE JobId=@j AND Status IN ('sent','queued')", ("@j", g));
        }

        public async Task JobStatus(JobStatusDto dto)
        {
            if (!Guid.TryParse(dto.jobId, out var g)) return;
            string col = dto.status == "printed" ? "PrintedAtUtc=SYSUTCDATETIME()," : "";
            await RuntimeDb.ExecuteAsync(
                $"UPDATE dbo.Sys_PrintJobs SET Status=@s, Attempts=@a, Error=@e, {col} PrintedAtUtc=COALESCE(PrintedAtUtc,CASE WHEN @s='printed' THEN SYSUTCDATETIME() END) WHERE JobId=@j",
                ("@s", dto.status), ("@a", dto.attempts), ("@e", dto.error), ("@j", g));
        }

        public async Task CommandResult(CommandResultDto dto)
        {
            await RuntimeDb.ExecuteAsync(
                "UPDATE dbo.Sys_DeviceCommands SET Status=CASE WHEN @ok=1 THEN 'done' ELSE 'failed' END, ResultJson=@r, Error=@e, DoneAtUtc=SYSUTCDATETIME() WHERE CommandId=@id",
                ("@ok", dto.ok ? 1 : 0),
                ("@r", dto.result != null ? Newtonsoft.Json.JsonConvert.SerializeObject(dto.result) : null),
                ("@e", dto.error), ("@id", dto.commandId));
        }
    }
}
