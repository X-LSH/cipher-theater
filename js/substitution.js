/**
 * cipher-theater · substitution.js
 * 第 III 幕：单表替换 —— 频次排名 + bigram 爬山解出映射，26 张卡逐张翻转归位。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, mapBox, statusEl, resultEl, resultText, hitsEl;
  var running = false;
  var flipTimers = [];

  function clearTimers() {
    flipTimers.forEach(clearTimeout);
    flipTimers = [];
  }

  function renderMap() {
    mapBox.innerHTML = '';
    for (var i = 0; i < 26; i++) {
      var card = document.createElement('div');
      card.className = 'subst-card';
      card.innerHTML =
        '<div class="subst-card__inner">' +
          '<span class="subst-card__face subst-card__face--back"><b>' + CT.ALPHA[i] + '</b><small>?</small></span>' +
          '<span class="subst-card__face subst-card__face--front"><b>' + CT.ALPHA[i] + '</b><small>—</small></span>' +
        '</div>';
      mapBox.appendChild(card);
    }
  }

  function reset() {
    clearTimers();
    running = false;
    renderMap();
    resultEl.classList.remove('is-visible');
    statusEl.textContent = '待命';
    statusEl.classList.remove('is-working', 'is-done');
  }

  function crack() {
    if (running) return;
    var text = input.value;
    if (CT.ONLY_LETTERS(text).length < 30) {
      statusEl.textContent = '密文太短，至少需要 30 个字母（否则统计不可靠）';
      statusEl.classList.add('is-working');
      return;
    }

    running = true;
    reset();
    running = true;
    statusEl.classList.add('is-working');
    statusEl.textContent = '按频次排名初始化映射…';

    // 让状态先渲染一帧，再跑同步求解
    setTimeout(function () {
      var t0 = Date.now();
      var res = CT.solveSubstitution(text);
      if (!res) {
        running = false;
        statusEl.textContent = '解不出来：检查密文里是否还有字母';
        return;
      }
      statusEl.textContent = 'bigram + 常见词爬山完成（' + res.passes +
        ' 轮 · ' + (Date.now() - t0) + 'ms）→ 开始翻牌…';
      flipCards(res, 0);
    }, 120);
  }

  function flipCards(res, i) {
    if (i >= 26) { finish(res); return; }

    var cards = CT.$all('.subst-card', mapBox);
    // 找到明文字母 = i 的那张卡（卡按明文字母归位：front 显示解出的明文字母）
    // 卡片布局：第 i 张卡代表「密文 X → 明文 res.map[X]」，按明文字母顺序翻
    var card = cards[i];
    if (card) {
      // 找出 map 中明文字母等于 i 的密文字母
      var cipherIdx = -1;
      for (var c = 0; c < 26; c++) {
        if (res.map[c] === i) { cipherIdx = c; break; }
      }
      if (cipherIdx !== -1) {
        card.classList.add('is-flipped');
        card.querySelector('.subst-card__face--front b').textContent = CT.ALPHA[i];
        card.querySelector('.subst-card__face--front small').textContent = CT.ALPHA[cipherIdx];
      }
    }

    var flipped = CT.$all('.subst-card.is-flipped', mapBox).length;
    statusEl.textContent = '映射归位中… ' + flipped + ' / 26';

    flipTimers.push(setTimeout(function () { flipCards(res, i + 1); }, 62));
  }

  function finish(res) {
    running = false;
    statusEl.classList.remove('is-working');
    statusEl.classList.add('is-done');
    statusEl.textContent = '✓ 破译完成 — 26 张映射卡全部归位';

    var hits = CT.commonWordHits(res.plain);
    hitsEl.innerHTML = hits.length
      ? '检测到常见词：' + hits.slice(0, 8).map(function (w) {
          return '<em>' + w + '</em>';
        }).join('')
      : '（未命中常见词，纯靠统计得分取胜）';

    resultEl.classList.add('is-visible');
    CT.typewriter(resultText, res.plain, {
      onDone: function () {
        CT.fireReveal('单表替换 26 字母映射已破解 · <span>DECODED</span>');
      }
    });

    resultEl._plain = res.plain;
  }

  function init() {
    input = $('#substInput');
    if (!input) return;
    mapBox = $('#substMap');
    statusEl = $('#substStatus');
    resultEl = $('#substResult');
    resultText = $('#substPlain');
    hitsEl = $('#substHits');

    input.value = CT.sampleCipher('substitution');
    renderMap();

    $('#substCrack').addEventListener('click', crack);
    $('#substReset').addEventListener('click', reset);
    $('#substSample').addEventListener('click', function () {
      input.value = CT.sampleCipher('substitution');
      reset();
    });
    CT.bindCopy($('#substCopy'), function () { return resultEl._plain || ''; });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
