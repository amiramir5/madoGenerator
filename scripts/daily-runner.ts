import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel, Part, GenerateContentResponse } from '@google/genai';
import {
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_PAGE_PROFILE,
  SYSTEM_INSTRUCTION,
  GeneratedIdea,
  IdeaType,
} from '../src/types';
import {
  buildUserContentPrompt,
  parseRawIdeaJson,
  pickRandomCreativeSeeds,
  toPersianDigits,
} from '../src/utils/helpers';

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '9154283445:AAGiIEMTCdCh9xIxpVvVCpysqd0Ft7NWRV8';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7796169507';
const APP_URL = process.env.APP_URL || 'https://ais-dev-6ynnighizjcg5u6wn3qykb-352880577729.europe-west2.run.app';
const DAILY_RUN_SECRET = process.env.DAILY_RUN_SECRET || 'mado_daily_secure_token_2026';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

async function sendPhotoToTelegram(
  buffer: Buffer,
  mimeType: string,
  caption: string,
  filename = 'story.jpg'
): Promise<void> {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  if (caption) {
    formData.append('caption', caption.slice(0, 1024));
  }

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Telegram error (${res.status}): ${errorText}`);
  }
}

async function sendMessageToTelegram(text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text.slice(0, 4000),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Telegram text error (${res.status}): ${errorText}`);
  }
}

async function generateStoryImage(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // 1. Try gemini-nano-banana-2.1
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [
          {
            text: `${prompt}. Luxury finger food catering platter, gourmet presentation, professional lighting, 9:16 vertical instagram story`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '9:16',
          imageSize: '1K',
        },
      },
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
    console.log('[Image] nano-banana-2.1 notice:', err instanceof Error ? err.message : err);
  }

  // 2. Try gemini-3.1-flash-lite-image
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `${prompt}. Professional catering photography, 9:16 vertical story format`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '9:16',
        },
      },
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
    console.log('[Image] flash-lite-image notice:', err instanceof Error ? err.message : err);
  }

  // 3. Fallback: Fetch a high-quality vertical 9:16 food photo from curated catering imagery
  try {
    const curatedUrls = [
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=1080&h=1920&fit=crop&q=85',
      'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=1080&h=1920&fit=crop&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&h=1920&fit=crop&q=85',
      'https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=1080&h=1920&fit=crop&q=85',
    ];
    const randomUrl = curatedUrls[Math.floor(Math.random() * curatedUrls.length)];
    const imgFetch = await fetch(randomUrl);
    if (imgFetch.ok) {
      const arr = await imgFetch.arrayBuffer();
      return {
        buffer: Buffer.from(arr),
        mimeType: 'image/jpeg',
      };
    }
  } catch (e) {
    console.log('[Image] Fallback download warning:', e);
  }

  return null;
}

async function runDirectPipeline() {
  console.log('--- Starting Mado Daily Scheduled Generation ---');
  const ai = getAiClient();
  const settings = DEFAULT_ADVANCED_SETTINGS;
  const recentHistory: any[] = [];

  const seeds = pickRandomCreativeSeeds(settings, recentHistory);
  const promptText = buildUserContentPrompt({
    type: 'story',
    count: 1,
    settings,
    pageProfile: DEFAULT_PAGE_PROFILE,
    history: recentHistory,
    hasUploadedPhoto: false,
  });

  console.log('Calling Gemini with gemini-3.8-flash & fallback gemini-2.5-flash...');
  let rawText = '';

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    rawText = res.text || '';
  } catch (err: unknown) {
    console.warn('gemini-3.8-flash fallback triggered:', err instanceof Error ? err.message : err);
    const res2 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    rawText = res2.text || '';
  }

  const idea: GeneratedIdea = parseRawIdeaJson(rawText, 'story');
  console.log(`Generated Idea: "${idea.title}" (${idea.items.length} slides)`);

  for (let i = 0; i < idea.items.length; i++) {
    const item = idea.items[i];
    const slideLabel = item.label || `اسلاید ${toPersianDigits(i + 1)}`;
    const captionLines = [
      `🟣 ${idea.title || 'ایده محتوای روزانه مادو'}`,
      `📍 ${slideLabel} (${toPersianDigits(i + 1)} از ${toPersianDigits(idea.items.length)})`,
      item.headline ? `🔹 ${item.headline}` : '',
      item.body_text ? `🔸 ${item.body_text}` : '',
      idea.selected_angle ? `🎯 زاویه: ${idea.selected_angle}` : '',
      item.photo_needed ? `📷 سوژه: ${item.photo_needed}` : '',
      idea.design?.fonts?.title
        ? `🔤 فونت: تیتر «${idea.design.fonts.title}» | متن «${idea.design.fonts.body}»`
        : '',
    ].filter(Boolean);

    const caption = captionLines.join('\n').slice(0, 1024);
    const promptToUse =
      item.prompt ||
      `${item.headline}. ${item.photo_needed}. Professional catering food photography, 9:16 vertical`;

    console.log(`Generating image for slide ${i + 1}...`);
    const img = await generateStoryImage(ai, promptToUse);

    if (img) {
      console.log(`Sending slide ${i + 1} with photo to Telegram...`);
      await sendPhotoToTelegram(img.buffer, img.mimeType, caption, `slide_${i + 1}.jpg`);
    } else {
      console.log(`Sending slide ${i + 1} with prompt text to Telegram...`);
      const fallbackMsg = `${caption}\n\n📋 پرامپت آماده:\n${promptToUse}`;
      await sendMessageToTelegram(fallbackMsg);
    }
  }

  console.log('✅ Daily run completed and sent to Telegram successfully.');
}

async function main() {
  // First attempt: Call the applet API endpoint if reachable
  console.log(`Pinging APP_URL: ${APP_URL}/api/run-daily ...`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${APP_URL}/api/run-daily`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_RUN_SECRET}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ AI Studio endpoint responded successfully:', data.message || data);
      return;
    } else {
      console.warn(`Applet endpoint returned status ${res.status}. Falling back to direct script execution...`);
    }
  } catch (err) {
    console.warn('Applet endpoint unreachable or timed out. Falling back to direct script execution...');
  }

  // Fallback: Run directly
  await runDirectPipeline();
}

main().catch((err) => {
  console.error('Fatal error in daily runner:', err);
  process.exit(1);
});
