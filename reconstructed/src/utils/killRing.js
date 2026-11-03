/**
 * utils/killRing.ts
 *
 * 输入框 kill ring（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vqdzctzh.js (9)
 * attribution: placement 9
 */
import { j, qt, y, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-vqdzctzh.js:304-308 placement
j();
//@ chunk-vqdzctzh.js:308-348 placement
var c = 10,
  a = { ring: [], mode: { type: "idle" } };
//@ chunk-vqdzctzh.js:348-1065 placement
function killRingReducer(n, i) {
  switch (i.type) {
    case "kill": {
      if (i.text.length === 0) return n.mode.type === "idle" ? n : { ...n, mode: { type: "idle" } };
      return {
        ring:
          n.mode.type === "killing" && n.ring.length > 0
            ? [i.direction === "prepend" ? i.text + n.ring[0] : n.ring[0] + i.text, ...n.ring.slice(1)]
            : [i.text, ...n.ring].slice(0, c),
        mode: { type: "killing" },
      };
    }
    case "yank":
      return { ...n, mode: { type: "yanked", start: i.start, length: i.length, index: 0 } };
    case "yankPop": {
      if (n.mode.type !== "yanked" || n.ring.length <= 1) return n;
      let r = (n.mode.index + 1) % n.ring.length;
      return { ...n, mode: { ...n.mode, index: r } };
    }
    case "updateYankLength":
      if (n.mode.type !== "yanked") return n;
      return { ...n, mode: { ...n.mode, length: i.length } };
    case "interrupt":
      if (n.mode.type === "idle") return n;
      return { ...n, mode: { type: "idle" } };
  }
}
//@ chunk-vqdzctzh.js:1065-1102 placement
function egt(n) {
  return n.ring[0] ?? "";
}
/**
 * Yank-pop：在刚粘贴的位置换成 kill ring 中的下一项，不可用时为 null。
 */
//@ chunk-vqdzctzh.js:1102-1281 placement
function nextYankPop(n) {
  if (n.mode.type !== "yanked" || n.ring.length <= 1) return null;
  let i = (n.mode.index + 1) % n.ring.length,
    { start: start, length: t } = n.mode;
  return { text: n.ring[i] ?? "", start: start, length: t };
}
/**
 * 最小 reducer 容器：{state, dispatch(action)}。
 */
//@ chunk-vqdzctzh.js:1281-1356 placement = getOrBind (0.668)
function createReducerStore() {
  let state = a;
  return {
    get state() {
      return state;
    },
    dispatch(i) {
      state = killRingReducer(state, i);
    },
  };
}
//@ chunk-vqdzctzh.js:1356-1371 placement
var l = qt(null);
/**
 * 提供 kill ring 存储的 React Provider（可传入外部句柄，否则自建）。
 */
//@ chunk-vqdzctzh.js:1371-1609 placement
function KillRingProvider(n) {
  let t = w(5),
    { handle: handle, children: children } = n,
    p;
  if (t[0] !== handle) ((p = () => handle ?? createReducerStore()), (t[0] = handle), (t[1] = p));
  else p = t[1];
  let [x] = y(p);
  const d = handle ?? x;
  let u;
  if (t[2] !== children || t[3] !== d)
    ((u = e(l.Provider, { value: d, children: children })), (t[2] = children), (t[3] = d), (t[4] = u));
  else u = t[4];
  return u;
}
//@ chunk-vqdzctzh.js:1609-1785 placement
function useKillRing() {
  let n = Se(l);
  if (!n) {
    throw ReferenceError(
      "useKillRing cannot be called outside of a <KillRingProvider /> (mounted around every Ink root by src/ink.ts)",
    );
  }
  return n;
}

export { useKillRing, egt, nextYankPop, KillRingProvider, createReducerStore };
