import { Server as SocketServer } from "socket.io";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import { log } from "./vite";
import { config } from "./config";
import { storage } from "./storage";

const JWT_SECRET = config.jwtSecret;

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
    const username = socket.data.username;
    log(`[WS] User ${userId} connected`);

    // 대화방 참여
    socket.on("join:conversation", async (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      log(`[WS] User ${userId} joined conversation ${conversationId}`);
      
      // 입장 시스템 메시지 생성
      const content = `${username}님이 입장했습니다`;
      
      // 데이터베이스에 시스템 메시지 저장 (비동기, fire-and-forget)
      storage.createMessageInConversation({
        conversationId,
        senderType: 'system',
        senderId: 'system',
        content,
        messageType: 'join',
      }).then(savedMessage => {
        // 저장된 메시지를 브로드캐스트
        const joinMessage = {
          id: savedMessage.id,
          conversationId: savedMessage.conversationId,
          senderType: savedMessage.senderType,
          senderId: savedMessage.senderId,
          messageType: savedMessage.messageType,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
        };
        
        io.to(`conversation:${conversationId}`).emit('message:system', joinMessage);
      }).catch(error => {
        log(`[WS] Error saving join message: ${error}`);
      });
    });

    // 대화방 나가기
    socket.on("leave:conversation", async (conversationId: string) => {
      log(`[WS] User ${userId} left conversation ${conversationId}`);
      
      // 퇴장 시스템 메시지 생성
      const content = `${username}님이 나갔습니다`;
      
      // 데이터베이스에 시스템 메시지 저장 (비동기, fire-and-forget)
      storage.createMessageInConversation({
        conversationId,
        senderType: 'system',
        senderId: 'system',
        content,
        messageType: 'leave',
      }).then(savedMessage => {
        // 저장된 메시지를 브로드캐스트
        const leaveMessage = {
          id: savedMessage.id,
          conversationId: savedMessage.conversationId,
          senderType: savedMessage.senderType,
          senderId: savedMessage.senderId,
          messageType: savedMessage.messageType,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
        };
        
        io.to(`conversation:${conversationId}`).emit('message:system', leaveMessage);
      }).catch(error => {
        log(`[WS] Error saving leave message: ${error}`);
      });
      
      socket.leave(`conversation:${conversationId}`);
    });

    // 연결 해제
    socket.on("disconnect", () => {
      log(`[WS] User ${userId} disconnected`);
    });
  });

  return io;
}

export type { SocketServer };
