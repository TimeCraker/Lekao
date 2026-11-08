# Android APP 下载说明

正式 release APK **走 GitHub Releases**，不放进 web 仓库（避免 72MB 二进制拖慢 clone）。

## 当前 V1.0.0

| 项       | 值                                                                                    |
| -------- | ------------------------------------------------------------------------------------- |
| 下载链接 | https://github.com/TimeCraker/Lekao/releases/download/v1.0.0/lekao-android-V1.0.0.apk |
| 大小     | 69 MiB                                                                                |
| SHA256   | `d81f60fc0c3fcb7459462708fb38f88c3c9686d6f4320e74b22fcdef2ad21379`                    |
| 签名     | ✅ APK Signature v2 · `CN=Lekao V1.0.0 Demo` · T90/T91/T92 NPE 全量修复版             |

**apksigner verify 输出**:

```
Verified using v2 scheme (APK Signature Scheme v2): true
Signer #1 certificate DN: CN=Lekao V1.0.0 Demo, OU=Android, O=Lekao, L=Beijing, ST=Beijing, C=CN
Signer #1 certificate SHA-256: 5d150cee2eb561e15f040959706b02bb7964c45b54a7355ea2c1573b53f0b905
Signer #1 key algorithm: RSA 2048
```

## 安装步骤

1. 手机设置 → 安全 → 允许安装未知来源应用
2. 浏览器打开上表 GitHub Release 链接（或 `https://github.com/TimeCraker/Lekao/releases`）下载 APK
3. 下载完成后点 APK 文件安装
4. 第一次启动 → 同意权限 → 注册/登录 → 开始用

> 注：首页 hero 的「Android APP」下载入口已于 2026-10 web-only 决策后移除（见 `docs/ai-delivery/handoffs/S02-platform-foundation.md`），APK 改为直接走 GitHub Releases 分发。

## ⚠️ 商业化前必做

当前 keystore 是 **demo 用途**（密码 `lekao2024`，自签证书）。

商业化（个体工商户下来）前必须：

1. 用 Android Studio → Generate Signed App Bundle 重新生成正式 keystore
2. 改 `app/build.gradle.kts` 的 signingConfigs release 块
3. 重新出 APK → 上传新 GitHub Release → 强制重装（包名相同但签名不同 → 系统会要求卸载旧版）

## 为什么不放在 web 仓库

APK 70MB 进 git 会让 clone 变慢、每次新版都让仓库膨胀。改走 GitHub Releases：

- ~~`src/components/landing/hero.tsx` 的下载按钮直接指向 release URL~~（入口已随 web-only 决策移除，见上文注）
- APK 本地构建后用 `gh release create v<x.y.z>` 上传，不进 git
- `*.apk` 已在 `.gitignore`
