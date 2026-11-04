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
import {
  init_react_production,
  createContext,
  useState,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
function killRingReducer(state, action) {
  switch (action.type) {
    case "kill": {
      if (action.text.length === 0)
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
                action.direction === "prepend" ? action.text + state.ring[0] : state.ring[0] + action.text,
                ...state.ring.slice(1),
              ]
            : [action.text, ...state.ring].slice(0, MAX_KILL_RING_SIZE),
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
          start: action.start,
          length: action.length,
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
          length: action.length,
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
  let nextIndex = (state.mode.index + 1) % state.ring.length;
  let { start, length } = state.mode;
  return {
    text: state.ring[nextIndex] ?? "",
    start,
    length,
  };
}
//@ chunk-vqdzctzh.js:1281-1356 placement (2.1.88 match: getOrBind, 0.668)
/**
 * 最小 reducer 容器：{state, dispatch(action)}。
 */
function createReducerStore() {
  let state = INITIAL_KILL_RING_STATE;
  return {
    get state() {
      return state;
    },
    dispatch(action) {
      state = killRingReducer(state, action);
    },
  };
}
//@ chunk-vqdzctzh.js:1356-1371 placement
var killRingContext = createContext(null);
//@ chunk-vqdzctzh.js:1371-1609 placement
/**
 * 提供 kill ring 存储的 React Provider（可传入外部句柄，否则自建）。
 */
function KillRingProvider(props) {
  let $ = useMemoCache(5);
  let { handle, children } = props;
  let createStore;
  if ($[0] !== handle) {
    createStore = () => handle ?? createReducerStore();
    $[0] = handle;
    $[1] = createStore;
  } else createStore = $[1];
  let [defaultStore] = useState(createStore);
  const value = handle ?? defaultStore;
  let element;
  if ($[2] !== children || $[3] !== value) {
    element = jsxProd_default(killRingContext.Provider, {
      value,
      children,
    });
    $[2] = children;
    $[3] = value;
    $[4] = element;
  } else element = $[4];
  return element;
}
//@ chunk-vqdzctzh.js:1609-1785 placement
function useKillRing() {
  let context = useContext(killRingContext);
  if (!context) {
    throw ReferenceError(
      "useKillRing cannot be called outside of a <KillRingProvider /> (mounted around every Ink root by src/ink.ts)",
    );
  }
  return context;
}
export { useKillRing, topOfKillRing, nextYankPop, KillRingProvider, createReducerStore };
