# 密码剧场 · Cipher Theater 🔐

> 破译过程可视化：把一段密文丢进来，频率分析的柱状谱亮起、凯撒罗盘旋转穷举、26 张替换映射卡逐张翻转归位、维吉尼亚密钥逐位崩塌、栅栏字母之字穿行、恩尼格玛转子飞转锁定、XOR 比特流滚动解体、RSA 当面被分解——最后解出明文时，整屏霓虹闪烁一下。

**线上预览：** 🔗 [https://x-lsh.github.io/cipher-theater/](https://x-lsh.github.io/cipher-theater/) · **仓库：** [github.com/X-LSH/cipher-theater](https://github.com/X-LSH/cipher-theater)

## ✨ 八幕剧场

| 幕次 | 内容 | 可视化 |
|------|------|--------|
| 第 I 幕 · 频率分析 | 26 字母占比 vs 英语标准谱 | 柱状谱依次点亮，标注 Top3 与卡方契合度 |
| 第 II 幕 · 凯撒密码 | 罗盘旋转穷举 25 种偏移 | 指针逐格旋转，候选明文逐行打分，最高分胜出 |
| 第 III 幕 · 单表替换 | 频次排名 + bigram 爬山破解全排列 | 26 张映射卡按明文顺序逐张翻转归位 |
| 第 IV 幕 · 维吉尼亚 | 卡斯基检验 + 重合指数测密钥长度 | 密钥字母像老虎机一样逐位旋转归位 |
| 第 V 幕 · 栅栏密码 | 2~8 栏穷举（转置密码，频率分析无效） | 教科书式之字形铺栏，字母沿路径逐个点亮 |
| 第 VI 幕 · 恩尼格玛 | 真实 I/II/III 转子接线 + 双步进，穷举 26³ 起手位置 | 三只转子窗如老虎机飞转，计数器爬到 17,576 |
| 第 VII 幕 · XOR 流密码 | 三行比特流滚动 + 已知明文攻击 | 明文/密钥/密文逐比特点亮，3 步还原重复密钥 |
| 第 VIII 幕 · RSA | 公钥加密、模幂分步、试除分解反推私钥 | 私钥卡从模糊到被夺走，φ 与 d 现场推算 |

导航：右上角**「节目单」**下拉收录全部八幕（罗马数字 + 一句话简介），屏幕右缘还有**幕次导轨**随滚动高亮。

解出明文的瞬间，整屏会来一次霓虹闪烁 ⚡

## 📚 冷知识文章

配套七篇中文科普短文（`/articles/`），每篇都带有「回剧场试试」深链按钮，可携带样例密文直接跳转到对应破译台：

- [为什么凯撒密码偏偏是 +3？](articles/caesar.html)
- [26 个字母全洗牌，为什么还是被数了出来](articles/substitution.html)
- [毁于一首藏头诗的「不可破译密码」](articles/vigenere.html)
- [一个字母都懒得改的密码](articles/rail.html)
- [恩尼格玛：让波兰在沦陷前就破译了它](articles/enigma.html)
- [唯一被数学证明「绝对安全」的加密](articles/otp.html)
- [把锁和钥匙分家的三个人](articles/rsa.html)

## 🛠 技术

- **零依赖、零构建**：原生 HTML + CSS + JavaScript，直接静态托管
- 所有破译均在浏览器本地完成，密文不会离开用户设备
- 密码学实现在 [`js/core.js`](js/core.js)：凯撒、单表替换（频次 + bigram + 常见词爬山）、维吉尼亚、栅栏、恩尼格玛（真实转子接线与双步进）、XOR、RSA、卡方评分、重合指数（IC）、卡斯基检验、已知明文攻击
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
node test/selftest.js        # 密码学算法自测（30 项）
node test/static_check.js    # ID/路径一致性（203 项）
node test/dom_test.js        # jsdom 模拟八幕完整交互（70 项）
node test/pages_test.js      # 全部页面烟雾测试（36 项）
node test/link_check.js      # 站内链接与节目单完整性（177 项）
node test/serve.js 4173      # 本地预览服务器
```

合计 516 项检查全部通过。

## 📦 部署（GitHub Pages）

仓库内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：
推送到 `main` 分支 → 自动构建并发布到 GitHub Pages。

手动启用一次即可：仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

## 📁 结构

```
cipher-theater/
├── index.html          # 八幕剧场主页（含节目单导航 + 右缘幕次导轨）
├── articles.html       # 冷知识文章列表
├── articles/           # 四篇科普文章
├── css/style.css       # 赛博朋克霓虹主题
├── js/
│   ├── core.js         # 密码学核心（纯函数）
│   ├── app.js          # 全局 UI（霓虹闪烁/打字机/矩阵背景/节目单/深链）
│   ├── frequency.js    # 第 I 幕
│   ├── caesar.js       # 第 II 幕
│   ├── substitution.js # 第 III 幕
│   ├── vigenere.js     # 第 IV 幕
│   ├── rail.js         # 第 V 幕
│   ├── enigma.js       # 第 VI 幕
│   ├── xor.js          # 第 VII 幕
│   └── rsa.js          # 第 VIII 幕
└── .github/workflows/deploy.yml
```

## ⚖️ 免责声明

本站仅用于密码学教学与娱乐。请勿用它保护真正的秘密——
毕竟，凯撒密码的全部密钥只有 25 个。
