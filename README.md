# 📄 PDF RAG AI Chat App — Full Stack Documentation

> A production-grade, full-stack Retrieval-Augmented Generation (RAG) application that lets users upload PDFs, and then chat with their content using Google Gemini 2.5 Flash as the LLM, Qdrant as the vector database, and Ollama for local embeddings. The frontend is a glassmorphism-styled AI chat interface built with React 19, Vite, and Tailwind CSS 4.

---

## 📚 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Backend — PDF Ingestion Pipeline](#4-backend--pdf-ingestion-pipeline)
5. [Backend — Query & RAG Flow](#5-backend--query--rag-flow)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Folder Structure (Backend + Frontend)](#7-folder-structure-backend--frontend)
8. [State Management](#8-state-management)
9. [Design System & Aesthetics](#9-design-system--aesthetics)
10. [Authentication Flow](#10-authentication-flow)
11. [Chat Interface](#11-chat-interface)
12. [Dashboard Features](#12-dashboard-features)
13. [Routing Structure](#13-routing-structure)
14. [API Integration & Network Layer](#14-api-integration--network-layer)
15. [Loading, Error States & UX Feedback](#15-loading-error-states--ux-feedback)
16. [Responsive Design Strategy](#16-responsive-design-strategy)
17. [Component & Animation Specifications](#17-component--animation-specifications)
18. [UX Principles & Unique Features](#18-ux-principles--unique-features)
19. [Implementation Roadmap (Day-by-Day)](#19-implementation-roadmap-day-by-day)

---

## 1. Project Overview

This application solves a real-world problem: **reading and understanding large PDF documents is time-consuming**. Instead of scrolling through pages, users upload their PDFs and simply chat with the content — asking questions, requesting summaries, and getting context-aware answers — powered by an LLM.

### What happens under the hood?

1. A user uploads a PDF.
2. The backend stores it, parses it, breaks it into chunks, and converts those chunks into numerical vectors (embeddings) stored in a vector database.
3. When the user asks a question, the question is also turned into a vector and compared against stored vectors to find the most relevant document sections.
4. Those relevant sections + the conversation history are assembled into a prompt and sent to Google Gemini, which generates a smart, context-aware answer.

This process is called **RAG — Retrieval-Augmented Generation**, and it prevents the LLM from hallucinating by grounding it in real document content.

---

## 2. Complete Technology Stack

### Backend

| Category | Technology | Purpose |
|---|---|---|
| Runtime | Node.js | JavaScript runtime for the server |
| Framework | Express 5 | Web server and API routing |
| Language | TypeScript 5.9 | Type-safe backend development |
| Authentication | @authIVexpress (OAuth 2.0) | Secure user authentication |
| Database | PostgreSQL | Primary relational database |
| ORM | Prisma ORM | Type-safe database client & schema management |
| Vector Database | Qdrant | Stores and searches vector embeddings |
| LLM | Google Gemini 2.5 Flash API | LLM for answer generation |
| Embeddings | Ollama (nomic-embed-text) | Local embedding model for text vectorization |
| PDF Parsing | pdf-parse | Extracts raw text from uploaded PDFs |
| Text Chunking | LangChain RecursiveCharacterTextSplitter | Splits text into 1000-character overlapping chunks |
| File Upload | Multer | Handles multipart/form-data for PDF uploads |
| Validation | Zod | Runtime schema validation for requests |
| File Storage | ImageKit CDN | Stores and serves uploaded PDF files via CDN |
| Background Jobs | Async Job / Background Service | Handles heavy ingestion tasks off the main thread |

### Frontend

| Category | Technology | Purpose |
|---|---|---|
| Framework | React 19 | Core UI library |
| Build Tool | Vite | Fast development server and bundler |
| Language | TypeScript | Type-safe frontend development |
| Styling | Tailwind CSS 4 | Utility-first CSS framework |
| State (Global) | Zustand | Lightweight global state (auth, sidebar, theme) |
| State (Server) | React Query (TanStack Query) | Async data fetching, caching, and background sync |
| Routing | React Router | Client-side page navigation |
| HTTP Client | Axios | API calls with request/response interceptors |
| Animations | Framer Motion | Page transitions, skeleton loaders, chat animations |
| UI Components | shadcn/ui + custom | Pre-built accessible components with custom overrides |
| Icons | Lucide React | Modern, consistent icon set |
| Date/Time | date-fns | Lightweight date formatting and manipulation |
| Notifications | Sonner / Toast | Non-intrusive toast notifications |
| Class Management | clsx / class-variance-authority (cva) | Conditional Tailwind class handling |

---

## 3. System Architecture Overview

The application has two distinct pipelines that run separately:

```
┌──────────────────────────────────────────────────────────────────────┐
│  PIPELINE 1: PDF INGESTION (happens when user uploads a document)    │
│  Client → Upload → Validate → Store in DB → CDN Upload →            │
│  Background Job → Parse PDF → Chunk → Embed → Store in Qdrant        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  PIPELINE 2: QUERY / CHAT (happens when user asks a question)        │
│  Client → Auth Check → Store Query → Embed Question →               │
│  Search Qdrant → Fetch Chat History → Build Prompt →                │
│  Call Gemini API → Store Response → Return to Client                 │
└──────────────────────────────────────────────────────────────────────┘
```

Both pipelines share the same Express 5 + TypeScript 5.9 backend, but the ingestion pipeline offloads heavy work (parsing, embedding) to a background/async service so the HTTP response is not blocked.

---

## 4. Backend — PDF Ingestion Pipeline

This is the step-by-step journey of a PDF from the moment a user uploads it to when it's ready for intelligent search.

### Step 1 — File Upload via Multer

- The client sends the PDF as a **multipart/form-data** request.
- **Multer** receives the file and stores it in **temporary storage** on the server.
- Multer does not permanently store the file — it's a staging area only.

> **Why temporary storage?** Multer holds the file in memory/temp disk just long enough for it to be validated and then forwarded. This avoids wasting server disk space.

### Step 2 — Schema Validation via Zod

- Before anything else happens, the incoming request (file metadata, user info, any form fields) is validated using a **Zod schema**.
- If the file type is wrong, size exceeds limits, or required fields are missing, the request is rejected immediately with a clear error response.

> **Why Zod?** Zod is a TypeScript-first schema validator. It ensures the data is exactly what your code expects — no surprises at runtime.

### Step 3 — Parallel Operations (after validation passes)

After validation, two things happen **simultaneously**:

**3a. Create a Database Entry (PostgreSQL + Prisma)**
- A record is created in PostgreSQL (via Prisma ORM) to represent this document.
- The record stores metadata: filename, user ID, upload timestamp, processing status, etc.
- Status is initially set to something like `"processing"` and updated when ingestion is complete.

**3b. Upload to ImageKit CDN**
- The validated PDF file is uploaded to **ImageKit**, a cloud-based CDN (Content Delivery Network).
- ImageKit returns a **CDN URL** — a permanent, publicly accessible link to the stored file.
- This URL is saved in the database record from step 3a.

> **Why ImageKit?** Storing files directly in your server is not scalable. A CDN distributes the file globally, making downloads faster no matter where the user is located.

### Step 4 — Trigger Background Service (Async Job)

- After the CDN upload, an **async background job** is triggered.
- This job runs separately from the main HTTP request — the server can immediately respond to the client saying "upload successful, processing in background."
- This prevents the HTTP request from timing out during the slow work of parsing and embedding.

### Step 5 — Download from CDN

- The background service downloads the PDF back from the **ImageKit CDN URL**.
- This ensures the background service always works from the authoritative, stored version of the file.

### Step 6 — PDF Parsing via pdf-parse

- The downloaded PDF is passed to **pdf-parse**, a Node.js library that extracts raw text from the PDF file.
- The result is a plain string of all the text content in the document.

> **What pdf-parse does:** It reads the binary PDF format and outputs the human-readable text, stripping away formatting, fonts, and layout metadata.

### Step 7 — Normalize

- The extracted raw text is normalized — cleaned up to remove excessive whitespace, special characters, or encoding artifacts.
- This ensures the text fed into the chunker is clean and consistent.

### Step 8 — Chunk the Text via LangChain RecursiveCharacterTextSplitter

- The normalized text is split into **chunks of 1000 characters** using LangChain's `RecursiveCharacterTextSplitter`.
- "Recursive" means it tries to split on natural boundaries first — paragraphs → sentences → words — before resorting to character-level splits.
- Chunks **overlap slightly** to preserve context across boundaries (so no sentence is cut off mid-thought between chunks).

> **Why chunking?** LLMs and embedding models have token limits. You cannot embed an entire 100-page PDF as one unit. Breaking it into 1000-character chunks makes each piece small enough to embed and retrieve meaningfully.

### Step 9 — Generate Embeddings via Ollama (nomic-embed-text)

- Each chunk is passed to **Ollama running the `nomic-embed-text` model** locally.
- The embedding model converts each text chunk into a **high-dimensional vector** (a list of floating-point numbers).
- These vectors mathematically represent the "meaning" of the text — semantically similar chunks have vectors that are close to each other in vector space.

> **Why Ollama?** Ollama lets you run open-source embedding models locally — no API cost, no data leaving your server, and fast inference.

> **Why nomic-embed-text?** It's a high-quality, open-source embedding model well-suited for document retrieval tasks.

### Step 10 — Upsert into Qdrant (Vector Store)

- Each chunk's vector (embedding) along with its original text content and metadata (document ID, chunk index, etc.) is **upserted (inserted or updated)** into **Qdrant**.
- Qdrant is a vector database purpose-built for fast similarity searches.

> **What is a vector database?** Unlike a regular database that searches by exact match (e.g., WHERE name = 'John'), a vector database finds records whose vectors are *mathematically closest* to a query vector. This enables semantic search — "find chunks about financial risks" — without any keyword matching.

After step 10, the PDF is fully ingested and ready to be queried.

---

## 5. Backend — Query & RAG Flow

This is what happens every time a user sends a chat message.

### Step 1 — Receive Client Query

- The user types a question in the chat interface and sends it to the backend via an API call.

### Step 2 — Authentication Check (@authIVexpress OAuth 2.0)

- Every query goes through an **OAuth 2.0 middleware** check.
- The middleware validates the user's access token and attaches user identity to the request.
- Unauthenticated requests are rejected with a `401 Unauthorized` response.

> **Why OAuth 2.0?** It's an industry-standard authorization protocol that allows secure, token-based authentication without storing passwords on your backend.

### Step 3 — Store the Query (PostgreSQL + Logs)

- The user's question is stored in PostgreSQL as a **log/chat history entry**.
- This preserves conversation history for multi-turn dialogue and audit purposes.

### Step 4 — Embed the Query via Ollama (nomic-embed-text)

- The same embedding model used during ingestion (`nomic-embed-text` via Ollama) is used to convert the user's question into a vector.
- **Critical:** Using the same model for both indexing and querying ensures the vectors are in the same mathematical space, making similarity search meaningful.

### Step 5 — Retrieve Context from Qdrant (Cosine Similarity + Filters)

- The query vector is sent to **Qdrant**, which performs a **cosine similarity search** against all stored chunk vectors.
- **Cosine similarity** measures the angle between two vectors — the smaller the angle, the more similar the meaning.
- **Filters** can be applied to narrow results to a specific document (so queries only search within the user's uploaded files, not everyone's documents).
- The top-N most relevant chunks are returned as "context."

> **What is cosine similarity?** Imagine two arrows pointing from the origin. If they point in almost the same direction, their angle is small and cosine similarity is high (~1.0). If they're perpendicular, similarity is 0. This tells us how semantically similar two pieces of text are.

### Step 6 — Fetch Conversation History (PostgreSQL)

- The backend fetches previous messages in this chat session from PostgreSQL.
- This gives the LLM awareness of what was said before, enabling coherent multi-turn conversations.

### Step 7 — Build the Prompt (Context + History)

- A structured prompt is assembled combining:
  - **System instructions** (how the LLM should behave — stay factual, use only provided context, etc.)
  - **Retrieved document context** (the relevant chunks from Qdrant)
  - **Conversation history** (prior messages in this session)
  - **User's current question**

> **Why structure the prompt this way?** RAG grounding means the LLM is explicitly told: "Here is the relevant document text. Answer based on this, not your training data." This drastically reduces hallucination.

### Step 8 — Call Google Gemini 2.5 Flash API

- The assembled prompt is sent to **Google Gemini 2.5 Flash** via its API.
- Gemini processes the full context and generates a relevant, grounded response.
- Gemini 2.5 Flash is chosen for its balance of speed, cost efficiency, and high output quality.

### Step 9 — Store the Response (PostgreSQL + Prisma)

- The LLM's response is stored in PostgreSQL as part of the conversation history.
- This completes the message pair (user query + assistant response) for future context retrieval.

### Step 10 — Return Response to Client

- The response is sent back to the client and displayed in the chat interface in real-time.

---

## 6. Frontend Architecture

The frontend is a **Glassmorphism-styled AI chat application** — modern, minimalist, and professional, with smooth animations and a highly interactive UX.

### Core Architecture Decisions

**Zustand** handles all client-side global state (who is logged in, sidebar open/closed, dark mode toggle). It's chosen for its simplicity — no reducers, no boilerplate.

**React Query (TanStack Query)** handles all server state — fetching chats, documents, user data. It provides automatic caching, background refetching, and optimistic updates out of the box.

**Axios** is the HTTP client, configured with interceptors that automatically attach auth tokens to every request and globally handle 401 errors by redirecting to login.

**React Router** manages all client-side navigation with protected routes that prevent unauthenticated access.

**Framer Motion** drives all animations — page transitions, skeleton loading states, chat message animations, and micro-interactions.

---

## 7. Folder Structure (Backend + Frontend)

### Frontend Folder Structure

```
client/
└── src/
    ├── components/
    │   ├── ui/                  # Reusable base UI components (buttons, inputs, cards)
    │   ├── layout/              # Layout wrappers (MainLayout, Sidebar, headers)
    │   ├── chat/
    │   │   └── MessageBubble    # Individual chat message component
    │   ├── document/            # Document upload, preview, list components
    │   ├── LoadingSpinner        # Global loading indicator
    │   └── shared/              # Shared helpers (ProtectedRoute, EmptyState, etc.)
    │
    ├── pages/
    │   ├── Auth/
    │   │   └── SignIn           # Authentication / login page
    │   ├── Dashboard/           # Home dashboard with recent chats & doc library
    │   ├── Chat/
    │   │   └── ChatPage         # Main chat interface page
    │   ├── Document/
    │   │   ├── DocumentView     # View individual document details
    │   │   └── index.ts
    │   └── index.ts
    │
    ├── hooks/                   # Custom React hooks
    │   ├── useAuth.ts           # Authentication state and actions
    │   ├── useDocuments.ts      # Document CRUD operations via React Query
    │   └── useUpload.ts         # File upload logic with progress tracking
    │
    ├── lib/
    │   ├── api/
    │   │   ├── apl.ts           # Axios instance configuration
    │   │   ├── olls.ts          # API call definitions (auth, chat, docs)
    │   │   └── constants.ts     # API base URLs, endpoint paths
    │   └── store.ts             # Zustand store definition
    │
    ├── types/                   # TypeScript type definitions and interfaces
    ├── styles/                  # Global CSS and Tailwind base config
    ├── App.tsx                  # Root component with router setup
    └── main.tsx                 # React DOM entry point, Vite entry
```

### Backend Folder Structure (Inferred from architecture)

```
server/
├── src/
│   ├── routes/
│   │   ├── auth.ts              # OAuth routes (/auth/login, /auth/callback)
│   │   ├── documents.ts         # PDF upload & management routes
│   │   └── chat.ts              # Query/chat routes
│   │
│   ├── middleware/
│   │   ├── authMiddleware.ts    # OAuth 2.0 token validation via @authIVexpress
│   │   └── uploadMiddleware.ts  # Multer configuration for PDF uploads
│   │
│   ├── services/
│   │   ├── ingestionService.ts  # Orchestrates PDF parsing, chunking, embedding
│   │   ├── embeddingService.ts  # Ollama nomic-embed-text wrapper
│   │   ├── qdrantService.ts     # Qdrant upsert and similarity search
│   │   ├── storageService.ts    # ImageKit CDN upload/download
│   │   └── geminiService.ts     # Google Gemini 2.5 Flash API calls
│   │
│   ├── background/
│   │   └── ingestionJob.ts      # Async background job: parse → chunk → embed → upsert
│   │
│   ├── validation/
│   │   └── schemas.ts           # Zod schemas for all API inputs
│   │
│   ├── db/
│   │   └── prisma.ts            # Prisma client singleton
│   │
│   └── index.ts                 # Express app entry point
│
├── prisma/
│   └── schema.prisma            # Database schema (Users, Documents, Chats, Messages)
│
└── tsconfig.json
```

---

## 8. State Management

### Zustand — Client/UI State

Zustand manages UI-level global state that doesn't need to be fetched from the server.

```
Zustand Store
├── user                  ← Logged-in user object (id, name, email, avatar)
├── auth                  ← Auth status (isAuthenticated, isLoading)
├── sidebar               ← Sidebar open/collapsed boolean
└── theme                 ← Dark mode toggle (dark | light)

Actions available:
├── setUser(user)         ← Set user after login
├── logout()              ← Clear user, redirect to login
├── checkSession()        ← Verify stored token on app load
└── toggle()              ← Toggle sidebar or theme
```

### React Query — Server/Async State

React Query manages everything that comes from the API — it handles caching, refetching, and synchronization automatically.

```
React Query Server State
├── Chats                 ← List of user's chat sessions
├── Messages              ← Messages in current chat (with optimistic updates)
├── Documents             ← Uploaded PDFs list (with pagination)
├── User Benefits         ← Usage stats, plan info
└── Background Sync       ← Auto-refetch when window regains focus, on interval
```

**Why both?** Zustand is perfect for instant UI state (open/close a modal, dark mode). React Query is perfect for anything requiring a server round-trip — it prevents double-fetching, shows stale data while refreshing, and handles loading/error states automatically.

---

## 9. Design System & Aesthetics

### Visual Theme

| Property | Value |
|---|---|
| Theme Style | Modern, Minimalist, Professional |
| Design Pattern | Glassmorphism — translucent frosted-glass cards with backdrop blur |
| Primary Colors | Slate / Zinc scale (neutral base) |
| Accent Colors | Indigo / Blue gradient |
| Background | Subtle gradient with Noise Texture overlay |
| Animations | Smooth and purposeful — no animation for the sake of animation |

### CSS Custom Properties (Color Tokens)

```css
/* Background */
--bg-primary:    #0F1117  /* Deep dark base */
--bg-secondary:  #7E8EB7  /* Muted blue-grey secondary */
--bg-tertiary:   #052932  /* Deep teal for depth layers */

/* Text */
--text-primary:  (near white)
--text-secondary: (muted grey)
--text-tertiary:  #3a0be5  /* Purple accent for links/highlights */
--text-gauze:     #n80e6   /* Soft overlay text */

/* Accents */
--accent-primary: #4221c1  /* Deep indigo primary action */
--accent-secondary: #EE0161T /* Vivid contrast accent */

/* Glassmorphism Effects */
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Typography

- **Display / Headings:** Distinctive display font (non-generic)
- **Body / UI:** Refined readable font
- **Code blocks:** Monospace

---

## 10. Authentication Flow

### Flow Diagram

```
Public Landing Page
        ↓
  [ Sign In Button ]
        ↓
  Sign In Screen
  ├── Animated skeleton loading
  ├── OAuth 2.0 redirect to provider
  └── Error retry on failure
        ↓
  Onboarding Screen (first-time users)
  ├── Username setup
  └── Profile initialization
        ↓
  Redirect Handling
  ├── Returns to originally requested page, OR
  └── Defaults to Dashboard
        ↓
  Session & User Access
  ├── Token stored (memory/secure cookie)
  └── Auth interceptor attaches token to all API calls
```

### Protected Routes

All pages except the public landing and Sign In are **Protected Routes**. If a user visits any protected URL without a valid session, they are immediately redirected to the Sign In page, and the original URL is stored so they return there after login.

---

## 11. Chat Interface

The chat interface is designed to feel like a hybrid between **ChatGPT and Claude** — familiar but custom-built.

### Layout

```
┌─────────────┬────────────────────────────────────────┐
│  Sidebar    │          Main Chat Area                  │
│             │                                          │
│  History    │  [ Message Bubble — AI response ]        │
│  - Chat 1   │  [ Message Bubble — User message ]       │
│  - Chat 2   │  [ Typing indicator (pulsing dots) ]     │
│  - Chat 3   │                                          │
│             │  ┌──────────────────────────────────┐   │
│             │  │ Input Area                        │   │
│             │  │ 📎 File attachment  [ Send →]     │   │
│             │  └──────────────────────────────────┘   │
└─────────────┴────────────────────────────────────────-┘
```

### Message Bubble Features

- Timestamps on each message
- **Copy** button to copy AI responses
- **Regenerate** button to get a new response
- Smooth scroll-to-bottom on new messages
- **Typing indicator** — animated pulsing dots while AI is generating

### Input Area

- Auto-resizing textarea (grows as you type)
- PDF file attachment (drag-and-drop supported)
- Send button with keyboard shortcut (Ctrl/Cmd + Enter)

### Animation Details (Framer Motion)

- Messages **fade in** with a slight upward slide
- **Stagger animation** — multiple messages appear one after another, not all at once
- Typing indicator uses smooth dot pulse animation
- Smooth scroll behavior on new message arrival
- Page-level slide transition when navigating to/from the chat page

---

## 12. Dashboard Features

The Dashboard is the home screen after login — an activity hub.

### Features

**Welcome Section**
- Live, time-aware greeting ("Good morning, [Name]", "Good evening, [Name]")
- Activity statistics (total chats, documents uploaded, recent usage)

**Recent Chats**
- Shows the user's most recent conversations with document context
- Click to resume any conversation

**Quick Actions Panel**
- New Chat button — starts a fresh conversation
- Upload Document button — opens the file upload flow

**Document Library Preview**
- Grid or list of uploaded PDFs
- Status indicators (Processing / Ready / Failed)
- Search bar with **debouncing** — search triggers only after user stops typing for ~300ms (prevents a request on every keystroke)

**Empty States**
- Custom illustrated empty states when no chats or documents exist
- Friendly prompts guiding the user to take their first action

---

## 13. Routing Structure

```
Routes
└── Protected Route (wraps all authenticated pages)
    └── MainLayout (persistent sidebar + header)
        ├── /dashboard          → Dashboard (home)
        ├── /chat               → Chat list
        │   └── /chat/:id       → ChatPage (specific conversation)
        ├── /documents          → Document library (chatDocuments)
        │   └── /documents/:id  → DocumentView
        └── /onboarding         → First-time user setup
```

**Public Routes** (outside Protected Route):
- `/` → Landing page
- `/signin` → Sign In

---

## 14. API Integration & Network Layer

### Axios Instance Configuration

```javascript
// Configured Axios instance (simplified)
const api = axios.create({
  baseURL: '/api',              // Base backend URL
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();               // Clear session
      redirect('/signin');    // Force re-login
    }
    return Promise.reject(error);
  }
);
```

### Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload PDF (multipart/form-data) |
| GET | `/api/documents` | List all user documents |
| GET | `/api/documents/:id` | Get document metadata |
| POST | `/api/chat` | Send a message / query |
| GET | `/api/chat` | Get all chat sessions |
| GET | `/api/chat/:id/messages` | Get messages in a chat session |
| GET | `/api/auth/login` | Initiate OAuth login |
| GET | `/api/auth/callback` | OAuth callback handler |
| POST | `/api/auth/logout` | Logout and invalidate session |

---

## 15. Loading, Error States & UX Feedback

### Skeleton Loading (Shimmer Effect)

Every data-loading state uses **shimmer skeleton screens** — placeholders that match the shape of the actual content, creating a smooth perceived experience.

- Chat list → skeleton chat items
- Document library → skeleton document cards
- Dashboard stats → skeleton number blocks
- Message area → skeleton bubbles

### Spinner & Progress States

- Spin buttons on async actions (upload, send)
- Progress bars during PDF upload (shows actual % progress via XMLHttpRequest events)
- Typing AI response indicator (pulsing dots, separate from skeletons)
- Page transition animations between routes

### Error Handling

| Error Type | Handling |
|---|---|
| Network error | Toast notification + retry button |
| 401 Unauthorized | Interceptor → redirect to login |
| Upload failure | Error banner on dropzone + retry |
| LLM API error | User-friendly error message in chat |
| Offline | Offline detection banner at top of screen |
| Rate limit | Rate limit countdown timer shown to user |
| Component crash | React Error Boundary → fallback UI |

All error messages use **Sonner** toast notifications — non-blocking, auto-dismissing, and positioned not to obscure content.

---

## 16. Responsive Design Strategy

| Breakpoint | Layout Behavior |
|---|---|
| Desktop (> 1024px) | Full sidebar visible + chat area side by side |
| Tablet (768px – 1024px) | Sidebar collapsible (hamburger toggle) |
| Mobile (< 768px) | Bottom navigation bar + full-screen chat |

**Mobile Considerations:**
- Input area stays pinned to the bottom (above keyboard)
- Messages area scrolls independently
- Sidebar replaces with a bottom navigation tab bar
- Touch-friendly tap targets (minimum 44×44px)
- No hover-only interactions — all interactions work with tap

---

## 17. Component & Animation Specifications

### Button Variants

| Variant | Usage |
|---|---|
| `primary` | Main actions (Send, Upload, New Chat) |
| `outlined` | Secondary actions (Cancel, Back) |
| `ghost` | Tertiary / icon-only actions |
| `elevated` | High-emphasis floating actions |
| `elevated-glass` | Glassmorphism elevated buttons on dark backgrounds |

### Framer Motion Animations

| Element | Animation Type |
|---|---|
| Page transition | Slide + fade (x: -20 → 0, opacity: 0 → 1) |
| Message bubble | Fade up (y: 10 → 0, opacity: 0 → 1) |
| Staggered messages | 0.05s delay between each bubble |
| Skeleton shimmer | CSS gradient sweep animation |
| Typing indicator | Three-dot bounce with stagger |
| Sidebar toggle | Slide in/out (x transform) |
| Modal/dialog | Scale + fade (scale: 0.95 → 1) |
| Upload dropzone hover | Scale up (scale: 1 → 1.02) |

---

## 18. UX Principles & Unique Features

### Core UX Principles

**Progressive Disclosure** — Don't show everything at once. Advanced options appear when relevant, not upfront.

**Consistent Immediate Feedback** — Every user action gets an immediate visual response. No silent button clicks.

**Performance-First Lazy Loading** — Components and routes load only when needed (React.lazy + Suspense).

**Virtualized Long Lists** — Chat histories and document lists with hundreds of items use virtual scrolling (only render what's on screen).

**Accessible, High-Contrast Design** — ARIA labels, keyboard navigation support, and sufficient color contrast for all interactive elements.

**Optimized Image Handling** — Documents previews and avatars use optimized formats from ImageKit CDN.

### Unique Features

| Feature | Description |
|---|---|
| Smart Empty States | Custom illustrations with context-aware messages and action CTAs |
| AI Typing Indicator | Pulsing dots animation while Gemini is generating a response |
| Auto-Save Drafts | Chat input is auto-saved locally so unsent messages aren't lost on navigation |
| Keyboard Shortcuts | Ctrl+K for search, Ctrl+Enter to send message, Escape to close modals |
| Context-Aware Greetings | Dashboard greeting changes based on time of day |
| Debounced Search | Document search doesn't fire on every keystroke — waits for user to pause |
| Offline Banner | Detects connection loss and shows a banner; retries pending requests on reconnection |
| Rate Limit Countdown | If the API rate limit is hit, shows a visible countdown timer before the next allowed request |

---

## 19. Implementation Roadmap (Day-by-Day)

| Day | Focus Area | Key Deliverables |
|---|---|---|
| **Day 1** | Foundation | Install all dependencies, set up folder structure, configure Vite, set up React Router, initialize Zustand store, set up React Query client |
| **Day 2** | Auth & Layout | Build MainLayout component, implement protected route, create Sign In page with OAuth flow, connect @authIVexpress |
| **Day 3** | Dashboard | Build Dashboard page with Recent Chats section, Document Library preview, empty states, implement debounced search |
| **Days 4–5** | Chat Interface | Build full Chat layout with sidebar, implement MessageBubble, auto-resize input, connect chat API via React Query, add Framer Motion message animations and typing indicator |
| **Day 6** | Document Upload | Build drag-and-drop upload dropzone, add progress tracking, implement document list with status indicators, connect upload API |
| **Day 7** | Polish & Performance | Handle all loading/error states, add skeleton screens, implement lazy loading, keyboard shortcuts, offline detection, run performance audit and optimize |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database running
- Qdrant instance running (Docker recommended: `docker run -p 6333:6333 qdrant/qdrant`)
- Ollama running locally with nomic-embed-text pulled (`ollama pull nomic-embed-text`)
- Google Gemini API key
- ImageKit account + credentials
- OAuth 2.0 provider configured

### Environment Variables (Backend)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ragdb
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
GEMINI_API_KEY=your_gemini_api_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
```

### Environment Variables (Frontend)

```env
VITE_API_BASE_URL=http://localhost:3000
```

### Installation & Running

```bash
# Clone the repository
git clone <repo-url>
cd project

# Backend setup
cd server
npm install
npx prisma migrate dev   # Run database migrations
npm run dev              # Start Express server (port 3000)

# Frontend setup
cd ../client
npm install
npm run dev              # Start Vite dev server (port 5173)
```

---

> **Note for beginners:** If any concept in this README is unfamiliar, start by understanding **RAG (Retrieval-Augmented Generation)** — it's the core pattern this entire project is built around. Then explore Prisma (to understand the database layer), React Query (to understand how data is fetched in the frontend), and Zustand (to understand global state). Everything else builds on top of those foundations.
