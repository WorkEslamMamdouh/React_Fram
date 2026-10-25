// =====================================================================================
//  Form5_SearchBuilder.cs  —  عمل نافذة بحث جديدة وإضافتها في G_SearchFrom.ts
// -------------------------------------------------------------------------------------
//  بتختار الجدول → الحقول بتتحمل → بتحدد اللي يظهر واللي يتبحث فيه والقيمة اللي ترجع
//  → البرنامج بيضيف دالة جديدة زي Search_Users في آخر ملف G_SearchFrom.ts
//  مكتوب بـ C# 7.3 عشان يشتغل على .NET Framework 4.6.1
// =====================================================================================

using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace UpdateNewModel
{
    public class Form5_SearchBuilder : Form
    {
        readonly string connString;
        readonly string filePath;
        readonly List<string> existing;

        TextBox txtName, txtTitle, txtCondition;
        ComboBox cmbTable, cmbKey, cmbReturn, cmbDisplay, cmbOrderBy, cmbOrderType;
        NumericUpDown numPageSize;
        DataGridView grid;
        RichTextBox rtPreview;

        public string CreatedName { get; private set; }

        public Form5_SearchBuilder(string connString, List<string> tables, string filePath, List<string> existing)
        {
            this.connString = connString;
            this.filePath = filePath;
            this.existing = existing ?? new List<string>();
            BuildUI();
            cmbTable.Items.AddRange(tables.Cast<object>().ToArray());
        }

        void BuildUI()
        {
            Text = "نافذة بحث جديدة (G_SearchFrom)";
            Size = new Size(1000, 760);
            StartPosition = FormStartPosition.CenterParent;
            Font = new Font("Segoe UI", 9.5f);
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;
            MinimizeBox = false;

            var top = new TableLayoutPanel { Dock = DockStyle.Top, ColumnCount = 4, AutoSize = true, Padding = new Padding(10) };
            top.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));

            cmbTable = Combo(true);
            cmbTable.DropDownStyle = ComboBoxStyle.DropDown;
            cmbTable.AutoCompleteMode = AutoCompleteMode.SuggestAppend;
            cmbTable.AutoCompleteSource = AutoCompleteSource.ListItems;
            var btnLoad = Btn("تحميل الحقول", Color.FromArgb(79, 70, 229));
            btnLoad.Click += (s, e) => LoadFields();
            Pair(top, "الجدول:", cmbTable);
            Pair(top, "", btnLoad);

            txtName = Text_(true);
            txtTitle = Text_(false);
            Pair(top, "اسم الدالة:", txtName);
            Pair(top, "عنوان النافذة:", txtTitle);

            cmbKey = Combo(false);
            cmbReturn = Combo(false);
            cmbDisplay = Combo(false);
            cmbOrderBy = Combo(false);
            Pair(top, "المفتاح (keyColumn):", cmbKey);
            Pair(top, "القيمة اللي ترجع (returnField):", cmbReturn);
            Pair(top, "الحقل اللي يتعرض (displayField):", cmbDisplay);
            Pair(top, "الترتيب حسب:", cmbOrderBy);

            cmbOrderType = Combo(false);
            cmbOrderType.Items.AddRange(new object[] { "DESC", "ASC" });
            cmbOrderType.SelectedIndex = 0;
            numPageSize = new NumericUpDown { Minimum = 5, Maximum = 200, Value = 20, Width = 80 };
            Pair(top, "اتجاه الترتيب:", cmbOrderType);
            Pair(top, "عدد الصفوف:", numPageSize);

            txtCondition = Text_(true);
            Pair(top, "شرط ثابت (اختياري):", txtCondition);
            Pair(top, "", new Label
            {
                Text = "الشرط الثابت بيتطبق دايماً، وشرط الحقل اللي في الشاشة بيتضاف عليه",
                AutoSize = true,
                ForeColor = Color.DimGray,
                Padding = new Padding(0, 6, 0, 0)
            });

            grid = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                RowHeadersWidth = 30,
                RightToLeft = RightToLeft.No
            };
            grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "Field", HeaderText = "الحقل", Width = 180, ReadOnly = true });
            grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "Title", HeaderText = "العنوان", Width = 200 });
            grid.Columns.Add(new DataGridViewCheckBoxColumn { Name = "Show", HeaderText = "يظهر", Width = 70 });
            grid.Columns.Add(new DataGridViewCheckBoxColumn { Name = "Search", HeaderText = "يتبحث فيه", Width = 80 });
            grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "Width", HeaderText = "العرض", Width = 70 });
            grid.CurrentCellDirtyStateChanged += (s, e) => { if (grid.IsCurrentCellDirty) grid.CommitEdit(DataGridViewDataErrorContexts.Commit); };

            rtPreview = new RichTextBox { Dock = DockStyle.Bottom, Height = 170, Font = new Font("Consolas", 9.5f), RightToLeft = RightToLeft.No, ReadOnly = true };

            var bottom = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 50, Padding = new Padding(6) };
            var btnPreview = Btn("معاينة", Color.FromArgb(37, 99, 235));
            var btnSave = Btn("حفظ في G_SearchFrom.ts", Color.FromArgb(5, 150, 105));
            var btnCancel = Btn("إلغاء", Color.FromArgb(107, 114, 128));
            btnPreview.Click += (s, e) => { string err; var code = Build(out err); rtPreview.Text = err ?? code; };
            btnSave.Click += (s, e) => SaveFunction();
            btnCancel.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            bottom.Controls.AddRange(new Control[] { btnPreview, btnSave, btnCancel });

            Controls.Add(grid);
            Controls.Add(rtPreview);
            Controls.Add(bottom);
            Controls.Add(top);
        }

        ComboBox Combo(bool editable)
        {
            return new ComboBox { Dock = DockStyle.Fill, DropDownStyle = editable ? ComboBoxStyle.DropDown : ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
        }

        TextBox Text_(bool ltr)
        {
            return new TextBox { Dock = DockStyle.Fill, RightToLeft = ltr ? RightToLeft.No : RightToLeft.Yes };
        }

        Button Btn(string text, Color color)
        {
            return new Button { Text = text, AutoSize = true, BackColor = color, ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Margin = new Padding(4), Padding = new Padding(6, 3, 6, 3) };
        }

        void Pair(TableLayoutPanel t, string label, Control c)
        {
            t.Controls.Add(new Label { Text = label, AutoSize = true, Padding = new Padding(0, 6, 0, 0) });
            t.Controls.Add(c);
        }

        void LoadFields()
        {
            string table = cmbTable.Text.Trim();
            if (table == "") { MessageBox.Show("اختار الجدول"); return; }

            var cols = new List<string[]>();   // name, type, identity
            try
            {
                using (var con = new SqlConnection(connString))
                using (var cmd = new SqlCommand(@"SELECT c.name, t.name, c.is_identity FROM sys.columns c
                                                   JOIN sys.types t ON c.user_type_id = t.user_type_id
                                                   WHERE c.object_id = OBJECT_ID(@t) ORDER BY c.column_id", con))
                {
                    cmd.Parameters.AddWithValue("@t", table);
                    con.Open();
                    using (var r = cmd.ExecuteReader())
                        while (r.Read()) cols.Add(new[] { r.GetString(0), r.GetString(1).ToLower(), Convert.ToBoolean(r[2]) ? "1" : "0" });
                }
            }
            catch (Exception ex) { MessageBox.Show("خطأ:\n" + ex.Message); return; }
            if (cols.Count == 0) { MessageBox.Show("الجدول مش موجود"); return; }

            string name = Regex.Replace(table, @"^([A-Za-z]{1,3}_)+", "");
            name = Regex.Replace(name, @"[^A-Za-z0-9_]", "");
            if (txtName.Text.Trim() == "") txtName.Text = "Search_" + name;
            if (txtTitle.Text.Trim() == "") txtTitle.Text = "Search " + Regex.Replace(name, "([a-z])([A-Z])", "$1 $2");

            grid.Rows.Clear();
            foreach (var combo in new[] { cmbKey, cmbReturn, cmbDisplay, cmbOrderBy }) combo.Items.Clear();

            string key = (cols.FirstOrDefault(c => c[2] == "1") ?? cols[0])[0];
            string firstText = (cols.FirstOrDefault(c => c[1].Contains("char") || c[1].Contains("text")) ?? cols[0])[0];

            foreach (var c in cols)
            {
                bool isText = c[1].Contains("char") || c[1].Contains("text");
                bool skip = c[0] == "StatusFlag" || c[0] == "CompCode" || c[0] == "BranchCode";
                int i = grid.Rows.Add();
                var row = grid.Rows[i];
                row.Cells["Field"].Value = c[0];
                row.Cells["Title"].Value = Regex.Replace(c[0].Replace("_", " "), "([a-z])([A-Z])", "$1 $2");
                row.Cells["Show"].Value = !skip && (c[0] == key || isText);
                row.Cells["Search"].Value = !skip && isText;
                row.Cells["Width"].Value = c[0] == key ? 80 : 200;
                foreach (var combo in new[] { cmbKey, cmbReturn, cmbDisplay, cmbOrderBy }) combo.Items.Add(c[0]);
            }
            cmbKey.SelectedItem = key;
            cmbReturn.SelectedItem = key;
            cmbDisplay.SelectedItem = firstText;
            cmbOrderBy.SelectedItem = key;
        }

        static string Js(string s) { return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " "); }

        string Build(out string error)
        {
            error = null;
            grid.EndEdit();
            string name = txtName.Text.Trim();
            if (!Regex.IsMatch(name, @"^[A-Za-z_][A-Za-z0-9_]*$")) { error = "اسم الدالة لازم حروف إنجليزي وأرقام بس (مثلاً Search_CashTypes)"; return null; }
            if (existing.Contains(name)) { error = "فيه دالة بنفس الاسم " + name + " في G_SearchFrom.ts"; return null; }
            if (grid.Rows.Count == 0) { error = "حمّل الحقول الأول"; return null; }
            if (cmbKey.SelectedItem == null || cmbReturn.SelectedItem == null) { error = "اختار المفتاح والقيمة اللي ترجع"; return null; }

            var cols = new List<string>();
            var searchCols = new List<string>();
            foreach (DataGridViewRow r in grid.Rows)
            {
                string f = Convert.ToString(r.Cells["Field"].Value);
                bool show = r.Cells["Show"].Value is bool && (bool)r.Cells["Show"].Value;
                bool search = r.Cells["Search"].Value is bool && (bool)r.Cells["Search"].Value;
                int w;
                if (!int.TryParse(Convert.ToString(r.Cells["Width"].Value), out w)) w = 150;
                string title = Js(Convert.ToString(r.Cells["Title"].Value));
                // المفتاح والقيمة اللي ترجع لازم يكونوا موجودين حتى لو مخفيين
                bool needed = f == Convert.ToString(cmbKey.SelectedItem) || f == Convert.ToString(cmbReturn.SelectedItem) || f == Convert.ToString(cmbDisplay.SelectedItem);
                if (show || needed)
                    cols.Add("      { field: \"" + f + "\", title: \"" + title + "\", width: " + w + (show ? "" : ", IsVisible: false") + " },");
                if (search) searchCols.Add("\"" + f + "\"");
            }
            if (cols.Count == 0) { error = "اختار حقل واحد على الأقل يظهر"; return null; }

            string fixedCond = txtCondition.Text.Trim();
            string condExpr = fixedCond == ""
                ? "_condition"
                : "_condition ? `(" + fixedCond.Replace("`", "").Replace("${", "") + ") AND (${_condition})` : \"" + Js(fixedCond) + "\"";

            var sb = new StringBuilder();
            sb.AppendLine("");
            sb.AppendLine("// ===== " + Js(txtTitle.Text.Trim()) + " — اتعملت من برنامج CreatePageReact =====");
            sb.AppendLine("export const " + name + " = (_condition: string = \"\"): SearchModalConfig => {");
            sb.AppendLine("  return {");
            sb.AppendLine("    title: \"" + Js(txtTitle.Text.Trim()) + "\",");
            sb.AppendLine("    tableName: \"" + cmbTable.Text.Trim() + "\",");
            sb.AppendLine("    keyColumn: \"" + cmbKey.SelectedItem + "\",");
            sb.AppendLine("    condition: " + condExpr + ",");
            sb.AppendLine("    columns: [");
            foreach (var c in cols) sb.AppendLine(c);
            sb.AppendLine("    ],");
            sb.AppendLine("    searchColumns: [" + string.Join(", ", searchCols) + "],");
            sb.AppendLine("    returnField: \"" + cmbReturn.SelectedItem + "\",");
            sb.AppendLine("    displayField: \"" + (cmbDisplay.SelectedItem ?? cmbReturn.SelectedItem) + "\",");
            sb.AppendLine("    pageSize: " + numPageSize.Value + ",");
            sb.AppendLine("    orderBy: \"" + (cmbOrderBy.SelectedItem ?? cmbKey.SelectedItem) + "\",");
            sb.AppendLine("    orderType: \"" + (cmbOrderType.SelectedItem ?? "DESC") + "\"");
            sb.AppendLine("  };");
            sb.AppendLine("};");
            return sb.ToString();
        }

        void SaveFunction()
        {
            string err;
            string code = Build(out err);
            if (err != null) { MessageBox.Show(err, "ناقص حاجة", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
            try
            {
                string s = File.ReadAllText(filePath);
                if (!s.Contains("SearchModalConfig"))
                    s = "import { SearchModalConfig } from \"../../ClientApp/Shared/Components/Import/ModelGrid\";\r\n" + s;
                string nl = s.Contains("\r\n") ? "\r\n" : "\n";
                s = s.TrimEnd() + nl + code.Replace("\r\n", "\n").Replace("\n", nl);
                File.WriteAllText(filePath, s, new UTF8Encoding(false));
                CreatedName = txtName.Text.Trim();
                DialogResult = DialogResult.OK;
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("مقدرتش أحفظ:\n" + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
