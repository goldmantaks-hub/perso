import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertLikeSchema, insertCommentSchema, insertPersoMessageSchema, messages } from "@shared/schema";
import OpenAI from "openai";
import { authenticateToken, optionalAuthenticateToken, generateToken } from "./middleware/auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import type { SocketServer } from "./websocket";
import { analyzeSentiment } from "./api/analyze.js";
import { analyzeSentimentFromContent, inferTonesFromContent, detectSubjects, inferContexts } from "./api/analyze.js";
import { openPerso } from "./api/personas.js";
import { runSeed } from "./seed.js";
import { cleanupPostsWithoutConversations, listPostsWithoutConversations } from "./scripts/cleanup-posts.js";
import { sseBroker } from "./sse/broker";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import fs from "fs/promises";

export async function registerRoutes(app: Express): Promise<Server> {
  // WebSocket 서버 참조를 위한 헬퍼 함수
  const getIO = (): SocketServer | undefined => app.get("io");
  
  // OpenAI 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Multer 설정: 이미지 업로드
  const storage_multer = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${nanoid()}-${Date.now()}${ext}`;
      cb(null, filename);
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다 (JPEG, PNG, GIF, WebP)'));
      }
    }
  });

  // 헬스체크 엔드포인트
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "running"
    });
  });

  // SSE 스트림 엔드포인트: /api/chat/stream?roomId=xxx&clientId=yyy
  app.get("/api/chat/stream", (req, res) => {
    const roomId = String(req.query.roomId || 'default');
    const clientId = String(req.query.clientId || Math.random().toString(36).slice(2));

    console.log(`[SSE] 연결 요청: roomId=${roomId}, clientId=${clientId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.flushHeaders?.();

    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ ok: true, roomId, clientId })}\n\n`);

    sseBroker.addClient(roomId, { id: clientId, res, roomId });

    req.on('close', () => {
      console.log(`[SSE] 연결 종료: roomId=${roomId}, clientId=${clientId}`);
      sseBroker.removeClient(roomId, clientId);
      res.end();
    });

    req.on('error', (error) => {
      console.error(`[SSE] 연결 오류: roomId=${roomId}, clientId=${clientId}`, error);
      sseBroker.removeClient(roomId, clientId);
    });
  });

  // 메시지 히스토리 조회 (페이지네이션 지원): /api/chat/history?roomId=xxx&limit=50&offset=0
  app.get("/api/chat/history", async (req, res) => {
    try {
      const roomId = String(req.query.roomId || 'default');
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
      
      console.log(`[CHAT HISTORY] 요청: roomId=${roomId}, limit=${limit}, offset=${offset}`);
      
      // 대화방 ID로 conversation 찾기
      const conversation = await storage.getConversationByPost(roomId);
      if (!conversation) {
        return res.json({ ok: true, messages: [], total: 0, hasMore: false });
      }
      
      // 메시지 조회 (페이지네이션)
      const messages = await storage.getMessagesByConversation(conversation.id);
      const totalMessages = messages.length;
      const paginatedMessages = messages.slice(offset, offset + limit);
      const hasMore = offset + limit < totalMessages;
      
      // 메시지에 사용자/페르소나 정보 추가
      const messagesWithInfo = await Promise.all(
        paginatedMessages.map(async (msg) => {
          if (msg.senderType === 'persona') {
            const persona = await storage.getPersona(msg.senderId);
            return {
              ...msg,
              isAI: true,
              persona: persona ? {
                id: persona.id,
                name: persona.name,
                image: persona.image,
                owner: await storage.getUser(persona.userId).then(u => u ? {
                  name: u.name,
                  username: u.username
                } : null)
              } : null,
            };
          } else if (msg.senderType === 'user') {
            const user = await storage.getUser(msg.senderId);
            return {
              ...msg,
              isAI: false,
              user: user ? {
                name: user.name,
                username: user.username,
                avatar: user.profileImage
              } : null,
            };
          }
          return msg;
        })
      );
      
      console.log(`[CHAT HISTORY] 응답: ${messagesWithInfo.length}개 메시지, 총 ${totalMessages}개, hasMore=${hasMore}`);
      
      res.json({ 
        ok: true, 
        messages: messagesWithInfo,
        total: totalMessages,
        hasMore,
        offset,
        limit
      });
    } catch (error) {
      console.error('[CHAT HISTORY] 오류:', error);
      res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // 관리자 API: 소유주 페르소나 재초대
  app.post("/api/admin/reinvite-owner/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      
      console.log(`[ADMIN] 소유주 페르소나 재초대 요청: ${postId}`);
      
      // 게시물 정보 조회
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ error: "게시물을 찾을 수 없습니다" });
      }
      
      // 게시물 작성자의 페르소나 조회
      const authorPersonas = await storage.getPersonasByUserId(post.authorId);
      if (authorPersonas.length === 0) {
        return res.status(404).json({ error: "작성자의 페르소나를 찾을 수 없습니다" });
      }
      
      const primaryPersona = authorPersonas[0]; // 첫 번째 페르소나 사용
      
      // 대화방 정보 조회
      const conversation = await storage.getConversationByPostId(postId);
      if (!conversation) {
        return res.status(404).json({ error: "대화방을 찾을 수 없습니다" });
      }
      
      // 소유주 페르소나를 참가자로 추가
      await storage.addParticipant({
        conversationId: conversation.id,
        participantType: 'persona',
        participantId: primaryPersona.id,
        role: 'owner'
      });
      
      console.log(`[ADMIN] 소유주 페르소나 재초대 완료: ${primaryPersona.name}`);
      
      res.json({
        success: true,
        message: "소유주 페르소나가 성공적으로 재초대되었습니다",
        persona: {
          id: primaryPersona.id,
          name: primaryPersona.name,
          owner: {
            id: post.authorId,
            name: (await storage.getUser(post.authorId))?.name || 'Unknown'
          }
        }
      });
      
    } catch (error) {
      console.error('[ADMIN] 소유주 페르소나 재초대 오류:', error);
      res.status(500).json({ error: "소유주 페르소나 재초대 중 오류가 발생했습니다" });
    }
  });

  // Mock 로그인 엔드포인트
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "사용자명이 필요합니다" });
      }

      // Mock: 실제 비밀번호 검증 없이 사용자 찾기
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      // JWT 토큰 생성
      const token = generateToken({ 
        userId: user.id, 
        username: user.username 
      });

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "로그인 실패" });
    }
  });

  // POST /api/analyze - 감성 분석 + 페르소나 델타 계산
  app.post("/api/analyze", analyzeSentiment);

  // POST /api/content/analyze - 콘텐츠 특성 분석 (새로운 라우팅 시스템)
  app.post("/api/content/analyze", async (req, res) => {
    try {
      const { content, imageUrl, userId } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "콘텐츠가 필요합니다" });
      }

      const { detectFeatures } = await import('./engine/featureDetector.js');
      const features = await detectFeatures({ content, imageUrl, userId });
      
      res.json(features);
    } catch (error) {
      console.error("Content analyze error:", error);
      res.status(500).json({ error: "콘텐츠 분석 실패" });
    }
  });

  // POST /api/personas/route - 페르소나 라우팅
  app.post("/api/personas/route", async (req, res) => {
    try {
      const { features, postId } = req.body;
      
      if (!features) {
        return res.status(400).json({ error: "특성 데이터가 필요합니다" });
      }

      const { routePersonas, generatePersonaOutput } = await import('./engine/personaRouter.js');
      const routingResult = routePersonas(features);
      const output = generatePersonaOutput(postId || 'unknown', routingResult, features);
      
      res.json({
        routing: {
          selectedPersonas: routingResult.selectedPersonas,
          scores: Object.fromEntries(routingResult.scores),
          reasons: routingResult.reasons
        },
        output
      });
    } catch (error) {
      console.error("Persona routing error:", error);
      res.status(500).json({ error: "페르소나 라우팅 실패" });
    }
  });

  // GET /api/personas/filters - 필터 설정 가져오기
  app.get("/api/personas/filters", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filtersPath = path.join(process.cwd(), 'personaFilters.json');
      const filters = JSON.parse(fs.readFileSync(filtersPath, 'utf-8'));
      res.json(filters);
    } catch (error) {
      console.error("Get filters error:", error);
      res.status(500).json({ error: "필터 설정을 가져오는데 실패했습니다" });
    }
  });

  // POST /api/perso/open - 페르소 오픈
  app.post("/api/perso/open", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
      }

      const { postId, content, sentiment, deltas, personaName } = req.body;
      
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const result = await openPerso({
        userId: req.userId,
        username: user.username,
        postId,
        content,
        sentiment,
        deltas,
        personaName
      });

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          reason: result.reason 
        });
      }

      res.json({
        success: true,
        points: result.points,
        jackpot: result.jackpot,
        growthMultiplier: result.growthMultiplier
      });
    } catch (error) {
      console.error("Perso open error:", error);
      res.status(500).json({ error: "페르소 오픈 실패" });
    }
  });

  // POST /api/ai/analyze - AI 감성 분석 (analyzeSentiment와 동일한 응답)
  app.post("/api/ai/analyze", async (req, res) => {
    await analyzeSentiment(req, res);
  });

  // GET /api/personas - 모든 페르소나 가져오기
  app.get("/api/personas", async (req, res) => {
    try {
      const allPersonas = await storage.getAllPersonas();
      
      // 각 페르소나의 사용자 정보 포함
      const personasWithUsers = await Promise.all(
        allPersonas.map(async (persona) => {
          const user = await storage.getUser(persona.userId);
          return {
            ...persona,
            user: user ? {
              id: user.id,
              username: user.username
            } : null
          };
        })
      );
      
      res.json(personasWithUsers);
    } catch (error) {
      console.error("Get all personas error:", error);
      res.status(500).json({ message: "페르소나 목록을 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona/growth-history - 성장 히스토리 가져오기
  app.get("/api/user/persona/growth-history", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      // DB에서 실제 성장 로그 가져오기
      const growthLogs = await storage.getGrowthLogsByPersona(persona.id, 20);
      
      // UI를 위한 아이콘 매핑
      const statToIcon: Record<string, string> = {
        'Empathy': 'Heart',
        'Humor': 'Smile',
        'Sociability': 'Users',
        'Creativity': 'Sparkles',
        'Knowledge': 'Brain',
      };
      
      const growthHistory = growthLogs.map((log) => ({
        type: 'stat_increase',
        icon: statToIcon[log.stat] || 'TrendingUp',
        title: `${log.stat} 성장`,
        description: `${log.stat} 스탯이 +${log.delta} 증가했습니다 (${log.trigger})`,
        timestamp: log.createdAt.toISOString(),
      }));
      
      res.json(growthHistory);
    } catch (error) {
      console.error("Get growth history error:", error);
      res.status(500).json({ message: "성장 히스토리를 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona/tone - AI 톤 및 스타일 가져오기
  app.get("/api/user/persona/tone", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      res.json({
        tone: persona.tone || '균형잡힌',
        style: persona.style || 'default',
      });
    } catch (error) {
      console.error("Get persona tone error:", error);
      res.status(500).json({ message: "AI 톤을 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona/interactions - 영향력 맵 가져오기
  app.get("/api/user/persona/interactions", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      const interactions = await storage.getPersonaInteractions(persona.id);
      
      // 노드와 링크 형식으로 변환
      const nodes = new Set<string>();
      nodes.add(persona.id);
      
      interactions.forEach(interaction => {
        nodes.add(interaction.fromPersonaId);
        nodes.add(interaction.toPersonaId);
      });
      
      // 각 노드에 대한 페르소나 정보 가져오기
      const allPersonas = await storage.getAllPersonas();
      const personaMap = new Map(allPersonas.map(p => [p.id, p]));
      
      const nodeList = Array.from(nodes).map(id => {
        const p = personaMap.get(id);
        return {
          id,
          name: p?.name || 'Unknown',
          influence: (p?.empathy || 0) + (p?.sociability || 0) + (p?.creativity || 0),
        };
      });
      
      const links = interactions.map(interaction => ({
        source: interaction.fromPersonaId,
        target: interaction.toPersonaId,
        strength: interaction.strength,
        type: interaction.interactionType,
      }));
      
      res.json({ nodes: nodeList, links });
    } catch (error) {
      console.error("Get persona interactions error:", error);
      res.status(500).json({ message: "영향력 맵을 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona/emotion-timeline - 감정 타임라인 가져오기
  app.get("/api/user/persona/emotion-timeline", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      // DB에서 최근 7일간 감정 로그 가져오기
      const emotionLogs = await storage.getEmotionLogsByPersona(persona.id, 7);
      
      console.log(`[EMOTION TIMELINE] Loaded ${emotionLogs.length} emotion logs from DB for persona ${persona.id}`);
      
      // 날짜별로 그룹화하여 평균 계산
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      const today = new Date();
      const emotionTimeline = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayOfWeek = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        
        // 해당 날짜의 로그 필터링
        const dayLogs = emotionLogs.filter(log => {
          const logDate = new Date(log.recordedAt);
          return logDate.toDateString() === date.toDateString();
        });
        
        if (dayLogs.length > 0) {
          // 평균 감정 점수 계산
          const avgValue = Math.round(
            dayLogs.reduce((sum, log) => sum + log.value, 0) / dayLogs.length
          );
          
          // 가장 빈번한 감정 찾기
          const emotionCounts: { [key: string]: number } = {};
          dayLogs.forEach(log => {
            emotionCounts[log.emotion] = (emotionCounts[log.emotion] || 0) + 1;
          });
          const mostFrequentEmotion = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
          
          emotionTimeline.push({
            day: dayOfWeek,
            value: avgValue,
            emotion: mostFrequentEmotion,
            icon: 'Smile'
          });
        } else {
          // 데이터가 없으면 기본값
          emotionTimeline.push({
            day: dayOfWeek,
            value: 5,
            emotion: '보통',
            icon: 'Smile'
          });
        }
      }
      
      console.log(`[EMOTION TIMELINE] Returning ${emotionTimeline.length} days of emotion data`);
      res.json(emotionTimeline);
    } catch (error) {
      console.error("Get emotion timeline error:", error);
      res.status(500).json({ message: "감정 타임라인을 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona/growth-timeline - 성장 타임라인 가져오기 (7일간)
  app.get("/api/user/persona/growth-timeline", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      // DB에서 최근 7일간 성장 로그 가져오기
      const growthLogs = await storage.getGrowthLogsByPersona(persona.id);
      
      console.log(`[GROWTH TIMELINE] Loaded ${growthLogs.length} growth logs from DB for persona ${persona.id}`);
      
      // 날짜별로 그룹화하여 총 성장량 계산
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      const today = new Date();
      const growthTimeline = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayOfWeek = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        
        // 해당 날짜의 로그 필터링
        const dayLogs = growthLogs.filter(log => {
          const logDate = new Date(log.createdAt);
          return logDate.toDateString() === date.toDateString();
        });
        
        if (dayLogs.length > 0) {
          // 총 성장량 계산 (모든 delta 합산)
          const totalGrowth = dayLogs.reduce((sum, log) => {
            return sum + log.delta;
          }, 0);
          
          growthTimeline.push({
            day: dayOfWeek,
            value: totalGrowth,
          });
        } else {
          // 데이터가 없으면 0
          growthTimeline.push({
            day: dayOfWeek,
            value: 0,
          });
        }
      }
      
      console.log(`[GROWTH TIMELINE] Returning ${growthTimeline.length} days of growth data`);
      res.json(growthTimeline);
    } catch (error) {
      console.error("Get growth timeline error:", error);
      res.status(500).json({ message: "성장 타임라인을 가져오는데 실패했습니다" });
    }
  });

  // POST /api/user/persona/clear-memory - 페르소나 메모리 초기화
  app.post("/api/user/persona/clear-memory", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      const { clearPersonaMemory } = await import('./memory/personaMemory.js');
      clearPersonaMemory(persona.id);
      
      res.json({ success: true, message: "성장 히스토리가 초기화되었습니다" });
    } catch (error) {
      console.error("Clear persona memory error:", error);
      res.status(500).json({ message: "메모리 초기화에 실패했습니다" });
    }
  });

  // GET /api/user - 현재 사용자 정보 가져오기
  app.get("/api/user", authenticateToken, async (req, res) => {
    try {
      console.log('[AUTH] Authorization header:', req.headers.authorization?.substring(0, 50) + '...');
      console.log('[AUTH] Token:', req.headers.authorization ? 'exists' : 'missing');
      
      if (!req.userId) {
        console.log('[AUTH] No userId in request');
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      console.log('[AUTH] Token verified for user:', req.userId);
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다" });
      }
      res.json(user);
    } catch (error) {
      console.error('[AUTH] Get user error:', error);
      res.status(500).json({ message: "사용자 정보를 가져오는데 실패했습니다" });
    }
  });

  // GET /api/user/persona - 현재 사용자의 페르소나 가져오기
  app.get("/api/user/persona", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const persona = await storage.getPersonaByUserId(req.userId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }
      res.json(persona);
    } catch (error) {
      res.status(500).json({ message: "페르소나를 가져오는데 실패했습니다" });
    }
  });

  // POST /api/upload/image - 이미지 업로드
  app.post("/api/upload/image", authenticateToken, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "이미지 파일이 없습니다" });
      }

      // 업로드된 파일의 URL 생성
      const imageUrl = `/uploads/${req.file.filename}`;
      
      console.log(`[IMAGE UPLOAD] 이미지 업로드 성공: ${imageUrl}`);
      
      res.json({ 
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('[IMAGE UPLOAD] 이미지 업로드 실패:', error);
      res.status(500).json({ message: "이미지 업로드에 실패했습니다" });
    }
  });

  // GET /api/posts - 모든 게시물 가져오기
  app.get("/api/posts", optionalAuthenticateToken, async (req, res) => {
    try {
      const allPosts = await storage.getPosts();
      
      // 각 게시물의 사용자 정보, 페르소나 정보, 통계 가져오기
      const postsWithStats = await Promise.all(
        allPosts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          const persona = await storage.getPersonaByUserId(post.userId);
          const likesCount = await storage.getLikesByPost(post.id);
          const comments = await storage.getCommentsByPost(post.id);
          const isLiked = req.userId ? await storage.checkUserLike(post.id, req.userId) : false;
          
          // 새 스키마에서 conversation 가져오기
          const conversation = await storage.getConversationByPost(post.id);
          const messages = conversation 
            ? await storage.getMessagesByConversation(conversation.id)
            : [];
          
          // 시스템 메시지(join/leave)를 제외한 실제 채팅 메시지만 필터링
          const chatMessages = messages.filter(msg => 
            msg.messageType !== 'join' && 
            msg.messageType !== 'leave' && 
            msg.senderType !== 'system'
          );
          
          // 최근 메시지 3개 가져오기 (최신순으로 정렬 후 3개 선택)
          const sortedMessages = [...chatMessages].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const recentMessages = await Promise.all(
            sortedMessages.slice(0, 3).map(async (msg) => {
              if (msg.senderType === 'persona') {
                const msgPersona = await storage.getPersona(msg.senderId);
                return {
                  ...msg,
                  isAI: true,
                  personaId: msg.senderId,
                  persona: msgPersona ? {
                    name: msgPersona.name,
                    image: msgPersona.image,
                  } : null,
                };
              } else if (msg.senderType === 'user') {
                const msgUser = await storage.getUser(msg.senderId);
                return {
                  ...msg,
                  isAI: false,
                  userId: msg.senderId,
                  user: msgUser ? {
                    name: msgUser.name,
                    username: msgUser.username,
                    profileImage: msgUser.profileImage,
                  } : null,
                };
              } else {
                // 기타 메시지 타입
                return {
                  ...msg,
                  isAI: false,
                  userId: null,
                };
              }
            })
          );
          
          return {
            ...post,
            author: {
              id: user?.id,
              name: user?.name,
              username: user?.username,
              profileImage: user?.profileImage,
            },
            persona: persona ? {
              id: persona.id,
              name: persona.name,
              image: persona.image,
            } : null,
            likesCount,
            commentsCount: comments.length,
            isLiked,
            hasPerso: chatMessages.length > 0,
            recentMessages: recentMessages,
          };
        })
      );
      
      res.json(postsWithStats);
    } catch (error) {
      res.status(500).json({ message: "게시물을 가져오는데 실패했습니다" });
    }
  });

  // POST /api/posts - 게시물 생성
  app.post("/api/posts", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      
      const post = await storage.createPost(validatedData);
      
      // 게시물 생성 후 자동으로 Room 생성 및 페르소나 대화 시작
      console.log(`[POST CREATE] Starting automatic persona conversation for post ${post.id}`);
      
      // 백그라운드에서 Room 생성 및 대화 시작 (응답을 기다리지 않음)
      setTimeout(async () => {
        try {
          const { persoRoomManager } = await import('./engine/persoRoom.js');
          const { onPostCreated } = await import('./engine/autoTick.js');
          
          // Room이 없으면 생성
          let room = persoRoomManager.getRoomByPostId(post.id);
          if (!room) {
            console.log(`[POST CREATE] Creating new Room for post ${post.id}`);
            
            // DB에서 랜덤 페르소나 선택 (3-4개)
            const allPersonas = await storage.getAllPersonas();
            if (allPersonas.length > 0) {
              const personaCount = Math.min(
                Math.floor(Math.random() * 2) + 3, // 3-4개
                allPersonas.length
              );
              const selectedPersonas = allPersonas
                .sort(() => Math.random() - 0.5)
                .slice(0, personaCount);
              
              const personaIds = selectedPersonas.map(p => p.id);
              const personaNames = selectedPersonas.map(p => p.name);
              
              // Post 내용 및 이미지 분석하여 contexts 생성
              const postContent = post.description || post.title;
              const sentiment = analyzeSentimentFromContent(postContent);
              const { subjects, imageAnalysis } = await detectSubjects(postContent, post.image || undefined);
              const contexts = inferContexts(postContent, subjects, []);
              
              // 이미지 분석 결과를 postContent에 추가하여 대화 context에 포함
              const enrichedPostContent = imageAnalysis
                ? `${postContent}\n\n[이미지: ${imageAnalysis.description}]`
                : postContent;
              
              if (imageAnalysis) {
                console.log(`[POST CREATE] Image analysis: ${imageAnalysis.description}`);
                console.log(`[POST CREATE] Objects detected: ${imageAnalysis.objects.join(', ')}`);
              }
              
              room = persoRoomManager.createRoom(post.id, enrichedPostContent, personaIds, contexts);
              console.log(`[POST CREATE] Created Room ${room.roomId} with personas: ${personaNames.join(', ')}`);
              
              // Conversation 생성 및 페르소나 참가자 추가
              const conversation = await storage.createConversation({
                scopeType: 'post',
                scopeId: post.id,
                title: null,
                createdByType: 'system',
                createdById: 'auto-chat',
              });
              
              // Room에 conversationId 설정
              room.setConversationId(conversation.id);
              
              // 페르소나를 conversation participants에 추가
              for (const personaId of personaIds) {
                await storage.addParticipant({
                  conversationId: conversation.id,
                  participantType: 'persona',
                  participantId: personaId,
                  role: 'member',
                });
              }
              
              console.log(`[POST CREATE] Created conversation ${conversation.id} with ${personaIds.length} personas`);
              
              // 자동 대화 시작
              onPostCreated(room.roomId);
            } else {
              console.error(`[POST CREATE] No personas available for room creation`);
            }
          } else {
            console.log(`[POST CREATE] Room already exists for post ${post.id}, triggering conversation`);
            onPostCreated(room.roomId);
          }
        } catch (error) {
          console.error(`[POST CREATE] Error starting conversation for post ${post.id}:`, error);
        }
      }, 1000); // 1초 후 시작
      
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "게시물 생성에 실패했습니다" });
    }
  });

  // POST /api/posts/:postId/start-conversation - 기존 게시물에 대해 자동 대화 시작
  app.post("/api/posts/:postId/start-conversation", authenticateToken, async (req, res) => {
    try {
      const { postId } = req.params;
      
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      // 게시물 가져오기
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }
      
      console.log(`[MANUAL CONVERSATION] Starting manual persona conversation for post ${postId}`);
      
      // 백그라운드에서 대화 시작
      setTimeout(async () => {
        try {
          const postContent = post.description || post.title;
          
          // 게시물 분석
          const sentiment = analyzeSentimentFromContent(postContent);
          const tones = inferTonesFromContent(postContent, sentiment);
          const { subjects } = await detectSubjects(postContent, undefined);
          const contexts = inferContexts(postContent, subjects, tones);
          
          const analysis = {
            sentiment,
            tones,
            subjects,
            contexts
          };
          
          // Multi-agent 대화 오케스트레이션 import
          const { multiAgentDialogueOrchestrator } = await import('./engine/multiAgentDialogueOrchestrator.js');
          
          // 자동 대화 시작
          const result = await multiAgentDialogueOrchestrator(
            {
              id: post.id,
              content: postContent,
              userId: post.userId
            },
            analysis
          );
          
          console.log(`[MANUAL CONVERSATION] Generated ${result.messages.length} initial messages for post ${post.id}`);
          
          // 자동 대화 트리거
          const { onPostCreated } = await import('./engine/autoTick.js');
          onPostCreated(result.roomId);
          console.log(`[MANUAL CONVERSATION] Triggered auto-chat for room ${result.roomId}`);
          
          // WebSocket으로 결과 브로드캐스트
          const io = getIO();
          if (io) {
            io.emit('conversation:auto-started', {
              postId: post.id,
              roomId: result.roomId,
              messageCount: result.messages.length,
              eventCount: result.joinLeaveEvents.length
            });
            
            console.log(`[MANUAL CONVERSATION] Broadcasted auto-started event for post ${post.id}`);
          }
          
        } catch (error) {
          console.error(`[MANUAL CONVERSATION] Error starting conversation for post ${postId}:`, error);
        }
      }, 1000);
      
      res.json({ 
        message: "대화 시작 요청이 처리되었습니다",
        postId: postId
      });
      
    } catch (error) {
      console.error('[MANUAL CONVERSATION ERROR]', error);
      res.status(500).json({ message: "대화 시작에 실패했습니다" });
    }
  });

  // POST /api/likes - 좋아요 토글
  app.post("/api/likes", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const { postId } = req.body;
      
      const isLiked = await storage.checkUserLike(postId, req.userId);
      
      if (isLiked) {
        await storage.deleteLike(postId, req.userId);
        res.json({ liked: false });
      } else {
        await storage.createLike({ postId, userId: req.userId });
        res.json({ liked: true });
      }
    } catch (error) {
      res.status(500).json({ message: "좋아요 처리에 실패했습니다" });
    }
  });

  // GET /api/posts/:id/comments - 댓글 가져오기
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "댓글을 가져오는데 실패했습니다" });
    }
  });

  // POST /api/comments - 댓글 작성
  app.post("/api/comments", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      
      const comment = await storage.createComment(validatedData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "댓글 작성에 실패했습니다" });
    }
  });

  // GET /api/perso/:postId/messages - 페르소 메시지 가져오기 (새 스키마)
  app.get("/api/perso/:postId/messages", async (req, res) => {
    console.log(`[API REQUEST] GET /api/perso/:postId/messages - postId: ${req.params.postId}`);
    try {
      const postId = req.params.postId;
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }

      let conversation = await storage.getConversationByPost(postId);
      console.log(`[API] Existing conversation for post ${postId}:`, conversation ? conversation.id : 'None');
      
      // Conversation이 없으면 자동 생성 및 AI 매칭
      if (!conversation) {
        console.log(`[API] Creating new conversation for post ${postId}`);
        // 게시물 작성자의 페르소나 가져오기
        const authorPersona = await storage.getPersonaByUserId(post.userId);

        // 1. Conversation 생성
        conversation = await storage.createConversationForPost(
          postId,
          'persona',
          authorPersona?.id || 'system'
        );
        console.log(`[API] Created conversation: ${conversation.id} for post: ${postId}`);

        // 2. 작성자 페르소나는 자동으로 추가하지 않음 (페르소나들은 독립적으로 입장/퇴장)
        // 사용자는 WebSocket join 시 추가됨

        // 3. 페르소나들은 자동으로 참가자로 추가하지 않음 (독립적으로 입장/퇴장)
        // 페르소나들은 joinLeaveManager에 의해 확률적으로 입장/퇴장함

        // 4. 초기 대화 생성은 생략 (페르소나들이 독립적으로 입장할 때 생성됨)
        // 페르소나들은 joinLeaveManager에 의해 확률적으로 입장하고 대화를 시작함
      }
      
      // 메시지 로딩 최적화: 최대 50개만 가져오기
      const messages = await storage.getMessagesByConversation(conversation.id, req.userId);
      const participants = await storage.getParticipantsByConversation(conversation.id);
      
      console.log(`[API] Loaded ${messages.length} messages for conversation ${conversation.id}`);
      console.log(`[API] Messages details:`, messages.map(msg => ({
        id: msg.id,
        content: msg.content?.substring(0, 30) + '...',
        senderType: msg.senderType,
        createdAt: msg.createdAt,
        meta: msg.meta,
        visibleAt: msg.visibleAt
      })));
      
      // 성능 최적화: 불필요한 로그 제거
      console.log(`[API] Conversation ${conversation.id} participants:`, participants.length);
      
      // 각 메시지에 사용자/페르소나 정보 추가 (최적화된 버전)
      const messagesWithInfo = await Promise.all(
        messages.map(async (msg) => {
          if (msg.senderType === 'persona') {
            const persona = await storage.getPersona(msg.senderId);
            let ownerInfo = null;
            
            if (persona) {
              // 페르소나 소유자 정보 가져오기
              const owner = await storage.getUser(persona.userId);
              if (owner) {
                ownerInfo = {
                  name: owner.name,
                  username: owner.username
                };
              }
            }
            
            return {
              ...msg,
              isAI: true,
              personaId: msg.senderId,
              persona: persona ? {
                name: persona.name,
                image: persona.image,
                owner: ownerInfo
              } : null,
            };
          } else if (msg.senderType === 'user') {
            const user = await storage.getUser(msg.senderId);
            return {
              ...msg,
              isAI: false,
              userId: msg.senderId,
              user: user ? {
                name: user.name,
                username: user.username,
                avatar: user.profileImage,
              } : null,
            };
            } else {
              // 시스템 메시지 처리 - 발신자 정보 추가 (최적화)
              let senderInfo = null;
              
              if (msg.senderType === 'system' && msg.senderId && msg.senderId !== 'system') {
                // senderId가 실제 사용자나 페르소나 ID인 경우
                try {
                  const user = await storage.getUser(msg.senderId);
                  if (user) {
                    senderInfo = {
                      user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        avatar: user.profileImage,
                      }
                    };
                  } else {
                    const persona = await storage.getPersona(msg.senderId);
                    if (persona) {
                      senderInfo = {
                        persona: {
                          id: persona.id,
                          name: persona.name,
                          image: persona.image,
                        }
                      };
                    }
                  }
                } catch (error) {
                  // 에러 무시로 성능 향상
                }
              }
            
            return {
              ...msg,
              isAI: false,
              userId: null, // 시스템 메시지는 userId 설정하지 않음
              ...senderInfo,
              content: msg.content,
            };
          }
        })
      );
      
      // participants 정보 조합 (사용자 + 페르소나)
      const participantsWithInfo = await Promise.all(
        participants.map(async (participant) => {
          if (participant.participantType === 'persona') {
            const persona = await storage.getPersona(participant.participantId);
            if (!persona) return null;
            const user = await storage.getUser(persona.userId);
            return {
              id: participant.id,
              type: 'persona' as const,
              personaId: persona.id,
              personaName: persona.name,
              personaImage: persona.image,
              userId: user?.id,
              username: user?.username,
            };
          } else if (participant.participantType === 'user') {
            const user = await storage.getUser(participant.participantId);
            if (!user) return null;
            return {
              id: participant.id,
              type: 'user' as const,
              userId: user.id,
              username: user.username,
              name: user.name,
              profileImage: user.profileImage,
            };
          }
          return null;
        })
      );
      
      // 주도 페르소나 결정 (가장 최근에 메시지를 보낸 페르소나)
      const recentPersonaMessage = messagesWithInfo
        .filter(msg => msg.senderType === 'persona')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const dominantPersonaId = recentPersonaMessage?.senderId || participantsWithInfo
        .filter(p => p?.type === 'persona')[0]?.personaId;

      // 토픽 분석 (메시지 내용에서 토픽 추출)
      const personaMessages = messagesWithInfo.filter(msg => msg.senderType === 'persona');
      
      // 간단한 토픽 분석 함수
      const analyzeTopics = (messages: any[]) => {
        try {
          const topicKeywords = {
            '기술': ['개발', 'AI', '기술', '컨퍼런스', '프로그래밍', '코딩'],
            '여행': ['여행', '휴가', '여행지', '관광', '바다', '산'],
            '음식': ['음식', '요리', '맛집', '레스토랑', '베이킹', '케이크'],
            '패션': ['패션', '스타일', '옷', '트렌드', '뷰티', '메이크업'],
            '일상': ['일상', '생활', '하루', '친구', '가족', '취미']
          };
          
          const topicCounts: Record<string, number> = {};
          
          messages.forEach(msg => {
            const content = msg.content?.toLowerCase() || '';
            Object.entries(topicKeywords).forEach(([topic, keywords]) => {
              keywords.forEach(keyword => {
                if (content.includes(keyword.toLowerCase())) {
                  topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                }
              });
            });
          });
          
          const totalMentions = Object.values(topicCounts).reduce((sum, count) => sum + count, 0);
          
          return Object.entries(topicCounts)
            .map(([topic, count]) => ({
              topic,
              weight: totalMentions > 0 ? count / totalMentions : 0
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3); // 상위 3개 토픽만
        } catch (error) {
          console.error('토픽 분석 에러:', error);
          return [];
        }
      };
      
      const currentTopics = analyzeTopics(personaMessages);
      
      // 총 턴 수 계산
      const totalTurns = personaMessages.length;

      res.json({
        messages: messagesWithInfo,
        participants: participantsWithInfo.filter((p): p is NonNullable<typeof p> => p !== null),
        post: post ? {
          id: post.id,
          title: post.title,
          description: post.description,
          tags: post.tags,
          sentiment: post.sentiment,
        } : null,
        conversation: {
          id: conversation.id,
        },
        dominantPersona: dominantPersonaId,
        currentTopics: currentTopics,
        totalTurns: totalTurns,
      });
    } catch (error) {
      console.error("Get perso messages error:", error);
      console.error("Error details:", {
        postId: req.params.postId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        message: "메시지를 가져오는데 실패했습니다",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/perso/:postId/messages - 페르소 메시지 작성 (새 스키마)
  app.post("/api/perso/:postId/messages", authenticateToken, async (req, res) => {
    const requestStartTime = Date.now();
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const { content, isAI, personaId, thinking } = req.body;
      const postId = req.params.postId;
      
      // Conversation 가져오기 또는 생성
      let conversation = await storage.getConversationByPost(postId);
      
      if (!conversation) {
        const senderType = isAI ? 'persona' : 'user';
        const senderId = isAI ? personaId : req.userId;
        conversation = await storage.createConversationForPost(postId, senderType, senderId);
      }
      
      const senderType = isAI ? 'persona' : 'user';
      const senderId = isAI ? personaId : req.userId;
      
      // 참가자 자동 추가 (이미 있으면 unique constraint로 무시됨)
      try {
        await storage.addParticipant({
          conversationId: conversation.id,
          participantType: senderType,
          participantId: senderId,
          role: 'member',
        });
      } catch (error) {
        // Unique constraint 에러는 무시 (이미 참가자임)
      }
      
      // 임시 메시지 ID 생성 (클라이언트에게 즉시 반환)
      const now = new Date();
      const tempMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempMessage: any = {
        id: tempMessageId,
        conversationId: conversation.id,
        senderType,
        senderId,
        content,
        messageType: 'text',
        createdAt: now.toISOString(), // 동일한 타임스탬프 사용
      };
      
      if (thinking) {
        tempMessage.thinking = thinking;
      }
      
      // SSE로 즉시 브로드캐스트
      let messageWithInfo: any = { ...tempMessage };
      
      if (senderType === 'persona') {
        const persona = await storage.getPersona(senderId);
        messageWithInfo.isAI = true;
        messageWithInfo.personaId = senderId;
        messageWithInfo.persona = persona ? {
          id: persona.id,
          name: persona.name,
          image: persona.image,
        } : null;
      } else {
        const user = await storage.getUser(senderId);
        messageWithInfo.isAI = false;
        messageWithInfo.userId = senderId;
        messageWithInfo.user = user ? {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage,
        } : null;
      }
      
      // SSE 브로드캐스트
      sseBroker.broadcast(`conversation:${conversation.id}`, 'message:new', messageWithInfo);
      
      // 기존 WebSocket도 유지 (호환성)
      const io = getIO();
      if (io) {
        io.to(`conversation:${conversation.id}`).emit('message:new', messageWithInfo);
      }
      
      // DB 저장을 위한 메시지 데이터 (순서 보장을 위해 명시적 타임스탬프)
      const messageData: any = {
        conversationId: conversation.id,
        senderType,
        senderId,
        content,
        messageType: 'text',
        createdAt: now, // 동일한 타임스탬프로 순서 보장
      };
      
      if (thinking) {
        messageData.thinking = thinking;
      }

      // 기본 메타데이터 설정 (빠른 저장을 위해)
      messageData.meta = {
        timestamp: now.getTime(),
        messageLength: content.length,
        wordCount: content.split(/\s+/).length
      };
      
      // 메시지 즉시 저장 (동기적) - 새로고침 시 메시지 사라짐 방지
      const saveStartTime = Date.now();
      try {
        console.log(`[SYNC SAVE] 메시지 저장 시작: ${content.substring(0, 20)}... (${now.toISOString()})`);
        const savedMessage = await storage.createMessageInConversation(messageData);
        const saveEndTime = Date.now();
        const saveDuration = saveEndTime - saveStartTime;
        console.log(`[SYNC SAVE] 메시지 저장 완료: ${savedMessage.id} (${savedMessage.createdAt}) - 저장 시간: ${saveDuration}ms`);
        
        // 저장된 메시지로 tempMessage 업데이트
        tempMessage.id = savedMessage.id;
        tempMessage.createdAt = savedMessage.createdAt;
        
        // SSE로 저장 완료 알림
        sseBroker.broadcast(`conversation:${conversation.id}`, 'message:saved', {
          id: savedMessage.id,
          conversationId: conversation.id,
          savedAt: savedMessage.createdAt
        });
      } catch (error) {
        const saveEndTime = Date.now();
        const saveDuration = saveEndTime - saveStartTime;
        console.error(`[SYNC SAVE] 메시지 저장 실패 (${saveDuration}ms):`, error);
        // 저장 실패해도 클라이언트에는 응답 (임시 메시지로 표시)
      }
      
      // 클라이언트에 응답 (메시지 전송 성공) - user/persona 정보 포함
      const requestEndTime = Date.now();
      const totalRequestTime = requestEndTime - requestStartTime;
      console.log(`[REQUEST COMPLETE] 전체 요청 처리 시간: ${totalRequestTime}ms`);
      res.json(messageWithInfo);
      
      // 백그라운드에서 메타데이터 생성 (비동기)
      setImmediate(async () => {
        try {
          console.log(`[META ASYNC] 메타데이터 생성 시작: ${content.substring(0, 20)}...`);
          const emotionScores = await analyzeSentimentFromContent(content);
          const tones = await inferTonesFromContent(content);
          const subjects = await detectSubjects(content);
          const contexts = await inferContexts(content);
          
          console.log(`[META ASYNC] 감정 점수:`, emotionScores);
          console.log(`[META ASYNC] 톤:`, tones);
          console.log(`[META ASYNC] 주제:`, subjects);
          console.log(`[META ASYNC] 맥락:`, contexts);
          
          // TODO: 메타데이터를 별도 테이블에 저장하거나 메시지 업데이트
        } catch (error) {
          console.error('[META ASYNC] 메타데이터 생성 실패:', error);
        }
      });
      
      // 자동 대화 트리거를 별도 비동기 작업으로 분리 (메시지 전송에 영향 없음)
      if (!isAI) {
        // setTimeout으로 완전히 분리하여 메시지 전송에 영향 없도록 함
        setTimeout(async () => {
          try {
            console.log(`[AUTO CHAT] 사용자 메시지 후 자동 대화 트리거 시작: ${postId}`);
            const { persoRoomManager } = await import('./engine/persoRoom.js');
            
            let room = persoRoomManager.getRoomByPostId(postId);
            if (!room) {
              console.log(`[AUTO CHAT] Room not found for post ${postId}, restoring from conversation`);
              
              // Post 내용 조회
              const post = await storage.getPost(postId);
              let postContent = post ? (post.description || post.title) : '';
              
              // 이미지 분석 추가 (중복 방지)
              if (post?.image && !postContent.includes('[이미지:')) {
                const { detectSubjects } = await import('./api/analyze.js');
                const { imageAnalysis } = await detectSubjects(postContent, post.image);
                if (imageAnalysis) {
                  postContent = `${postContent}\n\n[이미지: ${imageAnalysis.description}]`;
                  console.log(`[AUTO CHAT] Image analysis added: ${imageAnalysis.description}`);
                }
              }
              
              // Conversation에서 페르소나 참가자 추출
              const participants = await storage.getParticipants(conversation.id);
              const personaParticipants = participants.filter(p => p.participantType === 'persona');
              
              if (personaParticipants.length > 0) {
                // 기존 참가자로 Room 복원
                const personaIds = personaParticipants.map(p => p.participantId);
                const contexts: string[] = [];
                room = persoRoomManager.createRoom(postId, postContent, personaIds, contexts);
                console.log(`[AUTO CHAT] Restored room ${room.roomId} with existing personas`);
              } else {
                // 참가자가 없으면 DB에서 랜덤 페르소나 선택
                const allPersonas = await storage.getAllPersonas();
                if (allPersonas.length > 0) {
                  const personaCount = Math.min(3, allPersonas.length);
                  const selectedPersonas = allPersonas
                    .sort(() => Math.random() - 0.5)
                    .slice(0, personaCount);
                  
                  const personaIds = selectedPersonas.map(p => p.id);
                  const contexts: string[] = [];
                  room = persoRoomManager.createRoom(postId, postContent, personaIds, contexts);
                  console.log(`[AUTO CHAT] Created new room ${room.roomId} with random personas`);
                }
              }
            }
            
            if (room) {
              console.log(`[AUTO CHAT] Triggering onUserMessage for room ${room.roomId}`);
              const { onUserMessage } = await import('./engine/autoTick.js');
              try {
                await onUserMessage(room.roomId);
                console.log(`[AUTO CHAT] Successfully triggered auto-chat for room ${room.roomId}`);
              } catch (autoError) {
                console.error(`[AUTO CHAT] onUserMessage failed for room ${room.roomId}:`, autoError);
              }
            } else {
              console.error(`[AUTO CHAT] Failed to create or restore room for post ${postId}`);
            }
          } catch (autoError) {
            console.error('[AUTO CHAT] Auto-chat trigger error:', autoError);
          }
        }, 100); // 100ms 지연으로 메시지 전송 완료 후 실행
      }
    } catch (error) {
      console.error('메시지 작성 에러:', error);
      res.status(400).json({ message: "메시지 작성에 실패했습니다" });
    }
  });

  // DELETE /api/perso/:postId/messages/clear - 대화 기록 삭제 (사용자별)
  app.delete("/api/perso/:postId/messages/clear", authenticateToken, async (req, res) => {
    try {
      const postId = req.params.postId;
      
      if (!req.userId) {
        return res.status(401).json({ message: "로그인이 필요합니다" });
      }
      
      const conversation = await storage.getConversationByPost(postId);
      if (!conversation) {
        return res.status(404).json({ message: "대화방을 찾을 수 없습니다" });
      }

      // 현재 사용자에 대해서만 대화 내역 삭제 (soft delete)
      await storage.markConversationDeletedForUser(conversation.id, req.userId);
      
      res.json({ success: true, message: "대화 기록이 삭제되었습니다" });
    } catch (error) {
      console.error('대화 기록 삭제 에러:', error);
      res.status(500).json({ message: "대화 기록 삭제에 실패했습니다" });
    }
  });

  // POST /api/perso/:postId/persona/:personaId/join - 페르소나 강제 입장
  app.post("/api/perso/:postId/persona/:personaId/join", authenticateToken, async (req, res) => {
    try {
      const { postId, personaId } = req.params;
      
      console.log(`[PERSONA JOIN API] Received request - postId: ${postId}, personaId: ${personaId}`);
      
      if (!req.userId) {
        return res.status(401).json({ message: "로그인이 필요합니다" });
      }

      // 페르소나 정보 조회 - 먼저 ID로 시도, 실패하면 이름으로 조회
      let persona = await storage.getPersona(personaId);
      
      if (!persona) {
        // UUID가 아니라 이름일 수 있으므로 이름으로 조회 시도
        console.log(`[PERSONA JOIN API] Persona not found by ID, trying by name: ${personaId}`);
        const allPersonas = await storage.getAllPersonas();
        persona = allPersonas.find(p => p.name === personaId);
      }
      
      if (!persona) {
        console.error(`[PERSONA JOIN API] Persona not found: ${personaId}`);
        return res.status(404).json({ message: `페르소나를 찾을 수 없습니다: ${personaId}` });
      }
      
      console.log(`[PERSONA JOIN API] Found persona: ${persona.name} (${persona.id})`);

      // 페르소나 소유주 정보 가져오기
      const owner = await storage.getUser(persona.userId);
      const ownerInfo = owner ? {
        name: owner.name,
        username: owner.username
      } : null;

      console.log(`[PERSONA JOIN API] Owner info:`, ownerInfo);

      // Conversation 가져오기
      const conversation = await storage.getConversationByPost(postId);
      if (!conversation) {
        return res.status(404).json({ message: "대화방을 찾을 수 없습니다" });
      }

      // 1. 페르소나를 participant로 추가 (실제 persona.id를 사용)
      try {
        await storage.addParticipant({
          conversationId: conversation.id,
          participantType: 'persona',
          participantId: persona.id,  // personaId가 아니라 persona.id (UUID) 사용!
          role: 'member',
        });
        console.log(`[PERSONA JOIN] ${persona.name} (${persona.id}) added as participant to conversation ${conversation.id}`);
      } catch (error) {
        // Unique constraint 에러는 무시 (이미 참가자임)
        console.log(`[PERSONA JOIN] ${persona.name} (${persona.id}) already a participant`);
      }

      // 2. AI 기반 소개 메시지 생성
      const { generateAutoIntroduction } = await import('./engine/joinLeaveManager.js');
      
      // 현재 토픽 분석 (간단한 버전)
      const messages = await storage.getMessagesByConversation(conversation.id);
      const recentMessages = messages.slice(-10);
      
      const topicKeywords = ['기술', 'AI', '개발', '여행', '음식', '베이킹', '일상'];
      const currentTopics: string[] = [];
      
      recentMessages.forEach(msg => {
        topicKeywords.forEach(keyword => {
          if (msg.content.includes(keyword) && !currentTopics.includes(keyword)) {
            currentTopics.push(keyword);
          }
        });
      });

      // 토픽이 없으면 기본 토픽 사용
      if (currentTopics.length === 0) {
        currentTopics.push('일상', '대화');
      }

      let introMessage: string;
      try {
        introMessage = await generateAutoIntroduction(persona.id, currentTopics);  // persona.id (UUID) 사용
        console.log(`[PERSONA JOIN] Generated introduction: ${introMessage}`);
      } catch (error) {
        console.error('[PERSONA JOIN] Failed to generate AI introduction:', error);
        introMessage = `안녕하세요, ${persona.name}입니다!`;
      }

      // 3. 소개 메시지를 DB에 저장 (senderId도 persona.id 사용)
      const ownerName = ownerInfo ? ownerInfo.name : '사용자';
      const joinMessage = await storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType: 'system',
        senderId: persona.id,  // personaId가 아니라 persona.id (UUID) 사용!
        content: `🤖 ${ownerName}의 ${persona.name}: ${introMessage}`,
        messageType: 'join',
      });

      console.log(`[PERSONA JOIN] Join message saved with ID: ${joinMessage.id}`);

      // 4. WebSocket으로 입장 이벤트 브로드캐스트
      const io = getIO();
      if (io) {
        // 입장 메시지 브로드캐스트
        io.to(`conversation:${conversation.id}`).emit('message:system', {
          id: joinMessage.id,
          conversationId: conversation.id,
          senderType: 'system',
          senderId: personaId,
          messageType: 'join',
          content: joinMessage.content,
          createdAt: joinMessage.createdAt.toISOString(),
          persona: {
            id: persona.id,
            name: persona.name,
            image: persona.image,
            owner: ownerInfo, // ✅ 소유주 정보 추가!
          }
        });

        // 페르소나 입장 이벤트 (persona.id 사용)
        io.to(`conversation:${conversation.id}`).emit('persona:event', {
          type: 'join',
          personaId: persona.id,  // UUID 사용
          personaName: persona.name,
          timestamp: Date.now(),
          autoIntroduction: introMessage,
        });

        console.log(`[PERSONA JOIN] Broadcasted join events for ${persona.name}`);
      }

      res.json({
        success: true,
        message: `${persona.name}이(가) 대화방에 입장했습니다`,
        persona: {
          id: persona.id,
          name: persona.name,
          image: persona.image,
          owner: ownerInfo, // ✅ 소유주 정보 추가!
        },
        introduction: introMessage,
        joinMessage: {
          id: joinMessage.id,
          content: joinMessage.content,
          createdAt: joinMessage.createdAt,
        }
      });

    } catch (error) {
      console.error('[PERSONA JOIN ERROR]', error);
      res.status(500).json({ 
        message: "페르소나 입장에 실패했습니다",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/perso/:postId/persona/:personaId/leave - 페르소나 강퇴
  app.post("/api/perso/:postId/persona/:personaId/leave", authenticateToken, async (req, res) => {
    try {
      const { postId, personaId } = req.params;
      
      console.log(`[PERSONA LEAVE API] Received request - postId: ${postId}, personaId: ${personaId}`);
      
      if (!req.userId) {
        return res.status(401).json({ message: "로그인이 필요합니다" });
      }

      // 페르소나 정보 조회 - 먼저 ID로 시도, 실패하면 이름으로 조회
      let persona = await storage.getPersona(personaId);
      
      if (!persona) {
        // UUID가 아니라 이름일 수 있으므로 이름으로 조회 시도
        console.log(`[PERSONA LEAVE API] Persona not found by ID, trying by name: ${personaId}`);
        const allPersonas = await storage.getAllPersonas();
        persona = allPersonas.find(p => p.name === personaId);
      }
      
      if (!persona) {
        console.error(`[PERSONA LEAVE API] Persona not found: ${personaId}`);
        return res.status(404).json({ message: `페르소나를 찾을 수 없습니다: ${personaId}` });
      }
      
      console.log(`[PERSONA LEAVE API] Found persona: ${persona.name} (${persona.id})`);

      // Conversation 가져오기
      const conversation = await storage.getConversationByPost(postId);
      if (!conversation) {
        return res.status(404).json({ message: "대화방을 찾을 수 없습니다" });
      }

      // 1. 페르소나를 participant에서 제거
      try {
        await storage.removeParticipant({
          conversationId: conversation.id,
          participantType: 'persona',
          participantId: persona.id,
        });
        console.log(`[PERSONA LEAVE] ${persona.name} (${persona.id}) removed from conversation ${conversation.id}`);
      } catch (error) {
        console.log(`[PERSONA LEAVE] ${persona.name} (${persona.id}) was not a participant`);
      }

      // 2. 퇴장 메시지를 DB에 저장
      const owner = await storage.getUser(persona.userId);
      const ownerName = owner ? owner.name : '사용자';
      const leaveMessage = await storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType: 'system',
        senderId: persona.id,
        content: `👋 ${ownerName}의 ${persona.name}이(가) 대화방을 떠났습니다`,
        messageType: 'leave',
      });

      console.log(`[PERSONA LEAVE] Leave message saved with ID: ${leaveMessage.id}`);

      // 3. WebSocket으로 퇴장 이벤트 브로드캐스트
      const io = getIO();
      if (io) {
        // 퇴장 메시지 브로드캐스트
        io.to(`conversation:${conversation.id}`).emit('message:system', {
          id: leaveMessage.id,
          conversationId: conversation.id,
          senderType: 'system',
          senderId: persona.id,
          messageType: 'leave',
          content: leaveMessage.content,
          createdAt: leaveMessage.createdAt.toISOString(),
          persona: {
            id: persona.id,
            name: persona.name,
            image: persona.image,
          }
        });

        // 페르소나 퇴장 이벤트
        io.to(`conversation:${conversation.id}`).emit('persona:event', {
          type: 'leave',
          personaId: persona.id,
          personaName: persona.name,
          timestamp: Date.now(),
        });

        console.log(`[PERSONA LEAVE] Broadcasted leave events for ${persona.name}`);
      }

      res.json({
        success: true,
        message: `${persona.name}이(가) 대화방에서 퇴장했습니다`,
        persona: {
          id: persona.id,
          name: persona.name,
          image: persona.image,
        },
        leaveMessage: {
          id: leaveMessage.id,
          content: leaveMessage.content,
          createdAt: leaveMessage.createdAt,
        }
      });

    } catch (error) {
      console.error('[PERSONA LEAVE ERROR]', error);
      res.status(500).json({ 
        message: "페르소나 퇴장에 실패했습니다",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/perso/:postId/ai-response - 게시물 대화에 대한 AI 응답 생성
  app.post("/api/perso/:postId/ai-response", authenticateToken, async (req, res) => {
    console.log(`[AI RESPONSE] Received request for post ${req.params.postId}`);
    try {
      const postId = req.params.postId;
      const { personaId, recentMessages } = req.body;
      console.log(`[AI RESPONSE] Request body:`, { personaId, recentMessagesCount: recentMessages?.length });

      if (!personaId) {
        return res.status(400).json({ message: "페르소나 ID가 필요합니다" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API 키가 설정되지 않았습니다" });
      }

      // 1. 게시물 정보 가져오기
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }

      // 2. 페르소나 정보 가져오기
      const persona = await storage.getPersona(personaId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      // 3. 페르소나 스탯
      const stats = {
        empathy: persona.empathy ?? 5,
        humor: persona.humor ?? 5,
        sociability: persona.sociability ?? 5,
        creativity: persona.creativity ?? 5,
        knowledge: persona.knowledge ?? 5,
      };

      // 4. 시스템 프롬프트 생성
      let systemPrompt = `당신은 "${persona.name}"라는 이름의 AI 페르소나입니다.\n`;
      
      if (persona.description) {
        systemPrompt += `${persona.description}\n\n`;
      }

      systemPrompt += `**게시물 컨텍스트:**\n`;
      systemPrompt += `- 제목: ${post.title}\n`;
      if (post.description) {
        systemPrompt += `- 설명: ${post.description}\n`;
      }
      if (post.tags && post.tags.length > 0) {
        systemPrompt += `- 태그: ${post.tags.join(', ')}\n`;
      }
      systemPrompt += `\n`;

      systemPrompt += `**당신의 성격 특성:**\n`;
      
      if (stats.empathy >= 8) {
        systemPrompt += `- 공감력이 매우 뛰어납니다. 따뜻한 위로와 격려를 건넵니다. 이모지(😊, 💙, 🤗)를 자주 사용합니다.\n`;
      } else if (stats.empathy >= 6) {
        systemPrompt += `- 공감력이 있습니다. 따뜻한 어투로 대화하고 때때로 이모지를 사용합니다.\n`;
      } else if (stats.empathy <= 3) {
        systemPrompt += `- 감정적인 표현보다는 객관적이고 논리적인 대화를 선호합니다.\n`;
      }

      if (stats.humor >= 8) {
        systemPrompt += `- 유머 감각이 뛰어납니다. 재치있는 농담과 드립을 자연스럽게 섞습니다.\n`;
      } else if (stats.humor >= 6) {
        systemPrompt += `- 적절한 유머를 사용하여 대화를 즐겁게 만듭니다.\n`;
      } else if (stats.humor <= 3) {
        systemPrompt += `- 진지하고 사실적인 대화를 선호하며, 유머보다는 정확한 정보 전달에 집중합니다.\n`;
      }

      if (stats.sociability >= 8) {
        systemPrompt += `- 사교성이 매우 높습니다. 반드시 질문을 포함하여 대화를 이어갑니다.\n`;
      } else if (stats.sociability >= 4) {
        systemPrompt += `- 사교적입니다. 가능하면 질문을 던져 상대방과 소통합니다.\n`;
      } else {
        systemPrompt += `- 간결하고 핵심적인 답변을 선호하며, 불필요한 질문은 하지 않습니다.\n`;
      }

      if (stats.creativity >= 8) {
        systemPrompt += `- 창의력이 풍부합니다. 비유, 은유, 시적 표현을 사용합니다.\n`;
      } else if (stats.creativity >= 6) {
        systemPrompt += `- 창의적입니다. 때때로 비유나 독특한 표현을 사용합니다.\n`;
      } else if (stats.creativity <= 3) {
        systemPrompt += `- 직설적이고 명확한 표현을 선호하며, 실용적인 답변에 집중합니다.\n`;
      }

      if (stats.knowledge >= 8) {
        systemPrompt += `- 지식이 매우 풍부합니다. 배경지식과 흥미로운 사실을 자연스럽게 언급합니다.\n`;
      } else if (stats.knowledge >= 6) {
        systemPrompt += `- 지식이 있습니다. 관련 정보를 때때로 언급합니다.\n`;
      } else if (stats.knowledge <= 3) {
        systemPrompt += `- 복잡한 지식보다는 직관적이고 경험 기반의 답변을 선호합니다.\n`;
      }

      systemPrompt += `\n**응답 가이드라인:**\n`;
      systemPrompt += `- 위의 게시물과 대화 내용을 참고하여 자연스럽고 맥락에 맞는 답변을 제공하세요.\n`;
      systemPrompt += `- 답변은 1-3 문장으로 간결하게 작성하세요.\n`;
      systemPrompt += `- 위의 성격 특성을 자연스럽게 반영하세요.\n`;
      
      if (stats.sociability >= 8) {
        systemPrompt += `- 대화를 이어가기 위한 질문을 반드시 포함하세요.\n`;
      } else if (stats.sociability >= 4) {
        systemPrompt += `- 대화를 이어가기 위한 질문을 가능하면 포함하세요.\n`;
      }

      // 5. 대화 기록을 메시지로 변환
      const messages: any[] = [{ role: "system", content: systemPrompt }];
      
      if (recentMessages && recentMessages.length > 0) {
        // 최근 메시지 5개만 포함 (토큰 절약)
        const limitedMessages = recentMessages.slice(-5);
        
        limitedMessages.forEach((msg: any) => {
          messages.push({
            role: msg.isAI ? "assistant" : "user",
            content: msg.content,
          });
        });
      }

      // 6. 내부 추론 생성
      console.log(`[THINKING GENERATION] Starting thinking generation for ${persona.name}`);
      const thinkingPrompt = `당신은 "${persona.name}"입니다. 다음 대화에 응답하기 전에 내부적으로 무엇을 생각하고 있는지 1문장으로 표현하세요.

대화 맥락: ${recentMessages && recentMessages.length > 0 ? recentMessages[recentMessages.length - 1]?.content : post.title}

이 상황에 대해 당신이 생각하는 것은? (1문장으로)`;
      
      console.log(`[THINKING GENERATION] Thinking prompt:`, thinkingPrompt);

      const thinkingCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `당신은 ${persona.name}입니다. ${persona.description || ''}` },
          { role: "user", content: thinkingPrompt }
        ],
        temperature: 0.7,
        max_tokens: 50,
      });

      const thinking = thinkingCompletion.choices[0]?.message?.content?.trim() || "";
      console.log(`[${persona.name} THINKS]: ${thinking}`);
      console.log(`[THINKING DEBUG] Generated thinking for ${persona.name}:`, {
        thinking,
        length: thinking.length,
        isEmpty: thinking === "" || thinking === "..."
      });

      // 7. OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.8,
        max_tokens: 200,
      });

      const rawResponse = completion.choices[0]?.message?.content?.trim() || "";
      
      // 빈 응답 체크
      if (!rawResponse || rawResponse.length === 0) {
        console.warn(`[AI RESPONSE] Empty response for persona ${personaId}, rejecting`);
        return res.status(400).json({ message: "AI가 빈 응답을 생성했습니다" });
      }

      // 8. 응답 반환
      res.json({
        content: rawResponse,
        thinking,
        persona: {
          id: persona.id,
          name: persona.name,
          image: persona.image,
        },
      });

      // 9. 자동 대화 트리거 (응답 후 비동기로 실행)
      (async () => {
        try {
          const { persoRoomManager } = await import('./engine/persoRoom.js');
          
          let room = persoRoomManager.getRoomByPostId(postId);
          if (!room) {
            console.log(`[AI RESPONSE] Room not found for post ${postId}, restoring from conversation`);
            
            // Post 내용 조회
            const post = await storage.getPost(postId);
            let postContent = post ? (post.description || post.title) : '';
            
            // 이미지 분석 추가 (중복 방지)
            if (post?.image && !postContent.includes('[이미지:')) {
              const { detectSubjects } = await import('./api/analyze.js');
              const { imageAnalysis } = await detectSubjects(postContent, post.image);
              if (imageAnalysis) {
                postContent = `${postContent}\n\n[이미지: ${imageAnalysis.description}]`;
                console.log(`[AI RESPONSE] Image analysis added: ${imageAnalysis.description}`);
              }
            }
            
            // Conversation 조회
            const conversation = await storage.getConversationByPost(postId);
            if (conversation) {
              // Conversation에서 페르소나 참가자 추출
              const participants = await storage.getParticipants(conversation.id);
              const personaParticipants = participants.filter(p => p.participantType === 'persona');
              
              if (personaParticipants.length > 0) {
                // 기존 참가자로 Room 복원 (participantId 사용, 이름이 아님!)
                const personaIds = personaParticipants.map(p => p.participantId);
                
                // 로그용으로 이름 조회
                const personaNames = await Promise.all(
                  personaIds.map(async (id) => {
                    const persona = await storage.getPersona(id);
                    return persona?.name || id;
                  })
                );
                
                const contexts: string[] = [];
                room = persoRoomManager.createRoom(postId, postContent, personaIds, contexts);
                console.log(`[AI RESPONSE] Restored room ${room.roomId} with existing personas: ${personaNames.join(', ')} (IDs: ${personaIds.join(', ')})`);
              } else {
                // 참가자가 없으면 DB에서 랜덤 페르소나 선택 (ID 사용!)
                const allPersonas = await storage.getAllPersonas();
                if (allPersonas.length > 0) {
                  const personaCount = Math.min(
                    Math.floor(Math.random() * 2) + 3, // 3-4개
                    allPersonas.length
                  );
                  const selectedPersonas = allPersonas
                    .sort(() => Math.random() - 0.5)
                    .slice(0, personaCount);
                  
                  const personaIds = selectedPersonas.map(p => p.id);
                  const personaNames = selectedPersonas.map(p => p.name);
                  
                  const contexts: string[] = [];
                  room = persoRoomManager.createRoom(postId, postContent, personaIds, contexts);
                  console.log(`[AI RESPONSE] Created new room ${room.roomId} with random personas: ${personaNames.join(', ')} (IDs: ${personaIds.join(', ')})`);
                } else {
                  console.error(`[AI RESPONSE] No personas available in database for room creation`);
                }
              }
            }
          } else {
            console.log(`[AI RESPONSE] Using existing room ${room.roomId} for post ${postId}`);
          }
          
          if (room) {
            console.log(`[AI RESPONSE] Triggering onUserMessage for room ${room.roomId}`);
            const { onUserMessage } = await import('./engine/autoTick.js');
            try {
              await onUserMessage(room.roomId);
              console.log(`[AI RESPONSE] Successfully triggered auto-chat for room ${room.roomId} after AI response`);
            } catch (autoError) {
              console.error(`[AI RESPONSE] onUserMessage failed for room ${room.roomId}:`, autoError);
            }
          } else {
            console.error(`[AI RESPONSE] Failed to create or restore room for post ${postId}`);
          }
        } catch (autoError) {
          console.error('[AI RESPONSE] Auto-chat trigger error:', autoError);
        }
      })();
    } catch (error) {
      console.error('[PERSO AI RESPONSE ERROR]', error);
      res.status(500).json({ message: "AI 응답 생성에 실패했습니다" });
    }
  });


  // GET /api/chat/persona/:personaId/messages - 페르소나와의 1:1 대화 메시지 조회
  app.get("/api/chat/persona/:personaId/messages", authenticateToken, async (req, res) => {
    try {
      const targetPersonaId = req.params.personaId;

      if (!req.userId) {
        return res.status(401).json({ message: "로그인이 필요합니다" });
      }

      const userId = req.userId;

      // 사용자의 페르소나 가져오기
      const userPersona = await storage.getPersonaByUserId(userId);
      if (!userPersona) {
        return res.status(404).json({ message: "사용자의 페르소나를 찾을 수 없습니다" });
      }

      // 대상 페르소나 가져오기
      const targetPersona = await storage.getPersona(targetPersonaId);
      if (!targetPersona) {
        return res.status(404).json({ message: "대화 상대 페르소나를 찾을 수 없습니다" });
      }

      // 대화방 조회 또는 생성
      const conversation = await storage.getOrCreatePersonaConversation(
        userPersona.id,
        targetPersonaId
      );

      // 메시지 가져오기 (사용자별 삭제 필터링)
      const messages = await storage.getMessagesByConversation(conversation.id, userId);

      // 메시지에 페르소나 정보 추가
      const messagesWithInfo = await Promise.all(
        messages.map(async (msg) => {
          if (msg.senderType === 'persona') {
            const persona = await storage.getPersona(msg.senderId);
            return {
              ...msg,
              isAI: msg.senderId === targetPersonaId,
              persona: persona ? {
                id: persona.id,
                name: persona.name,
                image: persona.image,
              } : null,
            };
          }
          return msg;
        })
      );

      res.json({
        messages: messagesWithInfo,
        conversation: {
          id: conversation.id,
        },
        targetPersona: {
          id: targetPersona.id,
          name: targetPersona.name,
          image: targetPersona.image,
          description: targetPersona.description,
        },
        userPersona: {
          id: userPersona.id,
          name: userPersona.name,
          image: userPersona.image,
        },
      });
    } catch (error) {
      console.error('[PERSONA CHAT MESSAGES ERROR]', error);
      res.status(500).json({ message: "메시지를 불러올 수 없습니다" });
    }
  });

  // POST /api/chat/persona/:personaId/messages - 페르소나와의 1:1 대화 메시지 전송
  app.post("/api/chat/persona/:personaId/messages", authenticateToken, async (req, res) => {
    try {
      const targetPersonaId = req.params.personaId;
      const { content } = req.body;

      if (!req.userId) {
        return res.status(401).json({ message: "로그인이 필요합니다" });
      }

      const userId = req.userId;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "메시지 내용이 필요합니다" });
      }

      // 사용자의 페르소나 가져오기
      const userPersona = await storage.getPersonaByUserId(userId);
      if (!userPersona) {
        return res.status(404).json({ message: "사용자의 페르소나를 찾을 수 없습니다" });
      }

      // 대상 페르소나 가져오기
      const targetPersona = await storage.getPersona(targetPersonaId);
      if (!targetPersona) {
        return res.status(404).json({ message: "대화 상대 페르소나를 찾을 수 없습니다" });
      }

      // 대화방 조회 또는 생성
      const conversation = await storage.getOrCreatePersonaConversation(
        userPersona.id,
        targetPersonaId
      );

      // 사용자 페르소나의 메시지 저장
      const userMessage = await storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType: 'persona',
        senderId: userPersona.id,
        content,
        messageType: 'text',
      });
      
      // WebSocket으로 사용자 메시지 즉시 브로드캐스트
      const io = getIO();
      if (io) {
        const userMessageWithInfo = {
          ...userMessage,
          isAI: false,
          senderType: 'persona',
          senderId: userPersona.id,
          persona: {
            id: userPersona.id,
            name: userPersona.name,
            image: userPersona.image,
          },
        };
        io.to(`conversation:${conversation.id}`).emit('message:new', userMessageWithInfo);
      }

      // 대상 페르소나의 자동 응답 생성
      const stats = {
        empathy: targetPersona.empathy ?? 5,
        humor: targetPersona.humor ?? 5,
        sociability: targetPersona.sociability ?? 5,
        creativity: targetPersona.creativity ?? 5,
        knowledge: targetPersona.knowledge ?? 5,
      };

      // 시스템 프롬프트 생성
      let systemPrompt = `당신은 "${targetPersona.name}"라는 이름의 AI 페르소나입니다.\n`;
      if (targetPersona.description) {
        systemPrompt += `${targetPersona.description}\n\n`;
      }

      systemPrompt += `**당신의 성격 특성:**\n`;
      if (stats.empathy >= 8) {
        systemPrompt += `- 공감력이 매우 뛰어납니다.\n`;
      }
      if (stats.humor >= 8) {
        systemPrompt += `- 유머 감각이 뛰어납니다.\n`;
      }
      if (stats.sociability >= 8) {
        systemPrompt += `- 사교성이 매우 높습니다.\n`;
      }
      if (stats.creativity >= 8) {
        systemPrompt += `- 창의성이 뛰어납니다.\n`;
      }
      if (stats.knowledge >= 8) {
        systemPrompt += `- 지식이 풍부합니다.\n`;
      }

      systemPrompt += `\n**응답 가이드라인:**\n`;
      systemPrompt += `- "${userPersona.name}"와 자연스럽게 대화하세요.\n`;
      systemPrompt += `- 답변은 1-3 문장으로 간결하게 작성하세요.\n`;

      // 최근 메시지 맥락 추가
      const recentMessages = await storage.getMessagesByConversation(conversation.id);
      const contextMessages: any[] = [{ role: "system", content: systemPrompt }];

      // 최근 5개 메시지만 사용
      const last5 = recentMessages.slice(-5);
      for (const msg of last5) {
        if (msg.senderType === 'persona') {
          if (msg.senderId === userPersona.id) {
            contextMessages.push({ role: "user", content: msg.content });
          } else if (msg.senderId === targetPersonaId) {
            contextMessages.push({ role: "assistant", content: msg.content });
          }
        }
      }

      // 내부 추론(thinking) 생성
      console.log(`[THINKING GENERATION] Starting thinking generation for ${targetPersona.name}`);
      const thinkingPrompt = `당신은 "${targetPersona.name}"입니다. "${userPersona.name}"가 방금 "${content}"라고 말했습니다. 이에 응답하기 전에 내부적으로 무엇을 생각하고 있는지 1문장으로 표현하세요.`;
      
      const thinkingCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `당신은 ${targetPersona.name}입니다. ${targetPersona.description || ''}` },
          { role: "user", content: thinkingPrompt }
        ],
        temperature: 0.7,
        max_tokens: 50,
      });

      const thinking = thinkingCompletion.choices[0]?.message?.content?.trim() || "";
      console.log(`[${targetPersona.name} THINKS]: ${thinking}`);

      // OpenAI 스트리밍 API 호출
      const startTime = Date.now();
      let firstTokenTime: number | null = null;
      let fullResponse = "";
      const tempAiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: contextMessages,
        temperature: 0.8,
        max_tokens: 300,
        stream: true,
      });

      // 스트리밍 시작 알림
      if (io) {
        io.to(`conversation:${conversation.id}`).emit('message:stream:start', {
          id: tempAiMessageId,
          personaId: targetPersonaId,
          conversationId: conversation.id,
        });
      }

      // 스트리밍 처리
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        
        // 첫 토큰 시간 측정
        if (!firstTokenTime && delta) {
          firstTokenTime = Date.now();
          const ttft = firstTokenTime - startTime;
          console.log(`[LLM STREAMING] First token time: ${ttft}ms`);
        }
        
        if (delta) {
          fullResponse += delta;
          
          // WebSocket으로 스트리밍 청크 전송
          if (io) {
            io.to(`conversation:${conversation.id}`).emit('message:stream:chunk', {
              id: tempAiMessageId,
              chunk: delta,
              content: fullResponse,
            });
          }
        }
      }

      const endTime = Date.now();
      console.log(`[LLM STREAMING] Total time: ${endTime - startTime}ms, Response length: ${fullResponse.length}`);

      // AI 응답 DB 저장 (비동기)
      storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType: 'persona',
        senderId: targetPersonaId,
        content: fullResponse,
        messageType: 'text',
        thinking: thinking, // thinking 필드 추가
      }).catch(error => {
        console.error('[AI MESSAGE SAVE ERROR]', error);
      });
      
      // 스트리밍 완료 알림
      if (io) {
        const aiMessageWithInfo = {
          id: tempAiMessageId,
          conversationId: conversation.id,
          isAI: true,
          senderType: 'persona',
          senderId: targetPersonaId,
          content: fullResponse,
          thinking: thinking, // thinking 필드 추가
          createdAt: new Date().toISOString(),
          persona: {
            id: targetPersona.id,
            name: targetPersona.name,
            image: targetPersona.image,
          },
        };
        io.to(`conversation:${conversation.id}`).emit('message:stream:end', aiMessageWithInfo);
      }

      res.json({ 
        success: true,
        userMessage,
        aiResponse: fullResponse,
      });
    } catch (error) {
      console.error('[PERSONA CHAT SEND ERROR]', error);
      res.status(500).json({ message: "메시지 전송에 실패했습니다" });
    }
  });

  // POST /api/personas/:id/chat - 페르소나와 대화
  app.post("/api/personas/:id/chat", async (req, res) => {
    try {
      const personaId = req.params.id;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "메시지가 필요합니다" });
      }

      // 1. 페르소나 정보 가져오기
      const persona = await storage.getPersona(personaId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }

      // 2. 최근 기억 가져오기 (최대 3개)
      const memories = await storage.getMemoriesByPersona(personaId, 3);

      // 3. 프롬프트 빌드 (클라이언트 로직을 서버에서 재사용)
      const stats = {
        empathy: persona.empathy ?? 5,
        humor: persona.humor ?? 5,
        sociability: persona.sociability ?? 5,
        creativity: persona.creativity ?? 5,
        knowledge: persona.knowledge ?? 5,
      };

      // 시스템 프롬프트 생성
      let systemPrompt = `당신은 "${persona.name}"라는 이름의 AI 페르소나입니다.\n`;
      
      if (persona.description) {
        systemPrompt += `${persona.description}\n\n`;
      }

      systemPrompt += `**당신의 성격 특성:**\n`;
      
      if (stats.empathy >= 8) {
        systemPrompt += `- 공감력이 매우 뛰어납니다. 따뜻한 위로와 격려를 건넵니다. 이모지(😊, 💙, 🤗)를 자주 사용합니다.\n`;
      } else if (stats.empathy >= 6) {
        systemPrompt += `- 공감력이 있습니다. 따뜻한 어투로 대화하고 때때로 이모지를 사용합니다.\n`;
      }

      if (stats.humor >= 8) {
        systemPrompt += `- 유머 감각이 뛰어납니다. 재치있는 농담과 드립을 자연스럽게 섞습니다.\n`;
      } else if (stats.humor >= 6) {
        systemPrompt += `- 적절한 유머를 사용하여 대화를 즐겁게 만듭니다.\n`;
      }

      if (stats.sociability >= 8) {
        systemPrompt += `- 사교성이 매우 높습니다. 반드시 질문을 포함하여 대화를 이어갑니다.\n`;
      } else if (stats.sociability >= 6) {
        systemPrompt += `- 사교적입니다. 자주 질문을 던져 상대방과 소통합니다.\n`;
      }

      if (stats.creativity >= 8) {
        systemPrompt += `- 창의력이 풍부합니다. 비유, 은유, 시적 표현을 사용합니다.\n`;
      } else if (stats.creativity >= 6) {
        systemPrompt += `- 창의적입니다. 때때로 비유나 독특한 표현을 사용합니다.\n`;
      }

      if (stats.knowledge >= 8) {
        systemPrompt += `- 지식이 매우 풍부합니다. 배경지식과 흥미로운 사실을 자연스럽게 언급합니다.\n`;
      } else if (stats.knowledge >= 6) {
        systemPrompt += `- 지식이 있습니다. 관련 정보를 때때로 언급합니다.\n`;
      }

      if (memories.length > 0) {
        systemPrompt += `\n**이전 대화 기억:**\n`;
        memories.forEach((mem, idx) => {
          const summary = mem.summary || mem.content.slice(0, 100);
          systemPrompt += `${idx + 1}. ${summary}\n`;
        });
      }

      systemPrompt += `\n**응답 가이드라인:**\n`;
      systemPrompt += `- 사용자의 질문에 자유롭게 답변하되, 위의 성격 특성을 반영하세요.\n`;
      systemPrompt += `- 답변은 2-4 문장으로 간결하게 작성하세요.\n`;
      
      if (stats.sociability >= 6) {
        systemPrompt += `- 대화를 이어가기 위한 질문을 포함하세요.\n`;
      }

      // 4. OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantResponse = completion.choices[0]?.message?.content || "응답을 생성할 수 없습니다.";

      // 5. 대화 요약을 메모리에 저장
      const userSummary = message.length > 50 ? message.slice(0, 50) + '...' : message;
      const responseSummary = assistantResponse.length > 50 
        ? assistantResponse.slice(0, 50) + '...' 
        : assistantResponse;
      
      const memorySummary = `사용자: "${userSummary}" → 페르소나: "${responseSummary}"`;
      
      await storage.createMemory({
        personaId,
        content: `${message}\n\n${assistantResponse}`,
        summary: memorySummary,
        context: `스탯: E${stats.empathy} H${stats.humor} S${stats.sociability} C${stats.creativity} K${stats.knowledge}`,
      });

      // 6. 응답 반환
      res.json({
        response: assistantResponse,
        persona: {
          id: persona.id,
          name: persona.name,
          image: persona.image,
        },
      });
    } catch (error) {
      console.error('[PERSONA CHAT ERROR]', error);
      res.status(500).json({ message: "대화 생성에 실패했습니다" });
    }
  });

  // Mock API: /ai/analyze - 감성 분석
  app.post("/ai/analyze", async (req, res) => {
    try {
      const { content, imageUrl } = req.body;
      
      // Mock 감성 분석 결과
      const positive = Math.random() * 0.5 + 0.4; // 0.4~0.9
      const negative = Math.random() * 0.2; // 0~0.2
      const neutral = 1 - positive - negative;
      
      // Mock tones
      const allTones = ['humorous', 'playful', 'informative', 'analytical', 'serene', 'nostalgic', 'excited', 'calm'];
      const tones = allTones.slice(0, Math.floor(Math.random() * 3) + 1);
      
      // Mock image scores (이미지가 있을 때만)
      const media_scores = imageUrl ? {
        aesthetics: Math.random() * 0.4 + 0.6, // 0.6~1.0
        quality: Math.random() * 0.3 + 0.7, // 0.7~1.0
      } : undefined;
      
      res.json({
        positive,
        neutral,
        negative,
        tones,
        media_scores
      });
    } catch (error) {
      res.status(500).json({ message: "분석에 실패했습니다" });
    }
  });

  // POST /api/ai/match - 페르소나 매칭 (게시물에 적합한 페르소나 찾기)
  app.post("/api/ai/match", async (req, res) => {
    try {
      const { postId, excludePersonaIds = [] } = req.body;
      
      // 1. 게시물 정보 가져오기
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }
      
      // 2. 모든 페르소나 가져오기
      const allPersonas = await storage.getAllPersonas();
      
      // 3. 이미 참여 중인 페르소나 제외
      const availablePersonas = allPersonas.filter(
        p => !excludePersonaIds.includes(p.id)
      );
      
      if (availablePersonas.length === 0) {
        return res.json({ matchedPersonas: [] });
      }
      
      // 4. 랜덤으로 2-3개 선택 (간단한 매칭 로직)
      const count = Math.min(Math.floor(Math.random() * 2) + 2, availablePersonas.length); // 2-3개
      const shuffled = availablePersonas.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      
      // 5. 사용자 정보 포함하여 반환
      const matchedPersonas = await Promise.all(
        selected.map(async (persona) => {
          const user = await storage.getUser(persona.userId);
          return {
            personaId: persona.id,
            personaName: persona.name,
            personaImage: persona.image,
            userId: user?.id,
            username: user?.username,
          };
        })
      );
      
      res.json({ matchedPersonas });
    } catch (error) {
      console.error('[AI MATCH ERROR]', error);
      res.status(500).json({ message: "페르소나 매칭에 실패했습니다" });
    }
  });

  // POST /api/ai/converse - 페르소나 간 대화 생성
  app.post("/api/ai/converse", async (req, res) => {
    try {
      const { postId, personaIds, recentMessages = [] } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API 키가 설정되지 않았습니다" });
      }
      
      // 1. 게시물 정보 가져오기
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }
      
      // 2. 각 페르소나의 응답 생성
      const responses = [];
      
      for (const personaId of personaIds) {
        const persona = await storage.getPersona(personaId);
        if (!persona) continue;
        
        const stats = {
          empathy: persona.empathy ?? 5,
          humor: persona.humor ?? 5,
          sociability: persona.sociability ?? 5,
          creativity: persona.creativity ?? 5,
          knowledge: persona.knowledge ?? 5,
        };
        
        // 시스템 프롬프트 생성
        let systemPrompt = `당신은 "${persona.name}"라는 이름의 AI 페르소나입니다.\n`;
        if (persona.description) {
          systemPrompt += `${persona.description}\n\n`;
        }
        
        systemPrompt += `**게시물 컨텍스트:**\n`;
        systemPrompt += `- 제목: ${post.title}\n`;
        if (post.description) {
          systemPrompt += `- 설명: ${post.description}\n`;
        }
        
        systemPrompt += `\n**당신의 성격 특성:**\n`;
        if (stats.empathy >= 8) {
          systemPrompt += `- 공감력이 매우 뛰어납니다.\n`;
        }
        if (stats.humor >= 8) {
          systemPrompt += `- 유머 감각이 뛰어납니다.\n`;
        }
        if (stats.sociability >= 8) {
          systemPrompt += `- 사교성이 매우 높습니다.\n`;
        }
        if (stats.creativity >= 8) {
          systemPrompt += `- 창의성이 뛰어납니다.\n`;
        }
        if (stats.knowledge >= 8) {
          systemPrompt += `- 지식이 풍부합니다.\n`;
        }
        
        systemPrompt += `\n**응답 가이드라인:**\n`;
        systemPrompt += `- 게시물과 관련된 자연스러운 반응을 1-2 문장으로 작성하세요.\n`;
        systemPrompt += `- 다른 AI 페르소나들과 대화하는 것처럼 작성하세요.\n`;
        
        // OpenAI API 호출
        const messages: any[] = [{ role: "system", content: systemPrompt }];
        
        // 최근 대화 맥락 추가
        if (recentMessages.length > 0) {
          messages.push({
            role: "user",
            content: `최근 대화:\n${recentMessages.map((m: any) => `${m.persona?.name || m.user?.name}: ${m.content}`).join('\n')}\n\n게시물에 대한 당신의 반응을 작성하세요.`
          });
        } else {
          messages.push({
            role: "user",
            content: "게시물에 대한 당신의 첫 반응을 작성하세요."
          });
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.8,
          max_tokens: 200,
        });
        
        const content = completion.choices[0]?.message?.content?.trim() || "";
        
        // 빈 응답은 건너뛰기
        if (!content || content.length === 0) {
          console.warn(`[AI CONVERSE] Empty response from persona ${personaId}, skipping`);
          continue;
        }
        
        responses.push({
          personaId,
          personaName: persona.name,
          content,
        });
      }
      
      res.json({ responses });
    } catch (error) {
      console.error('[AI CONVERSE ERROR]', error);
      res.status(500).json({ message: "대화 생성에 실패했습니다" });
    }
  });
  
  // POST /personas/:id/mood/update - 페르소나 무드 업데이트
  app.post("/personas/:id/mood/update", async (req, res) => {
    try {
      const personaId = req.params.id;
      const { valence, arousal } = req.body;
      
      console.log(`[PERSONA MOOD UPDATE] Persona ${personaId}:`, { valence, arousal });
      
      // DB에 무드 저장
      await storage.updatePersonaStats(personaId, {
        currentMood: { valence, arousal }
      });
      
      res.json({
        success: true,
        personaId,
        mood: { valence, arousal }
      });
    } catch (error) {
      res.status(500).json({ message: "무드 업데이트 실패" });
    }
  });
  
  // POST /personas/:id/growth/auto - 페르소나 성장 자동 반영
  app.post("/personas/:id/growth/auto", async (req, res) => {
    try {
      const personaId = req.params.id;
      const { deltas } = req.body;
      
      console.log(`[PERSONA GROWTH] Persona ${personaId} deltas:`, deltas);
      
      // 현재 페르소나 가져오기
      const persona = await storage.getPersona(personaId);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }
      
      // 스탯 업데이트 (현재값 + 델타)
      const updates: any = {};
      if (deltas.empathy) updates.empathy = (persona.empathy ?? 5) + deltas.empathy;
      if (deltas.humor) updates.humor = (persona.humor ?? 5) + deltas.humor;
      if (deltas.sociability) updates.sociability = (persona.sociability ?? 5) + deltas.sociability;
      if (deltas.creativity) updates.creativity = (persona.creativity ?? 5) + deltas.creativity;
      if (deltas.knowledge) updates.knowledge = (persona.knowledge ?? 5) + deltas.knowledge;
      
      await storage.updatePersonaStats(personaId, updates);
      
      res.json({
        success: true,
        personaId,
        deltas,
        newStats: updates
      });
    } catch (error) {
      res.status(500).json({ message: "성장 반영 실패" });
    }
  });

  // 관리자 엔드포인트: 시드 데이터 생성
  app.post("/api/admin/seed", async (req, res) => {
    try {
      // 프로덕션 환경에서만 실행 가능하도록 체크 (선택사항)
      const { runSeed } = await import('./seed.js');
      await runSeed();
      
      res.json({ 
        success: true, 
        message: "시드 데이터가 성공적으로 생성되었습니다" 
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ 
        success: false, 
        message: "시드 데이터 생성 실패",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  });

  // 시드 데이터 생성 엔드포인트
  app.post("/api/seed", async (req, res) => {
    try {
      await runSeed();
      res.json({ message: "시드 데이터가 성공적으로 생성되었습니다." });
    } catch (error) {
      console.error("시드 데이터 생성 실패:", error);
      res.status(500).json({ error: "시드 데이터 생성에 실패했습니다." });
    }
  });

  // 관리자 엔드포인트: 대화방 없는 게시물 조회
  app.get("/api/admin/posts/cleanup/preview", async (req, res) => {
    try {
      const result = await listPostsWithoutConversations();
      res.json(result);
    } catch (error) {
      console.error("게시물 조회 실패:", error);
      res.status(500).json({ 
        success: false, 
        error: "게시물 조회에 실패했습니다.",
        message: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  });

  // 관리자 엔드포인트: 대화방 없는 게시물 삭제
  app.post("/api/admin/posts/cleanup", async (req, res) => {
    try {
      const result = await cleanupPostsWithoutConversations();
      res.json(result);
    } catch (error) {
      console.error("게시물 삭제 실패:", error);
      res.status(500).json({ 
        success: false, 
        error: "게시물 삭제에 실패했습니다.",
        message: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  });

  // 관리자 API: 중복 참가자 정리
  app.post("/api/admin/cleanup-duplicates/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      console.log(`[ADMIN] 중복 참가자 정리 요청: ${postId}`);
      
      const conversation = await storage.getConversationByPostId(postId);
      if (!conversation) {
        return res.status(404).json({ error: "대화방을 찾을 수 없습니다" });
      }

      // 중복된 사용자 참가자 찾기
      const participants = await storage.getParticipants(conversation.id);
      const userParticipants = participants.filter(p => p.participantType === 'user');
      
      // userId별로 그룹화
      const userGroups = userParticipants.reduce((acc, participant) => {
        const userId = participant.participantId;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(participant);
        return acc;
      }, {} as Record<string, any[]>);

      let removedCount = 0;
      for (const [userId, duplicates] of Object.entries(userGroups)) {
        if (duplicates.length > 1) {
          // 첫 번째(가장 오래된) 것만 남기고 나머지 삭제
          const toKeep = duplicates[0];
          const toRemove = duplicates.slice(1);
          
          for (const participant of toRemove) {
            await storage.removeParticipant({
              conversationId: conversation.id,
              participantType: participant.participantType,
              participantId: participant.participantId
            });
            removedCount++;
            console.log(`[ADMIN] 중복 참가자 삭제: ${participant.id}`);
          }
        }
      }

      console.log(`[ADMIN] 중복 참가자 정리 완료: ${removedCount}개 삭제`);
      res.json({
        success: true,
        message: `중복 참가자 ${removedCount}개가 정리되었습니다`,
        removedCount
      });
    } catch (error) {
      console.error('[ADMIN] 중복 참가자 정리 오류:', error);
      res.status(500).json({ error: "중복 참가자 정리 중 오류가 발생했습니다" });
    }
  });

  // 관리자 API: 주도권 수정
  app.post("/api/admin/fix-dominant/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      console.log(`[ADMIN] 주도권 수정 요청: ${postId}`);
      
      const conversation = await storage.getConversationByPostId(postId);
      if (!conversation) {
        return res.status(404).json({ error: "대화방을 찾을 수 없습니다" });
      }

      // 활성 페르소나 참가자 확인
      const participants = await storage.getParticipants(conversation.id);
      const activePersonas = participants.filter(p => p.participantType === 'persona');
      
      let newDominant = null;
      if (activePersonas.length > 0) {
        // 첫 번째 활성 페르소나로 주도권 설정
        newDominant = activePersonas[0].participantId;
        await storage.updateConversation(conversation.id, { dominantPersona: newDominant });
        console.log(`[ADMIN] 주도권 변경: ${conversation.dominantPersona} → ${newDominant}`);
      } else {
        // 활성 페르소나가 없으면 주도권을 null로 설정
        await storage.updateConversation(conversation.id, { dominantPersona: null });
        console.log(`[ADMIN] 주도권 초기화: ${conversation.dominantPersona} → null`);
      }

      res.json({
        success: true,
        message: "주도권이 수정되었습니다",
        oldDominant: conversation.dominantPersona,
        newDominant
      });
    } catch (error) {
      console.error('[ADMIN] 주도권 수정 오류:', error);
      res.status(500).json({ error: "주도권 수정 중 오류가 발생했습니다" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
