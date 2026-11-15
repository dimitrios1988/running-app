#!/usr/bin/env node
'use strict';

/**
 * White-label build: turns the base app into one client's app.
 *
 * Reads clients/<client>/ and writes generated, gitignored files into the web
 * and native projects (see README.md for the full list), then builds the web
 * app and syncs Capacitor. Safe to run as often as you like and for any client
 * in any order: every output is derived from the client folder alone.
 */

const fs = require('fs');
const path = require('path');
const android = require('./client/android');
const assets = require('./client/assets');
const ios = require('./client/ios');
const web = require('./client/web');
const { clientDir, listClients, loadClient } = require('./client/config');
const { BuildError, STATE_DIR, fail, log, readJson, rel, remove, runBin } = require('./client/util');

const USAGE = `
Usage: node scripts/build-client.js [client] [options]

  client                    Folder name under clients/. Falls back to the
                            CLIENT_NAME environment variable.

Options:
  --platform <name>         android | ios | all | web
                            Default: android, plus ios when run on macOS.
                            "web" prepares no native project at all.
  --no-build                Only generate config and images; skip "ng build"
                            and "cap sync".
  --skip-assets             Do not regenerate icons and splash screens (only
                            allowed if they were generated from this client's
                            current artwork and settings).
  --build-number <n>        Android versionCode / iOS build number. Overrides
                            "buildNumber" in config.json; CI passes its counter.
  --configuration <name>    Angular build configuration (default: production).

Other modes:
  --list                    List the available clients.
  --reset                   Delete everything generated and restore the base
                            identity in the iOS project.
  --ensure                  Make sure the web config exists (re-applies the
                            active client, or "demo" on a fresh clone). Used by
                            the npm prestart / prebuild hooks.
  --help                    Show this text.
`;

const PLATFORMS = ['android', 'ios'];

function parseArgs(argv) {
  const args = {
    mode: 'build',
    client: null,
    platform: null,
    build: true,
    assets: true,
    buildNumber: undefined,
    configuration: 'production',
  };
  const queue = [...argv];
  while (queue.length) {
    let arg = queue.shift();
    // Accept both "--key value" and "--key=value".
    if (arg.startsWith('--') && arg.includes('=')) {
      const index = arg.indexOf('=');
      queue.unshift(arg.slice(index + 1));
      arg = arg.slice(0, index);
    }
    const value = () => {
      const next = queue.shift();
      if (next === undefined || next.startsWith('--')) {
        fail(`${arg} needs a value.`);
      }
      return next;
    };
    switch (arg) {
      case '--help':
      case '-h':
        args.mode = 'help';
        break;
      case '--list':
        args.mode = 'list';
        break;
      case '--reset':
        args.mode = 'reset';
        break;
      case '--ensure':
        args.mode = 'ensure';
        break;
      case '--no-build':
        args.build = false;
        break;
      case '--skip-assets':
        args.assets = false;
        break;
      case '--platform':
        args.platform = value();
        break;
      case '--build-number':
        args.buildNumber = value();
        break;
      case '--configuration':
        args.configuration = value();
        break;
      default:
        if (arg.startsWith('-')) {
          fail(`Unknown option "${arg}".`, ['run with --help for usage']);
        }
        if (args.client) {
          fail(`Only one client can be built at a time (got "${args.client}" and "${arg}").`);
        }
        args.client = arg;
    }
  }
  return args;
}

/** Which native projects to prepare. */
function resolvePlatforms(requested) {
  const present = { android: android.exists(), ios: ios.exists() };
  let wanted;
  if (requested === null) {
    // iOS can only be built on a Mac, so only prepare it there by default.
    wanted = process.platform === 'darwin' ? PLATFORMS : ['android'];
    return wanted.filter((platform) => present[platform]);
  }
  if (requested === 'web') {
    return [];
  }
  if (requested === 'all') {
    wanted = PLATFORMS;
  } else if (PLATFORMS.includes(requested)) {
    wanted = [requested];
  } else {
    fail(`--platform must be android, ios, all or web (got "${requested}").`);
  }
  const missing = wanted.filter((platform) => !present[platform]);
  if (missing.length) {
    fail(`This repository has no ${missing.join(' / ')} project.`);
  }
  return wanted;
}

function report(changedFiles) {
  if (changedFiles.length) {
    changedFiles.forEach((file) => log.info(`wrote ${rel(file)}`));
  } else {
    log.info('already up to date');
  }
}

function isCi() {
  const value = process.env.CI;
  return Boolean(value) && value !== 'false' && value !== '0';
}

async function build(args) {
  const name = args.client || process.env.CLIENT_NAME;
  if (!name) {
    fail('No client given. Pass the client name as an argument or set CLIENT_NAME.', [
      `available clients: ${listClients().join(', ') || '(none)'}`,
    ]);
  }
  const platforms = resolvePlatforms(args.platform);
  const generateAssets = args.assets && platforms.length > 0;

  log.step(`Client "${name}" for ${platforms.length ? platforms.join(' + ') : 'web only'}`);
  const { config, secrets, sources, warnings } = loadClient(name, {
    buildNumber: args.buildNumber,
    // A CI build without API credentials would produce an app that cannot log in.
    requireSecrets: isCi(),
    checkAssets: platforms.length > 0,
  });
  let artwork = null;
  if (generateAssets) {
    artwork = await assets.inspect(config);
    warnings.push(...artwork.warnings);
  } else if (platforms.length) {
    assets.assertGeneratedFor(config, platforms);
  }
  log.info(`${config.appName}  (${config.appId})  ${config.version} build ${config.buildNumber}`);
  log.info(`API        ${config.api.baseUrl}  [${sources.apiBaseUrl}]`);
  log.info(`API app    ${config.api.appName}  [${sources.apiAppName}]`);
  log.info(`OneSignal  ${config.oneSignal.appId}  [${sources.oneSignalAppId}]`);
  warnings.forEach(log.warn);

  log.step('Web config (theme, feature flags, API settings)');
  report(web.apply(config, secrets));

  if (platforms.includes('android')) {
    log.step('Android project');
    report(android.applyIdentity(config));
  }
  if (platforms.includes('ios')) {
    log.step('iOS project');
    report(ios.applyIdentity(config));
  }

  if (generateAssets) {
    log.step('Icons, splash screens and notification icons');
    await assets.generate(config, platforms, artwork.plan);
  }

  if (args.build) {
    log.step('Angular build');
    runBin('@angular/cli', 'ng', ['build', '--configuration', args.configuration]);
    for (const platform of platforms) {
      log.step(`Capacitor sync (${platform})`);
      runBin('@capacitor/cli', 'cap', ['sync', platform]);
    }
  }

  log.step(`Done: "${name}" is applied${args.build ? ' and built' : ''}.`);
  if (platforms.includes('ios')) {
    log.info('iOS project files were patched in place; "npm run client:reset" restores them.');
  }
  if (!args.build) {
    log.info('Skipped "ng build" and "cap sync" (--no-build).');
  }
}

/**
 * Hook for `npm start` / `npm run build`: the Angular build needs the generated
 * web config to exist. Keeps whichever client is active and falls back to
 * CLIENT_NAME or "demo" on a fresh clone. Never touches a native project.
 */
function ensure() {
  const known = listClients();
  let active = null;
  if (fs.existsSync(web.ACTIVE_FILE)) {
    try {
      active = JSON.parse(fs.readFileSync(web.ACTIVE_FILE, 'utf8'));
    } catch {
      active = null;
    }
  }
  const keepActive = active && known.includes(active.client);
  const name = keepActive ? active.client : process.env.CLIENT_NAME || 'demo';
  const { config, secrets, warnings } = loadClient(name, {
    // Keep the build number of the last full build rather than resetting it.
    buildNumber: keepActive ? active.buildNumber : undefined,
    checkAssets: false,
  });
  const changed = web.apply(config, secrets);
  console.log(`[client] ${name}: web config ${changed.length ? 'generated' : 'up to date'}`);
  warnings.forEach((warning) => console.warn(`[client] warning: ${warning}`));
}

function reset() {
  log.step('Removing generated client files');
  web.clean();
  if (android.exists()) {
    android.clean();
  }
  if (ios.exists()) {
    ios.cleanAssets();
    const restored = ios.reset();
    restored.forEach((file) => log.info(`restored base identity in ${rel(file)}`));
  }
  remove(STATE_DIR);
  log.info('Done. Apply a client again before the next build:');
  log.info('  npm run client:build -- <client>');
}

function list() {
  const active = web.activeClient();
  const names = listClients();
  if (!names.length) {
    console.log('No clients found under clients/.');
    return;
  }
  const width = Math.max(...names.map((name) => name.length));
  for (const name of names) {
    const raw = readJson(path.join(clientDir(name), 'config.json'));
    const marker = name === active ? '*' : ' ';
    console.log(`${marker} ${name.padEnd(width)}  ${raw.appId || '?'}  ${raw.appName || '?'}`);
  }
  if (active) {
    console.log('\n* = client the web config is currently generated for');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.mode) {
    case 'help':
      console.log(USAGE);
      return;
    case 'list':
      list();
      return;
    case 'reset':
      reset();
      return;
    case 'ensure':
      ensure();
      return;
    default:
      await build(args);
  }
}

main().catch((error) => {
  if (error instanceof BuildError) {
    console.error(`\nerror: ${error.message}\n`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
