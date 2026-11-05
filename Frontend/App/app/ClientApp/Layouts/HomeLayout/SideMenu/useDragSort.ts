"use client"
// Drag & drop sorting for the side menu.
// - Mouse: native HTML5 drag & drop on the row (draggable).
// - Touch / pen: pointer events on the drag handle (HTML5 DnD does not fire on touch).
// - Keyboard: ArrowUp / ArrowDown on the handle.
// Rows are matched by data-dnd-id; a drop is only accepted inside the same data-dnd-group.
import { useRef, useState } from "react";
import type React from "react";

export function useDragSort(
  onDrop: (group: string, dragId: string, targetId: string) => void,
  onKeyMove: (group: string, id: string, delta: number) => void
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const groupRef = useRef<string>("");
  const overRef = useRef<string | null>(null);
  const pointerRef = useRef<{ id: string; group: string } | null>(null);

  const reset = () => {
    setDragId(null);
    setOverId(null);
    overRef.current = null;
    groupRef.current = "";
    pointerRef.current = null;
  };

  const setOver = (id: string | null) => {
    if (overRef.current !== id) {
      overRef.current = id;
      setOverId(id);
    }
  };

  const rowProps = (id: string, group: string, enabled: boolean = true) => ({
    "data-dnd-id": id,
    "data-dnd-group": group,
    draggable: enabled,
    onDragStart: (e: React.DragEvent) => {
      if (!enabled) return;
      e.stopPropagation();
      groupRef.current = group;
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", id); } catch { /* ignore */ }
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragId !== null && groupRef.current === group) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setOver(id);
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (dragId !== null && groupRef.current === group && dragId !== id) {
        e.preventDefault();
        e.stopPropagation();
        onDrop(group, dragId, id);
      }
      reset();
    },
    onDragEnd: () => reset(),
  });

  const handleProps = (id: string, group: string) => ({
    style: { touchAction: "none" as const },
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return; // mouse uses native DnD on the row
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      pointerRef.current = { id, group };
      groupRef.current = group;
      setDragId(id);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const cur = pointerRef.current;
      if (!cur) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest?.("[data-dnd-id]") as HTMLElement | null;
      if (row && row.dataset.dndGroup === cur.group) setOver(row.dataset.dndId ?? null);
    },
    onPointerUp: () => {
      const cur = pointerRef.current;
      const target = overRef.current;
      if (cur && target && target !== cur.id) onDrop(cur.group, cur.id, target);
      reset();
    },
    onPointerCancel: () => reset(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        onKeyMove(group, id, e.key === "ArrowUp" ? -1 : 1);
      }
    },
  });

  return { dragId, overId, rowProps, handleProps };
}
