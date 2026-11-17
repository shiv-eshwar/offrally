# Architecture

## Installed-app protection

Offrally renders its own bundled controls with React and Capacitor. Native bridges own app selection, OS permission status and enforcement. The React layer reads a snapshot on launch and foreground, and displays the result of each action. The web edition offers device availability information. Social accounts stay in their publishers' installed apps.

### Android

GuardApp owns the mapping from app IDs to Android packages, section names and player resource IDs. The manifest declares package visibility only for the supported targets. The Accessibility service subscribes to events for those same target packages. Consent, the master switch and each app rule live in private SharedPreferences. An upgrade starts with native protection off. Legacy website filter choices carry no native authorization.

A debounced event triggers a check of the active window. Enforcement checks consent, the switch, the selected package and its current rule again immediately before acting. Whole-app mode sends the user Home. Section mode looks for a visible, large player with a known resource ID or a selected navigation item next to a recognized peer in the matching navigation bar. The label-based path recognizes English labels. Offrally sends Back for a match. A still-matching screen can return the user Home. An unrecognized screen stays open. Android draws each app's UI and the original tabs remain visible.

The service uses local view metadata, stores rules, and displays brief feedback. It never requests gesture injection, reads notifications or sends social-app contents to the round service. Turning every rule off also pauses enforcement. Disabling the service in Android Settings removes its ability to act.

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
