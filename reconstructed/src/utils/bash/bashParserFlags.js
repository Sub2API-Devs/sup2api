/**
 * utils/bash/bashParserFlags.ts
 *
 * 2.1.316 新增：Bash 解析器相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-krkjw7dv.js (18)
 * attribution: placement 18
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-krkjw7dv.js:239-266 placement
var TENGU_TINGLY_PEARL = "tengu_tingly_pearl";
//@ chunk-krkjw7dv.js:266-340 placement
class o {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-krkjw7dv.js:340-352 placement
var n = new o();
//@ chunk-krkjw7dv.js:352-389 placement
function JCi(e) {
  return n.register(e);
}
/**
 * 读取 tengu_tingly_pearl 开关（默认开启，只有服务端明确关闭才关闭）。
 */
//@ chunk-krkjw7dv.js:389-531 placement
function isTinglyPearlEnabled() {
  let reader = n.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader(TENGU_TINGLY_PEARL, !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-krkjw7dv.js:531-543 placement
var u = new AsyncLocalStorage();
//@ chunk-krkjw7dv.js:543-636 placement
async function BIt(e, r) {
  let t = { off: e, fired: !1 };
  return { result: await u.run(t, r), fired: t.fired };
}
//@ chunk-krkjw7dv.js:636-686 placement
function Ndt(e) {
  return u.run({ off: !0, fired: !1 }, e);
}
//@ chunk-krkjw7dv.js:686-731 placement
function $dt() {
  return u.getStore()?.off === !0;
}
//@ chunk-krkjw7dv.js:731-781 placement
function KPn() {
  let store = u.getStore();
  if (store) store.fired = !0;
}
//@ chunk-krkjw7dv.js:781-801 placement
class d {
  reader = null;
}
//@ chunk-krkjw7dv.js:801-813 placement
var l = new d();
//@ chunk-krkjw7dv.js:813-840 placement
function QCi(e) {
  l.reader = e;
}
/**
 * 读取 tengu_foamy_heron 开关（默认开启，只有服务端明确关闭才关闭）。
 */
//@ chunk-krkjw7dv.js:840-1000 placement
function isFoamyHeronEnabled() {
  let reader = l.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader("tengu_foamy_heron", !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}
//@ chunk-krkjw7dv.js:1000-1074 placement
class f {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-krkjw7dv.js:1074-1086 placement
var s = new f();
//@ chunk-krkjw7dv.js:1086-1123 placement
function ZCi(e) {
  return s.register(e);
}
/**
 * 读取 tengu_calm_nautilus 开关（默认开启，只有服务端明确关闭才关闭）。
 */
//@ chunk-krkjw7dv.js:1123-1285 placement
function isCalmNautilusEnabled() {
  let reader = s.reader;
  if (!reader) return !0;
  try {
    let { value: r, source: source, defaultHost: defaultHost } = reader("tengu_calm_nautilus", !0);
    return r !== !1 || source !== "payload" || !defaultHost;
  } catch {
    return !0;
  }
}

export {
  isTinglyPearlEnabled,
  BIt,
  Ndt,
  ZCi,
  JCi,
  QCi,
  $dt,
  KPn,
  isCalmNautilusEnabled,
  isFoamyHeronEnabled,
};
