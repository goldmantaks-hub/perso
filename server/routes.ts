import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertLikeSchema, insertCommentSchema, insertPersoMessageSchema } from "@shared/schema";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // OpenAI 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // 임시 현재 사용자 ID (추후 인증 시스템과 통합)
  const CURRENT_USER_ID = "temp-user-id";

  // GET /api/user/persona - 현재 사용자의 페르소나 가져오기
  app.get("/api/user/persona", async (req, res) => {
    try {
      const persona = await storage.getPersonaByUserId(CURRENT_USER_ID);
      if (!persona) {
        return res.status(404).json({ message: "페르소나를 찾을 수 없습니다" });
      }
      res.json(persona);
    } catch (error) {
      res.status(500).json({ message: "페르소나를 가져오는데 실패했습니다" });
    }
  });

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
