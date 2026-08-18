import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon, FiMenu } from 'react-icons/fi';

const Header = ({ title, isMobile, onHamburger }) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <header
      className="glass-header"
      style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: 12,
      }}
    >
      {/* Left: hamburger (mobile only) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={onHamburger}
            title="Open menu"
            style={{
              width: 36, height: 36,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-icon)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FiMenu size={20} />
          </button>
        )}

        <h1
          style={{
            fontSize: isMobile ? 15 : 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: theme toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <FiSun
          size={16}
          style={{ color: dark ? 'var(--text-muted)' : 'var(--blue-6)', transition: 'color 0.24s' }}
        />
        <div
          className="toggle-track"
          onClick={toggleTheme}
          role="switch"
          aria-checked={dark}
          aria-label="Toggle dark mode"
        >
          <div className={`toggle-thumb${dark ? ' is-dark' : ''}`} />
        </div>
        <FiMoon
          size={16}
          style={{ color: dark ? 'var(--blue-5)' : 'var(--text-muted)', transition: 'color 0.24s' }}
        />
      </div>
    </header>
  );
};

export default Header;
