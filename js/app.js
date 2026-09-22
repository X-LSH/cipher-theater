/**
 * cipher-theater · app.js
 * 全局 UI：霓虹揭晓闪烁、打字机、矩阵背景、导航与文章深链参数。
 * 依赖 core.js（CT 命名空间）。
 */
(function (global) {
  'use strict';

  var CT = global.CT || (global.CT = {});

  /* ------------------------------------------------------------------ */
  /* 整屏霓虹闪烁 —— 解出明文时的仪式感                                   */
  /* ------------------------------------------------------------------ */

  var flashEl = null;
  var flashTimer = null;

  function fireReveal(message) {
    if (!flashEl) flashEl = document.getElementById('neon-flash');
    if (!flashEl) return;
    var msgEl = flashEl.querySelector('.neon-flash__text');
    if (msgEl && message) msgEl.innerHTML = message;

    flashEl.classList.remove('is-active');
    // 强制 reflow，保证连续触发时动画能重放
    void flashEl.offsetWidth;
    flashEl.classList.add('is-active');

    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      flashEl.classList.remove('is-active');
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /* 打字机效果                                                          */
  /* ------------------------------------------------------------------ */

  function typewriter(el, text, opts) {
    opts = opts || {};
    var speed = opts.speed || 18;
    var onDone = opts.onDone || function () {};
    var i = 0;
    el.textContent = '';
    if (el._twTimer) clearInterval(el._twTimer);

    if (global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = text;
      onDone();
      return;
    }

    el._twTimer = setInterval(function () {
      // 每帧多写几个字符，长文本也不会太慢
      var step = Math.max(1, Math.ceil(text.length / 240));
      i = Math.min(text.length, i + step);
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(el._twTimer);
        el._twTimer = null;
        onDone();
      }
    }, speed);
  }

  /* ------------------------------------------------------------------ */
  /* 小工具                                                              */
  /* ------------------------------------------------------------------ */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 带字母换行的密文展示（每 n 个字母一组，便于阅读） */
  function groupLetters(text, n) {
    var out = [];
    var buf = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (/[A-Za-z]/.test(c)) {
        buf += c;
        if (buf.length === n) { out.push(buf); buf = ''; }
      } else {
        if (buf) { out.push(buf); buf = ''; }
        out.push(c);
      }
    }
    if (buf) out.push(buf);
    return out.join(' ');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  /** 复制按钮统一反馈 */
  function bindCopy(btn, getText) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var old = btn.textContent;
      copyText(typeof getText === 'function' ? getText() : getText).then(function () {
        btn.textContent = '✓ 已复制';
        setTimeout(function () { btn.textContent = old; }, 1600);
      });
    });
  }

  CT.fireReveal = fireReveal;
  CT.typewriter = typewriter;
  CT.$ = $;
  CT.$all = $all;
  CT.escapeHtml = escapeHtml;
  CT.groupLetters = groupLetters;
  CT.copyText = copyText;
  CT.bindCopy = bindCopy;

  /* ------------------------------------------------------------------ */
  /* 矩阵背景（低干扰，尊重 prefers-reduced-motion）                       */
  /* ------------------------------------------------------------------ */

  function initMatrix() {
    var canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    if (global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.style.display = 'none';
      return;
    }
    var ctx = null;
    try { ctx = canvas.getContext && canvas.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) { canvas.style.display = 'none'; return; } // 环境不支持 canvas 时优雅降级
    var glyphs = '01ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEF0123456789￥¥#%&+=<>/\\';
    var fontSize = 14;
    var columns, drops;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(0).map(function () {
        return Math.random() * -50;
      });
    }
    resize();
    window.addEventListener('resize', resize);

    var last = 0;
    function frame(t) {
      if (t - last > 66) { // ~15fps，省电且不抢戏
        last = t;
        ctx.fillStyle = 'rgba(5, 6, 10, 0.10)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontSize + 'px Consolas, monospace';
        for (var i = 0; i < columns; i++) {
          var ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          var x = i * fontSize;
          var y = drops[i] * fontSize;
          // 头部亮点用青色，其余暗绿，营造景深
          ctx.fillStyle = Math.random() > 0.975 ? '#8ffcff' : 'rgba(0, 240, 255, 0.16)';
          ctx.fillText(ch, x, y);
          if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* 导航：滚动高亮                                                       */
  /* ------------------------------------------------------------------ */

  function initNav() {
    var links = $all('.site-nav a[href^="#"], .act-rail a[href^="#"], .program__menu a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute('href'));
      if (!sec) return;
      (map[sec.id] = map[sec.id] || []).push(a);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var group = map[e.target.id];
        if (!group) return;
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-current'); });
          group.forEach(function (a) { a.classList.add('is-current'); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ------------------------------------------------------------------ */
  /* 节目单：右上角下拉（八幕扩容后的主导航）                              */
  /* ------------------------------------------------------------------ */

  var programBound = false;

  function initProgram() {
    var btn = document.getElementById('programBtn');
    var menu = document.getElementById('programMenu');
    if (!btn || !menu || programBound) return; // 幂等：防止 DOMContentLoaded 重复触发导致监听器叠挂
    programBound = true;

    function close() {
      menu.hidden = true;
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      menu.hidden = false;
      btn.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    $all('a', menu).forEach(function (a) { a.addEventListener('click', close); });
  }

  /* ------------------------------------------------------------------ */
  /* 文章深链：articles.html 跳回剧场时自动填充样例                        */
  /* 支持 ?act=caesar&text=...&key=...&note=...                          */
  /* ------------------------------------------------------------------ */

  function initDeepLink() {
    var params = new URLSearchParams(location.search);
    var act = params.get('act');
    if (!act) return;

    var text = params.get('text');
    var note = params.get('note');

    var map = {
      frequency: '#act-frequency',
      caesar: '#act-caesar',
      substitution: '#act-substitution',
      vigenere: '#act-vigenere',
      rail: '#act-rail',
      enigma: '#act-enigma',
      xor: '#act-xor',
      rsa: '#act-rsa'
    };
    var target = map[act];
    if (!target) return;

    if (text) {
      var input = document.querySelector(target + ' textarea') ||
                  document.querySelector(target + ' input[type="text"]');
      if (input) {
        input.value = text;
        if (note) showNote(target, note);
      }
    }
    setTimeout(function () {
      document.querySelector(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }

  function showNote(target, note) {
    var sec = document.querySelector(target);
    if (!sec) return;
    var el = document.createElement('p');
    el.className = 'act__note';
    el.innerHTML = '📌 ' + escapeHtml(note);
    var head = sec.querySelector('.act__head');
    if (head) head.appendChild(el);
  }

  /* ------------------------------------------------------------------ */
  /* 页脚年份                                                            */
  /* ------------------------------------------------------------------ */

  function initFooter() {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ */
  /* 全局分享按钮（文章页）                                               */
  /* ------------------------------------------------------------------ */

  function initShare() {
    $all('[data-copy-link]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(location.href).then(function () {
          var old = btn.textContent;
          btn.textContent = '✓ 链接已复制，去粘给朋友';
          setTimeout(function () { btn.textContent = old; }, 2000);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 每个初始化互相隔离：单点失败（如 canvas 不可用）不能拖垮节目单等其余功能
    [initMatrix, initNav, initProgram, initFooter, initShare].forEach(function (fn) {
      try { fn(); } catch (e) { /* noop */ }
    });
    setTimeout(initDeepLink, 100);
  });
})(window);
