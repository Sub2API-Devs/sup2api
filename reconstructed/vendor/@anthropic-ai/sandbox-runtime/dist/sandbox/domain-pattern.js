/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-078pp0rm.js (13)
 * attribution: esm-fingerprint 13
 */
import { isIP, isIP as isIP_2, isIP as isIP_3 } from "net";
import { JF, W$e } from "./parent-proxy.js";

//@ chunk-078pp0rm.js:7450-7514 esm-fingerprint
function v(e) {
  let index = e.indexOf("%");
  return index === -1 ? e : e.slice(0, index);
}
//@ chunk-078pp0rm.js:7514-8073 esm-fingerprint
function Iie(e) {
  if (e.startsWith("[")) {
    let index = e.indexOf("]");
    if (index === -1) return { hostPattern: e, port: void 0 };
    let o = v(e.slice(1, index)),
      i = JF(o) ?? o,
      sliced = e.slice(index + 1);
    if (sliced === "") return { hostPattern: i, port: void 0 };
    let s = T(sliced.startsWith(":") ? sliced.slice(1) : "");
    return s === void 0 ? { hostPattern: e, port: void 0 } : { hostPattern: i, port: s };
  }
  let index = e.lastIndexOf(":");
  if (index === -1) return { hostPattern: e, port: void 0 };
  if (e.indexOf(":") !== index) {
    let n = v(e);
    return { hostPattern: JF(n) ?? n, port: void 0 };
  }
  let r = T(e.slice(index + 1));
  if (r === void 0) return { hostPattern: e, port: void 0 };
  return { hostPattern: e.slice(0, index), port: r };
}
//@ chunk-078pp0rm.js:8073-8166 esm-fingerprint
function T(e) {
  if (!/^[1-9][0-9]{0,4}$/.test(e)) return;
  let t = Number(e);
  return t > 65535 ? void 0 : t;
}
/**
 * 主机串是否可作为网络白名单域名（localhost、IPv6、合法域名）。与插件无关，见 lead 建议。
 */
//@ chunk-078pp0rm.js:8166-8553 esm-fingerprint
function N3r(e) {
  if (isIP(e) === 6) return !0;
  if (e.includes("://") || e.includes("/") || e.includes(":")) return !1;
  if (e === "localhost") return !0;
  if (e.startsWith("*.")) {
    let sliced = e.slice(2);
    if (!sliced.includes(".") || sliced.startsWith(".") || sliced.endsWith(".")) return !1;
    let parts = sliced.split(".");
    return parts.length >= 2 && parts.every((n) => n.length > 0);
  }
  if (e.includes("*")) return !1;
  return e.includes(".") && !e.startsWith(".") && !e.endsWith(".");
}
//@ chunk-078pp0rm.js:8553-8815 esm-fingerprint
var $3r =
  'Invalid domain pattern. Must be a valid domain (e.g., "example.com"), a wildcard (e.g., "*.example.com"), or a bracketed IPv6 literal (e.g., "[::1]", "[2001:db8::1]:443"). Overly broad patterns like "*.com" or "*" are not allowed for security reasons.';
//@ chunk-078pp0rm.js:8815-8912 esm-fingerprint
function y8o(e) {
  let index = e.indexOf(":");
  return !(index !== -1 && e.indexOf(":", index + 1) !== -1) || e.startsWith("[");
}
//@ chunk-078pp0rm.js:8912-8967 esm-fingerprint
function isr(e) {
  return y8o(e) && N3r(Iie(e).hostPattern);
}
//@ chunk-078pp0rm.js:8967-9053 esm-fingerprint
var asr = $3r + ' An optional ":port" suffix (1-65535) restricts the entry to that port.';
//@ chunk-078pp0rm.js:9053-9161 esm-fingerprint
function _8o(e) {
  return e.flatMap((t) => {
    let { hostPattern: hostPattern, port: port } = Iie(t);
    return isIP(hostPattern) ? [{ range: hostPattern, port: port }] : [];
  });
}
//@ chunk-078pp0rm.js:9161-9203 esm-fingerprint
function Awn(e) {
  return Iie(e).hostPattern;
}
//@ chunk-078pp0rm.js:9203-9395 esm-fingerprint
function Got(e, t) {
  let lower = e.toLowerCase();
  if (t === "*") return !0;
  if (t.startsWith("*.")) {
    if (isIP(W$e(lower))) return !1;
    let lower_2 = t.substring(2).toLowerCase();
    return lower.endsWith("." + lower_2);
  }
  return lower === t.toLowerCase();
}
//@ chunk-078pp0rm.js:9395-9494 esm-fingerprint
function lsr(e, t, r) {
  let { hostPattern: hostPattern, port: port } = Iie(r);
  if (port !== void 0 && port !== t) return !1;
  return Got(e, hostPattern);
}
//@ chunk-078pp0rm.js:9494-9729 esm-fingerprint
function Iqt(e, t) {
  let mapped = t.map(Awn);
  if (!e.startsWith("*.")) return mapped.some((o) => Got(e, o));
  let lower = e.slice(2).toLowerCase();
  return mapped.some((o) => {
    if (!o.startsWith("*.")) return !1;
    let lower_2 = o.slice(2).toLowerCase();
    return lower === lower_2 || lower.endsWith("." + lower_2);
  });
}

export { Iie, Iqt, _8o, isr, asr, lsr, Got, Awn, N3r, $3r, y8o };
