import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Terminal,
} from 'lucide-react';
import { GeneratedIdea } from '../types';
import { toPersianDigits } from '../utils/helpers';
import { CornerPattern } from './CornerPattern';

export interface ExecutionLogItem {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'dry_run';
  isDryRun: boolean;
  ideaTitle: string;
  imagesCount: number;
  telegramSent: boolean;
  message: string;
  details?: string;
}

interface DailyAutomationPanelProps {
  onOpenGeneratedIdea: (idea: GeneratedIdea) => void;
  onShowToast: (text: string) => void;
}

export const DailyAutomationPanel: React.FC<DailyAutomationPanelProps> = ({
  onOpenGeneratedIdea,
  onShowToast,
}) => {
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<ExecutionLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(true);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Could not load execution logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRunTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const res = await fetch('/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, requestedType: 'story' }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'خطا در اجرای آزمایشی');
      }

      onShowToast(data.message || 'اجرای آزمایشی با موفقیت انجام شد ✓');
      await loadLogs();

      if (data.idea) {
        onOpenGeneratedIdea(data.idea);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ارتباط با سرور';
      onShowToast(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-extrabold text-[#5C1A2B] flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#C2553A]" strokeWidth={2} />
          <span>اتوماسیون روزانه و Firestore</span>
        </h2>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2F3A1E] text-[#F6EBDD]">
          <Database className="w-3 h-3" />
          <span>متصل</span>
        </span>
      </div>

      <div className="paper-surface relative overflow-hidden rounded-[22px] p-4 space-y-3.5">
        <CornerPattern variant="dots" position="top-left" colorClass="text-[#5C1A2B]/[0.1]" />

        <div className="relative z-10 grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8]">
            <div className="flex items-center gap-1.5 font-bold text-[#5C1A2B] mb-1">
              <Clock className="w-3.5 h-3.5 text-[#C2553A]" />
              <span>زمان‌بندی تهران</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {['۱۱:۰۰', '۱۵:۰۰', '۲۰:۰۰'].map((hour) => (
                <span
                  key={hour}
                  className="px-2 py-0.5 rounded-full bg-[#E3A92F] text-[#5C1A2B] font-bold text-[10px]"
                >
                  {hour}
                </span>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8]">
            <div className="flex items-center gap-1.5 font-bold text-[#5C1A2B] mb-1">
              <Terminal className="w-3.5 h-3.5 text-[#2F3A1E]" />
              <span>GitHub Actions</span>
            </div>
            <p className="text-[10px] text-[#6E564B]">فعال با حافظه ضدتکرار و جستجوی زنده</p>
          </div>
        </div>

        <div className="relative z-10 p-3 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8] flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#5C1A2B]">
              {dryRun ? 'فقط شبیه‌سازی (Dry Run)' : 'اجرای کامل + ارسال به تلگرام'}
            </p>
            <p className="text-[10px] text-[#6E564B] mt-0.5">
              {dryRun
                ? 'ایده در سرور ساخته و ثبت می‌شود ولی پیامی به تلگرام نمی‌رود.'
                : 'خروجی تولید و مستقیم به بات تلگرام ارسال می‌شود.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={!dryRun}
            onClick={() => setDryRun((prev) => !prev)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              !dryRun ? 'bg-[#C2553A] justify-start' : 'bg-[#D6C4B2] justify-end'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#FBF5EC]" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleRunTest}
          disabled={isRunning}
          className="relative z-10 w-full h-11 rounded-full bg-[#5C1A2B] text-[#F6EBDD] font-extrabold text-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>در حال اجرای خط لوله روزانه…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>اجرای آزمایشی ({dryRun ? 'Dry Run' : 'تلگرام'})</span>
            </>
          )}
        </button>
      </div>

      <div className="paper-surface relative overflow-hidden rounded-[22px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#2F3A1E]" strokeWidth={1.75} />
            <h3 className="text-xs font-extrabold text-[#5C1A2B]">لاگ‌های اجرای سرور</h3>
            <span className="text-[10px] text-[#6E564B]">({toPersianDigits(logs.length)})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoadingLogs}
              title="بروزرسانی لاگ‌ها"
              className={`p-1.5 rounded-full hover:bg-[#EBC3BC]/50 ${
                isLoadingLogs ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5C1A2B]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setIsLogsExpanded((prev) => !prev)}
              className="p-1.5 rounded-full hover:bg-[#EBC3BC]/50 text-[#5C1A2B]"
            >
              {isLogsExpanded ? (
                <ChevronUp className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <ChevronDown className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {isLogsExpanded && (
          <div className="space-y-2 max-h-[240px] overflow-y-auto prompt-scroll pt-1">
            {logs.length === 0 ? (
              <p className="text-[11px] text-center py-4 text-[#6E564B]">
                هنوز لاگی ثبت نشده است.
              </p>
            ) : (
              logs.map((log) => {
                const dateStr = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---';

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-[14px] bg-[#F6EBDD] border border-[#DECBB8] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2F3A1E] shrink-0" />
                        ) : log.status === 'dry_run' ? (
                          <Activity className="w-3.5 h-3.5 text-[#E3A92F] shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[#C2553A] shrink-0" />
                        )}
                        <span className="font-extrabold text-[11px] text-[#5C1A2B] truncate">
                          {log.ideaTitle || 'اجرای روزانه'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6E564B] shrink-0">{dateStr}</span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[#5A443A]">{log.message}</p>

                    <div className="flex items-center gap-3 text-[10px] text-[#6E564B]">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-[#5C1A2B]" />
                        <span>{toPersianDigits(log.imagesCount)} عکس</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3 text-[#C2553A]" />
                        <span>{log.telegramSent ? 'تلگرام: ارسال شد' : 'تلگرام: خیر'}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
