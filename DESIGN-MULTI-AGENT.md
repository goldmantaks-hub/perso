# Multi-Agent Autonomous Dialogue System Design

## 1. Current System Analysis

### Existing Structure
- **dialogueOrchestrator.ts**: Random 2-4 persona selection, sequential speech
- **humanBridge.ts**: 1-2 random personas respond to user messages
- **analyze.ts**: Simple mock sentiment analysis
- **9 Personas**: Kai, Espri, Luna, Namu, Milo, Eden, Ava, Rho, Noir

### Limitations
- Static, non-interactive dialogue (broadcast style)
- No inter-persona communication
- Random persona selection without context
- No topic tracking or handover logic

## 2. Multi-Agent Expansion Design

### 2.1 Enhanced Analysis API (/ai/analyze)

**Input:**
```typescript
{
  content: string;
  media?: string;
}
```

**Output:**
```typescript
{
  subjects: Array<{
    kind: 'person' | 'food' | 'place' | 'object' | 'activity';
    confidence: number;
  }>;
  contexts: string[]; // ['travel', 'emotion', 'cuisine', 'tech']
  sentiment: { positive, neutral, negative };
  tones: string[];
}
```

**Implementation:**
- Image analysis: detect people, food, places, objects
- Context inference: travel, emotion, cuisine, technology, art, etc.
- Enhanced sentiment with topic awareness

### 2.2 Circular Dialogue Logic

**Next Speaker Selection Algorithm:**
```typescript
function selectNextSpeaker(
  currentTopics: Array<{topic: string, weight: number}>,
  lastMessage: string,
  lastSpeaker: string,
  activePersonas: PersonaState[],
  conversationHistory: Message[],
  dominantPersona: string | null,
  turnsSinceDominantChange: number
): string {
  // Edge case: single active persona
  const eligiblePersonas = activePersonas.filter(p => p.status === 'active');
  if (eligiblePersonas.length === 1) {
    return eligiblePersonas[0].id;
  }
  
  const scores: Map<string, number> = new Map();
  
  for (const persona of activePersonas) {
    if (persona.status !== 'active') continue;
    if (persona.id === lastSpeaker) continue; // No consecutive turns
    
    let score = 0;
    
    // 1. Topic Affinity (40%)
    for (const {topic, weight} of currentTopics) {
      const affinity = TOPIC_WEIGHTS[topic]?.[persona.id] || 0.3; // default 0.3
      score += affinity * weight * 0.4;
    }
    
    // 2. Recency Penalty (20%)
    const lastTurnIndex = findLastTurnIndex(persona.id, conversationHistory);
    const recency = lastTurnIndex === -1 ? 1.0 : 
      Math.min(1.0, (conversationHistory.length - lastTurnIndex) / 10);
    score += recency * 0.2;
    
    // 3. Dominance Boost (20%)
    if (persona.id === dominantPersona && turnsSinceDominantChange < 5) {
      score += 0.2;
    }
    
    // 4. Participation Fairness (10%)
    const personaTurns = conversationHistory.filter(m => m.persona === persona.id).length;
    const avgParticipation = Math.max(1, conversationHistory.length / activePersonas.length);
    const fairness = Math.max(0, 1.0 - Math.abs(personaTurns - avgParticipation) / (avgParticipation + 0.1));
    score += fairness * 0.1;
    
    // 5. Interest Match (10%) - LLM-based similarity to last message
    const interest = calculateInterestMatch(persona, lastMessage);
    score += interest * 0.1;
    
    scores.set(persona.id, Math.max(0, Math.min(1, score)));
  }
  
  // Normalize scores before selection
  const scoreArray = Array.from(scores.entries());
  const totalScore = scoreArray.reduce((sum, [_, score]) => sum + score, 0);
  
  if (totalScore === 0) {
    // Fallback: random selection if all scores are 0
    return scoreArray[Math.floor(Math.random() * scoreArray.length)][0];
  }
  
  const normalizedScores = new Map(
    scoreArray.map(([id, score]) => [id, score / totalScore])
  );
  
  // Probabilistic selection with temperature
  return weightedRandomSelection(normalizedScores, temperature: 0.7);
}
```

**Topic-Persona Weights (Extended):**
```typescript
const TOPIC_WEIGHTS: Record<string, Record<string, number>> = {
  'emotion': { Espri: 0.9, Luna: 0.6, Milo: 0.4, Eden: 0.5 },
  'tech': { Rho: 0.9, Kai: 0.7, Namu: 0.5 },
  'humor': { Milo: 0.9, Ava: 0.7 },
  'philosophy': { Eden: 0.9, Noir: 0.7, Luna: 0.5 },
  'analysis': { Namu: 0.9, Kai: 0.7, Rho: 0.5 },
  'creativity': { Luna: 0.9, Noir: 0.6, Espri: 0.4 },
  'trend': { Ava: 0.9, Milo: 0.6 },
  'travel': { Kai: 0.7, Ava: 0.6, Luna: 0.5 },
  'cuisine': { Milo: 0.7, Ava: 0.6, Espri: 0.5 },
  'art': { Luna: 0.9, Noir: 0.7, Eden: 0.5 },
  'mystery': { Noir: 0.9, Eden: 0.6 },
  'social': { Ava: 0.8, Espri: 0.7, Milo: 0.6 },
  // Default fallback: all personas get 0.3
}
```

### 2.3 Internal Thinking Log

Each persona will output internal reasoning:
```
[Luna THINKS]: "This conversation is more about scenery than emotion."
[CHAT] Luna: "The sunset you captured has a melancholic beauty..."
```

### 2.4 Dialogue Handover System

**Dominant Persona Rotation:**
```typescript
function checkHandover(
  currentTopics: Array<{topic: string, weight: number}>,
  previousTopics: Array<{topic: string, weight: number}>,
  dominantPersona: string,
  turnsSinceDominantChange: number,
  activePersonas: PersonaState[],
  conversationHistory: Message[]
): { shouldHandover: boolean, newDominant?: string } {
  
  // 1. Topic Change Detection (cosine similarity < 0.5)
  // Guard: handle empty topic vectors
  if (currentTopics.length > 0 && previousTopics.length > 0) {
    const topicSimilarity = cosineSimilarity(currentTopics, previousTopics);
    if (topicSimilarity < 0.5) {
      const newDominant = findBestPersonaForTopics(currentTopics, activePersonas);
      return { shouldHandover: true, newDominant };
    }
  }
  
  // 2. Turn-based rotation (7+ turns with same dominant)
  if (turnsSinceDominantChange >= 7) {
    const candidates = activePersonas.filter(p => p.id !== dominantPersona);
    if (candidates.length > 0) {
      const newDominant = selectByParticipationFairness(candidates, conversationHistory);
      return { shouldHandover: true, newDominant };
    }
  }
  
  return { shouldHandover: false };
}
```

**Topic Shift Detection:**
- Normalize topic weights before comparison: `weights / sum(weights)`
- Compare topic vectors using cosine similarity with safeguards for empty vectors
- Threshold: < 0.5 triggers handover
- New dominant = highest topic affinity persona from active personas
- Fallback: if no topics, maintain current dominant persona

### 2.5 Role-Based Information Expansion

**Pipeline Integration:**
```typescript
async function generatePersonaResponse(
  persona: PersonaProfile,
  context: ConversationContext
): Promise<{ message: string, thinking: string, expandedInfo?: any }> {
  
  // 1. Generate internal thinking
  const thinking = await generateThinking(persona, context);
  console.log(`[${persona.name} THINKS]: ${thinking}`);
  
  // 2. Role-specific information expansion
  let expandedInfo: any = null;
  
  switch (persona.type) {
    case 'knowledge':
      expandedInfo = await mockKnowledgeAPI(context.currentTopics);
      // Example: { facts: [...], sources: [...] }
      break;
      
    case 'analyst':
      expandedInfo = await analyzeUserHistory(context.userId);
      // Example: { patterns: [...], stats: {...} }
      break;
      
    case 'empath':
      expandedInfo = await enhanceSentimentAnalysis(context.lastMessage);
      // Example: { emotions: [...], intensity: 0.8 }
      break;
      
    case 'creative':
      expandedInfo = await generateMetaphors(context.currentTopics);
      // Example: { metaphors: [...], analogies: [...] }
      break;
      
    case 'humor':
      expandedInfo = await generateHumor(context.currentTopics);
      // Example: { jokes: [...], references: [...] }
      break;
  }
  
  // 3. Generate response using thinking + expanded info
  const message = await generateResponse(persona, context, thinking, expandedInfo);
  
  return { message, thinking, expandedInfo };
}
```

**Mock Information Sources:**
- **Knowledge**: Wikipedia summaries, location data, historical facts
- **Analyst**: User activity patterns, interaction statistics
- **Emotional**: Emotion intensity scores, pattern recognition
- **Creative**: Metaphor database, artistic references
- **Humor**: Meme database, cultural references

### 2.6 Join/Leave Events

**Random Events:**
```typescript
function checkJoinLeaveEvents(
  room: PersoRoom,
  allPersonas: PersonaProfile[]
): JoinLeaveEvent[] {
  const events: JoinLeaveEvent[] = [];
  
  // Join check (if < 6 active personas)
  if (room.activePersonas.length < 6) {
    const inactivePersonas = allPersonas.filter(
      p => !room.activePersonas.find(ap => ap.id === p.id)
    );
    
    for (const persona of inactivePersonas) {
      if (Math.random() < persona.joinProbability) {
        const intro = generateAutoIntroduction(persona, room.currentTopics);
        events.push({
          roomId: room.roomId,
          personaId: persona.id,
          eventType: 'join',
          timestamp: Date.now(),
          autoIntroduction: intro
        });
      }
    }
  }
  
  // Leave check (if > 4 active personas)
  if (room.activePersonas.length > 4) {
    for (const personaState of room.activePersonas) {
      const profile = allPersonas.find(p => p.id === personaState.id);
      if (profile && Math.random() < profile.leaveProbability) {
        events.push({
          roomId: room.roomId,
          personaId: personaState.id,
          eventType: 'leave',
          timestamp: Date.now()
        });
      }
    }
  }
  
  return events;
}
```

**System Messages (No Emoji):**
```
"Ava joined the conversation"
"Noir left the conversation"
```

**Auto-introduction:**
```
[SYSTEM] Ava joined the conversation
[CHAT] Ava: "Hey everyone! What's the buzz about?"
```

### 2.7 Data Model Extensions

```typescript
interface PersoRoom {
  roomId: string;
  postId: string;
  activePersonas: PersonaState[];
  currentTopics: Array<{topic: string, weight: number}>;
  previousTopics: Array<{topic: string, weight: number}>;
  dominantPersona: string | null;
  turnsSinceDominantChange: number;
  totalTurns: number;
  createdAt: number;
  lastActivity: number;
}

interface PersonaState {
  id: string;
  status: 'active' | 'idle' | 'joining' | 'leaving';
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
}

interface ConversationMessage {
  id: string;
  roomId: string;
  type: 'chat' | 'thought' | 'system' | 'user';
  persona?: string; // null for system/user messages
  message: string;
  thinking?: string; // Internal thought (for chat messages)
  metadata?: {
    topics?: string[];
    sentiment?: any;
    eventType?: 'join' | 'leave';
  };
  timestamp: number;
}

interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  type: string; // knowledge, empath, etc.
  tone: string;
  style: string;
  specialty: string[];
  topicWeights: Record<string, number>;
  joinProbability: number; // 0.1 default
  leaveProbability: number; // 0.05 default
}

interface JoinLeaveEvent {
  roomId: string;
  personaId: string;
  eventType: 'join' | 'leave';
  timestamp: number;
  autoIntroduction?: string; // For join events
}
```

### 2.8 UI Enhancements

1. **Active Personas Display:**
   - Avatar row showing current participants
   - Entry/exit animations

2. **Persona-specific Colors:**
   - Kai: Blue
   - Espri: Pink
   - Luna: Purple
   - Milo: Yellow
   - Etc.

3. **Join/Leave Animations:**
   - Fade in/out effects
   - System message display

4. **Emotion Bar:**
   - Maintain existing sentiment visualization

## 3. Implementation Plan

### Phase 1: Analysis Enhancement
**Files:** `server/api/analyze.ts`
- [ ] Extend analyzeSentiment to return `subjects` array
- [ ] Add `inferContexts()` to detect topics (travel, cuisine, tech, etc.)
- [ ] Return `{subjects, contexts, sentiment, tones}`
- **Test:** POST /api/ai/analyze returns subjects + contexts

### Phase 2: Room & State Management
**Files:** `server/engine/persoRoom.ts` (new)
- [ ] Create PersoRoom class with state management
- [ ] Implement PersonaState tracking (active/idle/joining/leaving)
- [ ] Add room creation/cleanup logic
- **Test:** Room creation and persona state transitions work

### Phase 3: Circular Dialogue Core
**Files:** `server/engine/multiAgentOrchestrator.ts` (new)
- [ ] Implement `selectNextSpeaker()` with 5-factor scoring
- [ ] Add `TOPIC_WEIGHTS` configuration
- [ ] Create `calculateInterestMatch()` for LLM similarity
- [ ] Implement `weightedRandomSelection()`
- **Test:** Next speaker selection produces diverse, topic-relevant results

### Phase 4: Internal Thinking
**Files:** `server/engine/multiAgentOrchestrator.ts`
- [ ] Add `generateThinking()` function
- [ ] Log `[{persona} THINKS]: {thought}` before each response
- [ ] Include thinking in ConversationMessage
- **Test:** Console shows [THINKS] logs, messages include thinking field

### Phase 5: Handover System
**Files:** `server/engine/handoverManager.ts` (new)
- [ ] Implement `checkHandover()` with cosine similarity
- [ ] Add `findBestPersonaForTopics()`
- [ ] Create topic shift detection logic
- **Test:** Dominant persona changes after topic shift or 7 turns

### Phase 6: Role-Based Info Expansion
**Files:** `server/engine/infoExpansion.ts` (new)
- [ ] Create mock APIs for each role (knowledge, analyst, etc.)
- [ ] Implement `generatePersonaResponse()` pipeline
- [ ] Integrate expanded info into LLM prompts
- **Test:** Each persona type returns role-specific information

### Phase 7: Join/Leave Events
**Files:** `server/engine/joinLeaveManager.ts` (new)
- [ ] Implement `checkJoinLeaveEvents()`
- [ ] Add `generateAutoIntroduction()`
- [ ] Create system message generation
- **Test:** Personas join/leave randomly, intro messages appear

### Phase 8: WebSocket Integration
**Files:** `server/websocket.ts`
- [ ] Update ai:dialogue handler to use multi-agent orchestrator
- [ ] Emit persona state updates
- [ ] Send join/leave system messages
- **Test:** Real-time multi-agent conversation via WebSocket

### Phase 9: UI Enhancement
**Files:** `client/src/pages/...`
- [ ] Add active personas display component
- [ ] Implement persona-specific colors
- [ ] Create join/leave animations
- [ ] Update message bubbles with thinking tooltips
- **Test:** UI shows active personas, colors, and animations

### Phase 10: Integration Testing
**Files:** Test scripts
- [ ] Create end-to-end multi-agent dialogue test
- [ ] Verify autonomous conversation flow
- [ ] Check handover and timing
- [ ] Validate join/leave events
- **Test:** All systems work together seamlessly

## 4. Success Criteria

✅ Personas exchange questions/answers naturally
✅ Topic-based leadership rotation works
✅ Random timing feels human-like
✅ Join/leave events display correctly
✅ Console shows reasoning traces
✅ UI reflects active participants with colors
