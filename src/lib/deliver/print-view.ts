/**
 * S04 T-405 · 打印 / 另存 PDF
 *
 * 策略：不用打印库，用隐藏 iframe 装载「只含产物」的打印文档再调 window.print()。
 * 这样全局样式不会被打印污染，产物也不会把整页 UI 打进去。
 *
 * - `buildPrintStyles()` / `buildPrintDocument()`：纯函数，可单测
 * - `printElement()`：薄 DOM 壳（浏览器专用，不做单测）
 *
 * 「另存 PDF」不单独实现导出器：所有主流浏览器的打印对话框都带
 * 「另存为 PDF / 存储为 PDF」目的地，UI 上给出一句提示即可（不做矩阵式证书打印）。
 */

/**
 * 打印样式（A4 + 表头跨页 + 行不跨页截断 + 表格边框兜底）
 *
 * 表格边框是给 SheetGridTable 的 iframe 环境兜底的：它的边框原本来自
 * Tailwind 类（iframe 里没有 Tailwind），这里用元素选择器保住视觉。
 */
export function buildPrintStyles(): string {
  return `
@page { size: A4; margin: 14mm; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif; color: #1e293b; }
/* docx-preview 的分页容器按页宽自适应 */
.docx-wrapper { padding: 0; background: none; }
.docx-wrapper > section.docx { box-shadow: none; margin: 0 auto; }
/* 长表格跨页：表头每页重复，行不被拦腰截断 */
thead { display: table-header-group; }
tr, td, th { page-break-inside: avoid; break-inside: avoid; }
table { border-collapse: collapse; }
td, th { border: 1px solid #cbd5e1; padding: 2px 8px; }
img { max-width: 100%; }
`.trim();
}

/** 拼装打印文档（iframe.srcdoc 用） */
export function buildPrintDocument(innerHtml: string, title: string): string {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>${buildPrintStyles()}</style>
</head>
<body>${innerHtml}</body>
</html>`;
}

/**
 * 只打印给定元素（隐藏 iframe + window.print）
 *
 * 返回清理函数；调用方通常不需要 await 打印对话框关闭。
 */
export function printElement(
  element: HTMLElement,
  title: string,
  doc: Document = document,
): void {
  const iframe = doc.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  doc.body.appendChild(iframe);

  iframe.srcdoc = buildPrintDocument(element.innerHTML, title);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // 打印对话框是阻塞式的；对话框关闭后移除 iframe（延时兜底 Safari）
      setTimeout(() => iframe.remove(), 1000);
    }
  };
}
