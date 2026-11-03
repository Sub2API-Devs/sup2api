/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/path-entries.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (19)
 * attribution: esm-fingerprint 19
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import * as pathModule_4 from "path";
import * as pathModule_5 from "path";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import { Lqt, oD, Kot, Hqt, Nqt, $qt, S8o, R4e, PTt, uy, Ad, sS } from "./sandbox-utils.js";
import { zv } from "../utils/platform.js";

//@ chunk-fq0cr76a.js:639960-640088 esm-fingerprint
function Jc(e) {
  let n = [],
    r = [];
  for (let s of e ?? [])
    if (typeof s === "string") n.push(s);
    else r.push(Lqt(s));
  return { spelled: n, marked: r };
}
//@ chunk-fq0cr76a.js:640088-640124 esm-fingerprint
function Ph(e) {
  return Jc(e).spelled;
}
//@ chunk-fq0cr76a.js:640124-640284 esm-fingerprint
function Qc(e, n) {
  let r = (h) => (typeof h === "string" ? `s:${h}` : `l:${Lqt(h)}`);
  if (e.length !== n.length) return !1;
  let s = new Set(e.map(r));
  return n.every((h) => s.has(r(h)));
}
//@ chunk-fq0cr76a.js:640284-640455 esm-fingerprint
function JV(e) {
  let n = zv() === "windows",
    r = e;
  if (n) {
    if (((r = oD(Kot(r))), Hqt(r))) return;
  }
  let s = Nqt(r),
    h = s === r && !pathModule.isAbsolute(r) ? pathModule.resolve(process.cwd(), r) : s;
  return n ? $qt(h) : S8o(h);
}
//@ chunk-fq0cr76a.js:640455-640524 esm-fingerprint
function QV(e) {
  try {
    return (fsModule.lstatSync(e), !0);
  } catch (error) {
    return !R4e(error);
  }
}
//@ chunk-fq0cr76a.js:640524-640599 esm-fingerprint
function e3(e) {
  try {
    return !fsModule.lstatSync(e).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-fq0cr76a.js:640599-640735 esm-fingerprint
function t3(e, n) {
  try {
    return e === "allow" ? fsModule.lstatSync(n).isDirectory() : fsModule.statSync(n).isDirectory();
  } catch (error) {
    return e === "deny" && !R4e(error);
  }
}
//@ chunk-fq0cr76a.js:640735-641471 esm-fingerprint
function nc(e, n, r = {}) {
  let s = r.isPattern ?? PTt,
    h = uy(e);
  if (!s(h)) {
    if (h === e || !Ad(h)) return [];
    h = e;
  }
  let y = JV(h);
  if (y === void 0) return [];
  let parts = y.split("/"),
    flattened = parts.flatMap((q, Z) => (Ad(q) ? [Z] : [])),
    w = flattened[0],
    R = flattened[flattened.length - 1];
  if (w === void 0 || R === void 0) return [];
  let D = (q) => parts.slice(0, q + 1).join("/") || "/",
    O = n === "deny" ? QV : e3,
    L = w - 1;
  while (L < R && O(D(L + 1))) L++;
  if (L < w) return [];
  let V = [];
  if (L === R && (n === "deny" || Yw(R, parts.length - 1, D)))
    V.push({ glob: !1, path: sS(h, { literal: !0 }) });
  let K = h === e ? "" : "/**";
  for (let q = flattened.length - 2; q >= 0; q--) {
    let Z = flattened[q];
    if (Z > L) continue;
    let J = flattened[q + 1],
      min = Math.min(J - 1, L);
    while (min >= Z && !t3(n, D(min))) min--;
    if (min < Z) continue;
    if (n === "allow" && !Yw(min, J - 1, D)) continue;
    let ae = sS(D(min), { literal: !0 });
    V.push({ glob: !0, anchor: ae, path: ae + y.slice(D(min).length) + K });
  }
  return V;
}
//@ chunk-fq0cr76a.js:641471-641597 esm-fingerprint
function Yw(e, n, r) {
  for (let s = e + 1; s <= n; s++)
    try {
      if (fsModule.lstatSync(r(s)).isSymbolicLink()) return !1;
    } catch (error) {
      return R4e(error);
    }
  return !0;
}
//@ chunk-fq0cr76a.js:641597-641648 esm-fingerprint
function Gb(e, n) {
  return nc(e, n).some((r) => !r.glob);
}
//@ chunk-fq0cr76a.js:641648-641843 esm-fingerprint
function* Zw(e, n, r, s) {
  let h = yield* s(e),
    y = new Set(h),
    b = [];
  for (let S of nc(e, r)) {
    let w = S.glob ? yield* s(S.path, S.anchor) : [n];
    for (let R of w) {
      if (y.has(R)) continue;
      (y.add(R), b.push(R));
    }
  }
  return [...h, ...b];
}
//@ chunk-fq0cr76a.js:641843-642044 esm-fingerprint
function Hb(e, n, r) {
  let s = (h, y) => [
    ...h,
    ...Ph(h).flatMap((b) => nc(b, y).flatMap((S) => (S.glob ? [] : [{ path: S.path, literal: !0 }]))),
  ];
  return { denyRead: s([...e, ...r], "deny"), allowRead: n === void 0 ? void 0 : s(n, "allow") };
}
//@ chunk-fq0cr76a.js:642044-642131 esm-fingerprint
function zw(e) {
  return Object.fromEntries(Object.entries(e).filter(([, n]) => n.length > 0));
}
//@ chunk-fq0cr76a.js:642131-642226 esm-fingerprint
function qb(e, n) {
  return zw({ literalDenyOnly: Jc(e).marked, literalAllowWithinDeny: Jc(n).marked });
}
//@ chunk-fq0cr76a.js:642226-642322 esm-fingerprint
function jb(e, n) {
  return zw({ literalAllowOnly: Jc(e).marked, literalDenyWithinAllow: Jc(n).marked });
}
//@ chunk-fq0cr76a.js:642322-642390 esm-fingerprint
function eu(e) {
  return [...(e.allowOnly || []), ...(e.literalAllowOnly ?? [])];
}
//@ chunk-fq0cr76a.js:642390-642447 esm-fingerprint
function Yb(e, n, r) {
  return [...e, ...Jc(n).marked, ...eu(r)];
}
//@ chunk-fq0cr76a.js:642447-642664 esm-fingerprint
function Xw(e) {
  if (!e) return e;
  let { literalDenyOnly: literalDenyOnly, literalAllowWithinDeny: literalAllowWithinDeny, ...s } = e;
  return {
    ...s,
    denyOnly: [...(e.denyOnly || []), ...(literalDenyOnly ?? [])],
    ...(e.allowWithinDeny || literalAllowWithinDeny
      ? { allowWithinDeny: [...(e.allowWithinDeny ?? []), ...(literalAllowWithinDeny ?? [])] }
      : {}),
  };
}
//@ chunk-fq0cr76a.js:642664-642913 esm-fingerprint
function Jw(e) {
  if (!e) return e;
  let { literalAllowOnly: literalAllowOnly, literalDenyWithinAllow: literalDenyWithinAllow, ...s } = e;
  return {
    ...s,
    allowOnly: eu({
      allowOnly: (e.allowOnly || []).filter((h) => !Ad(h) || Gb(h, "allow")),
      literalAllowOnly: literalAllowOnly,
    }),
    denyWithinAllow: [...(e.denyWithinAllow || []), ...(literalDenyWithinAllow ?? [])],
  };
}

export { eu, Hb, Ph, Zw, Gb, Yb, qb, jb, Qc, Xw, Jw, nc };
