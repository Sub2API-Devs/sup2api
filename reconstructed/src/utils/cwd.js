/**
 * utils/cwd.ts
 *
 * 当前工作目录（getCwd）与按调用临时覆盖 cwd（runWithCwdOverride，AsyncLocalStorage）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cwd.ts
 * pieces: chunk-2nmyajw8.js (2), chunk-aepeg2w5.js (9), chunk-fnk5kvbf.js (22), chunk-vk5xfx8n.js (5)
 * attribution: placement 36, callgraph-fingerprint 1, callgraph-witnessed 1
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
} from "async_hooks";
import { realpathSync } from "fs";
import { cwd } from "process";
import {
  isDiskless,
  setCwdState,
  getCwdState,
  getOriginalCwdOrNull,
  getOriginalCwd,
  getCloudCwd,
  onCloudCwdChange,
} from "../bootstrap/state.js";
import { realpathNativeLong, Rke } from "./fsJunctions.js";
import { wt, s, Yg } from "../remote/remoteMode.js";
import { Mn } from "./pathClassification.js";
import { cke } from "../bootstrap/sessionSlices.js";
import { Rlt } from "./turnAttributionKey.js";
import { ge } from "./identity.js";
import { j, yt } from "../../vendor/react/cjs/react.production.js";

//@ chunk-fnk5kvbf.js:2338-2400 placement
function fwr() {
  let e = getCurrentCallFrame();
  return e?.call === void 0 ? void 0 : e.cwd;
}
//@ chunk-fnk5kvbf.js:2400-2474 placement
function pwr(e) {
  let n = getCurrentCallFrame()?.call;
  return n === void 0 || (e !== !1 && n.physical === e);
}
//@ chunk-fnk5kvbf.js:2474-2561 placement
function CMi() {
  let e = getCurrentCallFrame()?.call;
  return e?.recoversIfAlreadyGone === !0 && e.physical === null;
}
//@ chunk-fnk5kvbf.js:2561-2617 placement
async function o_s(e) {
  return isDiskless() ? void 0 : realPathOutcome(await realpathNativeLong(e));
}
//@ chunk-fnk5kvbf.js:2617-2661 placement
function Ido(e) {
  return isDiskless() ? void 0 : realPathOutcome(Rke(e));
}
//@ chunk-fnk5kvbf.js:2661-2703 placement
function RMi(e) {
  return wt() ? e() : s.exit(e);
}
//@ chunk-fnk5kvbf.js:2703-2742 placement
function RDn(e, n) {
  return Yg(e ?? getCwd(), n);
}
//@ chunk-fnk5kvbf.js:2742-2793 placement
function xDn(e, n) {
  return e === null ? n() : RDn(e.cwd, n);
}
//@ chunk-fnk5kvbf.js:2793-2827 placement
function M$() {
  return getOutermostCallFrame() !== void 0;
}
/**
 * 设置当前工作目录：在调用帧链上逐层更新 cwd（及物理路径），没有调用帧时更新全局 cwd 状态。
 */
//@ chunk-fnk5kvbf.js:2827-2986 placement
function setCwdForCallChain(e) {
  let n = Mn(e),
    o = getCurrentCallFrame(),
    r = o?.call === void 0 ? void 0 : Ido(n);
  while (o?.call !== void 0) ((o.cwd = n), (o.call.physical = r), (o = skipFinishedCalls(o.call.outer)));
  if (o) o.cwd = n;
  else setCwdState(e);
}
//@ chunk-fnk5kvbf.js:2986-3023 placement
function PDn() {
  return getCurrentCallFrame()?.cwd ?? getCwdState();
}
//@ chunk-fnk5kvbf.js:3023-3095 placement
function gl() {
  if (getCurrentCallFrame()?.cwd === void 0 && getOriginalCwdOrNull() === null) return null;
  return getCwd();
}
/**
 * 当前工作目录：优先取按调用覆盖的 cwd（runWithCwdOverride），失败时回退会话原始 cwd；没有项目目录时原样抛出。
 */
//@ chunk-fnk5kvbf.js:3095-3179 callgraph-witnessed = getCwd (0)
function getCwd() {
  try {
    return PDn();
  } catch (error) {
    if (cke(error) && getOriginalCwdOrNull() === null) throw error;
    return getOriginalCwd();
  }
}
//@ chunk-fnk5kvbf.js:3179-3224 placement
function Odo() {
  return !M$() && wt() ? void 0 : getCwd();
}
//@ chunk-fnk5kvbf.js:3224-3256 placement
function Qut(e) {
  return getCloudCwd() ?? e;
}
//@ chunk-fnk5kvbf.js:3256-3291 placement
function a(e) {
  return M$() ? e : Qut(e);
}
//@ chunk-fnk5kvbf.js:3291-3321 placement
function mwr() {
  return a(getCwd());
}
//@ chunk-fnk5kvbf.js:3321-3396 placement
function xMi() {
  try {
    let e = gl();
    return e === null ? null : a(e);
  } catch {
    return null;
  }
}
/**
 * 沿 call.outer 跳过已结束（isOver）的调用帧。
 */
//@ chunk-fnk5kvbf.js:3396-3469 placement
function skipFinishedCalls(e) {
  let n = e;
  while (n?.call?.isOver === !0) n = n.call.outer;
  return n;
}
//@ chunk-fnk5kvbf.js:3469-3505 placement = getAgentContext (1)
function getCurrentCallFrame() {
  return skipFinishedCalls(s.getStore());
}
//@ chunk-fnk5kvbf.js:3505-3578 placement
function getOutermostCallFrame() {
  let e = getCurrentCallFrame();
  while (e?.call !== void 0) e = skipFinishedCalls(e.call.outer);
  return e;
}
//@ chunk-fnk5kvbf.js:3578-3715 placement
function realPathOutcome(e) {
  if (e.real !== void 0) return e.real;
  switch (e.code) {
    case "ENOENT":
      return null;
    case "EPERM":
    case "EACCES":
      return;
    default:
      return !1;
  }
}
/**
 * 一个存 {key} 的 AsyncLocalStorage，由 utils/cwd.ts 与 print 使用（看用法更像按调用链覆盖的 key，而不是代理上下文）。
 */
//@ chunk-aepeg2w5.js:852825-852839 placement = agentContextStorage (0)
var contextKeyStorage = new AsyncLocalStorage_3();
/**
 * 在给定 key 的 ALS 上下文中运行函数。
 */
//@ chunk-aepeg2w5.js:852839-852882 placement
function runWithContextKey(key, fn) {
  return contextKeyStorage.run({ key: key }, fn);
}
/**
 * 取当前 ALS 上下文的 key。
 */
//@ chunk-aepeg2w5.js:852882-852923 placement = getAgentContext (1)
function getContextKey() {
  return contextKeyStorage.getStore()?.key;
}
/**
 * 清空当前 ALS 上下文的 key。
 */
//@ chunk-aepeg2w5.js:852923-852976 placement = getAgentContext (1)
function clearContextKey() {
  let store = contextKeyStorage.getStore();
  if (store) store.key = void 0;
}
//@ chunk-aepeg2w5.js:852976-853069 placement
function pwd(e) {
  let store = contextKeyStorage.getStore(),
    r = zis(e.filter((s) => !s.isMeta));
  if (store && r !== void 0) store.key = r;
}
//@ chunk-aepeg2w5.js:853323-853418 placement
function zis(e) {
  return e.findLast((n) => Rlt(n.turnAttributionKey) !== void 0)?.turnAttributionKey;
}
//@ chunk-aepeg2w5.js:853590-853637 placement
var sEe = ge({ accepted: !1 }, (e) => {
  e.accepted = !1;
});
//@ chunk-aepeg2w5.js:853637-853652 placement
var bgr = new AsyncLocalStorage_2();
//@ chunk-aepeg2w5.js:853652-853777 callgraph-fingerprint = runWithCwdOverride (0.279)
function runWithCwdOverride(cwd, fn) {
  if (!("turnAttributionKey" in cwd)) cwd.turnAttributionKey = getContextKey();
  return bgr.run(cwd, () => runWithContextKey(cwd.turnAttributionKey, fn));
}
//@ chunk-vk5xfx8n.js:255-280 placement
function Fuo(n) {
  return n;
}
//@ chunk-vk5xfx8n.js:280-305 placement
function bks(n) {
  return n;
}
/**
 * 计算启动 cwd 的规范化键（解析真实路径）。
 */
//@ chunk-vk5xfx8n.js:305-471 placement
function initialCwdKey() {
  let n = "";
  if (typeof process < "u" && typeof process.cwd === "function" && typeof realpathSync === "function")
    try {
      let r = cwd();
      try {
        n = Fuo(bks(r));
      } catch {
        n = Fuo(r);
      }
    } catch {}
  return n;
}
/**
 * 进程启动时的 cwd（规范化键与原始 process.cwd()）。
 */
//@ chunk-vk5xfx8n.js:471-610 placement
var INITIAL_CWD_KEY = initialCwdKey(),
  oZt = (() => {
    if (typeof process > "u" || typeof process.cwd !== "function") return null;
    try {
      return process.cwd();
    } catch {
      return null;
    }
  })();
/**
 * 启动时的工作目录；后台会话（CLAUDE_CODE_SESSION_KIND=bg）返回 null。
 */
//@ chunk-vk5xfx8n.js:610-746 placement
function launchCwd() {
  if (oZt === null) return null;
  let envClaudeCodeSessionKind = process.env.CLAUDE_CODE_SESSION_KIND;
  return envClaudeCodeSessionKind !== void 0 && String(envClaudeCodeSessionKind).trim() === "bg" ? null : oZt;
}
//@ chunk-2nmyajw8.js:3234-3238 placement
j();
//@ chunk-2nmyajw8.js:3238-3280 placement
function useCwdDerived(o) {
  return yt(onCloudCwdChange, () => Qut(o));
}

export {
  getCwd,
  gl,
  runWithCwdOverride,
  M$,
  xDn,
  getContextKey,
  oZt,
  Qut,
  runWithContextKey,
  useCwdDerived,
  clearContextKey,
  setCwdForCallChain,
  bgr,
  pwd,
  RDn,
  getOutermostCallFrame,
  INITIAL_CWD_KEY,
  bks,
  xMi,
  mwr,
  PDn,
  launchCwd,
  fwr,
  Ido,
  pwr,
  o_s,
  CMi,
  RMi,
  getCurrentCallFrame,
  initialCwdKey,
  Fuo,
  Odo,
  zis,
};
