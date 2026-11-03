/**
 * state/sliceHelpers.ts
 *
 * 2.1.316 新增：状态切片辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2mbp91tg.js (7)
 * attribution: placement 7
 */

//@ chunk-2mbp91tg.js:227-283 placement
function BH(t, e) {
  return (r) => t((S) => c(S, e, S[e], r(S[e])));
}
//@ chunk-2mbp91tg.js:283-367 placement
function gCn(t) {
  return (e) =>
    t((r) => {
      let S = e(r);
      return Object.is(S, r) ? r : { ...r, ...S };
    });
}
/**
 * 把存储包装为切片存储接口（getSnapshot、getState、setState、subscribe）。
 */
//@ chunk-2mbp91tg.js:367-484 placement
function toSliceStore(t) {
  return {
    getSnapshot: t.getSnapshot,
    getState: t.getState,
    setState: gCn(t.setState),
    subscribe: t.subscribe,
  };
}
//@ chunk-2mbp91tg.js:484-539 placement
function wIe(t, e, r) {
  return { get: () => t()[r], set: BH(e, r) };
}
/**
 * 为状态中的某个字段创建 get/set 访问器（字段缺失时用默认值，set 以更新函数写回）。
 */
//@ chunk-2mbp91tg.js:539-646 placement
function createFieldAccessor(t, e) {
  return (r, S) => ({
    get: () => r()[t] ?? e,
    set: (a) =>
      S((s) => {
        let n = s[t] ?? e;
        return c(s, t, n, a(n));
      }),
  });
}
//@ chunk-2mbp91tg.js:646-706 placement
function KSi(t) {
  let e = t;
  return {
    get: () => e,
    set: (r) => {
      e = r(e);
    },
  };
}
//@ chunk-2mbp91tg.js:962-1019 placement
function c(t, e, r, S) {
  return Object.is(S, r) ? t : { ...t, [e]: S };
}

export { createFieldAccessor, KSi, wIe, BH, toSliceStore, gCn };
