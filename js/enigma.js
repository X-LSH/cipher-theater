/**
 * cipher-theater · enigma.js
 * 第 VI 幕：恩尼格玛 —— 转子窗老虎机式旋转，穷举 26³ 初始位置。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, cribInput, pbInput, statusEl, resultEl, resultText, posEl, triedEl, attackBtn;
  var rotorEls = [];
  var running = false;

  var BATCH = 256;
  var TICK = 40; // ms

  function fmt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function spinRotors() {
    rotorEls.forEach(function (el) {
      var b = el.querySelector('b');
      b.textContent = CT.ALPHA[Math.floor(Math.random() * 26)];
      el.classList.add('is-spinning');
    });
  }

  function lockRotors(pos) {
    rotorEls.forEach(function (el, i) {
      el.querySelector('b').textContent = CT.ALPHA[pos[i]];
      el.classList.remove('is-spinning');
      el.classList.add('is-locked');
    });
  }

  function unlockRotors() {
    rotorEls.forEach(function (el) {
      el.querySelector('b').textContent = '?';
      el.classList.remove('is-spinning', 'is-locked');
    });
    triedEl.textContent = '0';
  }

  function reset() {
    running = false;
    unlockRotors();
    resultEl.classList.remove('is-visible');
    statusEl.textContent = '待命';
    statusEl.classList.remove('is-working', 'is-done');
    attackBtn.disabled = false;
  }

  function attack() {
    if (running) return;
    var text = input.value;
    var crib = CT.ONLY_LETTERS(cribInput.value).toUpperCase();
    if (CT.ONLY_LETTERS(text).length < crib.length || crib.length < 4) {
      statusEl.textContent = '需要：密文字母数 ≥ 口令长度，且口令至少 4 个字母';
      statusEl.classList.add('is-working');
      return;
    }

    running = true;
    reset();
    running = true;
    attackBtn.disabled = true;
    statusEl.classList.add('is-working');
    statusEl.textContent = '穷举进行中…三只转子高速旋转';

    var cfg = {
      rotors: ['I', 'II', 'III'],
      reflector: 'B',
      plugboard: pbInput.value
    };

    var next = 0;
    function tick() {
      var r = CT.enigmaCrackBatch(text, crib, cfg, next, BATCH);
      next = r.next;
      spinRotors();
      triedEl.textContent = fmt(Math.min(next, CT.ENIGMA_TOTAL));

      if (r.found) {
        onFound(r.found, text, cfg);
        return;
      }
      if (next >= CT.ENIGMA_TOTAL) {
        running = false;
        attackBtn.disabled = false;
        rotorEls.forEach(function (el) { el.classList.remove('is-spinning'); });
        statusEl.classList.remove('is-working');
        statusEl.textContent = '✗ 遍历 17,576 种起手位置仍未匹配——检查口令与密文是否对应同一段明文';
        return;
      }
      statusEl.textContent = '穷举中… 已试 ' + fmt(next) + ' / 17,576';
      setTimeout(tick, TICK);
    }

    setTimeout(tick, TICK);
  }

  function onFound(pos, cipherText, cfg) {
    lockRotors(pos);
    var posStr = pos.map(function (p) { return CT.ALPHA[p]; }).join(' ');
    posEl.textContent = posStr;
    statusEl.classList.remove('is-working');
    statusEl.classList.add('is-done');
    statusEl.textContent = '✓ 起手位置锁定：' + posStr +
      '（第 ' + fmt(triedToNumber()) + ' 个候选命中，共 17,576 种）';
    running = false;
    attackBtn.disabled = false;

    // 恩尼格玛自反：同一设置下再加密一次即还原明文
    var plain = CT.enigmaEncryptText(cipherText, pos, cfg);
    resultEl.classList.add('is-visible');
    CT.typewriter(resultText, plain, {
      onDone: function () {
        CT.fireReveal('恩尼格玛起手位置 <b>' + posStr + '</b> 已破解 · <span>DECODED</span>');
      }
    });
    resultEl._plain = plain;
  }

  function triedToNumber() {
    return Number(triedEl.textContent.replace(/,/g, '')) || 0;
  }

  function init() {
    input = $('#enigmaInput');
    if (!input) return;
    cribInput = $('#enigmaCrib');
    pbInput = $('#enigmaPB');
    statusEl = $('#enigmaStatus');
    resultEl = $('#enigmaResult');
    resultText = $('#enigmaPlain');
    posEl = $('#enigmaPos');
    triedEl = $('#enigmaTried');
    attackBtn = $('#enigmaAttack');
    rotorEls = CT.$all('.enigma-rotor', $('#enigmaRotors'));

    input.value = CT.sampleCipher('enigma');
    cribInput.value = CT.SAMPLES.enigma.crib;
    pbInput.value = CT.SAMPLES.enigma.plugboard;

    attackBtn.addEventListener('click', attack);
    CT.bindCopy($('#enigmaCopy'), function () { return resultEl._plain || ''; });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
