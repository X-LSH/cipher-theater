/**
 * cipher-theater · xor.js
 * 第 IV 幕：XOR 流密码 —— 明文/密钥/密文三行比特流滚动点亮，
 * 再用「已知明文攻击」把密钥流一段段抠出来。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var plainInput, keyInput, streamBox, hexOut, statusEl, attackEl, attackSteps, keyReveal;
  var running = false;

  var BEAM_DELAY = 22; // 每比特的点亮间隔

  /* ---------------- 比特流渲染 ---------------- */

  function buildStream() {
    var pBytes = CT.toBytes(plainInput.value);
    var kBytes = CT.toBytes(keyInput.value);
    if (!pBytes.length || !kBytes.length) return null;
    if (pBytes.length > 32) pBytes = pBytes.slice(0, 32);

    var cBytes = CT.xorCrypt(pBytes, kBytes);
    var pBits = CT.bytesToBits(pBytes);
    var cBits = CT.bytesToBits(cBytes);
    var kBits = CT.bytesToBits(
      pBytes.map(function (_, i) { return kBytes[i % kBytes.length]; })
    );

    var rows = [
      { cls: 'p', name: '明文 P', bits: pBits },
      { cls: 'k', name: '密钥 K', bits: kBits },
      { cls: 'c', name: '密文 C', bits: cBits }
    ];

    var html = '';
    rows.forEach(function (r) {
      html += '<div class="bit-row bit-row--' + r.cls + '">' +
        '<span class="bit-row__name">' + r.name + '</span>' +
        '<span class="bit-row__cells">';
      r.bits.forEach(function (b, i) {
        html += '<i data-i="' + i + '" class="bit-cell">' + b + '</i>';
      });
      html += '</span></div>';
    });

    streamBox.innerHTML = html;
    return { pBytes: pBytes, kBytes: kBytes, cBytes: cBytes, nBits: pBits.length };
  }

  /* ---------------- 点亮动画 ---------------- */

  function runBeam(model, done) {
    var cells = CT.$all('.bit-cell', streamBox);
    var total = model.nBits;
    var i = 0;

    function tick() {
      // 每帧点亮一列（3 行同 i）
      for (var r = 0; r < 3; r++) {
        var idx = r * total + i;
        if (cells[idx]) cells[idx].classList.add('is-lit');
      }
      i++;
      if (i < total) setTimeout(tick, BEAM_DELAY);
      else if (done) done();
    }
    tick();
  }

  function encrypt() {
    if (running) return;
    var model = buildStream();
    if (!model) {
      statusEl.textContent = '明文和密钥都不能为空';
      statusEl.classList.add('is-working');
      return;
    }
    running = true;
    attackEl.classList.remove('is-visible');
    statusEl.classList.add('is-working');
    statusEl.textContent = '比特流滚动中…';
    hexOut.textContent = '';

    runBeam(model, function () {
      running = false;
      statusEl.classList.remove('is-working');
      statusEl.classList.add('is-done');
      statusEl.textContent = '✓ 加密完成 — 点下方按钮尝试攻击';
      hexOut.textContent = CT.hex(model.cBytes);
      attackEl.classList.add('is-visible');
      attackEl._model = model;
    });
  }

  /* ---------------- 已知明文攻击 ---------------- */

  function attack() {
    var model = attackEl._model;
    if (!model) return;

    statusEl.classList.add('is-working');
    statusEl.classList.remove('is-done');
    statusEl.textContent = '已知明文攻击进行中…';
    attackSteps.innerHTML = '';
    keyReveal.textContent = '';

    var known = CT.toBytes(plainInput.value.slice(0, model.pBytes.length));
    var result = CT.knownPlaintextAttack(model.cBytes, known);

    var steps = [
      {
        t: '① 抠出密钥流',
        d: '攻击者握有密文 C 和一段猜到的明文 P。因为 C = P ⊕ K，所以 <b>K = C ⊕ P</b> —— 异或的自反性把密钥流直接交了出来。' +
          '<br>密钥流前几字节：<code>' + CT.hex(result.keystream.slice(0, 12)) + '</code>'
      },
      {
        t: '② 检测周期',
        d: result.period
          ? '逐字节比对发现：密钥流每隔 <b>' + result.period + '</b> 字节就自我重复 —— 说明密钥是循环使用的，周期 = ' + result.period + '。'
          : '没有发现重复周期 —— 密钥和明文一样长（或已知明文太短），那就接近一次性密码本了。'
      },
      {
        t: '③ 还原密钥',
        d: result.key
          ? '把第一个周期的字节转成 ASCII，密钥裸奔了：<b class="key-big">' + CT.escapeHtml(result.key) + '</b>'
          : '无法还原。'
      }
    ];

    var i = 0;
    function next() {
      if (i >= steps.length) {
        statusEl.classList.remove('is-working');
        statusEl.classList.add('is-done');
        statusEl.textContent = '✓ 密钥已恢复';
        if (result.key) {
          keyReveal.textContent = 'K = ' + result.key;
          CT.fireReveal('XOR 密钥 <b>' + CT.escapeHtml(result.key) +
            '</b> 已恢复 · <span>DECODED</span>');
        }
        return;
      }
      var s = steps[i];
      var el = document.createElement('div');
      el.className = 'attack-step';
      el.innerHTML = '<h5>' + s.t + '</h5><p>' + s.d + '</p>';
      attackSteps.appendChild(el);
      i++;
      setTimeout(next, 750);
    }
    next();
  }

  function init() {
    plainInput = $('#xorPlain');
    if (!plainInput) return;
    keyInput = $('#xorKey');
    streamBox = $('#xorStream');
    hexOut = $('#xorHex');
    statusEl = $('#xorStatus');
    attackEl = $('#xorAttack');
    attackSteps = $('#xorSteps');
    keyReveal = $('#xorKeyReveal');

    plainInput.value = CT.SAMPLES.xor.plain;
    keyInput.value = CT.SAMPLES.xor.key;

    $('#xorRun').addEventListener('click', encrypt);
    $('#xorAttackBtn').addEventListener('click', attack);
    $('#xorSample').addEventListener('click', function () {
      plainInput.value = CT.SAMPLES.xor.plain;
      keyInput.value = CT.SAMPLES.xor.key;
      streamBox.innerHTML = '';
      hexOut.textContent = '';
      attackEl.classList.remove('is-visible');
      statusEl.textContent = '待命';
      statusEl.classList.remove('is-working', 'is-done');
    });
    CT.bindCopy($('#xorCopyHex'), function () { return hexOut.textContent || ''; });

    // 回车即运行
    [plainInput, keyInput].forEach(function (el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); encrypt(); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
