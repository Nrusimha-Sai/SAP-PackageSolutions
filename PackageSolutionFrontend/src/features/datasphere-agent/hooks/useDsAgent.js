/* ================================================================
   Datasphere Agent – State Management Hook
   Encapsulates all agent state, API interactions, and side-effects.
================================================================ */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as api from '../services/dsAgentApi';

/**
 * @returns All state and handlers needed by DatasphereAgentView
 */
export default function useDsAgent() {
  /* ── core state ── */
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  /* ── preview state ── */
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const scrollTimeoutRef = useRef(null);

  /* ── toast state ── */
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /* ── Debounce preview search ── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(previewSearch), 400);
    return () => clearTimeout(timer);
  }, [previewSearch]);

  /* ── Memoised JSON strings for preview ── */
  const originalJsonString = useMemo(
    () => (previewData ? JSON.stringify(previewData.original_json, null, 2) : ''),
    [previewData],
  );

  const currentJsonString = useMemo(
    () => (previewData ? JSON.stringify(previewData.current_json, null, 2) : ''),
    [previewData],
  );

  /* ── Highlight matching marks in the preview panels ── */
  useEffect(() => {
    if (debouncedSearch && showPreview) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        const currentMarks = document.querySelectorAll('.ds-current-json-panel mark');
        const originalMarks = document.querySelectorAll('.ds-original-json-panel mark');
        const maxMatches = Math.max(currentMarks.length, originalMarks.length);

        setMatchCount(maxMatches);
        setCurrentMatchIndex(maxMatches > 0 ? 0 : 0);

        if (maxMatches > 0) {
          [currentMarks, originalMarks].forEach((marks) => {
            marks.forEach((m) => {
              m.style.background = 'var(--ds-warning)';
              m.style.color = '#000';
              m.classList.remove('ds-active-match');
            });
            if (marks[0]) {
              marks[0].style.background = 'var(--ds-highlight)';
              marks[0].classList.add('ds-active-match');
              marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        }
      }, 100);
    } else {
      setMatchCount(0);
      setCurrentMatchIndex(0);
    }
  }, [debouncedSearch, showPreview]);

  /* ── Match navigation ── */
  const updateActiveMatch = useCallback(
    (index) => {
      const currentMarks = document.querySelectorAll('.ds-current-json-panel mark');
      const originalMarks = document.querySelectorAll('.ds-original-json-panel mark');
      if (currentMarks.length === 0 && originalMarks.length === 0) return;

      // Reset old active
      [currentMarks, originalMarks].forEach((marks) => {
        if (marks[currentMatchIndex]) {
          marks[currentMatchIndex].style.background = 'var(--ds-warning)';
          marks[currentMatchIndex].classList.remove('ds-active-match');
        }
      });

      // Set new active
      [currentMarks, originalMarks].forEach((marks) => {
        if (marks[index]) {
          marks[index].style.background = 'var(--ds-highlight)';
          marks[index].classList.add('ds-active-match');
          marks[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      setCurrentMatchIndex(index);
    },
    [currentMatchIndex],
  );

  const handleNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    updateActiveMatch((currentMatchIndex + 1) % matchCount);
  }, [matchCount, currentMatchIndex, updateActiveMatch]);

  const handlePrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    updateActiveMatch((currentMatchIndex - 1 + matchCount) % matchCount);
  }, [matchCount, currentMatchIndex, updateActiveMatch]);

  /* ── API handlers ── */
  const handleFileUpload = useCallback(async (files) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await api.uploadFiles(files);
      setGraphData(data.graph);
      setHasData(true);
      const list = Array.isArray(files) ? files : [files];
      setUploadedFileName(
        list.length === 1 ? list[0].name : `${list.length} files selected`,
      );
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleInstruction = useCallback(
    async (instruction) => {
      setIsProcessing(true);
      setError(null);
      try {
        const data = await api.sendInstruction(instruction);
        setGraphData(data.graph);
        showToast('Instruction applied successfully!', 'success');
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
        showToast('Failed to apply instruction', 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [showToast],
  );

  const handleUndo = useCallback(async () => {
    try {
      const data = await api.undo();
      setGraphData(data.graph);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  }, []);

  const handleRedo = useCallback(async () => {
    try {
      const data = await api.redo();
      setGraphData(data.graph);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  }, []);

  // removed handleGithubExport

  const handlePreview = useCallback(async () => {
    try {
      const data = await api.getState();
      setPreviewData(data);
      setShowPreview(true);
    } catch (err) {
      setError('Preview failed: ' + (err.response?.data?.detail || err.message));
    }
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewSearch('');
    setDebouncedSearch('');
    setMatchCount(0);
    setCurrentMatchIndex(0);
  }, []);

  /* ── Utility: highlighted JSON for preview ── */
  const getHighlightedJSON = useCallback((rawString, query) => {
    if (!query) return rawString;

    const escaped = rawString.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[tag] || tag,
    );

    const regex = new RegExp(
      `(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`,
      'gi',
    );
    return escaped.replace(
      regex,
      '<mark style="background:var(--ds-warning);color:#000;border-radius:3px;padding:0 2px;font-weight:600">$1</mark>',
    );
  }, []);

  return {
    // core
    graphData,
    isProcessing,
    hasData,
    error,
    clearError,
    uploadedFileName,
    // preview
    showPreview,
    previewData,
    previewSearch,
    setPreviewSearch,
    debouncedSearch,
    matchCount,
    currentMatchIndex,
    originalJsonString,
    currentJsonString,
    getHighlightedJSON,
    handleNextMatch,
    handlePrevMatch,
    closePreview,
    // toast
    toast,
    // handlers
    handleFileUpload,
    handleInstruction,
    handleUndo,
    handleRedo,
    handlePreview,
  };
}
