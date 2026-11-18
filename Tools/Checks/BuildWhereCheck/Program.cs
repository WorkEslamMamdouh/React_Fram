using System;
using System.Collections.Generic;
using System.Linq;
using GateWay.App;

// Reproducible check for the BuildWhereUltraFast bug ("= 1" replace corrupting "= 15").
// Run:  dotnet run --project Tools/Checks/BuildWhereCheck
internal static class Program
{
    private static int _failed;

    private static void Check(string input, string expectedSql, params object[] expectedValues)
    {
        var (sql, ps) = WhereParameterizer.Parameterize(input);
        var vals = ps.Select(p => p.Value).ToArray();
        bool ok = sql == expectedSql && vals.Length == expectedValues.Length &&
                  vals.Zip(expectedValues, (a, b) => Equals(a, b)).All(x => x);
        if (!ok) _failed++;
        Console.WriteLine((ok ? "PASS  " : "FAIL  ") + input);
        if (!ok)
        {
            Console.WriteLine("      got:      " + sql + "  [" + string.Join(", ", vals.Select(Show)) + "]");
            Console.WriteLine("      expected: " + expectedSql + "  [" + string.Join(", ", expectedValues.Select(Show)) + "]");
        }
    }

    private static string Show(object v) => v is DBNull ? "NULL" : v + " (" + v.GetType().Name + ")";

    private static int Main()
    {
        // the original bug: "= 1" and "= 15" in the same condition
        Check("A = 1 AND B = 15", "A = @p0 AND B = @p1", 1, 15);
        Check("B = 15 AND A = 1", "B = @p0 AND A = @p1", 15, 1);
        Check("TrType = 1 AND CompCode = 15 AND BranchCode = 150", "TrType = @p0 AND CompCode = @p1 AND BranchCode = @p2", 1, 15, 150);
        // decimals / negatives / big numbers
        Check("Price = 1.5", "Price = @p0", 1.5m);
        Check("Qty = -3", "Qty = @p0", -3);
        Check("Id = 9999999999", "Id = @p0", 9999999999L);
        // strings
        Check("Name = N'أحمد'", "Name = @p0", "أحمد");
        Check("Name = 'O''Brien' AND X = 1", "Name = @p0 AND X = @p1", "O'Brien", 1);
        // "=" inside a literal that is not a value must stay untouched
        Check("Note LIKE '%a = 1%' AND Y = 2", "Note LIKE '%a = 1%' AND Y = @p0", 2);
        // comparison operators and column-to-column comparisons
        Check("Amount >= 15 AND Amount <= 150", "Amount >= @p0 AND Amount <= @p1", 15, 150);
        Check("a.Id = b.Id AND a.Code = 7", "a.Id = b.Id AND a.Code = @p0", 7);
        Check("[Col=1] = 5", "[Col=1] = @p0", 5);
        // NULL and things that look like NULL
        Check("X = NULL", "X = @p0", DBNull.Value);
        Check("X = NULLIF(Y, 0)", "X = NULLIF(Y, 0)");
        // not a pure number -> untouched
        Check("X = 1abc", "X = 1abc");
        Check("", "");
        Check("IsActive=1 AND (Cat=15 OR Cat=1)", "IsActive= @p0 AND (Cat= @p1 OR Cat= @p2)", 1, 15, 1);

        Console.WriteLine(_failed == 0 ? "ALL PASSED" : _failed + " FAILED");
        return _failed == 0 ? 0 : 1;
    }
}
