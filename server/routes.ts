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
import { openPerso } from "./api/personas.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // WebSocket 서버 참조를 위한 헬퍼 함수
  const getIO = (): SocketServer | undefined => app.get("io");
  
  // OpenAI 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

  // POST /api/ai/analyze - AI 감성 분석 (Mock)
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { content, imageUrl } = req.body;
      
      // Mock: 정규화된 감성 분석 결과 생성
      // 세 개의 랜덤 값을 생성하고 정규화하여 합이 1이 되도록 함
      let positive = Math.random();
      let negative = Math.random();
      let neutral = Math.random();
      
      const total = positive + negative + neutral;
      positive = positive / total;
      negative = negative / total;
      neutral = neutral / total;
      
      const tones = [];
      if (positive > 0.4) tones.push('joyful', 'optimistic');
      if (negative > 0.3) tones.push('serious');
      if (neutral > 0.4) tones.push('neutral');
      
      const result = {
        positive: Math.max(0, Math.min(1, positive)),
        neutral: Math.max(0, Math.min(1, neutral)),
        negative: Math.max(0, Math.min(1, negative)),
        tones,
        media_scores: imageUrl ? {
          aesthetics: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
          quality: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
        } : undefined,
      };
      
      res.json(result);
    } catch (error) {
      console.error("AI analyze error:", error);
      res.status(500).json({ error: "분석 실패" });
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
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "게시물 생성에 실패했습니다" });
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
    try {
      const postId = req.params.postId;
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
      }

      let conversation = await storage.getConversationByPost(postId);
      
      // Conversation이 없으면 자동 생성 및 AI 매칭
      if (!conversation) {
        // 게시물 작성자의 페르소나 가져오기
        const authorPersona = await storage.getPersonaByUserId(post.userId);

        // 1. Conversation 생성
        conversation = await storage.createConversationForPost(
          postId,
          'persona',
          authorPersona?.id || 'system'
        );

        // 2. 작성자(user)와 작성자 페르소나를 participant로 추가
        const author = await storage.getUser(post.userId);
        if (author) {
          try {
            await storage.addParticipant({
              conversationId: conversation.id,
              participantType: 'user',
              participantId: author.id,
              role: 'member',
            });
          } catch (error) {
            // Unique constraint 에러 무시
          }
        }

        if (authorPersona) {
          try {
            await storage.addParticipant({
              conversationId: conversation.id,
              participantType: 'persona',
              participantId: authorPersona.id,
              role: 'member',
            });
            
            const authorUser = await storage.getUser(authorPersona.userId);
            const username = authorUser?.username?.split('_')?.[0] ?? '알수없음';
            await storage.createMessageInConversation({
              conversationId: conversation.id,
              senderType: 'system',
              senderId: 'system',
              content: `@${username}의 페르소나가 입장했습니다.`,
              messageType: 'join',
            });
          } catch (error) {
            // Unique constraint 에러 무시
          }
        }

        // 3. AI 페르소나 매칭 (2-3개, 작성자 페르소나 제외)
        const allPersonas = await storage.getAllPersonas();
        const excludeIds = authorPersona ? [authorPersona.id] : [];
        const availablePersonas = allPersonas.filter(p => !excludeIds.includes(p.id));
        
        if (availablePersonas.length > 0) {
          const count = Math.min(Math.floor(Math.random() * 2) + 2, availablePersonas.length); // 2-3개
          const shuffled = availablePersonas.sort(() => 0.5 - Math.random());
          const selectedPersonas = shuffled.slice(0, count);

          // 4. 참여자 추가
          for (const persona of selectedPersonas) {
            try {
              await storage.addParticipant({
                conversationId: conversation.id,
                participantType: 'persona',
                participantId: persona.id,
                role: 'member',
              });
              
              const personaUser = await storage.getUser(persona.userId);
              const username = personaUser?.username?.split('_')?.[0] ?? '알수없음';
              await storage.createMessageInConversation({
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 'system',
                content: `@${username}의 페르소나가 입장했습니다.`,
                messageType: 'join',
              });
            } catch (error) {
              // Unique constraint 에러 무시
            }
          }

          // 5. 초기 대화 생성 (OpenAI) - 작성자 페르소나 제외, AI들만 반응 생성
          if (process.env.OPENAI_API_KEY) {
            try {
              // 선택된 AI 페르소나들만 초기 메시지 생성 (작성자 페르소나 제외)
              for (let i = 0; i < selectedPersonas.length; i++) {
                const persona = selectedPersonas[i];
                const stats = {
                  empathy: persona.empathy ?? 5,
                  humor: persona.humor ?? 5,
                  sociability: persona.sociability ?? 5,
                  creativity: persona.creativity ?? 5,
                  knowledge: persona.knowledge ?? 5,
                };

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
                if (stats.empathy >= 8) systemPrompt += `- 공감력이 매우 뛰어납니다.\n`;
                if (stats.humor >= 8) systemPrompt += `- 유머 감각이 뛰어납니다.\n`;
                if (stats.sociability >= 8) systemPrompt += `- 사교성이 매우 높습니다.\n`;
                if (stats.creativity >= 8) systemPrompt += `- 창의성이 뛰어납니다.\n`;
                if (stats.knowledge >= 8) systemPrompt += `- 지식이 풍부합니다.\n`;

                systemPrompt += `\n**응답 가이드라인:**\n`;
                systemPrompt += `- 게시물에 대한 자연스러운 첫 반응을 1-2 문장으로 작성하세요.\n`;
                systemPrompt += `- 다른 AI 페르소나들과 대화하는 것처럼 작성하세요.\n`;

                const completion = await openai.chat.completions.create({
                  model: "gpt-4o-mini",
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "게시물에 대한 당신의 첫 반응을 작성하세요." }
                  ],
                  temperature: 0.8,
                  max_tokens: 200,
                });

                const response = completion.choices[0]?.message?.content?.trim() || "";
                
                // 빈 응답 체크
                if (!response || response.length === 0) {
                  console.warn(`[INIT AI] Empty response for persona ${persona.id}, skipping`);
                  continue;
                }

                // 점진적 타이밍: 각 페르소나마다 5-15초 간격으로 메시지가 표시되도록 설정
                const baseDelay = 5;
                const randomDelay = Math.floor(Math.random() * 10);
                const delaySeconds = baseDelay + randomDelay + (i * 8);
                const visibleAt = new Date(Date.now() + delaySeconds * 1000);

                // 메시지 저장 (visibleAt 설정)
                await storage.createMessageInConversation({
                  conversationId: conversation.id,
                  senderType: 'persona',
                  senderId: persona.id,
                  content: response,
                  messageType: 'text',
                  visibleAt,
                });
              }
            } catch (error) {
              console.error('[AUTO CONVERSE ERROR]', error);
              // 초기 대화 생성 실패해도 계속 진행
            }
          }
        }
      }
      
      const messages = await storage.getMessagesByConversation(conversation.id, req.userId);
      const participants = await storage.getParticipantsByConversation(conversation.id);
      
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
      });
    } catch (error) {
      res.status(500).json({ message: "메시지를 가져오는데 실패했습니다" });
    }
  });

  // POST /api/perso/:postId/messages - 페르소 메시지 작성 (새 스키마)
  app.post("/api/perso/:postId/messages", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "인증되지 않은 사용자입니다" });
      }
      
      const { content, isAI, personaId } = req.body;
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
      const tempMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempMessage = {
        id: tempMessageId,
        conversationId: conversation.id,
        senderType,
        senderId,
        content,
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      
      // WebSocket으로 즉시 브로드캐스트
      const io = getIO();
      if (io) {
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
        
        io.to(`conversation:${conversation.id}`).emit('message:new', messageWithInfo);
      }
      
      // DB 저장은 비동기로 (await 없이, 성능 향상)
      storage.createMessageInConversation({
        conversationId: conversation.id,
        senderType,
        senderId,
        content,
        messageType: 'text',
      }).catch(error => {
        console.error('[MESSAGE SAVE ERROR]', error);
        // TODO: 에러 시 재시도 로직 또는 Dead Letter Queue
      });
      
      res.json(tempMessage);
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

  // POST /api/perso/:postId/ai-response - 게시물 대화에 대한 AI 응답 생성
  app.post("/api/perso/:postId/ai-response", authenticateToken, async (req, res) => {
    try {
      const postId = req.params.postId;
      const { personaId, recentMessages } = req.body;

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

      // 6. OpenAI API 호출
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

      // 7. 응답 반환
      res.json({
        content: rawResponse,
        persona: {
          id: persona.id,
          name: persona.name,
          image: persona.image,
        },
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
