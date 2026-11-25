import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, Check, RotateCcw, X, Cpu, Globe } from 'lucide-react';
import {
  AdvancedSettings,
  DEFAULT_CARD_STYLES,
  DEFAULT_CONTENT_ANGLES,
  DEFAULT_FONT_PAIRS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_TEXT_LAYOUTS,
  GEMINI_MODEL_OPTIONS,
} from '../types';
import { toPersianDigits } from '../utils/helpers';
import { CornerPattern } from './CornerPattern';

interface AdvancedSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdvancedSettings;
  onSave: (newSettings: AdvancedSettings) => void;
}

const BASE_COUNTS = [1, 3, 5, 7];
const BASE_TONES = ['محاوره‌ی بزرگسالانه و آرام', 'ادیتوریال و حرفه‌ای', 'صمیمی بدون شعار'];

export const AdvancedSettingsSheet: React.FC<AdvancedSettingsSheetProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [draft, setDraft] = useState<AdvancedSettings>(() => ({
    ...settings,
    geminiModel: settings.geminiModel || DEFAULT_GEMINI_MODEL,
    customGeminiModel: settings.customGeminiModel || '',
    enableGoogleSearch:
      typeof settings.enableGoogleSearch === 'boolean' ? settings.enableGoogleSearch : true,
    contentAngles: settings.contentAngles?.length ? settings.contentAngles : DEFAULT_CONTENT_ANGLES,
    textLayouts: settings.textLayouts?.length ? settings.textLayouts : DEFAULT_TEXT_LAYOUTS,
    fontPairs: settings.fontPairs?.length ? settings.fontPairs : DEFAULT_FONT_PAIRS,
    cardStyles: settings.cardStyles?.length ? settings.cardStyles : DEFAULT_CARD_STYLES,
  }));

  const [newAngleInput, setNewAngleInput] = useState('');
  const [newLayoutInput, setNewLayoutInput] = useState('');
  const [newCardStyleInput, setNewCardStyleInput] = useState('');
  const [newFontTitle, setNewFontTitle] = useState('');
  const [newFontBody, setNewFontBody] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...settings,
        geminiModel: settings.geminiModel || DEFAULT_GEMINI_MODEL,
        customGeminiModel: settings.customGeminiModel || '',
        enableGoogleSearch:
          typeof settings.enableGoogleSearch === 'boolean' ? settings.enableGoogleSearch : true,
        contentAngles:
          settings.contentAngles?.length ? settings.contentAngles : DEFAULT_CONTENT_ANGLES,
        textLayouts: settings.textLayouts?.length ? settings.textLayouts : DEFAULT_TEXT_LAYOUTS,
        fontPairs: settings.fontPairs?.length ? settings.fontPairs : DEFAULT_FONT_PAIRS,
        cardStyles: settings.cardStyles?.length ? settings.cardStyles : DEFAULT_CARD_STYLES,
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleAddAngle = () => {
    const val = newAngleInput.trim();
    if (!val) return;
    if (!draft.contentAngles.includes(val)) {
      setDraft((prev) => ({ ...prev, contentAngles: [...prev.contentAngles, val] }));
    }
    setNewAngleInput('');
  };

  const handleRemoveAngle = (target: string) => {
    if (draft.contentAngles.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      contentAngles: prev.contentAngles.filter((a) => a !== target),
    }));
  };

  const handleAddLayout = () => {
    const val = newLayoutInput.trim();
    if (!val) return;
    if (!draft.textLayouts.includes(val)) {
      setDraft((prev) => ({ ...prev, textLayouts: [...prev.textLayouts, val] }));
    }
    setNewLayoutInput('');
  };

  const handleRemoveLayout = (target: string) => {
    if (draft.textLayouts.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      textLayouts: prev.textLayouts.filter((l) => l !== target),
    }));
  };

  const handleAddCardStyle = () => {
    const val = newCardStyleInput.trim();
    if (!val) return;
    if (!draft.cardStyles.includes(val)) {
      setDraft((prev) => ({ ...prev, cardStyles: [...prev.cardStyles, val] }));
    }
    setNewCardStyleInput('');
  };

  const handleRemoveCardStyle = (target: string) => {
    if (draft.cardStyles.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      cardStyles: prev.cardStyles.filter((c) => c !== target),
    }));
  };

  const handleAddFontPair = () => {
    const t = newFontTitle.trim();
    const b = newFontBody.trim();
    if (!t || !b) return;
    setDraft((prev) => ({
      ...prev,
      fontPairs: [...prev.fontPairs, { id: `fp-${Date.now()}`, title: t, body: b }],
    }));
    setNewFontTitle('');
    setNewFontBody('');
  };

  const handleRemoveFontPair = (id: string) => {
    if (draft.fontPairs.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      fontPairs: prev.fontPairs.filter((fp) => fp.id !== id),
    }));
  };

  const getChipClass = (active: boolean) =>
    active
      ? 'bg-[#5C1A2B] text-[#F6EBDD] border-[#5C1A2B] font-extrabold'
      : 'bg-[#F6EBDD] text-[#3B2A22] border-[#DECBB8] hover:border-[#5C1A2B]/50';

  const inputClass =
    'bg-[#F6EBDD] border-[#DECBB8] text-[#3B2A22] placeholder:text-[#7D6356]/70 focus:border-[#5C1A2B]';

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#3B2A22]/45">
      <div
        dir="rtl"
        className="w-full max-w-[480px] min-h-screen flex flex-col justify-between p-5 overflow-y-auto relative animate-card-enter bg-[#F6EBDD] text-[#3B2A22]"
      >
        <CornerPattern variant="arcs" position="top-left" colorClass="text-[#5C1A2B]/[0.12]" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              aria-label="بازگشت"
              className="w-10 h-10 rounded-full flex items-center justify-center border bg-[#FBF5EC] border-[#DECBB8] text-[#5C1A2B] active:scale-[0.95]"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  geminiModel: DEFAULT_GEMINI_MODEL,
                  customGeminiModel: '',
                  enableGoogleSearch: true,
                  contentAngles: DEFAULT_CONTENT_ANGLES,
                  textLayouts: DEFAULT_TEXT_LAYOUTS,
                  fontPairs: DEFAULT_FONT_PAIRS,
                  cardStyles: DEFAULT_CARD_STYLES,
                }))
              }
              className="text-xs font-bold text-[#C2553A] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>بازنشانی پیش‌فرض‌ها</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-[#5C1A2B] mb-1">
              تنظیمات مدل، جستجو و تنوع بصری
            </h2>
            <p className="text-xs text-[#6E564B]">
              مدل جمنای، فعال‌سازی Google Search و فهرست‌های تولید محتوا را دقیق تنظیم کن.
            </p>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-4">
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#C2553A]" />
                <span>مدل اصلی جمنای (پیش‌فرض: Gemini 4 Hydrogen)</span>
              </label>

              <div className="space-y-2">
                {GEMINI_MODEL_OPTIONS.map((m) => {
                  const active = !draft.customGeminiModel.trim() && draft.geminiModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          geminiModel: m.id,
                          customGeminiModel: '',
                        }))
                      }
                      className={`w-full p-3 rounded-[14px] border text-right transition-colors ${
                        active
                          ? 'bg-[#EBC3BC] border-[#5C1A2B] text-[#5C1A2B]'
                          : 'bg-[#F6EBDD] border-[#DECBB8] text-[#3B2A22]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold">{m.label}</span>
                        <span
                          dir="ltr"
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FBF5EC] text-[#5C1A2B] border border-[#DECBB8]"
                        >
                          {m.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A443A] mt-1">{m.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <label className="block text-[11px] font-bold text-[#6E564B] mb-1">
                  شناسه مدل دلخواه (اختیاری)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={draft.customGeminiModel}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, customGeminiModel: e.target.value }))
                  }
                  placeholder="gemini-4-hydrogen"
                  className={`w-full h-10 rounded-full px-3.5 text-xs font-mono border outline-none ${inputClass}`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#DECBB8] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5C1A2B]">
                  <Globe className="w-4 h-4 text-[#2F3A1E]" />
                  <span>جستجوی زنده گوگل (Google Search Grounding)</span>
                </div>
                <p className="text-[11px] text-[#6E564B] mt-0.5">
                  بررسی ترندها و مناسبت‌های روز کیترینگ و پذیرایی (بدون موضوعات سیاسی/مذهبی)
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.enableGoogleSearch}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, enableGoogleSearch: !prev.enableGoogleSearch }))
                }
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center shrink-0 ${
                  draft.enableGoogleSearch
                    ? 'bg-[#2F3A1E] justify-start'
                    : 'bg-[#D6C4B2] justify-end'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#FBF5EC]" />
              </button>
            </div>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#5C1A2B] mb-2">
                تعداد استوری/پرامپت در هر سری
              </label>
              <div className="flex flex-wrap gap-2">
                {BASE_COUNTS.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, count: num }))}
                    className={`h-9 px-4 rounded-full border text-xs transition-all ${getChipClass(
                      draft.count === num
                    )}`}
                  >
                    {toPersianDigits(num)} استوری
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#5C1A2B] mb-2">
                لحن بزرگسالانه
              </label>
              <div className="flex flex-wrap gap-2">
                {BASE_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, tone }))}
                    className={`h-9 px-3.5 rounded-full border text-xs transition-all ${getChipClass(
                      draft.tone === tone
                    )}`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#5C1A2B]">
                زاویه‌های محتوا ({toPersianDigits(draft.contentAngles.length)} مورد)
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3A92F] text-[#5C1A2B]">
                بدون تکرار
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto prompt-scroll">
              {draft.contentAngles.map((ang, idx) => (
                <div
                  key={`${ang}-${idx}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] text-xs bg-[#F6EBDD] border border-[#DECBB8]"
                >
                  <span className="leading-relaxed">
                    {toPersianDigits(idx + 1)}. {ang}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAngle(ang)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#7D6356] hover:text-[#C2553A] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newAngleInput}
                onChange={(e) => setNewAngleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAngle();
                }}
                placeholder="افزودن زاویه محتوای جدید..."
                className={`flex-1 h-10 rounded-full px-3.5 text-xs border outline-none ${inputClass}`}
              />
              <button
                type="button"
                onClick={handleAddAngle}
                className="h-10 px-4 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-xs font-extrabold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </div>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-3">
            <label className="block text-xs font-extrabold text-[#5C1A2B]">
              جفت‌فونت‌ها ({toPersianDigits(draft.fontPairs.length)} جفت)
            </label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto prompt-scroll">
              {draft.fontPairs.map((fp, idx) => (
                <div
                  key={fp.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] text-xs bg-[#F6EBDD] border border-[#DECBB8]"
                >
                  <span>
                    {toPersianDigits(idx + 1)}. تیتر: <strong>{fp.title}</strong> · متن:{' '}
                    <strong>{fp.body}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFontPair(fp.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#7D6356] hover:text-[#C2553A] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newFontTitle}
                onChange={(e) => setNewFontTitle(e.target.value)}
                placeholder="فونت تیتر"
                className={`h-9 rounded-full px-3 text-xs border outline-none ${inputClass}`}
              />
              <input
                type="text"
                value={newFontBody}
                onChange={(e) => setNewFontBody(e.target.value)}
                placeholder="فونت متن"
                className={`h-9 rounded-full px-3 text-xs border outline-none ${inputClass}`}
              />
            </div>
            <button
              type="button"
              onClick={handleAddFontPair}
              className="w-full h-9 rounded-full bg-[#EBC3BC] text-[#5C1A2B] text-xs font-extrabold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن جفت‌فونت</span>
            </button>
          </div>

          <div className="paper-surface rounded-[20px] p-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#5C1A2B]">
                چیدمان متن ({toPersianDigits(draft.textLayouts.length)} حالت)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.textLayouts.map((layout) => (
                  <span
                    key={layout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[#F6EBDD] border border-[#DECBB8]"
                  >
                    <span>{layout}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLayout(layout)}
                      className="text-[#7D6356] hover:text-[#C2553A]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLayoutInput}
                  onChange={(e) => setNewLayoutInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLayout();
                  }}
                  placeholder="چیدمان جدید..."
                  className={`flex-1 h-9 rounded-full px-3.5 text-xs border outline-none ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={handleAddLayout}
                  className="h-9 px-3.5 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-xs font-bold"
                >
                  افزودن
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#DECBB8]">
              <label className="block text-xs font-extrabold text-[#5C1A2B]">
                قاب‌های برندی مادو ({toPersianDigits(draft.cardStyles.length)} سبک)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.cardStyles.map((style) => (
                  <span
                    key={style}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[#F6EBDD] border border-[#DECBB8]"
                  >
                    <span>{style}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCardStyle(style)}
                      className="text-[#7D6356] hover:text-[#C2553A]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCardStyleInput}
                  onChange={(e) => setNewCardStyleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCardStyle();
                  }}
                  placeholder="سبک قاب جدید..."
                  className={`flex-1 h-9 rounded-full px-3.5 text-xs border outline-none ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={handleAddCardStyle}
                  className="h-9 px-3.5 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-xs font-bold"
                >
                  افزودن
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-5 pb-2">
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="w-full h-[52px] rounded-full bg-[#C2553A] text-[#FBF5EC] font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Check className="w-4 h-4" strokeWidth={2.25} />
            <span>ذخیره تنظیمات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
