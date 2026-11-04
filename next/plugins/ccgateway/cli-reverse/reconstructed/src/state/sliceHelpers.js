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
function setSliceField(setAppState, field) {
  return (updater) =>
    setAppState((state) => withFieldValue(state, field, state[field], updater(state[field])));
}
//@ chunk-2mbp91tg.js:283-367 placement
/**
 * 生成「把补丁对象合并进状态」的设置器。
 */
function mergeSlicePatch(setState) {
  return (patch) =>
    setState((state) => {
      let next = patch(state);
      return Object.is(next, state)
        ? state
        : {
            ...state,
            ...next,
          };
    });
}
//@ chunk-2mbp91tg.js:367-484 placement
/**
 * 把存储包装为切片存储接口（getSnapshot、getState、setState、subscribe）。
 */
function toSliceStore(store) {
  return {
    getSnapshot: store.getSnapshot,
    getState: store.getState,
    setState: mergeSlicePatch(store.setState),
    subscribe: store.subscribe,
  };
}
//@ chunk-2mbp91tg.js:484-539 placement
/**
 * 为状态中的字段创建 get/set 访问器。
 */
function fieldAccessor(readState, setAppState, field) {
  return {
    get: () => readState()[field],
    set: setSliceField(setAppState, field),
  };
}
//@ chunk-2mbp91tg.js:539-646 placement
/**
 * 为状态中的某个字段创建 get/set 访问器（字段缺失时用默认值，set 以更新函数写回）。
 */
function createFieldAccessor(field, defaultValue) {
  return (readState, setAppState) => ({
    get: () => readState()[field] ?? defaultValue,
    set: (update) =>
      setAppState((state) => {
        let current = state[field] ?? defaultValue;
        return withFieldValue(state, field, current, update(current));
      }),
  });
}
//@ chunk-2mbp91tg.js:646-706 placement
/**
 * 创建只存在闭包里的可读写槽。
 */
function localValueSlot(initialValue) {
  let value = initialValue;
  return {
    get: () => value,
    set: (update) => {
      value = update(value);
    },
  };
}
//@ chunk-2mbp91tg.js:962-1019 placement
/**
 * 值未变时返回原对象，否则写回该字段。
 */
function withFieldValue(state, field, previousValue, nextValue) {
  return Object.is(nextValue, previousValue)
    ? state
    : {
        ...state,
        [field]: nextValue,
      };
}
export { createFieldAccessor, localValueSlot, fieldAccessor, setSliceField, toSliceStore, mergeSlicePatch };
