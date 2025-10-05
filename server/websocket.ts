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

  console.log('[WS] WebSocket server initialized');

  // WebSocket 인증 미들웨어
  io.use((socket, next) => {
    console.log('[WS] Authentication middleware triggered');
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('[WS] No token provided');
      return next(new Error("인증 토큰이 필요합니다"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedSocket;
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      console.log(`[WS] Auth successful for user ${decoded.userId}`);
      next();
    } catch (error) {
      console.log('[WS] Auth failed:', error);
      next(new Error("유효하지 않은 토큰입니다"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const username = socket.data.username;
    console.log(`[WS] User ${userId} (${username}) connected`);
    log(`[WS] User ${userId} connected`);

    // 대화방 참여
    socket.on("join:conversation", async (conversationId: string) => {
      console.log(`[WS] join:conversation event received from ${userId} for conversation ${conversationId}`);
      socket.join(`conversation:${conversationId}`);
      log(`[WS] User ${userId} joined conversation ${conversationId}`);
      
      // 입장 시스템 메시지 생성
      const content = `${username}님이 입장했습니다`;
      console.log(`[WS] Creating join message: ${content}`);
      
      // 데이터베이스에 시스템 메시지 저장 (비동기, fire-and-forget)
      storage.createMessageInConversation({
        conversationId,
        senderType: 'system',
        senderId: 'system',
        content,
        messageType: 'join',
      }).then(savedMessage => {
        console.log(`[WS] Join message saved, broadcasting to room conversation:${conversationId}`);
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
        console.log('[WS] Join message broadcasted');
      }).catch(error => {
        console.error(`[WS] Error saving join message:`, error);
        log(`[WS] Error saving join message: ${error}`);
      });
    });

    // 대화방 나가기
    socket.on("leave:conversation", async (conversationId: string) => {
      console.log(`[WS] leave:conversation event received from ${userId} for conversation ${conversationId}`);
      log(`[WS] User ${userId} left conversation ${conversationId}`);
      
      // 퇴장 시스템 메시지 생성
      const content = `${username}님이 나갔습니다`;
      console.log(`[WS] Creating leave message: ${content}`);
      
      // 데이터베이스에 시스템 메시지 저장 (비동기, fire-and-forget)
      storage.createMessageInConversation({
        conversationId,
        senderType: 'system',
        senderId: 'system',
        content,
        messageType: 'leave',
      }).then(savedMessage => {
        console.log(`[WS] Leave message saved, broadcasting to room conversation:${conversationId}`);
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
        console.log('[WS] Leave message broadcasted');
      }).catch(error => {
        console.error(`[WS] Error saving leave message:`, error);
        log(`[WS] Error saving leave message: ${error}`);
      });
      
      socket.leave(`conversation:${conversationId}`);
    });

    // AI 대화 오케스트레이션
    socket.on("ai:dialogue", async (data: {
      postId: string;
      postContent: string;
      analysis: any;
      personas?: string[];
    }) => {
      try {
        console.log(`[WS] ai:dialogue event received from ${userId}`);
        console.log(`[WS] Post: "${data.postContent}"`);
        
        const { dialogueOrchestrator } = await import('./engine/dialogueOrchestrator.js');
        
        const post = {
          id: data.postId,
          content: data.postContent
        };
        
        const dialogues = await dialogueOrchestrator(post, data.analysis, data.personas);
        
        console.log(`[WS] Generated ${dialogues.length} dialogue responses`);
        
        for (let i = 0; i < dialogues.length; i++) {
          const dialogue = dialogues[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          socket.emit('ai:dialogue:message', {
            postId: data.postId,
            persona: dialogue.persona,
            message: dialogue.message,
            type: dialogue.type,
            index: i,
            total: dialogues.length
          });
          
          console.log(`[WS] Sent dialogue ${i + 1}/${dialogues.length}: ${dialogue.persona}`);
        }
        
        socket.emit('ai:dialogue:complete', {
          postId: data.postId,
          totalMessages: dialogues.length
        });
        
        console.log(`[WS] Dialogue orchestration complete for post ${data.postId}`);

        const emotionData = dialogues.map(dialogue => ({
          timestamp: Date.now(),
          emotion: dialogue.type === 'empath' ? 'empathetic' :
                   dialogue.type === 'humor' ? 'playful' :
                   dialogue.type === 'knowledge' ? 'analytical' :
                   dialogue.type === 'creative' ? 'imaginative' : 'neutral',
          intensity: 0.8,
          personaName: dialogue.persona
        }));

        socket.emit('conversation:end', {
          postId: data.postId,
          emotionData,
          timestamp: Date.now()
        });
        
        console.log(`[WS] Conversation ended for post ${data.postId}`);
      } catch (error) {
        console.error('[WS] Error in dialogue orchestration:', error);
        socket.emit('ai:dialogue:error', {
          postId: data.postId,
          error: 'Failed to generate dialogue'
        });
      }
    });

    // 사용자 참여형 대화 (Human-in-the-Loop)
    socket.on("user:message", async (data: {
      postId: string;
      message: string;
      postContent: string;
      analysis: any;
    }) => {
      try {
        console.log(`[WS] user:message event received from ${userId}`);
        console.log(`[WS] User message: "${data.message}"`);
        
        socket.emit('user:message:typing', { postId: data.postId });
        
        const { handleUserMessage } = await import('./engine/humanBridge.js');
        
        const postContext = {
          postId: data.postId,
          postContent: data.postContent,
          analysis: data.analysis
        };
        
        const aiResponses = await handleUserMessage(userId, username, data.message, postContext);
        
        console.log(`[WS] Generated ${aiResponses.length} AI responses to user message`);
        
        for (let i = 0; i < aiResponses.length; i++) {
          const response = aiResponses[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          socket.emit('user:message:response', {
            postId: data.postId,
            persona: response.persona,
            message: response.message,
            type: response.type,
            index: i,
            total: aiResponses.length
          });
          
          console.log(`[WS] Sent AI response ${i + 1}/${aiResponses.length}: ${response.persona}`);
        }
        
        socket.emit('user:message:complete', {
          postId: data.postId,
          totalResponses: aiResponses.length
        });
        
        console.log(`[WS] User message handled for post ${data.postId}`);

        const emotionData = aiResponses.map(response => ({
          timestamp: Date.now(),
          emotion: response.type === 'empath' ? 'empathetic' :
                   response.type === 'humor' ? 'playful' :
                   response.type === 'knowledge' ? 'analytical' :
                   response.type === 'creative' ? 'imaginative' : 'neutral',
          intensity: 0.8,
          personaName: response.persona
        }));

        socket.emit('conversation:end', {
          postId: data.postId,
          emotionData,
          timestamp: Date.now()
        });
        
        console.log(`[WS] Conversation ended for post ${data.postId}`);
      } catch (error) {
        console.error('[WS] Error handling user message:', error);
        socket.emit('user:message:error', {
          postId: data.postId,
          error: 'Failed to process message'
        });
      }
    });

    // 연결 해제
    socket.on("disconnect", () => {
      console.log(`[WS] User ${userId} disconnected`);
      log(`[WS] User ${userId} disconnected`);
    });
  });

  return io;
}

export type { SocketServer };
