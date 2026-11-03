/**
 * utils/plugins/securityDefaultPlugin.ts
 *
 * 2.1.316 新增：执行时保护宿主拥有的环境变量不被改写；取环境变量（Windows 下忽略大小写）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (18)
 * attribution: placement 18
 */
import { OrderedListContext } from "../../components/ui/OrderedList.js";
import { SIGNED_CACHE_ROOTS, signedCacheMarker } from "../settings/policyCertificates.js";
import { getPlatform } from "../platform.js";
import { ge } from "../identity.js";

/**
 * 安全默认插件是否启用。
 */
//@ chunk-dcmhvw5a.js:187925-187959 placement
function isSecDefaultPluginEnabled() {
  return OrderedListContext(SIGNED_CACHE_ROOTS, signedCacheMarker());
}
/**
 * 取环境变量（Windows 下忽略大小写）。
 */
//@ chunk-dcmhvw5a.js:187959-188120 placement
function getEnvCaseInsensitive(e, n) {
  if (n in e) return e[n];
  if (getPlatform() !== "windows") return;
  let found = Object.keys(e).find((s) => s.toUpperCase() === n.toUpperCase());
  return found === void 0 ? void 0 : e[found];
}
//@ chunk-dcmhvw5a.js:188120-188144 placement
function wb(e) {
  return e;
}
//@ chunk-dcmhvw5a.js:188144-188168 placement
function Yd(e) {
  return e;
}
//@ chunk-dcmhvw5a.js:188168-188202 placement
var wt = ge(new Map(), (e) => e.clear());
//@ chunk-dcmhvw5a.js:188202-188274 placement
function Vr(e) {
  let n = Yd(e);
  return [...wt].filter(([, r]) => Yd(r.name) === n);
}
//@ chunk-dcmhvw5a.js:188274-188343 placement
function Xd(e, n) {
  for (let [r, s] of Vr(e)) if (dn(s.name) === n) wt.delete(r);
}
//@ chunk-dcmhvw5a.js:188343-188385 placement
var Kt = ge({ isOpen: !1 }, (e) => {
  e.isOpen = !1;
});
//@ chunk-dcmhvw5a.js:188385-188422 placement
function dn(e) {
  return process.env[e];
}
//@ chunk-dcmhvw5a.js:188422-188500 placement
function Jd(e, n) {
  if (n === void 0) {
    delete process.env[e];
    return;
  }
  process.env[e] = n;
}
//@ chunk-dcmhvw5a.js:188500-188544 placement
function qd(e) {
  return dn(e.name) === e.theirs;
}
//@ chunk-dcmhvw5a.js:188544-188613 placement
function Zd() {
  let e = [...wt.values()];
  return Kt.isOpen ? e : e.filter(qd);
}
/**
 * 记录宿主环境变量写入前的值，返回登记写入者的回调。
 */
//@ chunk-dcmhvw5a.js:188613-188856 placement
function snapshotHostEnvVar(e, n) {
  let r = wb(e);
  for (let [a, c] of Kt.isOpen ? [] : Vr(e)) if (!qd(c)) wt.delete(a);
  let s = wt.get(r) ?? { name: e, before: dn(e) };
  return () => {
    wt.set(r, { ...s, theirs: void 0, writer: n });
    for (let [a, c] of Vr(e)) wt.set(a, { ...c, theirs: dn(c.name), writer: n });
  };
}
//@ chunk-dcmhvw5a.js:188856-188896 placement
function Oxi(e) {
  return () => {
    Xd(e, dn(e));
  };
}
//@ chunk-dcmhvw5a.js:188896-188987 placement
function Mxi(e) {
  if (Kt.isOpen) return;
  for (let [n, r] of Object.entries(e)) if (r !== void 0) Xd(n, r);
}
/**
 * 宿主拥有的环境变量名列表。
 */
//@ chunk-dcmhvw5a.js:188987-189031 placement
function hostOwnedEnvNames() {
  return Zd().map((e) => e.name);
}
/**
 * 执行时保护宿主拥有的环境变量不被改写。
 */
//@ chunk-dcmhvw5a.js:189031-189317 placement
function withHostOwnedEnvGuard(e, n) {
  if (Kt.isOpen) return e();
  let r = Zd();
  if (r.length === 0) return e();
  let filtered = r.filter((a) => a.writer === void 0 || n === void 0 || !n(a.writer));
  for (let a = filtered.length - 1; a >= 0; a--) Jd(filtered[a].name, filtered[a].before);
  Kt.isOpen = !0;
  try {
    return e();
  } finally {
    for (let a of filtered) Jd(a.name, a.theirs);
    Kt.isOpen = !1;
  }
}
/**
 * 安全默认插件名 cc-plugin-sec-default。
 */
//@ chunk-dcmhvw5a.js:189317-189349 placement
var SEC_DEFAULT_PLUGIN_NAME = "cc-plugin-sec-default";

export {
  getEnvCaseInsensitive,
  hostOwnedEnvNames,
  isSecDefaultPluginEnabled,
  SEC_DEFAULT_PLUGIN_NAME,
  withHostOwnedEnvGuard,
  Oxi,
  snapshotHostEnvVar,
  Mxi,
};
