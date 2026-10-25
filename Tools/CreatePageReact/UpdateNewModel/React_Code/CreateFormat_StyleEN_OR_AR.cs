
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
    public   class CreateFormat_StyleEN_OR_AR
    {

        private string ExtractStyles(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return "";

            var matches = Regex.Matches(html, @"<style[^>]*>([\s\S]*?)</style>", RegexOptions.IgnoreCase);

            StringBuilder sb = new StringBuilder();

            foreach (Match match in matches)
            {
                sb.AppendLine(match.Groups[1].Value);
            }

            return sb.ToString();
        }



        public async Task<string> ConvertFormat_CSS_StyleEN(string html)
        {
            var css = ExtractStyles(html);

            if (string.IsNullOrWhiteSpace(css))
                return "";

            // 🔥 شيل الكومنتات
            css = Regex.Replace(css, @"/\*[\s\S]*?\*/", "");

            // 🔥 تنضيف مسافات
            css = Regex.Replace(css, @"\s+", " ");

            return css.Trim();
        }


        public async Task<string> ConvertFormat_CSS_StyleAR(string html)
        {
            var css = ExtractStyles(html);

            if (string.IsNullOrWhiteSpace(css))
                return "";

            // 🔥 شيل الكومنتات
            css = Regex.Replace(css, @"/\*[\s\S]*?\*/", "");

            // =========================
            // 🔥 RTL Transform
            // =========================

            // left ↔ right
            css = Regex.Replace(css, @"\bleft\b", "__temp__", RegexOptions.IgnoreCase);
            css = Regex.Replace(css, @"\bright\b", "left", RegexOptions.IgnoreCase);
            css = Regex.Replace(css, @"__temp__", "right", RegexOptions.IgnoreCase);

            // margin / padding
            css = SwapProperty(css, "margin-left", "margin-right");
            css = SwapProperty(css, "padding-left", "padding-right");

            // border
            css = SwapProperty(css, "border-left", "border-right");

            // float
            css = Regex.Replace(css, @"float\s*:\s*left", "float: right", RegexOptions.IgnoreCase);
            css = Regex.Replace(css, @"float\s*:\s*right", "float: left", RegexOptions.IgnoreCase);

            // text-align
            css = Regex.Replace(css, @"text-align\s*:\s*left", "text-align: right", RegexOptions.IgnoreCase);
            css = Regex.Replace(css, @"text-align\s*:\s*right", "text-align: left", RegexOptions.IgnoreCase);

            // transform translateX
            css = Regex.Replace(css, @"translateX\(([^)]+)\)", m =>
            {
                var val = m.Groups[1].Value.Trim();

                if (val.StartsWith("-"))
                    return $"translateX({val.Substring(1)})";
                else
                    return $"translateX(-{val})";
            });

            // 🔥 تنضيف
            css = Regex.Replace(css, @"\s+", " ");

            return css.Trim();
        }


        private string SwapProperty(string css, string leftProp, string rightProp)
        {
            css = Regex.Replace(css, $@"\b{leftProp}\b", "__temp__", RegexOptions.IgnoreCase);
            css = Regex.Replace(css, $@"\b{rightProp}\b", leftProp, RegexOptions.IgnoreCase);
            css = Regex.Replace(css, @"__temp__", rightProp, RegexOptions.IgnoreCase);

            return css;
        }

    }
}
