#nullable enable
using System;
using System.Collections.Generic;

namespace ERP.Realtime
{
    // Shared contract 4.9 (device hub) + browser Notify envelope (W1-1).
    public class RealtimeMessage
    {
        public string channel { get; set; } = "";     // print|devices|att|jobs
        public string type { get; set; } = "";
        public int? compCode { get; set; }
        public int? branchCode { get; set; }
        public string at { get; set; } = DateTime.UtcNow.ToString("o");
        public object? data { get; set; }
    }

    // ---- device hub DTOs (bridge <-> server) ----
    public class HelloDto
    {
        public int v { get; set; } = 1;
        public string? agentVersion { get; set; }
        public string? machineName { get; set; }
        public string? osVersion { get; set; }
        public int queueDepth { get; set; }
        public int pendingOutbox { get; set; }
        public List<InstalledPrinterDto>? installedPrinters { get; set; }
        public List<string>? capabilities { get; set; }
    }

    public class InstalledPrinterDto
    {
        public string name { get; set; } = "";
        public bool isDefault { get; set; }
        public string? port { get; set; }
        public string? driver { get; set; }
    }

    public class HeartbeatDto
    {
        public int queueDepth { get; set; }
        public int pendingOutbox { get; set; }
        public long uptimeSec { get; set; }
        public string? clockUtc { get; set; }
        public List<PrinterStateDto>? printers { get; set; }
    }

    public class PrinterStateDto { public int printerId { get; set; } public string state { get; set; } = "unknown"; }

    public class PrinterDto
    {
        public int printerId { get; set; }
        public string name { get; set; } = "";
        public string kind { get; set; } = "";
        public string transport { get; set; } = "";
        public string target { get; set; } = "";
        public string language { get; set; } = "";
        public decimal? paperWidthMm { get; set; }
        public decimal? paperHeightMm { get; set; }
        public int dpi { get; set; } = 203;
        public int? dotsWidth { get; set; }
        public bool hasDrawer { get; set; }
        public int drawerPin { get; set; }
        public int drawerOnMs { get; set; }
        public int drawerOffMs { get; set; }
        public string cutMode { get; set; } = "partial";
        public int? codePage { get; set; }
    }

    public class BridgeConfig
    {
        public int v { get; set; } = 1;
        public int deviceId { get; set; }
        public string? name { get; set; }
        public int compCode { get; set; }
        public int? branchCode { get; set; }
        public string serverTimeUtc { get; set; } = DateTime.UtcNow.ToString("o");
        public string configVersion { get; set; } = "0";
        public int heartbeatSec { get; set; } = 30;
        public string latestAgentVersion { get; set; } = "1.0.0";
        public string logLevel { get; set; } = "Information";
        public List<PrinterDto> printers { get; set; } = new();
        public List<AttendanceDeviceDto> attendanceDevices { get; set; } = new();
    }

    public class AttendanceDeviceDto
    {
        public int deviceId { get; set; }
        public string name { get; set; } = "";
        public string vendor { get; set; } = "zk-tcp";
        public string? host { get; set; }
        public int port { get; set; } = 4370;
        public int commKey { get; set; }
        public string? timeZoneId { get; set; }
        public int pullIntervalMin { get; set; } = 10;
        public bool realtime { get; set; }
        public bool autoSetTime { get; set; } = true;
        public string? lastPunchLocal { get; set; }
    }

    public class JobEnvelope
    {
        public int v { get; set; } = 1;
        public string jobId { get; set; } = "";
        public string docKey { get; set; } = "";
        public bool isReprint { get; set; }
        public string createdAtUtc { get; set; } = DateTime.UtcNow.ToString("o");
        public string? expiresAtUtc { get; set; }
        public int copies { get; set; } = 1;
        public bool copyWatermark { get; set; }
        public bool openDrawer { get; set; }
        public PrinterDto? printer { get; set; }
        public JobPayloadRef? payload { get; set; }
    }

    public class JobPayloadRef { public string kind { get; set; } = "html"; public string url { get; set; } = ""; public string? sha256 { get; set; } public int bytes { get; set; } }

    public class JobStatusDto
    {
        public string jobId { get; set; } = "";
        public string status { get; set; } = "";     // printing|printed|failed|expired
        public int attempts { get; set; }
        public string? error { get; set; }
        public string atUtc { get; set; } = DateTime.UtcNow.ToString("o");
        public bool uncertain { get; set; }
    }

    public class CommandEnvelope
    {
        public int v { get; set; } = 1;
        public long commandId { get; set; }
        public string type { get; set; } = "";
        public int targetDeviceId { get; set; }
        public object? args { get; set; }
        public string? expiresAtUtc { get; set; }
    }

    public class CommandResultDto
    {
        public long commandId { get; set; }
        public bool ok { get; set; }
        public string? error { get; set; }
        public object? result { get; set; }
    }
}
