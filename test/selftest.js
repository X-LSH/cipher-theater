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

console.log('— 单表替换（关键词字母表 + 爬山法）—');
const subPlain = CT.SAMPLES.substitution.plain;
const alpha = CT.keywordCipherAlphabet('CIPHER');
console.log('  字母表:', alpha);
const subCipher = CT.substEncrypt(subPlain, alpha);
console.log('  密文:', subCipher.slice(0, 50) + '…');
check('字母表长度26且无重复', alpha.length === 26 && new Set(alpha).size === 26);
const subRes = CT.solveSubstitution(subCipher);
console.log('  爬山', subRes.passes, '轮, 得分', Math.round(subRes.score));
check('替换明文完全还原', subRes.plain === subPlain,
  subRes.plain.slice(0, 60));

console.log('— 栅栏密码 —');
const railPlain = CT.SAMPLES.rail.plain;
const railCipher = CT.railFenceEncrypt(railPlain, 4);
console.log('  密文:', railCipher.slice(0, 50) + '…');
check('栅栏往返一致(3栏)', CT.railFenceDecrypt(CT.railFenceEncrypt(railPlain, 3), 3) === railPlain);
check('栅栏往返一致(7栏)', CT.railFenceDecrypt(CT.railFenceEncrypt(railPlain, 7), 7) === railPlain);
const railCrack = CT.railFenceCrack(railCipher, 8);
console.log('  最佳栏数:', railCrack[0].rails);
check('栅栏穷举4栏获胜', railCrack[0].rails === 4 && railCrack[0].plain === railPlain,
  'got rails=' + railCrack[0].rails);

console.log('— 恩尼格玛 —');
const enPlain = CT.SAMPLES.enigma.plain;
const enCfg = { rotors: ['I', 'II', 'III'], reflector: 'B', plugboard: CT.SAMPLES.enigma.plugboard };
const startPos = [7, 4, 2];
const enCipher = CT.enigmaEncryptText(enPlain, startPos, enCfg);
console.log('  密文:', enCipher.slice(0, 40) + '…');
check('恩尼格玛确定性(同设置同密文)',
  CT.enigmaEncryptText(enPlain, startPos, enCfg) === enCipher);
// 自反性：任何字母不会加密成自身
let selfOk = true;
for (let i = 0; i < 26; i++) {
  const st = { pos: [0, 0, 0] };
  if (CT.enigmaPress(st, i, enCfg).out === i) selfOk = false;
}
check('字母永不加密成自身', selfOk);
// 穷举初始位置
const t0 = Date.now();
let found = null, tried = 0, idx = 0;
while (!found && idx < CT.ENIGMA_TOTAL) {
  const r = CT.enigmaCrackBatch(enCipher, CT.SAMPLES.enigma.crib, enCfg, idx, 2048);
  idx = r.next;
  tried = r.tried;
  if (r.found) found = r.found;
}
console.log('  穷举', tried, '种 →', found, `(${Date.now() - t0}ms)`);
check('初始位置恢复为 [7,4,2]', found && found.join(',') === '7,4,2');
check('穷举在合理时间内', Date.now() - t0 < 5000);

console.log('— RSA —');
check('模幂正确 65^17 mod 3233 = 2790', CT.modPow(65, 17, 3233).value === 2790);
check('密钥自洽 e*d ≡ 1 (mod φ)', (CT.RSA_KEY.e * CT.RSA_KEY.d) % CT.RSA_KEY.phi === 1);
check('p*q = n', CT.RSA_KEY.p * CT.RSA_KEY.q === CT.RSA_KEY.n);
const rsaPlain = CT.SAMPLES.rsa.plain;
const enc = CT.rsaEncrypt(rsaPlain, CT.RSA_KEY);
console.log('  明文块:', enc.plainBlocks.join(','), '→ 密文块:', enc.cipherBlocks.join(','));
const fact = CT.rsaFactor(CT.RSA_KEY.n);
check('分解 n 得 61×53', fact.p * fact.q === 3233);
const phi = fact.p * fact.q - fact.p - fact.q + 1; // φ = pq - p - q + 1
const derivedD = CT.rsaDeriveD(CT.RSA_KEY.e, phi);
check('推导私钥 d=2753', derivedD === 2753, 'got ' + derivedD);
const dec = CT.rsaDecryptBlocks(enc.cipherBlocks, derivedD, 3233);
check('RSA 加解密往返', dec.replace(/X+$/, '') === rsaPlain, dec);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
