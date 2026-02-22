# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Canonical userscript source: src/MarkOpenedVideos.user.js — treat it as the real product; src/main.ts is only a Vite wrapper used to build via vite-plugin-monkey.
- Keep side-effect imports and their order (src/String.js polyfills are required at runtime). Removing/reordering breaks runtime behavior (String.format, contains, replaceAll, and prototype aliases are relied on widely).
- Persistent storage must use SetData/GetData (declared in MarkOpenedVideos.user.js). They implement GM_* locking (GM_Lock/GM_Unlock) and a `changes` history — do not replace with direct GM_getValue/GM_setValue unless you replicate locking/history semantics.
- GM_Lock implements a busy-wait loop; be careful when invoking UpdateDataBase() or long migrations — they prompt via alert()/confirm() and can block tabs.
- tsconfig enforces: strict, noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch, noUncheckedSideEffectImports. If importing solely for side-effects, ensure the import is explicit and not removed by tooling.
- Build: vite + vite-plugin-monkey produces the userscript; entry configured in vite.config.ts (entry: src/main.ts). Do not convert MarkOpenedVideos.user.js into a normal Node library without preserving userscript runtime APIs (unsafeWindow, cloneInto, exportFunction, GM_*).
