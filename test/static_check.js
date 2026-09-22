/* 静态一致性检查：
   1) JS 中 $('#id') 引用的元素必须存在于对应 HTML
   2) HTML 中的 href/src 内部路径必须指向真实文件
   3) data-* 绑定存在性 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const problems = [];
function ok(c, msg) { c ? pass++ : (fail++, problems.push(msg)); }

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const index = read('index.html');
const js = ['core.js', 'app.js', 'frequency.js', 'caesar.js', 'vigenere.js', 'xor.js']
  .map(f => read('js/' + f)).join('\n');

// 1) JS 里引用的 ID
const idRefs = [...js.matchAll(/\$\('#([\w-]+)'\)/g)].map(m => m[1]);
const getElRefs = [...js.matchAll(/getElementById\('([\w-]+)'\)/g)].map(m => m[1]);
const allIds = [...new Set([...idRefs, ...getElRefs])];
for (const id of allIds) {
  // 深链 note/verdict 是动态创建的，允许不存在
  const dynamic = ['vigVerdict'];
  if (dynamic.includes(id)) continue;
  ok(index.includes(`id="${id}"`), `JS 引用 #${id} 但 index.html 中不存在`);
}

// 2) HTML 内部链接/资源
const htmlFiles = ['index.html', 'articles.html',
  'articles/caesar.html', 'articles/vigenere.html', 'articles/enigma.html', 'articles/otp.html'];
for (const f of htmlFiles) {
  const html = read(f);
  const base = path.dirname(f);
  const refs = [...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)]
    .map(m => m[1])
    .filter(u => !/^(https?:|mailto:|data:|javascript:)/.test(u));
  for (const r of refs) {
    const target = path.normalize(path.join(base, r));
    ok(fs.existsSync(path.join(ROOT, target)), `${f} → ${r} 文件不存在`);
  }
  // 基本结构
  ok(html.includes('<!DOCTYPE html>'), `${f} 缺少 DOCTYPE`);
  ok((html.match(/<html/g) || []).length === 1, `${f} html 标签异常`);
}

// 3) JS 引用的 CSS 类与 HTML class 抽查（关键交互类）
const criticalClasses = ['freq-chart', 'caesar-row', 'ic-bar', 'key-slot', 'bit-cell',
  'neon-flash', 'reveal-panel', 'attack-panel', 'is-visible', 'is-active'];
const css = read('css/style.css');
for (const c of criticalClasses) {
  ok(css.includes('.' + c), `CSS 缺少 .${c}`);
}

// 4) 样例深链 note 参数（文章回链）存在
const caesarArt = read('articles/caesar.html');
ok(caesarArt.includes('act=caesar'), 'caesar 文章缺少深链');
ok(caesarArt.includes(encodeURIComponent('WIGVIXW EVI LMHHIR MR TPEMR WMKLX').replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())),
  'caesar 文章深链密文与算法不一致');

console.log(`静态检查: ${pass} 通过, ${fail} 失败`);
if (problems.length) { problems.forEach(p => console.log('  FAIL', p)); process.exit(1); }
