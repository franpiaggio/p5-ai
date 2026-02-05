# p5.js AI Editor

Web-based p5.js editor with integrated AI chat (OpenAI / Anthropic) for generating and modifying sketches via prompts.

## Demo

https://github.com/franpiaggio/p5-ai/raw/main/demo.mp4

## Stack

- **Frontend**: React, Vite, TypeScript, Monaco Editor, Zustand, Tailwind CSS
- **Backend**: NestJS, TypeScript, OpenAI SDK, Anthropic SDK

## Setup

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run start:dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

## Usage

1. Write p5.js code in the editor or use the AI chat to generate it
2. Click Play (or Alt+Enter) to run the sketch
3. Configure your API key and model in Settings
