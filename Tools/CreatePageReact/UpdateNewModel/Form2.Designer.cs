namespace UpdateNewModel
{
    partial class Form2
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.Area_Data = new System.Windows.Forms.Panel();
            this.btnBack = new System.Windows.Forms.Button();
            this.btnDelete = new System.Windows.Forms.Button();
            this.btnAdd = new System.Windows.Forms.Button();
            this.btnSave = new System.Windows.Forms.Button();
            this.dataGridView1 = new System.Windows.Forms.DataGridView();
            this.db_Name_Table = new System.Windows.Forms.ComboBox();
            this.db_Name_File = new System.Windows.Forms.ComboBox();
            this.list_Name_File = new System.Windows.Forms.ListBox();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.SuspendLayout();
            // 
            // Area_Data
            // 
            this.Area_Data.AutoScroll = true;
            this.Area_Data.Location = new System.Drawing.Point(296, 325);
            this.Area_Data.Margin = new System.Windows.Forms.Padding(2);
            this.Area_Data.Name = "Area_Data";
            this.Area_Data.Size = new System.Drawing.Size(698, 108);
            this.Area_Data.TabIndex = 12;
            // 
            // btnBack
            // 
            this.btnBack.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(192)))), ((int)(((byte)(192)))), ((int)(((byte)(0)))));
            this.btnBack.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.btnBack.ForeColor = System.Drawing.SystemColors.ControlLightLight;
            this.btnBack.Location = new System.Drawing.Point(2, 326);
            this.btnBack.Name = "btnBack";
            this.btnBack.Size = new System.Drawing.Size(200, 30);
            this.btnBack.TabIndex = 11;
            this.btnBack.Text = "Refresh";
            this.btnBack.UseVisualStyleBackColor = false;
            this.btnBack.Click += new System.EventHandler(this.btnBack_Click_1);
            // 
            // btnDelete
            // 
            this.btnDelete.BackColor = System.Drawing.Color.Maroon;
            this.btnDelete.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.btnDelete.ForeColor = System.Drawing.SystemColors.ControlLightLight;
            this.btnDelete.Location = new System.Drawing.Point(224, 10);
            this.btnDelete.Name = "btnDelete";
            this.btnDelete.Size = new System.Drawing.Size(170, 30);
            this.btnDelete.TabIndex = 10;
            this.btnDelete.Text = "Delete Select Row";
            this.btnDelete.UseVisualStyleBackColor = false;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click_1);
            // 
            // btnAdd
            // 
            this.btnAdd.BackColor = System.Drawing.Color.Green;
            this.btnAdd.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.btnAdd.ForeColor = System.Drawing.SystemColors.ControlLightLight;
            this.btnAdd.Location = new System.Drawing.Point(208, 325);
            this.btnAdd.Name = "btnAdd";
            this.btnAdd.Size = new System.Drawing.Size(83, 67);
            this.btnAdd.TabIndex = 9;
            this.btnAdd.Text = "Add >>";
            this.btnAdd.UseVisualStyleBackColor = false;
            this.btnAdd.Click += new System.EventHandler(this.btnAdd_Click_1);
            // 
            // btnSave
            // 
            this.btnSave.BackColor = System.Drawing.Color.Teal;
            this.btnSave.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.btnSave.ForeColor = System.Drawing.SystemColors.ControlLightLight;
            this.btnSave.Location = new System.Drawing.Point(2, 362);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new System.Drawing.Size(200, 30);
            this.btnSave.TabIndex = 8;
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = false;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click_1);
            // 
            // dataGridView1
            // 
            this.dataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridView1.Location = new System.Drawing.Point(224, 43);
            this.dataGridView1.Name = "dataGridView1";
            this.dataGridView1.RowHeadersWidth = 51;
            this.dataGridView1.Size = new System.Drawing.Size(770, 276);
            this.dataGridView1.TabIndex = 7;
            this.dataGridView1.UseWaitCursor = true;
            this.dataGridView1.CellClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellClick);
            // 
            // db_Name_Table
            // 
            this.db_Name_Table.FormattingEnabled = true;
            this.db_Name_Table.Location = new System.Drawing.Point(489, 21);
            this.db_Name_Table.Name = "db_Name_Table";
            this.db_Name_Table.Size = new System.Drawing.Size(258, 21);
            this.db_Name_Table.TabIndex = 13;
            this.db_Name_Table.Visible = false;
            this.db_Name_Table.SelectedValueChanged += new System.EventHandler(this.db_Name_Table_SelectedValueChanged);
            // 
            // db_Name_File
            // 
            this.db_Name_File.FormattingEnabled = true;
            this.db_Name_File.Location = new System.Drawing.Point(796, 21);
            this.db_Name_File.Name = "db_Name_File";
            this.db_Name_File.Size = new System.Drawing.Size(194, 21);
            this.db_Name_File.TabIndex = 14;
            this.db_Name_File.Visible = false;
            this.db_Name_File.SelectedValueChanged += new System.EventHandler(this.db_Name_File_SelectedValueChanged);
            // 
            // list_Name_File
            // 
            this.list_Name_File.FormattingEnabled = true;
            this.list_Name_File.Location = new System.Drawing.Point(2, 43);
            this.list_Name_File.Name = "list_Name_File";
            this.list_Name_File.Size = new System.Drawing.Size(216, 277);
            this.list_Name_File.TabIndex = 15;
            this.list_Name_File.SelectedValueChanged += new System.EventHandler(this.list_Name_File_SelectedValueChanged);
            // 
            // Form2
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(999, 435);
            this.Controls.Add(this.list_Name_File);
            this.Controls.Add(this.db_Name_File);
            this.Controls.Add(this.db_Name_Table);
            this.Controls.Add(this.Area_Data);
            this.Controls.Add(this.btnBack);
            this.Controls.Add(this.btnDelete);
            this.Controls.Add(this.btnAdd);
            this.Controls.Add(this.btnSave);
            this.Controls.Add(this.dataGridView1);
            this.Margin = new System.Windows.Forms.Padding(2);
            this.Name = "Form2";
            this.Text = "Form2";
            this.Load += new System.EventHandler(this.Form2_Load);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.Panel Area_Data;
        private System.Windows.Forms.Button btnBack;
        private System.Windows.Forms.Button btnDelete;
        private System.Windows.Forms.Button btnAdd;
        private System.Windows.Forms.Button btnSave;
        private System.Windows.Forms.DataGridView dataGridView1;
        private System.Windows.Forms.ComboBox db_Name_Table;
        private System.Windows.Forms.ComboBox db_Name_File;
        private System.Windows.Forms.ListBox list_Name_File;
    }
}