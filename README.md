# Bookstore App

Self-contained implementation of `EPMCDMETST-52015` (Non‑Fiction search filters, parity with Fiction). Independent of the parent repository's SDLC-pipeline tooling — this folder can be copied into its own repository as-is.

## Structure

- `src/catalog/` — `Book` data model, the shared Filter Option Catalog (Fiction/Non‑Fiction use identical filter groups/options), and the JSON-sourced seed fixture (`seed-data.json`).
- `src/search/` — filter validation (allow-list), relative publication-date filtering, query building and pagination.
- `src/api/` — `GET /api/search` HTTP endpoint (`search-endpoint.ts`) and the full app server (`app-server.ts`) that also serves the browser UI.
- `src/web/` — framework-agnostic filter panel and results-view presentation logic, plus `browser-app.ts` which wires them to real DOM elements.
- `public/` — the static HTML/CSS shell for the browser UI.

## Running

Run these commands **from inside `bookstore-app/`** (not the repo root), one at a time:

1. **Install dependencies** (first time only, or after pulling changes):
   ```bash
   cd bookstore-app
   npm install
   ```
2. **Run the tests** to confirm everything works:
   ```bash
   npm test
   ```
3. **Start the app** (this also compiles the browser UI bundle automatically):
   ```bash
   npm start
   ```
4. **Open the UI** in a browser: [http://localhost:3000/](http://localhost:3000/)
   - Switch between the **Fiction** / **Non-Fiction** tabs.
   - Apply **Format**, **Language**, **Publication Date**, and **Customer Reviews (★)** filters — results update automatically.
   - Use **Clear All Filters** to reset. Selected filters persist per category in the browser's `localStorage` and are restored on refresh.
   - The `GET /api/search` JSON endpoint remains available directly for scripted/API use, e.g. `curl "http://localhost:3000/api/search?category=fiction"`.
5. Stop the server with `Ctrl+C` in the terminal when done.

Other useful commands:

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile only the server-side TypeScript to `dist/` |
| `npm run build:browser` | Compile only the browser UI (`src/web/browser-app.ts` + deps) to `dist-browser/` |
| `npm run typecheck` | Type-check without emitting output |

## Known limitations (capstone scope)

- **In-memory catalog only** (`src/catalog/seed-data.json`, loaded and combined with a relative publication date at startup) — no persistence/database. Data resets on every process restart. Sufficient to satisfy `EPMCDMETST-52015`'s acceptance criteria; swap in a real data store before production use.
- **No UI framework** — `src/web/*.ts` (excluding `browser-app.ts`) expose presentation-logic classes (state + events) with no DOM dependency, so any UI framework can be wired on top; `browser-app.ts` is a minimal vanilla-DOM reference implementation.
- **Paths resolved via `process.cwd()`** — the app server and seed-data loader assume they are run with the working directory set to `bookstore-app/` (true for all `npm run …` scripts in this package).
- **Customer Reviews filter deviates from `EPMCDMETST-52015`'s literal acceptance criteria (by explicit product decision)** — the Jira story specifies cumulative "X-stars and above" thresholds (3+ includes 4+ books). This implementation instead treats each tier as a mutually exclusive bucket bounded by the next-higher tier (`3★` = ratings `[3, 4)`, `4★` = ratings `[4, 5]`), so a book only ever matches one rating tier. `docs/requirements.md` still reflects the original Jira wording; this is a locally-scoped, requested deviation, not a re-sync from Jira.
