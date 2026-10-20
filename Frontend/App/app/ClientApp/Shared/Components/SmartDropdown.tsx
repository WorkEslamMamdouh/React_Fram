// ملف: ClientApp/Shared/Components/SmartDropdown.tsx
"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useUiStateStore } from "../State/UiStateStore";

export interface SmartDropdownProps {
    // البيانات
    datasource: any[];
    valueField: string;
    textField: string;
    defaultText?: string;
    
    // الحالة
    isLangEN: boolean;
    selectedValue?: string;
    
    // الأحداث
    onChange?: (value: string, selectedItem?: any) => void;
    
    // الـ Ref
    inputRef?: React.RefObject<HTMLSelectElement | null>;
    
    // حفظ القيم تلقائياً
    screenName?: string;
    dropdownId?: string;
    
    // خيارات إضافية
    disabled?: boolean;
    className?: string;
    sortDesc?: boolean;
    sortField?: string;
    dependsOn?: {
        parentValue: string;
        filterField: string;
    };
}

export interface SmartDropdownRef {
    refresh: () => void;
    getValue: () => string;
    setValue: (value: string) => void;
}

export const SmartDropdown = forwardRef<SmartDropdownRef, SmartDropdownProps>((props, ref) => {
    const {
        datasource,
        valueField,
        textField,
        defaultText = "",
        isLangEN,
        selectedValue: externalSelectedValue,
        onChange,
        inputRef: externalRef,
        screenName,
        dropdownId,
        disabled = false,
        className = "",
        sortDesc = false,
        sortField,
        dependsOn
    } = props;

    const internalRef = useRef<HTMLSelectElement>(null);
    const selectRef = externalRef || internalRef;
    
    const [internalSelectedValue, setInternalSelectedValue] = useState<string>("");
    const [currentDatasource, setCurrentDatasource] = useState<any[]>(datasource || []);
    
    // حفظ القيمة في الـ Store
    const getSelection = useUiStateStore((s) => s.getSelection);
    const setSelection = useUiStateStore((s) => s.setSelection);
    
    const selectedValue = externalSelectedValue !== undefined ? externalSelectedValue : internalSelectedValue;
    
    // تحميل القيمة المحفوظة
    useEffect(() => {
        if (screenName && dropdownId && !externalSelectedValue) {
            const savedValue = getSelection(screenName, dropdownId);
            if (savedValue && savedValue !== "null" && savedValue !== "") {
                setInternalSelectedValue(savedValue);
                if (selectRef.current) {
                    selectRef.current.value = savedValue;
                }
            }
        }
    }, [screenName, dropdownId]);
    
    // فلترة البيانات بناءً على الاعتماديات
    useEffect(() => {
        let filtered = [...(datasource || [])];
        
        if (dependsOn?.parentValue && dependsOn.parentValue !== "null" && dependsOn.parentValue !== "") {
            filtered = filtered.filter(x => x[dependsOn.filterField] == dependsOn.parentValue);
        }
        
        // ترتيب البيانات
        if (sortDesc && sortField) {
            filtered.sort((a, b) => b[sortField] - a[sortField]);
        } else if (sortDesc) {
            filtered.sort((a, b) => b[valueField] - a[valueField]);
        }
        
        setCurrentDatasource(filtered);
    }, [datasource, dependsOn?.parentValue, sortDesc, sortField]);
    
    // تعبئة الـ Select
    useEffect(() => {
        if (!selectRef.current) return;
        
        const select = selectRef.current;
        const currentValue = selectedValue;
        
        // تفريغ الخيارات الحالية
        select.innerHTML = '';
        
        // إضافة الخيار الافتراضي
        const defaultOption = document.createElement('option');
        defaultOption.value = "null";
        
        if (defaultText !== "No") {
            if (defaultText !== "") {
                defaultOption.textContent = defaultText;
            } else {
                defaultOption.textContent = isLangEN ? "Select" : "اختار";
            }
            select.appendChild(defaultOption);
        }
        
        // إضافة الخيارات
        if (currentDatasource && currentDatasource.length > 0) {
            currentDatasource.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueField];
                option.textContent = item[textField];
                select.appendChild(option);
            });
        }
        
        // استعادة القيمة المحددة
        if (currentValue && currentValue !== "null" && currentValue !== "") {
            const optionExists = Array.from(select.options).some(opt => opt.value === currentValue);
            if (optionExists) {
                select.value = currentValue;
            }
        }
    }, [currentDatasource, isLangEN, defaultText, valueField, textField, selectedValue]);
    
    const handleChange = (value: string) => {
        if (value !== "null" && value !== "") {
            if (!externalSelectedValue) {
                setInternalSelectedValue(value);
            }
            
            // حفظ في الـ Store
            if (screenName && dropdownId) {
                setSelection(screenName, dropdownId, value);
            }
            
            // إرجاع العنصر المحدد
            const selectedItem = currentDatasource.find(item => item[valueField] == value);
            onChange?.(value, selectedItem);
        } else {
            if (!externalSelectedValue) {
                setInternalSelectedValue("");
            }
            onChange?.("", undefined);
        }
    };
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        refresh: () => {
            // إعادة تعبئة الـ Select
            if (selectRef.current) {
                const event = new Event('change');
                selectRef.current.dispatchEvent(event);
            }
        },
        getValue: () => selectedValue,
        setValue: (value: string) => {
            if (selectRef.current) {
                selectRef.current.value = value;
                handleChange(value);
            }
        }
    }));
    
    return (
        <select
            ref={selectRef}
            className={`smart-dropdown ${className}`}
            disabled={disabled}
            onChange={(e) => handleChange(e.target.value)}
            value={selectedValue || "null"}
        >
            {/* الخيارات تضاف عبر useEffect */}
        </select>
    );
});

SmartDropdown.displayName = "SmartDropdown";