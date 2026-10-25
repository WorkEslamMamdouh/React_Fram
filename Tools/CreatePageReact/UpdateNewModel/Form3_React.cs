using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using UpdateNewModel.SQL;

namespace UpdateNewModel
{
    public partial class Form3_React : Form
    {
        public Form3_React()
        {
            InitializeComponent();
        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        CreateFormat_Html_Tsx _CreateFormat_Html_Tsx = new CreateFormat_Html_Tsx();
        CreateShit_TS _CreateShit_TS = new CreateShit_TS();
        CreateFormat_StyleEN_OR_AR _CreateFormat_StyleEN_OR_AR = new CreateFormat_StyleEN_OR_AR();
        CreateJson_Resources _CreateJson_Resources = new CreateJson_Resources();
        Save_File save_File = new Save_File();



        private void Form3_React_Load(object sender, EventArgs e)
        {

        }

        private async void Generate_Files_Module_Click(object sender, EventArgs e)
        {

            Area_HtmlReact_tsx.Text = await _CreateFormat_Html_Tsx.Set_Area_HtmlReact_tsx(Area_PageHtml.Text , Name_ModuleCode.Text);
            Area_TS_React.Text = await _CreateShit_TS.CreateShit_Serves_TS(Area_PageHtml.Text, Name_ModuleCode.Text); 
            Area_StyleEN.Text = await _CreateFormat_StyleEN_OR_AR.ConvertFormat_CSS_StyleEN(Area_PageHtml.Text);
            Area_StyleAR.Text = await _CreateFormat_StyleEN_OR_AR.ConvertFormat_CSS_StyleAR(Area_PageHtml.Text); 
            Area_Resources.Text = await _CreateJson_Resources.CreateJson_ResourcesTxt(Area_PageHtml.Text);

            MessageBox.Show("Done ✔️");
        }
         

        private void Save_Files_Module_Click(object sender, EventArgs e)
        {

            save_File.Save(Path_ClientApp.Text+ "/app/ClientApp/" + Name_ModuleCode.Text +"/", Area_HtmlReact_tsx.Text, "page.tsx");
            save_File.Save(Path_ClientApp.Text + "/app/ClientApp/" + Name_ModuleCode.Text +"/", "", Name_ModuleCode.Text + ".module.css");
            save_File.Save(Path_ClientApp.Text + "/app/ClientApp/" + Name_ModuleCode.Text +"/", Area_TS_React.Text, Name_ModuleCode.Text+".ts");


            save_File.Save(Path_ClientApp.Text + "/public/StyleDesign/Pages/" + Name_ModuleCode.Text + "/", Area_StyleEN.Text, Name_ModuleCode.Text+ "EN.css");
            save_File.Save(Path_ClientApp.Text + "/public/StyleDesign/Pages/" + Name_ModuleCode.Text + "/", Area_StyleAR.Text, Name_ModuleCode.Text+"AR.css");

            MessageBox.Show("Done ✔️");
        }

        private async void GenerateStyle_En_Or_Ar_Click(object sender, EventArgs e)
        {
            string Styles = Area_PageHtml.Text.Trim().Replace("<style>", "");
              Styles = Styles.Trim().Replace("</style>", "");

            Styles = "<style>" + Styles + "</style>"; 
             
            Area_StyleAR.Text = await _CreateFormat_StyleEN_OR_AR.ConvertFormat_CSS_StyleAR(Styles);
            Area_Model_.SelectTab("StyleAR");

        }

        private async void button1_Click(object sender, EventArgs e)
        {
            string Styles = Area_PageHtml.Text.Trim().Replace("<style>", "");
            Styles = Styles.Trim().Replace("</style>", "");

            Styles = "<style>" + Styles + "</style>";

            Area_StyleEN.Text = await _CreateFormat_StyleEN_OR_AR.ConvertFormat_CSS_StyleEN(Styles);

            Area_Model_.SelectTab("StyleEN");
        }

        private void button2_Click(object sender, EventArgs e)
        {

            Form1 Form1 = new Form1();
            Form1.Show();
        }
    }
}
