/**
 * 图片压缩 + IndexedDB 存储 (T19 + T20)
 * 来源：STAGE spec §3 T19 + T20
 *
 * - browser-image-compression: 上传/粘贴图片自动压到 ≤500KB
 * - idb: IndexedDB Promise 封装，存图片 Blob
 * - LocalStorage: 存轻量数据（题号 + 文字 + 学生选择）
 */

import imageCompression from "browser-image-compression";
import { openDB, type IDBPDatabase } from "idb";
import type { ImageRecord, QNumberSlot } from "./types";

// ============== 图片压缩（T19）==============

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // 500KB
  maxWidthOrHeight: 1920, // 长边限制 1920px
  useWebWorker: true,
  fileType: "image/jpeg" as const, // 输出 JPEG（压缩率高于 PNG）
  initialQuality: 0.85,
};

/**
 * 压缩图片到 ≤500KB
 *
 * 支持格式：PNG / JPG / JPEG / WebP
 * 输出：JPEG Blob
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  // 已经是 ≤500KB 且是 JPEG：跳过压缩
  if (file.size <= 500 * 1024 && file.type === "image/jpeg") {
    return file;
  }

  const compressed = await imageCompression(file as File, COMPRESSION_OPTIONS);
  return compressed;
}

/**
 * 把 File / Blob 转成 DataURL（用于 HTML 预览）
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ============== IndexedDB 存储（T20）==============

const DB_NAME = "lekao-mistake-images";
const DB_VERSION = 1;
const STORE_NAME = "images";

interface MistakeImagesSchema {
  images: {
    key: string;
    value: ImageRecord;
    indexes: { "by-qType-qNumber": [string, string] };
  };
}

let dbPromise: Promise<IDBPDatabase<MistakeImagesSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<MistakeImagesSchema>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB 不可用（请使用现代浏览器）");
  }
  if (!dbPromise) {
    dbPromise = openDB<MistakeImagesSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("by-qType-qNumber", ["qType", "qNumber"]);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 生成图片唯一 ID
 */
export function genImageId(qType: string, qNumber: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${qType}:${qNumber}:${ts}:${rand}`;
}

/**
 * 存储图片到 IndexedDB
 */
export async function saveImage(record: ImageRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

/**
 * 读取图片
 */
export async function loadImage(id: string): Promise<ImageRecord | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * 删除图片
 */
export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * 清空所有错题集图片（清理按钮）
 */
export async function clearAllImages(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * 把 Blob 加载成 ObjectURL（用于显示）
 * 调用方负责在卸载时 revokeObjectURL
 */
export function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

// ============== LocalStorage 草稿（T20 轻数据）==============

const DRAFT_KEY_PREFIX = "lekao-mistake-draft:";

export interface MistakeDraftData {
  sheetName: string;
  date: string;
  slots: Record<string, QNumberSlot>; // key = `${qType}:${qNumber}`
  studentSelection: string[];
  savedAt: number;
}

/**
 * 保存草稿到 LocalStorage
 * 只存轻量数据（题号 + 文字 + 学生选择），图片走 IndexedDB
 */
export function saveDraft(collectionId: string, data: Omit<MistakeDraftData, "savedAt">): void {
  if (typeof localStorage === "undefined") return;
  const key = `${DRAFT_KEY_PREFIX}${collectionId}`;
  const full: MistakeDraftData = { ...data, savedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(full));
  } catch (e) {
    console.warn("[Lekao] 草稿保存失败", e);
  }
}

/**
 * 读取草稿
 */
export function loadDraft(collectionId: string): MistakeDraftData | null {
  if (typeof localStorage === "undefined") return null;
  const key = `${DRAFT_KEY_PREFIX}${collectionId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MistakeDraftData;
  } catch {
    return null;
  }
}

/**
 * 删除草稿
 */
export function clearDraft(collectionId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${DRAFT_KEY_PREFIX}${collectionId}`);
}

/**
 * 槽位 key 工具
 */
export function slotKey(qType: "classroom" | "homework", qNumber: string): string {
  return `${qType}:${qNumber}`;
}