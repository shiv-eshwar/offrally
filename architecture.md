# Architecture

## Trust boundaries

The installed app loads bundled first-party HTML. It owns the timer, local history, feed settings and competition identity. A native plugin opens a separate top-level remote-content view. The remote view does not get a Capacitor bridge, local app storage or access to competition credentials. The app never proxies a social account password or saves browsing history. Remote pages use the platform cookie store to maintain login sessions.

## Feed filtering

A policy maps each switch to known route patterns and DOM selectors. An injected stylesheet handles current and future matching elements. A document script intercepts blocked clicks and checks single-page navigation. The native delegate enforces top-level navigations including direct destination loads. Filters are configured before opening a browser. Ordinary YouTube watch links, Instagram posts and DMs should remain reachable with default settings. Provider layout changes require real-device regression checks.

## Local focus

Only an explicitly running solo session accrues time. Backgrounding interrupts it. A saved active marker permits conservative recovery after a crash. Durations, outcomes and local display dates belong to the timer domain. The visual countdown updates independently of stored history.

## Competition

The server owns admission, round start, deadline and scoring. The first player creates a room, the second joins with its code. Clients check in from the visible duel screen. Server time limits credit between check-ins, so closing the app for an hour cannot earn an hour. Room membership restricts reads. This is a friendly game, with no prize or claim of cheat-proof device attestation.

## Deployment surfaces

Android and iOS packages embed the same first-party UI and generated filter rules. The web preview exercises the timer, settings and duel flows. A standard webpage cannot filter another origin; protected feeds require the installed mobile app. Backend migrations and deployment instructions live alongside the client. Local solo and filter features work independently of the competition service.

## Deployed data path

The mobile shell sends HTTPS requests to the Vercel /api/round endpoint. The browser version uses the same origin. A device generates 32 random bytes when it first enters a round. The bearer value stays in first-party storage and travels only to the game endpoint. The gateway hashes it to a pseudonymous player identifier and assigns that identity transaction-locally before executing the database function. Clearing local storage loses the seat. Nicknames are display values and need not be unique.

The Supabase database is dedicated to Offrally. A restricted database login can execute the room function and has no direct access to the private room table. The client never receives a database login. Joining locks the room row before claiming the vacant seat. The three-second scoring loop uses database timestamps. An interval exceeding eight seconds earns zero. Moving away from the duel issues a final check-out when the transport is available. A dropped request can lose the final interval. Polling sends no browsing history or third-party cookies.

Rooms expose two nicknames and the two scores only to members. A waiting invite can be claimed for one day. This pilot retains finished rounds in Postgres. It has no public directory, prize payouts, account recovery or cross-device identity sync.

## Failure recovery

The native browser is disposable. Done returns to the same local settings. The timer journal uses a single storage write for the active marker and session history. Restoration records an unobserved active lap as interrupted with zero credit. A failed network check-in displays a retry status and resumes polling while the duel remains visible. A player can recover the current room after restarting on the same installation.

When the deadline has passed, the first observer settles both players in the same locked transaction. Both receive eligible time up to the deadline. Later requests return the frozen totals, so the winner does not depend on which player checks first. The game accepts a short network grace interval and relies on cooperative, unmodified clients.
