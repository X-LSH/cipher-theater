/**
 * cipher-theater · core.js
 * 密码学核心：凯撒 / 维吉尼亚 / XOR 的加解密、评分、统计工具
 * 纯函数，无 DOM 依赖，可在任何地方复用。
 */
(function (global) {
  'use strict';

  var CT = global.CT || (global.CT = {});

  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* ------------------------------------------------------------------ */
  /* 基础工具                                                            */
  /* ------------------------------------------------------------------ */

  /** 只保留字母并转大写（用于频率分析 / 凯撒 / 维吉尼亚） */
  function onlyLetters(text) {
    return (text || '').toUpperCase().replace(/[^A-Z]/g, '');
  }

  function letterCount(text) {
    var counts = new Array(26).fill(0);
    var s = onlyLetters(text);
    for (var i = 0; i < s.length; i++) counts[s.charCodeAt(i) - 65]++;
    return counts;
  }

  /** 英语 26 字母标准频率（%） */
  var EN_FREQ = [
    8.17, 1.49, 2.78, 4.25, 12.70, 2.23, 2.02, 6.09, 6.97, 0.15,
    0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.10, 5.99, 6.33, 9.06,
    2.76, 0.98, 2.36, 0.15, 1.97, 0.07
  ];

  /** 英语常见词（用于破译结果加分与展示） */
  var COMMON_WORDS = [
    'THE', 'AND', 'OF', 'TO', 'IN', 'IS', 'THAT', 'IT', 'FOR', 'WAS',
    'AS', 'WITH', 'BE', 'BY', 'ON', 'NOT', 'THIS', 'HAVE', 'FROM', 'OR',
    'ARE', 'YOU', 'AN', 'AT', 'BE', 'WHICH', 'ALL', 'HAD', 'BUT', 'SHE',
    'ATTACK', 'SECRET', 'CIPHER', 'MESSAGE', 'MOUNTAIN', 'HISTORY', 'PAST'
  ];

  /** 卡方相似度：越小越像英语 */
  function chiSquared(counts, total) {
    if (!total) return Infinity;
    var chi = 0;
    for (var i = 0; i < 26; i++) {
      var expected = (EN_FREQ[i] / 100) * total;
      if (expected > 0) {
        var d = counts[i] - expected;
        chi += (d * d) / expected;
      }
    }
    return chi;
  }

  /** 数出文本里命中了多少个常见词（词边界匹配） */
  function commonWordHits(text) {
    var s = ' ' + (text || '').toUpperCase().replace(/[^A-Z ]+/g, ' ') + ' ';
    var hits = [];
    for (var i = 0; i < COMMON_WORDS.length; i++) {
      var w = COMMON_WORDS[i];
      if (w.length < 3) continue;
      if (s.indexOf(' ' + w + ' ') !== -1) hits.push(w);
    }
    return hits;
  }

  /**
   * 对某个偏移的候选明文打分（对数似然，越大越好）
   * 词命中额外加分，保证含常见词的候选明显胜出。
   */
  function scoreCandidate(plain) {
    var counts = letterCount(plain);
    var total = 0;
    for (var i = 0; i < 26; i++) total += counts[i];
    if (!total) return { score: -Infinity, hits: [] };

    var ll = 0;
    for (var j = 0; j < 26; j++) {
      if (counts[j]) ll += counts[j] * Math.log(EN_FREQ[j] / 100);
    }
    var hits = commonWordHits(plain);
    return { score: ll + hits.length * 60, hits: hits };
  }

  /* ------------------------------------------------------------------ */
  /* 凯撒密码                                                            */
  /* ------------------------------------------------------------------ */

  function caesar(text, shift) {
    shift = ((shift % 26) + 26) % 26;
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + shift) % 26) + 65);
      else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + shift) % 26) + 97);
      else out += text[i];
    }
    return out;
  }

  /** 暴力穷举 0-25，返回按得分排序的结果 */
  function caesarCrack(cipherText) {
    var results = [];
    for (var shift = 0; shift < 26; shift++) {
      var plain = caesar(cipherText, -shift);
      var s = scoreCandidate(plain);
      results.push({ shift: shift, plain: plain, score: s.score, hits: s.hits });
    }
    var max = Math.max.apply(null, results.map(function (r) { return r.score; }));
    var min = Math.min.apply(null, results.map(function (r) { return r.score; }));
    var span = max - min || 1;
    results.forEach(function (r) {
      r.match = Math.round(((r.score - min) / span) * 100);
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  }

  /* ------------------------------------------------------------------ */
  /* 维吉尼亚密码                                                        */
  /* ------------------------------------------------------------------ */

  function vigenere(text, key, decrypt) {
    key = onlyLetters(key);
    if (!key) return text;
    var out = '';
    var ki = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      var isUpper = c >= 65 && c <= 90;
      var isLower = c >= 97 && c <= 122;
      if (!isUpper && !isLower) { out += text[i]; continue; }
      var base = isUpper ? 65 : 97;
      var k = key.charCodeAt(ki % key.length) - 65;
      var v = (c - base + (decrypt ? -k : k) + 26) % 26;
      out += String.fromCharCode(base + v);
      ki++;
    }
    return out;
  }

  /** 取密文中第 pos 位（步长 keyLen）的字母列，用于逐列破译 */
  function extractColumn(cipherText, pos, keyLen) {
    var s = onlyLetters(cipherText);
    var col = '';
    for (var i = pos; i < s.length; i += keyLen) col += s[i];
    return col;
  }

  /** 对某一列做凯撒穷举，返回最佳偏移（即该位密钥字母） */
  function solveColumn(column) {
    var best = null;
    for (var shift = 0; shift < 26; shift++) {
      var plain = caesar(column, -shift);
      var s = scoreCandidate(plain);
      if (!best || s.score > best.score) best = { shift: shift, score: s.score };
    }
    return ALPHA[best.shift];
  }

  /** 重合指数 IC：英语约 0.0667，随机文本约 0.0385 */
  function indexOfCoincidence(text) {
    var s = onlyLetters(text);
    var n = s.length;
    if (n < 2) return 0;
    var counts = letterCount(s);
    var sum = 0;
    for (var i = 0; i < 26; i++) sum += counts[i] * (counts[i] - 1);
    return sum / (n * (n - 1));
  }

  /**
   * 维吉尼亚全量破译：对每个候选长度完整解一遍，
   * 用「最终明文得分」选优 —— 统计初筛会骗人，明文不会。
   * 返回 { len, key, plain, score, attempts }
   */
  function crackVigenere(cipherText, maxLen) {
    maxLen = maxLen || 12;
    var attempts = [];
    var best = null;
    for (var L = 1; L <= maxLen; L++) {
      var key = '';
      for (var p = 0; p < L; p++) key += solveColumn(extractColumn(cipherText, p, L));
      var plain = vigenere(cipherText, key, true);
      var att = { len: L, key: key, plain: plain, score: scoreCandidate(plain).score };
      attempts.push(att);
      if (!best || att.score > best.score) best = att;
    }
    best.attempts = attempts;
    return best;
  }

  /** 猜测密钥长度：按 L 切列后各列 IC 的平均值（经典初筛） */
  function icByLength(cipherText, maxLen) {
    var out = [];
    for (var L = 1; L <= maxLen; L++) {
      var acc = 0;
      var cols = 0;
      for (var p = 0; p < L; p++) {
        var col = extractColumn(cipherText, p, L);
        if (col.length >= 3) { acc += indexOfCoincidence(col); cols++; }
      }
      out.push({ len: L, ic: cols ? acc / cols : 0 });
    }
    return out;
  }

  /** 卡斯基检验：密文里重复片段的间隔，暗示密钥长度 */
  function kasiski(cipherText, maxGram) {
    var s = onlyLetters(cipherText);
    var gaps = [];
    var grams = {};
    maxGram = maxGram || 4;
    for (var g = maxGram; g >= 3; g--) {
      for (var i = 0; i + g <= s.length; i++) {
        var gram = s.substr(i, g);
        if (grams[gram] === undefined) { grams[gram] = i; }
        else {
          var gap = i - grams[gram];
          if (gap > 2 && gap < 80) gaps.push({ gram: gram, gap: gap });
          grams[gram] = i;
        }
      }
    }
    return gaps.slice(0, 6);
  }

  /* ------------------------------------------------------------------ */
  /* XOR 流密码                                                          */
  /* ------------------------------------------------------------------ */

  /** 文本 → 字节数组（ASCII：只取 0-127，非 ASCII 截断） */
  function toBytes(text) {
    var out = [];
    for (var i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
    return out;
  }

  function bytesToBits(bytes) {
    var bits = [];
    bytes.forEach(function (b) {
      for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    });
    return bits;
  }

  /** 明文字节 + 重复密钥 → 密文字节 */
  function xorCrypt(bytes, keyBytes) {
    if (!keyBytes.length) return bytes.slice();
    return bytes.map(function (b, i) { return b ^ keyBytes[i % keyBytes.length]; });
  }

  function hex(bytes) {
    return bytes.map(function (b) {
      return b.toString(16).toUpperCase().padStart(2, '0');
    }).join(' ');
  }

  function bytesToString(bytes) {
    return bytes.map(function (b) { return String.fromCharCode(b); }).join('');
  }

  /**
   * 已知明文攻击：已知前缀明文 → 恢复那段密钥流 → 检测周期 → 还原密钥。
   * returns { keystream, period, key, repeated }
   */
  function knownPlaintextAttack(cipherBytes, knownPlainBytes) {
    var n = Math.min(cipherBytes.length, knownPlainBytes.length);
    var ks = [];
    for (var i = 0; i < n; i++) ks.push(cipherBytes[i] ^ knownPlainBytes[i]);

    var period = 0;
    for (var p = 1; p <= Math.floor(n / 2); p++) {
      var ok = true;
      for (var j = p; j < n; j++) {
        if (ks[j] !== ks[j % p]) { ok = false; break; }
      }
      if (ok) { period = p; break; }
    }
    return {
      keystream: ks,
      period: period,
      key: period ? bytesToString(ks.slice(0, period)) : '',
      repeated: period > 0 && n >= period * 2
    };
  }

  /* ------------------------------------------------------------------ */
  /* 密文样例（运行时用真实算法加密，保证可复现）                          */
  /* ------------------------------------------------------------------ */

  var SAMPLES = {
    frequency: {
      plain: 'THE SHAPE OF THE DISTRIBUTION IS THE FINGERPRINT OF THE CIPHER BUT IF THE ALPHABET MERELY CHANGES NAMES THE PEAKS STAY IN THE WRONG PLACES',
      label: '凯撒密文（谱形不变，峰错位）'
    },
    caesar: {
      plain: 'ANYONE WHO CANNOT REMEMBER THE PAST IS CONDEMNED TO REPEAT IT',
      shift: 3,
      label: '凯撒 · 偏移 3'
    },
    vigenere: {
      plain: 'THE HISTORY OF CODEBREAKING IS A STORY OF PATIENCE AND MATH AND THE MOUNTAIN OF DATA ALWAYS BETRAYS THE KEY ' +
             'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG WHILE THE ENEMY WATCHES EVERY HIDDEN SIGNAL IN THE NIGHT',
      key: 'CIPHER',
      label: '维吉尼亚 · 密钥 CIPHER'
    },
    xor: {
      plain: 'ATTACK AT DAWN',
      key: 'SECRET',
      label: 'XOR · 重复密钥 SECRET'
    }
  };

  function sampleCipher(name) {
    var s = SAMPLES[name];
    if (name === 'frequency') return caesar(s.plain, 3);
    if (name === 'caesar') return caesar(s.plain, s.shift);
    if (name === 'vigenere') return vigenere(s.plain, s.key, false);
    return s.plain;
  }

  CT.ALPHA = ALPHA;
  CT.EN_FREQ = EN_FREQ;
  CT.ONLY_LETTERS = onlyLetters;
  CT.letterCount = letterCount;
  CT.chiSquared = chiSquared;
  CT.commonWordHits = commonWordHits;
  CT.scoreCandidate = scoreCandidate;
  CT.caesar = caesar;
  CT.caesarCrack = caesarCrack;
  CT.vigenere = vigenere;
  CT.extractColumn = extractColumn;
  CT.solveColumn = solveColumn;
  CT.crackVigenere = crackVigenere;
  CT.indexOfCoincidence = indexOfCoincidence;
  CT.icByLength = icByLength;
  CT.kasiski = kasiski;
  CT.toBytes = toBytes;
  CT.bytesToBits = bytesToBits;
  CT.xorCrypt = xorCrypt;
  CT.hex = hex;
  CT.bytesToString = bytesToString;
  CT.knownPlaintextAttack = knownPlaintextAttack;
  CT.SAMPLES = SAMPLES;
  CT.sampleCipher = sampleCipher;
})(window);
