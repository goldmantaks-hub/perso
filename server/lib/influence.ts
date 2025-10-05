interface InfluenceNode {
  id: string;
  type: 'persona' | 'topic' | 'skill' | 'trigger';
  label: string;
  value?: number;
}

interface InfluenceEdge {
  source: string;
  target: string;
  weight: number;
  type: 'influences' | 'learns_from' | 'triggers';
}

export interface InfluenceGraph {
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
}

export function buildInfluenceGraph(
  personaId: string,
  interactions: any[],
  learnings: any[]
): InfluenceGraph {
  const nodes: InfluenceNode[] = [
    {
      id: personaId,
      type: 'persona',
      label: 'Central Persona'
    }
  ];
  
  const edges: InfluenceEdge[] = [];
  
  return { nodes, edges };
}

export function calculateInfluenceScore(
  sourceId: string,
  targetId: string,
  interactions: any[]
): number {
  let score = 0;
  
  return score;
}

export function getTopInfluencers(
  personaId: string,
  graph: InfluenceGraph,
  limit: number = 5
): InfluenceNode[] {
  const influenceScores = new Map<string, number>();
  
  graph.edges
    .filter(e => e.target === personaId)
    .forEach(e => {
      const current = influenceScores.get(e.source) || 0;
      influenceScores.set(e.source, current + e.weight);
    });
  
  const sorted = Array.from(influenceScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return sorted
    .map(([id]) => graph.nodes.find(n => n.id === id))
    .filter(n => n !== undefined) as InfluenceNode[];
}
