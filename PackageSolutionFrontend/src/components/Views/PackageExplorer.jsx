import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Toolbar from '../PackageExplorer/Toolbar';
import DashboardStrip from '../PackageExplorer/DashboardStrip';
import DashboardModal from '../PackageExplorer/DashboardModal';
import ExportJsonModal from '../PackageExplorer/ExportJsonModal';
import BillingCard from '../PackageExplorer/BillingCard';
import baseDashboardsData from '../../data/dashboardsData';
import snapshotsData from '../../data/dashboardSnapshotsData';
import lineageData from '../../data/dashboardLineageData';

const dashboardsData = baseDashboardsData.map(d => ({
  ...d,
  snapshots: snapshotsData.find(s => s.id === d.id)?.snapshots || [],
  lineage: lineageData.find(l => l.id === d.id)?.lineage || []
}));
import { FiUploadCloud, FiAlertCircle, FiShare, FiDatabase, FiX, FiSend, FiGithub } from 'react-icons/fi';

const SkeletonRow = () => (
  <div className="skeleton" style={{ height: 80, marginBottom: 10, borderRadius: 12 }} />
);

const PackageExplorer = ({ setActiveTab, setSharedFile, collapseSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoB, setSelectedLoB] = useState('All Line of Business');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currency,    setCurrency]    = useState('USD');
  const [modalItem,   setModalItem]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showExportMenu,     setShowExportMenu]     = useState(false);
  const [showExportJsonModal, setShowExportJsonModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSending, setIsSending] = useState(false);

  React.useEffect(() => {
    if (modalItem || showExportJsonModal) {
      collapseSidebar?.();
    }
  }, [modalItem, showExportJsonModal, collapseSidebar]);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dashboardsData.filter(d => {
      const matchQ   = !q
        || d.name.toLowerCase().includes(q)
        || d.description.toLowerCase().includes(q)
        || d.lineOfBusiness.toLowerCase().includes(q);
      const matchLoB = selectedLoB === 'All Line of Business'
        || d.lineOfBusiness === selectedLoB;
      return matchQ && matchLoB;
    });
  }, [searchQuery, selectedLoB]);

  const toggle = id =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });


  const handleExportToDatasphere = () => {
    setShowExportMenu(false);
    setToast('Export to Datasphere is under development.');
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendToAgent = async () => {
    setShowExportMenu(false);
    const selectedKpi = dashboardsData.find(d => selectedIds.has(d.id));
    if (!selectedKpi) return;

    setIsSending(true);
    const peUrl = import.meta.env.VITE_PE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000/api/pe' : '/api/pe');

    try {
      const res = await fetch(`${peUrl}/pulljson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpi_names: [selectedKpi.name] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `PE backend error (${res.status})`);
      }

      const data = await res.json();

      if (data.pulled?.length > 0 && data.pulled[0].files?.length > 0) {
        const firstFile = data.pulled[0].files[0];
        const contentBytes = Uint8Array.from(atob(firstFile.content_base64), c => c.charCodeAt(0));
        const fileToUpload = new File([contentBytes], firstFile.file_name, { type: 'application/json' });
        
        // Simulate a slight delay for better UX on the loading screen
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setSharedFile(fileToUpload);
        setActiveTab('datasphere-agent');
      } else {
        const reason = data.failed?.[0]?.error || `No file found for "${selectedKpi.name}".`;
        setToast(reason);
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.warn('[Send to Agent] Failed:', err);
      setToast(err.message || `Failed to fetch file for "${selectedKpi.name}".`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const selectedKpisCount = dashboardsData.filter(d => selectedIds.has(d.id)).length;
  const isAgentSelected = selectedIds.size > selectedKpisCount;
  const canShowExport = selectedKpisCount > 0 && !isAgentSelected;

  return (
    <div style={{
      /* Responsive padding: generous on desktop, tight on mobile */
      padding: 'clamp(14px, 3vw, 28px) clamp(14px, 3vw, 28px) 110px',
      maxWidth: 1400,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Loading Overlay for Send to Datasphere */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              style={{
                background: '#ffffff',
                padding: '32px 48px',
                borderRadius: '16px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{
                width: '48px', height: '48px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0070f3',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}>
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '18px', fontWeight: '600', letterSpacing: '-0.3px' }}>
                  Preparing Business Metrics
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                  Connecting to Datasphere Agent...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedLoB={selectedLoB}
        setSelectedLoB={setSelectedLoB}
      />

      {/* Main Content Area */}
      <div style={{
        marginTop: 18,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        alignItems: 'flex-start'
      }}>
        {/* Left Column: Dashboard list */}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          
          {/* List Header */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', background: 'var(--bg-card)',
              borderBottom: '1.5px solid var(--border-modal)',
              fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
              marginBottom: 10, borderRadius: '8px 8px 0 0'
            }}>
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every(d => selectedIds.has(d.id))}
                onChange={() => {
                  const allSelected = filtered.every(d => selectedIds.has(d.id));
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) {
                      filtered.forEach(d => next.delete(d.id));
                    } else {
                      filtered.forEach(d => next.add(d.id));
                    }
                    return next;
                  });
                }}
                title="Select All"
              />
              <div style={{ width: 21 }} /> {/* Align with strip icon */}
              <div style={{ flex: 1, paddingLeft: 2 }}>Business Metric Description</div>
              <div className="hide-sm" style={{ width: 125, textAlign: 'center' }}>Line of Business</div>
              {!window.location.pathname.includes('/demo') && (
                <div className="hide-sm" style={{ minWidth: 86, textAlign: 'right' }}>Amount</div>
              )}
              <div style={{ width: 72 }} /> {/* Align with strip buttons */}
            </div>
          )}

        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'clamp(32px,8vw,64px) 20px',
            color: 'var(--text-muted)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <FiAlertCircle size={36} style={{ opacity: 0.45 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No dashboards match your search.</p>
            <p style={{ fontSize: 13 }}>Try a different search term or Line of Business filter.</p>
          </div>
        ) : (
          filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <DashboardStrip
                data={d}
                isChecked={selectedIds.has(d.id)}
                currency={currency}
                onCheck={() => toggle(d.id)}
                onOpenModal={() => setModalItem(d)}
              />
            </motion.div>
          ))
        )}
        </div>

        {/* Right Column: Billing Card */}
        {!window.location.pathname.includes('/demo') && (
          <div style={{ flex: '0 1 340px', width: '100%', minWidth: 280, maxWidth: 400, position: 'sticky', top: 24 }}>
            <BillingCard 
              selectedIds={selectedIds} 
              setSelectedIds={setSelectedIds}
              currency={currency} 
              setCurrency={setCurrency} 
            />
          </div>
        )}
      </div>

      {/* Floating Export Button & Menu */}
      <AnimatePresence>
        {canShowExport && (
          <motion.div
            key="dl"
            initial={{ opacity: 0, y: 60, scale: 0.90 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 60,  scale: 0.90 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 24,
              /* On very small screens, centre the button */
              right: 'max(16px, min(32px, 4vw))',
              zIndex: 400,
            }}
          >
            <div style={{ position: 'relative' }}>
              {/* Export Menu Popup */}
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 0,
                      marginBottom: 12,
                      background: 'var(--bg-modal)',
                      padding: 12,
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--border-modal)',
                      boxShadow: 'var(--shadow-modal)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      width: 240,
                      backdropFilter: 'var(--blur)',
                      WebkitBackdropFilter: 'var(--blur)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Export Options</h4>
                      <button className="icon-btn" style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }} onClick={() => setShowExportMenu(false)}>
                        <FiX size={14} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => { setShowExportMenu(false); setShowExportJsonModal(true); }} 
                      className="glass-strip" 
                      style={{ 
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, 
                        cursor: 'pointer', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', 
                        textAlign: 'left', fontWeight: 500, fontSize: 14 
                      }}
                    >
                      <FiGithub size={16} style={{ color: 'var(--blue-6)' }} /> Export to GitHub
                    </button>

                    <button 
                      onClick={handleSendToAgent} 
                      disabled={selectedKpisCount !== 1}
                      className="glass-strip" 
                      style={{ 
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, 
                        cursor: selectedKpisCount === 1 ? 'pointer' : 'not-allowed', 
                        borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', 
                        textAlign: 'left', fontWeight: 500, fontSize: 14,
                        opacity: selectedKpisCount === 1 ? 1 : 0.5
                      }}
                      title={selectedKpisCount !== 1 ? 'Please select exactly 1 Metric to send' : undefined}
                    >
                      <FiSend size={16} style={{ color: 'var(--blue-6)' }} /> 
                      Send to Datasphere Agent {selectedKpisCount > 1 && '(Select 1 only)'}
                    </button>
                    
                    <button 
                      onClick={handleExportToDatasphere} 
                      className="glass-strip" 
                      style={{ 
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, 
                        cursor: 'pointer', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', 
                        textAlign: 'left', fontWeight: 500, fontSize: 14 
                      }}
                    >
                      <FiDatabase size={16} style={{ color: 'var(--blue-6)' }} /> Export to Datasphere
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button className="download-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                <FiShare size={17} />
                Export ({selectedIds.size})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar / Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--text-primary)',
              color: 'var(--bg-body)',
              padding: '12px 24px',
              borderRadius: 'var(--r-sm)',
              zIndex: 1000,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: 'var(--shadow-modal)'
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardModal
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        dashboard={modalItem}
      />

      <ExportJsonModal
        isOpen={showExportJsonModal}
        onClose={() => setShowExportJsonModal(false)}
        selectedKpiNames={dashboardsData
          .filter(d => selectedIds.has(d.id))
          .map(d => d.name)}
      />
    </div>
  );
};

export default PackageExplorer;
