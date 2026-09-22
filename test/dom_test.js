/* DOM 集成测试：在 jsdom 中加载 index.html 并模拟八幕完整交互 */
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

  for (const f of ['js/core.js', 'js/app.js', 'js/frequency.js', 'js/caesar.js', 'js/substitution.js',
    'js/vigenere.js', 'js/rail.js', 'js/enigma.js', 'js/xor.js', 'js/rsa.js']) {
    try { window.eval(read(f)); } catch (e) { errors.push(f + ': ' + e.message); }
  }
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await sleep(50);
  ok(errors.length === 0, '脚本加载无错误' + (errors.length ? ' → ' + errors.join('; ') : ''));

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---- 节目单 + 右缘导轨（八幕扩容的导航） ---- */
  console.log('— 节目单 / 导轨 —');
  $('#programBtn').click();
  ok(!$('#programMenu').hidden, '节目单打开');
  ok($('#programBtn').getAttribute('aria-expanded') === 'true', 'aria-expanded=true');
  ok($$('#programMenu a[href^="#"]').length === 8, `节目单收录 8 幕（${$$('#programMenu a[href^="#"]').length}）`);
  $('#programBtn').click();
  ok($('#programMenu').hidden, '节目单关闭');
  ok($$('.act-rail a').length === 8, '右缘导轨 8 个幕次');
  ok($$('section.act:not(.act--teaser) .act__num').length === 8,
    `8 个幕号（${$$('section.act:not(.act--teaser) .act__num').length}）`);

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

  /* ---- 第 III 幕 单表替换 ---- */
  console.log('— 第 III 幕 单表替换 —');
  $('#substCrack').click();
  await sleep(300);
  ok($('#substStatus').textContent.length > 4, '替换状态推进: ' + $('#substStatus').textContent.slice(0, 40));
  await sleep(2400);
  ok($$('#substMap .subst-card.is-flipped').length === 26,
    `26 张映射卡全部翻转（${$$('#substMap .subst-card.is-flipped').length}）`);
  ok($('#substResult').classList.contains('is-visible'), '替换结果面板可见');
  ok($('#substStatus').classList.contains('is-done'), '替换状态=完成');
  await sleep(900);
  ok($('#substPlain').textContent.includes('MOUNTAIN'), '替换明文还原: ' + $('#substPlain').textContent.slice(0, 44));
  ok($('#substHits').textContent.includes('MOUNTAIN') || $('#substHits').textContent.includes('常见词'), '替换常见词命中展示');

  /* ---- 第 IV 幕 维吉尼亚 ---- */
  console.log('— 第 IV 幕 维吉尼亚 —');
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

  /* ---- 第 V 幕 栅栏 ---- */
  console.log('— 第 V 幕 栅栏 —');
  $('#railCrack').click();
  await sleep(400);
  ok($$('#railGrid .rail-cell').length > 0, '栅栏网格已铺');
  await sleep(2400);
  ok($$('#railRows .caesar-row').length === 7, `7 个栏数候选（${$$('#railRows .caesar-row').length}）`);
  ok($$('#railRows .caesar-row.is-winner').length === 1, '胜出栏数唯一高亮');
  ok($('#railStatus').classList.contains('is-done'), '栅栏状态=完成: ' + $('#railStatus').textContent);
  ok($('#railWin').textContent === '4', '胜出栏数=4: ' + $('#railWin').textContent);
  ok($('#railResult').classList.contains('is-visible'), '栅栏结果面板可见');
  await sleep(1200);
  ok($('#railPlain').textContent.includes('SECRET'), '栅栏明文还原: ' + $('#railPlain').textContent.slice(0, 44));

  /* ---- 第 VI 幕 恩尼格玛 ---- */
  console.log('— 第 VI 幕 恩尼格玛 —');
  $('#enigmaAttack').click();
  await sleep(500);
  ok(Number($('#enigmaTried').textContent.replace(/,/g, '')) > 0, '穷举计数器推进: ' + $('#enigmaTried').textContent);
  await sleep(1800);
  ok($$('#enigmaRotors .enigma-rotor.is-locked').length === 3, '三只转子窗锁定');
  ok($('#enigmaPos').textContent.replace(/\s/g, '') === 'HEC', '起手位置 HEC: ' + $('#enigmaPos').textContent);
  ok($('#enigmaStatus').classList.contains('is-done'), '恩尼格玛状态=完成');
  ok($('#enigmaResult').classList.contains('is-visible'), '恩尼格玛结果面板可见');
  await sleep(1500);
  ok($('#enigmaPlain').textContent.includes('WEATHER'), '恩尼格玛明文还原: ' + $('#enigmaPlain').textContent.slice(0, 44));

  /* ---- 第 VII 幕 XOR ---- */
  console.log('— 第 VII 幕 XOR —');
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

  /* ---- 第 VIII 幕 RSA ---- */
  console.log('— 第 VIII 幕 RSA —');
  $('#rsaEncrypt').click();
  await sleep(1400);
  ok($('#rsaMBlocks').textContent.includes('316'), '明文块生成: ' + $('#rsaMBlocks').textContent);
  ok($('#rsaCBlocks').textContent.includes('2329'), '密文块生成: ' + $('#rsaCBlocks').textContent);
  ok($$('#rsaSteps .rsa-step-line').length >= 8, `模幂分步展示（${$$('#rsaSteps .rsa-step-line').length} 行）`);
  ok($('#rsaStatus').textContent.includes('加密完成'), 'RSA 加密状态完成');
  ok($('#rsaPrivate').classList.contains('is-locked'), '私钥卡初始锁定');
  ok($('#rsaDecrypt').disabled, '解密按钮初始禁用');

  $('#rsaAttack').click();
  await sleep(3400);
  const factorRows = $$('#rsaFactorRows .rsa-factor-row');
  ok(factorRows.length >= 20, `试除过程展示（${factorRows.length} 行）`);
  ok($$('#rsaFactorRows .rsa-factor-row.is-hit').length === 1, '命中行唯一');
  ok(!$('#rsaPrivate').classList.contains('is-locked'), '私钥卡解锁');
  ok($('#rsaD').textContent.includes('2753'), '私钥 d=2753 反推: ' + $('#rsaD').textContent);
  ok(!$('#rsaDecrypt').disabled, '解密按钮启用');

  $('#rsaDecrypt').click();
  await sleep(1500);
  ok($('#rsaResult').classList.contains('is-visible'), 'RSA 结果面板可见');
  ok($('#rsaPlain').textContent.includes('MEETMEATDAWN'), 'RSA 明文还原: ' + $('#rsaPlain').textContent.slice(0, 30));

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
