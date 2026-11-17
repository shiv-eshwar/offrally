# Progress

## Installed-app release, 18 November 2026

- [x] Remove both native social browsers, all destination launch actions, website policies, their copied assets, and the old feed preferences UI.
- [x] Ship four opt-in Android app rules, local consent, a master switch and OS permission status. Add Apple individual Screen Time authorization, a private app picker, persistent shields, editing and pause.
- [x] Compile the Android APK and unsigned release App Bundle. Compile for iOS Simulator and generic iOS hardware. Exercise Android rules in separate native test applications.
- [x] Update the production web clubhouse and mobile screenshot gallery.
- [ ] Validate current signed-in publisher releases, entry from notifications and deep links on physical Android devices, including regional and language variants.
- [ ] Validate shielding, revocation and restoration on a provisioned physical iPhone. Obtain distribution entitlement approval and complete store signing and review.

## Evidence

| Check | Observed result |
| --- | --- |
| Android permission | The native disclosure could be canceled. Accepting opened Android Accessibility settings. The system required its own approval. Connecting alone left all rules off. Turning the service off in Android Settings changed the app status to off and let the previously whole-app-blocked TikTok fixture stay in the foreground. |
| Section rules | On API 35, four separate test-only native activities exposed a player or a selected navigation tab. The running accessibility service returned Reels, Shorts, Spotlight and For You fixtures to their own home screen. An ordinary screen with the same unselected navigation labels stayed open for each app. |
| Whole-app and pause | All four whole-app rules returned to Android Home. With Offrally paused each fixture's viewer stayed open. Clearing the last rule removed the enable action. |
| Platform scope | An on-device instrumentation test checked the installed accessibility service's OS bind permission, package allowlist and capability declaration. Two host tests checked package mapping and navigation-label boundaries. |
| Upgrade | Replaced the published pilot APK in place with the new debug APK. Their signing certificates matched. A saved lap verified after a pilot restart survived the upgrade. The four installed-app rules started at Allow everything. In an earlier immediate replacement, a pilot lap written less than a second before the process was killed was absent after replacement. |
| Web and multiplayer | The production URL passed a mobile-layout test for protection availability, solo timer, history and two-client room admission. The installed Android client and a web client also earned time in the same live round. |
| Apple builds | Xcode compiled both the simulator and unsigned device configuration. The iPhone simulator launched the clubhouse. The Family Controls shield requires an entitled physical device for runtime validation. |

The test APKs in qa/android render synthetic native screens. They establish end-to-end service behavior for the tested metadata. Publisher UI changes, device policies and unexposed navigation metadata can reduce section coverage. The app offers whole-app rules as a separate explicit choice. [Mobile verification](https://github.com/shiv-eshwar/offrally/actions/workflows/mobile.yml)
