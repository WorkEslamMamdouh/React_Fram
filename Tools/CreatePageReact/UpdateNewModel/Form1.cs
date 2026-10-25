using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Drawing;
using System.Dynamic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using UpdateNewModel.SQL;
using static System.Windows.Forms.VisualStyles.VisualStyleElement;

namespace UpdateNewModel
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }
        GeneralSQL GenSQL = new GeneralSQL();

        SqlEnt _sqlEnt = new SqlEnt();
        ModelSql _modelSql = new ModelSql();

        List<SqlStored_Proc> list_AllGetAllStored_Proc = new List<SqlStored_Proc>();
        List<SqlTables> list_AllTables = new List<SqlTables>();
        List<SqlColumns> _ListColumns = new List<SqlColumns>();
        List<SqlColumns> _ListColumnsStored = new List<SqlColumns>();

        Config _Config = new Config();

        string _Server = ".";
        string _User = "sa";
        string _Password = "619619";
        private void Form1_Load(object sender, EventArgs e)
        {

            GetConfig();
            try
            {
                Contact_Sever();
            }
            catch (Exception ex)
            {

            }

            SetTimeoutAsync(200, () =>
            {
                text_Pass.Focus();
            });


        }
        public void GetConfig()
        {

            try
            {
                string filePath = Path.Combine(Application.StartupPath, "Config.txt");

                if (File.Exists(filePath))
                {
                    string WebCon = File.ReadAllText(filePath);

                    _Config = JsonConvert.DeserializeObject<Config>(WebCon);
                }
                else
                {
                    // Handle the case when the file doesn't exist
                }
            }
            catch (Exception)
            {
                _Config = new Config();
            }

            Name_Server.Text = _Config.Name_Server;
            Name_User.Text = _Config.Name_User;
            Server_Pass.Text = _Config.Server_Pass;
            Path_Url.Text = _Config.Path_Url_Model;
            Path_Url_Entities.Text = _Config.Path_Url_Entities;
            Path_Report_Mode.Text = _Config.Path_Report_Mode;
            textPathModelRes.Text = _Config.textPathModelRes;
            textPathModelResTs.Text = _Config.textPathModelResTs;
            Path_Report_Mode_In_Core.Text = _Config.Path_Report_Mode_In_Core;
            Path_Copy_From.Text = _Config.Path_Copy_From;
            Path_Past_To.Text = _Config.Path_Past_To;
            Path_IServes.Text = _Config.Path_IServes;
            Path_File_Txt.Text = _Config.Path_File_Txt;
            Text_Using.Text = _Config.Using_System;
            NameSpace_Stored_Report.Text = _Config.NameSpace_Stored_Report;
            NameSpace_Stored_Core.Text = _Config.NameSpace_Stored_Core;
            text_NameSpace.Text = _Config.NameSpace;
            Text_Using_Context.Text = _Config.Using_System_Context;
            Text_Using_IServices.Text = _Config.Using_IServices;
            text_NameSpace_Context.Text = _Config.NameSpace_Context;
            text_NameSpace_IServices.Text = _Config.NameSpace_IServices;
            NameClass_Context.Text = _Config.NameClass_Context;

            text_Pass.Focus();
        }

        private void Save_Config_Click(object sender, EventArgs e)
        {
            var webConfig = new Config
            {
                Name_Server = Name_Server.Text.Trim(),
                Name_User = Name_User.Text.Trim(),
                Server_Pass = Server_Pass.Text.Trim(),
                Path_Url_Model = Path_Url.Text.Trim(),
                Path_Url_Entities = Path_Url_Entities.Text.Trim(),
                Path_IServes = Path_IServes.Text.Trim(),
                Path_Copy_From = Path_Copy_From.Text.Trim(),
                Path_Past_To = Path_Past_To.Text.Trim(),
                Path_Report_Mode = Path_Report_Mode.Text.Trim(),
                textPathModelRes = textPathModelRes.Text.Trim(),
                textPathModelResTs = textPathModelResTs.Text.Trim(),
                Path_Report_Mode_In_Core = Path_Report_Mode_In_Core.Text.Trim(),
                Path_File_Txt = Path_File_Txt.Text.Trim(),
                Using_System = Text_Using.Text.Trim(),
                Using_System_Context = Text_Using_Context.Text.Trim(),
                Using_IServices = Text_Using_IServices.Text.Trim(),
                NameSpace_Stored_Report = NameSpace_Stored_Report.Text.Trim(),
                NameSpace_Stored_Core = NameSpace_Stored_Core.Text.Trim(),
                NameSpace = text_NameSpace.Text.Trim(),
                NameSpace_Context = text_NameSpace_Context.Text.Trim(),
                NameSpace_IServices = text_NameSpace_IServices.Text.Trim(),
                NameClass_Context = NameClass_Context.Text.Trim(),
                SetNameData = db_Name_Data.Text.Trim()
            };

            // Convert the WebConfig object to a JSON string
            string json = JsonConvert.SerializeObject(webConfig, Newtonsoft.Json.Formatting.Indented);

            // Specify the file path
            string filePath = Path.Combine(Application.StartupPath, "Config.txt");

            // Write the JSON string to the file
            File.WriteAllText(filePath, json);

            GetConfig();

            MessageBox.Show("تم الحفظ بنجاح");

        }

        private void btn_Run_Click(object sender, EventArgs e)
        {
            try
            {

                Contact_Sever();
            }
            catch (Exception ex)
            {

            }
        }

        public void Clear_Control()
        {

            list_ColumnsTable.Items.Clear();
            list_system_type.Items.Clear();
            New_Area_Class.Text = "";
        }
        public void Contact_Sever()
        {

            _Server = Name_Server.Text;
            _User = Name_User.Text;
            _Password = Server_Pass.Text;

            _sqlEnt.Server = _Server;
            _sqlEnt.User = _User;
            _sqlEnt.Password = _Password;

            var list = GenSQL.GetNameData(_sqlEnt);
            db_Name_Data.Items.Clear();
            db_Name_Table.Items.Clear();
            db_Name_Proc.Items.Clear();
            Clear_Control();
            db_Name_Data.Items.Add("All Database");
            foreach (var item in list)
            {
                if (item.ToString() != "master" && item.ToString() != "msdb" && item.ToString() != "model" && item.ToString() != "tempdb")
                {
                    db_Name_Data.Items.Add(item.ToString());
                }
            }

            db_Name_Data.SelectedIndex = 0;

            if (_Config.SetNameData.Trim() != "")
            {
                db_Name_Data.SelectedItem = _Config.SetNameData;
            }

        }


        private void db_Name_Data_SelectedValueChanged(object sender, EventArgs e)
        {
            if (db_Name_Data.Text == "All Database")
            {
                return;
            }
            _sqlEnt.Server = _Server;
            _sqlEnt.User = _User;
            _sqlEnt.Password = _Password;
            _sqlEnt.Database = db_Name_Data.Text;

            _modelSql.sqlEnt = _sqlEnt;
            _modelSql.sqlTables.name = db_Name_Table.Text;

            list_AllTables = GenSQL.CounactData(_sqlEnt);
            Clear_Control();
            db_Name_Table.Items.Clear();
            db_Name_Table.Items.Add("All Tables");
            foreach (var item in list_AllTables)
            {
                db_Name_Table.Items.Add(item.name.ToString());
            }

            list_AllGetAllStored_Proc = GenSQL.GetAllStored_Proc(_modelSql);

            db_Name_Proc.Items.Clear();
            db_Name_Proc.Items.Add("All Stored");
            foreach (var item in list_AllGetAllStored_Proc)
            {
                db_Name_Proc.Items.Add(item.name.ToString());
            }

            db_Name_Proc.SelectedIndex = 0;
            db_Name_Table.SelectedIndex = 0;
        }

        private void db_Name_Table_SelectedValueChanged(object sender, EventArgs e)
        {

            db_Name_Proc.SelectedIndex = 0;

            if (db_Name_Table.Text == "All Tables")
            {
                return;
            }

            _sqlEnt.Server = _Server;
            _sqlEnt.User = _User;
            _sqlEnt.Password = _Password;
            _sqlEnt.Database = db_Name_Data.Text;
            _modelSql.sqlEnt = _sqlEnt;
            _modelSql.sqlTables.name = db_Name_Table.Text;

            _ListColumns = GenSQL.GetColumnsTable(_modelSql);


            list_ColumnsTable.Items.Clear();
            list_system_type.Items.Clear();
            New_Area_Class.Text = "";
            foreach (var item in _ListColumns)
            {
                list_ColumnsTable.Items.Add(item.name.ToString());
                list_system_type.Items.Add(item.system_type.ToString());
            }
            list_ColumnsTable.SelectedIndex = 0;
            list_system_type.SelectedIndex = 0;

            New_Area_Class.Text = GenSQL.Create_Class(Text_Using.Text, text_NameSpace.Text, db_Name_Table.Text, _ListColumns);

            Area_Text_Entities.Text = GenSQL.Create_Entities(db_Name_Table.Text, _ListColumns);

        }

        private void richTextBox1_TextChanged(object sender, EventArgs e)
        {

        }

        private void New_Area_Class_TextChanged(object sender, EventArgs e)
        {

        }

        private void General_Class_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("Model");

            string Models_Class = "";

            Models_Class = GenSQL.Create_Class(Text_Using.Text, text_NameSpace.Text, db_Name_Table.Text, _ListColumns);

            New_Area_Class.Text = Models_Class;

            try
            {

                Update_Model(New_Area_Class.Text, db_Name_Table.Text);
                MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                MessageBox.Show("Error filePath");
            }
        }
        private void General_All_Mode_Click(object sender, EventArgs e)
        {
            General_All_Mode.Text = "loading...";

            Area_Model_.SelectTab("Model");


            SetTimeoutAsync(200, () =>
            {


                Delete_Model();
                StringBuilder models = new StringBuilder();

                db_Name_Table.SelectedIndex = 0;
                for (int i = 0; i < list_AllTables.Count; i++)
                {
                    try
                    {
                        New_Area_Class.Text = "";
                        db_Name_Table.SelectedIndex = db_Name_Table.SelectedIndex + 1;
                        models.AppendLine(GenSQL.Create_Entities(db_Name_Table.Text, _ListColumns));

                        Update_Model(New_Area_Class.Text, list_AllTables[i].name.ToString());

                    }
                    catch (Exception ex)
                    {

                    }
                }


                //for (int i = 0; i < list_AllGetAllStored_Proc.Count; i++)
                //{
                //    try
                //    {
                //        New_Area_Class.Text = "";

                //        db_Name_Proc.SelectedIndex = i + 1;

                //        if (New_Area_Class.Text != "")
                //        {
                //            models.AppendLine(GenSQL.Create_Entities(db_Name_Proc.Text, _ListColumnsStored));
                //            Update_Model(New_Area_Class.Text, list_AllGetAllStored_Proc[i].name.ToString());
                //        }

                //    }
                //    catch (Exception ex)
                //    {

                //    }
                //}

                Area_Text_Entities.Text = models.ToString();

                Area_ModelDbContext.Text = GenSQL.Generate_DbContext(NameClass_Context.Text, Text_Using_Context.Text, text_NameSpace_Context.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);

                Update_ModelDbContext(Area_ModelDbContext.Text, "ModelDbContext");


                Update_Entities(Area_Text_Entities.Text, "Entities_DataBase");



                General_All_Mode.Text = "Generate All Model";

                MessageBox.Show("Done Updated Model");

                FunGeneral_IServices();

            });


        }


        private void btn_DbContext_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("lDbContext");

            btn_DbContext.Text = "loading...";



            SetTimeoutAsync(200, () =>
            {
                Area_ModelDbContext.Text = GenSQL.Generate_DbContext(NameClass_Context.Text, Text_Using_Context.Text, text_NameSpace_Context.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);

                Update_ModelDbContext(Area_ModelDbContext.Text, "ModelDbContext");

                btn_DbContext.Text = "Generate DbContext";
                MessageBox.Show("Done Generate DbContext");
            });

        }


        public void Delete_Model()
        {
            Path_Url.Text = Path_Url.Text.Replace("//", "\\");
            Path_Url.Text = Path_Url.Text.Replace("/", "\\");

            string folderPath = Path_Url.Text + "\\" + "Models";

            string filePath = Path_Url.Text + "\\" + NameClass_Context.Text + ".cs";

            // Check if the file exists before attempting to delete
            if (File.Exists(filePath))
            {
                try
                {
                    // Delete the file
                    File.Delete(filePath);
                    //Console.WriteLine("File deleted successfully.");
                }
                catch (Exception ex)
                {
                    //Console.WriteLine($"Error deleting the file: {ex.Message}");
                }
            }

            // Check if the file exists before attempting to delete
            if (Directory.Exists(folderPath))
            {
                try
                {
                    // Delete the folder and its contents
                    Directory.Delete(folderPath, true);
                    //Console.WriteLine("Folder deleted successfully.");
                }
                catch (Exception ex)
                {
                    //Console.WriteLine($"Error deleting the folder: {ex.Message}");
                }
            }
            else
            {
                //Console.WriteLine("The folder does not exist.");
            }

        }

        public void Update_Model(string string_Model, string Name_Model)
        {

            Path_Url.Text = Path_Url.Text.Replace("//", "\\");
            Path_Url.Text = Path_Url.Text.Replace("/", "\\");

            string folderPath = Path_Url.Text + "\\" + "Models";

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + "\\" + Name_Model + ".cs";

            File.WriteAllText(filePath, string_Model);

            //}

        }

        public void Update_ResourcesTs(string string_Model, string Name_Model)
        {

            textPathModelResTs.Text = textPathModelResTs.Text.Replace("//", "\\");
            textPathModelResTs.Text = textPathModelResTs.Text.Replace("/", "\\");

            string folderPath = textPathModelResTs.Text;

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + "\\" + Name_Model + ".ts";

            File.WriteAllText(filePath, string_Model);

            //}

        }


        public void Update_Resources(string string_Model, string Name_Model)
        {

            textPathModelRes.Text = textPathModelRes.Text.Replace("//", "\\");
            textPathModelRes.Text = textPathModelRes.Text.Replace("/", "\\");

            string folderPath = textPathModelRes.Text;

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + "\\" + Name_Model + ".cs";

            File.WriteAllText(filePath, string_Model);

            //}

        }

        public void Update_TxtFile(string string_Model, string Name_Model)
        {

            string_Model = CompressString(string_Model);

            Path_File_Txt.Text = Path_File_Txt.Text.Replace("//", "\\");
            Path_File_Txt.Text = Path_File_Txt.Text.Replace("/", "\\");

            string folderPath = Path_File_Txt.Text + "\\";

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + Name_Model + ".txt";

            File.WriteAllText(filePath, string_Model);
            //}

        }

        public void Update_ModelDbContext(string string_Model, string Name_Model)
        {

            Path_Url.Text = Path_Url.Text.Replace("//", "\\");
            Path_Url.Text = Path_Url.Text.Replace("/", "\\");

            string folderPath = Path_Url.Text + "\\";

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + Name_Model + ".cs";

            File.WriteAllText(filePath, string_Model);
            //}

        }
        
        public void Update_Entities(string string_Model, string Name_Model)
        {

            Path_Url_Entities.Text = Path_Url_Entities.Text.Replace("//", "\\");
            Path_Url_Entities.Text = Path_Url_Entities.Text.Replace("/", "\\");

            string folderPath = Path_Url_Entities.Text + "\\";

            Directory.CreateDirectory(folderPath);

            //if (File.Exists(folderPath))
            //{
                string filePath = folderPath + Name_Model + ".ts";

            File.WriteAllText(filePath, string_Model);
            //}

        }

        public void Update_Model_InReport(string string_Model, string Name_Model)
        {

            Path_Report_Mode.Text = Path_Report_Mode.Text.Replace("//", "\\");
            Path_Report_Mode.Text = Path_Report_Mode.Text.Replace("/", "\\");

            string folderPath = Path_Report_Mode.Text + "\\";

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + Name_Model + ".cs";

            File.WriteAllText(filePath, string_Model);
            //}

        }
        public void Update_Model_InReportInCore(string string_Model, string Name_Model)
        {

            Path_Report_Mode_In_Core.Text = Path_Report_Mode_In_Core.Text.Replace("//", "\\");
            Path_Report_Mode_In_Core.Text = Path_Report_Mode_In_Core.Text.Replace("/", "\\");

            string folderPath = Path_Report_Mode_In_Core.Text + "\\";

            //if (File.Exists(folderPath))
            //{
            string filePath = folderPath + Name_Model + ".cs";

            File.WriteAllText(filePath, string_Model);
            //}

        }

        private void Text_Using_Context_TextChanged(object sender, EventArgs e)
        {

        }

        private void lDbContext_Click(object sender, EventArgs e)
        {

        }

        private void General_IServices_Click(object sender, EventArgs e)
        {
            FunGeneral_IServices();
        }

        public void FunGeneral_IServices()
        {
            Area_Model_.SelectTab("Services");

            General_IServices.Text = "loading...";



            SetTimeoutAsync(200, () =>
            {

                Area_Interface.Text = GenSQL.Generate_Interface(Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);



                Area_Services.Text = GenSQL.Generate_IServices(NameClass_Context.Text, Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);


                Save_IService(Area_Interface.Text, Area_Services.Text);

                General_IServices.Text = "Generate IServices";

                MessageBox.Show("Done Generate IServices");

            });

        }
        public void Save_IService(string _Interface, string _Services)
        {

            Path_IServes.Text = Path_IServes.Text.Replace("//", "\\");
            Path_IServes.Text = Path_IServes.Text.Replace("/", "\\");

            string folderPath = Path_IServes.Text + "\\";

            string filePath_I = folderPath + "_Interface.cs";
            string filePath_S = folderPath + "_Services.cs";

            File.WriteAllText(filePath_I, _Interface);
            File.WriteAllText(filePath_S, _Services);

        }

        private void but_Enter_Click(object sender, EventArgs e)
        {
            ChackPass();
        }

        private void text_Pass_Enter(object sender, EventArgs e)
        {
            ChackPass();
        }



        private void text_Pass_KeyUp(object sender, KeyEventArgs e)
        {
            ChackPass();
        }

        public void ChackPass()
        {
            DateTime now = DateTime.Now;

            // Get the minute part
            int currentMinute = now.Minute;

            if (text_Pass.Text == "619619" + (currentMinute + 2).ToString())
            {
                panel_Login.Visible = false;
            }
        }

        private void General_Entities_Click(object sender, EventArgs e)
        {
            // Accessing controls within TabPage

            Area_Model_.SelectTab("Entities");

            Area_Text_Entities.Text = GenSQL.Create_Entities(db_Name_Table.Text, _ListColumns);

        }


        static async Task SetTimeoutAsync(int millisecondsDelay, Action callback)
        {
            await Task.Delay(millisecondsDelay);
            callback?.Invoke();
        }

        private void bntton1_Click(object sender, EventArgs e)
        {

            BtnModel_Txt_File.Text = "loading...";

            Area_Model_.SelectTab("Model");

            Global._Txt_StatusFlag = 1;

            SetTimeoutAsync(200, () =>
            {


                Delete_Model();
                StringBuilder models = new StringBuilder();

                for (int i = 0; i < list_AllTables.Count; i++)
                {
                    try
                    {
                        db_Name_Table.SelectedIndex = i + 1;
                        models.AppendLine(GenSQL.Create_Entities(db_Name_Table.Text, _ListColumns));

                        Update_Model(New_Area_Class.Text, list_AllTables[i].name.ToString());

                        Area_Txt_File.Text = GenSQL.Create_Json(_ListColumns);
                        Update_TxtFile(Area_Txt_File.Text, db_Name_Table.Text);
                    }
                    catch (Exception ex)
                    {

                    }
                }

                Area_Text_Entities.Text = models.ToString();

                Area_ModelDbContext.Text = GenSQL.Generate_DbContext(NameClass_Context.Text, Text_Using_Context.Text, text_NameSpace_Context.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);

                Update_ModelDbContext(Area_ModelDbContext.Text, "ModelDbContext");


                //**************************************TextFile*****************************

                Area_Interface.Text = GenSQL.Generate_InterfaceTextFile(Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);

                Area_Services.Text = GenSQL.Generate_IServicesTextFile(NameClass_Context.Text, Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);


                Save_IService(Area_Interface.Text, Area_Services.Text);

                BtnModel_Txt_File.Text = "Generate All Txt File in Project";

                MessageBox.Show("Done Generate  Plantations Business Txt File in Project");

            });

            Global._Txt_StatusFlag = 0;

        }

        private void Generate_Txt_File_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("DataJson");




            try
            {
                Area_Txt_File.Text = GenSQL.Create_Json(_ListColumns);
                Update_TxtFile(Area_Txt_File.Text, db_Name_Table.Text);
                MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                MessageBox.Show("Error filePath");
            }
        }




        public string CompressString(string input)
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes(input);

            using (MemoryStream outputStream = new MemoryStream())
            {
                using (GZipStream compressionStream = new GZipStream(outputStream, CompressionMode.Compress))
                {
                    compressionStream.Write(inputBytes, 0, inputBytes.Length);
                }

                // Convert compressed bytes to Base64 string
                return Convert.ToBase64String(outputStream.ToArray());
            }
        }
        public string DecompressString(string compressedString)
        {
            // Convert Base64 string to compressed bytes
            byte[] compressedBytes = Convert.FromBase64String(compressedString);

            using (MemoryStream inputStream = new MemoryStream(compressedBytes))
            {
                using (GZipStream decompressionStream = new GZipStream(inputStream, CompressionMode.Decompress))
                {
                    using (MemoryStream outputStream = new MemoryStream())
                    {
                        decompressionStream.CopyTo(outputStream);
                        byte[] decompressedBytes = outputStream.ToArray();
                        return Encoding.UTF8.GetString(decompressedBytes);
                    }
                }
            }
        }

        private void Control_Data_Json_Click(object sender, EventArgs e)
        {
            Global._Path_File_Txt = Path_File_Txt.Text;


            Form2 form2 = new Form2();
            form2.Show();
        }

        private void Generate_All_Txt_File_Click(object sender, EventArgs e)
        {

            Generate_All_Txt_File.Text = "loading...";


            for (int i = 0; i < list_AllTables.Count; i++)
            {
                try
                {
                    db_Name_Table.SelectedIndex = i + 1;
                    Area_Txt_File.Text = GenSQL.Create_Json(_ListColumns);
                    Update_TxtFile(Area_Txt_File.Text, db_Name_Table.Text);


                }
                catch (Exception ex)
                {

                }
            }

            MessageBox.Show("Done Generate All Txt File ");

            Generate_All_Txt_File.Text = "Generate All Txt File";
        }

        private void General_Stored_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("Model");

            string Models_Class = "";

            Models_Class = GenSQL.Create_Stored(Text_Using.Text, text_NameSpace.Text, db_Name_Proc.Text, _ListColumnsStored);

            New_Area_Class.Text = Models_Class;

            try
            {

                Update_Model(New_Area_Class.Text, db_Name_Proc.Text);
                MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                MessageBox.Show("Error filePath");
            }
        }

        private void db_Name_Proc_SelectedValueChanged(object sender, EventArgs e)
        {


            db_Name_Table.SelectedIndex = 0;

            if (db_Name_Proc.Text == "All Stored")
            {
                return;
            }

            _sqlEnt.Server = _Server;
            _sqlEnt.User = _User;
            _sqlEnt.Password = _Password;
            _sqlEnt.Database = db_Name_Data.Text;
            _modelSql.sqlEnt = _sqlEnt;
            _modelSql.sqlTables.name = db_Name_Proc.Text;

            _ListColumnsStored = GenSQL.GetNameColums_in_Stored(_modelSql);


            list_ColumnsTable.Items.Clear();
            list_system_type.Items.Clear();
            New_Area_Class.Text = "";
            foreach (var item in _ListColumnsStored)
            {
                list_ColumnsTable.Items.Add(item.name.ToString());
                list_system_type.Items.Add(item.system_type.ToString());
            }
            if (_ListColumnsStored.Count > 0)
            {
                list_ColumnsTable.SelectedIndex = 0;
                list_system_type.SelectedIndex = 0;


                New_Area_Class.Text = GenSQL.Create_Stored(Text_Using.Text, text_NameSpace.Text, db_Name_Proc.Text, _ListColumnsStored);

                Area_Text_Entities.Text = GenSQL.Create_Entities(db_Name_Proc.Text, _ListColumnsStored);

            }
            else
            {
                New_Area_Class.Text = "";

                Area_Text_Entities.Text = "";
            }



        }

        private void Update_IServices_Txt_Click(object sender, EventArgs e)
        {
            Update_IServices_Txt.Text = "loading...";

            Area_Model_.SelectTab("Services");

            Global._Txt_StatusFlag = 1;

            SetTimeoutAsync(200, () =>
            {

                //**************************************TextFile*****************************

                Area_Interface.Text = GenSQL.Generate_InterfaceTextFile(Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);

                Area_Services.Text = GenSQL.Generate_IServicesTextFile(NameClass_Context.Text, Text_Using_IServices.Text, text_NameSpace_IServices.Text, list_AllTables, Name_Server.Text, db_Name_Data.Text, Name_User.Text, Server_Pass.Text);


                Save_IService(Area_Interface.Text, Area_Services.Text);

                Update_IServices_Txt.Text = "Update IServices Txt File";

                MessageBox.Show("Done Update IServices Txt File");

            });

            Global._Txt_StatusFlag = 0;
        }

        private void Add_Stored_in_Report_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("Model");

            string Models_Class = "";

            Models_Class = GenSQL.Create_Stored_in_Report(NameSpace_Stored_Report.Text, db_Name_Proc.Text, _ListColumnsStored);

            New_Area_Class.Text = Models_Class;

            try
            {

                Update_Model_InReport(New_Area_Class.Text, db_Name_Proc.Text);
                //MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                //MessageBox.Show("Error filePath");
            }


            Models_Class = GenSQL.Create_Stored_in_Report(NameSpace_Stored_Core.Text, db_Name_Proc.Text, _ListColumnsStored);

            New_Area_Class.Text = Models_Class;

            try
            {

                Update_Model_InReportInCore(New_Area_Class.Text, db_Name_Proc.Text);
                //MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                //MessageBox.Show("Error filePath");
            }

            MessageBox.Show("Done Updated");

        }

        private void Model_Click(object sender, EventArgs e)
        {

        }

        private void General_All_Mode_Report_Click(object sender, EventArgs e)
        {
            General_All_Mode_Report.Text = "loading...";

            Area_Model_.SelectTab("Model");


            SetTimeoutAsync(200, () =>
            {


                StringBuilder models = new StringBuilder();

                for (int i = 0; i < list_AllGetAllStored_Proc.Count; i++)
                {
                    try
                    {
                        db_Name_Proc.SelectedIndex = i + 1;

                        if (New_Area_Class.Text != "")
                        {
                            models.AppendLine(GenSQL.Create_Entities(db_Name_Proc.Text, _ListColumnsStored));


                            New_Area_Class.Text = GenSQL.Create_Stored_in_Report(NameSpace_Stored_Report.Text, db_Name_Proc.Text, _ListColumnsStored);

                            Update_Model_InReport(New_Area_Class.Text, db_Name_Proc.Text);
                        }

                    }
                    catch (Exception ex)
                    {

                    }
                }


                General_All_Mode_Report.Text = "Generate All Model Report";
                MessageBox.Show("Done Updated");

            });

        }

        private void Transfer_Report_Click(object sender, EventArgs e)
        {
            Transfer_Report.Text = "loading...";

            SetTimeoutAsync(200, () =>
            {
                Process process = new Process();
                process.StartInfo.FileName = "cmd.exe";
                process.StartInfo.RedirectStandardInput = true;
                process.StartInfo.RedirectStandardOutput = true;
                process.StartInfo.RedirectStandardError = true;
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.CreateNoWindow = true;

                process.Start();

                using (StreamWriter writer = process.StandardInput)
                {
                    if (writer.BaseStream.CanWrite)
                    {
                        string sourcePath = Path_Copy_From.Text;
                        string destinationPath = Path_Past_To.Text;

                        writer.WriteLine(@"@echo off");
                        writer.WriteLine($"set \"sourcePath={sourcePath}\"");
                        writer.WriteLine($"set \"destinationPath={destinationPath}\"");
                        writer.WriteLine($"xcopy \"%sourcePath%\\*\" \"%destinationPath%\\\" /E /Y");
                    }
                }

                using (StreamReader reader = process.StandardOutput)
                {
                    string result = reader.ReadToEnd();
                    Console.WriteLine(result);
                }

                process.WaitForExit();
                process.Close();

                Transfer_Report.Text = "Transfer Report and Refresh";

                MessageBox.Show("Done Transfer Report and Refresh");

            });

        }

        private void label12_Click(object sender, EventArgs e)
        {

        }

        private void NameSpace_Stored_Report_TextChanged(object sender, EventArgs e)
        {

        }

        private void butModelRes_Click(object sender, EventArgs e)
        {
            Area_Model_.SelectTab("Model");

            string Models_Class = "";

            ModelSql rp = new ModelSql();

            Name_Server.Text = _Config.Name_Server;
            Name_User.Text = _Config.Name_User;
            Server_Pass.Text = _Config.Server_Pass;

            rp.sqlEnt.Server = Name_Server.Text;
            rp.sqlEnt.Database = db_Name_Data.Text;
            rp.sqlEnt.User = Name_User.Text;
            rp.sqlEnt.Password = Server_Pass.Text;

            Models_Class = GenSQL.Create_ClassResources(@"using System.Reflection;", "Core.UI.Models", "Res", rp);
            try
            {
                New_Area_Class.Text = Models_Class;
                 
                Update_Resources(New_Area_Class.Text, "Res");

                Area_Model_.SelectTab("Entities");

                Models_Class = GenSQL.Create_ClassResourcesTs("SystemResources", rp);

                Area_Model_.SelectTab("Entities");

                Area_Text_Entities.Text = Models_Class;

                Update_ResourcesTs(Area_Text_Entities.Text, "SystemResources");

                MessageBox.Show("Done Updated");
            }
            catch (Exception ex)
            {

                MessageBox.Show("Error filePath");
            }
        }

        private void UpdateEntitiesReact_Click(object sender, EventArgs e)
        {
            UpdateEntitiesReact.Text = "loading...";

            Area_Model_.SelectTab("Entities");


            SetTimeoutAsync(200, () =>
            {


                Delete_Model();
                StringBuilder models = new StringBuilder();

                db_Name_Table.SelectedIndex = 0;
                models.AppendLine(@"import { CustomClass } from ""../Shared/Entities"";");
                models.AppendLine("");
                models.AppendLine("");
                models.AppendLine("");

                for (int i = 0; i < list_AllTables.Count; i++)
                {
                    try
                    { 
                        db_Name_Table.SelectedIndex = db_Name_Table.SelectedIndex + 1;
                        models.AppendLine(GenSQL.Create_Entities_React(db_Name_Table.Text, _ListColumns));
                          
                    }
                    catch (Exception ex)
                    {

                    }
                }

                 

                Area_Text_Entities.Text = models.ToString();
 

                Update_Entities(Area_Text_Entities.Text, "Entities_DataBase");



                UpdateEntitiesReact.Text = "Update Entities React";

                MessageBox.Show("Done Updated Entities");
                 

            });
        }
    }
}
