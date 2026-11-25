import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

interface WebCodecsFrame {
  close: () => void;
}

interface WebCodecsEncoder {
  configure: (config: Record<string, unknown>) => void;
  encode: (frame: WebCodecsFrame, options?: { keyFrame?: boolean }) => void;
  flush: () => Promise<void>;
  close: () => void;
}

interface WebCodecsWindow {
  VideoEncoder?: new (init: {
    output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => void;
    error: (err: Error) => void;
  }) => WebCodecsEncoder;
  VideoFrame?: new (
    source: HTMLCanvasElement,
    init: { timestamp: number; duration?: number }
  ) => WebCodecsFrame;
}

export interface ExportMp4Options {
  iframe: HTMLIFrameElement;
  durationSec: number;
  fps?: number;
  width?: number;
  height?: number;
  onProgress?: (percent: number, stage: string) => void;
}

export async function exportIframeCanvasToMp4(options: ExportMp4Options): Promise<{
  blob: Blob;
  extension: 'mp4' | 'webm';
}> {
  const fps = options.fps ?? 30;
  const width = options.width ?? 720;
  const height = options.height ?? 1280;
  const durationMs = Math.max(3000, Math.round(options.durationSec * 1000));
  const totalFrames = Math.round((durationMs / 1000) * fps);

  const win = options.iframe.contentWindow as
    | (Window & { renderMadoFrame?: (timeMs: number, durationMs: number) => void })
    | null;
  const doc = options.iframe.contentDocument;

  if (!win || !doc) {
    throw new Error('محیط پیش‌نمایش موشن در دسترس نیست.');
  }

  const sourceCanvas = doc.querySelector<HTMLCanvasElement>('#madoCanvas, canvas');
  if (!sourceCanvas) {
    throw new Error('بوم انیمیشن (Canvas) داخل پیش‌نمایش یافت نشد.');
  }

  const encodeCanvas = document.createElement('canvas');
  encodeCanvas.width = width;
  encodeCanvas.height = height;
  const encodeCtx = encodeCanvas.getContext('2d');
  if (!encodeCtx) {
    throw new Error('ایجاد Context رندر ویدیو ممکن نشد.');
  }

  const wc = window as unknown as WebCodecsWindow;
  const hasWebCodecs = Boolean(wc.VideoEncoder && wc.VideoFrame);

  if (hasWebCodecs && wc.VideoEncoder && wc.VideoFrame) {
    options.onProgress?.(4, 'آماده‌سازی انکودر H.264 (MP4)…');

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
      },
      fastStart: 'in-memory',
    });

    let encoderError: Error | null = null;
    const encoder = new wc.VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err;
      },
    });

    encoder.configure({
      codec: 'avc1.420028',
      width,
      height,
      bitrate: 4_500_000,
      framerate: fps,
    });

    const frameDurationUs = Math.round(1_000_000 / fps);

    for (let i = 0; i < totalFrames; i++) {
      if (encoderError) throw encoderError;

      const timeMs = (i / fps) * 1000;
      if (typeof win.renderMadoFrame === 'function') {
        win.renderMadoFrame(timeMs, durationMs);
      } else {
        await new Promise((r) => window.setTimeout(r, Math.round(1000 / fps)));
      }

      encodeCtx.clearRect(0, 0, width, height);
      encodeCtx.drawImage(sourceCanvas, 0, 0, width, height);

      const frame = new wc.VideoFrame(encodeCanvas, {
        timestamp: i * frameDurationUs,
        duration: frameDurationUs,
      });

      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      if (i % 5 === 0 || i === totalFrames - 1) {
        const pct = Math.min(94, Math.round(((i + 1) / totalFrames) * 92));
        options.onProgress?.(pct, `رندر فریم ${i + 1} از ${totalFrames}…`);
        await new Promise((r) => window.setTimeout(r, 0));
      }
    }

    options.onProgress?.(97, 'نهایی‌سازی فایل MP4…');
    await encoder.flush();
    encoder.close();
    muxer.finalize();

    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    options.onProgress?.(100, 'فایل MP4 آماده دانلود است ✓');
    return { blob, extension: 'mp4' };
  }

  options.onProgress?.(10, 'ضبط مستقیم ویدیو با MediaRecorder…');
  const stream = sourceCanvas.captureStream(fps);
  const preferredMimes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  const mimeType = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  const start = performance.now();
  while (performance.now() - start < durationMs) {
    const elapsed = performance.now() - start;
    if (typeof win.renderMadoFrame === 'function') {
      win.renderMadoFrame(elapsed, durationMs);
    }
    const pct = Math.min(95, Math.round((elapsed / durationMs) * 95));
    options.onProgress?.(pct, 'در حال ضبط فریم‌ها…');
    await new Promise((r) => requestAnimationFrame(r));
  }

  recorder.stop();
  await stopped;
  const isMp4 = mimeType.includes('mp4');
  const blob = new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
  options.onProgress?.(100, 'ویدیو آماده دانلود است ✓');
  return { blob, extension: isMp4 ? 'mp4' : 'webm' };
}
