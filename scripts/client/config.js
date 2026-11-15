'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { ROOT, HEX_COLOR, fail, normalizeHex, readJson, rel } = require('./util');

const CLIENTS_DIR = path.join(ROOT, 'clients');
const BASE_CONFIG_FILE = path.join(CLIENTS_DIR, 'base.config.json');

/** Folder names double as workflow ids and file names, so keep them boring. */
const CLIENT_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Reverse-DNS id that is legal both as an Android applicationId and as an iOS
 * bundle identifier: letters and digits only, every segment starting with a
 * letter. (Android forbids hyphens, iOS forbids underscores.)
 */
const APP_ID = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/i;
const VERSION = /^\d+(?:\.\d+){1,2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One URL path segment: the services call /api/<appName>/<endpoint>. */
const API_APP_NAME = /^[A-Za-z0-9_-]+$/;
const PLACEHOLDER = /REPLACE_ME/i;
/** Google Play's upper bound for versionCode. */
const MAX_BUILD_NUMBER = 2100000000;

/** The Ionic palette; each one expands to six CSS variables. */
const IONIC_COLORS = [
  'primary',
  'secondary',
  'tertiary',
  'success',
  'warning',
  'danger',
  'medium',
  'light',
  'dark',
];
/** Colour keys accepted in `theme` and in `theme.darkMode`. */
const THEME_COLORS = [...IONIC_COLORS, 'accent'];

/** Keys accepted under `assets`. */
const ASSET_OPTIONS = [
  'iconBackgroundColor',
  'splashBackgroundColor',
  'splashBackgroundColorDark',
  'iconLogoScale',
  'splashLogoScale',
];
/** Allowed range of `assets.iconLogoScale` / `assets.splashLogoScale` (1 = automatic size). */
const LOGO_SCALE_MIN = 0.25;
const LOGO_SCALE_MAX = 2;

const TOP_LEVEL_KEYS = [
  'appName',
  'appId',
  'version',
  'buildNumber',
  'api',
  'oneSignal',
  'theme',
  'assets',
  'features',
];

function clientDir(name) {
  return path.join(CLIENTS_DIR, name);
}

/** Every folder under clients/ that holds a config.json. */
function listClients() {
  if (!fs.existsSync(CLIENTS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(clientDir(name), 'config.json')))
    .sort();
}

/**
 * Source images of a client. `notificationIcon` is always a path (the file is
 * required); every other entry is `null` when the file is absent. The app icon
 * and the splash screens come from `icon` / `splash` when supplied and are
 * generated from `logo` otherwise.
 */
function clientAssets(name) {
  const dir = path.join(clientDir(name), 'assets');
  const optional = (file) => (fs.existsSync(path.join(dir, file)) ? path.join(dir, file) : null);
  return {
    dir,
    icon: optional('icon.png'),
    splash: optional('splash.png'),
    splashDark: optional('splash-dark.png'),
    logo: optional('logo.png'),
    logoDark: optional('logo-dark.png'),
    notificationIcon: path.join(dir, 'notification-icon.png'),
    iconForeground: optional('icon-foreground.png'),
    iconBackground: optional('icon-background.png'),
  };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER.test(value);
}

/**
 * Loads, merges and validates one client.
 *
 * Sources, lowest to highest priority: clients/base.config.json, the client's
 * config.json, clients/<name>/.env, real environment variables.
 *
 * @param {string} name client folder name
 * @param {object} [options]
 * @param {number|string} [options.buildNumber] overrides config.json (CI passes its build counter)
 * @param {boolean} [options.requireSecrets] treat missing API credentials as an error
 * @param {boolean} [options.checkAssets] require the source images to exist
 * @returns {{config: object, secrets: {username: string, password: string}, sources: object, warnings: string[]}}
 */
function loadClient(name, options = {}) {
  const { requireSecrets = false, checkAssets = true } = options;

  if (!CLIENT_NAME.test(name)) {
    fail(
      `"${name}" is not a valid client name. Use lowercase letters, digits and single hyphens, e.g. "acme-city-run".`,
    );
  }
  const dir = clientDir(name);
  const configFile = path.join(dir, 'config.json');
  if (!fs.existsSync(configFile)) {
    const known = listClients();
    fail(`Unknown client "${name}": ${rel(configFile)} does not exist.`, [
      known.length ? `available clients: ${known.join(', ')}` : 'no clients are defined yet',
    ]);
  }

  const base = fs.existsSync(BASE_CONFIG_FILE) ? readJson(BASE_CONFIG_FILE) : {};
  const raw = readJson(configFile);
  if (!isObject(raw)) {
    fail(`${rel(configFile)} must contain a JSON object.`);
  }

  // The client's .env is parsed into its own object rather than into
  // process.env, so one client's values can never leak into the next one.
  const envFile = path.join(dir, '.env');
  const fileEnv = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
  const env = (key) => {
    if (process.env[key]) {
      return { value: process.env[key], source: 'environment' };
    }
    if (fileEnv[key]) {
      return { value: fileEnv[key], source: rel(envFile) };
    }
    return { value: '', source: null };
  };

  const errors = [];
  const warnings = [];
  const where = rel(configFile);

  for (const key of Object.keys(raw)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      warnings.push(`${where}: unknown key "${key}" is ignored.`);
    }
  }

  // --- identity -------------------------------------------------------------
  const appName = typeof raw.appName === 'string' ? raw.appName.trim() : '';
  if (!appName || /[\r\n]/.test(appName)) {
    errors.push('appName: required, a single line of text.');
  } else if (appName.length > 30) {
    warnings.push(`appName is ${appName.length} characters; launchers truncate long names and Google Play caps titles at 30.`);
  }

  const appId = raw.appId;
  if (isPlaceholder(appId)) {
    errors.push('appId: still contains the REPLACE_ME placeholder.');
  } else if (typeof appId !== 'string' || !APP_ID.test(appId)) {
    errors.push(
      'appId: required, reverse-DNS such as "com.example.myrace" (letters and digits only, each part starting with a letter).',
    );
  }

  if (typeof raw.version !== 'string' || !VERSION.test(raw.version)) {
    errors.push('version: required, e.g. "1.0.0".');
  }

  const buildNumber = Number(options.buildNumber ?? raw.buildNumber ?? 1);
  if (!Number.isInteger(buildNumber) || buildNumber < 1 || buildNumber > MAX_BUILD_NUMBER) {
    errors.push(`buildNumber: must be a whole number between 1 and ${MAX_BUILD_NUMBER}.`);
  }

  // --- api ------------------------------------------------------------------
  const sources = {};
  const rawApi = isObject(raw.api) ? raw.api : {};
  const baseApi = isObject(base.api) ? base.api : {};
  const urlOverride = env('AUTH_APP_URL');
  let baseUrl = urlOverride.value || rawApi.baseUrl;
  sources.apiBaseUrl = urlOverride.value ? urlOverride.source : where;

  // The backend app every endpoint lives under. Most clients share the default
  // from base.config.json; a client whose backend differs sets its own.
  const appNameOverride = env('AUTH_APP_NAME');
  const apiAppName = appNameOverride.value || rawApi.appName || baseApi.appName;
  if (appNameOverride.value) {
    sources.apiAppName = appNameOverride.source;
  } else {
    sources.apiAppName = rawApi.appName ? where : rel(BASE_CONFIG_FILE);
  }
  if (isPlaceholder(apiAppName)) {
    errors.push('api.appName: still contains the REPLACE_ME placeholder.');
  } else if (typeof apiAppName !== 'string' || !API_APP_NAME.test(apiAppName)) {
    errors.push(
      'api.appName: required, the backend app name used in /api/<appName>/... (letters, digits, "_" or "-"), e.g. "mobile_app_manager".',
    );
  }
  if (isPlaceholder(baseUrl)) {
    errors.push('api.baseUrl: still contains the REPLACE_ME placeholder.');
  } else {
    let url = null;
    try {
      url = new URL(baseUrl);
    } catch {
      url = null;
    }
    if (!url || !['http:', 'https:'].includes(url.protocol) || url.search || url.hash) {
      errors.push('api.baseUrl: required, an http(s) URL without query string, e.g. "https://api.example.com/".');
    } else {
      // The app builds URLs as `${app_url}api/auth`, so the trailing slash matters.
      baseUrl = url.href.endsWith('/') ? url.href : `${url.href}/`;
      if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        warnings.push('api.baseUrl is plain http; iOS and Android block cleartext traffic by default.');
      }
    }
  }

  // --- onesignal ------------------------------------------------------------
  const oneSignalOverride = env('ONESIGNAL_APP_ID');
  const oneSignalAppId =
    oneSignalOverride.value || (isObject(raw.oneSignal) ? raw.oneSignal.appId : undefined);
  sources.oneSignalAppId = oneSignalOverride.value ? oneSignalOverride.source : where;
  if (isPlaceholder(oneSignalAppId)) {
    errors.push('oneSignal.appId: still contains the REPLACE_ME placeholder.');
  } else if (typeof oneSignalAppId !== 'string' || !UUID.test(oneSignalAppId)) {
    errors.push('oneSignal.appId: required, the UUID from the OneSignal dashboard (Settings > Keys & IDs).');
  }

  // --- theme ----------------------------------------------------------------
  const theme = resolveTheme(raw.theme, errors);

  // --- assets options -------------------------------------------------------
  if (raw.assets !== undefined && !isObject(raw.assets)) {
    errors.push('assets: must be an object.');
  }
  const assetOptions = isObject(raw.assets) ? raw.assets : {};
  for (const key of Object.keys(assetOptions)) {
    if (!ASSET_OPTIONS.includes(key)) {
      warnings.push(`${where}: unknown key "assets.${key}" is ignored. Known keys: ${ASSET_OPTIONS.join(', ')}.`);
    }
  }
  const assetColor = (key, fallback) => {
    const value = assetOptions[key];
    if (value === undefined) {
      return fallback;
    }
    if (isHex(value)) {
      return normalizeHex(value);
    }
    errors.push(`assets.${key}: must be a hex colour such as "#1a2b3c".`);
    return fallback;
  };
  const logoScale = (key) => {
    const value = assetOptions[key];
    if (value === undefined) {
      return 1;
    }
    if (typeof value === 'number' && value >= LOGO_SCALE_MIN && value <= LOGO_SCALE_MAX) {
      return value;
    }
    errors.push(
      `assets.${key}: must be a number between ${LOGO_SCALE_MIN} and ${LOGO_SCALE_MAX} (1 is the automatic size, 1.2 is 20% larger).`,
    );
    return 1;
  };
  const iconBackgroundColor = assetColor('iconBackgroundColor', '#ffffff');
  const splashBackgroundColor = assetColor('splashBackgroundColor', '#ffffff');
  // Dark mode keeps the light colour unless the client chooses one: a logo
  // drawn for a light background could vanish on a default dark one.
  const splashBackgroundColorDark = assetColor('splashBackgroundColorDark', splashBackgroundColor);
  const iconLogoScale = logoScale('iconLogoScale');
  const splashLogoScale = logoScale('splashLogoScale');

  // --- feature flags --------------------------------------------------------
  // base.config.json is the registry: a flag that is not listed there does not
  // exist, which turns a typo in a client config into an error instead of a
  // flag that is silently always off.
  const knownFlags = isObject(base.features) ? base.features : {};
  const features = { ...knownFlags };
  if (raw.features !== undefined && !isObject(raw.features)) {
    errors.push('features: must be an object of flag: true/false.');
  } else {
    for (const [flag, value] of Object.entries(raw.features || {})) {
      if (!(flag in knownFlags)) {
        errors.push(
          `features.${flag}: unknown flag. Known flags: ${Object.keys(knownFlags).join(', ') || '(none)'}. New flags are declared in ${rel(BASE_CONFIG_FILE)}.`,
        );
      } else if (typeof value !== 'boolean') {
        errors.push(`features.${flag}: must be true or false.`);
      } else {
        features[flag] = value;
      }
    }
  }

  // --- source images ----------------------------------------------------------
  if (checkAssets) {
    const assets = clientAssets(name);
    const file = (fileName) => rel(path.join(assets.dir, fileName));
    if (!fs.existsSync(assets.notificationIcon)) {
      errors.push(`missing required file ${rel(assets.notificationIcon)}`);
    }
    if (!assets.icon && !assets.logo) {
      errors.push(
        `missing ${file('icon.png')} or ${file('logo.png')}: supply the square app icon, or the client's logo (any shape) to generate it from.`,
      );
    }
    if (!assets.splash && !assets.logo) {
      errors.push(
        `missing ${file('splash.png')} or ${file('logo.png')}: supply the splash screen, or the client's logo (any shape) to generate it from.`,
      );
    }
    if (Boolean(assets.iconForeground) !== Boolean(assets.iconBackground)) {
      errors.push(
        'assets/icon-foreground.png and assets/icon-background.png form the Android adaptive icon: provide both or neither.',
      );
    }

    // Inputs that the files present make irrelevant. Probably a leftover, so say so.
    if (assets.logo && assets.icon && assets.splash) {
      warnings.push(`${file('logo.png')} is not used: icon.png and splash.png are supplied, and they take precedence.`);
    }
    if (assets.logoDark && (!assets.logo || assets.splash)) {
      warnings.push(
        `${file('logo-dark.png')} is not used: it only applies to a splash screen generated from logo.png (without splash.png).`,
      );
    }
    if (assetOptions.iconLogoScale !== undefined && assets.icon) {
      warnings.push('assets.iconLogoScale is ignored: the app icon comes from icon.png, not from logo.png.');
    }
    if (assetOptions.splashLogoScale !== undefined && assets.splash) {
      warnings.push('assets.splashLogoScale is ignored: the splash screen comes from splash.png, not from logo.png.');
    }
  }

  // --- secrets ----------------------------------------------------------------
  const username = env('AUTH_USERNAME');
  const password = env('AUTH_PASSWORD');
  const missingSecrets = [
    !username.value && 'AUTH_USERNAME',
    !password.value && 'AUTH_PASSWORD',
  ].filter(Boolean);
  if (missingSecrets.length) {
    const message = `${missingSecrets.join(' and ')} not set: the app will not be able to sign in to the API. Provide them through the environment (CI variable group) or ${rel(envFile)}.`;
    (requireSecrets ? errors : warnings).push(message);
  }

  if (errors.length) {
    fail(`Client "${name}" is not ready to build:`, errors);
  }

  return {
    config: {
      client: name,
      appName,
      appId,
      version: raw.version,
      buildNumber,
      api: { baseUrl, appName: apiAppName },
      oneSignal: { appId: oneSignalAppId },
      theme,
      notification: {
        // "#RRGGBB"; Android wants it upper-case in a couple of places.
        accentColor: (theme.notificationAccent || theme.colors.primary || '#000000').toUpperCase(),
      },
      assets: {
        iconBackgroundColor,
        splashBackgroundColor,
        splashBackgroundColorDark,
        iconLogoScale,
        splashLogoScale,
      },
      features,
    },
    secrets: { username: username.value, password: password.value },
    sources,
    warnings,
  };
}

function isHex(value) {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/**
 * Validates `theme` and returns it in a normalised shape:
 *   { colors, darkColors, variables, darkVariables, notificationAccent }
 * where colours are "#rrggbb" and only the keys the client set are present.
 */
function resolveTheme(rawTheme, errors) {
  const theme = {
    colors: {},
    darkColors: {},
    variables: {},
    darkVariables: {},
    notificationAccent: null,
  };
  if (!isObject(rawTheme)) {
    errors.push('theme: required, with at least "primary".');
    return theme;
  }

  const readColors = (source, target, prefix, nonColourKeys) => {
    for (const [key, value] of Object.entries(source)) {
      if (nonColourKeys.includes(key)) {
        continue;
      }
      if (!THEME_COLORS.includes(key)) {
        errors.push(`${prefix}${key}: unknown colour. Allowed: ${THEME_COLORS.join(', ')}.`);
      } else if (!isHex(value)) {
        errors.push(`${prefix}${key}: must be a hex colour such as "#1a2b3c".`);
      } else {
        target[key] = normalizeHex(value);
      }
    }
  };
  const readVariables = (source, target, prefix) => {
    if (source === undefined) {
      return;
    }
    if (!isObject(source)) {
      errors.push(`${prefix}: must be an object of "--css-variable": "value".`);
      return;
    }
    for (const [key, value] of Object.entries(source)) {
      if (!/^--[a-zA-Z0-9_-]+$/.test(key) || typeof value !== 'string' || /[;{}]/.test(value)) {
        errors.push(`${prefix}.${key}: expected a custom property name starting with "--" and a plain CSS value.`);
      } else {
        target[key] = value.trim();
      }
    }
  };

  readColors(rawTheme, theme.colors, 'theme.', ['darkMode', 'variables', 'notificationAccent']);
  readVariables(rawTheme.variables, theme.variables, 'theme.variables');
  if (!theme.colors.primary && !errors.some((e) => e.startsWith('theme.primary'))) {
    errors.push('theme.primary: required.');
  }

  if (rawTheme.darkMode !== undefined) {
    if (!isObject(rawTheme.darkMode)) {
      errors.push('theme.darkMode: must be an object.');
    } else {
      readColors(rawTheme.darkMode, theme.darkColors, 'theme.darkMode.', ['variables']);
      readVariables(rawTheme.darkMode.variables, theme.darkVariables, 'theme.darkMode.variables');
    }
  }

  if (rawTheme.notificationAccent !== undefined) {
    if (isHex(rawTheme.notificationAccent)) {
      theme.notificationAccent = normalizeHex(rawTheme.notificationAccent);
    } else {
      errors.push('theme.notificationAccent: must be a hex colour such as "#1a2b3c".');
    }
  }
  return theme;
}

module.exports = {
  CLIENTS_DIR,
  BASE_CONFIG_FILE,
  IONIC_COLORS,
  clientDir,
  clientAssets,
  listClients,
  loadClient,
};
