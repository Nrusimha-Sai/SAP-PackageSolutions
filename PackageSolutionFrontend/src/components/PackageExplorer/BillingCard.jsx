import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiDollarSign, FiChevronDown, FiTrash2, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { CURRENCIES, getKpiPrice } from '../../config/kpiPricing';
import dashboardsData from '../../data/dashboardsData';

const AGENT_ADD_ONS = [
  { 
    id: 'jr-ds-agent', 
    name: 'Jr-DS-Agent', 
    description: 'Advanced AI Assistant for SAP Datasphere integrations and queries.', 
    lineOfBusiness: 'AI Add-on' 
  },
  { 
    id: 'jr-sac-agent', 
    name: 'Jr-SAC-Agent', 
    description: 'Advanced AI Assistant for SAP Analytics Cloud integrations.', 
    lineOfBusiness: 'AI Add-on' 
  },
];

const BillingCard = ({ selectedIds, setSelectedIds, currency, setCurrency }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const cartItems = useMemo(() => {
    return Array.from(selectedIds).map(id => {
      let item = dashboardsData.find(d => d.id === id);
      if (!item) {
        item = AGENT_ADD_ONS.find(a => a.id === id);
      }
      return item;
    }).filter(Boolean);
  }, [selectedIds]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((acc, kpi) => acc + getKpiPrice(kpi.id, currency), 0);
  }, [cartItems, currency]);

  const availableAgents = useMemo(() => {
    return AGENT_ADD_ONS.filter(a => !selectedIds.has(a.id));
  }, [selectedIds]);

  const handleDownloadInvoice = () => {
    const doc = new jsPDF();
    
    const logoImg = new Image();
    logoImg.src = '/Yash_Logo.png';
    
    logoImg.onload = () => generatePdf(doc, logoImg);
    logoImg.onerror = () => generatePdf(doc, null);
  };

  const generatePdf = (doc, logoImg) => {
    const primaryBlue = [11, 60, 133];
    const secondaryBlue = [8, 48, 107];
    const headerBlue = [16, 74, 158];
    const cardBg = [252, 253, 255];
    const cardBorder = [230, 235, 240];
    const textDark = [30, 30, 30];
    const textMuted = [110, 110, 110];
    const textLight = [255, 255, 255];

    const currStr = currency;
    const premiumFont = 'times'; 

    // ─── Header Background ───
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(...secondaryBlue);
    doc.triangle(0, 0, 90, 0, 0, 28, 'F');

    // ─── Logo & Header Text ───
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 14, 6, 28, 12);
      doc.setTextColor(...textLight);
      doc.setFontSize(7);
      doc.setFont(premiumFont, 'italic');
      doc.text('More than what you think.', 14, 23);
    } else {
      doc.setTextColor(...textLight);
      doc.setFontSize(14);
      doc.setFont(premiumFont, 'bold');
      doc.text('YASH Technologies', 14, 14);
      doc.setFontSize(7);
      doc.setFont(premiumFont, 'italic');
      doc.text('More than what you think.', 15, 19);
    }

    doc.setTextColor(...textLight);
    doc.setFontSize(22);
    doc.setFont(premiumFont, 'bold');
    doc.text('INVOICE', 196, 16, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont(premiumFont, 'italic');
    doc.text('Thank you for your business!', 196, 23, { align: 'right' });

    let y = 34;

    // ─── Info Cards ───
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.5);
    
    // Left Card (Bill To)
    doc.roundedRect(14, y, 90, 22, 2, 2, 'FD');
    doc.setTextColor(...headerBlue);
    doc.setFontSize(8);
    doc.setFont(premiumFont, 'bold');
    doc.text('BILL TO', 20, y + 6);
    doc.setDrawColor(...headerBlue);
    doc.line(20, y + 7.5, 30, y + 7.5);

    doc.setTextColor(...textDark);
    doc.setFontSize(9);
    doc.text('Valued Client', 20, y + 12);
    
    doc.setTextColor(...textMuted);
    doc.setFontSize(7);
    doc.setFont(premiumFont, 'normal');
    doc.text('123 Corporate Blvd, Business City, ST 12345', 20, y + 16.5);
    doc.text('United States', 20, y + 20);

    // ─── Right Card (Invoice Details) ───
    doc.setFillColor(242, 244, 248); // Subtle grey-blue background
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(120, y, 76, 22, 2, 2, 'FD');

    doc.setTextColor(...textDark);
    doc.setFontSize(8);
    doc.setFont(premiumFont, 'bold');
    doc.text('Invoice Date', 126, y + 7.5);
    doc.text('Invoice No.', 126, y + 13.5);
    doc.text('Currency', 126, y + 19.5);

    doc.setFont(premiumFont, 'normal');
    doc.setTextColor(...textMuted);
    
    // Using absolute left-alignment to ensure rendering across all PDF viewers
    doc.text(new Date().toLocaleDateString(), 156, y + 7.5);
    doc.text(`INV-${Math.floor(Math.random() * 90000) + 10000}`, 156, y + 13.5);
    doc.text(currStr, 156, y + 19.5);

    // ─── Table Header (Rounded) ───
    y += 26;
    doc.setFillColor(...headerBlue);
    doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
    
    doc.setTextColor(...textLight);
    doc.setFontSize(7);
    doc.setFont(premiumFont, 'bold');
    doc.text('#', 20, y + 5.5);
    doc.text('ITEM DESCRIPTION', 32, y + 5.5);
    doc.text('LINE OF BUSINESS', 110, y + 5.5);
    doc.text(`AMOUNT (${currStr})`, 190, y + 5.5, { align: 'right' });

    // ─── Table Rows (Rounded) ───
    y += 9;
    
    cartItems.forEach((item, idx) => {
      doc.setDrawColor(...cardBorder);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, 182, 10, 2, 2, 'FD'); 

      doc.setTextColor(...headerBlue);
      doc.setFont(premiumFont, 'bold');
      doc.setFontSize(8);
      doc.text(`0${idx + 1}`.slice(-2), 20, y + 6);
      
      doc.setTextColor(...textDark);
      doc.setFontSize(8);
      doc.text(item.name, 32, y + 4.5);
      
      doc.setTextColor(...textMuted);
      doc.setFont(premiumFont, 'normal');
      doc.setFontSize(7);
      const desc = item.description.length > 55 ? item.description.substring(0, 52) + '...' : item.description;
      doc.text(desc, 32, y + 8.5);

      doc.setFontSize(8);
      doc.text(item.lineOfBusiness || 'N/A', 110, y + 6);
      
      doc.setTextColor(...textDark);
      doc.setFont(premiumFont, 'bold');
      const price = getKpiPrice(item.id, currency);
      doc.text(`${price.toFixed(2)}`, 190, y + 6, { align: 'right' });

      y += 11.5; 
      
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
    });

    // ─── Totals Section ───
    y += 4;
    doc.setFillColor(245, 249, 255);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(14, y, 182, 12, 2, 2, 'FD');

    doc.setTextColor(...headerBlue);
    doc.setFontSize(10);
    doc.setFont(premiumFont, 'bold');
    doc.text('TOTAL DUE', 20, y + 8);
    
    doc.setFontSize(13);
    doc.text(`${currStr} ${totalPrice.toFixed(2)}`, 190, y + 8.5, { align: 'right' });

    // ─── Notes ───
    y += 16;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(14, y, 182, 24, 2, 2, 'FD');
    
    doc.setTextColor(...headerBlue);
    doc.setFontSize(9);
    doc.setFont(premiumFont, 'bold');
    doc.text('Notes', 20, y + 6);
    doc.line(20, y + 7.5, 28, y + 7.5);
    
    doc.setTextColor(...textMuted);
    doc.setFontSize(8);
    doc.setFont(premiumFont, 'normal');
    doc.text(`1. All amounts are in ${currStr}.`, 20, y + 12);
    doc.text('2. Please make the payment within 15 days from the invoice date.', 20, y + 16.5);
    doc.text('3. For any queries, feel free to contact us.', 20, y + 21);

    // ─── Thin Blue Footer Strip ───
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 291, 210, 6, 'F');
    
    doc.save(`Invoice_${Date.now()}.pdf`);
  };

  if (cartItems.length === 0 && availableAgents.length === 0) {
    return (
      <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        <FiDollarSign size={32} style={{ opacity: 0.5, marginBottom: 12, margin: '0 auto' }} />
        <p style={{ fontSize: 14, fontWeight: 500 }}>Billing summary is Empty</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Select dashboards or add-ons to view pricing.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="glass-card" 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* ── Billing Summary Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiShoppingCart size={18} /> Billing summary
        </h3>
        
        {/* Currency Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'var(--bg-expand)', 
              border: '1.5px solid var(--blue-6)',
              borderRadius: '24px', cursor: 'pointer', 
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-primary)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              userSelect: 'none'
            }}
          >
            {currency} <FiChevronDown size={15} style={{ color: 'var(--text-primary)', strokeWidth: 3 }} />
          </div>
          
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--bg-modal)', border: '1px solid var(--border-modal)',
                  borderRadius: '6px', boxShadow: 'var(--shadow-modal)', 
                  overflow: 'hidden', zIndex: 50, minWidth: '100%'
                }}
              >
                {Object.keys(CURRENCIES).map(curr => (
                  <div 
                    key={curr}
                    onClick={() => { setCurrency(curr); setDropdownOpen(false); }}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                      background: curr === currency ? 'var(--blue-6)' : 'transparent',
                      color: curr === currency ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: curr === currency ? 600 : 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if(curr !== currency) { e.currentTarget.style.background = 'var(--border-strip)'; }
                    }}
                    onMouseLeave={(e) => {
                      if(curr !== currency) { e.currentTarget.style.background = 'transparent'; }
                    }}
                  >
                    {curr}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Billing Summary Items List ── */}
      {cartItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--border-strip)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {CURRENCIES[currency].symbol}{getKpiPrice(item.id, currency).toFixed(2)}
                </span>
                <button 
                  onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; })}
                  className="icon-btn"
                  title="Remove from billing summary"
                  style={{ width: 22, height: 22, minWidth: 22, minHeight: 22, padding: 0 }}
                >
                  <FiTrash2 size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
          Your billing summary is currently empty.
        </div>
      )}

      {/* ── Available Add-ons ── */}
      {availableAgents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0' }}>
            Available Add-ons
          </h4>
          {availableAgents.map(agent => (
            <div key={agent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-expand)', borderRadius: 8, border: '1px solid var(--border-strip)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {CURRENCIES[currency].symbol}{getKpiPrice(agent.id, currency).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.add(agent.id); return n; })}
                className="glass-strip"
                style={{ 
                  padding: '6px 12px', background: 'var(--blue-6)', color: '#fff', 
                  border: 'none', borderRadius: 6, cursor: 'pointer', 
                  fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 
                }}
              >
                <FiPlus size={14} /> Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Total & Action ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '2px solid var(--border-modal)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Total Due</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {CURRENCIES[currency].symbol}{totalPrice.toFixed(2)}
        </span>
      </div>

      <button 
        onClick={handleDownloadInvoice}
        disabled={cartItems.length === 0}
        className="glass-strip"
        style={{ 
          marginTop: 8, 
          padding: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 8, 
          width: '100%', 
          cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer', 
          fontWeight: 600,
          color: cartItems.length === 0 ? 'var(--text-muted)' : 'var(--blue-6)',
          opacity: cartItems.length === 0 ? 0.6 : 1
        }}
      >
        <FiFileText size={18} />
        Download Invoice PDF
      </button>
    </motion.div>
  );
};

export default BillingCard;
