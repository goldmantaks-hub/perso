import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken, logout } from '@/lib/auth';

interface UseWebSocketOptions {
  conversationId?: string;
  onMessage?: (message: any) => void;
  onSystemMessage?: (message: any) => void;
  onStreamStart?: (data: { id: string; personaId: string }) => void;
  onStreamChunk?: (data: { id: string; chunk: string; content: string }) => void;
  onStreamEnd?: (message: any) => void;
  onPersonaStatusUpdate?: (statusData: any) => void;
  onPersonaEvent?: (eventData: any) => void;
  onPersonaHandover?: (handoverData: any) => void;
  onPersonaAutoIntroduction?: (introData: any) => void;
  enabled?: boolean;
}

export function useWebSocket({ 
  conversationId, 
  onMessage,
  onSystemMessage,
  onStreamStart,
  onStreamChunk,
  onStreamEnd,
  onPersonaStatusUpdate,
  onPersonaEvent,
  onPersonaHandover,
  onPersonaAutoIntroduction,
  enabled = true 
}: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket 연결 초기화
  useEffect(() => {
    if (!enabled) return;

    const token = getToken();
    if (!token) {
      console.warn('[WS] No auth token found');
      return;
    }

    // Socket.IO 연결 (인증 토큰 포함)
    const socket = io({
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // 페이지 언로드 시 퇴장 처리 (명시적 퇴장 아님)
    const handleBeforeUnload = () => {
      if (socket && socket.connected && conversationId) {
        console.log('[WS] Page unloading, sending leave:conversation (disconnect)');
        socket.emit('leave:conversation', conversationId, 'disconnect');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    socket.on('connect', () => {
      console.log('[WS] Connected');
      
      // 대화방 참여 (항상 join으로 보내서 입장 메시지 생성)
      if (conversationId) {
        console.log('[WS] Emitting join:conversation for', conversationId, '(join)');
        // 강제로 join으로 전송 (캐시 문제 방지)
        setTimeout(() => {
          console.log('[WS] About to emit join:conversation with action: join, conversationId:', conversationId);
          socket.emit('join:conversation', conversationId, 'join');
          console.log('[WS] Forced join:conversation sent with action: join');
        }, 100);
        
        // 추가로 한 번 더 전송 (브라우저 캐시 문제 해결)
        setTimeout(() => {
          console.log('[WS] About to emit second join:conversation with action: join, conversationId:', conversationId);
          socket.emit('join:conversation', conversationId, 'join');
          console.log('[WS] Second join:conversation sent with action: join');
        }, 500);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      
      // 자동 재연결
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, 1000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      
      if (error.message && (error.message.includes('토큰') || error.message.includes('token'))) {
        console.log('[AUTH] Invalid token in WebSocket, logging out...');
        logout();
        window.location.href = '/login';
      }
    });

    // 메시지 수신
    if (onMessage) {
      socket.on('message:new', onMessage);
    }
    
    // 시스템 메시지 수신
    if (onSystemMessage) {
      socket.on('message:system', (msg) => {
        console.log('[WS] Received system message:', msg);
        onSystemMessage(msg);
      });
    }
    
    // 스트리밍 이벤트
    if (onStreamStart) {
      socket.on('message:stream:start', onStreamStart);
    }
    if (onStreamChunk) {
      socket.on('message:stream:chunk', onStreamChunk);
    }
    if (onStreamEnd) {
      socket.on('message:stream:end', onStreamEnd);
    }

    // 페르소나 상태 관련 이벤트
    if (onPersonaStatusUpdate) {
      socket.on('persona:status:update', (statusData) => {
        console.log('[WS] Received persona status update:', statusData);
        onPersonaStatusUpdate(statusData);
      });
    }
    if (onPersonaEvent) {
      socket.on('persona:event', (eventData) => {
        console.log('[WS] Received persona event:', eventData);
        onPersonaEvent(eventData);
      });
    }
    if (onPersonaHandover) {
      socket.on('persona:handover', (handoverData) => {
        console.log('[WS] Received persona handover:', handoverData);
        onPersonaHandover(handoverData);
      });
    }
    if (onPersonaAutoIntroduction) {
      socket.on('persona:auto-introduction', (introData) => {
        console.log('[WS] Received persona auto introduction:', introData);
        onPersonaAutoIntroduction(introData);
      });
    }

    // cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // beforeunload 이벤트 리스너 제거
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (conversationId) {
        socket.emit('leave:conversation', conversationId, 'disconnect');
      }
      
      socket.off('message:new');
      socket.off('message:system');
      socket.off('message:stream:start');
      socket.off('message:stream:chunk');
      socket.off('message:stream:end');
      socket.off('persona:status:update');
      socket.off('persona:event');
      socket.off('persona:handover');
      socket.off('persona:auto-introduction');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, enabled]);

  // 이벤트 핸들러 변경 시 재등록
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // 기존 핸들러 제거
    socket.off('message:new');
    socket.off('message:system');
    socket.off('message:stream:start');
    socket.off('message:stream:chunk');
    socket.off('message:stream:end');
    socket.off('persona:status:update');
    socket.off('persona:event');
    socket.off('persona:handover');
    socket.off('persona:auto-introduction');
    
    // 새 핸들러 등록
    if (onMessage) socket.on('message:new', onMessage);
    if (onSystemMessage) {
      socket.on('message:system', (msg) => {
        console.log('[WS] Received system message:', msg);
        onSystemMessage(msg);
      });
    }
    if (onStreamStart) socket.on('message:stream:start', onStreamStart);
    if (onStreamChunk) socket.on('message:stream:chunk', onStreamChunk);
    if (onStreamEnd) socket.on('message:stream:end', onStreamEnd);
    if (onPersonaStatusUpdate) {
      socket.on('persona:status:update', (statusData) => {
        console.log('[WS] Received persona status update:', statusData);
        onPersonaStatusUpdate(statusData);
      });
    }
    if (onPersonaEvent) {
      socket.on('persona:event', (eventData) => {
        console.log('[WS] Received persona event:', eventData);
        onPersonaEvent(eventData);
      });
    }
    if (onPersonaHandover) {
      socket.on('persona:handover', (handoverData) => {
        console.log('[WS] Received persona handover:', handoverData);
        onPersonaHandover(handoverData);
      });
    }
    if (onPersonaAutoIntroduction) {
      socket.on('persona:auto-introduction', (introData) => {
        console.log('[WS] Received persona auto introduction:', introData);
        onPersonaAutoIntroduction(introData);
      });
    }

    return () => {
      socket.off('message:new');
      socket.off('message:system');
      socket.off('message:stream:start');
      socket.off('message:stream:chunk');
      socket.off('message:stream:end');
      socket.off('persona:status:update');
      socket.off('persona:event');
      socket.off('persona:handover');
      socket.off('persona:auto-introduction');
    };
  }, [onMessage, onSystemMessage, onStreamStart, onStreamChunk, onStreamEnd, onPersonaStatusUpdate, onPersonaEvent, onPersonaHandover, onPersonaAutoIntroduction]);

  // 대화방 변경 시 join/leave
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // 이전 대화방 나가기는 cleanup에서 처리됨
    if (conversationId) {
      console.log('[WS] About to emit join:conversation on conversationId change, action: join, conversationId:', conversationId);
      socket.emit('join:conversation', conversationId, 'join');
      console.log('[WS] Joined conversation:', conversationId);
    }
  }, [conversationId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const leaveConversation = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && conversationId) {
      console.log('[WS] Emitting leave:conversation for', conversationId, '(back button)');
      socket.emit('leave:conversation', conversationId, 'back');
    }
  }, [conversationId]);

  const joinConversation = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && conversationId) {
      console.log('[WS] Emitting join:conversation for', conversationId, '(real join)');
      socket.emit('join:conversation', conversationId, 'join');
    }
  }, [conversationId]);

  return {
    socket: socketRef.current,
    disconnect,
    leaveConversation,
    joinConversation,
  };
}
