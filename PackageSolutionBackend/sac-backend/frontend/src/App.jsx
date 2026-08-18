import { useState } from 'react';
import axios from 'axios';
import { BarChart3, Loader2, Sparkles, LayoutTemplate, LayoutDashboard, Download, CheckSquare, Square, ChevronDown, ChevronUp, Copy, Plus, Trash2, Pencil, X } from 'lucide-react';
import DashboardGrid from './components/DashboardGrid';
import BlueprintSidebar from './components/BlueprintSidebar';
import WidgetRenderer from './components/WidgetRenderer';
import ChartBuilderPane from './components/ChartBuilderPane';
import { generateChartTitle } from './utils/chartUtils';
import './App.css';

const CHART_TYPES = [
  'bar_column', 'line', 'numeric_point', 'gauge', 'combination_column_line',
  'pareto', 'stacked_bar_column', 'combination_stacked_column_line', 'area',
  'stacked_area', 'pie', 'donut', 'bullet', 'time_series', 'heat_map',
  'waterfall', 'tree_map', 'box_plot', 'marimekko', 'bubble', 'histogram',
  'scatterplot', 'cluster_bubble', 'radar', 'funnel', 'sankey', 'table'
];

const generateShowcaseWidgets = () => {
  return CHART_TYPES.map((type, i) => ({
    id: `w_showcase_${i}`,
    type: type,
    bindings: {
      dimensions: type === 'heat_map' ? ['Category', 'Time'] : type.includes('bubble') ? ['Entity'] : ['Category'],
      measures: type.includes('combination') || type === 'pareto' || type === 'bubble' || type === 'scatter' ? ['Value 1', 'Value 2'] : ['Value']
    },
    style: {
      colorPalette: ['#0C447C', '#0F6E56', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']
    }
  }));
};

function App() {
  const [models, setModels] = useState([{ spaceId: 'RADH_S3P', modelId: 'ZFI_AM_DSO_KPI11' }]);
  const [showSpacesPanel, setShowSpacesPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyData, setStoryData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [availableMetadata, setAvailableMetadata] = useState({ dimensions: [], measures: [] });
  const [expandedRec, setExpandedRec] = useState(null);
  const [mockDataset, setMockDataset] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(null);
  const [showCustomChartModal, setShowCustomChartModal] = useState(false);
  const [customChartSelections, setCustomChartSelections] = useState({});
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [targetDashboardPage, setTargetDashboardPage] = useState(null);
  const [editingKpiId, setEditingKpiId] = useState(null);

  const handleGetRecommendations = async () => {
    const validModels = models.filter(m => m.spaceId && m.modelId).map(m => ({
      space_id: m.spaceId.trim().replace(/\s+/g, '_'),
      model_id: m.modelId.trim().replace(/\s+/g, '_')
    }));

    if (validModels.length === 0) {
      alert("Please enter at least one Space ID and Model ID.");
      return;
    }

    setShowSpacesPanel(false);

    setIsGenerating(true);
    setError(null);
    setRecommendations(null);
    setStoryData(null);
    setSearchTerm('');
    setCurrentPageIndex(0);
    setExpandedRec(null);
    setMockDataset(null);
    setLoadingStatus({ status: "Initializing connection...", step: 0, total: 5 });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/recommend-charts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: validModels })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          let jsonStr = line.trim();
          if (jsonStr.startsWith('data:')) {
            jsonStr = jsonStr.substring(5).trim();
          }

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              throw new Error(data.error);
            } else if (data.status) {
              console.log("Stream chunk received:", data.status);
              setLoadingStatus({ status: data.status, step: data.step, total: data.total });
            } else if (data.result) {
              console.log("Stream result received.");
              const resData = data.result;
              if (resData.recommendations) {
                setRecommendations(resData.recommendations);
                setAvailableMetadata(resData.metadata || { dimensions: [], measures: [] });
                const preSelected = resData.recommendations
                  .map((rec, i) => rec.is_recommended ? i : -1)
                  .filter(i => i !== -1);
                setSelectedIndices(new Set(preSelected));
                if (resData.mock_dataset) {
                  setMockDataset(resData.mock_dataset);
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse chunk:", line, e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setIsGenerating(false);
      setLoadingStatus(null);
    }
  };

  const handleUpdateRec = (idx, newRec) => {
    setRecommendations(prev => {
      const copy = [...prev];
      copy[idx] = newRec;
      return copy;
    });
  };

  const handleDuplicateRec = (idx) => {
    const recToDuplicate = recommendations[idx];
    const newRec = JSON.parse(JSON.stringify(recToDuplicate));
    newRec.is_copied = true;
    setRecommendations(prev => [...prev, newRec]);
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(recommendations.length);
      return newSet;
    });
  };

  const handleRemoveRec = (idxToRemove) => {
    setRecommendations(prev => prev.filter((_, i) => i !== idxToRemove));
    setSelectedIndices(prev => {
      const newSet = new Set();
      prev.forEach(i => {
        if (i < idxToRemove) newSet.add(i);
        else if (i > idxToRemove) newSet.add(i - 1);
      });
      return newSet;
    });
    if (expandedRec === idxToRemove) setExpandedRec(null);
    else if (expandedRec > idxToRemove) setExpandedRec(expandedRec - 1);
  };

  const handleOpenCustomChartModal = (pageIdx = null) => {
    setTargetDashboardPage(typeof pageIdx === 'number' ? pageIdx : null);
    setCustomChartSelections({});
    setShowCustomChartModal(true);
  };

  const handleApplyCustomCharts = () => {
    const newItems = [];
    Object.entries(customChartSelections).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const defaultSourceModel = Object.keys(availableMetadata?.dimensions || {})[0] || null;
        const uniqueId = `custom_w_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        if (targetDashboardPage !== null) {
          newItems.push({
            id: uniqueId,
            type: type,
            source_model: defaultSourceModel,
            bindings: { dimensions: [], measures: [] },
            style: {}
          });
        } else {
          newItems.push({
            chart_type: type,
            confidence: 1.0,
            is_recommended: false,
            is_custom: true,
            source_model: defaultSourceModel,
            rationale: "Custom chart manually added by user.",
            is_applicable: true,
            binding: { dimensions: [], measures: [] }
          });
        }
      }
    });

    if (newItems.length > 0) {
      if (targetDashboardPage !== null) {
        const newStoryData = { ...storyData };
        newItems.forEach(item => {
          if (item.type === 'numeric_point' || item.type === 'kpi_card' || item.type === 'gauge') {
            if (!newStoryData.kpis) newStoryData.kpis = [];
            newStoryData.kpis.unshift(item); // Add to top as requested
          } else {
            if (!newStoryData.pages[targetDashboardPage].widgets) newStoryData.pages[targetDashboardPage].widgets = [];
            newStoryData.pages[targetDashboardPage].widgets.push(item);
          }
        });
        setStoryData(newStoryData);
      } else {
        setRecommendations(prev => [...prev, ...newItems]);
        setSelectedIndices(prev => {
          const newSet = new Set(prev);
          const startIndex = recommendations.length;
          newItems.forEach((_, idx) => newSet.add(startIndex + idx));
          return newSet;
        });
        setExpandedRec(recommendations.length);
      }
    }

    setShowCustomChartModal(false);
    setCustomChartSelections({});
    setTargetDashboardPage(null);
  };

  const handleDeleteWidget = (pageIdx, widgetId) => {
    const newStoryData = { ...storyData };
    newStoryData.pages[pageIdx].widgets = newStoryData.pages[pageIdx].widgets.filter(w => w.id !== widgetId);
    setStoryData(newStoryData);
  };

  const handleUpdateWidget = (pageIdx, widgetId, updatedWidget) => {
    const newStoryData = { ...storyData };
    const realIdx = newStoryData.pages[pageIdx].widgets.findIndex(w => w.id === widgetId);
    if (realIdx > -1) {
      newStoryData.pages[pageIdx].widgets[realIdx] = updatedWidget;
      setStoryData(newStoryData);
    }
  };

  const handleDeleteKpi = (kpiId) => {
    const newStoryData = { ...storyData };
    newStoryData.kpis = newStoryData.kpis.filter(k => k.id !== kpiId);
    setStoryData(newStoryData);
  };

  const handleUpdateKpi = (kpiId, updatedKpi) => {
    const newStoryData = { ...storyData };
    const kpiIdx = newStoryData.kpis.findIndex(k => k.id === kpiId);
    if (kpiIdx > -1) {
      newStoryData.kpis[kpiIdx] = updatedKpi;
      setStoryData(newStoryData);
    }
  };

  const handleAddWidget = (pageIdx) => {
    handleOpenCustomChartModal(pageIdx);
  };

  const handleBuildDashboard = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const selectedRecs = recommendations.filter((_, i) => selectedIndices.has(i));
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/generate-story`, {
        space_id: models[0]?.spaceId || 'default-space',
        model_id: models[0]?.modelId || 'default-model',
        selected_recommendations: selectedRecs,
        available_metadata: availableMetadata
      });
      if (response.data.status.includes('success') || response.data.status.includes('partial_success')) {
        setStoryData(response.data.story);
        setRecommendations(null); // Clear recommendations to show dashboard
      } else {
        throw new Error("Backend failed to generate story.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate dashboard');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShowcase = () => {
    setIsGenerating(false);
    setError(null);
    setStoryData({
      pages: [{
        widgets: generateShowcaseWidgets()
      }]
    });
    // Auto-enable zoom out and hide sidebar to make room for all 26 charts!
    setCompactView(true);
    setShowSidebar(false);
  };

  const handleDownload = async (format) => {
    if (!storyData) return;

    const unconstrainLayout = () => {
      const appNode = document.querySelector('.app-container');
      const mainNode = document.querySelector('.main-content');
      const dashNode = document.querySelector('.dashboard-pane');
      const wrapperNode = document.querySelector('.dashboard-wrapper');

      if (!appNode || !mainNode || !dashNode) return null;

      const origAppHeight = appNode.style.height;
      const origMainOverflow = mainNode.style.overflow;
      const origDashOverflow = dashNode.style.overflow;
      const hadCompactMode = wrapperNode && wrapperNode.classList.contains('compact-mode');

      appNode.style.height = 'auto';
      mainNode.style.overflow = 'visible';
      dashNode.style.overflow = 'visible';
      if (hadCompactMode) wrapperNode.classList.remove('compact-mode');

      return () => {
        appNode.style.height = origAppHeight;
        mainNode.style.overflow = origMainOverflow;
        dashNode.style.overflow = origDashOverflow;
        if (hadCompactMode && wrapperNode) wrapperNode.classList.add('compact-mode');
      };
    };

    if (format === 'png') {
      const wasEditing = editMode;
      setEditMode(false);
      window.isExporting = true;
      try {
        const html2canvas = (await import('html2canvas')).default;
        const appNode = document.querySelector('.app-container');
        if (!appNode) return;

        const restoreLayout = unconstrainLayout();
        await new Promise(resolve => setTimeout(resolve, 200)); // wait for CSS reflow and state update

        const canvas = await html2canvas(appNode, {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          windowHeight: appNode.scrollHeight
        });

        const imgData = canvas.toDataURL("image/png");
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `${models[0]?.modelId || 'multi_model'}_dashboard.png`;
        a.click();
      } catch (err) {
        console.error(`Failed to export PNG:`, err);
        alert(`Failed to export PNG. Ensure html2canvas is installed.`);
      } finally {
        if (restoreLayout) restoreLayout();
        setEditMode(wasEditing);
        window.isExporting = false;
      }
    } else if (format === 'pdf') {
      const wasEditing = editMode;
      setEditMode(false);
      window.isExporting = true;
      try {
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const originalPage = currentPageIndex;
        let pdf = null;

        for (let i = 0; i < storyData.pages.length; i++) {
          setCurrentPageIndex(i);
          // Wait for React to re-render the new page's charts
          await new Promise(resolve => setTimeout(resolve, 600));

          const appNode = document.querySelector('.app-container');
          if (!appNode) continue;

          const restoreLayout = unconstrainLayout();
          await new Promise(resolve => setTimeout(resolve, 200));

          const canvas = await html2canvas(appNode, {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            windowHeight: appNode.scrollHeight
          });

          if (restoreLayout) restoreLayout();

          const imgData = canvas.toDataURL("image/jpeg", 0.85);

          if (i === 0) {
            pdf = new jsPDF({
              orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [canvas.width / 2, canvas.height / 2]
            });
          } else {
            pdf.addPage([canvas.width / 2, canvas.height / 2], canvas.width > canvas.height ? 'landscape' : 'portrait');
          }
          // Embed JPEG natively and apply FAST compression
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2, undefined, 'FAST');
        }

        if (pdf) pdf.save(`${models[0]?.modelId || 'multi_model'}_dashboard.pdf`);
        setCurrentPageIndex(originalPage);
      } catch (err) {
        console.error(`Failed to export PDF:`, err);
        alert(`Failed to export PDF. Ensure html2canvas and jspdf are installed.`);
      } finally {
        setEditMode(wasEditing);
        window.isExporting = false;
      }
    } else if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storyData, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${models[0]?.modelId || 'multi_model'}_blueprint.json`;
      a.click();
    } else if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,Widget_ID,Chart_Type,Measures,Dimensions\n";
      storyData.pages.forEach(page => {
        page.widgets.forEach(w => {
          const meas = (w.bindings?.measures || []).join(';');
          const dims = (w.bindings?.dimensions || []).join(';');
          csvContent += `${w.id},${w.type},${meas},${dims}\n`;
        });
      });
      const a = document.createElement('a');
      a.href = encodeURI(csvContent);
      a.download = `${models[0]?.modelId || 'multi_model'}_widgets.csv`;
      a.click();
    }
  };

  const widgets = storyData?.pages?.[currentPageIndex]?.widgets || [];

  return (
    <div className="app-container">
      {/* Spaces Side Panel */}
      {showSpacesPanel && (
        <div className="spaces-panel-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="spaces-panel" onClick={(e) => e.stopPropagation()} style={{ width: '400px', height: '100%', backgroundColor: 'var(--bg-panel)', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Configure Models</h2>
              <button onClick={() => setShowSpacesPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {models.map((m, idx) => (
                <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Model #{idx + 1}</span>
                    {models.length > 1 && (
                      <button
                        onClick={() => setModels(models.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Remove Model"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Space ID</label>
                    <input
                      type="text"
                      className="model-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. DSP_CUST_CONTENT"
                      value={m.spaceId}
                      onChange={(e) => {
                        const newModels = [...models];
                        newModels[idx].spaceId = e.target.value;
                        setModels(newModels);
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Analytical Model ID</label>
                    <input
                      type="text"
                      className="model-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. AM_SALES_PERFORMANCE"
                      value={m.modelId}
                      onChange={(e) => {
                        const newModels = [...models];
                        newModels[idx].modelId = e.target.value;
                        setModels(newModels);
                      }}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => setModels([...models, { spaceId: '', modelId: '' }])}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: 'transparent', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                <Plus size={18} /> Add Another Model
              </button>
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
              <button
                className="btn-generate"
                style={{ width: '100%', height: '48px' }}
                onClick={handleGetRecommendations}
                disabled={isGenerating || models.filter(m => m.spaceId && m.modelId).length === 0}
              >
                {isGenerating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                {isGenerating ? 'Analyzing...' : 'Analyze Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="top-bar">
        <div className="brand">
          <img src="/Yash.png" alt="Yash Technologies Logo" style={{ height: '32px', marginRight: '12px', objectFit: 'contain' }} />
          <h1>YASH Technologies - Junior SAC Agent</h1>
        </div>

        <div className="controls" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowSpacesPanel(true)}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LayoutTemplate size={18} />
            Spaces ({models.filter(m => m.spaceId && m.modelId).length})
          </button>

          <button
            className="btn-generate"
            style={{ height: '42px' }}
            onClick={handleGetRecommendations}
            disabled={isGenerating || models.filter(m => m.spaceId && m.modelId).length === 0}
          >
            {isGenerating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            {isGenerating ? 'Analyzing...' : 'Get Recommendations'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Left Pane: Visual Dashboard */}
        <div className="dashboard-pane">

          <div className="dashboard-toolbar">
            <div className="toolbar-left">
              <button
                className="btn-toggle"
                onClick={handleShowcase}
                title="Instantly preview all 26 chart types"
              >
                <LayoutDashboard size={18} />
                Showcase All Charts
              </button>
            </div>

            <div className="toolbar-right">
              {storyData && (
                <>
                  <label className="switch-toggle" style={{ marginLeft: '12px' }}>
                    <input
                      type="checkbox"
                      checked={editMode}
                      onChange={() => {
                        setEditMode(!editMode);
                        // Reset editing states when toggling off
                        if (editMode) {
                          setEditingKpiId(null);
                        }
                      }}
                    />
                    <span className="slider round"></span>
                    <span className="switch-label">Edit Mode</span>
                  </label>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      checked={compactView}
                      onChange={() => setCompactView(!compactView)}
                    />
                    <span className="slider round"></span>
                    <span className="switch-label">Zoom Out</span>
                  </label>

                  <button
                    className="btn-toggle"
                    onClick={() => setShowSidebar(!showSidebar)}
                  >
                    <LayoutTemplate size={18} />
                    {showSidebar ? 'Hide Blueprint' : 'Show Blueprint'}
                  </button>

                  <div style={{ position: 'relative' }}>
                    <select
                      className="btn-toggle"
                      style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDownload(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Download</option>
                      <option value="pdf">PDF Document</option>
                      <option value="png">PNG Image</option>
                      <option value="json">JSON Blueprint</option>
                      <option value="csv">CSV Metadata</option>
                    </select>
                    <Download size={16} style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none', opacity: 0.6 }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

          {!storyData && !recommendations && !isGenerating && !error && (
            <div className="empty-state">
              <LayoutTemplate size={64} />
              <h2>No Dashboard Generated</h2>
              <p>Enter a Model ID and click "Get Recommendations" to start.</p>
            </div>
          )}

          {/* Loading UI Layer */}
          {isGenerating && loadingStatus && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', padding: '3rem' }}>
              <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                <Loader2 size={48} className="spin" color="#3b82f6" style={{ margin: '0 auto 1.5rem auto' }} />
                <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '1.5rem', fontWeight: 600 }}>{loadingStatus.status}</h2>
                <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${(loadingStatus.step / loadingStatus.total) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }} />
                </div>
                <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Step {loadingStatus.step} of {loadingStatus.total}</p>
              </div>
            </div>
          )}

          {recommendations && !storyData && !isGenerating && (
            <div className="recommendations-view">
              <div className="recommendations-header">
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Recommended Charts for {models.length > 0 ? models.map(m => m.modelId).join(', ') : 'Selected Models'}</h2>
                  <p style={{ margin: 0, color: '#475569' }}>The LLM has analyzed your Datasphere model and suggested the following widgets. Select the ones you want to include in your final dashboard.</p>
                </div>
                <button
                  className="btn-generate btn-build"
                  style={{ padding: '12px 24px', fontSize: '1.05rem', backgroundColor: '#10b981' }}
                  onClick={handleBuildDashboard}
                  disabled={isGenerating || selectedIndices.size === 0}
                >
                  {isGenerating ? <Loader2 size={18} className="spin" /> : <LayoutDashboard size={18} />}
                  {isGenerating ? 'Building...' : `Build Dashboard (${selectedIndices.size})`}
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="model-input"
                  style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}
                  placeholder="Search available charts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="recommendation-cards">
                {/* Render Recommended Charts first (full width) */}
                {recommendations
                  .map((rec, idx) => ({ ...rec, originalIndex: idx }))
                  .filter(rec => rec.chart_type.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) && rec.is_recommended && !rec.is_custom)
                  .map((rec) => {
                    const idx = rec.originalIndex;
                    const isSelected = selectedIndices.has(idx);
                    const isApplicable = rec.is_applicable !== false;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        <div
                          className={`rec-card ${isSelected ? 'selected' : ''} ${!isApplicable ? 'disabled' : ''} llm-recommended`}
                          title={!isApplicable ? rec.rationale : ''}
                          onClick={() => {
                            if (!isApplicable) return;
                            const newSet = new Set(selectedIndices);
                            if (isSelected) newSet.delete(idx);
                            else newSet.add(idx);
                            setSelectedIndices(newSet);
                          }}
                          style={{ margin: 0 }}
                        >
                          <div className="rec-checkbox">
                            {isSelected ? <CheckSquare size={24} color={isApplicable ? "#3b82f6" : "#94a3b8"} /> : <Square size={24} color="#cbd5e1" />}
                          </div>
                          <div className="rec-content">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0 }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                              <span className="recommended-badge" title="LLM Top Choice">⭐ Recommended</span>
                            </div>
                            <p className="rec-rationale">{rec.rationale}</p>
                            <div className="rec-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isApplicable && <span className="confidence-badge">Confidence: {(rec.confidence * 100).toFixed(0)}%</span>}
                              {rec.is_copied && (
                                <button
                                  className="expand-builder-btn"
                                  style={{ color: '#ef4444' }}
                                  title="Delete Chart"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveRec(idx); }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <button
                                className="expand-builder-btn"
                                title="Duplicate Chart"
                                onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                className="expand-builder-btn"
                                title="Edit Bindings"
                                onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                              >
                                {expandedRec === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        {expandedRec === idx && (
                          <ChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                        )}
                      </div>
                    );
                  })}

                {/* Render Other Charts in a Grid (compact) */}
                {recommendations.some(r => !r.is_recommended && !r.is_custom) && (
                  <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#475569', fontSize: '1.1rem' }}>Other Available Charts</h3>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {recommendations
                    .map((rec, idx) => ({ ...rec, originalIndex: idx }))
                    .filter(rec => rec.chart_type.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) && !rec.is_recommended && !rec.is_custom)
                    .map((rec) => {
                      const idx = rec.originalIndex;
                      const isSelected = selectedIndices.has(idx);
                      const isApplicable = rec.is_applicable !== false;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div
                            className={`rec-card compact ${isSelected ? 'selected' : ''} ${!isApplicable ? 'disabled' : ''}`}
                            title={!isApplicable ? rec.rationale : ''}
                            onClick={() => {
                              if (!isApplicable) return;
                              const newSet = new Set(selectedIndices);
                              if (isSelected) newSet.delete(idx);
                              else newSet.add(idx);
                              setSelectedIndices(newSet);
                            }}
                            style={{ margin: 0 }} // Override default margin for grid layout
                          >
                            <div className="rec-checkbox">
                              {isSelected ? <CheckSquare size={24} color={isApplicable ? "#3b82f6" : "#94a3b8"} /> : <Square size={24} color="#cbd5e1" />}
                            </div>
                            <div className="rec-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem' }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {rec.is_copied && (
                                  <button
                                    className="expand-builder-btn"
                                    style={{ color: '#ef4444' }}
                                    title="Delete Chart"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveRec(idx); }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                <button
                                  className="expand-builder-btn"
                                  title="Duplicate Chart"
                                  onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  className="expand-builder-btn"
                                  title="Edit Bindings"
                                  onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                                >
                                  {expandedRec === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          {expandedRec === idx && (
                            <ChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Render Custom Added Charts */}
                {recommendations.some(r => r.is_custom) && (
                  <>
                    <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: '#0f172a', fontSize: '1.25rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      Custom Added Charts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recommendations
                        .map((rec, idx) => ({ ...rec, originalIndex: idx }))
                        .filter(rec => rec.chart_type.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) && rec.is_custom)
                        .map((rec) => {
                          const idx = rec.originalIndex;
                          const isSelected = selectedIndices.has(idx);
                          const isApplicable = rec.is_applicable !== false;
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div
                                className={`rec-card ${isSelected ? 'selected' : ''} ${!isApplicable ? 'disabled' : ''}`}
                                title={!isApplicable ? rec.rationale : ''}
                                onClick={() => {
                                  if (!isApplicable) return;
                                  const newSet = new Set(selectedIndices);
                                  if (isSelected) newSet.delete(idx);
                                  else newSet.add(idx);
                                  setSelectedIndices(newSet);
                                }}
                                style={{ margin: 0, backgroundColor: '#f8fafc', border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1' }}
                              >
                                <div className="rec-checkbox">
                                  {isSelected ? <CheckSquare size={24} color={isApplicable ? "#3b82f6" : "#94a3b8"} /> : <Square size={24} color="#cbd5e1" />}
                                </div>
                                <div className="rec-content">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0 }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#475569' }}>User Added</span>
                                  </div>
                                  <div className="rec-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                    {(rec.is_custom || rec.is_copied) && (
                                      <button
                                        className="expand-builder-btn"
                                        style={{ color: '#ef4444' }}
                                        title="Delete Chart"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveRec(idx); }}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                    <button
                                      className="expand-builder-btn"
                                      title="Duplicate Chart"
                                      onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button
                                      className="expand-builder-btn"
                                      title="Edit Bindings"
                                      onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                                    >
                                      {expandedRec === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {expandedRec === idx && (
                                <ChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn-secondary"
                    onClick={handleOpenCustomChartModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#475569', cursor: 'pointer' }}
                  >
                    <Plus size={18} /> Add Custom Chart
                  </button>
                </div>
              </div>
            </div>
          )}

          {storyData && (
            <div className={`dashboard-wrapper ${compactView ? 'compact-mode' : ''}`}>
              {storyData.pages && storyData.pages.length > 0 && (
                <div className="sac-tabs" style={{ display: 'flex', alignItems: 'center' }}>
                  {storyData.pages.map((page, idx) => (
                    <div
                      key={page.id}
                      className={`sac-tab ${currentPageIndex === idx ? 'sac-tab-active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onClick={() => setCurrentPageIndex(idx)}
                    >
                      <span>{(page.name || `Page_${idx + 1}`).replace(/_/g, ' ')}</span>
                      {editMode && storyData.pages.length > 1 && (
                        <button
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', borderRadius: '50%' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete ${(page.name || `Page_${idx + 1}`).replace(/_/g, ' ')}?`)) {
                              const newStory = { ...storyData };
                              newStory.pages = newStory.pages.filter((_, i) => i !== idx);
                              setStoryData(newStory);
                              setCurrentPageIndex(Math.max(0, currentPageIndex >= idx ? currentPageIndex - 1 : currentPageIndex));
                            }
                          }}
                          title="Delete page"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="sac-tab"
                    style={{ padding: '8px', minWidth: 'unset' }}
                    onClick={() => {
                      const newPage = { id: `page_${Date.now()}`, name: `Page_${storyData.pages.length + 1}`, widgets: [] };
                      const newStory = { ...storyData };
                      newStory.pages.push(newPage);
                      setStoryData(newStory);
                      setCurrentPageIndex(newStory.pages.length - 1);
                    }}
                    title="Add new dashboard page"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {storyData.kpis && storyData.kpis.length > 0 && currentPageIndex === 0 && (
                <div className="dashboard-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1.5rem 0', maxWidth: '1600px', margin: '0 auto' }}>
                  {storyData.kpis.map(kpi => (
                    <div key={kpi.id} className="widget-card" style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}>
                      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="widget-title-container" style={{ flex: 1, marginRight: '16px' }}>
                          {editMode && editingKpiId === kpi.id ? (
                            <input 
                              type="text" 
                              value={kpi.custom_title ?? generateChartTitle(kpi.bindings, kpi.type)}
                              onChange={(e) => handleUpdateKpi(kpi.id, { ...kpi, custom_title: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '1rem', fontWeight: 600, color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="widget-title" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                              <span>{kpi.custom_title || generateChartTitle(kpi.bindings, kpi.type)}</span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '2px' }}>
                                {kpi.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </h3>
                          )}
                        </div>
                        {editMode && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-toggle"
                              style={{ padding: '4px 8px', minWidth: 'unset', border: editingKpiId === kpi.id ? '1px solid #3b82f6' : '1px solid transparent' }}
                              onClick={() => setEditingKpiId(editingKpiId === kpi.id ? null : kpi.id)}
                              title="Edit KPI Bindings"
                            >
                              <Pencil size={14} color={editingKpiId === kpi.id ? "#3b82f6" : "#64748b"} />
                            </button>
                            <button
                              className="btn-toggle"
                              style={{ padding: '4px 8px', minWidth: 'unset' }}
                              onClick={() => {
                                if (window.confirm("Are you sure you want to remove this KPI?")) {
                                  handleDeleteKpi(kpi.id);
                                }
                              }}
                              title="Remove KPI"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        )}
                      </div>

                      {editMode && editingKpiId === kpi.id && (
                        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                          <ChartBuilderPane
                            item={kpi}
                            isWidget={true}
                            availableMetadata={availableMetadata}
                            onChange={(updatedKpi) => handleUpdateKpi(kpi.id, updatedKpi)}
                          />
                        </div>
                      )}

                      <div className="widget-chart-container" style={{ height: '140px' }}>
                        <WidgetRenderer widget={kpi} mockDataset={mockDataset} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DashboardGrid
                widgets={widgets}
                mockDataset={mockDataset}
                availableMetadata={availableMetadata}
                onUpdateWidget={(wId, updatedW) => handleUpdateWidget(currentPageIndex, wId, updatedW)}
                onDeleteWidget={(wId) => handleDeleteWidget(currentPageIndex, wId)}
                onAddWidget={() => handleAddWidget(currentPageIndex)}
                editMode={editMode}
              />
            </div>
          )}
        </div>

        {/* Right Pane: Explicit SAC Instructions */}
        {storyData && showSidebar && <BlueprintSidebar widgets={widgets} kpis={currentPageIndex === 0 ? (storyData.kpis || []) : []} />}
      </main>

      {/* Modal for Adding Custom Charts */}
      {showCustomChartModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.5rem' }}>Select Custom Charts to Add</h2>

            <input
              type="text"
              placeholder="Search available charts..."
              value={modalSearchTerm}
              onChange={e => setModalSearchTerm(e.target.value)}
              style={{ padding: '12px', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
            />

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CHART_TYPES.filter(type => type.replace(/_/g, ' ').toLowerCase().includes(modalSearchTerm.toLowerCase())).map(type => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{type.replace(/_/g, ' ').toUpperCase()}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                      onClick={() => setCustomChartSelections(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }))}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                    >-</button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{customChartSelections[type] || 0}</span>
                    <button
                      onClick={() => setCustomChartSelections(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }))}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setShowCustomChartModal(false)}
                style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomCharts}
                style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> Add Selected Charts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
