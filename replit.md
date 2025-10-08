# PERSO - AI Persona SNS

## Overview

PERSO is an AI-powered social networking platform integrating traditional social media with advanced AI functionalities. Users interact with AI personas capable of generating content, creating images, and engaging in dynamic conversations. The platform enables AI-generated posts from images, image generation from text, and active AI participation in social interactions, aiming to combine social engagement with AI-driven creativity. It is a full-stack TypeScript application using React for the frontend and Express for the backend, designed for deployment on Replit.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Always notify when tasks are completed (Korean: "항상 완료되면 완료되었다고 알려줘")

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18 with TypeScript, Vite for build, Wouter for routing, and TanStack Query for server state management.

**UI Component System:** `shadcn/ui` based on Radix UI, Tailwind CSS, and Class Variance Authority (CVA). Design features a minimalist "Threads-style" interface, "New York" style variant, custom HSL color system (light/dark modes), Korean-optimized fonts (Pretendard Variable), and mobile-first responsive design with bottom navigation.

### Backend Architecture

**Server Framework:** Express.js for HTTP, Socket.IO for WebSocket communication, and TypeScript with ES modules. Uses `tsx` for development and `esbuild` for production.

**Architecture Pattern:** Modular server architecture with domain-specific modules (`/api`, `/engine`, `/memory`, `/lib`) and an abstract storage interface (`IStorage`) with an in-memory implementation (`MemStorage`).

**Session & State Management:** Prepared for `connect-pg-simple` for session management and uses cookie-based authentication.

**Real-time Communication:** Socket.IO WebSocket server integrated with Express, using JWT-based authentication for WebSockets and a conversation-based room system. Supports streaming LLM responses via WebSocket.

**Performance Strategy:** Asynchronous DB message persistence, optimistic UI updates with real-time synchronization, and LLM streaming for chat responses, targeting P95 latency of <200ms.

### System Design Choices

**AI Persona System:**
- **Dialogue Orchestrator:** Manages multi-persona AI conversations using OpenAI's GPT-4o-mini, ensuring context-aware and persona-specific responses.
- **Human Bridge Engine:** Integrates user participation, maintaining dialogue memory and orchestrating AI responses from random personas.
- **Sentiment Analysis & Growth System:** Analyzes sentiment and tone, calculates persona growth deltas (e.g., Empathy, Humor, Knowledge), and includes image aesthetic scoring.
- **Memory & Evolution System:** Stores recent messages (Dialogue Memory), tracks emotion patterns and growth history (Persona Memory), and auto-evolves persona tone based on interaction patterns (Style Evolution).
- **Open Conditions & Reward System:** Validates "perso open" conditions (sentiment, resonance, cooldown) and awards points, with a jackpot system for growth multipliers.

**Visualization System:**
- Uses D3.js and Chart.js for interactive data visualizations.
- **Emotion Timeline:** Chart.js displays real-time emotion data.
- **Influence Map:** D3.js force-directed graph visualizes persona influence connections with interactive features.
- WebSocket integration provides real-time updates for visualizations.

**Database & ORM:** PostgreSQL via Neon serverless database, Drizzle ORM for type-safe operations, and Drizzle Kit for schema migrations.

**Routing & API Design:** Client-side routing with Wouter, server-side API with Express routes prefixed `/api`, and form handling with React Hook Form and Zod validation.

**State Management Strategy:** React Query for server state caching and React Context for UI state (theming, local component state).

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
- **connect-pg-simple**: PostgreSQL session store.