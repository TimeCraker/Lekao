"use client";

/**
 * PRD §3.5.1 Hero 背景: 5 色块流体 mesh gradient (slate-100 + blue-100/200 + indigo-100 + cyan-100)
 * ⭐ Avant-garde Hard Rules: scoped 嵌入容器 (不整屏 fixed inset-0)
 * ⭐ 装饰循环动效 = 1 个/页 (本组件是唯一循环)
 */
export function MeshGradientBg() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* 5 色块慢呼吸, 每个不同步 → 流体感 */}
      <div
        className="absolute -top-20 -left-20 w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-3xl"
        style={{ animation: "mesh-breath 9s ease-in-out infinite" }}
      />
      <div
        className="absolute top-[20%] -right-32 w-[700px] h-[700px] rounded-full bg-indigo-100/50 blur-3xl"
        style={{ animation: "mesh-breath 11s ease-in-out infinite 2s" }}
      />
      <div
        className="absolute bottom-0 left-[20%] w-[650px] h-[650px] rounded-full bg-cyan-100/40 blur-3xl"
        style={{ animation: "mesh-breath 13s ease-in-out infinite 4s" }}
      />
      <div
        className="absolute top-[40%] left-[40%] w-[500px] h-[500px] rounded-full bg-slate-100/60 blur-3xl"
        style={{ animation: "mesh-breath 10s ease-in-out infinite 1s" }}
      />
      <div
        className="absolute -bottom-32 right-[10%] w-[550px] h-[550px] rounded-full bg-blue-100/50 blur-3xl"
        style={{ animation: "mesh-breath 12s ease-in-out infinite 3s" }}
      />
      <style>{`
        @keyframes mesh-breath {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
          33% { transform: translate(30px, -20px) scale(1.08); opacity: 0.85; }
          66% { transform: translate(-20px, 20px) scale(0.96); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}