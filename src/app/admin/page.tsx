import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ProfileIcon,
  DocumentIcon,
  DownloadIcon,
  AdminIcon,
} from "@/components/icons";

const ADMIN_FEATURES = [
  {
    Icon: ProfileIcon,
    title: "用户管理",
    description: "查看所有用户、调整 T-Coin 余额、封禁违规账号",
    status: "规划中",
  },
  {
    Icon: DocumentIcon,
    title: "API 监控",
    description: "查看 DeepSeek 调用量、Token 消耗、错误率",
    status: "规划中",
  },
  {
    Icon: DownloadIcon,
    title: "模板管理",
    description: "上传 / 修改错题集 Excel 模板",
    status: "规划中",
  },
  {
    Icon: AdminIcon,
    title: "系统设置",
    description: "SMTP / JWT / 数据库配置",
    status: "规划中",
  },
];

export default async function AdminPage() {
  const session = await auth();

  // 双重保护：middleware 已经挡过非 admin，这里 server 再 check 一次
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas-alt p-8 md:p-12">
      <div className="max-w-5xl">
        <div className="mb-2 text-sm text-ink-subtle">管理员后台</div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          系统管理
        </h1>
        <p className="text-ink-muted mt-2">
          以 admin 身份登录 ·{" "}
          <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">
            {session?.user?.email}
          </span>
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {ADMIN_FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-hairline rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center">
                  <f.Icon className="w-6 h-6 text-accent-text" />
                </div>
                <span className="text-xs px-2 py-1 bg-canvas-alt text-ink-subtle rounded-full">
                  {f.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white border border-hairline rounded-xl p-6">
          <h3 className="text-base font-semibold text-ink mb-3">数据库信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-ink-subtle">数据库</div>
              <div className="font-mono text-ink mt-1">PostgreSQL</div>
            </div>
            <div>
              <div className="text-ink-subtle">共享</div>
              <div className="font-mono text-ink mt-1">ResumeAIX users (只读)</div>
            </div>
            <div>
              <div className="text-ink-subtle">模型</div>
              <div className="font-mono text-ink mt-1">DeepSeek (SiliconFlow)</div>
            </div>
            <div>
              <div className="text-ink-subtle">部署</div>
              <div className="font-mono text-ink mt-1">lekao.asterforge.top</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}