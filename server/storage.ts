import { db } from "./db";
import { eq, desc, and, isNull, or, lte, sql } from "drizzle-orm";
import {
  type User,
  type InsertUser,
  type Persona,
  type InsertPersona,
  type Post,
  type InsertPost,
  type Like,
  type InsertLike,
  type Comment,
  type InsertComment,
  type PersoMessage,
  type InsertPersoMessage,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  type PersonaMemory,
  type InsertPersonaMemory,
  type InsertMessageDeletedByUser,
  type PersonaEmotionLog,
  type InsertPersonaEmotionLog,
  users,
  personas,
  posts,
  likes,
  comments,
  persoMessages,
  conversations,
  conversationParticipants,
  messages,
  postConversations,
  personaMemories,
  messageDeletedByUsers,
  personaEmotionLogs,
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Persona methods
  createPersona(persona: InsertPersona): Promise<Persona>;
  getPersonaByUserId(userId: string): Promise<Persona | undefined>;
  getPersona(id: string): Promise<Persona | undefined>;
  getAllPersonas(): Promise<Persona[]>;
  updatePersonaStats(personaId: string, stats: Partial<{ empathy: number; humor: number; sociability: number; creativity: number; knowledge: number; currentMood: any }>): Promise<void>;
  
  // PersonaMemory methods
  getMemoriesByPersona(personaId: string, limit?: number): Promise<PersonaMemory[]>;
  createMemory(memory: InsertPersonaMemory): Promise<PersonaMemory>;
  
  // PersonaEmotionLog methods
  createEmotionLog(log: InsertPersonaEmotionLog): Promise<PersonaEmotionLog>;
  getEmotionLogsByPersona(personaId: string, days?: number): Promise<PersonaEmotionLog[]>;
  
  // Post methods
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePostAnalysis(postId: string, analysis: { tags: string[], sentiment: number, personaEffect: any }): Promise<void>;
  
  // Like methods
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(postId: string, userId: string): Promise<void>;
  getLikesByPost(postId: string): Promise<number>;
  checkUserLike(postId: string, userId: string): Promise<boolean>;
  
  // Comment methods
  getCommentsByPost(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // PersoMessage methods (legacy)
  getMessagesByPost(postId: string): Promise<PersoMessage[]>;
  createMessage(message: InsertPersoMessage): Promise<PersoMessage>;
  
  // Conversation methods (new)
  getConversationByPost(postId: string): Promise<Conversation | undefined>;
  getMessagesByConversation(conversationId: string, userId?: string): Promise<Message[]>;
  getParticipantsByConversation(conversationId: string): Promise<ConversationParticipant[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  createConversationForPost(postId: string, createdByType: 'user' | 'persona', createdById: string): Promise<Conversation>;
  addParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  createMessageInConversation(message: InsertMessage): Promise<Message>;
  markMessageDeletedForUser(messageId: string, userId: string): Promise<void>;
  markConversationDeletedForUser(conversationId: string, userId: string): Promise<void>;
  updateConversationTimestamp(conversationId: string): Promise<void>;
  findConversationBetweenPersonas(persona1Id: string, persona2Id: string): Promise<Conversation | undefined>;
  getOrCreatePersonaConversation(userPersonaId: string, targetPersonaId: string): Promise<Conversation>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Persona methods
  async createPersona(insertPersona: InsertPersona): Promise<Persona> {
    const [persona] = await db.insert(personas).values(insertPersona).returning();
    return persona;
  }

  async getPersonaByUserId(userId: string): Promise<Persona | undefined> {
    const [persona] = await db.select().from(personas).where(eq(personas.userId, userId));
    return persona;
  }

  async getPersona(id: string): Promise<Persona | undefined> {
    const [persona] = await db.select().from(personas).where(eq(personas.id, id));
    return persona;
  }

  async getAllPersonas(): Promise<Persona[]> {
    return await db.select().from(personas);
  }

  async updatePersonaStats(personaId: string, stats: Partial<{ empathy: number; humor: number; sociability: number; creativity: number; knowledge: number; currentMood: any }>): Promise<void> {
    await db.update(personas)
      .set(stats)
      .where(eq(personas.id, personaId));
  }

  // PersonaMemory methods
  async getMemoriesByPersona(personaId: string, limit: number = 10): Promise<PersonaMemory[]> {
    return await db.select()
      .from(personaMemories)
      .where(eq(personaMemories.personaId, personaId))
      .orderBy(desc(personaMemories.createdAt))
      .limit(limit);
  }

  async createMemory(insertMemory: InsertPersonaMemory): Promise<PersonaMemory> {
    const [memory] = await db.insert(personaMemories).values(insertMemory).returning();
    return memory;
  }

  // PersonaEmotionLog methods
  async createEmotionLog(insertLog: InsertPersonaEmotionLog): Promise<PersonaEmotionLog> {
    const [log] = await db.insert(personaEmotionLogs).values(insertLog).returning();
    return log;
  }

  async getEmotionLogsByPersona(personaId: string, days: number = 7): Promise<PersonaEmotionLog[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    return await db.select()
      .from(personaEmotionLogs)
      .where(
        and(
          eq(personaEmotionLogs.personaId, personaId),
          sql`${personaEmotionLogs.recordedAt} >= ${daysAgo.toISOString()}`
        )
      )
      .orderBy(personaEmotionLogs.recordedAt);
  }

  // Post methods
  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async updatePostAnalysis(postId: string, analysis: { tags: string[], sentiment: number, personaEffect: any }): Promise<void> {
    await db.update(posts)
      .set({
        tags: analysis.tags,
        sentiment: analysis.sentiment,
        personaEffect: analysis.personaEffect,
      })
      .where(eq(posts.id, postId));
  }

  // Like methods
  async createLike(insertLike: InsertLike): Promise<Like> {
    const [like] = await db.insert(likes).values(insertLike).returning();
    return like;
  }

  async deleteLike(postId: string, userId: string): Promise<void> {
    await db.delete(likes).where(
      and(eq(likes.postId, postId), eq(likes.userId, userId))
    );
  }

  async getLikesByPost(postId: string): Promise<number> {
    const result = await db.select().from(likes).where(eq(likes.postId, postId));
    return result.length;
  }

  async checkUserLike(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(likes).where(
      and(eq(likes.postId, postId), eq(likes.userId, userId))
    );
    return !!like;
  }

  // Comment methods
  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  // PersoMessage methods (legacy)
  async getMessagesByPost(postId: string): Promise<PersoMessage[]> {
    return await db.select().from(persoMessages).where(eq(persoMessages.postId, postId)).orderBy(persoMessages.createdAt);
  }

  async createMessage(insertMessage: InsertPersoMessage): Promise<PersoMessage> {
    const [message] = await db.insert(persoMessages).values(insertMessage).returning();
    return message;
  }

  // Conversation methods (new)
  async getConversationByPost(postId: string): Promise<Conversation | undefined> {
    const [postConv] = await db
      .select()
      .from(postConversations)
      .where(eq(postConversations.postId, postId));
    
    if (!postConv) return undefined;
    
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, postConv.conversationId));
    
    return conversation;
  }

  async getMessagesByConversation(conversationId: string, userId?: string): Promise<Message[]> {
    const allMessages = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        or(
          isNull(messages.visibleAt),
          lte(messages.visibleAt, sql`NOW()`)
        )
      ))
      .orderBy(messages.createdAt);
    
    if (!userId) {
      return allMessages;
    }
    
    const deletedMessageIds = await db
      .select({ messageId: messageDeletedByUsers.messageId })
      .from(messageDeletedByUsers)
      .where(eq(messageDeletedByUsers.userId, userId));
    
    const deletedIds = new Set(deletedMessageIds.map(d => d.messageId));
    return allMessages.filter(msg => !deletedIds.has(msg.id));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async createConversationForPost(
    postId: string,
    createdByType: 'user' | 'persona',
    createdById: string
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        scopeType: 'post',
        scopeId: postId,
        createdByType,
        createdById,
      })
      .returning();

    await db.insert(postConversations).values({
      postId,
      conversationId: conversation.id,
    });

    return conversation;
  }

  async addParticipant(insertParticipant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [participant] = await db
      .insert(conversationParticipants)
      .values(insertParticipant)
      .returning();
    return participant;
  }

  async createMessageInConversation(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    
    await this.updateConversationTimestamp(insertMessage.conversationId);
    
    return message;
  }

  async getParticipantsByConversation(conversationId: string): Promise<ConversationParticipant[]> {
    return await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId))
      .orderBy(conversationParticipants.joinedAt);
  }

  async findConversationBetweenPersonas(persona1Id: string, persona2Id: string): Promise<Conversation | undefined> {
    // 두 페르소나 간 기존 대화방 찾기
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'persona-dm'));
    
    const isSelfChat = persona1Id === persona2Id;
    
    for (const conv of allConversations) {
      const participants = await this.getParticipantsByConversation(conv.id);
      const personaIds = participants
        .filter(p => p.participantType === 'persona')
        .map(p => p.participantId);
      
      if (isSelfChat) {
        // 본인 페르소나와의 대화: 참가자가 1명이고 그게 본인
        if (personaIds.length === 1 && personaIds[0] === persona1Id) {
          return conv;
        }
      } else {
        // 다른 페르소나와의 대화: 참가자가 2명이고 둘 다 포함
        if (
          personaIds.length === 2 &&
          personaIds.includes(persona1Id) &&
          personaIds.includes(persona2Id)
        ) {
          return conv;
        }
      }
    }
    
    return undefined;
  }

  async getOrCreatePersonaConversation(
    userPersonaId: string,
    targetPersonaId: string
  ): Promise<Conversation> {
    // 기존 대화방 찾기
    const existing = await this.findConversationBetweenPersonas(userPersonaId, targetPersonaId);
    if (existing) return existing;
    
    // 새 대화방 생성
    const [conversation] = await db
      .insert(conversations)
      .values({
        scopeType: 'persona-dm',
        scopeId: null,
        title: null,
        createdByType: 'persona',
        createdById: userPersonaId,
      })
      .returning();
    
    // 페르소나를 participant로 추가
    await this.addParticipant({
      conversationId: conversation.id,
      participantType: 'persona',
      participantId: userPersonaId,
      role: 'member',
    });
    
    // 다른 페르소나인 경우에만 추가 (본인 페르소나와의 대화인 경우 중복 추가 방지)
    if (userPersonaId !== targetPersonaId) {
      await this.addParticipant({
        conversationId: conversation.id,
        participantType: 'persona',
        participantId: targetPersonaId,
        role: 'member',
      });
    }
    
    return conversation;
  }

  async markMessageDeletedForUser(messageId: string, userId: string): Promise<void> {
    await db
      .insert(messageDeletedByUsers)
      .values({ messageId, userId })
      .onConflictDoNothing();
  }

  async markConversationDeletedForUser(conversationId: string, userId: string): Promise<void> {
    const msgs = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    
    for (const msg of msgs) {
      await this.markMessageDeletedForUser(msg.id, userId);
    }
  }

  async updateConversationTimestamp(conversationId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }
}

export const storage = new DbStorage();
