import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiZoomIn, FiZoomOut, FiMaximize2, FiMinimize2,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 8;
const ZOOM_STEP = 0.25;

const ImageLightbox = ({ isOpen, onClose, images = [], initialIndex = 0 }) => {
  const [index,    setIndex]    = useState(initialIndex);
  const [zoom,     setZoom]     = useState(1);
  const [pan,      setPan]      = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /* live refs – avoid stale closures in window listeners */
  const isDragging  = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const panRef      = useRef({ x: 0, y: 0 });
  const zoomRef     = useRef(1);

  /* keep refs in sync */
  const syncPan  = (p) => { setPan(p);   panRef.current  = p; };
  const syncZoom = (z) => { setZoom(z);  zoomRef.current = z; };

  const resetView = useCallback(() => {
    syncZoom(1);
    syncPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => { setIndex(initialIndex); resetView(); }, [initialIndex, isOpen]);
  useEffect(() => { resetView(); }, [index]);

  /* ── keyboard ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.target?.tagName === 'INPUT') return;
      if (e.key === 'Escape')       { onClose(); return; }
      if (e.key === 'ArrowLeft')    { setIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'ArrowRight')   { setIndex(i => Math.min(i + 1, images.length - 1)); return; }
      if (e.key === '+' || e.key === '=') { doZoom(ZOOM_STEP); return; }
      if (e.key === '-')            { doZoom(-ZOOM_STEP); return; }
      if (e.key === '0')            { resetView(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, images.length]);

  /* ── zoom helper ── */
  const doZoom = (delta) => {
    const next = Math.min(Math.max(zoomRef.current + delta, ZOOM_MIN), ZOOM_MAX);
    syncZoom(next);
    if (next <= 1) syncPan({ x: 0, y: 0 });
  };

  /* ── wheel zoom ── */
  const onWheel = (e) => {
    e.preventDefault();
    doZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  };

  /* ── drag: attach window listeners so drag never gets "stuck" ── */
  const onImgMouseDown = (e) => {
    if (zoomRef.current <= 1) return;
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      syncPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []); /* attach once, reads from refs */


  if (!isOpen || images.length === 0) return null;
  const cur = images[index] || {};
  const canPan = zoom > 1;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
            userSelect: 'none',
          }}
        >
          {/* ── Toolbar ── */}
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Title */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cur.label || `Snapshot ${index + 1}`}
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cur.description}
              </p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Btn onClick={() => doZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} title="Zoom out (-)">
                <FiZoomOut size={18} />
              </Btn>

              <div
                onClick={resetView} title="Reset (0)"
                style={{
                  minWidth: 54, textAlign: 'center', fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.80)', cursor: 'pointer',
                  padding: '5px 6px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.07)',
                }}
              >
                {Math.round(zoom * 100)}%
              </div>

              <Btn onClick={() => doZoom(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} title="Zoom in (+)">
                <FiZoomIn size={18} />
              </Btn>

              <Btn
                onClick={canPan ? resetView : () => doZoom(0.5)}
                title={canPan ? 'Fit to screen (0)' : 'Zoom 1.5×'}
                style={{ marginLeft: 4 }}
              >
                {canPan ? <FiMinimize2 size={17} /> : <FiMaximize2 size={17} />}
              </Btn>


              <Btn
                onClick={onClose} title="Close (Esc)"
                style={{ marginLeft: 8, background: 'rgba(220,50,50,0.22)' }}
              >
                <FiX size={19} />
              </Btn>
            </div>
          </div>

          {/* ── Stage ── */}
          <div
            onWheel={onWheel}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Prev */}
            {images.length > 1 && (
              <Arrow dir="left"  disabled={index === 0}
                onClick={() => setIndex(i => i - 1)} />
            )}

            {/*
              Single <img> with combined translate + scale transform.
              mousedown triggers window drag listeners.
              No AnimatePresence here – avoids any pointer-event gaps.
            */}
            <img
              key={index}
              src={cur.src}
              alt={cur.label || 'Snapshot'}
              draggable={false}
              onMouseDown={onImgMouseDown}
              style={{
                display: 'block',
                maxWidth: '96vw',
                maxHeight: '88vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 48px rgba(0,0,0,0.72)',
                /* single transform – no conflict */
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: dragging ? 'none' : 'transform 0.14s ease',
                cursor: canPan ? (dragging ? 'grabbing' : 'grab') : 'default',
                /* prevent text-selection flicker on drag */
                WebkitUserSelect: 'none',
              }}
            />

            {/* Next */}
            {images.length > 1 && (
              <Arrow dir="right" disabled={index === images.length - 1}
                onClick={() => setIndex(i => i + 1)} />
            )}

            {/* Pan hint overlay (shown briefly after zoom > 1) */}
            {canPan && !dragging && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.6)',
                fontSize: 11, padding: '4px 12px', borderRadius: 99,
                pointerEvents: 'none', letterSpacing: '0.04em',
              }}>
                Click &amp; drag to pan
              </div>
            )}
          </div>

          {/* ── Bottom bar ── */}
          <div style={{
            flexShrink: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
                {index + 1} / {images.length}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.24)', letterSpacing: '0.04em' }}>
                ← → Navigate &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Drag to pan &nbsp;·&nbsp; Esc to close
              </span>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setIndex(i)} style={{
                    flexShrink: 0, width: 64, height: 44, padding: 0, cursor: 'pointer',
                    border: i === index ? '2px solid #1B90FF' : '2px solid rgba(255,255,255,0.10)',
                    borderRadius: 6, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)',
                    transition: 'border-color 0.16s',
                  }}>
                    <img
                      src={img.src} alt={img.label} draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ── Icon button ── */
const Btn = ({ children, onClick, disabled, title, style: s = {} }) => (
  <button
    onClick={disabled ? undefined : onClick}
    title={title}
    style={{
      width: 36, height: 36, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: s.background || 'rgba(255,255,255,0.08)',
      color: disabled ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(255,255,255,0.10)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
      ...s,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = s.background || 'rgba(255,255,255,0.08)'; }}
  >
    {children}
  </button>
);

/* ── Nav arrow ── */
const Arrow = ({ dir, disabled, onClick }) => (
  <button
    onClick={disabled ? undefined : onClick}
    style={{
      position: 'absolute',
      [dir === 'left' ? 'left' : 'right']: 16,
      zIndex: 10, width: 44, height: 44, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
      color: disabled ? 'rgba(255,255,255,0.16)' : '#fff',
      border: '1px solid rgba(255,255,255,0.12)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      backdropFilter: 'blur(8px)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'; }}
  >
    {dir === 'left' ? <FiChevronLeft size={22} /> : <FiChevronRight size={22} />}
  </button>
);

export default ImageLightbox;
