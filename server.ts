import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import cron, { ScheduledTask } from 'node-cron';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  GeneratedIdea,
  HistoryItem,
  IdeaType,
  SourceLink,
  UsedIdeaEntry,
  AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_PAGE_PROFILE,
  DEFAULT_CONTENT_ANGLES,
  DEFAULT_FONT_PAIRS,
  DEFAULT_TEXT_LAYOUTS,
  DEFAULT_CARD_STYLES,
  DEFAULT_GEMINI_MODEL,
  SYSTEM_INSTRUCTION,
} from './src/types';
import {
  parseRawIdeaJson,
  toPersianDigits,
  buildUserContentPrompt,
  resolveActiveGeminiModel,
  createUsedIdeaEntry,
  getTodayDates,
} from './src/utils/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const DAILY_RUN_SECRET = process.env.DAILY_RUN_SECRET || 'mado_daily_secure_token_2026';

const configPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: {
  projectId?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  [key: string]: unknown;
} = {};

if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
}

const serverFirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
const serverDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(serverFirebaseApp);

const FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
  'gemini-3.8-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('کلید GEMINI_API_KEY در تنظیمات محیطی سرور یافت نشد.');
  }
  return new GoogleGenAI({ apiKey });
}

async function getServerSettings(): Promise<AdvancedSettings> {
  try {
    const docRef = doc(serverDb, 'settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_ADVANCED_SETTINGS,
        ...data,
        geminiModel: data.geminiModel || DEFAULT_GEMINI_MODEL,
        enableGoogleSearch:
          typeof data.enableGoogleSearch === 'boolean' ? data.enableGoogleSearch : true,
        contentAngles: data.contentAngles || DEFAULT_CONTENT_ANGLES,
        fontPairs: data.fontPairs || DEFAULT_FONT_PAIRS,
        textLayouts: data.textLayouts || DEFAULT_TEXT_LAYOUTS,
        cardStyles: data.cardStyles || DEFAULT_CARD_STYLES,
      };
    }
  } catch (err) {
    console.warn('Could not read settings from Firestore:', err);
  }
  return { ...DEFAULT_ADVANCED_SETTINGS };
}

async function getServerRecentIdeas(limitCount = 15): Promise<HistoryItem[]> {
  try {
    const q = query(collection(serverDb, 'ideas'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const items: HistoryItem[] = [];
    snap.forEach((d) => items.push(d.data() as HistoryItem));
    return items;
  } catch (err) {
    console.warn('Could not read recent ideas:', err);
    return [];
  }
}

async function getServerUsedIdeas(limitCount = 50): Promise<UsedIdeaEntry[]> {
  try {
    const q = query(
      collection(serverDb, 'used_ideas'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const entries: UsedIdeaEntry[] = [];
    snap.forEach((d) => entries.push(d.data() as UsedIdeaEntry));
    return entries;
  } catch (err) {
    console.warn('Could not read used_ideas:', err);
    return [];
  }
}

async function logExecutionToFirestore(log: {
  id: string;
  status: 'success' | 'error' | 'dry_run';
  isDryRun: boolean;
  ideaTitle: string;
  imagesCount: number;
  telegramSent: boolean;
  message: string;
  details?: string;
}) {
  try {
    const docRef = doc(serverDb, 'execution_logs', log.id);
    await setDoc(docRef, {
      ...log,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log execution:', err);
  }
}

async function generateSlideImageWithImagen3(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const storyPrompt = `${prompt}. Matte editorial finger food catering platter, warm natural daylight, 9:16 vertical instagram story`;

  for (const model of ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image']) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: storyPrompt }] },
        config: { imageConfig: { aspectRatio: '9:16' } },
      });
      for (const part of res.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          return {
            buffer: Buffer.from(part.inlineData.data, 'base64'),
            mimeType: part.inlineData.mimeType || 'image/jpeg',
          };
        }
      }
    } catch (err: unknown) {
      console.warn(`Image model ${model} notice:`, err instanceof Error ? err.message : err);
    }
  }

  for (const model of ['imagen-3.0-generate-002', 'imagen-3.0-generate-001']) {
    try {
      const response = await ai.models.generateImages({
        model,
        prompt: storyPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '9:16',
          outputMimeType: 'image/jpeg',
        },
      });
      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (imageBytes) {
        return {
          buffer: Buffer.from(imageBytes, 'base64'),
          mimeType: 'image/jpeg',
        };
      }
    } catch (err: unknown) {
      console.warn(`Imagen ${model} warning:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

async function sendPhotoToTelegram(
  botToken: string,
  chatId: string,
  imageBuffer: Buffer,
  mimeType: string,
  caption: string,
  filename = 'slide.jpg'
): Promise<void> {
  if (!botToken || !chatId) {
    throw new Error('متغیرهای TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID در سرور تنظیم نشده‌اند.');
  }
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), filename);
  if (caption) {
    formData.append('caption', caption.slice(0, 1024));
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطای تلگرام در ارسال عکس (${response.status}): ${errorText}`);
  }
}

async function sendMessageToTelegram(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  if (!botToken || !chatId) {
    throw new Error('متغیرهای TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID در سرور تنظیم نشده‌اند.');
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطای تلگرام در ارسال پیام متنی (${response.status}): ${errorText}`);
  }
}

function extractGroundingData(response: GenerateContentResponse): {
  sources: SourceLink[];
  searchQueries: string[];
  searchGrounded: boolean;
} {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks;
  const webSearchQueries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.filter((q): q is string => typeof q === 'string')
    : [];

  const seen = new Set<string>();
  const sources: SourceLink[] = [];

  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      const chunkTitle = chunk?.web?.title;
      if (uri && typeof uri === 'string' && !seen.has(uri)) {
        seen.add(uri);
        sources.push({
          uri,
          title:
            chunkTitle && typeof chunkTitle === 'string'
              ? chunkTitle
              : uri.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
        });
      }
      if (sources.length >= 5) break;
    }
  }

  return {
    sources,
    searchQueries: webSearchQueries,
    searchGrounded: sources.length > 0 || webSearchQueries.length > 0,
  };
}

async function callGeminiWithGrounding(options: {
  ai: GoogleGenAI;
  userPrompt: string;
  systemInstruction: string;
  preferredModel?: string;
  enableGoogleSearch?: boolean;
  photoBase64?: string;
  photoMimeType?: string;
  temperature?: number;
}): Promise<{ response: GenerateContentResponse; usedModel: string; searchEnabled: boolean }> {
  const parts: Part[] = [];

  if (options.photoBase64 && options.photoBase64.length > 50) {
    parts.push({
      inlineData: {
        data: options.photoBase64,
        mimeType: options.photoMimeType || 'image/jpeg',
      },
    });
  }
  parts.push({ text: options.userPrompt });

  const requested = (options.preferredModel || DEFAULT_GEMINI_MODEL).trim();
  const modelQueue = [requested, ...FALLBACK_MODELS.filter((m) => m !== requested)];
  const useSearch = options.enableGoogleSearch !== false;

  let lastError: unknown = null;

  for (const modelName of modelQueue) {
    try {
      const response = await options.ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.9,
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
      return { response, usedModel: modelName, searchEnabled: useSearch };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] ${modelName} notice:`, msg);
      lastError = err;

      if (useSearch && /tool|search|grounding/i.test(msg)) {
        try {
          const responseNoSearch = await options.ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature ?? 0.9,
            },
          });
          return { response: responseNoSearch, usedModel: modelName, searchEnabled: false };
        } catch (innerErr) {
          lastError = innerErr;
        }
      }
    }
  }

  throw lastError || new Error('خطا در دریافت پاسخ از مدل‌های جمنای.');
}

async function runDailyAutomationPipeline(options: {
  isDryRun: boolean;
  requestedType?: IdeaType;
  photoBase64?: string;
  photoMimeType?: string;
}) {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ai = getGeminiClient();

  const [settings, recentHistory, usedIdeas] = await Promise.all([
    getServerSettings(),
    getServerRecentIdeas(15),
    getServerUsedIdeas(50),
  ]);

  const activeModel = resolveActiveGeminiModel(settings);
  const promptType: IdeaType = options.requestedType || 'story';
  const promptText = buildUserContentPrompt({
    type: promptType,
    count: settings.count || 5,
    settings,
    pageProfile: DEFAULT_PAGE_PROFILE,
    history: recentHistory,
    usedIdeas,
    hasUploadedPhoto: Boolean(options.photoBase64),
  });

  const { response, usedModel, searchEnabled } = await callGeminiWithGrounding({
    ai,
    userPrompt: promptText,
    systemInstruction: SYSTEM_INSTRUCTION,
    preferredModel: activeModel,
    enableGoogleSearch: settings.enableGoogleSearch,
    photoBase64: options.photoBase64,
    photoMimeType: options.photoMimeType,
  });

  const rawText = response.text || '';
  const grounding = extractGroundingData(response);
  const idea = parseRawIdeaJson(rawText, promptType);
  idea.used_model = usedModel;
  idea.search_grounded = grounding.searchGrounded || searchEnabled;
  idea.search_queries = grounding.searchQueries;

  let imagesCount = 0;
  let telegramSent = false;

  if (!options.isDryRun && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    for (let i = 0; i < idea.items.length; i++) {
      const item = idea.items[i];
      const slideLabel = item.label || `استوری ${toPersianDigits(i + 1)}`;
      const captionLines = [
        `📌 ${idea.title || 'ایده محتوای روزانه مادو'}`,
        `📍 ${slideLabel} (${toPersianDigits(i + 1)} از ${toPersianDigits(idea.items.length)})`,
        item.headline ? `▪ ${item.headline}` : '',
        item.body_text ? `▪ ${item.body_text}` : '',
        idea.selected_angle ? `🎯 زاویه: ${idea.selected_angle}` : '',
      ].filter(Boolean);

      const caption = captionLines.join('\n').slice(0, 1024);
      const promptToUse = item.prompt || `${item.headline}. ${item.photo_needed}`;

      let generatedImage: { buffer: Buffer; mimeType: string } | null = null;
      try {
        generatedImage = await generateSlideImageWithImagen3(ai, promptToUse);
      } catch (e) {
        console.warn('Slide image generation warning:', e);
      }

      if (generatedImage) {
        imagesCount++;
        await sendPhotoToTelegram(
          TELEGRAM_BOT_TOKEN,
          TELEGRAM_CHAT_ID,
          generatedImage.buffer,
          generatedImage.mimeType,
          caption,
          `daily_slide_${i + 1}.jpg`
        );
        telegramSent = true;
      } else {
        await sendMessageToTelegram(
          TELEGRAM_BOT_TOKEN,
          TELEGRAM_CHAT_ID,
          `${caption}\n\n📋 پرامپت آماده:\n${promptToUse}`
        );
        telegramSent = true;
      }
    }
  }

  const { jalali, gregorian } = getTodayDates();
  const dailyIdeaId = `mado_daily_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const historyItem: HistoryItem = {
    id: dailyIdeaId,
    createdAt: jalali,
    isoDate: gregorian,
    timestamp: Date.now(),
    count: idea.items.length,
    idea,
    saved: false,
    confirmedUsed: true,
    sources: grounding.sources,
  };

  try {
    await setDoc(doc(serverDb, 'ideas', dailyIdeaId), historyItem);
    const usedEntry = createUsedIdeaEntry({
      id: dailyIdeaId,
      idea,
      createdAt: jalali,
      confirmed: true,
    });
    await setDoc(doc(serverDb, 'used_ideas', dailyIdeaId), usedEntry);
  } catch (err) {
    console.error('Error saving daily idea to Firestore:', err);
  }

  const logStatus = options.isDryRun ? 'dry_run' : 'success';
  const summaryMessage = options.isDryRun
    ? `اجرای آزمایشی (Dry Run) با مدل ${usedModel} انجام شد.`
    : `اجرای روزانه با مدل ${usedModel} انجام شد (${toPersianDigits(idea.items.length)} استوری).`;

  await logExecutionToFirestore({
    id: executionId,
    status: logStatus,
    isDryRun: options.isDryRun,
    ideaTitle: idea.title,
    imagesCount,
    telegramSent,
    message: summaryMessage,
  });

  return {
    ok: true,
    executionId,
    isDryRun: options.isDryRun,
    idea,
    sources: grounding.sources,
    imagesCount,
    telegramSent,
    message: summaryMessage,
  };
}

let activeCronJobs: ScheduledTask[] = [];

function reloadScheduledJobs(settings: AdvancedSettings) {
  activeCronJobs.forEach((job) => job.stop());
  activeCronJobs = [];

  const scheduler = settings.scheduler || {
    enabled: true,
    scheduledHours: [11, 15, 20],
    autoSendTelegram: true,
  };

  if (!scheduler.enabled || !scheduler.scheduledHours?.length) return;

  for (const hour of scheduler.scheduledHours) {
    try {
      const task = cron.schedule(
        `0 ${hour} * * *`,
        async () => {
          try {
            await runDailyAutomationPipeline({
              isDryRun: !scheduler.autoSendTelegram,
              requestedType: 'story',
            });
          } catch (err) {
            console.error('[Scheduler] Pipeline error:', err);
          }
        },
        { timezone: 'Asia/Tehran' }
      );
      activeCronJobs.push(task);
    } catch (scheduleErr) {
      console.warn('[Scheduler] Schedule error:', scheduleErr);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  app.post('/api/run-daily', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      const apiKeyHeader = (req.headers['x-api-key'] as string) || '';

      if (bearerToken !== DAILY_RUN_SECRET && apiKeyHeader !== DAILY_RUN_SECRET) {
        res.status(401).json({ ok: false, error: 'عدم احراز هویت (Unauthorized).' });
        return;
      }

      const result = await runDailyAutomationPipeline({
        isDryRun: false,
        requestedType: 'story',
      });
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    }
  });

  app.post('/api/run-test', async (req, res) => {
    try {
      const { dryRun, requestedType, photoBase64, photoMimeType } = req.body as {
        dryRun?: boolean;
        requestedType?: IdeaType;
        photoBase64?: string;
        photoMimeType?: string;
      };

      const result = await runDailyAutomationPipeline({
        isDryRun: Boolean(dryRun),
        requestedType: requestedType || 'story',
        photoBase64,
        photoMimeType,
      });
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'خطا در اجرای آزمایشی',
      });
    }
  });

  app.get('/api/logs', async (_req, res) => {
    try {
      const q = query(
        collection(serverDb, 'execution_logs'),
        orderBy('timestamp', 'desc'),
        limit(25)
      );
      const snap = await getDocs(q);
      const logs: unknown[] = [];
      snap.forEach((d) => logs.push(d.data()));
      res.json({ logs });
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در خواندن لاگ‌ها',
      });
    }
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await getServerSettings();
      res.json({ settings });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت تنظیمات',
      });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { settings } = req.body as { settings?: AdvancedSettings };
      if (!settings) {
        res.status(400).json({ error: 'تنظیمات نامعتبر است.' });
        return;
      }
      await setDoc(
        doc(serverDb, 'settings', 'global'),
        { ...settings, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      reloadScheduledJobs(settings);
      res.json({ ok: true, message: 'تنظیمات ذخیره شد.' });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات',
      });
    }
  });

  app.post('/api/generate-idea', async (req, res) => {
    try {
      const {
        userPrompt,
        requestedType,
        uploadedPhotoBase64,
        uploadedPhotoMimeType,
        preferredModel,
        enableGoogleSearch,
      } = req.body as {
        userPrompt?: string;
        requestedType?: IdeaType;
        uploadedPhotoBase64?: string;
        uploadedPhotoMimeType?: string;
        preferredModel?: string;
        enableGoogleSearch?: boolean;
      };

      if (!userPrompt || typeof userPrompt !== 'string') {
        res.status(400).json({ error: 'متن درخواست نامعتبر است.' });
        return;
      }

      const ai = getGeminiClient();
      const fallbackType: IdeaType = requestedType || 'story';

      const { response: firstResponse, usedModel, searchEnabled } = await callGeminiWithGrounding({
        ai,
        userPrompt,
        systemInstruction: SYSTEM_INSTRUCTION,
        preferredModel: preferredModel || DEFAULT_GEMINI_MODEL,
        enableGoogleSearch: enableGoogleSearch !== false,
        photoBase64: uploadedPhotoBase64,
        photoMimeType: uploadedPhotoMimeType,
      });

      const firstText = firstResponse.text || '';
      const grounding = extractGroundingData(firstResponse);

      try {
        const idea = parseRawIdeaJson(firstText, fallbackType);
        idea.used_model = usedModel;
        idea.search_grounded = grounding.searchGrounded || searchEnabled;
        idea.search_queries = grounding.searchQueries;
        res.json({ idea, sources: grounding.sources, usedModel });
      } catch {
        const retryPrompt = `${userPrompt}\n\nخروجی قبلی:\n${firstText}\n\nفقط یک JSON خالص و معتبر برگردان:`;
        const { response: retryResponse, usedModel: retryModel } = await callGeminiWithGrounding({
          ai,
          userPrompt: retryPrompt,
          systemInstruction: SYSTEM_INSTRUCTION,
          preferredModel: usedModel,
          enableGoogleSearch: false,
          photoBase64: uploadedPhotoBase64,
          photoMimeType: uploadedPhotoMimeType,
          temperature: 0.5,
        });
        const idea = parseRawIdeaJson(retryResponse.text || '', fallbackType);
        idea.used_model = retryModel;
        idea.search_grounded = grounding.searchGrounded || searchEnabled;
        idea.search_queries = grounding.searchQueries;
        res.json({ idea, sources: grounding.sources, usedModel: retryModel });
      }
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : 'خطای ناشناخته در سرور';
      let friendlyMessage = 'متأسفانه در ساخت ایده خطایی رخ داد. لطفاً دوباره امتحان کنید.';

      if (
        rawMessage.includes('API_KEY_INVALID') ||
        rawMessage.includes('PERMISSION_DENIED') ||
        rawMessage.includes('GEMINI_API_KEY')
      ) {
        friendlyMessage = 'کلید GEMINI_API_KEY معتبر نیست یا تنظیم نشده است.';
      } else if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
        friendlyMessage = 'سقف درخواست لحظه‌ای کلید API پر شده است.';
      }

      res.status(500).json({ error: friendlyMessage });
    }
  });

  app.post('/api/generate-motion', async (req, res) => {
    try {
      const { ideaTitle, ideaConcept, slideTexts, durationSec, stylePreset, preferredModel } =
        req.body as {
          ideaTitle?: string;
          ideaConcept?: string;
          slideTexts?: string[];
          durationSec?: number;
          stylePreset?: string;
          preferredModel?: string;
        };

      if (!ideaTitle) {
        res.status(400).json({ error: 'عنوان ایده‌ی روز برای ساخت موشن الزامی است.' });
        return;
      }

      const ai = getGeminiClient();
      const duration = Math.min(12, Math.max(5, Number(durationSec) || 8));
      const motionSystemPrompt = `تو طراح موشن‌گرافیک ادیتوریال و برنامه‌نویس HTML5 Canvas برای پیج فینگرفود مادو تبریز (mado.fingerfood.tabriz) هستی.
فقط یک سند HTML کامل و مستقل با <canvas id="madoCanvas" width="1080" height="1920"></canvas> و تابع سراسری window.renderMadoFrame(timeMs, durationMs) برگردان.
پالت کاملاً مات و کاغذی مادو: پس‌زمینه #F6EBDD و #EBC3BC، متن #5C1A2B و #3B2A22، تگ خردلی #E3A92F و آجری #C2553A و زیتونی #2F3A1E.
در پایین محیط پیش‌نمایش دکمه‌ی «پخش مجدد» و دکمه‌ی «رندر و دانلود MP4» قرار بده که کلیک روی MP4 پیام window.parent.postMessage({ type: 'MADO_EXPORT_MP4', durationMs: ${duration * 1000} }, '*') ارسال کند.`;

      const userPrompt = [
        `موضوع امروز: ${ideaTitle}`,
        `خلاصه: ${ideaConcept || ''}`,
        `متن استوری‌ها:\n${(slideTexts || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        `سبک: ${stylePreset || 'قوس مجله‌ای'}`,
        `مدت: ${duration} ثانیه.`,
      ].join('\n\n');

      const { response, usedModel } = await callGeminiWithGrounding({
        ai,
        userPrompt,
        systemInstruction: motionSystemPrompt,
        preferredModel: preferredModel || DEFAULT_GEMINI_MODEL,
        enableGoogleSearch: false,
        temperature: 0.7,
      });

      const raw = (response.text || '')
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      if (!raw.includes('<canvas')) {
        res.status(502).json({ error: 'کد تولیدشده شامل بوم Canvas معتبر نبود.' });
        return;
      }

      res.json({ ok: true, htmlCode: raw, usedModel, durationSec: duration });
    } catch (err: unknown) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در تولید کد موشن‌گرافیک',
      });
    }
  });

  app.post('/api/send-to-telegram', async (req, res) => {
    try {
      const { idea } = req.body as { idea?: GeneratedIdea };
      if (!idea || !Array.isArray(idea.items) || idea.items.length === 0) {
        res.status(400).json({ error: 'اطلاعات ایده برای ارسال ناقص است.' });
        return;
      }

      const ai = getGeminiClient();
      let sentCount = 0;
      let imagesGeneratedCount = 0;

      for (let i = 0; i < idea.items.length; i++) {
        const item = idea.items[i];
        const slideLabel = item.label || `استوری ${toPersianDigits(i + 1)}`;
        const caption = [
          `📌 ${idea.title || 'ایده محتوای مادو'}`,
          `📍 ${slideLabel} (${toPersianDigits(i + 1)} از ${toPersianDigits(idea.items.length)})`,
          item.headline ? `▪ ${item.headline}` : '',
          item.body_text ? `▪ ${item.body_text}` : '',
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 1024);

        const promptToUse = item.prompt || `${item.headline}. ${item.photo_needed}`;
        const generatedImage = await generateSlideImageWithImagen3(ai, promptToUse).catch(
          () => null
        );

        if (generatedImage) {
          imagesGeneratedCount++;
          await sendPhotoToTelegram(
            TELEGRAM_BOT_TOKEN,
            TELEGRAM_CHAT_ID,
            generatedImage.buffer,
            generatedImage.mimeType,
            caption,
            `slide_${i + 1}.jpg`
          );
          sentCount++;
        } else {
          await sendMessageToTelegram(
            TELEGRAM_BOT_TOKEN,
            TELEGRAM_CHAT_ID,
            `${caption}\n\n📋 پرامپت آماده:\n${promptToUse}`
          );
          sentCount++;
        }
      }

      res.json({
        ok: true,
        sentCount,
        imagesGeneratedCount,
        message: `ارسال به تلگرام با موفقیت انجام شد ✓`,
      });
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در ارسال به تلگرام',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`madoGenerator server running on http://0.0.0.0:${PORT}`);
    try {
      const initialSettings = await getServerSettings();
      reloadScheduledJobs(initialSettings);
    } catch (schedErr) {
      console.warn('Scheduler init warning:', schedErr);
    }
  });
}

startServer();
