import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiGithub, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';

const DS_BACKEND_URL = import.meta.env.VITE_DS_AGENT_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api/ds' : '/api/ds');

/* ── Build a direct GitHub file URL from the repo URL + file path ── */
const buildFileUrl = (repoUrl, filePath) => {
  try {
    const base = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');
    return `${base}/blob/main/${filePath.replace(/^\//, '')}`;
  } catch {
    return repoUrl;
  }
};

/* ─────────────────────────────────────────────────────────────────────────── */

const DsExportModal = ({ isOpen, onClose, originalFilename }) => {
  const [targetRepoUrl, setTargetRepoUrl] = useState('');
  const [targetToken,   setTargetToken]   = useState('');
  const [projectName,   setProjectName]   = useState('DatasphereAgent-Updations');
  const [showToken,     setShowToken]     = useState(false);
  const [status,        setStatus]        = useState('idle'); // idle | loading | success | error
  const [resultData,    setResultData]    = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');

  const handleClose = () => {
    if (status === 'loading') return;
    setTargetRepoUrl('');
    setTargetToken('');
    setProjectName('DatasphereAgent-Updations');
    setShowToken(false);
    setStatus('idle');
    setResultData(null);
    setErrorMsg('');
    onClose();
  };

  const handleExport = async () => {
    if (!targetRepoUrl.trim()) {
      setErrorMsg('Please enter the target GitHub repository URL.');
      setStatus('error');
      return;
    }
    if (!targetToken.trim()) {
      setErrorMsg('Please enter the target GitHub access token.');
      setStatus('error');
      return;
    }
    if (!projectName.trim()) {
      setErrorMsg('Please enter a project (folder) name.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setResultData(null);
    setErrorMsg('');

    try {
      const res = await fetch(`${DS_BACKEND_URL}/export-to-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_repo_url: targetRepoUrl.trim(),
          target_token: targetToken.trim(),
          original_filename: originalFilename || 'DatasphereExport.json',
          project_name: projectName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || `Export failed (HTTP ${res.status}).`);
        setStatus('error');
        return;
      }

      setResultData(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Network error. Is the backend running?');
      setStatus('error');
    }
  };

  /* ── Shared input style ── */
  const inputStyle = {
    height: 42,
    padding: '0 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 800,
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              translateX: '-50%',
              translateY: '-50%',
              zIndex: 900,
              width: 'min(580px, 94vw)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-modal)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'var(--blur)',
              WebkitBackdropFilter: 'var(--blur)',
              overflow: 'hidden',
            }}
          >
            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-glass)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiGithub size={18} style={{ color: 'var(--blue-6)' }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Export Datasphere to GitHub
                </h3>
              </div>
              <button
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  color: 'var(--text-muted)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={handleClose}
                disabled={status === 'loading'}
                title="Close"
              >
                <FiX size={15} />
              </button>
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

              {/* ── IDLE / ERROR: show form ── */}
              {(status === 'idle' || status === 'error') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Export summary */}
                  <div style={{
                    background: 'var(--bg-expand)',
                    border: '1px solid var(--border-strip)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      1
                    </span>{' '}
                    Objects file selected — will be pushed to{' '}
                    <code style={{
                      fontSize: 12, background: 'var(--bg-card)',
                      padding: '1px 5px', borderRadius: 4, color: 'var(--blue-6)',
                    }}>
                      {projectName.trim() || 'DatasphereAgent-Updations'}/
                    </code>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label style={labelStyle}>Project / Folder Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. Finance-Project"
                      style={inputStyle}
                    />
                  </div>

                  {/* Target Repo URL */}
                  <div>
                    <label style={labelStyle}>Target Repository URL</label>
                    <input
                      type="text"
                      value={targetRepoUrl}
                      onChange={e => setTargetRepoUrl(e.target.value)}
                      placeholder="https://github.com/your-org/your-repo"
                      style={inputStyle}
                    />
                  </div>

                  {/* Target Token */}
                  <div>
                    <label style={labelStyle}>GitHub Access Token</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={targetToken}
                        onChange={e => setTargetToken(e.target.value)}
                        placeholder="github_pat_..."
                        style={{ ...inputStyle, padding: '0 40px 0 14px', fontFamily: 'monospace' }}
                      />
                      <button
                        onClick={() => setShowToken(v => !v)}
                        style={{
                          position: 'absolute', right: 10, top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)', padding: 4,
                          display: 'flex', alignItems: 'center',
                        }}
                        title={showToken ? 'Hide token' : 'Show token'}
                      >
                        {showToken ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                      Requires <strong>Contents: read &amp; write</strong> permission. Sent only to the backend and never stored.
                    </p>
                  </div>

                  {/* Error message */}
                  {status === 'error' && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      background: 'var(--ds-danger-bg)',
                      border: '1px solid var(--ds-danger-light)',
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 13, color: 'var(--text-primary)',
                    }}>
                      <FiAlertCircle size={15} style={{ color: 'var(--ds-danger)', flexShrink: 0, marginTop: 1 }} />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── LOADING: professional spinner ── */}
              {status === 'loading' && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 16, padding: '32px 0',
                }}>
                  <div style={{
                    width: 36, height: 36,
                    border: '3px solid var(--border-glass)',
                    borderTopColor: 'var(--blue-6)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, margin: '0 0 4px' }}>
                      Pushing to GitHub…
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      This may take a few seconds. Please wait.
                    </p>
                  </div>
                </div>
              )}

              {/* ── SUCCESS: summary + navigation links ── */}
              {status === 'success' && resultData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Summary banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--ds-success-bg)',
                    border: '1px solid var(--ds-success-light)',
                    borderRadius: 8, padding: '12px 14px',
                    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  }}>
                    <FiCheckCircle size={16} style={{ color: 'var(--ds-success)', flexShrink: 0 }} />
                    <span>
                      1 file pushed successfully
                    </span>
                  </div>


                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 20px',
              borderTop: '1px solid var(--border-glass)',
              flexShrink: 0,
            }}>
              <button
                onClick={handleClose}
                disabled={status === 'loading'}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  background: 'var(--bg-strip)',
                  border: '1px solid var(--border-glass)',
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {status === 'success' ? 'Close' : 'Cancel'}
              </button>

              {(status === 'idle' || status === 'error') && (
                <button
                  onClick={handleExport}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--blue-7), var(--blue-8))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13, fontWeight: 700,
                    color: '#fff', cursor: 'pointer',
                    boxShadow: 'var(--shadow-btn)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <FiGithub size={14} />
                  Export to GitHub
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DsExportModal;
