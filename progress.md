# Progress

- [x] Phase 1. Inspected the reference video, chose the protected-browser boundary and documented deliverables.
- [x] Phase 2. Built clubhouse, solo timer, history and feed settings. Timer test and production build passed.
- [x] Phase 3. Implemented isolated native browsers and shared rules. DOM fixture tests passed for both providers, Android assembled, Swift parsed. Device and provider validation tracked below.
- [x] Phase 4. Deployed the restricted PostgreSQL room function and Vercel gateway. Live two-seat admission, private reads, inactive gaps and score accrual verified.
- [x] Phase 5. Packaged Android and iOS simulator builds, deployed the web app, captured screens and documented the pilot verification below.

## Pilot verification, 18 November 2026

| Check | Evidence and scope |
| --- | --- |
| Native builds | Android debug APK assembled locally and installed on the API 35 emulator. Xcode built the iOS Simulator package in GitHub Actions and launched it on an iPhone simulator. The captured clubhouse is in docs/iphone-clubhouse.png. |
| YouTube on Android | The live signed-out mobile site used a Shorts button with no hyperlink. Added the observed pivot selector, rebuilt, opened the actual native browser and verified zero visible Shorts pivots while Subscriptions remained visible. Switching the filter off and reopening restored Shorts. |
| Instagram on Android | The live site reached the sign-in screen with the filter installed. A direct navigation to a reel returned to Instagram home. Post-login feed layout, stories and DMs still require account-based checks. |
| Solo and feed UI | Automated Android WebView interaction covered creating and ending a lap, reading history, switching services and toggling filters. A separate browser test checked preference persistence across reload. |
| Multiplayer | Two browser contexts joined a production duel. The installed Android client also created a room and saw its remote opponent. A live timed API test verified admission, member-only reads, scoreboard agreement, inactive gaps, deadline and winner. |
| Build scope | Debug APK and iOS Simulator archive are pilot builds. Physical devices, App Store / Play Store release signing, provider logins and store review are outstanding. |

Final scoring regression passed on the production deployment. Both active players received their remaining eligible seconds when the round closed. A later heartbeat left both final scores unchanged. The production browser smoke check used two independent browser contexts, and the Android and iOS build jobs passed in run 44171562828.
