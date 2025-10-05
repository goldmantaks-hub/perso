import { Request, Response } from 'express';
import { computePersonaDeltas } from '../engine/computePersonaDeltas.js';

export async function analyzeSentiment(req: Request, res: Response) {
  try {
    const { content, media } = req.body;
    
    let positive = Math.random();
    let negative = Math.random();
    let neutral = Math.random();
    
    const total = positive + negative + neutral;
    positive = positive / total;
    negative = negative / total;
    neutral = neutral / total;
    
    const sentiment = {
      positive: Math.max(0, Math.min(1, positive)),
      neutral: Math.max(0, Math.min(1, neutral)),
      negative: Math.max(0, Math.min(1, negative)),
    };
    
    const tones: string[] = [];
    if (positive > 0.5) tones.push('joyful');
    if (positive > 0.7) tones.push('optimistic');
    if (negative > 0.4) tones.push('serious');
    if (neutral > 0.5) tones.push('neutral');
    
    const randomTones = ['humorous', 'informative', 'serene', 'nostalgic', 'analytical', 'empathetic'];
    const selectedTone = randomTones[Math.floor(Math.random() * randomTones.length)];
    if (!tones.includes(selectedTone)) {
      tones.push(selectedTone);
    }
    
    const imageScores = media ? {
      aesthetics: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
      quality: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
    } : undefined;
    
    const deltas = computePersonaDeltas({
      sentiment,
      tones,
      imageScores,
    });
    
    const deltaLog = Object.entries(deltas)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)} +${value}`)
      .join(' · ');
    
    if (deltaLog) {
      console.log(`[PERSONA GROWTH] ${deltaLog}`);
    }
    
    res.json({
      sentiment,
      tones,
      imageScores,
      deltas,
      deltaLog: deltaLog || 'No growth'
    });
  } catch (error) {
    console.error('Analyze sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
}

export async function analyzePersonaEffect(req: Request, res: Response) {
  try {
    const { postId, sentiment } = req.body;
    
    res.json({
      personaDeltas: {},
      message: 'Persona effect analysis endpoint - to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze persona effect' });
  }
}
