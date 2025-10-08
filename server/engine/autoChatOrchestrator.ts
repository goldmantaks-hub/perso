import { analyzeSentimentFromContent, inferTonesFromContent, detectSubjects, inferContexts } from '../api/analyze.js';
import { generatePersonaLine } from './llm.js';
import { similarity } from './textSim.js';
import { DEFAULT_AUTO_CHAT_POLICY } from './policies.js';
import { PersonaPlan } from './types.js';
import { persoRoomManager } from './persoRoom.js';

export class AutoChatOrchestrator {
  private roomId: string;
  private policy = DEFAULT_AUTO_CHAT_POLICY;
  private lastBurstAt = 0;
  private personaCooldown: Map<string, number> = new Map();

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  async runBurst(trigger: 'post_created' | 'user_message' | 'idle_tick') {
    const now = Date.now();
    if (now - this.lastBurstAt < this.policy.minSecondsBetweenBursts * 1000) {
      console.log(`[AUTO CHAT] Skipping burst for ${this.roomId} - too soon (${Math.floor((now - this.lastBurstAt) / 1000)}s ago)`);
      return;
    }
    this.lastBurstAt = now;

    const room = persoRoomManager.get(this.roomId);
    if (!room || !room.autoChatEnabled) {
      console.log(`[AUTO CHAT] Room ${this.roomId} not found or auto-chat disabled`);
      return;
    }

    const lastMessages = room.getLastMessages(12);
    const lastMessageText = lastMessages.map(m => m.text).join(' ');

    // 컨텍스트 분석
    const sentiment = analyzeSentimentFromContent(lastMessageText);
    const tones = inferTonesFromContent(lastMessageText, sentiment);
    const subjects = detectSubjects(lastMessageText, undefined);
    const contexts = inferContexts(lastMessageText, subjects, tones);

    const ctx = {
      subjects: subjects.map(s => typeof s === 'string' ? s : s.kind || String(s)),
      contexts,
      tones,
      sentiment
    };

    console.log(`[AUTO CHAT] Starting burst for ${this.roomId} (trigger: ${trigger})`);

    let turns = 0;
    let lastSpeaker: string | null = null;

    while (turns < this.policy.maxTurnsPerBurst) {
      const candidates = await this.planCandidates(room, ctx, lastSpeaker);
      if (candidates.length === 0) {
        console.log(`[AUTO CHAT] No candidates available for turn ${turns + 1}`);
        break;
      }

      const speaker = this.selectSpeaker(candidates, lastSpeaker);
      if (!speaker) {
        console.log(`[AUTO CHAT] No speaker selected for turn ${turns + 1}`);
        break;
      }

      const text = await generatePersonaLine({
        personaId: speaker.personaId,
        context: ctx,
        roomMessages: room.getLastMessages(12),
        intent: speaker.intent,
        targetPersonaId: speaker.targetPersonaId,
      });

      const prev = room.getLastMessages(6).map(m => m.text).join('\n');
      const sim = similarity(prev, text);
      if (sim >= this.policy.similarityThreshold) {
        console.log(`[AUTO CHAT] Message too similar (${sim.toFixed(2)}), skipping: "${text}"`);
        this.setCooldown(speaker.personaId);
        continue;
      }

      room.addMessage({
        personaId: speaker.personaId,
        text,
        createdAt: new Date()
      });

      console.log(`[AUTO CHAT] ${speaker.personaId} (${speaker.intent}): ${text}`);

      this.setCooldown(speaker.personaId);
      lastSpeaker = speaker.personaId;
      turns++;

      if (this.exceedsConsecutiveLimit(room, lastSpeaker)) {
        console.log(`[AUTO CHAT] Consecutive limit exceeded for ${lastSpeaker}`);
        break;
      }
    }

    console.log(`[AUTO CHAT] Burst complete for ${this.roomId}: ${turns} turns`);
  }

  private async planCandidates(room: any, ctx: any, lastSpeaker: string | null): Promise<PersonaPlan[]> {
    const personas = room.getActivePersonas();
    const now = Date.now();
    const plans: PersonaPlan[] = [];

    for (const p of personas) {
      const until = this.personaCooldown.get(p.id) ?? 0;
      if (until > now) {
        console.log(`[AUTO CHAT] ${p.id} on cooldown until ${new Date(until).toISOString()}`);
        continue;
      }
      if (lastSpeaker === p.id) {
        console.log(`[AUTO CHAT] ${p.id} was last speaker, skipping`);
        continue;
      }

      const intent = this.pickIntent(ctx);
      const target = this.pickTarget(room, p.id);

      const novelty = Math.random();
      const relevance = Math.random();
      const energy = Math.random();

      if (relevance + energy + novelty > 1.2) {
        plans.push({
          personaId: p.id,
          intent,
          targetPersonaId: target,
          topicTags: ctx.subjects.slice(0, 3),
          novelty,
          relevance,
          energy,
          reason: 'heuristic v1'
        });
      }
    }

    const sorted = plans.sort((a, b) =>
      (b.relevance * 0.45 + b.energy * 0.35 + b.novelty * 0.2) -
      (a.relevance * 0.45 + a.energy * 0.35 + a.novelty * 0.2)
    ).slice(0, 2);

    console.log(`[AUTO CHAT] Generated ${sorted.length} candidate plans from ${personas.length} personas`);
    return sorted;
  }

  private selectSpeaker(plans: PersonaPlan[], lastSpeaker: string | null): PersonaPlan | null {
    const selected = plans.find(p => p.personaId !== lastSpeaker) ?? null;
    if (selected) {
      console.log(`[AUTO CHAT] Selected ${selected.personaId} with intent ${selected.intent}`);
    }
    return selected;
  }

  private setCooldown(personaId: string) {
    const until = Date.now() + DEFAULT_AUTO_CHAT_POLICY.perPersonaCooldownSec * 1000;
    this.personaCooldown.set(personaId, until);
    console.log(`[AUTO CHAT] Set cooldown for ${personaId} until ${new Date(until).toISOString()}`);
  }

  private exceedsConsecutiveLimit(room: any, personaId: string): boolean {
    const last = room.getLastMessages(DEFAULT_AUTO_CHAT_POLICY.maxConsecutiveBySame);
    const exceeds = last.length > 0 && last.every((m: any) => m.personaId === personaId);
    return exceeds;
  }

  private pickIntent(ctx: any): PersonaPlan['intent'] {
    const sentimentScore = ctx.sentiment.positive - ctx.sentiment.negative;
    if (sentimentScore > 0) {
      return Math.random() > 0.5 ? 'ask' : 'share';
    } else {
      return Math.random() > 0.5 ? 'disagree' : 'meta';
    }
  }

  private pickTarget(room: any, selfId: string): string | undefined {
    const others = room.getActivePersonas().map((x: any) => x.id).filter((id: string) => id !== selfId);
    return others.length ? others[Math.floor(Math.random() * others.length)] : undefined;
  }
}
