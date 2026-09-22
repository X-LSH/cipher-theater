/**
 * cipher-theater · rail.js
 * 第 V 幕：栅栏密码 —— 之字形铺栏可视化 + 2~8 栏穷举。
 */
(function (global) {
  'use strict';

  var CT = global.CT;
  var $ = CT.$;

  var input, grid, rowsBox, statusEl, resultEl, resultText, chips;
  var currentRails = 4;
  var running = false;
  var litTimers = [];

  function clearTimers() {
    litTimers.forEach(clearTimeout);
    litTimers = [];
  }

  /** 铺栅栏：列 = 字符序号，行 = 栏号（教科书式之字形） */
  function renderGrid(rails, cipherText, animate) {
    clearTimers();
    currentRails = rails;
    var pattern = CT.railPattern(cipherText.length, rails);
    grid.style.gridTemplateColumns = 'repeat(' + Math.max(1, cipherText.length) + ', 17px)';
    grid.style.gridTemplateRows = 'repeat(' + rails + ', 24px)';
    grid.innerHTML = '';

    var cells = []; // cells[col] = cell element（有字母的）
    for (var r = 0; r < rails; r++) {
      for (var col = 0; col < cipherText.length; col++) {
        var cell = document.createElement('span');
        if (pattern[col] === r) {
          cell.className = 'rail-cell';
          cell.textContent = cipherText[col];
          if (animate) {
            cell.classList.add('is-pending');
          }
          cells[col] = cell;
        } else {
          cell.className = 'rail-cell rail-cell--empty';
          cell.textContent = '·';
        }
        grid.appendChild(cell);
      }
    }

    if (animate) {
      // 逐列点亮：字母沿之字路径一个接一个亮起
      for (var i = 0; i < cipherText.length; i++) {
        (function (c) {
          litTimers.push(setTimeout(function () {
            if (cells[c]) cells[c].classList.add('is-lit');
          }, c * 22));
        })(i);
      }
      litTimers.push(setTimeout(function () {
        cells.forEach(function (cell) {
          if (cell) { cell.classList.remove('is-pending'); cell.classList.remove('is-lit'); }
        });
      }, cipherText.length * 22 + 700));
    }
  }

  function setChip(rails) {
    CT.$all('.chip', chips).forEach(function (chip) {
      chip.classList.toggle('is-active', Number(chip.dataset.rails) === rails);
    });
  }

  function preview(text, n) {
    var t = text.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  function reset() {
    clearTimers();
    running = false;
    rowsBox.innerHTML = '';
    resultEl.classList.remove('is-visible');
    statusEl.textContent = '待命';
    statusEl.classList.remove('is-working', 'is-done');
    setChip(4);
    renderGrid(4, input.value, false);
  }

  function crack() {
    if (running) return;
    var text = input.value;
    if (CT.ONLY_LETTERS(text).length < 20) {
      statusEl.textContent = '密文太短，至少需要 20 个字母';
      statusEl.classList.add('is-working');
      return;
    }

    running = true;
    reset();
    running = true;
    statusEl.classList.add('is-working');
    statusEl.textContent = '正在逐栏试排 2 ~ 8…';

    var results = CT.railFenceCrack(text, 8); // 降序
    var byRails = {};
    results.forEach(function (r) { byRails[r.rails] = r; });

    var rails = 2;
    function step() {
      var r = byRails[rails];
      var row = document.createElement('div');
      row.className = 'caesar-row';
      row.dataset.rails = rails;
      row.style.setProperty('--i', rails - 2);
      row.innerHTML =
        '<span class="caesar-shift">' + rails + ' 栏</span>' +
        '<code class="caesar-preview">' + CT.escapeHtml(preview(r.plain, 46)) + '</code>' +
        '<span class="caesar-match"><i style="width:0%"></i><b>' + r.match + '%</b></span>';
      rowsBox.appendChild(row);

      var fill = row.querySelector('i');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.style.width = r.match + '%'; });
      });

      statusEl.textContent = '试排第 ' + rails + ' 栏… 明文得分 ' + r.match + '%';

      rails++;
      if (rails <= 8) setTimeout(step, 240);
      else finish(results[0], text);
    }

    setTimeout(step, 180);
  }

  function finish(best, cipherText) {
    running = false;
    statusEl.classList.remove('is-working');
    statusEl.classList.add('is-done');
    statusEl.textContent = '✓ 破译完成 — 胜出：' + best.rails + ' 栏';

    CT.$all('.caesar-row', rowsBox).forEach(function (row) {
      if (Number(row.dataset.rails) === best.rails) row.classList.add('is-winner');
    });

    // 栅栏切换到胜出栏数并重播之字动画
    setChip(best.rails);
    renderGrid(best.rails, cipherText, true);

    $('#railWin').textContent = best.rails;
    resultEl.classList.add('is-visible');
    CT.typewriter(resultText, best.plain, {
      onDone: function () {
        CT.fireReveal('栅栏 <b>' + best.rails + ' 栏</b> 已破解 · <span>DECODED</span>');
      }
    });

    resultEl._plain = best.plain;
  }

  function init() {
    input = $('#railInput');
    if (!input) return;
    grid = $('#railGrid');
    rowsBox = $('#railRows');
    statusEl = $('#railStatus');
    resultEl = $('#railResult');
    resultText = $('#railPlain');
    chips = $('#railChips');

    input.value = CT.sampleCipher('rail');

    CT.$all('.chip', chips).forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (running) return;
        var rails = Number(chip.dataset.rails);
        setChip(rails);
        renderGrid(rails, input.value, true);
        statusEl.textContent = '以 ' + rails + ' 栏重新铺排（这只是展示，按「穷举破译」才能解题）';
        statusEl.classList.remove('is-done');
      });
    });

    $('#railCrack').addEventListener('click', crack);
    $('#railReset').addEventListener('click', reset);
    $('#railSample').addEventListener('click', function () {
      input.value = CT.sampleCipher('rail');
      reset();
    });
    CT.bindCopy($('#railCopy'), function () { return resultEl._plain || ''; });

    renderGrid(4, input.value, false);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
