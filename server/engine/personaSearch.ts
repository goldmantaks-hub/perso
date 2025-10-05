interface Persona {
  id: string;
  name: string;
  empathy: number;
  humor: number;
  sociability: number;
  creativity: number;
  knowledge: number;
  currentMood?: any;
}

interface SearchCriteria {
  emotion?: string;
  minSociability?: number;
  excludeIds?: string[];
  limit?: number;
}

export class PersonaSearch {
  async findMatchingPersonas(
    criteria: SearchCriteria,
    allPersonas: Persona[]
  ): Promise<Persona[]> {
    let filtered = [...allPersonas];
    
    if (criteria.excludeIds) {
      filtered = filtered.filter(p => !criteria.excludeIds?.includes(p.id));
    }
    
    if (criteria.minSociability) {
      filtered = filtered.filter(p => p.sociability >= criteria.minSociability!);
    }
    
    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }
    
    return filtered;
  }
  
  async findSimilarPersonas(
    targetPersona: Persona,
    allPersonas: Persona[],
    limit: number = 3
  ): Promise<Persona[]> {
    const similarities = allPersonas
      .filter(p => p.id !== targetPersona.id)
      .map(p => ({
        persona: p,
        score: this.calculateSimilarity(targetPersona, p)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return similarities.map(s => s.persona);
  }
  
  private calculateSimilarity(p1: Persona, p2: Persona): number {
    const stats1 = [p1.empathy, p1.humor, p1.sociability, p1.creativity, p1.knowledge];
    const stats2 = [p2.empathy, p2.humor, p2.sociability, p2.creativity, p2.knowledge];
    
    let distance = 0;
    for (let i = 0; i < stats1.length; i++) {
      distance += Math.pow(stats1[i] - stats2[i], 2);
    }
    
    return 1 / (1 + Math.sqrt(distance));
  }
}
