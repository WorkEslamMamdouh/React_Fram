
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class JwtService
{ 

    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }


    public string GenerateToken(string username)
    {
        var secretKey = _config["Jwt:Key"];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, username),
            new Claim("Custom", "ERP")
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }


    public string GenerateToken_obj(object user)
    {
        var secretKey = _config["Jwt:Key"];


        // Fix 2: Convert object to proper type - assuming it's a Dictionary or dynamic
        // Option A: If user is Dictionary<string, object>
        var userDict = user as Dictionary<string, object>;
        if (userDict == null)
            throw new ArgumentException("User must be a Dictionary<string, object>");

        // Fix 3: Safely extract values with null checking
        var userId = userDict.ContainsKey("UserID") ? userDict["UserID"]?.ToString() : null;
        var userCode = userDict.ContainsKey("USER_CODE") ? userDict["USER_CODE"]?.ToString() : null;
        var userRole =  "User";

        var claims = new[]
      {
        new Claim(ClaimTypes.Name, userCode),
        new Claim(ClaimTypes.NameIdentifier, userId),
        new Claim(ClaimTypes.Role, userRole)  // Fix 4: Use proper role value, not ID
    };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            SecurityAlgorithms.HmacSha256
        );

        // W0-3: expiry from Auth:TokenHours (default 5), UtcNow-based.
        var hours = 5;
        if (int.TryParse(_config["Auth:TokenHours"], out var h) && h > 0) hours = h;

        var token = new JwtSecurityToken(
            issuer: "ERP_API",
            audience: "ERP_CLIENT",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(hours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // W0-3: refresh - reissue for an already-authenticated principal.
    public string GenerateTokenForClaims(string userId, string userCode)
    {
        var secretKey = _config["Jwt:Key"];
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, userCode ?? ""),
            new Claim(ClaimTypes.NameIdentifier, userId ?? ""),
            new Claim(ClaimTypes.Role, "User")
        };
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)), SecurityAlgorithms.HmacSha256);
        var hours = 5;
        if (int.TryParse(_config["Auth:TokenHours"], out var h) && h > 0) hours = h;
        var token = new JwtSecurityToken("ERP_API", "ERP_CLIENT", claims, expires: DateTime.UtcNow.AddHours(hours), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

}