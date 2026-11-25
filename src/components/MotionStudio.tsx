import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Code2,
  Copy,
  Download,
  Film,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { copyTextToClipboard, toPersianDigits } from '../utils/helpers';
import { exportIframeCanvasToMp4 } from '../utils/mp4Exporter';

interface MotionStudioProps {
  todayItem: HistoryItem | null;
  focusedIdeaId?: string | null;
  history: HistoryItem[];
  selectedModel: string;
  onGoToHome: () => void;
  onShowToast: (text: string) => void;
}

const STYLE_PRESETS = [
  'قوس مجله‌ای روی صورتی گرد و غباری (#EBC3BC)',
  'کارت کاغذی کرم گرم (#F6EBDD) با تایپوگرافی آلویی',
  'اسلایدشو استوری‌های امروز با تگ خردلی (#E3A92F)',
];

function buildDefaultMotionHtml(params: {
  title: string;
  concept: string;
  lines: string[];
  durationSec: number;
  photoDataUrl?: string;
}): string {
  const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
  const durationMs = params.durationSec * 1000;
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800;900&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #F6EBDD;
    font-family: 'Vazirmatn', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 8px;
    overflow: hidden;
  }
  canvas {
    width: 100%;
    max-width: 270px;
    aspect-ratio: 9 / 16;
    border-radius: 16px;
    border: 1px solid #DECBB8;
    display: block;
    background: #EBC3BC;
  }
  .bar {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    width: 100%;
    max-width: 270px;
  }
  button {
    flex: 1;
    height: 36px;
    border-radius: 999px;
    border: 1px solid #5C1A2B;
    font-family: 'Vazirmatn', sans-serif;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  .btn-replay { background: #FBF5EC; color: #5C1A2B; }
  .btn-mp4 { background: #C2553A; color: #FBF5EC; border-color: #C2553A; }
</style>
</head>
<body>
  <canvas id="madoCanvas" width="1080" height="1920"></canvas>
  <div class="bar">
    <button class="btn-replay" id="replayBtn" type="button">پخش مجدد</button>
    <button class="btn-mp4" id="exportBtn" type="button">رندر و ذخیره MP4</button>
  </div>
<script>
  const TITLE = ${safeJson(params.title)};
  const CONCEPT = ${safeJson(params.concept)};
  const LINES = ${safeJson(params.lines.slice(0, 5))};
  const DURATION = ${durationMs};
  const PHOTO_URL = ${safeJson(params.photoDataUrl || '')};
  window.MADO_PHOTO_DATA_URL = PHOTO_URL;

  const canvas = document.getElementById('madoCanvas');
  const ctx = canvas.getContext('2d');
  let photoImg = null;
  if (PHOTO_URL) {
    photoImg = new Image();
    photoImg.src = PHOTO_URL;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }

  function wrapRtlText(text, maxWidth, font) {
    ctx.font = font;
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  window.renderMadoFrame = function(timeMs, totalMs) {
    const dur = totalMs || DURATION;
    const p = Math.min(1, Math.max(0, timeMs / dur));
    const W = 1080, H = 1920;

    ctx.fillStyle = '#EBC3BC';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#F6EBDD';
    ctx.beginPath();
    ctx.roundRect(64, 180, W - 128, H - 360, 44);
    ctx.fill();
    ctx.strokeStyle = '#5C1A2B';
    ctx.lineWidth = 3;
    ctx.stroke();

    const archProgress = easeOutCubic(p * 3.2);
    const archX = 132, archY = 250, archW = W - 264, archH = 740;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(archX, archY + archH);
    ctx.lineTo(archX, archY + archW / 2);
    ctx.arc(archX + archW / 2, archY + archW / 2, archW / 2, Math.PI, 0, false);
    ctx.lineTo(archX + archW, archY + archH);
    ctx.closePath();
    ctx.clip();

    if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
      const scale = Math.max(archW / photoImg.naturalWidth, archH / photoImg.naturalHeight) * (1.04 - 0.04 * p);
      const dw = photoImg.naturalWidth * scale;
      const dh = photoImg.naturalHeight * scale;
      ctx.drawImage(photoImg, archX + (archW - dw) / 2, archY + (archH - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#2F3A1E';
      ctx.fillRect(archX, archY, archW, archH);
      ctx.fillStyle = '#F6EBDD';
      ctx.textAlign = 'center';
      ctx.font = '800 46px Vazirmatn';
      ctx.fillText('mado.fingerfood.tabriz', W / 2, archY + archH / 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#2F3A1E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(archX, archY + archH);
    ctx.lineTo(archX, archY + archW / 2);
    ctx.arc(archX + archW / 2, archY + archW / 2, archW / 2, Math.PI, 0, false);
    ctx.lineTo(archX + archW, archY + archH);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const badgeY = 1030 + (1 - archProgress) * 28;
    ctx.globalAlpha = archProgress;
    ctx.fillStyle = '#E3A92F';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 210, badgeY, 420, 62, 31);
    ctx.fill();
    ctx.fillStyle = '#5C1A2B';
    ctx.textAlign = 'center';
    ctx.font = '800 30px Vazirmatn';
    ctx.fillText('مادو · فینگرفود تبریز', W / 2, badgeY + 41);

    const titleP = easeOutCubic((p - 0.1) * 3);
    ctx.globalAlpha = titleP;
    ctx.fillStyle = '#5C1A2B';
    const titleLines = wrapRtlText(TITLE, W - 220, '900 54px Vazirmatn');
    let y = 1175 + (1 - titleP) * 32;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 74;
    }

    const list = LINES.length ? LINES : [CONCEPT];
    const slotDur = 0.72 / list.length;
    const activeIdx = Math.min(list.length - 1, Math.max(0, Math.floor((p - 0.2) / slotDur)));
    const localP = easeOutCubic(((p - 0.2) - activeIdx * slotDur) / (slotDur * 0.45));
    if (p >= 0.2) {
      ctx.globalAlpha = localP;
      ctx.fillStyle = '#3B2A22';
      const bodyLines = wrapRtlText(list[activeIdx], W - 240, '600 38px Vazirmatn');
      let by = y + 32 + (1 - localP) * 22;
      for (const bl of bodyLines.slice(0, 3)) {
        ctx.fillText(bl, W / 2, by);
        by += 54;
      }
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#DECBB8';
    ctx.fillRect(180, 1625, W - 360, 8);
    ctx.fillStyle = '#C2553A';
    ctx.fillRect(180, 1625, (W - 360) * p, 8);

    ctx.fillStyle = 'rgba(92, 26, 43, 0.58)';
    ctx.font = '600 26px Vazirmatn';
    ctx.fillText('mado.fingerfood.tabriz', W / 2, 1685);
  };

  let startTime = performance.now();
  function tick(now) {
    const elapsed = (now - startTime) % DURATION;
    window.renderMadoFrame(elapsed, DURATION);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.getElementById('replayBtn').addEventListener('click', () => {
    startTime = performance.now();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'MADO_EXPORT_MP4', durationMs: DURATION }, '*');
  });
</script>
</body>
</html>`;
}

export const MotionStudio: React.FC<MotionStudioProps> = ({
  todayItem,
  focusedIdeaId,
  history,
  selectedModel,
  onGoToHome,
  onShowToast,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    focusedIdeaId || todayItem?.id || history[0]?.id || ''
  );

  useEffect(() => {
    if (focusedIdeaId) {
      setSelectedSourceId(focusedIdeaId);
    } else if (todayItem && !selectedSourceId) {
      setSelectedSourceId(todayItem.id);
    }
  }, [focusedIdeaId, todayItem, selectedSourceId]);

  const activeItem = useMemo(
    () => history.find((h) => h.id === selectedSourceId) || todayItem || history[0] || null,
    [history, selectedSourceId, todayItem]
  );

  const [durationSec, setDurationSec] = useState<number>(8);
  const [stylePreset, setStylePreset] = useState<string>(STYLE_PRESETS[0]);
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStage, setExportStage] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!activeItem) return;
    const lines = (activeItem.idea.items || []).map((it) =>
      [it.headline, it.body_text].filter(Boolean).join(' — ')
    );
    setHtmlCode(
      buildDefaultMotionHtml({
        title: activeItem.idea.title,
        concept: activeItem.idea.concept,
        lines,
        durationSec,
        photoDataUrl: activeItem.uploadedPhotoPreview,
      })
    );
  }, [activeItem, durationSec]);

  const handleExportMp4 = async () => {
    if (isExporting || !iframeRef.current) return;
    setIsExporting(true);
    setExportProgress(2);
    setExportStage('شروع رندر فریم‌ها…');

    try {
      const { blob, extension } = await exportIframeCanvasToMp4({
        iframe: iframeRef.current,
        durationSec,
        fps: 30,
        width: 720,
        height: 1280,
        onProgress: (pct, stage) => {
          setExportProgress(pct);
          setExportStage(stage);
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `madoGenerator-motion-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`فایل ویدیویی ${extension.toUpperCase()} با موفقیت ذخیره شد ✓`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در رندر ویدیو MP4';
      onShowToast(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const exportHandlerRef = useRef(handleExportMp4);
  exportHandlerRef.current = handleExportMp4;

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'MADO_EXPORT_MP4') {
        exportHandlerRef.current();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const handleGenerateWithGemini = async () => {
    if (!activeItem || isGenerating) return;
    setIsGenerating(true);
    try {
      const slideTexts = (activeItem.idea.items || []).map((it) =>
        `${it.headline} ${it.body_text || ''}`.trim()
      );
      const res = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaTitle: activeItem.idea.title,
          ideaConcept: activeItem.idea.concept,
          slideTexts,
          durationSec,
          stylePreset,
          preferredModel: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.htmlCode) {
        throw new Error(data.error || 'خطا در تولید کد موشن با جمنای');
      }

      let finalHtml: string = data.htmlCode;
      if (activeItem.uploadedPhotoPreview) {
        const inject = `<script>window.MADO_PHOTO_DATA_URL = ${JSON.stringify(
          activeItem.uploadedPhotoPreview
        )};</script>`;
        finalHtml = finalHtml.includes('<head>')
          ? finalHtml.replace('<head>', `<head>${inject}`)
          : `${inject}${finalHtml}`;
      }
      setHtmlCode(finalHtml);
      onShowToast(`کد موشن ۹:۱۶ با مدل ${data.usedModel || selectedModel} ساخته شد ✓`);
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setIsGenerating(false);
    }
  };

  const isUsingToday = Boolean(todayItem && activeItem && todayItem.id === activeItem.id);

  return (
    <div className="p-5 space-y-4 animate-card-enter">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-extrabold text-[#5C1A2B]">موشن‌ساز MP4</h1>
          <p className="text-[11px] text-[#6E564B]">
            انیمیشن ۹:۱۶ با پالت مادو هماهنگ با ایده‌ی روز و دانلود مستقیم MP4
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#2F3A1E] text-[#F6EBDD] text-[10px] font-bold">
          ۹:۱۶ · MP4
        </span>
      </div>

      {!activeItem ? (
        <div className="paper-surface rounded-[22px] p-6 text-center space-y-3">
          <Clapperboard className="w-8 h-8 text-[#C2553A] mx-auto" strokeWidth={1.75} />
          <h2 className="text-sm font-extrabold text-[#5C1A2B]">هنوز ایده‌ای برای امروز ثبت نشده</h2>
          <p className="text-xs text-[#6E564B] leading-relaxed">
            ابتدا در تب خانه عکس محصول را آپلود کن و ایده‌ی روز را بساز تا موشن‌ساز به‌طور خودکار
            کانتکست امروز را بخواند.
          </p>
          <button
            type="button"
            onClick={onGoToHome}
            className="h-11 px-5 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-xs font-extrabold"
          >
            رفتن به تب ساخت ایده
          </button>
        </div>
      ) : (
        <>
          <div className="rose-surface rounded-[20px] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[#5C1A2B] px-2.5 py-0.5 rounded-full bg-[#E3A92F]">
                {isUsingToday ? 'کانتکست خودکار ایده‌ی امروز' : 'کانتکست انتخاب‌شده از تاریخچه'}
              </span>
              {history.length > 1 && (
                <select
                  value={activeItem.id}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="text-[11px] bg-[#FBF5EC] text-[#3B2A22] border border-[#DECBB8] rounded-full px-2.5 py-1 outline-none max-w-[180px]"
                >
                  {history.slice(0, 12).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.createdAt} — {h.idea.title.slice(0, 24)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <h2 className="text-sm font-extrabold text-[#5C1A2B]">{activeItem.idea.title}</h2>
            <p className="text-xs text-[#3B2A22] leading-relaxed">{activeItem.idea.concept}</p>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#5C1A2B]">مدت انیمیشن</span>
              <div className="flex gap-1.5">
                {[6, 8, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDurationSec(sec)}
                    className={`h-8 px-3 rounded-full text-xs font-bold border ${
                      durationSec === sec
                        ? 'bg-[#E3A92F] text-[#5C1A2B] border-[#E3A92F]'
                        : 'bg-[#F6EBDD] text-[#3B2A22] border-[#DECBB8]'
                    }`}
                  >
                    {toPersianDigits(sec)} ثانیه
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-[#5C1A2B]">قالب موشن ادیتوریال</span>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStylePreset(preset)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                      stylePreset === preset
                        ? 'bg-[#5C1A2B] text-[#F6EBDD] border-[#5C1A2B]'
                        : 'bg-[#F6EBDD] text-[#3B2A22] border-[#DECBB8]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateWithGemini}
              disabled={isGenerating}
              className="w-full h-11 rounded-full bg-[#E3A92F] text-[#5C1A2B] font-extrabold text-xs flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال تولید کد انیمیشن ۹:۱۶ با {selectedModel}…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تولید کد موشن اختصاصی با جمنای</span>
                </>
              )}
            </button>
          </div>

          <div className="paper-surface rounded-[22px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#C2553A]" />
                <span>پیش‌نمایش زنده ۹:۱۶</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCode((p) => !p)}
                  className="h-8 px-2.5 rounded-full text-[11px] font-bold bg-[#F6EBDD] border border-[#DECBB8] text-[#3B2A22] flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showCode ? 'بستن کد' : 'کد HTML'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await copyTextToClipboard(htmlCode);
                    onShowToast('کد کامل موشن کپی شد ✓');
                  }}
                  className="h-8 px-2.5 rounded-full text-[11px] font-bold bg-[#F6EBDD] border border-[#DECBB8] text-[#3B2A22] flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی</span>
                </button>
              </div>
            </div>

            <iframe
              ref={iframeRef}
              title="پیش‌نمایش موشن مادو"
              srcDoc={htmlCode}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-[545px] rounded-[16px] border border-[#DECBB8] bg-[#F6EBDD]"
            />

            {isExporting && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#5C1A2B]">
                  <span>{exportStage}</span>
                  <span>{toPersianDigits(exportProgress)}٪</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EBC3BC] overflow-hidden">
                  <div
                    className="h-full bg-[#C2553A] transition-all"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportMp4}
              disabled={isExporting}
              className="w-full h-12 rounded-full bg-[#C2553A] text-[#FBF5EC] font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال انکودینگ MP4…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>رندر و دانلود مستقیم ویدیو MP4</span>
                </>
              )}
            </button>

            {showCode && (
              <textarea
                dir="ltr"
                rows={10}
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="w-full p-3 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8] text-[11px] font-mono text-[#3B2A22] outline-none"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
