# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digitalization of the "Tres Letras" board game — a Spanish word-formation multiplayer game. Players form words containing 3 base letters (drawn from 81 cards) in order, scored by letter value and bonuses.

## Repository Structure

```
3-letras/
├── apps/
│   ├── api/          → NestJS + TypeORM (SQLite) + Socket.io — port 3000
│   ├── mobile/       → Expo SDK 55 (React Native) — iOS, Android, Web
│   └── admin-frontend/ → React + Mantine UI + Vite — port 5173
├── libs/src/         → Shared TypeScript: interfaces, DTOs, constants, WS events
└── files/
    └── descripcion_tecnica_del_juego_tres_letras.pdf → Full game rules
```

No monorepo tool. Each app is independent; they share types via `@3letras/*` path alias pointing to `libs/src/`.

## Commands

### API (apps/api)
```bash
npm run start:dev     # Development with hot reload
npm run build         # Webpack bundle → dist/main.js
npm run start:prod    # Run production bundle
npm test              # Jest unit tests
npm run test:e2e      # E2E tests
```

### Mobile (apps/mobile)
```bash
npx expo start        # Dev server (QR code for Expo Go)
npx expo start --web  # Web browser on port 8081
npx expo run:android  # Development build for Android (requires Android Studio)
npx expo export --platform web  # Verify web build compiles
```

### Admin (apps/admin-frontend)
```bash
npm run dev    # Vite dev server on port 5173
npm run build  # Production build
```

## Path Alias `@3letras/*`

Resolves to `../../libs/src/*` in all apps. Each bundler has its own config:

| App | Config file | Mechanism |
|-----|-------------|-----------|
| api | `webpack.config.js` | `resolve.alias` |
| mobile | `babel.config.js` + `metro.config.js` | `babel-plugin-module-resolver` + `watchFolders` |
| admin | `vite.config.ts` | `resolve.alias` |

**Critical:** Both `babel.config.js` AND `metro.config.js` are required for mobile. Metro needs `watchFolders` to serve files outside the project root; Babel transforms the imports.

## API Architecture

NestJS uses **webpack** (not tsc) as bundler — configured in `nest-cli.json`. This has two important consequences:

1. **Native modules must be webpack externals:** `better-sqlite3` and `bcrypt` are in `webpack.config.js` externals. Any new native module must be added there.
2. **TypeORM entities need explicit column types:** Webpack removes TypeScript metadata, so `@Column({ type: 'text' })` is required on every entity column — never rely on type inference.

Dictionary is loaded once at startup into a `Set<string>` in `DictionaryService` from the `vocab_entries` DB table (only `isActive = true` rows). Supports `reload()` to refresh after admin changes.

### In-memory game state (GameGateway)
The gateway holds per-session Maps that are **not persisted**:
- `turnTimers` — active `setTimeout` references
- `lastValidWord` — last valid word per round (for medium/advanced difficulty)
- `usedWords` — Set of used words per round (prevents duplicates)
- `pendingVotes` — vote state for special letter votes
- `pendingDice` — dice roll state (rollerId, result, resolve callback, timeout)
- `soloGames` — Set of game codes currently in solo mode (no timer, no dice, no vote)

This state is lost on server restart. A crashed server terminates active games.

## WebSocket Event Flow

All game logic runs server-side. Clients only emit: `game:ready`, `game:start`, `turn:submit`, `turn:skip`, `vote:submit`, `dice:roll`.

```
game:start → startNewRound()
  → (multiplayer only) dice:roll_request → client emits dice:roll → dice:result + 4.5s animation wait
  → if special letters + basic/medium difficulty → vote:start (15s timeout)
    → vote:submit from all players → vote:result → round:new or redraw
  → else → round:new → turn:start
    → 15s timer → turn:timer (every 1s)
    → turn:submit or timeout → turn:result → next turn
  → all turns done → round:summary → next round or game:end

Solo mode: no dice, no vote, no timer. Skip ends the round immediately.
Die result determines turns-per-player-per-round (1–6).
```

## Mobile Screens Flow

```
App start
  └─ loadSession() from AsyncStorage
       ├─ session exists → MainTabs
       └─ no session → Welcome → Login / Register / Guest → MainTabs

MainTabs (bottom tab navigator):
  ├─ Leaderboard
  ├─ Inicio (MainScreen) → wizard:
  │     step 0: menú principal (JUGAR)
  │     step 'mode': Solo | Multijugador
  │     step 'multi': Crear sala | Unirse a partida (código)
  │     step 1: Dificultad
  │     step 2: Número de rondas
  │     → Lobby → Game → Results
  └─ Records
```

Session (JWT + player) persists in `AsyncStorage` via `src/services/session.ts`.

## Game Rules Summary

- **Basic:** 2 base letters, special letters optional (player vote per round)
- **Medium:** 3 base letters, can build on previous valid word, special letters optional (vote)
- **Advanced:** 3 base letters, cannot build on previous, special letters mandatory if drawn
- Timer: 15s per turn, server-controlled
- Scoring: normal letters = 2pts, special (Ñ/W/X/Y/Z) = 4pts
- Bonuses: ≥14 letters +5pts, ≥16 letters +10pts, ≥3 special letters +15pts
- Words must contain base letters **in order**
- Words already used in current round are rejected

## Environment Variables

**apps/api/.env:**
```
PORT=3000
NODE_ENV=development
JWT_SECRET=tres-letras-dev-secret-2024
DATABASE_PATH=data/tresletras.db
```

**apps/mobile/.env.local:**
```
EXPO_PUBLIC_API_URL=http://<local-ip>:3000/api
```
Use local network IP (not `localhost`) when testing on a physical device.
