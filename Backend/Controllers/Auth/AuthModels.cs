namespace ERP.Auth
{
    public class LoginRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }

    // Options bound from configuration section "Auth" (4.4 / W0-1).
    public class AuthOptions
    {
        public bool AllowLegacyGetLogin { get; set; } = true;
        public bool AllowPlaintextFallback { get; set; } = true;
        public bool ClearPlaintextOnMigrate { get; set; } = false;
        public int LockoutThreshold { get; set; } = 5;
        public int LockoutMinutes { get; set; } = 15;
        public int TokenHours { get; set; } = 5;
        public int MinPasswordLength { get; set; } = 6;
    }

    // Result of a login attempt (internal).
    public class LoginOutcome
    {
        public bool Success { get; set; }
        public System.Collections.Generic.Dictionary<string, object>? User { get; set; }
        public string? FailReason { get; set; } // generic text for the caller
    }
}
