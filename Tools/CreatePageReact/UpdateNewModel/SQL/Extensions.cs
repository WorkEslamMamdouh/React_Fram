
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{
    public static class Extensions
    {
        public static List<T> ToList<T>(this DataTable source)
        {
            var genericType = typeof(T);
            List<T> finalResult = new List<T>();
            foreach (DataRow row in source.Rows)
            {
                var result = Activator.CreateInstance(genericType);
                foreach (DataColumn column in source.Columns)
                {
                    var property = genericType.GetProperty(column.ColumnName);
                    if (property == null)
                        continue;
                    var value = row[column].ToString();
                    List<object> parameters = new List<object>();
                    parameters.Add(value.ToPropertyType(property));
                    property.GetSetMethod().Invoke(result, parameters.ToArray());
                }
                finalResult.Add((T)result);
            }

            return finalResult;
        }


        public static object ToPropertyType(this object source, PropertyInfo property)
        {

            string name = property.PropertyType.Name.ToLower();
            object result = null;
            switch (name)
            {
                case "string":
                    result = source.ToString();
                    break;
                case "int32":
                    result = int.Parse(source.ToString());
                    break;
                case "bool":
                    result = (bool)result;
                    break;
                default:
                    break;
            }

            return result;
        }




        public static string ReturnColumnType(string type)
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

        public static string GetColumnType(this SqlColumns column)
        {

            string system_type = column.system_type;
            int idx = system_type.LastIndexOf('(');
            string type = "";
            if (idx != -1)
            {
                type = system_type.Substring(0, idx);
            }
            else
            {
                type = system_type;
            }
            type = type.Trim();
            string result = "string";
            result = ReturnColumnType(type);


            if (result != "string")
            {
                bool is_nullable = column.is_nullable;
                result = is_nullable == true ? result + "?" : result;
            }

            string lineFild = "";

            lineFild = "        public" + "  " + result + "  " + column.name + "  { get; set; }";

            return lineFild;
        }


        public static string ColumnTypeInsert(this SqlColumns column, SqlEntities db)
        {

            string system_type = column.system_type;
            int idx = system_type.LastIndexOf('(');
            string type = "";
            if (idx != -1)
            {
                type = system_type.Substring(0, idx);
            }
            else
            {
                type = system_type;
            }

            string result = "string";
            switch (type)
            {
                case "nvarchar":
                case "varchar":
                    result = "string";
                    break;

                case "int":
                case "bitint":
                case "smallint":
                case "tinyint":
                case "numeric":
                case "decimal":
                case "float":
                    result = "number";
                    break;

                case "bit":
                    result = "boolean";
                    break;

                //case "datetime":
                //case "smalldatetime":
                //case "date":
                //case "time":
                //    result = "string";
                //    break;
                default:
                    result = "any";
                    break;
            }

            return result;
        }


        public static string ColumnTypeGetEttit(this SqlColumns column, SqlEntities db)
        {

            string system_type = column.system_type;
            int idx = system_type.LastIndexOf('(');
            string type = "";
            if (idx != -1)
            {
                type = system_type.Substring(0, idx);
            }
            else
            {
                type = system_type;
            }

            string result = "string";
            switch (type)
            {
                case "nvarchar":
                case "varchar":
                    result = "string";
                    break;

                case "int":
                case "bitint":
                case "smallint":
                case "tinyint":
                case "numeric":
                case "decimal":
                case "float":
                    result = "number";
                    break;

                case "bit":
                    result = "boolean";
                    break;

                case "datetime":
                case "smalldatetime":
                case "date":
                case "time":
                    result = "date";
                    break;
                default:
                    result = "string";
                    break;
            }

            return result;
        }




        public static string ColumnType(this SqlColumns column, SqlEntities db)
        {
            var type = db.SqlTypes.Where(f => f.system_type_id == column.system_type_id && f.name != "").FirstOrDefault();
            string result = "string";
            string name = "";
            if (type == null)
            {
                name = column.system_type;
            }
            else
            {
                name = type.name;
            }
            try
            {
                switch (name)
                {
                    case "nvarchar":
                    case "varchar":
                    case "nvarchar(30)":
                    case "nvarchar(15)":
                    case "nvarchar(10)":
                    case "nvarchar(50)":
                    case "nvarchar(100)":
                    case "nvarchar(200)":
                        result = "string";
                        break;

                    case "int":
                    case "bitint":
                    case "smallint":
                    case "tinyint":
                    case "numeric":
                    case "decimal":
                    case "float":
                        result = "number";
                        break;

                    case "bit":
                        result = "boolean";
                        break;

                    case null:
                        result = "any";
                        break;

                    case "datetime":
                    case "smalldatetime":
                    case "date":
                    case "time":
                        result = "string";
                        break;
                    default:
                        result = "any";
                        break;
                }
            }
            catch (Exception Ex)
            {

                return "any";

            }


            return result;
        }

        public static string ColumnType(this DataColumn column)
        {
            string typeName = column.DataType.Name.ToLower();
            string result = "string";
            switch (typeName)
            {
                case "string":
                    result = "string";
                    break;

                case "int32":
                case "int64":
                case "short":
                case "int16":
                case "decimal":
                case "double":
                case "float":
                    result = "number";
                    break;

                case "boolean":
                    result = "boolean";
                    break;

                case "datetime":
                case "smalldatetime":
                case "date":
                case "time":
                    result = "string";
                    break;
                default:
                    result = "any";
                    break;
            }
            return result;
        }



        public static string ReturnColumnTypeEntities(string type)
        {
            string result = "string";
            switch (type)
            {
                case "nvarchar":
                case "varchar":
                    result = "string";
                    break;

                case "int":
                case "bitint":
                case "smallint":
                case "tinyint":
                case "numeric":
                case "decimal":
                case "float":
                    result = "number";
                    break;

                case "bit":
                    result = "boolean";
                    break;

                case "datetime":
                case "smalldatetime":
                case "date":
                case "time":
                    result = "string";
                    break;

                default:
                    result = "any";
                    break;
            }

            return result;

        }

        public static string GetColumnValueEntities(this SqlColumns column)
        {

            string system_type = column.system_type;
            int idx = system_type.LastIndexOf('(');
            string type = "";
            if (idx != -1)
            {
                type = system_type.Substring(0, idx);
            }
            else
            {
                type = system_type;
            }
            type = type.Trim();
            string result = "string";
            result = ReturnColumnTypeEntities(type);

            string res_Value = "";

            if (result == "string")
            {
                res_Value = "''";
            }
            else if (result == "number")
            {
                res_Value = "0";
            }
            else if (result == "boolean")
            {
                res_Value = "false";
            }
            else if (result == "boolean")
            {
                res_Value = "false";
            }
            else if (result == "any")
            {
                res_Value = "null";
            }

            return "        this." + column.name + "= " + res_Value + ";";
        }

        public static string GetColumnTypeEntities(this SqlColumns column)
        {

            string system_type = column.system_type;
            int idx = system_type.LastIndexOf('(');
            string type = "";
            if (idx != -1)
            {
                type = system_type.Substring(0, idx);
            }
            else
            {
                type = system_type;
            }
            type = type.Trim();
            string result = "string";
            result = ReturnColumnTypeEntities(type);


            return "        public " + column.name + ": " + result + " ;";

        }

    }
}
