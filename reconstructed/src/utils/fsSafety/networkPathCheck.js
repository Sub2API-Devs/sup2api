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
import { isAbsolute, parse, normalize, dirname, sep } from "path";
import { lstat, readlink } from "fs/promises";
import { sanitizeDisplayChars, stripVariationSelectors } from "../truncateGraphemes.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { isUncOrNetworkSpelling, classifyHomeMount } from "../networkPaths.js";
import { hasDotDotSegment } from "../pathClassification.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-t0gq9gyw.js:5782-5822 placement
/**
 * 路径是否为网络路径。
 */
function isNetworkPath(e) {
  return sanitizeDisplayChars(stripVariationSelectors(stripCombiningRepeated(e)), false);
}
//@ chunk-t0gq9gyw.js:5961-5971 placement
var MAX_SYMLINK_HOPS = 40;
//@ chunk-t0gq9gyw.js:5971-6020 placement = getUnameSR (0.793)
function getUnameSR(e) {
  return e === "win32" ? /[\\/]+/ : /\/+/;
}
//@ chunk-t0gq9gyw.js:6020-6360 placement
/**
 * 网络路径拒绝说明。
 */
var NETWORK_PATH_MESSAGE =
  "names a network location (a UNC path or automounter node); copy it to a local file first";
var NETWORK_LINK_MESSAGE =
  "reaches a network location (a UNC or automount target) through a link; copy it to a local file first";
var DRIVE_RELATIVE_PATTERN = /^[a-zA-Z]:(?![\\/])/;
var UNVETTABLE_LINK_MESSAGE =
  "has a link chain that could not be fully checked for network targets; pass the real path of a local file";
//@ chunk-t0gq9gyw.js:6360-6409 placement = chordToDisplayString (1)
function isNetworkPath_2(chord, platform = "linux") {
  return isUncOrNetworkSpelling(chord) || classifyHomeMount(chord, platform);
}
//@ chunk-t0gq9gyw.js:6409-6641 placement
async function checkNetworkPath(e, n = "linux") {
  if (!isAbsolute(e)) return UNVETTABLE_LINK_MESSAGE;
  if (isNetworkPath_2(e, n)) return NETWORK_PATH_MESSAGE;
  let r = {
    hops: MAX_SYMLINK_HOPS,
    steps: MAX_SYMLINK_HOPS * 64,
  };
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
var WIN32_DRIVE_FROM_DEVICE_RE = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/]([A-Za-z]:[\\/].*)$/;
//@ chunk-t0gq9gyw.js:6702-7930 placement
/**
 * 判断路径为本地、网络或无法检查。
 */
async function classifyPathLocation(e, n, r, o, s = false) {
  if (o === "win32" && s) {
    let match = WIN32_DRIVE_FROM_DEVICE_RE.exec(n);
    if (match) n = match[1];
  }
  if (isNetworkPath_2(n, o))
    return {
      kind: "network",
    };
  let a = n;
  if (o === "win32") {
    if (DRIVE_RELATIVE_PATTERN.test(n))
      return {
        kind: "unvettable",
      };
    if (s) {
      if (hasDotDotSegment(n))
        return {
          kind: "unvettable",
        };
    } else {
      a = normalize(n);
      if (isNetworkPath_2(a, o))
        return {
          kind: "network",
        };
    }
  }
  let c = o === "win32" && /^[\\/](?![\\/])/.test(a) ? `${parse(e).root.replace(/[\\/]+$/, "")}${a}` : a;
  let { root } = parse(c);
  let p = isAbsolute(c) ? root : e;
  let y = !s;
  for (let w of c.slice(isAbsolute(c) ? root.length : 0).split(getUnameSR(o))) {
    if (w === "" || w === ".") continue;
    if (--r.steps < 0)
      return {
        kind: "unvettable",
      };
    if (w === "..") {
      p = dirname(p);
      continue;
    }
    let E = p.endsWith(sep) ? `${p}${w}` : `${p}${sep}${w}`;
    if (isNetworkPath_2(E, o))
      return {
        kind: "network",
      };
    let h;
    try {
      h = (await lstat(E)).isSymbolicLink();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        return {
          kind: "dead-end",
        };
      if (y) {
        let L =
          o !== "win32"
            ? errnoCode === "EACCES" ||
              errnoCode === "EPERM" ||
              errnoCode === "ENAMETOOLONG" ||
              errnoCode === "ELOOP"
            : errnoCode === "ENAMETOOLONG";
        if (!L)
          try {
            await lstat(p);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            L =
              errnoCode === "ENOENT" ||
              errnoCode === "ENOTDIR" ||
              errnoCode === "ENODEV" ||
              errnoCode === "ENXIO";
          }
        if (L)
          return {
            kind: "local",
            physical: p,
          };
      }
      return {
        kind: "unvettable",
      };
    }
    if (!h) {
      p = E;
      continue;
    }
    if (--r.hops < 0)
      return {
        kind: "unvettable",
      };
    let b;
    try {
      b = await readlink(E);
    } catch {
      return {
        kind: "unvettable",
      };
    }
    let v = await classifyPathLocation(p, b, r, o, true);
    if (v.kind !== "local") return v;
    y = false;
    p = v.physical;
  }
  return {
    kind: "local",
    physical: p,
  };
}
export { isNetworkPath, checkNetworkPath, UNVETTABLE_LINK_MESSAGE, isNetworkPath_2 };
