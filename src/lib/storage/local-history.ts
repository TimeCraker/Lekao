// ============================================
// Lekao · 本地历史记录（IndexedDB）
// ============================================
// 每次 AI 生成完成后自动存入浏览器 IndexedDB
// 用户登录后可在本地查看历史，无需依赖服务器
// ============================================

const DB_NAME = "lekao-history";
const DB_VERSION = 1;
const STORE_NAME = "generations";

export type HistoryRecord = {
  id: string;
  userKey: string;       // 用户唯一标识（email）
  template: "summary" | "feedback";
  subject: string;
  topic: string;
  keyPoints: string[];
  className: string;
  date: string;
  feedback: string;      // 切分后的反馈文本
  summary: string;       // 切分后的小结文本
  rawText: string;       // 完整原始输出
  createdAt: string;     // ISO 字符串
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userKey", "userKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 保存一条生成记录到本地 */
export async function saveGeneration(record: HistoryRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 获取指定用户的历史记录（按创建时间倒序） */
export async function getHistory(userKey: string): Promise<HistoryRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("userKey");
    const records: HistoryRecord[] = [];
    const request = index.openCursor(IDBKeyRange.only(userKey));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        records.push(cursor.value);
        cursor.continue();
      } else {
        records.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        resolve(records);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/** 删除单条记录 */
export async function deleteGeneration(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 清空指定用户的所有本地记录 */
export async function clearHistory(userKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("userKey");
    const request = index.openCursor(IDBKeyRange.only(userKey));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
