
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{
    public   class CreateFormat_Html_Tsx
    {
        public async Task<string> Set_Area_HtmlReact_tsx(string html , string ModuleCode)
        {

            StringBuilder PageHtml_Tsx = new StringBuilder();



            PageHtml_Tsx.AppendLine(@"""use client""");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"import { useEffect, useRef, useState } from ""react"";");
            PageHtml_Tsx.AppendLine(@"import _Styles from ""./"+ ModuleCode + @".module.css""; ");
            PageHtml_Tsx.AppendLine(@"import { "+ ModuleCode + @" } from ""./"+ ModuleCode + @""";");
            PageHtml_Tsx.AppendLine(@"import { useTranslate } from ""../../ClientApp/Shared/Resources"";");
            PageHtml_Tsx.AppendLine(@"import {  } from ""antd"";");
            PageHtml_Tsx.AppendLine(@"import { useSys } from ""../Shared/SystemUsing"";  ");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"export default function InitalizeComponent() {");
            PageHtml_Tsx.AppendLine(@"const Lang = useTranslate();");
            PageHtml_Tsx.AppendLine(@"const  IsLangEN  = useSys((s)=> s.IsLangEN);");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"const stylesheet = IsLangEN ? (");
            PageHtml_Tsx.AppendLine(@"<link id=""lang-style_"+ ModuleCode + @""" rel=""stylesheet"" href=""/StyleDesign/Pages/"+ ModuleCode + @"/"+ ModuleCode + @"EN.css"" />");
            PageHtml_Tsx.AppendLine(@") :  (");
            PageHtml_Tsx.AppendLine(@"<link id=""lang-style_"+ ModuleCode + @""" rel=""stylesheet"" href=""/StyleDesign/Pages/"+ ModuleCode + @"/"+ ModuleCode + @"AR.css"" />");
            PageHtml_Tsx.AppendLine(@") ;");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"const "+ ModuleCode.ToLower() + @" = "+ ModuleCode + @"();");
            PageHtml_Tsx.AppendLine(@"return <"+ ModuleCode + @"Page {..."+ ModuleCode.ToLower() + @"} Lang={Lang} stylesheet ={stylesheet}/>;");
            PageHtml_Tsx.AppendLine(@"}");
            PageHtml_Tsx.AppendLine(@"type _ReturnType = ReturnType<typeof "+ ModuleCode + @">;");
            PageHtml_Tsx.AppendLine(@"type Props = _ReturnType & {");
            PageHtml_Tsx.AppendLine(@"Lang: ReturnType<typeof useTranslate>;");
            PageHtml_Tsx.AppendLine(@"stylesheet : any");
            PageHtml_Tsx.AppendLine(@"};");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"function "+ ModuleCode + @"Page(p: Props) {");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"return ( ");
            PageHtml_Tsx.AppendLine(@"<>");
            PageHtml_Tsx.AppendLine(@"{p.stylesheet} ");
            PageHtml_Tsx.AppendLine(@"");

            PageHtml_Tsx.AppendLine(await ConvertFormat_Html_Tsx(html));

            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"</>");
            PageHtml_Tsx.AppendLine(@" ); ");
            PageHtml_Tsx.AppendLine(@" }");


            return PageHtml_Tsx.ToString();

        }
        public async Task<string> ConvertFormat_Html_Tsx(string html)
        {
            if (string.IsNullOrEmpty(html))
                return html;



            // 🔥 أهم سطر
            html = ExtractBodyOnly(html);


            // 🔥 شيل الكومنتات
            html = Regex.Replace(html, @"<!--[\s\S]*?-->", "", RegexOptions.IgnoreCase);


            html = Regex.Replace(html, @"clip-rule", "clipRule", RegexOptions.IgnoreCase);

            // =========================
            // 1. class → className
            // =========================
            html = Regex.Replace(html, @"class=""([^""]*)""", match =>
            {
                var classes = match.Groups[1].Value
                    .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

                var classBuilder = string.Join(" ",
                    classes.Select(cls => $"${{_Styles[\"{cls}\"] || \"{cls}\"}}"));

                return $"className={{`{classBuilder}`}}";
            });

            // =========================
            // 2. onclick
            // =========================
            html = Regex.Replace(html, @"onclick=""([^""]*)\(\)""",
                m => $"onClick={{p.{m.Groups[1].Value}}}");

            // =========================
            // 3. onchange
            // =========================
            html = Regex.Replace(html, @"onchange=""([^""]*)\(\)""",
                m => $"onChange={{p.{m.Groups[1].Value}}}");
             
            // =========================
            // 4. style
            // =========================
            html = Regex.Replace(html, @"style=""([^""]*)""", match =>
            {
                var styles = match.Groups[1].Value.Split(';');

                var styleObj = styles
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s =>
                    {
                        var parts = s.Split(':');
                        if (parts.Length != 2) return null;

                        var key = parts[0].Trim();
                        var value = parts[1].Trim();

                        key = Regex.Replace(key, "-([a-z])", m => m.Groups[1].Value.ToUpper());

                        return $"{key}: \"{value}\"";
                    })
                    .Where(x => x != null);

                return $"style={{{{ {string.Join(", ", styleObj)} }}}}";
            });

            // =========================
            // 5. Self closing
            // =========================
            html = Regex.Replace(html, @"<input([^>/]*)>", "<input$1 />");
            html = Regex.Replace(html, @"<img([^>/]*)>", "<img$1 />");
            html = Regex.Replace(html, @"<br\s*>", "<br/>", RegexOptions.IgnoreCase);

            // =========================
            // 6. Extract Texts first
            // =========================
            var matches = Regex.Matches(html, @">(.*?)<");

            var replacements = new Dictionary<string, string>();

            foreach (Match match in matches)
            {
                var content = match.Groups[1].Value;
                var rawText = Regex.Replace(content, "<.*?>", "").Trim();
                var text = rawText;

                if (string.IsNullOrWhiteSpace(text) || text.Length < 2)
                    continue;

                if (string.IsNullOrWhiteSpace(text))
                    continue;

                // 🔥 استخدم النص الخام مش المنضف
                if (IsNumericLike(rawText))
                    continue;

                if (!replacements.ContainsKey(text))
                {
                    var key = await GenerateLangKeyAsync(text);
                    replacements[text] = key;
                }
            }

            // =========================
            // 7. Replace after async done
            // =========================
            foreach (var item in replacements)
            {
                if (IsNumericLike(item.Key))
                    continue;

                html = html.Replace($">{item.Key}<", $">{{p.Lang.{item.Value}}}<");
            }


            // =========================
            // 8. Fix aria number props
            // =========================
            html = Regex.Replace(html, @"aria-valuenow=""(\d+)""", "aria-valuenow={$1}");
            html = Regex.Replace(html, @"aria-valuemin=""(\d+)""", "aria-valuemin={$1}");
            html = Regex.Replace(html, @"aria-valuemax=""(\d+)""", "aria-valuemax={$1}");


            return html;
        }

        bool IsNumericLike(string text)
        {
            return Regex.IsMatch(text, @"^[\d\s\.\%\+\/\-]+$");
        }

        private string ExtractBodyOnly(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return html;

            // 1️⃣ شيل script بالكامل
            html = Regex.Replace(html, @"<script[\s\S]*?</script>", "", RegexOptions.IgnoreCase);

            // 2️⃣ شيل head بالكامل
            html = Regex.Replace(html, @"<head[\s\S]*?</head>", "", RegexOptions.IgnoreCase);

            // 3️⃣ استخرج اللي جوا body
            var bodyMatch = Regex.Match(html, @"<body[^>]*>([\s\S]*?)</body>", RegexOptions.IgnoreCase);

            if (bodyMatch.Success)
            {
                html = bodyMatch.Groups[1].Value;
            }

            // 4️⃣ شيل html tags لو موجودة
            html = Regex.Replace(html, @"</?html[^>]*>", "", RegexOptions.IgnoreCase);

            return html.Trim();
        }

        private async Task<string> GenerateLangKeyAsync(string text)
        {
            // لو عربي → ترجمه إنجليزي
            string baseText = text;

            if (IsArabic(text))
            {
                baseText = await Translate(text, "en");
            }

            // clean
            var clean = Regex.Replace(baseText, @"[^\w\s]", "");
            var words = clean
                            .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                            .Where(w => !string.IsNullOrWhiteSpace(w))
                            .ToList();
            if (words.Count == 0)
                return "text"; // fallback key

            return string.Join("", words.Select((w, i) =>
            {
                if (string.IsNullOrWhiteSpace(w))
                    return "";

                if (i == 0)
                    return w.ToLower();

                return w.Length == 1
                    ? w.ToUpper()
                    : char.ToUpper(w[0]) + w.Substring(1);
            }));
        }

        private bool IsArabic(string text)
        {
            return Regex.IsMatch(text, @"[\u0600-\u06FF]");
        }

        private static readonly HttpClient _http = new HttpClient();

        private static Dictionary<string, string> _cache = new Dictionary<string, string>();

        private async Task<string> Translate(string text, string to = "ar")
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


        public async Task<string> GenerateTranslationsAsync(List<string> texts)
        {
            var enDict = new Dictionary<string, string>();
            var arDict = new Dictionary<string, string>();

            var tasks = texts.Distinct()
                .Where(t => !string.IsNullOrWhiteSpace(t))
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

        private string BuildJson(Dictionary<string, string> en, Dictionary<string, string> ar)
        {
            var sb = new StringBuilder();

            sb.AppendLine("export const Lang = {");

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
