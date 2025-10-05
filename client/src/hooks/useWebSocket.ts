import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';

interface UseWebSocketOptions {
  conversationId?: string;
  onMessage?: (message: any) => void;
  onSystemMessage?: (message: any) => void;
  onStreamStart?: (data: { id: string; personaId: string }) => void;
  onStreamChunk?: (data: { id: string; chunk: string; content: string }) => void;
  onStreamEnd?: (message: any) => void;
  enabled?: boolean;
}

export function useWebSocket({ 
  conversationId, 
  onMessage,
  onSystemMessage,
  onStreamStart,
  onStreamChunk,
  onStreamEnd,
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

    socket.on('connect', () => {
      console.log('[WS] Connected');
      
      // 대화방 참여
      if (conversationId) {
        console.log('[WS] Emitting join:conversation for', conversationId);
        socket.emit('join:conversation', conversationId);
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

    // cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (conversationId) {
        socket.emit('leave:conversation', conversationId);
      }
      
      socket.off('message:new');
      socket.off('message:system');
      socket.off('message:stream:start');
      socket.off('message:stream:chunk');
      socket.off('message:stream:end');
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

    return () => {
      socket.off('message:new');
      socket.off('message:system');
      socket.off('message:stream:start');
      socket.off('message:stream:chunk');
      socket.off('message:stream:end');
    };
  }, [onMessage, onSystemMessage, onStreamStart, onStreamChunk, onStreamEnd]);

  // 대화방 변경 시 join/leave
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // 이전 대화방 나가기는 cleanup에서 처리됨
    if (conversationId) {
      socket.emit('join:conversation', conversationId);
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
      console.log('[WS] Emitting leave:conversation for', conversationId);
      socket.emit('leave:conversation', conversationId);
    }
  }, [conversationId]);

  return {
    socket: socketRef.current,
    disconnect,
    leaveConversation,
  };
}
