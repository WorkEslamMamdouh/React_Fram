
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
    public   class CreateShit_TS
    {
        public async Task<string> CreateShit_Serves_TS(string html , string ModuleCode)
        {

            StringBuilder PageHtml_Tsx = new StringBuilder();



            PageHtml_Tsx.AppendLine(@"""use client""");
            PageHtml_Tsx.AppendLine(@"import { Sys } from ""../Shared/SystemTools"";");
            PageHtml_Tsx.AppendLine(@"import { useEffect, useRef, useState } from ""react"";");
            PageHtml_Tsx.AppendLine(@"import { useSys } from ""../Shared/SystemUsing"";");
            PageHtml_Tsx.AppendLine(@"import { } from ""../Shared/Entities_DataBase"";");
            PageHtml_Tsx.AppendLine(@"import { } from ""../Shared/Entities"";");
            PageHtml_Tsx.AppendLine(@"import { OpenPage } from ""../Shared/App"";");
            PageHtml_Tsx.AppendLine(@"import { useRouter } from ""next/navigation"";"); 
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// "+ ModuleCode + " Page  ");
            PageHtml_Tsx.AppendLine(@"// ======================="); 
            PageHtml_Tsx.AppendLine(@"export function "+ ModuleCode + "() {");
            PageHtml_Tsx.AppendLine(@"const Router = useRouter();");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"const didRun = useRef(false);");
            PageHtml_Tsx.AppendLine(@"useEffect(() => {");
            PageHtml_Tsx.AppendLine(@"  if (didRun.current) return; ");
            PageHtml_Tsx.AppendLine(@" didRun.current = true;");
            PageHtml_Tsx.AppendLine(@"InitalizeComponent();");
            PageHtml_Tsx.AppendLine(@"}, [])");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// #region UsingSystem Glopal");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"const ShowLoader = useSys((s) => s.ShowLoader);");
            PageHtml_Tsx.AppendLine(@"const CloseLoader = useSys((s) => s.CloseLoader); ");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// #endregion");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// #region Glopal Varebil");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// var CountGrid = 0;");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// #endregion");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// #region  InitalizeControls  ");
            PageHtml_Tsx.AppendLine(@"// ======================= ");
            PageHtml_Tsx.AppendLine(@"// const email = useRef<HTMLInputElement>(null)");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// #endregion");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"function InitalizeComponent() {");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"InitializeEvents()  ");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"}");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"function InitializeEvents() {");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"//if (email.current) {");
            PageHtml_Tsx.AppendLine(@"//email.current.onchange = showWebsite;");
            PageHtml_Tsx.AppendLine(@"//}");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"}");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// #region Events Elements Html");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");  
            PageHtml_Tsx.AppendLine(GenerateFunctionsFromHtml(html));
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// #endregion");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// UI");
            PageHtml_Tsx.AppendLine(@"// =======================");
            PageHtml_Tsx.AppendLine(@"// value");
            PageHtml_Tsx.AppendLine(@"const state = {");
            PageHtml_Tsx.AppendLine(@"};");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"//function");
            PageHtml_Tsx.AppendLine(@"const actions = {");  
            

            PageHtml_Tsx.AppendLine(GenerateFunctionsActions(html));
            PageHtml_Tsx.AppendLine(@"};");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"// Element");
            PageHtml_Tsx.AppendLine(@"const elements = {");
            PageHtml_Tsx.AppendLine(@"//email,"); 
            PageHtml_Tsx.AppendLine(@"};");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"return {");
            PageHtml_Tsx.AppendLine(@"...state,");
            PageHtml_Tsx.AppendLine(@"...actions,");
            PageHtml_Tsx.AppendLine(@"...elements");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"};");
            PageHtml_Tsx.AppendLine(@"");
            PageHtml_Tsx.AppendLine(@"};");


            return PageHtml_Tsx.ToString();

        }



        public string GenerateFunctionsFromHtml(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return "";

            var functions = new HashSet<string>();

            // 🔥 onclick
            var onclickMatches = Regex.Matches(html, @"onclick=""([^""]+)\(\)""", RegexOptions.IgnoreCase);
            foreach (Match match in onclickMatches)
            {
                functions.Add(match.Groups[1].Value);
            }

            // 🔥 onchange
            var onchangeMatches = Regex.Matches(html, @"onchange=""([^""]+)\(\)""", RegexOptions.IgnoreCase);
            foreach (Match match in onchangeMatches)
            {
                functions.Add(match.Groups[1].Value);
            }

            // ممكن تزود هنا:
            // oninput / onsubmit / onblur ... الخ

            // =========================
            // 🔥 build result
            // =========================
            StringBuilder sb = new StringBuilder();

            foreach (var fn in functions)
            {
                sb.AppendLine($"function {fn}() {{");
                sb.AppendLine("}");
                sb.AppendLine("");
            }

            return sb.ToString();
        }



        public string GenerateFunctionsActions(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return "";

            var functions = new HashSet<string>();

            // 🔥 onclick
            var onclickMatches = Regex.Matches(html, @"onclick=""([^""]+)\(\)""", RegexOptions.IgnoreCase);
            foreach (Match match in onclickMatches)
            {
                functions.Add(match.Groups[1].Value);
            }

            // 🔥 onchange
            var onchangeMatches = Regex.Matches(html, @"onchange=""([^""]+)\(\)""", RegexOptions.IgnoreCase);
            foreach (Match match in onchangeMatches)
            {
                functions.Add(match.Groups[1].Value);
            }

            // ممكن تزود هنا:
            // oninput / onsubmit / onblur ... الخ

            // =========================
            // 🔥 build result
            // =========================
            StringBuilder sb = new StringBuilder();

            foreach (var fn in functions)
            {
                sb.AppendLine($"{fn},"); 
            }

            return sb.ToString();
        }


    }
}
