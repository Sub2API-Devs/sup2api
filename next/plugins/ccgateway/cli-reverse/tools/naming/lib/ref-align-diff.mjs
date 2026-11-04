// ref-align 的序列对齐：带权 LCS + 唯一 token 锚点递归（patience diff 思路）。
//   align(a, b) → [[i, j], …]（i、j 都递增）
// 匹配规则：
//   - 字符串相同才匹配。权重：字面量、属性名、对象键、全局名、已知名字的模块级绑定 'M:<旧版名>'、
//     带键的局部绑定 'L@<键>'、多轮投票的锚点 'B:<n>' 为 4（压缩前后不变，是可靠锚点）；
//     'L'（局部绑定通配）、'M'、关键字、运算符为 2；标点 ( ) { } [ ] , : ; = 为 1（避免靠标点凑长度串位）；
//   - 例外：'M'（316 侧不知道旧版名的模块级绑定）与任何 'M:<名>' 匹配，权重 2；'M:x' 与 'M:y' 不匹配。
// 区间乘积不超过 DP_LIMIT 时直接做 DP；否则先用两边各自唯一、内容相同的高权重 token 做锚点
// （按位置求最长递增子序列），再递归处理锚点之间的空档；没有锚点的大空档放弃（宁缺毋滥）。

const DP_LIMIT = 3e6;
const PUNCT = new Set(['(', ')', '{', '}', '[', ']', ',', ':', ';', '=', '`']);
export const ANCHOR_W = 4;
export const weightOf = (t) => (PUNCT.has(t) ? 1 : t.length > 2 && (t[1] === ':' || t[1] === '@' || t[0] === '.') && t !== 'k:children' ? ANCHOR_W : 2);
export const isL = (t) => t === 'L' || t.startsWith('L@');

// 把 token 串编码成整数，便于 DP 内层比较
function encode(a, b) {
  const ids = new Map();
  const W = [], isM = [];
  const code = (t) => {
    let c = ids.get(t);
    if (c === undefined) {
      c = W.length;
      ids.set(t, c);
      W.push(weightOf(t));
      isM.push(t === 'M' || t.startsWith('M:'));
    }
    return c;
  };
  const ca = Int32Array.from(a, (x) => code(x.t));
  const cb = Int32Array.from(b, (x) => code(x.t));
  return { ca, cb, W: Int32Array.from(W), isM: Uint8Array.from(isM, Number), MW: ids.get('M') ?? -2 };
}

function makeMatch(E) {
  const { W, isM, MW } = E;
  return (x, y) => (x === y ? W[x] : (x === MW && isM[y]) || (y === MW && isM[x]) ? 2 : 0);
}

function dp(E, match, a0, a1, b0, b1, pairs) {
  const { ca, cb } = E;
  const n = a1 - a0, m = b1 - b0;
  const R = m + 1;
  const S = new Int32Array((n + 1) * R);
  for (let i = n - 1; i >= 0; i--) {
    const x = ca[a0 + i], row = i * R, nrow = row + R;
    for (let j = m - 1; j >= 0; j--) {
      let best = S[nrow + j] > S[row + j + 1] ? S[nrow + j] : S[row + j + 1];
      const w = match(x, cb[b0 + j]);
      if (w) {
        const s = S[nrow + j + 1] + w;
        if (s > best) best = s;
      }
      S[row + j] = best;
    }
  }
  for (let i = 0, j = 0; i < n && j < m;) {
    const w = match(ca[a0 + i], cb[b0 + j]);
    if (w && S[i * R + j] === S[(i + 1) * R + j + 1] + w) {
      pairs.push([a0 + i, b0 + j]);
      i++;
      j++;
    } else if (S[(i + 1) * R + j] >= S[i * R + j + 1]) i++;
    else j++;
  }
}

// 最长递增子序列（按 j），输入按 i 递增
function lis(cands) {
  const tails = [], tailIdx = [], prev = new Array(cands.length);
  for (let k = 0; k < cands.length; k++) {
    const j = cands[k][1];
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < j) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = j;
    tailIdx[lo] = k;
    prev[k] = lo ? tailIdx[lo - 1] : -1;
  }
  const res = [];
  for (let k = tails.length ? tailIdx[tails.length - 1] : -1; k >= 0; k = prev[k]) res.push(cands[k]);
  return res.reverse();
}

function rec(E, match, a0, a1, b0, b1, pairs, depth) {
  const { ca, cb, W } = E;
  while (a0 < a1 && b0 < b1 && ca[a0] === cb[b0]) pairs.push([a0++, b0++]);
  const tail = [];
  while (a1 > a0 && b1 > b0 && ca[a1 - 1] === cb[b1 - 1]) tail.push([--a1, --b1]);
  if (a0 < a1 && b0 < b1) {
    if ((a1 - a0) * (b1 - b0) <= DP_LIMIT) dp(E, match, a0, a1, b0, b1, pairs);
    else if (depth < 60) {
      const ua = new Map(), ub = new Map();
      for (let i = a0; i < a1; i++) if (W[ca[i]] === ANCHOR_W) ua.set(ca[i], ua.has(ca[i]) ? -1 : i);
      for (let j = b0; j < b1; j++) if (W[cb[j]] === ANCHOR_W) ub.set(cb[j], ub.has(cb[j]) ? -1 : j);
      const cands = [];
      for (const [c, i] of ua) {
        if (i < 0) continue;
        const j = ub.get(c);
        if (j !== undefined && j >= 0) cands.push([i, j]);
      }
      cands.sort((x, y) => x[0] - y[0]);
      const anchors = lis(cands);
      if (anchors.length) {
        let pi = a0, pj = b0;
        for (const [i, j] of anchors) {
          rec(E, match, pi, i, pj, j, pairs, depth + 1);
          pairs.push([i, j]);
          pi = i + 1;
          pj = j + 1;
        }
        rec(E, match, pi, a1, pj, b1, pairs, depth + 1);
      }
    }
  }
  for (let k = tail.length - 1; k >= 0; k--) pairs.push(tail[k]);
}

export function align(a, b) {
  const E = encode(a, b);
  const pairs = [];
  rec(E, makeMatch(E), 0, a.length, 0, b.length, pairs, 0);
  return pairs;
}

export function similarity(a, b, pairs) {
  let wa = 0, wb = 0, wm = 0;
  for (const x of a) wa += weightOf(x.t);
  for (const x of b) wb += weightOf(x.t);
  for (const [i, j] of pairs) wm += a[i].t === b[j].t ? weightOf(a[i].t) : 2;
  return wa + wb ? (2 * wm) / (wa + wb) : 0;
}

// 每个对齐位置的"连续性"：前后相邻的对齐对是否也在对角线上（0、1、2）
export function solidity(pairs) {
  const s = new Uint8Array(pairs.length);
  for (let k = 0; k < pairs.length; k++) {
    const [i, j] = pairs[k];
    if (k > 0 && pairs[k - 1][0] === i - 1 && pairs[k - 1][1] === j - 1) s[k]++;
    if (k + 1 < pairs.length && pairs[k + 1][0] === i + 1 && pairs[k + 1][1] === j + 1) s[k]++;
  }
  return s;
}
