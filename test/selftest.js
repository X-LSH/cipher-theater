/* 密码剧场自测：验证 core.js 加解密与破译逻辑（node test/selftest.js） */
global.window = global;
require('../js/core.js');
const CT = global.CT;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

console.log('— 凯撒 —');
const cp = 'ANYONE WHO CANNOT REMEMBER THE PAST IS CONDEMNED TO REPEAT IT';
const cc = CT.caesar(cp, 3);
console.log('  密文:', cc);
const crack = CT.caesarCrack(cc);
check('偏移3破译正确', crack[0].shift === 3, 'got ' + crack[0].shift);
check('明文还原', crack[0].plain === cp);
check('命中常见词', crack[0].hits.includes('THE'));

console.log('— 文章样例（凯撒偏移4）—');
const artPlain = 'SECRETS ARE HIDDEN IN PLAIN SIGHT';
const artCipher = CT.caesar(artPlain, 4);
console.log('  密文:', artCipher);
const artCrack = CT.caesarCrack(artCipher);
check('文章密文可解', artCrack[0].shift === 4 && artCrack[0].plain === artPlain);

console.log('— 维吉尼亚（全量验证选优）—');
const vp = CT.SAMPLES.vigenere.plain;
const vc = CT.vigenere(vp, 'CIPHER');
console.log('  密文:', vc.slice(0, 60) + '…');
const vg = CT.crackVigenere(vc, 12);
console.log('  选定长度:', vg.len, '密钥:', vg.key);
check('长度=6', vg.len === 6, 'got ' + vg.len);
check('密钥=CIPHER', vg.key === 'CIPHER');
check('明文还原', vg.plain === vp);
check('attempts=12', vg.attempts.length === 12);

// 多组密钥回归
const KEYS = ['LEMON', 'XYZ', 'KANSAI', 'ABC', 'MOON', 'Q', 'SECRETS', 'ORANGE'];
let allOk = true;
for (const k of KEYS) {
  const c = CT.vigenere(vp, k);
  const r = CT.crackVigenere(c, 12);
  if (r.plain !== vp) { allOk = false; console.log('   ✗', k, '→', r.key); }
}
check('8 组密钥全部还原', allOk);

console.log('— IC / 卡斯基（展示用）—');
const ic = CT.icByLength(vc, 12);
check('IC 返回 12 档', ic.length === 12);
check('正确长度 IC 高于随机', ic[5].ic > 0.045, 'got ' + ic[5].ic);
const gaps = CT.kasiski(vc, 4);
check('卡斯基有输出', Array.isArray(gaps));

console.log('— XOR —');
const pb = CT.toBytes(CT.SAMPLES.xor.plain);
const kb = CT.toBytes(CT.SAMPLES.xor.key);
const cb = CT.xorCrypt(pb, kb);
console.log('  密文 HEX:', CT.hex(cb));
const atk = CT.knownPlaintextAttack(cb, pb);
console.log('  周期:', atk.period, '密钥:', atk.key);
check('恢复密钥=SECRET', atk.key === 'SECRET');
check('XOR 自反', CT.bytesToString(CT.xorCrypt(cb, kb)) === 'ATTACK AT DAWN');
check('比特流长度=8×字节', CT.bytesToBits(cb).length === cb.length * 8);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
