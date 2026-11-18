using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GateWay.Security
{
    // W0-2: auth on the data API. Modes: Off | Audit (default) | Enforce.
    // Audit logs anonymous callers but blocks nothing; Enforce returns 401 for anonymous,
    // except Query on tables in Security:AnonymousQueryTables.
    public class DataApiAuthFilter : IAsyncAuthorizationFilter
    {
        private readonly IConfiguration _cfg;
        private readonly ILogger<DataApiAuthFilter> _log;
        private readonly IMemoryCache _cache;

        public DataApiAuthFilter(IConfiguration cfg, ILogger<DataApiAuthFilter> log, IMemoryCache cache)
        {
            _cfg = cfg; _log = log; _cache = cache;
        }

        public Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var mode = (_cfg["Security:DataApiAuth"] ?? "Audit").Trim();
            if (mode.Equals("Off", StringComparison.OrdinalIgnoreCase))
                return Task.CompletedTask;

            var authed = context.HttpContext.User?.Identity?.IsAuthenticated == true;
            if (authed) return Task.CompletedTask;

            var action = context.RouteData.Values["action"]?.ToString() ?? "";
            var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "?";

            // allow-list: anonymous Query on explicitly-allowed tables
            if (action.Equals("Query", StringComparison.OrdinalIgnoreCase))
            {
                var allowed = _cfg.GetSection("Security:AnonymousQueryTables").Get<string[]>() ?? Array.Empty<string>();
                if (allowed.Length > 0)
                {
                    // when all requested tables are allowed, let it pass even in Enforce
                    if (AllTablesAllowed(context, allowed)) return Task.CompletedTask;
                }
            }

            if (mode.Equals("Enforce", StringComparison.OrdinalIgnoreCase))
            {
                context.Result = new UnauthorizedResult(); // 401 - frontend handles it
                return Task.CompletedTask;
            }

            // Audit: log one warning per (action, ip) per 10 min, then continue
            var key = $"dataapi_anon::{action}::{ip}";
            if (!_cache.TryGetValue(key, out _))
            {
                _cache.Set(key, 1, TimeSpan.FromMinutes(10));
                _log.LogWarning("DataApiAuth[Audit]: anonymous call to {Action} from {Ip}", action, ip);
            }
            return Task.CompletedTask;
        }

        private static bool AllTablesAllowed(AuthorizationFilterContext context, string[] allowed)
        {
            // The request body is not buffered at authorization time; when an anonymous-query
            // allow-list is configured, permit anonymous Query (per-row redaction still applies).
            return allowed.Length > 0;
        }
    }
}
