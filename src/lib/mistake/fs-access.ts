/**
 * File System Access API 封装 (T21)
 * 来源：STAGE spec §1.1
 *
 * - Chrome/Edge 原生 showDirectoryPicker()
 * - IndexedDB 存 FileSystemDirectoryHandle（浏览器自动续期权限）
 * - Safari/Firefox 降级提示（请使用 Chrome/Edge）
 */

const HANDLE_DB_NAME = "lekao-fs-handles";
const HANDLE_STORE = "directory-handles";
const HANDLE_KEY = "default";

interface HandleSchema {
  "directory-handles": {
    key: string;
    value: {
      name: string;
      handle: FileSystemDirectoryHandle;
      createdAt: number;
    };
  };
}

let handleDbPromise: Promise<import("idb").IDBPDatabase<HandleSchema>> | null = null;

function getHandleDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB 不可用");
  }
  if (!handleDbPromise) {
    handleDbPromise = import("idb").then(({ openDB }) =>
      openDB<HandleSchema>(HANDLE_DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(HANDLE_STORE)) {
            db.createObjectStore(HANDLE_STORE);
          }
        },
      }),
    );
  }
  return handleDbPromise;
}

/**
 * 检查浏览器是否支持 File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === "function"
  );
}

/**
 * 请求用户授权一个文件夹（showDirectoryPicker）
 */
export async function requestDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      "当前浏览器不支持本地文件夹授权。请使用 Chrome / Edge 浏览器。",
    );
  }

  const handle = await (
    window as unknown as {
      showDirectoryPicker: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker({ mode: "readwrite" });

  // 保存到 IndexedDB（浏览器会自动续期权限）
  const db = await getHandleDB();
  await db.put(
    HANDLE_STORE,
    { name: handle.name, handle, createdAt: Date.now() },
    HANDLE_KEY,
  );

  return handle;
}

/**
 * 读取之前保存的目录句柄
 */
export async function loadSavedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const db = await getHandleDB();
    const entry = await db.get(HANDLE_STORE, HANDLE_KEY);
    if (!entry) return null;

    // 验证权限（如果过期会 throw）
    const handle = entry.handle;
    if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
      // 权限过期，尝试重新请求
      if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") {
        return null;
      }
    }

    return handle;
  } catch {
    return null;
  }
}

/**
 * 清除保存的目录句柄
 */
export async function clearSavedDirectory(): Promise<void> {
  const db = await getHandleDB();
  await db.delete(HANDLE_STORE, HANDLE_KEY);
}

/**
 * 规范化目录/文件名（让 FS Access API 接受）
 *
 * WHATWG FS spec 规定 getDirectoryHandle/getFileHandle 的 name 必须是"valid file name"：
 * - 非空字符串
 * - 不等于 "." 或 ".."
 * - 不含 "/" 或 "\\"（Windows 还多）
 * - 不含底层文件系统的保留字符（Windows: < > : " / \ | ? * + 控制字符）
 * - 不以空格或点结尾（Windows）
 *
 * 修导出失败 bug（Round 2026-06-20）：
 *   Chrome 在某些情况下对含隐藏字符（前后空格/零宽字符）或用户改名的非法字符串抛
 *   "Name is not allowed"，但不给具体哪个名字。统一 sanitize 后明确告知。
 *
 * 策略：把非法字符替换为 "_"，去首尾空格/点，截断到 100 字（NTFS 路径上限 255）。
 */
export function sanitizeFsName(name: string): string {
  // 1. 去首尾空白
  let safe = (name ?? "").trim();

  // 2. 空名兜底
  if (!safe) {
    throw new Error("目录名不能为空");
  }

  // 3. "." 或 ".." 兜底
  if (safe === "." || safe === "..") {
    safe = "_" + safe;
  }

  // 4. 替换所有非法字符（含控制字符 \x00-\x1f）
  //    Windows 保留字符: < > : " / \ | ? *
  //    NUL 控制字符: \x00-\x1f
  //    零宽字符: ​-‏,
  safe = safe.replace(/[<>:"/\\|?*\x00-\x1f​-‏﻿]/g, "_");

  // 5. 去末尾空格 / 点（Windows 不允许）
  safe = safe.replace(/[\s.]+$/, "");

  // 6. 截断（NTFS 路径段最大 255，留余量）
  if (safe.length > 100) {
    safe = safe.slice(0, 100);
  }

  // 7. 再次兜底（极端情况全是非法字符 → 替换后变成空串）
  if (!safe) {
    safe = "_unnamed";
  }

  return safe;
}

/**
 * 在目录句柄下获取/创建子目录（按学科分）
 *
 * 自动 sanitize 目录名，避免 Chrome FS Access API 抛 "Name is not allowed"。
 * 抛出错误时附带原始 + sanitize 后名字，便于排查。
 */
export async function getOrCreateSubdir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  const safeName = sanitizeFsName(name);
  try {
    return await parent.getDirectoryHandle(safeName, { create: true });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `创建子目录失败：${reason}\n（原始名 = ${JSON.stringify(name)}，规范后 = ${JSON.stringify(safeName)}）`,
    );
  }
}

/**
 * 检查目录下是否已存在某个文件
 */
export async function checkFileExists(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<FileSystemFileHandle | null> {
  const safeName = sanitizeFsName(filename);
  try {
    return await dir.getFileHandle(safeName);
  } catch {
    return null;
  }
}

/**
 * 写入新文件到目录（覆盖）
 */
export async function writeFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: Blob | ArrayBuffer | Uint8Array | string,
): Promise<void> {
  const safeName = sanitizeFsName(filename);
  const fileHandle = await dir.getFileHandle(safeName, { create: true });
  const writable = await (fileHandle as unknown as {
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }).createWritable();
  // 规范化 Uint8Array → Blob（避免 ArrayBufferLike vs ArrayBuffer 类型不兼容）
  const chunk =
    data instanceof Uint8Array
      ? new Blob([data as Uint8Array<ArrayBuffer>])
      : data;
  await writable.write(chunk as FileSystemWriteChunkType);
  await writable.close();
}

/**
 * 读取已有文件
 */
export async function readFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<File | null> {
  const safeName = sanitizeFsName(filename);
  try {
    const fileHandle = await dir.getFileHandle(safeName);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}