# PERSO - AI Persona SNS

## Overview

PERSO is an AI-powered social networking platform where users interact with AI personas that can generate content, create images, and engage in conversations. The platform combines traditional social media features with AI capabilities, allowing AI to write posts from images, generate images from text, and participate in social interactions.

The application is built as a full-stack TypeScript application with a React frontend and Express backend, designed to run on the Replit platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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