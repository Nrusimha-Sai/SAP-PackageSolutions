import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBarChart2, FiBox, FiCpu, FiMenu, FiChevronLeft, FiX } from 'react-icons/fi';

const NAV = [
  { id: 'package-explorer', label: 'Business Metrics Catalog', Icon: FiBarChart2 },
  { id: 'datasphere-agent', label: 'Jr-Datasphere-Agent', Icon: FiBox      },
  { id: 'sac-agent',        label: 'Jr-SAC-Agent',        Icon: FiCpu      },
];

const Sidebar = ({
  collapsed,
  isMobile,
  drawerOpen,
  toggle,
  closeDrawer,
  activeTab,
  setActiveTab,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  /*
   * On mobile: sidebar is a drawer that slides in from the left.
   * On tablet/desktop: sidebar is fixed and always visible.
   */
  const visible = isMobile ? drawerOpen : true;
  const translateX = isMobile ? (drawerOpen ? 0 : -280) : 0;
  
  const isHoverExpanded = !isMobile && collapsed && isHovered;
  const effectivelyCollapsed = collapsed && !isHoverExpanded;
  const currentW = effectivelyCollapsed ? 72 : 260;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isMobile ? 260 : currentW,
        x: translateX,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="glass-sidebar"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        overflow: 'hidden',
        flexShrink: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Logo / toggle row ── */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          padding: collapsed && !isMobile ? '0 14px' : '0 16px 0 20px',
          borderBottom: '1px solid var(--border-glass)',
          flexShrink: 0,
        }}
      >
        <AnimatePresence mode="wait">
          {(!effectivelyCollapsed || isMobile) ? (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{   opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, overflow: 'hidden' }}
            >
              <img
                src="/Yash_Logo.png"
                alt="YASH Technologies"
                style={{ height: 34, objectFit: 'contain', display: 'block' }}
              />
              <p style={{
                fontSize: 9, color: 'var(--text-muted)',
                letterSpacing: '0.06em', marginTop: 3, whiteSpace: 'nowrap',
              }}>
                More than what you think.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', width: '100%' }}
              onClick={toggle}
              title="Expand"
            >
              <img
                src="/Yash_Logo.png"
                alt="YASH Technologies"
                style={{ height: 26, objectFit: 'contain', display: 'block' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {(!effectivelyCollapsed || isMobile) && (
          <button
            className="icon-btn"
            onClick={isMobile ? closeDrawer : toggle}
            title={isMobile ? 'Close' : 'Collapse'}
            style={{ flexShrink: 0 }}
          >
            {isMobile ? <FiX size={20} /> : <FiChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav style={{
        flex: 1,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          const showLabel = !effectivelyCollapsed || isMobile;

          return (
            <button
              key={id}
              onClick={() => {
                setIsHovered(false);
                setActiveTab(id);
              }}
              title={!showLabel ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: showLabel ? '11px 14px' : '12px 0',
                justifyContent: showLabel ? 'flex-start' : 'center',
                borderRadius: 10,
                background: active
                  ? 'linear-gradient(135deg, var(--blue-7) 0%, var(--blue-8) 100%)'
                  : 'transparent',
                color: active ? '#fff' : 'var(--text-primary)',
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                border: active
                  ? '1px solid rgba(255,255,255,0.10)'
                  : '1px solid transparent',
                boxShadow: active ? '0 4px 14px rgba(0,112,242,0.32)' : 'none',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-strip-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-strip)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {showLabel && (
                  <motion.span
                    key="lbl"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{   opacity: 0, width: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{ overflow: 'hidden', display: 'block' }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
};

export default Sidebar;
