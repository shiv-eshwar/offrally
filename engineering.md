# Engineering and delivery

## Build targets

Use Node 22+, npm ci, npm test and npm run sync. Android uses JDK 21, compile SDK 35 and the Gradle wrapper. The app supports API 23+. The iOS project uses Swift Package Manager and targets iOS 16+ for individual Screen Time authorization. Build each target after syncing the first-party UI. Native rules stay independent of the duel service.

GitHub Actions runs the Android unit tests and creates a debug APK. Its macOS job builds for Simulator, compiles the Release configuration for a generic physical iPhone without signing, then boots a simulator and captures the clubhouse. A simulator cannot exercise Screen Time enforcement.

## Android regression workflow

Use a disposable API 35 emulator with Android debugging. The standalone project qa/android builds seven test-only native apps. Six use catalog package IDs and one exercises the installed-app picker. The fixtures have no network permission. Install them only on an empty emulator. A publisher-signed app must have a separate device for its acceptance check.

1. Build Offrally with `cd android && ./gradlew :app:assembleDebug`. Build the fixtures from the repository root with `android/gradlew -p qa/android assembleDebug`. Install the Offrally debug APK and each fixture debug APK with adb. Android requires the -t option for the fixture APKs.
2. In the installed Offrally build, open Protect, agree to the local disclosure and connect Offrally in Android Accessibility settings. Return to the app.
3. Set ANDROID_SERIAL to the disposable emulator and forward its Offrally debug WebView DevTools socket to localhost port 19330. Run `node scripts/android-smoke.mjs`. The script checks the emulator, application identities and test-only flags before exercising active rules. It taps the covered tabs and their neighbors, exercises direct viewer entry, checks stable whole-app shields, and verifies Home, pause and rule removal.
4. On physical Android hardware, exercise each supported publisher app from the launcher, a notification and a deep link. Check ordinary messages, long videos, unselected tabs and supported regional variants. Verify loss of permission, selection persistence and a return from a changed layout.

## iOS release checks

A physical install needs the owner's Apple Developer team, the Family Controls entitlement in its provisioning profile and Screen Time permission on the device. Distribution through TestFlight or the App Store also needs Apple's Family Controls distribution approval. On an entitled physical device, choose individual apps, save, enable the shield, open the selected apps from Home, pause protection and confirm access returns. Verify authorization revocation and a relaunch. [Apple's Family Controls documentation](https://developer.apple.com/documentation/familycontrols)

## Android distribution

The GitHub APK is debug-signed for evaluation. The unsigned Android App Bundle can be signed with the owner's Play upload key. The app declares its AccessibilityService as a non-accessibility-tool service, explains its on-device inspection and actions before opening Settings, and accepts a cancellation. Google Play distribution requires the publisher's Accessibility API declaration, disclosure evidence and review. [Google Play AccessibilityService policy](https://support.google.com/googleplay/android-developer/answer/10964491)

## Game service

The mobile app calls the Vercel round endpoint. The web edition calls its own origin. The dedicated Supabase project hosts the SQL migrations. Deploy migrations to that project with supabase db push. Store the restricted gateway login's pooled TLS connection URI as the sensitive Vercel production variable CLUB_DATABASE_URL. The function disables prepared statements and sets the actor inside its transaction. Keep private credentials outside the repository and client environment.

Use `CLUB_TEST_URL=https://offrally.vercel.app node scripts/ui-smoke.mjs` for the two-client UI check with Chrome. The API smoke and deadline settlement checks live alongside it. Each creates a private timed test room.
