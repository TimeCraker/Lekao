"use client";

import Link from "next/link";
import { MeshGradientBg } from "./mesh-gradient";
import { HeroTitle } from "./hero-title";

export function Hero() {
  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
      {/* 流体 mesh gradient 背景 (scoped 到容器) */}
      <MeshGradientBg />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 backdrop-blur-sm border border-hairline rounded-full text-sm text-ink-mute mb-8">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          AI 智能助教助手 · 内测中
        </div>

        {/* 巨型 H1 · 字符级 3D */}
        <HeroTitle>每次课省 1-2 小时</HeroTitle>

        {/* Subtitle */}
        <p className="mt-8 text-xl md:text-2xl text-ink-muted max-w-2xl mx-auto leading-relaxed">
          AI 智能助教助手，专为培训机构设计
          <br />
          让助教从抄错题、写小结、写反馈里解放出来
        </p>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-accent-text text-white text-base font-medium rounded-xl hover:bg-accent-hover transition shadow-md hover:shadow-lg"
          >
            免费开始 · 送 5 T-Coin
          </Link>
          <Link
            href="#features"
            className="px-8 py-3.5 bg-white/60 backdrop-blur-sm border border-hairline text-ink text-base font-medium rounded-xl hover:bg-white hover:border-accent/40 transition"
          >
            查看演示
          </Link>
        </div>

        {/* Trust signal */}
        <p className="mt-10 text-sm text-ink-subtle">
          无需信用卡 · 注册即送 5 枚 T-Coin · 永久免费基础功能
        </p>
      </div>
    </section>
  );
}