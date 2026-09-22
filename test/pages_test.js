/* 所有页面加载烟雾测试：无脚本错误、关键元素存在 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(c, msg) { c ? pass++ : (fail++, console.log('  FAIL ' + msg)); }

const PAGES = [
  { file: 'index.html', scripts: ['js/core.js', 'js/app.js', 'js/frequency.js', 'js/caesar.js', 'js/substitution.js', 'js/vigenere.js', 'js/rail.js', 'js/enigma.js', 'js/xor.js', 'js/rsa.js'], check: '#act-rsa' },
  { file: 'articles.html', scripts: ['js/core.js', 'js/app.js'], check: '.card-grid .card' },
  { file: 'articles/caesar.html', scripts: ['js/core.js', 'js/app.js'], check: '.fact-box' },
  { file: 'articles/substitution.html', scripts: ['js/core.js', 'js/app.js'], check: '.pull-quote' },
  { file: 'articles/vigenere.html', scripts: ['js/core.js', 'js/app.js'], check: '.pull-quote' },
  { file: 'articles/rail.html', scripts: ['js/core.js', 'js/app.js'], check: '.fact-box' },
  { file: 'articles/enigma.html', scripts: ['js/core.js', 'js/app.js'], check: '.fact-box' },
  { file: 'articles/otp.html', scripts: ['js/core.js', 'js/app.js'], check: '.article-cta' },
  { file: 'articles/rsa.html', scripts: ['js/core.js', 'js/app.js'], check: '.pull-quote' }
];

(async () => {
  for (const p of PAGES) {
    const html = read(p.file).replace(/<script src="[^"]+"><\/script>/g, '');
    const dom = new JSDOM(html, { url: 'http://localhost/' + p.file, runScripts: 'outside-only', pretendToBeVisual: true });
    const { window } = dom;
    window.Element.prototype.scrollIntoView = function () {};
    window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q }));
    const errors = [];
    window.addEventListener('error', e => errors.push(e.message));
    try {
      for (const f of p.scripts) window.eval(read(f));
      window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
      await sleep(150);
    } catch (e) { errors.push(e.message); }
    ok(errors.length === 0, `${p.file} 脚本错误: ${errors.join('; ')}`);
    ok(window.document.querySelector(p.check), `${p.file} 缺少关键元素 ${p.check}`);
    const year = window.document.getElementById('year');
    if (year) ok(/^\d{4}$/.test(year.textContent), `${p.file} 页脚年份未填充`);
    ok(window.document.title.length > 5, `${p.file} title 异常`);
    console.log(`  ✓ ${p.file}`);
    window.close();
  }
  console.log(`\n页面烟雾测试: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
