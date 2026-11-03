/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/address.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-078pp0rm.js (14)
 * attribution: esm-fingerprint 11, esm-layout 3
 */
import { isIP, isIP as isIP_2, isIP as isIP_3, BlockList, BlockList as BlockList_2 } from "net";

//@ chunk-078pp0rm.js:407-437 esm-fingerprint
var u8o = ["127.0.0.0/8", "::1"];
//@ chunk-078pp0rm.js:437-502 esm-fingerprint
function E(e) {
  let t = isIP_3(e);
  return t === 4 ? "ipv4" : t === 6 ? "ipv6" : void 0;
}
//@ chunk-078pp0rm.js:502-836 esm-fingerprint
function f8o(e) {
  let index = e.indexOf("/"),
    r = h(index === -1 ? e : e.slice(0, index)),
    n = E(r);
  if (!n) return;
  let o = n === "ipv6" ? 128 : 32,
    i = o;
  if (index !== -1) {
    let sliced = e.slice(index + 1);
    if (!/^\d{1,3}$/.test(sliced) || Number(sliced) > o) return;
    i = Number(sliced);
  }
  let c = n === "ipv6" ? m(r) : void 0;
  if (c !== void 0) return i < 96 ? void 0 : { address: c, prefix: i - 96, family: "ipv4" };
  return { address: r, prefix: i, family: n };
}
//@ chunk-078pp0rm.js:836-951 esm-fingerprint
function Pqt(e, t) {
  let r = f8o(t);
  if (!r) return !1;
  try {
    e.addSubnet(r.address, r.prefix, r.family);
  } catch {
    return !1;
  }
  return !0;
}
//@ chunk-078pp0rm.js:951-1084 esm-fingerprint
function S(e) {
  let t = new BlockList_2();
  for (let r of e) if (!Pqt(t, r)) throw Error(`Invalid IP address or CIDR range: ${JSON.stringify(r)}`);
  return t;
}
//@ chunk-078pp0rm.js:1084-1152 esm-fingerprint
function CTt(e, t) {
  let r = h(t),
    n = E(r);
  return n !== void 0 && e.check(r, n);
}
//@ chunk-078pp0rm.js:1152-1216 esm-fingerprint
function h(e) {
  let index = e.indexOf("%");
  return index === -1 ? e : e.slice(0, index);
}
//@ chunk-078pp0rm.js:1216-1510 esm-fingerprint
function b(e) {
  let t;
  try {
    t = new URL(`http://[${h(e)}]/`).hostname.slice(1, -1);
  } catch {
    return;
  }
  let [r = "", n] = t.split("::"),
    o = r ? r.split(":") : [],
    i = n ? n.split(":") : [],
    c = n === void 0 ? 0 : 8 - o.length - i.length;
  if (c < 0 || o.length + c + i.length !== 8) return;
  return [...o, ...Array(c).fill("0"), ...i].map((s) => parseInt(s, 16));
}
//@ chunk-078pp0rm.js:1510-1559 esm-layout
var p = (e, t) => `${e >> 8}.${e & 255}.${t >> 8}.${t & 255}`;
//@ chunk-078pp0rm.js:1559-1686 esm-fingerprint
function m(e) {
  if (!/ffff/i.test(e)) return;
  let t = b(e);
  return t && t.slice(0, 5).every((r) => r === 0) && t[5] === 65535 ? p(t[6], t[7]) : void 0;
}
//@ chunk-078pp0rm.js:1686-1983 esm-fingerprint
function rli(e) {
  if (isIP_3(e) !== 6) return;
  let t = b(e);
  if (!t) return;
  let r = (o, i) => t.slice(o, i).every((c) => c === 0);
  if (t[0] === 8194) return p(t[1], t[2]);
  let n = p(t[6], t[7]);
  if (t[0] === 100 && t[1] === 65435 && r(2, 6)) return n;
  if (r(0, 5) && (t[5] === 0 || t[5] === 65535)) return n;
  if (r(0, 4) && t[4] === 65535 && t[5] === 0) return n;
  return;
}
//@ chunk-078pp0rm.js:1983-1996 esm-layout
var A = S(u8o);
//@ chunk-078pp0rm.js:1996-2028 esm-layout
function M3r(e) {
  return CTt(A, e);
}
//@ chunk-078pp0rm.js:2028-2133 esm-fingerprint
function oli(e) {
  let replaced = e.toLowerCase().replace(/\.$/, "");
  return replaced === "localhost" || replaced.endsWith(".localhost");
}

export { Pqt, M3r, CTt, m, u8o, rli, oli, f8o };
