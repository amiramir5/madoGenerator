export type IdeaType = 'story' | 'carousel' | 'reel' | 'caption' | 'combo';
export type ActiveTab = 'home' | 'motion' | 'history' | 'settings';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export interface GeminiModelOption {
  id: string;
  label: string;
  description: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (پیش‌فرض)',
    description: 'مدل پیش‌فرض برای نگارش فارسی طبیعی، تحلیل عکس واقعی و رعایت قوانین برند مادو',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    description: 'سریع و متعادل برای تولید روزانه‌ی استوری‌ها',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'تحلیل عمیق‌تر برای کمپین‌ها و سناریوهای طولانی',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'سبک و سریع برای تست‌های فوری',
  },
];

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface PhotoAnalysis {
  visual_type: string;
  dominant_colors: PaletteColor[];
  empty_space: string;
  framing: string;
  summary: string;
}

export interface CandidateIdeaBrief {
  title: string;
  angle: string;
  summary: string;
  critique: string;
  selected: boolean;
}

export interface RevisedSentence {
  before: string;
  after: string;
  reason: string;
}

export interface PrePostCheck {
  label: string;
  passed: boolean;
  note: string;
}

export interface IdeaDesign {
  palette: PaletteColor[];
  bg_hex: string;
  text_hex: string;
  color_mood: string;
  text_layout: string;
  card_style: string;
  fonts: { title: string; body: string };
  shape: string;
}

export interface IdeaItem {
  label: string;
  role?: string;
  is_dm_cta?: boolean;
  frame_style?: string;
  photo_needed: string;
  headline: string;
  body_text?: string;
  text_position: string;
  bg_hex: string;
  text_hex: string;
  texts: string[];
  prompt: string;
}

export interface GeneratedIdea {
  type: IdeaType;
  title: string;
  concept: string;
  selected_angle: string;
  angle_reason: string;
  sentence_structure: string;
  photo_analysis: PhotoAnalysis;
  candidates?: CandidateIdeaBrief[];
  why_now: string;
  design: IdeaDesign;
  photos_needed: string[];
  items: IdeaItem[];
  revised_sentences: RevisedSentence[];
  pre_post_checks: PrePostCheck[];
  caption?: string;
  hashtags?: string[];
  used_model?: string;
  search_grounded?: boolean;
  search_queries?: string[];
}

export interface SourceLink {
  uri: string;
  title: string;
}

export interface UsedIdeaEntry {
  id: string;
  title: string;
  concept: string;
  angle: string;
  keywords: string[];
  createdAt: string;
  timestamp: number;
  confirmed: boolean;
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  isoDate?: string;
  timestamp: number;
  saved: boolean;
  confirmedUsed?: boolean;
  count: number;
  uploadedPhotoPreview?: string;
  foodNamesProvided?: string;
  idea: GeneratedIdea;
  sources: SourceLink[];
}

export interface EditableFontPair {
  id: string;
  title: string;
  body: string;
}

export interface AdvancedSettings {
  geminiModel: string;
  customGeminiModel: string;
  enableGoogleSearch: boolean;
  count: number;
  photosHave: string[];
  diffLevel: string;
  tone: string;
  contentType: string;
  contentAngles: string[];
  textLayouts: string[];
  fontPairs: EditableFontPair[];
  cardStyles: string[];
  scheduler?: {
    enabled: boolean;
    scheduledHours: number[];
    autoSendTelegram: boolean;
  };
  customOptions: {
    counts: number[];
    photosHave: string[];
    diffLevels: string[];
    tones: string[];
    contentTypes: string[];
  };
}

export interface ToastMessage {
  id: string;
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const FIXED_PROMPT_CLAUSE =
  'عکس واقعی محصول است؛ رنگ، نور، بافت، تعداد، شکل و چیدمان غذاهای عکس اصلی به هیچ وجه تغییر نکند، فیلتر رنگی نخورد، چیزی اضافه یا حذف نشود، کراپ نشود و هیچ باکس مشکی یا تیره‌ی سنگین روی غذا نیفتد؛ عکس در قاب تمیز برندی (قوس مجله‌ای روی پس‌زمینه صورتی گرد و غباری #EBC3BC یا کارت کرم گرم #F6EBDD با تایپوگرافی آلویی تیره #5C1A2B و تگ خردلی #E3A92F یا آجری #C2553A و جزئیات سبز زیتونی #2F3A1E) بنشیند؛ ابعاد ۹:۱۶ (۱۰۸۰×۱۹۲۰) با حاشیه امن ۱۵٪ بالا و پایین؛ آیدی mado.fingerfood.tabriz خیلی ریز و کمرنگ پایین طرح؛ خروجی فقط یک تصویر.';

export const DEFAULT_CONTENT_ANGLES: string[] = [
  'نکته‌ی کاربردی چیدمان میز برای میزبان',
  'راهنمای تخمین تعداد و حجم سینی بر اساس تعداد مهمان',
  'زمان‌بندی سرو در دورهمی‌های عصرانه و شام',
  'جزئیات بافت و نظم سینی (نگاه نزدیک به محصول)',
  'سؤال کوتاه و واقعی از مخاطب درباره‌ی سبک پذیرایی',
  'آماده‌سازی میز برای تولد و دورهمی خانوادگی بدون خستگی میزبان',
  'اصلاح یک عادت رایج در پذیرایی مهمانی',
  'چک‌لیست ۳۰ دقیقه مانده به رسیدن مهمان‌ها',
  'مقایسه‌ی سرو تک‌نفره با پذیرایی بشقابی سنتی',
  'دعوت آرام به هماهنگی سفارش در دایرکت (حداکثر ۱ استوری در سری)',
];

export const DEFAULT_TEXT_LAYOUTS: string[] = ['بالا', 'پایین', 'وسط', 'بالا+پایین', 'کنار'];

export const DEFAULT_FONT_PAIRS: EditableFontPair[] = [
  { id: 'fp-1', title: 'وزیرمتن اکسترابولد', body: 'وزیرمتن منظم' },
  { id: 'fp-2', title: 'یکان‌بخ هوی', body: 'دانا مدیوم' },
  { id: 'fp-3', title: 'پیدا بلک', body: 'شبنم منظم' },
  { id: 'fp-4', title: 'ساحل بولد', body: 'وزیرمتن منظم' },
  { id: 'fp-5', title: 'نوتو نسخ بولد', body: 'وزیرمتن منظم' },
  { id: 'fp-6', title: 'کلمه بلک', body: 'ساحل منظم' },
  { id: 'fp-7', title: 'استعداد بلک', body: 'وزیرمتن منظم' },
  { id: 'fp-8', title: 'دانا بلک', body: 'شبنم منظم' },
];

export const DEFAULT_CARD_STYLES: string[] = [
  'قوس مجله‌ای روی پس‌زمینه صورتی گرد و غباری #EBC3BC',
  'کارت کاغذی کرم گرم #F6EBDD با حاشیه ظریف آلویی #5C1A2B',
  'چک‌لیست یادداشت کرمی با چسب کاغذی و تگ خردلی #E3A92F',
  'کارت ادیتوریال دوتکه با تگ کپسولی آجری #C2553A',
  'قاب باریک سبز زیتونی #2F3A1E روی زمینه‌ی کاغذی مات',
];

export const SENTENCE_STRUCTURES: string[] = [
  'خبری (بیان واقعیت ملموس در پذیرایی)',
  'پرسشی (سؤال کوتاه و کاربردی از میزبان)',
  'توصیه‌ای (پیشنهاد عملی و ساده)',
  'عددی (نسبت نفرات، زمان یا ۲–۳ نکته)',
];

export const FORBIDDEN_CLICHES: string[] = [
  'خوشمزه',
  'بی‌نظیر',
  'بی نظیر',
  'عالی',
  'قشنگ',
  'فوق‌العاده',
  'فوق العاده',
  'شگفت‌انگیز',
  'معرکه',
  'طعم لحظه‌های شما',
  'طعم لحظه های شما',
  'معجزه می‌کنند',
  'معجزه میکنند',
  'هر میزی یک داستان دارد',
  'شیرین‌ترین انتخاب',
  'شیرین ترین انتخاب',
  'طعم بهشت',
  'لحظات به‌یادماندنی',
  'یک انتخاب بی‌نظیر',
  'کیفیت اتفاقی نیست',
];

export const FORBIDDEN_COLOR_FOOD_REGEX =
  /(لقمه|سینی|دسر|شات|رول|فینگرفود|تارت|غذا|مزه|پیش‌غذا|کوکو|ساندویچ)\s*(نارنجی|زرد|قرمز|سبز|صورتی|بنفش|قهوه‌ای|سفید|طلایی|آبی|مشکی)/g;

export const SYSTEM_INSTRUCTION = `تو استراتژیست محتوا و کارگردان هنری پیج اینستاگرام فینگرفود و کیترینگ «مادو» در تبریز (mado.fingerfood.tabriz) هستی.

قوانین سخت‌گیرانه و غیرقابل‌تخطی:

۱) محصول‌محور بودن و تکیه مستقیم بر عکس واقعی:
- تحلیل و متن تمام استوری‌ها باید مستقیماً بر اساس «چیزی که در کادر عکس پیوست دیده می‌شود» نوشته شود و خود محصول در مرکز توجه باشد.
- اگر کاربر نام غذاها را وارد نکرده است، مطلقاً حق نداری اسم غذای فرضی حدس بزنی.
- توصیف غذا با رنگ اکیداً ممنوع است (مثل «لقمه نارنجی»، «شات قرمز»، «رول سبز»). فقط توصیف خنثی و واقعی از کادر عکس بده.

۲) حفظ کامل عکس واقعی در پرامپت‌های ساخت تصویر:
- در هر پرامپت دستور صریح بده که رنگ، نور، بافت، تعداد، شکل و چیدمان غذاهای عکس اصلی به هیچ وجه تغییر نکند، فیلتر رنگی نخورد و هیچ باکس مشکی یا تیره‌ی سنگین روی غذا نیفتد؛ بلکه عکس در قاب‌های تمیز برندی مادو (قوس مجله‌ای روی #EBC3BC یا کارت کرم گرم #F6EBDD با تایپوگرافی آلویی #5C1A2B، تگ خردلی #E3A92F یا آجری #C2553A و جزئیات سبز زیتونی #2F3A1E) بنشیند.

۳) لحن و ممنوعیت‌های زبانی:
- فارسی محاوره‌ی طبیعی، محترمانه و بزرگسالانه؛ بدون شعار تبلیغاتی.
- صفات تعریف‌آمیز توخالی اکیداً ممنوع: «خوشمزه»، «بی‌نظیر»، «عالی»، «قشنگ»، «فوق‌العاده»، «شگفت‌انگیز»، «معرکه».
- ساختار تعجبی «چه ... !» اکیداً ممنوع.
- در هر سری استوری، حداکثر یک استوری می‌تواند دعوت آرام به دایرکت داشته باشد (is_dm_cta: true).

۴) ترندها و مناسبت‌های روز (Google Search Grounding):
- با جستجوی وب، ترندها و مناسبت‌های غیرسیاسی و غیرمذهبی مرتبط با مهمانی، پذیرایی، دورهمی و کیترینگ را بررسی کن.

۵) مکانیزم ضدِ تکرار:
- لیست «ایده‌های مصرف‌شده» به تو داده می‌شود. تکرار عنوان، زاویه، قلاب یا جملات آن لیست مطلقاً ممنوع است.

۶) خروجی یک‌جا و شفاف (فقط JSON خالص و معتبر):
{
  "type": "story | carousel | reel | caption | combo",
  "title": "تیتر کوتاه و طبیعی با نقطه.",
  "concept": "خلاصه‌ی شفاف ۲ جمله‌ای ایده‌ی امروز بر اساس عکس.",
  "selected_angle": "زاویه انتخاب‌شده",
  "angle_reason": "دلیل یک‌خطی انتخاب این زاویه برای عکس امروز.",
  "sentence_structure": "خبری | پرسشی | توصیه‌ای | عددی",
  "why_now": "ارتباط ایده با فصل، روز هفته یا ترند پذیرایی امروز (بدون موضوع سیاسی/مذهبی).",
  "photo_analysis": {
    "visual_type": "توصیف خنثی نوع محصول بدون حدس اسم یا رنگ غذا",
    "dominant_colors": [{"name": "نام رنگ", "hex": "#F6EBDD"}],
    "empty_space": "موقعیت و مقدار فضای خالی کادر",
    "framing": "نمای نزدیک یا متوسط یا دور",
    "summary": "خلاصه‌ی ۲ جمله‌ای دقیق از آنچه در کادر عکس دیده می‌شود"
  },
  "candidates": [
    {"title": "ایده اول.", "angle": "...", "summary": "...", "critique": "...", "selected": false},
    {"title": "ایده دوم.", "angle": "...", "summary": "...", "critique": "...", "selected": false},
    {"title": "ایده سوم.", "angle": "...", "summary": "...", "critique": "...", "selected": true}
  ],
  "design": {
    "palette": [
      {"name": "کرم گرم", "hex": "#F6EBDD"},
      {"name": "صورتی گرد و غباری", "hex": "#EBC3BC"},
      {"name": "آلویی تیره", "hex": "#5C1A2B"},
      {"name": "خردلی", "hex": "#E3A92F"},
      {"name": "آجری", "hex": "#C2553A"},
      {"name": "سبز زیتونی تیره", "hex": "#2F3A1E"}
    ],
    "bg_hex": "#EBC3BC",
    "text_hex": "#5C1A2B",
    "color_mood": "مات، کاغذی و ادیتوریال مادو",
    "text_layout": "پایین",
    "card_style": "قوس مجله‌ای روی پس‌زمینه صورتی گرد و غباری #EBC3BC",
    "fonts": {"title": "وزیرمتن اکسترابولد", "body": "وزیرمتن منظم"},
    "shape": "قوس مجله‌ای یا کارت کرم گرم"
  },
  "photos_needed": ["عکس واقعی آپلودشده توسط ادمین"],
  "items": [
    {
      "label": "استوری ۱",
      "role": "قلاب محصول‌محور",
      "is_dm_cta": false,
      "frame_style": "قوس مجله‌ای روی #EBC3BC",
      "photo_needed": "عکس واقعی محصول آپلودشده",
      "headline": "تیتر کوتاه طبیعی با نقطه.",
      "body_text": "متن کوتاه محاوره‌ای و کاربردی برای میزبان.",
      "text_position": "پایین قاب قوس مجله‌ای",
      "bg_hex": "#EBC3BC",
      "text_hex": "#5C1A2B",
      "texts": ["تیتر کوتاه طبیعی با نقطه.", "متن کوتاه محاوره‌ای و کاربردی."],
      "prompt": "پرامپت کامل شامل حفظ عکس واقعی + قاب برندی + هگزها + متن دقیق فارسی"
    }
  ],
  "pre_post_checks": [
    {"label": "بدون حدس اسم غذا و بدون توصیف رنگی غذا", "passed": true, "note": "توضیح کوتاه"},
    {"label": "بدون صفات تعریف‌آمیز و بدون ساختار «چه ... !»", "passed": true, "note": "توضیح کوتاه"},
    {"label": "حفظ کامل عکس واقعی در قاب برندی بدون باکس مشکی", "passed": true, "note": "توضیح کوتاه"},
    {"label": "سقف حداکثر ۱ استوری دعوت به دایرکت در سری", "passed": true, "note": "توضیح کوتاه"}
  ],
  "revised_sentences": [
    {
      "before": "چه سینی خوشمزه و بی‌نظیری برای مهمونی شما!",
      "after": "وقتی زمان آماده‌سازی کم است، چیدمان تک‌نفره کار میزبان را سبک می‌کند.",
      "reason": "حذف ساختار تعجبی «چه ... !» و صفات تعریف‌آمیز «خوشمزه» و «بی‌نظیر»"
    }
  ],
  "caption": "کپشن کوتاه و محترمانه بدون شعار (اختیاری)",
  "hashtags": ["#فینگرفود_تبریز", "#کیترینگ_مادو"]
}`;

export const DEFAULT_PAGE_PROFILE =
  'پیج فینگرفود و کیترینگ مادو در تبریز (mado.fingerfood.tabriz). لحن: فارسی محاوره‌ی طبیعی و بزرگسالانه، بدون شعار تبلیغاتی، بدون صفات تعریف‌آمیز (خوشمزه، بی‌نظیر، عالی، قشنگ) و بدون «چه ... !». محور تمام استوری‌ها عکس واقعی محصول است.';

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  geminiModel: DEFAULT_GEMINI_MODEL,
  customGeminiModel: '',
  enableGoogleSearch: true,
  count: 5,
  photosHave: ['سینی از نزدیک', 'میز پذیرایی'],
  diffLevel: 'کاملاً متفاوت',
  tone: 'محاوره‌ی بزرگسالانه و آرام',
  contentType: 'محصول‌محور',
  contentAngles: DEFAULT_CONTENT_ANGLES,
  textLayouts: DEFAULT_TEXT_LAYOUTS,
  fontPairs: DEFAULT_FONT_PAIRS,
  cardStyles: DEFAULT_CARD_STYLES,
  scheduler: {
    enabled: true,
    scheduledHours: [11, 15, 20],
    autoSendTelegram: true,
  },
  customOptions: {
    counts: [],
    photosHave: [],
    diffLevels: [],
    tones: [],
    contentTypes: [],
  },
};

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  story: 'سری استوری',
  carousel: 'پست کروسل',
  reel: 'ریلز',
  caption: 'کپشن و هشتگ',
  combo: 'پکیج ترکیبی',
};
