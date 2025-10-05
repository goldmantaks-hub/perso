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