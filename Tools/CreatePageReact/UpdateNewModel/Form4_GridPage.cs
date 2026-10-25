// =====================================================================================
//  Form4_GridPage.cs  —  مولّد شاشات الجداول (DynamicGrid) للفريم ورك React_Fram
// -------------------------------------------------------------------------------------
//  ⓪ شاشة جديدة أو فتح شاشة موجودة من ClientApp وتعديلها
//  ① الاتصال بقاعدة البيانات واختيار الجدول (الحقول بتتحمل بإعدادات مقترحة)
//  ② بيانات الشاشة  ③ العرض والحفظ  ④ القائمة والصلاحيات  ⑤ المسارات
//  تاب الحقول: إعدادات كل حقل (جدول / فورم / إجباري / بحث / فلتر / نوع الإدخال
//              / اختيارات / نافذة بحث G_SearchFrom / قيمة تلقائية / قيمة افتراضية)
//  تاب المعاينة: توليد → حفظ الملفات → تنفيذ الصلاحيات
//
//  كل شاشة البرنامج بيعملها بيتحفظ جواها سطر إعدادات (@CreatePageReact-Settings)
//  عشان البرنامج يقدر يفتحها تاني ويعدّلها بالظبط.
//
//  مكتوب بـ C# 7.3 عشان يشتغل على .NET Framework 4.6.1
// =====================================================================================

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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
    // =====================================================================
    // #region الإعدادات اللي بتتحفظ جوه الشاشة
    // =====================================================================
    public class GridScreenSettings
    {
        public int Version = 2;
        public string Module = "";
        public string Table = "";
        public string KeyColumn = "";
        public string TitleAr = "";
        public string TitleEn = "";
        public string SubAr = "";
        public string SubEn = "";
        public string Icon = "fa-table-list";
        public int PageSize = 10;

        public bool ProcessTrans;
        public string TrType = "";
        public bool FilterComp = true;
        public bool FilterBranch;
        public string ExtraCondition = "";
        public string OrderBy = "";
        public string OrderType = "DESC";
        public bool Insert = true;
        public bool Edit = true;
        public bool Delete = true;
        public bool Export = true;

        public bool Permissions = true;
        public string ParentMenu = "";
        public string IconColor = "indigo";
        public string Roles = "";

        public List<GridFieldSettings> Fields = new List<GridFieldSettings>();
    }

    public class GridFieldSettings
    {
        public string Field = "";
        public string TitleAr = "";
        public string TitleEn = "";
        public bool InGrid = true;
        public bool InForm = true;
        public bool Required;
        public bool Search;
        public bool InFilter = true;
        public string InputType = "text";
        public string Options = "";        // 0=قبض=Receipt;1=صرف=Payment
        public string SearchFn = "";       // Search_Users
        public string SearchCond = "";     // USER_Status = 1
        public string Auto = "";           // CompCode / BranchCode / UserID / FinYear
        public string DefaultValue = "";
        public int Width = 150;
        public int Order = 99;
    }
    // #endregion

    public class Form4_GridPage : Form
    {
        // =====================================================================
        // #region الكنترولز
        // =====================================================================
        ComboBox cmbScreens;
        Label lblMode;

        TextBox txtServer, txtUser, txtPass, txtDatabase;
        ComboBox cmbTable;
        Label lblKey;

        TextBox txtModuleCode, txtTitleAr, txtTitleEn, txtSubAr, txtSubEn, txtIcon;
        NumericUpDown numPageSize;

        CheckBox chkProcessTrans, chkFilterComp, chkFilterBranch;
        TextBox txtTrType, txtExtraCondition;
        ComboBox cmbOrderBy, cmbOrderType;
        CheckBox chkInsert, chkEdit, chkDelete, chkExport;

        CheckBox chkPermissions;
        TextBox txtParentMenu, txtIconColor, txtRoles;

        TextBox txtAppPath, txtDbPath;

        DataGridView grid;
        DataGridViewComboBoxColumn colSearchFn;

        TabControl tabsMain, tabsPreview;
        RichTextBox rtTs, rtTsx, rtResources, rtRoutes, rtSql;
        Label lblStatus;
        // #endregion

        string keyColumn = "";
        bool keyIsIdentity = false;
        string openedScreen = "";          // اسم الشاشة المفتوحة للتعديل ("" = شاشة جديدة)
        List<string> tablesCache = new List<string>();
        List<string> searchFunctions = new List<string>();

        static readonly string[] AutoValues = { "", "CompCode", "BranchCode", "UserID", "FinYear" };
        static readonly string[] InputTypes = { "text", "number", "textarea", "checkbox", "date", "select", "search" };
        const string SettingsMarker = "// @CreatePageReact-Settings:";

        // =====================================================================
        // #region بيانات الحقل
        // =====================================================================
        class ColMeta
        {
            public string Name;
            public string SqlType = "?";
            public int MaxLen;
            public bool IsNullable = true;
            public bool IsIdentity;
            public bool IsPK;
            public bool IsComputed;
            public bool NotInDb;            // حقل للعرض بس مش موجود في الجدول
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
            public GridFieldSettings S;
            public List<Opt> Options = new List<Opt>();
            public bool IsKey;
            public bool IsDecimal;
            public string Field { get { return S.Field; } }
        }
        // #endregion

        public Form4_GridPage()
        {
            BuildUI();
            LoadConfig();
            RefreshScreensList();
            RefreshSearchFunctions();
            SetMode("");
        }

        // =====================================================================
        // #region بناء الشاشة
        // =====================================================================
        void BuildUI()
        {
            Text = "مولّد شاشات الجداول (DynamicGrid) — React_Fram";
            Size = new Size(1450, 920);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 9.5f);
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;

            tabsMain = new TabControl { Dock = DockStyle.Fill, RightToLeftLayout = true };
            Controls.Add(tabsMain);

            // ================= التاب 1 =================
            var tab1 = new TabPage("1- الشاشة والجدول");
            tabsMain.TabPages.Add(tab1);
            var flow = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, Padding = new Padding(10) };
            tab1.Controls.Add(flow);

            // ⓪ فتح شاشة
            TableLayoutPanel t0;
            var g0 = NewGroup("⓪ شاشة جديدة أو تعديل شاشة موجودة في ClientApp", out t0);
            cmbScreens = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            AddPair(t0, NewLabel("الشاشات الموجودة:"), cmbScreens);
            var p0 = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
            var btnOpen = NewButton("فتح الشاشة للتعديل", Color.FromArgb(79, 70, 229));
            var btnNew = NewButton("شاشة جديدة", Color.FromArgb(107, 114, 128));
            var btnReloadScreens = NewButton("تحديث القائمة", Color.FromArgb(107, 114, 128));
            btnOpen.Click += (s, e) => OpenScreen();
            btnNew.Click += (s, e) => NewScreen();
            btnReloadScreens.Click += (s, e) => { RefreshScreensList(); RefreshSearchFunctions(); };
            p0.Controls.AddRange(new Control[] { btnOpen, btnNew, btnReloadScreens });
            AddPair(t0, new Label(), p0);
            lblMode = NewLabel("");
            lblMode.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
            AddPair(t0, new Label(), lblMode);
            Fit(g0, t0);
            flow.Controls.Add(g0);

            // ① الاتصال
            TableLayoutPanel t1;
            var g1 = NewGroup("① الاتصال بقاعدة البيانات واختيار الجدول", out t1);
            txtServer = AddText(t1, "السيرفر:", ".", true);
            txtDatabase = AddText(t1, "قاعدة البيانات:", "ESSA_React", true);
            txtUser = AddText(t1, "المستخدم:", "sa", true);
            txtPass = AddText(t1, "كلمة السر:", "", true);
            txtPass.UseSystemPasswordChar = true;
            var btnConnect = NewButton("اتصال وتحميل الجداول", Color.FromArgb(37, 99, 235));
            btnConnect.Click += (s, e) => LoadTables(true);
            AddPair(t1, new Label(), btnConnect);
            cmbTable = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDown, RightToLeft = RightToLeft.No, AutoCompleteMode = AutoCompleteMode.SuggestAppend, AutoCompleteSource = AutoCompleteSource.ListItems };
            AddPair(t1, NewLabel("الجدول:"), cmbTable);
            var btnCols = NewButton("تحميل الحقول", Color.FromArgb(79, 70, 229));
            btnCols.Click += (s, e) => LoadColumns();
            AddPair(t1, new Label(), btnCols);
            lblKey = NewLabel("المفتاح: —");
            lblKey.ForeColor = Color.DarkGreen;
            AddPair(t1, new Label(), lblKey);
            Fit(g1, t1);
            flow.Controls.Add(g1);

            // ② بيانات الشاشة
            TableLayoutPanel t2;
            var g2 = NewGroup("② بيانات الشاشة", out t2);
            txtModuleCode = AddText(t2, "كود الشاشة (MODULE_CODE):", "", true);
            txtIcon = AddText(t2, "الأيقونة (Font Awesome):", "fa-table-list", true);
            txtTitleAr = AddText(t2, "العنوان عربي:", "", false);
            txtTitleEn = AddText(t2, "العنوان إنجليزي:", "", true);
            txtSubAr = AddText(t2, "وصف صغير عربي:", "", false);
            txtSubEn = AddText(t2, "وصف صغير إنجليزي:", "", true);
            numPageSize = new NumericUpDown { Minimum = 5, Maximum = 200, Value = 10, Width = 80 };
            AddPair(t2, NewLabel("عدد الصفوف في الصفحة:"), numPageSize);
            AddPair(t2, new Label(), NewHint("كود الشاشة = اسم الفولدر = اسم الدالة، حروف إنجليزي وأرقام من غير مسافات (مثلاً FinancialType)"));
            Fit(g2, t2);
            flow.Controls.Add(g2);

            // ③ العرض والحفظ
            TableLayoutPanel t3;
            var g3 = NewGroup("③ العرض والحفظ", out t3);
            chkFilterComp = new CheckBox { Text = "بيانات الشركة الحالية بس (CompCode)", AutoSize = true, Checked = true };
            chkFilterBranch = new CheckBox { Text = "بيانات الفرع الحالي بس (BranchCode)", AutoSize = true };
            AddPair(t3, chkFilterComp, chkFilterBranch);
            txtExtraCondition = AddText(t3, "شرط إضافي على العرض:", "", true);
            AddPair(t3, new Label(), NewHint("بيتضاف بـ AND على الشرط، مثلاً:  TrType = 1   أو   IsActive = 1 AND Amount > 0"));
            cmbOrderBy = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            cmbOrderType = new ComboBox { Width = 90, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            cmbOrderType.Items.AddRange(new object[] { "DESC", "ASC" });
            cmbOrderType.SelectedIndex = 0;
            AddPair(t3, NewLabel("الترتيب حسب:"), cmbOrderBy);
            AddPair(t3, NewLabel("اتجاه الترتيب:"), cmbOrderType);
            chkProcessTrans = new CheckBox { Text = "تشغيل G_ProcessTrans بعد الإضافة والتعديل والحذف", AutoSize = true };
            txtTrType = new TextBox { Dock = DockStyle.Fill, RightToLeft = RightToLeft.No, Enabled = false };
            chkProcessTrans.CheckedChanged += (s, e) => txtTrType.Enabled = chkProcessTrans.Checked;
            AddPair(t3, chkProcessTrans, new Label());
            AddPair(t3, NewLabel("@TrType:"), txtTrType);
            chkInsert = new CheckBox { Text = "إضافة", AutoSize = true, Checked = true };
            chkEdit = new CheckBox { Text = "تعديل", AutoSize = true, Checked = true };
            chkDelete = new CheckBox { Text = "حذف", AutoSize = true, Checked = true };
            chkExport = new CheckBox { Text = "تصدير", AutoSize = true, Checked = true };
            var pFlags = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
            pFlags.Controls.AddRange(new Control[] { chkInsert, chkEdit, chkDelete, chkExport });
            AddPair(t3, NewLabel("أزرار الجدول:"), pFlags);
            Fit(g3, t3);
            flow.Controls.Add(g3);

            // ④ الصلاحيات
            TableLayoutPanel t4;
            var g4 = NewGroup("④ القائمة والصلاحيات (Sys_Modules / Sys_RoleModule)", out t4);
            chkPermissions = new CheckBox { Text = "اعمل سكريبت الصلاحيات", AutoSize = true, Checked = true };
            AddPair(t4, chkPermissions, new Label());
            txtParentMenu = AddText(t4, "كود القائمة الأب:", "", true);
            txtIconColor = AddText(t4, "لون الأيقونة:", "indigo", true);
            txtRoles = AddText(t4, "أرقام الأدوار:", "", true);
            AddPair(t4, new Label(), NewHint("القائمة الأب فاضية = أول القائمة.  الأدوار فاضية = كل دور عليه مستخدمين فعالين، أو اكتب مثلاً 1,2"));
            Fit(g4, t4);
            flow.Controls.Add(g4);

            // ⑤ المسارات
            TableLayoutPanel t5;
            var g5 = NewGroup("⑤ المسارات", out t5);
            txtAppPath = AddText(t5, "فولدر الواجهة (Frontend\\App):", "", true);
            txtDbPath = AddText(t5, "فولدر سكريبتات قاعدة البيانات:", "", true);
            Fit(g5, t5);
            flow.Controls.Add(g5);

            // ================= التاب 2: الحقول =================
            var tab2 = new TabPage("2- الحقول");
            tabsMain.TabPages.Add(tab2);
            var pTop = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 46, Padding = new Padding(4) };
            var btnNewSearch = NewButton("➕ نافذة بحث جديدة (G_SearchFrom)", Color.FromArgb(5, 150, 105));
            btnNewSearch.Click += (s, e) => OpenSearchBuilder();
            var btnUp = NewButton("▲ لفوق", Color.FromArgb(107, 114, 128));
            var btnDown = NewButton("▼ لتحت", Color.FromArgb(107, 114, 128));
            btnUp.Click += (s, e) => MoveRow(-1);
            btnDown.Click += (s, e) => MoveRow(1);
            pTop.Controls.AddRange(new Control[] { btnNewSearch, btnUp, btnDown });
            var hint = new Label
            {
                Dock = DockStyle.Top,
                Height = 66,
                Padding = new Padding(8),
                BackColor = Color.FromArgb(239, 246, 255),
                Text = "• select: اكتب الاختيارات بالشكل ده  0=قبض=Receipt;1=صرف=Payment   (القيمة=عربي=إنجليزي)\n" +
                       "• search: اختار دالة البحث من G_SearchFrom واكتب شرطها (مثلاً USER_Status = 1) — القيمة اللي بترجع هي returnField بتاع الدالة\n" +
                       "• قيمة تلقائية: بتتملى من الجلسة ومش بتظهر في الفورم.   • الحقل اللي مش في الفورم ولا تلقائي بيتعرض بس ومش بيتحفظ."
            };
            grid = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                RowHeadersWidth = 30,
                RightToLeft = RightToLeft.No,
                SelectionMode = DataGridViewSelectionMode.CellSelect
            };
            grid.DataError += (s, e) => { e.ThrowException = false; };
            grid.CurrentCellDirtyStateChanged += (s, e) =>
            {
                if (grid.IsCurrentCellDirty) grid.CommitEdit(DataGridViewDataErrorContexts.Commit);
            };
            grid.CellValueChanged += (s, e) => { if (e.RowIndex >= 0) StyleRow(grid.Rows[e.RowIndex]); };
            BuildGridColumns();
            tab2.Controls.Add(grid);
            tab2.Controls.Add(hint);
            tab2.Controls.Add(pTop);

            // ================= التاب 3: المعاينة والحفظ =================
            var tab3 = new TabPage("3- المعاينة والحفظ");
            tabsMain.TabPages.Add(tab3);
            var pButtons = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 52, Padding = new Padding(6) };
            var btnGen = NewButton("① توليد الكود", Color.FromArgb(37, 99, 235));
            var btnSave = NewButton("② حفظ الملفات", Color.FromArgb(5, 150, 105));
            var btnRunSql = NewButton("③ تنفيذ الصلاحيات على قاعدة البيانات", Color.FromArgb(217, 119, 6));
            btnGen.Click += (s, e) => Generate();
            btnSave.Click += (s, e) => SaveFiles();
            btnRunSql.Click += (s, e) => RunPermissionsSql();
            lblStatus = new Label { AutoSize = true, Padding = new Padding(10, 10, 10, 0) };
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
            grid.Columns.Add(TextCol("SqlType", "النوع في SQL", 105, true));
            grid.Columns.Add(TextCol("TitleAr", "العنوان عربي", 140, false));
            grid.Columns.Add(TextCol("TitleEn", "العنوان إنجليزي", 140, false));
            grid.Columns.Add(CheckCol("InGrid", "في الجدول"));
            grid.Columns.Add(CheckCol("InForm", "في الفورم"));
            grid.Columns.Add(CheckCol("Required", "إجباري"));
            grid.Columns.Add(CheckCol("Search", "بحث سريع"));
            grid.Columns.Add(CheckCol("InFilter", "فلتر"));
            grid.Columns.Add(ComboCol("InputType", "نوع الإدخال", InputTypes, 90));
            grid.Columns.Add(TextCol("Options", "الاختيارات (select)", 190, false));
            colSearchFn = ComboCol("SearchFn", "دالة البحث (search)", new string[] { "" }, 140);
            grid.Columns.Add(colSearchFn);
            grid.Columns.Add(TextCol("SearchCond", "شرط البحث", 150, false));
            grid.Columns.Add(ComboCol("Auto", "قيمة تلقائية", AutoValues, 95));
            grid.Columns.Add(TextCol("DefaultValue", "قيمة افتراضية", 90, false));
            grid.Columns.Add(TextCol("Width", "العرض", 55, false));
            grid.Columns.Add(TextCol("Order", "الترتيب", 55, false));
        }
        // #endregion

        // =====================================================================
        // #region أدوات بناء الشاشة
        // =====================================================================
        GroupBox NewGroup(string title, out TableLayoutPanel table)
        {
            var g = new GroupBox { Text = title, Width = 1340, Padding = new Padding(10), Font = new Font("Segoe UI", 10f, FontStyle.Bold) };
            table = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 4, AutoSize = true, Font = new Font("Segoe UI", 9.5f) };
            table.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            g.Controls.Add(table);
            return g;
        }

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
            return new Button { Text = text, AutoSize = true, BackColor = color, ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Padding = new Padding(8, 4, 8, 4), Margin = new Padding(4), Cursor = Cursors.Hand };
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
            return new DataGridViewTextBoxColumn { Name = name, HeaderText = header, Width = width, ReadOnly = readOnly, SortMode = DataGridViewColumnSortMode.NotSortable };
        }

        DataGridViewCheckBoxColumn CheckCol(string name, string header)
        {
            return new DataGridViewCheckBoxColumn { Name = name, HeaderText = header, Width = 62 };
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

        void SetMode(string screen)
        {
            openedScreen = screen;
            if (screen == "")
            {
                lblMode.Text = "🆕 شاشة جديدة";
                lblMode.ForeColor = Color.DarkGreen;
                Text = "مولّد شاشات الجداول (DynamicGrid) — شاشة جديدة";
            }
            else
            {
                lblMode.Text = "✏️ بتعدّل الشاشة: " + screen;
                lblMode.ForeColor = Color.DarkOrange;
                Text = "مولّد شاشات الجداول (DynamicGrid) — تعديل " + screen;
            }
        }
        // #endregion

        // =====================================================================
        // #region الإعدادات العامة والمسارات
        // =====================================================================
        string ClientAppPath { get { return Path.Combine(txtAppPath.Text.Trim(), "app", "ClientApp"); } }
        string SearchFilePath { get { return Path.Combine(ClientAppPath, "Shared", "G_SearchFrom.ts"); } }
        string Module { get { return txtModuleCode.Text.Trim(); } }

        void LoadConfig()
        {
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

        // الشاشات اللي في ClientApp وفيها جدول (TableName)
        void RefreshScreensList()
        {
            cmbScreens.Items.Clear();
            try
            {
                if (!Directory.Exists(ClientAppPath)) return;
                foreach (var dir in Directory.GetDirectories(ClientAppPath).OrderBy(x => x))
                {
                    string name = Path.GetFileName(dir);
                    string ts = Path.Combine(dir, name + ".ts");
                    if (!File.Exists(ts)) continue;
                    string text = File.ReadAllText(ts);
                    if (!Regex.IsMatch(text, @"const\s+TableName\s*=")) continue;
                    cmbScreens.Items.Add(name + (text.Contains(SettingsMarker) ? "" : "   (قديمة)"));
                }
            }
            catch { }
            if (cmbScreens.Items.Count > 0) cmbScreens.SelectedIndex = 0;
        }

        // أسماء دوال البحث اللي في G_SearchFrom.ts
        void RefreshSearchFunctions()
        {
            searchFunctions.Clear();
            try
            {
                if (File.Exists(SearchFilePath))
                    foreach (Match m in Regex.Matches(File.ReadAllText(SearchFilePath), @"export\s+const\s+(\w+)\s*=\s*\("))
                        searchFunctions.Add(m.Groups[1].Value);
            }
            catch { }
            colSearchFn.Items.Clear();
            colSearchFn.Items.Add("");
            foreach (var f in searchFunctions) colSearchFn.Items.Add(f);
            // أي قيمة موجودة في الجدول ومش في القائمة نضيفها عشان متختفيش
            foreach (DataGridViewRow r in grid.Rows)
            {
                string v = Str(r, "SearchFn");
                if (v != "" && !colSearchFn.Items.Contains(v)) colSearchFn.Items.Add(v);
            }
        }
        // #endregion

        // =====================================================================
        // #region قاعدة البيانات
        // =====================================================================
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

        bool LoadTables(bool showMessage)
        {
            try
            {
                string keep = cmbTable.Text;
                cmbTable.Items.Clear();
                tablesCache.Clear();
                using (var con = new SqlConnection(ConnString()))
                using (var cmd = new SqlCommand("SELECT name FROM sys.tables ORDER BY name", con))
                {
                    con.Open();
                    using (var r = cmd.ExecuteReader())
                        while (r.Read()) tablesCache.Add(r.GetString(0));
                }
                cmbTable.Items.AddRange(tablesCache.Cast<object>().ToArray());
                cmbTable.Text = keep;
                if (showMessage)
                {
                    MessageBox.Show("تم تحميل " + tablesCache.Count + " جدول ✔️");
                    cmbTable.DroppedDown = true;
                }
                return true;
            }
            catch (Exception ex)
            {
                if (showMessage) MessageBox.Show("مقدرتش أتصل بقاعدة البيانات:\n" + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
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
                    while (r.Read())
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
            return list;
        }

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
        // #region الإعدادات المقترحة للحقول
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

        static bool IsNumberType(string t) { return t == "int" || t == "bigint" || t == "smallint" || t == "tinyint" || IsDecimalType(t); }
        static bool IsDecimalType(string t) { return t == "decimal" || t == "numeric" || t == "money" || t == "smallmoney" || t == "float" || t == "real"; }
        static bool IsDateType(string t) { return t == "date" || t == "datetime" || t == "smalldatetime" || t == "datetime2" || t == "datetimeoffset"; }
        static bool IsTextType(string t) { return t == "nvarchar" || t == "varchar" || t == "nchar" || t == "char" || t == "text" || t == "ntext"; }

        static string SplitWords(string name)
        {
            return Regex.Replace(name.Replace("_", " "), "([a-z])([A-Z])", "$1 $2").Trim();
        }

        static string AutoOf(string field)
        {
            foreach (var a in AutoValues)
                if (a != "" && field.Equals(a, StringComparison.OrdinalIgnoreCase)) return a;
            return "";
        }

        GridFieldSettings DefaultField(ColMeta c, Dictionary<string, string[]> res, int order)
        {
            bool isKey = c.Name == keyColumn;
            string auto = AutoOf(c.Name);

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
            else if (KnownTitles.TryGetValue(c.Name, out found)) { ar = found[0]; en = found[1]; }
            else if (isKey) { ar = "الرقم"; en = "ID"; }
            else { en = SplitWords(c.Name); ar = en; }

            bool inForm = !isKey && auto == "" && !c.IsComputed && !c.IsIdentity;
            if (isKey && !keyIsIdentity) inForm = true;

            return new GridFieldSettings
            {
                Field = c.Name,
                TitleAr = ar,
                TitleEn = en,
                InGrid = auto == "",
                InForm = inForm,
                Required = (inForm && !c.IsNullable) || (isKey && !keyIsIdentity),
                Search = isKey || (IsTextType(c.SqlType) && auto == ""),
                InFilter = auto == "" && !c.IsComputed,
                InputType = input,
                Auto = auto,
                Width = isKey ? 90 : (input == "checkbox" ? 100 : (input == "number" ? 120 : 220)),
                Order = order
            };
        }

        void SetKey(List<ColMeta> cols, string preferred)
        {
            ColMeta key = null;
            if (!string.IsNullOrEmpty(preferred)) key = cols.FirstOrDefault(c => c.Name.Equals(preferred, StringComparison.OrdinalIgnoreCase));
            if (key == null) key = cols.FirstOrDefault(c => c.IsIdentity) ?? cols.FirstOrDefault(c => c.IsPK) ?? cols.FirstOrDefault();
            keyColumn = key == null ? "" : key.Name;
            keyIsIdentity = key != null && key.IsIdentity;
            lblKey.Text = "المفتاح: " + keyColumn + (keyIsIdentity ? "  (ترقيم تلقائي)" : "  (بيتكتب يدوي)");
        }
        // #endregion

        // =====================================================================
        // #region تعبئة جدول الحقول
        // =====================================================================
        void AddGridRow(ColMeta meta, GridFieldSettings f)
        {
            if (f.SearchFn != "" && !colSearchFn.Items.Contains(f.SearchFn)) colSearchFn.Items.Add(f.SearchFn);

            int i = grid.Rows.Add();
            var row = grid.Rows[i];
            row.Tag = meta;
            row.Cells["Field"].Value = meta.Name;
            row.Cells["SqlType"].Value = meta.NotInDb ? "— مش في الجدول" :
                meta.SqlType + (IsTextType(meta.SqlType) ? "(" + (meta.MaxLen == -1 ? "max" : meta.MaxLen.ToString()) + ")" : "");
            row.Cells["TitleAr"].Value = f.TitleAr;
            row.Cells["TitleEn"].Value = f.TitleEn;
            row.Cells["InGrid"].Value = f.InGrid;
            row.Cells["InForm"].Value = f.InForm;
            row.Cells["Required"].Value = f.Required;
            row.Cells["Search"].Value = f.Search;
            row.Cells["InFilter"].Value = f.InFilter;
            row.Cells["InputType"].Value = InputTypes.Contains(f.InputType) ? f.InputType : "text";
            row.Cells["Options"].Value = f.Options;
            row.Cells["SearchFn"].Value = f.SearchFn;
            row.Cells["SearchCond"].Value = f.SearchCond;
            row.Cells["Auto"].Value = AutoValues.Contains(f.Auto) ? f.Auto : "";
            row.Cells["DefaultValue"].Value = f.DefaultValue;
            row.Cells["Width"].Value = f.Width;
            row.Cells["Order"].Value = f.Order;
            StyleRow(row);
        }

        // ألوان الصف حسب نوعه
        void StyleRow(DataGridViewRow row)
        {
            var meta = row.Tag as ColMeta;
            if (meta == null) return;
            if (meta.Name == keyColumn) row.DefaultCellStyle.BackColor = Color.FromArgb(220, 252, 231);
            else if (meta.NotInDb) row.DefaultCellStyle.BackColor = Color.FromArgb(254, 243, 199);
            else if (Str(row, "Auto") != "") row.DefaultCellStyle.BackColor = Color.FromArgb(243, 244, 246);
            else row.DefaultCellStyle.BackColor = Color.White;
        }

        void FillOrderBy(IEnumerable<string> fields, string selected)
        {
            cmbOrderBy.Items.Clear();
            foreach (var f in fields) cmbOrderBy.Items.Add(f);
            if (!string.IsNullOrEmpty(selected) && cmbOrderBy.Items.Contains(selected)) cmbOrderBy.SelectedItem = selected;
            else if (cmbOrderBy.Items.Contains(keyColumn)) cmbOrderBy.SelectedItem = keyColumn;
            else if (cmbOrderBy.Items.Count > 0) cmbOrderBy.SelectedIndex = 0;
        }

        void MoveRow(int dir)
        {
            if (grid.CurrentCell == null) return;
            int i = grid.CurrentCell.RowIndex, j = i + dir;
            if (j < 0 || j >= grid.Rows.Count) return;
            var row = grid.Rows[i];
            int col = grid.CurrentCell.ColumnIndex;
            grid.Rows.RemoveAt(i);
            grid.Rows.Insert(j, row);
            for (int k = 0; k < grid.Rows.Count; k++) grid.Rows[k].Cells["Order"].Value = k + 1;
            grid.CurrentCell = grid.Rows[j].Cells[col];
        }

        // جدول جديد: الحقول بإعدادات مقترحة
        void LoadColumns()
        {
            string table = cmbTable.Text.Trim();
            if (table == "") { MessageBox.Show("اختار الجدول الأول"); return; }

            List<ColMeta> cols;
            try { cols = ReadColumns(table); }
            catch (Exception ex) { MessageBox.Show("خطأ في قراءة الحقول:\n" + ex.Message); return; }
            if (cols.Count == 0) { MessageBox.Show("الجدول مش موجود أو مفيهوش حقول"); return; }

            if (grid.Rows.Count > 0 &&
                MessageBox.Show("إعدادات الحقول الحالية هتتمسح وتتحمل من جديد. تكمل؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            var res = ReadResources();
            SetKey(cols, null);

            if (Module == "")
            {
                string m = Regex.Replace(table, @"^([A-Za-z]{1,3}_)+", "");
                m = Regex.Replace(m, @"[^A-Za-z0-9_]", "");
                if (m == "" || char.IsDigit(m[0])) m = "Page_" + m;
                txtModuleCode.Text = m;
            }
            if (txtTitleEn.Text.Trim() == "") txtTitleEn.Text = SplitWords(Module);
            if (txtTitleAr.Text.Trim() == "") txtTitleAr.Text = txtTitleEn.Text;

            grid.Rows.Clear();
            int order = 1;
            foreach (var c in cols)
            {
                if (c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase)) continue;
                AddGridRow(c, DefaultField(c, res, order++));
            }
            FillOrderBy(cols.Select(c => c.Name), keyColumn);

            tabsMain.SelectedIndex = 1;
            MessageBox.Show("تم تحميل " + grid.Rows.Count + " حقل ✔️\nراجع الإعدادات في تاب (الحقول)");
        }
        // #endregion

        // =====================================================================
        // #region شاشة جديدة / فتح شاشة موجودة
        // =====================================================================
        void NewScreen()
        {
            if (grid.Rows.Count > 0 &&
                MessageBox.Show("كل الإعدادات الحالية هتتمسح. تكمل؟", "شاشة جديدة", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;
            ApplySettingsToForm(new GridScreenSettings());
            grid.Rows.Clear();
            cmbOrderBy.Items.Clear();
            keyColumn = "";
            keyIsIdentity = false;
            lblKey.Text = "المفتاح: —";
            ClearPreview();
            SetMode("");
        }

        void ClearPreview()
        {
            rtTs.Clear(); rtTsx.Clear(); rtResources.Clear(); rtRoutes.Clear(); rtSql.Clear();
            SetStatus("");
        }

        void OpenScreen()
        {
            if (cmbScreens.SelectedItem == null) { MessageBox.Show("مفيش شاشات في ClientApp — اتأكد من مسار الواجهة"); return; }
            string name = cmbScreens.SelectedItem.ToString().Split(' ')[0].Trim();
            string dir = Path.Combine(ClientAppPath, name);

            GridScreenSettings st;
            string note;
            try
            {
                string ts = File.ReadAllText(Path.Combine(dir, name + ".ts"));
                string tsx = File.Exists(Path.Combine(dir, "page.tsx")) ? File.ReadAllText(Path.Combine(dir, "page.tsx")) : "";
                st = ReadSettingsBlock(ts);
                if (st != null)
                {
                    note = "اتقرت الإعدادات كاملة ✔️";
                }
                else
                {
                    st = ParseLegacyScreen(name, ts, tsx);
                    note = "⚠️ الشاشة دي معمولة يدوي، فالإعدادات اتقرت من الكود على قد ما ينفع.\nراجعها كويس قبل الحفظ. بعد أول حفظ هتتقرا كاملة.";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("مقدرتش أقرا الشاشة:\n" + ex.Message, "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            ApplySettingsToForm(st);
            ClearPreview();

            // الحقول: ندمج إعدادات الشاشة مع حقول الجدول من قاعدة البيانات
            List<ColMeta> cols = null;
            string dbNote = "";
            try { cols = ReadColumns(st.Table); }
            catch (Exception ex) { dbNote = "\n\n⚠️ مقدرتش أقرا الجدول من قاعدة البيانات (" + ex.Message + ")\nالحقول اتعرضت من إعدادات الشاشة بس."; }
            if (cols != null && cols.Count == 0) { dbNote = "\n\n⚠️ الجدول " + st.Table + " مش موجود في قاعدة البيانات"; cols = null; }

            grid.Rows.Clear();
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (cols != null)
            {
                SetKey(cols, st.KeyColumn);
                var res = ReadResources();
                int maxOrder = st.Fields.Count == 0 ? 0 : st.Fields.Max(f => f.Order);
                var newFields = new List<string>();

                // الحقول اللي في الشاشة بترتيبها
                foreach (var f in st.Fields.OrderBy(x => x.Order))
                {
                    var meta = cols.FirstOrDefault(c => c.Name.Equals(f.Field, StringComparison.OrdinalIgnoreCase))
                               ?? new ColMeta { Name = f.Field, NotInDb = true };
                    AddGridRow(meta, f);
                    used.Add(f.Field);
                }
                // حقول جديدة في الجدول مش موجودة في الشاشة: بتتضاف مقفولة
                foreach (var c in cols)
                {
                    if (used.Contains(c.Name) || c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase)) continue;
                    var f = DefaultField(c, res, ++maxOrder);
                    f.InGrid = false; f.InForm = false; f.InFilter = false; f.Search = false; f.Required = false;
                    AddGridRow(c, f);
                    newFields.Add(c.Name);
                }
                if (newFields.Count > 0) dbNote += "\n\nℹ️ حقول جديدة في الجدول اتضافت مقفولة (فعّلها لو محتاجها):\n" + string.Join(", ", newFields);
                FillOrderBy(cols.Select(c => c.Name), st.OrderBy);
            }
            else
            {
                keyColumn = st.KeyColumn;
                keyIsIdentity = true;
                lblKey.Text = "المفتاح: " + keyColumn + "  (من إعدادات الشاشة)";
                foreach (var f in st.Fields.OrderBy(x => x.Order))
                    AddGridRow(new ColMeta { Name = f.Field }, f);
                FillOrderBy(st.Fields.Select(f => f.Field), st.OrderBy);
            }

            SetMode(name);
            tabsMain.SelectedIndex = 1;
            MessageBox.Show(note + dbNote, "فتح الشاشة " + name);
        }

        void ApplySettingsToForm(GridScreenSettings st)
        {
            txtModuleCode.Text = st.Module;
            cmbTable.Text = st.Table;
            txtTitleAr.Text = st.TitleAr;
            txtTitleEn.Text = st.TitleEn;
            txtSubAr.Text = st.SubAr;
            txtSubEn.Text = st.SubEn;
            txtIcon.Text = st.Icon;
            numPageSize.Value = Math.Max(numPageSize.Minimum, Math.Min(numPageSize.Maximum, st.PageSize));
            chkProcessTrans.Checked = st.ProcessTrans;
            txtTrType.Text = st.TrType;
            chkFilterComp.Checked = st.FilterComp;
            chkFilterBranch.Checked = st.FilterBranch;
            txtExtraCondition.Text = st.ExtraCondition;
            cmbOrderType.SelectedItem = st.OrderType == "ASC" ? "ASC" : "DESC";
            chkInsert.Checked = st.Insert;
            chkEdit.Checked = st.Edit;
            chkDelete.Checked = st.Delete;
            chkExport.Checked = st.Export;
            chkPermissions.Checked = st.Permissions;
            txtParentMenu.Text = st.ParentMenu;
            txtIconColor.Text = st.IconColor;
            txtRoles.Text = st.Roles;
        }

        GridScreenSettings CollectSettings(List<RowInfo> rows)
        {
            return new GridScreenSettings
            {
                Module = Module,
                Table = cmbTable.Text.Trim(),
                KeyColumn = keyColumn,
                TitleAr = txtTitleAr.Text.Trim(),
                TitleEn = txtTitleEn.Text.Trim(),
                SubAr = txtSubAr.Text.Trim(),
                SubEn = txtSubEn.Text.Trim(),
                Icon = txtIcon.Text.Trim(),
                PageSize = (int)numPageSize.Value,
                ProcessTrans = chkProcessTrans.Checked,
                TrType = txtTrType.Text.Trim(),
                FilterComp = chkFilterComp.Checked,
                FilterBranch = chkFilterBranch.Checked,
                ExtraCondition = CleanCondition(txtExtraCondition.Text),
                OrderBy = OrderByField(),
                OrderType = Convert.ToString(cmbOrderType.SelectedItem) == "ASC" ? "ASC" : "DESC",
                Insert = chkInsert.Checked,
                Edit = chkEdit.Checked,
                Delete = chkDelete.Checked,
                Export = chkExport.Checked,
                Permissions = chkPermissions.Checked,
                ParentMenu = txtParentMenu.Text.Trim(),
                IconColor = txtIconColor.Text.Trim(),
                Roles = txtRoles.Text.Trim(),
                Fields = rows.Select(r => r.S).ToList()
            };
        }

        string OrderByField()
        {
            string v = Convert.ToString(cmbOrderBy.SelectedItem ?? "");
            return v == "" ? keyColumn : v;
        }

        GridScreenSettings ReadSettingsBlock(string ts)
        {
            int i = ts.LastIndexOf(SettingsMarker, StringComparison.Ordinal);
            if (i < 0) return null;
            string line = ts.Substring(i + SettingsMarker.Length);
            int nl = line.IndexOf('\n');
            if (nl >= 0) line = line.Substring(0, nl);
            try { return JsonConvert.DeserializeObject<GridScreenSettings>(line.Trim()); }
            catch { return null; }
        }
        // #endregion

        // =====================================================================
        // #region قراءة الشاشات القديمة (المعمولة يدوي) من الكود
        // =====================================================================
        static string M1(string input, string pattern)
        {
            var m = Regex.Match(input, pattern, RegexOptions.Singleline);
            return m.Success ? m.Groups[1].Value : "";
        }

        // بينضّف الشرط: بيشيل AND / OR الزيادة في الأول والآخر، والقوس اللي حوالين الشرط كله
        static string CleanCondition(string c)
        {
            c = (c ?? "").Trim();
            string old;
            do
            {
                old = c;
                c = Regex.Replace(c, @"^(?:AND|OR)\b", "", RegexOptions.IgnoreCase).Trim();
                c = Regex.Replace(c, @"\b(?:AND|OR)$", "", RegexOptions.IgnoreCase).Trim();
                if (c.StartsWith("(") && c.EndsWith(")") && c.IndexOf('(', 1) < 0) c = c.Substring(1, c.Length - 2).Trim();
            } while (c != old);
            return c;
        }

        static string Unjs(string s)
        {
            return (s ?? "").Replace("\\\"", "\"").Replace("\\\\", "\\");
        }

        const string StrRx = @"""((?:[^""\\]|\\.)*)""";

        // قيمة زي TrTypes.Receipt → بندوّر على Receipt: 0 في الملف
        static string ResolveValue(string token, string ts)
        {
            token = token.Trim();
            if (token.StartsWith("\"") && token.EndsWith("\"") && token.Length >= 2) return Unjs(token.Substring(1, token.Length - 2));
            var m = Regex.Match(token, @"^\w+\.(\w+)$");
            if (m.Success)
            {
                string v = M1(ts, @"\b" + m.Groups[1].Value + @"\s*:\s*([^,\s}]+)");
                if (v != "") return v.Trim('"');
            }
            return token;
        }

        static string ParseOptions(string block, string ts)
        {
            var parts = new List<string>();
            foreach (Match m in Regex.Matches(block, @"\{\s*value:\s*([^,]+?)\s*,\s*label:\s*t\(\s*" + StrRx + @"\s*,\s*" + StrRx + @"\s*\)", RegexOptions.Singleline))
                parts.Add(ResolveValue(m.Groups[1].Value, ts) + "=" + Unjs(m.Groups[3].Value) + "=" + Unjs(m.Groups[2].Value));
            return string.Join(";", parts);
        }

        static string ReadResourceValue(string res, string key, bool arabic)
        {
            var arM = Regex.Match(res, @"^[ \t]*ar[ \t]*:[ \t]*\{", RegexOptions.Multiline);
            if (!arM.Success) return "";
            string part = arabic ? res.Substring(arM.Index) : res.Substring(0, arM.Index);
            return Unjs(M1(part, @"(?m)^[ \t]*" + Regex.Escape(key) + @"[ \t]*:[ \t]*" + StrRx));
        }

        GridScreenSettings ParseLegacyScreen(string name, string ts, string tsx)
        {
            var st = new GridScreenSettings();
            st.Module = name;
            st.Table = M1(ts, @"const\s+TableName\s*=\s*" + StrRx);
            st.KeyColumn = M1(ts, @"const\s+KeyColumn\s*=\s*" + StrRx);
            st.TrType = M1(ts, @"const\s+TrType\s*=\s*" + StrRx);
            st.ProcessTrans = M1(ts, @"const\s+RunProcessTrans\s*=\s*(true|false)") == "true";

            // الشرط
            string cond = M1(ts, @"const\s+Condition\s*=\s*`([^`]*)`");
            st.FilterComp = cond.Contains("CompCode = ${CompCode}");
            st.FilterBranch = cond.Contains("BranchCode = ${BranchCode}");
            st.ExtraCondition = CleanCondition(cond.Replace("CompCode = ${CompCode}", "").Replace("BranchCode = ${BranchCode}", ""));

            // من page.tsx: العناوين / الأيقونة / الصفحة / الأزرار
            string prefix = M1(tsx, @"L\.(\w+?)_title\b");
            string resPath = Path.Combine(ClientAppPath, "Shared", "Resources.ts");
            if (prefix != "" && File.Exists(resPath))
            {
                string res = File.ReadAllText(resPath);
                st.TitleEn = ReadResourceValue(res, prefix + "_title", false);
                st.TitleAr = ReadResourceValue(res, prefix + "_title", true);
                st.SubEn = ReadResourceValue(res, prefix + "_subtitle", false);
                st.SubAr = ReadResourceValue(res, prefix + "_subtitle", true);
            }
            if (st.TitleAr == "") st.TitleAr = name;
            if (st.TitleEn == "") st.TitleEn = name;
            string icon = M1(tsx, @"fa-solid\s+(fa-[\w-]+)");
            if (icon != "" && icon != "fa-rotate") st.Icon = icon;
            string ps = M1(tsx, @"pageSize=\{(\d+)\}");
            if (ps != "") st.PageSize = int.Parse(ps);
            st.Insert = M1(tsx, @"enableInsert=\{(\w+)\}") != "false";
            st.Edit = M1(tsx, @"enableUpdate=\{(\w+)\}") != "false";
            st.Delete = M1(tsx, @"enableDelete=\{(\w+)\}") != "false";
            st.Export = M1(tsx, @"enableExport=\{(\w+)\}") != "false";
            if (M1(tsx, @"orderType=""(\w+)""") == "ASC") st.OrderType = "ASC";
            st.OrderBy = st.KeyColumn;

            // الأعمدة والفلاتر
            int cStart = ts.IndexOf("const Columns", StringComparison.Ordinal);
            int fStart = ts.IndexOf("const FilterFields", StringComparison.Ordinal);
            string colsBlock = cStart < 0 ? "" : (fStart > cStart ? ts.Substring(cStart, fStart - cStart) : ts.Substring(cStart));
            string filterBlock = "";
            if (fStart >= 0)
            {
                int fEnd = ts.IndexOf("// #endregion", fStart, StringComparison.Ordinal);
                filterBlock = fEnd > fStart ? ts.Substring(fStart, fEnd - fStart) : ts.Substring(fStart);
            }

            var fieldMatches = Regex.Matches(colsBlock, @"field:\s*""(\w+)""");
            for (int i = 0; i < fieldMatches.Count; i++)
            {
                int a = fieldMatches[i].Index;
                int b = i + 1 < fieldMatches.Count ? fieldMatches[i + 1].Index : colsBlock.Length;
                string blk = colsBlock.Substring(a, b - a);
                string field = fieldMatches[i].Groups[1].Value;

                var f = new GridFieldSettings { Field = field, Order = i + 1 };
                var tm = Regex.Match(blk, @"title:\s*t\(\s*" + StrRx + @"\s*,\s*" + StrRx + @"\s*\)");
                if (tm.Success) { f.TitleEn = Unjs(tm.Groups[1].Value); f.TitleAr = Unjs(tm.Groups[2].Value); }
                else { f.TitleEn = Unjs(M1(blk, @"title:\s*" + StrRx)); f.TitleAr = f.TitleEn; }

                string inputType = M1(blk, @"inputType:\s*""(\w+)""");
                string type = M1(blk, @"\btype:\s*""(\w+)""");
                f.InputType = inputType != "" ? inputType : (type == "number" || type == "checkbox" || type == "date" || type == "select" ? type : "text");

                // الاختيارات (مباشرة أو في متغير)
                string so = M1(blk, @"selectOptions:\s*(\[.*?\])\s*,");
                if (so == "")
                {
                    string soVar = M1(blk, @"selectOptions:\s*(\w+)");
                    if (soVar != "") so = M1(ts, @"const\s+" + soVar + @"\s*=\s*useMemo\(\s*\(\)\s*=>\s*(\[.*?\])\s*,\s*\[");
                }
                if (so != "") f.Options = ParseOptions(so, ts);

                // نافذة البحث (مباشرة أو في متغير)
                var sm = Regex.Match(blk, @"searchModal:\s*(\w+)\(\s*(?:" + StrRx + @")?\s*\)");
                if (!sm.Success)
                {
                    string smVar = M1(blk, @"searchModal:\s*(\w+)");
                    if (smVar != "") sm = Regex.Match(ts, @"const\s+" + smVar + @"\s*=\s*useMemo\(\s*\(\)\s*=>\s*(\w+)\(\s*(?:" + StrRx + @")?\s*\)");
                }
                if (sm.Success) { f.SearchFn = sm.Groups[1].Value; f.SearchCond = Unjs(sm.Groups[2].Value); f.InputType = "search"; }

                bool notEditable = Regex.IsMatch(blk, @"editable:\s*false");
                bool notInsertable = Regex.IsMatch(blk, @"insertable:\s*false");
                f.InForm = !(notEditable && notInsertable);
                f.Required = Regex.IsMatch(blk, @"IsRequired:\s*true");
                f.InGrid = !Regex.IsMatch(blk, @"IsVisibleDisplayInGrid:\s*false");
                f.Search = !Regex.IsMatch(blk, @"IsSearchColumn:\s*false");
                f.InFilter = Regex.IsMatch(filterBlock, @"field:\s*""" + Regex.Escape(field) + @"""");
                string w = M1(blk, @"width:\s*(\d+)");
                if (w != "") f.Width = int.Parse(w);

                string dv = M1(blk, @"DefaultValue:\s*([^,\r\n]+)").Trim();
                if (dv != "" && AutoValues.Contains(dv)) { f.Auto = dv; f.InForm = false; }
                else if (dv != "") f.DefaultValue = ResolveValue(dv, ts);

                st.Fields.Add(f);
            }
            return st;
        }
        // #endregion

        // =====================================================================
        // #region قراءة إعدادات الحقول من الشاشة
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
                var s = new GridFieldSettings
                {
                    Field = meta.Name,
                    TitleAr = Str(r, "TitleAr"),
                    TitleEn = Str(r, "TitleEn"),
                    InGrid = Bool(r, "InGrid"),
                    InForm = Bool(r, "InForm"),
                    Required = Bool(r, "Required"),
                    Search = Bool(r, "Search"),
                    InFilter = Bool(r, "InFilter"),
                    InputType = Str(r, "InputType"),
                    Options = Str(r, "Options"),
                    SearchFn = Str(r, "SearchFn"),
                    SearchCond = Str(r, "SearchCond"),
                    Auto = Str(r, "Auto"),
                    DefaultValue = Str(r, "DefaultValue"),
                    Width = Int(r, "Width", 150),
                    Order = Int(r, "Order", 99)
                };
                if (s.InputType == "") s.InputType = "text";
                if (s.TitleAr == "") s.TitleAr = s.Field;
                if (s.TitleEn == "") s.TitleEn = s.Field;
                if (s.Auto != "") s.InForm = false;

                var info = new RowInfo { Meta = meta, S = s, IsKey = meta.Name == keyColumn, IsDecimal = IsDecimalType(meta.SqlType) };
                foreach (var part in s.Options.Split(new[] { ';', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var p = part.Split('=');
                    if (p.Length < 2 || p[0].Trim() == "") continue;
                    info.Options.Add(new Opt { Value = p[0].Trim(), Ar = p[1].Trim(), En = p.Length > 2 && p[2].Trim() != "" ? p[2].Trim() : p[1].Trim() });
                }
                list.Add(info);
            }
            return list.OrderBy(x => x.S.Order).ToList();
        }

        string Validate(List<RowInfo> rows)
        {
            if (rows.Count == 0) return "حمّل الحقول الأول (تاب 1 ← تحميل الحقول) أو افتح شاشة موجودة";
            if (!Regex.IsMatch(Module, @"^[A-Za-z][A-Za-z0-9_]*$")) return "كود الشاشة لازم حروف إنجليزي وأرقام بس ويبدأ بحرف";
            if (cmbTable.Text.Trim() == "") return "اختار الجدول";
            if (keyColumn == "") return "مفيش مفتاح للجدول";
            if (txtTitleAr.Text.Trim() == "" || txtTitleEn.Text.Trim() == "") return "اكتب عنوان الشاشة عربي وإنجليزي";
            if (chkProcessTrans.Checked && txtTrType.Text.Trim() == "") return "اكتب @TrType أو اقفل G_ProcessTrans";
            if (txtExtraCondition.Text.Contains("`")) return "الشرط الإضافي مينفعش يكون فيه العلامة `";
            if (openedScreen == "" && Directory.Exists(Path.Combine(ClientAppPath, Module)) && !File.Exists(Path.Combine(ClientAppPath, Module, Module + ".ts")))
                return "فيه فولدر بنفس الاسم " + Module + " في ClientApp ومش شاشة جدول — اختار اسم تاني";
            foreach (var r in rows)
            {
                if (r.S.InputType == "select" && r.Options.Count == 0) return "الحقل " + r.Field + " نوعه select ومفيهوش اختيارات";
                if (r.S.InputType == "search" && r.S.SearchFn == "") return "الحقل " + r.Field + " نوعه search ومفيهوش دالة بحث";
                if (r.S.InputType == "search" && !Regex.IsMatch(r.S.SearchFn, @"^[A-Za-z_]\w*$")) return "اسم دالة البحث في الحقل " + r.Field + " غلط";
                if (r.S.InputType == "search" && searchFunctions.Count > 0 && !searchFunctions.Contains(r.S.SearchFn))
                    return "دالة البحث " + r.S.SearchFn + " مش موجودة في G_SearchFrom.ts — اعملها من زرار (نافذة بحث جديدة)";
            }
            return null;
        }
        // #endregion

        // =====================================================================
        // #region التوليد
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

        // القيمة الافتراضية اللي المستخدم كتبها حسب نوع الحقل
        static string DefaultLiteral(RowInfo r)
        {
            string v = r.S.DefaultValue;
            if (r.S.InputType == "checkbox")
            {
                string l = v.ToLower();
                return (l == "1" || l == "true" || l == "نعم") ? "true" : "false";
            }
            if (r.S.InputType == "number") return IsNumber(v) ? v : "0";
            return JsValue(v);
        }

        string GenColumns(List<RowInfo> rows)
        {
            var sb = new StringBuilder();
            int formOrder = 1;
            foreach (var r in rows)
            {
                var s = r.S;
                bool keyManual = r.IsKey && !keyIsIdentity;
                bool inForm = (s.InForm || keyManual) && !(r.IsKey && keyIsIdentity);
                bool isSave = !r.Meta.NotInDb && (r.IsKey || s.Auto != "" || inForm);
                string type = s.InputType;
                var lines = new List<string>();

                lines.Add("field: \"" + s.Field + "\",");
                lines.Add("title: " + T(s.TitleEn, s.TitleAr) + ",");
                if (type == "number" || type == "checkbox" || type == "date") lines.Add("type: \"" + type + "\",");
                if (type != "text" && type != "checkbox") lines.Add("inputType: \"" + type + "\",");
                if (type == "textarea") lines.Add("rows: 3,");
                if (type == "number" && r.IsDecimal) lines.Add("step: 0.01,");
                if (type == "select")
                    lines.Add("selectOptions: [" + string.Join(", ", r.Options.Select(o => "{ value: " + JsValue(o.Value) + ", label: " + T(o.En, o.Ar) + " }")) + "],");
                if (type == "search")
                {
                    lines.Add("searchModal: " + SearchCall(s) + ",");
                    lines.Add("placeholder: t(\"Press 🔍 to pick\", \"دوس 🔍 للاختيار\"),");
                }

                // القيمة الافتراضية
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
                        sb.AppendLine(head + "type: \"search\", searchModal: " + SearchCall(r.S) + ", " + tail);
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

        string GenImports(List<RowInfo> rows)
        {
            var fns = rows.Where(r => r.S.InputType == "search" && r.S.SearchFn != "")
                          .Select(r => r.S.SearchFn).Distinct().OrderBy(x => x).ToList();
            return fns.Count == 0 ? "" : "import { " + string.Join(", ", fns) + " } from \"../Shared/G_SearchFrom\";\r\n";
        }

        string GenTs(List<RowInfo> rows)
        {
            string saveDesc = chkProcessTrans.Checked ? "مع G_ProcessTrans  (@TrType = '" + txtTrType.Text.Trim() + "')" : "عادي من غير G_ProcessTrans";
            string settingsJson = JsonConvert.SerializeObject(CollectSettings(rows), Formatting.None);
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
                .Replace("__ORDER_BY__", Js(OrderByField()))
                .Replace("__ORDER_TYPE__", Convert.ToString(cmbOrderType.SelectedItem) == "ASC" ? "ASC" : "DESC")
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
            return TPL_TSX.Replace("__MODULE__", Module).Replace("__ICON__", icon).Replace("__TITLE_AR__", txtTitleAr.Text.Trim());
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

        void Generate()
        {
            var rows = ReadRows();
            string err = Validate(rows);
            if (err != null) { MessageBox.Show(err, "ناقص حاجة", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

            if (openedScreen != "" && openedScreen != Module &&
                MessageBox.Show("غيّرت كود الشاشة من " + openedScreen + " لـ " + Module + "\nده هيعمل شاشة جديدة والقديمة هتفضل زي ما هي. تكمل؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            rtTs.Text = GenTs(rows);
            rtTsx.Text = GenTsx();
            rtResources.Text = "// en:\r\n" + GenResBlock(false, "\r\n", null) + "\r\n\r\n// ar:\r\n" + GenResBlock(true, "\r\n", null);
            rtRoutes.Text = GenRoutesLine();
            rtSql.Text = chkPermissions.Checked ? GenSql() : "-- سكريبت الصلاحيات مقفول";
            tabsPreview.TabPages[0].Text = Module + ".ts";
            tabsMain.SelectedIndex = 2;

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
            if (!Directory.Exists(ClientAppPath)) { MessageBox.Show("مسار الواجهة غلط، لازم يكون فيه app\\ClientApp:\n" + app); return; }

            string pageDir = Path.Combine(ClientAppPath, Module);
            bool exists = File.Exists(Path.Combine(pageDir, Module + ".ts"));
            if (exists)
            {
                string msg = openedScreen == Module
                    ? "هيتم حفظ التعديلات فوق الشاشة " + Module + "\n(هتتعمل نسخة احتياطية من الملفات القديمة)"
                    : "الشاشة " + Module + " موجودة قبل كده! أكتب فوقها؟\n(هتتعمل نسخة احتياطية من الملفات القديمة)";
                if (MessageBox.Show(msg, "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            }

            var done = new List<string>();
            try
            {
                // 0) نسخة احتياطية (برا ClientApp عشان Next.js ميقراهاش)
                if (exists)
                {
                    string bak = Path.Combine(app, "_Backup_Screens", Module + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss"));
                    Directory.CreateDirectory(bak);
                    foreach (var f in Directory.GetFiles(pageDir)) File.Copy(f, Path.Combine(bak, Path.GetFileName(f)), true);
                    done.Add("✔️ نسخة احتياطية: _Backup_Screens\\" + Path.GetFileName(bak));
                }

                WriteFile(pageDir, Module + ".ts", rtTs.Text);
                WriteFile(pageDir, "page.tsx", rtTsx.Text);
                done.Add("✔️ " + Module + ".ts و page.tsx");

                string cssDir = Path.Combine(app, "public", "StyleDesign", "Pages", Module);
                if (!File.Exists(Path.Combine(cssDir, Module + "EN.css"))) WriteFile(cssDir, Module + "EN.css", "/* " + Module + " - English (LTR) */\r\n");
                if (!File.Exists(Path.Combine(cssDir, Module + "AR.css"))) WriteFile(cssDir, Module + "AR.css", "/* " + Module + " - Arabic (RTL) */\r\n");
                done.Add("✔️ ملفات التنسيق");

                done.Add(UpdateRoutes(Path.Combine(ClientAppPath, "Routes.tsx")));
                done.Add(UpdateResources(Path.Combine(ClientAppPath, "Shared", "Resources.ts")));

                if (chkPermissions.Checked)
                {
                    WriteFile(txtDbPath.Text.Trim(), "Add_" + Module + "_Module.sql", GenSql());
                    done.Add("✔️ Database\\Add_" + Module + "_Module.sql");
                }

                SetMode(Module);
                RefreshScreensList();
                SetStatus("تم الحفظ ✔️");
                MessageBox.Show(string.Join("\n", done) + "\n\nالخطوة الجاية: (تنفيذ الصلاحيات على قاعدة البيانات) لو الشاشة جديدة", "تم الحفظ");
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
            if (Regex.IsMatch(s, @"^[ \t]*" + Module + @"[ \t]*:", RegexOptions.Multiline)) return "ℹ️ الشاشة موجودة في Routes.tsx";

            string nl = s.Contains("\r\n") ? "\r\n" : "\n";
            var m = Regex.Match(s, @"^([ \t]*)Home[ \t]*:[ \t]*HomeLayout[ \t]*,[ \t]*\r?\n", RegexOptions.Multiline);
            if (m.Success) s = s.Insert(m.Index + m.Length, m.Groups[1].Value + Module + ": HomeLayout," + nl);
            else
            {
                var m2 = Regex.Match(s, @"const[ \t]+routes[^{]*\{[ \t]*\r?\n");
                if (!m2.Success) return "⚠️ مقدرتش ألاقي مكان في Routes.tsx — ضيف السطر بإيدك: " + GenRoutesLine().Trim();
                s = s.Insert(m2.Index + m2.Length, GenRoutesLine() + nl);
            }
            File.WriteAllText(path, s, Utf8NoBom);
            return "✔️ Routes.tsx";
        }

        static string InsertBeforeClose(string s, int closeIdx, string block, string nl)
        {
            int p = closeIdx - 1;
            while (p >= 0 && char.IsWhiteSpace(s[p])) p--;
            string head = s.Substring(0, p + 1);
            if (p >= 0 && s[p] != ',' && s[p] != '{') head += ",";
            return head + nl + block + s.Substring(p + 1);
        }

        // بيحدّث الكلمات الموجودة ويضيف الناقص (عربي وإنجليزي)
        string UpdateResources(string path)
        {
            if (!File.Exists(path)) return "⚠️ Resources.ts مش موجود";
            string s = File.ReadAllText(path);
            string nl = s.Contains("\r\n") ? "\r\n" : "\n";

            var arMatch = Regex.Match(s, @"^[ \t]*ar[ \t]*:[ \t]*\{", RegexOptions.Multiline);
            if (!arMatch.Success || s.LastIndexOf("};", StringComparison.Ordinal) < arMatch.Index)
                return "⚠️ مقدرتش أفهم شكل Resources.ts — انسخ الترجمة بإيدك من التاب";

            string enPart = s.Substring(0, arMatch.Index);
            string arPart = s.Substring(arMatch.Index);
            arPart = UpsertKeys(arPart, ResValues(true), true, nl);
            enPart = UpsertKeys(enPart, ResValues(false), false, nl);
            File.WriteAllText(path, enPart + arPart, Utf8NoBom);
            return "✔️ Resources.ts";
        }

        string UpsertKeys(string part, string[] values, bool isArPart, string nl)
        {
            var keys = ResKeys();
            var missing = new List<int>();
            for (int i = 0; i < keys.Length; i++)
            {
                var rx = new Regex(@"(?m)^([ \t]*" + Regex.Escape(keys[i]) + @"[ \t]*:[ \t]*)""(?:[^""\\]|\\.)*""");
                if (rx.IsMatch(part))
                {
                    string val = Js(values[i]);
                    part = rx.Replace(part, m => m.Groups[1].Value + "\"" + val + "\"", 1);
                }
                else missing.Add(i);
            }
            if (missing.Count == 0) return part;

            int closeIdx;
            if (isArPart)
            {
                int end = part.LastIndexOf("};", StringComparison.Ordinal);
                closeIdx = part.LastIndexOf('}', end - 1);
            }
            else closeIdx = part.LastIndexOf('}');
            return InsertBeforeClose(part, closeIdx, GenResBlock(isArPart, nl, missing), nl);
        }

        void RunPermissionsSql()
        {
            if (!chkPermissions.Checked) { MessageBox.Show("سكريبت الصلاحيات مقفول (تاب 1 ← ④)"); return; }
            if (rtTs.Text.Trim() == "") { MessageBox.Show("اضغط (توليد الكود) الأول"); return; }
            if (MessageBox.Show("هيتم إضافة الشاشة " + Module + " في Sys_Modules و Sys_RoleModule على قاعدة البيانات " + txtDatabase.Text + "\nتكمل؟",
                    "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            try
            {
                var batches = Regex.Split(GenSql(), @"^[ \t]*GO[ \t]*\r?$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
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
        // #region نافذة بحث جديدة
        // =====================================================================
        void OpenSearchBuilder()
        {
            if (!File.Exists(SearchFilePath)) { MessageBox.Show("مش لاقي الملف:\n" + SearchFilePath); return; }
            if (tablesCache.Count == 0 && !LoadTables(false))
            {
                MessageBox.Show("اتصل بقاعدة البيانات الأول (تاب 1)");
                return;
            }
            using (var f = new Form5_SearchBuilder(ConnString(), tablesCache, SearchFilePath, searchFunctions))
            {
                if (f.ShowDialog(this) == DialogResult.OK)
                {
                    RefreshSearchFunctions();
                    SetStatus("✔️ اتضافت الدالة " + f.CreatedName + " في G_SearchFrom.ts");
                    // لو فيه حقل واقف عليه نوعه search ومفيهوش دالة نحطهاله
                    if (grid.CurrentRow != null && Str(grid.CurrentRow, "InputType") == "search" && Str(grid.CurrentRow, "SearchFn") == "")
                        grid.CurrentRow.Cells["SearchFn"].Value = f.CreatedName;
                    MessageBox.Show("✔️ اتضافت الدالة " + f.CreatedName + " في G_SearchFrom.ts\nاختارها من عمود (دالة البحث) في أي حقل نوعه search");
                }
            }
        }
        // #endregion

        // =====================================================================
        // #region القوالب (Templates)
        // =====================================================================
        const string TPL_TS = @"""use client"";

// =====================================================================================
//  📄 __MODULE__.ts   ←  ملف المنطق (البيزنس) — شاشة __TITLE_AR__
//  اتعمل أوتوماتيك من برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله
// -------------------------------------------------------------------------------------
//  الجدول : __TABLE__
//  الحفظ  : __SAVE_DESC__
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from ""react"";
import { useSys } from ""../Shared/SystemUsing"";
import { DynamicGridColumn } from ""../Shared/Components/Import/ModelGrid"";
import { FilterFieldConfig, ActiveFilter } from ""../Shared/Components/Import/AdvancedFilter"";
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
