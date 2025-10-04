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
      
      // 각 게시물의 좋아요 수와 댓글 수 가져오기
      const postsWithStats = await Promise.all(
        allPosts.map(async (post) => {
          const likesCount = await storage.getLikesByPost(post.id);
          const comments = await storage.getCommentsByPost(post.id);
          const isLiked = await storage.checkUserLike(post.id, CURRENT_USER_ID);
          const messages = await storage.getMessagesByPost(post.id);
          
          return {
            ...post,
            likesCount,
            commentsCount: comments.length,
            isLiked,
            hasPerso: messages.length > 0,
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
      res.json(messages);
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
