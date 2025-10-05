import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  profileImage: text("profile_image"),
});

export const personas = pgTable("personas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  image: text("image").notNull(),
  description: text("description"),
  empathy: integer("empathy").notNull().default(5),
  humor: integer("humor").notNull().default(5),
  sociability: integer("sociability").notNull().default(5),
  creativity: integer("creativity").notNull().default(5),
  knowledge: integer("knowledge").notNull().default(5),
  currentMood: jsonb("current_mood"),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image").notNull(),
  tags: text("tags").array(),
  sentiment: real("sentiment"),
  personaEffect: jsonb("persona_effect"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const persoMessages = pgTable("perso_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isAI: boolean("is_ai").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeType: varchar("scope_type", { length: 20 }).notNull(),
  scopeId: varchar("scope_id"),
  title: text("title"),
  createdByType: varchar("created_by_type", { length: 20 }).notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  participantType: varchar("participant_type", { length: 20 }).notNull(),
  participantId: varchar("participant_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default('member'),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastReadMessageId: varchar("last_read_message_id"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => {
  return {
    uniqueParticipant: sql`UNIQUE (${table.conversationId}, ${table.participantType}, ${table.participantId})`,
  };
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull().default('text'),
  replyToId: varchar("reply_to_id"),
  meta: jsonb("meta"),
  visibleAt: timestamp("visible_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});

export const messageDeletedByUsers = pgTable("message_deleted_by_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueUserMessage: sql`UNIQUE (${table.messageId}, ${table.userId})`,
  };
});

export const postConversations = pgTable("post_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
});

export const personaMemories = pgTable("persona_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  summary: text("summary"),
  context: text("context"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationPersonaStates = pgTable("conversation_persona_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: 'cascade' }),
  presenceState: varchar("presence_state", { length: 20 }).notNull().default('active'),
  mood: jsonb("mood"),
  lastEventAt: timestamp("last_event_at"),
  lastMessageAt: timestamp("last_message_at"),
  nextActionAt: timestamp("next_action_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueConversationPersona: sql`UNIQUE (${table.conversationId}, ${table.personaId})`,
    conversationIdx: sql`CREATE INDEX IF NOT EXISTS conversation_persona_states_conversation_id_idx ON ${table} (${table.conversationId})`,
  };
});

export const conversationEvents = pgTable("conversation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 20 }).notNull(),
  actorType: varchar("actor_type", { length: 20 }).notNull(),
  actorId: varchar("actor_id").notNull(),
  payload: jsonb("payload"),
  effectiveAt: timestamp("effective_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    conversationIdx: sql`CREATE INDEX IF NOT EXISTS conversation_events_conversation_id_idx ON ${table} (${table.conversationId})`,
    effectiveAtIdx: sql`CREATE INDEX IF NOT EXISTS conversation_events_effective_at_idx ON ${table} (${table.effectiveAt})`,
  };
});

export const personaEmotionLogs = pgTable("persona_emotion_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: 'cascade' }),
  emotion: text("emotion").notNull(),
  value: integer("value").notNull(),
  trigger: text("trigger"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
}, (table) => {
  return {
    personaIdx: sql`CREATE INDEX IF NOT EXISTS persona_emotion_logs_persona_id_idx ON ${table} (${table.personaId})`,
    recordedAtIdx: sql`CREATE INDEX IF NOT EXISTS persona_emotion_logs_recorded_at_idx ON ${table} (${table.recordedAt})`,
  };
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPersonaSchema = createInsertSchema(personas).omit({
  id: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertPersoMessageSchema = createInsertSchema(persoMessages).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "메시지 내용은 비어있을 수 없습니다"),
});

export const insertPostConversationSchema = createInsertSchema(postConversations).omit({
  id: true,
});

export const insertPersonaMemorySchema = createInsertSchema(personaMemories).omit({
  id: true,
  createdAt: true,
});

export const insertMessageDeletedByUserSchema = createInsertSchema(messageDeletedByUsers).omit({
  id: true,
  deletedAt: true,
});

export const insertConversationPersonaStateSchema = createInsertSchema(conversationPersonaStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationEventSchema = createInsertSchema(conversationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPersonaEmotionLogSchema = createInsertSchema(personaEmotionLogs).omit({
  id: true,
  recordedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personas.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertPersoMessage = z.infer<typeof insertPersoMessageSchema>;
export type PersoMessage = typeof persoMessages.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertPostConversation = z.infer<typeof insertPostConversationSchema>;
export type PostConversation = typeof postConversations.$inferSelect;

export type InsertPersonaMemory = z.infer<typeof insertPersonaMemorySchema>;
export type PersonaMemory = typeof personaMemories.$inferSelect;

export type InsertMessageDeletedByUser = z.infer<typeof insertMessageDeletedByUserSchema>;
export type MessageDeletedByUser = typeof messageDeletedByUsers.$inferSelect;

export type InsertConversationPersonaState = z.infer<typeof insertConversationPersonaStateSchema>;
export type ConversationPersonaState = typeof conversationPersonaStates.$inferSelect;

export type InsertConversationEvent = z.infer<typeof insertConversationEventSchema>;
export type ConversationEvent = typeof conversationEvents.$inferSelect;

export type InsertPersonaEmotionLog = z.infer<typeof insertPersonaEmotionLogSchema>;
export type PersonaEmotionLog = typeof personaEmotionLogs.$inferSelect;
