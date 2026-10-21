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