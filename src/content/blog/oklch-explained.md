---
title: "OKLCH explained: the modern color format every designer should know"
description: "Tailwind v4, Radix, and most modern design systems are switching to OKLCH. Here's what it is, why HSL gets it wrong, and how to pick OKLCH values without installing anything."
pubDate: 2026-06-09
tags: ["OKLCH", "CSS", "Design Systems"]
---

If you've opened a Tailwind v4 config file recently and noticed colors that look like `oklch(58.51% 0.1817 280.3)` instead of `#3da5ff`, you're looking at the biggest shift in how the web specifies color since HSL landed in CSS3.

OKLCH is winning. Radix Colors uses it. Tailwind v4 made it the native color space. OpenProps ships it. Stripe redesigned their entire token system around it.

This post is the explainer for everyone who saw OKLCH show up in their tooling and went "wait, what?"

## The 30-second version

OKLCH is a **perceptually uniform color space**. That means: equal numeric changes look like equal visual changes, anywhere on the color wheel.

HSL — which we've used for 20 years — is **not** perceptually uniform. Lighten a yellow by 10% in HSL: barely visible. Lighten a blue by 10% in HSL: huge change.

OKLCH fixes that. Same +10% L always looks like the same step. Same chroma value always looks "this saturated", regardless of hue.

That's the whole pitch. Let's unpack why it matters.

## The HSL problem in one image

Imagine a slider that goes from L=20% → L=80% in 10% steps. In HSL, here's what you get across hues:

- **Red hues (0°)**: Smooth, predictable gradient.
- **Yellow hues (60°)**: First half looks barely different. Second half snaps to bright suddenly.
- **Blue hues (240°)**: Massive perceived change between every step. The lighter end almost loses all "blueness".

The issue: HSL's L (lightness) is calculated from RGB, which isn't tuned to human perception. Our eyes are way more sensitive to brightness changes in some hues (yellow, green) than others (blue, red).

This is why every Bootstrap, Material, or pre-2023 design system color ramp had at least one shade that felt "off" — the math didn't match how we see.

## How OKLCH was discovered

In **December 2020**, a Swedish color scientist named **Björn Ottosson** published a blog post titled ["A perceptual color space for image processing"](https://bottosson.github.io/posts/oklab/). He'd been working on game-engine color blending and noticed that existing perceptual spaces (CIELAB, CIECAM02) had subtle but visible issues at high chroma, were computationally expensive, and didn't compose nicely in shaders.

His proposal — **OKLab** — was a derivative of CIELAB with a different transform stack: sRGB → linear RGB → LMS (long/medium/short wavelength response) → cube root → 3 final coefficients. Mathematically elegant, perceptually well-behaved, fast enough for shaders.

OKLab caught on inside design and color-science Twitter. Within a year, the CSS Color Module Level 4 spec adopted **OKLCH** — the polar form of OKLab (Lightness + Chroma + Hue, exactly like HSL but on a perceptually uniform space underneath).

Browser support landed in 2023 (Chrome 111+, Safari 15.4+, Firefox 113+). Tailwind v4 made it the native format in 2024. The cascade was fast.

## Reading an OKLCH value

```css
color: oklch(58.51% 0.1817 280.3);
              ^^^^^^  ^^^^^^  ^^^^^
              L       C       H
```

- **L (Lightness): 0%–100%** — perceived brightness. 0% = pure black. 100% = pure white. 50% is a midtone that **looks midtone across every hue**.
- **C (Chroma): 0–~0.4** — color intensity. 0 = pure gray. ~0.37 is the max possible for sRGB; anything higher is out of gamut for sRGB displays. Rough rules of thumb: 0.05 = muted, 0.15 = vivid, 0.25+ = electric.
- **H (Hue): 0°–360°** — color wheel angle. 0° = red, 90° = yellow-green, 180° = cyan, 270° = blue-violet. Same numbering as HSL — but perceptually evenly spaced.

Optional 4th parameter: `/ alpha` for opacity, identical to other CSS color functions.

## Why design systems love it

The thing that makes OKLCH transformative for design tokens: **interpolation is honest**.

If you build a 50 / 100 / 200 / ... / 900 brand color scale, OKLCH lets you do:

```css
@theme {
  --color-brand-50:  oklch(97% 0.012 280);
  --color-brand-100: oklch(94% 0.025 280);
  --color-brand-200: oklch(88% 0.05 280);
  --color-brand-300: oklch(80% 0.08 280);
  --color-brand-400: oklch(70% 0.13 280);
  --color-brand-500: oklch(58% 0.18 280);   /* base brand */
  --color-brand-600: oklch(48% 0.17 280);
  --color-brand-700: oklch(38% 0.15 280);
  --color-brand-800: oklch(30% 0.13 280);
  --color-brand-900: oklch(22% 0.1 280);
}
```

Every shade has uniform perceived spacing. Your 200 shade looks "exactly one notch lighter than 300" everywhere. Your hover state (e.g. base → base+50 lightness) feels consistent whether your brand is blue, red, green, or pink.

With HSL, you'd manually nudge each shade to make the ramp feel even. With OKLCH, the math does it for you.

This is also why **OKLCH gradients look better** than HSL or RGB gradients. CSS Color 4's `color-interpolation-method` lets you write:

```css
background: linear-gradient(in oklch, red, blue);
```

— and get a gradient that smoothly transitions through perceptually-even color, avoiding the muddy gray midpoints you get from naive RGB interpolation.

## Why most online color pickers don't show OKLCH

OKLCH is a 2023 spec. Most "free online color picker" tools were built between 2010 and 2020. Their codebases don't have the conversion functions. The math is also non-trivial — sRGB → linear → LMS → cube root → OKLab → polar is a multi-step pipeline with magic constants.

That's why I added native OKLCH output to [Screen Color Picker](/oklch-color-picker) from day one. Pick a pixel → get all four formats (HEX, RGB, HSL, OKLCH) instantly, copy whichever your codebase needs.

## When to use which format

| Format | Use when |
|--------|----------|
| **HEX** | Shipping production CSS, sharing colors in Slack |
| **RGB** | Device-level work (canvas, image processing) |
| **HSL** | Quick manipulation by eye (legacy code, designer handoff) |
| **OKLCH** | Design tokens, perceptual color ramps, modern CSS, Tailwind v4+ |

Use OKLCH for all *new* design system work. Keep HEX as a fallback for compatibility with older systems that don't speak it yet.

## Try it now

Open [Screen Color Picker's OKLCH picker](/oklch-color-picker). Click "Pick a color". Sample anything on your screen — a logo, a sunset photo, your IDE's syntax highlighting. You'll get the OKLCH value alongside HEX/RGB/HSL with one-click copy. No install, no permissions, runs in your browser.

## TL;DR

- OKLCH is a perceptually uniform color space; equal numeric changes look equal visually
- It's the format design tokens should be in if you're starting a project today
- Tailwind v4, Radix, Stripe, OpenProps all switched
- Browser support has been universal since 2023
- Screen Color Picker lets you pick any pixel and get OKLCH instantly, no install

The web has slowly been getting better at color. OKLCH is the step that ends 20 years of "why does this color ramp feel uneven" pain.
