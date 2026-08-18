import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import DsEntityNode from './DsEntityNode';
import DsGroupNode from './DsGroupNode';
import DsCustomEdge from './DsCustomEdge';

const nodeTypes = { entityNode: DsEntityNode, group: DsGroupNode };
const edgeTypes = { custom: DsCustomEdge };

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  const childNodes = nodes.filter((n) => n.type !== 'group');
  const groupNodes = [];

  // 1. Group nodes by space
  const spaces = {};
  childNodes.forEach((node) => {
    const space = node.data?.space || 'DSP_CUST_CONTENT';
    if (!spaces[space]) spaces[space] = { nodes: [], width: 0, height: 0 };
    spaces[space].nodes.push(node);
  });

  // 2. Internal Layout for each space
  const PADDING = 60;
  Object.keys(spaces).forEach((space) => {
    const spaceGraph = new dagre.graphlib.Graph();
    spaceGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60 });
    spaceGraph.setDefaultEdgeLabel(() => ({}));

    spaces[space].nodes.forEach((node) => {
      spaceGraph.setNode(node.id, { width: 280, height: 200 });
    });

    edges.forEach((edge) => {
      const sourceNode = childNodes.find((n) => n.id === edge.source);
      const targetNode = childNodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const sourceSpace = sourceNode.data?.space || 'DSP_CUST_CONTENT';
      const targetSpace = targetNode.data?.space || 'DSP_CUST_CONTENT';

      if (sourceSpace === space && targetSpace === space) {
        spaceGraph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(spaceGraph);

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    spaces[space].nodes.forEach((node) => {
      const nodeWithPosition = spaceGraph.node(node.id);
      node.targetPosition = isHorizontal ? 'left' : 'top';
      node.sourcePosition = isHorizontal ? 'right' : 'bottom';

      const x = nodeWithPosition.x - 140;
      const y = nodeWithPosition.y - 100;

      node.position = { x, y };
      node.parentNode = `group_${space}`;
      node.extent = 'parent';

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 280);
      maxY = Math.max(maxY, y + 200);
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 0;
      maxY = 0;
    }

    spaces[space].width = maxX - minX + PADDING * 2;
    spaces[space].height = maxY - minY + PADDING * 2;

    spaces[space].nodes.forEach((node) => {
      node.position.x = node.position.x - minX + PADDING;
      node.position.y = node.position.y - minY + PADDING;
    });
  });

  // 3. Macro Layout for spaces
  const macroGraph = new dagre.graphlib.Graph();
  macroGraph.setGraph({ rankdir: direction, ranksep: 200, nodesep: 150 });
  macroGraph.setDefaultEdgeLabel(() => ({}));

  Object.keys(spaces).forEach((space) => {
    macroGraph.setNode(space, {
      width: spaces[space].width,
      height: spaces[space].height,
    });
  });

  edges.forEach((edge) => {
    const sourceNode = childNodes.find((n) => n.id === edge.source);
    const targetNode = childNodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const sourceSpace = sourceNode.data?.space || 'DSP_CUST_CONTENT';
    const targetSpace = targetNode.data?.space || 'DSP_CUST_CONTENT';

    if (sourceSpace !== targetSpace) {
      macroGraph.setEdge(sourceSpace, targetSpace);
    }
  });

  dagre.layout(macroGraph);

  // 4. Create space parent nodes
  Object.keys(spaces).forEach((space) => {
    const nodeWithPosition = macroGraph.node(space);
    const x = nodeWithPosition.x - spaces[space].width / 2;
    const y = nodeWithPosition.y - spaces[space].height / 2;

    groupNodes.push({
      id: `group_${space}`,
      type: 'group',
      position: { x, y },
      style: {
        width: spaces[space].width,
        height: spaces[space].height,
        zIndex: -1,
      },
      data: { label: space },
    });
  });

  return { nodes: [...groupNodes, ...childNodes], edges };
};

function DsDependencyGraph({ data }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [detailedNode, setDetailedNode] = useState(null);

  useEffect(() => {
    if (data?.nodes && data?.edges) {
      const styledNodes = data.nodes.map((n) => ({ ...n }));
      const styledEdges = data.edges.map((e) => ({ ...e }));

      if (styledNodes.length > 500) {
        console.warn(
          `Graph has ${styledNodes.length} nodes. Skipping Dagre auto-layout.`,
        );
        setNodes(styledNodes);
        setEdges(styledEdges);
        return;
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(styledNodes, styledEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setSelectedNode(null);
      setDetailedNode(null);
    }
  }, [data]);

  const getConnectedNodes = useCallback((nodeId, currentEdges) => {
    const connected = new Set([nodeId]);

    const findAncestors = (id) => {
      currentEdges.forEach((e) => {
        if (e.target === id && !connected.has(e.source)) {
          connected.add(e.source);
          findAncestors(e.source);
        }
      });
    };

    const findDescendants = (id) => {
      currentEdges.forEach((e) => {
        if (e.source === id && !connected.has(e.target)) {
          connected.add(e.target);
          findDescendants(e.target);
        }
      });
    };

    findAncestors(nodeId);
    findDescendants(nodeId);
    return connected;
  }, []);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'group') return;

    setSelectedNode((prev) => {
      const isSame = prev?.id === node.id;
      if (isSame) {
        setDetailedNode(node);
        return prev;
      } else {
        setDetailedNode(null);
        return node;
      }
    });
  }, []);

  // Apply highlighting when selectedNode changes
  useEffect(() => {
    if (!nodes.length) return;

    let highlightedNodes = new Set();
    if (selectedNode) {
      highlightedNodes = getConnectedNodes(selectedNode.id, edges);
    }

    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'group') return n;
        return {
          ...n,
          data: {
            ...n.data,
            isHighlighted: selectedNode
              ? highlightedNodes.has(n.id)
              : false,
            isSelected: selectedNode ? n.id === selectedNode.id : false,
            isDimmed: selectedNode ? !highlightedNodes.has(n.id) : false,
          },
        };
      }),
    );

    setEdges((eds) =>
      eds.map((e) => {
        let strokeColor = 'var(--text-muted)';
        let strokeWidth = 2;
        let animated = true;
        let zIndex = 0;

        if (selectedNode) {
          if (
            highlightedNodes.has(e.source) &&
            highlightedNodes.has(e.target)
          ) {
            strokeColor = 'var(--ds-highlight)';
            strokeWidth = 3;
            zIndex = 10;
          } else {
            strokeColor = 'var(--border-glass)';
            animated = false;
          }
        } else {
          if (e.data?.status === 'added') {
            strokeColor = 'var(--ds-success)';
            strokeWidth = 3;
          }
          if (e.data?.status === 'removed') strokeColor = 'var(--ds-danger)';
        }

        return {
          ...e,
          type:
            e.data?.edge_type === 'association' ? 'custom' : 'default',
          style: { stroke: strokeColor, strokeWidth },
          animated,
          zIndex,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-input)',
        position: 'relative',
        borderRadius: 'var(--r-md)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        fitView
      >
        <Background color="var(--border-glass)" gap={16} />
        <Controls
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--r-sm)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.status === 'added') return 'var(--ds-success)';
            if (node.data?.status === 'removed') return 'var(--ds-danger)';
            if (node.data?.status === 'changed') return 'var(--ds-warning)';
            return 'var(--text-muted)';
          }}
          maskColor="var(--bg-overlay)"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--r-sm)',
          }}
        />
      </ReactFlow>

      {/* ── Node Detail Panel ── */}
      {detailedNode && (
        <div
          className="glass-card"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 320,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInRight 0.3s ease',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: 12,
              background: 'var(--bg-strip)',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
                flex: 1,
                paddingRight: 8,
              }}
            >
              {detailedNode.data?.label || detailedNode.id}
            </h3>
            <button
              className="icon-btn"
              onClick={() => {
                setDetailedNode(null);
                setSelectedNode(null);
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel body */}
          <div style={{ padding: 16, maxHeight: 500, overflowY: 'auto' }}>
            {/* Technical Name */}
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Technical Name
              </span>
              <p
                style={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: 'var(--text-primary)',
                  marginTop: 4,
                  wordBreak: 'break-all',
                }}
              >
                {detailedNode.id}
              </p>
            </div>

            {/* Entity Type */}
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Entity Type
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  marginTop: 4,
                  textTransform: 'capitalize',
                }}
              >
                {detailedNode.data?.type || 'Unknown'}
              </p>
            </div>

            {/* Elements */}
            {detailedNode.data?.elements &&
            detailedNode.data.elements.length > 0 ? (
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Elements ({detailedNode.data.elements.length})
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {detailedNode.data.elements.map((el, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-input)',
                        padding: 8,
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border-strip)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {el.label}
                        </span>
                        <span
                          className="lob-badge"
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            flexShrink: 0,
                            background:
                              el.type === 'Measure'
                                ? 'var(--bg-badge)'
                                : 'var(--bg-strip)',
                            color:
                              el.type === 'Measure'
                                ? 'var(--text-badge)'
                                : 'var(--text-primary)',
                          }}
                        >
                          {el.type}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily:
                            "'JetBrains Mono', 'Fira Code', monospace",
                          color: 'var(--text-muted)',
                          marginTop: 4,
                          wordBreak: 'break-all',
                        }}
                      >
                        {el.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  marginTop: 8,
                }}
              >
                No elements or columns found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DsDependencyGraph;
