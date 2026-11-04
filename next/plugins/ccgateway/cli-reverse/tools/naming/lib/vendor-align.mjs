// Sequence alignment for normalised token streams (see vendor-tokens.mjs).
//   import { align } from './vendor-align.mjs'
//   align(A, B, wild) → Int32Array m, m[i] = index in B aligned with A[i], or -1
// Patience-style: strip common prefix/suffix, anchor on tokens that occur once
// in both segments (longest increasing subsequence of their positions), recurse
// into the gaps; gaps small enough go to a weighted LCS (a wildcard match `wild`
// scores 1, any other equal token 2, so literal tokens steer the alignment and
// the wildcards fall in between). Very lopsided gaps are cut to a window next to
// the anchor they touch.
const LIMIT = 4_000_000;
let dpBuf = new Int32Array(1 << 20);

export function align(A, B, wildSet) {
  const m = new Int32Array(A.length).fill(-1);
  const isWild = (t) => wildSet.has(t);
  const w = (t) => (isWild(t) ? 1 : 2);

  function dp(alo, ahi, blo, bhi) {
    const n = ahi - alo, k = bhi - blo, W = k + 1;
    const need = (n + 1) * W;
    if (dpBuf.length < need) dpBuf = new Int32Array(need);
    const D = dpBuf;
    for (let j = 0; j <= k; j++) D[n * W + j] = 0;
    for (let i = n - 1; i >= 0; i--) {
      const row = i * W, next = row + W, ai = A[alo + i];
      D[row + k] = 0;
      for (let j = k - 1; j >= 0; j--) {
        let best = D[next + j] > D[row + j + 1] ? D[next + j] : D[row + j + 1];
        if (ai === B[blo + j]) { const v = D[next + j + 1] + w(ai); if (v > best) best = v; }
        D[row + j] = best;
      }
    }
    let i = 0, j = 0;
    while (i < n && j < k) {
      const ai = A[alo + i];
      if (ai === B[blo + j] && D[i * W + j] === D[(i + 1) * W + j + 1] + w(ai)) { m[alo + i] = blo + j; i++; j++; }
      else if (D[(i + 1) * W + j] >= D[i * W + j + 1]) i++;
      else j++;
    }
  }

  function lis(pairs) {
    // pairs sorted by i; longest chain increasing in j
    const tails = [], tailIdx = [], prev = new Int32Array(pairs.length).fill(-1);
    for (let p = 0; p < pairs.length; p++) {
      const j = pairs[p][1];
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < j) lo = mid + 1; else hi = mid; }
      tails[lo] = j; tailIdx[lo] = p;
      prev[p] = lo > 0 ? tailIdx[lo - 1] : -1;
    }
    const out = [];
    for (let p = tailIdx[tails.length - 1]; p !== undefined && p >= 0; p = prev[p]) out.push(pairs[p]);
    return out.reverse();
  }

  function rec(alo, ahi, blo, bhi, depth) {
    while (alo < ahi && blo < bhi && A[alo] === B[blo]) m[alo++] = blo++;
    while (alo < ahi && blo < bhi && A[ahi - 1] === B[bhi - 1]) m[--ahi] = --bhi;
    const n = ahi - alo, k = bhi - blo;
    if (n === 0 || k === 0) return;
    if (n * k <= LIMIT) return dp(alo, ahi, blo, bhi);
    // anchors: literal tokens occurring exactly once on both sides
    const ca = new Map(), cb = new Map();
    for (let i = alo; i < ahi; i++) { const t = A[i]; if (!isWild(t)) { const v = ca.get(t); ca.set(t, v === undefined ? i : -1); } }
    for (let j = blo; j < bhi; j++) { const t = B[j]; if (ca.has(t) && ca.get(t) >= 0) { const v = cb.get(t); cb.set(t, v === undefined ? j : -1); } }
    const pairs = [];
    for (const [t, j] of cb) if (j >= 0) pairs.push([ca.get(t), j]);
    pairs.sort((x, y) => x[0] - y[0]);
    const anchors = lis(pairs);
    if (anchors.length && depth < 60) {
      let pa = alo, pb = blo;
      for (const [i, j] of anchors) {
        gap(pa, i, pb, j, depth, pa === alo ? 'lead' : 'mid');
        m[i] = j;
        pa = i + 1; pb = j + 1;
      }
      gap(pa, ahi, pb, bhi, depth, 'tail');
      return;
    }
    // no anchors: windows at both ends of the larger side
    windowed(alo, ahi, blo, bhi, 'mid');
  }

  function gap(alo, ahi, blo, bhi, depth, where) {
    const n = ahi - alo, k = bhi - blo;
    if (n === 0 || k === 0) return;
    if (n * k <= LIMIT || (k <= n * 4 + 64 && n <= k * 4 + 64)) return rec(alo, ahi, blo, bhi, depth + 1);
    windowed(alo, ahi, blo, bhi, where);
  }

  function windowed(alo, ahi, blo, bhi, where) {
    const n = ahi - alo, k = bhi - blo;
    const cap = (x, y) => Math.max(1, Math.min(x, Math.floor(LIMIT / Math.max(1, y))));
    if (k > n) {
      const win = cap(Math.min(k, n * 3 + 64), n);
      if (where === 'lead') return dp(alo, ahi, bhi - win, bhi);
      if (where === 'tail') return dp(alo, ahi, blo, blo + win);
      const h = alo + (n >> 1);
      const w1 = cap(Math.min(k >> 1, (h - alo) * 3 + 64), h - alo), w2 = cap(Math.min(k >> 1, (ahi - h) * 3 + 64), ahi - h);
      if (h > alo) dp(alo, h, blo, blo + w1);
      if (ahi > h) dp(h, ahi, bhi - w2, bhi);
    } else {
      const win = cap(Math.min(n, k * 3 + 64), k);
      if (where === 'lead') return dp(ahi - win, ahi, blo, bhi);
      if (where === 'tail') return dp(alo, alo + win, blo, bhi);
      const h = blo + (k >> 1);
      const w1 = cap(Math.min(n >> 1, (h - blo) * 3 + 64), h - blo), w2 = cap(Math.min(n >> 1, (bhi - h) * 3 + 64), bhi - h);
      if (h > blo) dp(alo, alo + w1, blo, h);
      if (bhi > h) dp(ahi - w2, ahi, h, bhi);
    }
  }

  rec(0, A.length, 0, B.length, 0);
  snap();
  return m;

  // Ties in the LCS can leave a wildcard paired with a partner that is not next
  // to the literal tokens it travels with (`Et = new Set("…")` paired with the
  // `let emojiRegex` before `const ALPHA_NUMERIC = new Set("…")`). Move such a
  // partner next to the matched neighbour when the slot there is a free
  // wildcard of the same class.
  function snap() {
    const used = new Uint8Array(B.length);
    for (let i = 0; i < m.length; i++) if (m[i] >= 0) used[m[i]] = 1;
    for (let i = 0; i < m.length; i++) {
      const j = m[i];
      if (j < 0 || !isWild(A[i])) continue;
      const nx = i + 1 < m.length ? m[i + 1] : -1;
      if (nx > j + 1 && B[nx - 1] === A[i] && !used[nx - 1]) { used[j] = 0; m[i] = nx - 1; used[nx - 1] = 1; continue; }
      const pv = i > 0 ? m[i - 1] : -1;
      if (pv >= 0 && pv + 1 < j && B[pv + 1] === A[i] && !used[pv + 1] && !(nx === j + 1)) { used[j] = 0; m[i] = pv + 1; used[pv + 1] = 1; }
    }
  }
}
