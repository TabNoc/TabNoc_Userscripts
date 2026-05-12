# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Build: `bun run build` runs `tsc` (type-check only — tsconfig.json sets "noEmit": true) then `vite build` which produces the userscript via vite-plugin-monkey (entry: `src/main.ts` -> imports `src/MarkOpenedVideos.user.js`). Output ends up in `dist/`.
- Dev: `bun run dev` starts the Vite dev server (hot-reload). The real userscript logic lives in `src/MarkOpenedVideos.user.js`; `src/main.ts` is a tiny Vite wrapper.
- Package manager: this repo includes `bun.lock`; prefer `bun` for installing and running scripts (use `bun install`, `bun run ...`).
- No tests present — there is no test framework or single-test command in the repo.
- TypeScript rules to follow (tsconfig.json): `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports` (the project treats side-effect imports strictly).
- Side-effect imports matter: `src/MarkOpenedVideos.user.js` imports `./String` (polyfills) and relies on those global side-effects — do not remove or reorder those imports.
- Do NOT convert `src/MarkOpenedVideos.user.js` to a normal library without preserving userscript APIs (GM_*, `unsafeWindow`, `cloneInto`, `exportFunction`); it runs in Grease/Tamper environment and uses interactive alerts/confirms.
- Storage pattern/gotcha: use provided `SetData`/`GetData` helpers — they wrap GM_* storage and a lock (`GM_Lock` / `GM_Unlock`) and maintain a `changes` history. Replacing direct `GM_setValue`/`GM_getValue` will break history/locking.
- Database migrations are interactive and forward-only: `UpdateDataBase()` runs interactive `alert`/`confirm` flows and can throw — treat schema changes cautiously.
- String prototype polyfills live in `src/String.js` (adds String.format, contains alias, replaceAll fallback). Keep them intact when modifying runtime behaviour.
 - When editing code, remember the bundler (vite + vite-plugin-monkey) produces the final userscript; local runtime differs from node — test in a browser userscript runtime (Tampermonkey/Firefox) rather than Node.
 - Never introduce safety-net implementations (like `fetch` fallbacks or environment shims) without first asking the user if they are required. Prefer the concrete runtime assumptions of this repo (Grease-/Tampermonkey userscript) over extra abstraction.
 - Minimise usage of `any` and `unknown` as much as possible. Always check whether a cleaner, typed version exists (e.g. types from `vite-plugin-monkey`) before falling back to loose types.
