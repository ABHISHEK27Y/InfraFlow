"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Canvas from "@/components/Canvas";
import TerraformEditor from "@/components/Editor";
import NodeSettingsPanel from "@/components/SettingsPannel/NodeSettingsPanel";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import { useDiagramStore } from "@/store/useDiagramStore";
import { DriftDetectionResult } from "@/lib/drift/types";
import SideMenuConfig from "@/components/ConfigPanel";
import ResourceSettingsPanel from "@/components/SettingsPannel/ResourceSettingsPanel";
import { useProjectStore } from "@/store/useProjectStore";
import { useEffect } from "react";
import ProjectManager from "@/components/ProjectManager/ProjectManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CostPanel from "@/components/CostPanel/CostPanel";
import PolicyPanel from "@/components/PolicyPanel/PolicyPanel";
import TerraformImportModal from "@/components/TerraformImport/TerraformImportModal";
import DriftPanel from "@/components/DriftPanel/DriftPanel";
import Minimap from "@/components/Minimap/Minimap";
import GlobalSearch from "@/components/GlobalSearch/GlobalSearch";
import AutoLayoutPanel from "@/components/AutoLayout/AutoLayoutPanel";
import KeyboardShortcutsPanel from "@/components/KeyboardShortcuts/KeyboardShortcutsPanel";
import AIAssistantPanel from "@/components/AIAssistant/AIAssistantPanel";
import CollaborationPanel from "@/components/Collaboration/CollaborationPanel";
import { ExportPanel } from "@/components/Export/ExportPanel";
import { PipelinePanel } from "@/components/Pipeline/PipelinePanel";
import { RemediationPanel } from "@/components/DriftRemediation/RemediationPanel";
import { TemplateMarketplacePanel } from "@/components/TemplateMarketplace/TemplateMarketplacePanel";

function AppContent() {
  const [editorWidth, setEditorWidth] = useState(500);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDriftPanel, setShowDriftPanel] = useState(false);
  const [showAutoLayout, setShowAutoLayout] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);
  const [showTemplateMarketplace, setShowTemplateMarketplace] = useState(false);
  const [driftResult, setDriftResult] = useState<DriftDetectionResult | null>(null);
  const {
    isEditorOpen,
    setEditorState,
    isSettingsOpen,
    isConfigOpen,
    openConfig,
    settingsVersion,
  } = useUIPanelStore();

  const { init: initProjects } = useProjectStore();
  const { nodes, edges } = useDiagramStore();

  useEffect(() => {
    initProjects();
  }, [initProjects]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0c0e]">
      <Header
        onGenerateTerraform={() => setEditorState(true)}
        onShowCanvas={() => setEditorState(false)}
        onToggleConfigPanel={openConfig}
        onImportTerraform={() => setShowImportModal(true)}
        onDriftDetection={() => setShowDriftPanel(true)}
        onAutoLayout={() => setShowAutoLayout(true)}
        onShortcuts={() => setShowShortcuts(true)}
        onAIAssistant={() => setShowAIAssistant(true)}
        onCollaboration={() => setShowCollaboration(true)}
        onExport={() => setShowExport(true)}
        onPipeline={() => setShowPipeline(true)}
        onRemediation={() => setShowRemediation(true)}
        onTemplateMarketplace={() => setShowTemplateMarketplace(true)}
      />
      <div className="relative min-h-0 flex-1">
        <Sidebar />
        <main className="h-full w-full">
          <Canvas />
        </main>

      {isSettingsOpen &&
        (settingsVersion === "node" ? (
          <NodeSettingsPanel editorWidth={isEditorOpen ? editorWidth + 5 : 0} />
        ) : (
          <ResourceSettingsPanel
            editorWidth={isEditorOpen ? editorWidth + 5 : 0}
          />
        ))}

      {isConfigOpen && (
        <SideMenuConfig editorWidth={isEditorOpen ? editorWidth + 5 : 0} />
      )}

      {isEditorOpen && (
        <TerraformEditor
          onClose={() => setEditorState(false)}
          editorWidth={editorWidth}
          setEditorWidth={setEditorWidth}
        />
      )}
      </div>

      <ProjectManager />
      <CostPanel />
      <PolicyPanel />
      <TerraformImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
      <DriftPanel isOpen={showDriftPanel} onClose={() => setShowDriftPanel(false)} onDriftResult={setDriftResult} />
      <Minimap />
      <GlobalSearch />
      <AutoLayoutPanel isOpen={showAutoLayout} onClose={() => setShowAutoLayout(false)} />
      <KeyboardShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <AIAssistantPanel isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
      <CollaborationPanel isOpen={showCollaboration} onClose={() => setShowCollaboration(false)} />
      <ExportPanel isOpen={showExport} onClose={() => setShowExport(false)} nodes={nodes} edges={edges} />
      <PipelinePanel isOpen={showPipeline} onClose={() => setShowPipeline(false)} />
      <RemediationPanel isOpen={showRemediation} onClose={() => setShowRemediation(false)} driftResult={driftResult} />
      <TemplateMarketplacePanel isOpen={showTemplateMarketplace} onClose={() => setShowTemplateMarketplace(false)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
