# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Architecture: single-file dominant userscript (`src/MarkOpenedVideos.user.js`) that runs in page context and exports primitives into `unsafeWindow` for cross-tab sharing (`TabNoc_GM`, `TabNoc_`).
- Database is GM_* backed with versioned tables: `WatchedVideoArray`, `ScannedVideoArray`, `VideoObjectDictionary`. Migrations are forward-only and interactive; do not assume reversible migrations.
- Many functions rely on global mutable state inside `TabNoc` (Variables, Settings, HTML). Keep changes minimal and preserve existing state shape when evolving features.
- The build pipeline (vite + vite-plugin-monkey) bundles the userscript; dev server serves a Vite page but runtime differences (unsafeWindow, GM_*) only exist in userscript runtime — always test changes in a browser userscript environment.
