'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const android = require('./android');
const ios = require('./ios');
const { clientAssets } = require('./config');
const { STATE_DIR, fail, hexToRgb, log, readJson, rel, remove, runBin, sha1 } = require('./util');

/** Where the images @capacitor/assets works from are prepared (gitignored). */
const STAGING_DIR = path.join(STATE_DIR, 'assets');
/** Records which client's images are currently generated for each platform. */
const ASSETS_STATE_FILE = path.join(STATE_DIR, 'assets-state.json');
/**
 * Part of the fingerprint that --skip-assets checks. Bump it whenever the way
 * images are derived changes, so output of an older script is not reused.
 */
const PIPELINE_VERSION = 2;

const MIN_ICON = 1024;
const MIN_SPLASH = 2732;
const MIN_NOTIFICATION_ICON = 96;

/** Status-bar icon edge per density (24dp). */
const NOTIFICATION_SIZES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
const NOTIFICATION_LARGE_SIZE = 256;

// ---------------------------------------------------------------------------
// Images generated from logo.png
// ---------------------------------------------------------------------------

// App icon. Android draws the icon image into a 72dp square and cuts it with
// the launcher's mask: a circle, a squircle, a teardrop... Every mask contains
// the centred 66dp circle, and iOS only rounds the corners, so a logo whose
// bounding box fits inside that circle is never cut, whatever its shape.
const ICON_SIZE = 1024;
const ICON_SAFE_DIAGONAL = 66 / 72;
/** Automatic size: the logo's diagonal spans 80% of the icon (a square logo is 57% wide). */
const ICON_LOGO_DIAGONAL = 0.8;
/** Logos wider (or taller) than this end up a thin strip on the square icon. */
const ICON_WIDE_LOGO = 3;

// Splash screen. The square image is scaled to cover the screen and cropped:
// an iPhone shows only the middle 46% of its width in portrait (of its height
// in landscape), Android at least the middle 56%. The logo therefore stays
// inside the centred square of 45% of the image's edge.
const SPLASH_SIZE = 2732;
const SPLASH_SAFE_SIDE = 0.45;
/**
 * Automatic size, relative to that square: the logo covers 12% of its area,
 * which gives square and wide logos a similar visual weight (a square logo is
 * about a third of a phone's width, a 3:1 wordmark 60%), but never more than
 * 70% of its width or 50% of its height.
 */
const SPLASH_LOGO_AREA = 0.12;
const SPLASH_LOGO_MAX_WIDTH = 0.7;
const SPLASH_LOGO_MAX_HEIGHT = 0.5;
/** However large splashLogoScale makes it, the logo keeps this margin inside the square. */
const SPLASH_LOGO_LIMIT = 0.9;
/**
 * Android 8-11 stretch a splash image to the screen, which would squash the
 * logo, so there a generated splash is a drawable that centres the logo at a
 * fixed size instead. The safe square maps to the width of a small phone.
 */
const ANDROID_SAFE_SIDE_DP = 360;
/**
 * Android 12+ draw their own launch screen: an icon centred on
 * windowSplashScreenBackground. With a generated splash that icon is the logo
 * itself. Android shows it at 288dp, and only inside the centred circle of
 * 192dp, so the logo's bounding box spans 90% of that circle at most.
 */
const ANDROID12_ICON_SIZE = 864;
const ANDROID12_SAFE_DIAGONAL = 192 / 288;
const ANDROID12_LOGO_DIAGONAL = ANDROID12_SAFE_DIAGONAL * 0.9;

/** Alpha at or below this counts as empty when measuring a logo. */
const EMPTY_ALPHA = 8;
/**
 * A logo pixel this close to the colour behind it (RGB distance) does not
 * stand out; when more than half of the logo is like that, it barely shows.
 */
const BLEND_DISTANCE = 48;
const BLEND_SHARE = 0.5;

/**
 * A sample of what @capacitor/assets must have produced. The tool logs its
 * errors and still exits 0, so the files themselves are the only reliable
 * success signal - which works because everything is deleted first.
 */
const EXPECTED_OUTPUT = {
  android: [
    'mipmap-anydpi-v26/ic_launcher.xml',
    'mipmap-xxxhdpi/ic_launcher.png',
    'mipmap-xxxhdpi/ic_launcher_round.png',
    'mipmap-xxxhdpi/ic_launcher_foreground.png',
    'mipmap-xxxhdpi/ic_launcher_background.png',
    'drawable/splash.png',
    'drawable-night/splash.png',
    'drawable-port-xxxhdpi/splash.png',
    'drawable-port-night-xxxhdpi/splash.png',
  ].map((file) => path.join(android.RES_DIR, file)),
  ios: [
    path.join(ios.ICON_SET, 'AppIcon-512@2x.png'),
    ...['1x', '2x', '3x'].flatMap((scale) => [
      path.join(ios.SPLASH_SET, `Default@${scale}~universal~anyany.png`),
      path.join(ios.SPLASH_SET, `Default@${scale}~universal~anyany-dark.png`),
    ]),
  ],
};

function loadSharp() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    fail(`The "sharp" image library could not be loaded (${error.message}). Run "npm ci" first.`);
  }
  // libvips keeps input files open while cached, which on Windows blocks
  // deleting or replacing them a moment later.
  sharp.cache(false);
  return sharp;
}

/**
 * Loads a logo cropped to its visible content, so that transparent padding in
 * the file does not make it smaller. A logo without transparency is cropped to
 * where it differs from its top-left pixel instead.
 */
async function readLogo(sharp, file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alphaAt = channels - 1;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  let transparent = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + alphaAt] > EMPTY_ALPHA) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      } else {
        transparent = true;
      }
    }
  }
  if (right < 0) {
    fail(`${rel(file)} is completely transparent.`);
  }
  const corner = [data[0], data[1], data[2]].slice(0, Math.max(1, channels - 1));

  let buffer;
  if (transparent) {
    buffer = await sharp(file)
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .png()
      .toBuffer();
  } else {
    try {
      buffer = await sharp(file).trim().png().toBuffer();
    } catch {
      // A single flat colour: nothing to trim.
      buffer = await sharp(file).png().toBuffer();
    }
  }
  const meta = await sharp(buffer).metadata();
  return {
    file,
    buffer,
    width: meta.width,
    height: meta.height,
    aspect: meta.width / meta.height,
    transparent,
    // Grey images have one colour channel; spread it to three.
    corner: corner.length === 1 ? [corner[0], corner[0], corner[0]] : corner,
  };
}

/**
 * Share of the logo's visible pixels that are close to `hex`. The background
 * of a logo without transparency does not count.
 */
async function blendShare(sharp, logo, hex) {
  const { data, info } = await sharp(logo.buffer)
    .ensureAlpha()
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  const target = hexToRgb(hex);
  const stride = info.channels;
  const grey = stride === 2;
  const near = (r, g, b, rgb) => Math.hypot(r - rgb[0], g - rgb[1], b - rgb[2]) < BLEND_DISTANCE;
  let visible = 0;
  let blended = 0;
  for (let i = 0; i < data.length; i += stride) {
    if (data[i + stride - 1] <= 128) {
      continue;
    }
    const r = data[i];
    const g = grey ? r : data[i + 1];
    const b = grey ? r : data[i + 2];
    if (!logo.transparent && near(r, g, b, logo.corner)) {
      continue;
    }
    visible += 1;
    if (near(r, g, b, target)) {
      blended += 1;
    }
  }
  return visible ? blended / visible : 0;
}

/**
 * Where the logo goes on a generated app icon: centred, sized so that its
 * bounding box fits in the circle no launcher mask cuts into.
 */
function iconLayout(logo, scale) {
  const wanted = ICON_LOGO_DIAGONAL * scale;
  const diagonal = Math.min(wanted, ICON_SAFE_DIAGONAL);
  const height = (diagonal / Math.hypot(logo.aspect, 1)) * ICON_SIZE;
  return {
    size: ICON_SIZE,
    width: Math.max(1, Math.round(height * logo.aspect)),
    height: Math.max(1, Math.round(height)),
    limitedTo: wanted > ICON_SAFE_DIAGONAL ? ICON_SAFE_DIAGONAL / ICON_LOGO_DIAGONAL : null,
  };
}

/**
 * Where the logo goes on a generated splash screen: centred, inside the part
 * of the image that every phone and tablet shows.
 */
function splashLayout(logo, scale) {
  const side = SPLASH_SAFE_SIDE * SPLASH_SIZE;
  let width = Math.sqrt(SPLASH_LOGO_AREA * logo.aspect) * side;
  let height = width / logo.aspect;
  const fit = Math.min(1, (SPLASH_LOGO_MAX_WIDTH * side) / width, (SPLASH_LOGO_MAX_HEIGHT * side) / height);
  width *= fit * scale;
  height *= fit * scale;
  const limit = Math.min(1, (SPLASH_LOGO_LIMIT * side) / width, (SPLASH_LOGO_LIMIT * side) / height);
  return {
    size: SPLASH_SIZE,
    width: Math.max(1, Math.round(width * limit)),
    height: Math.max(1, Math.round(height * limit)),
    limitedTo: limit < 1 ? scale * limit : null,
  };
}

/**
 * The logo centred on a square of `background`: an opaque PNG, or one that
 * keeps its alpha channel with `transparent`.
 */
async function compose(sharp, { logo, layout, background, transparent = false }) {
  const resized = await sharp(logo.buffer)
    .resize(layout.width, layout.height, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const canvas = await sharp({
    create: { width: layout.size, height: layout.size, channels: 4, background },
  })
    .composite([
      {
        input: resized.data,
        left: Math.round((layout.size - resized.info.width) / 2),
        top: Math.round((layout.size - resized.info.height) / 2),
      },
    ])
    .png()
    .toBuffer();
  // Store icons must not have an alpha channel; the canvas is opaque anyway.
  return transparent ? canvas : sharp(canvas).removeAlpha().png().toBuffer();
}

/**
 * Android's own splash resources, per mode (light / dark):
 *
 * - @drawable/splash_icon, the icon Android 12+ centre on their launch screen
 *   (styles.xml). For a generated splash it is the logo; for a splash supplied
 *   as an image it is the app icon, as without the setting.
 * - For a generated splash, res/drawable[-night]/splash.xml replaces the
 *   images @capacitor/assets made, which Android 8-11 would stretch to the
 *   screen: @color/splash_background with the logo centred at a fixed size.
 */
async function writeAndroidSplash(sharp, config, plan) {
  const variants = [
    { image: plan.splash, night: false, logoName: 'splash_logo' },
    { image: plan.splashDark, night: true, logoName: 'splash_logo_dark' },
  ];
  const header = (what) => [
    `<!-- AUTO-GENERATED by scripts/build-client.js for client "${config.client}" (${what}).`,
    `     Do not edit and do not commit: change clients/${config.client}/ and re-run the script. -->`,
  ];

  for (const { image, night } of variants) {
    if (image.file) {
      const valuesDir = path.join(android.RES_DIR, night ? 'values-night' : 'values');
      fs.mkdirSync(valuesDir, { recursive: true });
      fs.writeFileSync(
        path.join(valuesDir, android.SPLASH_ICON_ALIAS),
        [
          "<?xml version='1.0' encoding='utf-8'?>",
          ...header(`launch screen icon on Android 12+${night ? ' in dark mode' : ''}`),
          '<resources>',
          '    <!-- The splash is an image, so Android 12+ show the app icon, as they do by default.',
          '         (Not @android:drawable/sym_def_app_icon, the library default: Android only',
          '         swaps that for the app icon when the theme names it directly.) -->',
          '    <item name="splash_icon" type="drawable">@mipmap/ic_launcher</item>',
          '</resources>',
          '',
        ].join('\n'),
      );
      continue;
    }
    const iconDir = path.join(android.RES_DIR, night ? 'drawable-night-nodpi' : 'drawable-nodpi');
    fs.mkdirSync(iconDir, { recursive: true });
    const wanted = ANDROID12_LOGO_DIAGONAL * config.assets.splashLogoScale;
    const diagonal = Math.min(wanted, ANDROID12_SAFE_DIAGONAL);
    const height = (diagonal / Math.hypot(image.logo.aspect, 1)) * ANDROID12_ICON_SIZE;
    fs.writeFileSync(
      path.join(iconDir, android.SPLASH_ICON),
      await compose(sharp, {
        logo: image.logo,
        layout: {
          size: ANDROID12_ICON_SIZE,
          width: Math.max(1, Math.round(height * image.logo.aspect)),
          height: Math.max(1, Math.round(height)),
        },
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        transparent: true,
      }),
    );
  }

  for (const { image, night, logoName } of variants.filter((variant) => !variant.image.file)) {
    for (const entry of fs.readdirSync(android.RES_DIR)) {
      const parts = entry.split('-');
      if (parts[0] === 'drawable' && parts.includes('night') === night) {
        const dir = path.join(android.RES_DIR, entry);
        remove(path.join(dir, 'splash.png'));
        if (fs.readdirSync(dir).length === 0) {
          fs.rmdirSync(dir);
        }
      }
    }

    const logoDir = path.join(android.RES_DIR, 'drawable-nodpi');
    fs.mkdirSync(logoDir, { recursive: true });
    await sharp(image.logo.buffer)
      .resize(image.layout.width, image.layout.height, { fit: 'inside' })
      .png()
      .toFile(path.join(logoDir, `${logoName}.png`));

    const dp = (px) => Math.max(1, Math.round((px * ANDROID_SAFE_SIDE_DP) / (SPLASH_SAFE_SIDE * SPLASH_SIZE)));
    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      ...header(`splash${night ? ' in dark mode' : ''} on Android 8-11`),
      '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">',
      '    <item android:drawable="@color/splash_background" />',
      '    <item',
      `        android:width="${dp(image.layout.width)}dp"`,
      `        android:height="${dp(image.layout.height)}dp"`,
      '        android:gravity="center"',
      `        android:drawable="@drawable/${logoName}" />`,
      '</layer-list>',
      '',
    ].join('\n');
    const xmlDir = path.join(android.RES_DIR, night ? 'drawable-night' : 'drawable');
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(path.join(xmlDir, 'splash.xml'), xml);
  }
}

function describe(image) {
  if (image.file) {
    return rel(image.file);
  }
  const { logo, layout, background } = image;
  return `generated from ${rel(logo.file)}: logo ${layout.width}x${layout.height} px centred on ${background}`;
}

/**
 * Checks the client's images and works out where each output image comes
 * from. Problems that would produce a blurry or cut-off image are errors;
 * images that merely look wrong are warnings.
 *
 * @returns {Promise<{warnings: string[], plan: object}>} `plan` goes to generate()
 */
async function inspect(config) {
  const sharp = loadSharp();
  const assets = clientAssets(config.client);
  const options = config.assets;
  const errors = [];
  const warnings = [];
  const size = (meta) => `${meta.width}x${meta.height}`;

  // Only read the logo when something is generated from it (loadClient has
  // made sure it exists in that case).
  const logo = assets.logo && (!assets.icon || !assets.splash) ? await readLogo(sharp, assets.logo) : null;
  /** Every generated image, per source logo, for the resolution check below. */
  const drawn = [];

  // --- app icon --------------------------------------------------------------
  let icon;
  if (assets.icon) {
    const meta = await sharp(assets.icon).metadata();
    if (meta.width !== meta.height) {
      errors.push(
        `${rel(assets.icon)} must be square (it is ${size(meta)}). For a logo that is not square, name the file logo.png instead: the icon is then generated from it.`,
      );
    } else if (meta.width < MIN_ICON) {
      errors.push(`${rel(assets.icon)} must be at least ${MIN_ICON}x${MIN_ICON} (it is ${size(meta)}).`);
    }
    icon = { file: assets.icon };
  } else {
    const layout = iconLayout(logo, options.iconLogoScale);
    icon = { logo, layout, background: options.iconBackgroundColor };
    drawn.push({
      image: icon,
      what: 'the app icon',
      fix: 'choose another assets.iconBackgroundColor, or supply icon.png',
    });
    if (layout.limitedTo) {
      warnings.push(
        `assets.iconLogoScale ${options.iconLogoScale} would let the logo reach outside the circle that every launcher shows; it is drawn at the largest safe size instead (${layout.limitedTo.toFixed(2)}).`,
      );
    }
    if (logo.aspect > ICON_WIDE_LOGO || logo.aspect < 1 / ICON_WIDE_LOGO) {
      const ratio = logo.aspect > 1 ? `${logo.aspect.toFixed(1)}:1` : `1:${(1 / logo.aspect).toFixed(1)}`;
      warnings.push(
        `${rel(logo.file)} is ${ratio}, so on the square app icon it is only ${layout.width}x${layout.height} px of ${ICON_SIZE}. A symbol or monogram makes a better icon: supply one as icon.png, and logo.png is still used for the splash screen.`,
      );
    }
  }

  // --- splash screens ----------------------------------------------------------
  let splash;
  let splashDark;
  for (const file of [assets.splash, assets.splashDark].filter(Boolean)) {
    const meta = await sharp(file).metadata();
    if (meta.width < MIN_SPLASH || meta.height < MIN_SPLASH) {
      errors.push(`${rel(file)} must be at least ${MIN_SPLASH}x${MIN_SPLASH} (it is ${size(meta)}).`);
    }
  }
  const generatedSplash = (source, background, use) => {
    const image = { logo: source, layout: splashLayout(source, options.splashLogoScale), background };
    drawn.push({ image, what: 'the splash screen', ...use });
    return image;
  };
  if (assets.splash) {
    splash = { file: assets.splash };
    // Without a dark version the light image is used in dark mode too: a
    // generated one would not match the artwork the client supplied.
    splashDark = { file: assets.splashDark || assets.splash };
  } else {
    splash = generatedSplash(logo, options.splashBackgroundColor, {
      label: 'the splash screen',
      fix: 'choose another assets.splashBackgroundColor',
    });
    if (assets.splashDark) {
      splashDark = { file: assets.splashDark };
    } else {
      const darkLogo = assets.logoDark ? await readLogo(sharp, assets.logoDark) : logo;
      splashDark = generatedSplash(darkLogo, options.splashBackgroundColorDark, {
        label: 'the dark-mode splash screen',
        fix: assets.logoDark
          ? 'choose another assets.splashBackgroundColorDark'
          : 'add logo-dark.png (the logo for dark backgrounds), or choose another assets.splashBackgroundColorDark',
      });
    }
  }
  for (const image of [splash, splashDark]) {
    if (image.layout && image.layout.limitedTo) {
      warnings.push(
        `assets.splashLogoScale ${options.splashLogoScale} would push ${rel(image.logo.file)} beyond the part of the splash screen that every device shows; it is drawn at the largest size that fits instead (${image.layout.limitedTo.toFixed(2)}).`,
      );
      break;
    }
  }

  // --- logo resolution and background --------------------------------------------
  for (const source of [...new Set(drawn.map(({ image }) => image.logo))]) {
    const uses = drawn.filter(({ image }) => image.logo === source);
    const needed = Math.max(...uses.map(({ image }) => image.layout.width));
    const factor = Math.max(...uses.map(({ image }) => image.layout.width / source.width));
    if (factor > 1) {
      const list = uses.map(({ image, what }) => `${what} draws it ${image.layout.width} px wide`);
      errors.push(
        `${rel(source.file)} is too small: it is ${source.width}x${source.height} px without its transparent border, and ${[...new Set(list)].join(' and ')}. Export it at least ${needed} px wide (or lower assets.iconLogoScale / assets.splashLogoScale).`,
      );
    }
    for (const background of new Set(uses.map(({ image }) => image.background))) {
      const share = await blendShare(sharp, source, background);
      if (share > BLEND_SHARE) {
        const affected = uses.filter(({ image }) => image.background === background);
        const places = [...new Set(affected.map(({ label, what }) => label || what))];
        const fixes = [...new Set(affected.map(({ fix }) => fix))];
        warnings.push(
          `${Math.round(share * 100)}% of ${rel(source.file)} is close to ${background}, the background of ${places.join(', ').replace(/, ([^,]*)$/, ' and $1')}, so the logo barely shows there. To fix: ${fixes.join('; ')}.`,
        );
      }
    }
    if (!source.transparent) {
      // Its own background only shows where it differs from the colour behind it.
      const visibleOn = [...new Set(uses.map(({ image }) => image.background))].filter((hex) =>
        hexToRgb(hex).some((value, i) => Math.abs(value - source.corner[i]) > 8),
      );
      if (visibleOn.length) {
        warnings.push(
          `${rel(source.file)} has no transparent background, so its own background shows as a rectangle on ${visibleOn.join(' and ')}. Export the logo with a transparent background.`,
        );
      }
    }
  }

  // --- notification icon ---------------------------------------------------------
  const { data, info } = await sharp(assets.notificationIcon)
    .ensureAlpha()
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  if (Math.max(info.width, info.height) < MIN_NOTIFICATION_ICON) {
    errors.push(
      `${rel(assets.notificationIcon)} must be at least ${MIN_NOTIFICATION_ICON} px on its longer side (it is ${size(info)}).`,
    );
  } else if (info.width !== info.height) {
    warnings.push(
      `${rel(assets.notificationIcon)} is not square (${size(info)}): it is centred on a transparent square, so it looks smaller than a square icon would.`,
    );
  }
  let visible = 0;
  let coloured = 0;
  const stride = info.channels;
  for (let i = 0; i < data.length; i += stride) {
    if (data[i + stride - 1] > 16) {
      visible += 1;
      if (Math.min(...data.subarray(i, i + Math.max(1, stride - 1))) < 200) {
        coloured += 1;
      }
    }
  }
  const pixels = info.width * info.height;
  if (visible === pixels) {
    warnings.push(
      `${rel(assets.notificationIcon)} has no transparent pixels: Android draws only the alpha channel, so it will show as a solid square.`,
    );
  } else if (visible && coloured / visible > 0.05) {
    warnings.push(
      `${rel(assets.notificationIcon)} is not a plain white silhouette: Android ignores its colours and keeps only the shape.`,
    );
  }

  // --- leftovers from the demo client ------------------------------------------------
  // Remind the user while a client still carries the demo placeholder artwork.
  if (config.client !== 'demo') {
    const demo = clientAssets('demo');
    const hints = {
      icon: ' (delete it and the icon is generated from logo.png)',
      splash: ' (delete it and the splash screen is generated from logo.png)',
    };
    for (const key of ['icon', 'splash', 'splashDark', 'notificationIcon']) {
      const own = assets[key];
      const placeholder = demo[key];
      if (own && placeholder && fs.existsSync(own) && fs.existsSync(placeholder) && sha1(own) === sha1(placeholder)) {
        warnings.push(`${rel(own)} is still the demo placeholder${assets.logo && hints[key] ? hints[key] : ''}.`);
      }
    }
  }

  if (errors.length) {
    fail(`Client "${config.client}" has unusable artwork:`, errors);
  }
  const layers =
    assets.iconForeground && assets.iconBackground
      ? { foreground: assets.iconForeground, background: assets.iconBackground }
      : null;
  return {
    warnings,
    plan: { icon, splash, splashDark, layers, notificationIcon: assets.notificationIcon },
  };
}

/**
 * Fills the staging folder with the images @capacitor/assets reads, under the
 * names it looks for: supplied files are copied, the rest are generated.
 * Returns the path of the square app icon.
 */
async function stage(sharp, plan) {
  remove(STAGING_DIR);
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  const put = async (image, name) => {
    const target = path.join(STAGING_DIR, name);
    if (image.file) {
      fs.copyFileSync(image.file, target);
    } else {
      fs.writeFileSync(target, await compose(sharp, image));
    }
    return target;
  };

  let icon;
  if (plan.layers) {
    // Explicit Android adaptive-icon layers; the square icon serves iOS.
    icon = await put(plan.icon, 'icon-only.png');
    fs.copyFileSync(plan.layers.foreground, path.join(STAGING_DIR, 'icon-foreground.png'));
    fs.copyFileSync(plan.layers.background, path.join(STAGING_DIR, 'icon-background.png'));
  } else {
    // The tool's "logo" mode: it builds the adaptive icon from this one image
    // on a flat background of --iconBackgroundColor.
    icon = await put(plan.icon, 'icon.png');
  }
  await put(plan.splash, 'splash.png');
  // Always stage a dark splash. Without one the tool would invent it from the
  // icon, which would match neither the light splash nor the client's colours.
  await put(plan.splashDark, 'splash-dark.png');
  return icon;
}

/**
 * Identifies the images a client's artwork and settings produce. Recorded with
 * every generation, so --skip-assets can tell whether what is on disk is still
 * what a full run would produce.
 */
function fingerprint(config) {
  const assets = clientAssets(config.client);
  const hash = crypto.createHash('sha1');
  hash.update(JSON.stringify({ pipeline: PIPELINE_VERSION, client: config.client, options: config.assets }));
  for (const key of ['icon', 'splash', 'splashDark', 'logo', 'logoDark', 'notificationIcon', 'iconForeground', 'iconBackground']) {
    const file = assets[key];
    hash.update(`\n${key}:${file && fs.existsSync(file) ? sha1(file) : '-'}`);
  }
  return hash.digest('hex');
}

function readState() {
  return fs.existsSync(ASSETS_STATE_FILE) ? readJson(ASSETS_STATE_FILE) : {};
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(ASSETS_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * Used with --skip-assets: refuses to continue when the images on disk were
 * generated for another client, or from other artwork or settings.
 */
function assertGeneratedFor(config, platforms) {
  const state = readState();
  const current = fingerprint(config);
  const stale = platforms.filter((platform) => {
    const entry = state[platform];
    return !entry || entry.client !== config.client || entry.fingerprint !== current;
  });
  if (stale.length) {
    fail(
      `--skip-assets is not possible: the ${stale.join(' and ')} images on disk were not generated from the current artwork and settings of "${config.client}".`,
      ['run the command again without --skip-assets'],
    );
  }
}

/**
 * Regenerates launcher icons, splash screens and notification icons for the
 * given platforms, following the plan inspect() returned.
 */
async function generate(config, platforms, plan) {
  const sharp = loadSharp();

  // Forget the previous owner first: if anything below fails, the images on
  // disk are incomplete and must not pass for a finished set.
  const state = readState();
  for (const platform of platforms) {
    delete state[platform];
  }
  writeState(state);

  if (platforms.includes('android')) {
    android.cleanAssets();
  }
  if (platforms.includes('ios')) {
    ios.cleanAssets();
  }
  const iconFile = await stage(sharp, plan);
  log.info(`app icon       ${describe(plan.icon)}`);
  log.info(`splash         ${describe(plan.splash)}`);
  log.info(`splash (dark)  ${describe(plan.splashDark)}`);
  if (![plan.icon, plan.splash, plan.splashDark].every((image) => image.file)) {
    log.info(`the generated images are in ${rel(STAGING_DIR)}/ for a closer look`);
  }

  // @capacitor/assets loads both native projects through Trapeze and writes
  // AndroidManifest.xml back (to set an icon attribute that is already set).
  // Neither file should change here, so keep them exactly as they were.
  const guarded = [android.MANIFEST, ios.PBXPROJ]
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, content: fs.readFileSync(file) }));
  try {
    runBin('@capacitor/assets', 'capacitor-assets', [
      'generate',
      '--assetPath',
      rel(STAGING_DIR),
      ...platforms.map((platform) => `--${platform}`),
      '--iconBackgroundColor',
      config.assets.iconBackgroundColor,
    ]);
  } finally {
    for (const { file, content } of guarded) {
      if (!fs.readFileSync(file).equals(content)) {
        fs.writeFileSync(file, content);
        log.info(`kept ${rel(file)} unchanged (the asset tool had rewritten it)`);
      }
    }
  }

  const missing = platforms
    .flatMap((platform) => EXPECTED_OUTPUT[platform])
    .filter((file) => !fs.existsSync(file));
  if (missing.length) {
    fail('@capacitor/assets did not produce the expected files (see its output above):', missing.map(rel));
  }

  if (platforms.includes('android')) {
    await writeAndroidSplash(sharp, config, plan);
    for (const [density, edge] of Object.entries(NOTIFICATION_SIZES)) {
      const dir = path.join(android.RES_DIR, `drawable-${density}`);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(plan.notificationIcon)
        .resize(edge, edge, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dir, android.NOTIFICATION_ICON));
    }
    // The picture shown next to an expanded notification: the app icon.
    await sharp(iconFile)
      .resize(NOTIFICATION_LARGE_SIZE, NOTIFICATION_LARGE_SIZE)
      .png()
      .toFile(path.join(android.RES_DIR, 'drawable-xxxhdpi', android.NOTIFICATION_LARGE_ICON));
    log.info(
      `notification icons: ${Object.values(NOTIFICATION_SIZES).join('/')}px small, ${NOTIFICATION_LARGE_SIZE}px large`,
    );
  }

  const print = fingerprint(config);
  for (const platform of platforms) {
    state[platform] = { client: config.client, fingerprint: print };
  }
  writeState(state);
}

module.exports = {
  inspect,
  generate,
  assertGeneratedFor,
  // Exposed for checking the layout rules in isolation.
  iconLayout,
  splashLayout,
};
