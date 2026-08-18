import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Full-screen JSON preview modal — shows original vs updated side by side.
 * Styled with PackageSolution glass-modal design.
 */
const DsPreviewModal = ({
  show,
  onClose,
  previewSearch,
  setPreviewSearch,
  debouncedSearch,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  originalJsonString,
  currentJsonString,
  getHighlightedJSON,
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key="ds-preview-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        className="modal-center-wrapper"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
          className="glass-modal"
          style={{
            width: '100%',
            maxWidth: 1200,
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Modal header ── */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-modal)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              JSON State Preview
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Search bar */}
              <div
                className="glass-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  height: 36,
                  minWidth: 200,
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 10,
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search JSON..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) onPrevMatch();
                      else onNextMatch();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    paddingLeft: 34,
                    paddingRight: debouncedSearch ? 90 : 10,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                  }}
                />
                {debouncedSearch && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        marginRight: 2,
                      }}
                    >
                      {matchCount > 0 ? currentMatchIndex + 1 : 0}/{matchCount}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={onPrevMatch}
                      style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={onNextMatch}
                      style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button className="icon-btn" onClick={onClose}>
                <X size={22} />
              </button>
            </div>
          </div>

          {/* ── Split panes ── */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              padding: 16,
            }}
            className="ds-preview-panels"
          >
            {/* Original */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--r-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'var(--bg-strip)',
                  flexShrink: 0,
                }}
              >
                Original JSON
              </div>
              <div
                className="ds-original-json-panel"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  background: 'var(--bg-input)',
                }}
              >
                {debouncedSearch ? (
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedJSON(originalJsonString, debouncedSearch),
                    }}
                  />
                ) : (
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {originalJsonString}
                  </pre>
                )}
              </div>
            </div>

            {/* Updated */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid var(--ds-success)',
                borderRadius: 'var(--r-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ds-success)',
                  borderBottom: '1px solid var(--ds-success)',
                  background: 'var(--ds-success-bg)',
                  flexShrink: 0,
                }}
              >
                Updated JSON
              </div>
              <div
                className="ds-current-json-panel"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  background: 'var(--bg-input)',
                }}
              >
                {debouncedSearch ? (
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: 'var(--ds-success)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedJSON(currentJsonString, debouncedSearch),
                    }}
                  />
                ) : (
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: 'var(--ds-success)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {currentJsonString}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default DsPreviewModal;
