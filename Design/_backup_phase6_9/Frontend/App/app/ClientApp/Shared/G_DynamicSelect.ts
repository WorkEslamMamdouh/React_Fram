import { DynamicSelectConfig } from "../Shared/Components/Import/ModelGrid";

// ===== Factory: CashTypes Dropdown =====
export const Select_CashTypes = (_condition: string = ""): DynamicSelectConfig => {
  return {
    tableName: "D_A_CashTypes",
    displayField: "Description",
    valueField: "CashTypeID",
    condition: _condition,
    attributes: ["ChargePrc", "CashAccCode"],
    orderBy: "CashTypeID",
    orderType: "ASC",
  };
};

// ===== Factory: FinancialType Dropdown =====
export const Select_FinancialType = (_condition: string = ""): DynamicSelectConfig => {
  return {
    tableName: "D_A_FinancialType",
    displayField: "DescAr",
    valueField: "FinancialTypeID",
    condition: _condition,
    attributes: ["DescEn"],
    orderBy: "FinancialTypeID",
    orderType: "ASC",
  };
};

// ===== Factory: Users Dropdown =====
export const Select_Users = (_condition: string = ""): DynamicSelectConfig => {
  return {
    tableName: "Sys_Users",
    displayField: "USER_NAME",
    valueField: "UserID",
    condition: _condition,
    orderBy: "UserID",
    orderType: "ASC",
  };
};

// ===== Factory: Account Dropdown =====
export const Select_Account = (_condition: string = ""): DynamicSelectConfig => {
  return {
    tableName: "A_ACCOUNT",
    displayField: "ACC_DESCA",
    valueField: "AccountID",
    condition: _condition,
    attributes: ["ACC_CODE", "ACC_DESCL"],
    orderBy: "AccountID",
    orderType: "ASC",
  };
};

// ===== Example: Dropdown with Hyphenated Attributes =====
// export const Select_Items = (_condition: string = ""): DynamicSelectConfig => {
//   return {
//     tableName: "D_Items",
//     displayField: "Desc",
//     valueField: "UomID",
//     condition: _condition,
//     attributes: ["Attr-Rate", "Attr-BasRateQty"],
//     orderBy: "UomID",
//     orderType: "ASC",
//   };
// };
