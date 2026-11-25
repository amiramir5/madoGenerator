import {
  AdvancedSettings,
  CandidateIdeaBrief,
  DEFAULT_CARD_STYLES,
  DEFAULT_CONTENT_ANGLES,
  DEFAULT_FONT_PAIRS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_TEXT_LAYOUTS,
  EditableFontPair,
  FIXED_PROMPT_CLAUSE,
  FORBIDDEN_CLICHES,
  FORBIDDEN_COLOR_FOOD_REGEX,
  GeneratedIdea,
  HistoryItem,
  IdeaType,
  IDEA_TYPE_LABELS,
  PaletteColor,
  PrePostCheck,
  RevisedSentence,
  SENTENCE_STRUCTURES,
  UsedIdeaEntry,
} from '../types';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] || d);
}

export function getTodayDates(): { jalali: string; gregorian: string } {
  const now = new Date();
  let jalali = '';
  try {
    jalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now);
  } catch {
    jalali = toPersianDigits(now.toLocaleDateString('fa-IR'));
  }
  const gregorian = now.toISOString().split('T')[0];
  return { jalali, gregorian };
}

export function resolveActiveGeminiModel(settings: AdvancedSettings): string {
  const custom = (settings.customGeminiModel || '').trim();
  if (custom) return custom;
  return (settings.geminiModel || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
}

export function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeStorageSet<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function safeStorageRemove(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.right = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}

export function buildChatGptUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  if (encoded.length < 7000) {
    return `https://chatgpt.com/?q=${encoded}`;
  }
  return 'https://chatgpt.com/';
}

export function formatResultTypeBadge(type: IdeaType, itemsCount: number): string {
  const baseLabel = IDEA_TYPE_LABELS[type] || 'سری استوری';
  if (type === 'story' || type === 'carousel' || type === 'combo') {
    const count = itemsCount > 0 ? itemsCount : 1;
    return count === 1 ? `تک‌${baseLabel}` : `${baseLabel} ${toPersianDigits(count)}تایی`;
  }
  return baseLabel;
}

export function createUsedIdeaEntry(params: {
  id: string;
  idea: GeneratedIdea;
  createdAt: string;
  confirmed?: boolean;
}): UsedIdeaEntry {
  const rawKeywords = [
    params.idea.title,
    params.idea.selected_angle,
    ...(params.idea.items || []).map((i) => i.headline),
  ]
    .join(' ')
    .replace(/[.!؟?،,:«»]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  return {
    id: params.id,
    title: params.idea.title,
    concept: params.idea.concept,
    angle: params.idea.selected_angle,
    keywords: Array.from(new Set(rawKeywords)).slice(0, 10),
    createdAt: params.createdAt,
    timestamp: Date.now(),
    confirmed: Boolean(params.confirmed),
  };
}

export async function compressUploadedImageFile(
  file: File,
  maxDimension: number = 1024
): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل عکس.'));
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('فرمت تصویر قابل بارگذاری نیست.'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              base64: resultStr.split(',')[1] || '',
              mimeType: file.type || 'image/jpeg',
              dataUrl: resultStr,
            });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            base64: jpegDataUrl.split(',')[1] || '',
            mimeType: 'image/jpeg',
            dataUrl: jpegDataUrl,
          });
        } catch {
          resolve({
            base64: resultStr.split(',')[1] || '',
            mimeType: file.type || 'image/jpeg',
            dataUrl: resultStr,
          });
        }
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}

export function enforceHeadlineRule(rawHeadline: string): string {
  if (!rawHeadline) return 'چیدمان مرتب سینی برای پذیرایی راحت.';
  let cleaned = rawHeadline.replace(/^[«"']+|["»']+$/g, '').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length > 8) {
    cleaned = words.slice(0, 8).join(' ');
  }
  cleaned = cleaned.replace(/[.!؟?،,;؛:…]+$/g, '').trim();
  return `${cleaned}.`;
}

export function buildStandardFinalPrompt(params: {
  visualType: string;
  frameStyle?: string;
  bgHex: string;
  textHex: string;
  textLayout: string;
  cardStyle: string;
  titleFont: string;
  bodyFont: string;
  headline: string;
  bodyText?: string;
}): string {
  const cleanHeadline = enforceHeadlineRule(params.headline);
  const cleanBody = (params.bodyText || '').trim();

  const lines: string[] = [
    `مشخصات اجرایی طرح (بر اساس عکس واقعی پیوست از ${params.visualType || 'محصول فینگرفود مادو'}):`,
    `- قاب و چیدمان برندی: ${params.frameStyle || params.cardStyle}؛ جایگاه متن: بخش «${params.textLayout}» در فضای امن (بدون افتادن باکس مشکی یا تیره روی غذا).`,
    `- پالت مات مادو: پس‌زمینه/کارت ${params.bgHex}، متن اصلی ${params.textHex}، تگ/خط تاکید خردلی #E3A92F یا آجری #C2553A و جزئیات سبز زیتونی #2F3A1E.`,
    `- متن تیتر (فونت «${params.titleFont}» خوانا و مجله‌ای): «${cleanHeadline}» (فارسی، دقیقاً همین و فقط همین، بدون غلط املایی).`,
  ];

  if (cleanBody && cleanBody !== cleanHeadline) {
    lines.push(
      `- متن مکمل (زیر تیتر، فونت «${params.bodyFont}»): «${cleanBody}» (فارسی، دقیقاً همین و فقط همین، بدون غلط املایی).`
    );
  }

  lines.push('- هیچ شعار، افکت نئونی، گرادیان براق یا عنصر اضافه‌ای به تصویر اضافه نکن.');
  return `${FIXED_PROMPT_CLAUSE}\n\n${lines.join('\n')}`;
}

export function computeAutoPrePostChecks(idea: GeneratedIdea): PrePostCheck[] {
  const allTexts = [
    idea.title,
    idea.concept,
    ...(idea.items || []).flatMap((i) => [i.headline, i.body_text || '']),
  ].join(' ');

  const foundForbidden = FORBIDDEN_CLICHES.filter((w) => allTexts.includes(w));
  const hasCheExclamation = /چه\s+[^\n.؟]{1,30}!/.test(allTexts);
  const colorFoodMatches = allTexts.match(FORBIDDEN_COLOR_FOOD_REGEX) || [];
  const dmCount = (idea.items || []).filter(
    (it) =>
      it.is_dm_cta ||
      /دایرکت|پیام\s*بده|سفارش\s*بده|ثبت\s*سفارش/.test(`${it.headline} ${it.body_text || ''}`)
  ).length;

  return [
    {
      label: 'نبود صفات تعریف‌آمیز و شعار تبلیغاتی',
      passed: foundForbidden.length === 0,
      note:
        foundForbidden.length === 0
          ? 'هیچ کلمه‌ی تعریف‌آمیز یا کلیشه‌ای یافت نشد.'
          : `موارد نیازمند اصلاح: ${foundForbidden.join('، ')}`,
    },
    {
      label: 'نبود ساختار تعجبی «چه ... !»',
      passed: !hasCheExclamation,
      note: !hasCheExclamation
        ? 'لحن محاوره‌ای و بزرگسالانه رعایت شده است.'
        : 'ساختار «چه ... !» در متن دیده شد؛ پیش از انتشار بازنویسی شود.',
    },
    {
      label: 'عدم توصیف غذا با رنگ (مثل «لقمه نارنجی»)',
      passed: colorFoodMatches.length === 0,
      note:
        colorFoodMatches.length === 0
          ? 'توصیف محصول خنثی و بدون برچسب رنگی غذاست.'
          : `عبارت رنگی شناسایی شد: ${colorFoodMatches.join('، ')}`,
    },
    {
      label: 'سقف حداکثر ۱ استوری دعوت به دایرکت در کل سری',
      passed: dmCount <= 1,
      note:
        dmCount <= 1
          ? `تعداد استوری دعوت به دایرکت: ${toPersianDigits(dmCount)} از مجاز ۱.`
          : `تعداد دعوت به دایرکت (${toPersianDigits(dmCount)}) بیش از سقف مجاز است.`,
    },
    {
      label: 'دستور حفظ کامل عکس واقعی در پرامپت‌های تصویر',
      passed: (idea.items || []).every((it) => it.prompt.includes('تغییر نکند')),
      note: 'بند حفظ رنگ، نور، بافت و شکل واقعی محصول در همه‌ی پرامپت‌ها تزریق شده است.',
    },
  ];
}

export function pickRandomCreativeSeeds(
  settings: AdvancedSettings,
  history: HistoryItem[],
  usedIdeas: UsedIdeaEntry[] = []
): {
  selectedAngle: string;
  selectedTextLayout: string;
  selectedFontPair: EditableFontPair;
  selectedCardStyle: string;
  selectedSentenceStructure: string;
  orderCallAllowed: boolean;
} {
  const last15 = history.slice(0, 15);
  const anglesPool = settings.contentAngles?.length
    ? settings.contentAngles
    : DEFAULT_CONTENT_ANGLES;
  const layoutsPool = settings.textLayouts?.length ? settings.textLayouts : DEFAULT_TEXT_LAYOUTS;
  const fontsPool = settings.fontPairs?.length ? settings.fontPairs : DEFAULT_FONT_PAIRS;
  const cardsPool = settings.cardStyles?.length ? settings.cardStyles : DEFAULT_CARD_STYLES;

  const recentAnglesUsed = new Set([
    ...last15.slice(0, 5).map((h) => h.idea.selected_angle).filter(Boolean),
    ...usedIdeas.slice(0, 5).map((u) => u.angle).filter(Boolean),
  ]);

  const recentHasOrderCall = last15.slice(0, 4).some((h) => {
    const ang = h.idea.selected_angle || '';
    return ang.includes('سفارش') || ang.includes('دایرکت');
  });

  let candidateAngles = anglesPool.filter((ang) => {
    const isOrderAngle = ang.includes('سفارش') || ang.includes('دایرکت');
    if (isOrderAngle && recentHasOrderCall) return false;
    return !recentAnglesUsed.has(ang);
  });

  if (candidateAngles.length === 0) {
    candidateAngles = anglesPool.filter((ang) =>
      recentHasOrderCall ? !ang.includes('سفارش') : true
    );
  }
  if (candidateAngles.length === 0) candidateAngles = anglesPool;

  const selectedAngle =
    candidateAngles[Math.floor(Math.random() * candidateAngles.length)] || anglesPool[0];

  const recentLayouts = new Set(
    last15.slice(0, 2).map((h) => h.idea.design?.text_layout).filter(Boolean)
  );
  const candidateLayouts = layoutsPool.filter((l) => !recentLayouts.has(l));
  const selectedTextLayout =
    (candidateLayouts.length ? candidateLayouts : layoutsPool)[
      Math.floor(Math.random() * (candidateLayouts.length || layoutsPool.length))
    ] || layoutsPool[0];

  const recentFontKeys = new Set(
    last15.slice(0, 3).map((h) => `${h.idea.design?.fonts?.title}|${h.idea.design?.fonts?.body}`)
  );
  const candidateFonts = fontsPool.filter(
    (fp) => !recentFontKeys.has(`${fp.title}|${fp.body}`)
  );
  const finalFonts = candidateFonts.length ? candidateFonts : fontsPool;
  const selectedFontPair =
    finalFonts[Math.floor(Math.random() * finalFonts.length)] || fontsPool[0];

  const recentCards = new Set(
    last15.slice(0, 2).map((h) => h.idea.design?.card_style).filter(Boolean)
  );
  const candidateCards = cardsPool.filter((c) => !recentCards.has(c));
  const finalCards = candidateCards.length ? candidateCards : cardsPool;
  const selectedCardStyle =
    finalCards[Math.floor(Math.random() * finalCards.length)] || cardsPool[0];

  const lastStructure = last15[0]?.idea?.sentence_structure || '';
  const candidateStructures = SENTENCE_STRUCTURES.filter((s) => s !== lastStructure);
  const selectedSentenceStructure =
    candidateStructures[Math.floor(Math.random() * candidateStructures.length)] ||
    SENTENCE_STRUCTURES[0];

  return {
    selectedAngle,
    selectedTextLayout,
    selectedFontPair,
    selectedCardStyle,
    selectedSentenceStructure,
    orderCallAllowed: !recentHasOrderCall,
  };
}

function repairJsonString(input: string): string {
  const cleaned = input.replace(/,\s*([}\]])/g, '$1');
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
      } else if (ch === '\\') {
        result += ch;
        escaped = true;
      } else if (ch === '"') {
        let j = i + 1;
        while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
        const nextNonSpace = cleaned[j];
        if (
          nextNonSpace === ':' ||
          nextNonSpace === ',' ||
          nextNonSpace === '}' ||
          nextNonSpace === ']' ||
          nextNonSpace === undefined
        ) {
          inString = false;
          result += ch;
        } else {
          result += '»';
        }
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '';
      } else if (ch === '\t') {
        result += '\\t';
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') inString = true;
      result += ch;
    }
  }

  return result.replace(/,\s*([}\]])/g, '$1');
}

export function parseRawIdeaJson(rawText: string, fallbackType: IdeaType = 'story'): GeneratedIdea {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('پاسخ دریافتی از هوش مصنوعی خالی است.');
  }

  const withoutFences = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('ساختار JSON معتبر در پاسخ پیدا نشد.');
  }

  const jsonSubstring = withoutFences.slice(firstBrace, lastBrace + 1);

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(jsonSubstring);
  } catch {
    parsed = JSON.parse(repairJsonString(jsonSubstring));
  }

  const validTypes: IdeaType[] = ['story', 'carousel', 'reel', 'caption', 'combo'];
  const resolvedType: IdeaType = validTypes.includes(parsed.type) ? parsed.type : fallbackType;

  const dominantColors: PaletteColor[] =
    Array.isArray(parsed.photo_analysis?.dominant_colors) &&
    parsed.photo_analysis.dominant_colors.length > 0
      ? parsed.photo_analysis.dominant_colors.map((c: { name?: string; hex?: string }) => ({
          name: String(c?.name || 'رنگ غالب عکس'),
          hex: String(c?.hex || '#F6EBDD'),
        }))
      : [
          { name: 'کرم گرم', hex: '#F6EBDD' },
          { name: 'صورتی گرد و غباری', hex: '#EBC3BC' },
          { name: 'آلویی تیره', hex: '#5C1A2B' },
        ];

  const bgHex = String(parsed.design?.bg_hex || '#EBC3BC');
  const textHex = String(parsed.design?.text_hex || '#5C1A2B');
  const textLayout = String(parsed.design?.text_layout || 'پایین');
  const cardStyle = String(
    parsed.design?.card_style || 'قوس مجله‌ای روی پس‌زمینه صورتی گرد و غباری #EBC3BC'
  );
  const titleFont = String(parsed.design?.fonts?.title || 'وزیرمتن اکسترابولد');
  const bodyFont = String(parsed.design?.fonts?.body || 'وزیرمتن منظم');
  const visualType = String(
    parsed.photo_analysis?.visual_type || 'سینی فینگرفود و چیدمان پذیرایی'
  );

  const normalizedTitle = enforceHeadlineRule(
    String(parsed.title || 'چیدمان مرتب سینی برای پذیرایی راحت.')
  );

  const rawItems = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [{}];

  const items = rawItems.map((item: Record<string, any>, idx: number) => {
    const rawTexts = Array.isArray(item?.texts)
      ? item.texts.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    const itemHeadline = enforceHeadlineRule(
      String(item?.headline || rawTexts[0] || normalizedTitle)
    );
    const itemBody = String(item?.body_text || rawTexts.slice(1).join(' ') || '').trim();
    const itemPos = String(item?.text_position || textLayout);
    const itemBg = String(item?.bg_hex || bgHex);
    const itemTextHex = String(item?.text_hex || textHex);
    const itemPhotoNeeded = String(item?.photo_needed || visualType);
    const frameStyle = String(item?.frame_style || cardStyle);

    const finalPrompt = buildStandardFinalPrompt({
      visualType: itemPhotoNeeded,
      frameStyle,
      bgHex: itemBg,
      textHex: itemTextHex,
      textLayout: itemPos,
      cardStyle,
      titleFont,
      bodyFont,
      headline: itemHeadline,
      bodyText: itemBody,
    });

    return {
      label: String(item?.label || `استوری ${toPersianDigits(idx + 1)}`),
      role: item?.role ? String(item.role) : undefined,
      is_dm_cta: Boolean(item?.is_dm_cta),
      frame_style: frameStyle,
      photo_needed: itemPhotoNeeded,
      headline: itemHeadline,
      body_text: itemBody || undefined,
      text_position: itemPos,
      bg_hex: itemBg,
      text_hex: itemTextHex,
      texts: itemBody ? [itemHeadline, itemBody] : [itemHeadline],
      prompt: finalPrompt,
    };
  });

  const candidates: CandidateIdeaBrief[] = Array.isArray(parsed.candidates)
    ? parsed.candidates.map((c: Record<string, any>) => ({
        title: enforceHeadlineRule(String(c?.title || '')),
        angle: String(c?.angle || ''),
        summary: String(c?.summary || ''),
        critique: String(c?.critique || ''),
        selected: Boolean(c?.selected),
      }))
    : [];

  const revisedSentences: RevisedSentence[] = Array.isArray(parsed.revised_sentences)
    ? parsed.revised_sentences
        .map((r: Record<string, any>) => ({
          before: String(r?.before || '').trim(),
          after: String(r?.after || '').trim(),
          reason: String(r?.reason || 'بازنویسی به فارسی طبیعی و بدون تعریف‌آمیز').trim(),
        }))
        .filter((r: RevisedSentence) => r.before && r.after)
    : [];

  const baseIdea: GeneratedIdea = {
    type: resolvedType,
    title: normalizedTitle,
    concept: String(parsed.concept || '').trim(),
    selected_angle: String(parsed.selected_angle || DEFAULT_CONTENT_ANGLES[0]).trim(),
    angle_reason: String(
      parsed.angle_reason ||
        'این زاویه بر اساس کادر عکس واقعی و جلوگیری از تکرار ایده‌های قبلی انتخاب شده است.'
    ).trim(),
    sentence_structure: String(parsed.sentence_structure || 'خبری').trim(),
    photo_analysis: {
      visual_type: visualType,
      dominant_colors: dominantColors,
      empty_space: String(
        parsed.photo_analysis?.empty_space || 'فضای خالی مناسب در بالا یا پایین کادر برای قاب برندی'
      ),
      framing: String(parsed.photo_analysis?.framing || 'نمای نزدیک و واقعی از سینی پذیرایی'),
      summary: String(
        parsed.photo_analysis?.summary ||
          `تصویر واقعی شامل ${visualType} است و تمام متن‌ها مستقیم بر اساس همین کادر نوشته شده‌اند.`
      ),
    },
    candidates,
    why_now: String(parsed.why_now || parsed.angle_reason || '').trim(),
    design: {
      palette: [
        { name: 'کرم گرم', hex: '#F6EBDD' },
        { name: 'صورتی گرد و غباری', hex: '#EBC3BC' },
        { name: 'آلویی تیره', hex: '#5C1A2B' },
        { name: 'خردلی', hex: '#E3A92F' },
        { name: 'آجری', hex: '#C2553A' },
        { name: 'سبز زیتونی تیره', hex: '#2F3A1E' },
      ],
      bg_hex: bgHex,
      text_hex: textHex,
      color_mood: String(parsed.design?.color_mood || 'مات، کاغذی و ادیتوریال مادو'),
      text_layout: textLayout,
      card_style: cardStyle,
      fonts: { title: titleFont, body: bodyFont },
      shape: `${cardStyle} · جایگاه: ${textLayout}`,
    },
    photos_needed: [visualType],
    items,
    revised_sentences: revisedSentences,
    pre_post_checks: [],
    caption: parsed.caption ? String(parsed.caption) : undefined,
    hashtags: Array.isArray(parsed.hashtags)
      ? parsed.hashtags.map((h: unknown) => String(h))
      : undefined,
  };

  const modelChecks: PrePostCheck[] = Array.isArray(parsed.pre_post_checks)
    ? parsed.pre_post_checks.map((c: Record<string, any>) => ({
        label: String(c?.label || '').trim(),
        passed: Boolean(c?.passed),
        note: String(c?.note || '').trim(),
      }))
    : [];

  const autoChecks = computeAutoPrePostChecks(baseIdea);
  baseIdea.pre_post_checks = autoChecks.length > 0 ? autoChecks : modelChecks;

  return baseIdea;
}

export function buildUserContentPrompt(params: {
  type: IdeaType;
  count: number;
  settings: AdvancedSettings;
  pageProfile: string;
  history: HistoryItem[];
  usedIdeas?: UsedIdeaEntry[];
  hasUploadedPhoto: boolean;
  foodNamesNote?: string;
}): string {
  const { jalali, gregorian } = getTodayDates();
  const typeLabel = IDEA_TYPE_LABELS[params.type];
  const usedList = params.usedIdeas || [];
  const seeds = pickRandomCreativeSeeds(params.settings, params.history, usedList);

  const usedMemoryLines =
    usedList.length === 0
      ? 'هنوز ایده‌ی مصرف‌شده‌ای ثبت نشده است.'
      : usedList
          .slice(0, 40)
          .map(
            (u, idx) =>
              `${idx + 1}. [${u.confirmed ? 'تاییدشده' : 'تولیدشده'}] عنوان: «${u.title}» | زاویه: «${
                u.angle
              }» | خلاصه: «${u.concept}» | کلیدواژه‌ها: [${(u.keywords || []).join('، ')}]`
          )
          .join('\n');

  const recentHistoryLines =
    params.history.length === 0
      ? 'تاریخچه‌ای موجود نیست.'
      : params.history
          .slice(0, 12)
          .map(
            (h, idx) =>
              `${idx + 1}. عنوان: «${h.idea.title}» | زاویه: «${
                h.idea.selected_angle
              }» | چیدمان: «${h.idea.design?.text_layout}»`
          )
          .join('\n');

  const foodNamesInstruction =
    params.foodNamesNote && params.foodNamesNote.trim()
      ? `نام غذاهای داخل عکس که ادمین صراحتاً وارد کرده: «${params.foodNamesNote.trim()}». فقط از همین نام‌ها استفاده کن و چیز اضافه‌ای حدس نزن.`
      : 'ادمین نام غذاها را وارد نکرده است؛ بنابراین اکیداً ممنوع است اسم غذای فرضی حدس بزنی یا غذا را با رنگ توصیف کنی (مثل «لقمه نارنجی» ممنوع). فقط توصیف خنثی و واقعی از کادر عکس بده.';

  return [
    `تاریخ امروز: ${jalali} (${gregorian})`,
    `نوع خروجی: ${params.type} (${typeLabel}) — تعداد دقیق استوری/اسلاید در آرایه‌ی items: ${params.count} عدد.`,
    `وضعیت عکس ورودی: ${
      params.hasUploadedPhoto
        ? 'ادمین عکس واقعی غذا را پیوست کرده است. تمام تحلیل و متن استوری‌ها باید مستقیماً بر اساس چیزی باشد که در کادر همین عکس دیده می‌شود و خود محصول در مرکز توجه باشد.'
        : 'عکسی پیوست نشده (حالت خودکار سرور)؛ فرض کن عکس واقعی از سینی پذیرایی مادو است و هیچ اسم غذای فرضی حدس نزن.'
    }`,
    foodNamesInstruction,
    '',
    `جستجوی ترند و مناسبت روز (Google Search Grounding):`,
    params.settings.enableGoogleSearch
      ? '- با جستجوی گوگل بررسی کن امروز یا این هفته چه حال‌وهوا، فصل یا مناسبت غیرسیاسی و غیرمذهبی مرتبط با دورهمی، مهمانی و پذیرایی در ایران/تبریز مطرح است و اگر مرتبط بود در why_now به آن اشاره کن.'
      : '- جستجوی وب در تنظیمات غیرفعال است؛ بر اساس فصل و نیاز واقعی میزبان بنویس.',
    '',
    `پارامترهای پیشنهادی غیرتکراری این نوبت:`,
    `- زاویه محتوا: «${seeds.selectedAngle}»`,
    `- چیدمان متن: «${seeds.selectedTextLayout}»`,
    `- جفت‌فونت: تیتر «${seeds.selectedFontPair.title}» + متن «${seeds.selectedFontPair.body}»`,
    `- قاب برندی پیشنهادی: «${seeds.selectedCardStyle}»`,
    `- ساختار جمله: «${seeds.selectedSentenceStructure}»`,
    '',
    `پروفایل پیج مادو:`,
    params.pageProfile.trim(),
    '',
    `حافظه‌ی ضدِ تکرار — لیست «ایده‌های مصرف‌شده» (تکرار هرکدام از موضوعات، تیترها یا زاویه‌های زیر مطلقاً ممنوع است):`,
    usedMemoryLines,
    '',
    `آخرین تاریخچه‌ی تولید:`,
    recentHistoryLines,
    '',
    `ممنوعیت‌های سخت‌گیرانه:`,
    `- کلمات ممنوع: ${FORBIDDEN_CLICHES.map((c) => `«${c}»`).join('، ')}`,
    `- ساختار تعجبی «چه ... !» اکیداً ممنوع.`,
    `- توصیف غذا با رنگ اکیداً ممنوع.`,
    `- حداکثر یک استوری دعوت به دایرکت در کل سری (${params.count} استوری).`,
    `- خروجی فقط یک JSON خالص و معتبر باشد.`,
  ].join('\n');
}
