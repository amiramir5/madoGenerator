import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clapperboard,
  Code,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
  History as HistoryIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_CARD_STYLES,
  DEFAULT_CONTENT_ANGLES,
  DEFAULT_FONT_PAIRS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_PAGE_PROFILE,
  DEFAULT_TEXT_LAYOUTS,
  GEMINI_MODEL_OPTIONS,
  HistoryItem,
  IDEA_TYPE_LABELS,
  IdeaType,
  SourceLink,
  ToastMessage,
  UsedIdeaEntry,
} from './types';
import {
  buildUserContentPrompt,
  compressUploadedImageFile,
  createUsedIdeaEntry,
  formatResultTypeBadge,
  getTodayDates,
  resolveActiveGeminiModel,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
  toPersianDigits,
} from './utils/helpers';
import { AdvancedSettingsSheet } from './components/AdvancedSettingsSheet';
import { ResultView } from './components/ResultView';
import { CornerPattern } from './components/CornerPattern';
import { DailyAutomationPanel } from './components/DailyAutomationPanel';
import { MotionStudio } from './components/MotionStudio';
import {
  fetchHistoryFromFirestore,
  saveIdeaToFirestore,
  deleteIdeaFromFirestore,
  fetchSettingsFromFirestore,
  saveSettingsToFirestore,
  fetchUsedIdeasFromFirestore,
  saveUsedIdeaToFirestore,
  deleteUsedIdeaFromFirestore,
} from './services/firestoreStorage';
import { usePWAInstall } from './hooks/usePWAInstall';

const STORAGE_KEYS = {
  WELCOMED: 'madogenerator_welcomed_v2',
  SETTINGS: 'madogenerator_settings_v2',
  PROFILE: 'madogenerator_profile_v2',
  HISTORY: 'madogenerator_history_v2',
  USED_IDEAS: 'madogenerator_used_ideas_v2',
  SELECTED_TYPE: 'madogenerator_selected_type_v2',
};

const LOADING_MESSAGES = [
  'در حال بررسی دقیق کادر عکس واقعی محصول (بدون حدس اسم غذا)…',
  'در حال جستجوی زنده گوگل برای ترندها و مناسبت‌های غیرسیاسی روز…',
  'در حال تطبیق با حافظه‌ی ضدتکرار و نگارش پرامپت‌های قاب برندی مادو…',
];

interface CategoryTileConfig {
  type: IdeaType;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  patternVariant: 'arcs' | 'dots' | 'petals' | 'frame';
}

const CATEGORY_TILES: CategoryTileConfig[] = [
  { type: 'story', title: 'سری استوری', subtitle: '۵ تا ۷ استوری', icon: ImageIcon, patternVariant: 'arcs' },
  { type: 'reel', title: 'سناریو ریلز', subtitle: 'ویدیوی کوتاه', icon: Play, patternVariant: 'dots' },
  { type: 'caption', title: 'کپشن و هشتگ', subtitle: 'متن طبیعی پست', icon: Pencil, patternVariant: 'petals' },
  { type: 'combo', title: 'پکیج ترکیبی', subtitle: 'استوری + کپشن', icon: Code, patternVariant: 'frame' },
  { type: 'carousel', title: 'پست کروسل', subtitle: 'اسلاید کاربردی', icon: GraduationCap, patternVariant: 'arcs' },
];

export default function App() {
  const [hasWelcomed, setHasWelcomed] = useState<boolean>(() =>
    safeStorageGet<boolean>(STORAGE_KEYS.WELCOMED, false)
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [motionFocusedIdeaId, setMotionFocusedIdeaId] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<IdeaType>(() =>
    safeStorageGet<IdeaType>(STORAGE_KEYS.SELECTED_TYPE, 'story')
  );

  const [advSettings, setAdvSettings] = useState<AdvancedSettings>(() => {
    const saved = safeStorageGet<Partial<AdvancedSettings>>(STORAGE_KEYS.SETTINGS, {});
    return {
      ...DEFAULT_ADVANCED_SETTINGS,
      ...saved,
      geminiModel: saved.geminiModel || DEFAULT_GEMINI_MODEL,
      customGeminiModel: saved.customGeminiModel || '',
      enableGoogleSearch:
        typeof saved.enableGoogleSearch === 'boolean' ? saved.enableGoogleSearch : true,
      contentAngles: saved.contentAngles?.length ? saved.contentAngles : DEFAULT_CONTENT_ANGLES,
      textLayouts: saved.textLayouts?.length ? saved.textLayouts : DEFAULT_TEXT_LAYOUTS,
      fontPairs: saved.fontPairs?.length ? saved.fontPairs : DEFAULT_FONT_PAIRS,
      cardStyles: saved.cardStyles?.length ? saved.cardStyles : DEFAULT_CARD_STYLES,
    };
  });
  const [isAdvSheetOpen, setIsAdvSheetOpen] = useState(false);

  const [pageProfile, setPageProfile] = useState<string>(() =>
    safeStorageGet<string>(STORAGE_KEYS.PROFILE, DEFAULT_PAGE_PROFILE)
  );

  const [uploadedPhoto, setUploadedPhoto] = useState<{
    base64: string;
    mimeType: string;
    dataUrl: string;
    name: string;
  } | null>(null);
  const [foodNamesInput, setFoodNamesInput] = useState<string>('');
  const [photoRequiredWarning, setPhotoRequiredWarning] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() =>
    safeStorageGet<HistoryItem[]>(STORAGE_KEYS.HISTORY, [])
  );

  const [usedIdeas, setUsedIdeas] = useState<UsedIdeaEntry[]>(() =>
    safeStorageGet<UsedIdeaEntry[]>(STORAGE_KEYS.USED_IDEAS, [])
  );

  const [currentResultId, setCurrentResultId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'saved' | IdeaType>('all');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.SELECTED_TYPE, selectedType);
  }, [selectedType]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.SETTINGS, advSettings);
  }, [advSettings]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.PROFILE, pageProfile);
  }, [pageProfile]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.HISTORY, history);
  }, [history]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.USED_IDEAS, usedIdeas);
  }, [usedIdeas]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [cloudSettings, cloudHistory, cloudUsed] = await Promise.all([
          fetchSettingsFromFirestore(),
          fetchHistoryFromFirestore(30),
          fetchUsedIdeasFromFirestore(60),
        ]);
        if (!isMounted) return;
        if (cloudSettings) {
          setAdvSettings((prev) => ({
            ...prev,
            ...cloudSettings,
            geminiModel: cloudSettings.geminiModel || prev.geminiModel || DEFAULT_GEMINI_MODEL,
          }));
        }
        if (cloudHistory.length > 0) {
          setHistory((prev) => {
            const byId = new Map<string, HistoryItem>();
            [...prev, ...cloudHistory].forEach((it) => byId.set(it.id, it));
            return Array.from(byId.values())
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 40);
          });
        }
        if (cloudUsed.length > 0) {
          setUsedIdeas((prev) => {
            const byId = new Map<string, UsedIdeaEntry>();
            [...prev, ...cloudUsed].forEach((it) => byId.set(it.id, it));
            return Array.from(byId.values())
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 80);
          });
        }
      } catch (err) {
        console.warn('Initial Firestore sync notice:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIdx(0);
      return;
    }
    const interval = window.setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  const showToast = (text: string, actionUrl?: string, actionLabel?: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: String(Date.now()), text, actionUrl, actionLabel });
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      actionUrl ? 6500 : 3200
    );
  };

  const handleCompleteWelcome = () => {
    setHasWelcomed(true);
    safeStorageSet(STORAGE_KEYS.WELCOMED, true);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) showToast('اپلیکیشن madoGenerator با موفقیت نصب شد ✓');
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressUploadedImageFile(file, 1024);
      setUploadedPhoto({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        dataUrl: compressed.dataUrl,
        name: file.name,
      });
      setPhotoRequiredWarning(false);
      showToast('عکس واقعی محصول بارگذاری شد ✓');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'خطا در بارگذاری عکس');
    }
  };

  const activeModel = resolveActiveGeminiModel(advSettings);

  const handleGenerateIdea = async () => {
    if (isLoading) return;

    if (!uploadedPhoto?.base64) {
      setPhotoRequiredWarning(true);
      showToast('برای تولید محتوای محصول‌محور مادو، ابتدا عکس واقعی غذا را آپلود کن.');
      fileInputRef.current?.click();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPhotoRequiredWarning(false);

    try {
      const userPrompt = buildUserContentPrompt({
        type: selectedType,
        count: advSettings.count,
        settings: advSettings,
        pageProfile: pageProfile || DEFAULT_PAGE_PROFILE,
        history,
        usedIdeas,
        hasUploadedPhoto: true,
        foodNamesNote: foodNamesInput,
      });

      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          requestedType: selectedType,
          uploadedPhotoBase64: uploadedPhoto.base64,
          uploadedPhotoMimeType: uploadedPhoto.mimeType,
          preferredModel: activeModel,
          enableGoogleSearch: advSettings.enableGoogleSearch,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.idea) {
        throw new Error(data?.error || 'خطا در دریافت ایده از جمنای.');
      }

      const { jalali, gregorian } = getTodayDates();
      const newId = `mado-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newItem: HistoryItem = {
        id: newId,
        createdAt: jalali,
        isoDate: gregorian,
        timestamp: Date.now(),
        saved: false,
        confirmedUsed: false,
        count: advSettings.count,
        uploadedPhotoPreview: uploadedPhoto.dataUrl,
        foodNamesProvided: foodNamesInput.trim() || undefined,
        idea: data.idea,
        sources: Array.isArray(data.sources) ? (data.sources as SourceLink[]) : [],
      };

      const usedEntry = createUsedIdeaEntry({
        id: newId,
        idea: data.idea,
        createdAt: jalali,
        confirmed: false,
      });

      setHistory((prev) => [newItem, ...prev].slice(0, 40));
      setUsedIdeas((prev) => [usedEntry, ...prev].slice(0, 80));

      saveIdeaToFirestore(newItem).catch((e) => console.warn('Firestore idea save notice:', e));
      saveUsedIdeaToFirestore(usedEntry).catch((e) =>
        console.warn('Firestore used_idea save notice:', e)
      );

      setCurrentResultId(newId);
      setIsLoading(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'ارتباط با سرور برقرار نشد. اتصال اینترنت یا کلید API را بررسی کن.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleConfirmUsedIdea = (id: string) => {
    const target = history.find((h) => h.id === id);
    if (!target) return;

    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, confirmedUsed: true } : h))
    );
    const updatedItem: HistoryItem = { ...target, confirmedUsed: true };
    saveIdeaToFirestore(updatedItem).catch(() => {});

    const usedEntry = createUsedIdeaEntry({
      id: target.id,
      idea: target.idea,
      createdAt: target.createdAt,
      confirmed: true,
    });

    setUsedIdeas((prev) => {
      const filtered = prev.filter((u) => u.id !== id);
      return [usedEntry, ...filtered].slice(0, 80);
    });
    saveUsedIdeaToFirestore(usedEntry).catch(() => {});
    showToast('ایده در لیست «ایده‌های مصرف‌شده» تایید و قفل شد ✓');
  };

  const handleRemoveUsedIdea = (id: string) => {
    setUsedIdeas((prev) => prev.filter((u) => u.id !== id));
    deleteUsedIdeaFromFirestore(id).catch(() => {});
    showToast('مورد از حافظه ضدتکرار حذف شد');
  };

  const handleToggleSaveIdea = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextSaved = !item.saved;
        showToast(nextSaved ? 'در نشانک‌ها ذخیره شد ✓' : 'از نشانک‌ها خارج شد');
        const updated = { ...item, saved: nextSaved };
        saveIdeaToFirestore(updated).catch(() => {});
        return updated;
      })
    );
  };

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    deleteIdeaFromFirestore(id).catch(() => {});
    if (currentResultId === id) setCurrentResultId(null);
    showToast('ایده از تاریخچه حذف شد');
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    safeStorageRemove(STORAGE_KEYS.HISTORY);
    setCurrentResultId(null);
    setConfirmClearHistory(false);
    showToast('تاریخچه پاک شد (حافظه‌ی ضدتکرار جداگانه حفظ می‌شود) ✓');
  };

  const currentResultItem = currentResultId
    ? history.find((h) => h.id === currentResultId) || null
    : null;

  const todayIdeaItem = useMemo(() => {
    const { gregorian } = getTodayDates();
    return history.find((h) => h.isoDate === gregorian) || history[0] || null;
  }, [history]);

  const filteredHistory = history.filter((item) => {
    if (historyFilter === 'saved' && !item.saved) return false;
    if (
      historyFilter !== 'all' &&
      historyFilter !== 'saved' &&
      item.idea.type !== historyFilter
    ) {
      return false;
    }
    if (!historySearch.trim()) return true;
    const q = historySearch.trim().toLowerCase();
    return Boolean(
      item.idea.title?.toLowerCase().includes(q) ||
        item.idea.concept?.toLowerCase().includes(q) ||
        item.idea.selected_angle?.toLowerCase().includes(q)
    );
  });

  if (!hasWelcomed) {
    return (
      <div
        dir="rtl"
        className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col justify-between p-6 relative overflow-hidden bg-[#F6EBDD] text-[#3B2A22]"
      >
        <CornerPattern variant="arcs" position="top-left" colorClass="text-[#5C1A2B]/[0.14]" />
        <CornerPattern variant="petals" position="bottom-right" colorClass="text-[#2F3A1E]/[0.14]" />

        <div className="flex items-center justify-between pt-2 z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] bg-[#5C1A2B] text-[#F6EBDD] flex items-center justify-center text-xs font-extrabold">
              M
            </span>
            <span className="text-lg font-extrabold text-[#5C1A2B] tracking-tight">
              madoGenerator
            </span>
          </div>
          <button
            type="button"
            onClick={handleCompleteWelcome}
            className="text-xs font-bold text-[#6E564B] hover:text-[#5C1A2B]"
          >
            رد کردن
          </button>
        </div>

        <div className="my-auto py-6 z-10 flex justify-center">
          <div className="w-64 rose-surface rounded-t-[128px] rounded-b-[24px] p-6 text-center space-y-3 border-2 border-[#5C1A2B]/20">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F6EBDD] border border-[#5C1A2B]/25 flex items-center justify-center text-[#5C1A2B] font-black text-2xl">
              M
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[11px] font-extrabold">
              mado.fingerfood.tabriz
            </span>
            <p className="text-xs text-[#3B2A22] leading-relaxed font-medium">
              تحلیل عکس واقعی، جدول متن‌های فارسی، پرامپت‌های قاب برندی و موشن‌ساز MP4
            </p>
          </div>
        </div>

        <div className="space-y-5 pb-2 z-10">
          <div className="space-y-2 text-right">
            <h1 className="text-[30px] font-extrabold leading-[1.25] text-[#5C1A2B]">
              محتوای دقیق مادو،
              <br />
              بدون شعار و <span className="text-[#C2553A]">بدون تکرار.</span>
            </h1>
            <p className="text-xs leading-relaxed text-[#5A443A]">
              عکس واقعی غذا را آپلود کن؛ با Gemini 4 Hydrogen و جستجوی زنده گوگل، استوری و
              موشن ۹:۱۶ آماده تحویل بگیر.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteWelcome}
            className="w-full h-[54px] rounded-full bg-[#5C1A2B] text-[#F6EBDD] font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-[#E3A92F]" strokeWidth={2} />
            <span>ورود به madoGenerator</span>
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col relative overflow-x-hidden bg-[#F6EBDD] text-[#3B2A22]"
    >
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[84vh] relative overflow-hidden animate-card-enter">
          <CornerPattern variant="arcs" position="top-left" colorClass="text-[#5C1A2B]/[0.14]" />
          <CornerPattern variant="dots" position="bottom-right" colorClass="text-[#2F3A1E]/[0.14]" />

          <div className="w-24 h-28 rose-surface rounded-t-[48px] rounded-b-[16px] flex items-center justify-center mb-6 border-2 border-[#5C1A2B]/25">
            <Loader2 className="w-9 h-9 text-[#5C1A2B] animate-spin" strokeWidth={2} />
          </div>

          <span
            dir="ltr"
            className="px-3 py-1 rounded-full bg-[#FBF5EC] border border-[#DECBB8] text-[#5C1A2B] text-[11px] font-mono font-bold mb-3"
          >
            {activeModel}
          </span>

          <h2 className="text-base font-extrabold text-[#5C1A2B] mb-2 max-w-[320px] leading-snug">
            {LOADING_MESSAGES[loadingStepIdx]}
          </h2>
          <p className="text-xs max-w-[290px] leading-relaxed text-[#6E564B]">
            در حال بررسی عکس واقعی، ترندهای روز و چک کردن قوانین لحن mado.fingerfood.tabriz
          </p>
        </div>
      ) : errorMessage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[82vh] animate-card-enter">
          <div className="w-16 h-16 rounded-full bg-[#EBC3BC] text-[#C2553A] flex items-center justify-center mb-4 border border-[#C2553A]/30">
            <AlertCircle className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-extrabold text-[#5C1A2B] mb-2">خطا در تولید محتوا</h2>
          <p className="text-xs leading-relaxed max-w-[310px] mb-6 text-[#5A443A]">
            {errorMessage}
          </p>
          <div className="w-full max-w-[300px] space-y-2.5">
            <button
              type="button"
              onClick={handleGenerateIdea}
              className="w-full h-[52px] rounded-full bg-[#C2553A] text-[#FBF5EC] font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تلاش مجدد</span>
            </button>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-full h-11 rounded-full font-bold text-xs border border-[#5C1A2B] text-[#5C1A2B] bg-[#FBF5EC]"
            >
              بازگشت به خانه
            </button>
          </div>
        </div>
      ) : currentResultItem ? (
        <ResultView
          item={currentResultItem}
          onBack={() => setCurrentResultId(null)}
          onRegenerate={handleGenerateIdea}
          onToggleSave={handleToggleSaveIdea}
          onConfirmUsed={handleConfirmUsedIdea}
          onOpenMotionForIdea={(id) => {
            setMotionFocusedIdeaId(id);
            setCurrentResultId(null);
            setActiveTab('motion');
          }}
          onOpenAdvancedSettings={() => setIsAdvSheetOpen(true)}
          onShowToast={showToast}
        />
      ) : (
        <main className="flex-1 pb-24">
          {activeTab === 'home' && (
            <div className="p-5 space-y-4 animate-card-enter">
              <header className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[11px] bg-[#5C1A2B] text-[#F6EBDD] flex items-center justify-center font-black text-sm">
                    M
                  </div>
                  <div>
                    <span className="block text-base font-extrabold text-[#5C1A2B] leading-none">
                      madoGenerator
                    </span>
                    <span className="text-[10px] text-[#6E564B]">mado.fingerfood.tabriz</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="h-9 px-3 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 bg-[#E3A92F] text-[#5C1A2B] active:scale-[0.96]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>نصب PWA</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAdvSheetOpen(true)}
                    title="تنظیمات مدل و جستجو"
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FBF5EC] border border-[#DECBB8] text-[#5C1A2B] active:scale-[0.95]"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <span
                  dir="ltr"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EC] border border-[#DECBB8] text-[#5C1A2B] font-mono"
                >
                  <Cpu className="w-3 h-3 text-[#C2553A]" />
                  <span>{activeModel}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                    advSettings.enableGoogleSearch
                      ? 'bg-[#2F3A1E] text-[#F6EBDD]'
                      : 'bg-[#EBC3BC] text-[#5C1A2B]'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>
                    {advSettings.enableGoogleSearch ? 'جستجوی گوگل: فعال' : 'جستجوی گوگل: خاموش'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBC3BC] text-[#5C1A2B]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ضدتکرار: {toPersianDigits(usedIdeas.length)} ایده</span>
                </span>
              </div>

              <div
                className={`paper-surface relative overflow-hidden rounded-[22px] p-4 space-y-3 ${
                  photoRequiredWarning ? 'border-2 border-[#C2553A]' : ''
                }`}
              >
                <CornerPattern variant="dots" position="top-left" colorClass="text-[#5C1A2B]/[0.1]" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectPhotoFile}
                  className="hidden"
                />

                {!uploadedPhoto ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative z-10 w-full flex items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-[14px] bg-[#EBC3BC] text-[#5C1A2B] flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5" strokeWidth={1.85} />
                      </div>
                      <div>
                        <h2 className="text-xs font-extrabold text-[#5C1A2B]">
                          ۱) آپلود عکس واقعی محصول (الزامی)
                        </h2>
                        <p className="text-[11px] text-[#6E564B] mt-0.5 leading-relaxed">
                          تحلیل و متن استوری‌ها مستقیم بر اساس کادر همین عکس نوشته می‌شود.
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1.5 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[11px] font-extrabold shrink-0">
                      انتخاب عکس
                    </span>
                  </button>
                ) : (
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={uploadedPhoto.dataUrl}
                        alt="عکس واقعی محصول"
                        className="w-14 h-16 object-cover rounded-[12px] shrink-0 border border-[#DECBB8]"
                      />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-extrabold text-[#2F3A1E]">
                          عکس واقعی آماده تحلیل ✓
                        </span>
                        <p className="text-xs font-bold text-[#5C1A2B] truncate" dir="ltr">
                          {uploadedPhoto.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] underline text-[#C2553A] mt-0.5"
                        >
                          تغییر عکس
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUploadedPhoto(null)}
                      title="حذف عکس"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D6356] hover:text-[#C2553A] shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {photoRequiredWarning && (
                  <p className="relative z-10 text-[11px] font-bold text-[#C2553A]">
                    برای رعایت اصل محصول‌محوری پیج مادو، آپلود عکس واقعی غذا قبل از تولید الزامی است.
                  </p>
                )}

                <div className="relative z-10 pt-2 border-t border-[#DECBB8]">
                  <label className="block text-[11px] font-bold text-[#5C1A2B] mb-1">
                    نام غذاهای داخل عکس (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={foodNamesInput}
                    onChange={(e) => setFoodNamesInput(e.target.value)}
                    placeholder="خالی بگذار تا مدل هیچ اسمی حدس نزند و از رنگ برای توصیف استفاده نکند"
                    className="w-full h-10 rounded-full px-3.5 text-xs bg-[#F6EBDD] border border-[#DECBB8] text-[#3B2A22] placeholder:text-[#7D6356]/75 outline-none focus:border-[#5C1A2B]"
                  />
                </div>
              </div>

              <div
                onClick={handleGenerateIdea}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleGenerateIdea();
                }}
                className="relative overflow-hidden rounded-[22px] p-5 cursor-pointer transition-transform active:scale-[0.98] bg-[#5C1A2B] text-[#F6EBDD]"
              >
                <CornerPattern variant="arcs" position="top-left" colorClass="text-[#EBC3BC]/[0.18]" />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[11px] font-extrabold">
                        {IDEA_TYPE_LABELS[selectedType]} · {toPersianDigits(advSettings.count)} استوری
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-extrabold text-[#F6EBDD] mb-1">
                        تحلیل عکس و تولید پرامپت‌های امروز
                      </h2>
                      <p className="text-xs leading-relaxed text-[#EBC3BC] max-w-[260px]">
                        خروجی یک‌جا: خلاصه‌ی روز، جدول متن فارسی، چک‌های قبل از پست و پرامپت تصویر
                      </p>
                    </div>
                  </div>

                  <span className="w-11 h-11 rounded-full bg-[#C2553A] text-[#FBF5EC] flex items-center justify-center shrink-0">
                    <ArrowLeft className="w-5 h-5" strokeWidth={2.25} />
                  </span>
                </div>
              </div>

              <section className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-[#5C1A2B]">نوع محتوای امروز</h2>
                  <button
                    type="button"
                    onClick={() => setIsAdvSheetOpen(true)}
                    className="text-xs font-bold text-[#C2553A]"
                  >
                    تنظیم مدل و تعداد ({toPersianDigits(advSettings.count)})
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {CATEGORY_TILES.map((tile) => {
                    const IconComponent = tile.icon;
                    const isSelected = selectedType === tile.type;

                    return (
                      <button
                        key={tile.type}
                        type="button"
                        onClick={() => setSelectedType(tile.type)}
                        className={`relative overflow-hidden rounded-[18px] p-3.5 text-right transition-all active:scale-[0.97] flex flex-col justify-between min-h-[108px] border ${
                          isSelected
                            ? 'bg-[#EBC3BC] border-2 border-[#5C1A2B]'
                            : 'bg-[#FBF5EC] border-[#DECBB8] hover:border-[#5C1A2B]/40'
                        }`}
                      >
                        <CornerPattern
                          variant={tile.patternVariant}
                          position="top-left"
                          colorClass="text-[#5C1A2B]/[0.1]"
                        />

                        <div className="relative z-10 flex items-center justify-between w-full mb-2.5">
                          <div
                            className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#5C1A2B] text-[#F6EBDD]'
                                : 'bg-[#F6EBDD] text-[#5C1A2B]'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" strokeWidth={1.75} />
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#2F3A1E] text-[#F6EBDD] flex items-center justify-center">
                              <Check className="w-3 h-3" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>

                        <div className="relative z-10">
                          <h3 className="text-xs font-extrabold text-[#5C1A2B] truncate">
                            {tile.title}
                          </h3>
                          <p className="text-[10px] text-[#6E564B] truncate">{tile.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setActiveTab('motion')}
                    className="relative overflow-hidden rounded-[18px] p-3.5 text-right transition-all active:scale-[0.97] flex flex-col justify-between min-h-[108px] bg-[#2F3A1E] text-[#F6EBDD] border border-[#2F3A1E]"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#E3A92F] text-[#5C1A2B] flex items-center justify-center">
                      <Clapperboard className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold truncate">موشن‌ساز MP4</h3>
                      <p className="text-[10px] text-[#EBC3BC] truncate">خروجی ویدیو ۹:۱۶</p>
                    </div>
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'motion' && (
            <MotionStudio
              todayItem={todayIdeaItem}
              focusedIdeaId={motionFocusedIdeaId}
              history={history}
              selectedModel={activeModel}
              onGoToHome={() => setActiveTab('home')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'history' && (
            <div className="p-5 space-y-4 animate-card-enter">
              <div className="flex items-center justify-between pt-1">
                <h1 className="text-xl font-extrabold text-[#5C1A2B]">تاریخچه و آرشیو</h1>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryFilter((prev) => (prev === 'saved' ? 'all' : 'saved'))
                  }
                  title="فیلتر ذخیره‌شده‌ها"
                  className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                    historyFilter === 'saved'
                      ? 'bg-[#5C1A2B] border-[#5C1A2B] text-[#F6EBDD]'
                      : 'bg-[#FBF5EC] border-[#DECBB8] text-[#5C1A2B]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2.5 px-4 h-11 rounded-full bg-[#FBF5EC] border border-[#DECBB8] focus-within:border-[#5C1A2B]">
                <Search className="w-4 h-4 text-[#7D6356] shrink-0" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="جستجو در ایده‌ها و پرامپت‌ها..."
                  className="w-full bg-transparent text-xs outline-none text-[#3B2A22]"
                />
                {historySearch && (
                  <button type="button" onClick={() => setHistorySearch('')} className="p-1">
                    <X className="w-4 h-4 text-[#7D6356]" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { key: 'all', label: 'همه' },
                    { key: 'saved', label: 'ذخیره‌شده' },
                    { key: 'story', label: 'استوری' },
                    { key: 'reel', label: 'ریلز' },
                    { key: 'carousel', label: 'کروسل' },
                    { key: 'caption', label: 'کپشن' },
                    { key: 'combo', label: 'ترکیبی' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setHistoryFilter(tab.key)}
                    className={`h-8 px-3.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                      historyFilter === tab.key
                        ? 'bg-[#5C1A2B] text-[#F6EBDD] border-[#5C1A2B]'
                        : 'bg-[#FBF5EC] text-[#5A443A] border-[#DECBB8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="paper-surface rounded-[22px] p-8 text-center space-y-2.5">
                  <HistoryIcon className="w-8 h-8 text-[#C2553A] mx-auto" strokeWidth={1.75} />
                  <h3 className="text-sm font-extrabold text-[#5C1A2B]">هنوز ایده‌ای اینجا نیست</h3>
                  <p className="text-xs text-[#6E564B]">
                    هر ایده‌ای که در تب خانه بسازی به‌طور خودکار اینجا و در حافظه ضدتکرار ثبت می‌شود.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredHistory.map((hItem) => (
                    <div
                      key={hItem.id}
                      onClick={() => setCurrentResultId(hItem.id)}
                      className="paper-surface rounded-[18px] p-3.5 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                    >
                      {hItem.uploadedPhotoPreview ? (
                        <img
                          src={hItem.uploadedPhotoPreview}
                          alt=""
                          className="w-12 h-14 rounded-[10px] object-cover border border-[#DECBB8] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-[12px] bg-[#EBC3BC] text-[#5C1A2B] flex items-center justify-center font-black shrink-0">
                          M
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-[#E3A92F] text-[#5C1A2B] text-[10px] font-extrabold">
                            {formatResultTypeBadge(
                              hItem.idea.type,
                              hItem.idea.items?.length || hItem.count
                            )}
                          </span>
                          {hItem.confirmedUsed && (
                            <span className="text-[10px] font-bold text-[#2F3A1E] flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مصرف‌شده</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-extrabold text-[#5C1A2B] truncate">
                          {hItem.idea.title}
                        </h3>
                        <p className="text-[10px] text-[#6E564B]">{hItem.createdAt}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSaveIdea(hItem.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hItem.saved ? 'text-[#C2553A]' : 'text-[#7D6356]'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" fill={hItem.saved ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(hItem.id, e)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D6356] hover:text-[#C2553A]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-5 space-y-5 animate-card-enter">
              <div className="pt-1">
                <h1 className="text-xl font-extrabold text-[#5C1A2B]">تنظیمات madoGenerator</h1>
              </div>

              {!isInstalled && (
                <div className="rose-surface rounded-[20px] p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[12px] bg-[#5C1A2B] text-[#F6EBDD] flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-extrabold text-[#5C1A2B]">
                        نصب madoGenerator روی گوشی (PWA)
                      </h2>
                      <p className="text-[11px] text-[#5A443A]">
                        دسترسی سریع با آیکون مات اختصاصی مادو
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-3.5 py-2 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-xs font-extrabold shrink-0"
                  >
                    نصب
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-xs font-extrabold text-[#5C1A2B] px-1">
                  مدل جمنای و جستجوی زنده گوگل
                </h2>
                <div className="paper-surface rounded-[20px] p-4 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5C1A2B] flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-[#C2553A]" />
                      <span>مدل انتخابی فعلی</span>
                    </label>
                    <select
                      value={advSettings.geminiModel}
                      onChange={(e) => {
                        const updated: AdvancedSettings = {
                          ...advSettings,
                          geminiModel: e.target.value,
                          customGeminiModel: '',
                        };
                        setAdvSettings(updated);
                        saveSettingsToFirestore(updated).catch(() => {});
                        showToast(`مدل روی ${e.target.value} تنظیم شد ✓`);
                      }}
                      className="w-full h-11 rounded-full px-4 text-xs font-bold bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B] outline-none"
                    >
                      {GEMINI_MODEL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DECBB8]">
                    <div>
                      <p className="text-xs font-bold text-[#5C1A2B]">
                        جستجوی زنده گوگل (Google Search)
                      </p>
                      <p className="text-[10px] text-[#6E564B]">
                        بررسی ترندهای پذیرایی و مناسبت‌های روز بدون موضوعات حساس
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={advSettings.enableGoogleSearch}
                      onClick={() => {
                        const updated: AdvancedSettings = {
                          ...advSettings,
                          enableGoogleSearch: !advSettings.enableGoogleSearch,
                        };
                        setAdvSettings(updated);
                        saveSettingsToFirestore(updated).catch(() => {});
                      }}
                      className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center shrink-0 ${
                        advSettings.enableGoogleSearch
                          ? 'bg-[#2F3A1E] justify-start'
                          : 'bg-[#D6C4B2] justify-end'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FBF5EC]" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdvSheetOpen(true)}
                    className="w-full h-10 rounded-full bg-[#F6EBDD] border border-[#DECBB8] text-[#5C1A2B] text-xs font-bold flex items-center justify-between px-4"
                  >
                    <span>ویرایش زاویه‌ها، فونت‌ها، قاب‌ها و مدل دلخواه</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#2F3A1E]" />
                    <span>
                      حافظه ضدِ تکرار: ایده‌های مصرف‌شده ({toPersianDigits(usedIdeas.length)})
                    </span>
                  </h2>
                </div>
                <div className="paper-surface rounded-[20px] p-4 space-y-2.5">
                  <p className="text-[11px] text-[#6E564B] leading-relaxed">
                    تمام ایده‌های زیر در localStorage و Firestore نگهداری و در پرامپت سیستم به جمنای
                    تزریق می‌شوند تا مطلقاً تکرار نشوند.
                  </p>
                  {usedIdeas.length === 0 ? (
                    <p className="text-xs text-center py-3 text-[#7D6356]">
                      هنوز ایده‌ی مصرف‌شده‌ای ثبت نشده است.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto prompt-scroll">
                      {usedIdeas.map((u) => (
                        <div
                          key={u.id}
                          className="p-2.5 rounded-[12px] bg-[#F6EBDD] border border-[#DECBB8] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#5C1A2B] truncate">{u.title}</p>
                            <p className="text-[10px] text-[#6E564B] truncate">
                              {u.createdAt} · {u.angle} {u.confirmed ? '· تاییدشده ✓' : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveUsedIdea(u.id)}
                            title="حذف از حافظه ضدتکرار"
                            className="p-1 text-[#7D6356] hover:text-[#C2553A] shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-[#5C1A2B]">پروفایل و قوانین پیج</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setPageProfile(DEFAULT_PAGE_PROFILE);
                      showToast('پروفایل به حالت پیش‌فرض برگشت ✓');
                    }}
                    className="text-[11px] font-bold text-[#C2553A] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>بازنشانی</span>
                  </button>
                </div>

                <div className="paper-surface rounded-[20px] p-4 space-y-3">
                  <textarea
                    rows={4}
                    value={pageProfile}
                    onChange={(e) => setPageProfile(e.target.value)}
                    className="w-full rounded-[14px] p-3 text-xs leading-relaxed bg-[#F6EBDD] border border-[#DECBB8] text-[#3B2A22] outline-none focus:border-[#5C1A2B]"
                  />
                  <button
                    type="button"
                    onClick={() => showToast('پروفایل پیج ذخیره شد ✓')}
                    className="w-full h-10 rounded-full bg-[#5C1A2B] text-[#F6EBDD] font-extrabold text-xs"
                  >
                    ذخیره پروفایل
                  </button>
                </div>
              </div>

              <DailyAutomationPanel
                onOpenGeneratedIdea={(idea) => {
                  const { jalali, gregorian } = getTodayDates();
                  const testId = `mado_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                  const newItem: HistoryItem = {
                    id: testId,
                    createdAt: jalali,
                    isoDate: gregorian,
                    timestamp: Date.now(),
                    saved: false,
                    confirmedUsed: true,
                    count: idea.items?.length || 5,
                    idea,
                    sources: [],
                  };
                  setHistory((prev) => [newItem, ...prev]);
                  setCurrentResultId(testId);
                  showToast('ایده‌ی اجرای آزمایشی باز شد ✓');
                }}
                onShowToast={showToast}
              />

              <div className="paper-surface rounded-[20px] p-4">
                {!confirmClearHistory ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearHistory(true)}
                    disabled={history.length === 0}
                    className="w-full flex items-center justify-between text-right disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4 text-[#C2553A]" />
                      <span className="text-xs font-bold text-[#5C1A2B]">پاک کردن تاریخچه نمایشی</span>
                    </div>
                    <span className="text-xs text-[#6E564B]">{toPersianDigits(history.length)} مورد</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[#C2553A]">
                      تاریخچه نمایشی پاک شود؟ (لیست ایده‌های مصرف‌شده حفظ می‌ماند)
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="flex-1 h-10 rounded-full bg-[#C2553A] text-[#FBF5EC] text-xs font-extrabold"
                      >
                        بله، پاک شود
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(false)}
                        className="flex-1 h-10 rounded-full border border-[#DECBB8] text-xs font-bold text-[#3B2A22]"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="paper-surface rounded-[20px] p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#5C1A2B] text-[#F6EBDD] flex items-center justify-center font-black text-xs">
                  M
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-[#5C1A2B]">madoGenerator · نسخه ۲.۰</h2>
                  <p className="text-[11px] text-[#6E564B]">
                    استودیو اختصاصی mado.fingerfood.tabriz
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      <AdvancedSettingsSheet
        isOpen={isAdvSheetOpen}
        onClose={() => setIsAdvSheetOpen(false)}
        settings={advSettings}
        onSave={(updated) => {
          setAdvSettings(updated);
          saveSettingsToFirestore(updated).catch(() => {});
          showToast('تنظیمات ذخیره و همگام‌سازی شد ✓');
        }}
      />

      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2A22]/50 p-5">
          <div className="paper-surface w-full max-w-[380px] rounded-[22px] p-6 space-y-4 animate-card-enter">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[12px] bg-[#5C1A2B] text-[#F6EBDD] flex items-center justify-center font-black">
                  M
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#5C1A2B]">نصب madoGenerator</h3>
                  <p className="text-[11px] text-[#6E564B]">افزودن به صفحه اصلی گوشی</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuideModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5C1A2B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs leading-relaxed space-y-2 text-[#3B2A22]">
              {isIOS ? (
                <>
                  <p>۱. در Safari روی دکمه‌ی <strong>Share</strong> بزنید.</p>
                  <p>۲. گزینه‌ی <strong>Add to Home Screen</strong> را انتخاب کنید.</p>
                  <p>۳. روی <strong>Add</strong> بزنید تا madoGenerator روی صفحه اصلی اضافه شود.</p>
                </>
              ) : (
                <>
                  <p>۱. در Chrome روی منوی سه نقطه <strong>(⋮)</strong> بزنید.</p>
                  <p>۲. گزینه‌ی <strong>Install app</strong> یا <strong>Add to Home screen</strong> را انتخاب کنید.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuideModal(false)}
              className="w-full h-11 rounded-full bg-[#5C1A2B] text-[#F6EBDD] text-xs font-extrabold"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-50 animate-card-enter">
          <div className="rounded-[18px] px-4 py-3 flex items-center justify-between gap-3 bg-[#3B2A22] border border-[#E3A92F]/50 text-[#F6EBDD]">
            <span className="text-xs font-medium leading-relaxed">{toast.text}</span>
            {toast.actionUrl && (
              <a
                href={toast.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shrink-0 bg-[#E3A92F] text-[#5C1A2B]"
              >
                <span>{toast.actionLabel || 'باز کردن'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {!isLoading && (
        <nav
          aria-label="ناوبری اصلی"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 z-40 grid grid-cols-4 items-center border-t bg-[#FBF5EC] border-[#DECBB8]"
        >
          {(
            [
              { id: 'home', label: 'خانه', icon: HomeIcon },
              { id: 'motion', label: 'موشن‌ساز MP4', icon: Clapperboard },
              { id: 'history', label: 'تاریخچه', icon: HistoryIcon },
              { id: 'settings', label: 'تنظیمات', icon: SettingsIcon },
            ] as const
          ).map((navItem) => {
            const IconComp = navItem.icon;
            const isActive = activeTab === navItem.id && !currentResultItem;
            return (
              <button
                key={navItem.id}
                type="button"
                onClick={() => {
                  setCurrentResultId(null);
                  setErrorMessage(null);
                  setActiveTab(navItem.id);
                }}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-transform active:scale-[0.95] ${
                  isActive ? 'text-[#5C1A2B]' : 'text-[#7D6356]'
                }`}
              >
                <span
                  className={`px-3 py-0.5 rounded-full ${
                    isActive ? 'bg-[#EBC3BC]' : 'bg-transparent'
                  }`}
                >
                  <IconComp className="w-4 h-4" strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                <span className={`text-[10px] ${isActive ? 'font-extrabold' : 'font-medium'}`}>
                  {navItem.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
