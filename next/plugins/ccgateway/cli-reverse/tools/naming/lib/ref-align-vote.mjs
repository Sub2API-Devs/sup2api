// ref-align 的投票：对齐后的 L token 对 (316 绑定, 旧版绑定) 计票，按一致性与一一对应取名。
//
// 对一个匹配对（一个 316 顶层声明 ↔ 一个旧版声明）：
//   n316[b]   316 绑定 b 在序列里出现几次（声明 + 引用，含嵌套函数里的）
//   al316[b]  其中对齐到旧版 L token 的（加权）票数；votes[b][r] 投给旧版绑定 r 的票数
//   alRef[r]  旧版绑定 r 收到的全部票数
//   每票权重按对齐的连续性：前后相邻的对齐对都在对角线上 1，一边 0.85，孤立 0.5。
// 采用条件：
//   agreement = 投给最多票的旧版名字的票 / al316[b] ≥ MIN_AGREE（同一 316 绑定的多次出现投票一致；
//               按名字合计：Bun 可能把旧版兄弟块里的两个同名 result 合成一个变量）
//   reverse   = votes[b][r*] / alRef[r*] ≥ MIN_REVERSE（旧版绑定也主要对应 b）
//   一一对应：通过上面两条的候选里，同一个旧版绑定被多个 316 绑定选中时，票数严格最多者留下，其余放弃；
//            同名的不同旧版绑定（嵌套作用域里各有一个 m）各自独立，不互相排斥。
// 置信度见 confidence()。

import { isL, weightOf } from './ref-align-diff.mjs';

export const MIN_AGREE = 0.75;
export const MIN_REVERSE = 0.6;
const SOLID_W = [0.5, 0.85, 1];
const LOCAL_PAD = 12;
const DECL_W = 2; // 两边都是声明处（参数位、let x =、解构 {key: x}）对上，最可靠

// 多轮：上一轮采用的 (316 绑定, 旧版绑定) 换成两边相同的唯一 token 'B:<序号>'（权重 3 的锚点）后重新对齐，
// 剩下的绑定再投票；直到没有新采用或到 MAX_ROUNDS。accept(c) 决定一个候选是否作为锚点。
const MAX_ROUNDS = 3;
export function voteRounds(a, b, pairs, nameOf, accept, align, solidity) {
  let { cands, dropped } = vote(a, b, pairs, nameOf, solidity(pairs));
  const fixed = [];
  for (let round = 1; ; round++) {
    const ok = cands.filter(accept);
    for (const c of ok) c.round = round;
    fixed.push(...ok);
    if (!ok.length || round >= MAX_ROUNDS || ok.length === cands.length && !dropped.length) {
      return { cands: [...fixed, ...cands.filter((c) => !ok.includes(c))], dropped };
    }
    const i316 = new Map(fixed.map((c, i) => [c.b, i])), iRef = new Map(fixed.map((c, i) => [c.r, i]));
    const a2 = a.map((x) => (isL(x.t) && i316.has(x.b) ? { t: 'B:' + i316.get(x.b), b: x.b } : x));
    const b2 = b.map((y) => (isL(y.t) && iRef.has(y.b) ? { t: 'B:' + iRef.get(y.b), b: y.b } : y));
    const p2 = align(a2, b2);
    ({ cands, dropped } = vote(a2, b2, p2, nameOf, solidity(p2)));
  }
}

export function vote(a, b, pairs, nameOf, solid) {
  const n316 = new Map(), al316 = new Map(), alRef = new Map(), nRef = new Map();
  const votes = new Map();
  for (const x of a) if (isL(x.t)) n316.set(x.b, (n316.get(x.b) ?? 0) + 1);
  for (const y of b) if (isL(y.t)) nRef.set(y.b, (nRef.get(y.b) ?? 0) + 1);
  const cnt = new Map();
  // 局部相似度：绑定出现范围（首次到末次出现，各向外扩 LOCAL_PAD 个 token）里两侧对上的加权比例
  const span = (seq) => {
    const total = new Float64Array(seq.length + 1);
    for (let i = 0; i < seq.length; i++) total[i + 1] = total[i] + weightOf(seq[i].t);
    const pos = new Map();
    for (let i = 0; i < seq.length; i++) {
      if (!isL(seq[i].t)) continue;
      const q = pos.get(seq[i].b);
      if (q) q[1] = i;
      else pos.set(seq[i].b, [i, i]);
    }
    return { total, pos, matched: new Float64Array(seq.length + 1) };
  };
  const SA = span(a), SB = span(b);
  {
    const ma = new Float64Array(a.length), mb = new Float64Array(b.length);
    for (const [i, j] of pairs) {
      const w = a[i].t === b[j].t ? weightOf(a[i].t) : 2;
      ma[i] = w;
      mb[j] = w;
    }
    for (let i = 0; i < a.length; i++) SA.matched[i + 1] = SA.matched[i] + ma[i];
    for (let j = 0; j < b.length; j++) SB.matched[j + 1] = SB.matched[j] + mb[j];
  }
  const localOf = (S, bd, len) => {
    const [f, l] = S.pos.get(bd);
    const lo = Math.max(0, f - LOCAL_PAD), hi = Math.min(len, l + 1 + LOCAL_PAD);
    return [S.matched[hi] - S.matched[lo], S.total[hi] - S.total[lo]];
  };
  for (let k = 0; k < pairs.length; k++) {
    const [i, j] = pairs[k];
    const x = a[i], y = b[j];
    if (!isL(x.t) || !isL(y.t)) continue;
    const w = SOLID_W[solid[k]] * (x.d && y.d ? DECL_W : 1);
    al316.set(x.b, (al316.get(x.b) ?? 0) + w);
    alRef.set(y.b, (alRef.get(y.b) ?? 0) + w);
    cnt.set(x.b, (cnt.get(x.b) ?? 0) + 1);
    let m = votes.get(x.b);
    if (!m) votes.set(x.b, (m = new Map()));
    m.set(y.b, (m.get(y.b) ?? 0) + w);
  }
  const pass = [], dropped = [];
  for (const [b316, m] of votes) {
    const byName = new Map();
    for (const [r, c] of m) byName.set(nameOf(r), (byName.get(nameOf(r)) ?? 0) + c);
    let bestName = null, nv = 0;
    for (const [nm, c] of byName) if (c > nv) { bestName = nm; nv = c; }
    let best = null, bv = 0;
    for (const [r, c] of m) if (nameOf(r) === bestName && c > bv) { best = r; bv = c; }
    const c = {
      b: b316, r: best, votes: bv, nameVotes: nv, count: cnt.get(b316),
      n: n316.get(b316), aligned: al316.get(b316),
      agreement: nv / al316.get(b316),
      reverse: bv / alRef.get(best),
      coverage: cnt.get(b316) / n316.get(b316),
      local: (() => {
        const [m1, t1] = localOf(SA, b316, a.length), [m2, t2] = localOf(SB, best, b.length);
        return (m1 + m2) / (t1 + t2);
      })(),
      nRef: nRef.get(best),
    };
    if (c.agreement < MIN_AGREE || c.reverse < MIN_REVERSE) dropped.push({ ...c, why: 'agree' });
    else pass.push(c);
  }
  const byRef = new Map();
  for (const c of pass) {
    let l = byRef.get(c.r);
    if (!l) byRef.set(c.r, (l = []));
    l.push(c);
  }
  const out = [];
  for (const l of byRef.values()) {
    l.sort((x, y) => y.votes - x.votes);
    if (l.length > 1 && l[0].votes === l[1].votes) { dropped.push(...l.map((c) => ({ ...c, why: 'tie121' }))); continue; }
    dropped.push(...l.slice(1).map((c) => ({ ...c, why: 'lose121', winner: l[0].b })));
    out.push(l[0]);
  }
  return { cands: out, dropped };
}

// 置信度 = 0.9 × agreement × reverse × 覆盖率因子 × 相似度因子 × 票数因子 × 连续性因子，<0.5 不输出。
//   覆盖率因子 min(1, coverage/0.8)：316 绑定的出现有多少对上了旧版 L token
//   相似度 q = min(整个声明的加权相似度 sim, 绑定出现范围内的局部相似度 local)；316 侧不到 SMALL_LEN 个 token 的
//     小声明再减 0.08（小函数容易被结构相近的别的函数顶替，抽查里错名集中在这里）；
//     q < MIN_Q 直接不要；相似度因子 = min(1, 0.6 + (q − MIN_Q) × 1.6)（q ≥ 0.7 不扣分）
//   票数因子：1 票 0.85、2 票 0.95、≥3 票 1
//   连续性因子：平均每票权重（对齐对周围也对上了才算可靠）
export const MIN_Q = 0.45;
export const SMALL_LEN = 120;
export function quality(c, sim, len316) {
  return Math.min(sim, c.local) - (len316 < SMALL_LEN ? 0.08 : 0);
}
export function confidence(c, sim, len316) {
  const q = quality(c, sim, len316);
  if (q < MIN_Q) return 0;
  const cov = Math.min(1, c.coverage / 0.8);
  const simF = Math.min(1, 0.6 + (q - MIN_Q) * 1.6);
  const voteF = c.count >= 3 ? 1 : c.count === 2 ? 0.95 : 0.85;
  const solidF = Math.min(1, c.aligned / c.count + 0.1);
  return 0.9 * c.agreement * c.reverse * cov * simF * voteF * solidF;
}
