import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'user' | 'persona' | 'system';
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  thinking?: string;
  createdAt: string;
  isAI?: boolean;
  personaId?: string;
  persona?: {
    id: string;
    name: string;
    image: string;
  };
  userId?: string;
  user?: {
    id: string;
    name: string;
    username: string;
    profileImage?: string;
  };
}

interface Options {
  roomId: string;
  baseUrl?: string; // ex) '' or 'https://your-app.replit.app'
}

export function useChatStream({ roomId, baseUrl = '' }: Options) {
  const [connected, setConnected] = useState(false);
  const [incoming, setIncoming] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const evRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!roomId) {
      console.log('[useChatStream] roomId가 없어서 SSE 연결을 건너뜁니다');
      return;
    }

    const clientId = Math.random().toString(36).slice(2);
    const url = `${baseUrl}/api/chat/stream?roomId=${encodeURIComponent(roomId)}&clientId=${clientId}`;
    console.log(`[useChatStream] SSE 연결 시작: ${url}`);
    
    const es = new EventSource(url);

    es.addEventListener('connected', (e) => {
      console.log('[useChatStream] SSE 연결됨:', e);
      setConnected(true);
      setError(null);
    });

    es.addEventListener('message', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data);
        console.log('[useChatStream] 메시지 수신:', payload);
        setIncoming(prev => [...prev, payload]);
      } catch (error) {
        console.error('[useChatStream] 메시지 파싱 오류:', error);
      }
    });

    es.addEventListener('message:new', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data);
        console.log('[useChatStream] 새 메시지 수신:', payload);
        setIncoming(prev => [...prev, payload]);
      } catch (error) {
        console.error('[useChatStream] 새 메시지 파싱 오류:', error);
      }
    });

    es.addEventListener('message:saved', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data);
        console.log('[useChatStream] 메시지 저장 완료:', payload);
      } catch (error) {
        console.error('[useChatStream] 저장 완료 메시지 파싱 오류:', error);
      }
    });

    es.onerror = (error) => { 
      console.error('[useChatStream] SSE 오류:', error);
      setConnected(false);
      
      // 연결 상태에 따른 구체적인 오류 메시지
      if (es.readyState === EventSource.CONNECTING) {
        setError('연결 중...');
      } else if (es.readyState === EventSource.CLOSED) {
        setError('연결이 종료되었습니다');
      } else {
        setError('연결 오류가 발생했습니다');
      }
    };

    evRef.current = es;
    
    return () => { 
      console.log('[useChatStream] SSE 연결 종료');
      es.close(); 
      evRef.current = null;
      setConnected(false);
    };
  }, [roomId, baseUrl]);

  async function sendMessage(msg: Omit<ChatMessage, 'id'|'createdAt'|'conversationId'> & { 
    id?: string; 
    createdAt?: string;
    conversationId?: string;
  }) {
    const payload = { 
      ...msg, 
      id: msg.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, 
      createdAt: msg.createdAt ?? new Date().toISOString(),
      conversationId: msg.conversationId ?? roomId
    };
    
    console.log('[useChatStream] 메시지 전송:', payload);
    
    const res = await fetch(`${baseUrl}/api/perso/${roomId}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload),
    });
    
    const json = await res.json();
    console.log('[useChatStream] 메시지 전송 응답:', json);
    
    if (!res.ok) {
      throw new Error(json.message || json.error || 'send_failed');
    }
    
    return json as ChatMessage;
  }

  async function getHistory(limit: number = 50, offset: number = 0) {
    console.log(`[useChatStream] 히스토리 조회: limit=${limit}, offset=${offset}`);
    
    const res = await fetch(`${baseUrl}/api/chat/history?roomId=${encodeURIComponent(roomId)}&limit=${limit}&offset=${offset}`);
    const json = await res.json();
    
    if (!json.ok) {
      throw new Error(json.error || 'history_failed');
    }
    
    console.log('[useChatStream] 히스토리 응답:', json);
    return json;
  }

  function clearIncoming() {
    setIncoming([]);
  }

  return { 
    connected, 
    incoming, 
    error,
    setIncoming,
    sendMessage, 
    getHistory,
    clearIncoming
  };
}
