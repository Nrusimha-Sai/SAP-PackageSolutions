import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Database, Settings, PieChart, ArrowRight, ArrowDown } from 'lucide-react';

const DEFAULT_LINEAGE = [
  { 
    stage: 'SOURCE', 
    name: 'SAP S/4HANA', 
    type: 'System', 
    details: ['Financial Accounting Records', 'General Ledger Entries'] 
  },
  { 
    stage: 'HARMONIZATION', 
    name: 'SAP Datasphere', 
    type: 'Data Builder', 
    details: ['Combines Financial Records with Cost Data', 'Calculates Profit = Revenue - Expenses', 'Standardizes Currency to USD'] 
  },
  { 
    stage: 'OUTPUT', 
    name: 'SAP Analytics Cloud', 
    type: 'Reporting Model', 
    details: ['Profit & Loss Dashboard', 'Aggregated by Profit Center and Region'] 
  }
];

const STAGE_ICONS = {
  Source: <Database size={20} color="#1B90FF" />,
  SOURCE: <Database size={20} color="#1B90FF" />,
  Harmonization: <Settings size={20} color="#1B90FF" />,
  HARMONIZATION: <Settings size={20} color="#1B90FF" />,
  Output: <PieChart size={20} color="#1B90FF" />,
  OUTPUT: <PieChart size={20} color="#1B90FF" />,
};

const LineageTab = ({ kpi, dashboard }) => {
  const containerRef = useRef(null);
  const [isColumn, setIsColumn] = useState(false);

  /* Detect when the flex container wraps (goes column) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => {
      // If container width < 700px, use vertical layout
      setIsColumn(el.offsetWidth < 700);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const targetKpi = kpi || dashboard;
  const lineageData = targetKpi?.lineage && targetKpi.lineage.length > 0
    ? targetKpi.lineage
    : DEFAULT_LINEAGE;

  return (
    <div
      style={{
        width: '100%',
        minHeight: 460,
        background: 'var(--bg-input, #f8fafc)',
        padding: 'clamp(20px, 4vw, 36px) clamp(16px, 3vw, 28px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0 0 var(--r-xl) var(--r-xl)',
        position: 'relative',
        overflow: 'auto',
      }}
    >
      {/* ── Lineage Metric Title ── */}
      {targetKpi?.name && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted, #64748b)',
            zIndex: 5,
            background: 'var(--bg-card, rgba(255,255,255,0.75))',
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-glass, rgba(27,144,255,0.14))',
            backdropFilter: 'blur(8px)',
          }}
        >
          Data Lineage: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{targetKpi.name}</span>
        </div>
      )}

      {/* ── Main Flow Cards ── */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: isColumn ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(12px, 2vw, 24px)',
          width: '100%',
          maxWidth: 1040,
          marginTop: targetKpi?.name ? 48 : 0,
        }}
      >
        {lineageData.map((item, index) => {
          const stageKey = item.stage ? item.stage.toUpperCase() : 'STAGE';
          const icon = STAGE_ICONS[item.stage] || STAGE_ICONS[stageKey] || <Database size={20} color="#1B90FF" />;

          return (
            <React.Fragment key={index}>
              {/* Clean Professional Stage Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3, ease: 'easeOut' }}
                style={{
                  flex: isColumn ? 'none' : '1 1 260px',
                  width: isColumn ? '100%' : undefined,
                  maxWidth: isColumn ? 480 : 320,
                  minWidth: isColumn ? 'auto' : 200,
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-glass, rgba(27,144,255,0.16))',
                  borderRadius: 18,
                  padding: '28px 24px',
                  boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0, 0, 0, 0.04))',
                  display: 'flex',
                  flexDirection: isColumn ? 'row' : 'column',
                  alignItems: isColumn ? 'flex-start' : 'center',
                  gap: isColumn ? 16 : 0,
                  minHeight: isColumn ? 'auto' : 280,
                  boxSizing: 'border-box',
                }}
              >
                {/* Circular Icon */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'rgba(27, 144, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginBottom: isColumn ? 0 : 14,
                  }}
                >
                  {icon}
                </div>

                <div style={{ flex: 1, textAlign: isColumn ? 'left' : 'center' }}>
                  {/* Stage Label */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: '#1B90FF',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    {stageKey}
                  </span>

                  {/* Stage Name */}
                  <h4
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-primary, #0f172a)',
                      margin: '0 0 12px 0',
                    }}
                  >
                    {item.name}
                  </h4>

                  {/* Bullet List Details */}
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      textAlign: 'left',
                    }}
                  >
                    {item.details && item.details.map((detail, dIdx) => (
                      <li
                        key={dIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          fontSize: 12.5,
                          lineHeight: 1.45,
                          color: 'var(--text-muted, #64748b)',
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#1B90FF',
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              {/* Arrow Connector — direction follows layout */}
              {index < lineageData.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isColumn
                    ? <ArrowDown size={22} color="#1B90FF" style={{ opacity: 0.8 }} />
                    : <ArrowRight size={22} color="#1B90FF" style={{ opacity: 0.8 }} />
                  }
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default LineageTab;