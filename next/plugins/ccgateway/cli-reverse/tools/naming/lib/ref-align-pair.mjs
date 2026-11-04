// ref-align 的配对：为一个 316 顶层声明在它归属的旧版文件里挑对齐对象。
//   bag(tokens)                 高权重 token（字面量、属性名、对象键、全局名、已知模块名）的多重集
//   bagDice(A, B)               两个多重集的 Dice 系数（廉价预筛）
//   choose(cur, scored)         在已有匹配（cur，可能没有）与按对齐相似度打分的候选之间取舍
// 规则：
//   - 已有匹配且对齐相似度 ≥ KEEP_SIM：直接用，不找替代；
//   - 已有匹配但相似度低：同文件里相似度 ≥ MIN_SIM 且比已有匹配高 SWITCH_MARGIN 以上的候选才替换；
//   - 只有文件归属（布局插值）没有匹配：最好的候选相似度 ≥ MIN_SIM，且比第二名高 UNIQUE_MARGIN 以上才采用。
import { weightOf, ANCHOR_W } from './ref-align-diff.mjs';

export const KEEP_SIM = 0.5;
export const MIN_SIM = 0.5;
export const SWITCH_MARGIN = 0.2;
export const UNIQUE_MARGIN = 0.1;
export const TOP_K = 4;

export function bag(tokens) {
  const m = new Map();
  let n = 0;
  for (const x of tokens) {
    if (weightOf(x.t) !== ANCHOR_W) continue;
    m.set(x.t, (m.get(x.t) ?? 0) + 1);
    n++;
  }
  return { m, n };
}

export function bagDice(A, B) {
  if (!A.n || !B.n) return 0;
  let common = 0;
  const [s, l] = A.m.size < B.m.size ? [A.m, B.m] : [B.m, A.m];
  for (const [t, c] of s) {
    const d = l.get(t);
    if (d) common += Math.min(c, d);
  }
  return (2 * common) / (A.n + B.n);
}

// cur: {ref, sim} | null；scored: [{ref, sim}]（不含 cur），按 sim 降序
export function choose(cur, scored) {
  const best = scored[0], second = scored[1];
  if (cur) {
    if (best && best.sim >= MIN_SIM && best.sim >= cur.sim + SWITCH_MARGIN) return { ...best, repaired: 'switched' };
    return { ...cur, repaired: null };
  }
  if (best && best.sim >= MIN_SIM && (!second || best.sim - second.sim >= UNIQUE_MARGIN)) return { ...best, repaired: 'file-local' };
  return null;
}
