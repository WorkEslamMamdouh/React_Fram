# DynamicSelect Component — Usage Guide

## Overview
A reusable dropdown component that dynamically loads options from a database table.
Follows the same factory-function pattern as `G_SearchFrom.ts`.

## Configuration Interface

```typescript
interface DynamicSelectConfig {
  tableName: string;        // Database table name
  displayField: string;     // Field shown to the user
  valueField: string;       // Field used as the selected value
  condition?: string;       // Optional SQL condition
  attributes?: string[];    // Up to 5 extra fields returned on selection
  orderBy?: string;         // Sort column (defaults to valueField)
  orderType?: "ASC"|"DESC"; // Sort direction (defaults to ASC)
  placeholder?: { en: string; ar: string }; // Custom placeholder
}
```

## Basic Usage

```tsx
import DynamicSelect from "../Shared/Components/Import/DynamicSelect";
import { Select_CashTypes } from "../Shared/G_DynamicSelect";

function MyComponent() {
  const [cashTypeId, setCashTypeId] = useState("");

  return (
    <DynamicSelect
      config={Select_CashTypes()}
      value={cashTypeId}
      onChange={(value, attrs) => {
        setCashTypeId(value);
        console.log("ChargePrc:", attrs.ChargePrc);
      }}
    />
  );
}
```

## With Filtering Condition

```tsx
<DynamicSelect
  config={Select_CashTypes("Status = 1")}
  value={selectedId}
  onChange={(val, attrs) => setSelectedId(val)}
/>
```

## With 2-5 Additional Attributes

```tsx
<DynamicSelect
  config={Select_Account()}
  value={accountId}
  onChange={(value, attrs) => {
    setAccountId(value);
    // attrs.ACC_CODE and attrs.ACC_DESCL are available
  }}
/>
```

## Custom Inline Config (Hyphenated Attributes)

```tsx
<DynamicSelect
  config={{
    tableName: "D_Items",
    displayField: "Desc",
    valueField: "UomID",
    attributes: ["Attr-Rate", "Attr-BasRateQty"],
  }}
  value={uomId}
  onChange={(value, attrs) => {
    setUomId(value);
    console.log(attrs["Attr-Rate"]);      // works with hyphens
    console.log(attrs["Attr-BasRateQty"]);
  }}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `DynamicSelectConfig` | Yes | Configuration object |
| `value` | `any` | No | Current selected value |
| `onChange` | `(value, attrs) => void` | No | Callback with value + attributes |
| `disabled` | `boolean` | No | Disable the dropdown |
| `error` | `boolean` | No | Show error styling |
| `className` | `string` | No | Extra CSS classes |

## Factory Functions (G_DynamicSelect.ts)

| Function | Table | Display | Value | Attributes |
|----------|-------|---------|-------|------------|
| `Select_CashTypes` | D_A_CashTypes | Description | CashTypeID | ChargePrc, CashAccCode |
| `Select_FinancialType` | D_A_FinancialType | DescAr | FinancialTypeID | DescEn |
| `Select_Users` | Sys_Users | USER_NAME | UserID | — |
| `Select_Account` | A_ACCOUNT | ACC_DESCA | AccountID | ACC_CODE, ACC_DESCL |

## States

- **Loading**: Shows "Loading..." / "جاري التحميل..."
- **Empty**: Shows placeholder with no options
- **Error**: Shows "Error loading data" / "خطأ في تحميل البيانات"
- **Disabled**: Greyed out, not interactive
