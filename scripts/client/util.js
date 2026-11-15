'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/** Repository root (this file lives in <root>/scripts/client). */
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Everything the build writes that is not part of a native project or `src/`
 * lives here. The whole directory is gitignored.
 */
const STATE_DIR = path.join(ROOT, '.client');

/**
 * An error caused by the caller's input: an unknown client, an invalid config,
 * a missing asset. The CLI prints these without a stack trace.
 */
class BuildError extends Error {}

function fail(message, details = []) {
  throw new BuildError([message, ...details.map((d) => `  - ${d}`)].join('\n'));
}

const log = {
  step: (message) => console.log(`\n==> ${message}`),
  info: (message) => console.log(`    ${message}`),
  warn: (message) => console.warn(`    warning: ${message}`),
};

/** Path relative to the repo root with forward slashes, for messages. */
function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fail(`Could not read ${rel(file)}: ${error.message}`);
  }
}

/**
 * Writes a text file only when its content actually differs. Re-running the
 * build for the same client therefore touches nothing, which keeps `ng serve`
 * from rebuilding and keeps repeated runs byte-identical.
 */
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) {
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function sha1(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Runs a CLI that ships with a locally installed npm package - the same thing
 * `npx <bin>` does - by handing its entry script to the current Node binary.
 * Going through Node directly avoids a shell, so argument quoting and `.cmd`
 * shims behave identically on Windows, macOS and Linux.
 */
function runBin(pkg, binName, args) {
  const pkgDir = path.join(ROOT, 'node_modules', ...pkg.split('/'));
  const manifest = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(manifest)) {
    fail(`${pkg} is not installed. Run "npm ci" first.`);
  }
  const { bin } = readJson(manifest);
  const entry = typeof bin === 'string' ? bin : bin && bin[binName];
  if (!entry) {
    fail(`${pkg} does not provide a "${binName}" command.`);
  }

  const printable = `${binName} ${args.join(' ')}`;
  log.info(`$ npx ${printable}`);
  const result = spawnSync(process.execPath, [path.join(pkgDir, entry), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    fail(`"${printable}" failed with exit code ${result.status}.`);
  }
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "#ABC" / "#AABBCC" -> "#aabbcc". */
function normalizeHex(value) {
  let hex = value.slice(1).toLowerCase();
  if (hex.length === 3) {
    hex = [...hex].map((c) => c + c).join('');
  }
  return `#${hex}`;
}

function hexToRgb(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Moves each channel `weight` (0..1) of the way towards `target`. */
function mix(rgb, target, weight) {
  return rgb.map((c, i) => Math.round(c + (target[i] - c) * weight));
}

/**
 * Black or white, whichever reads better on `rgb` (YIQ brightness). This is the
 * rule behind the hand-picked contrast colours in src/theme/variables.scss.
 */
function contrastRgb(rgb) {
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness >= 128 ? [0, 0, 0] : [255, 255, 255];
}

module.exports = {
  ROOT,
  STATE_DIR,
  BuildError,
  fail,
  log,
  rel,
  readJson,
  writeIfChanged,
  remove,
  sha1,
  runBin,
  HEX_COLOR,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  mix,
  contrastRgb,
};
