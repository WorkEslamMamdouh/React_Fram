// Shared/SQL.ts

import { BaseResponse, InsertMasterDetailRequest, TableModel, UpdateMasterDetailRequest, DeleteMasterDetailRequest } from "../Shared/Entities";
import { Sys } from "./SystemTools";

// =======================
// CALL API WITH AUTO ENCRYPTION
// =======================
export async function Querys(Table: Array<TableModel>, ShowLoader: any, CloseLoader: any): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "POST",
                controller: "ManageDataSQL",
                action: "Query",
                data: Table,

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log(res.ExecutionTimeMs);
                        resolve(res.Response);
                    }
                    else {
                        console.log(res.ExecutionTimeMs);
                        resolve(res.ErrorMessage);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.log(err.ErrorMessage);
                    reject(err.ErrorMessage);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// GET DATA MODEL
// =======================

export function GetDataModel(
    NameTable: string,
    Table: Array<TableModel>,
    ResList: Array<any>
): Array<any> {

    const map = new Map<string, any>();

    for (let i = 0; i < ResList.length && i < Table.length; i++) {
        map.set(Table[i].NameTable, {
            ...ResList[i],
            NameTable: Table[i].NameTable
        });
    }

    const data = map.get(NameTable);

    if (!data) return [];

    return Object.keys(data)
        .filter(k => !isNaN(Number(k)))
        .map(k => data[k]);
}

// =======================
// SELECT FUNCTION
// =======================

export interface SelectResult<T = any> {
    data: T[];
    totalCount: number;
}

async function Select(
    NameTable: string,
    Condition: string,
    SelectedColumns: any = null,
    ShowLoader: any = null,
    CloseLoader: any = null,
    CacheFlag: number = 0,
    OrderByID: string = "",
    OrderType: string = "DESC",
    Top: number = 0,
    SearchValue: string = "",
    SearchInColumns: any = null,
    ExcludeColumns: any = null,
    PageNumber: number = 0,
    PageSize: number = 0,
    ReturnTotalCount: boolean = false
): Promise<SelectResult> {

    var Table: Array<TableModel>;
    Table = [
        {
            NameTable: NameTable,
            Condition: Condition,
            IsPage: (PageNumber > 0 ? true : false),
            PageNumber: PageNumber,
            PageSize: PageSize,
            OrderByID: OrderByID,
            OrderType: OrderType,
            SelectedColumns: SelectedColumns,
            Top: Top,
            SearchValue: SearchValue,
            SearchInColumns: SearchInColumns,
            ExcludeColumns: ExcludeColumns,
            ReturnTotalCount: ReturnTotalCount
        }
    ];

    var ListData = await Querys(Table, ShowLoader, CloseLoader);
    var Data = GetDataModel(NameTable, Table, ListData);

    if (ReturnTotalCount && Data && Data.length > 0 && Data[0]?.__IsMetaData) {
        const totalCount = Data[0]?.__TotalCount || 0;
        const actualData = Data.slice(1);
        return { data: actualData, totalCount };
    }

    return { data: Data || [], totalCount: Data?.length || 0 };
}

// =======================
// INSERT FUNCTION
// =======================

async function Insert(NameTable: string, data: any, ShowLoader: any, CloseLoader: any): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "POST",
                controller: "ManageDataSQL",
                action: "Insert",
                data: { TableName: NameTable, Data: data },

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                    else {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.log(err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// UPDATE FUNCTION
// =======================

async function Update(NameTable: string, KeyColumn: string, data: any, ShowLoader: any, CloseLoader: any): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "PUT",
                controller: "ManageDataSQL",
                action: "Update",
                data: { TableName: NameTable, KeyColumn: KeyColumn, Data: data },

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                    else {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.log(err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// DELETE FUNCTION
// =======================

async function Delete(NameTable: string, KeyColumn: string, Ids: Array<number>, ShowLoader: any, CloseLoader: any): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "DELETE",
                controller: "ManageDataSQL",
                action: "Delete",
                data: { TableName: NameTable, KeyColumn: KeyColumn, Ids: Ids },

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                    else {
                        console.log(res.ExecutionTimeMs);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.log(err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// 🚀 INSERT MASTER DETAIL FUNCTION
// =======================

async function InsertMasterDetail(
    request: InsertMasterDetailRequest,
    ShowLoader: any,
    CloseLoader: any
): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "POST",
                controller: "ManageDataSQL",
                action: "InsertMasterDetail",
                data: request,

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log("InsertMasterDetail Success:", res.ExecutionTimeMs, "ms");
                        resolve(res);
                    } else {
                        console.error("InsertMasterDetail Failed:", res.ErrorMessage);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.error("InsertMasterDetail Error:", err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// 🚀 UPDATE MASTER DETAIL FUNCTION
// =======================

async function UpdateMasterDetail(
    request: UpdateMasterDetailRequest,
    ShowLoader: any,
    CloseLoader: any
): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "PUT",
                controller: "ManageDataSQL",
                action: "UpdateMasterDetail",
                data: request,

                onSuccess: (res: BaseResponse) => {
                  debugger
                    if (res.IsSuccess) {
                        console.log("UpdateMasterDetail Success:", res.ExecutionTimeMs, "ms");
                        resolve(res);
                    } else {
                        console.error("UpdateMasterDetail Failed:", res.ErrorMessage);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.error("UpdateMasterDetail Error:", err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// 🚀 DELETE MASTER DETAIL FUNCTION
// =======================

async function DeleteMasterDetail(
    request: DeleteMasterDetailRequest,
    ShowLoader: any,
    CloseLoader: any
): Promise<any> {

    return new Promise((resolve, reject) => {
        Sys.CallApiEncrypted<BaseResponse<any>>(
            {
                method: "DELETE",
                controller: "ManageDataSQL",
                action: "DeleteMasterDetail",
                data: request,

                onSuccess: (res: BaseResponse) => {
                    if (res.IsSuccess) {
                        console.log("DeleteMasterDetail Success:", res.ExecutionTimeMs, "ms");
                        resolve(res);
                    } else {
                        console.error("DeleteMasterDetail Failed:", res.ErrorMessage);
                        resolve(res);
                    }
                },
                onError: (err: BaseResponse) => {
                    console.error("DeleteMasterDetail Error:", err.ErrorMessage);
                    reject(err);
                }
            },
            {
                show: ShowLoader,
                hide: CloseLoader
            }
        );
    });
}

// =======================
// EXPORT
// =======================
export const SQL = {
    Select,
    Insert,
    Update,
    Delete,
    Querys,
    GetDataModel,
    InsertMasterDetail,
    UpdateMasterDetail,
    DeleteMasterDetail,   // ✅ الجديد
};







//async function testdataSql (){
 
// let Data = await  SQL.Select("IQ_Sys_RoleModule"," FIN_YEAR = 2026 and MODULE_CODE = N'Employees' ")
// var Data ={
//   ID :  7,
//   USER_CODE :  'Test7',
//   USER_PASSWORD :  'Test7'
// }
// let Res = await  SQL.Insert("Sys_Users",Data , ShowLoader,CloseLoader)
// let Res = await  SQL.Update("Sys_Users","ID" , Data , ShowLoader,CloseLoader)

// var Ids =[7,6] 

// let Res = await  SQL.Delete("Sys_Users","ID" , Ids , ShowLoader,CloseLoader)
// console.log(Res)
 
//}



//  // مثال مبسط: إضافة دور فقط مع تشغيل SP
// async function SimpleInsertWithProcessTrans() {
    
//     const request: InsertMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             data: {
//                 CompCode: 1,
//                 BranchCode: 1,
//                 FloorNumber: 15,
//                 DescAr: "الدور الخامس عشر",
//                 Status: 1
//             }
//         }
//         // لا توجد تفاصيل
//     };

//     try {
//         const result = await SQL.InsertMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم الإضافة بنجاح!");
//             console.log("Master ID:", result.Response.Master.Id);
            
//             // ✅ نتيجة الـ SP
//             if (result.Response.ProcessTrans) {
//                 console.log("SP - TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("SP - Ok:", result.Response.ProcessTrans.Ok);
//             }
//         }
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }


// // مثال مبسط: تحديث دور فقط مع تشغيل SP
// async function SimpleUpdateWithProcessTrans() {
    
//     const request: UpdateMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             keyColumn: "FloorID",
//             data: {
//                 FloorID: 140,
//                 CompCode: 1,
//                 BranchCode: 1,
//                 FloorNumber: 5,
//                 DescAr: "الدور الخامس - محدث",
//                 Status: 1
//             }
//         }
//         // لا توجد تفاصيل
//     };

//     try {
//         const result = await SQL.UpdateMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم التحديث بنجاح!");
//             console.log("Rows Affected:", result.Response.Master.RowsAffected);
            
//             // ✅ نتيجة الـ SP
//             if (result.Response.ProcessTrans) {
//                 console.log("SP - TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("SP - Ok:", result.Response.ProcessTrans.Ok);
//             }
//         }
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }

// // مثال: حذف دور فقط (بدون تفاصيل) مع تشغيل SP
// async function SimpleDeleteMasterOnlyWithProcessTrans() {
    
//     const request: DeleteMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             keyColumn: "FloorID",
//             id: 140
//         }
//         // لا توجد تفاصيل
//     };

//     try {
//         const result = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم حذف الدور بنجاح!");
//             console.log("Master ID:", result.Response.Master.Id);
//             console.log("Rows Affected:", result.Response.Master.RowsAffected);
            
//             if (result.Response.ProcessTrans) {
//                 console.log("SP - TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("SP - Ok:", result.Response.ProcessTrans.Ok);
//             }
//         }
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }

// // مثال: إضافة دور جديد مع وحدات وصيانة وتشغيل SP
// async function InsertNewFloorWithProcessTrans() {
    
//     const request: InsertMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             data: {
//                 CompCode: 1,
//                 BranchCode: 1,
//                 FloorNumber: 10,
//                 DescAr: "الدور العاشر - مشروع تجاري",
//                 DescEn: "Tenth Floor - Commercial Project",
//                 Status: 1,
//                 AccountCode: "ACC-FLOOR-010"
//             }
//         },
//         detail_1: {
//             detailForeignKeyColumn: "FloorID",
//             bulkInsertRequest: {
//                 tableName: "D_B_RealEstateUnit",
//                 dataList: [
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "1001",
//                         Area_SQM: 250.00,
//                         Status: 1,
//                         Owner_FullName: "شركة التقنية الحديثة",
//                         Owner_Phone1: "0501111111",
//                         Commercial_Register_No: "CR-1001"
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "1002",
//                         Area_SQM: 200.00,
//                         Status: 1,
//                         Owner_FullName: "مؤسسة العمران للتطوير",
//                         Owner_Phone1: "0502222222",
//                         Commercial_Register_No: "CR-1002"
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "1003",
//                         Area_SQM: 180.50,
//                         Status: 2,
//                         Owner_FullName: "شركة الخليج للتجارة",
//                         Owner_Phone1: "0503333333",
//                         Commercial_Register_No: "CR-1003"
//                     }
//                 ]
//             }
//         },
//         detail_2: {
//             detailForeignKeyColumn: "FloorID",
//             bulkInsertRequest: {
//                 tableName: "D_B_UnitMaintenance",
//                 dataList: [
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         MaintenanceDate: "2026-01-15",
//                         Description: "صيانة دورية للدور العاشر",
//                         Cost: 5000.00
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         MaintenanceDate: "2026-02-20",
//                         Description: "تغيير أنظمة التكييف",
//                         Cost: 15000.00
//                     }
//                 ]
//             }
//         }
//     };

//     try {
//         const result = await SQL.InsertMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم الإضافة بنجاح!");
//             console.log("📊 Master ID:", result.Response.Master.Id);
//             console.log("📊 Master Data:", result.Response.Master.Data);
            
//             // ✅ نتائج الـ Stored Procedure
//             if (result.Response.ProcessTrans) {
//                 console.log("🔄 Stored Procedure Result:");
//                 console.log("   - ReturnValue:", result.Response.ProcessTrans.ReturnValue);
//                 console.log("   - TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("   - Ok:", result.Response.ProcessTrans.Ok);
//                 console.log("   - IsSuccess:", result.Response.ProcessTrans.IsSuccess);
//             }
            
//             // ✅ نتائج الإدخال
//             console.log("📝 Inserted Details:");
//             result.Response.Inserted.forEach((item: any) => {
//                 console.log(`   - ${item.Table}: ${item.Count} records`);
//             });
            
//             console.log("⏱️ Total Time:", result.Response.Summary.TotalTimeMs, "ms");
//         } else {
//             console.error("❌ فشل الإضافة:", result.ErrorMessage);
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//     }
// }


// مثال: تحديث دور مع حذف وإضافة وحدات وصيانة جديدة مع تشغيل SP
// async function UpdateFloorWithProcessTrans() {
    
//     const request: UpdateMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             keyColumn: "FloorID",
//             data: {
//                 FloorID: 140,
//                 CompCode: 1,
//                 BranchCode: 1,
//                 FloorNumber: 5,
//                 DescAr: "الدور الخامس - تم التطوير",
//                 DescEn: "Fifth Floor - Renovated",
//                 Status: 1,
//                 Remarks: "تم إعادة تأهيل الدور بالكامل"
//             }
//         },
//         detail_1: {
//             detailForeignKeyColumn: "FloorID",
//             delete_Details: {
//                 tableName: "D_B_RealEstateUnit",
//                 keyColumn: "RE_UnitID", 
//                 deleteAllRelated: true
//             },
//             bulkInsertRequest: {
//                 tableName: "D_B_RealEstateUnit",
//                 dataList: [
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "501",
//                         Area_SQM: 300.00,
//                         Status: 1,
//                         Owner_FullName: "شركة الاتحاد العقاري",
//                         Owner_Phone1: "0504444444",
//                         Commercial_Register_No: "CR-501"
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "502",
//                         Area_SQM: 280.00,
//                         Status: 1,
//                         Owner_FullName: "شركة الرياض القابضة",
//                         Owner_Phone1: "0505555555",
//                         Commercial_Register_No: "CR-502"
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         UnitNumber: "503",
//                         Area_SQM: 250.00,
//                         Status: 2,
//                         Owner_FullName: "مؤسسة النخبة العقارية",
//                         Owner_Phone1: "0506666666",
//                         Commercial_Register_No: "CR-503"
//                     }
//                 ]
//             }
//         },
//         detail_2: {
//             detailForeignKeyColumn: "FloorID",
//             delete_Details: {
//                 tableName: "D_B_UnitMaintenance",
//                 keyColumn: "RE_UnitID",
//                 deleteAllRelated: true
//             },
//             bulkInsertRequest: {
//                 tableName: "D_B_UnitMaintenance",
//                 dataList: [
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         MaintenanceDate: "2026-03-01",
//                         Description: "تطوير شامل للدور",
//                         Cost: 25000.00
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         MaintenanceDate: "2026-03-15",
//                         Description: "تركيب أنظمة أمان جديدة",
//                         Cost: 12000.00
//                     },
//                     {
//                         CompCode: 1,
//                         BranchCode: 1,
//                         MaintenanceDate: "2026-04-01",
//                         Description: "تحديث أنظمة الإطفاء",
//                         Cost: 8000.00
//                     }
//                 ]
//             }
//         }
//     };

//     try {
//         const result = await SQL.UpdateMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم التحديث بنجاح!");
            
//             // ✅ البيانات القديمة والجديدة للـ Master
//             console.log("📊 Master - Old Data:", result.Response.Master.OldData);
//             console.log("📊 Master - New Data:", result.Response.Master.NewData);
//             console.log("📊 Master - Rows Affected:", result.Response.Master.RowsAffected);
            
//             // ✅ نتائج الـ Stored Procedure
//             if (result.Response.ProcessTrans) {
//                 console.log("🔄 Stored Procedure Result:");
//                 console.log("   - ReturnValue:", result.Response.ProcessTrans.ReturnValue);
//                 console.log("   - TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("   - Ok:", result.Response.ProcessTrans.Ok);
//                 console.log("   - IsSuccess:", result.Response.ProcessTrans.IsSuccess);
//             }
            
//             // ✅ نتائج الحذف
//             console.log("🗑️ Deleted Details:");
//             result.Response.Deleted.forEach((item: any) => {
//                 console.log(`   - ${item.Table}: ${item.Count} records`);
//             });
            
//             // ✅ نتائج الإضافة
//             console.log("📝 Inserted Details:");
//             result.Response.Inserted.forEach((item: any) => {
//                 console.log(`   - ${item.Table}: ${item.Count} records`);
//             });
            
//             console.log("⏱️ Total Time:", result.Response.Summary.TotalTimeMs, "ms");
//         } else {
//             console.error("❌ فشل التحديث:", result.ErrorMessage);
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//     }
// }

// // مثال: حذف مع تشغيل الـ SP
// async function DeleteFloorWithProcessTrans() {
    
//     const request: DeleteMasterDetailRequest = {
//         compCode: 1,
//         branchCode: 1,
//         keyTrType: "B_RealEstat",
//         masterKeyColumn: "FloorID",
//         runProcessTrans: true,  // ✅ تشغيل الـ SP
//         master: {
//             tableName: "D_B_RE_UnitFloor",
//             keyColumn: "FloorID",
//             id: 140
//         },
//         detail_1: {
//             detailForeignKeyColumn: "FloorID",
//             delete_Details: {
//                 tableName: "D_B_RealEstateUnit",
//                 keyColumn: "RE_UnitID",
//                 deleteAllRelated: true
//             }
//         }
//     };

//     try {
//         const result = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
        
//         if (result.IsSuccess) {
//             console.log("✅ تم الحذف بنجاح!");
//             if (result.Response.ProcessTrans) {
//                 console.log("SP Result:", result.Response.ProcessTrans);
//                 console.log("TrNo:", result.Response.ProcessTrans.TrNo);
//                 console.log("Ok:", result.Response.ProcessTrans.Ok);
//             }
//         } else {
//             console.error("❌ فشل الحذف:", result.ErrorMessage);
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//     }
// }