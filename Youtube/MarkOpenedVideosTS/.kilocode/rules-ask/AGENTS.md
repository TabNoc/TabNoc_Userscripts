# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- The large domain-specific implementation lives entirely in `src/MarkOpenedVideos.user.js`. Read this file for data model, DB migration flow, and UI heuristics — it's the canonical source.
- There are multiple legacy import/migration paths in `UpdateDataBase()` converting very old GM_* keys; be careful when changing storage shapes.
- There are no tests or test framework; any test work requires adding a test framework and wiring (none present).
- Many functions rely on global state stored under `unsafeWindow.TabNoc_` and exported via `setTabNoc()` — altering these structures can break cross-module assumptions.
