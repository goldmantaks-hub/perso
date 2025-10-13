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

let ioInstance: SocketServer;

export function setupWebSocket(server: Server) {
  const io = new SocketServer(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });
  
  // IO 인스턴스를 전역으로 저장
  ioInstance = io;
  (global as any).ioInstance = io;

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

    // 대화방 참여 - 새로고침은 아무것도 하지 않음
  socket.on("join:conversation", async (conversationId: string, action: string = 'refresh') => {
    console.log(`[WS] join:conversation event received from ${userId} for conversation ${conversationId}, action: ${action}`);
    console.log(`[WS] Action type:`, typeof action, 'Value:', JSON.stringify(action));
      socket.join(`conversation:${conversationId}`);
      log(`[WS] User ${userId} joined conversation ${conversationId}`);
      
      // 새로고침인 경우 아무것도 하지 않음
      if (action === 'refresh') {
        console.log(`[WS] Refresh detected for ${userId}, no action taken`);
        return;
      }
      
      // 실제 입장인 경우에만 처리
      if (action === 'join') {
        console.log(`[WS] Real join detected for ${userId}, creating join message`);
        console.log(`[WS] Username: ${username}, ConversationId: ${conversationId}`);
        
        // 사용자를 participant로 추가 (없으면 추가, 있으면 무시)
        try {
          await storage.addParticipant({
            conversationId,
            participantType: 'user',
            participantId: userId,
            role: 'member',
          });
          console.log(`[WS] User ${userId} added as participant`);
        } catch (error) {
          // Unique constraint 에러는 무시 (이미 참가자임)
          console.log(`[WS] User ${userId} already a participant or error:`, error);
        }
        
        // 최근 입장 메시지가 있는지 확인 (1분 이내)
        const recentMessages = await storage.getMessagesByConversation(conversationId);
        const recentJoinMessage = recentMessages.find(msg => 
          msg.senderType === 'system' && 
          msg.messageType === 'join' && 
          msg.senderId === userId &&
          (Date.now() - new Date(msg.createdAt).getTime()) < 60000 // 1분 이내
        );
        
        if (recentJoinMessage) {
          console.log(`[WS] Recent join message found for ${userId}, skipping duplicate`);
          console.log(`[WS] Recent message time: ${recentJoinMessage.createdAt}, current time: ${new Date().toISOString()}`);
          return;
        }
        
        // 사용자 정보 가져오기 (실제 이름 사용)
        let displayName = username;
        try {
          const user = await storage.getUser(userId);
          if (user && user.name) {
            displayName = user.name;
          }
        } catch (error) {
          console.log(`[WS] Could not fetch user info for ${userId}, using username: ${username}`);
        }
        
        // 사용자 입장 메시지 생성 (페르소나와 구분)
        const userContent = `👤 ${displayName}님이 입장했습니다`;
        console.log(`[WS] Creating user join message: ${userContent}`);
        
        // 데이터베이스에 사용자 입장 메시지 저장
        storage.createMessageInConversation({
          conversationId,
          senderType: 'system',
          senderId: userId,
          content: userContent,
          messageType: 'join',
        }).then(savedMessage => {
          console.log(`[WS] User join message saved with ID: ${savedMessage.id}, broadcasting to room conversation:${conversationId}`);
          console.log(`[WS] Message content: ${savedMessage.content}`);
          console.log(`[WS] Message type: ${savedMessage.messageType}`);
          
          // 브로드캐스트
          io.to(`conversation:${conversationId}`).emit('message:system', {
            id: savedMessage.id,
            conversationId: savedMessage.conversationId,
            senderType: savedMessage.senderType,
            senderId: savedMessage.senderId,
            messageType: savedMessage.messageType,
            content: savedMessage.content,
            createdAt: savedMessage.createdAt.toISOString(),
          });
          
          console.log('[WS] User join message broadcasted');
        }).catch(error => {
          console.error(`[WS] Error saving user join message:`, error);
        });

      }
    });

    // 대화방 나가기 - 뒤로가기만 퇴장 메시지 생성
    socket.on("leave:conversation", async (conversationId: string, action: string = 'disconnect') => {
      console.log(`[WS] leave:conversation event received from ${userId} for conversation ${conversationId}, action: ${action}`);
      log(`[WS] User ${userId} left conversation ${conversationId}`);
      
      // 뒤로가기인 경우에만 퇴장 메시지 생성
      if (action === 'back') {
        console.log(`[WS] Back button detected for ${userId}, creating leave message`);
        
        // 사용자 정보 가져오기 (실제 이름 사용)
        let displayName = username;
        try {
          const user = await storage.getUser(userId);
          if (user && user.name) {
            displayName = user.name;
          }
        } catch (error) {
          console.log(`[WS] Could not fetch user info for ${userId}, using username: ${username}`);
        }
        
        // 사용자 퇴장 메시지 생성 (페르소나와 구분)
        const userContent = `👤 ${displayName}님이 나갔습니다`;
        console.log(`[WS] Creating user leave message: ${userContent}`);
        
        // 중복 퇴장 메시지 방지를 위한 체크
        // 최근 시스템 메시지들을 확인하여 같은 사용자의 퇴장 메시지가 있는지 체크
        const recentMessages = await storage.getMessagesByConversation(conversationId);
        const recentLeaveMessages = recentMessages
          .filter(msg => 
            msg.senderType === 'system' && 
            msg.senderId === userId && 
            msg.messageType === 'leave'
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (recentLeaveMessages.length > 0) {
          const lastLeaveTime = new Date(recentLeaveMessages[0].createdAt).getTime();
          const timeDiff = Date.now() - lastLeaveTime;
          
          // 60초 이내에 퇴장 메시지가 있으면 중복으로 간주
          if (timeDiff < 60000) {
            console.log(`[WS] Duplicate leave message prevented for ${username}, time diff: ${timeDiff}ms`);
            return;
          }
        }
        
        // 데이터베이스에 사용자 퇴장 메시지 저장
        storage.createMessageInConversation({
          conversationId,
          senderType: 'system',
          senderId: userId,
          content: userContent,
          messageType: 'leave',
        }).then(savedMessage => {
          console.log(`[WS] User leave message saved, broadcasting to room conversation:${conversationId}`);
          
          // 브로드캐스트
          io.to(`conversation:${conversationId}`).emit('message:system', {
            id: savedMessage.id,
            conversationId: savedMessage.conversationId,
            senderType: savedMessage.senderType,
            senderId: savedMessage.senderId,
            messageType: savedMessage.messageType,
            content: savedMessage.content,
            createdAt: savedMessage.createdAt.toISOString(),
          });
          
          console.log('[WS] User leave message broadcasted');
        }).catch(error => {
          console.error(`[WS] Error saving user leave message:`, error);
        });

        // 사용자의 페르소나는 별도로 퇴장 메시지를 생성하지 않음
        // (사용자 퇴장 메시지 하나로 통합)
        console.log(`[WS] User ${userId} left conversation, persona will remain active`);
      } else {
        console.log(`[WS] Non-back leave for ${userId} (${action}), skipping leave message`);
      }
      
      socket.leave(`conversation:${conversationId}`);
    });

    // AI 대화 오케스트레이션 (Multi-Agent)
    socket.on("ai:dialogue", async (data: {
      postId: string;
      postContent: string;
      analysis: any;
      personas?: string[];
    }) => {
      try {
        console.log(`[WS] ai:dialogue event received from ${userId}`);
        console.log(`[WS] Post: "${data.postContent}"`);
        
        // Multi-agent 오케스트레이터와 관련 모듈들 import
        const { multiAgentDialogueOrchestrator } = await import('./engine/multiAgentDialogueOrchestrator.js');
        const { persoRoomManager } = await import('./engine/persoRoom.js');
        const { checkJoinLeaveEvents, executeJoinLeaveEvents } = await import('./engine/joinLeaveManager.js');
        const { checkHandover } = await import('./engine/handoverManager.js');
        
        const post = {
          id: data.postId,
          content: data.postContent,
          userId
        };
        
        // Multi-agent 오케스트레이션 실행
        const result = await multiAgentDialogueOrchestrator(post, data.analysis, data.personas);
        
        console.log(`[WS] Generated ${result.messages.length} dialogue responses, ${result.joinLeaveEvents.length} events`);
        
        // 룸 상태 확인 및 페르소나 상태 업데이트
        const room = persoRoomManager.get(result.roomId);
        if (room) {
          // 현재 활성 페르소나 상태 전송
          socket.emit('persona:status:update', {
            postId: data.postId,
            roomId: result.roomId,
            activePersonas: room.activePersonas.map(p => ({
              id: p.id,
              status: p.status,
              joinedAt: p.joinedAt,
              lastSpokeAt: p.lastSpokeAt,
              messageCount: p.messageCount
            })),
            dominantPersona: room.dominantPersona,
            currentTopics: room.currentTopics,
            totalTurns: room.totalTurns
          });
          
          console.log(`[WS] Sent persona status update for room ${result.roomId}`);
        }
        
        // 입장/퇴장 이벤트 처리 및 실시간 전달
        for (const event of result.joinLeaveEvents) {
          console.log(`[WS] Processing ${event.eventType} event for ${event.personaId}`);
          
          // 이벤트 타입에 따른 시스템 메시지 생성
          let systemMessage = '';
          if (event.eventType === 'join') {
            // 페르소나 입장 메시지는 생성하지 않음 (사용자 입장 메시지로 통합)
            console.log(`[WS] Persona ${event.personaId} joined, but not creating separate join message`);
            continue;
          } else if (event.eventType === 'leave') {
            // 페르소나 퇴장 메시지는 생성하지 않음 (사용자 퇴장 메시지로 통합)
            console.log(`[WS] Persona ${event.personaId} left, but not creating separate leave message`);
            continue;
          }
          
          // 이 부분은 실행되지 않아야 함 (continue로 인해)
          console.log(`[WS] ERROR: This should not be reached for ${event.eventType} event`);
          
          // 시스템 메시지 전송
          if (systemMessage) {
            socket.emit('message:system', {
              id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              postId: data.postId,
              roomId: result.roomId,
              senderType: 'system',
              senderId: event.personaId, // 실제 페르소나 ID 사용
              messageType: event.eventType,
              content: systemMessage,
              timestamp: Date.now(),
              // 발신자 정보 추가
              persona: {
                name: event.personaId,
                id: event.personaId
              }
            });
          }
          
          // 페르소나 이벤트 전송
          socket.emit('persona:event', {
            postId: data.postId,
            roomId: result.roomId,
            personaId: event.personaId,
            eventType: event.eventType,
            autoIntroduction: event.autoIntroduction,
            timestamp: Date.now()
          });
          
          // 자동 소개 메시지가 있는 경우 별도로 전송
          if (event.autoIntroduction) {
            socket.emit('persona:auto-introduction', {
              postId: data.postId,
              roomId: result.roomId,
              personaId: event.personaId,
              introduction: event.autoIntroduction,
              timestamp: Date.now()
            });
          }
        }
        
        // 대화 메시지들을 순차적으로 전송
        for (let i = 0; i < result.messages.length; i++) {
          const msg = result.messages[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          // 메시지 전송
          socket.emit('ai:dialogue:message', {
            postId: data.postId,
            roomId: result.roomId,
            persona: msg.persona,
            message: msg.message,
            thinking: msg.thinking,
            type: msg.type,
            expandedInfo: msg.expandedInfo,
            index: i,
            total: result.messages.length,
            timestamp: Date.now()
          });
          
          // 주도권 교체가 발생했는지 확인
          if (room) {
            const handoverResult = checkHandover(
              room.currentTopics,
              room.previousTopics,
              room.dominantPersona || '',
              room.turnsSinceDominantChange,
              room.activePersonas,
              result.messages.map(m => ({ persona: m.persona, message: m.message }))
            );
            
            if (handoverResult.shouldHandover && handoverResult.newDominant) {
              console.log(`[WS] Handover detected: ${handoverResult.newDominant}`);
              
              // 주도권 교체 알림 전송
              socket.emit('persona:handover', {
                postId: data.postId,
                roomId: result.roomId,
                previousDominant: room.dominantPersona,
                newDominant: handoverResult.newDominant,
                reason: handoverResult.reason,
                timestamp: Date.now()
              });
            }
          }
          
          console.log(`[WS] Sent dialogue ${i + 1}/${result.messages.length}: ${msg.persona}`);
        }
        
        // 입장/퇴장 이벤트 처리 및 실시간 전달
        for (const event of result.joinLeaveEvents) {
          console.log(`[WS] Processing ${event.eventType} event for ${event.personaId}`);
          
          // 이벤트 타입에 따른 시스템 메시지 생성
          let systemMessage = '';
          if (event.eventType === 'join') {
            // 페르소나 입장 메시지 생성
            const persona = await storage.getPersona(event.personaId);
            if (persona) {
              const personaOwner = await storage.getUser(persona.userId);
              const displayName = personaOwner 
                ? `${personaOwner.name}의 ${persona.name}`
                : persona.name;
              
              systemMessage = `🤖 ${displayName}님이 대화에 참여했습니다`;
              
             // 데이터베이스에 페르소나 입장 메시지 저장
             try {
               // postId로 conversation 찾기
               const conversation = await storage.getConversationByPost(data.postId);
               if (!conversation) {
                 console.error(`[WS] No conversation found for post ${data.postId}`);
                 continue;
               }
               
               const savedMessage = await storage.createMessageInConversation({
                 conversationId: conversation.id, // 실제 conversation ID 사용
                 senderType: 'system',
                 senderId: event.personaId,
                 content: systemMessage,
                 messageType: 'join',
               });
                
                console.log(`[WS] Persona join message saved with ID: ${savedMessage.id}`);
                
                // 브로드캐스트
                io.to(`conversation:${data.postId}`).emit('message:system', {
                  id: savedMessage.id,
                  conversationId: savedMessage.conversationId,
                  senderType: savedMessage.senderType,
                  senderId: savedMessage.senderId,
                  messageType: savedMessage.messageType,
                  content: savedMessage.content,
                  createdAt: savedMessage.createdAt.toISOString(),
                });
                
                console.log('[WS] Persona join message broadcasted');
              } catch (error) {
                console.error(`[WS] Error saving persona join message:`, error);
              }
            }
          } else if (event.eventType === 'leave') {
            // 페르소나 퇴장 메시지 생성
            const persona = await storage.getPersona(event.personaId);
            if (persona) {
              const personaOwner = await storage.getUser(persona.userId);
              const displayName = personaOwner 
                ? `${personaOwner.name}의 ${persona.name}`
                : persona.name;
              
              systemMessage = `🤖 ${displayName}님이 대화를 떠났습니다`;
              
              // 데이터베이스에 페르소나 퇴장 메시지 저장
              try {
                // postId로 conversation 찾기
                const conversation = await storage.getConversationByPost(data.postId);
                if (!conversation) {
                  console.error(`[WS] No conversation found for post ${data.postId}`);
                  continue;
                }
                
                const savedMessage = await storage.createMessageInConversation({
                  conversationId: conversation.id, // 실제 conversation ID 사용
                  senderType: 'system',
                  senderId: event.personaId,
                  content: systemMessage,
                  messageType: 'leave',
                });
                
                console.log(`[WS] Persona leave message saved with ID: ${savedMessage.id}`);
                
                // 브로드캐스트
                io.to(`conversation:${data.postId}`).emit('message:system', {
                  id: savedMessage.id,
                  conversationId: savedMessage.conversationId,
                  senderType: savedMessage.senderType,
                  senderId: savedMessage.senderId,
                  messageType: savedMessage.messageType,
                  content: savedMessage.content,
                  createdAt: savedMessage.createdAt.toISOString(),
                });
                
                console.log('[WS] Persona leave message broadcasted');
              } catch (error) {
                console.error(`[WS] Error saving persona leave message:`, error);
              }
            }
          }
        }
        
        // 대화 완료 알림
        socket.emit('ai:dialogue:complete', {
          postId: data.postId,
          roomId: result.roomId,
          totalMessages: result.messages.length,
          totalEvents: result.joinLeaveEvents.length
        });
        
        console.log(`[WS] Multi-agent dialogue complete for post ${data.postId}`);

        // 감정 데이터 생성 및 전송
        const emotionData = result.messages.map(msg => ({
          timestamp: Date.now(),
          emotion: msg.type === 'empath' ? 'empathetic' :
                   msg.type === 'humor' ? 'playful' :
                   msg.type === 'knowledge' ? 'analytical' :
                   msg.type === 'creative' ? 'imaginative' : 'neutral',
          intensity: 0.8,
          personaName: msg.persona
        }));

        socket.emit('conversation:end', {
          postId: data.postId,
          roomId: result.roomId,
          emotionData,
          timestamp: Date.now()
        });
        
        console.log(`[WS] Conversation ended for post ${data.postId}`);
      } catch (error) {
        console.error('[WS] Error in multi-agent dialogue orchestration:', error);
        socket.emit('ai:dialogue:error', {
          postId: data.postId,
          error: 'Failed to generate dialogue',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 사용자 참여형 대화 (Human-in-the-Loop)
    socket.on("user:message", async (data: {
      postId: string;
      message: string;
      postContent: string;
      analysis: any;
      conversationId?: string;
    }) => {
      try {
        console.log(`[WS] user:message event received from ${userId}`);
        console.log(`[WS] User message: "${data.message}"`);
        console.log(`[WS] ConversationId: ${data.conversationId}`);
        
        socket.emit('user:message:typing', { postId: data.postId });
        
        const { handleUserMessage } = await import('./engine/humanBridge.js');
        const { persoRoomManager } = await import('./engine/persoRoom.js');
        
        // 1. 사용자 메시지를 DB에 저장
        if (data.conversationId) {
          try {
            const savedUserMessage = await storage.createMessageInConversation({
              conversationId: data.conversationId,
              senderType: 'user',
              senderId: userId,
              content: data.message,
              messageType: 'text',
              thinking: null,
            });
            
            console.log(`[WS] User message saved to DB: ${savedUserMessage.id}`);
            
            // 2. 사용자 메시지를 WebSocket으로 브로드캐스트
            const user = await storage.getUser(userId);
            io.to(`conversation:${data.conversationId}`).emit('message:new', {
              id: savedUserMessage.id,
              conversationId: savedUserMessage.conversationId,
              senderType: 'user',
              senderId: userId,
              content: savedUserMessage.content,
              messageType: 'text',
              thinking: null,
              createdAt: savedUserMessage.createdAt.toISOString(),
              isAI: false,
              user: user ? {
                name: user.name,
                username: user.username,
                avatar: user.profileImage
              } : null
            });
            
            console.log(`[WS] User message broadcasted to conversation:${data.conversationId}`);
          } catch (error) {
            console.error(`[WS] Error saving/broadcasting user message:`, error);
          }
        }
        
        const postContext = {
          postId: data.postId,
          postContent: data.postContent,
          analysis: data.analysis
        };
        
        const aiResponses = await handleUserMessage(userId, username, data.message, postContext);
        
        console.log(`[WS] Generated ${aiResponses.length} AI responses to user message`);
        
        // 룸 상태 확인 (postId를 roomId로 사용)
        const room = persoRoomManager.getRoomByPostId(data.postId);
        if (room) {
          // 페르소나 상태 업데이트 전송
          socket.emit('persona:status:update', {
            postId: data.postId,
            roomId: room.roomId,
            activePersonas: room.activePersonas.map(p => ({
              id: p.id,
              status: p.status,
              joinedAt: p.joinedAt,
              lastSpokeAt: p.lastSpokeAt,
              messageCount: p.messageCount
            })),
            dominantPersona: room.dominantPersona,
            currentTopics: room.currentTopics,
            totalTurns: room.totalTurns
          });
          
          console.log(`[WS] Sent persona status update for room ${room.roomId}`);
        }
        
        for (let i = 0; i < aiResponses.length; i++) {
          const response = aiResponses[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          socket.emit('user:message:response', {
            postId: data.postId,
            roomId: room?.roomId,
            persona: response.persona,
            message: response.message,
            type: response.type,
            index: i,
            total: aiResponses.length,
            timestamp: Date.now()
          });
          
          console.log(`[WS] Sent AI response ${i + 1}/${aiResponses.length}: ${response.persona}`);
        }
        
        socket.emit('user:message:complete', {
          postId: data.postId,
          roomId: room?.roomId,
          totalResponses: aiResponses.length
        });
        
        console.log(`[WS] User message handled for post ${data.postId}`);
        
        // 자동 대화 트리거 (room 없으면 생성)
        let autoRoom = room;
        if (!autoRoom) {
          console.log(`[WS] Room not found for post ${data.postId}, creating new room for auto-chat`);
          
          // Post 내용 조회
          const post = await storage.getPost(data.postId);
          const postContent = post ? (post.description || post.title) : '';
          
          // 초기 페르소나 선택 (랜덤 3-4개)
          const allPersonas = ['Espri', 'Kai', 'Milo', 'Luna', 'Namu', 'Eden', 'Ava', 'Rho', 'Noir'];
          const personaCount = Math.floor(Math.random() * 2) + 3; // 3-4개
          const initialPersonas = allPersonas
            .sort(() => Math.random() - 0.5)
            .slice(0, personaCount);
          
          const contexts = data.analysis?.tones || [];
          autoRoom = persoRoomManager.createRoom(data.postId, postContent, initialPersonas, contexts);
          console.log(`[WS] Created room ${autoRoom.roomId} with personas: ${initialPersonas.join(', ')}`);
        }
        
        const { onUserMessage } = await import('./engine/autoTick.js');
        onUserMessage(autoRoom.roomId);
        console.log(`[WS] Triggered auto-chat for room ${autoRoom.roomId} after user message`);

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
          roomId: room?.roomId,
          emotionData,
          timestamp: Date.now()
        });
        
        console.log(`[WS] Conversation ended for post ${data.postId}`);
      } catch (error) {
        console.error('[WS] Error handling user message:', error);
        socket.emit('user:message:error', {
          postId: data.postId,
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 페르소나 상태 모니터링 요청
    socket.on("persona:status:request", async (data: {
      postId: string;
      roomId?: string;
    }) => {
      try {
        console.log(`[WS] persona:status:request received from ${userId} for post ${data.postId}`);
        
        const { persoRoomManager } = await import('./engine/persoRoom.js');
        
        let room;
        if (data.roomId) {
          room = persoRoomManager.get(data.roomId);
        } else {
          room = persoRoomManager.getRoomByPostId(data.postId);
        }
        
        if (room) {
          // 현재 페르소나 상태 전송
          socket.emit('persona:status:update', {
            postId: data.postId,
            roomId: room.roomId,
            activePersonas: room.activePersonas.map(p => ({
              id: p.id,
              status: p.status,
              joinedAt: p.joinedAt,
              lastSpokeAt: p.lastSpokeAt,
              messageCount: p.messageCount
            })),
            dominantPersona: room.dominantPersona,
            currentTopics: room.currentTopics,
            totalTurns: room.totalTurns,
            lastActivity: room.lastActivity
          });
          
          console.log(`[WS] Sent persona status for room ${room.roomId}`);
        } else {
          socket.emit('persona:status:not-found', {
            postId: data.postId,
            roomId: data.roomId
          });
          
          console.log(`[WS] Room not found for post ${data.postId}`);
        }
      } catch (error) {
        console.error('[WS] Error getting persona status:', error);
        socket.emit('persona:status:error', {
          postId: data.postId,
          error: 'Failed to get persona status'
        });
      }
    });

    // 룸 정리 요청
    socket.on("room:cleanup:request", async (data: {
      postId?: string;
      roomId?: string;
    }) => {
      try {
        console.log(`[WS] room:cleanup:request received from ${userId}`);
        
        const { persoRoomManager } = await import('./engine/persoRoom.js');
        
        let cleaned = 0;
        let failed = 0;
        
        if (data.roomId) {
          // 특정 룸 정리
          const result = persoRoomManager.removeRoom(data.roomId);
          if (result) {
            cleaned = 1;
          } else {
            failed = 1;
          }
        } else {
          // 전체 정리
          const result = persoRoomManager.cleanup();
          cleaned = result.cleaned;
          failed = result.failed;
        }
        
        socket.emit('room:cleanup:result', {
          cleaned,
          failed,
          timestamp: Date.now()
        });
        
        console.log(`[WS] Room cleanup completed: ${cleaned} cleaned, ${failed} failed`);
      } catch (error) {
        console.error('[WS] Error during room cleanup:', error);
        socket.emit('room:cleanup:error', {
          error: 'Failed to cleanup rooms'
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
