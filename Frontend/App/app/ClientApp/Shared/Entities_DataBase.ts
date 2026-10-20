 


 export class A_ACCOUNT  { 
constructor() {
 
        this.AccountID= null;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.ACC_CODE= '';
        this.ACC_DESCA= '';
        this.ACC_DESCL= '';
        this.ACC_GROUP= 0;
        this.ACC_TYPE= 0;
        this.ACC_LEVEL= 0;
        this.ACC_ACTIVE= false;
        this.PARENT_ACC= '';
        this.DETAIL= false;
        this.CREATED_BY= '';
        this.CREATED_AT= '';
        this.UPDATED_BY= '';
        this.LAST_UPDATE= '';
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public AccountID: any ;
        public CompCode: number ;
        public BranchCode: number ;
        public ACC_CODE: string ;
        public ACC_DESCA: string ;
        public ACC_DESCL: string ;
        public ACC_GROUP: number ;
        public ACC_TYPE: number ;
        public ACC_LEVEL: number ;
        public ACC_ACTIVE: boolean ;
        public PARENT_ACC: string ;
        public DETAIL: boolean ;
        public CREATED_BY: string ;
        public CREATED_AT: string ;
        public UPDATED_BY: string ;
        public LAST_UPDATE: string ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class A_ACCOUNT_YEAR  { 
constructor() {
 
        this.AccountYearID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.ACC_CODE= '';
        this.FIN_YEAR= 0;
        this.ACC_LIMIT= 0;
        this.REMARKS= '';
        this.StatusFlag = '';
 }
        public AccountYearID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public ACC_CODE: string ;
        public FIN_YEAR: number ;
        public ACC_LIMIT: number ;
        public REMARKS: string ;
        public StatusFlag: string;


 }

 export class A_JOURNAL_DETAIL  { 
constructor() {
 
        this.VoucherDetailID= 0;
        this.VoucherID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.VOUCHER_CODE= 0;
        this.ACC_CODE= '';
        this.DEBIT= 0;
        this.CREDIT= 0;
        this.Remarks= '';
        this.CC_CODE= '';
        this.Trans_Type= '';
        this.Trans_ID= 0;
        this.TrDate= '';
        this.Trans_No= 0;
        this.IDUser= 0;
        this.IDExcel= 0;
        this.NumDayShift= 0;
        this.StatusFlag = '';
 }
        public VoucherDetailID: number ;
        public VoucherID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public VOUCHER_CODE: number ;
        public ACC_CODE: string ;
        public DEBIT: number ;
        public CREDIT: number ;
        public Remarks: string ;
        public CC_CODE: string ;
        public Trans_Type: string ;
        public Trans_ID: number ;
        public TrDate: string ;
        public Trans_No: number ;
        public IDUser: number ;
        public IDExcel: number ;
        public NumDayShift: number ;
        public StatusFlag: string;


 }

 export class A_JOURNAL_HEADER  { 
constructor() {
 
        this.VoucherID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.VOUCHER_CODE= 0;
        this.VOUCHER_DATE= '';
        this.VOUCHER_DESC= '';
        this.VOUCHER_STATUS= 0;
        this.TYPE_CODE= 0;
        this.REF_CODE= '';
        this.CREATED_BY= '';
        this.CREATED_AT= '';
        this.UPDATED_BY= '';
        this.UPDATED_AT= '';
        this.Trans_Type= '';
        this.Trans_ID= 0;
        this.Trans_No= 0;
        this.IDUser= 0;
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public VoucherID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public VOUCHER_CODE: number ;
        public VOUCHER_DATE: string ;
        public VOUCHER_DESC: string ;
        public VOUCHER_STATUS: number ;
        public TYPE_CODE: number ;
        public REF_CODE: string ;
        public CREATED_BY: string ;
        public CREATED_AT: string ;
        public UPDATED_BY: string ;
        public UPDATED_AT: string ;
        public Trans_Type: string ;
        public Trans_ID: number ;
        public Trans_No: number ;
        public IDUser: number ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class AQ_A_Account  { 
constructor() {
 
        this.CompCode= 0;
        this.ACC_CODE= '';
        this.ACC_DESCA= '';
        this.ACC_DESCL= '';
        this.Total_DEBIT= 0;
        this.Total_CREDIT= 0;
        this.Total_Balance= 0;
        this.PARENT_ACC= '';
        this.ACC_LEVEL= 0;
        this.DETAIL= false;
        this.ACC_ACTIVE= false;
        this.ACC_TYPE= 0;
        this.ACC_GROUP= 0;
        this.CREATED_BY= '';
        this.CREATED_AT= '';
        this.UPDATED_BY= '';
        this.LAST_UPDATE= '';
        this.FIN_YEAR= 0;
        this.ACC_LIMIT= 0;
        this.REMARKS= '';
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public ACC_CODE: string ;
        public ACC_DESCA: string ;
        public ACC_DESCL: string ;
        public Total_DEBIT: number ;
        public Total_CREDIT: number ;
        public Total_Balance: number ;
        public PARENT_ACC: string ;
        public ACC_LEVEL: number ;
        public DETAIL: boolean ;
        public ACC_ACTIVE: boolean ;
        public ACC_TYPE: number ;
        public ACC_GROUP: number ;
        public CREATED_BY: string ;
        public CREATED_AT: string ;
        public UPDATED_BY: string ;
        public LAST_UPDATE: string ;
        public FIN_YEAR: number ;
        public ACC_LIMIT: number ;
        public REMARKS: string ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class AQ_JOURNAL_DETAIL  { 
constructor() {
 
        this.VoucherDetailID= 0;
        this.VoucherID= 0;
        this.CompCode= 0;
        this.VOUCHER_CODE= 0;
        this.Serial= null;
        this.ACC_CODE= '';
        this.ACC_DESCA= '';
        this.ACC_DESCL= '';
        this.DEBIT= 0;
        this.CREDIT= 0;
        this.Remarks= '';
        this.CC_CODE= '';
        this.Trans_Type= '';
        this.Trans_ID= 0;
        this.TrDate= '';
        this.Trans_No= 0;
        this.IDUser= 0;
        this.IDExcel= 0;
        this.NumDayShift= 0;
        this.KeyTrans= '';
        this.StatusFlag = '';
 }
        public VoucherDetailID: number ;
        public VoucherID: number ;
        public CompCode: number ;
        public VOUCHER_CODE: number ;
        public Serial: any ;
        public ACC_CODE: string ;
        public ACC_DESCA: string ;
        public ACC_DESCL: string ;
        public DEBIT: number ;
        public CREDIT: number ;
        public Remarks: string ;
        public CC_CODE: string ;
        public Trans_Type: string ;
        public Trans_ID: number ;
        public TrDate: string ;
        public Trans_No: number ;
        public IDUser: number ;
        public IDExcel: number ;
        public NumDayShift: number ;
        public KeyTrans: string ;
        public StatusFlag: string;


 }

 export class AQ_JOURNAL_HEADER  { 
constructor() {
 
        this.VoucherID= 0;
        this.CompCode= 0;
        this.VOUCHER_CODE= 0;
        this.VOUCHER_DATE= '';
        this.VOUCHER_DESC= '';
        this.VOUCHER_STATUS= 0;
        this.TYPE_CODE= 0;
        this.REF_CODE= '';
        this.CREATED_BY= '';
        this.CREATED_AT= '';
        this.UPDATED_BY= '';
        this.UPDATED_AT= '';
        this.Trans_Type= '';
        this.TotalDebit= 0;
        this.TotalCredit= 0;
        this.NetDifference= 0;
        this.Trans_ID= 0;
        this.Trans_No= 0;
        this.IDUser= 0;
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public VoucherID: number ;
        public CompCode: number ;
        public VOUCHER_CODE: number ;
        public VOUCHER_DATE: string ;
        public VOUCHER_DESC: string ;
        public VOUCHER_STATUS: number ;
        public TYPE_CODE: number ;
        public REF_CODE: string ;
        public CREATED_BY: string ;
        public CREATED_AT: string ;
        public UPDATED_BY: string ;
        public UPDATED_AT: string ;
        public Trans_Type: string ;
        public TotalDebit: number ;
        public TotalCredit: number ;
        public NetDifference: number ;
        public Trans_ID: number ;
        public Trans_No: number ;
        public IDUser: number ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class D_A_CashTypes  { 
constructor() {
 
        this.CashTypeID= 0;
        this.Ser= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.Description= '';
        this.ChargePrc= 0;
        this.CashAccCode= '';
        this.IsActive= false;
        this.StatusFlag = '';
 }
        public CashTypeID: number ;
        public Ser: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public Description: string ;
        public ChargePrc: number ;
        public CashAccCode: string ;
        public IsActive: boolean ;
        public StatusFlag: string;


 }

 export class D_A_FinancialType  { 
constructor() {
 
        this.FinancialTypeID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.TrType= 0;
        this.DescAr= '';
        this.DescEn= '';
        this.IsActive= false;
        this.SearchTypes= 0;
        this.StatusFlag = '';
 }
        public FinancialTypeID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public TrType: number ;
        public DescAr: string ;
        public DescEn: string ;
        public IsActive: boolean ;
        public SearchTypes: number ;
        public StatusFlag: string;


 }

 export class G_D_Codes  { 
constructor() {
 
        this.ID= 0;
        this.CodeType= '';
        this.CodeValue= 0;
        this.DescA= '';
        this.DescE= '';
        this.SubCode= '';
        this.Remarks= '';
        this.StdCode= '';
        this.StatusFlag = '';
 }
        public ID: number ;
        public CodeType: string ;
        public CodeValue: number ;
        public DescA: string ;
        public DescE: string ;
        public SubCode: string ;
        public Remarks: string ;
        public StdCode: string ;
        public StatusFlag: string;


 }

 export class G_D_Employees  { 
constructor() {
 
        this.EmpID= 0;
        this.User_Login= '';
        this.Password_Login= '';
        this.EmpCode= '';
        this.CompCode= 0;
        this.BranchCode= 0;
        this.Emp_Name= '';
        this.EmpType= 0;
        this.EmpRole= 0;
        this.IsUser= false;
        this.Status= 0;
        this.Address= '';
        this.Mobile= '';
        this.Mobile2= '';
        this.Email= '';
        this.ManagedBy= '';
        this.LoginUrl= false;
        this.Remarks= '';
        this.ManagerID= 0;
        this.SupervisorID= 0;
        this.FamilyZoneID= 0;
        this.ZoneID= 0;
        this.Job_Title= '';
        this.CreatedAt= '';
        this.CreatedBy= '';
        this.UpdatedAt= '';
        this.UpdatedBy= '';
        this.Profile_Img= '';
        this.FrontID_Img= '';
        this.BackID_Img= '';
        this.Gender= 0;
        this.IDNO= '';
        this.FrontDrivLicense_Img= '';
        this.BackDrivLicense_Img= '';
        this.FrontVicLicense_Img= '';
        this.BackVicLicense_Img= '';
        this.AccTransferNo= '';
        this.AccNameTransfer= '';
        this.ACC_CODE= '';
        this.Custody_Code= '';
        this.Loan_Code= '';
        this.PayLoan_Cust_Code= '';
        this.CustodyAmount= 0;
        this.LoanAmount= 0;
        this.SalaryAmount= 0;
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public EmpID: number ;
        public User_Login: string ;
        public Password_Login: string ;
        public EmpCode: string ;
        public CompCode: number ;
        public BranchCode: number ;
        public Emp_Name: string ;
        public EmpType: number ;
        public EmpRole: number ;
        public IsUser: boolean ;
        public Status: number ;
        public Address: string ;
        public Mobile: string ;
        public Mobile2: string ;
        public Email: string ;
        public ManagedBy: string ;
        public LoginUrl: boolean ;
        public Remarks: string ;
        public ManagerID: number ;
        public SupervisorID: number ;
        public FamilyZoneID: number ;
        public ZoneID: number ;
        public Job_Title: string ;
        public CreatedAt: string ;
        public CreatedBy: string ;
        public UpdatedAt: string ;
        public UpdatedBy: string ;
        public Profile_Img: string ;
        public FrontID_Img: string ;
        public BackID_Img: string ;
        public Gender: number ;
        public IDNO: string ;
        public FrontDrivLicense_Img: string ;
        public BackDrivLicense_Img: string ;
        public FrontVicLicense_Img: string ;
        public BackVicLicense_Img: string ;
        public AccTransferNo: string ;
        public AccNameTransfer: string ;
        public ACC_CODE: string ;
        public Custody_Code: string ;
        public Loan_Code: string ;
        public PayLoan_Cust_Code: string ;
        public CustodyAmount: number ;
        public LoanAmount: number ;
        public SalaryAmount: number ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class G_D_TypeEmployees  { 
constructor() {
 
        this.IDTypeEmp= 0;
        this.CompCode= 0;
        this.EmpType= 0;
        this.DescA= '';
        this.DescE= '';
        this.Remark= '';
        this.ISActive= false;
        this.StatusFlag = '';
 }
        public IDTypeEmp: number ;
        public CompCode: number ;
        public EmpType: number ;
        public DescA: string ;
        public DescE: string ;
        public Remark: string ;
        public ISActive: boolean ;
        public StatusFlag: string;


 }

 export class G_Tr_Archive  { 
constructor() {
 
        this.ArchiveID= 0;
        this.RefNo= '';
        this.CompCode= 0;
        this.FinYear= 0;
        this.MODULE_CODE= '';
        this.TransID= 0;
        this.UUID= '';
        this.NameFile= '';
        this.TypeFile= '';
        this.Remarks= '';
        this.CreatedAt= '';
        this.CreatedBy= '';
        this.UpdatedAt= '';
        this.UpdatedBy= '';
        this.IDUserCreate= 0;
        this.Status= 0;
        this.StatusFlag = '';
 }
        public ArchiveID: number ;
        public RefNo: string ;
        public CompCode: number ;
        public FinYear: number ;
        public MODULE_CODE: string ;
        public TransID: number ;
        public UUID: string ;
        public NameFile: string ;
        public TypeFile: string ;
        public Remarks: string ;
        public CreatedAt: string ;
        public CreatedBy: string ;
        public UpdatedAt: string ;
        public UpdatedBy: string ;
        public IDUserCreate: number ;
        public Status: number ;
        public StatusFlag: string;


 }

 export class G_TransCounter  { 
constructor() {
 
        this.CompCode= 0;
        this.BranchCode= 0;
        this.FinYear= 0;
        this.TransType= '';
        this.PeriodCode= 0;
        this.LastSerial= 0;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public BranchCode: number ;
        public FinYear: number ;
        public TransType: string ;
        public PeriodCode: number ;
        public LastSerial: number ;
        public StatusFlag: string;


 }

 export class G_TransCounterSetting  { 
constructor() {
 
        this.CompCode= 0;
        this.TransType= '';
        this.YearStartValueType= 0;
        this.ISBranchCounter= false;
        this.YearStartFixedValue= 0;
        this.Remarks= '';
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public TransType: string ;
        public YearStartValueType: number ;
        public ISBranchCounter: boolean ;
        public YearStartFixedValue: number ;
        public Remarks: string ;
        public StatusFlag: string;


 }

 export class I_TR_FinancialTransactions  { 
constructor() {
 
        this.TransactionID= 0;
        this.TrNo= 0;
        this.RefNo= '';
        this.TransactionDate= '';
        this.CompCode= 0;
        this.BranchCode= 0;
        this.TrType= 0;
        this.IsCash= false;
        this.Type= 0;
        this.CashTypeID= 0;
        this.Reason= '';
        this.BeneficiaryName= '';
        this.Amount= 0;
        this.ChargePrc= 0;
        this.DueAmount= 0;
        this.LoanPayAmount= 0;
        this.CustodyPayAmount= 0;
        this.Status= 0;
        this.Remarks= '';
        this.IDUserCreate= 0;
        this.CreatedAt= '';
        this.CreatedBy= '';
        this.UpdatedAt= '';
        this.UpdatedBy= '';
        this.PurchaseID= 0;
        this.TrNo_Ref= 0;
        this.IDPeriod= '';
        this.IDExcel= 0;
        this.StatusFlag = '';
 }
        public TransactionID: number ;
        public TrNo: number ;
        public RefNo: string ;
        public TransactionDate: string ;
        public CompCode: number ;
        public BranchCode: number ;
        public TrType: number ;
        public IsCash: boolean ;
        public Type: number ;
        public CashTypeID: number ;
        public Reason: string ;
        public BeneficiaryName: string ;
        public Amount: number ;
        public ChargePrc: number ;
        public DueAmount: number ;
        public LoanPayAmount: number ;
        public CustodyPayAmount: number ;
        public Status: number ;
        public Remarks: string ;
        public IDUserCreate: number ;
        public CreatedAt: string ;
        public CreatedBy: string ;
        public UpdatedAt: string ;
        public UpdatedBy: string ;
        public PurchaseID: number ;
        public TrNo_Ref: number ;
        public IDPeriod: string ;
        public IDExcel: number ;
        public StatusFlag: string;


 }

 export class IQ_G_TypeEmployeesByUsing  { 
constructor() {
 
        this.CompCode= 0;
        this.DescA= '';
        this.DescE= '';
        this.EmpType= 0;
        this.IDTypeEmp= 0;
        this.ISActive= false;
        this.Remark= '';
        this.EmpID= 0;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public DescA: string ;
        public DescE: string ;
        public EmpType: number ;
        public IDTypeEmp: number ;
        public ISActive: boolean ;
        public Remark: string ;
        public EmpID: number ;
        public StatusFlag: string;


 }

 export class IQ_Sys_Company  { 
constructor() {
 
        this.CompCode= 0;
        this.NameA= '';
        this.NameE= '';
        this.IsActive= false;
        this.City= '';
        this.Address= '';
        this.Tel= '';
        this.Fax= '';
        this.Email= '';
        this.WebSite= '';
        this.StatusRemark= '';
        this.StatusOpen= 0;
        this.IsArchive= false;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public NameA: string ;
        public NameE: string ;
        public IsActive: boolean ;
        public City: string ;
        public Address: string ;
        public Tel: string ;
        public Fax: string ;
        public Email: string ;
        public WebSite: string ;
        public StatusRemark: string ;
        public StatusOpen: number ;
        public IsArchive: boolean ;
        public StatusFlag: string;


 }

 export class IQ_Sys_ControlYear  { 
constructor() {
 
        this.UserID= 0;
        this.CompCode= 0;
        this.FinYear= 0;
        this.FirstDate= '';
        this.LastDate= '';
        this.Status= 0;
        this.IsOpen= false;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public CompCode: number ;
        public FinYear: number ;
        public FirstDate: string ;
        public LastDate: string ;
        public Status: number ;
        public IsOpen: boolean ;
        public StatusFlag: string;


 }

 export class IQ_Sys_RoleModule  { 
constructor() {
 
        this.CompCode= 0;
        this.StatusCompany= 0;
        this.FIN_YEAR= 0;
        this.RoleId= 0;
        this.MODULE_CODE= '';
        this.MODULE_MENU= '';
        this.MODULE_DESCE= '';
        this.MODULE_DESCA= '';
        this.Url_Image= '';
        this.Icon_Color= '';
        this.MODULE_TYPE= null;
        this.MODULE_SORT= 0;
        this.IS_Show= 0;
        this.EXECUTE= false;
        this.CREATE= false;
        this.EDIT= false;
        this.DELETE= false;
        this.PRINT= false;
        this.VIEW= false;
        this.CUSTOM1= false;
        this.CUSTOM2= false;
        this.CUSTOM3= false;
        this.CUSTOM4= false;
        this.CUSTOM5= false;
        this.CUSTOM6= false;
        this.CUSTOM7= false;
        this.CUSTOM8= false;
        this.CUSTOM9= false;
        this.IsArchive= false;
        this.Prc_Preference= 0;
        this.UserID= 0;
        this.User_CompCode= 0;
        this.User_BranchCode= 0;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public StatusCompany: number ;
        public FIN_YEAR: number ;
        public RoleId: number ;
        public MODULE_CODE: string ;
        public MODULE_MENU: string ;
        public MODULE_DESCE: string ;
        public MODULE_DESCA: string ;
        public Url_Image: string ;
        public Icon_Color: string ;
        public MODULE_TYPE: any ;
        public MODULE_SORT: number ;
        public IS_Show: number ;
        public EXECUTE: boolean ;
        public CREATE: boolean ;
        public EDIT: boolean ;
        public DELETE: boolean ;
        public PRINT: boolean ;
        public VIEW: boolean ;
        public CUSTOM1: boolean ;
        public CUSTOM2: boolean ;
        public CUSTOM3: boolean ;
        public CUSTOM4: boolean ;
        public CUSTOM5: boolean ;
        public CUSTOM6: boolean ;
        public CUSTOM7: boolean ;
        public CUSTOM8: boolean ;
        public CUSTOM9: boolean ;
        public IsArchive: boolean ;
        public Prc_Preference: number ;
        public UserID: number ;
        public User_CompCode: number ;
        public User_BranchCode: number ;
        public StatusFlag: string;


 }

 export class IQ_Sys_RoleUsersAllDataComp  { 
constructor() {
 
        this.UserID= 0;
        this.RoleId= 0;
        this.RoleIds= '';
        this.RoleDescA= '';
        this.RoleDescE= '';
        this.NameUser= '';
        this.CompCode= 0;
        this.CompNameA= '';
        this.CompNameE= '';
        this.EmpID= null;
        this.EmpCode= '';
        this.USER_CODE= '';
        this.USER_PASSWORD= '';
        this.USER_Email= '';
        this.USER_PASSWORD2= '';
        this.USER_ACTIVE= false;
        this.USER_Status= 0;
        this.ChangePasswordDate= '';
        this.LastLogin= '';
        this.FirstLogin= '';
        this.CreatedAt= '';
        this.UpdatedAt= '';
        this.CreatedBy= '';
        this.UpdatedBy= '';
        this.Token= '';
        this.IsAutoLogin= false;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public RoleId: number ;
        public RoleIds: string ;
        public RoleDescA: string ;
        public RoleDescE: string ;
        public NameUser: string ;
        public CompCode: number ;
        public CompNameA: string ;
        public CompNameE: string ;
        public EmpID: any ;
        public EmpCode: string ;
        public USER_CODE: string ;
        public USER_PASSWORD: string ;
        public USER_Email: string ;
        public USER_PASSWORD2: string ;
        public USER_ACTIVE: boolean ;
        public USER_Status: number ;
        public ChangePasswordDate: string ;
        public LastLogin: string ;
        public FirstLogin: string ;
        public CreatedAt: string ;
        public UpdatedAt: string ;
        public CreatedBy: string ;
        public UpdatedBy: string ;
        public Token: string ;
        public IsAutoLogin: boolean ;
        public StatusFlag: string;


 }

 export class IQ_Sys_RoleUsersBranch  { 
constructor() {
 
        this.UserID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.CompNameA= '';
        this.CompNameE= '';
        this.BranchDescA= '';
        this.BranchDescE= '';
        this.EmpID= null;
        this.USER_CODE= '';
        this.USER_Password= '';
        this.USER_Email= '';
        this.IsAutoLogin= false;
        this.NameUser= '';
        this.EmpCode= '';
        this.Address_City= '';
        this.Tel= '';
        this.Fax= '';
        this.Email= '';
        this.WebSite= '';
        this.BranchManager= '';
        this.GroupVatNo= '';
        this.StatusFlag = '';
 }
        public UserID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public CompNameA: string ;
        public CompNameE: string ;
        public BranchDescA: string ;
        public BranchDescE: string ;
        public EmpID: any ;
        public USER_CODE: string ;
        public USER_Password: string ;
        public USER_Email: string ;
        public IsAutoLogin: boolean ;
        public NameUser: string ;
        public EmpCode: string ;
        public Address_City: string ;
        public Tel: string ;
        public Fax: string ;
        public Email: string ;
        public WebSite: string ;
        public BranchManager: string ;
        public GroupVatNo: string ;
        public StatusFlag: string;


 }

 export class IQ_Sys_RoleUsersComp  { 
constructor() {
 
        this.UserID= 0;
        this.RoleId= 0;
        this.RoleIds= '';
        this.RoleDescA= '';
        this.RoleDescE= '';
        this.CompNameA= '';
        this.CompNameE= '';
        this.EmpID= null;
        this.USER_CODE= '';
        this.USER_Password= '';
        this.USER_Email= '';
        this.IsAutoLogin= false;
        this.Token= '';
        this.USER_NAME= '';
        this.CompCode= 0;
        this.EmpCode= '';
        this.StatusOpen= 0;
        this.StatusRemark= '';
        this.CountRoleOnCompany= 0;
        this.WebSite= '';
        this.IsArchive= false;
        this.Email= '';
        this.Fax= '';
        this.Tel= '';
        this.Address= '';
        this.City= '';
        this.IsActive= false;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public RoleId: number ;
        public RoleIds: string ;
        public RoleDescA: string ;
        public RoleDescE: string ;
        public CompNameA: string ;
        public CompNameE: string ;
        public EmpID: any ;
        public USER_CODE: string ;
        public USER_Password: string ;
        public USER_Email: string ;
        public IsAutoLogin: boolean ;
        public Token: string ;
        public USER_NAME: string ;
        public CompCode: number ;
        public EmpCode: string ;
        public StatusOpen: number ;
        public StatusRemark: string ;
        public CountRoleOnCompany: number ;
        public WebSite: string ;
        public IsArchive: boolean ;
        public Email: string ;
        public Fax: string ;
        public Tel: string ;
        public Address: string ;
        public City: string ;
        public IsActive: boolean ;
        public StatusFlag: string;


 }

 export class IQ_Sys_Users  { 
constructor() {
 
        this.UserID= 0;
        this.EmpID= null;
        this.EmpCode= '';
        this.USER_CODE= '';
        this.USER_PASSWORD= '';
        this.USER_NAME= '';
        this.USER_ACTIVE= false;
        this.USER_Email= '';
        this.Token= '';
        this.UpdatedBy= '';
        this.UpdatedAt= '';
        this.CreatedBy= '';
        this.CreatedAt= '';
        this.FirstLogin= '';
        this.LastLogin= '';
        this.ChangePasswordDate= '';
        this.USER_PASSWORD2= '';
        this.USER_Status= 0;
        this.DescZone= '';
        this.DescFamilyZone= '';
        this.StatusFlag = '';
 }
        public UserID: number ;
        public EmpID: any ;
        public EmpCode: string ;
        public USER_CODE: string ;
        public USER_PASSWORD: string ;
        public USER_NAME: string ;
        public USER_ACTIVE: boolean ;
        public USER_Email: string ;
        public Token: string ;
        public UpdatedBy: string ;
        public UpdatedAt: string ;
        public CreatedBy: string ;
        public CreatedAt: string ;
        public FirstLogin: string ;
        public LastLogin: string ;
        public ChangePasswordDate: string ;
        public USER_PASSWORD2: string ;
        public USER_Status: number ;
        public DescZone: string ;
        public DescFamilyZone: string ;
        public StatusFlag: string;


 }

 export class Sys_Branch  { 
constructor() {
 
        this.CompCode= 0;
        this.BranchCode= 0;
        this.BranchDescA= '';
        this.BranchDescE= '';
        this.Tel= '';
        this.Fax= '';
        this.Email= '';
        this.WebSite= '';
        this.BranchManager= '';
        this.GroupVatNo= '';
        this.VndIDTypeCode= 0;
        this.IDNo= '';
        this.Address_Street= '';
        this.Address_Str_Additional= '';
        this.Address_BuildingNo= '';
        this.Address_Build_Additional= '';
        this.Address_City= '';
        this.Address_Postal= '';
        this.Address_Province= '';
        this.Address_District= '';
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public BranchCode: number ;
        public BranchDescA: string ;
        public BranchDescE: string ;
        public Tel: string ;
        public Fax: string ;
        public Email: string ;
        public WebSite: string ;
        public BranchManager: string ;
        public GroupVatNo: string ;
        public VndIDTypeCode: number ;
        public IDNo: string ;
        public Address_Street: string ;
        public Address_Str_Additional: string ;
        public Address_BuildingNo: string ;
        public Address_Build_Additional: string ;
        public Address_City: string ;
        public Address_Postal: string ;
        public Address_Province: string ;
        public Address_District: string ;
        public StatusFlag: string;


 }

 export class Sys_Company  { 
constructor() {
 
        this.CompCode= 0;
        this.NameA= '';
        this.NameE= '';
        this.IsActive= false;
        this.City= '';
        this.Address= '';
        this.Tel= '';
        this.Fax= '';
        this.Email= '';
        this.WebSite= '';
        this.MembeshiptStartDate= '';
        this.MembeshipEndDate= '';
        this.MembershipAllanceDays= 0;
        this.MembershipreadOnlyDays= 0;
        this.IsArchive= false;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public NameA: string ;
        public NameE: string ;
        public IsActive: boolean ;
        public City: string ;
        public Address: string ;
        public Tel: string ;
        public Fax: string ;
        public Email: string ;
        public WebSite: string ;
        public MembeshiptStartDate: string ;
        public MembeshipEndDate: string ;
        public MembershipAllanceDays: number ;
        public MembershipreadOnlyDays: number ;
        public IsArchive: boolean ;
        public StatusFlag: string;


 }

 export class Sys_ControlYear  { 
constructor() {
 
        this.CompCode= 0;
        this.FinYear= 0;
        this.FirstDate= '';
        this.LastDate= '';
        this.Status= 0;
        this.IsOpen= false;
        this.StatusFlag = '';
 }
        public CompCode: number ;
        public FinYear: number ;
        public FirstDate: string ;
        public LastDate: string ;
        public Status: number ;
        public IsOpen: boolean ;
        public StatusFlag: string;


 }

 export class Sys_Device  { 
constructor() {
 
        this.ID= 0;
        this.ID_Device= '';
        this.Language= '';
        this.DeviceType= '';
        this.NameBrowser= '';
        this.ISActive= false;
        this.StatusFlag = '';
 }
        public ID: number ;
        public ID_Device: string ;
        public Language: string ;
        public DeviceType: string ;
        public NameBrowser: string ;
        public ISActive: boolean ;
        public StatusFlag: string;


 }

 export class Sys_Favorites  { 
constructor() {
 
        this.FavoriteId= 0;
        this.UserId= 0;
        this.MODULE_CODE= '';
        this.PageName= '';
        this.PageUrl= '';
        this.Icon= '';
        this.CreatedAt= '';
        this.CompCode= 0;
        this.BranchCode= 0;
        this.StatusFlag = '';
 }
        public FavoriteId: number ;
        public UserId: number ;
        public MODULE_CODE: string ;
        public PageName: string ;
        public PageUrl: string ;
        public Icon: string ;
        public CreatedAt: string ;
        public CompCode: number ;
        public BranchCode: number ;
        public StatusFlag: string;


 }

 export class Sys_Log_User  { 
constructor() {
 
        this.LogID= 0;
        this.CompCode= 0;
        this.UserID= '';
        this.TransID= 0;
        this.MODULE_CODE= '';
        this.TrType= '';
        this.Mode= '';
        this.Remarks= '';
        this.Date= '';
        this.IsSuccess= false;
        this.ID_Device= '';
        this.CodeRun= '';
        this.StatusFlag = '';
 }
        public LogID: number ;
        public CompCode: number ;
        public UserID: string ;
        public TransID: number ;
        public MODULE_CODE: string ;
        public TrType: string ;
        public Mode: string ;
        public Remarks: string ;
        public Date: string ;
        public IsSuccess: boolean ;
        public ID_Device: string ;
        public CodeRun: string ;
        public StatusFlag: string;


 }

 export class Sys_Messages  { 
constructor() {
 
        this.MessageId= 0;
        this.SenderId= 0;
        this.ReceiverId= 0;
        this.MessageText= '';
        this.IsRead= false;
        this.CreatedAt= '';
        this.StatusFlag = '';
 }
        public MessageId: number ;
        public SenderId: number ;
        public ReceiverId: number ;
        public MessageText: string ;
        public IsRead: boolean ;
        public CreatedAt: string ;
        public StatusFlag: string;


 }

 export class Sys_Modules  { 
constructor() {
 
        this.MODULE_CODE= '';
        this.MODULE_MENU= '';
        this.MODULE_DESCE= '';
        this.MODULE_DESCA= '';
        this.Url_Image= '';
        this.Icon_Color= '';
        this.MODULE_TYPE= null;
        this.MODULE_SORT= 0;
        this.IS_Show= 0;
        this.CREATE= false;
        this.EDIT= false;
        this.DELETE= false;
        this.PRINT= false;
        this.VIEW= false;
        this.CUSTOM1= false;
        this.CUSTOM2= false;
        this.CUSTOM3= false;
        this.CUSTOM1_DESC= '';
        this.CUSTOM2_DESC= '';
        this.CUSTOM3_DESC= '';
        this.CUSTOM4= false;
        this.CUSTOM5= false;
        this.CUSTOM6= false;
        this.CUSTOM4_DESC= '';
        this.CUSTOM5_DESC= '';
        this.CUSTOM6_DESC= '';
        this.CUSTOM7= false;
        this.CUSTOM8= false;
        this.CUSTOM9= false;
        this.CUSTOM7_DESC= '';
        this.CUSTOM8_DESC= '';
        this.CUSTOM9_DESC= '';
        this.AVAILABLE= false;
        this.Images_Enabled= false;
        this.StatusFlag = '';
 }
        public MODULE_CODE: string ;
        public MODULE_MENU: string ;
        public MODULE_DESCE: string ;
        public MODULE_DESCA: string ;
        public Url_Image: string ;
        public Icon_Color: string ;
        public MODULE_TYPE: any ;
        public MODULE_SORT: number ;
        public IS_Show: number ;
        public CREATE: boolean ;
        public EDIT: boolean ;
        public DELETE: boolean ;
        public PRINT: boolean ;
        public VIEW: boolean ;
        public CUSTOM1: boolean ;
        public CUSTOM2: boolean ;
        public CUSTOM3: boolean ;
        public CUSTOM1_DESC: string ;
        public CUSTOM2_DESC: string ;
        public CUSTOM3_DESC: string ;
        public CUSTOM4: boolean ;
        public CUSTOM5: boolean ;
        public CUSTOM6: boolean ;
        public CUSTOM4_DESC: string ;
        public CUSTOM5_DESC: string ;
        public CUSTOM6_DESC: string ;
        public CUSTOM7: boolean ;
        public CUSTOM8: boolean ;
        public CUSTOM9: boolean ;
        public CUSTOM7_DESC: string ;
        public CUSTOM8_DESC: string ;
        public CUSTOM9_DESC: string ;
        public AVAILABLE: boolean ;
        public Images_Enabled: boolean ;
        public StatusFlag: string;


 }

 export class Sys_Notifications  { 
constructor() {
 
        this.NotificationId= 0;
        this.UserId= 0;
        this.Title= '';
        this.Body= '';
        this.Type= '';
        this.IsRead= false;
        this.CreatedAt= '';
        this.StatusFlag = '';
 }
        public NotificationId: number ;
        public UserId: number ;
        public Title: string ;
        public Body: string ;
        public Type: string ;
        public IsRead: boolean ;
        public CreatedAt: string ;
        public StatusFlag: string;


 }

 export class Sys_Role  { 
constructor() {
 
        this.RoleId= 0;
        this.DescA= '';
        this.DescE= '';
        this.Remarks= '';
        this.IsAvailable= false;
        this.CompCode= 0;
        this.IsShowable= false;
        this.RoleType= 0;
        this.StatusFlag = '';
 }
        public RoleId: number ;
        public DescA: string ;
        public DescE: string ;
        public Remarks: string ;
        public IsAvailable: boolean ;
        public CompCode: number ;
        public IsShowable: boolean ;
        public RoleType: number ;
        public StatusFlag: string;


 }

 export class Sys_RoleModule  { 
constructor() {
 
        this.RoleId= 0;
        this.MODULE_CODE= '';
        this.MODULE_MENU= '';
        this.MODULE_DESCE= '';
        this.MODULE_DESCA= '';
        this.Url_Image= '';
        this.Icon_Color= '';
        this.MODULE_TYPE= null;
        this.MODULE_SORT= 0;
        this.IS_Show= 0;
        this.EXECUTE= false;
        this.CREATE= false;
        this.EDIT= false;
        this.DELETE= false;
        this.PRINT= false;
        this.VIEW= false;
        this.CUSTOM1= false;
        this.CUSTOM2= false;
        this.CUSTOM3= false;
        this.CUSTOM4= false;
        this.CUSTOM5= false;
        this.CUSTOM6= false;
        this.CUSTOM7= false;
        this.CUSTOM8= false;
        this.CUSTOM9= false;
        this.ViewImages= false;
        this.EditImages= false;
        this.Prc_Preference= 0;
        this.StatusFlag = '';
 }
        public RoleId: number ;
        public MODULE_CODE: string ;
        public MODULE_MENU: string ;
        public MODULE_DESCE: string ;
        public MODULE_DESCA: string ;
        public Url_Image: string ;
        public Icon_Color: string ;
        public MODULE_TYPE: any ;
        public MODULE_SORT: number ;
        public IS_Show: number ;
        public EXECUTE: boolean ;
        public CREATE: boolean ;
        public EDIT: boolean ;
        public DELETE: boolean ;
        public PRINT: boolean ;
        public VIEW: boolean ;
        public CUSTOM1: boolean ;
        public CUSTOM2: boolean ;
        public CUSTOM3: boolean ;
        public CUSTOM4: boolean ;
        public CUSTOM5: boolean ;
        public CUSTOM6: boolean ;
        public CUSTOM7: boolean ;
        public CUSTOM8: boolean ;
        public CUSTOM9: boolean ;
        public ViewImages: boolean ;
        public EditImages: boolean ;
        public Prc_Preference: number ;
        public StatusFlag: string;


 }

 export class Sys_RoleUsers  { 
constructor() {
 
        this.UserID= 0;
        this.RoleId= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.ISActive= false;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public RoleId: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public ISActive: boolean ;
        public StatusFlag: string;


 }

 export class Sys_SettingsUserProfile  { 
constructor() {
 
        this.IDSettingsUser= 0;
        this.UserId= 0;
        this.Language= '';
        this.IsDarkMode= false;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.ProfilePhoto= '';
        this.IsEnable_Notifications= false;
        this.IsEnable_Messages= false;
        this.IsEnable_Favorites= false;
        this.StatusFlag = '';
 }
        public IDSettingsUser: number ;
        public UserId: number ;
        public Language: string ;
        public IsDarkMode: boolean ;
        public CompCode: number ;
        public BranchCode: number ;
        public ProfilePhoto: string ;
        public IsEnable_Notifications: boolean ;
        public IsEnable_Messages: boolean ;
        public IsEnable_Favorites: boolean ;
        public StatusFlag: string;


 }

 export class Sys_UserModule  { 
constructor() {
 
        this.UserID= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.MODULE_CODE= '';
        this.MODULE_MENU= '';
        this.MODULE_DESCE= '';
        this.MODULE_DESCA= '';
        this.Url_Image= '';
        this.Icon_Color= '';
        this.MODULE_TYPE= null;
        this.MODULE_SORT= 0;
        this.IS_Show= 0;
        this.EXECUTE= false;
        this.CREATE= false;
        this.EDIT= false;
        this.DELETE= false;
        this.PRINT= false;
        this.VIEW= false;
        this.CUSTOM1= false;
        this.CUSTOM2= false;
        this.CUSTOM3= false;
        this.CUSTOM4= false;
        this.CUSTOM5= false;
        this.CUSTOM6= false;
        this.CUSTOM7= false;
        this.CUSTOM8= false;
        this.CUSTOM9= false;
        this.ViewImages= false;
        this.EditImages= false;
        this.Prc_Preference= 0;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public MODULE_CODE: string ;
        public MODULE_MENU: string ;
        public MODULE_DESCE: string ;
        public MODULE_DESCA: string ;
        public Url_Image: string ;
        public Icon_Color: string ;
        public MODULE_TYPE: any ;
        public MODULE_SORT: number ;
        public IS_Show: number ;
        public EXECUTE: boolean ;
        public CREATE: boolean ;
        public EDIT: boolean ;
        public DELETE: boolean ;
        public PRINT: boolean ;
        public VIEW: boolean ;
        public CUSTOM1: boolean ;
        public CUSTOM2: boolean ;
        public CUSTOM3: boolean ;
        public CUSTOM4: boolean ;
        public CUSTOM5: boolean ;
        public CUSTOM6: boolean ;
        public CUSTOM7: boolean ;
        public CUSTOM8: boolean ;
        public CUSTOM9: boolean ;
        public ViewImages: boolean ;
        public EditImages: boolean ;
        public Prc_Preference: number ;
        public StatusFlag: string;


 }

 export class Sys_Users  { 
constructor() {
 
        this.UserID= 0;
        this.USER_CODE= '';
        this.USER_Email= '';
        this.USER_Password= '';
        this.USER_Password2= '';
        this.USER_NAME= '';
        this.USER_ACTIVE= false;
        this.USER_Status= 0;
        this.ChangePasswordDate= '';
        this.LastLogin= '';
        this.FirstLogin= '';
        this.CreatedAt= '';
        this.CreatedBy= '';
        this.UpdatedAt= '';
        this.UpdatedBy= '';
        this.Token= '';
        this.EmpID= null;
        this.IsAutoLogin= false;
        this.StatusFlag = '';
 }
        public UserID: number ;
        public USER_CODE: string ;
        public USER_Email: string ;
        public USER_Password: string ;
        public USER_Password2: string ;
        public USER_NAME: string ;
        public USER_ACTIVE: boolean ;
        public USER_Status: number ;
        public ChangePasswordDate: string ;
        public LastLogin: string ;
        public FirstLogin: string ;
        public CreatedAt: string ;
        public CreatedBy: string ;
        public UpdatedAt: string ;
        public UpdatedBy: string ;
        public Token: string ;
        public EmpID: any ;
        public IsAutoLogin: boolean ;
        public StatusFlag: string;


 }

 export class sysdiagrams  { 
constructor() {
 
        this.name= '';
        this.principal_id= 0;
        this.diagram_id= 0;
        this.version= 0;
        this.definition= null;
        this.StatusFlag = '';
 }
        public name: string ;
        public principal_id: number ;
        public diagram_id: number ;
        public version: number ;
        public definition: any ;
        public StatusFlag: string;


 }

 export class Z_G_Lnk_Build_DetailJournal  { 
constructor() {
 
        this.ID_Build= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.KeyTrans= '';
        this.DescA_FelidLnk= '';
        this.IsOutFelidTable= false;
        this.NameFelidForeignKeyInTable_Lnk= '';
        this.NameOutTableGetData= '';
        this.NamePrimaryKeyOutTable= '';
        this.NameFelidAcc= '';
        this.NameFelidAmount_InTableLnk= '';
        this.IsCredit= false;
        this.NameFelidRemarks= '';
        this.IsActive= false;
        this.StatusFlag = '';
 }
        public ID_Build: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public KeyTrans: string ;
        public DescA_FelidLnk: string ;
        public IsOutFelidTable: boolean ;
        public NameFelidForeignKeyInTable_Lnk: string ;
        public NameOutTableGetData: string ;
        public NamePrimaryKeyOutTable: string ;
        public NameFelidAcc: string ;
        public NameFelidAmount_InTableLnk: string ;
        public IsCredit: boolean ;
        public NameFelidRemarks: string ;
        public IsActive: boolean ;
        public StatusFlag: string;


 }

 export class Z_G_Lnk_Create_DirectJournal  { 
constructor() {
 
        this.ID_Lnk= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.SerRun= 0;
        this.TransType= '';
        this.KeyTrans= '';
        this.DescA_FelidLnk= '';
        this.NameTableMaster= '';
        this.NameFelidMasterID= '';
        this.NameFelidMasterTrNo= '';
        this.NameFelidCondtionDate= '';
        this.NameFelidCondtionCustom= '';
        this.NameFelidMasterUserID= '';
        this.NameFelidMasterIDExcel= '';
        this.IsAutoDayShift= false;
        this.IsActive= false;
        this.StatusFlag = '';
 }
        public ID_Lnk: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public SerRun: number ;
        public TransType: string ;
        public KeyTrans: string ;
        public DescA_FelidLnk: string ;
        public NameTableMaster: string ;
        public NameFelidMasterID: string ;
        public NameFelidMasterTrNo: string ;
        public NameFelidCondtionDate: string ;
        public NameFelidCondtionCustom: string ;
        public NameFelidMasterUserID: string ;
        public NameFelidMasterIDExcel: string ;
        public IsAutoDayShift: boolean ;
        public IsActive: boolean ;
        public StatusFlag: string;


 }

 export class Z_G_Lnk_CreateAccount  { 
constructor() {
 
        this.ID_Lnk= 0;
        this.CompCode= 0;
        this.BranchCode= 0;
        this.KeyTrans= '';
        this.DescTrans= '';
        this.StartNameAcc= '';
        this.Father_Acc_Code= '';
        this.Acc_Code= '';
        this.AccPrefix= '';
        this.LastNumber= '';
        this.NameTableMaster= '';
        this.NameFelidMasterID= '';
        this.NameFelidTableCompCode= '';
        this.NameFelidTableNameA= '';
        this.NameFelidTableNameE= '';
        this.NameFelidAcc_Code= '';
        this.NameFelidExpr= '';
        this.IsUpdateCode= false;
        this.NameFelidCode= '';
        this.IsActive= false;
        this.StatusFlag = '';
 }
        public ID_Lnk: number ;
        public CompCode: number ;
        public BranchCode: number ;
        public KeyTrans: string ;
        public DescTrans: string ;
        public StartNameAcc: string ;
        public Father_Acc_Code: string ;
        public Acc_Code: string ;
        public AccPrefix: string ;
        public LastNumber: string ;
        public NameTableMaster: string ;
        public NameFelidMasterID: string ;
        public NameFelidTableCompCode: string ;
        public NameFelidTableNameA: string ;
        public NameFelidTableNameE: string ;
        public NameFelidAcc_Code: string ;
        public NameFelidExpr: string ;
        public IsUpdateCode: boolean ;
        public NameFelidCode: string ;
        public IsActive: boolean ;
        public StatusFlag: string;


 }

