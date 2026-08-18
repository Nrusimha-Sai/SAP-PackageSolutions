import React from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { ArrowLeftRight } from 'lucide-react';

/**
 * Custom edge with optional association badge — styled with PackageSolution brand.
 */
export default function DsCustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {data?.edge_type === 'association' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              background: 'var(--bg-card)',
              padding: 2,
              borderRadius: '50%',
              border: '1px solid var(--blue-6)',
              boxShadow: 'var(--shadow-strip)',
              color: 'var(--blue-7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="nodrag nopan"
            title="Text Association"
          >
            <ArrowLeftRight size={12} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
