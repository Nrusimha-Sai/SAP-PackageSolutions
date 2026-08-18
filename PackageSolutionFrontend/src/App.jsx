import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import PackageExplorer from './components/Views/PackageExplorer';
import JrDatasphereAgent from './components/Views/JrDatasphereAgent';
import JrSACAgent from './components/Views/JrSACAgent';
import IntroLoader from './components/IntroLoader';

const VIEWS = {
  'package-explorer': { title: 'Business Metrics Catalog', Component: PackageExplorer   },
  'datasphere-agent': { title: 'Jr-Datasphere-Agent', Component: JrDatasphereAgent },
  'sac-agent':        { title: 'Jr-SAC-Agent',        Component: JrSACAgent        },
};

/* ── Breakpoints (px) ── */
const BP_MOBILE = 640;
const BP_TABLET = 1024;

const SIDEBAR_W           = 260;
const SIDEBAR_W_COLLAPSED = 72;

const useWindowWidth = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
};

const App = () => {
  const width = useWindowWidth();
  const isMobile = width < BP_MOBILE;
  const isTablet = width >= BP_MOBILE && width < BP_TABLET;
  const location = useLocation();

  /*
   * collapsed state meaning by breakpoint:
   *   mobile  → whether the drawer is OPEN (sidebar overlays the page)
   *   tablet  → sidebar is always icon-only (collapsed)
   *   desktop → normal toggle
   */
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [activeTab,        setActiveTab]        = useState('package-explorer');
  const [appReady,         setAppReady]         = useState(false);
  const [sharedFile,       setSharedFile]       = useState(null);

  useEffect(() => {
    if (location.pathname === '/demo') {
      setActiveTab('package-explorer');
    }
  }, [location.pathname]);

  /* 1-second professional loading screen */
  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Close drawer on resize to tablet/desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  if (!appReady) return <IntroLoader />;

  const { title, Component } = VIEWS[activeTab] || VIEWS['package-explorer'];

  /* How much margin-left the main column needs */
  const sidebarMargin = isMobile
    ? 0
    : isTablet
      ? SIDEBAR_W_COLLAPSED
      : desktopCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  /* What to pass to Sidebar as "collapsed" */
  const sidebarCollapsed = isTablet ? true : desktopCollapsed;

  /* Sidebar is fixed-position, so main column uses marginLeft */
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg-body)',
        transition: 'background 0.32s ease',
      }}
    >
      {/* Background blobs */}
      <div className="bg-mesh" style={{ zIndex: 0 }} />

      {/* ── Mobile backdrop (tap to close drawer) ── */}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <motion.div
            key="mob-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.48)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 150,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        toggle={() => {
          if (isMobile) setDrawerOpen(o => !o);
          else setDesktopCollapsed(c => !c);
        }}
        closeDrawer={() => setDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (isMobile) {
            setDrawerOpen(false);
          } else {
            setDesktopCollapsed(true);
          }
        }}
      />

      {/* ── Main column ── */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarMargin }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
        }}
      >
        <Header
          title={title}
          isMobile={isMobile}
          onHamburger={() => setDrawerOpen(o => !o)}
        />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0  }}
              exit={{   opacity: 0, x: -16 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              style={{ minHeight: '100%', paddingBottom: '80px', boxSizing: 'border-box' }}
            >
              <Component 
                setActiveTab={setActiveTab}
                sharedFile={sharedFile}
                setSharedFile={setSharedFile}
                collapseSidebar={() => {
                  setDesktopCollapsed(true);
                  setDrawerOpen(false);
                }}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
};

export default App;
