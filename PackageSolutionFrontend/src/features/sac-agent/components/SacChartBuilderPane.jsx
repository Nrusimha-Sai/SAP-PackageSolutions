import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Plus, X } from 'lucide-react';

const getRules = (type) => {
  const t = type.toLowerCase();
  
  if (t === 'table') return { maxMeas: 20, maxDim: 20, minMeas: 1, minDim: 1 };
  if (t === 'pie' || t === 'donut') return { maxMeas: 1, maxDim: 1, minMeas: 1, minDim: 1 };
  if (t === 'numeric_point' || t === 'kpi_card' || t === 'gauge') return { maxMeas: 1, maxDim: 0, minMeas: 1, minDim: 0 };
  
  if (t.includes('combination') || t === 'pareto') return { maxMeas: 5, maxDim: 2, minMeas: 2, minDim: 1 };
  if (t.includes('scatter') || t.includes('bubble')) return { maxMeas: 3, maxDim: 2, minMeas: 2, minDim: 1 };
  if (t === 'heat_map' || t === 'marimekko') return { maxMeas: 1, maxDim: 2, minMeas: 1, minDim: 2 };
  
  if (t === 'waterfall') return { maxMeas: 10, maxDim: 1, minMeas: 1, minDim: 0 };
  if (t === 'radar') return { maxMeas: 5, maxDim: 1, minMeas: 1, minDim: 1 };
  if (t === 'sankey') return { maxMeas: 1, maxDim: 2, minMeas: 1, minDim: 2 };
  if (t === 'tree_map') return { maxMeas: 1, maxDim: 3, minMeas: 1, minDim: 1 };
  
  return { maxMeas: 5, maxDim: 2, minMeas: 1, minDim: 1 }; 
};

const SacChartBuilderPane = ({ item, isWidget, availableMetadata, onChange }) => {
  const [showAddDim, setShowAddDim] = useState(false);
  const [showAddMeas, setShowAddMeas] = useState(false);
  const [dimSearch, setDimSearch] = useState('');
  const [measSearch, setMeasSearch] = useState('');
  
  const dimDropdownRef = useRef(null);
  const measDropdownRef = useRef(null);

  const chartType = isWidget ? item.type : item.chart_type;
  const bindingKey = isWidget ? 'bindings' : 'binding';
  
  const rules = getRules(chartType || '');
  const currentDims = item[bindingKey]?.dimensions || [];
  const currentMeas = item[bindingKey]?.measures || [];
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dimDropdownRef.current && !dimDropdownRef.current.contains(event.target)) {
        setShowAddDim(false);
      }
      if (measDropdownRef.current && !measDropdownRef.current.contains(event.target)) {
        setShowAddMeas(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sourceModel = isWidget ? (item.dataSource?.modelId || '') : (item.source_model || '');
  const availableModels = Object.keys(availableMetadata?.dimensions || {});
  
  const isMultiModel = availableModels.length > 0 && !Array.isArray(availableMetadata.dimensions);
  
  const currentAvailableDims = isMultiModel 
    ? (availableMetadata.dimensions[sourceModel] || []) 
    : (availableMetadata.dimensions || []);
    
  const currentAvailableMeas = isMultiModel 
    ? (availableMetadata.measures[sourceModel] || []) 
    : (availableMetadata.measures || []);

  const handleUpdate = (newDims, newMeas, newSourceModel = sourceModel) => {
    const updatedItem = { ...item };
    updatedItem[bindingKey] = {
      dimensions: newDims,
      measures: newMeas
    };
    if (isWidget) {
      if (!updatedItem.dataSource) updatedItem.dataSource = {};
      updatedItem.dataSource.modelId = newSourceModel;
    } else {
      updatedItem.source_model = newSourceModel;
    }
    onChange(updatedItem);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    handleUpdate([], [], newModel);
  };

  const handleAddDim = (dim) => {
    if (currentDims.length < rules.maxDim && !currentDims.includes(dim)) {
      handleUpdate([...currentDims, dim], currentMeas);
    }
    setShowAddDim(false);
  };

  const handleRemoveDim = (dimToRemove) => {
    handleUpdate(currentDims.filter(d => d !== dimToRemove), currentMeas);
  };

  const handleAddMeas = (meas) => {
    if (currentMeas.length < rules.maxMeas && !currentMeas.includes(meas)) {
      handleUpdate(currentDims, [...currentMeas, meas]);
    }
    setShowAddMeas(false);
  };

  const handleRemoveMeas = (measToRemove) => {
    handleUpdate(currentDims, currentMeas.filter(m => m !== measToRemove));
  };

  return (
    <div className="builder-pane-ui" onClick={(e) => e.stopPropagation()}>
      <div className="builder-header-ui">
        <Settings2 size={15} style={{ color: 'var(--blue-6)' }} /> Data Binding Builder
      </div>

      {isMultiModel && availableModels.length > 0 && (
        <div className="builder-section" style={{ marginBottom: '8px' }}>
          <div className="builder-section-title">Source Model</div>
          <select 
            value={sourceModel} 
            onChange={handleModelChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-glass)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value="" disabled>Select a source model</option>
            {availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {!sourceModel && <div className="builder-warning" style={{ marginTop: '4px' }}>Please select a source model first.</div>}
        </div>
      )}
      
      {/* Dimensions Section */}
      {rules.maxDim > 0 && sourceModel && (
        <div className="builder-section">
          <div className="builder-section-title">Dimensions (Max: {rules.maxDim})</div>
          <div className="builder-pill-container">
            {currentDims.map(d => (
              <div key={d} className="builder-pill">
                <span>{d}</span>
                <button className="remove-btn" onClick={() => handleRemoveDim(d)}><X size={12} /></button>
              </div>
            ))}
          </div>
          {currentDims.length < rules.maxDim && (
            <div className="add-container" ref={dimDropdownRef}>
              <button className="add-btn" onClick={() => setShowAddDim(!showAddDim)}>
                <Plus size={12} /> Add Dimension
              </button>
              {showAddDim && (
                <div className="add-dropdown">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={dimSearch}
                    onChange={e => setDimSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: 'none',
                      borderBottom: '1px solid var(--border-glass)',
                      outline: 'none',
                      fontSize: '0.8rem'
                    }}
                    autoFocus
                  />
                  {currentAvailableDims.filter(d => !currentDims.includes(d) && d.toLowerCase().includes(dimSearch.toLowerCase())).map(d => (
                    <div key={d} className="add-dropdown-item" onClick={() => { handleAddDim(d); setDimSearch(''); }}>{d}</div>
                  ))}
                  {currentAvailableDims.filter(d => !currentDims.includes(d) && d.toLowerCase().includes(dimSearch.toLowerCase())).length === 0 && (
                    <div className="add-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>No match</div>
                  )}
                </div>
              )}
            </div>
          )}
          {currentDims.length < rules.minDim && <div className="builder-warning">At least {rules.minDim} Dimension required</div>}
        </div>
      )}

      {/* Measures Section */}
      {rules.maxMeas > 0 && sourceModel && (
        <div className="builder-section">
          <div className="builder-section-title">Accounts / Measures (Max: {rules.maxMeas})</div>
          <div className="builder-pill-container">
            {currentMeas.map(m => (
              <div key={m} className="builder-pill measure-pill">
                <span>{m}</span>
                <button className="remove-btn" onClick={() => handleRemoveMeas(m)}><X size={12} /></button>
              </div>
            ))}
          </div>
          {currentMeas.length < rules.maxMeas && (
            <div className="add-container" ref={measDropdownRef}>
              <button className="add-btn" onClick={() => setShowAddMeas(!showAddMeas)}>
                <Plus size={12} /> Add Measure
              </button>
              {showAddMeas && (
                <div className="add-dropdown">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={measSearch}
                    onChange={e => setMeasSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: 'none',
                      borderBottom: '1px solid var(--border-glass)',
                      outline: 'none',
                      fontSize: '0.8rem'
                    }}
                    autoFocus
                  />
                  {currentAvailableMeas.filter(m => !currentMeas.includes(m) && m.toLowerCase().includes(measSearch.toLowerCase())).map(m => (
                    <div key={m} className="add-dropdown-item" onClick={() => { handleAddMeas(m); setMeasSearch(''); }}>{m}</div>
                  ))}
                  {currentAvailableMeas.filter(m => !currentMeas.includes(m) && m.toLowerCase().includes(measSearch.toLowerCase())).length === 0 && (
                    <div className="add-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>No match</div>
                  )}
                </div>
              )}
            </div>
          )}
          {currentMeas.length < rules.minMeas && <div className="builder-warning">At least {rules.minMeas} Account required</div>}
        </div>
      )}
    </div>
  );
};

export default SacChartBuilderPane;
