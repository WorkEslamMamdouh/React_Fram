"use client";

import { ScreenBuilder } from "./ScreenBuilder";
import Toolbar from "./components/Toolbar";
import ComponentPanel from "./components/ComponentPanel";
import LiveCanvas from "./components/LiveCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import BottomPanel from "./components/BottomPanel";

export default function InitalizeComponent() {
  const page = ScreenBuilder();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        onSave={page.handleSave}
        onExport={page.handleExport}
        onImport={page.handleImport}
        onNewScreen={page.handleNewScreen}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Component Panel */}
        <ComponentPanel />

        {/* Center — Live Canvas */}
        <LiveCanvas />

        {/* Right — Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom — Code / JSON Preview */}
      <BottomPanel />
    </div>
  );
}
