import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiExternalLink, FiChevronDown, FiChevronUp,
  FiBarChart2, FiPieChart, FiTrendingUp, FiUsers,
  FiShield, FiTarget, FiTruck, FiDollarSign, FiActivity,
  FiPackage,
} from 'react-icons/fi';
import { CURRENCIES, getKpiPrice } from '../../config/kpiPricing';

const LOB_ICONS = {
  'Record to Report': FiBarChart2,
  'Order to Cash':    FiTrendingUp,
  'Inventory':        FiPieChart,
  'Procure to Pay':   FiShield,
  'Finance':          FiDollarSign,
  'Operations':       FiActivity,
  'HR':               FiUsers,
  'Sales':            FiTrendingUp,
  'Marketing':        FiTarget,
  'Supply Chain':     FiTruck,
};

const DashboardStrip = ({ data, isChecked, currency = 'USD', onCheck, onOpenModal }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = LOB_ICONS[data.lineOfBusiness] || FiBarChart2;
  const isDemoEnv = window.location.pathname.includes('/demo');

  return (
    <div
      className={`glass-strip${isChecked ? ' strip--checked' : ''}`}
      style={{ marginBottom: 10, overflow: 'hidden' }}
    >
      {/* ── Main row ── */}
      <div
        className="strip-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 16px',
          minWidth: 0,
        }}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          className="kpi-checkbox"
          checked={isChecked}
          onChange={onCheck}
          title={isChecked ? 'Deselect' : 'Select for download'}
        />

        {/* Icon */}
        <div className="icon-wrap">
          <Icon size={21} />
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {data.name}
          </h3>
          <p style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {data.description}
          </p>
        </div>

        {/* LoB Badge */}
        <span className="lob-badge hide-sm">{data.lineOfBusiness}</span>

        {/* Price */}
        {!isDemoEnv && (
          <span
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', minWidth: 86, textAlign: 'right' }}
            className="hide-sm"
          >
            {CURRENCIES[currency]?.symbol}{getKpiPrice(data.id, currency).toFixed(2)}
          </span>
        )}

        {/* External link → modal */}
        <button className="icon-btn" onClick={onOpenModal} title="View snapshots">
          <FiExternalLink size={16} />
        </button>

        {/* Expand / collapse */}
        <button
          className="icon-btn"
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Hide summary' : 'Show summary'}
        >
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </button>
      </div>

      {/* ── Expand panel ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{   height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              margin: '0 18px 14px',
              padding: '14px 18px',
              background: 'var(--bg-expand)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 10,
              border: '1px solid var(--border-strip)',
            }}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                Summary
              </p>
              <ul style={{ paddingLeft: 16 }}>
                {data.summaryPoints.map((pt, i) => (
                  <li key={i} style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                    lineHeight: 1.6,
                    listStyleType: 'disc',
                  }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardStrip;
