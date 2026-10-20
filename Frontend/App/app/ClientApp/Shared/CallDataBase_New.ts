// Shared/SQL.ts

import { BaseResponse, TableModel } from "../Shared/Entities";
import { Sys } from "./SystemTools";

// =======================
// TYPES & INTERFACES
// =======================
type LoaderControl = { show: any; hide: any } | null;
type QueryResult<T = any> = BaseResponse<T>;

interface IQueryOptions {
  showLoader?: any;
  hideLoader?: any;
  cancelToken?: AbortController;
  retryCount?: number;
  cache?: boolean;
  cacheTTL?: number; // milliseconds
}

interface IBulkOperation {
  TableName: string;
  KeyColumn?: string;
  Data: any[];
  BatchSize?: number;
}

// =======================
// CACHE SYSTEM
// =======================
class QueryCache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static defaultTTL = 60000; // 1 minute

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > (cached.data._ttl || this.defaultTTL)) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  static set(key: string, data: any, ttl: number = this.defaultTTL) {
    data._ttl = ttl;
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  static clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// =======================
// BASE API CALL (OPTIMIZED)
// =======================
async function callApi<T>(
  method: string,
  action: string,
  data: any,
  options?: IQueryOptions
): Promise<T> {
  const startTime = performance.now();
  
  // Check cache for GET operations
  const cacheKey = `${method}:${action}:${JSON.stringify(data)}`;
  if (options?.cache && method === "POST") {
    const cached = QueryCache.get<T>(cacheKey);
    if (cached) {
      console.log(`⚡ Cached response for ${action} (${performance.now() - startTime}ms)`);
      return cached;
    }
  }

  // Retry logic
  const maxRetries = options?.retryCount || 1;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<T>((resolve, reject) => {
        // Abort signal support
        const signal = options?.cancelToken?.signal;
        
        Sys.CallApiEncrypted<BaseResponse<T>>(
          {
            method: method as any,
            controller: "ManageDataSQL",
            action: action,
            data: data,
            onSuccess: (res: BaseResponse<T>) => {
              const executionTime = performance.now() - startTime;
              console.log(`✅ ${action} completed in ${executionTime.toFixed(2)}ms`);
              
              if (res.IsSuccess) {
                resolve(res.Response as T);
              } else {
                reject(new Error(res.ErrorMessage || "Unknown error"));
              }
            },
            onError: (err: BaseResponse) => {
              reject(new Error(err.ErrorMessage || "API call failed"));
            }
          },
          {
            show: options?.showLoader,
            hide: options?.hideLoader
          }
        );
      });
      
      // Cache successful GET results
      if (options?.cache && method === "POST") {
        QueryCache.set(cacheKey, result, options?.cacheTTL);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed for ${action}:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// =======================
// OPTIMIZED QUERY FUNCTION
// =======================
async function QueryOptimized(
  tables: TableModel[], 
  options?: IQueryOptions
): Promise<any[]> {
  if (!tables || tables.length === 0) {
    throw new Error("No tables provided");
  }
  
  return callApi<any[]>("POST", "Query", tables, options);
}

// =======================
// SELECT WITH ADVANCED FEATURES
// =======================
interface ISelectOptions extends IQueryOptions {
  selectedColumns?: string[] | null;
  excludeColumns?: string[] | null;
  orderByID?: string;
  orderType?: "ASC" | "DESC";
  top?: number;
  searchValue?: string;
  searchInColumns?: string[] | null;
  pageNumber?: number;
  pageSize?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

async function Select(
  nameTable: string,
  condition: string = "",
  options?: ISelectOptions
): Promise<any[]> {
  const {
    selectedColumns = null,
    excludeColumns = null,
    orderByID = "",
    orderType = "DESC",
    top = 0,
    searchValue = "",
    searchInColumns = null,
    pageNumber = 0,
    pageSize = 0,
    useCache = false,
    cacheTTL = 30000, // 30 seconds for queries
    ...apiOptions
  } = options || {};

  const table: TableModel = {
    NameTable: nameTable,
    Condition: condition,
    IsPage: pageNumber > 0 && pageSize > 0,
    PageNumber: pageNumber,
    PageSize: pageSize,
    OrderByID: orderByID,
    OrderType: orderType,
    SelectedColumns: selectedColumns,
    Top: top,
    SearchValue: searchValue,
    SearchInColumns: searchInColumns,
    ExcludeColumns: excludeColumns
  };

  const result = await QueryOptimized([table], {
    ...apiOptions,
    cache: useCache,
    cacheTTL: cacheTTL
  });
  
  return GetDataModel(nameTable, [table], result);
}

// =======================
// FAST SELECT WITH PROJECTION
// =======================
async function SelectFast<T = any>(
  nameTable: string,
  condition: string = "",
  columns?: (keyof T)[]
): Promise<T[]> {
  return Select(nameTable, condition, {
    selectedColumns: columns as string[],
    useCache: true,
    cacheTTL: 10000 // 10 seconds for fast queries
  });
}

// =======================
// INSERT WITH RESULT
// =======================
interface IInsertResult {
  rowsAffected: number;
  insertedId?: any;
  insertedIds?: any[];
}

async function Insert(
  nameTable: string,
  data: any,
  options?: IQueryOptions
): Promise<IInsertResult> {
  const result = await callApi<IInsertResult>(
    "POST",
    "Insert",
    { TableName: nameTable, Data: data },
    options
  );
  
  // Clear cache for this table
  QueryCache.clear(nameTable);
  
  return {
    rowsAffected: result.rowsAffected || 0,
    insertedId: result.insertedId,
    insertedIds: result.insertedIds || []
  };
}

// =======================
// BULK INSERT (FASTER)
// =======================
async function InsertBulk(
  nameTable: string,
  dataArray: any[],
  batchSize: number = 500,
  options?: IQueryOptions
): Promise<IInsertResult[]> {
  const results: IInsertResult[] = [];
  
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);
    const result = await Insert(nameTable, batch, options);
    results.push(result);
  }
  
  return results;
}

// =======================
// UPDATE WITH RESULT
// =======================
interface IUpdateResult {
  rowsAffected: number;
  updatedId?: any;
  updatedIds?: any[];
}

async function Update(
  nameTable: string,
  keyColumn: string,
  data: any,
  options?: IQueryOptions
): Promise<IUpdateResult> {
  const result = await callApi<IUpdateResult>(
    "PUT",
    "Update",
    { TableName: nameTable, KeyColumn: keyColumn, Data: data },
    options
  );
  
  // Clear cache for this table
  QueryCache.clear(nameTable);
  
  return {
    rowsAffected: result.rowsAffected || 0,
    updatedId: result.updatedId,
    updatedIds: result.updatedIds || []
  };
}

// =======================
// SMART UPDATE (AUTO DETECTS SINGLE OR BULK)
// =======================
async function UpdateSmart(
  nameTable: string,
  keyColumn: string,
  data: any | any[],
  options?: IQueryOptions
): Promise<IUpdateResult> {
  const isBatch = Array.isArray(data);
  
  if (isBatch && data.length > 100) {
    // Use batch update for large datasets
    const results = await UpdateBulk(nameTable, keyColumn, data, 100, options);
    return {
      rowsAffected: results.reduce((sum, r) => sum + r.rowsAffected, 0),
      updatedIds: results.flatMap(r => r.updatedIds || [])
    };
  }
  
  return Update(nameTable, keyColumn, data, options);
}

// =======================
// BULK UPDATE (FASTER FOR MANY RECORDS)
// =======================
async function UpdateBulk(
  nameTable: string,
  keyColumn: string,
  dataArray: any[],
  batchSize: number = 100,
  options?: IQueryOptions
): Promise<IUpdateResult[]> {
  const results: IUpdateResult[] = [];
  
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);
    const result = await Update(nameTable, keyColumn, batch, options);
    results.push(result);
  }
  
  return results;
}

// =======================
// DELETE WITH OPTIONS
// =======================
interface IDeleteResult {
  rowsAffected: number;
  deletedIds: any[];  // ✅ Changed from optional to required
}

async function Delete(
  nameTable: string,
  keyColumn: string,
  ids: Array<number | string>,
  options?: IQueryOptions
): Promise<IDeleteResult> {
  const result = await callApi<IDeleteResult>(
    "DELETE",
    "Delete",
    { TableName: nameTable, KeyColumn: keyColumn, Ids: ids },
    options
  );
  
  // Clear cache for this table
  QueryCache.clear(nameTable);
  
  // ✅ Always return an object with deletedIds array (never undefined)
  return {
    rowsAffected: result.rowsAffected || 0,
    deletedIds: result.deletedIds || []  // ✅ Ensure it's always an array
  };
}

// =======================
// BULK DELETE (FASTER)
// =======================
async function DeleteBulk(
  nameTable: string,
  keyColumn: string,
  ids: Array<number | string>,
  batchSize: number = 500,
  options?: IQueryOptions
): Promise<IDeleteResult> {
  const results: IDeleteResult = { rowsAffected: 0, deletedIds: [] };
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const result = await Delete(nameTable, keyColumn, batch, options);
    results.rowsAffected += result.rowsAffected;
    // ✅ No need for if check because deletedIds is always an array
    results.deletedIds.push(...result.deletedIds);
  }
  
  return results;
}

// =======================
// GET DATA MODEL (FASTER WITH MEMOIZATION)
// =======================
const memoizedResults = new Map<string, any>();

export function GetDataModel(
  nameTable: string, 
  tables: Array<TableModel>, 
  results: Array<any>,
  useMemoization: boolean = false
): any {
  if (!results || results.length === 0) return null;
  
  const cacheKey = `${nameTable}:${JSON.stringify(tables)}`;
  
  if (useMemoization && memoizedResults.has(cacheKey)) {
    return memoizedResults.get(cacheKey);
  }
  
  const map = new Map<string, any>();
  
  for (let i = 0; i < results.length && i < tables.length; i++) {
    map.set(tables[i].NameTable, {
      ...results[i],
      NameTable: tables[i].NameTable
    });
  }
  
  const result = map.get(nameTable) || null;
  
  if (useMemoization && result) {
    memoizedResults.set(cacheKey, result);
    // Clear memoization after 5 seconds
    setTimeout(() => memoizedResults.delete(cacheKey), 5000);
  }
  
  return result;
}

// =======================
// QUERYS FUNCTION (BACKWARD COMPATIBLE)
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
// TRANSACTION SUPPORT
// =======================
async function Transaction<T>(
  operations: (sql: typeof SQL) => Promise<T>,
  options?: IQueryOptions
): Promise<T> {
  return callApi<T>(
    "POST",
    "Transaction",
    { operations: operations.toString() }, // You'll need to implement this on backend
    options
  );
}

// =======================
// STREAMING LARGE DATASETS
// =======================
async function* StreamData(
  nameTable: string,
  condition: string,
  batchSize: number = 1000,
  options?: ISelectOptions
): AsyncGenerator<any[], void, unknown> {
  let pageNumber = 1;
  let hasMore = true;
  
  while (hasMore) {
    const data = await Select(nameTable, condition, {
      ...options,
      pageNumber,
      pageSize: batchSize
    });
    
    if (data && data.length > 0) {
      yield data;
      pageNumber++;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
}

// =======================
// EXPORT MODERN API
// =======================
export const SQL = {
  // Core functions
  Select,
  SelectFast,
  Insert,
  InsertBulk,
  Update,
  UpdateSmart,
  UpdateBulk,
  Delete,
  DeleteBulk,
  Query: QueryOptimized,
  GetDataModel,
  Transaction,
  StreamData,
  
  // Utilities
  clearCache: (pattern?: string) => QueryCache.clear(pattern),
  
  // Original functions (backward compatibility)
  Querys,
  
  // Legacy API (OLD signature)
  legacy: {
    Select: async (NameTable: string, Condition: string, SelectedColumns: any = null, ShowLoader: any = null, CloseLoader: any = null, OrderByID: string = "", OrderType: string = "DESC", Top: number = 0, SearchValue: string = "", SearchInColumns: any = null, ExcludeColumns: any = null, PageNumber: number = 0, PageSize: number = 0) => {
      return Select(NameTable, Condition, {
        selectedColumns: SelectedColumns,
        excludeColumns: ExcludeColumns,
        orderByID: OrderByID,
        orderType: OrderType as any,
        top: Top,
        searchValue: SearchValue,
        searchInColumns: SearchInColumns,
        pageNumber: PageNumber,
        pageSize: PageSize,
        showLoader: ShowLoader,
        hideLoader: CloseLoader
      });
    },
    
    Insert: async (NameTable: string, data: any, ShowLoader: any, CloseLoader: any) => {
      return Insert(NameTable, data, { showLoader: ShowLoader, hideLoader: CloseLoader });
    },
    
    Update: async (NameTable: string, KeyColumn: string, data: any, ShowLoader: any, CloseLoader: any) => {
      return Update(NameTable, KeyColumn, data, { showLoader: ShowLoader, hideLoader: CloseLoader });
    },
    
    Delete: async (NameTable: string, KeyColumn: string, Ids: Array<number>, ShowLoader: any, CloseLoader: any) => {
      return Delete(NameTable, KeyColumn, Ids, { showLoader: ShowLoader, hideLoader: CloseLoader });
    },
    
    Querys,
    GetDataModel: (NameTable: string, Table: Array<TableModel>, ResList: Array<any>) => {
      return GetDataModel(NameTable, Table, ResList);
    }
  }
};

// =======================
// EXAMPLE USAGE
// =======================
/*
// Modern usage (RECOMMENDED)
const data = await SQL.Select("IQ_Sys_RoleModule", "FIN_YEAR = 2026 and MODULE_CODE = N'Employees'", {
  useCache: true,
  cacheTTL: 30000,
  orderByID: "ID",
  orderType: "DESC",
  pageNumber: 1,
  pageSize: 50,
  showLoader: ShowLoader,
  hideLoader: CloseLoader
});

// Insert with result
const insertResult = await SQL.Insert("Sys_Users", {
  USER_CODE: 'Test7',
  USER_PASSWORD: 'Test7'
}, { showLoader: ShowLoader, hideLoader: CloseLoader });

console.log(`Inserted ID: ${insertResult.insertedId}`);

// Bulk insert
const users = [
  { USER_CODE: 'User1', USER_PASSWORD: 'Pass1' },
  { USER_CODE: 'User2', USER_PASSWORD: 'Pass2' }
];
await SQL.InsertBulk("Sys_Users", users, 500);

// Update with result
const updateResult = await SQL.Update("Sys_Users", "ID", {
  ID: 7,
  USER_CODE: 'Updated'
});
console.log(`Updated ${updateResult.rowsAffected} rows`);

// Smart update (auto detects single vs bulk)
await SQL.UpdateSmart("Sys_Users", "ID", 
  [{ ID: 1, NAME: 'Test1' }, { ID: 2, NAME: 'Test2' }]
);

// Delete with result - ✅ Now deletedIds is always defined
const deleteResult = await SQL.Delete("Sys_Users", "ID", [7, 6]);
console.log(`Deleted ${deleteResult.rowsAffected} rows`);
console.log(`Deleted IDs: ${deleteResult.deletedIds.join(', ')}`); // ✅ No error

// Stream large datasets
for await (const batch of SQL.StreamData("LargeTable", "1=1", 1000)) {
  console.log(`Processing ${batch.length} records`);
}

// Clear cache
SQL.clearCache("Sys_Users");

// Using old API (backward compatible)
const oldData = await SQL.legacy.Select("Sys_Users", "ID = 1", null, ShowLoader, CloseLoader);
*/

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