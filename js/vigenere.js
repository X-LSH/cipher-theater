/**
 * cipher-theater · vigenere.js
 * 第 III 幕：维吉尼亚密码 —— 卡斯基/重合指数测长度 → 密钥字母逐位旋转归位。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, icBox, kasBox, slotsBox, statusEl, resultEl, resultText, resultKey;
  var chosenLen = 0;
  var cracked = null;   // CT.crackVigenere 的结果
  var running = false;

  /* ---------------- 第一步：猜测密钥长度 ---------------- */

  function showLengthDetection(text) {
    var letters = CT.ONLY_LETTERS(text);

    if (letters.length < 30) {
      statusEl.textContent = '密文太短，至少需要 30 个字母';
      statusEl.classList.add('is-working');
      return false;
    }
    statusEl.classList.add('is-working');
    statusEl.textContent = '第一步：卡斯基检验 + 重合指数初筛，再全量验证定案…';

    // 经典初筛：重合指数
    var data = CT.icByLength(text, 12);
    var icPeak = data.reduce(function (a, b) { return b.ic > a.ic ? b : a; });

    // 终审：对每个长度完整试解，按最终明文得分选优
    cracked = CT.crackVigenere(text, 12);
    chosenLen = cracked.len;

    var html = '';
    data.forEach(function (d, i) {
      var pct = Math.min(100, (d.ic / 0.085) * 100);
      html +=
        '<div class="ic-bar' + (d.len === chosenLen ? ' is-best' : '') + '" style="--i:' + i + '">' +
        '<span class="ic-val">' + d.ic.toFixed(3) + '</span>' +
        '<span class="ic-track"><i style="--h:' + pct + '%"></i></span>' +
        '<span class="ic-len">L=' + d.len + '</span>' +
        '</div>';
    });
    icBox.innerHTML = html;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        CT.$all('.ic-track i', icBox).forEach(function (el) { el.classList.add('is-on'); });
      });
    });

    // 初筛与终审不一致时，诚实地讲出来——这本身就是知识点
    var verdict = document.getElementById('vigVerdict');
    if (verdict) {
      if (icPeak.len === chosenLen) {
        verdict.innerHTML = 'IC 峰值与全量验证一致：<b>密钥长度 = ' + chosenLen +
          '</b>。该列的字母分布已经恢复成英语的形状。';
      } else {
        verdict.innerHTML = '注意：IC 峰值出现在 L=' + icPeak.len +
          '，但全量验证（逐长度试解、按明文得分选优）判定 <b>密钥长度 = ' + chosenLen +
          '</b> —— 短列的统计噪声会撒谎，解出真明文才是铁证。';
      }
    }

    // 卡斯基证据
    var gaps = CT.kasiski(text, 4);
    if (gaps.length) {
      kasBox.innerHTML = '卡斯基检验证据（重复片段间隔暗示密钥周期）：' +
        gaps.map(function (g) {
          return '<em>' + g.gram + '</em> 间隔 ' + g.gap;
        }).join('　');
    } else {
      kasBox.textContent = '卡斯基检验未找到明显的重复片段，改信重合指数与全量验证的结果。';
    }

    return true;
  }

  /* ---------------- 第二步：密钥字母逐位旋转归位 ---------------- */

  function solveKey() {
    var solvedKey = '';
    slotsBox.innerHTML = '';

    var slots = [];
    for (var i = 0; i < chosenLen; i++) {
      var slot = document.createElement('div');
      slot.className = 'key-slot';
      slot.innerHTML =
        '<span class="key-slot__pos">第 ' + (i + 1) + ' 位</span>' +
        '<span class="key-slot__wheel"><span class="key-slot__strip"></span></span>' +
        '<span class="key-slot__state">旋转中…</span>';
      slotsBox.appendChild(slot);
      slots.push(slot);
    }

    statusEl.textContent = '第二步：密钥字母旋转归位（每位背后是 26 选 1 的卡方检验）…';

    var pos = 0;

    function solveNext() {
      if (pos >= chosenLen) { finish(solvedKey); return; }

      // 字母来自全量验证的胜出密钥（每位旋转展示其落位过程）
      var letter = cracked.key[pos];
      solvedKey += letter;

      var slot = slots[pos];
      var strip = slot.querySelector('.key-slot__strip');
      var state = slot.querySelector('.key-slot__state');

      // 生成 26 个字母的转轮，多转两圈制造"轮盘"感
      var stripHtml = '';
      for (var loop = 0; loop < 3; loop++) {
        for (var L = 0; L < 26; L++) stripHtml += '<b>' + CT.ALPHA[L] + '</b>';
      }
      strip.innerHTML = stripHtml;

      var targetIdx = letter.charCodeAt(0) - 65;
      var steps = 2 * 26 + targetIdx; // 两圈 + 落点
      var letterH = 46; // 与 CSS 中 .key-slot__strip b 高度一致

      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      void strip.offsetWidth; // reflow
      strip.style.transition = 'transform 1.1s cubic-bezier(.16,.9,.28,1.05)';
      strip.style.transform = 'translateY(' + (-steps * letterH) + 'px)';

      setTimeout(function () {
        slot.classList.add('is-solved');
        state.textContent = '✓ 已解出';
        pos++;
        solveNext();
      }, 1250);
    }

    solveNext();
  }

  /* ---------------- 第三步：揭晓明文 ---------------- */

  function finish(key) {
    running = false;
    var plain = cracked.plain;

    statusEl.classList.remove('is-working');
    statusEl.classList.add('is-done');
    statusEl.textContent = '✓ 破译完成 — 密钥 ' + key;

    resultKey.textContent = key.split('').join(' ');
    resultEl.classList.add('is-visible');

    CT.typewriter(resultText, plain, {
      onDone: function () {
        CT.fireReveal('维吉尼亚密钥 <b>' + key + '</b> 已破解 · <span>DECODED</span>');
      }
    });
    resultEl._plain = plain;
    resultEl._key = key;
  }

  /* ---------------- 编排 ---------------- */

  function crack() {
    if (running) return;
    running = true;
    resultEl.classList.remove('is-visible');
    icBox.innerHTML = '';
    kasBox.textContent = '';
    slotsBox.innerHTML = '';

    if (!showLengthDetection(input.value)) { running = false; return; }

    // 指针脉冲一下高亮的柱子，再进入第二步
    setTimeout(function () {
      solveKey();
    }, 1400);
  }

  function reset() {
    running = false;
    cracked = null;
    icBox.innerHTML = '';
    kasBox.textContent = '';
    slotsBox.innerHTML = '';
    var verdict = document.getElementById('vigVerdict');
    if (verdict) verdict.innerHTML = '';
    resultEl.classList.remove('is-visible');
    statusEl.textContent = '待命';
    statusEl.classList.remove('is-working', 'is-done');
  }

  function init() {
    input = $('#vigInput');
    if (!input) return;
    icBox = $('#vigIC');
    kasBox = $('#vigKasiski');
    slotsBox = $('#vigSlots');
    statusEl = $('#vigStatus');
    resultEl = $('#vigResult');
    resultText = $('#vigPlain');
    resultKey = $('#vigKey');

    input.value = CT.sampleCipher('vigenere');

    $('#vigCrack').addEventListener('click', crack);
    $('#vigReset').addEventListener('click', reset);
    $('#vigSample').addEventListener('click', function () {
      input.value = CT.sampleCipher('vigenere');
      reset();
    });
    CT.bindCopy($('#vigCopy'), function () { return resultEl._plain || ''; });
    CT.bindCopy($('#vigCopyKey'), function () { return resultEl._key || ''; });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
