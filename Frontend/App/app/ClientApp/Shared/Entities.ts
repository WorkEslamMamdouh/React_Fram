import { IQ_Sys_ControlYear, IQ_Sys_RoleModule, IQ_Sys_RoleUsersBranch, IQ_Sys_RoleUsersComp, Sys_Branch, Sys_Company, Sys_ControlYear, Sys_SettingsUserProfile, Sys_Users } from "./Entities_DataBase";

export class CustomClass {
 
}



export type LayoutType = "Login" | "Home" | "Admin" | "Not";


 

export class BaseResponse<T = any> {
  constructor() {
    this.IsSuccess = false;
    this.Response = null as T;
    this.ErrorMessage = "";
    this.StatusCode = 0;
    this.ExecutionTimeMs = "";
  }

  public IsSuccess: boolean;
  public Response: T;
  public ErrorMessage: string;
  public StatusCode: number;
  public ExecutionTimeMs: string;
}
 

export class TableModel {
    constructor() {
        this.NameTable = "";
        this.Condition = "";
        this.CacheFlag = 0;  //0 No Cache , 1 by Cache , 2 Delete Cache 
        this.IsProc = false;
        this.IsExec = false;
        this.IsPage = false;
        this.PageNumber = 0;
        this.PageSize = 0;
        this.Top = 200;
        this.OrderByID = "";
        this.OrderType = "DESC";
        this.SearchValue = "";
        this.parameters = null;
        this.SelectedColumns = null;
        this.ExcludeColumns = null; 
        this.SearchInColumns  = null; 
    }
    
    public NameTable: string;
    public Condition: string;
    public CacheFlag?: number;
    public IsProc?: boolean;
    public IsExec?: boolean;
    public IsPage?: boolean;
    public PageNumber?: number;
    public PageSize?: number;
    public Top?: number;
    public OrderByID?: string;
    public OrderType?: string;
    public SearchValue?: string;
    
    // 🔥 الخصائص الجديدة
    public SelectedColumns?: string[] | null;
    public ExcludeColumns?: string[] | null; 
    public SearchInColumns?: string[] | null; 
    public parameters?: { [key: string]: any } | null;
    public ReturnTotalCount?: boolean;

}

   

export class RepParamter {
    constructor() {
        this.Parameter = "";
        this.Value = "";
    }
    public Parameter: string;
    public Value: string;
}

export class Table_Result {
    constructor() {
        this.Table_Res = new Array<any>();
    }
    public Table_Res: Array<any>;
}

export type MessageType = 'success' | 'error' | 'warning' | 'info';


// ====================== أنواع البيانات (Types) ======================
export class MenuItemType   {
 public MODULE_CODE: string = "";
  public MODULE_TYPE:string =""; 
  public TITLE_AR: string = "";
 public TITLE_EN: string = "";
  public ICON_PATH: string  = "";
  public PARENT_MODULE_CODE: any  = null;
 public  PATH?: any = null;
  public COLOR?: string;
  public onClick?: () => void;
  public openInNewTab?: boolean;
 public order?: number;
};

export type MenuItemWithState = MenuItemType & {
  isOpen?: boolean;
  children?: MenuItemWithState[];
  level?: number;
};

export type SearchResultType = {
  title: string;
  icon: string;
  color: string;
  path: string | null;
  moduleCode: string;
  parentTitle?: string;
  onClick?: () => void;
  openInNewTab?: boolean;
};

export class SysSession {
    public CurrentPrivileges: Array<IQ_Sys_RoleModule> = new Array<IQ_Sys_RoleModule>();
    public CurrentEnvironment: SystemEnvironment = new SystemEnvironment();
    public ModuleCode: string = "" ;
}



class SystemEnvironment { 
  public Sys_SettingsUserProfile: Sys_SettingsUserProfile = new Sys_SettingsUserProfile();
  public Sys_CompanyAndUser: IQ_Sys_RoleUsersComp = new IQ_Sys_RoleUsersComp(); 
  public Sys_Branch: IQ_Sys_RoleUsersBranch = new IQ_Sys_RoleUsersBranch(); 
  public Sys_Control: IQ_Sys_ControlYear = new IQ_Sys_ControlYear(); 
  public CompCode: number = 0; 
  public BranchCode: number = 0; 
  public FinYear: number = 0; 
  public UserID: number = 0; 
  public Token: string = ""; 
}



// =======================
// INTERFACES FOR MASTER DETAIL
// =======================

export interface BulkInsertRequest {
    tableName: string;
    dataList: any[];
}

// ✅ Delete Request
export interface DeleteRequest {
    tableName: string;
    keyColumn: string;
    ids?: number[];
    deleteAllRelated?: boolean;
}

export interface MasterInsertModel {
    tableName: string;
    data: any;
}

export interface MasterUpdateModel {
    tableName: string;
    keyColumn: string;
    data: any;
}

// ✅ Detail Wrapper
export interface DetailWrapper {
    bulkInsertRequest?: BulkInsertRequest;
    delete_Details?: DeleteRequest;
    detailForeignKeyColumn?: string;
}


 // ✅ Insert Master Detail Request
export interface InsertMasterDetailRequest {
    compCode: number;
    branchCode: number;
    keyTrType: string;
    masterKeyColumn: string;
    runProcessTrans: boolean;
    master: {
        tableName: string;
        data: any;
    };
    detail_1?: DetailWrapper;
    detail_2?: DetailWrapper;
    detail_3?: DetailWrapper;
    detail_4?: DetailWrapper;
    detail_5?: DetailWrapper;
}

// ✅ Update Master Detail Request
export interface UpdateMasterDetailRequest {
    compCode: number;
    branchCode: number;
    keyTrType: string;
    masterKeyColumn: string;
    runProcessTrans: boolean;
    master: {
        tableName: string;
        keyColumn: string;
        data: any;
    };
    detail_1?: DetailWrapper;
    detail_2?: DetailWrapper;
    detail_3?: DetailWrapper;
    detail_4?: DetailWrapper;
    detail_5?: DetailWrapper;
}

// ✅ Delete Master Detail Request
export interface DeleteMasterDetailRequest {
    compCode: number;
    branchCode: number;
    keyTrType: string;
    masterKeyColumn: string;
    runProcessTrans: boolean;
    master: {
        tableName: string;
        keyColumn: string;
        id: number;
    };
    detail_1?: DetailWrapper;
    detail_2?: DetailWrapper;
    detail_3?: DetailWrapper;
    detail_4?: DetailWrapper;
    detail_5?: DetailWrapper;
}
