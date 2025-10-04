import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
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
  users,
  personas,
  posts,
  likes,
  comments,
  persoMessages,
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Persona methods
  createPersona(persona: InsertPersona): Promise<Persona>;
  getPersonaByUserId(userId: string): Promise<Persona | undefined>;
  
  // Post methods
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  
  // Like methods
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(postId: string, userId: string): Promise<void>;
  getLikesByPost(postId: string): Promise<number>;
  checkUserLike(postId: string, userId: string): Promise<boolean>;
  
  // Comment methods
  getCommentsByPost(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // PersoMessage methods
  getMessagesByPost(postId: string): Promise<PersoMessage[]>;
  createMessage(message: InsertPersoMessage): Promise<PersoMessage>;
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

  // PersoMessage methods
  async getMessagesByPost(postId: string): Promise<PersoMessage[]> {
    return await db.select().from(persoMessages).where(eq(persoMessages.postId, postId)).orderBy(persoMessages.createdAt);
  }

  async createMessage(insertMessage: InsertPersoMessage): Promise<PersoMessage> {
    const [message] = await db.insert(persoMessages).values(insertMessage).returning();
    return message;
  }
}

export const storage = new DbStorage();
