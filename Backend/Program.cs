 
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using GateWay.App;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GateWay.Filters;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 🔥 إضافة DbContext
// ========================================== 

// ==========================================
// 🔥 إضافة Redis Cache (الأهم)
// ==========================================

// الطريقة 1: استخدام Redis Cache (للإنتاج)
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = "ManagementSQL_";
    });
    Console.WriteLine("✅ Redis Cache Service Registered");
}
else
{
    // الطريقة 2: استخدام Memory Cache كبديل (للتطوير)
    builder.Services.AddMemoryCache();
    Console.WriteLine("⚠️ Redis not configured, using Memory Cache as fallback");
}

// ==========================================
// 🔥 إضافة باقي الخدمات
// ==========================================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {token}"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin()
         .AllowAnyHeader()
         .AllowAnyMethod());
});

// W0-3: JWT key from config (env var Jwt__Key overrides). Warn (don't fail) if < 32 bytes.
var jwtKeyStr = builder.Configuration["Jwt:Key"] ?? "";
var key = Encoding.UTF8.GetBytes(jwtKeyStr);
if (key.Length < 32)
    Console.WriteLine($"⚠️ WARNING: Jwt:Key is only {key.Length} bytes; set a 32+ char key via the Jwt__Key environment variable.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),

        ClockSkew = TimeSpan.Zero
    };

    // W0-3 / W1-1: let SignalR hubs (/hubs/app) pass the JWT via ?access_token=
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var accessToken = ctx.Request.Query["access_token"];
            var path = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/app"))
                ctx.Token = accessToken;
            return System.Threading.Tasks.Task.CompletedTask;
        }
    };
})
// W1-3: device token scheme for /hubs/devices and api/devices/*
.AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, ERP.Devices.DeviceAuthenticationHandler>(
    ERP.Devices.DeviceAuthenticationHandler.SchemeName, null);

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<SQLServer>();

// ==========================================
// 🔥 Wave 0 / Wave 1 services
// ==========================================
builder.Services.AddMemoryCache(); // always (DataApiAuthFilter + caches)
builder.Services.AddSingleton<ERP.Audit.AuditWriter>();
builder.Services.AddSingleton<GateWay.Security.SensitiveDataGuard>();
builder.Services.AddScoped<ERP.Auth.PasswordService>();
builder.Services.AddScoped<GateWay.Security.DataApiAuthFilter>();

// W0-1: rate limit login (10/min/IP)
builder.Services.AddRateLimiter(o =>
{
    o.AddPolicy("login", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    o.AddPolicy("pair", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// ==========================================
// 🔥 Wave 1 runtime: realtime, devices, printing, attendance, numbering, custom fields, jobs
// ==========================================
builder.Services.AddSignalR();
builder.Services.AddSingleton<ERP.Realtime.DeviceConnectionRegistry>();
builder.Services.AddSingleton<ERP.Realtime.RealtimeNotifier>();
builder.Services.AddSingleton<ERP.Devices.RuntimeKeyStore>();
builder.Services.AddSingleton<ERP.Realtime.IDeviceConfigService, ERP.Devices.DeviceConfigService>();
builder.Services.AddSingleton<ERP.Devices.PairingService>();
builder.Services.AddSingleton<ERP.Attendance.PunchIngestService>();
builder.Services.AddSingleton<ERP.Attendance.PunchMapper>();
builder.Services.AddSingleton<ERP.Attendance.RosterResolver>();
builder.Services.AddSingleton<ERP.Attendance.AttProcessService>();
builder.Services.AddSingleton<ERP.Common.PermissionChecker>();
builder.Services.AddSingleton<ERP.Printing.PrintService>();
builder.Services.AddSingleton<ERP.Numbering.NumberingService>();
builder.Services.AddSingleton<ERP.CustomFields.CustomFieldService>();
builder.Services.AddSingleton<ERP.Audit.AuditService>();

// job handlers (resolved per run inside a scope)
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.AttMapHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.AttProcessHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.PrintExpireHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.PrintPurgeHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.DeviceOfflineSweepHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.DeviceTimeSyncHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.AuditPurgeHandler>();
builder.Services.AddTransient<ERP.Jobs.IJobHandler, ERP.Jobs.PasswordMigrateHandler>();

// background services
builder.Services.AddHostedService<ERP.Jobs.JobScheduler>();
builder.Services.AddHostedService<ERP.Jobs.DeviceCommandDispatcher>();
builder.Services.AddHostedService<ERP.Jobs.PrintJobDispatcher>();



// إضافة الفلتر كـ Service
builder.Services.AddScoped<AutoDecryptFilter>();

// أو إضافته بشكل عام لكل الـ Controllers
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AutoDecryptFilter>(); // هيشتغل على كل الـ APIs
});

// أو إضافته بشكل محدد لـ Controller معين
builder.Services.AddControllers()
    .AddMvcOptions(options =>
    {
        options.Filters.Add<AutoDecryptFilter>();
    });


var app = builder.Build();

// ==========================================
// 🔥 إعداد ConnectionString
// ==========================================
ConnectionString.connectionString = builder.Configuration.GetConnectionString("cs");

// ==========================================
// 🔥 إعداد Redis Cache في الـ Service (الأهم)
// ==========================================

int _cacheDurationSeconds = 60; // إعداد Redis Cache بال ثانيه  وقت تحديث 
try
{

    // محاولة استخدام Redis Cache
    var redisCache = app.Services.GetService<IDistributedCache>();
    if (redisCache != null && !string.IsNullOrEmpty(redisConnectionString))
    {
        SQLServer.ConfigureRedis(redisCache, durationSeconds: _cacheDurationSeconds, enable: true);
        Console.WriteLine("✅ Redis Cache ENABLED and CONFIGURED");
    }
    else
    {
        // استخدام Memory Cache كبديل
        var memoryCache = app.Services.GetRequiredService<IMemoryCache>();
        SQLServer.ConfigureMemoryCache(memoryCache, durationSeconds: _cacheDurationSeconds, enable: true);
        Console.WriteLine("⚠️ Using Memory Cache as fallback (Redis not available)");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Failed to configure Redis: {ex.Message}");
    // Fallback إلى Memory Cache
    var memoryCache = app.Services.GetRequiredService<IMemoryCache>();
    SQLServer.ConfigureMemoryCache(memoryCache, durationSeconds: _cacheDurationSeconds, enable: true);
    Console.WriteLine("⚠️ Using Memory Cache as fallback");
}

// ==========================================
// 🔥 إعدادات Cache المتقدمة
// ==========================================

// ✅ السماح لجدول Users فقط بالـ Cache
SQLServer.SetAllowedTablesForCache(new List<string> { "Users" });

// ✅ إضافة جدول Products للقائمة المسموحة
SQLServer.AddAllowedTable("Products");

// ✅ إيقاف Cache لجدول Logs
SQLServer.DisableCacheForTable("Logs");

// ✅ تفعيل Auto Cache (تلقائي)
SQLServer.SetAutoCacheEnabled(true);

// ✅ عرض حالة الـ Cache
var status = SQLServer.GetCacheStatus();
Console.WriteLine($"========================================");
Console.WriteLine($"📊 CACHE STATUS:");
Console.WriteLine($"   {status.GetStatusText()}");
Console.WriteLine($"   Allowed Tables: {status.GetAllowedTablesText()}");
Console.WriteLine($"   Excluded Tables: {status.GetExcludedTablesText()}");
Console.WriteLine($"   Duration: {status.CacheDurationSeconds}s");
Console.WriteLine($"   Auto Cache: {(status.IsAutoCacheEnabled ? "ON" : "OFF")}");
Console.WriteLine($"========================================");

// ==========================================
// 🔥 إعداد Swagger و Middleware
// ==========================================
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");
app.UseRateLimiter();            // W0-1
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// W1-1: SignalR hubs
app.MapHub<ERP.Realtime.AppHub>("/hubs/app");
app.MapHub<ERP.Realtime.DeviceHub>("/hubs/devices", o => { o.ApplicationMaxBufferSize = 65536; o.TransportMaxBufferSize = 65536; });

// W1-3: ensure the runtime RSA key exists (for sealed device secrets)
try { await app.Services.GetRequiredService<ERP.Devices.RuntimeKeyStore>().EnsureActiveKeyAsync(); }
catch (Exception ex) { Console.WriteLine($"⚠️ Runtime key init skipped: {ex.Message}"); }

// W0-5: upsert runtime settings (contract version + public URL) on startup.
try
{
    var publicUrl = builder.Configuration["Runtime:PublicUrl"] ?? "";
    using var con = new Microsoft.Data.SqlClient.SqlConnection(ConnectionString.connectionString);
    con.Open();
    using var cmd = new Microsoft.Data.SqlClient.SqlCommand(@"
IF OBJECT_ID(N'dbo.Sys_RuntimeSettings', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Sys_RuntimeSettings AS t USING (SELECT 'Contract.Version' AS K, N'wave1-v1' AS V) s ON t.SettingKey=s.K
      WHEN MATCHED THEN UPDATE SET SettingValue=s.V, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=N'runtime'
      WHEN NOT MATCHED THEN INSERT (SettingKey,SettingValue,UpdatedBy) VALUES (s.K,s.V,N'runtime');
    IF @url <> N''
      MERGE dbo.Sys_RuntimeSettings AS t USING (SELECT 'Runtime.PublicUrl' AS K, @url AS V) s ON t.SettingKey=s.K
        WHEN MATCHED THEN UPDATE SET SettingValue=s.V, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=N'runtime'
        WHEN NOT MATCHED THEN INSERT (SettingKey,SettingValue,UpdatedBy) VALUES (s.K,s.V,N'runtime');
END", con);
    cmd.Parameters.AddWithValue("@url", publicUrl);
    cmd.ExecuteNonQuery();
    Console.WriteLine("✅ Runtime settings upserted (Contract.Version=wave1-v1)");
}
catch (Exception ex) { Console.WriteLine($"⚠️ Runtime settings upsert skipped: {ex.Message}"); }

// ==========================================
// 🔥 تشغيل التطبيق
// ==========================================
app.Run();