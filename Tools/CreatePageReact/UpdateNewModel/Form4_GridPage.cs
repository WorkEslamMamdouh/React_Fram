// =====================================================================================
//  Form4_GridPage.cs  —  إنشاء شاشة جدول (DynamicGrid) جاهزة للفريم ورك React_Fram
// -------------------------------------------------------------------------------------
//  الخطوات:
//   1) اتصل بقاعدة البيانات واختار الجدول  →  الحقول بتتحمل لوحدها بإعدادات مقترحة
//   2) ظبط كل حقل (يظهر في الجدول / الفورم / إجباري / بحث / فلتر / نوع الإدخال ...)
//   3) ظبط بيانات الشاشة (الاسم / العناوين / G_ProcessTrans / الصلاحيات)
//   4) توليد  →  حفظ الملفات  →  تنفيذ الصلاحيات على قاعدة البيانات
//
//  الملفات اللي بتتعمل:
//   app/ClientApp/<Module>/<Module>.ts     (المنطق)
//   app/ClientApp/<Module>/page.tsx        (الشكل)
//   public/StyleDesign/Pages/<Module>/<Module>EN.css + AR.css
//   + سطر في Routes.tsx  + كلمات ترجمة في Shared/Resources.ts
//   + Database/Add_<Module>_Module.sql   (Sys_Modules + Sys_RoleModule)
//
//  مكتوب بـ C# 7.3 عشان يشتغل على .NET Framework 4.6.1
// =====================================================================================

using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace UpdateNewModel
{
    public class Form4_GridPage : Form
    {
        // =====================================================================
        // #region الكنترولز
        // =====================================================================
        TextBox txtServer, txtUser, txtPass, txtDatabase;
        ComboBox cmbTable;
        Label lblKey;

        TextBox txtModuleCode, txtTitleAr, txtTitleEn, txtSubAr, txtSubEn, txtIcon;
        NumericUpDown numPageSize;

        CheckBox chkProcessTrans, chkFilterComp, chkFilterBranch;
        TextBox txtTrType;
        CheckBox chkInsert, chkEdit, chkDelete, chkExport;

        CheckBox chkPermissions;
        TextBox txtParentMenu, txtIconColor, txtRoles;

        TextBox txtAppPath, txtDbPath;

        DataGridView grid;

        TabControl tabsMain, tabsPreview;
        RichTextBox rtTs, rtTsx, rtResources, rtRoutes, rtSql;
        Label lblStatus;
        // #endregion

        // اسم المفتاح الأساسي للجدول ونوعه
        string keyColumn = "";
        bool keyIsIdentity = false;

        // الحقول اللي بتتملى أوتوماتيك
        static readonly string[] AutoValues = { "", "CompCode", "BranchCode", "UserID", "FinYear" };
        static readonly string[] InputTypes = { "text", "number", "textarea", "checkbox", "date", "select" };

        // =====================================================================
        // #region بيانات كل حقل (بنقراها من الجدول اللي في الشاشة)
        // =====================================================================
        class ColMeta
        {
            public string Name;
            public string SqlType;
            public int MaxLen;
            public bool IsNullable;
            public bool IsIdentity;
            public bool IsPK;
            public bool IsComputed;
        }

        class Opt
        {
            public string Value;
            public string Ar;
            public string En;
        }

        class RowInfo
        {
            public ColMeta Meta;
            public string Field;
            public string TitleAr;
            public string TitleEn;
            public bool InGrid;
            public bool InForm;
            public bool Required;
            public bool Search;
            public bool InFilter;
            public string InputType;
            public List<Opt> Options = new List<Opt>();
            public string Auto;
            public int Width;
            public int Order;
            public bool IsKey;
            public bool IsDecimal;
        }
        // #endregion

        public Form4_GridPage()
        {
            BuildUI();
            LoadConfig();
        }

        // =====================================================================
        // #region بناء الشاشة
        // =====================================================================
        void BuildUI()
        {
            Text = "إنشاء شاشة جدول (DynamicGrid) — React_Fram";
            Size = new Size(1400, 900);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 9.5f);
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;

            tabsMain = new TabControl { Dock = DockStyle.Fill, RightToLeftLayout = true };
            Controls.Add(tabsMain);

            // ---------------- التاب 1: الجدول والإعدادات ----------------
            var tab1 = new TabPage("1- الجدول والإعدادات");
            tabsMain.TabPages.Add(tab1);
            var flow = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                AutoScroll = true,
                Padding = new Padding(10)
            };
            tab1.Controls.Add(flow);

            // ===== الاتصال =====
            var gConn = NewGroup("① الاتصال بقاعدة البيانات واختيار الجدول", out TableLayoutPanel tConn);
            txtServer = AddText(tConn, "السيرفر:", ".", true);
            txtDatabase = AddText(tConn, "قاعدة البيانات:", "ESSA_React", true);
            txtUser = AddText(tConn, "المستخدم:", "sa", true);
            txtPass = AddText(tConn, "كلمة السر:", "", true);
            txtPass.UseSystemPasswordChar = true;

            var btnConnect = NewButton("اتصال وتحميل الجداول", Color.FromArgb(37, 99, 235));
            btnConnect.Click += (s, e) => LoadTables();
            AddPair(tConn, new Label(), btnConnect);

            cmbTable = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDown, RightToLeft = RightToLeft.No };
            AddPair(tConn, NewLabel("الجدول:"), cmbTable);

            var btnCols = NewButton("تحميل الحقول", Color.FromArgb(79, 70, 229));
            btnCols.Click += (s, e) => LoadColumns();
            AddPair(tConn, new Label(), btnCols);

            lblKey = NewLabel("المفتاح: —");
            lblKey.ForeColor = Color.DarkGreen;
            AddPair(tConn, new Label(), lblKey);
            Fit(gConn, tConn);
            flow.Controls.Add(gConn);

            // ===== بيانات الشاشة =====
            var gScreen = NewGroup("② بيانات الشاشة", out TableLayoutPanel tScreen);
            txtModuleCode = AddText(tScreen, "كود الشاشة (MODULE_CODE):", "", true);
            txtIcon = AddText(tScreen, "الأيقونة (Font Awesome):", "fa-table-list", true);
            txtTitleAr = AddText(tScreen, "العنوان عربي:", "", false);
            txtTitleEn = AddText(tScreen, "العنوان إنجليزي:", "", true);
            txtSubAr = AddText(tScreen, "وصف صغير عربي:", "", false);
            txtSubEn = AddText(tScreen, "وصف صغير إنجليزي:", "", true);
            numPageSize = new NumericUpDown { Minimum = 5, Maximum = 200, Value = 10, Width = 80 };
            AddPair(tScreen, NewLabel("عدد الصفوف في الصفحة:"), numPageSize);
            AddPair(tScreen, new Label(), NewHint("كود الشاشة = اسم الفولدر = اسم الدالة، حروف إنجليزي من غير مسافات (مثلاً FinancialType)"));
            Fit(gScreen, tScreen);
            flow.Controls.Add(gScreen);

            // ===== الحفظ =====
            var gSave = NewGroup("③ الحفظ والصلاحيات داخل الجدول", out TableLayoutPanel tSave);
            chkProcessTrans = new CheckBox { Text = "تشغيل G_ProcessTrans بعد الإضافة والتعديل والحذف", AutoSize = true };
            txtTrType = new TextBox { Dock = DockStyle.Fill, RightToLeft = RightToLeft.No, Enabled = false };
            chkProcessTrans.CheckedChanged += (s, e) => txtTrType.Enabled = chkProcessTrans.Checked;
            AddPair(tSave, chkProcessTrans, new Label());
            AddPair(tSave, NewLabel("@TrType:"), txtTrType);
            chkFilterComp = new CheckBox { Text = "اعرض بيانات الشركة الحالية بس (CompCode)", AutoSize = true, Checked = true };
            chkFilterBranch = new CheckBox { Text = "اعرض بيانات الفرع الحالي بس (BranchCode)", AutoSize = true };
            AddPair(tSave, chkFilterComp, chkFilterBranch);
            chkInsert = new CheckBox { Text = "إضافة", AutoSize = true, Checked = true };
            chkEdit = new CheckBox { Text = "تعديل", AutoSize = true, Checked = true };
            chkDelete = new CheckBox { Text = "حذف", AutoSize = true, Checked = true };
            chkExport = new CheckBox { Text = "تصدير", AutoSize = true, Checked = true };
            var pFlags = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
            pFlags.Controls.AddRange(new Control[] { chkInsert, chkEdit, chkDelete, chkExport });
            AddPair(tSave, NewLabel("أزرار الجدول:"), pFlags);
            Fit(gSave, tSave);
            flow.Controls.Add(gSave);

            // ===== الصلاحيات =====
            var gPerm = NewGroup("④ القائمة والصلاحيات (Sys_Modules / Sys_RoleModule)", out TableLayoutPanel tPerm);
            chkPermissions = new CheckBox { Text = "اعمل سكريبت الصلاحيات", AutoSize = true, Checked = true };
            AddPair(tPerm, chkPermissions, new Label());
            txtParentMenu = AddText(tPerm, "كود القائمة الأب:", "", true);
            txtIconColor = AddText(tPerm, "لون الأيقونة:", "indigo", true);
            txtRoles = AddText(tPerm, "أرقام الأدوار:", "", true);
            AddPair(tPerm, new Label(), NewHint("القائمة الأب فاضية = تظهر في أول القائمة.  الأدوار فاضية = كل دور عليه مستخدمين فعالين، أو اكتب مثلاً 1,2"));
            Fit(gPerm, tPerm);
            flow.Controls.Add(gPerm);

            // ===== المسارات =====
            var gPath = NewGroup("⑤ المسارات", out TableLayoutPanel tPath);
            txtAppPath = AddText(tPath, "فولدر الواجهة (Frontend\\App):", "", true);
            txtDbPath = AddText(tPath, "فولدر سكريبتات قاعدة البيانات:", "", true);
            Fit(gPath, tPath);
            flow.Controls.Add(gPath);

            var btnOld = NewButton("فتح شاشة التوليد القديمة (من HTML)", Color.Gray);
            btnOld.Click += (s, e) => new Form3_React().Show();
            flow.Controls.Add(btnOld);

            // ---------------- التاب 2: الحقول ----------------
            var tab2 = new TabPage("2- الحقول");
            tabsMain.TabPages.Add(tab2);
            var hint = new Label
            {
                Dock = DockStyle.Top,
                Height = 48,
                Padding = new Padding(8),
                BackColor = Color.FromArgb(239, 246, 255),
                Text = "• الاختيارات (للنوع select) بالشكل ده:   0=قبض=Receipt;1=صرف=Payment      (القيمة=عربي=إنجليزي)\n" +
                       "• قيمة تلقائية: الحقل بيتملى لوحده من الجلسة ومش بيظهر في الفورم.   • الحقل اللي مش في الفورم ولا تلقائي بيتعرض بس ومش بيتحفظ."
            };
            grid = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                RowHeadersWidth = 30,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.None,
                RightToLeft = RightToLeft.No
            };
            grid.DataError += (s, e) => { e.ThrowException = false; };
            grid.CurrentCellDirtyStateChanged += (s, e) =>
            {
                if (grid.IsCurrentCellDirty) grid.CommitEdit(DataGridViewDataErrorContexts.Commit);
            };
            BuildGridColumns();
            tab2.Controls.Add(grid);
            tab2.Controls.Add(hint);

            // ---------------- التاب 3: المعاينة والحفظ ----------------
            var tab3 = new TabPage("3- المعاينة والحفظ");
            tabsMain.TabPages.Add(tab3);
            var pButtons = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 52, Padding = new Padding(6) };
            var btnGen = NewButton("① توليد الكود", Color.FromArgb(37, 99, 235));
            var btnSave = NewButton("② حفظ الملفات", Color.FromArgb(5, 150, 105));
            var btnRunSql = NewButton("③ تنفيذ الصلاحيات على قاعدة البيانات", Color.FromArgb(217, 119, 6));
            btnGen.Click += (s, e) => Generate();
            btnSave.Click += (s, e) => SaveFiles();
            btnRunSql.Click += (s, e) => RunPermissionsSql();
            lblStatus = new Label { AutoSize = true, Padding = new Padding(10, 10, 10, 0), ForeColor = Color.DarkBlue };
            pButtons.Controls.AddRange(new Control[] { btnGen, btnSave, btnRunSql, lblStatus });

            tabsPreview = new TabControl { Dock = DockStyle.Fill };
            rtTs = AddPreview("Module.ts");
            rtTsx = AddPreview("page.tsx");
            rtResources = AddPreview("Resources (ترجمة)");
            rtRoutes = AddPreview("Routes.tsx");
            rtSql = AddPreview("SQL الصلاحيات");
            tab3.Controls.Add(tabsPreview);
            tab3.Controls.Add(pButtons);
        }

        void BuildGridColumns()
        {
            grid.Columns.Add(TextCol("Field", "الحقل", 140, true));
            grid.Columns.Add(TextCol("SqlType", "النوع في SQL", 100, true));
            grid.Columns.Add(TextCol("TitleAr", "العنوان عربي", 150, false));
            grid.Columns.Add(TextCol("TitleEn", "العنوان إنجليزي", 150, false));
            grid.Columns.Add(CheckCol("InGrid", "في الجدول"));
            grid.Columns.Add(CheckCol("InForm", "في الفورم"));
            grid.Columns.Add(CheckCol("Required", "إجباري"));
            grid.Columns.Add(CheckCol("Search", "بحث سريع"));
            grid.Columns.Add(CheckCol("InFilter", "فلتر"));
            grid.Columns.Add(ComboCol("InputType", "نوع الإدخال", InputTypes, 95));
            grid.Columns.Add(TextCol("Options", "الاختيارات (select)", 220, false));
            grid.Columns.Add(ComboCol("Auto", "قيمة تلقائية", AutoValues, 100));
            grid.Columns.Add(TextCol("Width", "العرض", 60, false));
            grid.Columns.Add(TextCol("Order", "الترتيب", 60, false));
        }
        // #endregion

        // =====================================================================
        // #region أدوات بناء الشاشة
        // =====================================================================
        GroupBox NewGroup(string title, out TableLayoutPanel table)
        {
            var g = new GroupBox { Text = title, Width = 1300, Padding = new Padding(10), Font = new Font("Segoe UI", 10f, FontStyle.Bold) };
            table = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 4, AutoSize = true, Font = new Font("Segoe UI", 9.5f) };
            table.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            g.Controls.Add(table);
            return g;
        }

        // ارتفاع المجموعة على قد اللي جواها
        void Fit(GroupBox g, TableLayoutPanel t)
        {
            g.Height = t.GetPreferredSize(new Size(g.Width - 24, 0)).Height + 40;
        }

        Label NewLabel(string text)
        {
            return new Label { Text = text, AutoSize = true, Anchor = AnchorStyles.Right | AnchorStyles.Left, Padding = new Padding(0, 6, 0, 0) };
        }

        Label NewHint(string text)
        {
            return new Label { Text = text, AutoSize = true, ForeColor = Color.DimGray, Padding = new Padding(0, 6, 0, 0) };
        }

        Button NewButton(string text, Color color)
        {
            return new Button
            {
                Text = text,
                AutoSize = true,
                BackColor = color,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Padding = new Padding(8, 4, 8, 4),
                Margin = new Padding(4)
            };
        }

        TextBox AddText(TableLayoutPanel t, string label, string value, bool ltr)
        {
            var tb = new TextBox { Text = value, Dock = DockStyle.Fill, RightToLeft = ltr ? RightToLeft.No : RightToLeft.Yes };
            AddPair(t, NewLabel(label), tb);
            return tb;
        }

        void AddPair(TableLayoutPanel t, Control a, Control b)
        {
            t.Controls.Add(a);
            t.Controls.Add(b);
        }

        RichTextBox AddPreview(string title)
        {
            var page = new TabPage(title);
            var rt = new RichTextBox { Dock = DockStyle.Fill, Font = new Font("Consolas", 10f), WordWrap = false, RightToLeft = RightToLeft.No };
            page.Controls.Add(rt);
            tabsPreview.TabPages.Add(page);
            return rt;
        }

        DataGridViewTextBoxColumn TextCol(string name, string header, int width, bool readOnly)
        {
            return new DataGridViewTextBoxColumn { Name = name, HeaderText = header, Width = width, ReadOnly = readOnly };
        }

        DataGridViewCheckBoxColumn CheckCol(string name, string header)
        {
            return new DataGridViewCheckBoxColumn { Name = name, HeaderText = header, Width = 70 };
        }

        DataGridViewComboBoxColumn ComboCol(string name, string header, string[] items, int width)
        {
            var c = new DataGridViewComboBoxColumn { Name = name, HeaderText = header, Width = width, FlatStyle = FlatStyle.Flat };
            c.Items.AddRange(items);
            return c;
        }

        void SetStatus(string text, bool error = false)
        {
            lblStatus.ForeColor = error ? Color.DarkRed : Color.DarkGreen;
            lblStatus.Text = text;
        }
        // #endregion

        // =====================================================================
        // #region الإعدادات وقاعدة البيانات
        // =====================================================================
        void LoadConfig()
        {
            // نفس ملف Config.txt بتاع البرنامج
            try
            {
                string file = Path.Combine(Application.StartupPath, "Config.txt");
                if (File.Exists(file))
                {
                    var cfg = JObject.Parse(File.ReadAllText(file));
                    txtServer.Text = (string)cfg["Name_Server"] ?? txtServer.Text;
                    txtUser.Text = (string)cfg["Name_User"] ?? txtUser.Text;
                    txtPass.Text = (string)cfg["Server_Pass"] ?? "";
                    string db = (string)cfg["SetNameData"];
                    if (!string.IsNullOrWhiteSpace(db)) txtDatabase.Text = db;
                }
            }
            catch { }

            // المسارات: البرنامج جوه React_Fram\Tools\CreatePageReact\UpdateNewModel\bin\Debug
            string root = @"C:\PC\Work\React_Fram";
            try
            {
                string guess = Path.GetFullPath(Path.Combine(Application.StartupPath, @"..\..\..\..\.."));
                if (Directory.Exists(Path.Combine(guess, "Frontend", "App"))) root = guess;
            }
            catch { }
            txtAppPath.Text = Path.Combine(root, "Frontend", "App");
            txtDbPath.Text = Path.Combine(root, "Database");
        }

        string ConnString()
        {
            var b = new SqlConnectionStringBuilder
            {
                DataSource = txtServer.Text.Trim(),
                InitialCatalog = txtDatabase.Text.Trim(),
                UserID = txtUser.Text.Trim(),
                Password = txtPass.Text,
                ConnectTimeout = 10
            };
            return b.ConnectionString;
        }

        void LoadTables()
        {
            try
            {
                cmbTable.Items.Clear();
                using (var con = new SqlConnection(ConnString()))
                using (var cmd = new SqlCommand("SELECT name FROM sys.tables ORDER BY name", con))
                {
                    con.Open();
                    using (var r = cmd.ExecuteReader())
                        while (r.Read()) cmbTable.Items.Add(r.GetString(0));
                }
                MessageBox.Show("تم تحميل " + cmbTable.Items.Count + " جدول ✔️");
                cmbTable.DroppedDown = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("مقدرتش أتصل بقاعدة البيانات:\n" + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        List<ColMeta> ReadColumns(string table)
        {
            var list = new List<ColMeta>();
            const string sql = @"
SELECT c.name, t.name AS type_name, c.max_length, c.is_nullable, c.is_identity, c.is_computed,
       CAST(CASE WHEN EXISTS (
            SELECT 1 FROM sys.index_columns ic
            JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            WHERE i.is_primary_key = 1 AND ic.object_id = c.object_id AND ic.column_id = c.column_id)
       THEN 1 ELSE 0 END AS bit) AS is_pk
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID(@t)
ORDER BY c.column_id";
            using (var con = new SqlConnection(ConnString()))
            using (var cmd = new SqlCommand(sql, con))
            {
                cmd.Parameters.AddWithValue("@t", table);
                con.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        list.Add(new ColMeta
                        {
                            Name = r.GetString(0),
                            SqlType = r.GetString(1).ToLower(),
                            MaxLen = Convert.ToInt32(r[2]),
                            IsNullable = Convert.ToBoolean(r[3]),
                            IsIdentity = Convert.ToBoolean(r[4]),
                            IsComputed = Convert.ToBoolean(r[5]),
                            IsPK = Convert.ToBoolean(r[6])
                        });
                    }
                }
            }
            return list;
        }

        // أسماء الحقول من جدول G_Resources لو موجود (KeyRes / NameResAr / NameResEn)
        Dictionary<string, string[]> ReadResources()
        {
            var dic = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            try
            {
                using (var con = new SqlConnection(ConnString()))
                using (var cmd = new SqlCommand("IF OBJECT_ID('dbo.G_Resources') IS NOT NULL SELECT KeyRes, NameResAr, NameResEn FROM dbo.G_Resources", con))
                {
                    con.Open();
                    using (var r = cmd.ExecuteReader())
                        while (r.Read())
                        {
                            string k = Convert.ToString(r[0]);
                            if (!string.IsNullOrWhiteSpace(k) && !dic.ContainsKey(k))
                                dic[k] = new[] { Convert.ToString(r[1]), Convert.ToString(r[2]) };
                        }
                }
            }
            catch { }
            return dic;
        }
        // #endregion

        // =====================================================================
        // #region تحميل الحقول بإعدادات مقترحة
        // =====================================================================
        static readonly Dictionary<string, string[]> KnownTitles = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            { "Description", new[] { "الوصف", "Description" } },
            { "DescAr", new[] { "الوصف عربي", "Description (Arabic)" } },
            { "DescEn", new[] { "الوصف إنجليزي", "Description (English)" } },
            { "DescA", new[] { "الوصف عربي", "Description (Arabic)" } },
            { "DescE", new[] { "الوصف إنجليزي", "Description (English)" } },
            { "NameA", new[] { "الاسم عربي", "Name (Arabic)" } },
            { "NameE", new[] { "الاسم إنجليزي", "Name (English)" } },
            { "Name", new[] { "الاسم", "Name" } },
            { "Code", new[] { "الكود", "Code" } },
            { "IsActive", new[] { "فعال", "Active" } },
            { "Status", new[] { "الحالة", "Status" } },
            { "Remarks", new[] { "ملاحظات", "Remarks" } },
            { "Remark", new[] { "ملاحظات", "Remarks" } },
            { "Amount", new[] { "المبلغ", "Amount" } },
            { "TrType", new[] { "النوع", "Type" } },
            { "TrNo", new[] { "رقم الحركة", "Trans No" } },
            { "TrDate", new[] { "التاريخ", "Date" } },
            { "CreatedAt", new[] { "تاريخ الإنشاء", "Created at" } },
            { "CreatedBy", new[] { "أنشئ بواسطة", "Created by" } },
            { "UpdatedAt", new[] { "تاريخ التعديل", "Updated at" } },
            { "UpdatedBy", new[] { "عدّل بواسطة", "Updated by" } },
        };

        static bool IsNumberType(string t)
        {
            return t == "int" || t == "bigint" || t == "smallint" || t == "tinyint" || IsDecimalType(t);
        }

        static bool IsDecimalType(string t)
        {
            return t == "decimal" || t == "numeric" || t == "money" || t == "smallmoney" || t == "float" || t == "real";
        }

        static bool IsDateType(string t)
        {
            return t == "date" || t == "datetime" || t == "smalldatetime" || t == "datetime2" || t == "datetimeoffset";
        }

        static bool IsTextType(string t)
        {
            return t == "nvarchar" || t == "varchar" || t == "nchar" || t == "char" || t == "text" || t == "ntext";
        }

        static string SplitWords(string name)
        {
            return Regex.Replace(name.Replace("_", " "), "([a-z])([A-Z])", "$1 $2").Trim();
        }

        void LoadColumns()
        {
            string table = cmbTable.Text.Trim();
            if (table == "") { MessageBox.Show("اختار الجدول الأول"); return; }

            List<ColMeta> cols;
            try { cols = ReadColumns(table); }
            catch (Exception ex) { MessageBox.Show("خطأ في قراءة الحقول:\n" + ex.Message); return; }
            if (cols.Count == 0) { MessageBox.Show("الجدول مش موجود أو مفيهوش حقول"); return; }

            var res = ReadResources();

            // المفتاح: أول عمود ترقيم تلقائي، وإلا أول مفتاح أساسي، وإلا أول عمود
            var key = cols.FirstOrDefault(c => c.IsIdentity) ?? cols.FirstOrDefault(c => c.IsPK) ?? cols[0];
            keyColumn = key.Name;
            keyIsIdentity = key.IsIdentity;
            lblKey.Text = "المفتاح: " + keyColumn + (keyIsIdentity ? "  (ترقيم تلقائي)" : "  (بيتكتب يدوي)");

            // اقتراح كود الشاشة من اسم الجدول (D_A_CashTypes → CashTypes)
            if (txtModuleCode.Text.Trim() == "")
            {
                string m = Regex.Replace(table, @"^([A-Za-z]{1,3}_)+", "");
                m = Regex.Replace(m, @"[^A-Za-z0-9_]", "");
                if (m == "" || char.IsDigit(m[0])) m = "Page_" + m;
                txtModuleCode.Text = m;
            }
            if (txtTitleEn.Text.Trim() == "") txtTitleEn.Text = SplitWords(txtModuleCode.Text);
            if (txtTitleAr.Text.Trim() == "") txtTitleAr.Text = txtTitleEn.Text;

            grid.Rows.Clear();
            int order = 1;
            foreach (var c in cols)
            {
                if (c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase)) continue;

                bool isKey = c.Name == keyColumn;
                string auto = "";
                foreach (var a in AutoValues)
                    if (a != "" && c.Name.Equals(a, StringComparison.OrdinalIgnoreCase)) auto = a;

                string input = "text";
                if (c.SqlType == "bit") input = "checkbox";
                else if (IsNumberType(c.SqlType)) input = "number";
                else if (IsDateType(c.SqlType)) input = "date";

                string ar, en;
                string[] found;
                if (res.TryGetValue(c.Name, out found) && !string.IsNullOrWhiteSpace(found[0]))
                {
                    ar = found[0];
                    en = string.IsNullOrWhiteSpace(found[1]) ? SplitWords(c.Name) : found[1];
                }
                else if (KnownTitles.TryGetValue(c.Name, out found))
                {
                    ar = found[0]; en = found[1];
                }
                else if (isKey)
                {
                    ar = "الرقم"; en = "ID";
                }
                else
                {
                    en = SplitWords(c.Name); ar = en;
                }

                bool inForm = !isKey && auto == "" && !c.IsComputed && !c.IsIdentity;
                if (isKey && !keyIsIdentity) inForm = true;

                int i = grid.Rows.Add();
                var row = grid.Rows[i];
                row.Tag = c;
                row.Cells["Field"].Value = c.Name;
                row.Cells["SqlType"].Value = c.SqlType + (IsTextType(c.SqlType) ? "(" + (c.MaxLen == -1 ? "max" : c.MaxLen.ToString()) + ")" : "");
                row.Cells["TitleAr"].Value = ar;
                row.Cells["TitleEn"].Value = en;
                row.Cells["InGrid"].Value = auto == "";
                row.Cells["InForm"].Value = inForm;
                row.Cells["Required"].Value = (inForm && !c.IsNullable) || (isKey && !keyIsIdentity);
                row.Cells["Search"].Value = isKey || (IsTextType(c.SqlType) && auto == "");
                row.Cells["InFilter"].Value = auto == "" && !c.IsComputed;
                row.Cells["InputType"].Value = input;
                row.Cells["Options"].Value = "";
                row.Cells["Auto"].Value = auto;
                row.Cells["Width"].Value = isKey ? 90 : (input == "checkbox" ? 100 : (input == "number" ? 120 : 220));
                row.Cells["Order"].Value = order++;
                if (isKey) row.DefaultCellStyle.BackColor = Color.FromArgb(220, 252, 231);
                if (auto != "") row.DefaultCellStyle.BackColor = Color.FromArgb(243, 244, 246);
            }

            tabsMain.SelectedIndex = 1;
            MessageBox.Show("تم تحميل " + grid.Rows.Count + " حقل ✔️\nراجع الإعدادات في تاب (الحقول)");
        }
        // #endregion

        // =====================================================================
        // #region قراءة الإعدادات من الشاشة
        // =====================================================================
        static string Str(DataGridViewRow r, string col)
        {
            return Convert.ToString(r.Cells[col].Value ?? "").Trim();
        }

        static bool Bool(DataGridViewRow r, string col)
        {
            object v = r.Cells[col].Value;
            return v is bool && (bool)v;
        }

        static int Int(DataGridViewRow r, string col, int def)
        {
            int n;
            return int.TryParse(Str(r, col), out n) ? n : def;
        }

        List<RowInfo> ReadRows()
        {
            grid.EndEdit();
            var list = new List<RowInfo>();
            foreach (DataGridViewRow r in grid.Rows)
            {
                var meta = r.Tag as ColMeta;
                if (meta == null) continue;
                var info = new RowInfo
                {
                    Meta = meta,
                    Field = meta.Name,
                    TitleAr = Str(r, "TitleAr"),
                    TitleEn = Str(r, "TitleEn"),
                    InGrid = Bool(r, "InGrid"),
                    InForm = Bool(r, "InForm"),
                    Required = Bool(r, "Required"),
                    Search = Bool(r, "Search"),
                    InFilter = Bool(r, "InFilter"),
                    InputType = Str(r, "InputType"),
                    Auto = Str(r, "Auto"),
                    Width = Int(r, "Width", 150),
                    Order = Int(r, "Order", 99),
                    IsKey = meta.Name == keyColumn,
                    IsDecimal = IsDecimalType(meta.SqlType)
                };
                if (info.InputType == "") info.InputType = "text";
                if (info.TitleAr == "") info.TitleAr = info.Field;
                if (info.TitleEn == "") info.TitleEn = info.Field;
                if (info.Auto != "") info.InForm = false;          // التلقائي مش بيظهر في الفورم

                // الاختيارات:  0=قبض=Receipt;1=صرف=Payment
                foreach (var part in Str(r, "Options").Split(new[] { ';', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var p = part.Split('=');
                    if (p.Length < 2 || p[0].Trim() == "") continue;
                    info.Options.Add(new Opt
                    {
                        Value = p[0].Trim(),
                        Ar = p[1].Trim(),
                        En = p.Length > 2 && p[2].Trim() != "" ? p[2].Trim() : p[1].Trim()
                    });
                }
                list.Add(info);
            }
            return list.OrderBy(x => x.Order).ToList();
        }

        string Module { get { return txtModuleCode.Text.Trim(); } }

        string Validate(List<RowInfo> rows)
        {
            if (rows.Count == 0) return "حمّل الحقول الأول (تاب 1 ← تحميل الحقول)";
            if (!Regex.IsMatch(Module, @"^[A-Za-z][A-Za-z0-9_]*$")) return "كود الشاشة لازم حروف إنجليزي وأرقام بس ويبدأ بحرف";
            if (txtTitleAr.Text.Trim() == "" || txtTitleEn.Text.Trim() == "") return "اكتب عنوان الشاشة عربي وإنجليزي";
            if (chkProcessTrans.Checked && txtTrType.Text.Trim() == "") return "اكتب @TrType أو اقفل G_ProcessTrans";
            foreach (var r in rows)
                if (r.InputType == "select" && r.Options.Count == 0)
                    return "الحقل " + r.Field + " نوعه select ومفيهوش اختيارات";
            return null;
        }
        // #endregion

        // =====================================================================
        // #region التوليد
        // =====================================================================
        static string Js(string s)
        {
            return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
        }

        static string Sql(string s)
        {
            return (s ?? "").Replace("'", "''");
        }

        static string JsValue(string v)
        {
            double d;
            return double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d)
                ? v : "\"" + Js(v) + "\"";
        }

        static string T(string en, string ar)
        {
            return "t(\"" + Js(en) + "\", \"" + Js(ar) + "\")";
        }

        static string AutoExpr(string auto)
        {
            // الأسماء دي متعرفة كـ const في ملف الـ ts
            return auto;
        }

        string GenColumns(List<RowInfo> rows)
        {
            var sb = new StringBuilder();
            int formOrder = 1;
            foreach (var r in rows)
            {
                bool isSave = r.IsKey || r.Auto != "" || r.InForm;
                var lines = new List<string>();
                lines.Add("field: \"" + r.Field + "\",");
                lines.Add("title: " + T(r.TitleEn, r.TitleAr) + ",");

                string type = r.InputType;
                if (type == "number" || type == "checkbox" || type == "date") lines.Add("type: \"" + type + "\",");
                if (type != "text" && type != "checkbox") lines.Add("inputType: \"" + type + "\",");
                if (type == "textarea") lines.Add("rows: 3,");
                if (type == "number" && r.IsDecimal) lines.Add("step: 0.01,");
                if (type == "select")
                {
                    var opts = r.Options.Select(o => "{ value: " + JsValue(o.Value) + ", label: " + T(o.En, o.Ar) + " }");
                    lines.Add("selectOptions: [" + string.Join(", ", opts) + "],");
                    lines.Add("DefaultValue: " + JsValue(r.Options[0].Value) + ",");
                }
                if (type == "checkbox" && !r.IsKey && r.Auto == "") lines.Add("DefaultValue: true,");
                if (type == "number" && !r.IsKey && r.Auto == "" && r.InForm) lines.Add("DefaultValue: 0,");
                if (r.Auto != "") lines.Add("DefaultValue: " + AutoExpr(r.Auto) + ",          // تلقائي من الجلسة");

                lines.Add("width: " + r.Width + ",");

                if (r.IsKey && keyIsIdentity)
                {
                    lines.Add("editable: false,");
                    lines.Add("insertable: false,          // ترقيم تلقائي");
                }
                else if (r.IsKey)
                {
                    lines.Add("IsDisabledInEdit: true,     // المفتاح مش بيتعدّل");
                }
                else if (!r.InForm)
                {
                    lines.Add("editable: false,");
                    lines.Add("insertable: false,");
                }

                if (r.Required && (r.InForm || (r.IsKey && !keyIsIdentity))) lines.Add("IsRequired: true,");
                lines.Add("IsSave: " + (isSave ? "true" : "false") + "," + (isSave ? "" : "              // للعرض بس"));
                if (!r.InGrid) lines.Add("IsVisibleDisplayInGrid: false,");
                if (!r.Search) lines.Add("IsSearchColumn: false,");
                if (r.InForm || (r.IsKey && !keyIsIdentity)) lines.Add("SortFieldInEditAndAdd: " + (formOrder++) + ",");

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
            foreach (var r in rows.Where(x => x.InFilter))
            {
                string label = T(r.TitleEn, r.TitleAr);
                if (r.InputType == "select")
                {
                    var opts = r.Options.Select(o => "{ value: \"" + Js(o.Value) + "\", label: " + T(o.En, o.Ar) + " }");
                    sb.AppendLine("      { field: \"" + r.Field + "\", label: " + label + ", type: \"select\", options: [" + string.Join(", ", opts) + "], sortOrder: " + (n++) + " },");
                }
                else if (r.InputType == "checkbox")
                {
                    sb.AppendLine("      { field: \"" + r.Field + "\", label: " + label + ", type: \"select\", options: [{ value: \"1\", label: t(\"Yes\", \"نعم\") }, { value: \"0\", label: t(\"No\", \"لا\") }], sortOrder: " + (n++) + " },");
                }
                else if (r.InputType == "number")
                {
                    sb.AppendLine("      { field: \"" + r.Field + "\", label: " + label + ", type: \"number\", sortOrder: " + (n++) + " },");
                }
                else if (r.InputType == "date")
                {
                    sb.AppendLine("      { field: \"" + r.Field + "\", label: " + label + ", type: \"dateRange\", sortOrder: " + (n++) + " },");
                }
                else
                {
                    sb.AppendLine("      { field: \"" + r.Field + "\", label: " + label + ", type: \"text\", sortOrder: " + (n++) + " },");
                }
            }
            return sb.ToString().TrimEnd();
        }

        string GenCondition(List<RowInfo> rows)
        {
            var parts = new List<string>();
            if (chkFilterComp.Checked && rows.Any(r => r.Field.Equals("CompCode", StringComparison.OrdinalIgnoreCase)))
                parts.Add("CompCode = ${CompCode}");
            if (chkFilterBranch.Checked && rows.Any(r => r.Field.Equals("BranchCode", StringComparison.OrdinalIgnoreCase)))
                parts.Add("BranchCode = ${BranchCode}");
            return parts.Count == 0 ? "\"\"" : "`" + string.Join(" AND ", parts) + "`";
        }

        string GenTs(List<RowInfo> rows)
        {
            string saveDesc = chkProcessTrans.Checked
                ? "مع G_ProcessTrans  (@TrType = '" + txtTrType.Text.Trim() + "')"
                : "عادي من غير G_ProcessTrans";
            return TPL_TS
                .Replace("__MODULE__", Module)
                .Replace("__TITLE_AR__", txtTitleAr.Text.Trim())
                .Replace("__TABLE__", cmbTable.Text.Trim())
                .Replace("__KEY__", keyColumn)
                .Replace("__SAVE_DESC__", saveDesc)
                .Replace("__TRTYPE__", Js(chkProcessTrans.Checked ? txtTrType.Text.Trim() : ""))
                .Replace("__RUN_PT__", chkProcessTrans.Checked ? "true" : "false")
                .Replace("__CONDITION__", GenCondition(rows))
                .Replace("__COLUMNS__", GenColumns(rows))
                .Replace("__FILTERS__", GenFilters(rows))
                .Replace("__PAGE_SIZE__", numPageSize.Value.ToString())
                .Replace("__INSERT__", chkInsert.Checked ? "true" : "false")
                .Replace("__EDIT__", chkEdit.Checked ? "true" : "false")
                .Replace("__DELETE__", chkDelete.Checked ? "true" : "false")
                .Replace("__EXPORT__", chkExport.Checked ? "true" : "false");
        }

        string GenTsx()
        {
            string icon = txtIcon.Text.Trim();
            if (icon == "") icon = "fa-table-list";
            if (!icon.StartsWith("fa-")) icon = "fa-" + icon;
            return TPL_TSX.Replace("__MODULE__", Module).Replace("__ICON__", icon).Replace("__TITLE_AR__", txtTitleAr.Text.Trim());
        }

        string[] ResKeys()
        {
            return new[] { Module + "_title", Module + "_subtitle", Module + "_refresh" };
        }

        string GenResEn(string nl)
        {
            var k = ResKeys();
            return "    // ===== " + Module + " =====" + nl +
                   "    " + k[0] + ": \"" + Js(txtTitleEn.Text.Trim()) + "\"," + nl +
                   "    " + k[1] + ": \"" + Js(txtSubEn.Text.Trim()) + "\"," + nl +
                   "    " + k[2] + ": \"Refresh\"";
        }

        string GenResAr(string nl)
        {
            var k = ResKeys();
            return "    // ===== " + Module + " =====" + nl +
                   "    " + k[0] + ": \"" + Js(txtTitleAr.Text.Trim()) + "\"," + nl +
                   "    " + k[1] + ": \"" + Js(txtSubAr.Text.Trim()) + "\"," + nl +
                   "    " + k[2] + ": \"تحديث\"";
        }

        string GenSql()
        {
            if (!chkPermissions.Checked) return "-- سكريبت الصلاحيات مقفول";
            string roles;
            var ids = txtRoles.Text.Split(new[] { ',', ' ', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => { int n; return int.TryParse(x, out n) ? (int?)n : null; })
                .Where(x => x.HasValue).Select(x => x.Value).Distinct().ToList();
            if (ids.Count == 0)
                roles = "INSERT INTO @Roles (RoleId) SELECT DISTINCT RoleId FROM dbo.Sys_RoleUsers WHERE ISActive = 1;   -- كل دور عليه مستخدمين فعالين";
            else
                roles = "INSERT INTO @Roles (RoleId) VALUES " + string.Join(", ", ids.Select(x => "(" + x + ")")) + ";";

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
                sql += Environment.NewLine + Environment.NewLine +
                       "-- =====================================================================" + Environment.NewLine +
                       "-- ⚠️ G_ProcessTrans: لازم يكون فيه جزء للنوع '" + Sql(txtTrType.Text.Trim()) + "' وإلا الحفظ هيفشل" + Environment.NewLine +
                       "-- انسخ ده جوه الإجراء (مكان التعليق ➕) لو مش موجود:" + Environment.NewLine +
                       "-- =====================================================================" + Environment.NewLine +
                       "/*" + Environment.NewLine +
                       "		if @TrType = '" + Sql(txtTrType.Text.Trim()) + "'" + Environment.NewLine +
                       "		begin" + Environment.NewLine +
                       "			Set @TrNo = 1" + Environment.NewLine +
                       "			-- اكتب هنا اللي محتاج يحصل بعد الإضافة / التعديل / الحذف (@OpMode)" + Environment.NewLine +
                       "			set @r = 0" + Environment.NewLine +
                       "		END" + Environment.NewLine +
                       "*/";
            }
            return sql;
        }

        string GenRoutesLine()
        {
            return "    " + Module + ": HomeLayout,";
        }

        void Generate()
        {
            var rows = ReadRows();
            string err = Validate(rows);
            if (err != null) { MessageBox.Show(err, "ناقص حاجة", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

            rtTs.Text = GenTs(rows);
            rtTsx.Text = GenTsx();
            rtResources.Text = "// en:" + Environment.NewLine + GenResEn(Environment.NewLine) + Environment.NewLine + Environment.NewLine +
                               "// ar:" + Environment.NewLine + GenResAr(Environment.NewLine);
            rtRoutes.Text = GenRoutesLine();
            rtSql.Text = GenSql();
            tabsPreview.TabPages[0].Text = Module + ".ts";
            tabsMain.SelectedIndex = 2;

            string warn = CheckProcessTrans();
            SetStatus(warn ?? "تم التوليد ✔️  راجع الملفات وبعدين اضغط (حفظ الملفات)", warn != null);
        }

        // بيتأكد إن G_ProcessTrans فيه جزء للنوع ده
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
        // #region الحفظ
        // =====================================================================
        static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

        void WriteFile(string folder, string name, string content)
        {
            Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder, name), content, Utf8NoBom);
        }

        void SaveFiles()
        {
            if (rtTs.Text.Trim() == "") { MessageBox.Show("اضغط (توليد الكود) الأول"); return; }
            string app = txtAppPath.Text.Trim();
            if (!Directory.Exists(Path.Combine(app, "app", "ClientApp")))
            {
                MessageBox.Show("مسار الواجهة غلط، لازم يكون فيه app\\ClientApp:\n" + app);
                return;
            }

            string pageDir = Path.Combine(app, "app", "ClientApp", Module);
            if (Directory.Exists(pageDir) &&
                MessageBox.Show("الشاشة " + Module + " موجودة قبل كده. أكتب فوقها؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            var done = new List<string>();
            try
            {
                // 1) ملفات الشاشة
                WriteFile(pageDir, Module + ".ts", rtTs.Text);
                WriteFile(pageDir, "page.tsx", rtTsx.Text);
                done.Add("✔️ " + Module + ".ts و page.tsx");

                // 2) ملفات التنسيق
                string cssDir = Path.Combine(app, "public", "StyleDesign", "Pages", Module);
                if (!File.Exists(Path.Combine(cssDir, Module + "EN.css"))) WriteFile(cssDir, Module + "EN.css", "/* " + Module + " - English (LTR) */\r\n");
                if (!File.Exists(Path.Combine(cssDir, Module + "AR.css"))) WriteFile(cssDir, Module + "AR.css", "/* " + Module + " - Arabic (RTL) */\r\n");
                done.Add("✔️ ملفات التنسيق");

                // 3) Routes.tsx
                done.Add(UpdateRoutes(Path.Combine(app, "app", "ClientApp", "Routes.tsx")));

                // 4) Resources.ts
                done.Add(UpdateResources(Path.Combine(app, "app", "ClientApp", "Shared", "Resources.ts")));

                // 5) سكريبت الصلاحيات
                if (chkPermissions.Checked)
                {
                    WriteFile(txtDbPath.Text.Trim(), "Add_" + Module + "_Module.sql", rtSql.Text);
                    done.Add("✔️ Database\\Add_" + Module + "_Module.sql");
                }

                SetStatus("تم الحفظ ✔️");
                MessageBox.Show(string.Join("\n", done) + "\n\nالخطوة الجاية: (تنفيذ الصلاحيات على قاعدة البيانات)", "تم الحفظ");
            }
            catch (Exception ex)
            {
                SetStatus("فشل الحفظ", true);
                MessageBox.Show(string.Join("\n", done) + "\n\n❌ " + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        string UpdateRoutes(string path)
        {
            if (!File.Exists(path)) return "⚠️ Routes.tsx مش موجود — ضيف السطر بإيدك: " + GenRoutesLine().Trim();
            string s = File.ReadAllText(path);
            if (Regex.IsMatch(s, @"^[ \t]*" + Module + @"[ \t]*:", RegexOptions.Multiline))
                return "ℹ️ الشاشة موجودة في Routes.tsx قبل كده";

            string nl = s.Contains("\r\n") ? "\r\n" : "\n";
            var m = Regex.Match(s, @"^([ \t]*)Home[ \t]*:[ \t]*HomeLayout[ \t]*,[ \t]*\r?\n", RegexOptions.Multiline);
            if (m.Success)
            {
                s = s.Insert(m.Index + m.Length, m.Groups[1].Value + Module + ": HomeLayout," + nl);
            }
            else
            {
                var m2 = Regex.Match(s, @"const[ \t]+routes[^{]*\{[ \t]*\r?\n");
                if (!m2.Success) return "⚠️ مقدرتش ألاقي مكان في Routes.tsx — ضيف السطر بإيدك: " + GenRoutesLine().Trim();
                s = s.Insert(m2.Index + m2.Length, GenRoutesLine() + nl);
            }
            File.WriteAllText(path, s, Utf8NoBom);
            return "✔️ Routes.tsx";
        }

        // بيضيف سطور قبل قوس القفل اللي في المكان closeIdx، ويحط فاصلة لو ناقصة
        static string InsertBeforeClose(string s, int closeIdx, string block, string nl)
        {
            int p = closeIdx - 1;
            while (p >= 0 && char.IsWhiteSpace(s[p])) p--;
            string head = s.Substring(0, p + 1);
            if (s[p] != ',' && s[p] != '{') head += ",";
            return head + nl + block + s.Substring(p + 1);
        }

        string UpdateResources(string path)
        {
            if (!File.Exists(path)) return "⚠️ Resources.ts مش موجود";
            string s = File.ReadAllText(path);
            if (s.Contains(ResKeys()[0] + ":")) return "ℹ️ كلمات الترجمة موجودة قبل كده";

            string nl = s.Contains("\r\n") ? "\r\n" : "\n";
            var arMatch = Regex.Match(s, @"^[ \t]*ar[ \t]*:[ \t]*\{", RegexOptions.Multiline);
            int end = s.LastIndexOf("};", StringComparison.Ordinal);
            if (!arMatch.Success || end < 0) return "⚠️ مقدرتش أفهم شكل Resources.ts — انسخ الترجمة بإيدك من التاب";

            // الأول العربي (في آخر الملف) عشان أماكن الإنجليزي متتغيرش
            int arClose = s.LastIndexOf('}', end - 1);
            s = InsertBeforeClose(s, arClose, GenResAr(nl), nl);

            int enClose = s.LastIndexOf('}', arMatch.Index);
            s = InsertBeforeClose(s, enClose, GenResEn(nl), nl);

            File.WriteAllText(path, s, Utf8NoBom);
            return "✔️ Resources.ts";
        }

        void RunPermissionsSql()
        {
            if (!chkPermissions.Checked || rtSql.Text.Trim() == "") { MessageBox.Show("اضغط (توليد الكود) الأول"); return; }
            if (MessageBox.Show("هيتم إضافة الشاشة " + Module + " في Sys_Modules و Sys_RoleModule على قاعدة البيانات " + txtDatabase.Text + "\nتكمل؟",
                    "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;

            try
            {
                // تقسيم السكريبت عند GO
                var batches = Regex.Split(rtSql.Text, @"^[ \t]*GO[ \t]*\r?$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var messages = new StringBuilder();
                using (var con = new SqlConnection(ConnString()))
                {
                    con.InfoMessage += (s, e) => messages.AppendLine(e.Message);
                    con.Open();
                    foreach (var b in batches)
                    {
                        if (b.Trim() == "") continue;
                        using (var cmd = new SqlCommand(b, con)) cmd.ExecuteNonQuery();
                    }
                }
                SetStatus("تم تنفيذ الصلاحيات ✔️");
                MessageBox.Show(messages + "\nاخرج وادخل تاني على النظام عشان الشاشة تظهر في القائمة.", "تم");
            }
            catch (Exception ex)
            {
                SetStatus("فشل تنفيذ الصلاحيات", true);
                MessageBox.Show("❌ " + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        // #endregion

        // =====================================================================
        // #region القوالب (Templates)
        // =====================================================================

        const string TPL_TS = @"""use client"";

// =====================================================================================
//  📄 __MODULE__.ts   ←  ملف المنطق (البيزنس) — شاشة __TITLE_AR__
//  اتعمل أوتوماتيك من برنامج CreatePageReact
// -------------------------------------------------------------------------------------
//  الجدول : __TABLE__
//  الحفظ  : __SAVE_DESC__
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from ""react"";
import { useSys } from ""../Shared/SystemUsing"";
import { DynamicGridColumn } from ""../Shared/Components/Import/ModelGrid"";
import { FilterFieldConfig, ActiveFilter } from ""../Shared/Components/Import/AdvancedFilter"";

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

  const Condition = __CONDITION__;

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
__COLUMNS__
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
__FILTERS__
    ],
    [IsLangEN]
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
          orderBy={p.grid.KeyColumn}
          orderType=""DESC""
          pageSize={p.grid.PageSize}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
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
         EXECUTE, [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
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
