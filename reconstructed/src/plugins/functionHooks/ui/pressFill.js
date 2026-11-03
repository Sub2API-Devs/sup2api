/**
 * plugins/functionHooks/ui/pressFill.ts
 *
 * ui.press 填充遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
} from "async_hooks";
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
} from "util";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-s61vbvea.js:598779-598875 placement
function Pei(e, n, r) {
  let s = n === void 0 ? void 0 : e.get(n);
  return s?.environmentId === r ? s.press : void 0;
}
//@ chunk-s61vbvea.js:598875-598945 placement
function Iei(e, n) {
  for (let [r, s] of e) if (s.environmentId === n) e.delete(r);
}
//@ chunk-s61vbvea.js:598994-599009 placement
var kKt = new AsyncLocalStorage_4();
/**
 * 若在按键上下文中，记录某分发对应的按键（尚未作答）。
 */
//@ chunk-s61vbvea.js:599009-599113 placement
function notePressDispatch(e, n, r) {
  let store = kKt.getStore();
  if (store !== void 0) e.set(n, { environmentId: r, press: store, isAnswered: !1 });
}
//@ chunk-s61vbvea.js:599113-599170 placement
function wE(e, n) {
  return e?.clientId === n ? e.pressId : void 0;
}
/**
 * 标记某分发的按键已作答，并删除同环境中更早的已作答记录。
 */
//@ chunk-s61vbvea.js:599170-599406 placement
function markPressAnswered(e, n) {
  let r = e.get(n);
  if (r === void 0) return;
  e.set(n, { ...r, isAnswered: !0 });
  let mapped = [...e].filter(([, y]) => y.isAnswered && y.environmentId === r.environmentId).map(([y]) => y),
    max = Math.max(...mapped);
  for (let y of mapped.filter((S) => S < max)) e.delete(y);
}
/**
 * （归属疑误：插件函数 hooks）取 press 填充并记录 plugin_function_hooks_press_fill 结果。
 */
//@ chunk-s61vbvea.js:599406-599610 placement
function logPressFill(e, n) {
  let r = wE(e, n);
  if (r !== void 0) logFeatureOk("plugin_function_hooks_press_fill");
  if (e !== void 0 && r === void 0)
    logFeatureSad("plugin_function_hooks_press_fill", e.clientId === void 0 ? "no_client" : "other_client");
  return r;
}
//@ chunk-s61vbvea.js:599652-599735 placement
var Qj = (e, n, r) => ({
  ...r,
  run: (s, ...h) => kKt.run(isDeepStrictEqual_3(s, n) ? e : void 0, () => r.run(s, ...h)),
});

export { Pei, logPressFill, Iei, notePressDispatch, kKt, markPressAnswered, Qj };
