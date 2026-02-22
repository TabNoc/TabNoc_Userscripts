# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Web runtime: debugging must be done in a browser userscript runtime (Tampermonkey/Fox), not Node; interactive prompts (alert/confirm) and blocking busy-waits are used.
- GM_Lock uses a busy-wait loop; it can freeze tabs. If DB lock prevents progress during manual debugging call `GM_Unlock(true)` from console to force release.
- Migration flows (`UpdateDataBase`) prompt via alert/confirm and may throw; run them only interactively and inspect console output for detailed logs stored during migration.
- jQuery is explicitly injected into page global scope in `src/MarkOpenedVideos.user.js` (unsafeWindow.jQuery/window.$). When reproducing behavior in dev server, ensure page context mirrors user-script environment.
