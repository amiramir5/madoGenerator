import React, { useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Target,
} from 'lucide-react';
import { HistoryItem } from '../types';
import {
  buildChatGptUrl,
  copyTextToClipboard,
  formatResultTypeBadge,
  toPersianDigits,
} from '../utils/helpers';
import { CornerPattern } from './CornerPattern';

interface ResultViewProps {
  item: HistoryItem;
  onBack: () => void;
  onRegenerate: () => void;
  onToggleSave: (id: string) => void;
  onConfirmUsed: (id: string) => void;
  onOpenMotionForIdea: (id: string) => void;
  onOpenAdvancedSettings: () => void;
  onShowToast: (text: string, actionUrl?: string, actionLabel?: string) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  item,
  onBack,
  onRegenerate,
  onToggleSave,
  onConfirmUsed,
  onOpenMotionForIdea,
  onOpenAdvancedSettings,
  onShowToast,
}) => {
  const { idea, saved, confirmedUsed, uploadedPhotoPreview, sources } = item;

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    (idea.items || []).forEach((_, idx) => {
      initial[idx] = idx === 0;
    });
    return initial;
  });

  const [showCritiqueProcess, setShowCritiqueProcess] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);

  const triggerCopiedState = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  const handleCopy = async (text: string, key: string, msg = 'کپی شد ✓') => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      triggerCopiedState(key);
      onShowToast(msg);
    } else {
      onShowToast('خطا در کپی متن. لطفاً دستی کپی کنید.');
    }
  };

  const handleSendToTelegram = async () => {
    if (isSendingTelegram) return;
    setIsSendingTelegram(true);
    try {
      const res = await fetch('/api/send-to-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال به تلگرام');
      onShowToast(data.message || 'ایده و پرامپت‌ها به تلگرام ارسال شد ✓');
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleOpenInChatGpt = async (prompt: string, key: string) => {
    await copyTextToClipboard(prompt);
    triggerCopiedState(key);
    const targetUrl = buildChatGptUrl(prompt);
    const toastMsg = 'پرامپت کپی شد. عکس واقعی غذا را ضمیمه کن و بفرست.';
    let opened: Window | null = null;
    try {
      opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      opened = null;
    }
    onShowToast(toastMsg, targetUrl, opened ? 'باز کردن مجدد ChatGPT' : 'ورود به ChatGPT');
  };

  const handleCopyAllTextsTable = async () => {
    const rows = (idea.items || []).map((it, idx) => {
      const textCombined = [it.headline, it.body_text].filter(Boolean).join(' — ');
      return `${toPersianDigits(idx + 1)}. ${it.label || `استوری ${toPersianDigits(idx + 1)}`} (${
        it.role || 'محتوا'
      }):\n${textCombined}`;
    });
    await handleCopy(rows.join('\n\n'), 'copy-table', 'کل جدول متن‌های فارسی کپی شد ✓');
  };

  const handleCopyAllPrompts = async () => {
    if (!idea.items?.length) return;
    const allText = idea.items
      .map(
        (it, idx) =>
          `=== ${it.label || `استوری ${toPersianDigits(idx + 1)}`} ===\n${it.prompt}`
      )
      .join('\n\n');
    await handleCopy(allText, 'copy-all', 'همه‌ی پرامپت‌های تصویر کپی شد ✓');
  };

  const handleCopyCaptionAndHashtags = async () => {
    const parts: string[] = [];
    if (idea.caption) parts.push(idea.caption.trim());
    if (idea.hashtags?.length) parts.push(idea.hashtags.join(' '));
    await handleCopy(parts.join('\n\n'), 'copy-caption', 'کپشن و هشتگ کپی شد ✓');
  };

  const typeBadgeText = formatResultTypeBadge(idea.type, idea.items?.length || item.count);
  const hasCaptionOrHashtags =
    Boolean(idea.caption?.trim()) || Boolean(idea.hashtags && idea.hashtags.length > 0);

  return (
    <div className="relative pb-44 pt-4 px-4 space-y-4 overflow-hidden animate-card-enter bg-[#F6EBDD] text-[#3B2A22]">
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="w-10 h-10 rounded-full flex items-center justify-center border bg-[#FBF5EC] border-[#DECBB8] text-[#5C1A2B] active:scale-[0.95]"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenMotionForIdea(item.id)}
            title="ساخت موشن ۹:۱۶ MP4 برای این ایده"
            className="h-10 px-3 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[11px] font-extrabold flex items-center gap-1.5 active:scale-[0.96]"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>ساخت موشن MP4</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(item.id)}
            title={saved ? 'ذخیره‌شده' : 'ذخیره در نشانک‌ها'}
            className={`w-10 h-10 rounded-full flex items-center justify-center border active:scale-[0.95] ${
              saved
                ? 'bg-[#5C1A2B] border-[#5C1A2B] text-[#F6EBDD]'
                : 'bg-[#FBF5EC] border-[#DECBB8] text-[#5C1A2B]'
            }`}
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={handleSendToTelegram}
            disabled={isSendingTelegram}
            title="ارسال به تلگرام"
            className="w-10 h-10 rounded-full flex items-center justify-center border bg-[#FBF5EC] border-[#DECBB8] text-[#C2553A] active:scale-[0.95] disabled:opacity-60"
          >
            {isSendingTelegram ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      <div className="rose-surface relative overflow-hidden rounded-[22px] p-5 space-y-3">
        <CornerPattern variant="arcs" position="top-left" colorClass="text-[#5C1A2B]/[0.14]" />

        <div className="relative z-10 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-[11px] font-extrabold">
            <Sparkles className="w-3 h-3" />
            <span>{typeBadgeText}</span>
          </span>

          {idea.used_model && (
            <span
              dir="ltr"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EC] text-[#5C1A2B] border border-[#DECBB8] text-[10px] font-mono font-bold"
            >
              <Cpu className="w-3 h-3 text-[#C2553A]" />
              <span>{idea.used_model}</span>
            </span>
          )}

          {idea.search_grounded && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2F3A1E] text-[#F6EBDD] text-[10px] font-bold">
              <Globe className="w-3 h-3" />
              <span>جستجوی زنده گوگل فعال</span>
            </span>
          )}
        </div>

        <h1 className="relative z-10 text-xl font-extrabold text-[#5C1A2B] leading-snug">
          {idea.title}
        </h1>

        {idea.concept && (
          <p className="relative z-10 text-xs text-[#3B2A22] leading-relaxed font-medium">
            {idea.concept}
          </p>
        )}

        {idea.why_now && (
          <div className="relative z-10 p-3 rounded-[14px] bg-[#FBF5EC]/90 border border-[#DECBB8] text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-[#5C1A2B]">
              <Target className="w-3.5 h-3.5 text-[#C2553A]" />
              <span>زاویه: {idea.selected_angle}</span>
            </div>
            <p className="text-[#3B2A22] leading-relaxed">{idea.why_now}</p>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] font-bold text-[#5C1A2B]">
            {confirmedUsed
              ? 'در حافظه‌ی ضدتکرار «ایده‌های مصرف‌شده» تایید شد ✓'
              : 'به‌طور خودکار ثبت شد — تایید نهایی برای قفل ضدتکرار:'}
          </span>
          {!confirmedUsed && (
            <button
              type="button"
              onClick={() => onConfirmUsed(item.id)}
              className="px-3 py-1.5 rounded-full bg-[#2F3A1E] text-[#F6EBDD] text-[11px] font-extrabold shrink-0"
            >
              تایید مصرف ایده
            </button>
          )}
        </div>
      </div>

      {((sources && sources.length > 0) ||
        (idea.search_queries && idea.search_queries.length > 0)) && (
        <div className="paper-surface rounded-[20px] p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#2F3A1E]">
            <Globe className="w-4 h-4" />
            <span>نتایج جستجوی زنده گوگل</span>
          </div>

          {idea.search_queries && idea.search_queries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.search_queries.map((q, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B]"
                >
                  {q}
                </span>
              ))}
            </div>
          )}

          {sources && sources.length > 0 && (
            <div className="space-y-1">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] bg-[#F6EBDD] border border-[#DECBB8] text-[11px] text-[#5C1A2B] hover:border-[#C2553A]"
                >
                  <span className="truncate font-bold">{src.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#C2553A]" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {idea.photo_analysis && (
        <div className="paper-surface rounded-[20px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#C2553A]" />
              <span>تحلیل مستقیم عکس واقعی آپلودشده</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#6E564B]">
              محصول‌محور
            </span>
          </div>

          <div className="flex items-start gap-3">
            {uploadedPhotoPreview && (
              <img
                src={uploadedPhotoPreview}
                alt="عکس واقعی محصول"
                className="w-16 h-20 object-cover rounded-[12px] border border-[#DECBB8] shrink-0"
              />
            )}
            <div className="space-y-1 text-xs">
              <p className="font-bold text-[#5C1A2B]">{idea.photo_analysis.visual_type}</p>
              <p className="text-[#5A443A] leading-relaxed">{idea.photo_analysis.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-[12px] bg-[#F6EBDD] border border-[#DECBB8]">
              <span className="block text-[#7D6356] text-[10px]">فضای خالی کادر</span>
              <span className="font-bold text-[#3B2A22]">{idea.photo_analysis.empty_space}</span>
            </div>
            <div className="p-2.5 rounded-[12px] bg-[#F6EBDD] border border-[#DECBB8]">
              <span className="block text-[#7D6356] text-[10px]">فاصله و کادربندی</span>
              <span className="font-bold text-[#3B2A22]">{idea.photo_analysis.framing}</span>
            </div>
          </div>
        </div>
      )}

      <div className="paper-surface rounded-[22px] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
            <TableIcon className="w-4 h-4 text-[#C2553A]" />
            <span>جدول متن‌های دقیق فارسی (کپی سریع)</span>
          </h2>
          <button
            type="button"
            onClick={handleCopyAllTextsTable}
            className="h-8 px-3 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[11px] font-extrabold flex items-center gap-1"
          >
            {copiedKey === 'copy-table' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>کپی کل جدول</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-[#DECBB8]">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#5C1A2B] text-[#F6EBDD] text-[11px]">
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">اسلاید</th>
                <th className="py-2.5 px-2.5 font-bold">متن دقیق روی طرح</th>
                <th className="py-2.5 px-2 font-bold text-center">کپی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DECBB8] bg-[#FBF5EC]">
              {(idea.items || []).map((st, idx) => {
                const rowText = [st.headline, st.body_text].filter(Boolean).join('\n');
                const rowKey = `tbl-row-${idx}`;
                return (
                  <tr key={idx} className="align-top">
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="block font-extrabold text-[#5C1A2B]">
                        {st.label || `استوری ${toPersianDigits(idx + 1)}`}
                      </span>
                      {st.role && (
                        <span className="block text-[10px] text-[#6E564B] mt-0.5">{st.role}</span>
                      )}
                      {st.is_dm_cta && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#C2553A] text-[#FBF5EC] text-[9px] font-bold">
                          دعوت دایرکت
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 space-y-1 leading-relaxed">
                      <p className="font-extrabold text-[#5C1A2B]">{st.headline}</p>
                      {st.body_text && <p className="text-[#3B2A22]">{st.body_text}</p>}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            rowText,
                            rowKey,
                            `متن استوری ${toPersianDigits(idx + 1)} کپی شد ✓`
                          )
                        }
                        className="w-8 h-8 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B] inline-flex items-center justify-center active:scale-[0.94]"
                        title="کپی متن این ردیف"
                      >
                        {copiedKey === rowKey ? (
                          <Check className="w-3.5 h-3.5 text-[#2F3A1E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {idea.pre_post_checks && idea.pre_post_checks.length > 0 && (
        <div className="paper-surface rounded-[22px] p-4 space-y-2.5">
          <h2 className="text-sm font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2F3A1E]" />
            <span>چک‌های خودکار قبل از انتشار</span>
          </h2>
          <div className="space-y-2">
            {idea.pre_post_checks.map((chk, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-[14px] border flex items-start gap-2.5 text-xs ${
                  chk.passed
                    ? 'bg-[#F6EBDD] border-[#DECBB8]'
                    : 'bg-[#EBC3BC]/75 border-[#C2553A]'
                }`}
              >
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2F3A1E] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#C2553A] shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-extrabold text-[#5C1A2B]">{chk.label}</p>
                  {chk.note && <p className="text-[11px] text-[#5A443A] mt-0.5">{chk.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-[#5C1A2B]">
            پرامپت‌های آماده ساخت تصویر ({toPersianDigits(idea.items?.length || 0)} استوری)
          </h2>
          <button
            type="button"
            onClick={handleCopyAllPrompts}
            className="text-xs font-extrabold text-[#C2553A] flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>کپی همه‌ی پرامپت‌ها</span>
          </button>
        </div>

        {(idea.items || []).map((storyItem, idx) => {
          const isExpanded = expandedItems[idx] === true;
          const copyBtnKey = `item-copy-${idx}`;
          const chatBtnKey = `item-chat-${idx}`;

          return (
            <div key={idx} className="paper-surface relative overflow-hidden rounded-[20px]">
              <button
                type="button"
                onClick={() => setExpandedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                className="w-full p-4 flex items-center justify-between gap-3 text-right"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-xs font-extrabold flex items-center justify-center shrink-0">
                    {toPersianDigits(idx + 1)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-[#5C1A2B] truncate">
                      {storyItem.label}: {storyItem.headline}
                    </h3>
                    <p className="text-[10px] text-[#6E564B] truncate mt-0.5">
                      قاب: {storyItem.frame_style || idea.design.card_style}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#5C1A2B] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#5C1A2B] shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-[#DECBB8]">
                  <div
                    dir="rtl"
                    className="font-mono-rtl text-[12px] leading-7 p-3.5 rounded-[16px] max-h-64 overflow-y-auto prompt-scroll whitespace-pre-wrap break-words select-all bg-[#F6EBDD] text-[#3B2A22] border border-[#DECBB8]"
                  >
                    {storyItem.prompt}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(storyItem.prompt, copyBtnKey)}
                      className="h-11 rounded-full bg-[#5C1A2B] text-[#F6EBDD] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-[0.97]"
                    >
                      {copiedKey === copyBtnKey ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>کپی شد ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>کپی پرامپت</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInChatGpt(storyItem.prompt, chatBtnKey)}
                      className="h-11 rounded-full bg-[#F6EBDD] border border-[#5C1A2B] text-[#5C1A2B] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.97]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ارسال به ChatGPT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {idea.revised_sentences && idea.revised_sentences.length > 0 && (
        <div className="paper-surface rounded-[22px] p-4 space-y-3">
          <h2 className="text-sm font-extrabold text-[#5C1A2B]">
            جملات اصلاح‌شده (حذف شعار و تعریف‌آمیز)
          </h2>
          <div className="space-y-2.5">
            {idea.revised_sentences.map((rev, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8] text-xs space-y-1.5"
              >
                <p className="text-[#C2553A] line-through opacity-85">{rev.before}</p>
                <p className="font-extrabold text-[#2F3A1E]">← {rev.after}</p>
                <p className="text-[11px] text-[#6E564B]">{rev.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {idea.candidates && idea.candidates.length > 0 && (
        <div className="paper-surface rounded-[20px]">
          <button
            type="button"
            onClick={() => setShowCritiqueProcess((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-right"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5C1A2B]" />
              <span className="text-xs font-extrabold text-[#5C1A2B]">
                فرآیند انتخاب از بین ۳ ایده اولیه
              </span>
            </div>
            {showCritiqueProcess ? (
              <ChevronUp className="w-4 h-4 text-[#5C1A2B]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5C1A2B]" />
            )}
          </button>

          {showCritiqueProcess && (
            <div className="px-4 pb-4 space-y-2 border-t border-[#DECBB8] pt-3">
              {idea.candidates.map((cand, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-[14px] border text-xs space-y-1 ${
                    cand.selected
                      ? 'bg-[#EBC3BC] border-[#5C1A2B]'
                      : 'bg-[#F6EBDD] border-[#DECBB8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-[#5C1A2B]">
                      {toPersianDigits(idx + 1)}. {cand.title}
                    </span>
                    {cand.selected && (
                      <span className="px-2 py-0.5 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-[10px] font-bold">
                        برگزیده
                      </span>
                    )}
                  </div>
                  {cand.critique && <p className="text-[11px] text-[#3B2A22]">{cand.critique}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasCaptionOrHashtags && (
        <div className="paper-surface rounded-[20px] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-[#5C1A2B]">کپشن و هشتگ اختیاری</h2>
            <button
              type="button"
              onClick={handleCopyCaptionAndHashtags}
              className="h-8 px-3 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B] text-[11px] font-bold flex items-center gap-1"
            >
              {copiedKey === 'copy-caption' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>کپی</span>
            </button>
          </div>
          {idea.caption && <p className="text-xs leading-relaxed text-[#3B2A22]">{idea.caption}</p>}
          {idea.hashtags && idea.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B]"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onOpenAdvancedSettings}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C1A2B] underline underline-offset-4"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>تنظیمات مدل، جستجو و فهرست زاویه‌ها</span>
        </button>
      </div>

      <div className="fixed bottom-[64px] left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4 py-2.5 border-t bg-[#FBF5EC] border-[#DECBB8]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllPrompts}
            className="flex-1 h-11 rounded-full bg-[#C2553A] text-[#FBF5EC] text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.97]"
          >
            {copiedKey === 'copy-all' ? (
              <>
                <Check className="w-4 h-4" />
                <span>کپی شد ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>کپی همه‌ی پرامپت‌ها</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            className="h-11 px-3.5 rounded-full bg-[#F6EBDD] border border-[#5C1A2B] text-[#5C1A2B] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>سری جدید</span>
          </button>
        </div>
      </div>
    </div>
  );
};
