using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System;
using System.Collections;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using GateWay.App; // ✅ هذا هو الـ namespace الصحيح لـ CryptoHelper

namespace GateWay.Filters
{
    /// <summary>
    /// فلتر فك التشفير التلقائي لـ ManageDataSQLController
    /// </summary>
    public class AutoDecryptFilter : IActionFilter
    {
        // ✅ الـ Actions اللي محتاجة فك تشفير
        private readonly string[] _actionsNeedDecryption = new[]
        {
            "Query",           // بيحتوي على Condition, SearchValue
            "GetDataFromSql",  // بيحتوي على Condition
            "Insert",          // بيحتوي على Data حساسة
            "Insert-list",     // بيحتوي على DataList
            "Update",          // بيحتوي على Data
            "Update-list",     // بيحتوي على DataList
            "Delete",          // بيحتوي على Ids
            "Bulk-Insert",     // بيحتوي على DataList
            "Bulk-Update"      // بيحتوي على DataList
        };

        // ✅ الحقول اللي محتاجة فك تشفير (حسب الـ Model)
        private readonly string[] _fieldsToDecrypt = new[]
        {
            "TableName",      // اسم الجدول
            "KeyColumn",      //    
            "NameTable",      // اسم الجدول
            "Condition",      // شرط WHERE
            "SearchValue",    // قيمة البحث
            "OrderByID",      // الترتيب
            "Data",           // البيانات (JSON)
            "DataList",       // قائمة البيانات
            "Ids"             // قائمة المعرفات
        };

        public void OnActionExecuting(ActionExecutingContext context)
        {
            var methodName = context.ActionDescriptor.RouteValues["action"];

            // ✅ فقط الـ Actions المحددة هي اللي هتتفك
            if (_actionsNeedDecryption.Contains(methodName))
            {
                var arguments = context.ActionArguments;

                foreach (var arg in arguments)
                {
                    var value = arg.Value;
                    if (value == null) continue;

                    // فك تشفير الكائن
                    DecryptObjectRecursive(value, context);
                    if (context.Result != null) return;
                }
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // يمكن إضافة تشفير للـ Response هنا
            if (context.Result is ObjectResult objectResult && objectResult.Value != null)
            {
                // تشفير الـ Response لو فيه بيانات حساسة
                // EncryptResponse(objectResult.Value);
            }
        }

        /// <summary>
        /// فك تشفير الكائن بشكل تكراري
        /// </summary>
        private void DecryptObjectRecursive(object obj, ActionExecutingContext context, int depth = 0)
        {
            if (obj == null || depth > 10) return;

            var type = obj.GetType();

            // 1. معالجة القوائم
            if (obj is IEnumerable enumerable && !(obj is string))
            {
                foreach (var item in enumerable)
                {
                    if (item != null)
                    {
                        DecryptObjectRecursive(item, context, depth + 1);
                    }
                }
                return;
            }

            // 2. معالجة الكائنات العادية
            var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);

            foreach (var prop in properties)
            {
                if (!prop.CanRead || !prop.CanWrite) continue;

                var propValue = prop.GetValue(obj);
                if (propValue == null) continue;

                // ✅ فك تشفير الحقول النصية
                if (prop.PropertyType == typeof(string) && propValue is string strValue)
                {
                    // إذا كان الحقل من الحقول المطلوب فك تشفيرها
                    if (_fieldsToDecrypt.Contains(prop.Name) && IsEncrypted(strValue))
                    {
                        try
                        {
                            var decrypted = DecryptValue(strValue);
                            prop.SetValue(obj, decrypted);
                        }
                        catch (Exception ex)
                        {
                            context.Result = new BadRequestObjectResult(
                                $"Failed to decrypt field '{prop.Name}': {ex.Message}"
                            );
                            return;
                        }
                    }
                    continue;
                }

                // 3. معالجة الكائنات المتداخلة
                if (!IsPrimitiveType(prop.PropertyType))
                {
                    DecryptObjectRecursive(propValue, context, depth + 1);
                    if (context.Result != null) return;
                }
            }
        }

        /// <summary>
        /// فك تشفير القيمة
        /// </summary>
        private string DecryptValue(string encryptedValue)
        {
            if (string.IsNullOrEmpty(encryptedValue)) return encryptedValue;

            try
            {
                // 1. تجربة XOR Fast
                var xorDecrypted = CryptoHelper.DecryptFast(encryptedValue);
                if (xorDecrypted != encryptedValue && !IsEncrypted(xorDecrypted))
                    return xorDecrypted;
                 

                return encryptedValue;
            }
            catch
            {
                return encryptedValue;
            }
        }

        /// <summary>
        /// التحقق إذا كانت القيمة مشفرة
        /// </summary>
        private bool IsEncrypted(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            return IsBase64String(value) && value.Length > 1;
        }

        /// <summary>
        /// التحقق من Base64
        /// </summary>
        private bool IsBase64String(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length % 4 != 0)
                return false;

            try
            {
                Convert.FromBase64String(value);
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// التحقق من primitive types
        /// </summary>
        private bool IsPrimitiveType(Type type)
        {
            return type.IsPrimitive ||
                   type == typeof(string) ||
                   type == typeof(decimal) ||
                   type == typeof(DateTime) ||
                   type == typeof(Guid) ||
                   type.IsEnum;
        }
    }
}