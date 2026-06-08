---
title: "What is the window.EyeDropper API? Your browser's hidden superpower"
description: "Chrome shipped a system-wide color picker as a built-in JavaScript API in 2021. Most developers still don't know it exists. Here's how it works, what it can do, and why every browser should ship it."
pubDate: 2026-06-08
tags: ["EyeDropper API", "Browser APIs", "Web Platform"]
---

If I told you that since October 2021, every Chrome user has had a system-wide color picker built into their browser — sample any pixel on any monitor, in any app, with three lines of JavaScript — would you believe me?

Most developers wouldn't. The **window.EyeDropper API** is one of the web platform's best-kept secrets. It shipped quietly in Chrome 95, made zero TechCrunch headlines, and three years later still has roughly 0% awareness outside the design-tools niche.

This post is the explainer I wish existed when I first found out.

## The three-line magic trick

Open DevTools in Chrome right now and paste this:

```js
const dropper = new EyeDropper();
const { sRGBHex } = await dropper.open();
console.log(sRGBHex);
```

Your cursor instantly becomes a high-precision eyedropper. Move it **anywhere on your screen** — your IDE in a different window, a YouTube video paused in another tab, a Photoshop swatch, the macOS dock, the Windows taskbar, a pixel on your second monitor. Click. The console logs the hex color of that exact pixel.

Three lines. No extension. No permission prompt. No download. The browser, doing what should already be obvious: helping you sample colors from what you can see.

## Why this is a big deal

Before EyeDropper, sampling a color from outside the browser required:

- **macOS:** Open Digital Color Meter (built-in but clunky), or pay $10 for Sip
- **Windows:** Install PowerToys for its Color Picker, or install a Chrome extension that requested "read all your data on all websites"
- **Linux:** `apt install gpick`, or KDE's KColorChooser, or hope GNOME's screenshot tool with color-pick mode is set up

Each came with a tradeoff: install friction, ugly UI, paid software, or a Chrome extension permission that let a third party read every page you load — including your bank, your password manager, your DMs.

EyeDropper threw all of that out:

- **Zero permissions.** The API returns one sRGB hex value per call. No screenshot, no DOM access, no surrounding pixels. The browser sandboxes it tightly.
- **Zero install.** It's part of the browser.
- **Cross-platform.** Same JS works on Mac, Windows, Linux, ChromeOS, even mobile (limited).
- **System-wide.** Outside the browser. Other monitors. Other apps.

This is the kind of thing the web platform was supposed to do all along.

## The API in full

The full surface is tiny:

```ts
interface EyeDropper {
  open(options?: ColorSelectionOptions): Promise<ColorSelectionResult>;
}

interface ColorSelectionOptions {
  signal?: AbortSignal;
}

interface ColorSelectionResult {
  sRGBHex: string;  // e.g. "#3da5ff"
}
```

That's it. Three lines for the happy path; one for cancellation:

```js
const controller = new AbortController();

try {
  const dropper = new EyeDropper();
  const { sRGBHex } = await dropper.open({ signal: controller.signal });
  console.log("Picked:", sRGBHex);
} catch (err) {
  if (err.name === "AbortError") {
    console.log("User cancelled.");
  } else {
    console.error("Picker failed:", err);
  }
}

// Cancel programmatically (e.g. from a Cancel button):
// controller.abort();
```

## Why your browser cancels when you switch tabs

The most-asked question about the EyeDropper API: **"why does the picker cancel the moment I press Cmd+Tab to switch to the app I want to sample from?"**

The answer is sandbox security. The browser can hand the cursor "system-wide picker mode" only as long as it has focus. The moment another window takes focus, the browser loses the OS-level handle that was relaying mouse positions and pixel data. There's no way around this from inside the browser sandbox.

This is the single biggest UX gotcha. **The picker only works on pixels visible at the moment you click "open"** — and the moment another window comes forward, that contract breaks.

Workarounds:

1. **Arrange windows side-by-side first.** Put your IDE on the left, browser on the right. Now both are visible without focus changes.
2. **Use multiple monitors.** Pin the browser to one monitor, the app you're sampling from to another. Both stay visible.
3. **Use a screen capture workaround.** Capture the source window first (via `navigator.mediaDevices.getDisplayMedia`), then sample pixels from the captured frame at leisure. This is what we built into [Screen Color Picker's Screenshot Picker mode](/).

## Browser support reality check (June 2026)

| Browser | Status |
|---------|--------|
| Chrome 95+ | ✓ Shipped Oct 2021 |
| Edge 95+ | ✓ Shipped (Chromium) |
| Opera 81+ | ✓ Shipped (Chromium) |
| Brave | ✓ Shipped (Chromium) |
| Arc / Vivaldi | ✓ Shipped (Chromium) |
| Firefox | ✗ Mozilla position: "negative" |
| Safari | ✗ No public signal |
| Chrome Android | ⚠ Tab-only sampling |
| Safari iOS | ✗ |

The Chromium family went all-in. Firefox publicly declined, citing the same security concerns Chrome addressed (privacy of pixel data, screenshot abuse vectors). Safari hasn't said anything.

For Firefox and Safari users, the universal fallback is `navigator.mediaDevices.getDisplayMedia` — every modern browser supports it. Capture a window or screen, render it to a canvas, sample pixels with `ctx.getImageData(x, y, 1, 1)`. Less elegant, but it works everywhere.

## What you can build with this

A non-exhaustive list of things that became trivial in October 2021:

- **Designer color picker** (the obvious one)
- **Accessibility tools** — sample foreground+background, compute WCAG contrast
- **Color blindness simulators** — pick a color, render variants for protanopia/deuteranopia/tritanopia
- **CSS variable generators** — sample brand colors from any screenshot, output Tailwind v4 tokens
- **Color matching games** — "find a pixel that matches this swatch"
- **Educational tools** — show kids what RGB / HSL / OKLCH values are by picking real things
- **Streaming overlay tools** — sample colors live for OBS / Twitch chat reactions
- **Data viz** — sample a chart's color, look up which data series it represents

The web platform got more powerful overnight and most people missed it.

## Why I built Screen Color Picker

I'm a developer who pivots between Figma, VS Code, Slack, and a browser dozens of times a day. Every time I needed to grab a color from somewhere weird — a Slack screenshot, a YouTube paused frame, a Notion doc — I'd reach for an extension, then remember the permission cost, then either install it anyway and feel guilty, or screenshot+upload to an image color picker.

[Screen Color Picker](/) is the missing tool: just a URL. Bookmark it. Press P. Sample from anywhere. Get HEX, RGB, HSL, and OKLCH at once. Or use Screenshot mode if you need to sample from another tab without focus-switching.

It's not novel. It's not VC-funded. It's just the EyeDropper API + a clean UI + Screenshot fallback for Firefox/Safari. The browser already had all the magic — I just put it on a page.

## TL;DR

- `new EyeDropper()` exists in Chromium browsers since 2021
- 3 lines of JS, zero permissions, system-wide pixel sampling
- Cancels when window loses focus (sandbox limit) — workaround is multi-window layout or screen capture
- Firefox / Safari don't ship it; fallback is `getDisplayMedia`
- It's the most underrated browser feature of the decade

If you build with the web, this is one of those APIs that quietly broadens what's possible. Try it once. Then go check what else shipped in Chrome 95 that you missed.
