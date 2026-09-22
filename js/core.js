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
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
    'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW',
    'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'DID', 'ITS',
    'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'THAT', 'WITH', 'HAVE',
    'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN',
    'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST',
    'LIKE', 'LONG', 'MAKE', 'MANY', 'MORE', 'ONLY', 'OVER', 'SUCH',
    'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'WHAT', 'FIRST', 'OTHER',
    'AFTER', 'THING', 'THINK', 'THERE', 'THEIR', 'BEFORE', 'GREAT',
    'BELOW', 'EVERY', 'NEVER', 'WHICH', 'WOULD', 'WHERE', 'RIGHT',
    'STILL', 'THREE', 'WORLD', 'YOUNG', 'FOUND', 'MIGHT', 'HELP',
    'KEEPS', 'EACH', 'SAME', 'DOES', 'DIDNT', 'GOES', 'GOOD', 'INTO',
    'LOOK', 'MOST', 'OVER', 'SHOW', 'BACK', 'DOWN', 'GIVE', 'LAST',
    'LIFE', 'HAND', 'HIGH', 'KEEP', 'LAND', 'NEXT', 'OPEN', 'PART',
    'SEEM', 'SIDE', 'TURN', 'WALK', 'WIND', 'TREE', 'PAGE', 'ORDER',
    'LETTER', 'LETTERS', 'SECRET', 'CIPHER', 'MESSAGE', 'MOUNTAIN',
    'HISTORY', 'PAST', 'ATTACK', 'CLIMBER', 'REMEMBER', 'VALLEY',
    'STONE', 'WIZARD', 'KNIGHT', 'FIRE', 'POLICE', 'LONDON', 'RIVER'
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
  /* 单表替换密码                                                        */
  /* ------------------------------------------------------------------ */

  /** 关键词字母表：关键词去重 + 剩余字母顺排 → 26 位密文字母表 */
  function keywordCipherAlphabet(keyword) {
    var seen = {};
    var out = '';
    var kw = onlyLetters(keyword) || 'CIPHER';
    for (var i = 0; i < kw.length; i++) {
      if (!seen[kw[i]]) { seen[kw[i]] = true; out += kw[i]; }
    }
    for (var j = 0; j < 26; j++) {
      var c = ALPHA[j];
      if (!seen[c]) { seen[c] = true; out += c; }
    }
    return out; // out[i] = 明文字母 ALPHA[i] 对应的密文字母
  }

  function substEncrypt(text, cipherAlpha) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      var up = c.toUpperCase();
      if (up >= 'A' && up <= 'Z') {
        var idx = up.charCodeAt(0) - 65;
        var rep = cipherAlpha[idx];
        out += (c === up) ? rep : rep.toLowerCase();
      } else out += c;
    }
    return out;
  }

  /**
   * 英语二元组（bigram）近似频率，每万分计；未收录组合用地板值。
   * 与单字母频率、常见词命中共同构成单表替换的得分函数——上下文统计
   * 是解开「单字母频率全局最优＝频次排名」死结的关键。
   */
  var BIGRAM_FREQ = {
    TH: 356, HE: 307, IN: 243, ER: 205, AN: 199, RE: 185, ON: 176, AT: 149,
    EN: 145, ND: 136, TI: 134, ES: 133, OR: 128, TE: 127, OF: 117, ED: 117,
    IS: 113, IT: 112, AL: 109, AR: 107, ST: 105, TO: 104, NT: 104, NG: 95,
    SE: 93, HA: 93, AS: 87, OU: 84, IO: 83, LE: 83, VE: 83, CO: 78, ME: 77,
    DE: 76, HI: 76, RI: 73, RO: 73, IC: 71, NE: 69, EA: 69, RA: 69, CE: 67,
    LI: 65, CH: 64, LL: 62, BE: 60, MA: 60, SI: 59, OM: 57, UR: 57, CA: 55,
    EL: 53, NS: 53, WH: 52, MP: 51, OD: 50, UT: 50, AC: 50, AD: 49, IL: 47,
    TR: 47, UN: 46, MO: 46, EX: 45, FI: 45, SS: 45, TT: 45, RS: 45, RT: 45,
    EE: 45, GR: 42, SP: 42, SC: 40, SL: 40, AM: 40, AP: 40, EM: 40, AB: 40,
    OB: 40, IB: 38, OT: 38, NI: 38, IR: 38, PR: 38, PL: 38, BL: 38, CL: 40,
    GL: 30, DL: 25, TL: 25, FL: 40, KL: 10, NL: 12, ML: 10, RK: 30, NK: 30,
    CK: 35, SK: 25, OK: 15, DK: 12, LK: 10, ZK: 2, RM: 20, RN: 25, RL: 15,
    RD: 30, RB: 15, RP: 10, RC: 15, RG: 15, RF: 8, MM: 30, PP: 35, NN: 35,
    GG: 25, DD: 25, FF: 40, PH: 35, GH: 25, QU: 12, NC: 25, NF: 12, NH: 10,
    NJ: 5, NM: 8, NP: 8, NQ: 3, NR: 15, NV: 12, NW: 10, NY: 30, NZ: 4,
    OA: 25, OC: 30, OE: 8, OG: 20, OH: 45, OI: 8, OL: 35, OO: 35, OP: 35,
    OS: 35, OV: 30, OW: 55, OX: 5, OY: 15, PA: 40, PE: 45, PI: 40, PN: 3,
    PO: 42, PS: 15, PT: 12, PU: 15, PY: 10, RU: 20, RW: 8, RY: 20, SA: 35,
    SH: 45, SM: 25, SN: 20, SW: 25, SY: 20, TA: 40, TS: 30, TW: 20, TY: 25,
    UA: 15, UG: 10, UI: 12, UL: 30, UM: 30, UP: 25, US: 35, UY: 5, VA: 25,
    VI: 30, VO: 20, VT: 3, VU: 3, VY: 5, WA: 45, WE: 60, WI: 45, WO: 35,
    WR: 15, WS: 15, WT: 5, WY: 5, XA: 3, XC: 5, XH: 2, XI: 12, XM: 2,
    XP: 8, XT: 15, XU: 3, XY: 5, YA: 20, YE: 25, YI: 8, YL: 5, YN: 8,
    YO: 30, YR: 8, YS: 20, YT: 8, YU: 10, ZA: 8, ZE: 20, ZI: 8, ZO: 5,
    ZU: 3, ZW: 2
  };
  var BIGRAM_FLOOR = 0.5;

  /**
   * 破解单表替换：
   * ① 频次排名初始化 → ② 指派式爬山（每字母尝试 26 个落点，允许临时碰撞）
   * → ③ 碰撞修复 → ④ 贪心交换精修。
   * 得分 = 单字母 LL + bigram LL + 60×常见词命中 − 25×碰撞惩罚。
   * map[c] = 密文字母 c 所代表的明文字母（0-25）。
   */
  function solveSubstitution(text) {
    var counts = letterCount(text);
    var total = 0;
    for (var t = 0; t < 26; t++) total += counts[t];
    if (!total) return null;

    // 密文字母序列（bigram 统计用，忽略非字母）
    var seq = [];
    for (var si = 0; si < text.length; si++) {
      var sup = text[si].toUpperCase();
      if (sup >= 'A' && sup <= 'Z') seq.push(sup.charCodeAt(0) - 65);
    }

    // 初始猜测：密文高频字母 → 英语常见字母顺序（程序化补全，保证 26 字母唯一）
    var order = 'ETAOINSHRDLU';
    for (var o = 0; o < 26; o++) {
      var oc = ALPHA[o];
      if (order.indexOf(oc) === -1) order += oc;
    }
    var rank = [];
    for (var i = 0; i < 26; i++) rank.push(i);
    rank.sort(function (a, b) { return counts[b] - counts[a] || a - b; });

    function llOf(m) {
      var s = 0;
      for (var c = 0; c < 26; c++) {
        if (counts[c]) s += counts[c] * Math.log(EN_FREQ[m[c]] / 100);
      }
      return s;
    }

    function biOf(m) {
      var s = 0;
      for (var i = 0; i + 1 < seq.length; i++) {
        var w = BIGRAM_FREQ[
          String.fromCharCode(65 + m[seq[i]]) + String.fromCharCode(65 + m[seq[i + 1]])
        ];
        s += Math.log((w === undefined ? BIGRAM_FLOOR : w) / 10000);
      }
      return s;
    }

    function decryptWith(m) {
      var out = '';
      for (var k = 0; k < text.length; k++) {
        var ch = text[k];
        var up = ch.toUpperCase();
        if (up >= 'A' && up <= 'Z') {
          var p = String.fromCharCode(65 + m[up.charCodeAt(0) - 65]);
          out += (ch === up) ? p : p.toLowerCase();
        } else out += ch;
      }
      return out;
    }

    function hitsOf(m) { return commonWordHits(decryptWith(m)).length; }

    function collisionsOf(m) {
      var used = {}, col = 0;
      for (var c = 0; c < 26; c++) {
        if (used[m[c]]) col++;
        used[m[c]] = true;
      }
      return col;
    }

    function scoreOf(m, pen) {
      return llOf(m) + biOf(m) + hitsOf(m) * 60 - collisionsOf(m) * pen;
    }

    var map = new Array(26);
    rank.forEach(function (cIdx, r) { map[cIdx] = order.charCodeAt(r) - 65; });

    // —— 第一阶段：指派式爬山（允许临时碰撞）——
    var passes = 0;
    var improved = true;
    var best = scoreOf(map, 25);
    while (improved && passes < 120) {
      improved = false;
      passes++;
      for (var c = 0; c < 26; c++) {
        var old = map[c];
        var bestX = old, bestSc = scoreOf(map, 25);
        for (var x = 0; x < 26; x++) {
          if (x === old) continue;
          map[c] = x;
          var sc = scoreOf(map, 25);
          if (sc > bestSc) { bestSc = sc; bestX = x; }
        }
        map[c] = bestX;
        if (bestSc > best + 1e-9) { best = bestSc; improved = true; }
      }
    }

    // 碰撞修复：后到者让位给尚未使用的明文字母
    if (collisionsOf(map) > 0) {
      var used = {};
      for (var r0 = 0; r0 < 26; r0++) {
        if (used[map[r0]]) {
          for (var x0 = 0; x0 < 26; x0++) {
            if (!used[x0]) { map[r0] = x0; break; }
          }
        }
        used[map[r0]] = true;
      }
    }

    // —— 第二阶段：贪心交换精修（已双射，无碰撞项）——
    var best2 = scoreOf(map, 0);
    improved = true;
    var passes2 = 0;
    while (improved && passes2 < 80) {
      improved = false;
      passes2++;
      for (var a = 0; a < 26; a++) {
        for (var b = a + 1; b < 26; b++) {
          var tmp = map[a]; map[a] = map[b]; map[b] = tmp;
          var sc2 = scoreOf(map, 0);
          if (sc2 > best2) { best2 = sc2; improved = true; }
          else { var bk = map[a]; map[a] = map[b]; map[b] = bk; }
        }
      }
    }

    return { map: map, plain: decryptWith(map), score: best2, passes: passes + passes2 };
  }

  /* ------------------------------------------------------------------ */
  /* 栅栏密码（Rail Fence）                                              */
  /* ------------------------------------------------------------------ */

  function railPattern(len, rails) {
    var pattern = new Array(len);
    var rail = 0, dir = 1;
    for (var i = 0; i < len; i++) {
      pattern[i] = rail;
      if (rail === 0) dir = 1;
      else if (rail === rails - 1) dir = -1;
      rail += dir;
    }
    return pattern;
  }

  function railFenceEncrypt(text, rails) {
    rails = Math.max(2, rails);
    var fence = [];
    for (var r = 0; r < rails; r++) fence.push('');
    var pattern = railPattern(text.length, rails);
    for (var i = 0; i < text.length; i++) fence[pattern[i]] += text[i];
    return fence.join('');
  }

  function railFenceDecrypt(cipherText, rails) {
    rails = Math.max(2, rails);
    var pattern = railPattern(cipherText.length, rails);
    // 每条栏的字符数
    var counts = new Array(rails).fill(0);
    for (var i = 0; i < pattern.length; i++) counts[pattern[i]]++;
    // 切出每条栏
    var railsStr = [];
    var off = 0;
    for (var r = 0; r < rails; r++) { railsStr.push(cipherText.slice(off, off + counts[r])); off += counts[r]; }
    // 按 zigzag 顺序回填
    var ptr = new Array(rails).fill(0);
    var out = '';
    for (var j = 0; j < pattern.length; j++) {
      var rail = pattern[j];
      out += railsStr[rail][ptr[rail]++];
    }
    return out;
  }

  /** 穷举 2~maxRails 栏，按明文得分排序 */
  function railFenceCrack(cipherText, maxRails) {
    maxRails = maxRails || 8;
    var results = [];
    for (var rails = 2; rails <= maxRails; rails++) {
      var plain = railFenceDecrypt(cipherText, rails);
      results.push({ rails: rails, plain: plain, score: scoreCandidate(plain).score });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    var max = results[0].score;
    var min = results[results.length - 1].score;
    var span = max - min || 1;
    results.forEach(function (r) { r.match = Math.round(((r.score - min) / span) * 100); });
    return results; // 降序
  }

  /* ------------------------------------------------------------------ */
  /* 恩尼格玛（教学模拟：真实转子接线 + 双步进）                          */
  /* ------------------------------------------------------------------ */

  var ENIGMA_ROTORS = {
    I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
    II:  { wiring: 'AJORXVFZBKMCLDWHNQSUIPYTGE', notch: 'E' },
    III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
    IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
    V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' }
  };
  var ENIGMA_REFLECTORS = {
    A: 'EJMZALYXVBWFCRQUONTSPIKHGD',
    B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
    C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL'
  };

  /** 解析接线板："AN RU VK" 或 "ANRUVK" → [[A,N],[R,U],[V,K]] */
  function parsePlugboard(str) {
    var s = onlyLetters(str || '');
    var pairs = [];
    for (var i = 0; i + 1 < s.length; i += 2) {
      var a = s.charCodeAt(i) - 65, b = s.charCodeAt(i + 1) - 65;
      if (a !== b) pairs.push([a, b]);
    }
    return pairs;
  }

  function plugboardMap(pairs) {
    var m = new Array(26);
    for (var i = 0; i < 26; i++) m[i] = i;
    pairs.forEach(function (p) { m[p[0]] = p[1]; m[p[1]] = p[0]; });
    return m;
  }

  /**
   * cfg = { rotors: ['I','II','III']（从左到右）, reflector: 'B', plugboard: 'AN RU' }
   * 状态 = { pos: [p1,p2,p3] } 字母下标 0-25。
   * 信号：插线板 → 左 → 中 → 右 → 反射板 → 折返 → 插线板；右转子每键必进，含双步进。
   */
  function enigmaPress(state, letterIdx, cfg) {
    var pb = plugboardMap(parsePlugboard(cfg.plugboard));
    var notches = cfg.rotors.map(function (name) {
      return ENIGMA_ROTORS[name].notch.charCodeAt(0) - 65;
    });
    var p = state.pos;

    // —— 步进（在加密之前），含著名的「双步进」异常 ——
    var atNotchMid = p[1] === notches[1];
    var atNotchRight = p[2] === notches[2];
    var stepped = [false, false, true];
    p[2] = (p[2] + 1) % 26;
    if (atNotchRight || atNotchMid) { p[1] = (p[1] + 1) % 26; stepped[1] = true; }
    if (atNotchMid) { p[0] = (p[0] + 1) % 26; stepped[0] = true; }

    function rotorFwd(name, pos, x) {
      var w = ENIGMA_ROTORS[name].wiring;
      var y = w.charCodeAt((x + pos) % 26) - 65;
      return (y - pos + 26) % 26;
    }
    function rotorBwd(name, pos, x) {
      var w = ENIGMA_ROTORS[name].wiring;
      var y = (x + pos) % 26;
      var idx = w.indexOf(String.fromCharCode(65 + y));
      return (idx - pos + 26) % 26;
    }

    var v = pb[letterIdx];
    v = rotorFwd(cfg.rotors[0], p[0], v);
    v = rotorFwd(cfg.rotors[1], p[1], v);
    v = rotorFwd(cfg.rotors[2], p[2], v);
    var refl = ENIGMA_REFLECTORS[cfg.reflector || 'B'];
    v = refl.charCodeAt(v) - 65;
    v = rotorBwd(cfg.rotors[2], p[2], v);
    v = rotorBwd(cfg.rotors[1], p[1], v);
    v = rotorBwd(cfg.rotors[0], p[0], v);
    v = pb[v];
    return { out: v, stepped: stepped };
  }

  function enigmaEncryptText(text, startPos, cfg) {
    var state = { pos: startPos.slice() };
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var up = ch.toUpperCase();
      if (up >= 'A' && up <= 'Z') {
        var r = enigmaPress(state, up.charCodeAt(0) - 65, cfg);
        out += String.fromCharCode(65 + r.out);
      } else out += ch;
    }
    return out;
  }

  /** 穷举初始位置 [p1,p2,p3]（26³ = 17,576 种）：idx ∈ [from, from+count) */
  function enigmaCrackBatch(cipherText, crib, cfg, from, count) {
    var n = 26 * 26 * 26;
    var to = Math.min(n, from + count);
    var target = onlyLetters(cipherText).slice(0, onlyLetters(crib).length);
    var cribLetters = onlyLetters(crib);
    for (var idx = from; idx < to; idx++) {
      var pos = [Math.floor(idx / 676), Math.floor(idx / 26) % 26, idx % 26];
      var got = enigmaEncryptText(cribLetters, pos, cfg);
      if (got === target) return { found: pos, next: idx + 1, tried: idx + 1 };
    }
    return { found: null, next: to, tried: to };
  }
  var ENIGMA_TOTAL = 26 * 26 * 26;

  /* ------------------------------------------------------------------ */
  /* RSA（玩具密钥：p=61, q=53, n=3233, e=17, d=2753）                    */
  /* ------------------------------------------------------------------ */

  var RSA_KEY = { p: 61, q: 53, n: 3233, phi: 3120, e: 17, d: 2753 };

  function modPow(base, exp, mod, collect) {
    var result = 1;
    base %= mod;
    var steps = [];
    while (exp > 0) {
      if (exp % 2 === 1) {
        result = (result * base) % mod;
        if (collect) steps.push({ op: '×', base: base, acc: result });
      }
      base = (base * base) % mod;
      exp = Math.floor(exp / 2);
      if (collect && exp > 0) steps.push({ op: '²', base: base, acc: null });
    }
    if (collect) steps.result = result;
    return { value: result, steps: steps };
  }

  /** 明文字母两两成块：'HE' → 7*26+4 = 186（A=0） */
  function rsaBlocks(text) {
    var s = onlyLetters(text);
    if (s.length % 2) s += 'X';
    var blocks = [];
    for (var i = 0; i < s.length; i += 2) {
      blocks.push((s.charCodeAt(i) - 65) * 26 + (s.charCodeAt(i + 1) - 65));
    }
    return blocks;
  }

  function rsaEncrypt(text, key) {
    var blocks = rsaBlocks(text);
    var steps = modPow(blocks[0], key.e, key.n, true);
    return {
      plainBlocks: blocks,
      cipherBlocks: blocks.map(function (m) { return modPow(m, key.e, key.n).value; }),
      firstSteps: steps.steps,
      firstResult: steps.value
    };
  }

  function rsaDecryptBlocks(cipherBlocks, d, n) {
    var s = '';
    cipherBlocks.forEach(function (c) {
      var m = modPow(c, d, n).value;
      s += String.fromCharCode(65 + Math.floor(m / 26)) + String.fromCharCode(65 + (m % 26));
    });
    return s;
  }

  /** 试除法分解 n：返回过程行与最终 p、q */
  function rsaFactor(n) {
    var attempts = [];
    var d = 2;
    while (d * d <= n) {
      if (n % d === 0) {
        attempts.push({ divisor: d, result: n / d, ok: true });
        return { p: d, q: n / d, attempts: attempts };
      }
      attempts.push({ divisor: d, result: null, ok: false });
      d = d === 2 ? 3 : d + 2;
    }
    return { p: null, q: null, attempts: attempts };
  }

  /** 由 e、φ(n) 求私钥 d（扩欧/暴力皆可，玩具规模暴力即可） */
  function rsaDeriveD(e, phi) {
    for (var d = 1; d < phi; d++) {
      if ((e * d) % phi === 1) return d;
    }
    return null;
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
    },
    substitution: {
      plain: 'THE MOUNTAIN DOES NOT REMEMBER THE CLIMBER AND THE WIND FORGETS THE NAME OF THE TREE BUT THE VALLEY KEEPS EVERY SECRET THAT WAS EVER TOLD UPON ITS STONE',
      keyword: 'CIPHER',
      label: '单表替换 · 关键词 CIPHER'
    },
    rail: {
      plain: 'THE SECRET IS NOT HIDDEN IN THE LETTERS BUT IN THE ORDER THEY WALK ACROSS THE PAGE',
      rails: 4,
      label: '栅栏 · 4 栏'
    },
    enigma: {
      plain: 'WEATHER FORECAST FOR THE BAY AREA CLEAR SKIES TOMORROW',
      crib: 'WEATHER',
      plugboard: 'AN RU VK',
      label: '恩尼格玛 · 转子 I II III'
    },
    rsa: {
      plain: 'MEETMEATDAWN',
      label: 'RSA · n=3233'
    }
  };

  function sampleCipher(name) {
    var s = SAMPLES[name];
    if (name === 'frequency') return caesar(s.plain, 3);
    if (name === 'caesar') return caesar(s.plain, s.shift);
    if (name === 'vigenere') return vigenere(s.plain, s.key, false);
    if (name === 'substitution') return substEncrypt(s.plain, keywordCipherAlphabet(s.keyword));
    if (name === 'rail') return railFenceEncrypt(s.plain, s.rails);
    if (name === 'enigma') return enigmaEncryptText(s.plain, [7, 4, 2],
      { rotors: ['I', 'II', 'III'], reflector: 'B', plugboard: s.plugboard });
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
  CT.keywordCipherAlphabet = keywordCipherAlphabet;
  CT.substEncrypt = substEncrypt;
  CT.solveSubstitution = solveSubstitution;
  CT.railPattern = railPattern;
  CT.railFenceEncrypt = railFenceEncrypt;
  CT.railFenceDecrypt = railFenceDecrypt;
  CT.railFenceCrack = railFenceCrack;
  CT.ENIGMA_ROTORS = ENIGMA_ROTORS;
  CT.ENIGMA_REFLECTORS = ENIGMA_REFLECTORS;
  CT.parsePlugboard = parsePlugboard;
  CT.enigmaPress = enigmaPress;
  CT.enigmaEncryptText = enigmaEncryptText;
  CT.enigmaCrackBatch = enigmaCrackBatch;
  CT.ENIGMA_TOTAL = ENIGMA_TOTAL;
  CT.RSA_KEY = RSA_KEY;
  CT.modPow = modPow;
  CT.rsaBlocks = rsaBlocks;
  CT.rsaEncrypt = rsaEncrypt;
  CT.rsaDecryptBlocks = rsaDecryptBlocks;
  CT.rsaFactor = rsaFactor;
  CT.rsaDeriveD = rsaDeriveD;
  CT.SAMPLES = SAMPLES;
  CT.sampleCipher = sampleCipher;
})(window);
