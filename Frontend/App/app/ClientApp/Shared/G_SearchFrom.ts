// import SearchModal, { SearchModalConfig } from "../../ClientApp/Shared/Components/Import/SearchModal";
import { SearchModalConfig } from "../../ClientApp/Shared/Components/Import/ModelGrid";

export const Search_Users = (_condition: string = ""): SearchModalConfig => {
  return {
    title: "Search Users",
    tableName: "Sys_Users",
    keyColumn: "UserID",
    condition: _condition ,
    columns: [
      { field: "UserID", title: "UserID", width: 80 ,IsVisible : false },
      { field: "USER_NAME", title: "USER_NAME", width: 200  },
      { field: "USER_Email", title: "USER_Email", width: 250 },
    ],
    searchColumns: ["USER_NAME", "USER_Email"],
    returnField: "USER_NAME",
    displayField: "USER_NAME",
    pageSize: 20,
    orderBy: "UserID",
    orderType: "DESC"
  };
};



// function MyComponent() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [selectedValue, setSelectedValue] = useState<any>(null);
//   const [selectedRow, setSelectedRow] = useState<any>(null);
//   const isDark = useSys(s => s.IsDark);
//   const lang = useSys(s => s.lang);

//   return (
//     <>
//       <button 
//         onClick={() => setIsOpen(true)}
//         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//       >
//         Open Search
//       </button>
      
//       {/* عرض القيمة المحددة */}
//       {selectedValue && (
//         <div className="mt-4 p-3 bg-green-100 rounded-lg">
//           <p><strong>Selected ID:</strong> {selectedValue}</p>
//           {selectedRow && (
//             <pre className="text-sm mt-2">{JSON.stringify(selectedRow, null, 2)}</pre>
//           )}
//         </div>
//       )}
      
//       <SearchModal
//         isOpen={isOpen}
//         onClose={() => setIsOpen(false)}
//         onSelect={(value, row) => {
//           setSelectedValue(value);
//           setSelectedRow(row);
//           console.log("Selected Value:", value);
//           console.log("Selected Row:", row);
//           setIsOpen(false);
//         }}
//         config={Search_Users("Status = 1")}   
//         lang={lang}
//         isDark={isDark}
//       />
//     </>
//   );
// }

// ===== CashTypes — اتعملت من برنامج CreatePageReact =====
export const CashTypes = (_condition: string = ""): SearchModalConfig => {
  return {
    title: "CashTypes",
    tableName: "D_A_CashTypes",
    keyColumn: "CashTypeID",
    condition: _condition,
    columns: [
      { field: "CashTypeID", title: "Cash Type ID", width: 80 },
      { field: "Description", title: "Description", width: 200 },
      { field: "ChargePrc", title: "Charge Prc", width: 200 },
      { field: "CashAccCode", title: "Cash Acc Code", width: 200 },
    ],
    searchColumns: ["Description", "ChargePrc", "CashAccCode"],
    returnField: "CashTypeID",
    displayField: "Description",
    pageSize: 20,
    orderBy: "CashTypeID",
    orderType: "DESC"
  };
};

// ===== FinancialType — اتعملت من برنامج CreatePageReact =====
export const FinancialType = (_condition: string = ""): SearchModalConfig => {
  return {
    title: "FinancialType",
    tableName: "D_A_FinancialType",
    keyColumn: "FinancialTypeID",
    condition: _condition,
    columns: [
      { field: "FinancialTypeID", title: "Financial Type ID", width: 80 },
      { field: "DescAr", title: "Desc Ar", width: 200 },
      { field: "DescEn", title: "Desc En", width: 200 },
    ],
    searchColumns: ["DescAr", "DescEn"],
    returnField: "FinancialTypeID",
    displayField: "DescAr",
    pageSize: 20,
    orderBy: "FinancialTypeID",
    orderType: "DESC"
  };
};

// ===== ACCOUNT — اتعملت من برنامج CreatePageReact =====
export const ACCOUNT = (_condition: string = ""): SearchModalConfig => {
  return {
    title: "ACCOUNT",
    tableName: "A_ACCOUNT",
    keyColumn: "AccountID",
    condition: _condition,
    columns: [
      { field: "AccountID", title: "Account ID", width: 80 },
      { field: "ACC_CODE", title: "ACC CODE", width: 200 },
      { field: "ACC_DESCA", title: "ACC DESCA", width: 200 },
      { field: "ACC_DESCL", title: "ACC DESCL", width: 200 },
    ],
    searchColumns: ["ACC_CODE", "ACC_DESCA", "ACC_DESCL"],
    returnField: "AccountID",
    displayField: "ACC_CODE",
    pageSize: 20,
    orderBy: "AccountID",
    orderType: "DESC"
  };
};
