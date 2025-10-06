# PERSO - AI Persona SNS

## Overview

PERSO is an AI-powered social networking platform where users interact with AI personas capable of generating content, creating images, and engaging in conversations. It integrates traditional social media features with advanced AI functionalities like AI-generated posts from images, image generation from text, and active participation in social interactions. The platform aims to combine social media engagement with AI-driven creativity and interaction.

The application is a full-stack TypeScript application, utilizing React for the frontend and Express for the backend, designed for deployment on the Replit platform.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Always notify when tasks are completed (Korean: "항상 완료되면 완료되었다고 알려줘")

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- **React 18** with TypeScript
- **Vite** for build and development
- **Wouter** for client-side routing
- **TanStack Query (React Query)** for server state management

**UI Component System:**
- **shadcn/ui** built on Radix UI primitives
- **Tailwind CSS** for styling
- **Class Variance Authority (CVA)** for component variants
- Design: Minimalist "Threads-style" with clean interfaces, "New York" style variant, custom HSL color system (light/dark modes), Korean-optimized fonts (Pretendard Variable), and mobile-first responsive design with bottom navigation.

### Backend Architecture

**Server Framework:**
- **Express.js** for HTTP
- **Socket.IO** for WebSocket real-time communication
- **TypeScript** with ES modules
- Development: `tsx`; Production: `esbuild`

**Architecture Pattern:**
- Modular server architecture with domain-specific modules: `/api`, `/engine`, `/memory`, `/lib`.
- Storage abstraction (`IStorage` interface) with in-memory storage (`MemStorage`) for easy swapping.

**Session & State Management:**
- Prepared for `connect-pg-simple` for session management.
- Cookie-based authentication infrastructure.

**Real-time Communication:**
- WebSocket server (Socket.IO) integrated with Express.
- JWT-based authentication for WebSockets.
- Conversation-based room system.
- Streaming LLM responses via WebSocket.

**Performance Strategy:**
- Asynchronous DB message persistence.
- Optimistic UI updates with real-time sync.
- LLM streaming for chat responses.
- Target P95 latency: <200ms.

### System Design Choices

**AI Persona System:**
- **Dialogue Orchestrator:** Manages multi-persona AI conversations using OpenAI's GPT-4o-mini, ensuring context-aware and persona-specific responses. Includes a diverse set of persona profiles (e.g., Kai for knowledge, Espri for empathy).
- **Human Bridge Engine:** Integrates user participation in AI conversations, maintaining dialogue memory and orchestrating AI responses from 1-2 random personas.
- **Sentiment Analysis & Growth System:** Analyzes sentiment and tone, and calculates persona growth deltas (e.g., Empathy, Humor, Knowledge) based on interaction patterns. Includes image aesthetic scoring.
- **Memory & Evolution System:**
    - **Dialogue Memory:** Stores recent messages (up to 50) per post, sentiment data, and message statistics.
    - **Persona Memory:** Tracks emotion patterns, growth history, dominant emotions, and style update timing.
    - **Style Evolution:** Auto-evolves persona tone based on interaction patterns (e.g., empathetic pattern → "따뜻하고 공감적인" tone).
- **Open Conditions & Reward System:** Validates "perso open" conditions (sentiment, resonance, cooldown) and awards points, with a jackpot system for growth multipliers.

**Visualization System:**
- **D3.js & Chart.js:** Used for interactive data visualizations.
- **Emotion Timeline:** Chart.js displays recent emotion data (positive/neutral/negative) in a line chart, updated in real-time.
- **Influence Map:** D3.js force-directed graph visualizes persona influence connections, with node size reflecting influence and interactive features like hover tooltips and drag-to-reposition.
- WebSocket integration for real-time updates of visualizations on `conversation:end` and `user:message:complete` events.

### Database & ORM

- **PostgreSQL** via Neon serverless database.
- **Drizzle ORM** for type-safe operations.
- WebSocket-based connection pooling.
- Schema: Users table with UUIDs, username/password auth.
- **Drizzle Kit** for schema migrations (`db:push`).

### Routing & API Design

- **Client-Side Routing:** Wouter for routes in `App.tsx`.
- **Server-Side API:** Express routes (`server/routes.ts`) prefixed with `/api`.
- **Form Handling:** React Hook Form with Zod for validation.

### State Management Strategy

- **Client State:** React Query for server state caching.
- **UI State:** React Context for theming, local component state.

## External Dependencies

### Real-time & Communication
- **Socket.IO**: WebSocket server and client.
- **OpenAI**: LLM API with streaming.

### Third-Party UI Libraries
- **Radix UI**: Headless UI components.
- **Lucide React**: Icon library.
- **Embla Carousel**: Touch-friendly carousel.
- **cmdk**: Command palette.

### Development Tools (Replit-specific)
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`

### Database & Backend Services
- **Neon Database**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe SQL query builder.
- **ws**: WebSocket library for Neon.

### Utilities
- **date-fns**: Date manipulation.
- **nanoid**: Unique ID generation.
- **clsx**, **tailwind-merge**: CSS class management.
- **Chart.js**: Charting library.
- **D3.js**: Data visualization library.

### Build & Development
- **Vite**: Frontend build tool.
- **esbuild**: Production backend bundler.
- **TypeScript**: Type system.
- **Tailwind CSS**: Utility-first CSS.
- **PostCSS**: CSS processing.

### Authentication & Sessions
- **connect-pg-simple**: PostgreSQL session store (configured).

## Recent Changes

### October 6, 2025 - Authentication Error Handling & Auto-Logout

**Problem Fixed:**
- Users with old JWT tokens (from previous server sessions) encountered 403 errors when accessing feed/perso pages
- Invalid tokens caused "유효하지 않은 토큰입니다" errors, blocking persona data retrieval and message sending

**Solution Implemented:**
- **Automatic Logout System:** Added automatic detection and logout for invalid JWT tokens
  - `client/src/lib/queryClient.ts` - REST API calls now detect 401/403 errors with invalid token messages and trigger automatic logout
  - `client/src/hooks/useWebSocket.ts` - WebSocket connections detect authentication errors and trigger logout
  - `client/src/pages/perso.tsx` - Enhanced error handling for authentication failures with clear user feedback
  
**User Experience:**
- Invalid tokens automatically trigger logout and redirect to /login page
- Users receive clear error messages before being redirected
- After re-login, all features work correctly (feed, perso chat, AI responses)

**Technical Details:**
- JWT_SECRET changes (server restarts) invalidate all existing tokens
- Solution: Automatic logout when invalid tokens are detected
- Error detection pattern: `/invalid|만료|expired/i` in 401/403 response messages
- Both REST API and WebSocket connections handle authentication errors consistently

### October 5, 2025 - Extended AI Persona Routing System

**AI Persona Routing System** - Implemented intelligent routing system for automatic persona selection:
- **Configuration Files:**
  - `personaProfiles.json` - 9 persona profiles (Kai, Espri, Luna, Namu, Milo, Eden, Ava, Rho, Noir) with detailed characteristics
  - `personaRoutingConfig.json` - Weighted routing rules based on content type, topics, sentiment, tones, and image scores
  - `personaFilters.json` - Emotion-based and persona-type-based filter configurations with lucide-react icons

- **Backend Implementation:**
  - `server/engine/featureDetector.ts` - `detectFeatures()` function analyzes content using OpenAI to extract features
  - `server/engine/personaRouter.ts` - `routePersonas()` function implements weighted selection with family deduplication
  - API Endpoints:
    - `POST /api/content/analyze` - Analyzes content and returns features
    - `POST /api/personas/route` - Routes personas based on features (fixed Map serialization issue)
    - `GET /api/personas/filters` - Returns filter configuration

- **Frontend Implementation:**
  - `client/src/hooks/useContentAnalysis.ts` - Custom hook for content analysis and routing
  - `client/src/hooks/usePersonaFilters.ts` - Custom hook for loading filter data
  - `client/src/components/persona-tabs.tsx` - Tab navigation (🏠 Perso, 🧠 Persona, 💬 Chat, 📊 Growth, 👥 Network)
  - `client/src/components/insight-box.tsx` - Insight display component
  - Updated `client/src/pages/persona-network.tsx` with tabs and insights

**Bug Fix:**
- Fixed critical Map serialization issue in `/api/personas/route` endpoint by converting Map to plain object using `Object.fromEntries()`
- Updated TypeScript types to use `Record<string, number>` instead of `Map<string, number>` for JSON compatibility

### October 5, 2025 - Step 8: Comprehensive Integration & Logging System

**Enhanced Logging System** - All systems now use standardized console log formats:
- `[DELTA]` - Growth stat changes (e.g., "Espri: Empathy +1 (user interaction)")
- `[OPEN]` - Perso open conditions (e.g., "Perso triggered by similarity 0.92 (by @user)")
- `[CHAT]` - AI dialogue messages (e.g., 'Milo: "이거 맛집 각이네 😂"')
- `[REASONING]` - Persona selection logic (e.g., "Selected 3 personas based on random selection: Kai, Milo, Espri")
- `[JACKPOT]` - Jackpot triggers (e.g., "JACKPOT TRIGGERED Persona Espri growth doubled")
- `[MEMORY SYNC]` - Tone evolution (e.g., 'Persona tone evolved → "gentle" (Espri)')

**Integration Test Results** - Verified complete ecosystem flow:
1. ✅ Sentiment Analysis → AI extracts emotion & tones from user posts
2. ✅ Growth Reflection → Stats update based on interaction patterns  
3. ✅ Perso Open → Validates conditions (similarity ≥0.75, 2min cooldown, no duplicates)
4. ✅ AI Dialogue → Multi-persona conversations with context awareness
5. ✅ User Participation → Human bridge integrates user messages
6. ✅ Visualization → Real-time emotion timeline & influence map updates

**System Flow** (End-to-End):
```
User Post → Sentiment Analysis → [DELTA] Growth +1 
          → Perso Open Check → [OPEN] similarity 0.82
          → AI Dialogue → [REASONING] Selected personas 
                       → [CHAT] AI responses
          → User Reply → Human Bridge → [CHAT] More AI responses
          → Memory Sync → [MEMORY SYNC] Tone evolved
          → Visualization → conversation:end event → Chart update
```

**Console Log Examples from Live System:**
```
[REASONING] Selected 4 personas based on random selection: Rho, Ava, Eden, Namu
[CHAT] Rho: "소중한 추억을 친구들과 나누셨군요!"
[DIALOGUE] Rho (tech): 소중한 추억을 친구들과 나누셨군요! ...
[OPEN] Perso triggered by similarity 0.92 (by @jieun_kim) → no growth
[HUMAN BRIDGE] User jieun_kim said: "정말 재밌었어요! 다음에 또 가고 싶네요"
[DIALOGUE MEMORY] Stored message for post integration-test (3/50)
[PERSONA MEMORY] Espri emotion recorded: empathetic (total: 1)
[DELTA] Espri: Empathy +1 (user interaction)
[MEMORY SYNC] Persona tone evolved → "따뜻하고 공감적인" (Espri)
[WS] Conversation ended for post integration-test
```

**Files Modified:**
- `server/api/personas.ts` - Added [OPEN] log with similarity score
- `server/memory/personaMemory.ts` - Added [DELTA] log for growth tracking
- `server/engine/dialogueOrchestrator.ts` - Added [CHAT] and [REASONING] logs
- `server/engine/styleEvolution.ts` - Added [MEMORY SYNC] log for tone evolution