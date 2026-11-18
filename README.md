# Running App (WeAllRun white-label)

One Capacitor + Angular codebase that ships as several branded apps. Everything
that differs between clients lives in `clients/<client>/`; one script turns the
base app into that client's app, locally and on Codemagic.

```
clients/
  base.config.json            defaults shared by all clients (feature flags, API app name)
  demo/                       example client, also the default for local development
    config.json               app name, app id, version, API URL, theme, artwork colours, feature flags
    .env.example              template for the client's local secrets
    assets/                   artwork, see "Artwork" below
      icon.png                square app icon, 1024x1024
      splash.png              2732x2732 splash screen
      splash-dark.png         optional dark-mode splash
      notification-icon.png   Android status-bar icon: white shape on transparent, 96px or larger
  segas-athina-half-marathon/
  segas-athens-authentic-marathon/
```

Instead of `icon.png` and `splash.png`, a client can supply just its logo,
in any shape, as `logo.png`: both are then generated from it.

## Quick start

```bash
npm ci
npm start                          # browser, as the "demo" client
npm run client:build -- demo       # prepare the Android project (once after cloning)
```

The native projects carry no branding in git: app name, icons and splash
screens are generated. After a fresh clone, run `client:build` once before
opening Android Studio or Xcode, otherwise the Android build stops with
"No client has been applied".

## Building for a client

```bash
npm run client:list                                  # which clients exist
npm run client:build -- segas-athina-half-marathon   # config + icons + ng build + cap sync
npm run client:apply -- segas-athina-half-marathon   # the same without ng build / cap sync
npm run client:reset                                 # remove everything generated
```

Then build the native app as usual (Android Studio, or `cd android && ./gradlew assembleDebug`).

The client can also come from the environment: `CLIENT_NAME=demo npm run client:build`.
Options go after the client name (`node scripts/build-client.js --help` lists them):

| Option | Meaning |
| --- | --- |
| `--platform android\|ios\|all\|web` | Which native project to prepare. Default: Android, plus iOS when run on a Mac. `web` touches no native project (handy for `npm start` as another client). |
| `--no-build` | Skip `ng build` and `cap sync` (this is what `client:apply` does). |
| `--skip-assets` | Reuse the icons and splash screens already generated. Refused unless they were made from this client's current artwork and settings. |
| `--build-number <n>` | Android `versionCode` / iOS build number. Overrides `buildNumber` in `config.json`. |
| `--configuration <name>` | Angular build configuration (default `production`). |

The script is safe to run repeatedly and to switch from any client to any
other: every run deletes the previous client's images first and regenerates
all outputs from the client folder.

### What it writes

Everything here is gitignored, so `git status` stays clean after a client build.

| Output | Source in `config.json` / `assets/` |
| --- | --- |
| `src/environments/client.generated.ts` | whole config, including feature flags |
| `src/theme/client.generated.scss` | `theme` (loaded after `src/theme/variables.scss`) |
| `src/app/secrets.ts` | `api.baseUrl`, `oneSignal.appId`, credentials from the environment |
| `.client/` | state: active client, Android identity, and in `.client/assets/` the app icon and splash images actually used, generated ones included |
| `android/app/src/main/res/values/strings.xml` | `appName`, `appId`, notification accent colour |
| `android/.../res/values*/splash_background.xml` | `assets.splashBackgroundColor`, `assets.splashBackgroundColorDark` |
| `android/.../res/mipmap-*`, `drawable*/splash.png` | app icon and splash images via `@capacitor/assets` |
| `android/.../res/drawable*/splash.xml`, `drawable-nodpi/splash_logo*.png` | a splash generated from `logo.png` (replaces the `splash.png` images) |
| `android/.../res/drawable*-nodpi/splash_icon.png` or `values*/splash_icon.xml` | the icon of the Android 12+ launch screen: the logo, or the app icon |
| `android/.../res/drawable-*/ic_stat_onesignal_default.png` | `notification-icon.png`, resized to 24/36/48/72/96 px |
| `ios/App/App/Assets.xcassets/**/*.png` | app icon and splash images |

`capacitor.config.ts` and `android/app/build.gradle` read the app id, name and
version from `.client/`, and the launch theme in `android/.../values/styles.xml`
refers to the generated splash colour and icon, so none of them is edited.

**iOS is the one exception.** The bundle id, display name, version and app
group are patched in place in `ios/App/App.xcodeproj/project.pbxproj` and the
two `.entitlements` files, because Codemagic's signing tools need literal
values there. That only happens when iOS is prepared (`--platform ios|all`, or
on a Mac). `npm run client:reset` puts the base values back; do that before
committing changes to the Xcode project.

Icons generated with the WebNative extension from `resources/` land in the same
places; the next `client:build` simply replaces them.

## Adding a client

1. Copy `clients/demo` to `clients/<new-client>` (lowercase letters, digits, hyphens).
2. Edit `config.json`:

   | Key | Notes |
   | --- | --- |
   | `appName` | Name under the icon. |
   | `appId` | Android applicationId and iOS bundle id, e.g. `gr.weallrun.cityrun`. Letters and digits only. Permanent once published. |
   | `version`, `buildNumber` | Store version, and the build number for local builds and for a store's very first build (after that Codemagic takes the next number from the store). |
   | `api.baseUrl` | The client's backend. |
   | `api.appName` | Backend app name in the API path, `/api/<appName>/...`. Optional: defaults to `mobile_app_manager` from `clients/base.config.json`; set it only if this client's backend differs. |
   | `oneSignal.appId` | From the OneSignal dashboard. |
   | `theme` | `primary` is required. Optional: `secondary`, `tertiary`, `success`, `warning`, `danger`, `medium`, `light`, `dark`, `accent`. Shade, tint and contrast colours are derived. `darkMode: { ... }` overrides colours for dark mode (otherwise the light value is reused). `notificationAccent` defaults to `primary`. `variables` / `darkMode.variables` set any other CSS custom property. |
   | `assets.iconBackgroundColor` | Background of the app icon: behind `icon.png` in the Android adaptive icon, or behind the logo when the icon is generated (default white). |
   | `assets.splashBackgroundColor`, `assets.splashBackgroundColorDark` | Background of a splash generated from the logo, and of the launch screen Android 12+ always show (default white; dark mode keeps the light colour unless set). With a supplied `splash.png`, set them to its background. |
   | `assets.iconLogoScale`, `assets.splashLogoScale` | Size of the logo on the generated icon / splash relative to the automatic size: `1.2` is 20% larger (0.25 to 2, default 1). Making it larger stops where the logo would be cut off; see [Artwork](#artwork). |
   | `features` | Feature flags, see below. |

3. Replace the images in `assets/` (see [Artwork](#artwork)): put the client's
   logo in `logo.png` and delete the demo's `icon.png` and `splash.png`, or
   replace those with finished artwork. The build warns while an image is still
   the demo placeholder.
4. Put the API credentials in `clients/<new-client>/.env` (see `clients/demo/.env.example`). It is gitignored.
5. `npm run client:build -- <new-client>`. The script reports anything missing or
   malformed, including values still set to `REPLACE_ME`.
6. Add the client's two workflows to `codemagic.yaml` (below).

## Artwork

The app icon and the splash screen come either from finished artwork or from
the client's logo:

| File | Used for |
| --- | --- |
| `logo.png` | The logo, any shape: a PNG with a transparent background, about 1000 px wide or more. The app icon and the splash screen are generated from it unless the two files below are supplied. |
| `icon.png` | Square app icon, 1024x1024 or larger. Takes precedence over `logo.png`. |
| `splash.png` | Splash screen, 2732x2732 or larger, with its content in the middle (devices crop the edges). Takes precedence over `logo.png`. |
| `splash-dark.png` | Optional dark-mode version of `splash.png`. |
| `logo-dark.png` | Optional logo for dark backgrounds (e.g. a white version), for a dark-mode splash generated from the logo. |
| `notification-icon.png` | Always required. Android's status-bar icon: a white silhouette on transparent, 96 px or larger, ideally square. A wordmark is unreadable at 24 px; use the symbol or an initial. |
| `icon-foreground.png` + `icon-background.png` | Optional pair: explicit Android adaptive-icon layers. |

The two sources can be mixed: `icon.png` with the client's symbol, and
`logo.png` with the full wordmark for the splash screen, is often the best
combination for a wide logo.

What the build makes from `logo.png` (it first crops away transparent margins):

- **App icon**: the logo centred on `assets.iconBackgroundColor`, sized to fit
  inside the circle every Android launcher shows (iOS only rounds the corners).
- **Splash screen**: the logo centred on `assets.splashBackgroundColor`, inside
  the middle of the image that every phone and tablet shows (an iPhone in
  portrait shows only 46% of its width). A square logo gets about a third of a
  phone's width, a wide wordmark up to 70%.
- **Dark-mode splash**: `logo-dark.png` (or `logo.png`) on
  `assets.splashBackgroundColorDark`.

The images actually used land in `.client/assets/` (`icon.png`, `splash.png`,
`splash-dark.png`) for a look before building. The build stops when the logo is
too small for them, and warns when it is very wide, when it has no transparent
background, or when most of it is close to the colour behind it.

**How far the scales go.** `assets.iconLogoScale` and `assets.splashLogoScale`
can always shrink the logo, but they only enlarge it while it still fits:

| Where | Limit | Typical largest scale |
| --- | --- | --- |
| App icon | The logo's outline stays inside the circle every Android launcher shows (one image serves iOS too). | 1.15 for a logo that fills its corners, up to 1.6 for a round one |
| Splash (iOS, Android 8–11) | The logo stays inside the part of the image every device shows. | 1.3 to 1.5 for a wide wordmark, about 2.6 for a square logo |
| Launch screen on Android 12+ | Android shows the logo inside a 192dp circle, whatever the scale. | about 1.1 to 1.6, depending on the logo's shape |

The build log shows, for each image, how large the logo is drawn and the
largest scale that fits that logo ("fits up to ..."); a larger value is reduced
to it with a warning. When comparing sizes on a device, uninstall the app
first: Android launchers and iOS keep showing cached icons and launch screens.

**Android launch screens.** Android 12 and later ignore the splash image and
always show their own launch screen: an icon centred on
`assets.splashBackgroundColor` (`...Dark` in dark mode). With a splash generated
from the logo, that icon is the logo; with a supplied `splash.png` it is the app
icon. Android 8 to 11 show the splash: a supplied `splash.png` is stretched to
the screen's shape, a generated one is drawn undistorted.

## Feature flags

Flags are fixed at build time. `clients/base.config.json` declares every flag
with its default; a client overrides it under `features` in its `config.json`.
A flag that is not declared in the base file is rejected.

| Flag | Effect |
| --- | --- |
| `myRace` | Shows the "My Registration" tab and enables its sign-in pages. |

```ts
import { FeatureFlagsService } from './client/feature-flags.service';

private readonly flags = inject(FeatureFlagsService);
if (this.flags.isEnabled('myRace')) { ... }
```

`isEnabled()` only accepts declared flag names, so a typo is a compile error.
To keep a route unreachable when its feature is off, add
`canActivate: [featureFlagGuard('myRace')]` (`src/app/client/feature-flag.guard.ts`).

To add a flag: declare it in `clients/base.config.json`, then use it.

## Codemagic

`codemagic.yaml` has one Android and one iOS workflow per client. Shared steps
are defined once under `definitions`; a client's workflows set the name,
`CLIENT_NAME`, the variable group and where its builds are published. Builds
are started manually.

Each build:

1. stops if anything would publish to production (see below);
2. asks the store for its latest version code / build number and takes the next one;
3. runs `scripts/build-client.js` for the client, then signs and builds;
4. uploads the result: the **AAB to Google Play's internal testing track as a
   draft**, the **IPA to App Store Connect**, where TestFlight offers it to
   your internal testers.

### Variables

Create one environment variable group per client (named in the workflow, e.g.
`segas_athina_half_marathon`) with these variables, all marked secret:

| Variable | Purpose |
| --- | --- |
| `CM_KEYSTORE` | Android upload keystore, base64-encoded (`base64 -i upload.jks`, or in PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes('upload.jks'))`) |
| `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD` | Keystore details |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS` | JSON key of the Google Play service account: used to read the latest version code and to upload |
| `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_PRIVATE_KEY` | App Store Connect API key (the `.p8` contents), role App Manager: used for signing, the latest build number and the upload |
| `CERTIFICATE_PRIVATE_KEY` | RSA private key used for the iOS distribution certificate |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | API credentials compiled into the app |

Optional: `AUTH_APP_URL`, `AUTH_APP_NAME` and `ONESIGNAL_APP_ID` override the
values from `config.json`; `APP_STORE_APPLE_ID` (the app's numeric Apple ID)
skips the lookup by bundle id. Nothing secret is stored in the repository.

### Publishing settings per client

Every client workflow has its own `publishing:` block that starts from the
shared default and can override single keys:

```yaml
  acme-city-run-android:
    publishing:
      google_play:
        <<: *google_play
        track: alpha              # default: internal
        submit_as_draft: false    # default: true

  acme-city-run-ios:
    publishing:
      app_store_connect:
        <<: *app_store_connect
        submit_to_testflight: true   # default: false (upload only)
        beta_groups:
          - Acme Testers
```

- `submit_as_draft`: Google Play only accepts draft releases for an app that
  has never been released, so it starts as `true` and a person rolls the draft
  out in Play Console. Set it to `false` once the app's first release is live.
- `beta_groups`: external TestFlight groups. They need
  `submit_to_testflight: true`, which sends each build to Apple's beta review.

### Build numbers

The Android version code and the iOS build number are one above the highest
number already in Google Play (any track) or App Store Connect (TestFlight and
App Store, any version). When the store has none yet, or the lookup fails, the
build uses `buildNumber` from the client's `config.json` and says so in its log.

### Production is manual

Nothing is published to production from Codemagic. Promote a release to
production in Play Console, and submit a TestFlight build for App Store review
in App Store Connect, by hand. The first step of every workflow fails the build
if `codemagic.yaml` contains `track: production`, a `release_promotion` block
or `submit_to_app_store: true`, or if the `GOOGLE_PLAY_TRACK` variable is set
to `production`.

### One-time store setup per client

- **Google Play**: create the app in Play Console and give the service account
  release permission for it. Google does not accept the very first upload
  through its API: run the Android workflow once (its upload step fails, which
  is expected), download the `.aab` from the build's artifacts and upload it in
  Play Console yourself. Later builds upload themselves.
- **App Store Connect**: create the app record with the client's bundle id.
  Register the App ID, extension and app group in the Apple Developer portal
  first: see [docs/ios-setup.md](docs/ios-setup.md).

### Adding a client's workflows

Copy an existing pair of workflows at the bottom of `codemagic.yaml` and change
the workflow ids, `name`, the group and `CLIENT_NAME`.
