/**
 * utils/fsJunctions.ts
 *
 * Windows junction 处理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (24)
 * attribution: placement 24
 */
import { realpathSync, realpath, readlinkSync } from "fs";
import { readlink } from "fs/promises";
import * as pathModule from "path";
import { resolve, isAbsolute, dirname, basename, relative, sep } from "path";
import { toUncLongPath, N, Tm } from "./windowsUncPaths.js";
import { yl } from "./networkPaths.js";
import { cl, Mn, Qn } from "./pathClassification.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";
import { nLt, eDe } from "./pathResolution.js";

//@ chunk-aat7wt0p.js:17231-17309 placement
function Rke(t) {
  let n = E(() => toUncLongPath(realpathSync.native(t)));
  return { real: n.value, code: n.code };
}
//@ chunk-aat7wt0p.js:17309-17452 placement
async function realpathNativeLong(t) {
  let n = await captureErrnoAsync(
    () =>
      new Promise((e, r) => {
        realpath.native(t, (o, i) => {
          if (o) r(o);
          else e(toUncLongPath(i));
        });
      }),
  );
  return { real: n.value, code: n.code };
}
//@ chunk-aat7wt0p.js:17452-17554 placement = isConnectionError (1)
function getErrnoCode_2(err) {
  return err != null && typeof err === "object" && "code" in err && typeof err.code === "string"
    ? err.code
    : void 0;
}
//@ chunk-aat7wt0p.js:17554-17620 placement
function E(t) {
  try {
    return { value: Wt(t) };
  } catch (error) {
    return { code: getErrnoCode_2(error) };
  }
}
//@ chunk-aat7wt0p.js:17620-17655 placement
function Wt(t) {
  return mt(t, () => !0);
}
//@ chunk-aat7wt0p.js:17655-17735 placement
function Luo(t) {
  let n = 0;
  return (e) =>
    mt(e, () => {
      if (n + N > t) return !1;
      return ((n += N), !0);
    });
}
//@ chunk-aat7wt0p.js:17735-17813 placement
function mt(t, n) {
  for (let e = 0; ; e++)
    try {
      return t();
    } catch (error) {
      let o = getErrnoCode_2(error);
      throw error;
    }
}
//@ chunk-aat7wt0p.js:17813-17937 placement
function classifyReadlinkError(t) {
  let n = getErrnoCode_2(t);
  return n === "EINVAL"
    ? { kind: "directory" }
    : n === "ENOENT"
      ? { kind: "absent" }
      : { kind: "error", code: n, error: t };
}
//@ chunk-aat7wt0p.js:17937-18071 placement
function readJunctionSync(t) {
  let n,
    e = E(() => {
      try {
        return readlinkSync(t);
      } catch (error) {
        throw ((n = error), error);
      }
    });
  return e.value !== void 0 ? { kind: "junction", target: e.value } : classifyReadlinkError(n);
}
//@ chunk-aat7wt0p.js:18071-18229 placement
async function readJunction(t) {
  let n,
    e = await captureErrnoAsync(async () => {
      try {
        return await readlink(t);
      } catch (error) {
        throw ((n = error), error);
      }
    });
  return e.value !== void 0 ? { kind: "junction", target: e.value } : classifyReadlinkError(n);
}
//@ chunk-aat7wt0p.js:18229-18331 placement
async function captureErrnoAsync(t) {
  for (let n = 0; ; n++)
    try {
      return { value: await t() };
    } catch (error) {
      let r = getErrnoCode_2(error);
      return { code: r };
    }
}
//@ chunk-aat7wt0p.js:18331-18367 placement
function lks(t) {
  return CL(t) || yl(t);
}
//@ chunk-aat7wt0p.js:18367-18501 placement
function hasAmbiguousWindowsPathSpelling(t) {
  return (
    cl(t) ||
    /[. :](?=[\\/]|$)/.test(t) ||
    t
      .split(/[\\/]/)
      .some((n) => isReservedDeviceName(n) || isReservedDeviceName(n.slice(0, Math.max(0, n.indexOf(":")))))
  );
}
//@ chunk-aat7wt0p.js:18501-18686 placement
function stripWin32DevicePrefix(t) {
  let match = /^(?:\\\\[?.]\\|\\\?\?\\)(?=[A-Za-z]:[\\/])/.exec(t);
  if (!match) return t;
  let sliced = t.slice(match[0].length),
    sliced_2 = sliced.slice(2);
  return (match[0].includes("\\") && sliced_2.includes("/")) || hasAmbiguousWindowsPathSpelling(sliced_2)
    ? t
    : sliced;
}
/**
 * 把路径转成可比较形式：去掉 Win32 设备前缀；UNC/设备路径或可疑路径只做 resolve；否则对最深已存在祖先求 realpath 后拼回剩余部分，NFC 规范化，foldCase 时转小写。
 */
//@ chunk-aat7wt0p.js:18686-19084 placement
function toComparablePath(t, { foldCase: n, knownNotSuspect: e = !1 } = {}) {
  if (((n ??= !1), (t = stripWin32DevicePrefix(t)), CL(t) || yl(t))) {
    let normalized = nLt(resolve(nLt(t))).normalize("NFC");
    return n ? normalized.toLowerCase() : normalized;
  }
  if (!e && eDe(isAbsolute(t) ? t : resolve(t))) {
    let normalized = resolve(t).normalize("NFC");
    return n ? normalized.toLowerCase() : normalized;
  }
  let r = resolve(t),
    o = [],
    i = Tm(r);
  while (i === null && dirname(r) !== r) (o.unshift(basename(r)), (r = dirname(r)), (i = Tm(r)));
  i = o.length > 0 ? resolve(i ?? r, ...o) : (i ?? r);
  let normalized = nLt(i).normalize("NFC");
  return n ? normalized.toLowerCase() : normalized;
}
/**
 * 判断路径 t 是否等于或位于 n 之下（两者先转为可比较形式，除非 alreadyComparable），用 relative 结果判定，不受 .. 前缀误判。
 */
//@ chunk-aat7wt0p.js:19084-19251 placement
function isPathWithin(t, n, { alreadyComparable: e = !1, foldCase: r } = {}) {
  let o = relative(
    e ? t : toComparablePath(t, { foldCase: r }),
    e ? n : toComparablePath(n, { foldCase: r }),
  );
  return o === "" || (!isAbsolute(o) && o !== ".." && !o.startsWith(`..${sep}`));
}
//@ chunk-aat7wt0p.js:19251-19328 placement
function Pke(t, n) {
  let e = Tm(t),
    r = Tm(n);
  return e !== null && r !== null && C(e) === C(r);
}
//@ chunk-aat7wt0p.js:19328-19412 placement
function dks(t, n) {
  let e = Tm(t),
    r = Tm(n);
  return e !== null && r !== null && isSegmentPrefix(C(e), C(r), /\//);
}
//@ chunk-aat7wt0p.js:19412-19575 placement
function isSegmentPrefix(t, n, e) {
  let regExp = new RegExp(`(?:${e.source})+$`),
    parts = t.replace(regExp, "").split(e),
    parts_2 = n.replace(regExp, "").split(e);
  return parts.length <= parts_2.length && parts.every((s, u) => s === parts_2[u]);
}
//@ chunk-aat7wt0p.js:19575-19607 placement
function C(t) {
  return Mn(nLt(t));
}
//@ chunk-aat7wt0p.js:19607-19635 placement
function CL(t) {
  return Qn(t);
}
//@ chunk-aat7wt0p.js:19635-19702 placement
function iM(t) {
  return at.test(t) || (t.includes("??") && at.test(bt(t)));
}
//@ chunk-aat7wt0p.js:19702-19727 placement
var at = /^[\\/]\?\?[\\/]/;
//@ chunk-aat7wt0p.js:19727-19780 placement
function bt(t) {
  return pathModule.win32 ? pathModule.win32.normalize(t) : t;
}

export {
  isPathWithin,
  iM,
  CL,
  Rke,
  Pke,
  stripWin32DevicePrefix,
  realpathNativeLong,
  toComparablePath,
  E,
  bt,
  lks,
  dks,
  readJunction,
  readJunctionSync,
  Luo,
};
