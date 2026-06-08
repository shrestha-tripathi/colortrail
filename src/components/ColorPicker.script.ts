/**
 * ColorPicker behavior — wires up:
 *   - LIVE  mode: window.EyeDropper API (instant, Chromium only)
 *   - SHOT  mode: getDisplayMedia capture + canvas magnifier (universal)
 *   - Palette history (localStorage)
 *   - Copy-to-clipboard
 *   - Keyboard shortcuts (P, Escape)
 */

import {
  parseHex,
  formatHex,
  formatRgb,
  formatHsl,
  formatOklch,
  contrastTextOn,
} from "../lib/colorFormats";
import {
  pickColor,
  supportLevel,
  type SupportLevel,
} from "../lib/browserSupport";
import {
  addToPalette,
  clearPalette,
  readPalette,
  removeFromPalette,
} from "../lib/paletteStore";
import {
  captureScreenFrame,
  hasDisplayCapture,
  samplePixelHex,
  type CapturedFrame,
} from "../lib/screenCapture";

// ----------------------------------------------------------------------
// DOM refs
// ----------------------------------------------------------------------

const pickBtn = document.getElementById("pick-btn") as HTMLButtonElement | null;
const pickBtnLabel = document.getElementById("pick-btn-label");
const pickHint = document.getElementById("pick-hint");
const banner = document.getElementById("compat-banner");
const bannerText = document.getElementById("compat-banner-text");

const resultCard = document.getElementById("result-card");
const swatchEl = document.getElementById("result-swatch");
const swatchHex = document.getElementById("result-swatch-hex");
const fmtHex = document.getElementById("fmt-hex");
const fmtRgb = document.getElementById("fmt-rgb");
const fmtHsl = document.getElementById("fmt-hsl");
const fmtOklch = document.getElementById("fmt-oklch");

const paletteSection = document.getElementById("palette-section");
const paletteGrid = document.getElementById("palette-grid");
const paletteCount = document.getElementById("palette-count");
const clearBtn = document.getElementById("clear-palette");

const toast = document.getElementById("toast");

// Screenshot modal refs
const shotBtn = document.getElementById("shot-btn") as HTMLButtonElement | null;
const shotModal = document.getElementById("shot-modal");
const shotClose = document.getElementById("shot-close");
const shotStatus = document.getElementById("shot-status");
const shotEmpty = document.getElementById("shot-empty");
const shotCanvas = document.getElementById("shot-canvas") as HTMLCanvasElement | null;
const shotLoupe = document.getElementById("shot-loupe");
const shotLoupeCanvas = document.getElementById("shot-loupe-canvas") as HTMLCanvasElement | null;
const shotCaptureBtn = document.getElementById("shot-capture") as HTMLButtonElement | null;
const shotRecaptureBtn = document.getElementById("shot-recapture") as HTMLButtonElement | null;
const shotPreviewSwatch = document.getElementById("shot-preview-swatch");
const shotPreviewHex = document.getElementById("shot-preview-hex");
const shotPreviewHint = document.getElementById("shot-preview-hint");

if (!pickBtn) {
  console.debug("ColorPicker root not found, script no-op");
}

// ----------------------------------------------------------------------
// State
// ----------------------------------------------------------------------

let activeHex: string | null = null;
let shotFrame: CapturedFrame | null = null;
let shotCtx: CanvasRenderingContext2D | null = null;
let loupeCtx: CanvasRenderingContext2D | null = null;

// ----------------------------------------------------------------------
// Compatibility banner (LIVE mode only)
// ----------------------------------------------------------------------

function configureForSupport(): void {
  const level: SupportLevel = supportLevel();
  if (!banner || !bannerText || !pickBtn) return;

  switch (level) {
    case "supported":
      banner.classList.add("hidden");
      pickBtn.disabled = false;
      break;
    case "mobile-warning":
      banner.classList.remove("hidden");
      bannerText.innerHTML =
        "📱 <strong>Heads up:</strong> on mobile the eyedropper can only sample inside this tab. Try <em>Pick from screenshot</em> for full freedom.";
      pickBtn.disabled = false;
      break;
    case "unsupported":
      banner.classList.remove("hidden");
      bannerText.innerHTML =
        "⚠️ <strong>Your browser doesn't support the live eyedropper.</strong> Use <em>Pick from screenshot</em> below — works in every browser. Or switch to Chrome / Edge / Brave / Opera for the instant picker.";
      pickBtn.disabled = true;
      if (pickBtnLabel) pickBtnLabel.textContent = "Not supported here";
      break;
  }

  // Screenshot button disabled only when getDisplayMedia is missing
  if (shotBtn && !hasDisplayCapture()) {
    shotBtn.disabled = true;
    shotBtn.title = "Screen capture not supported in this browser";
  }
}

// ----------------------------------------------------------------------
// Toast
// ----------------------------------------------------------------------

let toastTimer: number | null = null;

function showToast(message: string): void {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.add("hidden");
    toastTimer = null;
  }, 1800);
}

// ----------------------------------------------------------------------
// Active color rendering (shared by both modes)
// ----------------------------------------------------------------------

function setActive(hex: string): void {
  const rgb = parseHex(hex);
  if (!rgb) return;
  const hexUp = formatHex(rgb);
  activeHex = hexUp;

  if (resultCard) resultCard.classList.remove("hidden");
  if (swatchEl) {
    swatchEl.style.backgroundColor = hexUp;
    const textColor = contrastTextOn(rgb);
    if (swatchHex) {
      swatchHex.textContent = hexUp;
      swatchHex.style.color = textColor;
    }
  }
  if (fmtHex) fmtHex.textContent = hexUp;
  if (fmtRgb) fmtRgb.textContent = formatRgb(rgb);
  if (fmtHsl) fmtHsl.textContent = formatHsl(rgb);
  if (fmtOklch) fmtOklch.textContent = formatOklch(rgb);

  if (pickBtnLabel) pickBtnLabel.textContent = "Pick another";
  if (pickHint) {
    pickHint.innerHTML =
      '<span class="font-medium text-[var(--color-fg)]">Picked!</span> Click again, or switch to <span class="font-medium text-[var(--color-fg)]">Pick from screenshot</span> for more.';
  }
}

// ----------------------------------------------------------------------
// Palette grid
// ----------------------------------------------------------------------

function renderPalette(palette?: string[]): void {
  if (!paletteSection || !paletteGrid || !paletteCount) return;

  const items = palette ?? readPalette();
  if (items.length === 0) {
    paletteSection.classList.add("hidden");
    return;
  }

  paletteSection.classList.remove("hidden");
  paletteCount.textContent = `(${items.length})`;
  paletteGrid.innerHTML = "";

  for (const hex of items) {
    const wrap = document.createElement("div");
    wrap.className = "group relative";
    wrap.setAttribute("role", "listitem");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "block w-full aspect-square rounded-md hover:scale-[1.08] hover:z-10 transition-transform";
    btn.style.backgroundColor = hex;
    btn.style.boxShadow = "var(--shadow-ring)";
    btn.title = hex;
    btn.setAttribute("aria-label", `Select ${hex}`);
    btn.addEventListener("click", () => setActive(hex));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className =
      "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-fg)] text-[var(--color-bg)] text-[11px] leading-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center";
    remove.textContent = "×";
    remove.title = `Remove ${hex}`;
    remove.setAttribute("aria-label", `Remove ${hex} from palette`);
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = removeFromPalette(hex);
      renderPalette(next);
    });

    wrap.appendChild(btn);
    wrap.appendChild(remove);
    paletteGrid.appendChild(wrap);
  }
}

// ----------------------------------------------------------------------
// Clipboard
// ----------------------------------------------------------------------

async function copyToClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${label}: ${text}`);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      (document as Document & { execCommand: (cmd: string) => boolean }).execCommand("copy");
      showToast(`Copied ${label}: ${text}`);
    } catch {
      showToast("Could not copy — please copy manually");
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function wireCopyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((b) => {
    b.addEventListener("click", () => {
      if (!activeHex) return;
      const which = b.getAttribute("data-copy");
      const rgb = parseHex(activeHex);
      if (!rgb) return;
      switch (which) {
        case "hex": void copyToClipboard(formatHex(rgb), "HEX"); break;
        case "rgb": void copyToClipboard(formatRgb(rgb), "RGB"); break;
        case "hsl": void copyToClipboard(formatHsl(rgb), "HSL"); break;
        case "oklch": void copyToClipboard(formatOklch(rgb), "OKLCH"); break;
      }
    });
  });

  if (swatchEl) {
    swatchEl.style.cursor = "pointer";
    swatchEl.setAttribute("role", "button");
    swatchEl.setAttribute("tabindex", "0");
    swatchEl.setAttribute("aria-label", "Click to copy HEX");
    const handler = () => {
      if (activeHex) void copyToClipboard(activeHex, "HEX");
    };
    swatchEl.addEventListener("click", handler);
    swatchEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    });
  }
}

// ----------------------------------------------------------------------
// LIVE mode handler
// ----------------------------------------------------------------------

async function handlePick(): Promise<void> {
  if (!pickBtn) return;
  pickBtn.disabled = true;
  try {
    const hex = await pickColor();
    if (!hex) return;
    setActive(hex);
    const norm = formatHex(parseHex(hex)!);
    const next = addToPalette(norm);
    renderPalette(next);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Picker error: ${msg}`);
    console.warn("EyeDropper error:", err);
  } finally {
    pickBtn.disabled = false;
  }
}

// ----------------------------------------------------------------------
// SHOT mode — Screenshot picker with magnifier
// ----------------------------------------------------------------------

function openShotModal(): void {
  if (!shotModal) return;
  shotModal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // prevent background scroll
  resetShotModal();
}

function closeShotModal(): void {
  if (!shotModal) return;
  shotModal.classList.add("hidden");
  document.body.style.overflow = "";
  // Free GPU memory for the captured frame
  if (shotFrame) {
    try { shotFrame.bitmap.close(); } catch { /* ok */ }
    shotFrame = null;
  }
  shotCtx = null;
  if (shotLoupe) shotLoupe.classList.add("hidden");
}

function resetShotModal(): void {
  if (shotEmpty) shotEmpty.classList.remove("hidden");
  if (shotCanvas) shotCanvas.classList.add("hidden");
  if (shotLoupe) shotLoupe.classList.add("hidden");
  if (shotRecaptureBtn) shotRecaptureBtn.classList.add("hidden");
  if (shotCaptureBtn) {
    shotCaptureBtn.classList.remove("hidden");
    shotCaptureBtn.disabled = false;
    shotCaptureBtn.innerHTML =
      `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>Choose what to capture`;
  }
  if (shotStatus) shotStatus.textContent = "Select a screen, window, or tab to capture…";
  if (shotPreviewSwatch) shotPreviewSwatch.classList.add("hidden");
  if (shotPreviewHex) shotPreviewHex.classList.add("hidden");
  if (shotPreviewHint) shotPreviewHint.classList.remove("hidden");
}

async function triggerCapture(): Promise<void> {
  if (!shotCanvas || !shotCaptureBtn) return;

  shotCaptureBtn.disabled = true;
  const originalHTML = shotCaptureBtn.innerHTML;
  shotCaptureBtn.innerHTML =
    '<span class="font-medium">Capturing…</span>';
  if (shotStatus) shotStatus.textContent = "Pick something in the browser dialog…";

  try {
    const frame = await captureScreenFrame();
    if (!frame) {
      // user cancelled — restore CTA
      shotCaptureBtn.disabled = false;
      shotCaptureBtn.innerHTML = originalHTML;
      if (shotStatus) shotStatus.textContent = "Cancelled. Try again any time.";
      return;
    }
    shotFrame = frame;
    drawFrame(frame);

    if (shotEmpty) shotEmpty.classList.add("hidden");
    if (shotRecaptureBtn) shotRecaptureBtn.classList.remove("hidden");
    if (shotCaptureBtn) shotCaptureBtn.classList.add("hidden");
    if (shotStatus) {
      shotStatus.innerHTML =
        '<strong class="text-[var(--color-fg)]">Hover</strong> to preview · <strong class="text-[var(--color-fg)]">click</strong> to pick';
    }
  } catch (err) {
    console.warn("Screen capture failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Capture error: ${msg}`);
    shotCaptureBtn.disabled = false;
    shotCaptureBtn.innerHTML = originalHTML;
    if (shotStatus) shotStatus.textContent = "Capture failed. Try again.";
  }
}

function drawFrame(frame: CapturedFrame): void {
  if (!shotCanvas) return;

  // Size canvas to its natural resolution so getImageData reads accurate pixels.
  // Then constrain the rendered display via CSS max-width / max-height.
  shotCanvas.width = frame.width;
  shotCanvas.height = frame.height;
  shotCanvas.classList.remove("hidden");

  const ctx = shotCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  shotCtx = ctx;

  ctx.drawImage(frame.bitmap, 0, 0, frame.width, frame.height);

  // Loupe context
  if (shotLoupeCanvas) {
    const lctx = shotLoupeCanvas.getContext("2d");
    if (lctx) {
      lctx.imageSmoothingEnabled = false;
      loupeCtx = lctx;
    }
  }
}

// Hover preview + loupe magnifier
function onCanvasMouseMove(e: MouseEvent): void {
  if (!shotCanvas || !shotCtx || !shotFrame) return;
  const rect = shotCanvas.getBoundingClientRect();

  // Translate display coords → bitmap coords
  const scaleX = shotFrame.width / rect.width;
  const scaleY = shotFrame.height / rect.height;
  const bx = (e.clientX - rect.left) * scaleX;
  const by = (e.clientY - rect.top) * scaleY;

  if (bx < 0 || by < 0 || bx >= shotFrame.width || by >= shotFrame.height) {
    if (shotLoupe) shotLoupe.classList.add("hidden");
    return;
  }

  const hex = samplePixelHex(shotCtx, bx, by);
  if (shotPreviewSwatch) {
    shotPreviewSwatch.classList.remove("hidden");
    (shotPreviewSwatch as HTMLElement).style.backgroundColor = hex;
  }
  if (shotPreviewHex) {
    shotPreviewHex.classList.remove("hidden");
    shotPreviewHex.textContent = hex;
  }

  // Loupe — show magnified region around the cursor
  if (shotLoupe && loupeCtx && shotLoupeCanvas) {
    const loupeSize = shotLoupeCanvas.width; // 140
    const zoom = 8;
    const sampleSize = loupeSize / zoom; // ~17.5 px of source

    loupeCtx.clearRect(0, 0, loupeSize, loupeSize);
    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.drawImage(
      shotCanvas,
      bx - sampleSize / 2,
      by - sampleSize / 2,
      sampleSize,
      sampleSize,
      0,
      0,
      loupeSize,
      loupeSize,
    );

    // Position loupe near cursor but kept on-screen
    const wrapRect = (shotCanvas.parentElement as HTMLElement).getBoundingClientRect();
    let lx = e.clientX - wrapRect.left + 24;
    let ly = e.clientY - wrapRect.top + 24;
    if (lx + loupeSize > wrapRect.width) lx = e.clientX - wrapRect.left - loupeSize - 24;
    if (ly + loupeSize > wrapRect.height) ly = e.clientY - wrapRect.top - loupeSize - 24;
    shotLoupe.style.left = `${lx}px`;
    shotLoupe.style.top = `${ly}px`;
    shotLoupe.classList.remove("hidden");
  }
}

function onCanvasMouseLeave(): void {
  if (shotLoupe) shotLoupe.classList.add("hidden");
}

function onCanvasClick(e: MouseEvent): void {
  if (!shotCanvas || !shotCtx || !shotFrame) return;
  const rect = shotCanvas.getBoundingClientRect();
  const scaleX = shotFrame.width / rect.width;
  const scaleY = shotFrame.height / rect.height;
  const bx = (e.clientX - rect.left) * scaleX;
  const by = (e.clientY - rect.top) * scaleY;

  if (bx < 0 || by < 0 || bx >= shotFrame.width || by >= shotFrame.height) return;

  const hex = samplePixelHex(shotCtx, bx, by);
  const norm = formatHex(parseHex(hex)!);
  setActive(norm);
  const next = addToPalette(norm);
  renderPalette(next);
  showToast(`Picked ${norm}`);
  // Keep modal open so user can grab more colors from the same screenshot
}

// ----------------------------------------------------------------------
// Wire it all up
// ----------------------------------------------------------------------

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (readPalette().length === 0) return;
    if (!confirm("Clear all colors from history?")) return;
    clearPalette();
    renderPalette([]);
    showToast("Palette cleared");
  });
}

if (shotBtn) {
  shotBtn.addEventListener("click", openShotModal);
}
if (shotClose) shotClose.addEventListener("click", closeShotModal);
if (shotCaptureBtn) shotCaptureBtn.addEventListener("click", () => void triggerCapture());
if (shotRecaptureBtn) {
  shotRecaptureBtn.addEventListener("click", () => {
    if (shotFrame) {
      try { shotFrame.bitmap.close(); } catch { /* ok */ }
      shotFrame = null;
    }
    shotCtx = null;
    if (shotCanvas) shotCanvas.classList.add("hidden");
    if (shotEmpty) shotEmpty.classList.remove("hidden");
    if (shotRecaptureBtn) shotRecaptureBtn.classList.add("hidden");
    if (shotCaptureBtn) {
      shotCaptureBtn.classList.remove("hidden");
      shotCaptureBtn.disabled = false;
    }
    void triggerCapture();
  });
}
if (shotCanvas) {
  shotCanvas.addEventListener("mousemove", onCanvasMouseMove);
  shotCanvas.addEventListener("mouseleave", onCanvasMouseLeave);
  shotCanvas.addEventListener("click", onCanvasClick);
}

if (pickBtn) {
  pickBtn.addEventListener("click", () => {
    void handlePick();
  });
}

// Boot
configureForSupport();
wireCopyButtons();
renderPalette();

// Keyboard shortcuts: P to live-pick, Escape to close shot modal
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === "Escape" && shotModal && !shotModal.classList.contains("hidden")) {
    e.preventDefault();
    closeShotModal();
    return;
  }

  if ((e.key === "p" || e.key === "P") && (!shotModal || shotModal.classList.contains("hidden"))) {
    if (!pickBtn || pickBtn.disabled) return;
    e.preventDefault();
    void handlePick();
  }
});
