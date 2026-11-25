import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import {
  HistoryItem,
  UsedIdeaEntry,
  AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_CONTENT_ANGLES,
  DEFAULT_FONT_PAIRS,
  DEFAULT_TEXT_LAYOUTS,
  DEFAULT_CARD_STYLES,
  DEFAULT_GEMINI_MODEL,
} from '../types';

export interface ExecutionLog {
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

const SETTINGS_DOC_ID = 'global';

export async function fetchSettingsFromFirestore(): Promise<AdvancedSettings> {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
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
    console.warn('Could not fetch settings from Firestore:', err);
  }
  return { ...DEFAULT_ADVANCED_SETTINGS };
}

export async function saveSettingsToFirestore(settings: AdvancedSettings): Promise<void> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function fetchHistoryFromFirestore(maxItems = 30): Promise<HistoryItem[]> {
  try {
    const q = query(collection(db, 'ideas'), orderBy('timestamp', 'desc'), limit(maxItems));
    const snap = await getDocs(q);
    const items: HistoryItem[] = [];
    snap.forEach((d) => items.push(d.data() as HistoryItem));
    return items;
  } catch (err) {
    console.warn('Could not fetch history from Firestore:', err);
    return [];
  }
}

export async function saveIdeaToFirestore(item: HistoryItem): Promise<void> {
  const docRef = doc(db, 'ideas', item.id);
  const sanitized: HistoryItem = {
    ...item,
    uploadedPhotoPreview:
      item.uploadedPhotoPreview && item.uploadedPhotoPreview.length < 180_000
        ? item.uploadedPhotoPreview
        : undefined,
  };
  await setDoc(docRef, sanitized);
}

export async function deleteIdeaFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'ideas', id);
  await deleteDoc(docRef);
}

export async function fetchUsedIdeasFromFirestore(maxItems = 60): Promise<UsedIdeaEntry[]> {
  try {
    const q = query(collection(db, 'used_ideas'), orderBy('timestamp', 'desc'), limit(maxItems));
    const snap = await getDocs(q);
    const entries: UsedIdeaEntry[] = [];
    snap.forEach((d) => entries.push(d.data() as UsedIdeaEntry));
    return entries;
  } catch (err) {
    console.warn('Could not fetch used_ideas from Firestore:', err);
    return [];
  }
}

export async function saveUsedIdeaToFirestore(entry: UsedIdeaEntry): Promise<void> {
  try {
    const docRef = doc(db, 'used_ideas', entry.id);
    await setDoc(docRef, entry, { merge: true });
  } catch (err) {
    console.warn('Could not save used_idea:', err);
  }
}

export async function deleteUsedIdeaFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'used_ideas', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete used_idea:', err);
  }
}

export async function fetchExecutionLogsFromFirestore(maxLogs = 20): Promise<ExecutionLog[]> {
  try {
    const q = query(
      collection(db, 'execution_logs'),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    const snap = await getDocs(q);
    const logs: ExecutionLog[] = [];
    snap.forEach((d) => logs.push(d.data() as ExecutionLog));
    return logs;
  } catch (err) {
    console.warn('Could not fetch execution logs:', err);
    return [];
  }
}
