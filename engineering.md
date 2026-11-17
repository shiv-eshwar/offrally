# Engineering and delivery

## Phase 1 — repository and contracts

Record product boundaries, architecture, acceptance gates and work completed. Make an independent private repository. Commit each tested phase.

## Phase 2 — local product

Build a mobile-first React interface with a bundled UI on Capacitor. Persist feed switches and solo history. Account for interruptions and reloads. Verify timer behavior with deterministic clocks and exercise the public interface in a browser.

## Phase 3 — protected feeds

Generate native browser assets from a shared navigation and element-filter policy. Build an isolated Android WebView and iOS WKWebView with a visible exit, ordinary HTTPS navigation and a separate cookie store from the app UI. Test direct links, clicks, client-side routes, late DOM changes, ordinary watch/posts and toggles.

## Phase 4 — friend rounds

Provision an isolated backend where available. Implement invite creation, second-player admission, bounded check-in credit and a server-determined finish. Exercise a round with two independent identities. Check that outsiders cannot read scores, clients cannot assign elapsed time and a third participant cannot take a seat.

## Phase 5 — integration and distribution

Build Android and iOS targets, run available simulator checks, validate a browser preview and package artifacts. Record release credentials, hardware and provider checks still required. Never include development tokens, signing keys, local SDK paths or third-party user data in Git.

## Commands and environments

Use Node 22 or newer and npm ci. Run npm test, npm run build and npx cap sync. Android uses JDK 21, Android SDK 35 and the Gradle wrapper. The iOS Xcode project uses Swift Package Manager. The Mobile verification workflow builds debug packages on Linux and macOS. Nothing runs inside the user's other social apps.

For the live game test, run CLUB_TEST_URL=https://offrally.vercel.app node scripts/duel-smoke.mjs. It creates a one-minute private round. The UI counterpart is scripts/ui-smoke.mjs and requires Chrome. The Android smoke script expects the debug WebView DevTools endpoint forwarded to localhost port 19330. Use only a development emulator with this script.

## Operations

The dedicated Supabase project is in Mumbai. Apply migrations with supabase db push to that project. Supply a generated password to the restricted offrally_gateway database role, and store its pooled TLS connection URI under CLUB_DATABASE_URL as a sensitive Vercel production environment variable. The function expects a transaction-pool connection and disables prepared statements. Each request sets the pseudonymous actor only inside its transaction. Never put a database URI in a VITE_ environment variable. Set the production function region close to the database.

If deploying another instance, change the native service URL in src/competition.ts before syncing the mobile packages. The web UI uses its serving origin. A standard static Vite server serves the local solo and settings flows, while vercel dev or a Vercel deployment serves the multiplayer API.

## Pilot release gates

Before store submission, verify signed-in Instagram navigation and a regular YouTube video on physical iPhone and Android hardware. Providers can restrict sign-in from embedded browsers. Verify playback, account switching, keyboard layout, accessibility and both filter states on the target OS versions. Google Play and App Store distribution require the owner's signing and publishing accounts. The browser preview can exercise duels immediately.

On the provisioning Mac the generated Supabase administrator password is held in the owner's private ~/Library/Application Support/Offrally/deployment folder, outside the working tree. The restricted runtime connection is stored as a sensitive production secret in the Offrally Vercel project.
