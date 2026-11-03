/**
 * utils/fsOperations.ts
 *
 * 文件系统抽象 getFsImplementation/NodeFsOperations、按范围/尾部读取、路径拼写展开（~ 与符号链接）及最深已存在祖先解析，供权限检查使用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fsOperations.ts
 * pieces: chunk-awy329vy.js (1), chunk-cgr0tezp.js (78), chunk-e6aww6q8.js (4), chunk-jhrww53q.js (1)
 * attribution: fingerprint 3, placement 79, layout 1, callgraph-fingerprint 1
 */
import * as fsModule from "fs";
import * as pathModule from "path";
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { homedir } from "os";
import {
  stat,
  stat as stat_2,
  lstat,
  open,
  readdir,
  unlink,
  unlink as unlink_2,
  rmdir,
  rm,
  mkdir,
  mkdir as mkdir_2,
  readFile,
  rename,
  rename as rename_2,
  realpath,
  readlink,
  copyFile,
  appendFile,
  appendFile as appendFile_2,
  symlink,
  symlink as symlink_2,
  link,
  chmod,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
} from "fs/promises";
import {
  networkMountRootCached,
  isUnderNetworkDirCached,
  isForeignMountPath,
  Ya,
  networkMountHost,
  ai,
  yl,
  isNetDir,
  isWslUncPath,
  tP,
  Lu,
} from "./networkPaths.js";
import { cl, Eh, isForeignNetworkPath, Qn, isMacSpecialPath, Mn, uT, gb, $j } from "./pathClassification.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { launchCwd } from "./cwd.js";
import { getResolvedPath } from "./swarm/permissionSync.js";
import { isSentinelInode, li, slowLogging, nt } from "./slowOperations.js";
import { toUncLongPath } from "./windowsUncPaths.js";
import { e9 } from "./permissions/protectedDirs.js";
import { GIT_INTERNAL_PATH_PATTERNS } from "../tools/BashTool/readOnlyValidation.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { isSpecialOrUnsafePath, isNonCanonicalSymlink } from "./claudemd.js";
import { $c } from "./platformTargets.js";

//@ chunk-cgr0tezp.js:19756-19772 placement
var Oi = "\u2192";
//@ chunk-cgr0tezp.js:19772-19839 placement
function Li() {
  return fsModule.constants.O_NOFOLLOW | fsModule.constants.O_NONBLOCK;
}
//@ chunk-cgr0tezp.js:19839-19926 placement
function nonblockingReadFlags() {
  return fsModule.constants.O_RDONLY | fsModule.constants.O_NONBLOCK | fsModule.constants.O_NOCTTY;
}
//@ chunk-cgr0tezp.js:19926-19939 placement
var ue = /\/+/;
//@ chunk-cgr0tezp.js:19939-20126 placement
function isSpelledStrictAncestor(e, n) {
  let r = (u) => u.split(ue).filter(Boolean),
    resolved = pathModule.resolve(e),
    resolved_2 = pathModule.resolve(n),
    o = r(resolved),
    a = r(resolved_2);
  return (
    pathModule.parse(resolved).root === pathModule.parse(resolved_2).root &&
    o.length < a.length &&
    o.every((u, c) => u === a[c])
  );
}
//@ chunk-cgr0tezp.js:20126-20275 placement
function truncateAtDotSegment(e) {
  let n = "";
  for (let i of e.split(/([\\/]+)/)) {
    if (i === "." || i === "..") break;
    n += i;
  }
  let replaced = n.replace(/(?<=[^\\/])[\\/]+$/, "");
  return replaced === "" ? e : replaced;
}
//@ chunk-cgr0tezp.js:20275-20398 placement
function vi(e) {
  if (e.startsWith("\\\\")) return truncateAtDotSegment(e);
  let replaced = e.replace(/^\/+/, "/"),
    r = networkMountRootCached(replaced);
  if (r !== null) return r;
  return truncateAtDotSegment(e);
}
//@ chunk-cgr0tezp.js:20398-20408 placement
var Ti = vi;
//@ chunk-cgr0tezp.js:20408-20579 placement
function joinRemainingSegments(e, n, r) {
  let i = cl(e);
  if (n.length === 0 || i || n.some((s) => s === "." || s === "..")) {
    if (r !== void 0 && (n.length > 0 || i)) r(pathModule.join(e, ...n));
    return i ? Ti(e) : e;
  }
  return pathModule.join(e, ...n);
}
//@ chunk-cgr0tezp.js:20579-20639 placement
var UNVERIFIED_ANCESTRY = "\x00unverified-ancestry",
  OPAQUE_LINK_TEXT = "\x00opaque-link-text";
//@ chunk-cgr0tezp.js:20639-20722 placement
function st(e) {
  return Eh(pathModule.isAbsolute(e) ? e : e.replace(/^(?:\.\.(?:[\\/]+|$))+/, ""));
}
//@ chunk-cgr0tezp.js:20722-20982 placement
function isOpaqueLinkText(e, n = !1) {
  return (
    e.includes("\uFFFD") ||
    st(e) ||
    (n &&
      (/^(?:[A-Za-z]:(?![\\/])|[\\/](?![\\/]))/.test(e) ||
        (/^[\\/]{2}\?[\\/]/.test(e) && !/^[\\/]{2}\?[\\/](?:[A-Za-z]:[\\/]|UNC[\\/])/i.test(e)) ||
        e.split(/[\\/]/).some((r) => r !== "." && r !== ".." && /[. ]$/.test(r))))
  );
}
//@ chunk-cgr0tezp.js:20982-21024 placement
function isNetworkJunction(e) {
  return e !== void 0 && e !== UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21024-21136 placement
function hopCapExhausted(e) {
  return Object.assign(Error("ELOOP: symbolic link chain too long to vet"), { code: "ELOOP", path: e });
}
//@ chunk-cgr0tezp.js:21136-21370 placement
function unverifiedAncestryReason(e, n, r = !1, i = !1, s = !1) {
  if (n?.unreadableAncestry !== "unverified") return;
  let o = e !== void 0 && typeof e === "object" && "errno" in e ? e.errno : void 0;
  if (o === "ENOENT" || o === "ENOTDIR") return;
  if (o === "ENAMETOOLONG" && !r && !i && !s) return;
  return UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21370-21398 placement
function se(e) {
  return isUnderNetworkDirCached(e);
}
//@ chunk-cgr0tezp.js:21398-21481 placement
function Le(e, n) {
  return (
    n !== void 0 &&
    n.some(
      (r) => isUnderNetworkDirCached(r) && !isForeignMountPath(e, r) && (isPathUnderPosix(e, r) || Ya(e)),
    )
  );
}
//@ chunk-cgr0tezp.js:21481-21545 placement
function fn(e, n) {
  return n !== void 0 && n.some((r) => isUnderNetworkDirCached(r) && isPathUnderPosix(r, e));
}
//@ chunk-cgr0tezp.js:21545-21669 placement
function isPathUnderPosix(e, n) {
  let r = (o) => (o.length > 1 ? o.replace(/\/+$/, "") : o),
    [i, s] = [r(e), r(n)];
  return i === s || i.startsWith(s === "/" ? s : s + "/");
}
//@ chunk-cgr0tezp.js:21669-21727 placement
function ce(e, n) {
  return n === void 0 || n.every((r) => isForeignMountPath(e, r));
}
//@ chunk-cgr0tezp.js:21727-21785 placement
function Te(e, n) {
  return n === void 0 || n.every((r) => isForeignNetworkPath(e, r));
}
//@ chunk-cgr0tezp.js:21785-21924 placement
function gn(e, n, r) {
  let i = Ya(e) ? networkMountRootCached(e) : null;
  if (i === null || !ce(i, n)) return;
  let joined = pathModule.join(e);
  if (Ya(joined) && networkMountHost(joined) === networkMountHost(i)) return joined;
  return joinRemainingSegments(e, [], r);
}
//@ chunk-cgr0tezp.js:21924-22043 placement
function getAnchors(e) {
  if (e?.anchors !== void 0 && e.anchors.length > 0) return e.anchors;
  return e?.anchor !== void 0 ? [e.anchor] : void 0;
}
//@ chunk-cgr0tezp.js:22043-22111 placement
function hasUntouchableRecordSpelling(e) {
  return (
    Eh(e) || ai(e) || yl(e) || isNetDir(e) || findIntermediateUncJunction(NodeFsOperations, e) !== void 0
  );
}
//@ chunk-cgr0tezp.js:22111-22192 placement
async function hasUntouchableRecordSpellingAsync(e) {
  return (
    Eh(e) ||
    ai(e) ||
    yl(e) ||
    isNetDir(e) ||
    (await findIntermediateUncJunctionAsync(NodeFsOperations, e)) !== void 0
  );
}
//@ chunk-cgr0tezp.js:22192-22320 placement
function hasUntouchableRecordSpellingStrict(e, n = NodeFsOperations) {
  return (
    Eh(e) ||
    ai(e) ||
    yl(e) ||
    isNetDir(e) ||
    findIntermediateUncJunction(n, e, { surfaceNetworkRaw: !0, unreadableAncestry: "unverified" }) !== void 0
  );
}
//@ chunk-cgr0tezp.js:22320-22460 placement
async function hasUntouchableRecordSpellingStrictAsync(e, n = NodeFsOperations) {
  return (
    Eh(e) ||
    ai(e) ||
    yl(e) ||
    isNetDir(e) ||
    (await findIntermediateUncJunctionAsync(n, e, {
      surfaceNetworkRaw: !0,
      unreadableAncestry: "unverified",
    })) !== void 0
  );
}
//@ chunk-cgr0tezp.js:22460-22659 placement
async function entryReachesForeignNetwork(e, n, r = NodeFsOperations) {
  if (Eh(e)) return !0;
  if (ai(e)) return !0;
  if (yl(e)) {
    let i = networkMountHost(e);
    if (i === null || n === null || i !== networkMountHost(n)) return !0;
  }
  if (isNetDir(e)) return !0;
  return (await examineEntryChain(e, n, { fsImpl: r })).verdict !== "clean";
}
//@ chunk-cgr0tezp.js:22659-22925 placement
async function examineEntryChain(e, n, { fsImpl: r = NodeFsOperations, signal: i } = {}) {
  let s = await findIntermediateUncJunctionAsync(
    r,
    e,
    { ...(n === null ? {} : { anchor: n }), unreadableAncestry: "unverified", surfaceNetworkRaw: !0 },
    i,
  );
  if (s === void 0) return { verdict: "clean" };
  if (s === UNVERIFIED_ANCESTRY) return { verdict: "unverified" };
  return { verdict: "network", reaches: s };
}
//@ chunk-cgr0tezp.js:22925-23119 placement
function findIntermediateUncJunction(e, n, r) {
  return returnValue(resolvePathSafely(n, r), (i) => {
    if (i.kind === "lstat") return e.lstatSync(i.path);
    if (i.kind === "opendirNofollow") return (e.openDirNoFollowSync(i.path), "ok");
    return e.readlinkSync(i.path);
  });
}
//@ chunk-cgr0tezp.js:23119-23428 placement
function findIntermediateUncJunctionAsync(e, n, r, i, s) {
  return returnValue_2(resolvePathSafely(n, r), i, async (o) => {
    if (o.kind === "lstat") {
      if (s === void 0) return e.lstat(o.path);
      let a;
      try {
        a = await e.lstatBigint(o.path);
      } catch (error) {
        throw (s(o.path, void 0), error);
      }
      return (s(o.path, a), a);
    }
    if (o.kind === "opendirNofollow") return (await e.openDirNoFollow(o.path), "ok");
    return e.readlink(o.path);
  });
}
//@ chunk-cgr0tezp.js:23428-23543 placement = returnValue (0.769)
function returnValue(e, n) {
  let r;
  for (;;) {
    let i = e.next(r);
    if (i.done) return i.value;
    try {
      r = n(i.value);
    } catch (error) {
      r = { errno: getErrnoCode(error) };
    }
  }
}
//@ chunk-cgr0tezp.js:23543-23701 placement = returnValue (0.769)
async function returnValue_2(e, n, r) {
  let i;
  for (;;) {
    let s = e.next(i);
    if (s.done) return s.value;
    if (n?.aborted === !0) return UNVERIFIED_ANCESTRY;
    try {
      i = await r(s.value);
    } catch (error) {
      i = { errno: getErrnoCode(error) };
    }
  }
}
/**
 * 驱动路径检查生成器执行文件系统步骤（可中止）。
 */
//@ chunk-cgr0tezp.js:23701-24117 placement
async function runFsSteps(e, n, r, i, s) {
  let o = Symbol("cut short"),
    a,
    u =
      n === void 0
        ? void 0
        : new Promise((l) => {
            ((a = () => l(o)), n.addEventListener("abort", a, { once: !0 }));
          }),
    c;
  try {
    for (;;) {
      let l = e.next(c);
      if (l.done) return l.value;
      if (n?.aborted === !0 || r?.(l.value) === !1) return s;
      let d = i(l.value).catch((y) => ({ errno: getErrnoCode(y) })),
        g = await (u === void 0 ? d : Promise.race([d, u]));
      if (g === o) return s;
      c = g;
    }
  } finally {
    if (a !== void 0) n?.removeEventListener("abort", a);
  }
}
/**
 * 逐段解析路径的生成器（链接、网络、junction 检查）。
 */
//@ chunk-cgr0tezp.js:24117-27079 placement
function* resolvePathSafely(e, n) {
  let r = getAnchors(n);
  if (se(e) && !Le(e, r)) return e;
  if ((Qn(e) && !isWslUncPath(e) && Te(e, r)) || (Ya(e) && ce(e, r))) return;
  let resolved = pathModule.resolve(e),
    root = pathModule.parse(resolved).root,
    o = root,
    filtered = resolved.slice(root.length).split(ue).filter(Boolean),
    u = 0,
    c = filtered.length,
    l = !1,
    d = !1,
    g,
    y = 64,
    h = () => filtered.some((f) => cl(f)),
    S = () => /[. ]$/.test(filtered[0]);
  while (filtered.length > 0 && u < y) {
    if (l && cl(filtered[0])) return UNVERIFIED_ANCESTRY;
    let joined = pathModule.join(o, filtered[0]);
    if ((Ya(joined) && ce(joined, r)) || (se(joined) && !(Le(joined, r) || fn(joined, r))))
      return joinRemainingSegments(joined, filtered.slice(1), n?.onCollapsedLanding);
    if (isMacSpecialPath(joined)) {
      if (n?.surfaceNetworkRaw === !0 || n?.unreadableAncestry === "unverified") return UNVERIFIED_ANCESTRY;
      return joinRemainingSegments(joined, filtered.slice(1), n?.onCollapsedLanding);
    }
    let m = !1;
    if (
      m &&
      pathModule.dirname(joined) === "/dev/fd" &&
      filtered.some((T, U) => U > 0 && (T === ".." || T === "."))
    ) {
      filtered.shift();
      while (filtered[0] === "." && filtered.length > 1) filtered.shift();
      o = joined;
      continue;
    }
    let b = m ? { errno: "ENOENT" } : yield { kind: "lstat", path: joined };
    if (b === void 0 || typeof b === "string" || "errno" in b) {
      if (
        typeof b === "object" &&
        "errno" in b &&
        b.errno !== void 0 &&
        b.errno !== "ENOENT" &&
        b.errno !== "ENOTDIR" &&
        b.errno !== "ENAMETOOLONG"
      ) {
        if (typeof (yield { kind: "opendirNofollow", path: joined }) === "string") {
          ((d = !0), filtered.shift(), (o = joined));
          continue;
        }
      }
      if (
        n?.launchAncestry &&
        !d &&
        typeof b === "object" &&
        "errno" in b &&
        (b.errno === "EPERM" || b.errno === "EACCES") &&
        isSpelledStrictAncestor(joined, n.launchAncestry)
      ) {
        ((l = !0), filtered.shift(), (o = joined));
        continue;
      }
      if (typeof b === "object" && "errno" in b && (b.errno === "ENOENT" || b.errno === "ENOTDIR"))
        n?.onOutcome?.({
          kind: "absent",
          at: o,
          remaining: [...filtered],
          fromLinkTarget: filtered.length > c,
          ...(b.errno === "ENOTDIR" && { notAFolder: !0 }),
        });
      return unverifiedAncestryReason(b, n, u > 0, h(), S());
    }
    let A = b;
    if (((d = !0), !A.isSymbolicLink())) {
      (filtered.shift(), (o = joined));
      continue;
    }
    u++;
    let x = joined + "\x00" + filtered.join("\x00");
    if ((g ??= new Set()).has(x)) return;
    g.add(x);
    let L = yield { kind: "readlink", path: joined };
    if (typeof L !== "string") return unverifiedAncestryReason(L, n, u > 0, h(), S());
    let I = L;
    if (n?.literalLinkText === "opaque" && isOpaqueLinkText(I)) return OPAQUE_LINK_TEXT;
    if (!pathModule.isAbsolute(I)) {
      let filtered_2 = I.split(ue).filter(Boolean);
      if (n?.surfaceNetworkRaw === !0) {
        let U = gn(
          (o.endsWith(pathModule.sep) ? o : o + pathModule.sep) +
            [...filtered_2, ...filtered.slice(1)].join(pathModule.sep),
          r,
          n?.onCollapsedLanding,
        );
        if (U !== void 0) return U;
      }
      (filtered.shift(),
        n?.onHop?.({ composed: pathModule.resolve(o, I, ...filtered), leaf: filtered.length === 0, text: I }),
        (c = Math.min(c, filtered.length)),
        (filtered = [...filtered_2, ...filtered]));
      continue;
    }
    let w = I;
    if (n?.surfaceNetworkRaw === !0 && filtered.length > 1 && isNetDir(w)) {
      let T = gn([w, ...filtered.slice(1)].join(pathModule.sep), r, n?.onCollapsedLanding);
      if (T !== void 0) return T;
    }
    if (
      (Qn(w) && !isWslUncPath(w) && Te(w, r)) ||
      (Ya(w) && ce(w, r)) ||
      (se(w) && !(Le(w, r) || (filtered.length > 1 && fn(w, r))))
    )
      return (filtered.shift(), joinRemainingSegments(w, filtered, n?.onCollapsedLanding));
    if (n?.surfaceNetworkRaw === !0 && cl(w) && (Qn(w) || yl(w) || isUnderNetworkDirCached(w) || isNetDir(w)))
      return (
        filtered.shift(),
        filtered.length === 0 ? w : w + pathModule.sep + filtered.join(pathModule.sep)
      );
    filtered.shift();
    let F = pathModule.parse(w).root || pathModule.sep,
      root = pathModule.parse(joined).root,
      P = /^[\\/]$/.test(F) && root !== "" && !/^[\\/]$/.test(root);
    if (P && (n?.surfaceNetworkRaw === !0 || n?.unreadableAncestry === "unverified"))
      return UNVERIFIED_ANCESTRY;
    (n?.onHop?.({
      composed: filtered.length === 0 ? w : pathModule.resolve(w, ...filtered),
      leaf: filtered.length === 0,
      text: I,
    }),
      (o = P ? root : F),
      (d = !1),
      (c = Math.min(c, filtered.length)),
      (filtered = [...w.slice(F.length).split(ue).filter(Boolean), ...filtered]));
  }
  if (filtered.length > 0 && n?.literalLinkText === "opaque") return OPAQUE_LINK_TEXT;
  if (filtered.length > 0) return UNVERIFIED_ANCESTRY;
  if (u > 0 && isNetDir(o)) return o;
  if (se(o) && !Le(o, r)) return o;
  if (filtered.length === 0) n?.onOutcome?.({ kind: "resolved", path: o });
  return;
}
//@ chunk-cgr0tezp.js:27079-27452 placement
function safeResolvePath(e, n) {
  if ((Qn(n) && !isWslUncPath(n)) || Ya(n) || tP(n))
    return { resolvedPath: n, isSymlink: !1, isCanonical: !1 };
  let r = findIntermediateUncJunction(e, n);
  if (r === UNVERIFIED_ANCESTRY) return { resolvedPath: n, isSymlink: !1, isCanonical: !1 };
  if (r !== void 0) return { resolvedPath: r, isSymlink: !0, isCanonical: !1 };
  try {
    let i = realpathExaminedSync(e, n);
    return { resolvedPath: i, isSymlink: i !== n, isCanonical: !0 };
  } catch (error) {
    return { resolvedPath: n, isSymlink: !1, isCanonical: !1 };
  }
}
//@ chunk-cgr0tezp.js:27452-27808 placement
function vouchedLaunchAncestry(e) {
  let n = launchCwd();
  if (n === null) return null;
  try {
    let resolved = pathModule.resolve(n),
      resolved_2 = pathModule.resolve(e.cwd()),
      root = pathModule.parse(resolved).root;
    if (root !== pathModule.parse(resolved_2).root) return null;
    let filtered = resolved.slice(root.length).split(ue).filter(Boolean),
      filtered_2 = resolved_2.slice(root.length).split(ue).filter(Boolean),
      u = 0;
    while (u < filtered.length && u < filtered_2.length && filtered[u] === filtered_2[u]) u++;
    return u > 0 ? pathModule.join(root, ...filtered.slice(0, u)) : null;
  } catch {
    return null;
  }
}
//@ chunk-cgr0tezp.js:27808-28206 placement
function realpathExaminedSync(e, n) {
  try {
    return e.realpathSync(n);
  } catch (error) {
    let i = getErrnoCode(error);
    if (i !== "EPERM" && i !== "EACCES") throw error;
    let s,
      o = vouchedLaunchAncestry(e);
    if (
      findIntermediateUncJunction(e, n, {
        unreadableAncestry: "unverified",
        surfaceNetworkRaw: !0,
        launchAncestry: o,
        onOutcome: (u) => {
          s = u;
        },
      }) !== void 0 ||
      s === void 0
    )
      throw error;
    if (s.kind === "absent")
      throw Object.assign(Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
        syscall: "realpath",
        path: n,
      });
    return Mn(s.path);
  }
}
//@ chunk-cgr0tezp.js:28206-28244 placement
var SYMLINK_TO_NETWORK_PATH_CODE = "ERR_SYMLINK_TO_NETWORK_PATH";
//@ chunk-cgr0tezp.js:28244-28406 placement
function vetRepoSettingsPath(e, n, r) {
  let { asWritten: asWritten, opts: opts } = refuseUnvettablePath(e, n, r),
    o,
    a;
  return (
    refuseUnexaminedPath(
      findIntermediateUncJunction(e, asWritten, {
        ...opts,
        onOutcome: (u) => {
          ((o = getResolvedPath(u)), (a = absentSpellingInfo(u)));
        },
      }),
      n,
      asWritten,
    ),
    { ...xn(asWritten), linksResolvedPath: o, absentAt: a }
  );
}
//@ chunk-cgr0tezp.js:28406-29083 placement
async function vetRepoSettingsPathAsync(e, n, r) {
  let { asWritten: asWritten, opts: opts, ownHost: ownHost } = refuseUnvettablePath(e, n, r),
    a,
    u,
    c,
    l,
    d = !ownHost,
    g = !1,
    y,
    h = [],
    S = {
      ...opts,
      onOutcome: (f) => {
        ((g = !0), (a = getResolvedPath(f)), (u = absentSpellingInfo(f)));
        let m = y,
          b = f.kind === "resolved" && m?.path === f.path;
        ((d = !b),
          (l = b ? m.stats : void 0),
          (c =
            b && !isSentinelInode(m.stats.ino)
              ? { dev: m.stats.dev, ino: m.stats.ino, ctimeNs: m.stats.ctimeNs }
              : void 0));
      },
    };
  if (
    (refuseUnexaminedPath(
      await findIntermediateUncJunctionAsync(
        e,
        asWritten,
        S,
        void 0,
        r?.fileIdentity === !0
          ? (f, m) => {
              if (((y = m === void 0 ? void 0 : { path: f, stats: m }), m?.isSymbolicLink() === !0))
                h.push(m);
            }
          : void 0,
      ),
      n,
      asWritten,
    ),
    !g && y?.stats.isSymbolicLink() === !0)
  )
    d = !0;
  return {
    ...xn(asWritten),
    linksResolvedPath: a,
    absentAt: u,
    ...(c !== void 0 && { identity: c }),
    ...(l !== void 0 && { endStats: l }),
    ...(r?.fileIdentity === !0 && { linksFollowed: h }),
    ...(r?.fileIdentity === !0 && d && { noFileSeen: !0 }),
  };
}
//@ chunk-cgr0tezp.js:29143-29287 placement
function absentSpellingInfo(e) {
  return e.kind === "absent"
    ? {
        at: e.at,
        remaining: e.remaining,
        fromLinkTarget: e.fromLinkTarget,
        ...(e.notAFolder && { notAFolder: !0 }),
      }
    : void 0;
}
/**
 * 设备命名空间路径拒绝读取。
 */
//@ chunk-cgr0tezp.js:29287-29988 placement
function refuseUnvettablePath(e, n, r) {
  let i = toUncLongPath(n);
  if (uT(i) || gb(i))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      { code: SYMLINK_TO_NETWORK_PATH_CODE, path: n, reason: "unexamined" },
    );
  let s = pathModule.isAbsolute(i) ? pathModule.resolve(i) : pathModule.resolve(process.cwd(), i),
    o = toUncLongPath(s);
  if (uT(o) || gb(o))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      { code: SYMLINK_TO_NETWORK_PATH_CODE, path: n, reason: "unexamined" },
    );
  let a = se(o) || Ya(o) || (Qn(o) && !isWslUncPath(o));
  return {
    asWritten: o,
    ownHost: a,
    opts: {
      ...(a && { anchors: [o] }),
      surfaceNetworkRaw: !0,
      ...((!a || r?.failClosed) && {
        unreadableAncestry: "unverified",
        launchAncestry: vouchedLaunchAncestry(e),
      }),
    },
  };
}
//@ chunk-cgr0tezp.js:29988-30054 placement
function xn(e) {
  return { resolvedPath: e, isSymlink: !1, isCanonical: !1 };
}
/**
 * 无法检查的路径拒绝读取。
 */
//@ chunk-cgr0tezp.js:30054-30618 placement
function refuseUnexaminedPath(e, n, r) {
  if (e === void 0) return;
  let i = (o) =>
    Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a component that could not be examined, or a symbolic link chain too long to follow)",
      ),
      { code: SYMLINK_TO_NETWORK_PATH_CODE, path: n, reason: o },
    );
  if (e === UNVERIFIED_ANCESTRY) throw i("unexamined");
  if (se(r) && e === r) return;
  if (!(Qn(e) || yl(e) || se(e) || isNetDir(e))) throw i("unexamined");
  throw Object.assign(
    Error(
      "Refusing to read a file through a symbolic link that leads onto a network share or automount path; replace the link with a regular file to use it",
    ),
    { code: SYMLINK_TO_NETWORK_PATH_CODE, path: n, reason: "network" },
  );
}
//@ chunk-cgr0tezp.js:30618-30652 placement
function isSymlinkToNetworkPathError(e) {
  return getErrnoCode(e) === SYMLINK_TO_NETWORK_PATH_CODE;
}
//@ chunk-cgr0tezp.js:30652-30749 placement
function repoSettingsRefusalReason(e) {
  if (!isSymlinkToNetworkPathError(e)) return;
  let reason = e.reason;
  return reason === "network" || reason === "unexamined" ? reason : void 0;
}
//@ chunk-cgr0tezp.js:30749-30837 placement
function isDuplicatePath(e, n, r) {
  let { resolvedPath: resolvedPath } = safeResolvePath(e, n);
  if (r.has(resolvedPath)) return !0;
  return (r.add(resolvedPath), !1);
}
//@ chunk-cgr0tezp.js:30837-30869 placement
var DOTDOT_SEGMENT_PATTERN = /(^|[\\/])\.\.([\\/]|$)/;
//@ chunk-cgr0tezp.js:30869-31047 placement
function stripDotSegments(e, n = "linux") {
  let replaced = e.replace(n === "win32" ? /[\\/]\.(?=[\\/]|$)/g : /\/\.(?=\/|$)/g, "");
  if (replaced === "") return e[0];
  if (n === "win32" && /^[A-Za-z]:$/.test(replaced)) return replaced + e[2];
  return replaced;
}
/**
 * 对不存在的路径，找到最深的已存在祖先并 realpath，再拼回剩余部分（权限检查用于新建文件）。
 */
//@ chunk-cgr0tezp.js:31047-32818 placement = resolveDeepestExistingAncestorSync (0.643)
function resolveDeepestExistingAncestorSync(e, n, r) {
  let i = getAnchors(r);
  if ((Qn(n) && !isWslUncPath(n)) || Ya(n) || tP(n)) {
    if (i !== void 0 && ((Ya(n) && !ce(n, i)) || (Qn(n) && !isWslUncPath(n) && !Te(n, i)))) {
      let l = findIntermediateUncJunction(e, n, { anchors: i, surfaceNetworkRaw: r?.surfaceNetworkRaw });
      if (l === UNVERIFIED_ANCESTRY && r?.surfaceNetworkRaw !== !0) {
        if (r?.surfaceDotDotTargets === !0) throw hopCapExhausted(n);
        return n;
      }
      return l;
    }
    return n;
  }
  let s = findIntermediateUncJunction(
    e,
    n,
    r?.surfaceNetworkRaw === !0 ? { surfaceNetworkRaw: !0, anchors: i } : void 0,
  );
  if (s === UNVERIFIED_ANCESTRY && r?.surfaceNetworkRaw !== !0) {
    if (r?.surfaceDotDotTargets === !0) throw hopCapExhausted(n);
    return;
  }
  if (s !== void 0) return r?.liveRoutesOnly === !0 ? void 0 : s;
  let o = n,
    segments = [],
    u = r?.surfaceDotDotTargets === !0,
    c = (l) =>
      segments.length === 0
        ? l
        : u && DOTDOT_SEGMENT_PATTERN.test(l)
          ? [l, ...segments].join(pathModule.sep)
          : pathModule.join(l, ...segments);
  while (o !== pathModule.dirname(o)) {
    let l, d;
    try {
      l = e.readlinkSync(o);
    } catch (error) {
      d = getErrnoCode(error);
    }
    if (l !== void 0) {
      if (u && DOTDOT_SEGMENT_PATTERN.test(l))
        return c(pathModule.isAbsolute(l) ? l : pathModule.dirname(o) + pathModule.sep + l);
      let g = pathModule.isAbsolute(l) ? l : pathModule.resolve(pathModule.dirname(o), l);
      if (
        (Qn(g) && !isWslUncPath(g)) ||
        Ya(g) ||
        tP(g) ||
        isMacSpecialPath(g) ||
        (r?.surfaceNetworkRaw === !0 && cl(g))
      ) {
        if (r?.liveRoutesOnly === !0) return;
        return r?.surfaceNetworkRaw === !0 && segments.length > 0
          ? g + pathModule.sep + segments.join(pathModule.sep)
          : c(g);
      }
      try {
        let y = realpathExaminedSync(e, o);
        return c(y);
      } catch {
        if (r?.liveRoutesOnly === !0) return;
        let y = o,
          h = 0,
          S = 64;
        while (h < S) {
          let f;
          try {
            f = e.readlinkSync(y);
          } catch {
            break;
          }
          if (u && DOTDOT_SEGMENT_PATTERN.test(f)) {
            y = pathModule.isAbsolute(f) ? f : pathModule.dirname(y) + pathModule.sep + f;
            break;
          }
          let m = pathModule.isAbsolute(f)
            ? u
              ? stripDotSegments(f)
              : f
            : pathModule.resolve(pathModule.dirname(y), f);
          if (
            (Qn(m) && !isWslUncPath(m) && Te(m, i)) ||
            (Ya(m) && ce(m, i)) ||
            tP(m) ||
            isMacSpecialPath(m) ||
            (r?.surfaceNetworkRaw === !0 && cl(m))
          ) {
            y = m;
            break;
          }
          let b;
          try {
            b = e.lstatSync(m);
          } catch {
            y = m;
            break;
          }
          if (!b.isSymbolicLink()) {
            y = m;
            break;
          }
          ((y = m), h++);
        }
        if (h >= S && r?.surfaceNetworkRaw === !0) return UNVERIFIED_ANCESTRY;
        return r?.surfaceNetworkRaw === !0 &&
          segments.length > 0 &&
          ((Qn(y) && !isWslUncPath(y)) || Ya(y) || tP(y) || isMacSpecialPath(y) || cl(y))
          ? y + pathModule.sep + segments.join(pathModule.sep)
          : c(y);
      }
    }
    if (d === "ENOENT") {
      (segments.unshift(pathModule.basename(o)), (o = pathModule.dirname(o)));
      continue;
    }
    try {
      let g = realpathExaminedSync(e, o);
      if (g !== o) return c(g);
    } catch (error) {
      if (u) throw error;
    }
    return;
  }
  return;
}
//@ chunk-cgr0tezp.js:32818-32868 placement
function isSpecialPath(e) {
  return (Qn(e) && !isWslUncPath(e)) || yl(e) || uT(e);
}
//@ chunk-cgr0tezp.js:32868-32903 placement
function expandWin32ExistingLongNames(e) {
  return resolveViaDeepestExistingAncestor(e, !1) ?? e;
}
//@ chunk-cgr0tezp.js:32903-32935 placement
function expandWin32ExistingLongNamesStrict(e) {
  return resolveViaDeepestExistingAncestor(e, !0);
}
/**
 * 找到最深的存在的祖先目录。
 */
//@ chunk-cgr0tezp.js:32935-33259 placement
function resolveViaDeepestExistingAncestor(e, n) {
  if (isSpecialPath(e)) return e;
  let r = e,
    i = "";
  for (;;) {
    if (!cl(r)) {
      let o = e9(r);
      if (o !== null) {
        let a = i === "" ? o : o.endsWith(pathModule.sep) ? o + i : o + pathModule.sep + i;
        if (isSpecialPath(a)) return n ? a : e;
        return a;
      }
      if (n)
        try {
          return (fsModule.lstatSync(r), null);
        } catch (error) {
          if (!isENOENT(error)) return null;
        }
    }
    let dir = pathModule.dirname(r);
    if (dir === r) return e;
    ((i = i === "" ? pathModule.basename(r) : pathModule.basename(r) + pathModule.sep + i), (r = dir));
  }
}
//@ chunk-cgr0tezp.js:33259-33300 placement
function walkPermissionCheckPaths(e) {
  return walkPathSpellingsSync(e, "permission");
}
//@ chunk-cgr0tezp.js:33300-33349 placement
function walkPermissionCheckPathsAsync(e, n, r) {
  return vetPathAsync(e, "permission", n, r);
}
/**
 * 异步执行路径检查步骤。
 */
//@ chunk-cgr0tezp.js:33349-33764 placement
function vetPathAsync(e, n, r, i) {
  let s = getFsImplementation();
  return runFsSteps(
    vetPathSteps(e, n),
    r,
    i === void 0 ? void 0 : (o) => i(o.path),
    async (o) => {
      switch (o.kind) {
        case "lstat":
          return s.lstat(o.path);
        case "opendirNofollow":
          return (await s.openDirNoFollow(o.path), "ok");
        case "readlink":
          return s.readlink(o.path);
        case "realpath":
          return s === NodeFsOperations ? Mn(await li(o.path)) : s.realpath(o.path);
      }
    },
    { unresolved: !0, requested: e, spellings: [e], stoppedAt: e, leafIsSymlink: !1, reason: "cut-short" },
  );
}
//@ chunk-cgr0tezp.js:33764-33805 placement
function getPathsForNetworkScreen(e) {
  return toPathCheckResult(walkPathSpellingsSync(e, "screen"));
}
//@ chunk-cgr0tezp.js:33805-33937 placement
function toPathCheckResult(e) {
  return {
    paths: e.spellings,
    vetted: !e.unresolved,
    ...(!e.unresolved && e.linkTextClimbs && { linkTextClimbs: e.linkTextClimbs }),
  };
}
//@ chunk-cgr0tezp.js:33937-33998 placement
async function getPathsForNetworkScreenAsync(e) {
  return toPathCheckResult(await vetPathAsync(e, "screen", void 0));
}
/**
 * 同步驱动 pathSpellingWalker（lstat/readlink/opendir），得到路径的全部拼写。
 */
//@ chunk-cgr0tezp.js:33998-34261 placement
function walkPathSpellingsSync(e, n) {
  let r = getFsImplementation();
  return returnValue(vetPathSteps(e, n), (i) => {
    switch (i.kind) {
      case "lstat":
        return r.lstatSync(i.path);
      case "opendirNofollow":
        return (r.openDirNoFollowSync(i.path), "ok");
      case "readlink":
        return r.readlinkSync(i.path);
      case "realpath":
        return r.realpathSync(i.path);
    }
  });
}
/**
 * 路径拼写生成器：展开 ~、逐段跟随符号链接，产出路径的全部等价拼写，供权限检查确保规则对真实位置生效；通过 yield 请求 lstat/readlink，可同步或异步驱动。
 */
//@ chunk-cgr0tezp.js:34261-36346 placement
function* vetPathSteps(e, n) {
  let r = e;
  if (r === "~") r = homedir().normalize("NFC");
  else if (r.startsWith("~/")) r = pathModule.join(homedir().normalize("NFC"), r.slice(2));
  let i = new Set([r]),
    s = !1,
    o = (R, v = !1) => ({
      unresolved: !1,
      requested: r,
      spellings: Array.from(i),
      landing: R,
      leafIsSymlink: v,
      ...(s && { linkTextClimbs: s }),
    });
  if ((Qn(r) && !isWslUncPath(r)) || Ya(r) || tP(r)) return o(r);
  let a = getFsImplementation(),
    u = vouchedLaunchAncestry(a),
    c,
    l,
    d = !1,
    g = !1,
    y = !1,
    h = !1,
    S = [],
    f = new Set(),
    m = (R) => {
      let resolved = pathModule.resolve(R);
      if (!f.has(resolved)) (f.add(resolved), S.push(R));
    },
    b = r,
    A,
    x = function* (R) {
      let v;
      for (;;) {
        let j = R.next(v);
        if (j.done) return j.value;
        let G = j.value;
        if (((b = G.path), G.kind === "readlink")) g = !0;
        else A = void 0;
        if (((v = yield G), typeof v === "object" && "errno" in v))
          if (G.kind === "readlink") y = !0;
          else ((A = v.errno), (h ||= G.kind === "opendirNofollow" && v.errno === "ELOOP"));
      }
    },
    L = yield* x(
      resolvePathSafely(r, {
        unreadableAncestry: "unverified",
        launchAncestry: u,
        ...!1,
        onCollapsedLanding: (R) => {
          c = R;
        },
        onOutcome: (R) => {
          l = R;
        },
        onHop: ({ composed: composed, leaf: leaf, text: text }) => {
          if (leaf) (i.add(composed), (d = !0));
          if (n === "screen" && st(text)) ((s = !0), m(composed));
        },
      }),
    ),
    I = n === "permission" && !g && (A === "ENAMETOOLONG" || A === "EACCES" || A === "EPERM"),
    w = () => {
      let R = Mn(r);
      return (i.add(R), o(R));
    },
    M = () =>
      I
        ? w()
        : {
            unresolved: !0,
            requested: r,
            spellings: Array.from(i),
            stoppedAt: b,
            leafIsSymlink: d,
            reason: g || h ? "past-a-link" : "unexamined",
          },
    F = 8,
    O = function* () {
      for (let R = 0; R < S.length; R++) {
        if (R >= F) return !1;
        let v = S[R];
        if ((Qn(v) && !isWslUncPath(v)) || Ya(v) || tP(v)) {
          i.add(v);
          continue;
        }
        let j = yield* x(
          resolvePathSafely(v, {
            unreadableAncestry: "unverified",
            launchAncestry: u,
            onHop: ({ composed: composed, text: text }) => {
              if (st(text)) m(composed);
            },
          }),
        );
        if (j === UNVERIFIED_ANCESTRY || y) return !1;
        if (j !== void 0) i.add(j);
      }
      return !0;
    };
  if (L === UNVERIFIED_ANCESTRY || L === OPAQUE_LINK_TEXT) return M();
  if (L !== void 0) {
    if (n === "screen" && !(yield* O())) return M();
    if (c !== void 0) i.add(c);
    return (i.delete(L), i.add(L), o(L, d));
  }
  if (l === void 0) {
    if (n === "screen" && !y) return (yield* O()) ? w() : M();
    return M();
  }
  if (
    l.kind === "absent" &&
    (n === "screen" ? l.remaining.some((R) => cl(R)) : g && l.remaining.some((R) => $j(R)))
  )
    return M();
  let P = l.kind === "absent" ? l.at : l.path,
    Z = l.kind === "absent" ? l.remaining.join(pathModule.sep) : "",
    T = Mn(Z === "" ? P : pathModule.join(P, Z));
  if (g || P !== pathModule.parse(P).root) i.add(T);
  let U = joinIfChanged(yield { kind: "realpath", path: P }, P, Z);
  if (U !== void 0 && U !== T) (i.delete(U), i.add(U));
  if (n === "screen" && !(yield* O())) return M();
  return o(T, d);
}
//@ chunk-cgr0tezp.js:36346-36430 placement
function joinIfChanged(e, n, r) {
  if (typeof e !== "string" || e === n) return;
  return r === "" ? e : pathModule.join(e, r);
}
//@ chunk-cgr0tezp.js:36430-36521 placement
function resolvedSpellingWalk(e) {
  return { unresolved: !1, requested: e, spellings: [e], landing: e, leafIsSymlink: !1 };
}
//@ chunk-cgr0tezp.js:36521-36554 placement
function getPathsForPermissionCheck(e) {
  return permissionCheckSpellings(walkPermissionCheckPaths(e));
}
//@ chunk-cgr0tezp.js:36554-36743 placement
function permissionCheckSpellings(e) {
  if (!e.unresolved) return e.spellings;
  let {
    resolvedPath: resolvedPath,
    isCanonical: isCanonical,
    isSymlink: isSymlink,
  } = safeResolvePath(getFsImplementation(), e.requested);
  return (isCanonical || isSymlink) && !e.spellings.includes(resolvedPath)
    ? [...e.spellings, resolvedPath]
    : e.spellings;
}
//@ chunk-cgr0tezp.js:36743-40014 placement = NodeFsOperations (0.851)
var NodeFsOperations = {
  cwd() {
    return process.cwd();
  },
  existsSync(e) {
    using n = slowLogging`fs.existsSync(${e})`;
    return fsModule.existsSync(e);
  },
  async stat(e) {
    return stat_2(e);
  },
  async lstat(e) {
    return lstat(e);
  },
  async openDirNoFollow(e) {
    await (await open(e, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW)).close();
  },
  openDirNoFollowSync(e) {
    let openSync = fsModule.openSync(e, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW);
    fsModule.closeSync(openSync);
  },
  async lstatBigint(e) {
    return lstat(e, { bigint: !0 });
  },
  async statBigint(e) {
    return stat_2(e, { bigint: !0 });
  },
  async readdir(e) {
    return readdir(e, { withFileTypes: !0 });
  },
  async unlink(e) {
    return unlink_2(e);
  },
  async rmdir(e) {
    return rmdir(e);
  },
  async rm(e, n) {
    return rm(e, n);
  },
  async mkdir(e, n) {
    try {
      await mkdir_2(e, { recursive: !0, ...n });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  },
  async readFile(e, n) {
    return readFile(e, { encoding: n.encoding });
  },
  async rename(e, n) {
    return rename_2(e, n);
  },
  async realpath(e) {
    return Mn(await realpath(e));
  },
  async readlink(e) {
    return readlink(e);
  },
  async copyFile(e, n) {
    return copyFile(e, n);
  },
  async appendFile(e, n, r) {
    if (r?.mode !== void 0)
      try {
        let i = await open(e, "ax", r.mode);
        try {
          await i.appendFile(n);
        } finally {
          await i.close();
        }
        return;
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    return appendFile_2(e, n);
  },
  async symlink(e, n, r) {
    return symlink_2(e, n, r);
  },
  async link(e, n) {
    return link(e, n);
  },
  async chmod(e, n) {
    return chmod(e, n);
  },
  statSync(e) {
    using n = slowLogging`fs.statSync(${e})`;
    return fsModule.statSync(e);
  },
  lstatSync(e) {
    using n = slowLogging`fs.lstatSync(${e})`;
    return fsModule.lstatSync(e);
  },
  readFileSync(e, n) {
    using r = slowLogging`fs.readFileSync(${e})`;
    return fsModule.readFileSync(e, { encoding: n.encoding });
  },
  readSync(e, n) {
    using r = slowLogging`fs.readSync(${e}, ${n.length} bytes)`;
    let i = void 0;
    try {
      i = fsModule.openSync(e, "r");
      let s = [],
        o = 0;
      while (o < n.length) {
        let allocUnsafe = Buffer.allocUnsafe(Math.min(65536, n.length - o)),
          sync = fsModule.readSync(i, allocUnsafe, 0, allocUnsafe.length, o);
        if (sync === 0) break;
        (s.push(allocUnsafe.subarray(0, sync)), (o += sync));
      }
      return { buffer: Buffer.concat(s, o), bytesRead: o };
    } finally {
      if (i !== void 0) fsModule.closeSync(i);
    }
  },
  appendFileSync(e, n, r) {
    using i = slowLogging`fs.appendFileSync(${e}, ${n.length} chars)`;
    if (r?.mode !== void 0)
      try {
        let openSync = fsModule.openSync(e, "ax", r.mode);
        try {
          fsModule.appendFileSync(openSync, n);
        } finally {
          fsModule.closeSync(openSync);
        }
        return;
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    fsModule.appendFileSync(e, n);
  },
  unlinkSync(e) {
    using n = slowLogging`fs.unlinkSync(${e})`;
    fsModule.unlinkSync(e);
  },
  renameSync(e, n) {
    using r = slowLogging`fs.renameSync(${e} ${Oi} ${n})`;
    fsModule.renameSync(e, n);
  },
  readlinkSync(e) {
    using n = slowLogging`fs.readlinkSync(${e})`;
    return fsModule.readlinkSync(e);
  },
  realpathSync(e) {
    using n = slowLogging`fs.realpathSync(${e})`;
    return Mn(fsModule.realpathSync(e));
  },
  mkdirSync(e, n) {
    using r = slowLogging`fs.mkdirSync(${e})`;
    let i = { recursive: !0 };
    if (n?.mode !== void 0) i.mode = n.mode;
    try {
      fsModule.mkdirSync(e, i);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  },
  readdirSync(e) {
    using n = slowLogging`fs.readdirSync(${e})`;
    return fsModule.readdirSync(e, { withFileTypes: !0 });
  },
  rmSync(e, n) {
    using r = slowLogging`fs.rmSync(${e})`;
    fsModule.rmSync(e, n);
  },
  createWriteStream(e) {
    return fsModule.createWriteStream(e);
  },
  async readFileBytes(e, n) {
    if (n === void 0) return readFile(e);
    let r = await open(e, nonblockingReadFlags());
    try {
      if (!(await r.stat()).isFile()) return Buffer.alloc(0);
      return await readHandleUpTo(r, n, "file");
    } finally {
      await r.close();
    }
  },
  async readFileFdGated(e, n) {
    try {
      let r = Li();
      if (r === 0) {
        if (!(await lstat(e)).isFile()) return null;
      }
      let i = await open(e, fsModule.constants.O_RDONLY | r);
      try {
        let stats = await i.stat();
        if (!stats.isFile() || stats.size > n) return null;
        let o = Number(stats.size),
          allocUnsafe = Buffer.allocUnsafe(o),
          u = 0;
        while (u < o) {
          let { bytesRead: bytesRead } = await i.read(allocUnsafe, u, o - u, u);
          if (bytesRead === 0) break;
          u += bytesRead;
        }
        return { content: (u < o ? allocUnsafe.subarray(0, u) : allocUnsafe).toString("utf8"), stats: stats };
      } finally {
        await i.close();
      }
    } catch {
      return null;
    }
  },
};
/**
 * 返回全局文件系统抽象 NodeFsOperations（同步/异步 fs 包装，可在测试或宿主模式下替换）。全局约 400 处调用，项目内几乎所有文件读写都经过它。
 */
//@ chunk-cgr0tezp.js:40014-40038 placement = getFsImplementation (0)
function getFsImplementation() {
  return NodeFsOperations;
}
//@ chunk-cgr0tezp.js:40038-40367 placement
function processChdir(e) {
  let n;
  try {
    n = process.cwd();
  } catch {}
  process.chdir(e);
  let r;
  try {
    r = process.cwd();
  } catch {
    r = e;
  }
  if (!nt(r)) return n;
  if (n !== void 0)
    try {
      (process.chdir(n), process.cwd());
    } catch {}
  throw Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, chdir '${e}'`,
      "ENOENT: no such file or directory",
    ),
    { code: "ENOENT", syscall: "chdir", path: e },
  );
}
//@ chunk-cgr0tezp.js:40367-40709 placement = readFileRange (1)
async function readFileRange(path, offset, maxBytes) {
  await using i = typeof path === "string" ? await open(path, "r") : null;
  let s = typeof path === "string" ? i : path,
    size = (await s.stat()).size;
  if (size <= offset) return null;
  let bytesToRead = Math.min(size - offset, maxBytes),
    buffer = Buffer.allocUnsafe(bytesToRead),
    totalRead = 0;
  while (totalRead < bytesToRead) {
    let { bytesRead: bytesRead } = await s.read(
      buffer,
      totalRead,
      bytesToRead - totalRead,
      offset + totalRead,
    );
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return { content: buffer.toString("utf8", 0, totalRead), bytesRead: totalRead, bytesTotal: size };
}
/**
 * 读取文件末尾若干字节/行（日志、转录尾部读取用）。
 */
//@ chunk-cgr0tezp.js:40709-40974 placement
async function readHandleUpTo(e, n, r) {
  let i = r !== void 0 ? r === "file" : (await e.stat()).isFile(),
    s = [],
    o = 0;
  while (o < n) {
    let buffer = Buffer.allocUnsafe(Math.min(65536, n - o)),
      { bytesRead: bytesRead } = await e.read(buffer, 0, buffer.length, i ? o : null);
    if (bytesRead === 0) break;
    (s.push(buffer.subarray(0, bytesRead)), (o += bytesRead));
  }
  return Buffer.concat(s, o);
}
/**
 * 按字节范围读取文件片段。
 */
//@ chunk-cgr0tezp.js:40974-41352 placement = readFileRange (1)
async function tailFile(e, n) {
  await using r = typeof e === "string" ? await open(e, "r") : null;
  let i = typeof e === "string" ? r : e,
    size = (await i.stat()).size;
  if (size === 0) return { content: "", bytesRead: 0, bytesTotal: 0 };
  let max = Math.max(0, size - n),
    a = size - max,
    buffer = Buffer.allocUnsafe(a),
    totalRead = 0;
  while (totalRead < a) {
    let { bytesRead: bytesRead } = await i.read(buffer, totalRead, a - totalRead, max + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return { content: buffer.toString("utf8", 0, totalRead), bytesRead: totalRead, bytesTotal: size };
}
//@ chunk-cgr0tezp.js:41352-41804 placement
async function* readLines(e, n = 65536) {
  let r = await open(e, "r"),
    alloc = Buffer.alloc(n),
    s = 0,
    o = [],
    a = 0;
  try {
    while (!0) {
      let { bytesRead: bytesRead } = await r.read(alloc, 0, n, s);
      if (bytesRead === 0) break;
      s += bytesRead;
      let chunk = alloc.subarray(0, bytesRead),
        l = 0;
      while (l < bytesRead) {
        let index = chunk.indexOf(10, l);
        if (index === -1) {
          (o.push(Buffer.from(chunk.subarray(l))), (a += bytesRead - l));
          break;
        }
        if (a === 0) yield chunk.subarray(l, index);
        else (yield Buffer.concat([...o, chunk.subarray(l, index)], a + (index - l)), (o = []), (a = 0));
        l = index + 1;
      }
    }
  } finally {
    await r.close();
  }
  if (a > 0) yield o.length === 1 ? o[0] : Buffer.concat(o, a);
}
//@ chunk-cgr0tezp.js:41804-41815 placement
var ye = 256;
//@ chunk-cgr0tezp.js:41815-42032 placement
class FileChangedDuringReadError extends Error {
  partialRead;
  constructor(e = !1) {
    super("A file changed while it was being read, so the lines read from it may not be its current lines");
    this.partialRead = e;
    this.name = "FileChangedDuringReadError";
  }
}
//@ chunk-cgr0tezp.js:42032-43018 placement
async function* readLinesReverse(e, n = 65536, { onOpen: r, strict: i = !0 } = {}) {
  let s = await open(e, "r");
  try {
    let { size: size } = await s.stat();
    r?.(size);
    let allocUnsafe = Buffer.allocUnsafe(Math.min(n + ye, size)),
      allocUnsafe_2 = Buffer.allocUnsafe(Math.min(ye, size)),
      c = 0,
      l = size,
      d = 0,
      g = size,
      y,
      h = async (f, m, b) => {
        let A = 0;
        while (A < m) {
          let read = await s.read(f, A, m - A, b + A);
          if (read.bytesRead === 0 || (i && read.bytesRead < m - A))
            throw new FileChangedDuringReadError(read.bytesRead > 0);
          A += read.bytesRead;
        }
        let x = l + d - b;
        if (!f.subarray(x, x + c).equals(allocUnsafe_2.subarray(0, c)))
          throw new FileChangedDuringReadError();
      },
      S = async (f) => {
        let m = Math.max(g, l + d + c) - f,
          allocUnsafe = Buffer.allocUnsafe(m);
        return (await h(allocUnsafe, m, f), allocUnsafe.toString("utf8", 0, g - f));
      };
    while (l > 0) {
      if (
        ((c = Math.min(ye, d)),
        allocUnsafe.copy(allocUnsafe_2, 0, 0, c),
        (d = Math.min(n, l, i && l === size ? ye : 1 / 0)),
        (l -= d),
        await h(allocUnsafe, d + c, l),
        i)
      )
        y ??= Buffer.from(allocUnsafe.subarray(Math.max(0, d - ye), d));
      let index = allocUnsafe.lastIndexOf(10, d - 1);
      while (index !== -1) {
        let m = l + index + 1;
        if (m < g) yield g <= l + d ? allocUnsafe.toString("utf8", index + 1, g - l) : await S(m);
        ((g = l + index), (index = index === 0 ? -1 : allocUnsafe.lastIndexOf(10, index - 1)));
      }
    }
    if (g > 0) yield g <= d ? allocUnsafe.toString("utf8", 0, g) : await S(0);
    if (y !== void 0)
      ((l = size - y.length), (d = 0), (c = y.copy(allocUnsafe_2)), await h(allocUnsafe, c, l));
  } finally {
    await s.close();
  }
}
//@ chunk-cgr0tezp.js:43018-43122 placement
function createOffsetMappedText(e) {
  let int32Array = new Int32Array(e.length);
  for (let r = 0; r < e.length; r++) int32Array[r] = r;
  return { text: e, origin: int32Array };
}
//@ chunk-e6aww6q8.js:1151949-1152000 placement
function resolveForPermissionCheck(e, n) {
  return ai(n) || isMacSpecialPath(n) ? n : (resolveDeepestExistingAncestorSync(e, n) ?? n);
}
//@ chunk-e6aww6q8.js:1152000-1152140 layout
function isPathMatchedForPermission(e, n) {
  if (e === "") return !1;
  if (e.startsWith("~")) {
    let r = Lu(e);
    if (r.startsWith("~")) return !0;
    return getPathsForPermissionCheck_2(r, n) || getPathsForPermissionCheck_2(e, n);
  }
  return getPathsForPermissionCheck_2(e, n);
}
/**
 * 返回权限检查需要比对的路径集合（原始、规范化、符号链接解析后）。
 */
//@ chunk-e6aww6q8.js:1152140-1153141 callgraph-fingerprint = getPathsForPermissionCheck (0.425)
function getPathsForPermissionCheck_2(e, n) {
  let fsImpl = getFsImplementation();
  if (isMacSpecialPath(e)) return !0;
  if ((!ai(e) || !0) && !Ya(e) && /(^|[/\\])\.\.(?:[/\\]|$)/.test(e)) {
    let Se = /\/+/,
      ke = isAbsolute_21(e) ? parse_4(e).root : "",
      we = ke ? parse_4(resolve_18(n, e)).root : n,
      parts = (ke ? e.slice(ke.length) : e).split(Se),
      Ae = we;
    for (let depth = 0; depth < parts.length; depth++) {
      let Me = parts[depth];
      if (Me === "" || Me === ".") continue;
      if (Me === "..") {
        Ae = dirname_28(Ae);
        continue;
      }
      if (((Ae = Ae.endsWith(sep_28) ? Ae + Me : Ae + sep_28 + Me), Ya(Ae))) break;
      if (isMacSpecialPath(Ae)) return !0;
      try {
        if (fsImpl.lstatSync(Ae).isSymbolicLink() && parts.slice(depth + 1).includes("..")) return !0;
      } catch {}
    }
  }
  let resolved = resolve_18(n, e),
    normalized = resolveForPermissionCheck(fsImpl, resolved).normalize("NFC"),
    normalized_2 = (resolveDeepestExistingAncestorSync(fsImpl, n) ?? n).normalize("NFC");
  function S(Se) {
    let ke = relative_18(Se, normalized);
    if (ke === "" || ke.startsWith(".." + sep_28) || isAbsolute_21(ke)) return !1;
    let replaced = ke
      .split(sep_28)
      .join("/")
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u017f/g, "s");
    return GIT_INTERNAL_PATH_PATTERNS.some((Ee) => Ee.test(replaced));
  }
  if (S(normalized_2)) return !0;
  if (!relative_18(normalized_2, normalized).startsWith(".." + sep_28)) return !1;
  let L = getOriginalCwd(),
    normalized_3 = (resolveDeepestExistingAncestorSync(fsImpl, L) ?? L).normalize("NFC"),
    q = relative_18(normalized_3, normalized);
  if (q === "" || q.startsWith(".." + sep_28) || isAbsolute_21(q)) return !1;
  let Z = normalized_2;
  do if (((Z = dirname_28(Z)), S(Z))) return !0;
  while (Z !== normalized_3 && Z !== dirname_28(Z));
  return !1;
}
//@ chunk-e6aww6q8.js:1337160-1337480 fingerprint = isDuplicatePath (0.685)
function isDuplicatePath_2(e, n) {
  let mapped = n.map((s) => s.replaceAll("\\", "/"));
  for (let s of mapped) {
    if (!s.startsWith("/")) continue;
    let search = s.search(/[*?{[]/),
      y = search === -1 ? s : s.slice(0, search),
      S = dirname_31(y);
    try {
      let w = safeResolvePath(e, S),
        { resolvedPath: resolvedPath } = w;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(S, w)) continue;
      let replaced = resolvedPath.replaceAll("\\", "/");
      if (replaced !== S) {
        let q = replaced + s.slice(S.length);
        mapped.push(q);
      }
    } catch {}
  }
  return mapped;
}
//@ chunk-awy329vy.js:49206-49477 fingerprint = readLinesReverse (0.747)
async function readLinesReverse_2(n, e) {
  let r;
  try {
    r = await open_5(n, $c());
    let stats = await r.stat();
    if (!stats.isFile() || stats.size > e) return;
    let remainder = Buffer.alloc(stats.size + 1),
      { bytesRead: bytesRead } = await r.read(remainder, 0, remainder.length, 0);
    return bytesRead === stats.size ? remainder.subarray(0, bytesRead) : void 0;
  } catch {
    return;
  } finally {
    await r?.close().catch(() => {});
  }
}
//@ chunk-jhrww53q.js:47434-47579 fingerprint = safeResolvePath (0.602)
function safeResolvePath_2(o) {
  return (
    !o.isDirectory() &&
    !o.isFile() &&
    !o.isSymbolicLink() &&
    !o.isFIFO() &&
    !o.isSocket() &&
    !o.isBlockDevice() &&
    !o.isCharacterDevice()
  );
}

export {
  getFsImplementation,
  hasUntouchableRecordSpellingStrictAsync,
  hasUntouchableRecordSpelling,
  processChdir,
  findIntermediateUncJunction,
  NodeFsOperations,
  readLinesReverse,
  FileChangedDuringReadError,
  tailFile,
  hasUntouchableRecordSpellingAsync,
  getPathsForPermissionCheck,
  walkPermissionCheckPaths,
  safeResolvePath,
  vetRepoSettingsPath,
  isSymlinkToNetworkPathError,
  realpathExaminedSync,
  createOffsetMappedText,
  permissionCheckSpellings,
  resolveDeepestExistingAncestorSync,
  UNVERIFIED_ANCESTRY,
  readFileRange,
  entryReachesForeignNetwork,
  isDuplicatePath_2,
  safeResolvePath_2,
  vetRepoSettingsPathAsync,
  nonblockingReadFlags,
  readHandleUpTo,
  isOpaqueLinkText,
  findIntermediateUncJunctionAsync,
  OPAQUE_LINK_TEXT,
  getPathsForNetworkScreen,
  resolvedSpellingWalk,
  hopCapExhausted,
  vouchedLaunchAncestry,
  readLinesReverse_2,
  isDuplicatePath,
  walkPermissionCheckPathsAsync,
  isSpelledStrictAncestor,
  isPathMatchedForPermission,
  resolveForPermissionCheck,
  getPathsForPermissionCheck_2,
  repoSettingsRefusalReason,
  expandWin32ExistingLongNamesStrict,
  examineEntryChain,
  isNetworkJunction,
  hasUntouchableRecordSpellingStrict,
  SYMLINK_TO_NETWORK_PATH_CODE,
  expandWin32ExistingLongNames,
  getPathsForNetworkScreenAsync,
  readLines,
};
