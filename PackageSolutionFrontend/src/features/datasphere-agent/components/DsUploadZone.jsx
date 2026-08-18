import React, { useRef, useState } from 'react';
import { UploadCloud, FileJson, CheckCircle2 } from 'lucide-react';

/**
 * Drag-and-drop + click-to-browse file upload zone.
 * Styled with PackageSolution glassmorphism design system.
 */
function DsUploadZone({ onUpload, isProcessing, uploadedFileName }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  /* ── Uploaded state ── */
  if (uploadedFileName) {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px solid var(--ds-success)',
          background: 'var(--ds-success-bg)',
          borderRadius: 'var(--r-md)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'var(--t-base)',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept=".json"
          multiple
          style={{ display: 'none' }}
        />
        <div style={{ position: 'relative' }}>
          <FileJson size={40} style={{ color: 'var(--ds-success)' }} />
          <CheckCircle2
            size={20}
            style={{
              color: 'var(--ds-success)',
              position: 'absolute',
              bottom: -4,
              right: -4,
              background: 'var(--bg-card)',
              borderRadius: '50%',
            }}
          />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-success)' }}>
            {uploadedFileName.replace(/\.json$/i, '')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Click to upload different file(s)
          </p>
        </div>
      </div>
    );
  }

  /* ── Default / drag-active state ── */
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--blue-6)' : 'var(--border-input)'}`,
        background: isDragActive ? 'var(--bg-checked)' : 'var(--bg-input)',
        borderRadius: 'var(--r-md)',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        transition: 'var(--t-base)',
        opacity: isProcessing ? 0.5 : 1,
        pointerEvents: isProcessing ? 'none' : 'auto',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".json"
        multiple
        style={{ display: 'none' }}
      />
      <UploadCloud
        size={40}
        style={{
          color: isDragActive ? 'var(--blue-6)' : 'var(--text-muted)',
          transition: 'color 0.2s',
        }}
      />
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          Drag & Drop your Objects file(s)
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          or click to browse from computer
        </p>
      </div>
    </div>
  );
}

export default DsUploadZone;
