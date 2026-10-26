// =====================================================================================
//  Form4_GridPage.Gen.cs  —  توليد الكود والقوالب
// -------------------------------------------------------------------------------------
//  Generate()      : بيقرا الإعدادات من الشاشة ويولّد الملفات في تاب المعاينة
//  جدول بسيط       : TPL_TS + TPL_TSX       (DynamicGrid + beforeSave للتحقق)
//  ماستر ديتيل     : TPL_MD_TS + TPL_MD_TSX (MasterDetail)
//  الصلاحيات       : TPL_SQL
//  مكتوب بـ C# 7.3 عشان يشتغل على .NET Framework 4.6.1
// =====================================================================================

using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace UpdateNewModel
{
    public partial class Form4_GridPage
    {
        // =====================================================================
        // #region أدوات صغيرة
        // =====================================================================
        static string Js(string s) { return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " "); }
        static string Sql(string s) { return (s ?? "").Replace("'", "''"); }
        static string T(string en, string ar) { return "t(\"" + Js(en) + "\", \"" + Js(ar) + "\")"; }

        static bool IsNumber(string v)
        {
            double d;
            return double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d);
        }

        static string JsValue(string v) { return IsNumber(v) ? v : "\"" + Js(v) + "\""; }

        static string SearchCall(GridFieldSettings s)
        {
            return s.SearchFn + "(" + (s.SearchCond == "" ? "" : "\"" + Js(s.SearchCond) + "\"") + ")";
        }

        // القيمة الافتراضية اللي المستخدم كتبها حسب نوع الحقل  (today = تاريخ النهارده)
        static string DefaultLiteral(RowInfo r)
        {
            string v = r.S.DefaultValue;
            if (v.Equals("today", StringComparison.OrdinalIgnoreCase)) return "Today";
            if (r.S.InputType == "checkbox")
            {
                string l = v.ToLower();
                return (l == "1" || l == "true" || l == "نعم") ? "true" : "false";
            }
            if (r.S.InputType == "number") return IsNumber(v) ? v : "0";
            return JsValue(v);
        }

        static string SelectOptions(RowInfo r)
        {
            return "[" + string.Join(", ", r.Options.Select(o => "{ value: " + JsValue(o.Value) + ", label: " + T(o.En, o.Ar) + " }")) + "]";
        }

        // المعادلة: أسماء الحقول بتتحول لـ n(r.Field)
        //   Qty * UnitPrice * (1 - DiscountPrc / 100)  →  (r, n) => n(r.Qty) * n(r.UnitPrice) * (1 - n(r.DiscountPrc) / 100)
        static string FormulaJs(string formula, IEnumerable<string> fields)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var f in fields) if (!map.ContainsKey(f)) map[f] = f;
            string body = Regex.Replace(formula, @"(?<![\w.""'])([A-Za-z_]\w*)\b(?!\s*\()", m =>
            {
                string real;
                return map.TryGetValue(m.Groups[1].Value, out real) ? "n(r." + real + ")" : m.Value;
            });
            return "(r, n) => " + body.Trim();
        }

        // يملا من البحث:  ItemName=NameA;UnitPrice=SalePrice  →  { ItemName: "NameA", UnitPrice: "SalePrice" }
        static string FillFromJs(string fillFrom)
        {
            var parts = new List<string>();
            foreach (var p in fillFrom.Split(new[] { ';', ',', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = p.Split('=');
                if (kv.Length != 2 || kv[0].Trim() == "" || kv[1].Trim() == "") continue;
                parts.Add(kv[0].Trim() + ": \"" + Js(kv[1].Trim()) + "\"");
            }
            return parts.Count == 0 ? "" : "{ " + string.Join(", ", parts) + " }";
        }

        // المجاميع:  TotalAmount=Total;ItemsCount=count
        class TotalDef { public string Master; public string Detail; public bool Count; }

        static List<TotalDef> ParseTotals(string totals)
        {
            var list = new List<TotalDef>();
            foreach (var p in (totals ?? "").Split(new[] { ';', ',', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = p.Split('=');
                if (kv.Length != 2 || kv[0].Trim() == "" || kv[1].Trim() == "") continue;
                bool count = kv[1].Trim().Equals("count", StringComparison.OrdinalIgnoreCase);
                list.Add(new TotalDef { Master = kv[0].Trim(), Detail = count ? "" : kv[1].Trim(), Count = count });
            }
            return list;
        }

        static string Indent(string text, string pad)
        {
            return string.Join("\r\n", text.Replace("\r\n", "\n").Split('\n').Select(l => l.Trim() == "" ? "" : pad + l));
        }
        // #endregion

        // =====================================================================
        // #region الجدول البسيط — الأعمدة والفلاتر والشرط
        // =====================================================================
        string GenColumns(List<RowInfo> rows)
        {
            var sb = new StringBuilder();
            int formOrder = 1;
            foreach (var r in rows)
            {
                var s = r.S;
                bool keyManual = r.IsKey && !keyIsIdentity;
                bool inForm = (s.InForm || keyManual) && !(r.IsKey && keyIsIdentity) && !r.Meta.NotInDb && !r.Meta.IsComputed;
                bool isSave = !r.Meta.NotInDb && !r.Meta.IsComputed && (r.IsKey || s.Auto != "" || inForm);   // العمود المحسوب في قاعدة البيانات مش بيتحفظ
                string type = s.InputType;
                var lines = new List<string>();

                lines.Add("field: \"" + s.Field + "\",");
                lines.Add("title: " + T(s.TitleEn, s.TitleAr) + ",");
                if (type == "number" || type == "checkbox" || type == "date") lines.Add("type: \"" + type + "\",");
                if (type != "text" && type != "checkbox") lines.Add("inputType: \"" + type + "\",");
                if (type == "textarea") lines.Add("rows: 3,");
                if (type == "number" && r.IsDecimal) lines.Add("step: 0.01,");
                if (type == "select") lines.Add("selectOptions: " + SelectOptions(r) + ",");
                if (type == "search")
                {
                    lines.Add("searchModal: " + SearchCall(s) + ",");
                    lines.Add("placeholder: t(\"Press 🔍 to pick\", \"دوس 🔍 للاختيار\"),");
                }

                if (s.Auto != "") lines.Add("DefaultValue: " + s.Auto + ",          // تلقائي من الجلسة");
                else if (s.DefaultValue != "") lines.Add("DefaultValue: " + DefaultLiteral(r) + ",");
                else if (type == "select" && r.Options.Count > 0) lines.Add("DefaultValue: " + JsValue(r.Options[0].Value) + ",");
                else if (type == "checkbox" && inForm) lines.Add("DefaultValue: true,");
                else if (type == "number" && inForm && !r.IsKey) lines.Add("DefaultValue: 0,");

                lines.Add("width: " + s.Width + ",");

                if (r.IsKey && keyIsIdentity) { lines.Add("editable: false,"); lines.Add("insertable: false,          // ترقيم تلقائي"); }
                else if (keyManual) lines.Add("IsDisabledInEdit: true,     // المفتاح مش بيتعدّل");
                else if (!inForm) { lines.Add("editable: false,"); lines.Add("insertable: false,"); }

                if ((s.Required && inForm) || keyManual) lines.Add("IsRequired: true,");
                lines.Add("IsSave: " + (isSave ? "true," : "false,              // " + (r.Meta.NotInDb ? "مش في الجدول" : "للعرض بس")));
                if (!s.InGrid) lines.Add("IsVisibleDisplayInGrid: false,");
                if (!s.Search || r.Meta.NotInDb) lines.Add("IsSearchColumn: false,");
                if (inForm) lines.Add("SortFieldInEditAndAdd: " + (formOrder++) + ",");

                sb.AppendLine("      {");
                foreach (var l in lines) sb.AppendLine("        " + l);
                sb.AppendLine("      },");
            }
            return sb.ToString().TrimEnd();
        }

        string GenFilters(List<RowInfo> rows)
        {
            var sb = new StringBuilder();
            int n = 1;
            foreach (var r in rows.Where(x => x.S.InFilter && !x.Meta.NotInDb))
            {
                string head = "      { field: \"" + r.Field + "\", label: " + T(r.S.TitleEn, r.S.TitleAr) + ", ";
                string tail = "sortOrder: " + (n++) + " },";
                switch (r.S.InputType)
                {
                    case "select":
                        sb.AppendLine(head + "type: \"select\", options: [" + string.Join(", ", r.Options.Select(o => "{ value: \"" + Js(o.Value) + "\", label: " + T(o.En, o.Ar) + " }")) + "], " + tail);
                        break;
                    case "checkbox":
                        sb.AppendLine(head + "type: \"select\", options: [{ value: \"1\", label: t(\"Yes\", \"نعم\") }, { value: \"0\", label: t(\"No\", \"لا\") }], " + tail);
                        break;
                    case "search":
                        if (r.S.SearchFn != "") sb.AppendLine(head + "type: \"search\", searchModal: " + SearchCall(r.S) + ", " + tail);
                        else sb.AppendLine(head + "type: \"text\", " + tail);
                        break;
                    case "number":
                        sb.AppendLine(head + "type: \"number\", " + tail);
                        break;
                    case "date":
                        sb.AppendLine(head + "type: \"dateRange\", " + tail);
                        break;
                    default:
                        sb.AppendLine(head + "type: \"text\", " + tail);
                        break;
                }
            }
            return sb.ToString().TrimEnd();
        }

        string GenCondition(List<RowInfo> rows)
        {
            var parts = new List<string>();
            if (chkFilterComp.Checked && rows.Any(r => r.Field.Equals("CompCode", StringComparison.OrdinalIgnoreCase) && !r.Meta.NotInDb))
                parts.Add("CompCode = ${CompCode}");
            if (chkFilterBranch.Checked && rows.Any(r => r.Field.Equals("BranchCode", StringComparison.OrdinalIgnoreCase) && !r.Meta.NotInDb))
                parts.Add("BranchCode = ${BranchCode}");
            string extra = CleanCondition(txtExtraCondition.Text).Replace("\\", "\\\\").Replace("${", "\\${");
            if (extra != "") parts.Add(parts.Count == 0 ? extra : "(" + extra + ")");
            return parts.Count == 0 ? "\"\"" : "`" + string.Join(" AND ", parts) + "`";
        }

        static string GenImports(IEnumerable<RowInfo> rows)
        {
            var fns = rows.Where(r => r.S.InputType == "search" && r.S.SearchFn != "")
                          .Select(r => r.S.SearchFn).Distinct().OrderBy(x => x).ToList();
            return fns.Count == 0 ? "" : "import { " + string.Join(", ", fns) + " } from \"../Shared/G_SearchFrom\";\r\n";
        }
        // #endregion

        // =====================================================================
        // #region التحقق (Validations) → كود
        // =====================================================================
        string GenValidations(List<ValidationSettings> list, bool md)
        {
            var sb = new StringBuilder();
            foreach (var v in list)
            {
                if (!md && v.Detail > 0) continue;   // الجدول البسيط مفيهوش تفاصيل
                var a = new List<string>();
                a.Add("type: \"" + v.Type + "\"");
                if (md && v.Detail > 0) a.Add("detail: " + v.Detail);
                if (v.Field != "" && v.Type != "minRows" && v.Type != "custom") a.Add("field: \"" + Js(v.Field) + "\"");
                if (v.When == "insert" || v.When == "update") a.Add("when: \"" + v.When + "\"");
                if (v.Type == "compare")
                {
                    a.Add("operator: \"" + (v.Operator == "" ? "=" : v.Operator) + "\"");
                    if (v.CompareTo != "") a.Add("compareTo: \"" + Js(v.CompareTo) + "\"");
                    else a.Add("value: " + JsValue(v.Value));
                }
                if ((v.Type == "range" || v.Type == "minRows") && IsNumber(v.Min)) a.Add("min: " + v.Min);
                if (v.Type == "range" && IsNumber(v.Max)) a.Add("max: " + v.Max);
                if (v.Type == "regex") a.Add("pattern: \"" + Js(v.Pattern) + "\"");
                if (v.Type == "unique" && v.Table != "") a.Add("table: \"" + Js(v.Table) + "\"");
                if (v.Type == "exists" || v.Type == "notExists")
                {
                    a.Add("table: \"" + Js(v.Table) + "\"");
                    a.Add("condition: \"" + Js(v.Condition) + "\"");
                }

                sb.AppendLine("      {");
                sb.AppendLine("        " + string.Join(", ", a) + ",");
                if (v.Type == "custom")
                {
                    string code = (v.Code ?? "").Trim();
                    bool block = code.Contains("return") || code.Contains(";") || code.Contains("\n");
                    if (block)
                    {
                        sb.AppendLine("        check: async (ctx) => {");
                        sb.AppendLine(Indent(code, "          "));
                        sb.AppendLine("        },");
                    }
                    else sb.AppendLine("        check: (ctx) => (" + (code == "" ? "null" : code) + "),");
                }
                sb.AppendLine("        messageEn: \"" + Js(v.MessageEn) + "\", messageAr: \"" + Js(v.MessageAr) + "\",");
                sb.AppendLine("      },");
            }
            return sb.ToString().TrimEnd();
        }
        // #endregion

        // =====================================================================
        // #region الماستر ديتيل — الأعمدة
        // =====================================================================
        //  role: "master" أو "detail"
        //  fk = عمود الربط (للتفاصيل)   totals = حقول الماستر اللي بتتملى من المجاميع
        string GenMdColumns(List<RowInfo> rows, bool keyIdentity, string fk, HashSet<string> totals, bool isDetail)
        {
            var sb = new StringBuilder();
            var fieldNames = rows.Select(x => x.Field).ToList();
            int formOrder = 1;
            foreach (var r in rows)
            {
                var s = r.S;
                bool isFk = fk != "" && r.Field.Equals(fk, StringComparison.OrdinalIgnoreCase);
                bool isTotal = totals != null && totals.Contains(r.Field);
                bool hasFormula = s.Formula != "";
                bool keyManual = r.IsKey && !keyIdentity && !isDetail;
                bool readOnly = (r.IsKey && (keyIdentity || isDetail)) || isFk || isTotal || hasFormula || r.Meta.NotInDb || r.Meta.IsComputed || s.Auto != "" || !(s.InForm || keyManual);
                bool isSave = !r.Meta.NotInDb && !r.Meta.IsComputed && !isFk && !(isDetail && r.IsKey) && (r.IsKey || s.Auto != "" || !readOnly || hasFormula || isTotal);
                bool visible = s.InGrid && !isFk && !(isDetail && r.IsKey && keyIdentity);
                string type = s.InputType;
                var lines = new List<string>();

                lines.Add("field: \"" + s.Field + "\",");
                lines.Add("title: " + T(s.TitleEn, s.TitleAr) + ",");
                if (type == "number" || type == "checkbox" || type == "date") lines.Add("type: \"" + type + "\",");
                if (type != "text" && type != "checkbox") lines.Add("inputType: \"" + type + "\",");
                if (type == "textarea") lines.Add("rows: 3,");
                if (type == "number" && r.IsDecimal) lines.Add("step: 0.01,");
                if (type == "select") lines.Add("selectOptions: " + SelectOptions(r) + ",");
                if (type == "search" && s.SearchFn != "")
                {
                    lines.Add("searchModal: " + SearchCall(s) + ",");
                    string ff = FillFromJs(s.FillFrom);
                    if (ff != "") lines.Add("fillFrom: " + ff + ",        // يملا الحقول دي من الصف المختار");
                }
                if (hasFormula) lines.Add("formula: " + FormulaJs(s.Formula, fieldNames) + ",");

                if (s.Auto != "") lines.Add("DefaultValue: " + s.Auto + ",          // تلقائي من الجلسة");
                else if (s.DefaultValue != "") lines.Add("DefaultValue: " + DefaultLiteral(r) + ",");
                else if (type == "select" && r.Options.Count > 0) lines.Add("DefaultValue: " + JsValue(r.Options[0].Value) + ",");
                else if (type == "number" && !r.IsKey && !isFk && !r.Meta.NotInDb && (!readOnly || isTotal || hasFormula)) lines.Add("DefaultValue: 0,");
                else if (type == "checkbox" && !readOnly) lines.Add("DefaultValue: true,");

                lines.Add("width: " + s.Width + ",");

                if (readOnly)
                {
                    lines.Add("editable: false,");
                    string why = r.Meta.IsComputed ? "محسوب في قاعدة البيانات (مش بيتحفظ)" : r.IsKey && keyIdentity ? "ترقيم تلقائي" : isFk ? "بيتملى لوحده من الماستر" : isTotal ? "بيتملى من مجموع التفاصيل" :
                                 hasFormula ? "محسوب" : r.Meta.NotInDb ? "من القالب للعرض بس" : "";
                    lines.Add("insertable: false," + (why == "" ? "" : "          // " + why));
                }
                else if (keyManual) lines.Add("IsDisabledInEdit: true,     // المفتاح مش بيتعدّل");

                if ((s.Required && !readOnly) || keyManual) lines.Add("IsRequired: true,");
                lines.Add("IsSave: " + (isSave ? "true," : "false,"));
                if (!visible) lines.Add("IsVisibleDisplayInGrid: false,");
                if (!readOnly && !isDetail) lines.Add("SortFieldInEditAndAdd: " + (formOrder++) + ",");

                sb.AppendLine("      {");
                foreach (var l in lines) sb.AppendLine("        " + l);
                sb.AppendLine("      },");
            }
            return sb.ToString().TrimEnd();
        }

        string GenListColumns(List<RowInfo> rows)
        {
            var sb = new StringBuilder();
            foreach (var r in rows.Where(x => x.S.InGrid))
            {
                var a = new List<string>();
                a.Add("field: \"" + r.Field + "\"");
                a.Add("title: " + T(r.S.TitleEn, r.S.TitleAr));
                string type = r.S.InputType;
                if (type == "number" || type == "checkbox" || type == "date") a.Add("type: \"" + type + "\"");
                if (type == "select") { a.Add("inputType: \"select\""); a.Add("selectOptions: " + SelectOptions(r)); }
                a.Add("width: " + r.S.Width);
                if (type == "number" && r.IsDecimal) a.Add("IsDigits: true");
                if (!r.S.Search) a.Add("IsSearchColumn: false");
                sb.AppendLine("      { " + string.Join(", ", a) + " },");
            }
            return sb.ToString().TrimEnd();
        }

        string GenMdTs(GridScreenSettings st, List<RowInfo> master, List<RowInfo> list, List<List<RowInfo>> details)
        {
            var allTotals = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var d in st.Details) foreach (var t in ParseTotals(d.Totals)) allTotals.Add(t.Master);

            var head = new StringBuilder();
            var blocks = new StringBuilder();
            var cfg = new StringBuilder();
            var deps = new List<string>();
            for (int i = 0; i < st.Details.Count; i++)
            {
                var d = st.Details[i];
                int n = i + 1;
                string title = d.TitleAr != "" ? d.TitleAr : d.Table;
                head.AppendLine("//  التفاصيل " + n + ": بيتحفظ في " + d.Table + (d.View != "" ? "  وبيتعرض من " + d.View : "") + "  (الربط " + d.ForeignKey + ")");

                blocks.AppendLine("  // =======================");
                blocks.AppendLine("  // #region ③ التفاصيل " + n + ": " + title + " (" + d.Table + ")");
                blocks.AppendLine("  // =======================");
                blocks.AppendLine("  const Detail" + n + "Columns = useMemo<MasterDetailColumn[]>(");
                blocks.AppendLine("    () => [");
                blocks.AppendLine(GenMdColumns(details[i], detailStates[i].KeyIdentity, d.ForeignKey, null, true));
                blocks.AppendLine("    ],");
                blocks.AppendLine("    [IsLangEN, CompCode, BranchCode, UserID, FinYear, Today]");
                blocks.AppendLine("  );");
                blocks.AppendLine("  // #endregion");
                blocks.AppendLine();

                var totals = ParseTotals(d.Totals);
                cfg.AppendLine("        {");
                cfg.AppendLine("          title: " + T(d.TitleEn != "" ? d.TitleEn : d.Table, title) + ",");
                cfg.AppendLine("          tableName: \"" + Js(d.Table) + "\",");
                if (d.View != "") cfg.AppendLine("          viewName: \"" + Js(d.View) + "\",");
                cfg.AppendLine("          keyColumn: \"" + Js(d.KeyColumn) + "\",");
                cfg.AppendLine("          foreignKeyColumn: \"" + Js(d.ForeignKey) + "\",");
                cfg.AppendLine("          columns: Detail" + n + "Columns,");
                if (totals.Count > 0)
                    cfg.AppendLine("          totals: [" + string.Join(", ", totals.Select(t => t.Count
                        ? "{ masterField: \"" + Js(t.Master) + "\", type: \"count\" }"
                        : "{ masterField: \"" + Js(t.Master) + "\", detailField: \"" + Js(t.Detail) + "\", type: \"sum\" }")) + "],");
                cfg.AppendLine("          orderBy: \"" + Js(d.OrderBy != "" ? d.OrderBy : d.KeyColumn) + "\",");
                cfg.AppendLine("        },");
                deps.Add("Detail" + n + "Columns");
            }

            var allRows = master.Concat(list).Concat(details.SelectMany(x => x));
            string saveDesc = chkProcessTrans.Checked ? "مع G_ProcessTrans  (@TrType = '" + txtTrType.Text.Trim() + "')" : "عادي من غير G_ProcessTrans";
            string settingsJson = JsonConvert.SerializeObject(st, Formatting.None);
            string viewName = st.View != "" ? st.View : st.Table;

            return TPL_MD_TS
                .Replace("__MODULE__", Module)
                .Replace("__TITLE_AR__", txtTitleAr.Text.Trim())
                .Replace("__TABLE__", Js(st.Table))
                .Replace("__VIEW__", Js(viewName))
                .Replace("__KEY__", keyColumn)
                .Replace("__DETAILS_HEAD__", head.ToString().TrimEnd())
                .Replace("__SAVE_DESC__", saveDesc)
                .Replace("__SEARCH_IMPORTS__", GenImports(allRows))
                .Replace("__TRTYPE__", Js(chkProcessTrans.Checked ? txtTrType.Text.Trim() : ""))
                .Replace("__RUN_PT__", chkProcessTrans.Checked ? "true" : "false")
                .Replace("__MASTER_COLUMNS__", GenMdColumns(master, keyIsIdentity, "", allTotals, false))
                .Replace("__LIST_COLUMNS__", GenListColumns(list))
                .Replace("__DETAIL_BLOCKS__", blocks.ToString().TrimEnd())
                .Replace("__FILTERS__", GenFilters(list))
                .Replace("__VALIDATIONS__", GenValidations(st.Validations, true))
                .Replace("__DETAILS_CONFIG__", cfg.ToString().TrimEnd())
                .Replace("__CONDITION__", GenCondition(list))
                .Replace("__ORDER_BY__", Js(OrderByField()))
                .Replace("__ORDER_TYPE__", st.OrderType)
                .Replace("__PAGE_SIZE__", st.PageSize.ToString())
                .Replace("__INSERT__", st.Insert ? "true" : "false")
                .Replace("__EDIT__", st.Edit ? "true" : "false")
                .Replace("__DELETE__", st.Delete ? "true" : "false")
                .Replace("__NEW_TITLE__", T("New " + txtTitleEn.Text.Trim(), "إضافة " + txtTitleAr.Text.Trim()))
                .Replace("__EDIT_TITLE__", T(txtTitleEn.Text.Trim(), txtTitleAr.Text.Trim() + " رقم"))
                .Replace("__CONFIG_DEPS__", string.Join(", ", deps))
                + SettingsMarker + " " + settingsJson + "\r\n";
        }
        // #endregion

        // =====================================================================
        // #region توليد الملفات
        // =====================================================================
        string GenTs(GridScreenSettings st, List<RowInfo> rows)
        {
            string saveDesc = chkProcessTrans.Checked ? "مع G_ProcessTrans  (@TrType = '" + txtTrType.Text.Trim() + "')" : "عادي من غير G_ProcessTrans";
            string settingsJson = JsonConvert.SerializeObject(st, Formatting.None);
            return TPL_TS
                .Replace("__MODULE__", Module)
                .Replace("__TITLE_AR__", txtTitleAr.Text.Trim())
                .Replace("__TABLE__", cmbTable.Text.Trim())
                .Replace("__KEY__", keyColumn)
                .Replace("__SAVE_DESC__", saveDesc)
                .Replace("__SEARCH_IMPORTS__", GenImports(rows))
                .Replace("__TRTYPE__", Js(chkProcessTrans.Checked ? txtTrType.Text.Trim() : ""))
                .Replace("__RUN_PT__", chkProcessTrans.Checked ? "true" : "false")
                .Replace("__CONDITION__", GenCondition(rows))
                .Replace("__COLUMNS__", GenColumns(rows))
                .Replace("__FILTERS__", GenFilters(rows))
                .Replace("__VALIDATIONS__", GenValidations(st.Validations, false))
                .Replace("__ORDER_BY__", Js(OrderByField()))
                .Replace("__ORDER_TYPE__", st.OrderType)
                .Replace("__PAGE_SIZE__", numPageSize.Value.ToString())
                .Replace("__INSERT__", chkInsert.Checked ? "true" : "false")
                .Replace("__EDIT__", chkEdit.Checked ? "true" : "false")
                .Replace("__DELETE__", chkDelete.Checked ? "true" : "false")
                .Replace("__EXPORT__", chkExport.Checked ? "true" : "false")
                + SettingsMarker + " " + settingsJson + "\r\n";
        }

        string GenTsx()
        {
            string icon = txtIcon.Text.Trim();
            if (icon == "") icon = "fa-table-list";
            if (!icon.StartsWith("fa-")) icon = "fa-" + icon;
            return (IsMD ? TPL_MD_TSX : TPL_TSX).Replace("__MODULE__", Module).Replace("__ICON__", icon).Replace("__TITLE_AR__", txtTitleAr.Text.Trim());
        }

        string[] ResKeys() { return new[] { Module + "_title", Module + "_subtitle", Module + "_refresh" }; }

        string[] ResValues(bool arabic)
        {
            return arabic
                ? new[] { txtTitleAr.Text.Trim(), txtSubAr.Text.Trim(), "تحديث" }
                : new[] { txtTitleEn.Text.Trim(), txtSubEn.Text.Trim(), "Refresh" };
        }

        string GenResBlock(bool arabic, string nl, List<int> only)
        {
            var k = ResKeys();
            var v = ResValues(arabic);
            var idx = only ?? new List<int> { 0, 1, 2 };
            var lines = new List<string> { "    // ===== " + Module + " =====" };
            for (int i = 0; i < idx.Count; i++)
                lines.Add("    " + k[idx[i]] + ": \"" + Js(v[idx[i]]) + "\"" + (i < idx.Count - 1 ? "," : ""));
            return string.Join(nl, lines);
        }

        string GenSql()
        {
            if (!chkPermissions.Checked) return "";
            var ids = txtRoles.Text.Split(new[] { ',', ' ', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => { int n; return int.TryParse(x, out n) ? (int?)n : null; })
                .Where(x => x.HasValue).Select(x => x.Value).Distinct().ToList();
            string roles = ids.Count == 0
                ? "INSERT INTO @Roles (RoleId) SELECT DISTINCT RoleId FROM dbo.Sys_RoleUsers WHERE ISActive = 1;   -- كل دور عليه مستخدمين فعالين"
                : "INSERT INTO @Roles (RoleId) VALUES " + string.Join(", ", ids.Select(x => "(" + x + ")")) + ";";

            string sql = TPL_SQL
                .Replace("__DB__", txtDatabase.Text.Trim())
                .Replace("__MODULE__", Module)
                .Replace("__TITLE_AR__", Sql(txtTitleAr.Text.Trim()))
                .Replace("__TITLE_EN__", Sql(txtTitleEn.Text.Trim()))
                .Replace("__PARENT__", Sql(txtParentMenu.Text.Trim()))
                .Replace("__COLOR__", Sql(txtIconColor.Text.Trim()))
                .Replace("__ROLES__", roles);

            if (chkProcessTrans.Checked)
            {
                string tr = Sql(txtTrType.Text.Trim());
                sql += "\r\n\r\n-- =====================================================================\r\n" +
                       "-- ⚠️ G_ProcessTrans: لازم يكون فيه جزء للنوع '" + tr + "' وإلا الحفظ هيفشل\r\n" +
                       "-- انسخ ده جوه الإجراء (مكان التعليق ➕) لو مش موجود:\r\n" +
                       "-- =====================================================================\r\n" +
                       "/*\r\n\t\tif @TrType = '" + tr + "'\r\n\t\tbegin\r\n\t\t\tSet @TrNo = 1\r\n" +
                       "\t\t\t-- اكتب هنا اللي محتاج يحصل بعد الإضافة / التعديل / الحذف (@OpMode)\r\n" +
                       "\t\t\tset @r = 0\r\n\t\tEND\r\n*/";
            }
            return sql;
        }

        string GenRoutesLine() { return "    " + Module + ": HomeLayout,"; }

        // ---------- مراجعة قبل التوليد ----------
        string CheckFieldRows(List<RowInfo> rows, string where)
        {
            foreach (var r in rows)
            {
                string at = "الحقل " + r.Field + where;
                if (r.S.InputType == "select" && r.Options.Count == 0) return at + " نوعه select ومفيهوش اختيارات";
                if (r.S.InputType == "search" && r.S.SearchFn == "") return at + " نوعه search ومفيهوش دالة بحث";
                if (r.S.InputType == "search" && !Regex.IsMatch(r.S.SearchFn, @"^[A-Za-z_]\w*$")) return "اسم دالة البحث في " + at + " غلط";
                if (r.S.InputType == "search" && searchFunctions.Count > 0 && !searchFunctions.Contains(r.S.SearchFn))
                    return "دالة البحث " + r.S.SearchFn + " (" + at + ") مش موجودة في G_SearchFrom.ts — اعملها من زرار (نافذة بحث جديدة)";
                if (r.S.Formula.Contains("`") || r.S.Formula.Contains(";")) return "المعادلة في " + at + " فيها علامة مش مسموحة (` أو ;)";
            }
            return null;
        }

        string Validate(GridScreenSettings st, List<RowInfo> rows, List<RowInfo> list, List<List<RowInfo>> details)
        {
            if (rows.Count == 0) return "حمّل الحقول الأول (تاب 1 ← تحميل الحقول) أو افتح شاشة موجودة";
            if (!Regex.IsMatch(Module, @"^[A-Za-z][A-Za-z0-9_]*$")) return "كود الشاشة لازم حروف إنجليزي وأرقام بس ويبدأ بحرف";
            if (cmbTable.Text.Trim() == "") return "اختار الجدول";
            if (keyColumn == "") return "مفيش مفتاح للجدول";
            if (txtTitleAr.Text.Trim() == "" || txtTitleEn.Text.Trim() == "") return "اكتب عنوان الشاشة عربي وإنجليزي";
            if (chkProcessTrans.Checked && txtTrType.Text.Trim() == "") return "اكتب @TrType أو اقفل G_ProcessTrans";
            if (txtExtraCondition.Text.Contains("`")) return "الشرط الإضافي مينفعش يكون فيه العلامة `";
            if (openedScreen == "" && Directory.Exists(Path.Combine(ClientAppPath, Module)) && !File.Exists(Path.Combine(ClientAppPath, Module, Module + ".ts")))
                return "فيه فولدر بنفس الاسم " + Module + " في ClientApp ومش شاشة متولّدة — اختار اسم تاني";

            string e = CheckFieldRows(rows, "");
            if (e != null) return e;

            if (st.ScreenType == "MasterDetail")
            {
                if (list.Count(x => x.S.InGrid) == 0) return "اختار أعمدة تظهر في القائمة (تاب القائمة)";
                if (st.Details.Count == 0) return "ضيف تفاصيل واحدة على الأقل (تاب التفاصيل)";
                var masterFields = new HashSet<string>(rows.Select(x => x.Field), StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < st.Details.Count; i++)
                {
                    var d = st.Details[i];
                    string nm = "التفاصيل " + (i + 1);
                    if (d.Table == "") return nm + ": اختار الجدول";
                    if (details[i].Count == 0) return nm + ": اضغط (تحميل حقول التفاصيل)";
                    if (d.KeyColumn == "") return nm + ": مفيش مفتاح";
                    if (d.ForeignKey == "") return nm + ": اختار عمود الربط بالماستر";
                    if (d.ForeignKey.Equals(d.KeyColumn, StringComparison.OrdinalIgnoreCase)) return nm + ": عمود الربط مينفعش يكون هو المفتاح";
                    var detFields = new HashSet<string>(details[i].Select(x => x.Field), StringComparer.OrdinalIgnoreCase);
                    foreach (var t in ParseTotals(d.Totals))
                    {
                        if (!masterFields.Contains(t.Master)) return nm + ": المجموع " + t.Master + " مش حقل في الماستر";
                        if (!t.Count && !detFields.Contains(t.Detail)) return nm + ": المجموع من " + t.Detail + " مش حقل في التفاصيل";
                    }
                    e = CheckFieldRows(details[i], " (" + nm + ")");
                    if (e != null) return e;
                }
            }

            for (int i = 0; i < st.Validations.Count; i++)
            {
                var v = st.Validations[i];
                string nm = "قاعدة التحقق رقم " + (i + 1) + " (" + v.Type + ")";
                if (v.Detail > 0 && st.ScreenType != "MasterDetail") return nm + ": الجدول البسيط مفيهوش تفاصيل — خلّي المستوى (الماستر)";
                if (v.Detail > st.Details.Count && st.ScreenType == "MasterDetail") return nm + ": مفيش تفاصيل رقم " + v.Detail;
                bool needsField = v.Type == "required" || v.Type == "compare" || v.Type == "range" || v.Type == "regex" || v.Type == "unique" || v.Type == "noDuplicate";
                if (needsField && v.Field == "") return nm + ": اكتب الحقل";
                if ((v.Type == "noDuplicate" || v.Type == "minRows") && v.Detail == 0) return nm + ": النوع ده للتفاصيل بس — اختار المستوى (تفاصيل 1..)";
                if (v.Type == "compare" && v.CompareTo == "" && v.Value == "") return nm + ": اكتب (قارن بـ) أو (قيمة)";
                if (v.Type == "range" && !IsNumber(v.Min) && !IsNumber(v.Max)) return nm + ": اكتب الأقل أو الأكبر رقم";
                if (v.Type == "minRows" && !IsNumber(v.Min)) return nm + ": اكتب (الأقل) رقم";
                if (v.Type == "regex")
                {
                    if (v.Pattern == "") return nm + ": اكتب الـ Regex";
                    try { new Regex(v.Pattern); } catch { return nm + ": الـ Regex غلط"; }
                }
                if ((v.Type == "exists" || v.Type == "notExists") && (v.Table == "" || v.Condition == "")) return nm + ": اكتب الجدول والشرط";
                if (v.Type == "custom" && v.Code == "") return nm + ": اكتب الكود";
                if (v.Type != "custom" && v.MessageAr == "" && v.MessageEn == "") return nm + ": اكتب الرسالة";
            }
            return null;
        }

        void Generate()
        {
            var st = CollectSettings();
            var rows = ReadRows(grid, keyColumn, keyIsIdentity);
            var list = new List<RowInfo>();
            var details = new List<List<RowInfo>>();
            if (IsMD)
            {
                list = ReadRows(gridList, keyColumn, keyIsIdentity);
                foreach (var d in detailStates) details.Add(ToRowInfos(d.S.Fields, d.Metas, d.S.KeyColumn, d.KeyIdentity));
            }

            string err = Validate(st, rows, list, details);
            if (err != null) { MessageBox.Show(err, "ناقص حاجة", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

            if (openedScreen != "" && openedScreen != Module &&
                MessageBox.Show("غيّرت كود الشاشة من " + openedScreen + " لـ " + Module + "\nده هيعمل شاشة جديدة والقديمة هتفضل زي ما هي. تكمل؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            rtTs.Text = IsMD ? GenMdTs(st, rows, list, details) : GenTs(st, rows);
            rtTsx.Text = GenTsx();
            rtResources.Text = "// en:\r\n" + GenResBlock(false, "\r\n", null) + "\r\n\r\n// ar:\r\n" + GenResBlock(true, "\r\n", null);
            rtRoutes.Text = GenRoutesLine();
            rtSql.Text = chkPermissions.Checked ? GenSql() : "-- سكريبت الصلاحيات مقفول";
            tabsPreview.TabPages[0].Text = Module + ".ts";
            tabsMain.SelectedTab = tabPreview;

            string warn = CheckProcessTrans();
            SetStatus(warn ?? "تم التوليد ✔️  راجع الملفات وبعدين اضغط (حفظ الملفات)", warn != null);
        }

        string CheckProcessTrans()
        {
            if (!chkProcessTrans.Checked) return null;
            try
            {
                using (var con = new SqlConnection(ConnString()))
                using (var cmd = new SqlCommand("SELECT CASE WHEN OBJECT_DEFINITION(OBJECT_ID('dbo.G_ProcessTrans')) LIKE @p THEN 1 ELSE 0 END", con))
                {
                    cmd.Parameters.AddWithValue("@p", "%'" + txtTrType.Text.Trim() + "'%");
                    con.Open();
                    if (Convert.ToInt32(cmd.ExecuteScalar()) == 0)
                        return "⚠️ G_ProcessTrans مفيهوش '" + txtTrType.Text.Trim() + "' — الحفظ هيفشل لحد ما تضيفه (الكود في آخر تاب SQL)";
                }
            }
            catch { }
            return null;
        }
        // #endregion

        // =====================================================================
        // #region القوالب (Templates) — الجدول البسيط
        // =====================================================================
        const string TPL_TS = @"""use client"";

// =====================================================================================
//  📄 __MODULE__.ts   ←  ملف المنطق (البيزنس) — شاشة __TITLE_AR__
//  اتعمل أوتوماتيك من برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله
// -------------------------------------------------------------------------------------
//  الجدول : __TABLE__
//  الحفظ  : __SAVE_DESC__
// =====================================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from ""react"";
import { useSys } from ""../Shared/SystemUsing"";
import { DynamicGridColumn } from ""../Shared/Components/Import/ModelGrid"";
import { FilterFieldConfig, ActiveFilter } from ""../Shared/Components/Import/AdvancedFilter"";
import { ValidationRule, ValidateRow } from ""../Shared/Validation"";
__SEARCH_IMPORTS__
// =======================
// #region ثوابت الشاشة
// =======================
const TableName = ""__TABLE__"";
const KeyColumn = ""__KEY__"";
const TrType = ""__TRTYPE__"";             // بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = __RUN_PT__;       // true = شغّل G_ProcessTrans بعد كل حفظ أو حذف

const DefaultFilters: ActiveFilter[] = [];
// #endregion

// =======================
// __MODULE__
// =======================
export function __MODULE__() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    InitalizeComponent();
  }, []);

  // =======================
  // #region UsingSystem Glopal
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  // قيم الجلسة (الشركة / الفرع / المستخدم / السنة)
  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  const UserID = Session?.CurrentEnvironment?.UserID || 0;
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  const Today = new Date().toISOString().substring(0, 10);
  // #endregion

  // =======================
  // #region State
  // =======================
  const [gridKey, setGridKey] = useState(0);   // لما يزيد الجدول بيتحمل من جديد
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  function InitalizeComponent() {
    // الجدول بيحمّل بياناته لوحده
  }

  // =======================
  // #region Events Elements Html
  // =======================
  function RefreshGrid() {
    setGridKey((k) => k + 1);
  }
  // #endregion

  // =======================
  // #region إعدادات الجدول DynamicGrid
  // =======================
  //  ⚠️ الأعمدة والفلاتر جوه useMemo عشان الجدول ميعيدش التحميل على طول

  // الشرط اللي بيتعرض بيه الجدول
  const Condition = __CONDITION__;

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
__COLUMNS__
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear, Today]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
__FILTERS__
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // #region التحقق قبل الحفظ (Validations)
  // =======================
  //  بيتشيك قبل الإضافة والتعديل، وأول قاعدة تفشل بتوقف الحفظ   (الشرح في Shared/Validation.ts)
  const Validations = useMemo<ValidationRule[]>(
    () => [
__VALIDATIONS__
    ],
    [IsLangEN, Today]
  );

  const BeforeSave = useCallback(
    (row: Record<string, any>, isInsert: boolean) =>
      ValidateRow(Validations, row, { isInsert, isLangEN: IsLangEN, tableName: TableName, keyColumn: KeyColumn }),
    [Validations, IsLangEN]
  );
  // #endregion

  // =======================
  // UI
  // =======================
  const state = {
    IsLangEN,
    IsDark,
    gridKey,
  };

  const actions = {
    RefreshGrid,
  };

  const grid = {
    TableName,
    KeyColumn,
    TrType,
    RunProcessTrans,
    Condition,
    CompCode,
    BranchCode,
    Columns,
    FilterFields,
    DefaultFilters,
    BeforeSave,
    OrderBy: ""__ORDER_BY__"",
    OrderType: ""__ORDER_TYPE__"" as ""ASC"" | ""DESC"",
    PageSize: __PAGE_SIZE__,
    EnableInsert: __INSERT__,
    EnableUpdate: __EDIT__,
    EnableDelete: __DELETE__,
    EnableExport: __EXPORT__,
  };

  return {
    ...state,
    ...actions,
    grid,
  };
}

// ⚠️ السطر اللي تحت ده بيقراه برنامج CreatePageReact عشان يفتح الشاشة ويعدّلها — متمسحوش
";

        const string TPL_TSX = @"""use client"";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس — شاشة __TITLE_AR__
//  اتعمل أوتوماتيك من برنامج CreatePageReact — كل حاجة جاية من __MODULE__.ts عن طريق p.
// =====================================================================================

import { useMemo } from ""react"";
import { __MODULE__ } from ""./__MODULE__"";
import { useTranslate } from ""../../ClientApp/Shared/Resources"";
import { useSys } from ""../Shared/SystemUsing"";
import DynamicGrid from ""../Shared/Components/Import/DynamicGrid"";

// =======================
// نقطة البداية (نفس شاشة Login)
// =======================
export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id=""lang-style___MODULE__"" rel=""stylesheet"" href=""/StyleDesign/Pages/__MODULE__/__MODULE__EN.css"" />
  ) : (
    <link id=""lang-style___MODULE__"" rel=""stylesheet"" href=""/StyleDesign/Pages/__MODULE__/__MODULE__AR.css"" />
  );

  const page = __MODULE__();

  return <__MODULE__Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof __MODULE__>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// الشاشة
// =======================
function __MODULE__Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d
    ? ""bg-gray-900/80 border-gray-700/60 text-gray-100""
    : ""bg-white/90 border-gray-200 text-gray-800"";
  const muted = d ? ""text-gray-400"" : ""text-gray-500"";
  const btnSecondary = d
    ? ""bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500""
    : ""bg-white border-gray-300 text-gray-700 hover:border-blue-600"";

  // 👇 أي عمود نوعه select بيظهر في الجدول كشارة فيها اسم الاختيار
  //    لازم useMemo عشان الجدول ميعيدش التحميل على طول
  const columns = useMemo(
    () =>
      p.grid.Columns.map((col) =>
        col.inputType === ""select""
          ? { ...col, itemTemplate: (value: any) => <OptionBadge value={value} options={col.selectOptions ?? []} /> }
          : col
      ),
    [p.grid.Columns]
  );

  return (
    <>
      {p.stylesheet}

      <div className=""p-2 md:p-4 space-y-4"">
        {/* ============ العنوان ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${card}`}>
          <div className=""flex items-center gap-3 flex-1 min-w-0"">
            <div className=""w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg"">
              <i className=""fa-solid __ICON__""></i>
            </div>
            <div className=""min-w-0"">
              <h1 className=""text-lg md:text-2xl font-bold truncate"">{L.__MODULE___title}</h1>
              <p className={`text-sm ${muted}`}>{L.__MODULE___subtitle}</p>
            </div>
          </div>

          <button onClick={p.RefreshGrid} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
            <i className=""fa-solid fa-rotate mx-1""></i> {L.__MODULE___refresh}
          </button>
        </div>

        {/* ============ الجدول ============ */}
        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={columns}
          condition={p.grid.Condition}
          orderBy={p.grid.OrderBy}
          orderType={p.grid.OrderType}
          pageSize={p.grid.PageSize}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          beforeSave={p.grid.BeforeSave}
          height=""calc(100vh - 140px)""
          enableInsert={p.grid.EnableInsert}
          enableUpdate={p.grid.EnableUpdate}
          enableDelete={p.grid.EnableDelete}
          enableSearch={true}
          enableExport={p.grid.EnableExport}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
          defaultFilters={p.grid.DefaultFilters}
        />
      </div>
    </>
  );
}

// =====================================================================================
//  شارة الاختيار جوه الجدول (للأعمدة اللي نوعها select)
// =====================================================================================
function OptionBadge({ value, options }: { value: any; options: { value: any; label: string }[] }) {
  if (value === null || value === undefined || value === """") return <span>-</span>;
  const opt = options.find((o) => String(o.value) === String(value));
  return (
    <span className=""inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"">
      {opt ? opt.label : String(value)}
    </span>
  );
}
";
        // #endregion

        // =====================================================================
        // #region القوالب (Templates) — الماستر ديتيل
        // =====================================================================
        const string TPL_MD_TS = @"""use client"";

// =====================================================================================
//  📄 __MODULE__.ts   ←  ملف المنطق (البيزنس) — شاشة __TITLE_AR__ (ماستر ديتيل)
//  اتعمل أوتوماتيك من برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله
// -------------------------------------------------------------------------------------
//  الماستر   : بيتحفظ في __TABLE__  وبيتعرض في القائمة من __VIEW__
__DETAILS_HEAD__
//  الحفظ      : __SAVE_DESC__
//
//  الملف ده فيه ""إعدادات"" بس — الشغل كله في المكوّن MasterDetail:
//    MasterColumns   = حقول الرأس
//    ListColumns     = أعمدة القائمة
//    DetailNColumns  = أعمدة كل تفاصيل
//    Validations     = قواعد التحقق قبل الحفظ (Shared/Validation.ts)
//    Config          = كل ده مع بعض ← بيروح لـ <MasterDetail config={...} />
// =====================================================================================

import { useMemo } from ""react"";
import { useSys } from ""../Shared/SystemUsing"";
import { DynamicGridColumn } from ""../Shared/Components/Import/ModelGrid"";
import { FilterFieldConfig } from ""../Shared/Components/Import/AdvancedFilter"";
import { MasterDetailColumn, MasterDetailConfig } from ""../Shared/Components/Import/ModelMasterDetail"";
import { ValidationRule } from ""../Shared/Validation"";
__SEARCH_IMPORTS__
// =======================
// #region ثوابت الشاشة
// =======================
const TableName = ""__TABLE__"";          // بيتحفظ فيه
const ViewName = ""__VIEW__"";            // بيتعرض منه في القائمة
const KeyColumn = ""__KEY__"";
const TrType = ""__TRTYPE__"";             // بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = __RUN_PT__;       // true = شغّل G_ProcessTrans بعد كل حفظ أو حذف
// #endregion

// =======================
// __MODULE__
// =======================
export function __MODULE__() {
  // =======================
  // #region UsingSystem Glopal
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  // قيم الجلسة (الشركة / الفرع / المستخدم / السنة)
  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  const UserID = Session?.CurrentEnvironment?.UserID || 0;
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  const Today = new Date().toISOString().substring(0, 10);
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // =======================
  // #region ① حقول الماستر (الرأس)
  // =======================
  //  formula = حقل محسوب   •   الحقول اللي عليها مجموع من التفاصيل (totals) بتبقى قراءة بس
  const MasterColumns = useMemo<MasterDetailColumn[]>(
    () => [
__MASTER_COLUMNS__
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear, Today]
  );
  // #endregion

  // =======================
  // #region ② أعمدة القائمة (من __VIEW__)
  // =======================
  const ListColumns = useMemo<DynamicGridColumn[]>(
    () => [
__LIST_COLUMNS__
    ],
    [IsLangEN]
  );
  // #endregion

__DETAIL_BLOCKS__

  // =======================
  // #region ④ الفلتر المتقدم للقائمة
  // =======================
  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
__FILTERS__
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // #region ⑤ التحقق قبل الحفظ (Validations)
  // =======================
  //  detail: 1 = القاعدة على صفوف التفاصيل الأولى   •   من غير detail = على الماستر
  //  الشرط فيه {Field} بتتبدل بقيمة الحقل   (شوف الشرح في Shared/Validation.ts)
  const Validations = useMemo<ValidationRule[]>(
    () => [
__VALIDATIONS__
    ],
    [IsLangEN, Today]
  );
  // #endregion

  // =======================
  // #region الإعدادات كلها ← <MasterDetail config={...} />
  // =======================
  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
__DETAILS_CONFIG__
      ],
      condition: __CONDITION__,
      orderBy: ""__ORDER_BY__"",
      orderType: ""__ORDER_TYPE__"",
      pageSize: __PAGE_SIZE__,
      filterFields: FilterFields,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      validations: Validations,
      enableInsert: __INSERT__,
      enableUpdate: __EDIT__,
      enableDelete: __DELETE__,
      newTitle: __NEW_TITLE__,
      editTitle: __EDIT_TITLE__,
    }),
    [IsLangEN, CompCode, BranchCode, MasterColumns, ListColumns, __CONFIG_DEPS__, FilterFields, Validations]
  );
  // #endregion

  return {
    IsLangEN,
    IsDark,
    Config,
  };
}

// ⚠️ السطر اللي تحت ده بيقراه برنامج CreatePageReact عشان يفتح الشاشة ويعدّلها — متمسحوش
";

        const string TPL_MD_TSX = @"""use client"";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس — شاشة __TITLE_AR__
//  اتعمل أوتوماتيك من برنامج CreatePageReact — كل حاجة جاية من __MODULE__.ts عن طريق p.
//  والشغل كله (القائمة + الفورم + التفاصيل + الحفظ) في <MasterDetail />
// =====================================================================================

import { __MODULE__ } from ""./__MODULE__"";
import { useTranslate } from ""../../ClientApp/Shared/Resources"";
import { useSys } from ""../Shared/SystemUsing"";
import MasterDetail from ""../Shared/Components/Import/MasterDetail"";

// =======================
// نقطة البداية (نفس شاشة Login)
// =======================
export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id=""lang-style___MODULE__"" rel=""stylesheet"" href=""/StyleDesign/Pages/__MODULE__/__MODULE__EN.css"" />
  ) : (
    <link id=""lang-style___MODULE__"" rel=""stylesheet"" href=""/StyleDesign/Pages/__MODULE__/__MODULE__AR.css"" />
  );

  const page = __MODULE__();

  return <__MODULE__Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof __MODULE__>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// الشاشة
// =======================
function __MODULE__Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d ? ""bg-gray-900/80 border-gray-700/60 text-gray-100"" : ""bg-white/90 border-gray-200 text-gray-800"";
  const muted = d ? ""text-gray-400"" : ""text-gray-500"";

  return (
    <>
      {p.stylesheet}

      <div className=""p-2 md:p-4 space-y-4"">
        {/* ============ العنوان ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex items-center gap-3 ${card}`}>
          <div className=""w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg"">
            <i className=""fa-solid __ICON__""></i>
          </div>
          <div className=""min-w-0"">
            <h1 className=""text-lg md:text-2xl font-bold truncate"">{L.__MODULE___title}</h1>
            <p className={`text-sm ${muted}`}>{L.__MODULE___subtitle}</p>
          </div>
        </div>

        {/* ============ الماستر ديتيل (القائمة + الفورم) ============ */}
        <MasterDetail config={p.Config} />
      </div>
    </>
  );
}
";

        const string TPL_SQL = @"-- =====================================================================================
--  إضافة شاشة ""__TITLE_AR__"" (__MODULE__) في Sys_Modules و Sys_RoleModule
--  اتعمل أوتوماتيك من برنامج CreatePageReact
--  السكريبت ينفع يتشغل أكتر من مرة من غير ما يكرر حاجة
-- =====================================================================================
USE [__DB__];
GO

SET NOCOUNT ON;

DECLARE @ModuleCode NVARCHAR(100) = N'__MODULE__';      -- لازم = اسم الفولدر في ClientApp
DECLARE @DescA      NVARCHAR(200) = N'__TITLE_AR__';
DECLARE @DescE      NVARCHAR(200) = N'__TITLE_EN__';
DECLARE @ParentMenu NVARCHAR(100) = N'__PARENT__';      -- '' = تظهر في أول القائمة
DECLARE @IconColor  NVARCHAR(50)  = N'__COLOR__';

DECLARE @Roles TABLE (RoleId INT PRIMARY KEY);
__ROLES__

DECLARE @Sort INT = ISNULL((SELECT MAX(MODULE_SORT) FROM dbo.Sys_Modules
                            WHERE ISNULL(MODULE_MENU, N'') = @ParentMenu), 0) + 1;

BEGIN TRY
    BEGIN TRAN;

    -- 1) Sys_Modules
    IF NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_CODE = @ModuleCode)
    BEGIN
        INSERT INTO dbo.Sys_Modules
            (MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
             MODULE_TYPE, MODULE_SORT, IS_Show,
             [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
             CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
             AVAILABLE, Images_Enabled)
        VALUES
            (@ModuleCode, @ParentMenu, @DescE, @DescA, N'', @IconColor,
             N'S', @Sort, 1,
             1, 1, 1, 1, 1,
             0, 0, 0, 0, 0, 0, 0, 0, 0,
             1, 0);
        PRINT N'✅ اتضافت في Sys_Modules';
    END
    ELSE
        PRINT N'ℹ️ موجودة بالفعل في Sys_Modules';

    -- 2) Sys_RoleModule (صلاحيات كاملة)
    INSERT INTO dbo.Sys_RoleModule
        (RoleId, MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
         MODULE_TYPE, MODULE_SORT, IS_Show,
         [EXECUTE], [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
         CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
         ViewImages, EditImages, Prc_Preference)
    SELECT
         r.RoleId, m.MODULE_CODE, m.MODULE_MENU, m.MODULE_DESCE, m.MODULE_DESCA, m.Url_Image, m.Icon_Color,
         m.MODULE_TYPE, m.MODULE_SORT, 1,
         1, 1, 1, 1, 1, 1,
         0, 0, 0, 0, 0, 0, 0, 0, 0,
         0, 0, 1
    FROM @Roles r
    CROSS JOIN dbo.Sys_Modules m
    WHERE m.MODULE_CODE = @ModuleCode
      AND NOT EXISTS (SELECT 1 FROM dbo.Sys_RoleModule x
                      WHERE x.RoleId = r.RoleId AND x.MODULE_CODE = @ModuleCode);

    PRINT N'✅ اتضافت لـ ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' دور في Sys_RoleModule';

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT N'❌ حصل خطأ ومفيش حاجة اتحفظت';
    THROW;
END CATCH;
GO
";
        // #endregion
    }
}
