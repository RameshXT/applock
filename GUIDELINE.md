# Windows AppLock — Project Guidelines

> AI Agent: Read this entire file before doing anything. Follow every rule strictly.

---

## Strict Rules
- DO NOT remove, rename, refactor, optimize, or restructure any existing code
- DO NOT modify anything outside the exact scope of what was asked
- DO NOT add features, buttons, or logic not explicitly requested
- Always return the complete updated file — never partial
- When in doubt — STOP and ask, never assume

---

## Brand
```ts
const APP_NAME = "Windows AppLock";
```

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + CSS Modules |
| Build | Vite |
| Desktop | Tauri v2 |
| Backend | Rust + Tokio |
| Security | Argon2id + AES-256-GCM |
| System | Windows API + Registry (winapi crate) |

## Design System
- **Dark only** — Background `#0a0a0a` · Surface `#111111` · Card `#1a1a1a`
- **Colors** — Border `#2a2a2a` · Accent `#3b82f6` · Text `#ffffff` / `#888888`
- **Status** — Error `#ef4444` · Success `#22c55e`
- Minimal + modern · single accent · smooth animations · CSS Modules only

## App Flow
```
First Launch → Setup.tsx → Dashboard.tsx
Returning    → Login.tsx → Dashboard.tsx
Locked App   → PinPopup.tsx (non-dismissible, no ESC, no close button)
```

## Security Rules
- Hash PIN with Argon2id — never store raw PIN
- Encrypt config with AES-256-GCM — never store plain text
- All sensitive operations go through Tauri `invoke()` — never in frontend logic
- PinPopup cannot be closed without correct PIN
- Lockout after repeated failed PIN attempts

## Coding Rules
- TypeScript strict mode — no `any` types
- CSS Modules only — no inline styles
- No `.unwrap()` in Rust production code — handle all errors with `Result<T, String>`
- Comment only complex logic — no obvious comments
- Never handle security logic in the frontend

## Build
```bash
npm run tauri dev
npm run tauri build
```

## Commit Message Format
After every edit, provide the exact commit commands:
```
git add .
git commit -m "feat(scope): what changed in one line"
```
