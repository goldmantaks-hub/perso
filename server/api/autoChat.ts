import { Router } from 'express';
import { persoRoomManager } from '../engine/persoRoom.js';
import { AutoChatOrchestrator } from '../engine/autoChatOrchestrator.js';

export const autoChat = Router();

autoChat.post('/rooms/:roomId/auto/enable', (req, res) => {
  const room = persoRoomManager.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'room not found' });
  room.autoChatEnabled = true;
  console.log(`[AUTO CHAT API] Enabled auto-chat for room ${req.params.roomId}`);
  res.json({ ok: true, roomId: req.params.roomId, autoChatEnabled: true });
});

autoChat.post('/rooms/:roomId/auto/disable', (req, res) => {
  const room = persoRoomManager.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'room not found' });
  room.autoChatEnabled = false;
  console.log(`[AUTO CHAT API] Disabled auto-chat for room ${req.params.roomId}`);
  res.json({ ok: true, roomId: req.params.roomId, autoChatEnabled: false });
});

autoChat.post('/rooms/:roomId/auto/warmup', async (req, res) => {
  const roomId = req.params.roomId;
  const room = persoRoomManager.get(roomId);
  if (!room) return res.status(404).json({ error: 'room not found' });

  console.log(`[AUTO CHAT API] Warmup triggered for room ${roomId}`);
  const orch = new AutoChatOrchestrator(roomId);
  
  try {
    await orch.runBurst('post_created');
    res.json({ ok: true, roomId, message: 'Warmup burst initiated' });
  } catch (error) {
    console.error(`[AUTO CHAT API] Warmup error for ${roomId}:`, error);
    res.status(500).json({ error: 'warmup failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

autoChat.get('/rooms/:roomId/status', (req, res) => {
  const room = persoRoomManager.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'room not found' });

  res.json({
    roomId: req.params.roomId,
    autoChatEnabled: room.autoChatEnabled,
    lastMessageAt: room.lastMessageAt,
    activePersonas: room.getActivePersonas().length,
    messageCount: room.dialogueHistory.length
  });
});
