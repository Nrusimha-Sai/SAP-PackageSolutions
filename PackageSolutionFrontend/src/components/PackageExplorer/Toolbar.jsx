import React from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import dashboardsData from '../../data/dashboardsData';

/* Build unique LoB list from data file */
const ALL_LOB = ['All Line of Business',
  ...Array.from(new Set(dashboardsData.map(d => d.lineOfBusiness)))
];

const Toolbar = ({ searchQuery, setSearchQuery, selectedLoB, setSelectedLoB }) => (
  <div
    className="toolbar-row"
    style={{
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}
  >
    {/* ── Search ── */}
    <div
      className="glass-input search-input-box"
      style={{
        flex: 1,
        minWidth: 180,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        borderRadius: 12,
        background: 'var(--bg-input)',
        border: '1px solid var(--border-input)',
        boxSizing: 'border-box',
      }}
    >
      <FiSearch size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Search Business Metrics..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      />
    </div>

    {/* ── Line of Business filter ── */}
    <div
      className="glass-input"
      style={{
        position: 'relative',
        minWidth: 180,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        borderRadius: 12,
        background: 'var(--bg-input)',
        border: '1px solid var(--border-input)',
        boxSizing: 'border-box',
      }}
    >
      <select
        value={selectedLoB}
        onChange={e => setSelectedLoB(e.target.value)}
        style={{
          width: '100%',
          height: '100%',
          padding: '0 40px 0 16px',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          outline: 'none',
        }}
      >
        {ALL_LOB.map(l => (
          <option
            key={l}
            value={l}
            style={{ background: 'var(--bg-dropdown-opt)', color: 'var(--text-primary)' }}
          >
            {l}
          </option>
        ))}
      </select>
      <FiChevronDown
        size={17}
        style={{ position: 'absolute', right: 14, pointerEvents: 'none', color: 'var(--text-muted)' }}
      />
    </div>
  </div>
);

export default Toolbar;
