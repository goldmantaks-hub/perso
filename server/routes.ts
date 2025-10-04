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
          const messages = await storage.getMessagesByPost(post.id);
          
          // 최근 메시지 3개 가져오기 (최신순으로 정렬 후 3개 선택)
          const sortedMessages = [...messages].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const recentMessages = await Promise.all(
            sortedMessages.slice(0, 3).map(async (msg) => {
              if (msg.isAI && msg.personaId) {
                const msgPersona = await storage.getPersona(msg.personaId);
                return {
                  ...msg,
                  persona: msgPersona ? {
                    name: msgPersona.name,
                    image: msgPersona.image,
                  } : null,
                };
              } else if (!msg.isAI && msg.userId) {
                const msgUser = await storage.getUser(msg.userId);
                return {
                  ...msg,
                  user: msgUser ? {
                    name: msgUser.name,
                    username: msgUser.username,
                    profileImage: msgUser.profileImage,
                  } : null,
                };
              }
              return msg;
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

  // GET /api/perso/:postId/messages - 페르소 메시지 가져오기
  app.get("/api/perso/:postId/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByPost(req.params.postId);
      
      // 각 메시지에 사용자/페르소나 정보 추가
      const messagesWithInfo = await Promise.all(
        messages.map(async (msg) => {
          if (msg.isAI && msg.personaId) {
            const persona = await storage.getPersona(msg.personaId);
            return {
              ...msg,
              persona: persona ? {
                name: persona.name,
                image: persona.image,
              } : null,
            };
          } else if (!msg.isAI && msg.userId) {
            const user = await storage.getUser(msg.userId);
            return {
              ...msg,
              user: user ? {
                name: user.name,
                username: user.username,
                profileImage: user.profileImage,
              } : null,
            };
          }
          return msg;
        })
      );
      
      res.json(messagesWithInfo);
    } catch (error) {
      res.status(500).json({ message: "메시지를 가져오는데 실패했습니다" });
    }
  });

  // POST /api/perso/:postId/messages - 페르소 메시지 작성
  app.post("/api/perso/:postId/messages", async (req, res) => {
    try {
      const { content, isAI, personaId } = req.body;
      
      const validatedData = insertPersoMessageSchema.parse({
        postId: req.params.postId,
        content,
        isAI: isAI || false,
        personaId: isAI ? personaId : null,
        userId: isAI ? null : CURRENT_USER_ID,
      });
      
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "메시지 작성에 실패했습니다" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
