/**
 * cipher-theater · caesar.js
 * 第 II 幕：凯撒密码 —— 罗盘指针旋转穷举 26 个偏移，最佳者胜出。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, rowsBox, needle, dialLabel, statusEl, resultEl, resultText, hitsEl;
  var running = false;

  function preview(text, n) {
    var t = text.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  function reset() {
    rowsBox.innerHTML = '';
    resultEl.classList.remove('is-visible');
    statusEl.textContent = '待命';
    statusEl.classList.remove('is-working', 'is-done');
    if (needle) needle.style.transform = 'rotate(0deg)';
    if (dialLabel) dialLabel.textContent = '—';
  }

  function crack() {
    if (running) return;
    var text = input.value;
    if (CT.ONLY_LETTERS(text).length < 10) {
      statusEl.textContent = '密文太短，至少需要 10 个字母';
      statusEl.classList.add('is-working');
      return;
    }

    running = true;
    reset();
    statusEl.classList.add('is-working');
    statusEl.textContent = '正在旋转罗盘…';

    var results = CT.caesarCrack(text); // 按得分降序
    var byShift = {};
    results.forEach(function (r) { byShift[r.shift] = r; });

    var delay = 70; // 每个偏移停留时间
    var shift = 0;

    function step() {
      var r = byShift[shift];
      needle.style.transform = 'rotate(' + (shift * (360 / 26)) + 'deg)';
      dialLabel.textContent = String(shift).padStart(2, '0') + ' / ' + CT.ALPHA[shift];

      var row = document.createElement('div');
      row.className = 'caesar-row';
      row.style.setProperty('--i', shift);
      row.innerHTML =
        '<span class="caesar-shift">偏移 ' + String(shift).padStart(2, '0') + '</span>' +
        '<code class="caesar-preview">' + CT.escapeHtml(preview(r.plain, 46)) + '</code>' +
        '<span class="caesar-match"><i style="width:0%"></i><b>' + r.match + '%</b></span>';
      rowsBox.appendChild(row);

      var fill = row.querySelector('i');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.style.width = r.match + '%'; });
      });

      shift++;
      if (shift < 26) {
        setTimeout(step, delay);
      } else {
        finish(results[0], text);
      }
    }

    setTimeout(step, 200);
  }

  function finish(best, cipherText) {
    running = false;
    statusEl.classList.remove('is-working');
    statusEl.classList.add('is-done');
    statusEl.textContent = '✓ 破译完成 — 偏移 ' + String(best.shift).padStart(2, '0');

    // 高亮获胜行
    CT.$all('.caesar-row', rowsBox).forEach(function (row) {
      if (row.querySelector('.caesar-shift').textContent.indexOf(
        String(best.shift).padStart(2, '0')) !== -1) {
        row.classList.add('is-winner');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    hitsEl.innerHTML = best.hits.length
      ? '检测到常见词：' + best.hits.slice(0, 6).map(function (w) {
          return '<em>' + w + '</em>';
        }).join('')
      : '（未命中常见词，纯靠统计得分取胜）';

    resultEl.classList.add('is-visible');
    CT.typewriter(resultText, best.plain, {
      onDone: function () {
        // 整屏霓虹闪烁 —— 解出来了！
        CT.fireReveal('凯撒偏移 <b>' + String(best.shift).padStart(2, '0') +
          '</b> 已破解 · <span>DECODED</span>');
      }
    });

    resultEl._plain = best.plain;
  }

  function init() {
    input = $('#caesarInput');
    if (!input) return;
    rowsBox = $('#caesarRows');
    needle = $('#dialNeedle');
    dialLabel = $('#dialLabel');
    statusEl = $('#caesarStatus');
    resultEl = $('#caesarResult');
    resultText = $('#caesarPlain');
    hitsEl = $('#caesarHits');

    input.value = CT.sampleCipher('caesar');

    $('#caesarCrack').addEventListener('click', crack);
    $('#caesarReset').addEventListener('click', reset);
    $('#caesarSample').addEventListener('click', function () {
      input.value = CT.sampleCipher('caesar');
      reset();
    });
    CT.bindCopy($('#caesarCopy'), function () { return resultEl._plain || ''; });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
