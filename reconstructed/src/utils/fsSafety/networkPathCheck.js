/**
 * utils/fsSafety/networkPathCheck.ts
 *
 * 2.1.316 新增：判断路径为本地、网络或无法检查；网络路径拒绝说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (8)
 * attribution: placement 8
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  parse,
  parse as parse_2,
  normalize,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
} from "fs/promises";
import { sanitizeDisplayChars, stripVariationSelectors } from "../truncateGraphemes.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { vHn, classifyHomeMount } from "../networkPaths.js";
import { Eh } from "../pathClassification.js";
import { getErrnoCode } from "../errors.js";

/**
 * 路径是否为网络路径。
 */
//@ chunk-t0gq9gyw.js:5782-5822 placement
function isNetworkPath(e) {
  return sanitizeDisplayChars(stripVariationSelectors(stripCombiningRepeated(e)), !1);
}
//@ chunk-t0gq9gyw.js:5961-5971 placement
var Nt = 40;
//@ chunk-t0gq9gyw.js:5971-6020 placement = getUnameSR (0.793)
function getUnameSR(e) {
  return e === "win32" ? /[\\/]+/ : /\/+/;
}
/**
 * 网络路径拒绝说明。
 */
//@ chunk-t0gq9gyw.js:6020-6360 placement
var NETWORK_PATH_MESSAGE =
    "names a network location (a UNC path or automounter node); copy it to a local file first",
  NETWORK_LINK_MESSAGE =
    "reaches a network location (a UNC or automount target) through a link; copy it to a local file first",
  DRIVE_RELATIVE_PATTERN = /^[a-zA-Z]:(?![\\/])/,
  UNVETTABLE_LINK_MESSAGE =
    "has a link chain that could not be fully checked for network targets; pass the real path of a local file";
//@ chunk-t0gq9gyw.js:6360-6409 placement = chordToDisplayString (1)
function isNetworkPath_2(chord, platform = "linux") {
  return vHn(chord) || classifyHomeMount(chord, platform);
}
//@ chunk-t0gq9gyw.js:6409-6641 placement
async function checkNetworkPath(e, n = "linux") {
  if (!isAbsolute(e)) return UNVETTABLE_LINK_MESSAGE;
  if (isNetworkPath_2(e, n)) return NETWORK_PATH_MESSAGE;
  let r = { hops: Nt, steps: Nt * 64 };
  switch ((await classifyPathLocation(parse(e).root, e, r, n)).kind) {
    case "network":
      return NETWORK_LINK_MESSAGE;
    case "unvettable":
      return UNVETTABLE_LINK_MESSAGE;
    case "local":
    case "dead-end":
      return;
  }
}
//@ chunk-t0gq9gyw.js:6641-6702 placement
var ii = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/]([A-Za-z]:[\\/].*)$/;
/**
 * 判断路径为本地、网络或无法检查。
 */
//@ chunk-t0gq9gyw.js:6702-7930 placement
async function classifyPathLocation(e, n, r, o, s = !1) {
  if (o === "win32" && s) {
    let match = ii.exec(n);
    if (match) n = match[1];
  }
  if (isNetworkPath_2(n, o)) return { kind: "network" };
  let a = n;
  if (o === "win32") {
    if (DRIVE_RELATIVE_PATTERN.test(n)) return { kind: "unvettable" };
    if (s) {
      if (Eh(n)) return { kind: "unvettable" };
    } else if (((a = normalize(n)), isNetworkPath_2(a, o))) return { kind: "network" };
  }
  let c = o === "win32" && /^[\\/](?![\\/])/.test(a) ? `${parse(e).root.replace(/[\\/]+$/, "")}${a}` : a,
    { root: root } = parse(c),
    p = isAbsolute(c) ? root : e,
    y = !s;
  for (let w of c.slice(isAbsolute(c) ? root.length : 0).split(getUnameSR(o))) {
    if (w === "" || w === ".") continue;
    if (--r.steps < 0) return { kind: "unvettable" };
    if (w === "..") {
      p = dirname_2(p);
      continue;
    }
    let E = p.endsWith(sep) ? `${p}${w}` : `${p}${sep}${w}`;
    if (isNetworkPath_2(E, o)) return { kind: "network" };
    let h;
    try {
      h = (await lstat_3(E)).isSymbolicLink();
    } catch (error) {
      let R = getErrnoCode(error);
      if (R === "ENOENT" || R === "ENOTDIR") return { kind: "dead-end" };
      if (y) {
        let L =
          o !== "win32"
            ? R === "EACCES" || R === "EPERM" || R === "ENAMETOOLONG" || R === "ELOOP"
            : R === "ENAMETOOLONG";
        if (!L)
          try {
            await lstat_3(p);
          } catch (error) {
            let j = getErrnoCode(error);
            L = j === "ENOENT" || j === "ENOTDIR" || j === "ENODEV" || j === "ENXIO";
          }
        if (L) return { kind: "local", physical: p };
      }
      return { kind: "unvettable" };
    }
    if (!h) {
      p = E;
      continue;
    }
    if (--r.hops < 0) return { kind: "unvettable" };
    let b;
    try {
      b = await readlink_2(E);
    } catch {
      return { kind: "unvettable" };
    }
    let v = await classifyPathLocation(p, b, r, o, !0);
    if (v.kind !== "local") return v;
    ((y = !1), (p = v.physical));
  }
  return { kind: "local", physical: p };
}

export { isNetworkPath, checkNetworkPath, UNVETTABLE_LINK_MESSAGE, isNetworkPath_2 };
