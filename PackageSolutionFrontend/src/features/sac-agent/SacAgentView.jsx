import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, LayoutTemplate, LayoutDashboard, Download, CheckSquare, Square, ChevronDown, ChevronUp, Copy, Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Github } from 'lucide-react';

import { recommendCharts, generateStory } from './services/sacAgentApi';
import { generateChartTitle } from './utils/sacChartUtils';

import SacDashboardGrid from './components/SacDashboardGrid';
import SacBlueprintSidebar from './components/SacBlueprintSidebar';
import SacChartBuilderPane from './components/SacChartBuilderPane';
import SacWidgetRenderer from './components/SacWidgetRenderer';

import './styles/sac-agent.css';

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
      colorPalette: ['#1B90FF', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16']
    }
  }));
};

const SacAgentView = ({ collapseSidebar }) => {
  const [models, setModels] = useState([{ spaceId: 'RADH_S3P', modelId: 'PURCHASE_KPI_1347' }]);
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const blueprintRef = useRef(null);

  useEffect(() => {
    if (showCustomChartModal) {
      collapseSidebar?.();
    }
  }, [showCustomChartModal, collapseSidebar]);

  const handleGetRecommendations = async () => {
    const validModels = models.filter(m => m.spaceId && m.modelId);
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
      const response = await recommendCharts(models);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let recsReceived = false;

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
              setLoadingStatus({ status: data.status, step: data.step, total: data.total });
            } else if (data.result) {
              const resData = data.result;
              if (resData.recommendations) {
                recsReceived = true;
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

      if (!recsReceived) {
        throw new Error("Stream terminated unexpectedly without generating recommendations.");
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
            newStoryData.kpis.unshift(item);
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
      const res = await generateStory(
        models[0]?.spaceId || 'default-space',
        models[0]?.modelId || 'default-model',
        selectedRecs,
        availableMetadata
      );
      if (res.status.includes('success') || res.status.includes('partial_success')) {
        const sortedStory = { ...res.story };
        if (sortedStory.pages) {
          sortedStory.pages.forEach(page => {
            if (page.widgets) {
              page.widgets.sort((a, b) => {
                if (a.type === 'table' && b.type !== 'table') return -1;
                if (b.type === 'table' && a.type !== 'table') return 1;
                return 0;
              });
            }
          });
        }
        setStoryData(sortedStory);
        setRecommendations(null); 
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
    setMockDataset(null);
    setAvailableMetadata({ dimensions: [], measures: [] });
    setCompactView(true);
    setShowSidebar(false);
  };

  const handleDownload = async (format) => {
    if (!storyData) return;

    const unconstrainLayout = () => {
      const appNode = document.querySelector('.sac-agent-root');
      const dashNode = document.querySelector('.dashboard-pane');
      const wrapperNode = document.querySelector('.dashboard-wrapper');

      if (!appNode || !dashNode) return null;

      const origAppHeight = appNode.style.height;
      const origDashOverflow = dashNode.style.overflow;
      const hadCompactMode = wrapperNode && wrapperNode.classList.contains('compact-mode');

      appNode.style.height = 'auto';
      dashNode.style.overflow = 'visible';
      if (hadCompactMode) wrapperNode.classList.remove('compact-mode');

      return () => {
        appNode.style.height = origAppHeight;
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
        const targetNode = document.querySelector('.dashboard-wrapper');
        if (!targetNode) return;

        const restoreLayout = unconstrainLayout();
        await new Promise(resolve => setTimeout(resolve, 300)); 

        const canvas = await html2canvas(targetNode, {
          scale: 2,
          useCORS: true,
          scrollY: 0,
        });

        const imgData = canvas.toDataURL("image/png");
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `${models[0]?.modelId || 'multi_model'}_dashboard.png`;
        a.click();
      } catch (err) {
        console.error(`Failed to export PNG:`, err);
        alert(`Failed to export PNG.`);
      } finally {
        if (restoreLayout) restoreLayout();
        setEditMode(wasEditing);
        window.isExporting = false;
      }
    } else if (format === 'pdf' || format === 'ppt') {
      const wasEditing = editMode;
      setEditMode(false);
      window.isExporting = true;
      try {
        const html2canvas = (await import('html2canvas')).default;
        
        let pdf = null;
        let ppt = null;
        let isFirstPage = true;
        let chartsExported = 0;

        if (format === 'pdf') {
          const { jsPDF } = await import('jspdf');
          pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        } else {
          if (!window.PptxGenJS) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          ppt = new window.PptxGenJS();
          ppt.layout = 'LAYOUT_16x9';
        }

        const originalPage = currentPageIndex;

        for (let pageIdx = 0; pageIdx < storyData.pages.length; pageIdx++) {
          setCurrentPageIndex(pageIdx);
          await new Promise(resolve => setTimeout(resolve, 800)); // allow rendering

          const currentWidgets = [
            ...(pageIdx === 0 ? (storyData.kpis || []) : []),
            ...(storyData.pages[pageIdx].widgets || [])
          ];

          for (const widget of currentWidgets) {
            const targetNode = document.getElementById(`widget-card-${widget.id}`);
            if (!targetNode) continue;

            const restoreLayout = unconstrainLayout();
            // Optional: Give it a tick to reflow
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(targetNode, {
              scale: 2,
              useCORS: true,
              scrollY: 0,
              backgroundColor: '#ffffff' // ensure white background for PDF
            });

            if (restoreLayout) restoreLayout();

            const chartImgData = canvas.toDataURL("image/jpeg", 0.95);

            // Helper to format Measures/Dimensions into pills
            const formatPills = (items, colorClass) => {
              if (!items || !items.length) return `<span style="color: #94a3b8; font-size: 13px;">None</span>`;
              const bgColor = colorClass === 'blue' ? '#eff6ff' : '#f0fdf4';
              const txtColor = colorClass === 'blue' ? '#2563eb' : '#16a34a';
              return items.map(item => `<span style="background: ${bgColor}; color: ${txtColor}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap;">${item.id || item}</span>`).join('');
            };

            // Build off-screen container for side-by-side HTML rendering
            const offscreenContainer = document.createElement('div');
            offscreenContainer.style.position = 'absolute';
            offscreenContainer.style.left = '-9999px';
            offscreenContainer.style.top = '0';
            offscreenContainer.style.width = '1200px';
            offscreenContainer.style.backgroundColor = '#ffffff';
            offscreenContainer.style.padding = '40px';
            offscreenContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';

            // Determine layout based on widget type
            const isTable = widget.type === 'table';
            const flexDir = isTable ? 'column' : 'row';
            
            const chartDivStyle = isTable 
              ? `width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; box-sizing: border-box;`
              : `flex: 1.2; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 400px; box-sizing: border-box;`;

            const blueprintDivStyle = isTable
              ? `width: 100%; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box;`
              : `flex: 1; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box;`;

            offscreenContainer.innerHTML = `
              <div style="display: flex; flex-direction: column; min-height: 100%;">
                
                <!-- HEADER -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 40px;">
                   <div style="display: flex; align-items: center; gap: 16px;">
                      <img src="/Yash_Logo.png" style="height: 48px; object-fit: contain;" />
                   </div>
                   <div style="text-align: right; font-family: 'Inter', sans-serif;">
                      <h2 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">YASH Technologies</h2>
                      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">Business Metrics Dashboard Report</p>
                   </div>
                </div>

                <!-- MAIN CONTENT -->
                <div style="display: flex; flex-direction: ${flexDir}; gap: 40px; align-items: flex-start; width: 100%; flex: 1;">
                   <div style="${chartDivStyle}">
                      <img src="${chartImgData}" style="max-width: 100%; height: auto; border-radius: 8px; ${isTable ? 'width: 100%;' : ''}" />
                   </div>
                   <div style="${blueprintDivStyle}">
                      <h1 style="margin: 0; font-size: 26px; color: #1e293b; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
                        ${widget.custom_title || widget.type.replace(/_/g, ' ').toUpperCase()}
                      </h1>
                      
                      <div style="display: flex; flex-direction: column; gap: 16px;">
                         <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px;">
                            <span style="color: #64748b; font-weight: 600; font-size: 14px;">Widget Type</span>
                            <span style="color: #0f172a; font-weight: 700; font-size: 14px;">${widget.type.replace(/_/g, ' ').toUpperCase()}</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px;">
                            <span style="color: #64748b; font-weight: 600; font-size: 14px;">Measures</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                               ${formatPills(widget.bindings?.measures, 'blue')}
                            </div>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px;">
                            <span style="color: #64748b; font-weight: 600; font-size: 14px;">Dimensions</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                               ${formatPills(widget.bindings?.dimensions, 'green')}
                            </div>
                         </div>

                         <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px;">
                            <span style="color: #64748b; font-weight: 600; font-size: 14px;">Source Model</span>
                            <span style="color: #0f172a; font-weight: 700; font-size: 14px;">${widget.source_model || 'Primary'}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <!-- FOOTER -->
                <div style="margin-top: 40px; padding-top: 24px;">
                   <div style="height: 12px; width: 100%; background: linear-gradient(90deg, #0070f2 0%, #004d99 100%); border-radius: 6px;"></div>
                   <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                      <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">CONFIDENTIAL & PROPRIETARY</span>
                      <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">GENERATED VIA YASH JR-SAC-AGENT</span>
                   </div>
                </div>
              </div>
            `;

            document.body.appendChild(offscreenContainer);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Stage 2: Capture the beautiful HTML layout
            const fullCanvas = await html2canvas(offscreenContainer, {
               scale: 2,
               backgroundColor: '#ffffff'
            });

            document.body.removeChild(offscreenContainer);
            const finalImgData = fullCanvas.toDataURL("image/jpeg", 0.95);

            if (format === 'pdf') {
              const pdfWidth = 841.89;
              const pdfHeight = 595.28;

              if (!isFirstPage) pdf.addPage();
              isFirstPage = false;

              const margin = 40;
              const maxImgWidth = pdfWidth - margin * 2;
              const maxImgHeight = pdfHeight - margin * 2;
              
              const imgRatio = fullCanvas.height / fullCanvas.width;
              let finalWidth = maxImgWidth;
              let finalHeight = finalWidth * imgRatio;
              
              if (finalHeight > maxImgHeight) {
                 finalHeight = maxImgHeight;
                 finalWidth = finalHeight / imgRatio;
              }
              
              const yOffset = margin + (maxImgHeight - finalHeight) / 2;
              const xOffset = margin + (maxImgWidth - finalWidth) / 2;
              
              pdf.addImage(finalImgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
            } else if (format === 'ppt') {
              let slide = ppt.addSlide();
              
              // Widescreen PPT bounds (10 x 5.625 inches)
              const maxWidth = 9.5;
              const maxHeight = 5.2;
              
              const imgRatio = fullCanvas.height / fullCanvas.width;
              let finalWidth = maxWidth;
              let finalHeight = finalWidth * imgRatio;
              
              if (finalHeight > maxHeight) {
                 finalHeight = maxHeight;
                 finalWidth = finalHeight / imgRatio;
              }
              
              const xOffset = (10 - finalWidth) / 2;
              const yOffset = (5.625 - finalHeight) / 2;

              slide.addImage({ data: finalImgData, x: xOffset, y: yOffset, w: finalWidth, h: finalHeight });
            }
            chartsExported++;
          }
        }

        if (format === 'pdf') {
          if (chartsExported > 0) pdf.save(`${models[0]?.modelId || 'multi_model'}_dashboard.pdf`);
          else alert('No charts found to export.');
        } else if (format === 'ppt') {
          if (chartsExported > 0) ppt.writeFile({ fileName: `${models[0]?.modelId || 'multi_model'}_dashboard.pptx` });
          else alert('No charts found to export.');
        }
        
        setCurrentPageIndex(originalPage);
      } catch (err) {
        console.error(`Failed to export document:`, err);
        alert(`Failed to export document.`);
      } finally {
        setEditMode(wasEditing);
        window.isExporting = false;
      }
    }
  };

  const widgets = storyData?.pages?.[currentPageIndex]?.widgets || [];

  return (
    <div className={`sac-agent-root ${showSidebar ? 'blueprint-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, paddingBottom: 80 }}>
      
      {/* Spaces Side Panel Drawer */}
      {showSpacesPanel && (
        <div className="spaces-panel-overlay" onClick={() => setShowSpacesPanel(false)}>
          <div className="spaces-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Configure Models</h2>
              <button onClick={() => setShowSpacesPanel(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: 4 }}>
              {models.map((m, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-glass)', position: 'relative', background: 'var(--bg-strip)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Model #{idx + 1}</span>
                    {models.length > 1 && (
                      <button
                        onClick={() => setModels(models.filter((_, i) => i !== idx))}
                        style={{ cursor: 'pointer', color: 'var(--ds-danger)', padding: '4px' }}
                        title="Remove Model"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Space ID</label>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Analytical Model ID</label>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', border: '1px dashed var(--border-glass)', borderRadius: 'var(--r-md)', backgroundColor: 'transparent', color: 'var(--blue-6)', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.82rem' }}
              >
                <Plus size={16} /> Add Another Model
              </button>
            </div>

            <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-glass)', marginTop: 'auto' }}>
              <button
                className="btn-generate"
                style={{ width: '100%', height: '42px' }}
                onClick={handleGetRecommendations}
                disabled={isGenerating || models.filter(m => m.spaceId && m.modelId).length === 0}
              >
                {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Analyzing...' : 'Analyze Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Config Panel (Rendered at top of Main Pane when no dashboard exists) */}
      {!storyData && !recommendations && !isGenerating && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 1.5rem', flex: 1 }}>
          <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ textAlign: 'center' }}>
              <LayoutTemplate size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--blue-6)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Configure Model Metadata</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                Analyze Datasphere Analytical Models using agentic AI to auto-generate beautiful SAP Analytics Cloud dashboard components.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {models.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', flexDirection: 'column', padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--r-md)', background: 'var(--bg-strip)', position: 'relative' }}>
                  {models.length > 1 && (
                    <button
                      onClick={() => setModels(models.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', right: '8px', top: '8px', cursor: 'pointer', color: 'var(--ds-danger)' }}
                      title="Remove Model"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Space ID</span>
                      <input
                        type="text"
                        className="model-input"
                        placeholder="e.g. RADH_S3P"
                        value={m.spaceId}
                        onChange={(e) => {
                          const newModels = [...models];
                          newModels[idx].spaceId = e.target.value;
                          setModels(newModels);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Analytical Model ID</span>
                      <input
                        type="text"
                        className="model-input"
                        placeholder="e.g. ZFI_AM_DSO_KPI11"
                        value={m.modelId}
                        onChange={(e) => {
                          const newModels = [...models];
                          newModels[idx].modelId = e.target.value;
                          setModels(newModels);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setModels([...models, { spaceId: '', modelId: '' }])}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px dashed var(--border-glass)', borderRadius: 'var(--r-md)', backgroundColor: 'transparent', color: 'var(--blue-6)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <Plus size={14} /> Add Another Model
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
              <button
                className="btn-toggle"
                onClick={handleShowcase}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <LayoutDashboard size={16} /> Showcase
              </button>
              <button
                className="btn-generate"
                onClick={handleGetRecommendations}
                style={{ flex: 1.5 }}
                disabled={isGenerating || models.filter(m => m.spaceId && m.modelId).length === 0}
              >
                <Sparkles size={16} /> Analyze Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane: Visual Dashboard / Recommendations grid */}
        <div className="dashboard-pane" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Conditional Toolbar */}
          {(storyData || recommendations) && (
            <div className="dashboard-toolbar">
              <div className="toolbar-left">
                <button
                  className="btn-toggle"
                  onClick={() => {
                    if (storyData) {
                      setStoryData(null);
                      setMockDataset(null);
                      setAvailableMetadata({ dimensions: [], measures: [] });
                    } else {
                      setRecommendations(null);
                      setShowSpacesPanel(false);
                    }
                  }}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                {!storyData && (
                  <button
                    className="btn-toggle"
                    onClick={() => setShowSpacesPanel(true)}
                  >
                    <LayoutTemplate size={16} />
                    Config Models ({models.filter(m => m.spaceId && m.modelId).length})
                  </button>
                )}
              </div>

              <div className="toolbar-right">
                {storyData && (
                  <>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={editMode}
                        onChange={() => {
                          setEditMode(!editMode);
                          if (editMode) {
                            setEditingKpiId(null);
                          }
                        }}
                      />
                      <span className="slider round"></span>
                      <span className="switch-label">Edit Mode</span>
                    </label>
                    <label className="switch-toggle" style={{ marginLeft: 8 }}>
                      <input
                        type="checkbox"
                        checked={compactView}
                        onChange={() => setCompactView(!compactView)}
                      />
                      <span className="slider round"></span>
                      <span className="switch-label">Zoom Out</span>
                    </label>

                    {/* Hide Blueprint toggle in Showcase mode */}
                    {!storyData.pages?.[0]?.widgets?.[0]?.id?.includes('showcase') && (
                      <button
                        className="btn-toggle"
                        onClick={() => {
                          setShowSidebar(!showSidebar);
                          if (!showSidebar) {
                            setTimeout(() => {
                              blueprintRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                          }
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        <LayoutTemplate size={16} />
                        {showSidebar ? 'Hide Blueprint' : 'Show Blueprint'}
                      </button>
                    )}

                    {/* Hide Export dropdown in Showcase mode */}
                    {!storyData.pages?.[0]?.widgets?.[0]?.id?.includes('showcase') && (
                      <div 
                        className="export-dropdown-wrapper" 
                        style={{ position: 'relative', marginLeft: 8 }}
                        onMouseLeave={() => setShowExportMenu(false)}
                      >
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            color: '#ffffff', 
                            backgroundColor: 'var(--blue-6)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0, 112, 242, 0.2)',
                            transition: 'all 0.2s ease',
                            fontSize: '0.9rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--blue-7)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--blue-6)'}
                        >
                          <Download size={16} />
                          Export
                          <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                        </button>
                        
                        {showExportMenu && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            minWidth: '240px',
                            zIndex: 1000,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            <button className="export-menu-item" onClick={() => { handleDownload('pdf'); setShowExportMenu(false); }}>
                              Export as PDF Document
                            </button>
                            <button className="export-menu-item" onClick={() => { handleDownload('png'); setShowExportMenu(false); }}>
                              Export as High-Res PNG
                            </button>
                            <button className="export-menu-item" onClick={() => { handleDownload('ppt'); setShowExportMenu(false); }}>
                              Export as PowerPoint (PPT)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--ds-danger-bg)',
              color: 'var(--ds-danger)',
              border: '1px solid var(--ds-danger-light)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{error}</span>
              <button style={{ color: 'inherit', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Loading UI Layer */}
          {isGenerating && loadingStatus && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem 0' }}>
              <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '520px', textAlign: 'center', boxShadow: 'var(--shadow-modal)' }}>
                <Loader2 size={36} className="spin" color="var(--blue-6)" style={{ margin: '0 auto 1.25rem auto' }} />
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', fontWeight: 700 }}>{loadingStatus.status}</h3>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(loadingStatus.step / loadingStatus.total) * 100}%`, height: '100%', background: 'var(--blue-6)', transition: 'width 0.3s ease' }} />
                </div>
                <p style={{ marginTop: '0.88rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Step {loadingStatus.step} of {loadingStatus.total}</p>
              </div>
            </div>
          )}

          {/* Empty Recommendations State */}
          {recommendations && recommendations.length === 0 && !storyData && !isGenerating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem 0' }}>
              <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '520px', textAlign: 'center', boxShadow: 'var(--shadow-modal)' }}>
                <LayoutTemplate size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.25rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 700 }}>No Recommendations Found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  The AI agent analyzed your models but could not find any suitable charts. This might happen if the models lack numeric measures or recognizable dimensions.
                </p>
                <button
                  className="btn-generate"
                  onClick={() => { setRecommendations(null); setShowSpacesPanel(true); }}
                >
                  Adjust Models
                </button>
              </div>
            </div>
          )}

          {/* Recommendations View */}
          {recommendations && recommendations.length > 0 && !storyData && !isGenerating && (
            <div className="recommendations-view">
              <div className="recommendations-header">
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 6px 0' }}>Recommended Charts for {models.length > 0 ? models.map(m => m.modelId).join(', ') : 'Selected Models'}</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    The LLM has analyzed your Datasphere model and suggested the following widgets. Select the ones you want to include in your final dashboard.
                  </p>
                </div>
                <button
                  className="btn-generate"
                  style={{ padding: '10px 20px', fontSize: '0.88rem' }}
                  onClick={handleBuildDashboard}
                  disabled={isGenerating || selectedIndices.size === 0}
                >
                  <LayoutDashboard size={15} />
                  Build Dashboard ({selectedIndices.size})
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="model-input"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }}
                  placeholder="Search available charts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="recommendation-cards">
                {/* 1. Recommended top choices (full width) */}
                {recommendations
                  .map((rec, idx) => ({ ...rec, originalIndex: idx }))
                  .filter(rec => rec.chart_type.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) && rec.is_recommended && !rec.is_custom)
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
                        >
                          <div className="rec-checkbox">
                            {isSelected ? <CheckSquare size={20} color={isApplicable ? "var(--blue-6)" : "var(--text-muted)"} /> : <Square size={20} color="var(--border-glass)" />}
                          </div>
                          <div className="rec-content">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0 }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                              <span className="recommended-badge">⭐ Recommended</span>
                            </div>
                            <p className="rec-rationale">{rec.rationale}</p>
                            <div className="rec-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {isApplicable && <span className="confidence-badge">Confidence: {(rec.confidence * 100).toFixed(0)}%</span>}
                              {rec.is_copied && (
                                <button
                                  className="expand-builder-btn"
                                  style={{ color: 'var(--ds-danger)' }}
                                  title="Delete Chart"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveRec(idx); }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button
                                className="expand-builder-btn"
                                title="Duplicate Chart"
                                onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                className="expand-builder-btn"
                                title="Edit Bindings"
                                onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                              >
                                {expandedRec === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        {expandedRec === idx && (
                          <SacChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                        )}
                      </div>
                    );
                  })}

                {/* 2. Other available charts grid */}
                {recommendations.some(r => !r.is_recommended && !r.is_custom) && (
                  <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700 }}>Other Available Charts</h3>
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
                          >
                            <div className="rec-checkbox">
                              {isSelected ? <CheckSquare size={18} color={isApplicable ? "var(--blue-6)" : "var(--text-muted)"} /> : <Square size={18} color="var(--border-glass)" />}
                            </div>
                            <div className="rec-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <h3 style={{ margin: 0, fontSize: '0.85rem' }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  className="expand-builder-btn"
                                  title="Duplicate Chart"
                                  onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  className="expand-builder-btn"
                                  title="Edit Bindings"
                                  onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                                >
                                  {expandedRec === idx ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          {expandedRec === idx && (
                            <SacChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* 3. User custom charts */}
                {recommendations.some(r => r.is_custom) && (
                  <>
                    <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                      Custom Added Charts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {recommendations
                        .map((rec, idx) => ({ ...rec, originalIndex: idx }))
                        .filter(rec => rec.chart_type.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) && rec.is_custom)
                        .map((rec) => {
                          const idx = rec.originalIndex;
                          const isSelected = selectedIndices.has(idx);
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div
                                className={`rec-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  const newSet = new Set(selectedIndices);
                                  if (isSelected) newSet.delete(idx);
                                  else newSet.add(idx);
                                  setSelectedIndices(newSet);
                                }}
                                style={{ background: 'var(--bg-strip)' }}
                              >
                                <div className="rec-checkbox">
                                  {isSelected ? <CheckSquare size={20} color="var(--blue-6)" /> : <Square size={20} color="var(--border-glass)" />}
                                </div>
                                <div className="rec-content">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0 }}>{rec.chart_type.replace(/_/g, ' ').toUpperCase()}</h3>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-badge)', color: 'var(--text-badge)' }}>User Custom</span>
                                  </div>
                                  <div className="rec-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                      className="expand-builder-btn"
                                      style={{ color: 'var(--ds-danger)' }}
                                      title="Delete Chart"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveRec(idx); }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    <button
                                      className="expand-builder-btn"
                                      title="Duplicate Chart"
                                      onClick={(e) => { e.stopPropagation(); handleDuplicateRec(idx); }}
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <button
                                      className="expand-builder-btn"
                                      title="Edit Bindings"
                                      onClick={(e) => { e.stopPropagation(); setExpandedRec(expandedRec === idx ? null : idx); }}
                                    >
                                      {expandedRec === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {expandedRec === idx && (
                                <SacChartBuilderPane item={rec} isWidget={false} availableMetadata={availableMetadata} onChange={(newRec) => handleUpdateRec(idx, newRec)} />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn-toggle"
                    onClick={() => handleOpenCustomChartModal()}
                    style={{ borderStyle: 'dashed' }}
                  >
                    <Plus size={16} /> Add Custom Chart
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Built Dashboard View */}
          {storyData && (
            <div className={`dashboard-wrapper ${compactView ? 'compact-mode' : ''}`}>
              
              {/* Dynamic Pages Tabs */}
              {storyData.pages && storyData.pages.length > 0 && (
                <div className="sac-tabs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    className="sac-tab"
                    style={{ padding: '8px', minWidth: 'unset', opacity: currentPageIndex === 0 ? 0.5 : 1, cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer' }}
                    onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                    disabled={currentPageIndex === 0}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {storyData.pages.map((page, idx) => (
                    <div
                      key={page.id}
                      className={`sac-tab ${currentPageIndex === idx ? 'sac-tab-active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => setCurrentPageIndex(idx)}
                    >
                      <span>{(page.name || `Page_${idx + 1}`).replace(/_/g, ' ')}</span>
                      
                      {/* Delete Page button: visible on the active tab if there are multiple pages */}
                      {currentPageIndex === idx && storyData.pages.length > 1 && (
                        <button
                          style={{ cursor: 'pointer', color: 'var(--ds-danger)', display: 'flex', alignItems: 'center', borderRadius: '50%', background: 'none', border: 'none', padding: 2 }}
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
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="sac-tab"
                    style={{ padding: '8px', minWidth: 'unset', opacity: currentPageIndex === storyData.pages.length - 1 ? 0.5 : 1, cursor: currentPageIndex === storyData.pages.length - 1 ? 'not-allowed' : 'pointer' }}
                    onClick={() => setCurrentPageIndex(Math.min(storyData.pages.length - 1, currentPageIndex + 1))}
                    disabled={currentPageIndex === storyData.pages.length - 1}
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="sac-tab"
                    style={{ padding: '8px', minWidth: 'unset', marginLeft: '4px' }}
                    onClick={() => {
                      const newPage = { id: `page_${Date.now()}`, name: `Page_${storyData.pages.length + 1}`, widgets: [] };
                      const newStory = { ...storyData };
                      newStory.pages.push(newPage);
                      setStoryData(newStory);
                      setCurrentPageIndex(newStory.pages.length - 1);
                    }}
                    title="Add new dashboard page"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}

              {/* KPI metrics row (on page 0) */}
              {storyData.kpis && storyData.kpis.length > 0 && currentPageIndex === 0 && (
                <div className="dashboard-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1.5rem 0', maxWidth: '1600px', margin: '0 auto' }}>
                  {storyData.kpis.map(kpi => (
                    <div key={kpi.id} id={`widget-card-${kpi.id}`} className="widget-card" style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}>
                      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="widget-title-container" style={{ flex: 1, marginRight: '16px' }}>
                          {editMode && editingKpiId === kpi.id ? (
                            <input 
                              type="text" 
                              value={kpi.custom_title ?? generateChartTitle(kpi.bindings, kpi.type)}
                              onChange={(e) => handleUpdateKpi(kpi.id, { ...kpi, custom_title: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
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
                              <span>{kpi.custom_title || generateChartTitle(kpi.bindings, kpi.type)}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>
                                {kpi.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </h3>
                          )}
                        </div>
                        {editMode && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="expand-builder-btn"
                              style={{ padding: '4px', border: editingKpiId === kpi.id ? '1px solid var(--border-focus)' : '1px solid transparent' }}
                              onClick={() => setEditingKpiId(editingKpiId === kpi.id ? null : kpi.id)}
                              title="Edit KPI Bindings"
                            >
                              <Pencil size={13} color={editingKpiId === kpi.id ? "var(--blue-6)" : "var(--text-muted)"} />
                            </button>
                            <button
                              className="expand-builder-btn"
                              style={{ padding: '4px' }}
                              onClick={() => {
                                  if (window.confirm("Are you sure you want to remove this KPI?")) {
                                    handleDeleteKpi(kpi.id);
                                  }
                              }}
                              title="Remove KPI"
                            >
                              <Trash2 size={13} color="var(--ds-danger)" />
                            </button>
                          </div>
                        )}
                      </div>

                      {editMode && editingKpiId === kpi.id && (
                        <div style={{ marginBottom: '12px' }}>
                          <SacChartBuilderPane
                            item={kpi}
                            isWidget={true}
                            availableMetadata={availableMetadata}
                            onChange={(updatedKpi) => handleUpdateKpi(kpi.id, updatedKpi)}
                          />
                        </div>
                      )}

                      <div className="widget-chart-container" style={{ height: '140px' }}>
                        <SacWidgetRenderer widget={kpi} mockDataset={mockDataset} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Graphical widgets grid */}
              <SacDashboardGrid
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

        {/* Right Pane: Explicit SAC Instructions Blueprint Panel */}
        {storyData && showSidebar && (
          <div ref={blueprintRef} style={{ display: 'flex' }}>
            <SacBlueprintSidebar 
              widgets={widgets} 
              kpis={currentPageIndex === 0 ? (storyData.kpis || []) : []} 
              onClose={() => setShowSidebar(false)}
            />
          </div>
        )}
      </main>

      {/* Modal for Adding Custom Charts */}
      {showCustomChartModal && (
        <div className="modal-overlay" onClick={() => setShowCustomChartModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>Select Custom Charts to Add</h2>

            <input
              type="text"
              placeholder="Search available charts..."
              value={modalSearchTerm}
              onChange={e => setModalSearchTerm(e.target.value)}
              className="model-input"
              style={{ marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}
            />

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CHART_TYPES.filter(type => type.replace(/_/g, ' ').toLowerCase().includes(modalSearchTerm.toLowerCase())).map(type => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-strip)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{type.replace(/_/g, ' ').toUpperCase()}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setCustomChartSelections(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 'bold' }}
                    >-</button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.88rem' }}>{customChartSelections[type] || 0}</span>
                    <button
                      onClick={() => setCustomChartSelections(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 'bold' }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setShowCustomChartModal(false)}
                className="btn-toggle"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomCharts}
                className="btn-generate"
              >
                <Plus size={16} /> Add Selected Charts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SacAgentView;
