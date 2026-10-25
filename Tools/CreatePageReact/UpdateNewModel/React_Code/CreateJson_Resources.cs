using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{
    public class CreateJson_Resources
    {
        private static readonly HttpClient _http = new HttpClient();
        private static Dictionary<string, string> _cache = new Dictionary<string, string>();

        // ===============================
        // 🔥 MAIN FUNCTION
        // ===============================
        public async Task<string> CreateJson_ResourcesTxt(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return "";

            // 🔥 1. نظف HTML
            html = RemoveScriptsAndComments(html);

            // 🔥 2. استخرج النصوص
            var texts = ExtractTexts(html);

            // 🔥 3. ترجم وولد JSON
            return await GenerateTranslationsAsync(texts);
        }

        // ===============================
        // 🔥 Extract Texts
        // ===============================
        private List<string> ExtractTexts(string html)
        {
            var matches = Regex.Matches(html, @">(.*?)<");

            var result = new List<string>();

            foreach (Match match in matches)
            {
                var text = Regex.Replace(match.Groups[1].Value, "<.*?>", "").Trim();

                if (string.IsNullOrWhiteSpace(text))
                    continue;

                if (text.Length < 2)
                    continue;

                if (!result.Contains(text))
                    result.Add(text);
            }

            return result;
        }

        // ===============================
        // 🔥 Remove Script + Comments
        // ===============================
        private string RemoveScriptsAndComments(string html)
        {
            html = Regex.Replace(html, @"<script[\s\S]*?</script>", "", RegexOptions.IgnoreCase);
            html = Regex.Replace(html, @"<!--[\s\S]*?-->", "", RegexOptions.IgnoreCase);
            html = Regex.Replace(html, @"<head[\s\S]*?</head>", "", RegexOptions.IgnoreCase);

            return html;
        }

        // ===============================
        // 🔥 Generate JSON
        // ===============================
        public async Task<string> GenerateTranslationsAsync(List<string> texts)
        {
            var enDict = new Dictionary<string, string>();
            var arDict = new Dictionary<string, string>();

            var tasks = texts
                .Distinct()
                .Select(async text =>
                {
                    string key = await GenerateLangKeyAsync(text);

                    if (IsArabic(text))
                    {
                        arDict[key] = text;
                        enDict[key] = await Translate(text, "en");
                    }
                    else
                    {
                        enDict[key] = text;
                        arDict[key] = await Translate(text, "ar");
                    }
                });

            await Task.WhenAll(tasks);

            return BuildJson(enDict, arDict);
        }

        // ===============================
        // 🔥 Generate Key
        // ===============================
        private async Task<string> GenerateLangKeyAsync(string text)
        {
            string baseText = text;

            if (IsArabic(text))
                baseText = await Translate(text, "en");

            var clean = Regex.Replace(baseText, @"[^\w\s]", "");

            var words = clean
                .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .ToList();

            if (words.Count == 0)
                return "text";

            return string.Join("", words.Select((w, i) =>
            {
                if (i == 0)
                    return w.ToLower();

                return char.ToUpper(w[0]) + w.Substring(1);
            }));
        }

        // ===============================
        // 🔥 Detect Arabic
        // ===============================
        private bool IsArabic(string text)
        {
            return Regex.IsMatch(text, @"[\u0600-\u06FF]");
        }

        // ===============================
        // 🔥 Translate
        // ===============================
        private async Task<string> Translate(string text, string to)
        {
            var key = $"{text}_{to}";

            if (_cache.ContainsKey(key))
                return _cache[key];

            var url = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={to}&dt=t&q={Uri.EscapeDataString(text)}";

            var response = await _http.GetStringAsync(url);

            var json = JArray.Parse(response);
            var result = json[0][0][0].ToString();

            _cache[key] = result;

            return result;
        }

        // ===============================
        // 🔥 Build JSON
        // ===============================
        private string BuildJson(Dictionary<string, string> en, Dictionary<string, string> ar)
        {
            var sb = new StringBuilder();

            sb.AppendLine("export const resources = {");

            // EN
            sb.AppendLine("  en: {");
            foreach (var item in en)
                sb.AppendLine($"    {item.Key}: \"{item.Value}\",");
            sb.AppendLine("  },");

            // AR
            sb.AppendLine("  ar: {");
            foreach (var item in ar)
                sb.AppendLine($"    {item.Key}: \"{item.Value}\",");
            sb.AppendLine("  }");

            sb.AppendLine("};");

            return sb.ToString();
        }
    }
}