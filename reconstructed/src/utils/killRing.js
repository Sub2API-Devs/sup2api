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
import { init_react_production, qt, y, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-vqdzctzh.js:304-308 placement
init_react_production();
//@ chunk-vqdzctzh.js:308-348 placement
var MAX_KILL_RING_SIZE = 10;
var INITIAL_KILL_RING_STATE = {
  ring: [],
  mode: {
    type: "idle",
  },
};
//@ chunk-vqdzctzh.js:348-1065 placement
function killRingReducer(state, i) {
  switch (i.type) {
    case "kill": {
      if (i.text.length === 0)
        return state.mode.type === "idle"
          ? state
          : {
              ...state,
              mode: {
                type: "idle",
              },
            };
      return {
        ring:
          state.mode.type === "killing" && state.ring.length > 0
            ? [
                i.direction === "prepend" ? i.text + state.ring[0] : state.ring[0] + i.text,
                ...state.ring.slice(1),
              ]
            : [i.text, ...state.ring].slice(0, MAX_KILL_RING_SIZE),
        mode: {
          type: "killing",
        },
      };
    }
    case "yank":
      return {
        ...state,
        mode: {
          type: "yanked",
          start: i.start,
          length: i.length,
          index: 0,
        },
      };
    case "yankPop": {
      if (state.mode.type !== "yanked" || state.ring.length <= 1) return state;
      let index = (state.mode.index + 1) % state.ring.length;
      return {
        ...state,
        mode: {
          ...state.mode,
          index,
        },
      };
    }
    case "updateYankLength":
      if (state.mode.type !== "yanked") return state;
      return {
        ...state,
        mode: {
          ...state.mode,
          length: i.length,
        },
      };
    case "interrupt":
      if (state.mode.type === "idle") return state;
      return {
        ...state,
        mode: {
          type: "idle",
        },
      };
  }
}
//@ chunk-vqdzctzh.js:1065-1102 placement
/**
 * 取 kill ring 顶部的一项（空时返回空串）。
 */
function topOfKillRing(state) {
  return state.ring[0] ?? "";
}
//@ chunk-vqdzctzh.js:1102-1281 placement
/**
 * Yank-pop：在刚粘贴的位置换成 kill ring 中的下一项，不可用时为 null。
 */
function nextYankPop(state) {
  if (state.mode.type !== "yanked" || state.ring.length <= 1) return null;
  let i = (state.mode.index + 1) % state.ring.length;
  let { start, length: t } = state.mode;
  return {
    text: state.ring[i] ?? "",
    start,
    length: t,
  };
}
//@ chunk-vqdzctzh.js:1281-1356 placement = getOrBind (0.668)
/**
 * 最小 reducer 容器：{state, dispatch(action)}。
 */
function createReducerStore() {
  let state = INITIAL_KILL_RING_STATE;
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
var killRingContext = qt(null);
//@ chunk-vqdzctzh.js:1371-1609 placement
/**
 * 提供 kill ring 存储的 React Provider（可传入外部句柄，否则自建）。
 */
function KillRingProvider(props) {
  let t = w(5);
  let { handle, children } = props;
  let p;
  if (t[0] !== handle) {
    p = () => handle ?? createReducerStore();
    t[0] = handle;
    t[1] = p;
  } else p = t[1];
  let [x] = y(p);
  const value = handle ?? x;
  let u;
  if (t[2] !== children || t[3] !== value) {
    u = jsxProd_default(killRingContext.Provider, {
      value,
      children,
    });
    t[2] = children;
    t[3] = value;
    t[4] = u;
  } else u = t[4];
  return u;
}
//@ chunk-vqdzctzh.js:1609-1785 placement
function useKillRing() {
  let n = Se(killRingContext);
  if (!n) {
    throw ReferenceError(
      "useKillRing cannot be called outside of a <KillRingProvider /> (mounted around every Ink root by src/ink.ts)",
    );
  }
  return n;
}
export { useKillRing, topOfKillRing, nextYankPop, KillRingProvider, createReducerStore };
