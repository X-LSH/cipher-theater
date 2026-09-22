# 密码剧场 · Cipher Theater 🔐

> 破译过程可视化：把一段密文丢进来，看频率分析的柱状谱亮起、凯撒/维吉尼亚密钥逐位"旋转"破解、异或加密的比特流滚动。最后解出明文时，整屏霓虹闪烁一下。

**线上预览：** *部署后自动生效（GitHub Pages）*

## ✨ 四幕剧场

| 幕次 | 内容 | 可视化 |
|------|------|--------|
| 第 I 幕 · 频率分析 | 26 字母占比 vs 英语标准谱 | 柱状谱依次点亮，标注 Top3 与卡方契合度 |
| 第 II 幕 · 凯撒密码 | 罗盘旋转穷举 25 种偏移 | 指针逐格旋转，候选明文逐行打分，最高分胜出 |
| 第 III 幕 · 维吉尼亚 | 卡斯基检验 + 重合指数测密钥长度 | 密钥字母像老虎机一样逐位旋转归位 |
| 第 IV 幕 · XOR 流密码 | 三行比特流滚动 + 已知明文攻击 | 明文/密钥/密文逐比特点亮，3 步还原重复密钥 |

解出明文的瞬间，整屏会来一次霓虹闪烁 ⚡

## 📚 冷知识文章

配套四篇中文科普短文（`/articles/`），每篇都带有「回剧场试试」深链按钮，可携带样例密文直接跳转到对应破译台：

- [为什么凯撒密码偏偏是 +3？](articles/caesar.html)
- [毁于一首藏头诗的「不可破译密码」](articles/vigenere.html)
- [恩尼格玛：让波兰在沦陷前就破译了它](articles/enigma.html)
- [唯一被数学证明「绝对安全」的加密](articles/otp.html)

## 🛠 技术

- **零依赖、零构建**：原生 HTML + CSS + JavaScript，直接静态托管
- 所有破译均在浏览器本地完成，密文不会离开用户设备
- 密码学实现在 [`js/core.js`](js/core.js)：凯撒、维吉尼亚、XOR、卡方评分、重合指数（IC）、卡斯基检验、已知明文攻击
- 尊重 `prefers-reduced-motion`，矩阵背景与闪烁动画可自动降级

## 🚀 本地运行

无需任何构建步骤，任选其一：

```bash
# 方式一：直接双击 index.html

# 方式二：本地静态服务器
npx serve .
# 或
python -m http.server 8000
```

## 🧪 测试

```bash
npm i --no-save jsdom        # 仅测试依赖，不进仓库
node test/selftest.js        # 密码学算法自测（15 项）
node test/static_check.js    # ID/路径一致性（162 项）
node test/dom_test.js        # jsdom 模拟四幕完整交互（32 项）
node test/pages_test.js      # 全部页面烟雾测试（24 项）
node test/serve.js 4173      # 本地预览服务器
```

## 📦 部署（GitHub Pages）

仓库内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：
推送到 `main` 分支 → 自动构建并发布到 GitHub Pages。

手动启用一次即可：仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

## 📁 结构

```
cipher-theater/
├── index.html          # 四幕剧场主页
├── articles.html       # 冷知识文章列表
├── articles/           # 四篇科普文章
├── css/style.css       # 赛博朋克霓虹主题
├── js/
│   ├── core.js         # 密码学核心（纯函数）
│   ├── app.js          # 全局 UI（霓虹闪烁/打字机/矩阵背景/深链）
│   ├── frequency.js    # 第 I 幕
│   ├── caesar.js       # 第 II 幕
│   ├── vigenere.js     # 第 III 幕
│   └── xor.js          # 第 IV 幕
└── .github/workflows/deploy.yml
```

## ⚖️ 免责声明

本站仅用于密码学教学与娱乐。请勿用它保护真正的秘密——
毕竟，凯撒密码的全部密钥只有 25 个。
