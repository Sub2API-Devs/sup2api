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
/**
 * 生成「按函数更新某切片字段」的设置器。
 */
function setSliceField(setAppState, e) {
  return (r) => setAppState((S) => withFieldValue(S, e, S[e], r(S[e])));
}
//@ chunk-2mbp91tg.js:283-367 placement
/**
 * 生成「把补丁对象合并进状态」的设置器。
 */
function mergeSlicePatch(setState) {
  return (e) =>
    setState((r) => {
      let S = e(r);
      return Object.is(S, r)
        ? r
        : {
            ...r,
            ...S,
          };
    });
}
//@ chunk-2mbp91tg.js:367-484 placement
/**
 * 把存储包装为切片存储接口（getSnapshot、getState、setState、subscribe）。
 */
function toSliceStore(t) {
  return {
    getSnapshot: t.getSnapshot,
    getState: t.getState,
    setState: mergeSlicePatch(t.setState),
    subscribe: t.subscribe,
  };
}
//@ chunk-2mbp91tg.js:484-539 placement
/**
 * 为状态中的字段创建 get/set 访问器。
 */
function fieldAccessor(t, setAppState, r) {
  return {
    get: () => t()[r],
    set: setSliceField(setAppState, r),
  };
}
//@ chunk-2mbp91tg.js:539-646 placement
/**
 * 为状态中的某个字段创建 get/set 访问器（字段缺失时用默认值，set 以更新函数写回）。
 */
function createFieldAccessor(t, e) {
  return (r, S) => ({
    get: () => r()[t] ?? e,
    set: (a) =>
      S((s) => {
        let n = s[t] ?? e;
        return withFieldValue(s, t, n, a(n));
      }),
  });
}
//@ chunk-2mbp91tg.js:646-706 placement
/**
 * 创建只存在闭包里的可读写槽。
 */
function localValueSlot(t) {
  let e = t;
  return {
    get: () => e,
    set: (r) => {
      e = r(e);
    },
  };
}
//@ chunk-2mbp91tg.js:962-1019 placement
/**
 * 值未变时返回原对象，否则写回该字段。
 */
function withFieldValue(t, e, r, S) {
  return Object.is(S, r)
    ? t
    : {
        ...t,
        [e]: S,
      };
}
export { createFieldAccessor, localValueSlot, fieldAccessor, setSliceField, toSliceStore, mergeSlicePatch };
