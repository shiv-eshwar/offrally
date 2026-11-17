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
