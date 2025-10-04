import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertLikeSchema, insertCommentSchema, insertPersoMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // 임시 현재 사용자 ID (추후 인증 시스템과 통합)
  const CURRENT_USER_ID = "temp-user-id";

  // GET /api/posts - 모든 게시물 가져오기
  app.get("/api/posts", async (req, res) => {
    try {
      const allPosts = await storage.getPosts();
      
      // 각 게시물의 사용자 정보, 페르소나 정보, 통계 가져오기
      const postsWithStats = await Promise.all(
        allPosts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          const persona = await storage.getPersonaByUserId(post.userId);
          const likesCount = await storage.getLikesByPost(post.id);
          const comments = await storage.getCommentsByPost(post.id);
          const isLiked = await storage.checkUserLike(post.id, CURRENT_USER_ID);
          
          // 새 스키마에서 conversation 가져오기
          const conversation = await storage.getConversationByPost(post.id);
          const messages = conversation 
            ? await storage.getMessagesByConversation(conversation.id)
            : [];
          
          // 최근 메시지 3개 가져오기 (최신순으로 정렬 후 3개 선택)
          const sortedMessages = [...messages].sort((a, b) => 
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
                // 시스템 메시지 또는 알 수 없는 타입
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
            hasPerso: messages.length > 0,
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
  app.post("/api/posts", async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: CURRENT_USER_ID,
      });
      
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "게시물 생성에 실패했습니다" });
    }
  });

  // POST /api/likes - 좋아요 토글
  app.post("/api/likes", async (req, res) => {
    try {
      const { postId } = req.body;
      
      const isLiked = await storage.checkUserLike(postId, CURRENT_USER_ID);
      
      if (isLiked) {
        await storage.deleteLike(postId, CURRENT_USER_ID);
        res.json({ liked: false });
      } else {
        await storage.createLike({ postId, userId: CURRENT_USER_ID });
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
  app.post("/api/comments", async (req, res) => {
    try {
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        userId: CURRENT_USER_ID,
      });
      
      const comment = await storage.createComment(validatedData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "댓글 작성에 실패했습니다" });
    }
  });

  // GET /api/perso/:postId/messages - 페르소 메시지 가져오기 (새 스키마)
  app.get("/api/perso/:postId/messages", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.postId);
      const conversation = await storage.getConversationByPost(req.params.postId);
      
      if (!conversation) {
        return res.json({
          messages: [],
          post: post ? {
            id: post.id,
            title: post.title,
            description: post.description,
            tags: post.tags,
            sentiment: post.sentiment,
          } : null,
        });
      }
      
      const messages = await storage.getMessagesByConversation(conversation.id);
      
      // 각 메시지에 사용자/페르소나 정보 추가
      const messagesWithInfo = await Promise.all(
        messages.map(async (msg) => {
          if (msg.senderType === 'persona') {
            const persona = await storage.getPersona(msg.senderId);
            return {
              ...msg,
              isAI: true,
              personaId: msg.senderId,
              persona: persona ? {
                name: persona.name,
                image: persona.image,
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
                profileImage: user.profileImage,
              } : null,
            };
          } else {
            // 시스템 메시지 또는 알 수 없는 타입
            return {
              ...msg,
              isAI: false,
              userId: null,
              content: msg.content,
            };
          }
        })
      );
      
      res.json({
        messages: messagesWithInfo,
        post: post ? {
          id: post.id,
          title: post.title,
          description: post.description,
          tags: post.tags,
          sentiment: post.sentiment,
        } : null,
      });
    } catch (error) {
      res.status(500).json({ message: "메시지를 가져오는데 실패했습니다" });
    }
  });

  // POST /api/perso/:postId/messages - 페르소 메시지 작성 (새 스키마)
  app.post("/api/perso/:postId/messages", async (req, res) => {
    try {
      const { content, isAI, personaId } = req.body;
      const postId = req.params.postId;
      
      // Conversation 가져오기 또는 생성
      let conversation = await storage.getConversationByPost(postId);
      
      if (!conversation) {
        const senderType = isAI ? 'persona' : 'user';
        const senderId = isAI ? personaId : CURRENT_USER_ID;
        conversation = await storage.createConversationForPost(postId, senderType, senderId);
      }
      
      const senderType = isAI ? 'persona' : 'user';
      const senderId = isAI ? personaId : CURRENT_USER_ID;
      
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
      
      // 메시지 생성
      const message = await storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType,
        senderId,
        content,
        messageType: 'text',
      });
      
      res.json(message);
    } catch (error) {
      console.error('메시지 작성 에러:', error);
      res.status(400).json({ message: "메시지 작성에 실패했습니다" });
    }
  });

  // POST /api/analyze - AI 게시물 분석 (Mock)
  app.post("/api/analyze", async (req, res) => {
    try {
      const { postId, content, mediaUrl } = req.body;
      
      // Mock AI 분석 결과 생성
      const mockTags = [
        ["일상", "힐링", "카페"],
        ["여행", "풍경", "자연"],
        ["음식", "맛집", "디저트"],
        ["운동", "건강", "피트니스"],
        ["독서", "책", "감성"],
      ];
      
      const randomTags = mockTags[Math.floor(Math.random() * mockTags.length)];
      const sentiment = Math.random() * 0.4 + 0.6; // 0.6~1.0 사이 긍정적인 값
      
      const personaEffect = {
        empathy: Math.floor(Math.random() * 3) + 1,
        creativity: Math.floor(Math.random() * 3) + 1,
        knowledge: Math.floor(Math.random() * 2) + 1,
        humor: Math.floor(Math.random() * 2) + 1,
        sociability: Math.floor(Math.random() * 3) + 1,
      };
      
      // 데이터베이스에 분석 결과 저장
      if (postId) {
        await storage.updatePostAnalysis(postId, {
          tags: randomTags,
          sentiment,
          personaEffect,
        });
      }
      
      res.json({
        tags: randomTags,
        sentiment,
        persona_effect: personaEffect,
      });
    } catch (error) {
      res.status(500).json({ message: "분석에 실패했습니다" });
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
  
  // Mock API: /personas/:id/mood/update - 페르소나 무드 업데이트
  app.post("/personas/:id/mood/update", async (req, res) => {
    try {
      const personaId = req.params.id;
      const { valence, arousal } = req.body;
      
      console.log(`[PERSONA MOOD UPDATE] Persona ${personaId}:`, { valence, arousal });
      
      // Mock: 페르소나 무드 저장 (실제로는 DB 업데이트)
      res.json({
        success: true,
        personaId,
        mood: { valence, arousal }
      });
    } catch (error) {
      res.status(500).json({ message: "무드 업데이트 실패" });
    }
  });
  
  // Mock API: /personas/:id/growth/auto - 페르소나 성장 자동 반영
  app.post("/personas/:id/growth/auto", async (req, res) => {
    try {
      const personaId = req.params.id;
      const { deltas } = req.body;
      
      console.log(`[PERSONA GROWTH] Persona ${personaId} deltas:`, deltas);
      
      // Mock: 페르소나 스탯 업데이트 (실제로는 DB 업데이트)
      res.json({
        success: true,
        personaId,
        deltas
      });
    } catch (error) {
      res.status(500).json({ message: "성장 반영 실패" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
