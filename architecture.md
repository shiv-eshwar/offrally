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
