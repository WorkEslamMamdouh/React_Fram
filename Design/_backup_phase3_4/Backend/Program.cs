 
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

var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]);

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
});

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<SQLServer>();



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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ==========================================
// 🔥 تشغيل التطبيق
// ==========================================
app.Run();