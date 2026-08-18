import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiExternalLink, FiImage, FiMaximize2 } from 'react-icons/fi';
import ImageLightbox from './ImageLightbox';
import LineageTab from './LineageTab';

/*
 * Image path resolution:
 *  – If snap.image starts with '/', it's already a /public path → use as-is
 *  – Otherwise fall back to the src/assets/snapshots/ convention (legacy)
 */
const resolveImage = img => img.startsWith('/') ? img : `/src/assets/snapshots/${img}`;

/* ────────────────────────────────────────────────────────────────
   DashboardModal
   – Centred glass card
   – Snapshot grid with thumbnail cards
   – External-link button opens the full ImageLightbox viewer
──────────────────────────────────────────────────────────────── */
const DashboardModal = ({ isOpen, onClose, dashboard }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed
  const [activeTab, setActiveTab] = useState('dashboards'); // 'dashboards' or 'lineage'

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('dashboards');
      setLightboxIndex(null);
    }
  }, [isOpen]);

  if (!dashboard) return null;

  const snapshots = dashboard.snapshots || [];

  /* Build the image list the lightbox expects */
  const lightboxImages = snapshots.map(s => ({
    src:         resolveImage(s.image),
    label:       s.label || s.name || `Snapshot`,
    description: s.description,
  }));

  const openLightbox = (idx) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Backdrop ── */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={onClose}
              style={{
                position: 'fixed', inset: 0,
                background: 'var(--bg-overlay)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 1000,
              }}
            />

            {/* ── Centering wrapper ── */}
            <div
              className="modal-center-wrapper"
              style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1001,
                pointerEvents: 'none',
                padding: '16px',
              }}
            >
              {/* ── Modal panel ── */}
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{   opacity: 0, scale: 0.93, y: 20  }}
                transition={{ duration: 0.26, ease: [0.34, 1.06, 0.64, 1] }}
                className="glass-modal"
                onClick={e => e.stopPropagation()}
                style={{
                  pointerEvents: 'all',
                  width: 'min(96vw, 1155px)',
                  height: '70vh',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Modal Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--border-modal)',
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  <div style={{ width: '25%' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dashboard.name}
                    </h2>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dashboard.lineOfBusiness}&nbsp;·&nbsp;{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 24, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                     <button 
                       onClick={() => setActiveTab('dashboards')}
                       style={{ 
                         background: 'transparent', border: 'none', 
                         padding: '12px 0', cursor: 'pointer',
                         fontSize: 14, fontWeight: activeTab === 'dashboards' ? 600 : 500,
                         color: activeTab === 'dashboards' ? 'var(--blue-6)' : 'var(--text-muted)',
                         borderBottom: activeTab === 'dashboards' ? '2px solid var(--blue-6)' : '2px solid transparent',
                         transition: 'all 0.2s', outline: 'none'
                       }}>
                        Dashboards
                     </button>
                     <button 
                       onClick={() => setActiveTab('lineage')}
                       style={{ 
                         background: 'transparent', border: 'none', 
                         padding: '12px 0', cursor: 'pointer',
                         fontSize: 14, fontWeight: activeTab === 'lineage' ? 600 : 500,
                         color: activeTab === 'lineage' ? 'var(--blue-6)' : 'var(--text-muted)',
                         borderBottom: activeTab === 'lineage' ? '2px solid var(--blue-6)' : '2px solid transparent',
                         transition: 'all 0.2s', outline: 'none'
                       }}>
                        Lineage
                     </button>
                  </div>

                  <div style={{ width: '25%', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={onClose} title="Close">
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: activeTab === 'dashboards' ? 'clamp(14px,3vw,24px)' : 0, display: 'flex', flexDirection: 'column' }}>
                  {activeTab === 'dashboards' ? (
                    snapshots.length === 0 ? (
                      <EmptyState dashboardName={dashboard.name} />
                    ) : (
                      <div
                        className="snapshot-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 20,
                          width: '100%',
                        }}
                      >
                        {snapshots.map((snap, idx) => (
                          <SnapshotCard
                            key={idx}
                            index={idx}
                            imageSrc={resolveImage(snap.image)}
                            label={snap.label || `Snapshot ${idx + 1}`}
                            description={snap.description}
                            onOpenLightbox={() => openLightbox(idx)}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <LineageTab dashboard={dashboard} kpi={dashboard} />
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Full-screen Image Lightbox (sits above the modal) ── */}
      <ImageLightbox
        isOpen={lightboxIndex !== null}
        onClose={closeLightbox}
        images={lightboxImages}
        initialIndex={lightboxIndex ?? 0}
      />
    </>
  );
};

/* ── Snapshot card ── */
const SnapshotCard = ({ index, imageSrc, label, description, onOpenLightbox }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: index * 0.055, duration: 0.24 }}
      className="glass-strip"
      style={{
        width: '100%',
        height: 310,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Thumbnail – click anywhere on it to open lightbox */}
      <div
        onClick={onOpenLightbox}
        title="Click to view full size"
        style={{
          width: '100%',
          height: 220,
          background: 'var(--bg-expand)',
          borderBottom: '1px solid var(--border-strip)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {!imgError ? (
          <>
            <img
              src={imageSrc}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgError(true)}
            />
            {/* Hover overlay */}
            <div
              className="thumbnail-overlay"
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,112,242,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <FiMaximize2 size={28} color="#fff" />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <FiImage size={32} style={{ opacity: 0.35 }} />
            <span style={{ fontSize: 11 }}>Image not found</span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '10px 14px', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 11.5,
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {description}
          </p>
        </div>

        {/* Open in lightbox */}
        <button
          className="icon-btn"
          title="Open in viewer"
          onClick={onOpenLightbox}
          style={{ flexShrink: 0 }}
        >
          <FiExternalLink size={15} style={{ color: 'var(--blue-6)' }} />
        </button>
      </div>
    </motion.div>
  );
};

/* ── Empty state ── */
const EmptyState = ({ dashboardName }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '56px 20px',
    textAlign: 'center', gap: 12, color: 'var(--text-muted)',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16,
      background: 'var(--bg-icon)', border: '1px solid var(--border-glass)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    }}>
      <FiImage size={28} style={{ color: 'var(--blue-6)' }} />
    </div>
    <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No Snapshots Added</h4>
    <p style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.65 }}>
      Add snapshot entries in{' '}
      <code style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-expand)', padding: '2px 6px', borderRadius: 4 }}>
        src/data/dashboardsData.js
      </code>
    </p>
  </div>
);

export default DashboardModal;
