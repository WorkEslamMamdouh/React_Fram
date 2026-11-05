  
 import { LayoutType, SysSession } from "../Shared/Entities";  
import { useSys } from "../Shared/SystemUsing";
import { IQ_Sys_RoleModule, Sys_SettingsUserProfile } from "./Entities_DataBase";

export function OpenPageServer( page: string) {
 
  // 🔥 navigation
  if (typeof window !== "undefined") {
    window.location.href = `/ClientApp/${page}`;
  }
}
export function OpenPage(page: string, router: any) {
  const { ShowLoader } = useSys.getState();

  debugger
  const url = `/ClientApp/${page}`;

  if (window.location.href === window.location.origin+url+'/' || window.location.href === window.location.origin+url) {
    return; // نفس الصفحة، لا تعمل شيئًا
  }

  ShowLoader();
  router.push(url);
}



export function applyStyle(
  name: string,
  isEN: boolean,
  type: number = 1 // 0 Style, 1 Page, 2 Layout
) {
  // حماية Next.js SSR
  if (typeof document === "undefined") return;

  const id = "lang-style_" + name;
  let link = document.getElementById(id) as HTMLLinkElement;

  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  if (type === 0) {
    link.href = isEN
      ? `/StyleDesign/${name}EN.css`
      : `/StyleDesign/${name}AR.css`;
  }

  if (type === 1) {
    link.href = isEN
      ? `/StyleDesign/Pages/${name}/${name}EN.css`
      : `/StyleDesign/Pages/${name}/${name}AR.css`;
  }

  if (type === 2) {
    link.href = isEN
      ? `/StyleDesign/Layouts/${name}EN.css`
      : `/StyleDesign/Layouts/${name}AR.css`;
  }
}

  

export function Event_key(key: string, inputId: string, buttonId: string) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.error(`Input element with id "${inputId}" not found`);
        return;
    }
    
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button element with id "${buttonId}" not found`);
        return;
    }

    input.addEventListener("keypress", function(event) {
        if (event.key === key) {
            event.preventDefault();
            button.click();
        }
    });
}




 // ✅ دالة FillDropwith المعدلة لتعمل مع React (بدون jQuery)
   export function FillDropwith(
        Datasource: any[], 
        InputRef: React.RefObject<HTMLSelectElement | null>,  // ← أضف | null
        Value: string, 
        TextField: string, 
        DefaultText: string = "", 
        IsLangEN : boolean,
        Attrname: string = "", 
        AttrValue: string = "", 
        Attrname2: string = "", 
        AttrValue2: string = "", 
        Attrname3: string = "", 
        AttrValue3: string = ""
    ) {
        debugger;
        
        if (!InputRef.current) return;
        
        // تفريغ الـ Select
        InputRef.current.innerHTML = '';
        
        // إضافة الخيار الافتراضي
        if (DefaultText !== "No") {
            const option = document.createElement('option');
            option.value = "null";
            
            if (DefaultText !== "") {
                option.textContent = DefaultText;
            } else {
                option.textContent = IsLangEN ? "Select" : "اختار";
            }
            
            InputRef.current.appendChild(option);
        }
        
        // التحقق من وجود بيانات
        if (!Datasource || Datasource.length === 0) return;
        
        // إضافة الخيارات بناءً على المعاملات
        if (Attrname !== "" && Attrname2 === "" && Attrname3 === "") {
            // حالة وجود Attribute واحد
            for (let i = 0; i < Datasource.length; i++) {
                const option = document.createElement('option');
                option.value = Datasource[i][Value];
                option.textContent = Datasource[i][TextField];
                option.setAttribute(`data-${Attrname}`, Datasource[i][AttrValue]);
                InputRef.current.appendChild(option);
            }
        }
        else if (Attrname !== "" && Attrname2 !== "" && Attrname3 === "") {
            // حالة وجود Attributeين
            for (let i = 0; i < Datasource.length; i++) {
                const option = document.createElement('option');
                option.value = Datasource[i][Value];
                option.textContent = Datasource[i][TextField];
                option.setAttribute(`data-${Attrname}`, Datasource[i][AttrValue]);
                option.setAttribute(`data-${Attrname2}`, Datasource[i][AttrValue2]);
                InputRef.current.appendChild(option);
            }
        }
        else if (Attrname !== "" && Attrname2 !== "" && Attrname3 !== "") {
            // حالة وجود 3 Attributes
            for (let i = 0; i < Datasource.length; i++) {
                const option = document.createElement('option');
                option.value = Datasource[i][Value];
                option.textContent = Datasource[i][TextField];
                option.setAttribute(`data-${Attrname}`, Datasource[i][AttrValue]);
                option.setAttribute(`data-${Attrname2}`, Datasource[i][AttrValue2]);
                option.setAttribute(`data-${Attrname3}`, Datasource[i][AttrValue3]);
                InputRef.current.appendChild(option);
            }
        }
        else {
            // حالة بدون Attributes
            for (let i = 0; i < Datasource.length; i++) {
                const option = document.createElement('option');
                option.value = Datasource[i][Value];
                option.textContent = Datasource[i][TextField];
                InputRef.current.appendChild(option);
            }
        }
    }

    
export function GetDate() : string {

    return Date.now().toString()
}




export function InitalizeSystemSession(Sys_CompanyAndUser: any, Sys_Branch: any, Sys_Control: any, _UserProfile: Sys_SettingsUserProfile, AllPrivileges: Array<IQ_Sys_RoleModule> , SetSession: any) {



        let _SystemSession: SysSession = new SysSession();

        _SystemSession.CurrentEnvironment.Sys_CompanyAndUser = Sys_CompanyAndUser
        _SystemSession.CurrentEnvironment.Sys_Branch = Sys_Branch
        _SystemSession.CurrentEnvironment.Sys_Control = Sys_Control
        _SystemSession.CurrentEnvironment.Sys_SettingsUserProfile = _UserProfile
        _SystemSession.CurrentPrivileges = AllPrivileges

        _SystemSession.CurrentEnvironment.CompCode = Sys_CompanyAndUser.CompCode
        _SystemSession.CurrentEnvironment.BranchCode = Sys_Branch.BranchCode
        _SystemSession.CurrentEnvironment.FinYear = Sys_Control.FinYear
        _SystemSession.CurrentEnvironment.UserID = Sys_CompanyAndUser.UserID
        _SystemSession.CurrentEnvironment.Token = Sys_CompanyAndUser.Token
  

        SetSession(_SystemSession);

        console.log(_SystemSession)

    }


  export  function Set_SettingsUserProfile(_UserProfile: Sys_SettingsUserProfile,toggleModDark :any , SetLanguage : any , toggleNotifications : any , toggleMessages : any , toggleFavorites : any) {



debugger
        if (_UserProfile == null) {
            toggleModDark(false)

        }
        else {

            toggleNotifications(_UserProfile.IsEnable_Notifications)
            toggleMessages(_UserProfile.IsEnable_Messages)
            toggleFavorites(_UserProfile.IsEnable_Favorites)
            toggleModDark(_UserProfile.IsDarkMode)
            SetLanguage(_UserProfile.Language)

        } 

    }