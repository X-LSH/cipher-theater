/**
 * cipher-theater · frequency.js
 * 第 I 幕：频率分析 —— 柱状谱亮起。
 * 密文 26 字母占比 vs 英语标准谱，动画依次点亮。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var chart, outScore, outTop, outVerdict, sampleBtns;
  var lastText = '';

  /** 渲染柱状谱：26 根霓虹柱 + 英语标准参照线 */
  function renderChart(text) {
    var counts = CT.letterCount(text);
    var total = counts.reduce(function (a, b) { return a + b; }, 0);

    if (!total) {
      chart.innerHTML = '<p class="chart-empty">请输入至少包含字母的密文（或点下方样例）。</p>';
      outScore.textContent = '—';
      outTop.textContent = '—';
      outVerdict.textContent = '';
      return;
    }

    var pcts = counts.map(function (c) { return (c / total) * 100; });
    var maxPct = Math.max.apply(null, pcts.concat(CT.EN_FREQ));
    var scale = Math.max(14, Math.ceil(maxPct / 2) * 2 + 2); // y 轴上限（%）

    // 找出密文 Top3 高频字母
    var ranked = pcts.map(function (p, i) { return { i: i, p: p, c: counts[i] }; })
      .filter(function (o) { return o.c > 0; })
      .sort(function (a, b) { return b.p - a.p; });
    var top3 = ranked.slice(0, 3);

    var html = '<div class="chart-grid" aria-hidden="true">';
    for (var g = 0; g <= 4; g++) {
      var gp = (scale / 4) * g;
      html += '<div class="grid-line" style="bottom:' + (g / 4) * 100 + '%"><span>' +
        gp.toFixed(0) + '%</span></div>';
    }
    html += '</div>';

    for (var i = 0; i < 26; i++) {
      var letter = CT.ALPHA[i];
      var h = (pcts[i] / scale) * 100;
      var eh = (CT.EN_FREQ[i] / scale) * 100;
      var isTop = top3.some(function (t) { return t.i === i; });
      html +=
        '<div class="freq-bar' + (isTop ? ' is-top' : '') + '" style="--i:' + i + '"' +
        ' title="' + letter + '：' + pcts[i].toFixed(1) + '%（英语标准 ' + CT.EN_FREQ[i] + '%）">' +
        '<span class="freq-val">' + (counts[i] || '') + '</span>' +
        '<span class="freq-track">' +
          '<span class="freq-fill" style="--h:' + h + '%"></span>' +
          '<span class="freq-expected" style="--e:' + eh + '%"></span>' +
        '</span>' +
        '<span class="freq-letter">' + letter + '</span>' +
        '</div>';
    }

    chart.innerHTML = html;

    // 下一帧再加 .is-on，让 transition 从 0 长起来
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        CT.$all('.freq-fill', chart).forEach(function (el) { el.classList.add('is-on'); });
      });
    });

    // 卡方契合度：取 26 个偏移对位中的最小值 —— 衡量「谱形」是否像英语，
    // 而不是「字母是否对位」。凯撒/单表替换只改字母名字，谱形仍是英语的。
    var bestChi = Infinity;
    for (var s = 0; s < 26; s++) {
      var chi = 0;
      for (var i2 = 0; i2 < 26; i2++) {
        var obs = counts[(i2 + s) % 26];
        var exp = (CT.EN_FREQ[i2] / 100) * total;
        if (exp > 0) chi += ((obs - exp) * (obs - exp)) / exp;
      }
      if (chi < bestChi) bestChi = chi;
    }

    outTop.textContent = top3.map(function (t) {
      return CT.ALPHA[t.i] + ' ' + t.p.toFixed(1) + '%';
    }).join('　');

    // 样本太短时统计不可靠，直说
    if (total < 30) {
      outScore.textContent = '样本不足';
      outVerdict.textContent = '只有 ' + total + ' 个字母——统计学需要至少 30 个，短密文的柱状谱基本是噪音。';
      lastText = text;
      return;
    }

    var fit = Math.round(100 * Math.exp(-0.9 * bestChi / total));
    fit = Math.max(1, Math.min(99, fit));
    outScore.textContent = fit + '%';

    // 结论：谱形是否像英语
    var verdict;
    if (fit >= 50) {
      verdict = '✅ 谱形就是英语的指纹 —— 要么它是替换类密码（凯撒 / 单表替换：字母改了名，形状没变），要么它本身就是明文。破译的突破口就在这里。';
    } else if (fit >= 10) {
      verdict = '⚠️ 谱形有点像英语但被扰乱 —— 多表替换（如维吉尼亚）会把高峰抹平，需要先猜出密钥长度再逐列分析。';
    } else {
      verdict = '❌ 谱形接近随机 —— 要么密文太短统计不出来，要么它经过了现代强加密（或一次一密），频率分析无从下手。';
    }
    outVerdict.textContent = verdict;
    lastText = text;
  }

  function init() {
    chart = $('#freqChart');
    if (!chart) return;
    outScore = $('#freqScore');
    outTop = $('#freqTop');
    outVerdict = $('#freqVerdict');
    sampleBtns = CT.$all('[data-freq-sample]');

    $('#freqAnalyze').addEventListener('click', function () {
      renderChart($('#freqInput').value);
    });

    // 输入即分析（防抖）
    var timer = null;
    $('#freqInput').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { renderChart($('#freqInput').value); }, 400);
    });

    sampleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sampleBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var kind = btn.getAttribute('data-freq-sample');
        var input = $('#freqInput');
        if (kind === 'plain') input.value = CT.SAMPLES.frequency.plain;
        else if (kind === 'caesar') input.value = CT.sampleCipher('frequency');
        else if (kind === 'vigenere') input.value = CT.sampleCipher('vigenere');
        else if (kind === 'xor') input.value = CT.hex(CT.xorCrypt(
          CT.toBytes(CT.SAMPLES.xor.plain), CT.toBytes(CT.SAMPLES.xor.key)));
        renderChart(input.value);
      });
    });

    // 初始渲染：凯撒样例
    $('#freqInput').value = CT.sampleCipher('frequency');
    renderChart($('#freqInput').value);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
