/* DOM 集成测试：在 jsdom 中加载 index.html 并模拟四幕完整交互 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const problems = [];
function ok(c, msg) { c ? pass++ : (fail++, problems.push(msg)); console.log((c ? '  PASS ' : '  FAIL ') + msg); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // 去掉 <script src>，手动按序注入（jsdom 默认不加载外部资源）
  const html = read('index.html').replace(/<script src="[^"]+"><\/script>/g, '');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html?act=caesar&text=WIGVIXW%20EVI%20LMHHIR%20MR%20TPEMR%20WMKLX&note=%E6%B5%8B%E8%AF%95%E6%8F%90%E7%A4%BA',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const { document } = window;

  // jsdom 缺失的 API 补齐
  window.Element.prototype.scrollIntoView = function () {};
  window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {} }));
  window.onerror = (m, s, l) => { fail++; problems.push('window.onerror: ' + m + ' @' + l); };

  const errors = [];
  window.addEventListener('error', e => errors.push(e.message || String(e.error)));

  for (const f of ['js/core.js', 'js/app.js', 'js/frequency.js', 'js/caesar.js', 'js/vigenere.js', 'js/xor.js']) {
    try { window.eval(read(f)); } catch (e) { errors.push(f + ': ' + e.message); }
  }
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await sleep(50);
  ok(errors.length === 0, '脚本加载无错误' + (errors.length ? ' → ' + errors.join('; ') : ''));

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---- 第 I 幕 频率分析 ---- */
  console.log('— 第 I 幕 —');
  await sleep(100);
  const bars = $$('#freqChart .freq-bar');
  ok(bars.length === 26, `柱状谱 26 根柱（实际 ${bars.length}）`);
  ok($$('#freqChart .freq-fill.is-on').length === 26, '柱子已点亮动画');
  ok(/^\d+%$/.test($('#freqScore').textContent), '契合度已计算: ' + $('#freqScore').textContent);
  ok($('#freqVerdict').textContent.includes('替换类'), '凯撒样例判定为替换类: ' + $('#freqVerdict').textContent.slice(0, 24));
  // 维吉尼亚样例应落入「多表替换」档
  $('[data-freq-sample="vigenere"]').click();
  await sleep(60);
  ok($('#freqVerdict').textContent.includes('多表替换'), '维吉尼亚样例判定为多表替换: ' + $('#freqScore').textContent);
  // 切换样例
  $('[data-freq-sample="plain"]').click();
  await sleep(50);
  ok($('#freqInput').value.includes('SHAPE'), '样例切换生效');

  /* ---- 第 II 幕 凯撒 ---- */
  console.log('— 第 II 幕 —');
  $('#caesarCrack').click();
  await sleep(300);
  ok($$('#caesarRows .caesar-row').length > 0, '候选行开始出现');
  await sleep(2300);
  ok($$('#caesarRows .caesar-row').length === 26, `26 个候选全部列出（${$$('#caesarRows .caesar-row').length}）`);
  ok($$('#caesarRows .caesar-row.is-winner').length === 1, '胜出行高亮唯一');
  ok($('#caesarResult').classList.contains('is-visible'), '结果面板可见');
  ok($('#caesarStatus').classList.contains('is-done'), '状态=完成');
  await sleep(1200);
  ok($('#caesarPlain').textContent.includes('SECRETS'), '明文打字机输出正确: ' + $('#caesarPlain').textContent.slice(0, 40));
  ok($('#caesarHits').textContent.length > 5, '常见词命中展示');
  // 霓虹闪烁触发
  ok($('#neon-flash') !== null, '霓虹闪烁元素存在');

  /* ---- 第 III 幕 维吉尼亚 ---- */
  console.log('— 第 III 幕 —');
  $('#vigCrack').click();
  await sleep(400);
  ok($$('#vigIC .ic-bar').length === 12, 'IC 图 12 档');
  ok($$('#vigIC .ic-bar.is-best').length === 1, '最优长度高亮');
  ok($('#vigVerdict').textContent.includes('密钥长度'), '判定说明输出: ' + $('#vigVerdict').textContent.slice(0, 60));
  ok($$('#vigKasiski').length === 1, '卡斯基证据存在');
  // 等待 STEP1 停顿 + 6 个字母旋转（每个 1.25s）
  await sleep(10600);
  ok($$('#vigSlots .key-slot.is-solved').length === 6, `6 位密钥归位（${$$('#vigSlots .key-slot.is-solved').length}）`);
  ok($('#vigResult').classList.contains('is-visible'), '维吉尼亚结果面板可见');
  await sleep(1500);
  ok($('#vigKey').textContent.replace(/\s/g, '') === 'CIPHER', '解出密钥: ' + $('#vigKey').textContent);
  ok($('#vigPlain').textContent.includes('CODEBREAKING'), '维吉尼亚明文正确');

  /* ---- 第 IV 幕 XOR ---- */
  console.log('— 第 IV 幕 —');
  $('#xorRun').click();
  await sleep(400);
  ok($$('#xorStream .bit-row').length === 3, '三行比特流');
  ok($$('#xorStream .bit-cell.is-lit').length > 0, '比特正在点亮');
  await sleep(3500);
  const total = $$('#xorStream .bit-cell').length;
  const lit = $$('#xorStream .bit-cell.is-lit').length;
  ok(lit === total, `全部比特点亮（${lit}/${total}）`);
  ok($('#xorHex').textContent.includes('12 11 17 13'), 'HEX 密文正确: ' + $('#xorHex').textContent);
  ok($('#xorAttack').classList.contains('is-visible', true), '攻击面板出现');
  $('#xorAttackBtn').click();
  await sleep(3000);
  ok($$('#xorSteps .attack-step').length === 3, '攻击三步骤展示');
  ok($('#xorKeyReveal').textContent.includes('SECRET'), '密钥恢复: ' + $('#xorKeyReveal').textContent);

  /* ---- 深链（文章回链） ---- */
  console.log('— 深链 —');
  ok($('#caesarInput').value === 'WIGVIXW EVI LMHHIR MR TPEMR WMKLX',
    'URL 参数已填充凯撒输入: ' + $('#caesarInput').value.slice(0, 30));
  ok($$('.act__note').length >= 1, '深链提示条显示');

  console.log(`\nDOM 集成测试: ${pass} 通过, ${fail} 失败`);
  if (problems.length) { problems.forEach(p => console.log('  ✗', p)); process.exit(1); }
  process.exit(0);
}

main().catch(e => { console.error('测试崩溃:', e); process.exit(1); });
