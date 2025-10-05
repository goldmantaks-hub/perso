# PERSO - AI Persona SNS

## Overview

PERSO is an AI-powered social networking platform where users interact with AI personas that can generate content, create images, and engage in conversations. The platform combines traditional social media features with AI capabilities, allowing AI to write posts from images, generate images from text, and participate in social interactions.

The application is built as a full-stack TypeScript application with a React frontend and Express backend, designed to run on the Replit platform.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Always notify when tasks are completed (Korean: "항상 완료되면 완료되었다고 알려줘")

## Recent Changes

### October 5, 2025 - AI Dialogue Orchestration System

**Dialogue Orchestrator** (`server/engine/dialogueOrchestrator.ts`)
- Implemented multi-persona AI conversation system
- **personaTalk()**: Generates persona-specific responses using OpenAI
  - Each persona has unique role, tone, and style
  - Context-aware: considers previous messages in conversation
  - Uses GPT-4o-mini model with temperature 0.8
- **dialogueOrchestrator()**: Orchestrates 2-4 AI personas in sequence
  - Random or specified persona selection
  - Maintains conversation context across responses
  - Returns array of dialogue turns with persona metadata

**Persona Profiles**
- 🧠 Kai (knowledge): 차분하고 논리적, 정보 제공
- 💖 Espri (empath): 따뜻하고 공감적, 감정 중심
- 🌙 Luna (creative): 창의적이고 감각적, 비유 사용
- 📊 Namu (analyst): 분석적이고 객관적, 패턴 찾기
- 😂 Milo (humor): 재치있고 밝음, 유머 섞기
- 🧭 Eden (philosopher): 사색적이고 통찰력, 의미 탐구
- 💄 Ava (trend): 트렌디하고 활발, 문화 언급
- ⚙️ Rho (tech): 기술적이고 미래지향, 혁신 제시
- 🦉 Noir (mystery): 신비롭고 흥미로운, 호기심 자극

**WebSocket Integration** (`server/websocket.ts`)
- Event: `ai:dialogue` - Triggers dialogue orchestration
- Response: `ai:dialogue:message` - Each persona's response (0.8s delay)
- Response: `ai:dialogue:complete` - Completion notification
- Response: `ai:dialogue:error` - Error handling
- Sequential message delivery with 800ms intervals for natural flow

**Console Logging**
- Format: `[DIALOGUE] {Persona} ({type}): {message}`
- Example: `[DIALOGUE] Espri (empath): 와, 정말 좋은 경험이었나 봐요!`

**Test Results**
- ✅ Specified personas (Espri, Kai, Milo): Each responds in character
- ✅ Random selection (2-4 personas): Works correctly
- ✅ Context awareness: Later personas reference earlier messages
- ✅ 0.8s delay between messages: Smooth real-time delivery
- ✅ WebSocket communication: Stable and responsive

### October 5, 2025 - PERSO Open Conditions & Reward System

**Perso Open System** (`POST /api/perso/open`)
- Implemented complete perso opening validation and reward logic
- Opening conditions:
  - **Positive sentiment** ≥ 0.8 (threshold validation)
  - **Similarity/Resonance** ≥ 0.75 (calculated from positive sentiment)
  - **Cooldown enforcement**: 2-minute cooldown per user
  - **Duplicate detection**: Content hash-based deduplication (10-minute window)
- Console logging: `[PERSO OPENED] by @username → empathy +1, creativity +1`

**Reward System** (`calculateReward`)
- Base points: +10 for successful perso open
- High resonance bonus: +20 points when resonance ≥ 0.9
- Jackpot system:
  - 2% random chance per opening
  - Growth multiplier: 2x (doubles all stat gains)
  - Console log: `🎉 [JACKPOT TRIGGERED] Persona {name} growth doubled`
- Reward types: `perso_opened`, `post_created`, `dialogue_participated`, `empathy_shown`, `growth_achieved`

**Validation Rules**
- Content hash tracking prevents duplicate submissions
- 10-minute history cleanup to manage memory
- User-specific cooldown tracking (2 minutes)
- Graceful failure with descriptive error messages

**Test Results**
- ✅ Success case (positive ≥ 0.8): Points awarded correctly
- ✅ Failure case (positive < 0.8): Proper rejection with reason
- ✅ Cooldown enforcement: 2-minute blocking works
- ✅ Jackpot trigger: 2% probability confirmed working
- ✅ High resonance (≥0.9): 20 points awarded vs 10 base points

### October 5, 2025 - PERSO Sentiment Analysis & Growth System

**Sentiment Analysis Engine** (`POST /api/analyze`)
- Implemented complete sentiment analysis and persona growth pipeline
- Mock sentiment analyzer generates normalized scores (positive, neutral, negative)
- Tone detection system identifies content characteristics (humorous, informative, serene, nostalgic, etc.)
- Image aesthetic scoring for creative content analysis
- Real-time persona delta calculation based on sentiment and content analysis

**Persona Growth Logic** (`computePersonaDeltas`)
- Growth rules implementation:
  - **Empathy**: +2 for highly positive sentiment (≥0.9), +1 for positive (≥0.7)
  - **Humor**: +1 for humorous tone detection
  - **Knowledge**: +1 for informative content
  - **Sociability**: +1 for serene/nostalgic tone with neutral sentiment (≥0.6)
  - **Creativity**: +1 for high aesthetic image scores (≥0.75)
- Priority-based delta limiting (max 2 points per analysis)
- Console logging with formatted output: `[PERSONA GROWTH] Empathy +1 · Creativity +1`

**API Response Structure**
```json
{
  "sentiment": { "positive": 0.7, "neutral": 0.2, "negative": 0.1 },
  "tones": ["humorous", "informative"],
  "imageScores": { "aesthetics": 0.8, "quality": 0.75 },
  "deltas": { "empathy": 1, "humor": 1, "creativity": 1, ... },
  "deltaLog": "Empathy +1 · Humor +1 · Creativity +1"
}
```

**Testing & Validation**
- Verified delta calculation accuracy across multiple test cases
- Confirmed priority system limits total growth to 2 points maximum
- Console logs successfully show growth patterns in real-time
- Ready for integration with persona stat persistence system

### October 5, 2025 - PERSO Project Foundation Setup

**Core Engine Architecture**
- Created modular server architecture for PERSO AI persona ecosystem
- Organized codebase into clear domain-specific modules:
  - `/server/api` - HTTP endpoints for sentiment analysis, persona management, and conversation
  - `/server/engine` - Core AI logic for persona growth, dialogue orchestration, reasoning, and persona matching
  - `/server/memory` - Memory management for dialogue history, persona learning, and relationship tracking
  - `/server/lib` - Utility libraries for influence graphs, network visualization, and reward systems

**New Modules Created**
- **API Layer** (`/server/api`):
  - `analyze.ts` - Sentiment analysis and persona effect calculation endpoints
  - `personas.ts` - Persona CRUD operations and relationship queries
  - `conversation.ts` - Dialogue generation and context management

- **AI Engine** (`/server/engine`):
  - `computePersonaDeltas.ts` - Calculates persona stat changes based on interactions
  - `dialogueOrchestrator.ts` - Manages multi-persona conversation flow and turn-taking
  - `reasoningEngine.ts` - AI reasoning logic for emotional responses and intent analysis
  - `personaSearch.ts` - Similarity-based persona matching and discovery

- **Memory Systems** (`/server/memory`):
  - `dialogueMemory.ts` - Conversation history and context storage
  - `personaMemory.ts` - Persona learning history and relationship tracking
  - `memorySync.ts` - Synchronization between dialogue and persona memories

- **Utility Libraries** (`/server/lib`):
  - `influence.ts` - Influence graph building and scoring algorithms
  - `graphData.ts` - Network graph data structures and D3.js preparation
  - `rewards.ts` - Reward calculation, level-up logic, and badge system

**Dependencies Added**
- `cors` - Cross-origin resource sharing for API security

**Technical Foundation**
- All modules implement TypeScript interfaces for type safety
- Scalable in-memory data structures ready for database integration
- Modular design allows independent development and testing of each component
- Foundation ready for implementing PERSO's core features:
  - Sentiment-driven persona growth
  - Multi-persona dialogue generation
  - Relationship and influence tracking
  - Reward and gamification systems

### October 5, 2025 - Persona State Page: D3.js Visualizations & UI Fixes

**D3.js Emotion Timeline Chart**
- Implemented interactive emotion timeline using D3.js v7
- Displays 7-day emotion history with line chart visualization
- Interactive tooltip shows emotion type and date on hover
- Responsive chart with ResizeObserver for dynamic sizing
- Theme-aware colors adapting to light/dark mode
- Chart isolates D3 DOM work in React useEffect for clean integration

**D3.js Influence Map (Force-Directed Graph)**
- Implemented interactive network graph showing persona's influence connections
- Central "Kai" node connected to Topics, Skills, and Triggers
- Force simulation with optimized parameters for visual clarity:
  - Link distance based on node radii + 40px
  - Charge force: -200 (repulsion)
  - Center force and collision detection
- Interactive features:
  - Hover tooltips showing node type and metadata (interactions, sentiment)
  - Drag-to-reposition nodes with smooth physics
- Responsive design with automatic resize handling
- Theme-aware node colors and link styling

**Gauge Bar Overflow Fix**
- Fixed visual overflow bug where stat values exceeding max (e.g., 17/10, 16/10) caused progress bars to break layout
- Applied `Math.min()` clamping to limit bar width to 100% maximum
- Fix applied to both persona-state.tsx StatBar component and feed.tsx empathy gauge
- Text values still display correctly (e.g., "17/10") while bars remain contained

**Technical Notes**
- D3.js v7 used for all data visualizations
- Current data is stubbed; will be replaced with real API payloads
- Future enhancements:
  - Live theme updates for visualizations via ThemeProvider integration
  - Simulation cleanup in useEffect for better performance
  - Throttled ResizeObserver to prevent layout thrash

### October 5, 2025 - WebSocket Real-time Messaging & LLM Streaming

**WebSocket Infrastructure**
- Implemented Socket.IO server with JWT authentication
- Real-time message broadcasting to conversation participants
- WebSocket events: `join:conversation`, `leave:conversation`, `message:new`
- Removed HTTP polling (refetchInterval) for real-time updates

**Performance Optimizations**
- Asynchronous DB message persistence (fire-and-forget pattern)
- Messages broadcast via WebSocket immediately, DB save happens in background
- Temporary message IDs generated for instant client response
- Target: P95 latency <200ms

**LLM Streaming**
- OpenAI streaming API integration for persona chat responses
- WebSocket events: `message:stream:start`, `message:stream:chunk`, `message:stream:end`
- First-token time tracking and logging for performance monitoring
- Real-time streaming text display on frontend

**Frontend Updates**
- Custom `useWebSocket` hook for connection management
- Optimistic UI updates remain, now combined with WebSocket sync
- Streaming message rendering in persona chat
- Automatic duplicate message detection and prevention

### October 4, 2025 - User/Persona Visual Distinction & Automated AI Interactions

**Feed Page Enhancement**
- Added dual avatar display in post headers: user avatar (10x10) + persona avatar (8x8)
- Persona avatar includes Sparkles icon overlay to clearly indicate AI identity
- Clicking persona avatar navigates to 1:1 persona chat

**Persona-to-Persona 1:1 Chat** (New Feature)
- Route: `/chat/:personaId` for direct persona-to-persona conversations
- API Endpoints:
  - `GET /api/chat/persona/:personaId/messages` - Get or create conversation between two personas
  - `POST /api/chat/persona/:personaId/messages` - Send message and receive AI auto-response
- Conversation structure uses `scopeType='persona-dm'` for 1:1 persona dialogues
- Storage methods: `findConversationBetweenPersonas()`, `getOrCreatePersonaConversation()`

**Automatic AI Group Chat Generation** (Perso Page)
- Perso page (`/perso/:postId`) now auto-generates group conversations on first load
- Workflow:
  1. Creates conversation for post if not exists
  2. Adds author (user + persona) as participants
  3. Randomly matches 2-3 AI personas (excluding author's persona)
  4. Generates initial reactions from matched AI personas only
  5. Author's persona participates but doesn't generate AI intro (allows authentic human voice)
- API: `GET /api/perso/:postId/messages` handles all initialization automatically

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight React Router alternative)
- **TanStack Query (React Query)** for server state management and data fetching

**UI Component System**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **Class Variance Authority (CVA)** for component variant management
- Design follows a minimalist "Threads-style" approach with clean interfaces and minimal borders

**Key Design Decisions**
- Components use a "New York" style variant from shadcn/ui
- Custom color system supporting light/dark modes with HSL values
- Korean language optimized with Pretendard Variable font for Korean text and Inter Variable for English/numbers
- Mobile-first responsive design with dedicated bottom navigation for mobile devices
- Hover and active state elevations using CSS custom properties for consistent interactions

### Backend Architecture

**Server Framework**
- **Express.js** as the HTTP server
- **Socket.IO** for WebSocket real-time communication
- **TypeScript** with ES modules throughout the codebase
- Development uses `tsx` for running TypeScript directly
- Production build uses `esbuild` for bundling

**Architecture Pattern**
- Storage abstraction layer with `IStorage` interface for CRUD operations
- Currently implements in-memory storage (`MemStorage`) as the default
- Designed to easily swap storage implementations (e.g., database-backed storage)

**Session & State Management**
- Prepared for session management with `connect-pg-simple` (PostgreSQL session store)
- Cookie-based authentication infrastructure in place
- User authentication flow ready for implementation

**Real-time Communication**
- WebSocket server integrated with Express HTTP server
- JWT-based authentication for WebSocket connections
- Conversation-based room system for targeted broadcasting
- Support for streaming LLM responses via WebSocket

**Performance Strategy**
- Asynchronous message persistence (non-blocking DB writes)
- Optimistic UI updates combined with real-time sync
- First-token latency monitoring for LLM responses
- Target P95 end-to-end latency: <200ms

### Database & ORM

**Database Setup**
- **PostgreSQL** via Neon serverless database
- **Drizzle ORM** for type-safe database operations
- WebSocket-based connection pooling using `@neondatabase/serverless`
- Database schema defined in TypeScript using Drizzle's schema builder

**Schema Design**
- Users table with UUID primary keys (using PostgreSQL's `gen_random_uuid()`)
- Username/password authentication structure
- Validation schemas using Drizzle-Zod for runtime type safety

**Migration Strategy**
- Drizzle Kit for schema migrations
- Push-based deployment (`db:push` command) for development
- Migration files stored in `/migrations` directory

### Routing & API Design

**Client-Side Routing**
- Routes defined in `App.tsx` using Wouter's `<Switch>` and `<Route>` components
- Main routes: `/feed`, `/search`, `/activity`, `/profile`, `/login`, `/signup`
- Automatic redirect from root `/` to `/feed`

**Server-Side API**
- API routes registered in `server/routes.ts`
- All API endpoints prefixed with `/api`
- Express middleware for JSON parsing and URL encoding
- Request/response logging for API calls with timing information

**Development Flow**
- Vite dev server runs in middleware mode alongside Express
- Hot Module Replacement (HMR) enabled for rapid development
- Static file serving handled by Vite in development, Express in production

### Form Handling & Validation

**Form Management**
- **React Hook Form** for form state and validation
- **Zod** schemas for runtime type validation
- `@hookform/resolvers` for integrating Zod with React Hook Form
- Form validation happens on both client and server sides

### State Management Strategy

**Client State**
- React Query for server state caching and synchronization
- Custom query client with authentication-aware fetch functions
- Support for 401 (unauthorized) handling with configurable behavior
- Infinite stale time for cached data with manual invalidation

**UI State**
- React Context for theme management (light/dark mode)
- Local component state for UI interactions
- Toast notifications using Radix UI Toast primitives

## External Dependencies

### Real-time & Communication
- **Socket.IO** - WebSocket server and client for real-time bidirectional communication
- **OpenAI** - LLM API with streaming support for chat completions

### Third-Party UI Libraries
- **Radix UI** - Headless UI component primitives (accordion, dialog, dropdown, popover, etc.)
- **Lucide React** - Icon library for consistent iconography
- **Embla Carousel** - Touch-friendly carousel component
- **cmdk** - Command palette component for search interfaces

### Development Tools
- **Replit-specific plugins**:
  - `@replit/vite-plugin-runtime-error-modal` - Runtime error overlays
  - `@replit/vite-plugin-cartographer` - Development tooling
  - `@replit/vite-plugin-dev-banner` - Development banner

### Database & Backend Services
- **Neon Database** - Serverless PostgreSQL hosting
- **Drizzle ORM** - Type-safe SQL query builder
- **ws** - WebSocket library for Neon database connections

### Utilities
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation
- **clsx** & **tailwind-merge** - Conditional CSS class management

### Build & Development
- **Vite** - Frontend build tool and dev server
- **esbuild** - Production backend bundler
- **TypeScript** - Type system for entire codebase
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing with Autoprefixer

### Authentication & Sessions
- **connect-pg-simple** - PostgreSQL-based session store (configured but not yet active)
- Prepared for Express session middleware integration