import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
 * Professional splash screen.
 * – Logo fades + scales in cleanly
 * – A thin brand-coloured progress bar fills in exactly 1 second
 * – A subtle divider and tagline give it enterprise weight
 * – No Three.js / no particles / no wireframes
 */
const IntroLoader = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-body)',
      zIndex: 9999,
    }}
  >
    {/* ── Subtle top-edge accent line ── */}
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, transparent, var(--blue-7), transparent)',
        opacity: 0.6,
      }}
    />

    {/* ── Centre content ── */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Logo */}
      <img
        src="/Yash_Logo.png"
        alt="YASH Technologies"
        style={{ height: 44, objectFit: 'contain', display: 'block' }}
      />

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 28,
          background: 'linear-gradient(to bottom, var(--border-glass), transparent)',
          margin: '16px 0 14px',
        }}
      />

      {/* Label */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: 0,
          userSelect: 'none',
        }}
      >
        Business Metrics Catalog
      </p>

      {/* Progress track */}
      <div
        style={{
          marginTop: 28,
          width: 180,
          height: 2,
          borderRadius: 99,
          background: 'var(--border-glass)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            height: '100%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, var(--blue-7), var(--blue-5))',
          }}
        />
      </div>
    </motion.div>

    {/* ── Bottom copyright ── */}
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      style={{
        position: 'absolute',
        bottom: 28,
        fontSize: 11,
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
        userSelect: 'none',
      }}
    >
      © {new Date().getFullYear()} YASH Technologies. All rights reserved.
    </motion.p>
  </div>
);

export default IntroLoader;
