import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Layers, Database, BarChart3, LayoutGrid,
  Box, Network, Type,
} from 'lucide-react';

/**
 * ReactFlow entity node — styled with PackageSolution CSS variables.
 * Status-aware: added / removed / changed / selected / highlighted / dimmed.
 */
const DsEntityNode = ({
  data,
  targetPosition = Position.Left,
  sourcePosition = Position.Right,
}) => {
  const getIcon = () => {
    const iconStyle = { width: 16, height: 16 };
    switch (data.type) {
      case 'Analytical Model':
        return <BarChart3 style={{ ...iconStyle, color: 'var(--ds-success)' }} />;
      case 'Fact View':
        return <LayoutGrid style={{ ...iconStyle, color: 'var(--blue-6)' }} />;
      case 'Dimension View':
        return <Box style={{ ...iconStyle, color: 'var(--ds-highlight)' }} />;
      case 'Graphical View':
        return <Layers style={{ ...iconStyle, color: 'var(--blue-8)' }} />;
      case 'Hierarchy with Directory':
      case 'Hierarchy View':
        return <Network style={{ ...iconStyle, color: 'var(--blue-8)' }} />;
      case 'Text View':
        return <Type style={{ ...iconStyle, color: 'var(--blue-8)' }} />;
      case 'SQL View':
        return <Layers style={{ ...iconStyle, color: 'var(--text-muted)' }} />;
      case 'Table (Local/Remote)':
        return <Database style={{ ...iconStyle, color: 'var(--ds-highlight)' }} />;
      default:
        return <Database style={{ ...iconStyle, color: 'var(--ds-highlight)' }} />;
    }
  };

  /* ── Colour resolution based on node state ── */
  let borderColor = 'var(--border-glass)';
  let bgColor = 'var(--bg-card)';
  let titleColor = 'var(--text-primary)';
  let headerBg = 'var(--bg-strip)';
  let opacity = 1;

  if (data.isSelected) {
    borderColor = 'var(--ds-highlight)';
    bgColor = 'var(--ds-highlight-light)';
    titleColor = 'var(--ds-highlight)';
    headerBg = 'var(--ds-highlight-bg)';
  } else if (data.isHighlighted) {
    borderColor = 'var(--ds-highlight)';
    bgColor = 'var(--ds-highlight-bg)';
    titleColor = 'var(--ds-highlight)';
    headerBg = 'var(--ds-highlight-bg)';
  } else if (data.isDimmed) {
    opacity = 0.4;
  } else if (data.status === 'added') {
    borderColor = 'var(--ds-success)';
    bgColor = 'var(--ds-success-light)';
    titleColor = 'var(--ds-success)';
    headerBg = 'var(--ds-success-bg)';
  } else if (data.status === 'removed') {
    borderColor = 'var(--ds-danger)';
    bgColor = 'var(--ds-danger-light)';
    titleColor = 'var(--ds-danger)';
    headerBg = 'var(--ds-danger-bg)';
  } else if (data.status === 'changed') {
    borderColor = 'var(--ds-warning)';
    bgColor = 'var(--ds-warning-light)';
    titleColor = 'var(--ds-warning)';
    headerBg = 'var(--ds-warning-bg)';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-strip)',
        width: 260,
        background: bgColor,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity,
        transition: 'all 0.3s ease',
      }}
    >
      <Handle
        type="target"
        position={targetPosition}
        style={{
          width: 8,
          height: 8,
          background: 'var(--text-muted)',
          border: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 10,
          borderBottom: `1px solid ${borderColor}`,
          background: headerBg,
          borderRadius: 'var(--r-md) var(--r-md) 0 0',
        }}
      >
        {getIcon()}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: titleColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
            title={data.label}
          >
            {data.label}
          </h3>
          <p
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.type}
          </p>
        </div>
      </div>

      {/* Column diff list */}
      <div
        className="ds-node-columns"
        style={{
          flex: 1,
          padding: 8,
          maxHeight: 140,
          overflowY: 'auto',
        }}
      >
        {data.column_diff && data.column_diff.length > 0 ? (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.column_diff.map((col, idx) => {
              let colColor = 'var(--text-primary)';
              let colBg = 'transparent';
              let prefix = '';
              let textDecoration = 'none';
              let colOpacity = 1;

              if (col.status === 'added') {
                colColor = 'var(--ds-success)';
                colBg = 'var(--ds-success-bg)';
                prefix = '+ ';
              } else if (col.status === 'removed') {
                colColor = 'var(--ds-danger)';
                colBg = 'var(--ds-danger-bg)';
                prefix = '- ';
                textDecoration = 'line-through';
                colOpacity = 0.7;
              }

              return (
                <li
                  key={`${col.name}-${idx}`}
                  style={{
                    fontSize: 10,
                    color: colColor,
                    background: colBg,
                    borderRadius: 4,
                    padding: '1px 4px',
                    margin: '0 -4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    listStyle: 'none',
                    textDecoration,
                    opacity: colOpacity,
                    fontWeight: col.status ? 500 : 400,
                  }}
                  title={col.label || col.name}
                >
                  {prefix}
                  {col.label || col.name}{' '}
                  <span style={{ opacity: 0.6, fontSize: 9 }}>({col.type})</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            No columns available
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={sourcePosition}
        style={{
          width: 8,
          height: 8,
          background: 'var(--text-muted)',
          border: 'none',
        }}
      />
    </div>
  );
};

export default memo(DsEntityNode);
