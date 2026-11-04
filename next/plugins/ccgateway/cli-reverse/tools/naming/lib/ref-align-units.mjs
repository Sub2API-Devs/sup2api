// ref-align 第二遍：函数级对齐。
// 第一遍按"顶层声明 ↔ 顶层声明"对齐；顶层声明改动大（相似度低）、或只有文件归属（布局插值）没有匹配时，
// 里面的嵌套函数 / 回调 / 方法往往仍与旧版某个函数几乎一样。第二遍把两侧每个函数（tokensOf 的 onFn 区间）
// 当作单元，在同一旧版文件的全部函数单元里找对应：
//   - 316 单元只处理"自己声明的绑定里还有没取到名字的"（外层先处理，外层对上了内层通常也就有名字了）；
//   - 候选：长度比在 [1/RATIO, RATIO] 内，按高权重 token 多重集 Dice 取前 TOP_K 个做对齐；
//   - 采用：最好的相似度 ≥ UNIT_MIN_SIM，且比第二名高 UNIT_MARGIN 以上（结构相同的小回调很多，必须唯一）；
//   - 投票同第一遍（ref-align-vote.mjs），只输出声明在该单元内的绑定。
import { bag, bagDice } from './ref-align-pair.mjs';
import { isL } from './ref-align-diff.mjs';

export const UNIT_MIN_LEN = 24;
export const UNIT_MIN_SIM = 0.6;
export const UNIT_MARGIN = 0.1;
export const UNIT_TOP_K = 3;
export const RATIO = 2;

// ranges: [[from, to]]（onFn 收集）→ 单元（外层在前）
export function unitsOf(tokens, ranges) {
  const us = [];
  for (const [from, to] of ranges) {
    if (to - from < UNIT_MIN_LEN) continue;
    const slice = tokens.slice(from, to);
    if (!slice.some((x) => isL(x.t))) continue;
    us.push({ from, to, tokens: slice, bag: bag(slice) });
  }
  us.sort((x, y) => x.from - y.from || y.to - x.to);
  return us;
}

// 单元内声明的绑定
export function ownBindings(tokens) {
  const s = new Set();
  for (const x of tokens) if (x.d && isL(x.t)) s.add(x.b);
  return s;
}

export function candidates(u, refUnits) {
  const cs = [];
  const n = u.tokens.length;
  for (const r of refUnits) {
    const m = r.tokens.length;
    if (m * RATIO < n || n * RATIO < m) continue;
    const d = bagDice(u.bag, r.bag);
    if (d > 0) cs.push({ r, dice: d });
  }
  cs.sort((x, y) => y.dice - x.dice);
  return cs.slice(0, UNIT_TOP_K).map((c) => c.r);
}

export function pickUnit(scored) {
  const [best, second] = scored;
  if (!best || best.sim < UNIT_MIN_SIM) return null;
  if (second && best.sim - second.sim < UNIT_MARGIN) return null;
  return best;
}
