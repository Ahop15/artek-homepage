# Artek AI Worker

**ARTEK AI Worker** is an AI chatbot service developed for our corporate website, running on the *Cloudflare Workers* platform.

Powered by the *Claude Sonnet 4* language model, the system accesses a knowledge base generated from website content by the *Render4AI* tool through *Cloudflare AI Search* integration, producing accurate and source-backed answers to user queries. These responses and conversation history are stored in the *Cloudflare D1* database.

> 🔧 **Knowledge Base:** Use the `scripts/utils/render4ai` tool to create or update the RAG knowledge base from website content. HTML content is converted to AI-optimized markdown format and uploaded to AI Search.

> 💡 **Analysis:** Use the Streamlit dashboard in the `scripts/dashboard/ai-worker` directory to analyze conversation data. Features include session viewing, chain validation, and export capabilities.

> 🧪 **Stress Test:** Use the `scripts/utils/dynamic-conversation-builder` tool to automatically test the AI Worker. This tool, available only in `development` environment, creates automated dialogues and tests knowledge base quality. AI vs AI ⚔️

**ARTEK AI Worker** is part of the `ARTEK Homepage` project.



## Architecture

### Overview (High-Level)

```mermaid
graph TB
    %% Left branch: User flow
    User[User] --> Homepage[ARTEK Homepage]

    Homepage -->|chat interaction| Chat[AI Chat UI<br/>Carbon Design]
    Homepage -->|contains| AISchema[AI Schema<br/>JSON-LD]

    Chat -->|POST /api/v1/chat| Worker[AI Worker<br/>Claude Sonnet 4]

    %% Right branch: Admin/Developer flow
    Admin[Admin/Developer] --> ConvBuilder[Conversation Builder<br/>Stress Testing]
    Admin --> Dashboard[Dashboard<br/>Streamlit]

    %% Content pipeline (center)
    AISchema -->|build-time| Pipeline[Content Pipeline<br/>Render4AI]
    Pipeline -->|generates| KB[(Knowledge Base<br/>AI Search / AutoRAG)]

    %% Worker interactions
    Worker -->|knowledge_search| KB
    Worker -->|rate limiting| KVStorage[(Storage<br/>KV)]
    Worker -->|blockchain tracking| D1Storage[(Storage<br/>D1)]


    %% Admin tools interactions
    ConvBuilder -.->|tests| Worker
    Dashboard -.->|monitors| D1Storage
```

### Layered System Architecture

```mermaid
flowchart TB
    Client[Client<br/>Web/App] -- HTTP POST --> Worker[AI Worker<br/>Cloudflare Workers]

    subgraph "Security Layer"
    Turnstile[Turnstile<br/>Bot Protection]
    RateLimit[Rate Limiting<br/>KV-based]
    Validation[Request<br/>Validation]
    end

    Worker --> Turnstile
    Worker --> RateLimit
    Worker --> Validation

    subgraph "Data Layer"
    D1[(D1 Database<br/>Conversation Logs)]
    KV[(KV Store<br/>Rate Limits)]
    end

    subgraph "AI Layer"
    Claude[Claude Sonnet 4<br/>Anthropic API]
    AISearch[AI Search<br/>AutoRAG]
    KB[(Knowledge Base<br/>ARTEK Data)]
    end

    Worker --> D1
    Worker --> KV
    Worker --> Claude
    Claude -- knowledge_search --> AISearch
    AISearch --> KB

    Worker --> Response[JSON Response]
    Response --> Client

    style Worker fill:#F38020,stroke:#333,stroke-width:2px,color:#000000
    style Claude fill:#8B5CF6,stroke:#333,stroke-width:2px,color:#000000
    style D1 fill:#BBDEFB,stroke:#333,stroke-width:2px,color:#000000
    style AISearch fill:#C8E6C9,stroke:#333,stroke-width:2px,color:#000000
```



### Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Worker
    participant Security as Security Layer
    participant Claude as Claude API
    participant AISearch as AI Search
    participant D1 as D1 Database

    Client->>Worker: POST /api/v1/chat/completions
    Worker->>Security: Verify Turnstile
    Security-->>Worker: ✓ Valid

    Worker->>Security: Check Rate Limits
    Security-->>Worker: ✓ Within Limits

    Worker->>Security: Validate Request
    Security-->>Worker: ✓ Valid Schema

    Worker->>Claude: Create Message (with tools)

    opt Tool Usage
        Claude->>Worker: tool_use: knowledge_search
        Worker->>AISearch: Execute Search
        AISearch-->>Worker: Search Results
        Worker->>Claude: Return Tool Results
    end

    Claude-->>Worker: Final Response
    Worker->>D1: Log Conversation (async)
    Worker-->>Client: JSON Response

```

---

## API

### Endpoint

```
POST /api/v1/chat/completions
```

### Request Body

```json
{
  "messages": [
    {"role": "user", "content": "..."}
  ],
  "locale": "tr",
  "turnstileToken": "...",
  "max_tokens": 16384,
  "temperature": 0.7
}
```

### Response

```json
{
  "id": "msg_...",
  "content": "...",
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "total_tokens": 1801
  }
}
```

### Error Codes

- **400** - Invalid request / Security verification failed
- **404** - Endpoint not found
- **409** - Conversation history validation error
- **429** - Request limit exceeded
- **502** - Claude API error
- **503** - Daily token quota exceeded

---

## Testing

```bash
npm test                # All tests
npm run test:coverage   # Coverage report
npm run test:ui         # Interactive test UI
```

---

## Project Structure

```
workers/ai-worker/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── integrity/
│   ├── claude/
│   ├── middleware/
│   ├── validation/
│   └── tests/
├── migrations/
│   └── 0001_create_conversation_logs.sql
└── wrangler.jsonc
```

---

## Contact

**ARTEK İnovasyon Ar-Ge Sanayi ve Tic. Ltd. Şti.**

- 🌐 [www.artek.tc](https://www.artek.tc)
- 📧 info@artek.tc

**Developer:** Rıza Emre ARAS - r.emrearas@proton.me