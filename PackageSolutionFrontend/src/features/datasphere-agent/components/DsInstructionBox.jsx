import React, { useState, useEffect, useMemo } from 'react';
import { Send, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

const HANA_SQL_KEYWORDS = new Set([
  'DAYS_BETWEEN', 'ADD_DAYS', 'ROUND', 'IFNULL', 'COALESCE', 'CONCAT', 'SUBSTRING', 'UPPER', 'LOWER', 'LENGTH',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'LIKE', 'BETWEEN', 'TO_DATE',
  'TO_INTEGER', 'TO_DECIMAL', 'TO_VARCHAR', 'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC',
  'SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'ABS', 'CAST', 'AS'
]);

/**
 * Instruction textarea + submit button.
 * Styled with PackageSolution design tokens.
 * Features dynamic HANA SQL syntax validation.
 */
function DsInstructionBox({ onSubmit, isProcessing, disabled, graphData }) {
  const [text, setText] = useState('');
  const [validation, setValidation] = useState({ status: 'idle', message: '', invalidTokens: [] });

  const validColumns = useMemo(() => {
    const cols = new Set();
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach(node => {
        if (node.data && node.data.column_diff) {
          node.data.column_diff.forEach(col => cols.add((col.name || col.label || '').toUpperCase()));
        } else if (node.data && node.data.elements) {
          node.data.elements.forEach(el => cols.add((el.name || '').toUpperCase()));
        }
      });
    }
    return cols;
  }, [graphData]);

  useEffect(() => {
    if (!text.trim()) {
      setValidation({ status: 'idle', message: '', invalidTokens: [] });
      return;
    }

    const match = text.match(/with formula\s+(.+)/i);
    if (match) {
      const formula = match[1];
      const words = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      const invalid = [];

      words.forEach(word => {
        const upperWord = word.toUpperCase();
        if (!HANA_SQL_KEYWORDS.has(upperWord) && !validColumns.has(upperWord)) {
          invalid.push(word);
        }
      });

      if (invalid.length > 0) {
        setValidation({
          status: 'invalid',
          message: `Unrecognized column(s): ${invalid.join(', ')}`,
          invalidTokens: invalid
        });
      } else {
        setValidation({
          status: 'valid',
          message: 'Formula syntax looks valid.',
          invalidTokens: []
        });
      }
    } else {
      setValidation({ status: 'idle', message: '', invalidTokens: [] });
    }
  }, [text, validColumns]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isProcessing && validation.status !== 'invalid') {
      onSubmit(text);
      setText('');
    }
  };

  const isSubmitDisabled = disabled || isProcessing || !text.trim() || validation.status === 'invalid';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isProcessing}
          placeholder="e.g., Add a calculated column Expected_Delivery with formula ADD_DAYS(Order_Creation_Date, 5)"
          style={{
            width: '100%',
            height: 128,
            background: validation.status === 'invalid' ? 'var(--ds-danger-light)' : validation.status === 'valid' ? 'var(--ds-success-light)' : 'var(--bg-input)',
            border: `1px solid ${validation.status === 'invalid' ? 'var(--ds-danger)' : validation.status === 'valid' ? 'var(--ds-success)' : 'var(--border-input)'}`,
            borderRadius: 'var(--r-md)',
            padding: 12,
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--text-primary)',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.3s',
            opacity: disabled ? 0.5 : 1,
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            if (validation.status !== 'invalid' && validation.status !== 'valid') {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(27,144,255,0.10)';
            }
          }}
          onBlur={(e) => {
            if (validation.status !== 'invalid' && validation.status !== 'valid') {
              e.target.style.borderColor = 'var(--border-input)';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        <Sparkles
          size={16}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'var(--blue-6)',
            opacity: 0.5,
          }}
        />
      </div>

      {validation.status === 'invalid' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--ds-danger)', background: 'var(--ds-danger-bg)', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--ds-danger)' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{validation.message} - Please check your spelling.</span>
        </div>
      )}

      {validation.status === 'valid' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--ds-success)', background: 'var(--ds-success-bg)', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--ds-success)' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{validation.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="download-btn"
        style={{
          width: '100%',
          justifyContent: 'center',
          opacity: isSubmitDisabled ? 0.5 : 1,
          cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Send size={16} />
        {isProcessing ? 'Processing...' : 'Apply Instruction'}
      </button>
    </form>
  );
}

export default DsInstructionBox;
