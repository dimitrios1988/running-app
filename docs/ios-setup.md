# iOS Setup — Running App

Everything in this repo that can be configured from Windows already is. This
document covers the steps that require an Apple Developer account and a Mac (or
a cloud Mac such as Ionic Appflow).

## Identifiers used throughout

| Thing | Value |
| --- | --- |
| App bundle ID | `gr.weallrun.runningapp` |
| Notification Service Extension bundle ID | `gr.weallrun.runningapp.OneSignalNotificationServiceExtension` |
| App Group | `group.gr.weallrun.runningapp.onesignal` |
| Minimum iOS version | 15.0 |

These must match exactly across the Apple Developer portal, the Xcode project,
and the entitlements files. A mismatch in the App Group is the single most
common reason rich-media notifications fail silently.

## Prerequisite: paid Apple Developer Program membership

Push notifications **cannot** work without one. A free Apple account can sideload
the app for 7 days, but the Push Notifications capability is unavailable on free
provisioning profiles — `aps-environment` is gated behind paid membership
($99/yr, <https://developer.apple.com/programs/enroll/>).

This also gates Appflow: its iOS builds require a signing certificate and
provisioning profile, both of which need the paid account.

## 1. Register the App ID

Apple Developer portal → Certificates, Identifiers & Profiles → Identifiers.

1. New identifier → App IDs → App.
2. Bundle ID: `gr.weallrun.runningapp` (explicit, not wildcard).
3. Enable the **Push Notifications** capability.
4. Enable **App Groups**.
5. Register a second App ID for the extension:
   `gr.weallrun.runningapp.OneSignalNotificationServiceExtension`, with App
   Groups enabled. It does *not* need Push Notifications.
6. Identifiers → App Groups → register `group.gr.weallrun.runningapp.onesignal`,
   then assign it to both App IDs above.

## 2. Create the APNs Auth Key

Keys → new key → enable **Apple Push Notifications service (APNs)**.

Download the `.p8` — **Apple allows this exactly once**. Record alongside it:

- the **Key ID** (shown on the key page)
- your **Team ID** (Membership page)

One APNs key works for every app on the team and for both sandbox and
production, so this is a one-time step.

## 3. Configure OneSignal

OneSignal dashboard → your app → Settings → Platforms → Apple iOS (APNs).

Upload the `.p8`, enter the Key ID, Team ID, and bundle ID
`gr.weallrun.runningapp`.

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

## 6. Ionic Appflow

The `prebuild` script (`scripts/create-secrets-file.js`) generates
`src/app/secrets.ts` from environment variables, and that file is gitignored —
**the build fails without these configured** as Appflow environment secrets:

- `ONESIGNAL_APP_ID`
- `AUTH_APP_URL`
- `AUTH_APP_NAME`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`

Appflow runs `npx cap sync ios`, which regenerates
`ios/App/CapApp-SPM/Package.swift`. This matters: the committed copy was
generated on Windows and contains backslash paths that SwiftPM on macOS cannot
resolve. The sync fixes it automatically — but a build that skips sync will
fail at package resolution.

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
