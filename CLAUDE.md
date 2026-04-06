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
npx expo run:android  # Development build for Android (requires Android Studio/emulator)
npm run build:apk     # Build standalone release APK locally (outputs to android/app/build/outputs/apk/release)
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

**Global Configuration (AppConfigService):**
Environment variables like `GAME_TURN_DURATION` have been migrated to the `game_config` table (SQLite). `AppConfigService` acts as the SSOT, using an in-memory cache for 0ms latency. The Admin Panel allows editing these values in real-time.

Dictionary is loaded once at startup into a `Set<string>` in `DictionaryService` from the `vocab_entries` DB table (only `isActive = true` rows). Supports `reload()` to refresh after admin changes.

### In-memory game state (GameGateway)
The gateway holds per-session Maps that are **not persisted**:
- `turnTimers` — active `setTimeout` references per turn (multiplayer)
- `roundTimers` — active `setTimeout` per round (solo mode global timer)
- `lastValidWord` — last valid word per round (for medium/advanced difficulty)
- `usedWords` — Set of used words per round (prevents duplicates)
- `pendingVotes` — vote state for special letter votes
- `pendingDice` — dice roll state (rollerId, result, resolve callback, timeout)
- `soloGames` — Set of game codes currently in solo mode
  
  This state is lost on server restart. A crashed server terminates active games.

  ### Dynamic Letter Generation Algorithm (Hybrid)
  The game does not pick purely random letters. The backend uses a hybrid generation approach:
  - It fetches word frequency weights directly from the `vocab_entries` table.
  - Generates candidate seeds starting from the most frequently used words (`frequency`).
  - Verifies candidates against the dictionary to ensure at least `GAME_CONFIG_MIN_WORDS_REQUIRED` valid combinations exist before sending the letters to the players.
  
  ## WebSocket Event Flow
  
  All game logic runs server-side. Clients only emit: `game:ready`, `game:start`, `turn:submit`, `turn:skip`, `vote:submit`, `dice:roll`, and `game:rejoin`.
  
  ```
  game:start → startNewRound()
    → (solo) if mode = solo → startSoloRoundTimer() → emit round:new with roundTimeoutAt
    → (multi) if mode = multi → dice:roll_request → dice:result
      → if special letters + basic/medium difficulty → vote:start (15s timeout)
        → vote:submit from all players → vote:result → round:new or redraw
      → else → round:new → turn:start
    → 15s/25s timer → turn:timer (every 1s)
    → turn:submit or timeout → turn:result → next turn
    → all turns done or round timeout (solo) → round:summary → next round or game:end
  ```
  
  Reconnection: client socket.io connects → emits game:rejoin(code) 
    → if game finished → SERVER emits game_end
    → else SERVER emits game_rejoin_state (full payload: game, round, activeTurn, diceRequest, voteState, wordHistory, roundTimeoutAt)

  Solo mode: global round timer enforced by server (default 180s). Skip ends the round immediately.
  Die result determines turns-per-player-per-round (1–6) in multiplayer.
  
  ## Admin Panel (admin-frontend)
  
  The admin panel is built with React + Mantine UI.
  - **Configuration:** Allows editing `game_config` (turn duration, solo round duration).
  - **Users:** Master list with **Remote Pagination** (15 per page) and interactive sorting by registration date.
  - **Authentication:** JWT based with `AdminGuard` enforcement.
  
  ## Mobile Screens Flow
  
  ```
  App start
    └─ loadSession() from AsyncStorage
         ├─ session exists → MainTabs
         └─ no session → Welcome → Login / Register / Guest → MainTabs
  
  MainTabs (bottom tab navigator):
    ├─ Leaderboard
    ├─ Inicio (MainScreen) → wizard:
    │     step 0: menú principal (JUGAR) + Cómo se juega (InstructionsScreen global)
    │     step 'mode': Solo | Multijugador (Solo mode has global round timer UI)
    │     step 'multi': Crear sala | Unirse a partida (código)
    │     step 1: Dificultad
    │     step 2: Número de rondas
    │     → Lobby → Game → Results
    └─ Records
  ```
  
  Session (JWT + player) persists in `AsyncStorage` via `src/services/session.ts`.
  
  ## Mobile UI Quirks & Workarounds
  
  - **Global Round Timer (Solo Mode):** Shown as a progress bar below the letters. Syncs with `roundTimeoutAt` emitted by server. Colors change to Red when < 10s.
  - **Keyboard Handling (GameScreen):** Custom approach using `Keyboard.addListener` to capture `keyboardHeight`. A floating `Animated.View` clears the OS keyboard.
  - **Local APK Building:** `npm run build:apk` runs Gradle `assembleRelease`.
  - **Cleartext Traffic:** Enabled for local IP development.

  ## Game Rules Summary
  
  - **Basic:** 2 base letters, special letters optional (player vote per round)
  - **Medium:** 3 base letters, can build on previous valid word, special letters optional (vote)
  - **Advanced:** 3 base letters, cannot build on previous, special letters mandatory if drawn
  - Timer: Server-controlled (configurable dynamically via Admin Panel UI). Solo mode uses a global round timer instead of turn timers.
  - Scoring: normal letters = 2pts, special (Ñ/W/X/Y/Z) = 4pts
  - Bonuses: ≥14 letters +5pts, ≥16 letters +10pts, ≥3 special letters +15pts
  - Words already used in current round are rejected
  
  ## Environment Variables

  **apps/api/.env:**
  ```
  PORT=3000
  NODE_ENV=development
  JWT_SECRET=...             # Use strong secret
  DATABASE_PATH=data/tresletras.db
  ADMIN_EMAIL=...            # Initial admin seed
  ADMIN_PASSWORD=...         # Only used if admin doesn't exist
  ADMIN_NICKNAME=Admin
  ```
  
  **Git Security:** Tracked `.env` files must be removed from history using `git filter-branch` or `filter-repo`. 
  
  **apps/mobile/.env.local:**
  ```
  EXPO_PUBLIC_API_URL=http://<local-ip>:3000/api
  ```
  Use local network IP (not `localhost`) when testing on a physical device.
