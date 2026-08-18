export const generateChartTitle = (bindings, chartType) => {
  if (chartType === 'table') return "Table";
  
  if (!bindings) return "";
  
  const measures = bindings.measures || [];
  const dimensions = bindings.dimensions || [];

  // Helper to format array of strings like "A, B & C"
  const formatList = (list) => {
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} & ${list[1]}`;
    return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
  };

  const measureStr = formatList(measures);
  const dimensionStr = formatList(dimensions);

  if (measures.length > 0 && dimensions.length > 0) {
    return `${measureStr} by ${dimensionStr}`;
  } else if (measures.length > 0) {
    return `${measureStr}`;
  } else if (dimensions.length > 0) {
    return `${dimensionStr}`;
  }

  return "Blank Chart";
};
