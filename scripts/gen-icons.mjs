// One-shot: generate PWA icons + apple-touch-icon + multi-res favicon.ico
// from public/favicon.svg. Run via `node scripts/gen-icons.mjs`.
//
// Our favicon.svg is already self-contained (VIBGYOR gradient background +
// white eyedropper strokes) — no recolor needed. Sharp can rasterize it
// directly at any size and the gradient + contrast scale beautifully.
//
// Mirrors the pattern in ~/projects/p2pdatesharing/scripts/gen-icons.mjs
// minus the recolor step (FTN has a single-stroke icon needing color
// inversion; we don't).

import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/favicon.svg");

/**
 * Rasterize the favicon.svg directly to a PNG at the target size.
 * `density` is set high so sharp doesn't antialias the gradient poorly.
 * Output is transparent-edged (no extra background) so it works on any
 * tab background, app launcher, or browser chrome.
 */
const renderPng = async (size) => {
  return sharp(svg, { density: 320 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
};

// PWA icons (used by manifest.webmanifest for install-to-home-screen)
writeFileSync("public/icon-192.png", await renderPng(192));
writeFileSync("public/icon-512.png", await renderPng(512));

// Apple touch icon for iOS Safari (180x180 is Apple's recommended size)
writeFileSync("public/apple-touch-icon.png", await renderPng(180));

// 32x32 PNG favicon — some platforms (Slack unfurls, RSS readers) prefer PNG
writeFileSync("public/favicon-32.png", await renderPng(32));

console.log("✓ PNG icons generated: favicon-32, icon-192, icon-512, apple-touch-icon (180)");

// Multi-resolution ICO container (16/32/48) — Windows, older browsers, and
// pinned tabs all fall back to /favicon.ico when SVG isn't supported or when
// the page MIME type can't carry a <link> tag (e.g. /sitemap.xml in browser).
// Without this, browsers serve the Astro starter favicon.
const ico16 = await renderPng(16);
const ico32 = await renderPng(32);
const ico48 = await renderPng(48);
const ico = await pngToIco([ico16, ico32, ico48]);
writeFileSync("public/favicon.ico", ico);
console.log(`✓ favicon.ico generated (multi-res 16/32/48, ${(ico.length / 1024).toFixed(1)} KB)`);
