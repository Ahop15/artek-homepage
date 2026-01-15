# Artek AI Worker

**ARTEK AI Worker**, kurumsal web sitemiz için geliştirilmiş, *Cloudflare Workers* platformu üzerinde çalışan bir yapay zeka sohbet botu servisidir.

*Claude Sonnet 4* dil modeli ile desteklenen sistem, *Cloudflare AI Search* entegrasyonu sayesinde web sitesinin içeriklerinden oluşan ve *Render4AI* aracı ile üretilen bilgi bankasına erişerek kullanıcı sorularına doğru ve kaynak destekli yanıtlar üretir. Bu yanıtlar ve konuşma geçmişi *Cloudflare D1* veritabanına kaydedilir.

> 🔧 **Bilgi Bankası:** Web sitesi içeriklerinden RAG knowledge base oluşturmak için `scripts/utils/render4ai` aracını kullanın. HTML içerik AI tüketimine uygun markdown formatına dönüştürülür ve AI Search'e yüklenir.

> 💡 **Analiz:** Konuşma verilerini analiz etmek için `scripts/dashboard/ai-worker` dizinindeki Streamlit dashboard'unu kullanabilirsiniz. Session görüntüleme, chain validation ve export özellikleri sunar.

> 🧪 **Stres Testi:** AI Worker'ı otomatik test etmek için `scripts/utils/dynamic-conversation-builder` aracını kullanabilirsiniz. Sadece `development`ortamında kullanabileceğiniz bu araç ile otomatik diyaloglar oluşturabilir, bilgi bankasının kalitesini test edebilirsiniz. AI vs AI ⚔️

**ARTEK AI Worker**, `ARTEK Homepage` projesinin bir parçasıdır.



## Mimari

### Genel Bakış (High-Level)

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

### Katmanlı Sistem Mimarisi

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



### İstek Akışı

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

### İstek Gövdesi

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

### Yanıt

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

### Hata Kodları

- **400** - Geçersiz istek / Güvenlik doğrulaması başarısız
- **404** - Endpoint bulunamadı
- **409** - Konuşma geçmişi doğrulama hatası
- **429** - İstek limiti aşıldı
- **502** - Claude API hatası
- **503** - Günlük token kotası aşıldı

---

## Test

```bash
npm test                # Tüm testler
npm run test:coverage   # Kapsam raporu
npm run test:ui         # İnteraktif test arayüzü
```

---

## Proje Yapısı

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

## İletişim

**ARTEK İnovasyon Ar-Ge Sanayi ve Tic. Ltd. Şti.**

- 🌐 [www.artek.tc](https://www.artek.tc)
- 📧 info@artek.tc

**Geliştirici:** Rıza Emre ARAS - r.emrearas@proton.me

