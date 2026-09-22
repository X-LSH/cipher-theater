/* 站内链接与文章头部一致性检查：
   1) 所有 HTML 里的站内 href 指向的文件必须存在
   2) 七篇文章 + 列表页的节目单必须含 Ⅰ~Ⅷ 罗马数字与 ☰/✦ 图标
   3) 不允许残留手写实体 &#921x;（历史 bug） */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, msg) { c ? pass++ : (fail++, console.log('  FAIL ' + msg)); }

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === '.git' ? [] : walk(p);
    return p.endsWith('.html') ? [p] : [];
  });
}

const files = walk(ROOT);
const romans = ['\u2160', '\u2161', '\u2162', '\u2163', '\u2164', '\u2165', '\u2166', '\u2167'];
const articlePages = ['articles.html', 'caesar', 'substitution', 'vigenere', 'rail', 'enigma', 'otp', 'rsa']
  .map(n => (n === 'articles.html' ? 'articles.html' : path.join('articles', n + '.html')));

/* 1) 链接存在性 */
let linkCount = 0;
for (const abs of files) {
  const rel = path.relative(ROOT, abs);
  const t = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);
  for (const m of t.matchAll(/href="([^"]+\.html)([#?][^"]*)?"/g)) {
    const target = path.normalize(path.join(dir, m[1]));
    linkCount++;
    ok(fs.existsSync(target), `${rel} -> ${m[1]} 目标不存在`);
  }
}
console.log(`  ✓ ${files.length} 个页面, ${linkCount} 条站内链接`);

/* 2) 节目单完整性 */
for (const rel of articlePages) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { ok(false, `${rel} 缺失`); continue; }
  const t = fs.readFileSync(abs, 'utf8');
  ok(romans.every(r => t.includes(r)), `${rel} 节目单缺少罗马数字 Ⅰ~Ⅷ`);
  ok(t.includes('\u2630') && t.includes('\u2726'), `${rel} 缺少 ☰/✦ 图标`);
  ok(t.includes('七篇三分钟短文'), `${rel} 专栏小字未更新为七篇`);
}

/* 3) 无残留错误实体 */
for (const abs of files) {
  const rel = path.relative(ROOT, abs);
  ok(!fs.readFileSync(abs, 'utf8').includes('&#921'), `${rel} 残留错误实体 &#921x;`);
}

console.log(`\n链接检查: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
