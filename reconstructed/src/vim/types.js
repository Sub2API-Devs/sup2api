/**
 * vim/types.ts
 *
 * 并入旧版已有路径：vim 类型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/types.ts
 * pieces: chunk-530hfzwb.js (8)
 * attribution: fingerprint 4, layout 3, placement 1
 */
import { applySingleMotion } from "./motions.js";

/**
 * 操作符键到操作名：d→delete、c→change、y→yank。
 */
//@ chunk-530hfzwb.js:2992-3032 fingerprint = OPERATORS (1)
var OPERATORS = { d: "delete", c: "change", y: "yank" };
//@ chunk-530hfzwb.js:3032-3062 layout
function isOperatorKey(e) {
  return e in OPERATORS;
}
/**
 * vim 键集合：BACKSPACE_KEY（\b，作左移）；SIMPLE_MOTIONS（h l 空格 退格 j k w b e W B E 0 ^ $ %）；CHAR_MOTIONS（h l 空格 退格，按字符移动）；FIND_KEYS（f F t T）；TEXT_OBJ_SCOPES（i→inner、a→around）。
 */
//@ chunk-530hfzwb.js:3062-3233 fingerprint = TEXT_OBJ_SCOPES (1)
var BACKSPACE_KEY = "\b",
  SIMPLE_MOTIONS = new Set([
    "h",
    "l",
    " ",
    BACKSPACE_KEY,
    "j",
    "k",
    "w",
    "b",
    "e",
    "W",
    "B",
    "E",
    "0",
    "^",
    "$",
    "%",
  ]),
  CHAR_MOTIONS = new Set(["h", "l", " ", BACKSPACE_KEY]),
  FIND_KEYS = new Set(["f", "F", "t", "T"]),
  TEXT_OBJ_SCOPES = { i: "inner", a: "around" };
//@ chunk-530hfzwb.js:3233-3263 layout
function isTextObjScopeKey(e) {
  return e in TEXT_OBJ_SCOPES;
}
/**
 * 支持的文本对象类型（w W " ' ` ( ) b [ ] { } B < >）；计数上限 10000。
 */
//@ chunk-530hfzwb.js:3263-3348 layout
var TEXT_OBJ_TYPES = new Set(["w", "W", '"', "'", "`", "(", ")", "b", "[", "]", "{", "}", "B", "<", ">"]),
  MAX_VIM_COUNT = 1e4;
/**
 * vim 初始状态：INSERT 模式、已插入文本为空。
 */
//@ chunk-530hfzwb.js:3348-3400 fingerprint = createInitialVimState (1)
function createInitialVimState() {
  return { mode: "INSERT", insertedText: "" };
}
/**
 * 跨命令持久状态：上次 f/F/t/T 查找、寄存器内容、寄存器是否整行。
 */
//@ chunk-530hfzwb.js:3400-3470 fingerprint = createInitialPersistentState (0.829)
function createInitialPersistentState() {
  return { lastFind: null, register: "", registerIsLinewise: !1 };
}
/**
 * 重复 count 次基础移动，移动不动时提前停止（% 带计数不移动）。
 */
//@ chunk-530hfzwb.js:3470-3592 placement
function resolveMotion(e, t, r) {
  if (e === "%" && r !== 1) return t;
  let n = t;
  for (let s = 0; s < r; s++) {
    let o = applySingleMotion(e, n);
    if (o.equals(n)) break;
    n = o;
  }
  return n;
}

export {
  BACKSPACE_KEY,
  resolveMotion,
  CHAR_MOTIONS,
  isOperatorKey,
  OPERATORS,
  FIND_KEYS,
  isTextObjScopeKey,
  TEXT_OBJ_SCOPES,
  TEXT_OBJ_TYPES,
  SIMPLE_MOTIONS,
  MAX_VIM_COUNT,
  createInitialVimState,
  createInitialPersistentState,
};
