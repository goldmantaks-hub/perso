import { ContentFeatures } from './featureDetector';
import fs from 'fs';
import path from 'path';

interface RoutingConfig {
  routing: {
    weights: {
      [key: string]: string[];
    };
    selection: {
      topK: number;
      dedupeByFamily: string[][];
      minConfidence: number;
    };
  };
}

interface PersonaProfile {
  id: string;
  role: string;
  tone: string;
}

let routingConfig: RoutingConfig | null = null;
let personaProfiles: PersonaProfile[] | null = null;

function loadConfig() {
  if (!routingConfig) {
    const configPath = path.join(process.cwd(), 'personaRoutingConfig.json');
    routingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return routingConfig!;
}

function loadProfiles() {
  if (!personaProfiles) {
    const profilesPath = path.join(process.cwd(), 'personaProfiles.json');
    personaProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
  }
  return personaProfiles!;
}

export interface PersonaRoutingResult {
  selectedPersonas: string[];
  scores: Map<string, number>;
  reasons: string[];
}

export function routePersonas(features: ContentFeatures): PersonaRoutingResult {
  const config = loadConfig();
  const profiles = loadProfiles();
  
  const scores = new Map<string, number>();
  const reasons: string[] = [];
  
  const add = (id: string, weight: number, reason: string) => {
    scores.set(id, (scores.get(id) || 0) + weight);
    reasons.push(`${id}: +${weight} (${reason})`);
  };

  if (features.contentType === "text" && features.tones.includes("informative")) {
    config.routing.weights["text.factual"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, "informative text");
    });
  }

  if (features.contentType === "text" && features.tones.includes("emotional")) {
    config.routing.weights["text.emotional"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, "emotional text");
    });
  }

  if (features.imageScores?.aesthetics && features.imageScores.aesthetics >= 0.7) {
    config.routing.weights["image.aestheticHigh"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, "high aesthetic image");
    });
  }

  if (features.imageScores?.brand) {
    const brand = features.imageScores.brand;
    config.routing.weights["image.brandDetected"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, `brand detected: ${brand}`);
    });
  }

  if (features.tones.includes("humorous") || features.tones.includes("playful")) {
    config.routing.weights["memeOrJoke"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, "humorous content");
    });
  }

  if (features.tones.includes("mysterious") || features.tones.includes("cryptic")) {
    config.routing.weights["mysteryOrMissingContext"]?.forEach(s => {
      const [id, w] = s.split(":");
      add(id, +w, "mysterious content");
    });
  }

  features.topics.forEach(topic => {
    const topicKey = topic.toLowerCase();
    
    if (topicKey === "technology" || topicKey === "tech") {
      config.routing.weights["techTopic"]?.forEach(s => {
        const [id, w] = s.split(":");
        add(id, +w, `topic: ${topic}`);
      });
    }
    
    if (topicKey === "ethics" || topicKey === "philosophy" || topicKey === "values") {
      config.routing.weights["ethicsOrValues"]?.forEach(s => {
        const [id, w] = s.split(":");
        add(id, +w, `topic: ${topic}`);
      });
    }
    
    if (config.routing.weights[topicKey]) {
      config.routing.weights[topicKey].forEach(s => {
        const [id, w] = s.split(":");
        add(id, +w, `topic: ${topic}`);
      });
    }
  });

  if (scores.size === 0) {
    const randomPersonas = profiles
      .map(p => p.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, config.routing.selection.topK);
    
    console.log(`[ROUTING] No specific matches, selecting random personas:`, randomPersonas.join(", "));
    
    return {
      selectedPersonas: randomPersonas,
      scores: new Map(randomPersonas.map(id => [id, 1])),
      reasons: [`Random selection (no specific features matched)`]
    };
  }

  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const families = config.routing.selection.dedupeByFamily;
  const final: string[] = [];

  for (const id of sorted) {
    const fam = families.find(group => group.includes(id));
    if (!fam || !final.some(x => fam.includes(x))) {
      final.push(id);
    }
    if (final.length >= config.routing.selection.topK) break;
  }

  console.log(`[ROUTING] Selected ${final.length} personas:`, final.join(", "));
  console.log(`[ROUTING] Scores:`, Array.from(scores.entries()).map(([id, score]) => `${id}:${score}`).join(", "));

  return {
    selectedPersonas: final,
    scores,
    reasons
  };
}

export interface PersonaOutput {
  postId: string;
  personas: {
    id: string;
    role: string;
    tone: string;
    reason: string;
    summary?: string;
    actions?: string[];
  }[];
}

export function generatePersonaOutput(
  postId: string,
  routingResult: PersonaRoutingResult,
  features: ContentFeatures
): PersonaOutput {
  const profiles = loadProfiles();
  
  const personas = routingResult.selectedPersonas.map(personaId => {
    const profile = profiles.find(p => p.id === personaId);
    if (!profile) {
      throw new Error(`Persona profile not found: ${personaId}`);
    }
    
    const personaReasons = routingResult.reasons.filter(r => r.startsWith(`${personaId}:`));
    const reason = personaReasons.length > 0
      ? personaReasons.map(r => r.split(": ")[1]).join(", ")
      : "General selection";
    
    let summary = "";
    let actions: string[] = [];
    
    if (profile.role === "knowledge") {
      summary = "정보 검증 및 사실 확인";
      actions = ["공식 출처 확인", "데이터 분석"];
    } else if (profile.role === "empathy") {
      summary = "공감 포인트 강조 및 감정적 피드백";
      actions = ["감정 분석", "공감 반응 생성"];
    } else if (profile.role === "creative") {
      summary = "창의적 관점 제시 및 예술적 해석";
      actions = ["미적 분석", "창의적 제안"];
    } else if (profile.role === "analyst") {
      summary = "논리적 분석 및 구조화";
      actions = ["패턴 분석", "통계적 검토"];
    } else if (profile.role === "humor") {
      summary = "유머러스한 관점 및 긍정적 분위기 조성";
      actions = ["재치있는 반응", "밈 생성"];
    } else if (profile.role === "philosopher") {
      summary = "철학적 성찰 및 가치 탐구";
      actions = ["윤리적 검토", "의미 탐구"];
    } else if (profile.role === "trend") {
      summary = "트렌드 분석 및 대중적 반응 예측";
      actions = ["트렌드 확인", "인기도 분석"];
    } else if (profile.role === "tech") {
      summary = "기술적 분석 및 정밀한 설명";
      actions = ["기술 검증", "스펙 확인"];
    } else if (profile.role === "mystic") {
      summary = "숨겨진 의미 탐색 및 신비로운 해석";
      actions = ["맥락 추론", "미스터리 분석"];
    }
    
    return {
      id: personaId,
      role: profile.role,
      tone: profile.tone,
      reason,
      summary,
      actions
    };
  });
  
  return {
    postId,
    personas
  };
}
