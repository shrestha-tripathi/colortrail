/**
 * Screen / window / tab capture via getDisplayMedia API.
 *
 * Used by Screenshot Picker mode — the user picks any window or tab to
 * capture, we grab a single frozen frame, then they pick colors from that
 * frame leisurely with a magnifier. Solves the "EyeDropper cancels when I
 * switch tabs" problem.
 *
 * Browser support: Chrome 72+, Firefox 66+, Edge 79+, Safari 13+. Universal.
 * No special permissions beyond the standard "share screen" picker prompt.
 *
 * Pattern: getDisplayMedia → first video frame → ImageBitmap → canvas →
 * sample pixel via ctx.getImageData on click. Track stops immediately
 * after frame capture (no ongoing recording).
 */

/**
 * Capture one frame from a user-selected screen / window / tab.
 *
 * Returns the frame as an ImageBitmap (efficient blit to canvas) plus its
 * natural width/height. Returns null if the user cancels the picker.
 *
 * Throws if getDisplayMedia is unsupported or the user denies after picking.
 */
export interface CapturedFrame {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export function hasDisplayCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

export async function captureScreenFrame(): Promise<CapturedFrame | null> {
  if (!hasDisplayCapture()) {
    throw new Error("Screen capture not supported in this browser");
  }

  let stream: MediaStream | null = null;
  try {
    // Don't restrict video size — we want the source's native resolution
    // for accurate per-pixel sampling. `cursor: "never"` is Chromium-only
    // but harmless elsewhere (silently ignored as an unknown constraint).
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "never",
      } as MediaTrackConstraints,
      audio: false,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return null; // user clicked "Cancel" on the picker
    }
    throw err;
  }

  const track = stream.getVideoTracks()[0];
  if (!track) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("No video track returned by getDisplayMedia");
  }

  try {
    // Prefer ImageCapture API when available (cleanest path: track → bitmap)
    type ImageCaptureCtor = new (track: MediaStreamTrack) => {
      grabFrame(): Promise<ImageBitmap>;
    };
    const ImageCaptureClass = (window as Window & {
      ImageCapture?: ImageCaptureCtor;
    }).ImageCapture;

    if (ImageCaptureClass) {
      try {
        const ic = new ImageCaptureClass(track);
        const bitmap = await ic.grabFrame();
        return { bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        // Fall through to <video> path
      }
    }

    // Fallback: feed track into a <video>, wait one frame, createImageBitmap
    const bitmap = await captureViaVideoElement(stream);
    return bitmap;
  } finally {
    // CRITICAL: stop the track immediately. We only wanted one frame.
    // Without this, the browser keeps showing "Site is sharing your screen"
    // indicator until the tab is closed.
    stream.getTracks().forEach((t) => t.stop());
  }
}

async function captureViaVideoElement(
  stream: MediaStream,
): Promise<CapturedFrame> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video element failed to load"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    void video.play().catch(reject);
  });

  // Give the decoder a tick to settle on the first real frame (some
  // browsers report dimensions before the first frame is fully decoded).
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Captured frame has zero dimensions");
  }

  const bitmap = await createImageBitmap(video);
  // Best-effort cleanup of the temp video element
  try {
    video.pause();
    video.srcObject = null;
  } catch {
    /* ignore */
  }

  return { bitmap, width, height };
}

/**
 * Convert a captured frame to a hex string at a given (x, y) coordinate
 * relative to the bitmap's natural dimensions.
 *
 * Caller is expected to translate from canvas display coords to bitmap
 * coords (multiply by `bitmap.width / canvas.clientWidth` etc.).
 */
export function samplePixelHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): string {
  const data = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  const r = data[0] ?? 0;
  const g = data[1] ?? 0;
  const b = data[2] ?? 0;
  const h = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${h(r)}${h(g)}${h(b)}`;
}
