import React from 'react';
import { BookOpen, MousePointerClick, X } from 'lucide-react';

const SacBlueprintSidebar = ({ widgets, kpis = [], onClose }) => {
  const allWidgets = [...kpis, ...widgets];
  
  return (
    <aside className="blueprint-pane">
      <div className="blueprint-header" style={{ position: 'relative' }}>
        <h2 style={{ paddingRight: '24px' }}>
          <BookOpen size={20} style={{ color: 'var(--blue-6)' }} /> SAC Builder Blueprint
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
          Follow these explicit instructions to reproduce the AI-designed dashboard in SAP Analytics Cloud.
        </p>
        
        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="mobile-close-blueprint"
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            title="Close Blueprint"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="blueprint-content">
        {allWidgets.map((widget, index) => {
          const dims = widget.bindings?.dimensions || [];
          const meas = widget.bindings?.measures || [];
          const modelName = widget.dataSource?.modelId || widget.source_model || 'Unknown Model';
          
          return (
            <div key={widget.id || index} className="instruction-card">
              <div className="instruction-title">
                <MousePointerClick size={15} /> 
                Widget {index + 1}: {widget.type.replace(/_/g, ' ').toUpperCase()}
              </div>
              
              <div className="instruction-step">
                <div className="step-number">1</div>
                <div className="step-text">
                  Set the Data Source Model to <strong>{modelName}</strong>.
                </div>
              </div>

              <div className="instruction-step">
                <div className="step-number">2</div>
                <div className="step-text">
                  In SAC, insert a new <strong>{widget.type.replace(/_/g, ' ')}</strong> into the canvas.
                </div>
              </div>

              {dims.length > 0 && (
                <div className="instruction-step">
                  <div className="step-number">3</div>
                  <div className="step-text">
                    Add the following to <strong>Dimensions</strong>:
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {dims.map(d => <span key={d} className="badge">{d}</span>)}
                    </div>
                  </div>
                </div>
              )}

              {meas.length > 0 && (
                <div className="instruction-step">
                  <div className="step-number">{dims.length > 0 ? '4' : '3'}</div>
                  <div className="step-text">
                    Add the following to <strong>Measures</strong>:
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {meas.map(m => <span key={m} className="badge">{m}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default SacBlueprintSidebar;
