# iOS Setup — Running App

Everything in this repo that can be configured from Windows already is. This
document covers the steps that require an Apple Developer account and a Mac (or
a cloud Mac such as Codemagic).

## Identifiers used throughout

The app is white-label: every client is a separate app with its own
identifiers, all derived from `appId` in `clients/<client>/config.json` (see
the [README](../README.md)). **Sections 1 and 3 are repeated for each client.**

| Thing | Value for a client | In the committed Xcode project |
| --- | --- | --- |
| App bundle ID | `<appId>` | `gr.weallrun.runningapp` |
| Notification Service Extension bundle ID | `<appId>.OneSignalNotificationServiceExtension` | `gr.weallrun.runningapp.OneSignalNotificationServiceExtension` |
| App Group | `group.<appId>.onesignal` | `group.gr.weallrun.runningapp.onesignal` |
| Minimum iOS version | 15.0 | 15.0 |

`scripts/build-client.js` writes the client's values into the Xcode project
and both entitlements files, so those always agree with each other. What it
cannot do is register them: they must match exactly in the Apple Developer
portal too. A mismatch in the App Group is the single most common reason
rich-media notifications fail silently.

## Prerequisite: paid Apple Developer Program membership

Push notifications **cannot** work without one. A free Apple account can sideload
the app for 7 days, but the Push Notifications capability is unavailable on free
provisioning profiles — `aps-environment` is gated behind paid membership
($99/yr, <https://developer.apple.com/programs/enroll/>).

This also gates Codemagic: its iOS builds create a signing certificate and
provisioning profiles through the App Store Connect API, which needs the paid
account.

## 1. Register the App ID (per client)

Apple Developer portal → Certificates, Identifiers & Profiles → Identifiers.

1. New identifier → App IDs → App.
2. Bundle ID: the client's `<appId>` (explicit, not wildcard).
3. Enable the **Push Notifications** capability.
4. Enable **App Groups**.
5. Register a second App ID for the extension:
   `<appId>.OneSignalNotificationServiceExtension`, with App
   Groups enabled. It does *not* need Push Notifications.
6. Identifiers → App Groups → register `group.<appId>.onesignal`,
   then assign it to both App IDs above.

## 2. Create the APNs Auth Key

Keys → new key → enable **Apple Push Notifications service (APNs)**.

Download the `.p8` — **Apple allows this exactly once**. Record alongside it:

- the **Key ID** (shown on the key page)
- your **Team ID** (Membership page)

One APNs key works for every app on the team and for both sandbox and
production, so this is a one-time step.

## 3. Configure OneSignal (per client)

Each client has its own OneSignal app; its App ID goes into
`oneSignal.appId` in the client's `config.json`.

OneSignal dashboard → the client's app → Settings → Platforms → Apple iOS (APNs).

Upload the `.p8`, enter the Key ID, Team ID, and the client's bundle ID
`<appId>`.

> **Android note:** OneSignal 5.x does not need `google-services.json` in the
> repo — it fetches FCM credentials from OneSignal's backend at runtime. If
> Android push is not working, the fix is in Settings → Google Android (FCM),
> where a Firebase Service Account JSON must be uploaded. The
> `google-services.json not found ... Push Notifications won't work` warning in
> the Gradle build log is generic Capacitor scaffolding and does not apply to
> this app.

## 4. Add the Notification Service Extension target (Xcode, one-time)

The extension's source files are already committed at
`ios/App/OneSignalNotificationServiceExtension/`. They just need a target to
belong to, which must be created in Xcode.

Do this once, on the base project: run `npm run client:reset` first so the
project carries the base identifiers from the table above, and commit the
result in that state. From then on `scripts/build-client.js` renames the
extension together with the app for every client: it rewrites each bundle ID
that starts with the app's, keeping the
`.OneSignalNotificationServiceExtension` suffix, and keeps the extension's
version and build number equal to the app's.

1. Open `ios/App/App.xcodeproj`.
2. File → New → Target → **Notification Service Extension**.
3. Product Name: `OneSignalNotificationServiceExtension`. Language: Swift.
   Set the embed target to `App`. **Do not activate the scheme** when prompted.
4. Set the new target's **Minimum Deployment** to iOS 15.0 to match the app.
5. Xcode generates its own `NotificationService.swift` and `Info.plist`.
   Delete both, then add the committed files from
   `ios/App/OneSignalNotificationServiceExtension/` to the target instead
   (File → Add Files, with only the extension target checked).
6. Target → Build Settings → Code Signing Entitlements →
   `OneSignalNotificationServiceExtension/OneSignalNotificationServiceExtension.entitlements`.
7. Target → General → Frameworks and Libraries → add **OneSignalExtension**
   (from the `OneSignal-XCFramework` package already resolved via
   `ios/App/CapApp-SPM`).
8. Both targets → Signing & Capabilities → confirm **App Groups** is present and
   `group.gr.weallrun.runningapp.onesignal` is ticked.

Verify: send a OneSignal test push with an image attached. If the image renders,
the extension is wired correctly. If only text appears, re-check steps 6–8.

## 5. Signing

`project.pbxproj` uses `CODE_SIGN_STYLE = Automatic` with no `DEVELOPMENT_TEAM`
set. On the first Xcode open, select the team under Signing & Capabilities for
both targets; Xcode writes `DEVELOPMENT_TEAM` into the project.

On Codemagic none of that is needed: the workflow fetches (or creates) the
distribution certificate and provisioning profiles for the client's bundle IDs
and applies them to the project with `xcode-project use-profiles`.

## 6. Codemagic

`codemagic.yaml` has an iOS workflow per client. It runs
`node scripts/build-client.js --platform ios`, which brands the project for
`CLIENT_NAME`, builds the web app and runs `npx cap sync ios`, then signs,
archives and uploads the IPA to App Store Connect, where TestFlight offers it
to internal testers. The build number is one above the highest one already in
App Store Connect. The variables it needs come from the client's environment
variable group in Codemagic (listed in the [README](../README.md#codemagic)):

- `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`,
  `APP_STORE_CONNECT_PRIVATE_KEY`, `CERTIFICATE_PRIVATE_KEY` for signing, the
  build-number lookup and the upload; the API key needs the **App Manager** role
- `AUTH_USERNAME`, `AUTH_PASSWORD` for the app's API login; **the build fails
  without them**, because they are compiled into the gitignored
  `src/app/secrets.ts`

The API URL and the OneSignal App ID are not secrets and live in the client's
`config.json`.

The upload needs the client's app record to exist in App Store Connect (My
Apps → New App, with the bundle ID from section 1). The workflow never submits
a build for App Store review; that stays a manual step in App Store Connect.

The `cap sync ios` step matters for a second reason: it regenerates
`ios/App/CapApp-SPM/Package.swift`. The committed copy was generated on
Windows and contains backslash paths that SwiftPM on macOS cannot resolve. The
sync fixes it automatically — but a build that skips sync will fail at package
resolution.

The signing step fetches profiles for the client's bundle ID and for IDs that
extend it, so once the extension target from section 4 exists, its App ID from
section 1 must be registered too or signing fails for that target.

## 7. Before shipping to TestFlight or the App Store

Change `aps-environment` in `ios/App/App/App.entitlements` from `development` to
`production`. Development tokens are rejected by the production APNs gateway,
which manifests as "notification sent" in OneSignal but nothing on the device.

## Verification checklist

Once a build is on a device:

- [ ] App launches without crashing (proves the entitlements are valid).
- [ ] Settings → Notifications → Enabled ⇒ system permission prompt appears once.
- [ ] Device appears as a subscriber in the OneSignal dashboard within seconds.
- [ ] Test push arrives in foreground, background, and force-quit states.
- [ ] Push with an image renders rich media (proves the extension works).
- [ ] Push with `additionalData.deeplink` = a valid ID opens that notification.
- [ ] Push with a non-numeric `deeplink` opens the list instead of a blank view.
- [ ] Selfie feature opens the camera instead of crashing, and sharing attaches
      the photo.
- [ ] Toggling notifications off shows the subscriber as opted-out.
- [ ] Force-quit and relaunch leaves the subscriber opted-in (no opt-out flap).
