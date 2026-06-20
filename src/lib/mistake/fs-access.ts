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
 * 在目录句柄下获取/创建子目录（按学科分）
 */
export async function getOrCreateSubdir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

/**
 * 检查目录下是否已存在某个文件
 */
export async function checkFileExists(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await dir.getFileHandle(filename);
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
  const fileHandle = await dir.getFileHandle(filename, { create: true });
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
  try {
    const fileHandle = await dir.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}