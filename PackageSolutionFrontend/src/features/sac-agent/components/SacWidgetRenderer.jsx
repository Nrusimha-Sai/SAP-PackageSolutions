import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const generateMockData = (dimensions, measures, type) => {
  if (dimensions.length === 0) dimensions = ['Category'];
  if (measures.length === 0) measures = ['Value'];

  const t = type.toLowerCase();
  const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  // Specialty Mock Data
  if (t === 'sankey') {
    const d1 = dimensions[0] || 'Source';
    const d2 = dimensions[1] || 'Target';
    return [
      { source: `${d1} A`, target: `${d2} 1`, value: 100 },
      { source: `${d1} A`, target: `${d2} 2`, value: 40 },
      { source: `${d1} B`, target: `${d2} 1`, value: 80 },
      { source: `${d1} B`, target: `${d2} 3`, value: 50 },
      { source: `${d2} 1`, target: 'Outcome X', value: 60 },
      { source: `${d2} 1`, target: 'Outcome Y', value: 40 },
    ];
  }
  if (t === 'heat_map') {
    const d1 = dimensions[0] || 'X';
    const d2 = dimensions[1] || 'Y';
    const xVals = [`${d1} 1`, `${d1} 2`, `${d1} 3`, `${d1} 4`, `${d1} 5`, `${d1} 6`];
    const yVals = [`${d2} A`, `${d2} B`, `${d2} C`, `${d2} D`, `${d2} E`, `${d2} F`, `${d2} G`];
    const data = [];
    for (let i = 0; i < xVals.length; i++) {
      for (let j = 0; j < yVals.length; j++) {
        data.push([i, j, Math.round(Math.random() * 10)]);
      }
    }
    return { data, x: xVals, y: yVals };
  }
  if (t === 'box_plot') {
    return [
      [850, 740, 900, 1070, 930, 850, 950, 980, 980, 880, 1000, 980],
      [960, 940, 960, 940, 880, 800, 850, 880, 900, 840, 830, 790],
      [890, 810, 810, 820, 800, 770, 760, 740, 750, 760, 910, 920],
      [890, 840, 780, 810, 760, 810, 790, 810, 820, 850, 870, 870]
    ];
  }
  if (t === 'tree_map' || t === 'marimekko') {
    const d1 = dimensions[0] || 'Category';
    const d2 = dimensions[1] || d1;
    return [
      { name: `${d1} A`, value: 40, children: [{ name: `${d2} X`, value: 20 }, { name: `${d2} Y`, value: 20 }] },
      { name: `${d1} B`, value: 30, children: [{ name: `${d2} X`, value: 15 }, { name: `${d2} Y`, value: 15 }] },
      { name: `${d1} C`, value: 20 },
    ];
  }
  if (t === 'waterfall') {
    const d1 = dimensions[0] || 'Step';
    return [
      { name: 'Start', value: 900 },
      { name: `${d1} 1`, value: 345 },
      { name: `${d1} 2`, value: -393 },
      { name: `${d1} 3`, value: 108 },
      { name: `${d1} 4`, value: -154 },
      { name: `${d1} 5`, value: 135 },
      { name: 'End', value: 941 }
    ];
  }

  // Standard Mock Data
  const mockPool = {
    CUSTOMER: ['Domestic US Customer 1', 'Domestic Customer US 3', 'Global Partner A', 'Enterprise Corp', 'SMB LLC', 'Retail Direct'],
    PRODUCT: ['TG11', 'TG12', 'TG13', 'TG14', 'TG15', 'TG16'],
    SALESORDER: ['0000000011', '0000000009', '0000000010', '0000000068', '0200000000', '0000000012'],
    SALESORDERITEM: ['000010', '000020', '000030', '000040', '000050', '000060']
  };

  const data = [];
  categories.forEach((cat, idx) => {
    const row = {};
    dimensions.forEach((d, dIdx) => {
      if (!d || typeof d !== 'string') return;
      const dUpper = d.toUpperCase();
      if (dIdx === 0 && !mockPool[dUpper]) {
        row[d] = `${dUpper} ${idx + 1}`;
      } else if (mockPool[dUpper]) {
        row[d] = mockPool[dUpper][idx % mockPool[dUpper].length];
      } else {
        row[d] = `Cat-${idx + 1}`;
      }
    });

    measures.forEach((m, mIdx) => {
      if (!m || typeof m !== 'string') return;
      if (t === 'pareto' && mIdx === 1) {
        row[m] = Math.round(Math.random() * 100); 
      } else {
        row[m] = Math.round(Math.random() * 1000) + 100;
      }
    });
    data.push(row);
  });
  return data;
};

const SacWidgetRenderer = ({ widget, mockDataset }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Theme styling overrides
  const textMainColor = isDark ? 'var(--text-primary)' : '#00144A';
  const textMutedColor = isDark ? 'var(--text-muted)' : '#64748b';
  const splitLineColor = isDark ? 'rgba(27,144,255,0.12)' : '#e2e8f0';
  const tooltipBg = isDark ? '#0f1938' : '#ffffff';
  const tooltipBorderColor = isDark ? 'rgba(77,177,255,0.3)' : '#cbd5e1';

  const { type, bindings } = widget;
  const t = type.toLowerCase();
  
  const dims = (bindings?.dimensions || []).filter(Boolean);
  let meas = (bindings?.measures || []).filter(Boolean);
  
  // EDGE CASE 3: Guarantee at least one measure and dimension to prevent map/axis crashes
  if (meas.length === 0) meas = ['Value'];
  if (dims.length === 0) dims.push('Category');
  
  // Vibrant theme-aligned colors
  const colors = ['#1B90FF', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16'];
  
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (window.isExporting) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800 + Math.random() * 600); // Fast realistic loaders
    return () => clearTimeout(timer);
  }, [JSON.stringify(dims), JSON.stringify(meas), t]);

  const mockData = React.useMemo(() => {
    let baseMock = mockDataset;
    if (mockDataset && !Array.isArray(mockDataset)) {
      const sourceModel = widget.dataSource?.modelId || widget.source_model;
      if (sourceModel && mockDataset[sourceModel]) {
        baseMock = mockDataset[sourceModel];
      } else {
        baseMock = Object.values(mockDataset)[0]; 
      }
    }
    return baseMock || generateMockData(dims, meas, t);
  }, [JSON.stringify(dims), JSON.stringify(meas), t, mockDataset, widget.source_model]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spin" size={24} color={colors[0]} />
      </div>
    );
  }

  // 1. TABLE
  if (t === 'table') {
    return (
      <div style={{ height: '100%', overflow: 'auto', paddingRight: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1 }}>
            <tr>
              {dims.map(d => <th key={d} style={{ padding: '10px 8px', borderBottom: '2px solid var(--border-glass)', color: 'var(--text-primary)', fontWeight: 700 }}>{d.replace(/([A-Z])/g, ' $1').trim()}</th>)}
              {meas.map(m => <th key={m} style={{ padding: '10px 8px', borderBottom: '2px solid var(--border-glass)', color: 'var(--text-primary)', fontWeight: 700 }}>{m.replace(/([A-Z])/g, ' $1').trim()}</th>)}
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                {dims.map(d => <td key={d} style={{ padding: '8px', color: 'var(--text-muted)' }}>{row[d]}</td>)}
                {meas.map(m => <td key={m} style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{row[m] != null ? Number(row[m]).toLocaleString() : '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // 2. NUMERIC POINT (KPI CARD)
  if (t === 'numeric_point' || t === 'kpi_card') {
    const primaryMeasure = meas[0] || 'KPI';
    const value = (mockData && mockData.length > 0)
      ? mockData.reduce((acc, curr) => acc + (curr[primaryMeasure] || 0), 0)
      : 54320;
      
    const isCurrency = /(AMOUNT|REVENUE|PRICE|COST|SALES|PROFIT|TAX)/i.test(primaryMeasure);
    
    let displayValue;
    let suffix = '';
    if (isCurrency) {
      const inMillions = value / 1000000;
      displayValue = `$${inMillions.toFixed(2)}`;
      suffix = ' Million';
    } else {
      displayValue = value.toLocaleString();
    }

    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', 
        height: '100%', 
        backgroundColor: 'var(--bg-strip)',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border-glass)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-strip)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {isCurrency ? 'in USD' : 'in Units'}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline' }}>
          <span>{displayValue}</span>
          {suffix && <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>{suffix}</span>}
        </div>
      </div>
    );
  }

  // --- ECHARTS BASE CONFIGURATION ---
  let option = {
    animation: !window.isExporting,
    color: colors,
    textStyle: { color: textMainColor, fontFamily: 'Inter, sans-serif' },
    tooltip: { 
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorderColor,
      borderWidth: 1,
      textStyle: { color: textMainColor }
    },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: textMutedColor } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true }
  };

  let chartData = mockData || [];
  if (Array.isArray(mockData) && dims.length > 0) {
    const grouped = mockData.reduce((acc, curr) => {
      const key = curr[dims[0]] || 'Unknown';
      if (!acc[key]) {
        acc[key] = { ...curr, [dims[0]]: key };
        meas.forEach(m => acc[key][m] = 0);
      }
      meas.forEach(m => {
        if (typeof curr[m] === 'number') acc[key][m] += curr[m];
      });
      return acc;
    }, {});
    chartData = Object.values(grouped);
  }

  const xData = (Array.isArray(chartData) && chartData[0] && dims[0] in chartData[0]) ? chartData.map(d => d[dims[0]]) : [];

  switch (t) {
    case 'bar_column':
    case 'histogram':
      option.xAxis = { 
        type: 'category', 
        data: xData,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = meas.map(m => ({
        name: m,
        type: 'bar',
        barCategoryGap: t === 'histogram' ? '0%' : '20%',
        colorBy: 'data',
        data: chartData.map(d => d[m])
      }));
      break;

    case 'stacked_bar_column':
      option.xAxis = { 
        type: 'category', 
        data: xData,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = meas.map(m => ({
        name: m,
        type: 'bar',
        stack: 'total',
        colorBy: 'data',
        data: chartData.map(d => d[m])
      }));
      break;

    case 'line':
    case 'time_series':
      option.xAxis = { 
        type: 'category', 
        data: xData, 
        boundaryGap: false,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = meas.map(m => ({
        name: m,
        type: 'line',
        smooth: true,
        colorBy: 'data',
        data: chartData.map(d => d[m])
      }));
      break;

    case 'area':
    case 'stacked_area':
      option.xAxis = { 
        type: 'category', 
        data: xData, 
        boundaryGap: false,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = meas.map(m => ({
        name: m,
        type: 'line',
        smooth: true,
        stack: t === 'stacked_area' ? 'total' : null,
        areaStyle: { opacity: 0.25 },
        colorBy: 'data',
        data: chartData.map(d => d[m])
      }));
      break;

    case 'combination_column_line':
    case 'combination_stacked_column_line':
    case 'pareto':
      option.xAxis = { 
        type: 'category', 
        data: xData,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = [
        { 
          type: 'value', 
          name: meas[0],
          axisLine: { lineStyle: { color: splitLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
          axisLabel: { color: textMutedColor }
        },
        { 
          type: 'value', 
          name: meas[1] || 'Ratio', 
          alignTicks: true,
          axisLine: { lineStyle: { color: splitLineColor } },
          splitLine: { show: false },
          axisLabel: { color: textMutedColor }
        }
      ];
      option.series = meas.map((m, idx) => ({
        name: m,
        type: idx === 0 ? 'bar' : 'line',
        yAxisIndex: idx === 0 ? 0 : 1,
        smooth: idx !== 0,
        colorBy: 'data',
        stack: t.includes('stacked') && idx === 0 ? 'total' : null,
        data: chartData.map(d => d[m])
      }));
      break;

    case 'pie':
    case 'donut':
      option.tooltip = { 
        trigger: 'item',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorderColor,
        borderWidth: 1,
        textStyle: { color: textMainColor }
      };
      option.xAxis = { show: false };
      option.yAxis = { show: false };
      option.legend = { show: true, bottom: 0, type: 'scroll', textStyle: { color: textMutedColor } };
      option.series = [{
        type: 'pie',
        radius: t === 'donut' ? ['35%', '55%'] : '55%',
        center: ['50%', '42%'],
        label: {
          show: true,
          color: textMainColor,
          formatter: (params) => {
            const name = params.name || '';
            return name.length > 12 ? name.substring(0, 12) + '...' : name;
          }
        },
        data: chartData.map(d => ({ name: d[dims[0]], value: d[meas[0]] }))
      }];
      break;

    case 'gauge':
      option.tooltip = { formatter: '{a} <br/>{b} : {c}%' };
      option.series = [{
        name: meas[0] || 'KPI',
        type: 'gauge',
        center: ['50%', '56%'],
        radius: '85%',
        progress: { show: true, width: 10 },
        axisLine: { lineStyle: { width: 10, color: [[1, splitLineColor]] } },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { width: 2, color: textMutedColor } },
        axisLabel: { distance: 15, fontSize: 10, color: textMutedColor },
        detail: { valueAnimation: true, formatter: '{value}%', fontSize: 24, offsetCenter: [0, '50%'], color: textMainColor },
        title: { offsetCenter: [0, '80%'], fontSize: 11, color: textMutedColor },
        data: [{ value: 75, name: dims[0] || 'Score' }]
      }];
      break;

    case 'bullet':
      option.xAxis = { 
        type: 'value', 
        max: 100,
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'category', 
        data: [meas[0] || 'KPI'],
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = [
        { name: 'Background', type: 'bar', itemStyle: { color: isDark ? '#1e293b' : '#e2e8f0' }, barWidth: '40%', data: [100], animation: false },
        { name: meas[0] || 'Actual', type: 'bar', barWidth: '20%', data: [75], z: 3 },
        { name: meas[1] || 'Target', type: 'scatter', symbol: 'rect', symbolSize: [5, 40], itemStyle: { color: textMainColor }, data: [85], z: 4 }
      ];
      break;

    case 'sankey': {
      let links;
      if (Array.isArray(mockData) && mockData.length > 0 && ('source' in mockData[0])) {
         links = mockData;
      } else {
         const d1 = dims[0] || 'Source';
         const d2 = dims[1] || dims[0] || 'Target';
         const m = meas[0] || 'Value';
         links = (Array.isArray(mockData) ? mockData : []).map(d => ({ source: String(d[d1]||'Unknown'), target: String(d[d2]||'Unknown'), value: d[m] || 0 }));
      }
      option.tooltip = { trigger: 'item', triggerOn: 'mousemove' };
      option.series = [{
        type: 'sankey',
        data: Array.from(new Set(links.flatMap(d => [d.source, d.target]))).map(name => ({ name, label: { color: textMainColor } })),
        links: links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 }
      }];
      break;
    }

    case 'radar':
      option.tooltip = { trigger: 'item' };
      option.radar = { 
        indicator: xData.map(d => ({ name: d, max: 1200 })),
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        splitArea: { show: false }
      };
      option.series = [{
        type: 'radar',
        data: meas.map(m => ({
          name: m,
          value: chartData.map(d => d[m])
        }))
      }];
      break;

    case 'scatter':
    case 'scatterplot':
    case 'bubble':
    case 'cluster_bubble':
      option.tooltip = { trigger: 'item' };
      option.grid = { left: '8%', right: '8%', top: '15%', bottom: '15%', containLabel: true };
      option.xAxis = { 
        type: 'value', 
        name: meas[0], 
        scale: true,
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value', 
        name: meas[1] || meas[0], 
        scale: true,
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = [{
        type: 'scatter',
        clip: false,
        colorBy: 'data',
        itemStyle: { opacity: 0.75 },
        symbolSize: t.includes('bubble') ? (data) => Math.max(10, Math.min(60, Math.abs(data[1] || 0) / 100)) : 10,
        data: (Array.isArray(mockData) ? mockData : []).map(d => [d[meas[0]], d[meas[1] || meas[0]], dims[0] ? d[dims[0]] : ''])
      }];
      break;

    case 'funnel':
      option.tooltip = { trigger: 'item', formatter: '{a} <br/>{b} : {c}%' };
      option.series = [{
        name: meas[0] || 'Funnel',
        type: 'funnel',
        left: '10%', top: 60, bottom: 60, width: '80%',
        min: 0, max: 1200, minSize: '0%', maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside', color: '#fff' },
        data: chartData.map(d => ({ name: d[dims[0]], value: d[meas[0]] }))
      }];
      break;

    case 'tree_map':
    case 'marimekko': {
      option.tooltip = { formatter: '{b}: {c}' };
      let treeData = mockData;
      if (Array.isArray(mockData) && mockData.length > 0 && !('children' in mockData[0]) && !('value' in mockData[0])) {
         treeData = chartData.map(d => ({ name: String(d[dims[0]]), value: d[meas[0]] }));
      }
      option.series = [{
        type: 'treemap',
        data: treeData,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false }
      }];
      break;
    }

    case 'heat_map': {
      let hmData, xVals, yVals, maxVal;
      if (Array.isArray(mockData) && mockData.length > 0 && !mockData.data) {
        const d1 = dims[0] || 'X';
        const d2 = dims[1] || dims[0] || 'Y';
        const m = meas[0] || 'Value';
        xVals = Array.from(new Set(chartData.map(d => String(d[d1]))));
        yVals = Array.from(new Set(chartData.map(d => String(d[d2]))));
        
        const aggMap = {};
        mockData.forEach(d => {
           const xIdx = xVals.indexOf(String(d[d1]));
           const yIdx = yVals.indexOf(String(d[d2]));
           const key = `${xIdx}-${yIdx}`;
           if (!aggMap[key]) {
               aggMap[key] = [xIdx, yIdx, 0];
           }
           aggMap[key][2] += (d[m] || 0);
        });
        hmData = Object.values(aggMap);
        maxVal = Math.max(...hmData.map(d => d[2]), 10);
      } else {
        hmData = mockData.data || [];
        xVals = mockData.x || [];
        yVals = mockData.y || [];
        maxVal = 10;
      }
      option.tooltip = { position: 'top' };
      option.grid = { left: '15%', height: '50%', top: '10%' };
      option.xAxis = { 
        type: 'category', 
        data: xVals, 
        splitArea: { show: true },
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'category', 
        data: yVals, 
        splitArea: { show: true },
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.visualMap = { 
        min: 0, 
        max: maxVal, 
        calculable: true, 
        orient: 'horizontal', 
        left: 'center', 
        bottom: '15%',
        textStyle: { color: textMutedColor }
      };
      option.series = [{
        name: meas[0] || 'Value',
        type: 'heatmap',
        data: hmData,
        label: { 
          show: true, 
          formatter: (params) => {
             const val = params.value[2];
             return val > 1000 ? (val / 1000).toFixed(1) + 'k' : val;
          }
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }];
      break;
    }

    case 'box_plot':
      option.tooltip = { trigger: 'item', axisPointer: { type: 'shadow' } };
      option.xAxis = { 
        type: 'category', 
        boundaryGap: true, 
        nameGap: 30, 
        splitArea: { show: false }, 
        data: [`${dims[0] || 'Cat'} 1`, `${dims[0] || 'Cat'} 2`, `${dims[0] || 'Cat'} 3`, `${dims[0] || 'Cat'} 4`],
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value', 
        splitArea: { show: true },
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = [{ 
        name: meas[0] || 'Value', 
        type: 'boxplot', 
        data: [
          [740, 850, 930, 980, 1070],
          [790, 830, 880, 940, 960],
          [740, 760, 800, 820, 920],
          [760, 810, 820, 850, 890]
        ] 
      }];
      break;

    case 'waterfall': {
      let wfNames, wfValues, bases;
      if (Array.isArray(mockData) && mockData.length > 0 && !('value' in mockData[0])) {
         wfNames = chartData.map(d => String(d[dims[0]]));
         wfValues = chartData.map(d => d[meas[0]] || 0);
      } else {
         wfNames = (Array.isArray(mockData) ? mockData : []).map(d => String(d.name || d[dims[0]]));
         wfValues = (Array.isArray(mockData) ? mockData : []).map(d => d.value !== undefined ? d.value : d[meas[0]]);
      }
      
      bases = [0];
      let current = 0;
      for(let i = 0; i < wfValues.length - 1; i++) {
         current += wfValues[i];
         bases.push(current > 0 ? current : 0);
      }

      option.tooltip = { trigger: 'axis', axisPointer: { type: 'shadow' } };
      option.xAxis = { 
        type: 'category', 
        splitLine: { show: false }, 
        data: wfNames,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = [
        { 
          name: 'Base', type: 'bar', stack: 'Total', 
          itemStyle: { borderColor: 'transparent', color: 'transparent' }, 
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          data: bases
        },
        { 
          name: meas[0] || 'Value', type: 'bar', stack: 'Total', 
          label: { show: true, position: 'inside', color: '#fff' }, 
          data: wfValues.map(v => Math.abs(v))
        }
      ];
      break;
    }

    default:
      // EDGE CASE 4: Hallucinated chart type falls back to a safe bar chart
      const safeData = Array.isArray(mockData) ? mockData : [];
      option.xAxis = { 
        type: 'category', 
        data: xData,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.yAxis = { 
        type: 'value',
        axisLine: { lineStyle: { color: splitLineColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textMutedColor }
      };
      option.series = meas.map(m => ({
        name: m,
        type: 'bar',
        data: safeData.map(d => d[m])
      }));
      if (t !== 'bar' && t !== 'column' && t !== 'bar_column') {
        console.warn(`Unsupported chart type "${t}" received. Falling back to default bar chart.`);
      }
  }

  return <ReactECharts option={option} notMerge={true} lazyUpdate={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />;
};

export default React.memo(SacWidgetRenderer, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.widget) === JSON.stringify(nextProps.widget) &&
         prevProps.mockDataset === nextProps.mockDataset;
});
