/**
 * S04 T-401 · docx → 浏览器内真实渲染
 *
 * 两层：
 * 1. `summarizeDocx()`：用 jszip 直接读产物字节，抽取段落数/图片数/分页数/正文字数。
 *    这是「渲染失败时的非空白降级文案」与「预览 = 导出件」断言的依据，纯逻辑、可单测。
 * 2. `renderDocxInto()`：动态 import `docx-preview`（Apache-2.0）把真实字节渲染成 DOM。
 *    动态导入保证重依赖不进公开页与工作台首屏（NFR-010）。
 */

export interface DocxSummary {
  paragraphs: number;
  /**
   * 去重后的媒体文件数（word/media/*）。
   * 注意：`docx` 库按内容哈希去重，字节相同的图片只落一份，
   * 因此判断「文档里放了几张图」要用 imageRefs，而不是这个值。
   */
  images: number;
  /** 文档里的图片放置次数（a:blip 引用数）—— parity 断言用这个口径 */
  imageRefs: number;
  pageBreaks: number;
  /** 估算页数：显式分页符 + 1 */
  pages: number;
  textChars: number;
  /** 正文首个非空段落（用于降级文案，最多 40 字） */
  firstLine: string;
}

type DocxInput = Blob | ArrayBuffer | Uint8Array;

function toUint8(input: DocxInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return Promise.resolve(input);
  if (input instanceof ArrayBuffer)
    return Promise.resolve(new Uint8Array(input));
  return input.arrayBuffer().then((b) => new Uint8Array(b));
}

/** 读 zip 里的 word/document.xml，抽取 <w:t> 文本 */
function extractText(xml: string): string {
  const matches = xml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
  return matches
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join("")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * 读产物字节生成摘要（不依赖 DOM，可在 Node/vitest 里跑）
 */
export async function summarizeDocx(input: DocxInput): Promise<DocxSummary> {
  const JSZip = (await import("jszip")).default;

  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(await toUint8(input));
  } catch {
    // jszip 对非 zip 字节抛出的是 "Can't find end of central directory" 之类，
    // 这里统一成稳定错误，UI 才能给出可理解、可重试的降级提示
    throw new Error("不是合法的 docx：文件损坏或格式不符");
  }

  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("不是合法的 docx：缺少 word/document.xml");
  }
  const xml = await documentFile.async("string");

  const paragraphs = (xml.match(/<w:p(?:\s[^>]*)?>/g) ?? []).length;
  const pageBreaks = (xml.match(/<w:br[^>]*w:type="page"[^>]*\/>/g) ?? [])
    .length;
  const images = Object.keys(zip.files).filter(
    (name) => name.startsWith("word/media/") && !name.endsWith("/"),
  ).length;
  const imageRefs = (xml.match(/<a:blip[\s>]/g) ?? []).length;
  const text = extractText(xml);
  const firstLine = text.split(/\s{2,}|\n/)[0]?.slice(0, 40) ?? "";

  return {
    paragraphs,
    images,
    imageRefs,
    pageBreaks,
    pages: pageBreaks + 1,
    textChars: text.length,
    firstLine,
  };
}

/** 降级文案：渲染不可用时也要给出可判断的信息，而不是空白 */
export function describeDocxSummary(
  summary: DocxSummary,
  fileName?: string,
): string {
  const head = fileName ? `${fileName}：` : "";
  return `${head}${summary.pages} 页 · ${summary.paragraphs} 段落 · ${summary.imageRefs} 张图片 · 正文 ${summary.textChars} 字`;
}

export interface RenderDocxOptions {
  /** 预览容器 */
  container: HTMLElement;
  /** 样式容器（docx-preview 会把页面样式注入这里） */
  styleContainer?: HTMLElement;
  /** 是否按分页渲染（打印视图需要 true） */
  breakPages?: boolean;
}

/**
 * 把 docx 字节渲染到容器（动态加载 docx-preview）
 *
 * 失败时抛错，由 UI 层显示 summarizeDocx 的降级摘要 + 重试按钮（不空白）。
 */
export async function renderDocxInto(
  input: DocxInput,
  options: RenderDocxOptions,
): Promise<void> {
  const { renderAsync } = await import("docx-preview");
  const blob = input instanceof Blob ? input : new Blob([input as BlobPart]);
  await renderAsync(blob, options.container, options.styleContainer, {
    className: "docx-preview",
    inWrapper: true,
    breakPages: options.breakPages ?? true,
    ignoreWidth: false,
    ignoreHeight: false,
    renderHeaders: true,
    renderFooters: true,
    useBase64URL: true,
  });
}
