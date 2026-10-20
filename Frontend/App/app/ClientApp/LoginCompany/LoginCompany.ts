// ملف: LoginCompany.tsx (المعدل)
"use client";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Event_key, InitalizeSystemSession, OpenPage, Set_SettingsUserProfile } from "../Shared/App";
import { useRouter } from "next/navigation";
import { SmartDropdown } from "../Shared/Components/SmartDropdown";
import { Sys } from "../Shared/SystemTools";
import { MessageType, SysSession, TableModel } from "../Shared/Entities";
import { SQL } from "../Shared/CallDataBase";
import { IQ_Sys_ControlYear, IQ_Sys_RoleModule, IQ_Sys_RoleUsersBranch, IQ_Sys_RoleUsersComp, Sys_SettingsUserProfile } from "../Shared/Entities_DataBase";



// =======================
// Company Page  
// =======================
export function LoginCompany() {
    const Router = useRouter();
    const IsLangEN = useSys((s) => s.IsLangEN);
    const DataCompany = useSys((s) => s.DataCompany);
    const DataBranch = useSys((s) => s.DataBranch);
    const DataYearControl = useSys((s) => s.DataYearControl);
    const ShowLoader = useSys((s) => s.ShowLoader);
    const CloseLoader = useSys((s) => s.CloseLoader);
    const SetSession = useSys((s) => s.SetSession);
    const toggleModDark = useSys((s) => s.toggleModDark);
    const toggleNotifications = useSys((s) => s.toggleNotifications);
    const toggleMessages = useSys((s) => s.toggleMessages);
    const toggleFavorites = useSys((s) => s.toggleFavorites);
    const SetLanguage = useSys((s) => s.SetLanguage);
    const SetDataBranch = useSys((s) => s.SetDataBranch);
    const SetDataYearControl = useSys((s) => s.SetDataYearControl);

    // State للقيم المحددة
    const [selectedCompany, setSelectedCompany] = useState<number>(0);
    const [selectedBranch, setSelectedBranch] = useState<number>(0);
    const [selectedYear, setSelectedYear] = useState<number>(0);

    // State للبيانات المصفاة
    const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
    const [filteredYears, setFilteredYears] = useState<any[]>([]);

    // State للتأكد من تحميل البيانات
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

    // References
    const companyRef = useRef<HTMLSelectElement>(null);
    const branchRef = useRef<HTMLSelectElement>(null);
    const yearRef = useRef<HTMLSelectElement>(null);
    const confirmCompanyBtn = useRef<HTMLButtonElement>(null);

    const didRun = useRef(false);

    // ✅ تحميل أول شركة تلقائياً عندما تتحمل بيانات الشركات
    useEffect(() => {
        if (DataCompany && DataCompany.length > 0 && !selectedCompany && !isDataLoaded) {
            const firstCompany = DataCompany[0]?.CompCode;
            if (firstCompany) {
                setSelectedCompany(firstCompany);
                setIsDataLoaded(true);
            }
        }
    }, [DataCompany]);

    // ✅ تحديث الفروع والسنوات عندما تتغير الشركة
    useEffect(() => {
        selectedChange();
    }, [selectedCompany, DataBranch, DataYearControl]);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;
        InitalizeComponent();
    }, []);

    function InitalizeComponent() {
        InitializeEvents();
    }

    function InitializeEvents() {
        setTimeout(() => {
            confirmCompanyBtn.current?.focus();
        }, 50);
    }

    function selectedChange() {
        if (selectedCompany && Number(selectedCompany) !== 0) {
            // فلترة الفروع
            const branches = DataBranch?.filter(x => x.CompCode == selectedCompany) || [];
            setFilteredBranches(branches);

            // ✅ اختيار أول فرع تلقائياً
            if (branches.length > 0 && !selectedBranch) {
                const firstBranch = branches[0]?.BranchCode;
                if (firstBranch) {
                    setSelectedBranch(firstBranch);
                    if (branchRef.current) {
                        branchRef.current.value = firstBranch.toString();
                    }
                }
            }

            // فلترة السنوات وترتيبها تنازلياً
            const years = DataYearControl?.filter(x => x.CompCode == selectedCompany) || [];
            const sortedYears = [...years].sort((a, d) => d.FinYear - a.FinYear);
            setFilteredYears(sortedYears);

            // ✅ اختيار أول سنة تلقائياً (أحدث سنة)
            if (sortedYears.length > 0 && !selectedYear) {
                const firstYear = sortedYears[0]?.FinYear;
                if (firstYear) {
                    setSelectedYear(firstYear);
                    if (yearRef.current) {
                        yearRef.current.value = firstYear.toString();
                    }
                }
            }
        } else {
            setFilteredBranches([]);
            setFilteredYears([]);
        }
    }

    // ✅ معالج تغيير الشركة
    const handleCompanyChange = (value: string, item?: any) => {
        debugger
        setSelectedCompany(Number(value));

        // تفريغ الفروع والسنوات
        setSelectedBranch(0);
        setSelectedYear(0);

        if (branchRef.current) {
            branchRef.current.value = "null";
        }
        if (yearRef.current) {
            yearRef.current.value = "null";
        }
    };

    // ✅ معالج تغيير الفرع
    const handleBranchChange = (value: string, item?: any) => {
        setSelectedBranch(Number(value));
    };

    // ✅ معالج تغيير السنة
    const handleYearChange = (value: string, item?: any) => {
        setSelectedYear(Number(value));
    };

    function backToLoginFromCompany() {
        OpenPage("Login", Router);
    }

    function confirmCompanySelection() {
        if (selectedCompany && selectedBranch && selectedYear) {
            // حفظ الاختيارات
            localStorage.setItem("selectedCompany", selectedCompany.toString());
            localStorage.setItem("selectedBranch", selectedBranch.toString());
            localStorage.setItem("selectedYear", selectedYear.toString());

            const _filteredComp = DataCompany?.filter(x => x.CompCode == selectedCompany) || [];

            if (_filteredComp.length > 0) {

                if (_filteredComp[0].StatusOpen == 0) {
                    Sys.ShowMessage("Login successful!", "تم تسجيل الدخول بنجاح!", "success");
                }

                if (_filteredComp[0].StatusOpen == 1) {
                    Sys.ShowMessage(_filteredComp[0].StatusRemark, _filteredComp[0].StatusRemark, "warning");
                }

                if (_filteredComp[0].StatusOpen == 2) {
                    Sys.ShowMessage(_filteredComp[0].StatusRemark, _filteredComp[0].StatusRemark, "error");
                    return false;
                }

                const _filteredBran = DataBranch?.filter(x => x.CompCode == selectedCompany && x.BranchCode == selectedBranch) || [];
                const _filteredYear = DataYearControl?.filter(x => x.CompCode == selectedCompany && x.FinYear == selectedYear) || [];


                const _filterBran = DataBranch?.filter(x => x.CompCode == selectedCompany ) || [];
                const _filterYear = DataYearControl?.filter(x => x.CompCode == selectedCompany ).sort((a, d) => d.FinYear - a.FinYear) || [];
               debugger
                SetDataBranch(_filterBran)
                SetDataYearControl(_filterYear)

                GetAllPrivileges(_filteredComp[0], _filteredBran[0], _filteredYear[0]);
                // OpenPage("Home", Router);

            }
        }
    }

    async function GetAllPrivileges(Sys_CompanyAndUser: IQ_Sys_RoleUsersComp, Sys_Branch: IQ_Sys_RoleUsersBranch, Sys_Control: IQ_Sys_ControlYear) {

        

        var Table: Array<TableModel>;
        Table = [
            { NameTable: "Sys_SettingsUserProfile", Condition: " UserId = " + Sys_CompanyAndUser.UserID },
            { NameTable: "IQ_Sys_RoleModule", Condition: " CompCode = " + Sys_CompanyAndUser.CompCode + " and FIN_YEAR = " + Sys_Control.FinYear + " and ( RoleId in ( select RoleId from [dbo].[Sys_RoleUsers] where UserID = " + Sys_CompanyAndUser.UserID + ") and UserID in (" + Sys_CompanyAndUser.UserID + ",0)) and (UserID = 0 or (User_CompCode in( " + Sys_CompanyAndUser.CompCode + ",0) and User_BranchCode in( " + Sys_Branch.BranchCode + ",0)))  " }
        ];

        var ListData = await SQL.Querys(Table, ShowLoader, CloseLoader);


        var _SettingsUserProfile =  SQL.GetDataModel("Sys_SettingsUserProfile", Table, ListData);
        var AllPrivileges = SQL.GetDataModel("IQ_Sys_RoleModule", Table, ListData);

        let UserProfile = null;
        if (_SettingsUserProfile.length > 0) {

            UserProfile = _SettingsUserProfile[0]
        }

        debugger

      

let ListModelfilterPrivileges = AllPrivileges.sort(
    (a, b) => (a.MODULE_SORT || 0) - (b.MODULE_SORT || 0)
);
debugger
        // تجميع البيانات مرة واحدة فقط
        let ModuleMap = new Map();

        for (let item of ListModelfilterPrivileges) {
            let moduleCode = item.MODULE_CODE;

            if (!ModuleMap.has(moduleCode)) {
                ModuleMap.set(moduleCode, {
                    userRecords: [],
                    defaultRecords: [],
                    anyRecord: null
                });
            }

            let group = ModuleMap.get(moduleCode);

            if (item.UserID > 0) {
                group.userRecords.push(item);
            } else if (item.UserID === 0) {
                group.defaultRecords.push(item);
            }

            // حفظ أول عنصر كـ fallback
            if (!group.anyRecord) {
                group.anyRecord = item;
            }
        }

        // معالجة النتائج
        let ListNewModelfilterPrivileges = [];

        for (let [moduleCode, group] of ModuleMap) {
            let selectedItem = null;

            // 1- User Records First (أعلى Preference)
            if (group.userRecords.length > 0) {
                selectedItem = group.userRecords.reduce((max : any, current: any) =>
                    (current.Prc_Preference || 0) > (max.Prc_Preference || 0) ? current : max
                );
            }
            // 2- Default Records
            else if (group.defaultRecords.length > 0) {
                selectedItem = group.defaultRecords.reduce((max : any, current : any) =>
                    (current.Prc_Preference || 0) > (max.Prc_Preference || 0) ? current : max
                );
            }
            // 3- fallback
            else if (group.anyRecord) {
                selectedItem = group.anyRecord;
            }

            if (selectedItem) {
                ListNewModelfilterPrivileges.push(selectedItem);
            }
        }

        InitalizeSystemSession(Sys_CompanyAndUser, Sys_Branch, Sys_Control, UserProfile, ListNewModelfilterPrivileges, SetSession)
        debugger
        Set_SettingsUserProfile(UserProfile , toggleModDark , SetLanguage,toggleNotifications,toggleMessages,toggleFavorites) 
        debugger
        // OpenPage("Home", Router);
        OpenPage("Home", Router);
        // OpenPage("TestGrid", Router);

    }

   


    return {
        confirmCompanyBtn,
        // Values
        selectedCompany,
        selectedBranch,
        selectedYear,
        // Filtered Data
        filteredBranches,
        filteredYears,
        // Refs
        companyRef,
        branchRef,
        yearRef,
        // Original Data
        DataCompany,
        DataBranch,
        DataYearControl,
        IsLangEN,
        // Handlers
        handleCompanyChange,
        handleBranchChange,
        handleYearChange,
        // Actions
        backToLoginFromCompany,
        confirmCompanySelection
    };
}