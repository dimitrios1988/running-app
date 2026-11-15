'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, fail, rel, remove, writeIfChanged } = require('./util');

const IOS_APP_DIR = path.join(ROOT, 'ios', 'App');
const PBXPROJ = path.join(IOS_APP_DIR, 'App.xcodeproj', 'project.pbxproj');
const ENTITLEMENTS = [
  path.join(IOS_APP_DIR, 'App', 'App.entitlements'),
  path.join(
    IOS_APP_DIR,
    'OneSignalNotificationServiceExtension',
    'OneSignalNotificationServiceExtension.entitlements',
  ),
];
const ASSET_CATALOG = path.join(IOS_APP_DIR, 'App', 'Assets.xcassets');
const ICON_SET = path.join(ASSET_CATALOG, 'AppIcon.appiconset');
const SPLASH_SET = path.join(ASSET_CATALOG, 'Splash.imageset');

/**
 * The identity committed in the Xcode project. `reset()` writes it back with
 * the same patcher that applies a client, instead of `git checkout`, so any
 * unrelated uncommitted work in project.pbxproj is left alone.
 */
const BASE_IDENTITY = {
  appId: 'gr.weallrun.runningapp',
  appName: 'Running App',
  version: '1.0',
  buildNumber: 1,
};

function exists() {
  return fs.existsSync(PBXPROJ);
}

/** A double-quoted pbxproj string. */
function pbxQuote(text) {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Bundle id of the app target: the one build configuration that points at
 * App/Info.plist. Read from the file rather than assumed, so the patch works
 * whichever client the project currently carries.
 */
function currentAppId(pbx) {
  for (const block of pbx.match(/buildSettings = \{[\s\S]*?\};/g) || []) {
    if (/INFOPLIST_FILE = "?App\/Info\.plist"?;/.test(block)) {
      const match = block.match(/PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/);
      if (match) {
        return match[1];
      }
    }
  }
  return fail(`Could not find the app target's PRODUCT_BUNDLE_IDENTIFIER in ${rel(PBXPROJ)}.`);
}

function patchPbxproj(pbx, identity) {
  const current = currentAppId(pbx);
  if (!/APP_DISPLAY_NAME = /.test(pbx)) {
    fail(
      `${rel(PBXPROJ)} has no APP_DISPLAY_NAME build setting. Info.plist takes the display name from it; add it back to the App target's Debug and Release configurations.`,
    );
  }

  return (
    pbx
      // The app target gets the new id; targets nested under it (the OneSignal
      // notification service extension) keep their suffix.
      .replace(/(PRODUCT_BUNDLE_IDENTIFIER = )"?([^";]+)"?;/g, (line, key, value) => {
        if (value === current) {
          return `${key}${identity.appId};`;
        }
        if (value.startsWith(`${current}.`)) {
          return `${key}${identity.appId}${value.slice(current.length)};`;
        }
        return line;
      })
      .replace(
        /(APP_DISPLAY_NAME = )(?:"(?:[^"\\]|\\.)*"|[^;]+);/g,
        (line, key) => `${key}${pbxQuote(identity.appName)};`,
      )
      // Extensions must carry the same version and build number as their app.
      .replace(/(MARKETING_VERSION = )[^;]+;/g, (line, key) => `${key}${identity.version};`)
      .replace(/(CURRENT_PROJECT_VERSION = )[^;]+;/g, (line, key) => `${key}${identity.buildNumber};`)
  );
}

/** OneSignal shares data with its extension through `group.<bundle id>.onesignal`. */
function patchEntitlements(xml, identity) {
  return xml.replace(
    /<string>group\.[^<]*\.onesignal<\/string>/g,
    `<string>group.${identity.appId}.onesignal</string>`,
  );
}

/**
 * Rewrites bundle id, display name, version and app group in the Xcode project.
 * These are tracked files; `reset()` restores them.
 */
function applyIdentity(identity) {
  const changed = [];
  if (writeIfChanged(PBXPROJ, patchPbxproj(fs.readFileSync(PBXPROJ, 'utf8'), identity))) {
    changed.push(PBXPROJ);
  }
  for (const file of ENTITLEMENTS) {
    if (
      fs.existsSync(file) &&
      writeIfChanged(file, patchEntitlements(fs.readFileSync(file, 'utf8'), identity))
    ) {
      changed.push(file);
    }
  }
  return changed;
}

function reset() {
  return applyIdentity(BASE_IDENTITY);
}

/** Deletes the generated app icon and splash images (their Contents.json stays). */
function cleanAssets() {
  for (const dir of [ICON_SET, SPLASH_SET]) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const file of fs.readdirSync(dir)) {
      if (file.toLowerCase().endsWith('.png')) {
        remove(path.join(dir, file));
      }
    }
  }
}

module.exports = {
  PBXPROJ,
  ICON_SET,
  SPLASH_SET,
  BASE_IDENTITY,
  exists,
  patchPbxproj,
  patchEntitlements,
  applyIdentity,
  reset,
  cleanAssets,
};
