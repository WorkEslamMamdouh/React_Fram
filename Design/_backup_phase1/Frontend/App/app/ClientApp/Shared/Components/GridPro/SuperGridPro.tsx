'use client';  // <--- أضف هذا السطر في البداية
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";

/**
 * =========================================================
 * 🔥 TYPES & INTERFACES
 * =========================================================
 */

// Generic type for grid data with optional children
export interface GridRow {
  id: string | number;
  [key: string]: any;
}

// Extended type for tree grid support
export interface TreeGridRow extends GridRow {
  children?: TreeGridRow[];
}

// Column configuration
export interface GridColumn<T = GridRow> {
  field: keyof T | string;
  title: string;
  type?: "text" | "select" | "checkbox" | "date" | "number";
  editable?: boolean;
  insertable?: boolean;
  freeze?: "left" | "right";
  options?: string[];
  validate?: (value: any) => boolean;
  render?: (value: any, row: T) => ReactNode;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  tempValue?: any;
}

// Fetch data parameters
export interface FetchParams {
  pageNumber: number;
  pageSize: number;
  search: string;
  sortField: string | null;
  sortDir: "asc" | "desc";
  filters: Record<string, any>;
  groupBy: string | null;
}

// API response type
export interface FetchResponse<T = GridRow> {
  data: T[];
  total: number;
}

// Theme configuration
export interface Theme {
  wrapper: string;
  table: string;
  header: string;
  row: string;
  active: string;
}

export interface Themes {
  light: Theme;
  dark: Theme;
  [key: string]: Theme;
}

// Plugin interface
export interface GridPlugin<T = GridRow> {
  onDataLoaded?: (data: T[]) => void;
  beforeInsert?: (row: T) => void;
  afterInsert?: (row: T) => void;
  beforeUpdate?: (row: T) => void;
  afterUpdate?: (row: T) => void;
  beforeDelete?: (row: T) => void;
  afterDelete?: (row: T) => void;
  onCellClick?: (payload: { row: T; column: GridColumn<T> }) => void;
  onRowClick?: (row: T) => void;
   onRowDoubleClick?: (row: T) => void;  // <-- أضف هذا السطر
}

// Cell position
export interface CellPosition {
  row: number;
  col: number;
}

// Grid props
export interface SuperGridProProps<T extends GridRow = GridRow> {
  // DATA
  columns: GridColumn<T>[];
  fetchData?: (params: FetchParams) => Promise<FetchResponse<T>>;
  insertFunction?: (row: T) => Promise<void>;
  updateFunction?: (row: T) => Promise<void>;
  deleteFunction?: (id: string | number) => Promise<void>;
  initialData?: T[];

  // FEATURES
  enableInsert?: boolean;
  enableUpdate?: boolean;
  enableDelete?: boolean;
  enableSearch?: boolean;
  enableSort?: boolean;
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableInfiniteScroll?: boolean;
  enableVirtualScroll?: boolean;
  enableGrouping?: boolean;
  enableTreeGrid?: boolean;
  enableExport?: boolean;
  enableSelection?: boolean;
  enableCopyPaste?: boolean;
  enableUndoRedo?: boolean;
  enableKeyboardNavigation?: boolean;
  enableColumnResize?: boolean;
  enableColumnDrag?: boolean;
  enableColumnFreeze?: boolean;
  enableRowEditing?: boolean;
  enableAddForm?: boolean;
  enableThemes?: boolean;
  enablePlugins?: boolean;

  // UI
  pageSize?: number;
  rowHeight?: number;
  height?: number | string;
  theme?: string;

  // EVENTS
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;  // <-- أضف هذا السطر
  onCellClick?: (payload: { row: T; column: GridColumn<T> }) => void;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;

  // PLUGINS
  plugins?: GridPlugin<T>[];
}

/**
 * =========================================================
 * 🔥 SUPER GRID PRO - ENTERPRISE VERSION (TypeScript)
 * =========================================================
 */

export default function SuperGridPro<T extends GridRow = GridRow>({
  // DATA
  columns = [],
  fetchData,
  insertFunction,
  updateFunction,
  deleteFunction,
  initialData = [],

  // FEATURES
  enableInsert = false,
  enableUpdate = false,
  enableDelete = false,
  enableSearch = true,
  enableSort = true,
  enableFilter = true,
  enablePagination = true,
  enableInfiniteScroll = false,
  enableVirtualScroll = true,
  enableGrouping = false,
  enableTreeGrid = false,
  enableExport = true,
  enableSelection = true,
  enableCopyPaste = true,
  enableUndoRedo = true,
  enableKeyboardNavigation = true,
  enableColumnResize = true,
  enableColumnDrag = true,
  enableColumnFreeze = true,
  enableRowEditing = true,
  enableAddForm = true,
  enableThemes = true,
  enablePlugins = true,

  // UI
  pageSize = 50,
  rowHeight = 40,
  height = 500,
  theme = "light",

  // EVENTS
  onRowClick,
   onRowDoubleClick,  // <-- أضف هذا السطر
  onCellClick,
  onInsert,
  onUpdate,
  onDelete,

  // PLUGINS
  plugins = [],
}: SuperGridProProps<T>) {
  /** =========================================================
   * STATE
   * ========================================================= */

  const [data, setData] = useState<T[]>(initialData);
  const [total, setTotal] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [history, setHistory] = useState<T[][]>([]);
  const [future, setFuture] = useState<T[][]>([]);
  const [activeCell, setActiveCell] = useState<CellPosition>({ row: 0, col: 0 });
  const [visibleColumns, setVisibleColumns] = useState<GridColumn<T>[]>(columns);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  /** =========================================================
   * THEMES
   * ========================================================= */

  const themes: Themes = {
    light: {
      wrapper: "bg-white text-black",
      table: "bg-white",
      header: "bg-gray-100",
      row: "hover:bg-gray-50",
      active: "bg-blue-100",
    },
    dark: {
      wrapper: "bg-gray-900 text-white",
      table: "bg-gray-900",
      header: "bg-gray-800",
      row: "hover:bg-gray-700",
      active: "bg-blue-700",
    },
  };

  const currentTheme: Theme = themes[theme] || themes.light;

  /** =========================================================
   * PLUGINS
   * ========================================================= */

  const runPlugins = useCallback(
    (hook: keyof GridPlugin<T>, payload: any): void => {
      if (!enablePlugins) return;

      plugins.forEach((plugin: GridPlugin<T>) => {
        if (plugin[hook]) {
          (plugin[hook] as Function)(payload);
        }
      });
    },
    [plugins, enablePlugins]
  );

  /** =========================================================
   * FETCH DATA
   * ========================================================= */

  const loadData = useCallback(async (): Promise<void> => {
    if (!fetchData) return;

    try {
      const res: FetchResponse<T> = await fetchData({
        pageNumber,
        pageSize,
        search,
        sortField,
        sortDir,
        filters,
        groupBy,
      });

      if (enableInfiniteScroll && pageNumber > 1) {
        setData((prev: T[]) => [...prev, ...res.data]);
      } else {
        setData(res.data);
      }

      setTotal(res.total || 0);

      runPlugins("onDataLoaded", res.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [
    fetchData,
    pageNumber,
    pageSize,
    search,
    sortField,
    sortDir,
    filters,
    groupBy,
    enableInfiniteScroll,
    runPlugins,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** =========================================================
   * VIRTUAL SCROLL
   * ========================================================= */

  const visibleCount: number = Math.ceil(Number(height) / rowHeight);
  const startIndex: number = Math.floor(scrollTop / rowHeight);

  const visibleData: T[] = useMemo((): T[] => {
    if (!enableVirtualScroll) return data;
    return data.slice(startIndex, startIndex + visibleCount + 10);
  }, [data, scrollTop, startIndex, visibleCount, enableVirtualScroll]);

  /** =========================================================
   * GROUPING
   * ========================================================= */

  const groupedData: Record<string, T[]> = useMemo((): Record<string, T[]> => {
    if (!groupBy) return {};

    const map: Record<string, T[]> = {};

    visibleData.forEach((row: T) => {
      const key: string = String(row[groupBy]);

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(row);
    });

    return map;
  }, [visibleData, groupBy]);

  /** =========================================================
   * HISTORY
   * ========================================================= */

  const pushHistory = useCallback((newData: T[]): void => {
    setHistory((prev: T[][]) => [...prev, data]);
    setFuture([]);
    setData(newData);
  }, [data]);

  const undo = useCallback((): void => {
    if (!history.length) return;

    const prev: T[] = history[history.length - 1];

    setFuture((f: T[][]) => [data, ...f]);
    setHistory((h: T[][]) => h.slice(0, -1));
    setData(prev);
  }, [history, data]);

  const redo = useCallback((): void => {
    if (!future.length) return;

    const next: T[] = future[0];

    setHistory((h: T[][]) => [...h, data]);
    setFuture((f: T[][]) => f.slice(1));
    setData(next);
  }, [future, data]);

  /** =========================================================
   * CRUD
   * ========================================================= */

  const handleInsert = useCallback(async (row: T): Promise<void> => {
    if (!enableInsert) return;

    runPlugins("beforeInsert", row);

    try {
      if (insertFunction) {
        await insertFunction(row);
      }

      setData((prev: T[]) => [row, ...prev]);

      if (onInsert) {
        onInsert(row);
      }

      runPlugins("afterInsert", row);
    } catch (error) {
      console.error("Insert failed:", error);
    }
  }, [enableInsert, insertFunction, onInsert, runPlugins]);

  const handleUpdate = useCallback(async (row: T): Promise<void> => {
    if (!enableUpdate) return;

    runPlugins("beforeUpdate", row);

    try {
      if (updateFunction) {
        await updateFunction(row);
      }

      const updated: T[] = data.map((x: T) =>
        x.id === row.id ? row : x
      );

      pushHistory(updated);

      if (onUpdate) {
        onUpdate(row);
      }

      runPlugins("afterUpdate", row);
    } catch (error) {
      console.error("Update failed:", error);
    }
  }, [enableUpdate, updateFunction, data, pushHistory, onUpdate, runPlugins]);

  const handleDelete = useCallback(async (row: T): Promise<void> => {
    if (!enableDelete) return;

    runPlugins("beforeDelete", row);

    try {
      if (deleteFunction) {
        await deleteFunction(row.id);
      }

      const updated: T[] = data.filter((x: T) => x.id !== row.id);

      pushHistory(updated);

      if (onDelete) {
        onDelete(row);
      }

      runPlugins("afterDelete", row);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, [enableDelete, deleteFunction, data, pushHistory, onDelete, runPlugins]);

  /** =========================================================
   * SELECTION
   * ========================================================= */

  const toggleSelection = useCallback((row: T): void => {
    setSelectedRows((prev: T[]) => {
      const exists: T | undefined = prev.find((x: T) => x.id === row.id);
      
      if (exists) {
        return prev.filter((x: T) => x.id !== row.id);
      } else {
        return [...prev, row];
      }
    });
  }, []);

  /** =========================================================
   * EXPORT
   * ========================================================= */

  const exportCSV = useCallback((): void => {
    const headers: string = visibleColumns
      .map((col: GridColumn<T>) => col.title)
      .join(",");

    const rows: string = data
      .map((row: T) =>
        visibleColumns
          .map((col: GridColumn<T>) => row[col.field])
          .join(",")
      )
      .join("\n");

    const blob: Blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a: HTMLAnchorElement = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = "grid.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [visibleColumns, data]);

  /** =========================================================
   * COPY / PASTE
   * ========================================================= */

  const copy = useCallback((): void => {
    navigator.clipboard.writeText(JSON.stringify(data));
  }, [data]);

  const paste = useCallback(async (): Promise<void> => {
    try {
      const text: string = await navigator.clipboard.readText();
      const parsed: T[] = JSON.parse(text);
      pushHistory(parsed);
    } catch (error) {
      console.error("Paste failed:", error);
    }
  }, [pushHistory]);

  /** =========================================================
   * KEYBOARD NAVIGATION
   * ========================================================= */

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!enableKeyboardNavigation) return;

    let { row, col } = activeCell;

    switch (e.key) {
      case "ArrowDown":
        row++;
        break;
      case "ArrowUp":
        row--;
        break;
      case "ArrowRight":
        col++;
        break;
      case "ArrowLeft":
        col--;
        break;
      default:
        return;
    }

    setActiveCell({
      row: Math.max(0, Math.min(row, data.length - 1)),
      col: Math.max(0, Math.min(col, visibleColumns.length - 1)),
    });
  }, [enableKeyboardNavigation, activeCell, data.length, visibleColumns.length]);

  /** =========================================================
   * COLUMN TYPES
   * ========================================================= */

  const renderEditor = useCallback((col: GridColumn<T>, row: T): ReactNode => {
    const value: any = row[col.field];

    // DROPDOWN
    if (col.type === "select") {
      return (
        <select
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const newRow: T = { ...row, [col.field]: e.target.value };
            handleUpdate(newRow);
          }}
          className="border rounded p-1"
        >
          {col.options?.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // CHECKBOX
    if (col.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newRow: T = { ...row, [col.field]: e.target.checked };
            handleUpdate(newRow);
          }}
        />
      );
    }

    // DATE
    if (col.type === "date") {
      return (
        <input
          type="date"
          value={value || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newRow: T = { ...row, [col.field]: e.target.value };
            handleUpdate(newRow);
          }}
          className="border rounded p-1"
        />
      );
    }

    // NUMBER
    if (col.type === "number") {
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val: number = parseFloat(e.target.value);
            
            if (col.validate && !col.validate(val)) return;
            
            const newRow: T = { ...row, [col.field]: val };
            handleUpdate(newRow);
          }}
          className="border rounded p-1"
        />
      );
    }

    // CUSTOM RENDER
    if (col.render) {
      return col.render(value, row);
    }

    // DEFAULT INPUT
    return (
      <input
        value={value ?? ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const val: string = e.target.value;

          if (col.validate && !col.validate(val)) return;

          const newRow: T = { ...row, [col.field]: val };
          handleUpdate(newRow);
        }}
        className="border rounded p-1 w-full"
      />
    );
  }, [handleUpdate]);

  /** =========================================================
   * TREE GRID - FIXED VERSION
   * ========================================================= */

  // Type guard to check if a row has children
  const hasChildren = (row: T): row is T & { children: T[] } => {
    return 'children' in row && Array.isArray((row as any).children);
  };

  // Get children safely
  const getChildren = (row: T): T[] => {
    if (hasChildren(row)) {
      return row.children;
    }
    return [];
  };

  const renderTree = useCallback((rows: T[], level: number = 0): ReactNode => {
    return rows.map((row: T, rIndex: number) => (
      <React.Fragment key={rIndex}>
        <tr className={currentTheme.row}>
          {visibleColumns.map((col: GridColumn<T>, cIndex: number) => (
            <td
              key={cIndex}
              className="border p-2"
              style={{
                paddingLeft: cIndex === 0 ? level * 25 : 10,
              }}
            >
              {String(row[col.field])}
            </td>
          ))}
        </tr>
        {hasChildren(row) && renderTree(getChildren(row), level + 1)}
      </React.Fragment>
    ));
  }, [visibleColumns, currentTheme.row]);

  /** =========================================================
   * UI
   * ========================================================= */

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`border rounded-lg p-3 ${currentTheme.wrapper}`}
    >
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 mb-3">
        {enableSearch && (
          <input
            type="text"
            placeholder="Search..."
            className="border p-2 rounded"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        )}

        {enableInsert && (
          <button
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            onClick={() => setShowAddForm(true)}
          >
            Add
          </button>
        )}

        {enableExport && (
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={exportCSV}
          >
            Export
          </button>
        )}

        {enableUndoRedo && (
          <>
            <button 
              onClick={undo}
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
              disabled={!history.length}
            >
              Undo
            </button>
            <button 
              onClick={redo}
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
              disabled={!future.length}
            >
              Redo
            </button>
          </>
        )}

        {enableCopyPaste && (
          <>
            <button 
              onClick={copy}
              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              Copy
            </button>
            <button 
              onClick={paste}
              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              Paste
            </button>
          </>
        )}

        {enableGrouping && (
          <select
            className="border p-2 rounded"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGroupBy(e.target.value || null)}
            value={groupBy || ""}
          >
            <option value="">Group By</option>
            {columns.map((col: GridColumn<T>) => (
              <option key={String(col.field)} value={String(col.field)}>
                {col.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ADD FORM */}
      {showAddForm && enableAddForm && (
        <div className="border p-3 rounded mb-3">
          <div className="grid grid-cols-4 gap-2">
            {columns
              .filter((col: GridColumn<T>) => col.insertable !== false)
              .map((col: GridColumn<T>) => (
                <input
                  key={String(col.field)}
                  type={col.type === "number" ? "number" : "text"}
                  placeholder={col.title}
                  className="border p-2 rounded"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    col.tempValue = e.target.value;
                  }}
                />
              ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800"
              onClick={() => {
                const newRow: any = {};
                columns.forEach((col: GridColumn<T>) => {
                  newRow[col.field] = col.tempValue;
                });
                handleInsert(newRow as T);
                setShowAddForm(false);
              }}
            >
              Save
            </button>
            <button
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* GRID */}
      <div
        ref={containerRef}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          overflow: "auto",
        }}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => {
          const target = e.target as HTMLDivElement;
          setScrollTop(target.scrollTop);

          if (
            enableInfiniteScroll &&
            target.scrollTop + target.clientHeight >= target.scrollHeight - 10
          ) {
            setPageNumber((p: number) => p + 1);
          }
        }}
      >
        <table className="min-w-full border-collapse">
          <thead>
            <tr className={currentTheme.header}>
              {enableSelection && <th className="border p-2 w-10"></th>}

              {visibleColumns.map((col: GridColumn<T>, cIndex: number) => (
                <th
                  key={cIndex}
                  className="border p-2 cursor-pointer select-none"
                  style={{
                    position: col.freeze && enableColumnFreeze ? "sticky" : "static",
                    left: col.freeze === "left" ? 0 : undefined,
                    right: col.freeze === "right" ? 0 : undefined,
                    backgroundColor: "inherit",
                    zIndex: col.freeze ? 10 : 1,
                  }}
                  onClick={() => {
                    if (!enableSort) return;

                    setSortField(String(col.field));
                    setSortDir((d: "asc" | "desc") =>
                      d === "asc" ? "desc" : "asc"
                    );
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.title}
                    {enableSort && sortField === col.field && (
                      <span>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}

              {(enableDelete || enableUpdate) && <th className="border p-2">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {enableTreeGrid ? (
              renderTree(data)
            ) : groupBy && Object.keys(groupedData).length > 0 ? (
              Object.keys(groupedData).map((group: string) => (
                <React.Fragment key={group}>
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (enableSelection ? 2 : 1)}
                      className="bg-gray-200 font-bold p-2"
                    >
                      {group} ({groupedData[group].length})
                    </td>
                  </tr>
                  {groupedData[group].map((row: T, rIndex: number) => (
                    <tr
                      key={rIndex}
                      className={`${currentTheme.row} ${
                        selectedRows.some((x: T) => x.id === row.id) ? "bg-blue-50" : ""
                      }`}

                  onDoubleClick={() => {  // <-- أضف هذا
                    if (onRowDoubleClick) {
                      onRowDoubleClick(row);
                    }
                  }}
                    >
                      {enableSelection && (
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.some((x: T) => x.id === row.id)}
                            onChange={() => toggleSelection(row)}
                          />
                        </td>
                      )}

                      {visibleColumns.map((col: GridColumn<T>, cIndex: number) => {
                        const isActive: boolean =
                          activeCell.row === rIndex && activeCell.col === cIndex;

                        return (
                          <td
                            key={cIndex}
                            className={`border p-2 ${isActive ? currentTheme.active : ""}`}
                            style={{ height: rowHeight }}
                            onClick={() => {
                              setActiveCell({ row: rIndex, col: cIndex });
                              if (onCellClick) {
                                onCellClick({ row, column: col });
                              }
                            }}
                          >
                            {col.editable && enableRowEditing
                              ? renderEditor(col, row)
                              : col.render 
                                ? col.render(row[col.field], row)
                                : String(row[col.field] ?? "")}
                          </td>
                        );
                      })}

                      {(enableDelete || enableUpdate) && (
                        <td className="border p-2">
                          <div className="flex gap-1">
                            {enableUpdate && (
                              <button
                                className="bg-yellow-600 text-white px-2 py-1 rounded text-sm hover:bg-yellow-700"
                                onClick={() => handleUpdate(row)}
                              >
                                Edit
                              </button>
                            )}
                            {enableDelete && (
                              <button
                                className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                                onClick={() => handleDelete(row)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              visibleData.map((row: T, rIndex: number) => (
                <tr
                  key={rIndex}
                  className={`${currentTheme.row} ${
                    selectedRows.some((x: T) => x.id === row.id) ? "bg-blue-50" : ""
                  }`}
                  style={{ height: rowHeight }}
             
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row);
                    }
                  }}

                 onDoubleClick={() => {  // <-- أضف هذا
                    if (onRowDoubleClick) {
                      onRowDoubleClick(row);
                    }
                  }}
                >
                  {enableSelection && (
                    <td className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.some((x: T) => x.id === row.id)}
                        onChange={() => toggleSelection(row)}
                      />
                    </td>
                  )}

                  {visibleColumns.map((col: GridColumn<T>, cIndex: number) => {
                    const isActive: boolean =
                      activeCell.row === startIndex + rIndex && activeCell.col === cIndex;

                    return (
                      <td
                        key={cIndex}
                        className={`border p-2 ${isActive ? currentTheme.active : ""}`}
                        onClick={() => {
                          setActiveCell({ row: startIndex + rIndex, col: cIndex });
                          if (onCellClick) {
                            onCellClick({ row, column: col });
                          }
                        }}
                      >
                        {col.editable && enableRowEditing
                          ? renderEditor(col, row)
                          : col.render
                            ? col.render(row[col.field], row)
                            : String(row[col.field] ?? "")}
                      </td>
                    );
                  })}

                  {(enableDelete || enableUpdate) && (
                    <td className="border p-2">
                      <div className="flex gap-1">
                        {enableUpdate && (
                          <button
                            className="bg-yellow-600 text-white px-2 py-1 rounded text-sm hover:bg-yellow-700"
                            onClick={() => handleUpdate(row)}
                          >
                            Edit
                          </button>
                        )}
                        {enableDelete && (
                          <button
                            className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                            onClick={() => handleDelete(row)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {enablePagination && total > 0 && (
        <div className="flex gap-2 mt-3 items-center justify-center">
          <button
            onClick={() => setPageNumber((p: number) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {pageNumber} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPageNumber((p: number) => p + 1)}
            disabled={pageNumber >= Math.ceil(total / pageSize)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-2 text-sm text-gray-500">
        {selectedRows.length > 0 && (
          <span>{selectedRows.length} selected | </span>
        )}
        Rows: {data.length} / {total}
      </div>
    </div>
  );
}

/**
 * =========================================================
 * 🔥 EXAMPLE COLUMNS
 * =========================================================
 */

export interface UserRow extends GridRow {
  id: number;
  name: string;
  age: number;
  status: "Active" | "Inactive";
  isAdmin: boolean;
  email: string;
}

// For tree grid
export interface TreeNodeRow extends GridRow {
  id: number;
  name: string;
  children?: TreeNodeRow[];
}

export const columnsExample: GridColumn<UserRow>[] = [
  {
    field: "id",
    title: "ID",
    freeze: "left",
    editable: false,
    insertable: false,
    width: 80,
  },
  {
    field: "name",
    title: "Name",
    editable: true,
    insertable: true,
    width: 200,
  },
  {
    field: "email",
    title: "Email",
    editable: true,
    insertable: true,
    width: 250,
  },
  {
    field: "age",
    title: "Age",
    type: "number",
    editable: true,
    insertable: true,
    validate: (v: number) => v > 0 && v < 150,
    width: 100,
  },
  {
    field: "status",
    title: "Status",
    type: "select",
    editable: true,
    insertable: true,
    options: ["Active", "Inactive"],
    width: 120,
  },
  {
    field: "isAdmin",
    title: "Admin",
    type: "checkbox",
    editable: true,
    insertable: true,
    width: 80,
  },
];

/**
 * =========================================================
 * 🔥 EXAMPLE API
 * =========================================================
 */

export const api = {
  fetchData: async ({
    pageNumber,
    pageSize,
    search,
    sortField,
    sortDir,
  }: FetchParams): Promise<FetchResponse<UserRow>> => {
    const params = new URLSearchParams({
      _page: String(pageNumber),
      _limit: String(pageSize),
      ...(search && { q: search }),
      ...(sortField && { _sort: sortField, _order: sortDir }),
    });

    const response = await fetch(`/api/users?${params}`);
    const data = await response.json();
    const total = parseInt(response.headers.get("X-Total-Count") || "0");

    return { data, total };
  },

  insert: async (row: UserRow): Promise<void> => {
    await fetch(`/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  },

  update: async (row: UserRow): Promise<void> => {
    await fetch(`/api/users/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  },

  delete: async (id: string | number): Promise<void> => {
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * =========================================================
 * 🔥 EXAMPLE PLUGIN
 * =========================================================
 */

export const LoggerPlugin: GridPlugin = {
  onDataLoaded: (data: any[]): void => {
    console.log("Data Loaded:", data.length, "rows");
  },

  beforeInsert: (row: any): void => {
    console.log("Before Insert:", row);
  },

  afterInsert: (row: any): void => {
    console.log("After Insert:", row);
  },

  beforeUpdate: (row: any): void => {
    console.log("Before Update:", row);
  },

  afterUpdate: (row: any): void => {
    console.log("After Update:", row);
  },

  beforeDelete: (row: any): void => {
    console.log("Before Delete:", row);
  },

  afterDelete: (row: any): void => {
    console.log("After Delete:", row);
  },
};