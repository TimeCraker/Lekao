# Lekao 生产环境一键部署脚本
# - 本地 git bundle → SCP → 服务器部署
# - pnpm install + prisma generate + next build (Linux)
# - systemd lekao-web.service 守护
#
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-production.ps1 -SshHost "user@your-server-ip" -SshKey "path/to/key.pem"
#
# 前置: 服务器已有 Node 20 + pnpm + PostgreSQL

param(
  [string]$LekaoRoot = "",
  [string]$SshHost = $env:LEKAO_SSH_HOST,
  [string]$SshKey = $env:LEKAO_SSH_KEY,
  [string]$RemoteRoot = "/home/ubuntu/lekao",
  [string]$PublicUrl = "https://lekao.example.com",
  [int]$Port = 3007
)

$ErrorActionPreference = "Stop"

if (-not $SshHost) {
  throw "请提供 -SshHost 参数或设置 LEKAO_SSH_HOST 环境变量 (例如: user@your-server-ip)"
}

if (-not $SshKey -or -not (Test-Path $SshKey)) {
  throw "请提供有效的 -SshKey 参数或设置 LEKAO_SSH_KEY 环境变量"
}

$SshArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new", "-o", "BatchMode=yes")
$ScpArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new")

function Invoke-Ssh([string]$Command) {
  & ssh @SshArgs "${SshHost}" $Command
  if ($LASTEXITCODE -ne 0) { throw "SSH failed: $Command" }
}

function Invoke-ScpFrom([string[]]$Paths, [string]$Dest) {
  & scp @ScpArgs @Paths "${SshHost}:${Dest}"
  if ($LASTEXITCODE -ne 0) { throw "SCP failed -> $Dest" }
}

function Invoke-ScpTo([string[]]$Paths, [string]$Dest) {
  & scp @ScpArgs @Paths "${Dest}"
  if ($LASTEXITCODE -ne 0) { throw "SCP failed -> $Dest" }
}

# 服务器端 PATH 注入 (pnpm 在 /usr/local/node20/bin)
$RemoteEnv = "export PATH=/usr/local/node20/bin:`$PATH"

Write-Host "==> Lekao 部署" -ForegroundColor Cyan
Write-Host "    本地: $LekaoRoot"
Write-Host "    远程: ${SshHost}:$RemoteRoot"
Write-Host "    公网: $PublicUrl (port $Port)"

# ─── [1/8] 本地打包 git bundle ───
Write-Host "`n==> [1/8] 本地 git bundle ..." -ForegroundColor Cyan
$bundle = Join-Path $env:TEMP "lekao-deploy.bundle"
if (Test-Path $bundle) { Remove-Item $bundle -Force }
git -C $LekaoRoot bundle create $bundle main
if ($LASTEXITCODE -ne 0) { throw "git bundle failed" }

# ─── [2/8] 上传 bundle ───
Write-Host "`n==> [2/8] 上传 bundle ..." -ForegroundColor Cyan
Invoke-ScpFrom @($bundle) "/tmp/lekao-deploy.bundle"

# ─── [3/8] 服务器 fetch bundle + reset ───
# 既有目录用 bundle fetch + reset（避免覆盖已有 .git）
# 首次部署需先手动：mkdir + git init + git remote add + git fetch
Write-Host "`n==> [3/7] 服务器 fetch bundle + reset ..." -ForegroundColor Cyan
$RemoteCmd = @"
  if [ ! -d $RemoteRoot/.git ]; then
    echo 'ERROR: '$RemoteRoot' 不是 git 仓库，请手动 git init + 配置' && exit 1
  fi
  cd $RemoteRoot
  git fetch /tmp/lekao-deploy.bundle main:refs/heads/main-new 2>&1
  git reset --hard main-new 2>&1
  git branch -D main-new 2>&1
  rm -f /tmp/lekao-deploy.bundle
  git log --oneline -1
"@
Invoke-Ssh $RemoteCmd

# ─── [4/8] 写服务器 .env (SCP raw 给服务器 sed 替换, 避免 PS 5.1 UTF-8 编码问题) ───
Write-Host "`n==> [4/8] 写服务器 .env ..." -ForegroundColor Cyan
$envSrc = Join-Path $LekaoRoot ".env"
if (-not (Test-Path $envSrc)) {
  throw ".env 不存在: $envSrc (本地开发配置)"
}
# SCP raw .env 到服务器临时文件
$envRemote = Join-Path $env:TEMP "lekao.env.raw"
Copy-Item $envSrc $envRemote -Force
Invoke-ScpFrom @($envRemote) "/tmp/lekao.env.raw"
# 服务器端用 sed 过滤注释行 + 替换 NEXTAUTH_URL (Linux UTF-8 无编码问题)
# 只保留 KEY=VALUE 行, 不保留注释/空行
$PublicUrlEscaped = $PublicUrl -replace '/', '\/'
Invoke-Ssh "sed -n '/^[A-Z_][A-Z_]*=/{s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=$PublicUrlEscaped|;p}' /tmp/lekao.env.raw > $RemoteRoot/.env && chmod 600 $RemoteRoot/.env && rm /tmp/lekao.env.raw && { echo 'API_KEY count:'; grep -c 'API_KEY' $RemoteRoot/.env || true; echo '# count:'; grep -c '^#' $RemoteRoot/.env || true; echo '.env OK'; }"

# ─── [5/8] pnpm install ───
Write-Host "`n==> [5/8] 服务器 pnpm install ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm install --frozen-lockfile 2>&1 | tail -10"

# 防假绿: pnpm 10 在非交互 SSH 下可能静默跳过依赖重装且 exit 0 (2026-09-30 my-portfolio 部署教训),
# 必须断言 node_modules 内实际安装的 next 版本与本地 package.json 一致, 防止用旧 next 构建上线
# ⚠️ 引号层 (2026-10-03 实测): PS→ssh 传参会吃掉内嵌双引号, 远端命令禁止出现任何双引号 —— 用 pnpm list 管道取版本, 只用单引号
$NextExpected = (Get-Content (Join-Path $LekaoRoot "package.json") -Raw | ConvertFrom-Json).dependencies.next
Write-Host "    断言服务器实际 next 版本 = $NextExpected" -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && V=`$(pnpm list next --depth 0 | grep -oE 'next@[0-9.]+' | tail -1 | cut -d '@' -f 2) && echo installed-next=`$V && if [ `$V = $NextExpected ]; then echo VERSION_OK; else echo NEXT_VERSION_MISMATCH expected=$NextExpected got=`$V; exit 31; fi"

# ─── [6/8] prisma migrate deploy ───
Write-Host "`n==> [6/8] prisma migrate deploy ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm exec prisma migrate deploy 2>&1 | tail -10"

# ─── [7/8] prisma generate ───
Write-Host "`n==> [7/8] prisma generate ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm exec prisma generate 2>&1 | tail -5"

# pnpm 布局下 generate 只写 .pnpm 虚拟存储；Turbopack 外置桩 require('.prisma/client/default')
# 需要根级 node_modules/.prisma 可解析（2026-09-29 生产 500 事故根因，缺此步登录/触库 API 全挂）
# find 定位 + 无引号传参（PS→SSH 引号层曾损坏 node -e 嵌套引号与 glob 展开，勿改回嵌套引号写法）
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && TGT=`$(find node_modules/.pnpm -maxdepth 1 -type d -name *prisma+client* | head -1)/node_modules/.prisma && ln -sfn `$TGT node_modules/.prisma && readlink node_modules/.prisma && echo prisma root link OK"

# ─── [8/8] next build + systemd ───
Write-Host "`n==> [8/8] next build (NODE_OPTIONS=2GB) + systemd ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && NODE_OPTIONS=--max-old-space-size=1536 pnpm build 2>&1 | tail -25"

# ─── systemd service ───
Write-Host "`n==> 配置 systemd lekao-web.service ..." -ForegroundColor Cyan
$serviceContent = @"
[Unit]
Description=Lekao Next.js Web (:$Port)
After=network.target docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$RemoteRoot
Environment=PATH=/usr/local/node20/bin:/usr/bin:/usr/local/bin
EnvironmentFile=$RemoteRoot/.env
ExecStart=/usr/local/node20/bin/pnpm start --port $Port
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lekao-web

[Install]
WantedBy=multi-user.target
"@
$serviceLocal = Join-Path $env:TEMP "lekao-web.service"
$serviceContent | Set-Content -Path $serviceLocal -Encoding UTF8
Invoke-ScpFrom @($serviceLocal) "/tmp/lekao-web.service"

Invoke-Ssh "sudo mv /tmp/lekao-web.service /etc/systemd/system/lekao-web.service && sudo systemctl daemon-reload && sudo systemctl enable lekao-web && sudo systemctl restart lekao-web && sleep 4 && sudo systemctl is-active lekao-web && echo SERVICE_OK"

# ─── 验证 ───
Write-Host "`n==> 验证部署 ..." -ForegroundColor Cyan
Invoke-Ssh "curl -sI http://localhost:$Port 2>&1 | head -3 && echo --- && curl -sI $PublicUrl 2>&1 | head -3"

Write-Host "`n✓ 部署完成" -ForegroundColor Green
Write-Host "  本地 commit:  $(git -C $LekaoRoot log --oneline -1 --format='%h %s')"
Write-Host "  服务地址:     $PublicUrl"
Write-Host "  端口:         $Port"
Write-Host "  systemd:      sudo journalctl -u lekao-web -f"