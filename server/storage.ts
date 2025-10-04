import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
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
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  createConversationForPost(postId: string, createdByType: 'user' | 'persona', createdById: string): Promise<Conversation>;
  addParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  createMessageInConversation(message: InsertMessage): Promise<Message>;
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

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt);
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
    return message;
  }
}

export const storage = new DbStorage();
