# Frontend

React + Vite + TypeScript frontend for the p5.js AI Editor.

## Dev

```bash
npm install
npm run dev
```

## Structure

```
src/
├── components/
│   ├── Editor/       # Monaco code editor
│   ├── Preview/      # p5.js iframe preview
│   ├── Chat/         # AI chat panel
│   ├── Console/      # Console log output
│   ├── BottomPanel/  # Tabs (Console / Chat)
│   ├── Toolbar/      # Play, Stop, Settings
│   └── Settings/     # API key & model config
├── hooks/            # useResizable
├── services/         # API client
├── store/            # Zustand state
└── types/
```
