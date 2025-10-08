import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isAuthenticated } from "@/lib/auth";
import EnhancedChatPanel from "@/components/EnhancedChatPanel";
import ActivePersonas from "@/components/ActivePersonas";

export default function PersoPage() {
  const [, params] = useRoute("/perso/:postId");
  const postId = params?.postId;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // URL 파라미터에서 명시적 입장 여부 확인
  const urlParams = new URLSearchParams(window.location.search);
  const isExplicitJoin = urlParams.get('explicitJoin') === 'true';
  
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 페르소나 상태 관리
  const [activePersonas, setActivePersonas] = useState<any[]>([]);
  const [dominantPersona, setDominantPersona] = useState<string | null>(null);
  const [currentTopics, setCurrentTopics] = useState<Array<{ topic: string; weight: number }>>([]);
  const [totalTurns, setTotalTurns] = useState(0);

  // 페르소나 상태 초기화
  // 초기 데이터는 WebSocket을 통해 서버에서 받아옵니다
  // mockPersonas 제거됨 - 실제 서버 데이터 사용

  // 메시지 및 게시물 정보 가져오기 (WebSocket으로 실시간 업데이트)
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/perso", postId, "messages"],
    enabled: !!postId,
    queryFn: async () => {
      console.log('[API] API 호출 시작:', postId);
      try {
        // 먼저 서버 헬스체크
        console.log('[API] Checking server health...');
        try {
          const healthResponse = await fetch('/api/health');
          console.log('[API] Health response status:', healthResponse.status);
          console.log('[API] Health response ok:', healthResponse.ok);
          if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('[API] Server health check:', healthData);
          } else {
            console.error('[API] Health check failed with status:', healthResponse.status);
          }
        } catch (healthError) {
          console.error('[API] Server health check failed:', healthError);
        }

        console.log('[API] Making request to:', `/api/perso/${postId}/messages`);
        console.log('[API] Current location:', window.location.href);
        console.log('[API] Making fetch request directly to test proxy...');
        
        // 직접 fetch로 테스트
        try {
          const directResponse = await fetch(`/api/perso/${postId}/messages`);
          console.log('[API] Direct fetch response status:', directResponse.status);
          console.log('[API] Direct fetch response ok:', directResponse.ok);
          if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('[API] Direct fetch data:', directData);
          }
        } catch (directError) {
          console.error('[API] Direct fetch failed:', directError);
        }
        
        const response = await apiRequest('GET', `/api/perso/${postId}/messages`);
        console.log('[API] apiRequest response status:', response.status);
        console.log('[API] apiRequest response headers:', response.headers);
        
        if (!response.ok) {
          console.error('[API] Response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[API] API 응답 성공:', result);
        return result;
      } catch (error) {
        console.error('[API] API 호출 실패:', error);
        console.error('[API] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    }
  });

  // 사용자 페르소나 가져오기 (AI 응답에 사용)
  const { data: userPersona, isLoading: personaLoading, error: personaError } = useQuery<any>({
    queryKey: ['/api/user/persona'],
    enabled: !!postId, // postId가 있을 때만 로드
    retry: false,
  });

  console.log('[QUERY STATE] isLoading:', isLoading, 'error:', error, 'data:', data);
  
  const messages = useMemo(() => data?.messages || [], [data?.messages]);
  const participants = useMemo(() => data?.participants || [], [data?.participants]);
  const post = data?.post;
  const conversationId = data?.conversation?.id;
  const dominantPersonaId = useMemo(() => data?.dominantPersona, [data?.dominantPersona]);
  const serverCurrentTopics = useMemo(() => data?.currentTopics ?? [], [data?.currentTopics]);
  const serverTotalTurns = useMemo(() => data?.totalTurns ?? 0, [data?.totalTurns]);
  
  console.log('[QUERY STATE] Parsed data:', {
    messagesCount: messages.length,
    participantsCount: participants.length,
    participants: participants,
    post: post ? 'exists' : 'null',
    conversationId,
    dominantPersonaId,
    serverCurrentTopics,
    serverTotalTurns
  });

  // participants 데이터를 activePersonas 상태로 변환
  useEffect(() => {
    console.log('[DEBUG] participants 데이터:', participants);
    console.log('[DEBUG] participants 타입:', typeof participants);
    console.log('[DEBUG] participants 길이:', participants?.length);
    
    if (participants && participants.length > 0) {
      console.log('[DEBUG] participants 필터링 전:', participants);
      
      const personaParticipants = participants.filter((p: any) => {
        console.log('[DEBUG] 필터링 체크:', p.type, p.type === 'persona');
        return p.type === 'persona';
      });
      
      console.log('[DEBUG] personaParticipants:', personaParticipants);
      
      // 중복 제거: 같은 personaId를 가진 참가자들을 제거
      const uniquePersonaParticipants = personaParticipants.reduce((acc: any[], p: any) => {
        const existing = acc.find(existing => existing.personaId === p.personaId);
        if (!existing) {
          acc.push(p);
        } else {
          console.log(`[DEBUG] 중복된 페르소나 발견, 제거: ${p.personaId} (${p.personaName})`);
        }
        return acc;
      }, []);

      console.log('[DEBUG] 중복 제거 후 페르소나 수:', uniquePersonaParticipants.length);
      
      const personasFromParticipants = uniquePersonaParticipants.map((p: any) => {
        // username을 실제 이름으로 변환하는 매핑
        const usernameToName: Record<string, string> = {
          'sungmin_park': '박성민',
          'taewoo_han': '한태우',
          'haein_kim': '김해인',
          'jieun_kim': '김지은',
          'yuna_choi': '최유나',
          'donghyun_lee': '이동현',
          'jiyeon_kang': '강지연'
        };
        
        const persona = {
          id: p.personaId,
          name: p.personaName,
          image: p.personaImage,
          owner: {
            name: usernameToName[p.username] || p.username,
            username: p.username
          },
          status: 'active' as const,
          joinedAt: Date.now(),
          lastSpokeAt: Date.now(),
          messageCount: 0
        };
        console.log('[DEBUG] 변환된 페르소나:', persona);
        return persona;
      });
      
      console.log('[ACTIVE PERSONAS] participants에서 변환:', personasFromParticipants);
      
      // 상태 업데이트 시에도 중복 방지
      setActivePersonas(prevPersonas => {
        // 기존 상태와 비교하여 실제로 변경된 경우에만 업데이트
        const hasChanges = personasFromParticipants.some(newPersona => {
          const existingPersona = prevPersonas.find(p => p.id === newPersona.id);
          return !existingPersona || 
                 existingPersona.name !== newPersona.name ||
                 existingPersona.status !== newPersona.status;
        });
        
        if (hasChanges) {
          console.log('[ACTIVE PERSONAS] 상태 업데이트 필요, 변경사항 감지됨');
          return personasFromParticipants;
        } else {
          console.log('[ACTIVE PERSONAS] 상태 업데이트 불필요, 변경사항 없음');
          return prevPersonas;
        }
      });
    } else {
      console.log('[DEBUG] participants가 없거나 비어있음');
    }
  }, [participants]);

  // 메시지 카운트 계산을 위한 최적화된 useMemo
  const personasWithMessageCount = useMemo(() => {
    if (activePersonas.length === 0 || messages.length === 0) {
      return activePersonas;
    }
    
    // 메시지 카운트만 추출하여 의존성 최소화
    const messageCounts = messages
      .filter(msg => msg.senderType === 'persona')
      .reduce((acc, msg) => {
        acc[msg.senderId] = (acc[msg.senderId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return activePersonas.map(persona => ({
      ...persona,
      messageCount: messageCounts[persona.id] || 0
    }));
  }, [
    activePersonas, 
    messages.length // 전체 메시지 수만 의존성으로 사용
  ]);

  // 메시지 카운트가 실제로 변경된 경우에만 상태 업데이트
  useEffect(() => {
    if (personasWithMessageCount.length > 0) {
      // 깊은 비교를 통해 실제 변경사항이 있는지 확인
      const hasChanges = personasWithMessageCount.some((newPersona, index) => {
        const oldPersona = activePersonas[index];
        return !oldPersona || 
               newPersona.messageCount !== oldPersona.messageCount ||
               newPersona.status !== oldPersona.status;
      });
      
      if (hasChanges) {
        console.log('[ACTIVE PERSONAS] 메시지 수 포함:', personasWithMessageCount);
        setActivePersonas(personasWithMessageCount);
      }
    }
  }, [personasWithMessageCount]);

  // dominantPersona 설정
  useEffect(() => {
    if (dominantPersonaId) {
      console.log('[DOMINANT PERSONA] 서버에서 받은 주도 페르소나:', dominantPersonaId);
      setDominantPersona(dominantPersonaId);
    }
  }, [dominantPersonaId]);

  // currentTopics와 totalTurns 설정
  useEffect(() => {
    console.log('[TOPICS/TURNS] 서버에서 받은 토픽:', serverCurrentTopics);
    console.log('[TOPICS/TURNS] 서버에서 받은 턴 수:', serverTotalTurns);
    
    // 서버에서 토픽 데이터가 없으면 기본값 설정
    if (serverCurrentTopics.length > 0) {
      setCurrentTopics(serverCurrentTopics);
    } else {
      // 기본 토픽 데이터 (개발자 컨퍼런스 게시물에 맞는 토픽)
      const defaultTopics = [
        { topic: '기술', weight: 0.6 },
        { topic: 'AI', weight: 0.4 }
      ];
      setCurrentTopics(defaultTopics);
    }
    
    if (serverTotalTurns > 0) {
      setTotalTurns(serverTotalTurns);
    } else {
      // 기본 턴 수 (페르소나 메시지 수) - messages.length를 사용하여 무한 루프 방지
      setTotalTurns(messages.length);
    }
  }, [serverCurrentTopics, serverTotalTurns]);

  // WebSocket으로 실시간 메시지 수신
  const handleNewMessage = useCallback((newMessage: any) => {
    // 시스템 메시지는 handleSystemMessage에서 처리하도록 제외
    if (newMessage.senderType === 'system' || newMessage.messageType === 'join' || newMessage.messageType === 'leave') {
      console.log('[PERSO] 시스템 메시지는 handleSystemMessage로 처리:', newMessage.id);
      return;
    }
    
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      
      // 중복 메시지 체크 (더 강화된 로직)
      const existingMessage = old.messages?.find((m: any) => {
        // 1. 같은 ID
        if (m.id === newMessage.id) return true;
        
        // 2. 사용자 메시지의 경우 - 같은 내용 + 비슷한 시간 (3초 이내)
        if (!newMessage.isAI && !m.isAI && 
            m.content === newMessage.content) {
          const timeDiff = Math.abs(
            new Date(m.createdAt).getTime() - new Date(newMessage.createdAt).getTime()
          );
          if (timeDiff < 3000) return true;
        }
        
        // 3. AI 메시지의 경우 - 같은 내용 + 같은 페르소나 + 비슷한 시간 (10초 이내)
        if (newMessage.isAI && m.isAI && 
            m.personaId === newMessage.personaId &&
            m.content === newMessage.content) {
          const timeDiff = Math.abs(
            new Date(m.createdAt).getTime() - new Date(newMessage.createdAt).getTime()
          );
          if (timeDiff < 10000) return true;
        }
        
        return false;
      });
      
      if (existingMessage) {
        console.log('[PERSO] Duplicate message detected, skipping:', newMessage.id, newMessage.content?.substring(0, 20));
        return old;
      }
      
      console.log('[PERSO] Adding new message:', newMessage.id, newMessage.content?.substring(0, 20));
      return {
        ...old,
        messages: [...(old.messages || []), newMessage],
      };
    });
  }, [postId]);

  // 시스템 메시지 수신 - 강화된 중복 처리
  const handleSystemMessage = useCallback((systemMessage: any) => {
    console.log('[SYSTEM MESSAGE] 수신:', systemMessage);
    console.log('[SYSTEM MESSAGE] 메시지 타입:', systemMessage.messageType);
    console.log('[SYSTEM MESSAGE] 내용:', systemMessage.content);
    console.log('[SYSTEM MESSAGE] 발신자 ID:', systemMessage.senderId);
    
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      
      // 고유한 ID 생성
      const timestamp = Date.now();
      const uniqueId = systemMessage.id || `system-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 강화된 중복 메시지 체크
      const existingMessage = old.messages?.find((m: any) => {
        // 1. ID 기반 중복 체크
        if (m.id === uniqueId) {
          console.log('[DUPLICATE CHECK] ID 중복:', uniqueId);
          return true;
        }
        
        // 2. 내용 기반 중복 체크 (입장 메시지는 더 짧은 시간으로 제한)
        if (m.senderType === 'system' && 
            m.messageType === systemMessage.messageType &&
            m.content === systemMessage.content) {
          const timeDiff = Math.abs(
            new Date(m.createdAt).getTime() - timestamp
          );
          // 입장 메시지는 5초, 다른 메시지는 30초로 설정
          const timeThreshold = systemMessage.messageType === 'join' ? 5000 : 30000;
          if (timeDiff < timeThreshold) {
            console.log('[DUPLICATE CHECK] 내용 중복:', systemMessage.content, '시간차:', timeDiff, '임계값:', timeThreshold);
            return true;
          }
        }
        
        // 3. 같은 페르소나의 같은 타입 메시지가 60초 이내에 있으면 중복 (퇴장 메시지 특별 처리)
        if (m.senderType === 'system' && 
            m.messageType === systemMessage.messageType) {
          
          // 퇴장 메시지의 경우 더 강력한 중복 체크
          if (systemMessage.messageType === 'leave') {
            // 메시지 내용에서 페르소나 이름 추출하여 비교
            const currentPersonaMatch = systemMessage.content?.match(/(\w+)님이/);
            const existingPersonaMatch = m.content?.match(/(\w+)님이/);
            
            if (currentPersonaMatch && existingPersonaMatch && 
                currentPersonaMatch[1] === existingPersonaMatch[1]) {
              const timeDiff = Math.abs(
                new Date(m.createdAt).getTime() - timestamp
              );
              // 퇴장 메시지는 60초 이내 중복 방지
              if (timeDiff < 60000) {
                console.log('[DUPLICATE CHECK] 같은 페르소나 퇴장 메시지 중복:', currentPersonaMatch[1], '시간차:', timeDiff);
                return true;
              }
            }
          } else {
            // 입장 메시지의 경우 더 짧은 시간으로 제한
            if (systemMessage.senderId && m.senderId === systemMessage.senderId) {
              const timeDiff = Math.abs(
                new Date(m.createdAt).getTime() - timestamp
              );
              // 입장 메시지는 3초로 더 짧게 설정
              const timeThreshold = systemMessage.messageType === 'join' ? 3000 : 10000;
              if (timeDiff < timeThreshold) {
                console.log('[DUPLICATE CHECK] 같은 페르소나 입장 메시지 중복:', systemMessage.senderId, systemMessage.messageType, '시간차:', timeDiff);
                return true;
              }
            }
          }
        }
        
        return false;
      });
      
      if (existingMessage) {
        console.log('[SYSTEM MESSAGE] 중복 감지, 스킵:', uniqueId, systemMessage.content);
        return old;
      }
      
      // 시스템 메시지에 필요한 필드 추가
      const enhancedSystemMessage = {
        ...systemMessage,
        id: uniqueId,
        isAI: false,
        senderType: 'system',
        createdAt: new Date(timestamp).toISOString(),
        timestamp: timestamp
      };
      
      console.log('[SYSTEM MESSAGE] 추가 완료:', uniqueId, systemMessage.content);
      return {
        ...old,
        messages: [...(old.messages || []), enhancedSystemMessage],
      };
    });
  }, [postId, queryClient]);

  // 페르소나 상태 업데이트 핸들러
  const handlePersonaStatusUpdate = useCallback((statusData: any) => {
    setActivePersonas(statusData.activePersonas || []);
    setDominantPersona(statusData.dominantPersona);
    setCurrentTopics(statusData.currentTopics || []);
    setTotalTurns(statusData.totalTurns || 0);
  }, []);

  // 페르소나 이벤트 핸들러 (입장/퇴장) - 모든 경우의 수 처리
  const handlePersonaEvent = useCallback((eventData: any) => {
    console.log('[PERSONA EVENT]', eventData);
    
    if (!eventData.personaId || !eventData.eventType) {
      console.warn('[PERSONA EVENT] 잘못된 이벤트 데이터:', eventData);
      return;
    }
    
    const { personaId, eventType } = eventData;
    const timestamp = Date.now();
    const uniqueId = `${eventType}-${personaId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 시스템 메시지 생성 함수
    const createSystemMessage = (type: 'join' | 'leave', content: string) => ({
      id: uniqueId,
      postId: postId,
      senderType: 'system',
      senderId: personaId,
      messageType: type,
      content: content,
      createdAt: new Date(timestamp).toISOString(),
      timestamp: timestamp
    });
    
    setActivePersonas(prevPersonas => {
      const existingPersona = prevPersonas.find(p => p.id === personaId);
      
      if (eventType === 'join') {
        console.log(`[PERSONA JOIN] ${personaId} 입장 처리 시작`);
        
        // 경우 1: 페르소나가 없는 경우 - 새로 추가
        if (!existingPersona) {
          const newPersona = {
            id: personaId,
            status: 'joining' as const,
            joinedAt: timestamp,
            lastSpokeAt: 0,
            messageCount: 0
          };
          
          // 1초 후 입장 완료 처리 (메시지 추가)
          setTimeout(() => {
            setActivePersonas(currentPersonas => {
              const updatedPersonas = currentPersonas.map(p => 
                p.id === personaId 
                  ? { ...p, status: 'active' as const }
                  : p
              );
              
              // 입장 완료 메시지 추가
              const joinedMessage = createSystemMessage('join', `${personaId}님이 대화에 참여했습니다`);
              queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
                if (!old) return old;
                return {
                  ...old,
                  messages: [...(old.messages || []), joinedMessage],
                };
              });
              
              console.log(`[PERSONA JOIN] ${personaId} 입장 완료`);
              return updatedPersonas;
            });
          }, 1000);
          
          return [...prevPersonas, newPersona];
        }
        
        // 경우 2: 페르소나가 있지만 다른 상태인 경우
        if (existingPersona.status !== 'active') {
          const updatedPersonas = prevPersonas.map(p => 
            p.id === personaId 
              ? { ...p, status: 'active' as const, joinedAt: timestamp }
              : p
          );
          
          // 재입장 메시지 추가
          const rejoinMessage = createSystemMessage('join', `${personaId} 페르소나가 다시 참여했습니다`);
          queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              messages: [...(old.messages || []), rejoinMessage],
            };
          });
          
          return updatedPersonas;
        }
        
        // 경우 3: 이미 active 상태인 경우 - 아무것도 하지 않음
        console.log(`[PERSONA JOIN] ${personaId} 이미 활성 상태`);
        return prevPersonas;
        
      } else if (eventType === 'leave') {
        console.log(`[PERSONA LEAVE] ${personaId} 퇴장 처리 시작`);
        
        // 경우 1: 페르소나가 없는 경우 - 아무것도 하지 않음
        if (!existingPersona) {
          console.log(`[PERSONA LEAVE] ${personaId} 존재하지 않는 페르소나`);
          return prevPersonas;
        }
        
        // 경우 2: 이미 leaving 상태인 경우 - 아무것도 하지 않음
        if (existingPersona.status === 'leaving') {
          console.log(`[PERSONA LEAVE] ${personaId} 이미 퇴장 중`);
          return prevPersonas;
        }
        
        // 경우 3: 퇴장 처리
        const updatedPersonas = prevPersonas.map(p => 
          p.id === personaId 
            ? { ...p, status: 'leaving' as const }
            : p
        );
        
        // 퇴장 메시지 추가
        const leaveMessage = createSystemMessage('leave', `${personaId} 페르소나가 대화를 떠났습니다`);
        queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), leaveMessage],
          };
        });
        
        // 3초 후 완전 제거
        setTimeout(() => {
          setActivePersonas(currentPersonas => {
            const filteredPersonas = currentPersonas.filter(p => p.id !== personaId);
            console.log(`[PERSONA LEAVE] ${personaId} 완전 제거 완료`);
            return filteredPersonas;
          });
        }, 3000);
        
        return updatedPersonas;
      }
      
      // 알 수 없는 이벤트 타입
      console.warn(`[PERSONA EVENT] 알 수 없는 이벤트 타입: ${eventType}`);
      return prevPersonas;
    });
  }, [postId, queryClient]);


  // 주도권 교체 핸들러
  const handlePersonaHandover = useCallback((handoverData: any) => {
    setDominantPersona(handoverData.newDominant);
    console.log(`주도권 교체: ${handoverData.previousDominant} → ${handoverData.newDominant}`);
    
    // 주도권 교체 시스템 메시지 추가
    const newDominantPersona = activePersonas.find(p => p.id === handoverData.newDominant);
    const displayName = newDominantPersona?.owner 
      ? `${newDominantPersona.owner.name}의 ${handoverData.newDominant}`
      : handoverData.newDominant;
    
    const handoverMessage = {
      id: `handover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderType: 'system',
      content: `주도권이 ${displayName}에게 넘어갔습니다`,
      type: 'handover',
      timestamp: Date.now(),
      dominantPersona: handoverData.newDominant,
      dominantPersonaOwner: newDominantPersona?.owner
    };
    
    // 시스템 메시지 추가
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      
      return {
        ...old,
        messages: [...(old.messages || []), handoverMessage]
      };
    });
  }, [postId, activePersonas, queryClient]);

  // 페르소나 자동 소개 메시지 핸들러
  const handlePersonaAutoIntroduction = useCallback((introData: any) => {
    console.log('[PERSONA AUTO INTRODUCTION]', introData);
    
    if (!introData.personaId || !introData.introduction) {
      console.warn('[PERSONA AUTO INTRODUCTION] 잘못된 소개 데이터:', introData);
      return;
    }
    
    const { personaId, introduction } = introData;
    const timestamp = Date.now();
    const uniqueId = `intro-${personaId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 자동 소개 메시지 생성
    const introMessage = {
      id: uniqueId,
      postId: postId,
      senderType: 'system',
      senderId: personaId,
      messageType: 'auto-introduction',
      content: introduction,
      createdAt: new Date(timestamp).toISOString(),
      timestamp: timestamp,
      persona: {
        name: personaId,
        owner: activePersonas.find(p => p.id === personaId)?.owner
      }
    };
    
    // 메시지 추가
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...(old.messages || []), introMessage]
      };
    });
    
    console.log(`[PERSONA AUTO INTRODUCTION] ${personaId}의 소개 메시지 추가: "${introduction}"`);
  }, [postId, activePersonas, queryClient]);

  // 테스트용 페르소나 상태 변경 함수 - 모든 경우의 수 처리
  const togglePersonaStatus = (personaId: string) => {
    console.log(`[TOGGLE] ${personaId} 상태 토글 시작`);
    
    setActivePersonas(prevPersonas => {
      const existingPersona = prevPersonas.find(p => p.id === personaId);
      const timestamp = Date.now();
      const uniqueId = `toggle-${personaId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 시스템 메시지 생성 함수
      const createSystemMessage = (type: 'join' | 'leave', content: string) => ({
        id: uniqueId,
        postId: postId,
        senderType: 'system',
        senderId: personaId,
        messageType: type,
        content: content,
        createdAt: new Date(timestamp).toISOString(),
        timestamp: timestamp
      });
      
      if (!existingPersona) {
        // 경우 1: 페르소나가 없는 경우 - 새로 입장
        console.log(`[TOGGLE] ${personaId} 새 페르소나 입장`);
        
        const newPersona = {
          id: personaId,
          status: 'joining' as const,
          joinedAt: timestamp,
          lastSpokeAt: 0,
          messageCount: 0
        };
        
        // 1초 후 입장 완료 처리 (메시지 추가)
        setTimeout(() => {
          setActivePersonas(currentPersonas => {
            const updatedPersonas = currentPersonas.map(p => 
              p.id === personaId 
                ? { ...p, status: 'active' as const }
                : p
            );
            
            // 입장 완료 메시지 추가
            const joinedMessage = createSystemMessage('join', `${personaId}님이 대화에 참여했습니다`);
            queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                messages: [...(old.messages || []), joinedMessage],
              };
            });
            
            console.log(`[TOGGLE] ${personaId} 입장 완료`);
            return updatedPersonas;
          });
        }, 1000);
        
        return [...prevPersonas, newPersona];
      }
      
      // 경우 2: 페르소나가 있는 경우 - 상태에 따라 토글
      if (existingPersona.status === 'active') {
        // active → leaving (퇴장)
        console.log(`[TOGGLE] ${personaId} 활성 → 퇴장`);
        
        const updatedPersonas = prevPersonas.map(p => 
          p.id === personaId 
            ? { ...p, status: 'leaving' as const }
            : p
        );
        
        // 퇴장 메시지 추가
        const leaveMessage = createSystemMessage('leave', `${personaId} 페르소나가 대화를 떠났습니다`);
        queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), leaveMessage],
          };
        });
        
        // 3초 후 완전 제거
        setTimeout(() => {
          setActivePersonas(currentPersonas => {
            const filteredPersonas = currentPersonas.filter(p => p.id !== personaId);
            console.log(`[TOGGLE] ${personaId} 완전 제거 완료`);
            return filteredPersonas;
          });
        }, 3000);
        
        return updatedPersonas;
        
      } else if (existingPersona.status === 'joining') {
        // joining → active (입장 완료)
        console.log(`[TOGGLE] ${personaId} 입장중 → 활성`);
        
        const updatedPersonas = prevPersonas.map(p => 
          p.id === personaId 
            ? { ...p, status: 'active' as const }
            : p
        );
        
        // 입장 완료 메시지 추가
        const joinedMessage = createSystemMessage('join', `${personaId}님이 대화에 참여했습니다`);
        queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), joinedMessage],
          };
        });
        
        return updatedPersonas;
        
      } else if (existingPersona.status === 'leaving') {
        // leaving → active (재입장)
        console.log(`[TOGGLE] ${personaId} 퇴장중 → 재입장`);
        
        const updatedPersonas = prevPersonas.map(p => 
          p.id === personaId 
            ? { ...p, status: 'active' as const, joinedAt: timestamp }
            : p
        );
        
        // 재입장 메시지 추가
        const rejoinMessage = createSystemMessage('join', `${personaId} 페르소나가 다시 참여했습니다`);
        queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), rejoinMessage],
          };
        });
        
        return updatedPersonas;
        
      } else {
        // 기타 상태 (idle 등) → active
        console.log(`[TOGGLE] ${personaId} ${existingPersona.status} → 활성`);
        
        const updatedPersonas = prevPersonas.map(p => 
          p.id === personaId 
            ? { ...p, status: 'active' as const, joinedAt: timestamp }
            : p
        );
        
        // 활성화 메시지 추가
        const activateMessage = createSystemMessage('join', `${personaId} 페르소나가 활성화되었습니다`);
        queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), activateMessage],
          };
        });
        
        return updatedPersonas;
      }
    });
  };

  const { leaveConversation, joinConversation } = useWebSocket({
    conversationId,
    onMessage: handleNewMessage,
    onSystemMessage: handleSystemMessage,
    onPersonaStatusUpdate: handlePersonaStatusUpdate,
    onPersonaEvent: handlePersonaEvent,
    onPersonaHandover: handlePersonaHandover,
    onPersonaAutoIntroduction: handlePersonaAutoIntroduction,
    enabled: !!conversationId,
  });

  // 명시적인 입장인 경우에만 입장 메시지 생성
  useEffect(() => {
    if (isExplicitJoin && conversationId && joinConversation) {
      console.log('[PERSO] Explicit join detected, calling joinConversation');
      joinConversation();
      
      // URL 파라미터 제거 (브라우저 히스토리에 남기지 않음)
      const url = new URL(window.location.href);
      url.searchParams.delete('explicitJoin');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isExplicitJoin, conversationId, joinConversation]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 뒤로가기 핸들러
  const handleBack = () => {
    leaveConversation();
    setLocation("/feed");
  };

  // 메시지 전송 (낙관적 업데이트 제거)
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!isAuthenticated()) {
        throw new Error('로그인이 필요합니다');
      }
      const response = await apiRequest("POST", `/api/perso/${postId}/messages`, { content, isAI: false });
      return response;
    },
    onError: (err: any, content) => {
      let errorMessage = "다시 시도해주세요.";
      if (err.message?.includes('로그인')) {
        errorMessage = "로그인이 필요합니다.";
      } else if (err.message?.includes('403') || err.message?.includes('401')) {
        errorMessage = "인증이 만료되었습니다. 다시 로그인해주세요.";
      }
      
      toast({
        title: "메시지 전송 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: async (serverMessage: any, sentMessageContent) => {
      // 메시지 전송 성공 후 쿼리 무효화하여 최신 메시지 가져오기
      await queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });

      // AI 응답 생성을 위한 페르소나 데이터 가져오기
      let personaData: any;
      try {
        personaData = await queryClient.ensureQueryData({
          queryKey: ['/api/user/persona'],
        });
      } catch (error: any) {
        toast({
          title: "로그인이 필요합니다",
          description: "AI와 대화하려면 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const personaId = personaData?.id;
      
      if (!personaId) {
        toast({
          title: "페르소나를 찾을 수 없습니다",
          description: "AI 응답을 생성할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      // AI 응답 생성
      setTimeout(async () => {
        try {
          // 최신 메시지 목록 가져오기
          const currentData = await queryClient.ensureQueryData({
            queryKey: ["/api/perso", postId, "messages"],
          }) as any;
          const allMessages = currentData?.messages || [];
          const recentMessages = allMessages.slice(-5);
          
          const response = await apiRequest("POST", `/api/perso/${postId}/ai-response`, {
            personaId,
            recentMessages,
          });
          const aiResponse = await response.json();
          
          const aiContent = aiResponse.content?.trim();
          const aiThinking = aiResponse.thinking?.trim();
          
          if (!aiContent || aiContent.length === 0) {
            console.warn('[PERSO] Empty AI response received, skipping');
            return;
          }
          
          await apiRequest("POST", `/api/perso/${postId}/messages`, { 
            content: aiContent,
            thinking: aiThinking,
            isAI: true,
            personaId,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
        } catch (error: any) {
          console.error('AI 응답 생성 실패:', error);
          
          let errorMessage = "다시 시도해주세요.";
          if (error.message?.includes("OpenAI")) {
            errorMessage = "AI 서비스를 사용할 수 없습니다. 관리자에게 문의하세요.";
          }
          
          toast({
            title: "AI 응답 생성 실패",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }, 1000);
    },
  });

  const handleSend = (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend || !textToSend.trim()) return;
    
    // 입력창 즉시 비우기 (사용자 경험 개선)
    setMessage("");
    
    // 메시지 전송
    sendMessageMutation.mutate(textToSend);
  };

  // 메시지 형식 변환 함수 - 메시지 내용이 진실
  const transformMessages = (originalMessages: any[]) => {
    return originalMessages.map((msg: any) => {
      // 시스템 메시지 처리
      if (msg.senderType === 'system' || msg.messageType === 'join' || msg.messageType === 'leave') {
        // 메시지 내용에서 발신자 이름 추출 (가장 정확한 방법)
        let actualSender = 'system';
        
        if (msg.content) {
          // 모든 입장/퇴장 패턴 매칭
          const patterns = [
            /(\w+)님이 입장했습니다/,
            /(\w+)님이 나갔습니다/,
            /(\w+)님이 대화에 참여했습니다/,
            /(\w+)님이 대화를 떠났습니다/
          ];
          
          for (const pattern of patterns) {
            const match = msg.content.match(pattern);
            if (match) {
              actualSender = match[1];
              break;
            }
          }
        }
        
        return {
          id: msg.id,
          sender: actualSender,
          senderType: 'system',
          message: msg.content,
          thinking: msg.thinking,
          type: msg.messageType || 'system',
          expandedInfo: msg.expandedInfo,
          timestamp: new Date(msg.createdAt).getTime(),
          index: 0,
          total: 1
        };
      }
      
      // 일반 메시지 처리
      // 페르소나 이름을 '소유자'의 '페르소나명' 형식으로 표시
      let displayName = 'AI';
      if (msg.isAI && msg.persona) {
        if (msg.persona.owner) {
          displayName = `${msg.persona.owner.name}의 ${msg.persona.name}`;
        } else {
          displayName = msg.persona.name;
        }
      } else if (!msg.isAI && msg.user) {
        displayName = msg.user.name || '사용자';
      }

      return {
        id: msg.id,
        sender: displayName,
        senderType: msg.isAI ? 'ai' : 'user',
        message: msg.content,
        thinking: msg.thinking,
        type: msg.persona?.type || 'empath',
        expandedInfo: msg.expandedInfo,
        timestamp: new Date(msg.createdAt).getTime(),
        index: 0,
        total: 1,
        user: msg.user,
        persona: msg.persona
      };
    });
  };

  // 대화 기록 삭제
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/perso/${postId}/messages/clear`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
      toast({
        title: "대화 기록 삭제됨",
        description: "새로운 대화가 시작됩니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "대화 기록 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 헤더 - 고정 */}
      <header className="sticky top-0 z-50 flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <button className="text-foreground" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => clearChatMutation.mutate()}
              disabled={clearChatMutation.isPending}
              data-testid="button-clear-chat"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePersonaStatus('Luna')}
              className="text-xs"
            >
              Luna 토글
            </Button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">{post?.title ?? '게시물'}의 페르소 공간</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                // 중복 제거 후 카운트
                const uniquePersonas = new Set(
                  participants
                    .filter((p: any) => p?.type === 'persona')
                    .map((p: any) => p.personaId)
                );
                const uniqueUsers = new Set(
                  participants
                    .filter((p: any) => p?.type === 'user')
                    .map((p: any) => p.userId)
                );
                return `페르소나 ${uniquePersonas.size}명, 회원 ${uniqueUsers.size}명`;
              })()}
            </p>
          </div>
        </div>
        
        {/* 참여자 리스트 */}
        {participants.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-muted-foreground shrink-0">참여 중:</span>
              {(() => {
                const uniqueParticipants = participants.reduce((acc: any[], p: any) => {
                  if (!p) return acc;
                  
                  // 페르소나의 경우 personaId로 중복 체크
                  if (p.type === 'persona') {
                    if (!acc.find((existing: any) => existing.type === 'persona' && existing.personaId === p.personaId)) {
                      acc.push(p);
                    }
                  }
                  // 사용자의 경우 userId로 중복 체크
                  else if (p.type === 'user') {
                    if (!acc.find((existing: any) => existing.type === 'user' && existing.userId === p.userId)) {
                      acc.push(p);
                    }
                  }
                  
                  return acc;
                }, []);
                
                return uniqueParticipants.map((p: any) => {
                  if (p.type === 'persona') {
                    return (
                      <Link key={`persona-${p.personaId}`} href={`/chat/${p.personaId}`}>
                        <div className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5 shrink-0 hover-elevate" data-testid={`participant-persona-${p.personaId}`}>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={p.personaImage} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">@{p.username?.split('_')?.[0] ?? '알수없음'}</span>
                        </div>
                      </Link>
                    );
                  } else {
                    return (
                      <div key={`user-${p.userId}`} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5 shrink-0" data-testid={`participant-user-${p.userId}`}>
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={p.profileImage} />
                          <AvatarFallback>{p.name?.[0] ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">@{p.username?.split('_')?.[0] ?? '사용자'}</span>
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
        )}
        
        {/* 게시물 정보 */}
        {post && (
          <div className="px-4 pb-4" data-testid="post-info">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium mb-1">{post.title}</p>
              <p className="text-xs text-muted-foreground mb-2">{post.description}</p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[10px] h-5">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 채팅 메시지 영역 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto">
        <EnhancedChatPanel
          postId={postId || ''}
          postContent={post ? `${post.title} - ${post.description}` : ''}
          analysis={{ subjects: [{ topic: 'general', weight: 1.0 }] }}
          onSendMessage={handleSend}
          messages={transformMessages(messages)}
          isTyping={sendMessageMutation.isPending}
          isThinking={false}
          currentUser={{
            name: userPersona?.name || '사용자',
            username: userPersona?.username || 'user',
            profileImage: userPersona?.profileImage
          }}
          activePersonas={activePersonas}
          dominantPersona={dominantPersona}
          currentTopics={currentTopics}
          totalTurns={totalTurns}
          onPersonaClick={async (personaId) => {
            console.log(`페르소나 클릭: ${personaId}`);
            
            if (!postId) return;
            
            // 페르소나가 이미 활성화되어 있는지 확인
            const existingPersona = activePersonas.find(p => p.id === personaId);
            
            if (existingPersona && existingPersona.status === 'active') {
              console.log(`[PERSONA] ${personaId} is already active`);
              return;
            }
            
            // 서버 API 호출하여 페르소나 강제 입장
            try {
              const response = await fetch(`/api/perso/${postId}/persona/${personaId}/join`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (!response.ok) {
                throw new Error('Failed to join persona');
              }
              
              const result = await response.json();
              console.log('[PERSONA JOIN] Success:', result);
              
              // 페르소나 상태를 즉시 업데이트 (WebSocket 이벤트도 올 것임)
              setActivePersonas(prev => {
                const exists = prev.find(p => p.id === personaId);
                if (exists) {
                  return prev.map(p => 
                    p.id === personaId 
                      ? { ...p, status: 'active' as const, joinedAt: Date.now() }
                      : p
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: personaId,
                      status: 'active' as const,
                      joinedAt: Date.now(),
                      lastSpokeAt: 0,
                      messageCount: 0,
                    }
                  ];
                }
              });
              
            } catch (error) {
              console.error('[PERSONA JOIN] Error:', error);
            }
          }}
        />
              </div>

      {/* 활성 페르소나 표시 영역 - 하단 고정 */}
      {activePersonas.length > 0 && (
        <div className="sticky bottom-[80px] z-30 border-t border-border bg-background/95 backdrop-blur-sm">
          <ActivePersonas
            activePersonas={activePersonas}
            dominantPersona={dominantPersona}
            currentTopics={currentTopics}
            totalTurns={totalTurns}
            onPersonaClick={async (personaId) => {
              console.log(`페르소나 클릭: ${personaId}`);
              
              if (!postId) return;
              
              // 페르소나가 이미 활성화되어 있는지 확인
              const existingPersona = activePersonas.find(p => p.id === personaId);
              
              if (existingPersona && existingPersona.status === 'active') {
                console.log(`[PERSONA] ${personaId} is already active`);
                return;
              }
              
              // 서버 API 호출하여 페르소나 강제 입장
              try {
                const response = await fetch(`/api/perso/${postId}/persona/${personaId}/join`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                  },
                });
                
                if (!response.ok) {
                  throw new Error('Failed to join persona');
                }
                
                const result = await response.json();
                console.log('[PERSONA JOIN] Success:', result);
                
                // 페르소나 상태를 즉시 업데이트 (WebSocket 이벤트도 올 것임)
                setActivePersonas(prev => {
                  const exists = prev.find(p => p.id === personaId);
                  if (exists) {
                    return prev.map(p => 
                      p.id === personaId 
                        ? { ...p, status: 'active' as const, joinedAt: Date.now() }
                        : p
                    );
                  } else {
                    return [
                      ...prev,
                      {
                        id: personaId,
                        status: 'active' as const,
                        joinedAt: Date.now(),
                        lastSpokeAt: 0,
                        messageCount: 0,
                      }
                    ];
                  }
                });
                
              } catch (error) {
                console.error('[PERSONA JOIN] Error:', error);
              }
            }}
          />
                </div>
              )}
      

      {/* 메시지 입력창 - 하단 고정 */}
      <div className="sticky bottom-0 z-40 border-t border-border p-4 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button 
            onClick={() => handleSend()}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
