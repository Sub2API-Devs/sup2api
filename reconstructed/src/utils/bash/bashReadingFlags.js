/**
 * utils/bash/bashReadingFlags.ts
 *
 * 2.1.316 新增：Bash 命令读取相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xjt4a4zb.js (27)
 * attribution: placement 27
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-xjt4a4zb.js:191-265 placement
class o {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-xjt4a4zb.js:265-277 placement
var n = new o();
//@ chunk-xjt4a4zb.js:277-314 placement
function _Ci(e) {
  return n.register(e);
}
//@ chunk-xjt4a4zb.js:314-473 placement
function isWarmSunriseEnabled() {
  let reader = n.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader("tengu_warm_sunrise", !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-xjt4a4zb.js:473-511 placement
function lyr(e) {
  return e !== "-rm" || isWarmSunriseEnabled();
}
//@ chunk-xjt4a4zb.js:511-585 placement
class d {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-xjt4a4zb.js:585-597 placement
var s = new d();
//@ chunk-xjt4a4zb.js:597-634 placement
function bCi(e) {
  return s.register(e);
}
//@ chunk-xjt4a4zb.js:634-775 placement
function isFlagOnByDefault(e) {
  let reader = s.reader;
  if (!reader) return !0;
  try {
    let { value: a, source: source, defaultHost: defaultHost } = reader(e, !0);
    return a !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-xjt4a4zb.js:775-820 placement
function SCi() {
  return isFlagOnByDefault("tengu_vast_puddle");
}
//@ chunk-xjt4a4zb.js:820-866 placement
function wCi() {
  return isFlagOnByDefault("tengu_snappy_tower");
}
//@ chunk-xjt4a4zb.js:866-940 placement
class i {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-xjt4a4zb.js:940-952 placement
var c = new i();
//@ chunk-xjt4a4zb.js:952-989 placement
function ECi(e) {
  return c.register(e);
}
/**
 * 读取 tengu_staged_pumpkin 开关（默认开启，只有服务端明确关闭才关闭）。
 */
//@ chunk-xjt4a4zb.js:989-1152 placement
function isStagedPumpkinEnabled() {
  let reader = c.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader("tengu_staged_pumpkin", !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-xjt4a4zb.js:1200-1228 placement
var TENGU_NESTED_RIPPLE = "tengu_nested_ripple";
//@ chunk-xjt4a4zb.js:1228-1302 placement
class p {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-xjt4a4zb.js:1302-1314 placement
var R = new p();
//@ chunk-xjt4a4zb.js:1314-1351 placement
function vCi(e) {
  return R.register(e);
}
/**
 * 读取 tengu_nested_ripple 开关（默认开启，只有服务端明确关闭才关闭）。
 */
//@ chunk-xjt4a4zb.js:1351-1493 placement
function isNestedRippleEnabled() {
  let reader = R.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader(TENGU_NESTED_RIPPLE, !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-xjt4a4zb.js:1493-1505 placement
var t = new AsyncLocalStorage();
/**
 * 在"读取拒绝"计数上下文中运行函数，返回结果与本次新增的第一个拒绝原因。
 */
//@ chunk-xjt4a4zb.js:1505-1649 placement
async function runWithReadingRefusals(e) {
  let r = t.getStore() ?? { reading: "refuse", refusals: 0 },
    refusals = r.refusals;
  return [await t.run(r, e), r.refusals > refusals ? r.firstReason : void 0];
}
/**
 * 在拒绝模式下记录一次读取拒绝及第一个原因。
 */
//@ chunk-xjt4a4zb.js:1649-1752 placement
function recordReadingRefusal(e) {
  let store = t.getStore();
  if (store !== void 0 && store.reading === "refuse") ((store.refusals += 1), (store.firstReason ??= e));
}
//@ chunk-xjt4a4zb.js:1752-1816 placement
function DIt(e) {
  return t.run({ reading: "rule off", refusals: 0 }, e);
}
//@ chunk-xjt4a4zb.js:1816-1888 placement
function bcs(e) {
  return t.run({ reading: "as bash reads it", refusals: 0 }, e);
}
//@ chunk-xjt4a4zb.js:1888-1977 placement
function ACi() {
  let e = t.getStore()?.reading;
  return e === "rule off" || e === "as bash reads it";
}
//@ chunk-xjt4a4zb.js:1977-2042 placement
function gso() {
  return t.getStore()?.reading === "as bash reads it";
}

export {
  wCi,
  SCi,
  gso,
  isNestedRippleEnabled,
  ACi,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  lyr,
  runWithReadingRefusals,
  bcs,
  DIt,
  _Ci,
  bCi,
  ECi,
  vCi,
};
