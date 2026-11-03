"use client";

import { ScreenBuilder } from "./ScreenBuilder";
import Toolbar from "./components/Toolbar";
import ComponentPanel from "./components/ComponentPanel";
import LiveCanvas from "./components/LiveCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import BottomPanel from "./components/BottomPanel";
import WelcomeScreen from "./components/WelcomeScreen";
import SetupWizard from "./components/SetupWizard";

export default function InitalizeComponent() {
  const page = ScreenBuilder();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Setup Wizard Modal */}
      {page.wizardType && (
        <SetupWizard
          screenType={page.wizardType}
          onComplete={page.handleWizardComplete}
          onCancel={page.handleWizardCancel}
        />
      )}

      {/* Welcome Screen (when not editing) */}
      {!page.store.isEditing ? (
        <WelcomeScreen
          onNewScreen={page.handleNewScreen}
          onLoadTemplate={page.handleLoadTemplate}
          onImportFile={page.handleImport}
        />
      ) : (
        <>
          {/* Toolbar */}
          <Toolbar
            onSave={page.handleSave}
            onExport={page.handleExport}
            onImport={page.handleImport}
            onNewScreen={page.handleNewScreen}
            onGoBack={page.handleGoBack}
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
        </>
      )}
    </div>
  );
}
