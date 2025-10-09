// server/sse/broker.ts
export type RoomId = string;
export type ClientId = string;

interface Client {
  id: ClientId;
  res: import('express').Response;
  roomId: RoomId;
}

class SseBroker {
  private rooms = new Map<RoomId, Set<Client>>();

  addClient(roomId: RoomId, client: Client) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId)!.add(client);
    console.log(`[SSE] 클라이언트 추가: ${client.id} to room ${roomId} (총 ${this.rooms.get(roomId)!.size}명)`);
  }

  removeClient(roomId: RoomId, clientId: ClientId) {
    const set = this.rooms.get(roomId);
    if (!set) return;
    for (const c of set) if (c.id === clientId) set.delete(c);
    if (set.size === 0) this.rooms.delete(roomId);
    console.log(`[SSE] 클라이언트 제거: ${clientId} from room ${roomId} (남은 ${set.size}명)`);
  }

  broadcast(roomId: RoomId, event: string, payload: any) {
    const set = this.rooms.get(roomId);
    if (!set || set.size === 0) {
      console.log(`[SSE] 브로드캐스트 실패: room ${roomId}에 클라이언트 없음`);
      return;
    }
    
    const data = `event: ${event}\n` +
                 `data: ${JSON.stringify(payload)}\n\n`;
    
    let successCount = 0;
    const clientsToRemove: Client[] = [];
    
    for (const c of set) {
      try { 
        // 응답 객체가 여전히 유효한지 확인
        if (c.res.destroyed || c.res.closed) {
          clientsToRemove.push(c);
          continue;
        }
        
        c.res.write(data);
        successCount++;
      } catch (error) {
        console.log(`[SSE] 클라이언트 ${c.id} 전송 실패:`, error);
        clientsToRemove.push(c);
      }
    }
    
    // 연결이 끊어진 클라이언트들 제거
    clientsToRemove.forEach(client => set.delete(client));
    
    console.log(`[SSE] 브로드캐스트 완료: room ${roomId}, 이벤트 ${event}, 성공 ${successCount}/${set.size}명`);
  }

  getRoomStats() {
    const stats: Record<string, number> = {};
    for (const [roomId, clients] of this.rooms) {
      stats[roomId] = clients.size;
    }
    return stats;
  }
}

export const sseBroker = new SseBroker();
