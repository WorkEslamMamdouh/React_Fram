using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GateWay.App
{
    /// <summary>
    /// Turns literal values that follow "=" in a WHERE condition into SQL parameters.
    /// Replaces the old regex + string.Replace approach that corrupted values such as "= 15"
    /// when "= 1" was replaced first, broke decimals ("= 1.5"), escaped quotes ('O''Brien')
    /// and touched "=" characters inside string literals (LIKE '%a=1%').
    ///
    /// Pure function without any dependency on SqlClient so it can be checked in isolation
    /// (see Tools/Checks/BuildWhereCheck).
    /// </summary>
    public static class WhereParameterizer
    {
        public static (string Sql, List<KeyValuePair<string, object>> Parameters) Parameterize(string condition, string prefix = "@p")
        {
            var parameters = new List<KeyValuePair<string, object>>();
            if (string.IsNullOrEmpty(condition))
                return (condition ?? string.Empty, parameters);

            var sb = new StringBuilder(condition.Length + 16);
            int i = 0;
            int n = condition.Length;

            while (i < n)
            {
                char c = condition[i];

                // A string literal that is NOT a value after "=" -> copy it untouched.
                if (c == '\'')
                {
                    int end = SkipQuoted(condition, i);
                    sb.Append(condition, i, end - i);
                    i = end;
                    continue;
                }

                // [bracketed identifiers] and "quoted identifiers" -> copy untouched.
                if (c == '[' || c == '"')
                {
                    char close = c == '[' ? ']' : '"';
                    int end = condition.IndexOf(close, i + 1);
                    end = end < 0 ? n : end + 1;
                    sb.Append(condition, i, end - i);
                    i = end;
                    continue;
                }

                if (c != '=')
                {
                    sb.Append(c);
                    i++;
                    continue;
                }

                // c == '=' : try to read a literal value after it.
                int j = i + 1;
                while (j < n && char.IsWhiteSpace(condition[j])) j++;

                if (TryReadValue(condition, j, out int valueEnd, out object value))
                {
                    string name = prefix + parameters.Count.ToString(CultureInfo.InvariantCulture);
                    parameters.Add(new KeyValuePair<string, object>(name, value));
                    sb.Append("= ").Append(name);
                    i = valueEnd;
                }
                else
                {
                    sb.Append(c);
                    i++;
                }
            }

            return (sb.ToString(), parameters);
        }

        /// <summary>Returns the index just after the closing quote (handles '' escapes).</summary>
        private static int SkipQuoted(string s, int start)
        {
            int k = start + 1;
            while (k < s.Length)
            {
                if (s[k] == '\'')
                {
                    if (k + 1 < s.Length && s[k + 1] == '\'') { k += 2; continue; }
                    return k + 1;
                }
                k++;
            }
            return s.Length; // unterminated: copy the rest as-is
        }

        private static bool IsIdentChar(char ch) => char.IsLetterOrDigit(ch) || ch == '_' || ch == '.' || ch == '@' || ch == '#' || ch == '$';

        private static bool TryReadValue(string s, int j, out int end, out object value)
        {
            end = j;
            value = null!;
            int n = s.Length;
            if (j >= n) return false;

            // N'...' or '...'
            int q = -1;
            if ((s[j] == 'N' || s[j] == 'n') && j + 1 < n && s[j + 1] == '\'') q = j + 1;
            else if (s[j] == '\'') q = j;

            if (q >= 0)
            {
                int close = SkipQuoted(s, q);
                if (close > n || s[close - 1] != '\'' || close - q < 2) return false; // unterminated
                value = s.Substring(q + 1, close - q - 2).Replace("''", "'");
                end = close;
                return true;
            }

            // NULL (whole word)
            if (j + 4 <= n && string.Compare(s, j, "NULL", 0, 4, StringComparison.OrdinalIgnoreCase) == 0 &&
                (j + 4 == n || !IsIdentChar(s[j + 4])))
            {
                value = DBNull.Value;
                end = j + 4;
                return true;
            }

            // number: -?digits(.digits)?  (must not be followed by an identifier char)
            int k = j;
            if (k < n && s[k] == '-') k++;
            int digitsStart = k;
            while (k < n && char.IsDigit(s[k])) k++;
            if (k == digitsStart) return false;
            bool isDecimal = false;
            if (k < n && s[k] == '.' && k + 1 < n && char.IsDigit(s[k + 1]))
            {
                isDecimal = true;
                k++;
                while (k < n && char.IsDigit(s[k])) k++;
            }
            if (k < n && IsIdentChar(s[k])) return false; // e.g. "= 1abc" or "= 1.2.3" -> leave untouched

            string text = s.Substring(j, k - j);
            if (!isDecimal && int.TryParse(text, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out int iv)) value = iv;
            else if (!isDecimal && long.TryParse(text, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out long lv)) value = lv;
            else if (decimal.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out decimal dv)) value = dv;
            else return false;

            end = k;
            return true;
        }
    }
}
