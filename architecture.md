# Architecture

## Installed-app protection

Offrally renders its own bundled controls with React and Capacitor. Native bridges own app selection, OS permission status and enforcement. The React layer reads a snapshot on launch and foreground, and displays the result of each action. The web edition offers device availability information. Social accounts stay in their publishers' installed apps.

### Android

GuardApp maps catalog entries to Android packages, optional feed names and accessibility identifiers. The package manager supplies additional launchable apps through a launcher intent query. Offrally, Home handlers, accessibility settings and the system and default phone apps are excluded from the picker. Private SharedPreferences retain consent, the master switch and rules across updates. Catalog entries keep their existing IDs. Additional whole-app rules use the package name.

While protection is active, window changes identify the focused application and keep covers in sync when the user switches apps. Only an app with a section rule undergoes layout inspection. Content events for that app are coalesced. A recognized navigation cell gets a touchable accessibility overlay sized to its current screen bounds. Recognition uses a dedicated tab ID or a labeled control alongside a navigation peer. A selected tab, a known large player or a pair of Facebook viewer markers can also identify an open feed. The label-based path recognizes English labels. When possible Offrally selects a neighboring tab. If there is no usable neighbor or the tab action leaves the same viewer open, it uses Back once. A viewer that stays open remains shielded.

Whole-app mode covers the focused app with an opaque pause screen and an explicit Home action. Android delivers the window change after launch begins. Pausing protection, clearing rules, leaving the window or disconnecting the service removes its overlay. The service stores rules locally. It never requests gesture injection, reads notifications or sends social-app contents to the round service.

The Snapchat player ID and Facebook viewer labels are publisher-specific. [Public observations of the viewer identifiers](https://github.com/duartebarbosadev/scrolless/blob/d4e8f81d459332231079f10a0b7315d2dcdab6c3/core/domain/src/main/java/com/scrolless/app/core/model/BlockableApp.kt)

### iOS and iPadOS

AuthorizationCenter requests individual Screen Time access. FamilyActivityPicker lets the user select individual applications. The native bridge encodes the opaque selection in UserDefaults and sends only consent, selection count and active status to the UI. The picker supports Save and Cancel, and requires individual app choices.

A named ManagedSettingsStore owns Offrally's application shields. It applies the saved tokens while protection is enabled and clears those shields when paused. Revocation invalidates the selection. On the next status read, the bridge clears the saved tokens and active flag. No background timer or network request is needed to maintain Apple's shields. Screen Time operates at the application level. [Apple FamilyActivitySelection](https://developer.apple.com/documentation/familycontrols/familyactivityselection)

## Local focus

Only an explicitly running solo session accrues time. Backgrounding interrupts it. A saved active marker permits conservative recovery after a crash. Durations, outcomes and local display dates belong to the timer domain. The visual countdown updates independently of stored history.

## Competition

The server owns admission, round start, deadline and scoring. The first player creates a room, the second joins with its code. Clients check in from the visible duel screen. Server time limits credit between check-ins, so closing the app for an hour cannot earn an hour. Room membership restricts reads. This is a friendly game, with no prize or claim of cheat-proof device attestation.

## Deployed data path

The mobile shell sends HTTPS requests to the Vercel /api/round endpoint. The browser version uses the same origin. A device generates 32 random bytes when it first enters a round. The bearer value stays in first-party storage and travels only to the game endpoint. The gateway hashes it to a pseudonymous player identifier and assigns that identity transaction-locally before executing the database function. Clearing local storage loses the seat. Nicknames are display values and need not be unique.

The Supabase database is dedicated to Offrally. A restricted database login can execute the room function and has no direct access to the private room table. The client never receives a database login. Joining locks the room row before claiming the vacant seat. The three-second scoring loop uses database timestamps. An interval exceeding eight seconds earns zero. Moving away from the duel issues a final check-out when the transport is available. A dropped request can lose the final interval. Polling includes only game state and identity.

Rooms expose two nicknames and the two scores only to members. A waiting invite can be claimed for one day. This pilot retains finished rounds in Postgres. It has no public directory, prize payouts, account recovery or cross-device identity sync.

## Failure recovery

The timer journal uses a single storage write for the active marker and session history. Restoration records an unobserved active lap as interrupted with zero credit. A failed network check-in displays a retry status and resumes polling while the duel remains visible. A player can recover the current room after restarting on the same installation.

When the deadline has passed, the first observer settles both players in the same locked transaction. Both receive eligible time up to the deadline. Later requests return the frozen totals, so the winner does not depend on which player checks first. The game accepts a short network grace interval and relies on cooperative, unmodified clients.
