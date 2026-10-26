// =====================================================================================
//  Form4_GridPage.cs  —  مولّد الشاشات للفريم ورك React_Fram (الواجهة والتحميل والحفظ)
// -------------------------------------------------------------------------------------
//  نوعين شاشات:
//    • جدول بسيط   : DynamicGrid على جدول واحد (إضافة / تعديل / حذف / بحث / فلتر)
//    • ماستر ديتيل : MasterDetail — ماستر + تفاصيل (لحد 5) زي الفاتورة
//
//  التابات:
//    1- الشاشة والجدول   ⓪ نوع الشاشة / فتح شاشة موجودة   ① قاعدة البيانات والجدول والقالب
//                        ② بيانات الشاشة   ③ العرض والحفظ   ④ الصلاحيات   ⑤ المسارات
//    2- الحقول           حقول الجدول (أو الماستر)
//    3- القائمة          (ماستر ديتيل) أعمدة قائمة الفواتير من القالب
//    4- التفاصيل         (ماستر ديتيل) كل تفاصيل بجدولها وقالبها وحقولها ومجاميعها
//    5- التحقق           قواعد التحقق قبل الحفظ (على الماستر أو أي تفاصيل، أو من جدول تاني)
//    6- المعاينة والحفظ  توليد → حفظ الملفات → تنفيذ الصلاحيات
//
//  الملف ده: الواجهة + قاعدة البيانات + الفتح والحفظ
//  Form4_GridPage.Gen.cs : توليد الكود والقوالب
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
    public partial class Form4_GridPage : Form
    {
        // =====================================================================
        // #region الكنترولز
        // =====================================================================
        ComboBox cmbScreenType, cmbScreens;
        Label lblMode;

        TextBox txtServer, txtUser, txtPass, txtDatabase;
        ComboBox cmbTable, cmbView;
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

        // جداول الحقول
        DataGridView grid;          // حقول الجدول البسيط / الماستر
        DataGridView gridList;      // أعمدة القائمة (ماستر ديتيل)
        DataGridView gridDetail;    // حقول التفاصيل المختارة
        DataGridView gridVal;       // قواعد التحقق
        readonly List<DataGridViewComboBoxColumn> searchFnColumns = new List<DataGridViewComboBoxColumn>();
        readonly Dictionary<DataGridView, string> gridKeys = new Dictionary<DataGridView, string>();

        // التفاصيل
        ListBox lstDetails;
        TextBox txtDetTitleAr, txtDetTitleEn, txtDetTotals;
        ComboBox cmbDetTable, cmbDetView, cmbDetFK, cmbDetOrderBy;
        Label lblDetKey;
        Panel pnlDetail;

        TabControl tabsMain, tabsPreview;
        TabPage tabSetup, tabFields, tabList, tabDetails, tabValidations, tabPreview;
        RichTextBox rtTs, rtTsx, rtResources, rtRoutes, rtSql;
        Label lblStatus, lblFieldsHint;
        // #endregion

        string keyColumn = "";
        bool keyIsIdentity = false;
        string openedScreen = "";
        readonly List<string> tablesCache = new List<string>();
        readonly List<string> viewsCache = new List<string>();
        readonly List<string> searchFunctions = new List<string>();

        // حالة كل تفاصيل
        class DetailState
        {
            public MdDetailSettings S = new MdDetailSettings();
            public List<ColMeta> Metas = new List<ColMeta>();
            public bool KeyIdentity = true;
        }
        readonly List<DetailState> detailStates = new List<DetailState>();
        int currentDetail = -1;
        bool loadingDetail = false;

        static readonly string[] AutoValues = { "", "CompCode", "BranchCode", "UserID", "FinYear" };
        static readonly string[] InputTypes = { "text", "number", "textarea", "checkbox", "date", "select", "search" };
        static readonly string[] ValTypes = { "required", "compare", "range", "regex", "unique", "exists", "notExists", "noDuplicate", "minRows", "custom" };
        static readonly string[] ValLevels = { "الماستر", "تفاصيل 1", "تفاصيل 2", "تفاصيل 3", "تفاصيل 4", "تفاصيل 5" };
        static readonly string[] ValOperators = { "", "=", "!=", ">", ">=", "<", "<=" };
        static readonly string[] ValWhen = { "both", "insert", "update" };
        const string SettingsMarker = "// @CreatePageReact-Settings:";

        bool IsMD { get { return cmbScreenType.SelectedIndex == 1; } }

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
            public bool NotInDb;            // مش في الجدول اللي بيتحفظ فيه (من القالب أو للعرض بس)
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
            public bool KeyIdentity;
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
            ApplyScreenType();
        }

        // =====================================================================
        // #region بناء الشاشة
        // =====================================================================
        void BuildUI()
        {
            Text = "مولّد الشاشات — React_Fram";
            Size = new Size(1500, 940);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 9.5f);
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;

            tabsMain = new TabControl { Dock = DockStyle.Fill, RightToLeftLayout = true };
            Controls.Add(tabsMain);

            tabSetup = new TabPage("1- الشاشة والجدول");
            tabFields = new TabPage("2- الحقول");
            tabList = new TabPage("3- القائمة");
            tabDetails = new TabPage("4- التفاصيل");
            tabValidations = new TabPage("5- التحقق قبل الحفظ");
            tabPreview = new TabPage("6- المعاينة والحفظ");

            BuildSetupTab();
            BuildFieldsTab();
            BuildListTab();
            BuildDetailsTab();
            BuildValidationsTab();
            BuildPreviewTab();
        }

        void BuildSetupTab()
        {
            var flow = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, Padding = new Padding(10) };
            tabSetup.Controls.Add(flow);

            // ⓪ نوع الشاشة / فتح شاشة
            TableLayoutPanel t0;
            var g0 = NewGroup("⓪ نوع الشاشة — جديدة أو تعديل شاشة موجودة في ClientApp", out t0);
            cmbScreenType = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList };
            cmbScreenType.Items.AddRange(new object[] { "جدول بسيط (DynamicGrid)", "ماستر ديتيل — رأس + تفاصيل (MasterDetail)" });
            cmbScreenType.SelectedIndex = 0;
            cmbScreenType.SelectedIndexChanged += (s, e) => ApplyScreenType();
            AddPair(t0, NewLabel("نوع الشاشة:"), cmbScreenType);
            cmbScreens = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            AddPair(t0, NewLabel("الشاشات الموجودة:"), cmbScreens);
            var p0 = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
            var btnOpen = NewButton("فتح الشاشة للتعديل", Color.FromArgb(79, 70, 229));
            var btnNew = NewButton("شاشة جديدة", Color.FromArgb(107, 114, 128));
            var btnReload = NewButton("تحديث القائمة", Color.FromArgb(107, 114, 128));
            btnOpen.Click += (s, e) => OpenScreen();
            btnNew.Click += (s, e) => NewScreen();
            btnReload.Click += (s, e) => { RefreshScreensList(); RefreshSearchFunctions(); };
            p0.Controls.AddRange(new Control[] { btnOpen, btnNew, btnReload });
            AddPair(t0, new Label(), p0);
            lblMode = NewLabel("");
            lblMode.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
            AddPair(t0, new Label(), lblMode);
            Fit(g0, t0);
            flow.Controls.Add(g0);

            // ① الاتصال
            TableLayoutPanel t1;
            var g1 = NewGroup("① قاعدة البيانات والجدول", out t1);
            txtServer = AddText(t1, "السيرفر:", ".", true);
            txtDatabase = AddText(t1, "قاعدة البيانات:", "ESSA_React", true);
            txtUser = AddText(t1, "المستخدم:", "sa", true);
            txtPass = AddText(t1, "كلمة السر:", "", true);
            txtPass.UseSystemPasswordChar = true;
            var btnConnect = NewButton("اتصال وتحميل الجداول", Color.FromArgb(37, 99, 235));
            btnConnect.Click += (s, e) => LoadTables(true);
            AddPair(t1, new Label(), btnConnect);
            cmbTable = NewDbCombo();
            AddPair(t1, NewLabel("الجدول (بيتحفظ فيه):"), cmbTable);
            cmbView = NewDbCombo();
            AddPair(t1, NewLabel("القالب (بيتعرض منه):"), cmbView);
            var btnCols = NewButton("تحميل الحقول", Color.FromArgb(79, 70, 229));
            btnCols.Click += (s, e) => LoadColumns();
            AddPair(t1, new Label(), btnCols);
            lblKey = NewLabel("المفتاح: —");
            lblKey.ForeColor = Color.DarkGreen;
            AddPair(t1, new Label(), lblKey);
            AddPair(t1, new Label(), NewHint("القالب (View) للماستر ديتيل بس: القائمة بتتعرض منه، وحقوله الزيادة بتظهر في الفورم للعرض."));
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
            AddPair(t2, new Label(), NewHint("كود الشاشة = اسم الفولدر = اسم الدالة، حروف إنجليزي وأرقام من غير مسافات (مثلاً SalesInvoice)"));
            Fit(g2, t2);
            flow.Controls.Add(g2);

            // ③ العرض والحفظ
            TableLayoutPanel t3;
            var g3 = NewGroup("③ العرض والحفظ", out t3);
            chkFilterComp = new CheckBox { Text = "بيانات الشركة الحالية بس (CompCode)", AutoSize = true, Checked = true };
            chkFilterBranch = new CheckBox { Text = "بيانات الفرع الحالي بس (BranchCode)", AutoSize = true };
            AddPair(t3, chkFilterComp, chkFilterBranch);
            txtExtraCondition = AddText(t3, "شرط إضافي على العرض:", "", true);
            AddPair(t3, new Label(), NewHint("بيتضاف بـ AND، مثلاً:  TrType = 1   أو   IsActive = 1 AND Amount > 0"));
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
            AddPair(t3, NewLabel("الأزرار:"), pFlags);
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
        }

        void BuildFieldsTab()
        {
            var pTop = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 46, Padding = new Padding(4) };
            var btnNewSearch = NewButton("➕ نافذة بحث جديدة (G_SearchFrom)", Color.FromArgb(5, 150, 105));
            btnNewSearch.Click += (s, e) => OpenSearchBuilder(grid);
            var btnUp = NewButton("▲ لفوق", Color.FromArgb(107, 114, 128));
            var btnDown = NewButton("▼ لتحت", Color.FromArgb(107, 114, 128));
            btnUp.Click += (s, e) => MoveRow(grid, -1);
            btnDown.Click += (s, e) => MoveRow(grid, 1);
            pTop.Controls.AddRange(new Control[] { btnNewSearch, btnUp, btnDown });
            lblFieldsHint = NewHintBox();
            grid = NewFieldGrid(false);
            tabFields.Controls.Add(grid);
            tabFields.Controls.Add(lblFieldsHint);
            tabFields.Controls.Add(pTop);
        }

        void BuildListTab()
        {
            var pTop = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 46, Padding = new Padding(4) };
            var btnUp = NewButton("▲ لفوق", Color.FromArgb(107, 114, 128));
            var btnDown = NewButton("▼ لتحت", Color.FromArgb(107, 114, 128));
            btnUp.Click += (s, e) => MoveRow(gridList, -1);
            btnDown.Click += (s, e) => MoveRow(gridList, 1);
            pTop.Controls.AddRange(new Control[] { btnUp, btnDown });
            var hint = NewHintBox();
            hint.Text = "أعمدة قائمة السجلات (بتتقري من القالب لو موجود، أو من الجدول).\n" +
                        "• (يظهر) = عمود في القائمة   • (بحث سريع) = البحث بيدوّر فيه   • (فلتر) = يظهر في الفلتر المتقدم\n" +
                        "• نوع select: الاختيارات بتظهر بالاسم في القائمة (0=نقدي=Cash;1=آجل=Credit)";
            gridList = NewFieldGrid(true);
            tabList.Controls.Add(gridList);
            tabList.Controls.Add(hint);
            tabList.Controls.Add(pTop);
        }

        void BuildDetailsTab()
        {
            // يمين: قائمة التفاصيل
            var left = new Panel { Dock = DockStyle.Right, Width = 230, Padding = new Padding(6) };
            lstDetails = new ListBox { Dock = DockStyle.Fill, IntegralHeight = false, Font = new Font("Segoe UI", 10f) };
            lstDetails.SelectedIndexChanged += (s, e) => SelectDetail(lstDetails.SelectedIndex);
            var pBtns = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 84 };
            var btnAdd = NewButton("➕ تفاصيل جديدة", Color.FromArgb(5, 150, 105));
            var btnRemove = NewButton("🗑 حذف التفاصيل", Color.FromArgb(220, 38, 38));
            btnAdd.Click += (s, e) => AddDetail();
            btnRemove.Click += (s, e) => RemoveDetail();
            pBtns.Controls.AddRange(new Control[] { btnAdd, btnRemove });
            left.Controls.Add(lstDetails);
            left.Controls.Add(pBtns);
            left.Controls.Add(new Label { Dock = DockStyle.Top, Text = "التفاصيل (لحد 5):", Height = 26, Font = new Font("Segoe UI", 10f, FontStyle.Bold) });

            // شمال: إعدادات التفاصيل المختارة + حقولها
            pnlDetail = new Panel { Dock = DockStyle.Fill, Padding = new Padding(6) };
            var top = new TableLayoutPanel { Dock = DockStyle.Top, ColumnCount = 4, AutoSize = true };
            top.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            txtDetTitleAr = AddText(top, "اسم التاب عربي:", "", false);
            txtDetTitleEn = AddText(top, "اسم التاب إنجليزي:", "", true);
            cmbDetTable = NewDbCombo();
            AddPair(top, NewLabel("الجدول (بيتحفظ فيه):"), cmbDetTable);
            cmbDetView = NewDbCombo();
            AddPair(top, NewLabel("القالب (بيتعرض منه):"), cmbDetView);
            var btnLoad = NewButton("تحميل حقول التفاصيل", Color.FromArgb(79, 70, 229));
            btnLoad.Click += (s, e) => LoadDetailColumns();
            lblDetKey = NewLabel("المفتاح: —");
            lblDetKey.ForeColor = Color.DarkGreen;
            AddPair(top, btnLoad, lblDetKey);
            cmbDetFK = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            cmbDetOrderBy = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, RightToLeft = RightToLeft.No };
            AddPair(top, NewLabel("عمود الربط بالماستر:"), cmbDetFK);
            AddPair(top, NewLabel("ترتيب الصفوف:"), cmbDetOrderBy);
            txtDetTotals = AddText(top, "المجاميع للماستر:", "", true);
            AddPair(top, new Label(), NewHint("مثلاً  TotalAmount=Total;ItemsCount=count   (حقل الماستر = حقل التفاصيل أو count)"));
            txtDetTitleAr.TextChanged += (s, e) => { if (!loadingDetail && currentDetail >= 0) RefreshDetailNames(); };

            var pTop = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 46, Padding = new Padding(4) };
            var btnNewSearch = NewButton("➕ نافذة بحث جديدة (G_SearchFrom)", Color.FromArgb(5, 150, 105));
            btnNewSearch.Click += (s, e) => OpenSearchBuilder(gridDetail);
            var btnUp = NewButton("▲ لفوق", Color.FromArgb(107, 114, 128));
            var btnDown = NewButton("▼ لتحت", Color.FromArgb(107, 114, 128));
            btnUp.Click += (s, e) => MoveRow(gridDetail, -1);
            btnDown.Click += (s, e) => MoveRow(gridDetail, 1);
            pTop.Controls.AddRange(new Control[] { btnNewSearch, btnUp, btnDown });

            gridDetail = NewFieldGrid(false);
            pnlDetail.Controls.Add(gridDetail);
            pnlDetail.Controls.Add(pTop);
            pnlDetail.Controls.Add(top);

            tabDetails.Controls.Add(pnlDetail);
            tabDetails.Controls.Add(left);
            pnlDetail.Enabled = false;
        }

        void BuildValidationsTab()
        {
            var hint = NewHintBox();
            hint.Height = 150;
            hint.Text =
                "قواعد بتتشيك قبل الحفظ بالترتيب، وأول قاعدة تفشل بتوقف الحفظ وتظهر رسالتها.   المستوى = الماستر أو تفاصيل 1..5 (القاعدة بتتشيك على كل صف)\n" +
                "• required: الحقل لازم يتملى     • compare: الحقل [المقارنة] حقل تاني (قارن بـ) أو (قيمة) — ومن التفاصيل للماستر اكتب Master.Field\n" +
                "• range: رقم بين الأقل والأكبر     • regex: شكل معين مثلاً ^01[0-9]{9}$     • unique: القيمة متتكررش في الجدول\n" +
                "• exists: لازم يكون فيه صف في (الجدول) بـ (الشرط)     • notExists: لازم ميكونش فيه     • noDuplicate: متتكررش في صفوف التفاصيل\n" +
                "• minRows: أقل عدد صفوف في التفاصيل (الأقل)     • custom: كود JavaScript بيرجّع رسالة الخطأ أو null — متاح: ctx.row / ctx.master / ctx.details / ctx.isInsert / Today / t(en,ar)\n" +
                "الشرط والرسالة فيهم أسماء الحقول بين { }: مثلاً  CustomerID = {CustomerID} AND ISNULL(Address,'') <> ''   ومن الماستر {Master.CustomerID}";
            var pTop = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 46, Padding = new Padding(4) };
            var cmbExample = new ComboBox { Width = 330, DropDownStyle = ComboBoxStyle.DropDownList };
            cmbExample.Items.AddRange(new object[] {
                "➕ إضافة قاعدة جاهزة...",
                "إجباري (required)",
                "مقارنة حقلين (compare)",
                "رقم بين قيمتين (range)",
                "شكل معين — موبايل (regex)",
                "متتكررش في الجدول (unique)",
                "لازم يكون موجود في جدول تاني (exists)",
                "لازم ميكونش موجود (notExists)",
                "متتكررش في التفاصيل (noDuplicate)",
                "أقل عدد صفوف في التفاصيل (minRows)",
                "كود خاص (custom)" });
            cmbExample.SelectedIndex = 0;
            cmbExample.SelectedIndexChanged += (s, e) =>
            {
                if (cmbExample.SelectedIndex > 0) AddValidationExample(cmbExample.SelectedIndex);
                cmbExample.SelectedIndex = 0;
            };
            var btnDel = NewButton("🗑 حذف القاعدة", Color.FromArgb(220, 38, 38));
            btnDel.Click += (s, e) => { if (gridVal.CurrentRow != null && !gridVal.CurrentRow.IsNewRow) gridVal.Rows.Remove(gridVal.CurrentRow); };
            var btnUp = NewButton("▲", Color.FromArgb(107, 114, 128));
            var btnDown = NewButton("▼", Color.FromArgb(107, 114, 128));
            btnUp.Click += (s, e) => MoveRow(gridVal, -1);
            btnDown.Click += (s, e) => MoveRow(gridVal, 1);
            pTop.Controls.AddRange(new Control[] { cmbExample, btnDel, btnUp, btnDown });

            gridVal = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = true,
                AllowUserToDeleteRows = true,
                RowHeadersWidth = 30,
                RightToLeft = RightToLeft.No
            };
            gridVal.DataError += (s, e) => { e.ThrowException = false; };
            gridVal.Columns.Add(ComboCol("Level", "المستوى", ValLevels, 90));
            gridVal.Columns.Add(ComboCol("Type", "النوع", ValTypes, 95));
            gridVal.Columns.Add(TextCol("Field", "الحقل", 120, false));
            gridVal.Columns.Add(ComboCol("When", "امتى", ValWhen, 70));
            gridVal.Columns.Add(ComboCol("Operator", "المقارنة", ValOperators, 60));
            gridVal.Columns.Add(TextCol("CompareTo", "قارن بـ (حقل)", 110, false));
            gridVal.Columns.Add(TextCol("Value", "قيمة", 70, false));
            gridVal.Columns.Add(TextCol("Min", "الأقل", 55, false));
            gridVal.Columns.Add(TextCol("Max", "الأكبر", 55, false));
            gridVal.Columns.Add(TextCol("Pattern", "Regex", 110, false));
            gridVal.Columns.Add(TextCol("Table", "الجدول", 120, false));
            gridVal.Columns.Add(TextCol("Condition", "الشرط", 230, false));
            gridVal.Columns.Add(TextCol("Code", "كود (custom)", 230, false));
            gridVal.Columns.Add(TextCol("MessageAr", "الرسالة عربي", 200, false));
            gridVal.Columns.Add(TextCol("MessageEn", "الرسالة إنجليزي", 200, false));
            gridVal.Columns["MessageAr"].DefaultCellStyle = new DataGridViewCellStyle { Alignment = DataGridViewContentAlignment.MiddleRight };
            gridVal.DefaultValuesNeeded += (s, e) =>
            {
                e.Row.Cells["Level"].Value = ValLevels[0];
                e.Row.Cells["Type"].Value = "required";
                e.Row.Cells["When"].Value = "both";
                e.Row.Cells["Operator"].Value = "";
            };

            tabValidations.Controls.Add(gridVal);
            tabValidations.Controls.Add(hint);
            tabValidations.Controls.Add(pTop);
        }

        void BuildPreviewTab()
        {
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
            tabPreview.Controls.Add(tabsPreview);
            tabPreview.Controls.Add(pButtons);
        }

        // جدول حقول (للجدول البسيط / الماستر / القائمة / التفاصيل)
        DataGridView NewFieldGrid(bool forList)
        {
            var g = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                RowHeadersWidth = 30,
                RightToLeft = RightToLeft.No,
                SelectionMode = DataGridViewSelectionMode.CellSelect
            };
            g.DataError += (s, e) => { e.ThrowException = false; };
            g.CurrentCellDirtyStateChanged += (s, e) => { if (g.IsCurrentCellDirty) g.CommitEdit(DataGridViewDataErrorContexts.Commit); };
            g.CellValueChanged += (s, e) => { if (e.RowIndex >= 0) StyleRow(g, g.Rows[e.RowIndex]); };

            g.Columns.Add(TextCol("Field", "الحقل", 140, true));
            g.Columns.Add(TextCol("SqlType", "النوع في SQL", 105, true));
            g.Columns.Add(TextCol("TitleAr", "العنوان عربي", 140, false));
            g.Columns.Add(TextCol("TitleEn", "العنوان إنجليزي", 140, false));
            g.Columns.Add(CheckCol("InGrid", forList ? "يظهر" : "في الجدول"));
            g.Columns.Add(CheckCol("InForm", "في الفورم"));
            g.Columns.Add(CheckCol("Required", "إجباري"));
            g.Columns.Add(CheckCol("Search", "بحث سريع"));
            g.Columns.Add(CheckCol("InFilter", "فلتر"));
            g.Columns.Add(ComboCol("InputType", "نوع الإدخال", InputTypes, 90));
            g.Columns.Add(TextCol("Options", "الاختيارات (select)", 180, false));
            var fn = ComboCol("SearchFn", "دالة البحث (search)", new string[] { "" }, 135);
            g.Columns.Add(fn);
            searchFnColumns.Add(fn);
            g.Columns.Add(TextCol("SearchCond", "شرط البحث", 130, false));
            g.Columns.Add(TextCol("FillFrom", "يملا من البحث", 170, false));
            g.Columns.Add(TextCol("Formula", "معادلة", 170, false));
            g.Columns.Add(ComboCol("Auto", "قيمة تلقائية", AutoValues, 95));
            g.Columns.Add(TextCol("DefaultValue", "قيمة افتراضية", 90, false));
            g.Columns.Add(TextCol("Width", "العرض", 55, false));
            g.Columns.Add(TextCol("Order", "الترتيب", 55, false));

            if (forList)
            {
                foreach (var c in new[] { "InForm", "Required", "SearchFn", "SearchCond", "FillFrom", "Formula", "Auto", "DefaultValue" })
                    g.Columns[c].Visible = false;
                g.Columns["InputType"].HeaderText = "نوع العرض";
            }
            gridKeys[g] = "";
            return g;
        }

        // تاب الحقول بيتغير حسب نوع الشاشة
        void ApplyScreenType()
        {
            tabsMain.SuspendLayout();
            tabsMain.TabPages.Clear();
            tabsMain.TabPages.Add(tabSetup);
            tabsMain.TabPages.Add(tabFields);
            if (IsMD)
            {
                tabsMain.TabPages.Add(tabList);
                tabsMain.TabPages.Add(tabDetails);
            }
            tabsMain.TabPages.Add(tabValidations);
            tabsMain.TabPages.Add(tabPreview);
            tabsMain.ResumeLayout();

            cmbView.Enabled = IsMD;
            tabFields.Text = IsMD ? "2- حقول الماستر" : "2- الحقول";
            grid.Columns["InGrid"].HeaderText = IsMD ? "يظهر في الفورم" : "في الجدول";
            grid.Columns["FillFrom"].Visible = IsMD;
            grid.Columns["Formula"].Visible = IsMD;
            lblFieldsHint.Text = IsMD
                ? "حقول رأس الفاتورة. (يظهر في الفورم) = يظهر حتى لو قراءة بس.  الحقول اللي من القالب بس (أصفر) للعرض ومش بتتحفظ.\n" +
                  "• معادلة: مثلاً  TotalAmount - DiscountAmount + VatAmount   (الحقل بيتحسب لوحده)   • الحقل اللي عليه مجموع من التفاصيل بيبقى قراءة بس\n" +
                  "• search: اختار الدالة واكتب شرطها، و(يملا من البحث) مثلاً  CustomerName=NameA;Phone=Mobile   • قيمة افتراضية today = تاريخ النهارده"
                : "• select: الاختيارات بالشكل ده  0=قبض=Receipt;1=صرف=Payment   (القيمة=عربي=إنجليزي)\n" +
                  "• search: اختار دالة البحث من G_SearchFrom واكتب شرطها (مثلاً USER_Status = 1) — القيمة اللي بترجع هي returnField بتاع الدالة\n" +
                  "• قيمة تلقائية: بتتملى من الجلسة ومش بتظهر في الفورم.  • قيمة افتراضية today = تاريخ النهارده.  • الحقل اللي مش في الفورم ولا تلقائي بيتعرض بس.";
        }
        // #endregion

        // =====================================================================
        // #region أدوات بناء الشاشة
        // =====================================================================
        GroupBox NewGroup(string title, out TableLayoutPanel table)
        {
            var g = new GroupBox { Text = title, Width = 1380, Padding = new Padding(10), Font = new Font("Segoe UI", 10f, FontStyle.Bold) };
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

        Label NewHintBox()
        {
            return new Label { Dock = DockStyle.Top, Height = 66, Padding = new Padding(8), BackColor = Color.FromArgb(239, 246, 255) };
        }

        Button NewButton(string text, Color color)
        {
            return new Button { Text = text, AutoSize = true, BackColor = color, ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Padding = new Padding(8, 4, 8, 4), Margin = new Padding(4), Cursor = Cursors.Hand };
        }

        ComboBox NewDbCombo()
        {
            return new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDown, RightToLeft = RightToLeft.No, AutoCompleteMode = AutoCompleteMode.SuggestAppend, AutoCompleteSource = AutoCompleteSource.ListItems };
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
            lblMode.Text = screen == "" ? "🆕 شاشة جديدة" : "✏️ بتعدّل الشاشة: " + screen;
            lblMode.ForeColor = screen == "" ? Color.DarkGreen : Color.DarkOrange;
            Text = "مولّد الشاشات — " + (screen == "" ? "شاشة جديدة" : "تعديل " + screen);
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
                    string tag = !text.Contains(SettingsMarker) ? "   (قديمة)" : text.Contains("\"ScreenType\":\"MasterDetail\"") ? "   (ماستر ديتيل)" : "";
                    cmbScreens.Items.Add(name + tag);
                }
            }
            catch { }
            if (cmbScreens.Items.Count > 0) cmbScreens.SelectedIndex = 0;
        }

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
            foreach (var col in searchFnColumns)
            {
                var g = col.DataGridView;
                var keep = new List<string>();
                if (g != null)
                    foreach (DataGridViewRow r in g.Rows)
                    {
                        string v = Str(r, "SearchFn");
                        if (v != "" && !searchFunctions.Contains(v)) keep.Add(v);
                    }
                col.Items.Clear();
                col.Items.Add("");
                foreach (var f in searchFunctions) col.Items.Add(f);
                foreach (var v in keep.Distinct()) col.Items.Add(v);
            }
        }

        void EnsureSearchFn(string fn)
        {
            if (string.IsNullOrEmpty(fn)) return;
            foreach (var col in searchFnColumns)
                if (!col.Items.Contains(fn)) col.Items.Add(fn);
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
                tablesCache.Clear();
                viewsCache.Clear();
                using (var con = new SqlConnection(ConnString()))
                using (var cmd = new SqlCommand("SELECT name, type FROM sys.objects WHERE type IN ('U','V') AND is_ms_shipped = 0 ORDER BY name", con))
                {
                    con.Open();
                    using (var r = cmd.ExecuteReader())
                        while (r.Read())
                        {
                            if (r.GetString(1).Trim() == "U") tablesCache.Add(r.GetString(0));
                            else viewsCache.Add(r.GetString(0));
                        }
                }
                var all = tablesCache.Concat(viewsCache).OrderBy(x => x).Cast<object>().ToArray();
                FillCombo(cmbTable, tablesCache.Cast<object>().ToArray());
                FillCombo(cmbView, new object[] { "" }.Concat(all).ToArray());
                FillCombo(cmbDetTable, tablesCache.Cast<object>().ToArray());
                FillCombo(cmbDetView, new object[] { "" }.Concat(all).ToArray());
                if (showMessage)
                {
                    MessageBox.Show("تم تحميل " + tablesCache.Count + " جدول و " + viewsCache.Count + " قالب ✔️");
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

        static void FillCombo(ComboBox c, object[] items)
        {
            string keep = c.Text;
            c.Items.Clear();
            c.Items.AddRange(items);
            c.Text = keep;
        }

        List<ColMeta> ReadColumns(string table)
        {
            var list = new List<ColMeta>();
            if (string.IsNullOrWhiteSpace(table)) return list;
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
                cmd.Parameters.AddWithValue("@t", table.Trim());
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

        // حقول الجدول + الحقول اللي في القالب بس (بتتعلّم NotInDb = للعرض بس)
        List<ColMeta> UnionColumns(string table, string view)
        {
            var cols = ReadColumns(table);
            if (!string.IsNullOrWhiteSpace(view) && !view.Equals(table, StringComparison.OrdinalIgnoreCase))
            {
                foreach (var v in ReadColumns(view))
                {
                    if (cols.Any(c => c.Name.Equals(v.Name, StringComparison.OrdinalIgnoreCase))) continue;
                    v.NotInDb = true;
                    v.IsIdentity = false;
                    v.IsPK = false;
                    cols.Add(v);
                }
            }
            return cols;
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
            { "TrNo", new[] { "الرقم", "No" } },
            { "TrDate", new[] { "التاريخ", "Date" } },
            { "Qty", new[] { "الكمية", "Qty" } },
            { "UnitPrice", new[] { "السعر", "Price" } },
            { "Price", new[] { "السعر", "Price" } },
            { "Total", new[] { "الإجمالي", "Total" } },
            { "TotalAmount", new[] { "الإجمالي", "Total" } },
            { "NetAmount", new[] { "الصافي", "Net" } },
            { "DiscountAmount", new[] { "الخصم", "Discount" } },
            { "VatAmount", new[] { "الضريبة", "VAT" } },
            { "CustomerName", new[] { "العميل", "Customer" } },
            { "ItemName", new[] { "الصنف", "Item" } },
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

        // key = مفتاح الجدول ، fk = عمود الربط (للتفاصيل)
        GridFieldSettings DefaultField(ColMeta c, Dictionary<string, string[]> res, int order, string key, bool keyIdentity, string fk)
        {
            bool isKey = c.Name == key;
            bool isFk = !string.IsNullOrEmpty(fk) && c.Name.Equals(fk, StringComparison.OrdinalIgnoreCase);
            string auto = (isFk || c.NotInDb) ? "" : AutoOf(c.Name);

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

            bool inForm = !isKey && !isFk && auto == "" && !c.IsComputed && !c.IsIdentity && !c.NotInDb;
            if (isKey && !keyIdentity) inForm = true;

            return new GridFieldSettings
            {
                Field = c.Name,
                TitleAr = ar,
                TitleEn = en,
                InGrid = auto == "" && !isFk,
                InForm = inForm,
                Required = (inForm && !c.IsNullable) || (isKey && !keyIdentity),
                Search = !isFk && (isKey || (IsTextType(c.SqlType) && auto == "")),
                InFilter = auto == "" && !isFk && !c.IsComputed,
                InputType = input,
                Auto = auto,
                DefaultValue = (inForm && IsDateType(c.SqlType) && !c.IsNullable) ? "today" : "",
                Width = isKey ? 90 : (input == "checkbox" ? 100 : (input == "number" ? 120 : 220)),
                Order = order
            };
        }

        static ColMeta FindKey(List<ColMeta> cols, string preferred)
        {
            ColMeta key = null;
            if (!string.IsNullOrEmpty(preferred)) key = cols.FirstOrDefault(c => c.Name.Equals(preferred, StringComparison.OrdinalIgnoreCase) && !c.NotInDb);
            if (key == null) key = cols.FirstOrDefault(c => c.IsIdentity && !c.NotInDb) ?? cols.FirstOrDefault(c => c.IsPK && !c.NotInDb) ?? cols.FirstOrDefault(c => !c.NotInDb);
            return key;
        }

        void SetKey(List<ColMeta> cols, string preferred)
        {
            var key = FindKey(cols, preferred);
            keyColumn = key == null ? "" : key.Name;
            keyIsIdentity = key != null && key.IsIdentity;
            gridKeys[grid] = keyColumn;
            lblKey.Text = "المفتاح: " + keyColumn + (keyIsIdentity ? "  (ترقيم تلقائي)" : "  (بيتكتب يدوي)");
        }
        // #endregion

        // =====================================================================
        // #region تعبئة جداول الحقول
        // =====================================================================
        void AddGridRow(DataGridView g, ColMeta meta, GridFieldSettings f)
        {
            EnsureSearchFn(f.SearchFn);
            int i = g.Rows.Add();
            var row = g.Rows[i];
            row.Tag = meta;
            row.Cells["Field"].Value = meta.Name;
            row.Cells["SqlType"].Value = meta.NotInDb ? (meta.SqlType == "?" ? "— مش في الجدول" : meta.SqlType + " (قالب)") :
                meta.SqlType + (IsTextType(meta.SqlType) ? "(" + (meta.MaxLen == -1 ? "max" : meta.MaxLen.ToString()) + ")" : "") + (meta.IsComputed ? "  ⚙ محسوب" : "");
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
            row.Cells["FillFrom"].Value = f.FillFrom;
            row.Cells["Formula"].Value = f.Formula;
            row.Cells["Auto"].Value = AutoValues.Contains(f.Auto) ? f.Auto : "";
            row.Cells["DefaultValue"].Value = f.DefaultValue;
            row.Cells["Width"].Value = f.Width;
            row.Cells["Order"].Value = f.Order;
            StyleRow(g, row);
        }

        void StyleRow(DataGridView g, DataGridViewRow row)
        {
            var meta = row.Tag as ColMeta;
            if (meta == null) return;
            string key;
            gridKeys.TryGetValue(g, out key);
            if (meta.Name == key) row.DefaultCellStyle.BackColor = Color.FromArgb(220, 252, 231);
            else if (meta.NotInDb || meta.IsComputed) row.DefaultCellStyle.BackColor = Color.FromArgb(254, 243, 199);
            else if (Str(row, "Auto") != "") row.DefaultCellStyle.BackColor = Color.FromArgb(243, 244, 246);
            else if (Str(row, "Formula") != "") row.DefaultCellStyle.BackColor = Color.FromArgb(237, 233, 254);
            else row.DefaultCellStyle.BackColor = Color.White;
        }

        void FillGrid(DataGridView g, IEnumerable<KeyValuePair<ColMeta, GridFieldSettings>> rows)
        {
            g.Rows.Clear();
            foreach (var kv in rows) AddGridRow(g, kv.Key, kv.Value);
        }

        void FillOrderBy(IEnumerable<string> fields, string selected)
        {
            cmbOrderBy.Items.Clear();
            foreach (var f in fields.Distinct()) cmbOrderBy.Items.Add(f);
            if (!string.IsNullOrEmpty(selected) && cmbOrderBy.Items.Contains(selected)) cmbOrderBy.SelectedItem = selected;
            else if (cmbOrderBy.Items.Contains(keyColumn)) cmbOrderBy.SelectedItem = keyColumn;
            else if (cmbOrderBy.Items.Count > 0) cmbOrderBy.SelectedIndex = 0;
        }

        void MoveRow(DataGridView g, int dir)
        {
            if (g.CurrentCell == null) return;
            int i = g.CurrentCell.RowIndex, j = i + dir;
            if (j < 0 || j >= g.Rows.Count || g.Rows[i].IsNewRow || g.Rows[j].IsNewRow) return;
            var row = g.Rows[i];
            int col = g.CurrentCell.ColumnIndex;
            g.Rows.RemoveAt(i);
            g.Rows.Insert(j, row);
            if (g.Columns.Contains("Order"))
                for (int k = 0; k < g.Rows.Count; k++) if (!g.Rows[k].IsNewRow) g.Rows[k].Cells["Order"].Value = k + 1;
            g.CurrentCell = g.Rows[j].Cells[col];
        }

        // دمج إعدادات محفوظة مع حقول قاعدة البيانات
        //  الحقول الجديدة في قاعدة البيانات بتتضاف مقفولة ، والحقول اللي اختفت بتتعلّم "مش في الجدول"
        List<KeyValuePair<ColMeta, GridFieldSettings>> MergeFields(List<ColMeta> cols, List<GridFieldSettings> saved, string key, bool keyIdentity, string fk, List<string> newFields)
        {
            var result = new List<KeyValuePair<ColMeta, GridFieldSettings>>();
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var res = ReadResources();
            int maxOrder = saved.Count == 0 ? 0 : saved.Max(x => x.Order);
            foreach (var f in saved.OrderBy(x => x.Order))
            {
                ColMeta meta = cols == null ? new ColMeta { Name = f.Field } :
                    (cols.FirstOrDefault(c => c.Name.Equals(f.Field, StringComparison.OrdinalIgnoreCase)) ?? new ColMeta { Name = f.Field, NotInDb = true });
                result.Add(new KeyValuePair<ColMeta, GridFieldSettings>(meta, f));
                used.Add(f.Field);
            }
            if (cols != null)
                foreach (var c in cols)
                {
                    if (used.Contains(c.Name) || c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase)) continue;
                    var f = DefaultField(c, res, ++maxOrder, key, keyIdentity, fk);
                    f.InGrid = false; f.InForm = false; f.InFilter = false; f.Search = false; f.Required = false;
                    result.Add(new KeyValuePair<ColMeta, GridFieldSettings>(c, f));
                    if (newFields != null) newFields.Add(c.Name);
                }
            return result;
        }

        // ===== تحميل حقول الجدول (شاشة جديدة) =====
        void LoadColumns()
        {
            string table = cmbTable.Text.Trim();
            if (table == "") { MessageBox.Show("اختار الجدول الأول"); return; }
            string view = IsMD ? cmbView.Text.Trim() : "";

            List<ColMeta> cols, listCols = null;
            try
            {
                cols = UnionColumns(table, view);
                if (IsMD) listCols = ReadColumns(view != "" ? view : table);
            }
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

            int order = 1;
            FillGrid(grid, cols.Where(c => !c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase))
                               .Select(c => new KeyValuePair<ColMeta, GridFieldSettings>(c, DefaultField(c, res, order++, keyColumn, keyIsIdentity, null))).ToList());

            if (IsMD)
            {
                gridKeys[gridList] = keyColumn;
                int lo = 1;
                FillGrid(gridList, listCols.Where(c => !c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase))
                    .Select(c =>
                    {
                        var f = DefaultField(c, res, lo++, keyColumn, keyIsIdentity, null);
                        f.InGrid = f.Auto == "";
                        return new KeyValuePair<ColMeta, GridFieldSettings>(c, f);
                    }).ToList());
                FillOrderBy(listCols.Select(c => c.Name), keyColumn);
            }
            else FillOrderBy(cols.Where(c => !c.NotInDb).Select(c => c.Name), keyColumn);

            tabsMain.SelectedTab = tabFields;
            MessageBox.Show("تم تحميل " + grid.Rows.Count + " حقل ✔️" + (IsMD ? "\nكمّل: تاب (القائمة) وتاب (التفاصيل)" : "\nراجع الإعدادات في تاب (الحقول)"));
        }
        // #endregion

        // =====================================================================
        // #region التفاصيل (ماستر ديتيل)
        // =====================================================================
        void SaveCurrentDetail()
        {
            if (currentDetail < 0 || currentDetail >= detailStates.Count) return;
            var d = detailStates[currentDetail];
            d.S.TitleAr = txtDetTitleAr.Text.Trim();
            d.S.TitleEn = txtDetTitleEn.Text.Trim();
            d.S.Table = cmbDetTable.Text.Trim();
            d.S.View = cmbDetView.Text.Trim();
            d.S.ForeignKey = Convert.ToString(cmbDetFK.SelectedItem ?? "");
            d.S.OrderBy = Convert.ToString(cmbDetOrderBy.SelectedItem ?? "");
            d.S.Totals = txtDetTotals.Text.Trim();
            gridDetail.EndEdit();
            d.S.Fields = ReadFieldSettings(gridDetail);
            d.Metas = gridDetail.Rows.Cast<DataGridViewRow>().Select(r => r.Tag as ColMeta).Where(x => x != null).ToList();
        }

        void SelectDetail(int index)
        {
            if (loadingDetail) return;
            SaveCurrentDetail();
            currentDetail = index;
            pnlDetail.Enabled = index >= 0;
            loadingDetail = true;
            try
            {
                if (index < 0 || index >= detailStates.Count)
                {
                    txtDetTitleAr.Text = txtDetTitleEn.Text = txtDetTotals.Text = "";
                    cmbDetTable.Text = cmbDetView.Text = "";
                    cmbDetFK.Items.Clear(); cmbDetOrderBy.Items.Clear();
                    gridDetail.Rows.Clear();
                    lblDetKey.Text = "المفتاح: —";
                    return;
                }
                var d = detailStates[index];
                txtDetTitleAr.Text = d.S.TitleAr;
                txtDetTitleEn.Text = d.S.TitleEn;
                cmbDetTable.Text = d.S.Table;
                cmbDetView.Text = d.S.View;
                txtDetTotals.Text = d.S.Totals;
                var fields = d.Metas.Where(m => !m.NotInDb).Select(m => m.Name).ToList();
                if (fields.Count == 0) fields = d.S.Fields.Select(f => f.Field).ToList();
                FillSimpleCombo(cmbDetFK, fields, d.S.ForeignKey);
                FillSimpleCombo(cmbDetOrderBy, fields, d.S.OrderBy == "" ? d.S.KeyColumn : d.S.OrderBy);
                gridKeys[gridDetail] = d.S.KeyColumn;
                lblDetKey.Text = "المفتاح: " + (d.S.KeyColumn == "" ? "—" : d.S.KeyColumn);
                gridDetail.Rows.Clear();
                for (int i = 0; i < d.S.Fields.Count; i++)
                {
                    var f = d.S.Fields[i];
                    var meta = d.Metas.FirstOrDefault(m => m.Name.Equals(f.Field, StringComparison.OrdinalIgnoreCase)) ?? new ColMeta { Name = f.Field };
                    AddGridRow(gridDetail, meta, f);
                }
            }
            finally { loadingDetail = false; }
        }

        static void FillSimpleCombo(ComboBox c, IEnumerable<string> items, string selected)
        {
            c.Items.Clear();
            foreach (var i in items.Distinct()) c.Items.Add(i);
            if (!string.IsNullOrEmpty(selected) && c.Items.Contains(selected)) c.SelectedItem = selected;
        }

        void RefreshDetailNames()
        {
            if (currentDetail >= 0 && currentDetail < detailStates.Count) detailStates[currentDetail].S.TitleAr = txtDetTitleAr.Text.Trim();
            loadingDetail = true;
            try
            {
                int sel = lstDetails.SelectedIndex;
                lstDetails.Items.Clear();
                for (int i = 0; i < detailStates.Count; i++)
                {
                    var s = detailStates[i].S;
                    lstDetails.Items.Add((i + 1) + ") " + (s.TitleAr != "" ? s.TitleAr : (s.Table != "" ? s.Table : "تفاصيل جديدة")));
                }
                if (sel >= 0 && sel < lstDetails.Items.Count) lstDetails.SelectedIndex = sel;
            }
            finally { loadingDetail = false; }
        }

        void AddDetail()
        {
            if (detailStates.Count >= 5) { MessageBox.Show("أقصى عدد 5 تفاصيل"); return; }
            SaveCurrentDetail();
            detailStates.Add(new DetailState());
            currentDetail = -1;
            RefreshDetailNames();
            lstDetails.SelectedIndex = detailStates.Count - 1;
        }

        void RemoveDetail()
        {
            int i = lstDetails.SelectedIndex;
            if (i < 0) return;
            if (MessageBox.Show("حذف التفاصيل (" + lstDetails.Items[i] + ")؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            currentDetail = -1;
            detailStates.RemoveAt(i);
            RefreshDetailNames();
            if (detailStates.Count > 0) lstDetails.SelectedIndex = Math.Min(i, detailStates.Count - 1);
            else SelectDetail(-1);
        }

        void LoadDetailColumns()
        {
            if (currentDetail < 0) return;
            string table = cmbDetTable.Text.Trim();
            if (table == "") { MessageBox.Show("اختار جدول التفاصيل"); return; }
            List<ColMeta> cols;
            try { cols = UnionColumns(table, cmbDetView.Text.Trim()); }
            catch (Exception ex) { MessageBox.Show("خطأ:\n" + ex.Message); return; }
            if (cols.Count == 0) { MessageBox.Show("الجدول مش موجود"); return; }
            if (gridDetail.Rows.Count > 0 &&
                MessageBox.Show("حقول التفاصيل الحالية هتتمسح وتتحمل من جديد. تكمل؟", "تأكيد", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            var d = detailStates[currentDetail];
            var key = FindKey(cols, null);
            d.S.KeyColumn = key == null ? "" : key.Name;
            d.KeyIdentity = key != null && key.IsIdentity;
            // عمود الربط: نفس اسم مفتاح الماستر لو موجود
            string fk = cols.Where(c => !c.NotInDb).Select(c => c.Name).FirstOrDefault(n => n.Equals(keyColumn, StringComparison.OrdinalIgnoreCase)) ?? "";
            var res = ReadResources();
            int order = 1;
            var rows = cols.Where(c => !c.Name.Equals("StatusFlag", StringComparison.OrdinalIgnoreCase))
                           .Select(c => new KeyValuePair<ColMeta, GridFieldSettings>(c, DefaultField(c, res, order++, d.S.KeyColumn, d.KeyIdentity, fk))).ToList();
            foreach (var kv in rows)
                if (kv.Key.Name == d.S.KeyColumn) kv.Value.InGrid = false;   // مفتاح الصف مش محتاج يظهر

            loadingDetail = true;
            try
            {
                gridKeys[gridDetail] = d.S.KeyColumn;
                lblDetKey.Text = "المفتاح: " + d.S.KeyColumn + (d.KeyIdentity ? "  (ترقيم تلقائي)" : "");
                FillGrid(gridDetail, rows);
                var dbFields = cols.Where(c => !c.NotInDb).Select(c => c.Name).ToList();
                FillSimpleCombo(cmbDetFK, dbFields, fk);
                FillSimpleCombo(cmbDetOrderBy, dbFields, d.S.KeyColumn);
                if (txtDetTitleAr.Text.Trim() == "") txtDetTitleAr.Text = SplitWords(Regex.Replace(table, @"^([A-Za-z]{1,3}_)+", ""));
                if (txtDetTitleEn.Text.Trim() == "") txtDetTitleEn.Text = SplitWords(Regex.Replace(table, @"^([A-Za-z]{1,3}_)+", ""));
            }
            finally { loadingDetail = false; }
            SaveCurrentDetail();
            RefreshDetailNames();
            if (fk == "") MessageBox.Show("⚠️ اختار (عمود الربط بالماستر) بإيدك — ملقتش عمود بنفس اسم مفتاح الماستر " + keyColumn);
        }
        // #endregion

        // =====================================================================
        // #region التحقق (Validations) — الجدول
        // =====================================================================
        void AddValidationExample(int kind)
        {
            string level = ValLevels[0], type = "required", field = "", op = "", cmp = "", val = "", min = "", max = "", pattern = "", table = "", cond = "", code = "", ar = "", en = "";
            switch (kind)
            {
                case 1: type = "required"; field = "CustomerName"; ar = "اكتب اسم العميل"; en = "Customer name is required"; break;
                case 2: type = "compare"; field = "DiscountAmount"; op = "<="; cmp = "TotalAmount"; ar = "الخصم مينفعش يكون أكبر من الإجمالي"; en = "Discount can't be more than the total"; break;
                case 3: type = "range"; level = ValLevels[1]; field = "Qty"; min = "0.001"; max = "100000"; ar = "الكمية لازم تكون من 0.001 لـ 100000"; en = "Qty must be between 0.001 and 100000"; break;
                case 4: type = "regex"; field = "Mobile"; pattern = "^01[0-9]{9}$"; ar = "رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01"; en = "Mobile must be 11 digits starting with 01"; break;
                case 5: type = "unique"; field = "RefNo"; ar = "الرقم المرجعي {RefNo} موجود قبل كده"; en = "Reference {RefNo} already exists"; break;
                case 6: type = "exists"; field = "CustomerID"; table = "D_Customer"; cond = "CustomerID = {CustomerID} AND ISNULL(Address, '') <> ''"; ar = "العميل ملوش عنوان — كمّل بياناته الأول"; en = "Customer has no address"; break;
                case 7: type = "notExists"; field = "CustomerID"; table = "I_TR_Sales"; cond = "CustomerID = {CustomerID} AND PaymentType = 1 AND NetAmount > 0 AND SaleID <> ISNULL({SaleID}, 0)"; ar = "العميل عليه فاتورة آجل مفتوحة"; en = "Customer has an open credit invoice"; break;
                case 8: type = "noDuplicate"; level = ValLevels[1]; field = "ItemName"; ar = "الصنف {ItemName} متكرر"; en = "Item {ItemName} is repeated"; break;
                case 9: type = "minRows"; level = ValLevels[1]; min = "1"; ar = "لازم تضيف صف واحد على الأقل"; en = "Add at least one row"; break;
                case 10: type = "custom"; code = "return ctx.row.TrDate > Today ? t(\"Date can't be in the future\", \"التاريخ مينفعش يكون في المستقبل\") : null;"; break;
            }
            int i = gridVal.Rows.Add();
            var r = gridVal.Rows[i];
            r.Cells["Level"].Value = level; r.Cells["Type"].Value = type; r.Cells["Field"].Value = field; r.Cells["When"].Value = "both";
            r.Cells["Operator"].Value = op; r.Cells["CompareTo"].Value = cmp; r.Cells["Value"].Value = val; r.Cells["Min"].Value = min; r.Cells["Max"].Value = max;
            r.Cells["Pattern"].Value = pattern; r.Cells["Table"].Value = table; r.Cells["Condition"].Value = cond; r.Cells["Code"].Value = code;
            r.Cells["MessageAr"].Value = ar; r.Cells["MessageEn"].Value = en;
            gridVal.CurrentCell = r.Cells["Field"];
        }

        List<ValidationSettings> ReadValidations()
        {
            gridVal.EndEdit();
            var list = new List<ValidationSettings>();
            foreach (DataGridViewRow r in gridVal.Rows)
            {
                if (r.IsNewRow) continue;
                string type = Str(r, "Type");
                if (type == "") continue;
                int lvl = Array.IndexOf(ValLevels, Str(r, "Level"));
                list.Add(new ValidationSettings
                {
                    Detail = lvl < 0 ? 0 : lvl,
                    Type = type,
                    Field = Str(r, "Field"),
                    When = Str(r, "When") == "" ? "both" : Str(r, "When"),
                    Operator = Str(r, "Operator"),
                    CompareTo = Str(r, "CompareTo"),
                    Value = Str(r, "Value"),
                    Min = Str(r, "Min"),
                    Max = Str(r, "Max"),
                    Pattern = Str(r, "Pattern"),
                    Table = Str(r, "Table"),
                    Condition = Str(r, "Condition"),
                    Code = Str(r, "Code"),
                    MessageAr = Str(r, "MessageAr"),
                    MessageEn = Str(r, "MessageEn")
                });
            }
            return list;
        }

        void FillValidations(List<ValidationSettings> list)
        {
            gridVal.Rows.Clear();
            foreach (var v in list ?? new List<ValidationSettings>())
            {
                int i = gridVal.Rows.Add();
                var r = gridVal.Rows[i];
                r.Cells["Level"].Value = ValLevels[Math.Max(0, Math.Min(5, v.Detail))];
                r.Cells["Type"].Value = ValTypes.Contains(v.Type) ? v.Type : "required";
                r.Cells["Field"].Value = v.Field;
                r.Cells["When"].Value = ValWhen.Contains(v.When) ? v.When : "both";
                r.Cells["Operator"].Value = ValOperators.Contains(v.Operator) ? v.Operator : "";
                r.Cells["CompareTo"].Value = v.CompareTo;
                r.Cells["Value"].Value = v.Value;
                r.Cells["Min"].Value = v.Min;
                r.Cells["Max"].Value = v.Max;
                r.Cells["Pattern"].Value = v.Pattern;
                r.Cells["Table"].Value = v.Table;
                r.Cells["Condition"].Value = v.Condition;
                r.Cells["Code"].Value = v.Code;
                r.Cells["MessageAr"].Value = v.MessageAr;
                r.Cells["MessageEn"].Value = v.MessageEn;
            }
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
            int type = cmbScreenType.SelectedIndex;
            ApplySettingsToForm(new GridScreenSettings());
            cmbScreenType.SelectedIndex = type;
            grid.Rows.Clear();
            gridList.Rows.Clear();
            gridVal.Rows.Clear();
            detailStates.Clear();
            currentDetail = -1;
            RefreshDetailNames();
            SelectDetail(-1);
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
                if (st != null) note = "اتقرت الإعدادات كاملة ✔️";
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

            bool md = st.ScreenType == "MasterDetail";
            cmbScreenType.SelectedIndex = md ? 1 : 0;
            ApplySettingsToForm(st);
            FillValidations(st.Validations);
            ClearPreview();

            var dbNote = new StringBuilder();
            var newFields = new List<string>();

            // ----- الماستر / الجدول -----
            List<ColMeta> cols = null;
            try { cols = UnionColumns(st.Table, md ? st.View : ""); }
            catch (Exception ex) { dbNote.AppendLine("\n⚠️ مقدرتش أقرا الجدول من قاعدة البيانات (" + ex.Message + ") — الحقول اتعرضت من إعدادات الشاشة بس."); }
            if (cols != null && cols.Count == 0) { dbNote.AppendLine("\n⚠️ الجدول " + st.Table + " مش موجود في قاعدة البيانات"); cols = null; }

            if (cols != null) SetKey(cols, st.KeyColumn);
            else
            {
                keyColumn = st.KeyColumn;
                keyIsIdentity = true;
                gridKeys[grid] = keyColumn;
                lblKey.Text = "المفتاح: " + keyColumn + "  (من إعدادات الشاشة)";
            }
            FillGrid(grid, MergeFields(cols, st.Fields, keyColumn, keyIsIdentity, null, newFields));

            // ----- القائمة (ماستر ديتيل) -----
            List<string> orderFields;
            detailStates.Clear();
            currentDetail = -1;
            gridList.Rows.Clear();
            if (!md) { RefreshDetailNames(); SelectDetail(-1); }
            if (md)
            {
                List<ColMeta> listCols = null;
                try { listCols = ReadColumns(st.View != "" ? st.View : st.Table); if (listCols.Count == 0) listCols = null; }
                catch { }
                gridKeys[gridList] = keyColumn;
                FillGrid(gridList, MergeFields(listCols, st.ListFields, keyColumn, keyIsIdentity, null, newFields));
                orderFields = listCols != null ? listCols.Select(c => c.Name).ToList() : st.ListFields.Select(f => f.Field).ToList();

                // ----- التفاصيل -----
                foreach (var d in st.Details)
                {
                    var ds = new DetailState { S = d };
                    List<ColMeta> dcols = null;
                    try { dcols = UnionColumns(d.Table, d.View); if (dcols.Count == 0) dcols = null; }
                    catch { }
                    if (dcols != null)
                    {
                        var k = FindKey(dcols, d.KeyColumn);
                        ds.KeyIdentity = k != null && k.IsIdentity;
                    }
                    var merged = MergeFields(dcols, d.Fields, d.KeyColumn, ds.KeyIdentity, d.ForeignKey, newFields);
                    ds.S.Fields = merged.Select(x => x.Value).ToList();
                    ds.Metas = merged.Select(x => x.Key).ToList();
                    detailStates.Add(ds);
                }
                RefreshDetailNames();
                if (detailStates.Count > 0) lstDetails.SelectedIndex = 0; else SelectDetail(-1);
            }
            else orderFields = cols != null ? cols.Where(c => !c.NotInDb).Select(c => c.Name).ToList() : st.Fields.Select(f => f.Field).ToList();
            FillOrderBy(orderFields, st.OrderBy);

            if (newFields.Count > 0) dbNote.AppendLine("\nℹ️ حقول جديدة في قاعدة البيانات اتضافت مقفولة (فعّلها لو محتاجها):\n" + string.Join(", ", newFields.Distinct()));

            SetMode(name);
            tabsMain.SelectedTab = tabFields;
            MessageBox.Show(note + dbNote, "فتح الشاشة " + name);
        }

        void ApplySettingsToForm(GridScreenSettings st)
        {
            txtModuleCode.Text = st.Module;
            cmbTable.Text = st.Table;
            cmbView.Text = st.View;
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

        GridScreenSettings CollectSettings()
        {
            SaveCurrentDetail();
            return new GridScreenSettings
            {
                ScreenType = IsMD ? "MasterDetail" : "Grid",
                Module = Module,
                Table = cmbTable.Text.Trim(),
                View = IsMD ? cmbView.Text.Trim() : "",
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
                Fields = ReadFieldSettings(grid),
                ListFields = IsMD ? ReadFieldSettings(gridList) : new List<GridFieldSettings>(),
                Details = IsMD ? detailStates.Select(d => d.S).ToList() : new List<MdDetailSettings>(),
                Validations = ReadValidations()
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
        // #region قراءة الشاشات القديمة (المعمولة يدوي) من الكود — جدول بسيط بس
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

            string cond = M1(ts, @"const\s+Condition\s*=\s*`([^`]*)`");
            st.FilterComp = cond.Contains("CompCode = ${CompCode}");
            st.FilterBranch = cond.Contains("BranchCode = ${BranchCode}");
            st.ExtraCondition = CleanCondition(cond.Replace("CompCode = ${CompCode}", "").Replace("BranchCode = ${BranchCode}", ""));

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

                string so = M1(blk, @"selectOptions:\s*(\[.*?\])\s*,");
                if (so == "")
                {
                    string soVar = M1(blk, @"selectOptions:\s*(\w+)");
                    if (soVar != "") so = M1(ts, @"const\s+" + soVar + @"\s*=\s*useMemo\(\s*\(\)\s*=>\s*(\[.*?\])\s*,\s*\[");
                }
                if (so != "") f.Options = ParseOptions(so, ts);

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
            if (r.DataGridView == null || !r.DataGridView.Columns.Contains(col)) return "";
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

        List<GridFieldSettings> ReadFieldSettings(DataGridView g)
        {
            g.EndEdit();
            var list = new List<GridFieldSettings>();
            foreach (DataGridViewRow r in g.Rows)
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
                    FillFrom = Str(r, "FillFrom"),
                    Formula = Str(r, "Formula"),
                    Auto = Str(r, "Auto"),
                    DefaultValue = Str(r, "DefaultValue"),
                    Width = Int(r, "Width", 150),
                    Order = Int(r, "Order", 99)
                };
                if (s.InputType == "") s.InputType = "text";
                if (s.TitleAr == "") s.TitleAr = s.Field;
                if (s.TitleEn == "") s.TitleEn = s.Field;
                if (s.Auto != "") s.InForm = false;
                list.Add(s);
            }
            return list;
        }

        // key = مفتاح الجدول ده ، keyIdentity = ترقيم تلقائي
        List<RowInfo> ReadRows(DataGridView g, string key, bool keyIdentity)
        {
            var settings = ReadFieldSettings(g);
            var metas = g.Rows.Cast<DataGridViewRow>().Select(r => r.Tag as ColMeta).Where(x => x != null).ToList();
            return ToRowInfos(settings, metas, key, keyIdentity);
        }

        List<RowInfo> ToRowInfos(List<GridFieldSettings> settings, List<ColMeta> metas, string key, bool keyIdentity)
        {
            var list = new List<RowInfo>();
            for (int i = 0; i < settings.Count; i++)
            {
                var s = settings[i];
                var meta = (i < metas.Count && metas[i].Name == s.Field ? metas[i] : metas.FirstOrDefault(m => m.Name == s.Field)) ?? new ColMeta { Name = s.Field };
                var info = new RowInfo { Meta = meta, S = s, IsKey = s.Field == key, KeyIdentity = keyIdentity, IsDecimal = IsDecimalType(meta.SqlType) };
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
        void OpenSearchBuilder(DataGridView target)
        {
            if (!File.Exists(SearchFilePath)) { MessageBox.Show("مش لاقي الملف:\n" + SearchFilePath); return; }
            if (tablesCache.Count == 0 && !LoadTables(false))
            {
                MessageBox.Show("اتصل بقاعدة البيانات الأول (تاب 1)");
                return;
            }
            using (var f = new Form5_SearchBuilder(ConnString(), tablesCache.Concat(viewsCache).OrderBy(x => x).ToList(), SearchFilePath, searchFunctions))
            {
                if (f.ShowDialog(this) == DialogResult.OK)
                {
                    RefreshSearchFunctions();
                    SetStatus("✔️ اتضافت الدالة " + f.CreatedName + " في G_SearchFrom.ts");
                    if (target.CurrentRow != null && Str(target.CurrentRow, "InputType") == "search" && Str(target.CurrentRow, "SearchFn") == "")
                        target.CurrentRow.Cells["SearchFn"].Value = f.CreatedName;
                    MessageBox.Show("✔️ اتضافت الدالة " + f.CreatedName + " في G_SearchFrom.ts\nاختارها من عمود (دالة البحث) في أي حقل نوعه search");
                }
            }
        }
        // #endregion
    }
}
