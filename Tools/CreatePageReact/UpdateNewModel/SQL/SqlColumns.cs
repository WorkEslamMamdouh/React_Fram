
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{
    public class SqlColumns
    {
        public int object_id { get; set; }
        public string name { get; set; }
        public int column_id { get; set; }
        public int system_type_id { get; set; }
        public string system_type { get; set; }
        public bool is_nullable { get; set; }
    }
}
