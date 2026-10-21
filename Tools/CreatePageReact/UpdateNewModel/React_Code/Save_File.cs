
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace UpdateNewModel.SQL
{
    public   class Save_File
    {
        public void Save(string filePath, string Data, string NameFile)
        {
            filePath = filePath.Replace("//", "\\");
            filePath = filePath.Replace("/", "\\");

            string filePath_NameFile = filePath;

            Directory.CreateDirectory(filePath_NameFile);
            string filePath_NameFileNew = filePath_NameFile + "\\" + NameFile;

            filePath_NameFileNew = filePath_NameFileNew.Replace("//", "\\");
            filePath_NameFileNew = filePath_NameFileNew.Replace("/", "\\");

            File.WriteAllText(filePath_NameFileNew, Data);
        }

    }
}
