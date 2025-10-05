import { Server as SocketServer } from "socket.io";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import { log } from "./vite";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface AuthenticatedSocket {
  userId: string;
  username: string;
}

export function setupWebSocket(server: Server) {
  const io = new SocketServer(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  // WebSocket 인증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("인증 토큰이 필요합니다"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedSocket;
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch (error) {
      next(new Error("유효하지 않은 토큰입니다"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    log(`[WS] User ${userId} connected`);

    // 대화방 참여
    socket.on("join:conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      log(`[WS] User ${userId} joined conversation ${conversationId}`);
    });

    // 대화방 나가기
    socket.on("leave:conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      log(`[WS] User ${userId} left conversation ${conversationId}`);
    });

    // 연결 해제
    socket.on("disconnect", () => {
      log(`[WS] User ${userId} disconnected`);
    });
  });

  return io;
}

export type { SocketServer };
