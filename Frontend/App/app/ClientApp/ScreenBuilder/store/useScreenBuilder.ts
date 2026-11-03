// ============================================================
// Screen Builder — Zustand Store with Undo/Redo
// ============================================================

import { create } from "zustand";
import {
  ScreenConfigV4, FieldConfigV4, DetailConfigV4, ValidationConfigV4,
  GridFilterConfigV4, createEmptyScreen, createEmptyField,
  createEmptyDetail, createEmptyValidation,
} from "../types/ScreenConfig";

// ============================================================
// Types
// ============================================================

export type PreviewMode = "grid" | "create" | "edit" | "view";

export interface SelectedElement {
  type: "field" | "listField" | "filter" | "validation" | "detail" | "detailField" | "screen";
  index: number;
  detailIndex?: number;
}

interface ScreenBuilderState {
  config: ScreenConfigV4;
  isDirty: boolean;
  isEditing: boolean;
  selectedElement: SelectedElement | null;
  previewMode: PreviewMode;
  history: ScreenConfigV4[];
  historyIndex: number;

  // Screen actions
  newScreen: (type: "Grid" | "MasterDetail") => void;
  loadConfig: (cfg: ScreenConfigV4) => void;
  goToWelcome: () => void;
  updateScreen: (updates: Partial<ScreenConfigV4>) => void;
  updatePermissions: (updates: Partial<ScreenConfigV4["permissions"]>) => void;

  // Field actions
  addField: (target?: "fields" | "listFields", detailIdx?: number) => void;
  updateField: (index: number, updates: Partial<FieldConfigV4>, target?: "fields" | "listFields", detailIdx?: number) => void;
  removeField: (index: number, target?: "fields" | "listFields", detailIdx?: number) => void;
  reorderField: (from: number, to: number, target?: "fields" | "listFields", detailIdx?: number) => void;

  // Detail actions
  addDetail: () => void;
  updateDetail: (index: number, updates: Partial<DetailConfigV4>) => void;
  removeDetail: (index: number) => void;

  // Validation actions
  addValidation: () => void;
  updateValidation: (index: number, updates: Partial<ValidationConfigV4>) => void;
  removeValidation: (index: number) => void;

  // Filter actions
  setGridFilter: (filter: GridFilterConfigV4 | null) => void;

  // Selection
  selectElement: (el: SelectedElement | null) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ============================================================
// Helper: push to history
// ============================================================

function pushHistory(state: ScreenBuilderState, newConfig: ScreenConfigV4): Partial<ScreenBuilderState> {
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(JSON.parse(JSON.stringify(newConfig)));
  if (history.length > 50) history.shift();
  return {
    config: newConfig,
    isDirty: true,
    history,
    historyIndex: history.length - 1,
  };
}

function getFieldArray(config: ScreenConfigV4, target: "fields" | "listFields" = "fields", detailIdx?: number): FieldConfigV4[] {
  if (detailIdx != null && detailIdx >= 0 && config.details[detailIdx]) {
    return config.details[detailIdx].fields;
  }
  return target === "listFields" ? config.listFields : config.fields;
}

function setFieldArray(config: ScreenConfigV4, arr: FieldConfigV4[], target: "fields" | "listFields" = "fields", detailIdx?: number): ScreenConfigV4 {
  const c = { ...config };
  if (detailIdx != null && detailIdx >= 0 && c.details[detailIdx]) {
    c.details = c.details.map((d, i) => i === detailIdx ? { ...d, fields: arr } : d);
  } else if (target === "listFields") {
    c.listFields = arr;
  } else {
    c.fields = arr;
  }
  return c;
}

// ============================================================
// Store
// ============================================================

export const useScreenBuilder = create<ScreenBuilderState>((set, get) => {
  const initial = createEmptyScreen("Grid");
  return {
    config: initial,
    isDirty: false,
    isEditing: false,
    selectedElement: null,
    previewMode: "grid",
    history: [JSON.parse(JSON.stringify(initial))],
    historyIndex: 0,

    newScreen: (type) => {
      const cfg = createEmptyScreen(type);
      set({
        config: cfg,
        isDirty: false,
        isEditing: true,
        selectedElement: null,
        history: [JSON.parse(JSON.stringify(cfg))],
        historyIndex: 0,
      });
    },

    loadConfig: (cfg) => {
      set({
        config: cfg,
        isDirty: false,
        isEditing: true,
        selectedElement: null,
        history: [JSON.parse(JSON.stringify(cfg))],
        historyIndex: 0,
      });
    },

    goToWelcome: () => {
      const cfg = createEmptyScreen("Grid");
      set({
        config: cfg,
        isDirty: false,
        isEditing: false,
        selectedElement: null,
        history: [JSON.parse(JSON.stringify(cfg))],
        historyIndex: 0,
      });
    },

    updateScreen: (updates) => {
      const state = get();
      const newConfig = { ...state.config, ...updates };
      set(pushHistory(state, newConfig));
    },

    updatePermissions: (updates) => {
      const state = get();
      const newConfig = { ...state.config, permissions: { ...state.config.permissions, ...updates } };
      set(pushHistory(state, newConfig));
    },

    addField: (target = "fields", detailIdx) => {
      const state = get();
      const arr = [...getFieldArray(state.config, target, detailIdx)];
      const f = createEmptyField(`NewField_${arr.length + 1}`);
      f.order = arr.length + 1;
      arr.push(f);
      const newConfig = setFieldArray({ ...state.config }, arr, target, detailIdx);
      set(pushHistory(state, newConfig));
    },

    updateField: (index, updates, target = "fields", detailIdx) => {
      const state = get();
      const arr = [...getFieldArray(state.config, target, detailIdx)];
      if (index < 0 || index >= arr.length) return;
      arr[index] = { ...arr[index], ...updates };
      const newConfig = setFieldArray({ ...state.config }, arr, target, detailIdx);
      set(pushHistory(state, newConfig));
    },

    removeField: (index, target = "fields", detailIdx) => {
      const state = get();
      const arr = [...getFieldArray(state.config, target, detailIdx)];
      if (index < 0 || index >= arr.length) return;
      arr.splice(index, 1);
      const newConfig = setFieldArray({ ...state.config }, arr, target, detailIdx);
      set({ ...pushHistory(state, newConfig), selectedElement: null });
    },

    reorderField: (from, to, target = "fields", detailIdx) => {
      const state = get();
      const arr = [...getFieldArray(state.config, target, detailIdx)];
      if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      arr.forEach((f, i) => f.order = i + 1);
      const newConfig = setFieldArray({ ...state.config }, arr, target, detailIdx);
      set(pushHistory(state, newConfig));
    },

    addDetail: () => {
      const state = get();
      if (state.config.details.length >= 5) return;
      const newConfig = {
        ...state.config,
        details: [...state.config.details, createEmptyDetail()],
      };
      set(pushHistory(state, newConfig));
    },

    updateDetail: (index, updates) => {
      const state = get();
      const details = [...state.config.details];
      if (index < 0 || index >= details.length) return;
      details[index] = { ...details[index], ...updates };
      set(pushHistory(state, { ...state.config, details }));
    },

    removeDetail: (index) => {
      const state = get();
      const details = [...state.config.details];
      if (index < 0 || index >= details.length) return;
      details.splice(index, 1);
      set({ ...pushHistory(state, { ...state.config, details }), selectedElement: null });
    },

    addValidation: () => {
      const state = get();
      const newConfig = {
        ...state.config,
        validations: [...state.config.validations, createEmptyValidation()],
      };
      set(pushHistory(state, newConfig));
    },

    updateValidation: (index, updates) => {
      const state = get();
      const validations = [...state.config.validations];
      if (index < 0 || index >= validations.length) return;
      validations[index] = { ...validations[index], ...updates };
      set(pushHistory(state, { ...state.config, validations }));
    },

    removeValidation: (index) => {
      const state = get();
      const validations = [...state.config.validations];
      if (index < 0 || index >= validations.length) return;
      validations.splice(index, 1);
      set({ ...pushHistory(state, { ...state.config, validations }), selectedElement: null });
    },

    setGridFilter: (filter) => {
      const state = get();
      set(pushHistory(state, { ...state.config, gridFilter: filter }));
    },

    selectElement: (el) => set({ selectedElement: el }),
    setPreviewMode: (mode) => set({ previewMode: mode }),

    undo: () => {
      const state = get();
      if (state.historyIndex <= 0) return;
      const newIndex = state.historyIndex - 1;
      set({
        config: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
        selectedElement: null,
      });
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return;
      const newIndex = state.historyIndex + 1;
      set({
        config: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
        selectedElement: null,
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  };
});
