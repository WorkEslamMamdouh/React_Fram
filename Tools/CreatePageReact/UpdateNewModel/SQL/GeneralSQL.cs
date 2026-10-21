
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Dynamic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{



    public class ModelSql
    {
        public SqlTables sqlTables = new SqlTables();
        public SqlEnt sqlEnt = new SqlEnt();
        public object Model = new object();
    }
    public class ClassName
    {
        public Dictionary<string, object> Dictionary { get; set; }
    }

    public class GeneralSQL
    {

        public class ComputedColumn
        {
            public string ColumnName { get; set; }
            public string ComputedColumnDefinition { get; set; }

        }
        public class List_IdTable
        {
            public string ColumnName { get; set; }
            public string ColumnType { get; set; }

        }

        SqlEntities db = new SqlEntities();

        public List<string> GetNameData(SqlEnt rp)
        {

            db.Server = rp.Server;
            db.User = rp.User;
            db.Password = rp.Password;
            //string NameTable = rp.name;

            StringBuilder models = new StringBuilder();
            DataTable tbl = new DataTable();

            List<string> Liset_NameData = new List<string>();

            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = master ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {

                using (SqlCommand command = new SqlCommand())
                {
                    command.Connection = connection;

                    connection.Open();


                    using (SqlCommand cmd = new SqlCommand("SELECT name from sys.databases", connection))
                    {
                        using (SqlDataReader dr = cmd.ExecuteReader())
                        {
                            while (dr.Read())
                            {
                                Liset_NameData.Add(dr[0].ToString());
                            }
                        }
                    }




                    //SqlDataReader reader1 = command.ExecuteReader();
                    //while (reader1.Read())
                    //{
                    //    NameData = reader1["name"].ToString();

                    //    Liset_NameData.Add(NameData);
                    //}
                    connection.Close();
                    command.Dispose();
                    connection.Dispose();


                }




            }


            var resultObject = new
            {
                TableName = Liset_NameData,
                success = true

            };

            return Liset_NameData;


        }

        public List<SqlTables> CounactData(SqlEnt rp)
        {


            db.Server = rp.Server;
            db.Database = rp.Database;
            db.User = rp.User;
            db.Password = rp.Password;

            List<SqlTables> Tables = new List<SqlTables>();

            Tables = db.SqlTables;

            return Tables;

        }

        public List<SqlStored_Proc> GetAllStored_Proc(ModelSql rp)
        {


            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;



            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlStored_Proc> _SqlStored_Proc = new List<SqlStored_Proc>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();


                    command.CommandText = @" SELECT
                                             p.name AS ProcedureName
                                            FROM sys.procedures p
                                            JOIN sys.objects o ON p.object_id = o.object_id
                                            JOIN sys.sql_modules m ON p.object_id = m.object_id;";



                    try
                    {

                        SqlDataReader reader1 = command.ExecuteReader();
                        while (reader1.Read())
                        {
                            SqlStored_Proc SqlStored = new SqlStored_Proc();

                            SqlStored.name = reader1["ProcedureName"].ToString();

                            _SqlStored_Proc.Add(SqlStored);
                        }
                    }
                    catch (Exception ex)
                    {

                    }

                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }



            //-------------------------------------------------------------------------------



            return _SqlStored_Proc;


        }

        public List<SqlColumns> GetNameColums_in_Stored(ModelSql rp)
        {

            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;



            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlColumns> columns = new List<SqlColumns>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();


                    command.CommandText = @" EXEC sp_describe_first_result_set N'" + TablesName + "';";



                    try
                    {

                        SqlDataReader reader1 = command.ExecuteReader();
                        while (reader1.Read())
                        {
                            SqlColumns column = new SqlColumns();

                            column.name = reader1["name"].ToString();
                            column.system_type = reader1["system_type_name"].ToString();

                            string _null = reader1["IS_NULLABLE"].ToString();
                            column.is_nullable = _null == "False" ? false : true;

                            columns.Add(column);
                        }
                    }
                    catch (Exception ex)
                    {

                    }

                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }



            //-------------------------------------------------------------------------------



            return columns;


        }
        public List<SqlColumns> GetColumnsTable(ModelSql rp)
        {


            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;




            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlColumns> columns = new List<SqlColumns>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();


                    command.CommandText = @"  SELECT COLUMN_NAME as name , DATA_TYPE as system_type_name , IS_NULLABLE
                                                        FROM INFORMATION_SCHEMA.COLUMNS
                                                        WHERE TABLE_NAME = '" + TablesName + "';";

                    //command.CommandText = @"SELECT  name 
                    //                              , system_type_name , IS_NULLABLE
                    //                        FROM    sys.dm_exec_describe_first_result_set (N' Select Top(1)* from " + TablesName + " ', null, 1) ";

                    try
                    {

                        SqlDataReader reader1 = command.ExecuteReader();
                        while (reader1.Read())
                        {
                            SqlColumns column = new SqlColumns();

                            column.name = reader1["name"].ToString();
                            column.system_type = reader1["system_type_name"].ToString();

                            string _null = reader1["IS_NULLABLE"].ToString();
                            column.is_nullable = _null == "False" ? false : true;

                            columns.Add(column);
                        }
                    }
                    catch (Exception ex)
                    {

                    }

                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }



            //-------------------------------------------------------------------------------



            return columns;


        }

        //************************************ Entities **********************************

        public string Create_Entities(string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine(" class " + Name_Table + " extends CustomClass { ");
            models.AppendLine(Generate_ConstructorEntities(Name_Table, ListColumns));
            models.AppendLine(" }");


            return models.ToString();

        }
        
        public string Create_Entities_React(string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine(" export class " + Name_Table + "  { ");
            models.AppendLine(Generate_ConstructorEntities_React(Name_Table, ListColumns));
            models.AppendLine(" }");


            return models.ToString();

        }


        private string Generate_ConstructorEntities_React(string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();


            models.AppendLine(GenerateTypeColumnsEntities_React(ListColumns));


            return models.ToString();

        }
        private string GenerateTypeColumnsEntities_React(List<SqlColumns> columns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("constructor() {");
            models.AppendLine(" ");
            foreach (SqlColumns column in columns)
            {
                string Field_Class = column.GetColumnValueEntities();

                models.AppendLine(Field_Class);

            }
            models.AppendLine("        this.StatusFlag = '';");


            models.AppendLine(" }");

            foreach (SqlColumns column in columns)
            {
                string Field_Class = column.GetColumnTypeEntities();
                models.AppendLine(Field_Class);
            }
            models.AppendLine("        public StatusFlag: string;");

            return models.ToString();

        }

        private string Generate_ConstructorEntities(string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();


            models.AppendLine(GenerateTypeColumnsEntities(ListColumns));


            return models.ToString();

        }
        private string GenerateTypeColumnsEntities(List<SqlColumns> columns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("constructor() {");
            models.AppendLine("super();");
            foreach (SqlColumns column in columns)
            {
                string Field_Class = column.GetColumnValueEntities();

                models.AppendLine(Field_Class);

            }
            models.AppendLine("        this.StatusFlag = '';");


            models.AppendLine(" }");

            foreach (SqlColumns column in columns)
            {
                string Field_Class = column.GetColumnTypeEntities();
                models.AppendLine(Field_Class);
            }
            models.AppendLine("        public StatusFlag: string;");

            return models.ToString();

        }
        //*************************************** Ts *******************************

        public string Create_ClassResourcesTs(string Name_Table, ModelSql rp)
        {
            StringBuilder models = new StringBuilder();

            List<G_Resources> ListColumns = GetAllResources(rp);

             
            models.AppendLine(" class " + Name_Table);
            models.AppendLine(" {");
            models.AppendLine(Generate_ClassResourcesTs( ListColumns));
            models.AppendLine(" }");


            return models.ToString();

        }

        private string Generate_ClassResourcesTs(List<G_Resources> ListColumns)
        {
            StringBuilder models = new StringBuilder();
 

            models.AppendLine(@" public Lang: string; ");

            foreach (var item in ListColumns)
            { 
                models.AppendLine(@" public " + item.KeyRes + @": string; ");
            }
             
            return models.ToString();

        }

        //*************************************** C# *******************************
        public string Create_ClassResources(string Using_System, string NameSpace, string Name_Table, ModelSql rp)
        {
            StringBuilder models = new StringBuilder();

            List<G_Resources> ListColumns = GetAllResources(rp);


            models.AppendLine(Using_System);
            models.AppendLine(" namespace " + NameSpace);
            models.AppendLine(" {");
            models.AppendLine(Generate_ClassResources(Name_Table, ListColumns));
            models.AppendLine(" }");


            return models.ToString();

        }
        //*************************************** C# *******************************

        public string Create_Class(string Using_System, string NameSpace, string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_System);
            models.AppendLine(" namespace " + NameSpace);
            models.AppendLine(" {");
            models.AppendLine(Generate_Class(Name_Table, ListColumns, true));
            models.AppendLine(" }");


            return models.ToString();

        }

        private string Generate_ClassResources(string Name_Table, List<G_Resources> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("      public partial class " + Name_Table);
            models.AppendLine("     {");

            models.AppendLine(@"public static string Lang {get{return G_System.Language == ""En"" ? @""En"" : ""Ar"";}} ");

            foreach (var item in ListColumns)
            {
                models.AppendLine(@"public static string " + item.KeyRes + @" {get{return G_System.Language == ""En"" ? @""" + item.NameResEn + @""" : @""" + item.NameResAr + @""";}} ");

            }

            models.AppendLine("     public static Dictionary<string, string> GetAllResources()");
            models.AppendLine("     {");
            models.AppendLine("     return typeof(Res).GetProperties(BindingFlags.Public | BindingFlags.Static).Where(prop => prop.PropertyType == typeof(string)).ToDictionary(prop => prop.Name, prop => (string)prop.GetValue(null));");
            models.AppendLine("     }");


            models.AppendLine("     }");

            return models.ToString();

        }


        private string Generate_Class(string Name_Table, List<SqlColumns> ListColumns, bool isTable)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("      public partial class " + Name_Table);
            models.AppendLine(GenerateTypeColumns(ListColumns));

            if (isTable)
            {
                if (Global._Txt_StatusFlag != 1)
                {
                    models.AppendLine("  [NotMapped]");
                    models.AppendLine(@"public char? StatusFlag { get; set; }");
                }
                else
                {
                    models.AppendLine(@"public string StatusFlag { get; set; }");

                }
            }


            models.AppendLine("     }");

            return models.ToString();

        }


        public string Create_Stored(string Using_System, string NameSpace, string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_System);
            models.AppendLine(" namespace " + NameSpace);
            models.AppendLine(" {");
            models.AppendLine(Generate_Class(Name_Table, ListColumns, false));
            models.AppendLine(" }");


            return models.ToString();

        }

        public string Create_Stored_in_Report(string NameSpace, string Name_Table, List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("using System;\r\n ");
            models.AppendLine(" namespace " + NameSpace);
            models.AppendLine(" {");
            models.AppendLine(Generate_Class(Name_Table, ListColumns, false));
            models.AppendLine(" }");


            return models.ToString();

        }


        private string Generate_DataJson(List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            int Frist = 0;
            models.AppendLine("     {");
            foreach (SqlColumns column in ListColumns)
            {
                if (Frist == 0)
                {
                    models.AppendLine(@"""" + column.name + @"""" + ":" + @"""""");
                }
                else
                {
                    models.AppendLine("," + @"""" + column.name + @"""" + ":" + @"""""");

                }

                Frist = 1;
            }
            models.AppendLine("," + @"""StatusFlag""" + ":" + @"""""");

            models.AppendLine("     }");

            return models.ToString();

        }

        private string GenerateTypeColumns(List<SqlColumns> columns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine("     {");
            foreach (SqlColumns column in columns)
            {
                string Field_Class = column.GetColumnType();

                models.AppendLine(Field_Class);

            }


            return models.ToString();

        }

        public string SetG_ProcessTrans()
        {
            string G_ProcessTrans = @"";

            return G_ProcessTrans;
        }
        public string Generate_DbContext(string Name_Class, string using_System_Context, string NameSpace_Context, List<SqlTables> _Tables, string _Source, string _Catalog, string _User, string _Pass)
        {
            ModelSql rp = new ModelSql();
            rp.sqlEnt.Server = _Source;
            rp.sqlEnt.User = _User;
            rp.sqlEnt.Password = _Pass;
            rp.sqlEnt.Database = _Catalog;

            StringBuilder models = new StringBuilder();

            models.AppendLine(using_System_Context);

            models.AppendLine(@"namespace " + NameSpace_Context);
            models.AppendLine(@"{");
            models.AppendLine(@"public partial class " + Name_Class + " : DbContext");
            models.AppendLine(@"{");

            models.AppendLine(@"  public " + Name_Class + @"()
        {
        }");
            models.AppendLine("");

            models.AppendLine(@" public " + Name_Class + "(DbContextOptions<" + Name_Class + @"> options)
            : base(options)
        {
        }");

            foreach (SqlTables table in _Tables)
            {
                models.AppendLine(" public virtual DbSet<" + table.name + "> " + table.name + " { get; set; } ");
            }


            models.AppendLine(SetG_ProcessTrans());

            string optionsBuilder = @"protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
                        {
                                if (!optionsBuilder.IsConfigured)
                                { 
                                    optionsBuilder.UseSqlServer(ConnectionString.connectionString);
                                }
                        }";

            models.AppendLine(optionsBuilder);


            models.AppendLine("protected override void OnModelCreating(ModelBuilder modelBuilder)");
            models.AppendLine("{");
            models.AppendLine(@"          modelBuilder.UseCollation(""Arabic_CI_AS"");");



            foreach (SqlTables table in _Tables)
            {

                models.AppendLine(@"modelBuilder.Entity<" + table.name + @">(entity =>
            {");

                rp.sqlTables.name = table.name;

                List<List_IdTable> IDs_Table = GetId_Table(rp);
                if (IDs_Table.Count > 0)
                {
                    if (IDs_Table.Count == 1)
                    {

                        models.AppendLine(" entity.HasKey(e => e." + IDs_Table[0].ColumnName + "); ");
                    }
                    else
                    {
                        models.AppendLine(" entity.HasKey(e => new {");
                        int frist = 0;
                        foreach (var item in IDs_Table)
                        {
                            if (frist == 0)
                            {
                                models.Append(@"e." + item.ColumnName + "");

                            }
                            else
                            {
                                models.Append(@", e." + item.ColumnName + "");
                            }
                            frist++;
                        }
                        models.Append(@" });");
                    }

                }
                else
                {
                    models.AppendLine(" entity.HasNoKey(); ");
                }

                List<ComputedColumn> list_Column = GetComputedColumn_Table(rp);

                if (list_Column.Count > 0)
                {


                    foreach (var item in list_Column)
                    {
                        models.AppendLine(@" entity.Property(e => e." + item.ColumnName + @").HasComputedColumnSql(""" + item.ComputedColumnDefinition + @""", false);");
                    }

                }

                string CheckIdentity = GetCheckIdentity(rp);
                if (CheckIdentity != null)
                {
                    if (CheckIdentity != "")
                    {
                        models.AppendLine(" entity.Property(e => e." + CheckIdentity + ").ValueGeneratedOnAdd();");

                    }

                }

                models.AppendLine("entity.Ignore(x => x.StatusFlag);");
                models.AppendLine("});");

            }

            models.AppendLine("            OnModelCreatingPartial(modelBuilder);");
            models.AppendLine("}");
            models.AppendLine("");
            models.AppendLine("");
            models.AppendLine(" partial void OnModelCreatingPartial(ModelBuilder modelBuilder);");

            models.AppendLine(" }");
            models.AppendLine("}");
            return models.ToString();

        }


        public string GetCheckIdentity(ModelSql rp)
        {

            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;


            string COLUMN_NAME = "";
            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlColumns> columns = new List<SqlColumns>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();



                    command.CommandText = @"select COLUMN_NAME
                                            from INFORMATION_SCHEMA.COLUMNS
                                            where COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1 and 
                                             TABLE_NAME   = '" + TablesName + "'";


                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {

                        COLUMN_NAME = reader["COLUMN_NAME"].ToString();

                    }



                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }




            return COLUMN_NAME;

            //-------------------------------------------------------------------------------



        }

        public List<List_IdTable> GetId_Table(ModelSql rp)
        {

            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;


            List<List_IdTable> ListID_columns = new List<List_IdTable>();

            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlColumns> columns = new List<SqlColumns>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();


                    command.CommandText = @"SELECT C.COLUMN_NAME, COLUMN_TYPE.DATA_TYPE
                                            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS T
                                            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE C ON C.CONSTRAINT_NAME = T.CONSTRAINT_NAME
                                            JOIN INFORMATION_SCHEMA.COLUMNS COLUMN_TYPE ON COLUMN_TYPE.TABLE_NAME = C.TABLE_NAME AND COLUMN_TYPE.COLUMN_NAME = C.COLUMN_NAME
                                            WHERE
                                                C.TABLE_NAME = '" + TablesName + @"' AND
                                                T.CONSTRAINT_TYPE = 'PRIMARY KEY';";

                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {
                        List_IdTable IDcolumn = new List_IdTable();
                        IDcolumn.ColumnName = reader["COLUMN_NAME"].ToString();
                        IDcolumn.ColumnType = reader["DATA_TYPE"].ToString();

                        ListID_columns.Add(IDcolumn);
                    }


                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }


            return ListID_columns;

            //-------------------------------------------------------------------------------



        }


        public List<G_Resources> GetAllResources(ModelSql rp)
        {

            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;


            List<G_Resources> ListID_columns = new List<G_Resources>();

            //-------------------------------------------------------------------------------


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();


                    command.CommandText = @"Select  IDRes, KeyRes, NameResEn, NameResAr, [Custom] from [dbo].[G_Resources] ";

                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {
                        G_Resources IDcolumn = new G_Resources();
                        IDcolumn.IDRes = Convert.ToInt16(reader["IDRes"]);
                        IDcolumn.KeyRes = reader["KeyRes"].ToString();
                        IDcolumn.NameResEn = reader["NameResEn"].ToString();
                        IDcolumn.NameResAr = reader["NameResAr"].ToString();
                        IDcolumn.Custom = reader["Custom"].ToString();

                        ListID_columns.Add(IDcolumn);
                    }


                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }


            return ListID_columns;

            //-------------------------------------------------------------------------------



        }


        public List<ComputedColumn> GetComputedColumn_Table(ModelSql rp)
        {

            db.Server = rp.sqlEnt.Server;
            db.Database = rp.sqlEnt.Database;
            db.User = rp.sqlEnt.User;
            db.Password = rp.sqlEnt.Password;
            string TablesName = rp.sqlTables.name;

            List<ComputedColumn> Comp_columns = new List<ComputedColumn>();


            //-------------------------------------------------------------------------------


            StringBuilder models = new StringBuilder();

            List<SqlColumns> columns = new List<SqlColumns>();


            using (SqlConnection connection = new SqlConnection("Data source = " + db.Server + " ; Initial catalog = " + db.Database + " ; User id = " + db.User + "; Password = " + db.Password + ";"))
            {
                using (SqlCommand command = new SqlCommand())
                {


                    //----------------------------------------------------get Table columns name--------------------------
                    command.Connection = connection;
                    connection.Open();



                    command.CommandText = @"	SELECT  
                                                    c.name AS ColumnName,
                                                    cc.definition AS ComputedColumnDefinition
                                                FROM 
                                                    sys.tables t
                                                JOIN 
                                                    sys.computed_columns cc ON t.object_id = cc.object_id
                                                JOIN 
                                                    sys.columns c ON cc.object_id = c.object_id AND cc.column_id = c.column_id
                                                WHERE 
                                                    t.name = '" + TablesName + "';";



                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {
                        ComputedColumn column = new ComputedColumn();
                        column.ColumnName = reader["ColumnName"].ToString();
                        column.ComputedColumnDefinition = reader["ComputedColumnDefinition"].ToString();

                        Comp_columns.Add(column);
                    }


                    connection.Close();
                    //---------------------------------------------------------------------------------------------------------------


                }


            }


            return Comp_columns;

            //-------------------------------------------------------------------------------



        }




        public string Generate_Interface(string Using_IServices, string NameSpace_IServices, List<SqlTables> _Tables, string _Source, string _Catalog, string _User, string _Pass)
        {
            ModelSql rp = new ModelSql();
            rp.sqlEnt.Server = _Source;
            rp.sqlEnt.User = _User;
            rp.sqlEnt.Password = _Pass;
            rp.sqlEnt.Database = _Catalog;

            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_IServices);

            models.AppendLine(@"namespace " + NameSpace_IServices);
            models.AppendLine(@"{");
            models.AppendLine(@" public interface _Interface ");
            models.AppendLine(@"{");


            foreach (SqlTables table in _Tables)
            {
                models.AppendLine(" " + table.name + " Insert" + table.name + "(" + table.name + " entity); ");

                rp.sqlTables.name = table.name;

                List<List_IdTable> IDs_Table = GetId_Table(rp);
                if (IDs_Table.Count > 0)
                {
                    models.AppendLine(" " + table.name + " Update" + table.name + "(" + table.name + " entity); ");


                    if (IDs_Table.Count == 1)
                    {
                        string Type = ReturnColumnType(IDs_Table[0].ColumnType);

                        models.AppendLine(" void Delete" + table.name + "(" + Type + "  " + IDs_Table[0].ColumnName + "); ");

                    }
                    else
                    {

                        int frist = 0;
                        string prams = "";
                        foreach (var item in IDs_Table)
                        {
                            string _Type = ReturnColumnType(item.ColumnType);

                            if (frist == 0)
                            {
                                prams = " " + _Type + " " + item.ColumnName + "";

                            }
                            else
                            {
                                prams = prams + "," + _Type + " " + item.ColumnName + "";
                            }
                            frist++;
                        }

                        models.AppendLine(" void Delete" + table.name + "(" + prams + "); ");

                    }
                }

            }




            models.AppendLine(@"}");
            models.AppendLine(@"");
            models.AppendLine(@"}");




            return models.ToString();

        }




        public string Generate_IServices(string Name_Class, string Using_IServices, string NameSpace_IServices, List<SqlTables> _Tables, string _Source, string _Catalog, string _User, string _Pass)
        {
            ModelSql rp = new ModelSql();
            rp.sqlEnt.Server = _Source;
            rp.sqlEnt.User = _User;
            rp.sqlEnt.Password = _Pass;
            rp.sqlEnt.Database = _Catalog;

            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_IServices);

            models.AppendLine(@"namespace " + NameSpace_IServices);
            models.AppendLine(@"{");
            models.AppendLine(@"  public class _Service : _Interface  ");
            models.AppendLine(@"{");

            models.AppendLine(Name_Class + " db;");

            models.AppendLine("  public _Service(" + Name_Class + " _db) ");
            models.AppendLine(@"{");
            models.AppendLine(@" this.db = _db;");
            models.AppendLine(@"}");


            foreach (SqlTables table in _Tables)
            {

                //******************************************************Insert**************************

                models.AppendLine(" public " + table.name + " Insert" + table.name + "(" + table.name + " Tbl) ");
                models.AppendLine(@"{");

                rp.sqlTables.name = table.name;
                string CheckIdentity = GetCheckIdentity(rp);

                if (CheckIdentity != null)
                {
                    if (CheckIdentity != "")
                    {
                        models.AppendLine(@"Tbl." + CheckIdentity + " = null ;");


                    }

                }

                models.AppendLine(@" var Res = db.Add(Tbl).Entity;");
                models.AppendLine(@"  db.SaveChanges();");
                models.AppendLine(@"  return Res;");

                models.AppendLine(@"}");


                //******************************************************Update**************************


                models.AppendLine(" public " + table.name + " Update" + table.name + "(" + table.name + " Tbl) ");
                models.AppendLine(@"{");

                models.AppendLine(@" var Res = db.Update(Tbl).Entity;");
                models.AppendLine(@"  db.SaveChanges();");
                models.AppendLine(@"  return Res;");

                models.AppendLine(@"}");


                //******************************************************Delete**************************

                rp.sqlTables.name = table.name;

                List<List_IdTable> IDs_Table = GetId_Table(rp);
                if (IDs_Table.Count > 0)
                {


                    if (IDs_Table.Count == 1)
                    {
                        string Type = ReturnColumnType(IDs_Table[0].ColumnType);

                        models.AppendLine("public void Delete" + table.name + "(" + Type + "  " + IDs_Table[0].ColumnName + ") ");
                        models.AppendLine(@"   {");

                        models.AppendLine(@" var Deleted = db.Set<" + table.name + ">().Find(" + IDs_Table[0].ColumnName + ");");

                    }
                    else
                    {

                        int frist = 0;
                        string prams = "";
                        string _ColumnName = "";
                        foreach (var item in IDs_Table)
                        {
                            string _Type = ReturnColumnType(item.ColumnType);

                            if (frist == 0)
                            {
                                prams = " " + _Type + " " + item.ColumnName + "";
                                _ColumnName = " " + item.ColumnName + "";

                            }
                            else
                            {
                                prams = prams + "," + _Type + " " + item.ColumnName + "";
                                _ColumnName = _ColumnName + " , " + item.ColumnName + "";
                            }
                            frist++;
                        }

                        models.AppendLine("  public void Delete" + table.name + "(" + prams + ") ");
                        models.AppendLine(@"   {");

                        models.AppendLine(@" var Deleted = db.Set<" + table.name + ">().Find(" + _ColumnName + ");");


                    }


                    models.AppendLine(@"    if (Deleted != null)");
                    models.AppendLine(@"   {");
                    models.AppendLine(@"        db.Set<" + table.name + ">().Remove(Deleted);");
                    models.AppendLine(@"        db.SaveChanges();");
                    models.AppendLine(@"    }");
                    models.AppendLine(@"}");


                }



                //**************************************************************************************




            }




            models.AppendLine(@"}");
            models.AppendLine(@"");
            models.AppendLine(@"}");




            return models.ToString();

        }





        //**********************************************TextFile***************************************
        public string Generate_InterfaceTextFile(string Using_IServices, string NameSpace_IServices, List<SqlTables> _Tables, string _Source, string _Catalog, string _User, string _Pass)
        {
            ModelSql rp = new ModelSql();
            rp.sqlEnt.Server = _Source;
            rp.sqlEnt.User = _User;
            rp.sqlEnt.Password = _Pass;
            rp.sqlEnt.Database = _Catalog;

            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_IServices);

            models.AppendLine(@"namespace " + NameSpace_IServices);
            models.AppendLine(@"{");
            models.AppendLine(@" public interface _Interface ");
            models.AppendLine(@"{");


            foreach (SqlTables table in _Tables)
            {
                models.AppendLine(" List<" + table.name + ">  GetAll_" + table.name + @"( string? Condition = """" ); ");

                models.AppendLine(" " + table.name + " Insert" + table.name + "(" + table.name + @" entity , string? Condition = """" ); ");

                rp.sqlTables.name = table.name;

                List<List_IdTable> IDs_Table = GetId_Table(rp);
                if (IDs_Table.Count > 0)
                {
                    models.AppendLine(" " + table.name + " Update" + table.name + "(" + table.name + @" entity , string? Condition = """"); ");


                    if (IDs_Table.Count == 1)
                    {
                        string Type = ReturnColumnType(IDs_Table[0].ColumnType);

                        models.AppendLine(" void Delete" + table.name + "(" + Type + "  " + IDs_Table[0].ColumnName + @" , string? Condition = """" ); ");

                    }
                    else
                    {

                        int frist = 0;
                        string prams = "";
                        foreach (var item in IDs_Table)
                        {
                            string _Type = ReturnColumnType(item.ColumnType);

                            if (frist == 0)
                            {
                                prams = " " + _Type + " " + item.ColumnName + "";

                            }
                            else
                            {
                                prams = prams + "," + _Type + " " + item.ColumnName + "";
                            }
                            frist++;
                        }

                        models.AppendLine(" void Delete" + table.name + "(" + prams + @" , string? Condition = """"); ");

                    }
                }

            }




            models.AppendLine(@"string GetData(string Name_txt = """");");
            models.AppendLine(@"void SetData(string Name_txt = """" , string Model ="""");");
            models.AppendLine(@"}");
            models.AppendLine(@"");
            models.AppendLine(@"}");




            return models.ToString();

        }




        public string Generate_IServicesTextFile(string Name_Class, string Using_IServices, string NameSpace_IServices, List<SqlTables> _Tables, string _Source, string _Catalog, string _User, string _Pass)
        {
            ModelSql rp = new ModelSql();
            rp.sqlEnt.Server = _Source;
            rp.sqlEnt.User = _User;
            rp.sqlEnt.Password = _Pass;
            rp.sqlEnt.Database = _Catalog;

            StringBuilder models = new StringBuilder();

            models.AppendLine(Using_IServices);

            models.AppendLine(@"namespace " + NameSpace_IServices);
            models.AppendLine(@"{");
            models.AppendLine(@"  public class _Service : _Interface  ");
            models.AppendLine(@"{");

            models.AppendLine(Name_Class + " db;");
            models.AppendLine(" private readonly IWebHostEnvironment _hostingEnvironment;");

            models.AppendLine("  public _Service(" + Name_Class + " _db , IWebHostEnvironment hostingEnvironment) ");
            models.AppendLine(@"{");
            models.AppendLine(@" this.db = _db;");
            models.AppendLine(@" _hostingEnvironment = hostingEnvironment;");
            models.AppendLine(@"}");


            foreach (SqlTables table in _Tables)
            {

                //******************************************************GetAllData**************************

                models.AppendLine(" public List<" + table.name + "> GetAll_" + table.name + @"( string? Condition = """") ");
                models.AppendLine(@"{");

                models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");

                models.AppendLine(@"var jsonData = GetData(""" + table.name + @""" + Condition);");

                models.AppendLine(@"  List<" + table.name + @"> Data_List = new List<" + table.name + @">();");

                models.AppendLine(@"  if (jsonData.Trim() != """")");
                models.AppendLine(@"  {");

                models.AppendLine(@"  Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                models.AppendLine(@"  }");

                models.AppendLine(@"return Data_List;");

                models.AppendLine(@"}");


                //******************************************************Insert**************************

                models.AppendLine(" public " + table.name + " Insert" + table.name + "(" + table.name + @" Tbl , string? Condition = """") ");
                models.AppendLine(@"{");

                models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");


                models.AppendLine(@"var jsonData = GetData(""" + table.name + @""" + Condition);");

                models.AppendLine(@"  List<" + table.name + @"> Data_List = new List<" + table.name + @">();");

                models.AppendLine(@"  if (jsonData.Trim() != """")");
                models.AppendLine(@"  {");

                models.AppendLine(@"  Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                models.AppendLine(@"  }");

                rp.sqlTables.name = table.name;
                string CheckIdentity = GetCheckIdentity(rp);

                if (CheckIdentity != null)
                {
                    if (CheckIdentity != "")
                    {

                        //models.AppendLine(@"  if (Data_List.Count > 0)");
                        //models.AppendLine(@"  {");
                        //models.AppendLine(@"  Tbl." + CheckIdentity + @" = (Data_List[Data_List.Count() - 1]." + CheckIdentity + @" + 1);");
                        //models.AppendLine(@"  }");
                        //models.AppendLine(@"  else");
                        //models.AppendLine(@"  {");
                        //models.AppendLine(@"  Tbl." + CheckIdentity + @" = 1;");
                        //models.AppendLine(@"  }");

                        models.AppendLine(@" Random random = new Random();");
                        models.AppendLine(@" int randomNumber = random.Next();");

                        models.AppendLine(@"  Tbl." + CheckIdentity + @" = randomNumber;");
                    }

                }

                models.AppendLine(@"  Data_List.Add(Tbl);");
                models.AppendLine(@"  var New_Data = JsonConvert.SerializeObject(Data_List);");

                models.AppendLine(@"  SetData(""" + table.name + @""" + Condition, New_Data);");

                models.AppendLine(@"   return Tbl;");

                models.AppendLine(@"}");


                //******************************************************Update**************************



                rp.sqlTables.name = table.name;

                List<List_IdTable> IDs_Table = GetId_Table(rp);
                if (IDs_Table.Count > 0)
                {



                    if (IDs_Table.Count == 1)
                    {
                        string Type = ReturnColumnType(IDs_Table[0].ColumnType);

                        models.AppendLine(" public " + table.name + " Update" + table.name + "(" + table.name + @" Tbl , string? Condition = """") ");
                        models.AppendLine(@"   {");

                        models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");

                        models.AppendLine(@"  var jsonData = GetData(""" + table.name + @""" + Condition);");

                        models.AppendLine(@"List<" + table.name + @"> Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                        models.AppendLine(@"List<" + table.name + @"> NewList = new List<" + table.name + @">();");

                        models.AppendLine(@"if (Data_List != null)");

                        models.AppendLine(@"{");

                        models.AppendLine(@"   NewList = Data_List.Where(x => x." + IDs_Table[0].ColumnName + " != Tbl." + IDs_Table[0].ColumnName + ").ToList();");

                        models.AppendLine(@"}");

                    }
                    else
                    {


                        int frist = 0;
                        string prams = "";
                        string _ColumnName = "";
                        foreach (var item in IDs_Table)
                        {
                            string _Type = ReturnColumnType(item.ColumnType);

                            if (frist == 0)
                            {
                                prams = " " + _Type + " " + item.ColumnName + "";
                                _ColumnName = "x." + item.ColumnName + " != Tbl." + item.ColumnName + "";

                            }
                            else
                            {
                                prams = prams + "," + _Type + " " + item.ColumnName + "";
                                _ColumnName = _ColumnName + " && " + "x." + item.ColumnName + " != Tbl." + item.ColumnName + "";
                            }
                            frist++;
                        }

                        models.AppendLine(" public " + table.name + " Update" + table.name + "(" + table.name + @" Tbl , string? Condition = """") ");
                        models.AppendLine(@"   {");

                        models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");


                        models.AppendLine(@"  var jsonData = GetData(""" + table.name + @""" + Condition);");

                        models.AppendLine(@"List<" + table.name + @"> Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                        models.AppendLine(@"List<" + table.name + @"> NewList = new List<" + table.name + @">();");

                        models.AppendLine(@"if (Data_List != null)");

                        models.AppendLine(@"{");

                        models.AppendLine(@"   NewList = Data_List.Where(x => " + _ColumnName + ").ToList();");

                        models.AppendLine(@"}");



                    }



                    models.AppendLine(@"  NewList.Add(Tbl);");

                    models.AppendLine(@"  var New_Data = JsonConvert.SerializeObject(NewList);");

                    models.AppendLine(@"  SetData(""" + table.name + @""" + Condition, New_Data);");

                    models.AppendLine(@"   return Tbl;");

                    models.AppendLine(@"}");



                    //******************************************************Delete**************************

                    rp.sqlTables.name = table.name;

                    IDs_Table = GetId_Table(rp);
                    if (IDs_Table.Count > 0)
                    {



                        if (IDs_Table.Count == 1)
                        {
                            string Type = ReturnColumnType(IDs_Table[0].ColumnType);

                            models.AppendLine("public void Delete" + table.name + "(" + Type + "  " + IDs_Table[0].ColumnName + @" , string? Condition = """") ");
                            models.AppendLine(@"   {");

                            models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");

                            models.AppendLine(@"  var jsonData = GetData(""" + table.name + @""" + Condition);");

                            models.AppendLine(@"List<" + table.name + @"> Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                            models.AppendLine(@"  var NewList = Data_List.Where(x => x." + IDs_Table[0].ColumnName + " != " + IDs_Table[0].ColumnName + ").ToList();");
                        }
                        else
                        {

                            int frist = 0;
                            string prams = "";
                            string _ColumnName = "";
                            foreach (var item in IDs_Table)
                            {
                                string _Type = ReturnColumnType(item.ColumnType);

                                if (frist == 0)
                                {
                                    prams = " " + _Type + " " + item.ColumnName + "";
                                    _ColumnName = "x." + item.ColumnName + " != " + item.ColumnName + "";

                                }
                                else
                                {
                                    prams = prams + "," + _Type + " " + item.ColumnName + "";
                                    _ColumnName = _ColumnName + " && " + "x." + item.ColumnName + " != " + item.ColumnName + "";
                                }
                                frist++;
                            }

                            models.AppendLine("  public void Delete" + table.name + "(" + prams + @" , string? Condition = """") ");
                            models.AppendLine(@"   {");

                            models.AppendLine(@"Condition = Condition.Trim() != """" ? ""_"" + Condition.Trim() : """";");


                            models.AppendLine(@"  var jsonData = GetData(""" + table.name + @""" + Condition);");

                            models.AppendLine(@"List<" + table.name + @"> Data_List = JsonConvert.DeserializeObject<List<" + table.name + @">>(jsonData);");

                            models.AppendLine(@"  var NewList = Data_List.Where(x => " + _ColumnName + ").ToList();");


                        }



                        models.AppendLine(@"  var New_Data = JsonConvert.SerializeObject(NewList);");

                        models.AppendLine(@"  SetData(""" + table.name + @""" + Condition, New_Data);");

                        models.AppendLine(@"}");


                    }



                    //**************************************************************************************




                }






            }

            models.AppendLine(@" public string GetData(string Name_txt)
        {
              
            string jsonData = """";

            try
            {

                string Path_Url = ConnectionString.PathSaveData;

                string serverPath = GetServerPath(Path_Url); // Specify the server location to save the file

                string fileName = Name_txt + "".txt"";
                string filePath = Path.Combine(serverPath, fileName);
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));

                 if (System.IO.File.Exists(filePath))
                {
                    jsonData = System.IO.File.ReadAllText(filePath);
                }
                else
                {
                    string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;

                    // Combine the current directory and the file name to get the full path
                      filePath = Path.Combine(serverPath, fileName);

                    using (StreamWriter writer = new StreamWriter(filePath))
                    {
                        writer.WriteLine(""""); 
                    }

                    jsonData = System.IO.File.ReadAllText(filePath);

                }
            }
            catch (Exception)
            {
                return ""Error"";
            }

            string base64Decoded = """";
            try
            {
                //byte[] data = Convert.FromBase64String(jsonData);
                //base64Decoded = Encoding.UTF8.GetString(data);

                 base64Decoded = DecompressString(jsonData);

            }
            catch (Exception)
            {
                return ""Error decoding base64"";
            }

            return base64Decoded;




        }");
            models.AppendLine(@" public void SetData(string Name_txt, string Model)
        {

            string originalString = Model;

            //byte[] bytes = Encoding.UTF8.GetBytes(originalString);

            //string base64EncodedString = Convert.ToBase64String(bytes);

            string base64EncodedString = CompressString(originalString);

            string Path_Url = ConnectionString.PathSaveData; 

            string serverPath = GetServerPath(Path_Url); // Specify the server location to save the file
             
            string fileName = Name_txt + "".txt"";
            string filePath = Path.Combine(serverPath, fileName);

            // Ensure that the directory exists before writing the file
            Directory.CreateDirectory(Path.GetDirectoryName(filePath));

             if (System.IO.File.Exists(filePath))
            {
                System.IO.File.WriteAllText(filePath, base64EncodedString);

            }
            else
            {
                string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;

                // Combine the current directory and the file name to get the full path
                filePath = Path.Combine(serverPath, fileName);

                using (StreamWriter writer = new StreamWriter(filePath))
                {
                    writer.WriteLine("""");
                }

                System.IO.File.WriteAllText(filePath, base64EncodedString);


            }


        }");

            models.AppendLine(@"        public string GetServerPath(string virtualPath)
        {
            // Map the virtual path to the physical path
            string physicalPath = Path.Combine(_hostingEnvironment.WebRootPath, virtualPath.TrimStart('/').Replace(""/"", Path.DirectorySeparatorChar.ToString()));

            return physicalPath;
        }");

            models.AppendLine(@" public string CompressString(string input)
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
        }");

            models.AppendLine(@"public string DecompressString(string compressedString)
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
        }");
            models.AppendLine(@"}");
            models.AppendLine(@"");
            models.AppendLine(@"}");




            return models.ToString();
        }




        public string Create_Json(List<SqlColumns> ListColumns)
        {
            StringBuilder models = new StringBuilder();

            models.AppendLine(" [");

            models.AppendLine(Generate_DataJson(ListColumns));

            models.AppendLine(" ]");


            return models.ToString();

        }

        public string ReturnColumnType(string type)
        {
            string result = "string";
            switch (type)
            {
                case "nvarchar":
                case "varchar":
                case "nchar":
                case "varbinary":
                    result = "string";
                    break;

                case "int":
                    result = "int";
                    break;

                case "bitint":
                case "smallint":
                case "tinyint":
                    result = "byte";
                    break;

                case "numeric":
                case "decimal":
                case "float":
                    result = "decimal";
                    break;

                case "bit":
                    result = "bool";
                    break;

                case "bigint":
                    result = "long";
                    break;

                case "time":
                    result = "TimeSpan";
                    break;

                case "datetime":
                case "smalldatetime":
                case "date":
                    result = "DateTime";
                    break;

                default:
                    result = "any";
                    break;
            }

            return result;

        }

    }
}
