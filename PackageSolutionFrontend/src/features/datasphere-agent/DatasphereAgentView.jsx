import React from 'react';
import { motion } from 'framer-motion';
import { Undo2, Redo2 } from 'lucide-react';
import { FiAlertCircle } from 'react-icons/fi';

import useDsAgent from './hooks/useDsAgent';
import DsUploadZone from './components/DsUploadZone';
import DsInstructionBox from './components/DsInstructionBox';
import DsExportPanel from './components/DsExportPanel';
import DsDependencyGraph from './components/DsDependencyGraph';
import DsPreviewModal from './components/DsPreviewModal';
import DsToast from './components/DsToast';
import DsExportModal from './components/DsExportModal';

import './styles/datasphere-agent.css';

/**
 * Main orchestrator for the Datasphere Agent feature.
 * Designed to be rendered inside PackageSolution's main content area.
 */
const DatasphereAgentView = ({ sharedFile, setSharedFile, collapseSidebar }) => {
  const {
    graphData,
    isProcessing,
    hasData,
    error,
    clearError,
    uploadedFileName,
    showPreview,
    previewSearch,
    setPreviewSearch,
    debouncedSearch,
    matchCount,
    currentMatchIndex,
    originalJsonString,
    currentJsonString,
    getHighlightedJSON,
    handleNextMatch,
    handlePrevMatch,
    closePreview,
    toast,
    handleFileUpload,
    handleInstruction,
    handleUndo,
    handleRedo,
    handlePreview,
  } = useDsAgent();

  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  React.useEffect(() => {
    if (sharedFile) {
      handleFileUpload(sharedFile);
      setSharedFile(null);
    }
  }, [sharedFile, handleFileUpload, setSharedFile]);

  React.useEffect(() => {
    if (showPreview) {
      collapseSidebar?.();
    }
  }, [showPreview, collapseSidebar]);

  return (
    <div
      className="ds-agent-root"
      style={{
        padding: 'clamp(14px, 2.5vw, 24px)',
        paddingBottom: 48,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* ── Toast ── */}
      <DsToast toast={toast} />

      {/* ── Error bar ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--ds-danger-bg)',
            border: '1px solid var(--ds-danger)',
            borderRadius: 'var(--r-md)',
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ds-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            className="icon-btn"
            onClick={clearError}
            style={{ color: 'var(--ds-danger)' }}
          >
            ×
          </button>
        </motion.div>
      )}

      {/* ── Main grid: sidebar controls + graph ── */}
      <div
        className="ds-agent-layout"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 16,
          minHeight: 0,
        }}
      >
        {/* ── Left panel: controls ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {/* 1. Upload */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 14,
              }}
            >
              1. Import Objects file
            </h2>
            <DsUploadZone
              onUpload={handleFileUpload}
              isProcessing={isProcessing}
              uploadedFileName={uploadedFileName}
            />
            {/* TEMP: Download Output JSON button — commented out
            <button
              onClick={async () => {
                try {
                  const DS_BACKEND_URL = import.meta.env.VITE_DS_AGENT_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api/ds' : '/api/ds');
                  const res = await fetch(`${DS_BACKEND_URL}/export`);
                  if (!res.ok) throw new Error("No output JSON available");
                  const data = await res.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = uploadedFileName ? uploadedFileName.replace('.json', '_updated.json') : "DatasphereExport_updated.json";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  alert("Failed to download output JSON. Please ensure a file is loaded and processed.");
                }
              }}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '8px',
                background: 'var(--blue-6)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer'
              }}
            >
              Download Output JSON
            </button>
            */}

          </div>

          {/* 2. Instruction */}
          <div
            className="glass-card"
            style={{
              padding: 20,
              opacity: !hasData ? 0.5 : 1,
              pointerEvents: !hasData ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                2. Instruction
              </h2>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="icon-btn"
                  onClick={handleUndo}
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  className="icon-btn"
                  onClick={handleRedo}
                  title="Redo"
                >
                  <Redo2 size={16} />
                </button>
              </div>
            </div>
            <DsInstructionBox
              onSubmit={handleInstruction}
              isProcessing={isProcessing}
              disabled={!hasData}
              graphData={graphData}
            />
          </div>

          {/* 3. Export */}
          <div
            className="glass-card"
            style={{
              padding: 20,
              marginTop: 'auto',
              opacity: !hasData ? 0.5 : 1,
              pointerEvents: !hasData ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 14,
              }}
            >
              3. Export to Objects file
            </h2>
            <DsExportPanel
              onExport={handleExportClick}
              onPreview={handlePreview}
              onSpaceConnectionChange={(name) =>
                handleInstruction(`change space connection to ${name}`)
              }
            />
          </div>
        </div>

        {/* ── Right panel: graph ── */}
        <div
          className="glass-card ds-graph-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 500,
          }}
        >
          {/* Graph header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-strip)',
              flexShrink: 0,
              borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {uploadedFileName
                ? `Impact and Lineage Analysis for "${uploadedFileName.replace(/\.json$/i, '')}"`
                : 'Impact and Lineage Analysis'}
            </h2>
            {isProcessing && (
              <span
                className="ds-processing-pulse"
                style={{
                  fontSize: 12,
                  color: 'var(--blue-6)',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Processing...
              </span>
            )}
          </div>

          {/* Graph body */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              minHeight: 0,
            }}
          >
            {hasData && <DsDependencyGraph data={graphData} />}
            {!hasData && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-input)',
                  borderRadius: '0 0 var(--r-lg) var(--r-lg)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  >
                    Upload an Objects file to visualize dependencies
                  </p>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Only Objects files are supported</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      <DsPreviewModal
        show={showPreview}
        onClose={closePreview}
        previewSearch={previewSearch}
        setPreviewSearch={setPreviewSearch}
        debouncedSearch={debouncedSearch}
        matchCount={matchCount}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        originalJsonString={originalJsonString}
        currentJsonString={currentJsonString}
        getHighlightedJSON={getHighlightedJSON}
      />

      {/* ── Export JSON Modal ── */}
      <DsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        originalFilename={uploadedFileName}
      />
    </div>
  );
};

export default DatasphereAgentView;
