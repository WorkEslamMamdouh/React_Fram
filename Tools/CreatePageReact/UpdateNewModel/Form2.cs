using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO.Compression;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using UpdateNewModel.SQL;
using System.Threading;

namespace UpdateNewModel
{
    public partial class Form2 : Form
    {
        private List<JObject> jsonData = new List<JObject>();

        public Form2()
        {
            InitializeComponent();
        }
        int isnull = 0;

        private void PopulateComboBoxWithTextFiles(string folderPath)
        {
            db_Name_Table.Items.Clear();
            db_Name_File.Items.Clear();
            list_Name_File.Items.Clear();

            try
            {
                // Check if the specified folder exists
                if (Directory.Exists(folderPath))
                {
                    // Get all text files in the folder
                    string[] textFiles = Directory.GetFiles(folderPath, "*.txt");

                    // Bind the file names to the ComboBox

                    db_Name_Table.Items.AddRange(textFiles);

                    foreach (var item in textFiles)
                    {
                        string namefile = GetName(item);
                        db_Name_File.Items.Add(namefile);
                        list_Name_File.Items.Add(namefile); 
                    }

                    // Optionally, set a default selected item or handle the selection as needed
                    //if (db_Name_Table.Items.Count > 0)
                    //    db_Name_Table.SelectedIndex = 0;
                    //db_Name_File.SelectedIndex = 0;
                }
                else
                {
                    MessageBox.Show("Folder not found.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }


        private string GetName(string filePath)
        {
            // Extract the file name without extension
            string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);

            // Split the file name based on a delimiter (in this case, "_")
            string[] parts = fileNameWithoutExtension.Split('\\');

            // Check if there are at least two parts
            if (parts.Length >= 2)
            {
                // Return the second part (index 1)
                return parts[1];
            }

            // If no delimiter is found or there are not enough parts, return the original file name
            return fileNameWithoutExtension;
        }
        private void Form2_Load(object sender, EventArgs e)
        {

            PopulateComboBoxWithTextFiles(Global._Path_File_Txt.ToString());

            db_Name_Table.SelectedIndex = 0;
            db_Name_File.SelectedIndex = 0;
            list_Name_File.SelectedIndex = 0;

            //int intervalMilliseconds = 30000; // 1 second

            //// Function to be executed at each interval
            //TimerCallback timerCallback = _ => PopulateComboBoxWithTextFiles(Global._Path_File_Txt.ToString());

            //// Create a Timer that calls the specified method at regular intervals
            //System.Threading.Timer timer = new System.Threading.Timer(timerCallback, null, 0, intervalMilliseconds);






            DisplayGrid();

        }


        private void DisplayGrid()
        {

            Area_Data.Controls.Clear();

            try
            {
                // Load your JSON data from a file or another source
                string json = File.ReadAllText(db_Name_Table.Text);

                if (!string.IsNullOrWhiteSpace(json))
                {
                    json = DecompressString(json);
                    jsonData = JsonConvert.DeserializeObject<List<JObject>>(json);

                    if (jsonData == null)
                    {
                        jsonData = new List<JObject>();
                    }
                }
            }
            catch (Exception ex)
            {
                // Handle exception (e.g., log, display error message)
                MessageBox.Show($"Error loading data: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            // Display data in the DataGridView
            //dataGridView1.DataSource = jsonData;


            BuildTextBoxes();

            InitializeDataGridView();

            Refresh();

        }
        private void InitializeDataGridView()
        {
            // Set up the DataGridView with data from the JSON object
            dataGridView1.DataSource = jsonData;

            // Attach the CellClick event handler
            dataGridView1.CellClick += dataGridView1_CellClick;
        }

        private void BuildTextBoxes()
        {
            // Iterate through each property in the JSON object
            // Iterate through each property in the JSON object
            BuildLabalBoxes();

            int newX = 1;
            int startY = 20;

            if (jsonData.Count() > 0)
            {

                foreach (var property in jsonData[0].Properties())
                {
                    // Create a new TextBox
                    TextBox textBox = new TextBox
                    {
                        Name = property.Name, // Set the TextBox name to the property name
                        Text = property.Value.ToString(),
                        Location = new System.Drawing.Point(1 + (newX * 100) - 99, startY), // Adjust the X position based on the number of controls
                        Width = 100,
                        Height = 30,
                        Multiline = true, // Allow multiple lines of text
                        TextAlign = HorizontalAlignment.Left,
                        //BackColor = Color.Teal,
                        //ForeColor = Color.White,
                        //Font = new Font(this.Font, FontStyle.Bold),
                        Font = new Font("Arial", 12, FontStyle.Bold),

                        Tag = property // Optionally, store the property as a tag for future reference
                    };




                    // Add the TextBox to the Panel's Controls collection
                    Area_Data.Controls.Add(textBox);

                    // Increase X position for the next control
                    newX++;
                }
            }
            // Optionally, increase Y position for the next row of controls
            startY += 30;
        }

        private void BuildLabalBoxes()
        {
            // Iterate through each property in the JSON object
            // Iterate through each property in the JSON object
            int newX = 1;
            int startY = 1;

            if (jsonData.Count() > 0)
            {

                foreach (var property in jsonData[0].Properties())
                {
                    // Create a new TextBox
                    Label _Label = new Label
                    {
                        Name = property.Name + newX, // Set the TextBox name to the property name
                        Text = property.Name.ToString(),
                        Location = new System.Drawing.Point(1 + (newX * 100) - 99, startY), // Adjust the X position based on the number of controls
                        Width = 100,
                        //BackColor = Color.DarkGray,
                        //ForeColor = Color.White,
                        //Font = new Font(this.Font, FontStyle.Bold),
                        Font = new Font("Arial", 9, FontStyle.Bold),

                        Tag = property // Optionally, store the property as a tag for future reference
                    };

                    // Add the TextBox to the Panel's Controls collection
                    Area_Data.Controls.Add(_Label);

                    // Increase X position for the next control
                    newX++;
                }

            }

            // Optionally, increase Y position for the next row of controls
            startY += 30;
        }







        private void Refresh()
        {
            dataGridView1.ClearSelection();

            string json = File.ReadAllText(db_Name_Table.Text);

            if (!string.IsNullOrWhiteSpace(json))
            {
                json = DecompressString(json);

                jsonData = JsonConvert.DeserializeObject<List<JObject>>(json);

                if (jsonData == null)
                {
                    jsonData = new List<JObject>();
                }
            }

            InitializeDataGridView();

        }

        private void DeleteItem()
        {
            try
            {
                if (dataGridView1.SelectedCells.Count > 0)
                {
                    int rowIndex = dataGridView1.SelectedCells[0].RowIndex;

                    // Access data from the selected row
                    DataGridViewRow selectedRow = dataGridView1.Rows[rowIndex];

                    // Get the column name of the identifier (e.g., "Id")
                    string identifierColumnName = GetID(); // Change this to the actual identifier column name

                    // Get the value of the identifier from the selected row
                    object idToDelete = selectedRow.Cells[identifierColumnName].Value;

                    // Find and remove the item from the jsonData list
                    RemoveItem(identifierColumnName, idToDelete);

                    // Update the DataGridView
                    dataGridView1.DataSource = null;
                    dataGridView1.DataSource = jsonData;
                }
                else
                {
                    MessageBox.Show("Please select a row to delete.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error deleting data: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private void AddItem()
        {
            try
            {
                isnull = 0;
                // Create a new JObject for the new item
                JObject newItem = new JObject();

                // Update TextBox controls based on the user input
                foreach (Control control in Area_Data.Controls)
                {
                    if (control is TextBox textBox)
                    {
                        // Get the corresponding property from the Tag
                        var property = textBox.Tag as JProperty;

                        if (property != null)
                        {
                            // Display data from the TextBoxes in the new item
                            string columnName = property.Name;
                            newItem[columnName] = textBox.Text;

                            if (textBox.Text.Trim() == "")
                            {
                                isnull = 1;
                                break;
                            }
                        }
                    }
                }

                // Add the new item to the jsonData list
                if (isnull == 0)
                {

                    jsonData.Add(newItem);

                    // Update the DataGridView
                    dataGridView1.DataSource = null;
                    dataGridView1.DataSource = jsonData;
                }
                else
                {
                    MessageBox.Show(" يجب ان يكون في بيانات مكتمله");
                }

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error adding data: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void SelectItem(string identifierColumnName, object idToSelect)
        {

            // Replace with the actual Id you want to select

            // Iterate through the rows in the DataGridView
            foreach (DataGridViewRow row in dataGridView1.Rows)
            {
                // Check if the value in the "Id" column matches the target Id
                if (row.Cells[identifierColumnName].Value != null && row.Cells[identifierColumnName].Value.ToString() == idToSelect.ToString())
                {
                    // Select the entire row
                    row.Selected = true;

                    // Scroll to the selected row
                    dataGridView1.FirstDisplayedScrollingRowIndex = row.Index;

                    // Optionally, break out of the loop if you only want to select the first matching row
                    // break;
                }
                else
                {
                    // Deselect other rows
                    row.Selected = false;
                }
            }
        }
        private void RemoveItem(string identifierColumnName, object idToRemove)
        {
            // Find and remove the item in the JSON data list
            var itemToRemove = jsonData.FirstOrDefault(item =>
                item[identifierColumnName]?.ToString() == idToRemove?.ToString());

            if (itemToRemove != null)
            {
                jsonData.Remove(itemToRemove);
            }
        }

        private string GetID()
        {
            string columnName = "";

            foreach (Control control in Area_Data.Controls)
            {
                if (control is TextBox textBox)
                {
                    // Get the corresponding property from the Tag
                    var property = textBox.Tag as JProperty;

                    if (property != null)
                    {
                        // Display data from the TextBoxes in the new item
                        columnName = property.Name;
                        return columnName;
                    }
                }
            }

            return columnName;
        }


        private string GetValueID()
        {
            string columnValue = "";

            foreach (Control control in Area_Data.Controls)
            {
                if (control is TextBox textBox)
                {
                    // Get the corresponding property from the Tag
                    var property = textBox.Tag as JProperty;

                    if (property != null)
                    {
                        // Display data from the TextBoxes in the new item
                        columnValue = textBox.Text;
                        return columnValue;
                    }
                }
            }

            return columnValue;
        }
        private void Form1_Click(object sender, EventArgs e)
        {

        }


        private void dataGridView1_KeyUp(object sender, KeyEventArgs e)
        {


        }

        private void dataGridView1_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex >= 0 && e.RowIndex < dataGridView1.Rows.Count)
            {
                // Access data from the selected row
                DesplayDataIn_txt(e.RowIndex);
            }


        }

        private void DesplayDataIn_txt(int RowIndex)
        {
            DataGridViewRow selectedRow = dataGridView1.Rows[RowIndex];

            // Update TextBox controls based on the selected row's data
            foreach (Control control in Area_Data.Controls)
            {
                if (control is TextBox textBox)
                {
                    // Get the corresponding property from the Tag
                    var property = textBox.Tag as JProperty;

                    if (property != null)
                    {
                        // Display data from the selected row in TextBoxes
                        string columnName = property.Name;

                        // Check if the column exists in the DataGridView
                        if (selectedRow.DataGridView.Columns.Contains(columnName))
                        {
                            textBox.Text = selectedRow.Cells[columnName].Value?.ToString() ?? "";
                        }
                        else
                        {
                            // Handle the case where the column doesn't exist
                            textBox.Text = "Column not found";
                        }
                    }
                    else
                    {
                        // Handle the case where the Tag is not a JProperty
                        textBox.Text = "Invalid Tag";
                    }
                }
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
            try
            {
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
            catch (Exception ex)
            {

                return "";
            }
        }

        private void btnAdd_Click_1(object sender, EventArgs e)
        {
            AddItem();

            if (isnull == 0)
            {
                SelectItem(GetID(), GetValueID());
            }
        }

        private void btnBack_Click_1(object sender, EventArgs e)
        {
            Refresh();
        }

        private void btnSave_Click_1(object sender, EventArgs e)
        {
            int rowCount = dataGridView1.RowCount;

            if (rowCount <= 0)
            {
                MessageBox.Show("علي الاقل يجب ان يكون في صف واحد");
                return;
            }

        


            try
            {
                // Save changes back to JSON file
                string json = JsonConvert.SerializeObject(jsonData, Formatting.Indented);
                //json = json.Replace(@"""", @"""""");  
                json = CompressString(json);
                File.WriteAllText(db_Name_Table.Text, json);

                MessageBox.Show($"تم الحفظ ", "Save");
                Refresh();
                try
                {
                    // Check if there are any rows in the DataGridView
                    if (dataGridView1.Rows.Count > 0)
                    {
                        // Click (select) the first row
                        dataGridView1.Rows[0].Selected = true;

                        // Optionally, handle the click event or perform additional actions
                        // Example: dataGridView1_CellClick(dataGridView1, new DataGridViewCellEventArgs(0, 0));
                    }

                    DesplayDataIn_txt(0);
                }
                catch (Exception ex)
                {

                }
            }
            catch (Exception ex)
            {
                // Handle exception (e.g., log, display error message)
                MessageBox.Show($"Error saving data: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnDelete_Click_1(object sender, EventArgs e)
        {
            int rowCount = dataGridView1.RowCount;

            if (rowCount <= 1)
            {
                MessageBox.Show("علي الاقل يجب ان يكون في صف واحد");
            }
            else
            {
                DeleteItem();

            }


            try
            {
                // Check if there are any rows in the DataGridView
                if (dataGridView1.Rows.Count > 0)
                {
                    // Click (select) the first row
                    dataGridView1.Rows[0].Selected = true;

                    // Optionally, handle the click event or perform additional actions
                    // Example: dataGridView1_CellClick(dataGridView1, new DataGridViewCellEventArgs(0, 0));
                }

                DesplayDataIn_txt(0);
            }
            catch (Exception ex)
            {

            }
        }

        private void db_Name_Table_SelectedValueChanged(object sender, EventArgs e)
        {
            DisplayGrid(); 
        }

        private void db_Name_File_SelectedValueChanged(object sender, EventArgs e)
        {
            db_Name_Table.SelectedIndex = db_Name_File.SelectedIndex;
            
        }

        private void list_Name_File_SelectedValueChanged(object sender, EventArgs e)
        {
            db_Name_Table.SelectedIndex = list_Name_File.SelectedIndex;
        }
    }
}
