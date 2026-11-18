#nullable enable
using System;
using System.Threading.Tasks;
using ERP.Common;
using ERP.Realtime;

namespace ERP.Devices
{
    // Builds the BridgeConfig a bridge receives on Hello (4.9): its printers + attendance devices.
    public class DeviceConfigService : IDeviceConfigService
    {
        private readonly RuntimeKeyStore _keys;
        public DeviceConfigService(RuntimeKeyStore keys) { _keys = keys; }

        public async Task<BridgeConfig> BuildConfigAsync(int bridgeDeviceId)
        {
            var cfg = new BridgeConfig { deviceId = bridgeDeviceId };
            var dev = await RuntimeDb.FirstAsync("SELECT Name, CompCode, BranchCode FROM dbo.Sys_Devices WHERE DeviceId=@id", ("@id", bridgeDeviceId));
            if (dev != null)
            {
                cfg.name = RuntimeDb.S(dev["Name"]);
                cfg.compCode = RuntimeDb.I(dev["CompCode"]);
                cfg.branchCode = RuntimeDb.NI(dev["BranchCode"]);
            }
            cfg.configVersion = (await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Config.Version'"))?.ToString() ?? "0";

            foreach (var p in await RuntimeDb.QueryAsync(
                "SELECT * FROM dbo.Sys_Printers WHERE BridgeDeviceId=@id AND IsActive=1", ("@id", bridgeDeviceId)))
            {
                cfg.printers.Add(new PrinterDto
                {
                    printerId = RuntimeDb.I(p["PrinterId"]),
                    name = RuntimeDb.S(p["Name"]) ?? "",
                    kind = RuntimeDb.S(p["Kind"]) ?? "",
                    transport = RuntimeDb.S(p["Transport"]) ?? "",
                    target = RuntimeDb.S(p["Target"]) ?? "",
                    language = RuntimeDb.S(p["Language"]) ?? "",
                    paperWidthMm = p["PaperWidthMm"] as decimal?,
                    paperHeightMm = p["PaperHeightMm"] as decimal?,
                    dpi = RuntimeDb.I(p["Dpi"]),
                    dotsWidth = RuntimeDb.NI(p["DotsWidth"]),
                    hasDrawer = Convert.ToBoolean(p["HasDrawer"]),
                    drawerPin = Convert.ToInt32(p["DrawerPin"]),
                    drawerOnMs = RuntimeDb.I(p["DrawerOnMs"]),
                    drawerOffMs = RuntimeDb.I(p["DrawerOffMs"]),
                    cutMode = RuntimeDb.S(p["CutMode"]) ?? "partial",
                    codePage = RuntimeDb.NI(p["CodePage"])
                });
            }

            foreach (var a in await RuntimeDb.QueryAsync(
                "SELECT * FROM dbo.Sys_Devices WHERE BridgeDeviceId=@id AND DeviceKind='attendance' AND IsActive=1", ("@id", bridgeDeviceId)))
            {
                int commKey = 0;
                var json = _keys.Decrypt(RuntimeDb.S(a["SecretsEnc"]));
                if (json != null)
                {
                    try { var o = Newtonsoft.Json.Linq.JObject.Parse(json); commKey = o.Value<int?>("commKey") ?? 0; } catch { }
                }
                cfg.attendanceDevices.Add(new AttendanceDeviceDto
                {
                    deviceId = RuntimeDb.I(a["DeviceId"]),
                    name = RuntimeDb.S(a["Name"]) ?? "",
                    vendor = RuntimeDb.S(a["Vendor"]) ?? "zk-tcp",
                    host = RuntimeDb.S(a["Host"]),
                    port = RuntimeDb.NI(a["Port"]) ?? 4370,
                    commKey = commKey,
                    timeZoneId = RuntimeDb.S(a["TimeZoneId"]),
                    pullIntervalMin = RuntimeDb.I(a["PullIntervalMin"]),
                    lastPunchLocal = (a["LastPunchLocal"] as DateTime?)?.ToString("s")
                });
            }
            return cfg;
        }
    }
}
