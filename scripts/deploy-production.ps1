# Lekao 腾讯云一键部署 (:3007)
# - 本地 git bundle → SCP → 服务器 clone (绕过跨境 GitHub 抽风)
# - pnpm install + prisma generate + next build (Linux)
# - systemd lekao-web.service 守护
#
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-production.ps1
#
# 前置: 服务器已有 Node 20 (/usr/local/node20/bin/) + pnpm + PostgreSQL 5434

param(
  [string]$LekaoRoot = "",
  [string]$SshHost = "ubuntu@111.229.200.178",
  [string]$SshKey = "C:\Users\TimeCraker\Desktop\my_workspace\asterforge-deploy\ssh-keys\tencent_server_key.pem",
  [string]$RemoteRoot = "/home/ubuntu/Lekao",
  [string]$PublicUrl = "https://lekao.asterforge.top",
  [int]$Port = 3007
)

$ErrorActionPreference = "Stop"

if (-not $LekaoRoot) {
  $LekaoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

if (-not (Test-Path $SshKey)) {
  throw "SSH 密钥不存在: $SshKey"
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

# ─── [1/7] 本地打包 git bundle ───
Write-Host "`n==> [1/7] 本地 git bundle ..." -ForegroundColor Cyan
$bundle = Join-Path $env:TEMP "lekao-deploy.bundle"
if (Test-Path $bundle) { Remove-Item $bundle -Force }
git -C $LekaoRoot bundle create $bundle main
if ($LASTEXITCODE -ne 0) { throw "git bundle failed" }

# ─── [2/7] 上传 bundle ───
Write-Host "`n==> [2/7] 上传 bundle ..." -ForegroundColor Cyan
Invoke-ScpFrom @($bundle) "/tmp/lekao-deploy.bundle"

# ─── [3/7] 服务器 fetch bundle + reset ───
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

# ─── [4/7] 写服务器 .env (替换 NEXTAUTH_URL 为公网) ───
Write-Host "`n==> [4/7] 写服务器 .env ..." -ForegroundColor Cyan
$envSrc = Join-Path $LekaoRoot ".env"
if (-not (Test-Path $envSrc)) {
  throw ".env 不存在: $envSrc (本地开发配置)"
}
# ⭐ 中文注释行合并到 KEY=VALUE 行时 Set-Content -Encoding UTF8 会乱码
# 解法：去掉所有 # 注释行 + 空行，精简 .env 为纯 KEY=VALUE + 必要注释
$envContent = Get-Content $envSrc | Where-Object { $_ -match '^[A-Z_]+\=' } | ForEach-Object { $_ -replace '^NEXTAUTH_URL=.+', "NEXTAUTH_URL=`"$PublicUrl`"" }
if (-not $envContent) {
  throw ".env 中没有找到任何 KEY=VALUE 行"
}
# Out-File -Encoding UTF8NoBOM (PS 6+) 或 Set-Content (-Encoding UTF8 在 PS 5.1 会用 BOM)
# 用原始 byte 写入避免编码问题
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$envRemote = Join-Path $env:TEMP "lekao.env"
[System.IO.File]::WriteAllLines($envRemote, $envContent, $utf8NoBom)
Invoke-ScpFrom @($envRemote) "$RemoteRoot/.env"
Invoke-Ssh "chmod 600 $RemoteRoot/.env && grep -c 'API_KEY' $RemoteRoot/.env && echo '---' && grep -c '^#' $RemoteRoot/.env && echo '---zero comment lines OK'"

# ─── [5/8] pnpm install ───
Write-Host "`n==> [5/8] 服务器 pnpm install ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm install --frozen-lockfile 2>&1 | tail -10"

# ─── [6/8] prisma migrate deploy ───
Write-Host "`n==> [6/8] prisma migrate deploy ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm exec prisma migrate deploy 2>&1 | tail -10"

# ─── [7/8] prisma generate ───
Write-Host "`n==> [7/8] prisma generate ..." -ForegroundColor Cyan
Invoke-Ssh "cd $RemoteRoot && $RemoteEnv && pnpm exec prisma generate 2>&1 | tail -5"

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