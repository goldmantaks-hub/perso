interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  metadata?: any;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  type?: string;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildNetworkGraph(
  personas: any[],
  relationships: any[]
): NetworkGraph {
  const nodes: GraphNode[] = personas.map(p => ({
    id: p.id,
    label: p.name,
    type: 'persona',
    metadata: {
      empathy: p.empathy,
      humor: p.humor,
      sociability: p.sociability
    }
  }));
  
  const links: GraphLink[] = relationships.map(r => ({
    source: r.sourceId,
    target: r.targetId,
    value: r.affinity || 1
  }));
  
  return { nodes, links };
}

export function filterGraphByEmotion(
  graph: NetworkGraph,
  emotion: string
): NetworkGraph {
  return graph;
}

export function calculateNodePositions(
  graph: NetworkGraph,
  width: number,
  height: number
): NetworkGraph {
  const positioned = { ...graph };
  
  positioned.nodes = positioned.nodes.map((node, i) => {
    const angle = (i / positioned.nodes.length) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.3;
    
    return {
      ...node,
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle)
    };
  });
  
  return positioned;
}
