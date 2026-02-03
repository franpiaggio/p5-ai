# Backend

NestJS API server for the p5.js AI Editor.

## Dev

```bash
npm install
npm run start:dev
```

## API

### `POST /api/chat`

Streams LLM responses via SSE.

**Body:**

```json
{
  "message": "draw a rotating cube",
  "code": "function setup() { ... }",
  "history": [],
  "config": {
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-..."
  }
}
```

## Providers

- OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo)
- Anthropic (Claude Sonnet, Claude Haiku)
