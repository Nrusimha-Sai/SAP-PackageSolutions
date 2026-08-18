import React, { memo } from 'react';
import { Layers } from 'lucide-react';

/**
 * ReactFlow group (space) node — glassmorphism styled.
 */
const DsGroupNode = ({ data }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-strip)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--border-glass)',
      borderRadius: 'var(--r-md)',
      boxShadow: 'var(--shadow-strip)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderBottom: '1px solid var(--border-glass)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--r-md) var(--r-md) 0 0',
      }}
    >
      <Layers size={16} style={{ color: 'var(--text-muted)' }} />
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}
        title={data.label}
      >
        {data.label}
      </h3>
    </div>
  </div>
);

export default memo(DsGroupNode);
