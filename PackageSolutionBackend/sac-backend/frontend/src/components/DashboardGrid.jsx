import React, { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';
import ChartBuilderPane from './ChartBuilderPane';
import { generateChartTitle } from '../utils/chartUtils';

const DashboardGrid = ({ widgets, mockDataset, availableMetadata, onUpdateWidget, onDeleteWidget, onAddWidget, editMode }) => {
  const [editingWidgetId, setEditingWidgetId] = useState(null);

  return (
    <div className="dashboard-grid">
      {widgets.map((widget, idx) => (
        <div
          key={widget.id || idx}
          className="widget-card"
          style={{ position: 'relative', zIndex: editingWidgetId === widget.id ? 10 : 1 }}
        >
          <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="widget-title-container" style={{ flex: 1, marginRight: '16px' }}>
              {editMode && editingWidgetId === widget.id ? (
                <input 
                  type="text" 
                  value={widget.custom_title ?? generateChartTitle(widget.bindings, widget.type)}
                  onChange={(e) => onUpdateWidget(widget.id, { ...widget, custom_title: e.target.value })}
                  style={{ width: '100%', padding: '4px 8px', fontSize: '1rem', fontWeight: 600, color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="widget-title" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                  <span>{widget.custom_title || generateChartTitle(widget.bindings, widget.type)}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '2px' }}>
                    {widget.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </h3>
              )}
            </div>

            {editMode && onUpdateWidget && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-toggle"
                  style={{ padding: '4px 8px', minWidth: 'unset', border: editingWidgetId === widget.id ? '1px solid #3b82f6' : '1px solid transparent' }}
                  onClick={() => setEditingWidgetId(editingWidgetId === widget.id ? null : widget.id)}
                  title="Edit Widget Bindings"
                >
                  <Pencil size={14} color={editingWidgetId === widget.id ? "#3b82f6" : "#64748b"} />
                </button>
                <button
                  className="btn-toggle"
                  style={{ padding: '4px 8px', minWidth: 'unset' }}
                  onClick={() => {
                    if (window.confirm("Are you sure you want to remove this widget from the dashboard?")) {
                      onDeleteWidget(widget.id);
                    }
                  }}
                  title="Remove Widget"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            )}
          </div>

          {editingWidgetId === widget.id && onUpdateWidget && (
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <ChartBuilderPane
                item={widget}
                isWidget={true}
                availableMetadata={availableMetadata}
                onChange={(updatedWidget) => onUpdateWidget(widget.id, updatedWidget)}
              />
            </div>
          )}

          <div className="widget-chart-container">
            <WidgetRenderer widget={widget} mockDataset={mockDataset} />
          </div>
        </div>
      ))}

      {editMode && onAddWidget && (
        <div
          className="widget-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', cursor: 'pointer', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc' }}
          onClick={onAddWidget}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Plus size={24} color="#64748b" />
          </div>
          <h3 style={{ margin: 0, color: '#475569', fontSize: '1.1rem' }}>Add New Widget</h3>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Click to append a new blank chart to this dashboard page.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardGrid;
