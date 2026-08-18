import React, { useState } from 'react';
import { Download, Database } from 'lucide-react';
import { FiGithub } from 'react-icons/fi';

/**
 * Export controls: space-connection change, preview, and download.
 * Styled with PackageSolution design tokens.
 */
function DsExportPanel({ onExport, onPreview, onSpaceConnectionChange }) {
  const [spaceName, setSpaceName] = useState('');

  const handleSpaceChange = () => {
    if (spaceName.trim()) {
      onSpaceConnectionChange(spaceName.trim());
      setSpaceName('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Space connection input */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'var(--bg-input)',
          padding: 12,
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-strip)',
        }}
      >
        <label
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          Global Space Connection
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="e.g. NEW_SPACE_NAME"
            className="glass-input"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleSpaceChange}
            disabled={!spaceName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg-strip)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strip)',
              cursor: spaceName.trim() ? 'pointer' : 'not-allowed',
              opacity: spaceName.trim() ? 1 : 0.5,
              transition: 'var(--t-fast)',
            }}
          >
            <Database size={14} />
            Update
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Review the applied changes in the graph. Once you are satisfied with the
        Impact and Lineage Analysis, download the updated JSON bundle.
      </p>

      {/* Preview button */}
      <button
        onClick={onPreview}
        className="glass-strip"
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        Preview Changes
      </button>

      {/* Export button */}
      <button
        onClick={onExport}
        className="glass-strip"
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          background: 'linear-gradient(135deg, var(--blue-7), var(--blue-8))',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'var(--shadow-btn)',
          cursor: 'pointer',
        }}
      >
        <FiGithub size={16} />
        Export to GitHub
      </button>
    </div>
  );
}

export default DsExportPanel;
