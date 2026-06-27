# Android APP 下载目录

**正式 release APK 放在这里**，通过 `https://lekao.asterforge.top/downloads/<文件名>` 公开下载。

## 当前 V1.0.0

| 文件 | 大小 | SHA256 | 签名验证 |
|------|------|--------|---------|
| `lekao-android-V1.0.0.apk` | 70 MB | `8c1f336b5ebe31d07dfbde89f28a0c45af39a0dedfb0d40ca2a9571b069dd096` | ✅ APK Signature v2 · `CN=Lekao V1.0.0 Demo` |

**apksigner verify 输出**:
```
Verified using v2 scheme (APK Signature Scheme v2): true
Signer #1 certificate DN: CN=Lekao V1.0.0 Demo, OU=Android, O=Lekao, L=Beijing, ST=Beijing, C=CN
Signer #1 certificate SHA-256: 5d150cee2eb561e15f040959706b02bb7964c45b54a7355ea2c1573b53f0b905
Signer #1 key algorithm: RSA 2048
```

## 安装步骤

1. 手机设置 → 安全 → 允许安装未知来源应用
2. 浏览器打开 `https://lekao.asterforge.top/`
3. 点击首页 **"下载 Android APP · V1.0.0"** 按钮
4. 下载完成后点 APK 文件安装
5. 第一次启动 → 同意权限 → 注册/登录 → 开始用

## ⚠️ 商业化前必做

当前 keystore 是 **demo 用途**（密码 `lekao2024`，自签证书）。

商业化（个体工商户下来）前必须：
1. 用 Android Studio → Generate Signed App Bundle 重新生成正式 keystore
2. 改 `app/build.gradle.kts` 的 signingConfigs release 块
3. 重新出 APK → 强制重装（包名相同但签名不同 → 系统会要求卸载旧版）

## 文件不入 .gitignore（故意）

APK 70MB 不到，提交到 web 端 git 仓库，三端同步时跟随 web 部署一起上线，
用户访问 `lekao.asterforge.top` 立即能下载，无需额外 CDN。