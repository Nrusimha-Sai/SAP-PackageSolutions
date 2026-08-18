import React, { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import SacWidgetRenderer from './SacWidgetRenderer';
import SacChartBuilderPane from './SacChartBuilderPane';
import { generateChartTitle } from '../utils/sacChartUtils';

const SacDashboardGrid = ({ widgets, mockDataset, availableMetadata, onUpdateWidget, onDeleteWidget, onAddWidget, editMode }) => {
  const [editingWidgetId, setEditingWidgetId] = useState(null);

  return (
    <div className="dashboard-grid">
      {widgets.map((widget, idx) => (
        <div
          key={widget.id || idx}
          id={`widget-card-${widget.id || idx}`}
          className="widget-card"
          style={{ 
            position: 'relative', 
            zIndex: editingWidgetId === widget.id ? 10 : 1,
            gridColumn: widget.type === 'table' ? '1 / -1' : undefined
          }}
        >
          <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="widget-title-container" style={{ flex: 1, marginRight: '16px' }}>
              {editMode && editingWidgetId === widget.id ? (
                <input 
                  type="text" 
                  value={widget.custom_title ?? generateChartTitle(widget.bindings, widget.type)}
                  onChange={(e) => onUpdateWidget(widget.id, { ...widget, custom_title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--r-sm)',
                    outline: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="widget-title" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                  <span>{widget.custom_title || generateChartTitle(widget.bindings, widget.type)}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>
                    {widget.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </h3>
              )}
            </div>

            {editMode && onUpdateWidget && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="expand-builder-btn"
                  style={{
                    padding: '4px',
                    border: editingWidgetId === widget.id ? '1px solid var(--border-focus)' : '1px solid transparent',
                    borderRadius: '4px'
                  }}
                  onClick={() => setEditingWidgetId(editingWidgetId === widget.id ? null : widget.id)}
                  title="Edit Widget Bindings"
                >
                  <Pencil size={13} color={editingWidgetId === widget.id ? 'var(--blue-6)' : 'var(--text-muted)'} />
                </button>
                <button
                  className="expand-builder-btn"
                  style={{ padding: '4px' }}
                  onClick={() => {
                    if (window.confirm("Are you sure you want to remove this widget from the dashboard?")) {
                      onDeleteWidget(widget.id);
                    }
                  }}
                  title="Remove Widget"
                >
                  <Trash2 size={13} color="var(--ds-danger)" />
                </button>
              </div>
            )}
          </div>

          {editingWidgetId === widget.id && onUpdateWidget && (
            <div style={{ marginBottom: '12px' }}>
              <SacChartBuilderPane
                item={widget}
                isWidget={true}
                availableMetadata={availableMetadata}
                onChange={(updatedWidget) => onUpdateWidget(widget.id, updatedWidget)}
              />
            </div>
          )}

          <div className="widget-chart-container">
            <SacWidgetRenderer widget={widget} mockDataset={mockDataset} />
          </div>
        </div>
      ))}

      {editMode && onAddWidget && (
        <div
          className="widget-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            cursor: 'pointer',
            border: '2px dashed var(--border-glass)',
            background: 'var(--bg-strip)',
            transition: 'var(--t-base)'
          }}
          onClick={onAddWidget}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-icon)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <Plus size={20} color="var(--blue-6)" />
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 700 }}>Add New Widget</h3>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', maxWidth: '240px', lineHeight: '1.4' }}>
            Click to append a new blank chart to this dashboard page.
          </p>
        </div>
      )}
    </div>
  );
};

export default SacDashboardGrid;
