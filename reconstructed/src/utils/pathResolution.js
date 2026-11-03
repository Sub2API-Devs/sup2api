/**
 * utils/pathResolution.ts
 *
 * 路径解析（允许缺失、WSL）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (18)
 * attribution: placement 18
 */
import { isAbsolute, resolve, dirname, parse, join, relative } from "path";
import { readlinkSync } from "fs";
import { stripWin32DevicePrefix, Rke, lks, E } from "./fsJunctions.js";
import { hasDotSegment, cl, Puo } from "./pathClassification.js";
import { z7t, Qg } from "./networkPaths.js";
import { pathTraversesUntrustedLink } from "./settings/settings.js";

//@ chunk-aat7wt0p.js:14220-14548 placement
function realpathAllowMissing(t, { allowLocalWsl: n = !1 } = {}) {
  let e = (i) => n && nvr(i);
  if (e(t)) return !1;
  if (ck(t)) return !0;
  let r = stripWin32DevicePrefix(t);
  if (!isAbsolute(r)) return !0;
  if (eDe(r, { allowLocalWsl: n })) return !0;
  let o = resolve(r);
  for (;;) {
    let i = Rke(o);
    if (i.real !== void 0) return ck(i.real) && !e(i.real);
    if (i.code !== "ENOENT" && i.code !== "ENOTDIR") return !0;
    let s = dirname(o);
    if (s === o) return !1;
    o = s;
  }
}
//@ chunk-aat7wt0p.js:14548-14573 placement
function nvr(t) {
  return !1;
}
//@ chunk-aat7wt0p.js:14573-14598 placement
function nLt(t) {
  return t;
}
//@ chunk-aat7wt0p.js:14598-14630 placement
var WSL_MOUNT_PATTERN = /^\/mnt\/[a-z](?:\/|$)/i;
//@ chunk-aat7wt0p.js:14630-14841 placement = chordToDisplayString (1)
function toWindowsPathFromWsl(t, n, e = "") {
  if (!t.startsWith("/") || WSL_MOUNT_PATTERN.test(t) || hasDotSegment(t, "linux")) return;
  let r = e === "" ? t : t.startsWith(e + "/") ? t.slice(e.length) : void 0;
  return r === void 0 ? void 0 : n.replace(/[\\/]+$/, "") + r.replace(/\//g, "\\");
}
//@ chunk-aat7wt0p.js:14841-14884 placement
function ovr(t, { exactDots: n = !1 } = {}) {
  return;
}
//@ chunk-aat7wt0p.js:14884-15188 placement
function toWslPath(t, { exactDots: n = !1 } = {}) {
  let e = stripWin32DevicePrefix(t);
  if (n ? hasDotSegment(e, "win32") : cl(e)) return;
  let match = /^([A-Za-z]):[\\/]+(.*)$/.exec(e),
    o = z7t(e)?.rest.replace(/^[\\/]+/, ""),
    replaced = (match?.[2] ?? o ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (replaced === "") return;
  let s = match ? `/mnt/${match[1].toLowerCase()}/${replaced}` : `/${replaced}`;
  return ck(s) ? void 0 : s;
}
//@ chunk-aat7wt0p.js:15188-15226 placement
function SLi(t) {
  return ck(t) && !nvr(t);
}
//@ chunk-aat7wt0p.js:15226-15283 placement
function ck(t) {
  let n = stripWin32DevicePrefix(t);
  return lks(n) || Qg(n) || Puo(n);
}
/**
 * 判断路径是否经过不可信链接（非绝对路径视为是）。
 */
//@ chunk-aat7wt0p.js:15283-15447 placement
function traversesUntrustedLink(t, { allowLocalWsl: n = !1, eisdirIsFolder: e = !1 } = {}) {
  let r = stripWin32DevicePrefix(t);
  if (!isAbsolute(r)) return !0;
  let { root: root } = parse(r);
  return pathTraversesUntrustedLink(root, x(r.slice(root.length)), 0, n, { eisdirIsFolder: e });
}
//@ chunk-aat7wt0p.js:15447-15519 placement
function K7t(t, n) {
  return pathTraversesUntrustedLink(t, x(n), 0, !1, { trustedStart: !0, trustedRoot: t });
}
//@ chunk-aat7wt0p.js:15519-15967 placement
function resolvePathChain(t, n = dirname(t)) {
  let e = E(() => readlinkSync(t));
  if (e.value === void 0) return e.code !== "ENOENT" && e.code !== "EINVAL";
  let replaced = e.value.replace(/^\/{2,}/, "/");
  if (alwaysFalse(replaced)) return !0;
  let o = !1;
  if (o && cl(replaced)) return !0;
  let i = o ? join(parse(n).root, replaced) : replaced,
    s = { trustedStart: !0, trustedRoot: n };
  if (isAbsolute(i)) {
    let l = relative(n, i);
    if (!cl(i) && l !== "" && !lt(l) && !isAbsolute(l)) return pathTraversesUntrustedLink(n, x(l), 1, !1, s);
    return ck(i) || eDe(i);
  }
  if (ck(i)) return !0;
  let u = relative(n, dirname(t)),
    a = !lt(u) && !isAbsolute(u);
  return pathTraversesUntrustedLink(a ? n : dirname(t), [...(a ? x(u) : []), ...x(i)], 1, !1, s);
}
//@ chunk-aat7wt0p.js:15967-16024 placement
function eDe(t, n = {}) {
  return traversesUntrustedLink(t, n) || (cl(t) && traversesUntrustedLink(resolve(t), n));
}
//@ chunk-aat7wt0p.js:16024-16034 placement
var Mt = 40;
//@ chunk-aat7wt0p.js:16034-16086 placement
function x(t) {
  return t.split(/\/+/).filter(Boolean);
}
//@ chunk-aat7wt0p.js:16086-16129 placement
function P(t, n) {
  return ck(t) && !(n && nvr(t));
}
//@ chunk-aat7wt0p.js:16129-16182 placement
function lt(t) {
  return t === ".." || /^\.\.[\\/]/.test(t);
}
//@ chunk-aat7wt0p.js:16182-16206 placement
function alwaysFalse(t) {
  return !1;
}

export {
  realpathAllowMissing,
  SLi,
  ck,
  eDe,
  resolvePathChain,
  traversesUntrustedLink,
  P,
  Mt,
  alwaysFalse,
  x,
  nLt,
  K7t,
  toWslPath,
  ovr,
  toWindowsPathFromWsl,
  nvr,
};
