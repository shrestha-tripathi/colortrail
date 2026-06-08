---
title: "ColorZilla vs Screen Color Picker: why I built a no-install alternative"
description: "ColorZilla is a great Chrome extension. But every extension that can sample pixel data needs 'read all your data on all websites'. Here's why I built a sandboxed website alternative instead."
pubDate: 2026-06-10
tags: ["ColorZilla", "Extensions", "Privacy"]
---

I used ColorZilla for years. It's a solid Chrome extension — screen-wide picker, gradient generator, palette browser, CSS color analysis, the works. The developer (Alex Sirota) has maintained it since 2008. Genuinely good software.

I switched to building my own thing because of one thing: the permission model.

## The permission that broke it for me

Every Chrome extension that wants to sample pixel data from the page has to request one of two permissions:

- `activeTab` — read the current tab when explicitly invoked
- `<all_urls>` (a.k.a. "read and change all your data on all websites") — read any page, any time

ColorZilla, to support its full feature set (page color analysis, page CSS extraction, etc.), requests the latter. That's necessary for the features it ships — there's no way to do page-level color extraction without page access.

But here's what `<all_urls>` actually grants:

- Read every form input on every page you visit
- Read your password manager autofill values
- See your banking transaction history
- See your Slack DMs, your Gmail, your Notion
- Inject JavaScript into any page
- Modify any HTTP response

The developer didn't do anything wrong. **The permission system itself just doesn't have a way to say "I only need to read screen pixels, not page DOM."**

This means: even if you trust ColorZilla today, you're trusting it to never get compromised. Extensions get sold to advertisers, developer accounts get phished, malicious updates ship and Chrome's review process catches them weeks later. The 2017 Web Developer extension hijack, the 2023 ChatGPT for Google extension malware — these happen.

## What changed in 2021

In October 2021, Chrome shipped the **window.EyeDropper API**. For the first time, you could sample pixels from the whole screen *from a website*, no extension, no permission prompt.

The API is brilliantly designed for this exact problem: it returns one sRGB pixel value per call. No screenshot. No surrounding pixels. No DOM access. The browser sandboxes it tightly — the website calling the API has no idea where you pointed the cursor or what app you sampled from. All it gets back is "`#3da5ff`".

This is exactly the security model a color picker needs. Anything more is overreach.

I built [Screen Color Picker](/) on top of this. Plus a Screenshot Picker mode for Firefox and Safari (which haven't shipped EyeDropper) using the universal `getDisplayMedia` API. Same screen-wide sampling. Zero extension. Zero permissions. Zero ads.

## Side-by-side feature comparison

| Feature | ColorZilla | Screen Color Picker |
|---------|------------|------------|
| Install required | Chrome extension | Just a URL |
| Permissions | "Read all data on all websites" | None |
| Works in Firefox/Safari | No (Chrome only) | Yes (Screenshot mode) |
| Screen-wide picking (outside browser) | Yes | Yes |
| HEX / RGB / HSL output | Yes | Yes |
| OKLCH output | No | Yes |
| Palette history | Yes | Yes |
| Gradient generator | Yes | Roadmap |
| Page CSS color extraction | Yes | No (intentional — needs page access) |
| Ads in free tier | Some versions | Never |
| Open source | Mixed | Fully (MIT) |
| Mobile support | No | Partial (Screenshot mode) |
| Cost | Free + paid | Free forever |

**The honest read:** ColorZilla has features Screen Color Picker won't ship — page CSS analysis specifically requires the page-access permission that we built Screen Color Picker to avoid. If you need that feature, ColorZilla is still the right tool.

For everything else — sampling a color from your screen and copying it out — Screen Color Picker wins on every axis.

## Why "zero install" matters more than people think

The standard counter-argument is: "I trust the extensions I install. Permissions don't bother me."

That's fine for now. But install friction has real cost over time:

- **Sync friction.** New laptop? Install all extensions again. Decide every time which to bring over.
- **Update fatigue.** Extensions ask to re-confirm permissions on major version bumps. You either click through (defeating the point) or audit each one (nobody does).
- **Sharing friction.** Tell a designer friend about your color picker. "Cool, send me the link" — except there's no link. There's a Chrome Web Store URL, a 4MB download, a permission dialog, and an extension management panel they now have to think about.
- **Cross-platform friction.** Firefox user? Safari user? Mobile user? Out of luck.

With Screen Color Picker, "use this color picker" is: a URL you can DM someone. They click it. They use it. Done. The web wins on distribution every time.

## The trust pitch

Here's the thing I tell people who ask why they should trust Screen Color Picker:

> Screen Color Picker is a website. The browser sandbox limits what websites can do to a fraction of what extensions can. Even if I wanted to be malicious — read your other tabs, install crypto miners, exfiltrate your DMs — I couldn't, because the browser won't let me.

That's the security model I want for a color picker. The same model I want for most utilities. The browser sandbox is one of the strongest pieces of consumer security infrastructure ever built. Extensions opt out of it. Websites don't.

I'd rather build something less powerful inside the sandbox than something more powerful outside it.

## When to keep using ColorZilla

In good conscience: keep ColorZilla if you specifically need:

- **Page CSS color extraction** (extract all colors used on a webpage)
- **Built-in gradient generator** with the rich UI it ships
- **Webpage color palette browser** (color schemes from designed pages)

These require page-level access, and that's a legitimate use of the extension permission model. ColorZilla does these well.

## When to switch to Screen Color Picker

Switch if you mainly want:

- A screen-wide color picker (the 90% use case)
- Modern OKLCH output for Tailwind v4 / design system work
- Zero install on a new machine
- Works in Firefox or Safari
- Mobile picker (partial via Screenshot mode)
- No permissions in your extension audit

[Try it now](/) — bookmark the URL, press P, sample anything on your screen. No download.

## TL;DR

- ColorZilla is good software but requires "read all your data on all websites"
- Chrome shipped EyeDropper API in 2021 — sampling pixels without that permission is now possible
- Screen Color Picker is a website using that API + Screenshot fallback for Firefox/Safari
- For pure screen-wide color picking: zero install + zero permissions is better
- For page-level CSS extraction: ColorZilla still wins (needs page access)
- Use whichever fits your threat model

The browser got more powerful. Color pickers should reflect that.
