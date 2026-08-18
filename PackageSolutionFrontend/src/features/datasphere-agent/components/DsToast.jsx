import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Floating toast notification — glassmorphism styled.
 * Displays success or error messages and auto-dismisses.
 */
const DsToast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        key="ds-toast"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: '14px 24px',
          borderRadius: 'var(--r-md)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-modal)',
          border: `1px solid ${
            toast.type === 'success'
              ? 'var(--ds-success)'
              : 'var(--ds-danger)'
          }`,
          background:
            toast.type === 'success'
              ? 'rgba(5,150,105,0.88)'
              : 'rgba(220,38,38,0.88)',
        }}
      >
        {toast.message}
      </motion.div>
    )}
  </AnimatePresence>
);

export default DsToast;
