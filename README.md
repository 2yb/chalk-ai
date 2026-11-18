# ChalkAI

**AI-powered visual lessons with an interactive whiteboard**

ChalkAI turns a topic into a concise, narrated lesson. A learner chooses a subject and difficulty, receives a structured six-segment lesson, watches timed SVG sketches appear on the whiteboard, and can ask the tutor follow-up questions.

> The app uses Groq for lesson and follow-up generation, Zod for server-side validation, and the browser Web Speech API for narration. No audio generation or text-to-speech API key is required.

---

## Highlights

- Generate structured lessons from a topic and difficulty level
- Narrate lessons with browser-native speech synthesis
- Reveal timed SVG diagrams and text cues on an interactive whiteboard
- Pause, resume, restart, and seek lesson playback
- Draw directly on the whiteboard
- Ask follow-up questions in the context of the current lesson
- Play preloaded water cycle, black hole, and flight demos without an API key
- Cache recent AI lessons in memory for faster repeat playback
- Switch between light and dark themes

---

## How It Works

```mermaid
flowchart LR
    User([Learner]) --> Studio["Tutor Studio<br/>Next.js / React"]

    Studio -->|Topic + difficulty| LessonAPI["POST /api/generate-lesson"]
    LessonAPI --> LessonService["Lesson Service"]

    LessonService --> Cache{"Process-local cache?<br/>10 minutes / 50 lessons"}
    Cache -->|Hit| Result["Validated Lesson"]
    Cache -->|Miss| Groq["Groq Chat Completions"]
    Groq -->|JSON| Validation["Zod Schema"]
    Validation -->|Valid| Visuals["Build SVG Actions"]
    Visuals --> Result

    Validation -->|Invalid or unavailable| Demo{"Topic-matched<br/>demo exists?"}
    Demo -->|Yes| Fallback["Labeled Demo Fallback"]
    Demo -->|No| Unavailable["503 Unavailable"]

    Result --> Studio
    Fallback --> Studio
    Studio --> Timeline["Pause-aware Timeline"]
    Timeline --> Speech["Web Speech API"]
    Timeline --> Board["Animated Whiteboard"]

    Studio -->|Lesson context + question| FollowUpAPI["POST /api/follow-up"]
    FollowUpAPI --> Groq
    Groq --> Answer["Tutor Answer"]
    Answer --> Studio
```

### Lesson Generation Flow

```mermaid
sequenceDiagram
    actor Learner
    participant UI as Tutor Studio
    participant API as Generate-Lesson API
    participant Service as Lesson Service
    participant Groq as Groq API
    participant Cache as In-Memory Cache
    participant Demo as Demo Lessons

    Learner->>UI: Enter topic and difficulty
    UI->>API: POST topic + difficulty
    API->>Service: Generate validated lesson
    Service->>Cache: Lookup normalized topic + level

    alt Cache hit
        Cache-->>Service: Cached lesson
        Service-->>API: source = cached
    else Cache miss
        Service->>Groq: Request JSON lesson
        Groq-->>Service: Six lesson segments
        Service->>Service: Parse and validate with Zod
        Service->>Service: Convert segment cues to SVG actions
        Service->>Cache: Store for 10 minutes
        Service-->>API: source = generated
    end

    opt AI response is invalid or unavailable
        Service->>Demo: Find topic-matched demo
        alt Demo found
            Demo-->>API: source = fallback
        else No demo found
            API-->>UI: 503 temporarily unavailable
        end
    end

    API-->>UI: Lesson and source
    UI-->>Learner: Render lesson and playback controls
```

### Playback and Follow-Up Flow

```mermaid
sequenceDiagram
    actor Learner
    participant UI as Tutor Studio
    participant Timeline as Lesson Timeline
    participant Speech as Browser Speech
    participant Board as Whiteboard
    participant API as Follow-Up API
    participant Groq as Groq API

    Learner->>UI: Start playback
    UI->>Timeline: Schedule actions by narration word count
    UI->>Speech: Speak lesson segments
    loop During playback
        Speech-->>UI: Boundaries and completion events
        UI->>Timeline: Advance or seek current time
        Timeline->>Board: Reveal actions due at current time
    end
    Learner->>UI: Pause or seek
    UI->>Speech: Pause, resume, or restart at position

    Learner->>UI: Ask a follow-up
    UI->>API: Topic, lesson context, and conversation
    API->>Groq: Generate contextual tutor answer
    Groq-->>API: Answer
    API-->>UI: Answer
    UI-->>Learner: Render answer in chat
```

---

## Architecture

| Area | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Hosts the client-side `TutorStudio` experience |
| `src/components/tutor-studio.tsx` | Topic generation, chat, playback, seeking, feedback, and theme state |
| `src/components/whiteboard.tsx` | SVG lesson rendering and freehand drawing tools |
| `src/app/api/generate-lesson/route.ts` | Validates lesson requests and maps service failures to API responses |
| `src/app/api/follow-up/route.ts` | Validates chat context and requests contextual tutor answers |
| `src/services/lesson.service.ts` | Cache, Groq generation/retries, validation, demos, and fallback selection |
| `src/lib/groq.ts` | Groq HTTP client, JSON mode, model selection, and API error handling |
| `src/lib/lesson-visuals.ts` | Converts generated visual cues into whiteboard actions |
| `src/lib/lesson-timeline.ts` | Proportionally schedules whiteboard actions across narration |
| `src/schemas/lesson.schema.ts` | Runtime Zod schemas and visual-coordinate validation |
| `src/data/demo-lessons.ts` | Preloaded lessons and topic-matched fallback content |

### Component Model

```mermaid
flowchart TB
    subgraph Client["Browser"]
        Page["App Page"]
        Studio["Tutor Studio"]
        Board["Whiteboard"]
        Speech["Web Speech API"]
        Theme["Local Theme Preference"]
    end

    subgraph Server["Next.js Server"]
        Generate["Generate-Lesson Route"]
        FollowUp["Follow-Up Route"]
        Service["Lesson Service"]
        GroqClient["Groq Client"]
        Cache["Lesson Cache"]
        Schemas["Zod Schemas"]
        VisualBuilder["Visual Action Builder"]
    end

    External(["Groq API"])

    Page --> Studio
    Studio --> Board
    Studio --> Speech
    Studio --> Theme
    Studio --> Generate
    Studio --> FollowUp
    Generate --> Service
    FollowUp --> GroqClient
    Service --> Cache
    Service --> GroqClient
    Service --> Schemas
    Service --> VisualBuilder
    GroqClient --> External
```

---

## Tech Stack

- **Next.js 16 App Router**
- **React 19**
- **TypeScript**
- **Groq Chat Completions API**
- **Zod**
- **Web Speech API**
- **SVG and CSS**
- **Vitest**
- **ESLint**

---

## Run Locally

### Requirements

- Node.js 20 or later
- npm
- A Groq API key for live lesson and follow-up generation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

Set the Groq credentials:

```env
GROQ_API_KEY=your_groq_api_key
# Optional; defaults to openai/gpt-oss-20b
GROQ_MODEL=openai/gpt-oss-20b
```

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | For AI features | Server-side Groq API key. Never expose it through `NEXT_PUBLIC_*`. |
| `GROQ_MODEL` | No | Groq model ID. Defaults to `openai/gpt-oss-20b`. |

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Preloaded demos work without `GROQ_API_KEY`. Live lesson generation and follow-up answers require it.

---

## Quality Checks

```bash
npm test
npm run lint
npm run build
```

The automated tests cover lesson schemas, timeline scheduling, and fallback behavior. Because browser speech timing and available voices differ by device, also validate playback in the target desktop and mobile browsers.

---

## Caching and Fallback Behavior

Successful AI lessons are cached in server memory for 10 minutes:

- The key combines normalized topic text and difficulty
- The cache retains at most 50 entries
- Expired entries are removed on lookup or insertion
- Cache hits are identified in the lesson source label
- The cache is process-local and resets on server restart

The cache is intentionally simple and is not shared across serverless instances. Use Redis or another shared cache for cross-instance persistence in production.

If Groq or JSON validation fails, ChalkAI serves a topic-matched preloaded demo when one exists. This is labeled as an offline fallback. If no matching demo exists, the API returns a temporary-unavailable response instead of presenting unrelated material.

---

## Deployment

### Vercel

Import the repository and add `GROQ_API_KEY` and optional `GROQ_MODEL` environment variables in the Vercel project settings.

### Render or Railway

Create a Node.js web service:

```bash
npm ci
npm run build
npm run start
```

Use Node.js 20 or later and configure the same environment variables. Keep the Groq key server-side and note that the in-memory cache will not be shared across instances.

Browser narration uses the voices installed or available in the learner's browser and operating system.

---

## Current Scope

- Lesson feedback is stored only in the current browser session and is not sent to a backend
- Theme preference is persisted in `localStorage`
- The lesson cache is in-memory and process-local
- Speech synthesis timing varies between browsers
- Groq free-plan limits and account model access apply
