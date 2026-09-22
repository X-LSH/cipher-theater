/**
 * cipher-theater · rsa.js
 * 第 VIII 幕：RSA 玩具密钥 —— 公钥加密、模幂分步、试除分解与私钥反推。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, statusEl, mBlocksEl, cBlocksEl, stepsEl, factorRowsEl;
  var privateCard, dEl, privateHint, decryptBtn;
  var resultEl, resultText;

  var state = { enc: null, fact: null };

  function sanitize(v) {
    return CT.ONLY_LETTERS(v).toUpperCase();
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.classList.remove('is-working', 'is-done');
    if (cls) statusEl.classList.add(cls);
  }

  function lockPrivate() {
    privateCard.classList.add('is-locked');
    dEl.textContent = 'd = ?? ?? ??';
    privateHint.textContent = '只有分解 n 才能推算——目前安全';
    decryptBtn.disabled = true;
  }

  function unlockPrivate(d) {
    privateCard.classList.remove('is-locked');
    dEl.textContent = 'd = ' + d;
    privateHint.textContent = '已被攻击者从 n 反推出来';
    decryptBtn.disabled = !state.enc;
  }

  function reset() {
    state = { enc: null, fact: null };
    mBlocksEl.textContent = '—';
    cBlocksEl.textContent = '—';
    stepsEl.innerHTML = '';
    factorRowsEl.innerHTML = '';
    resultEl.classList.remove('is-visible');
    lockPrivate();
    setStatus('待命');
  }

  /* --------------------------- 公钥加密 ------------------------------ */

  function encrypt() {
    var text = sanitize(input.value);
    if (text.length < 2) {
      setStatus('明文至少需要 2 个字母（一个块）');
      return;
    }
    input.value = text;
    state.enc = CT.rsaEncrypt(text, CT.RSA_KEY);
    state.fact = null;
    factorRowsEl.innerHTML = '';
    resultEl.classList.remove('is-visible');
    lockPrivate();

    mBlocksEl.textContent = state.enc.plainBlocks.join(' · ');
    setStatus('公钥加密中…', 'is-working');

    // 密文块逐块弹出
    cBlocksEl.textContent = '';
    state.enc.cipherBlocks.forEach(function (c, i) {
      setTimeout(function () {
        cBlocksEl.textContent += (i ? ' · ' : '') + c;
        if (i === state.enc.cipherBlocks.length - 1) {
          renderSteps(state.enc);
          setStatus('✓ 加密完成 — c = m^17 mod 3233，公钥已可公开张贴', 'is-done');
        }
      }, 140 + i * 130);
    });
  }

  function renderSteps(enc) {
    var lines = [];
    lines.push('<div class="rsa-step-line rsa-step-line--head">STEP · 第一个块 m = ' +
      enc.plainBlocks[0] + ' 的平方-乘展开（e = 17, n = 3233）</div>');
    enc.firstSteps.forEach(function (s) {
      if (s.op === '²') {
        lines.push('<div class="rsa-step-line">sq &nbsp;→&nbsp; base = ' + s.base + '</div>');
      } else {
        lines.push('<div class="rsa-step-line">mul →&nbsp; acc = ' + s.acc + '</div>');
      }
    });
    lines.push('<div class="rsa-step-line rsa-step-line--head">c = ' + enc.firstResult + '</div>');
    stepsEl.innerHTML = lines.join('');
  }

  /* --------------------------- 分解攻击 ------------------------------ */

  function attack() {
    if (state.fact) return;
    var fact = CT.rsaFactor(CT.RSA_KEY.n);
    setStatus('试除进行中…', 'is-working');
    factorRowsEl.innerHTML = '';

    fact.attempts.forEach(function (a, i) {
      setTimeout(function () {
        var row = document.createElement('div');
        row.className = 'rsa-factor-row' + (a.ok ? ' is-hit' : '');
        row.innerHTML = a.ok
          ? '<code>3233 ÷ ' + a.divisor + ' = ' + a.result + ' ✓</code><b>p = ' +
            a.divisor + ', q = ' + a.result + '</b>'
          : '<code>3233 ÷ ' + a.divisor + ' … 不整除</code>';
        factorRowsEl.appendChild(row);

        if (i === fact.attempts.length - 1) {
          var phi = fact.p * fact.q - fact.p - fact.q + 1;
          var d = CT.rsaDeriveD(CT.RSA_KEY.e, phi);
          addInfoRow('φ(n) = (' + fact.p + ' − 1) × (' + fact.q + ' − 1) = ' + phi);
          addInfoRow('17 · d ≡ 1 (mod ' + phi + ') → d = ' + d);
          state.fact = { p: fact.p, q: fact.q, phi: phi, d: d };
          unlockPrivate(d);
          setStatus('✓ 分解成功 — 玩具密钥 5 秒告破，私钥易主', 'is-done');
        }
      }, 90 * i);
    });
  }

  function addInfoRow(html) {
    var row = document.createElement('div');
    row.className = 'rsa-factor-row is-info';
    row.innerHTML = '<code>' + html + '</code>';
    factorRowsEl.appendChild(row);
  }

  /* --------------------------- 私钥解密 ------------------------------ */

  function decrypt() {
    if (!state.enc) { setStatus('先点「公钥加密」生成密文块'); return; }
    if (!state.fact) { setStatus('先点「发起分解」夺回私钥 d'); return; }
    var plain = CT.rsaDecryptBlocks(state.enc.cipherBlocks, state.fact.d, CT.RSA_KEY.n);
    if (CT.ONLY_LETTERS(input.value).length % 2 === 1) plain = plain.slice(0, -1);

    resultEl.classList.add('is-visible');
    setStatus('✓ 用私钥 d = ' + state.fact.d + ' 解密成功', 'is-done');
    CT.typewriter(resultText, plain, {
      onDone: function () {
        CT.fireReveal('RSA 私钥 <b>d = ' + state.fact.d + '</b> 已破解 · <span>DECODED</span>');
      }
    });
    resultEl._plain = plain;
  }

  function init() {
    input = $('#rsaInput');
    if (!input) return;
    statusEl = $('#rsaStatus');
    mBlocksEl = $('#rsaMBlocks');
    cBlocksEl = $('#rsaCBlocks');
    stepsEl = $('#rsaSteps');
    factorRowsEl = $('#rsaFactorRows');
    privateCard = $('#rsaPrivate');
    dEl = $('#rsaD');
    privateHint = $('#rsaPrivateHint');
    decryptBtn = $('#rsaDecrypt');
    resultEl = $('#rsaResult');
    resultText = $('#rsaPlain');

    input.value = CT.SAMPLES.rsa.plain;

    $('#rsaEncrypt').addEventListener('click', encrypt);
    $('#rsaAttack').addEventListener('click', attack);
    decryptBtn.addEventListener('click', decrypt);
    $('#rsaReset').addEventListener('click', function () {
      input.value = CT.SAMPLES.rsa.plain;
      reset();
    });
    $('#rsaSample').addEventListener('click', function () {
      input.value = CT.SAMPLES.rsa.plain;
      reset();
    });
    CT.bindCopy($('#rsaCopy'), function () { return resultEl._plain || ''; });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
