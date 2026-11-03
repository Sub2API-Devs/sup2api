/**
 * services/remoteTools/remoteFileRead.ts
 *
 * 2.1.316 新增。为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-es7wzebn.js (23)
 * attribution: placement 23
 */
import {
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  sep,
  sep as sep_2,
  parse,
  parse as parse_2,
  isAbsolute,
  resolve,
  dirname,
  join,
} from "path";
import { constants } from "fs";
import { realpath, lstat, readlink, open } from "fs/promises";
import { isFullyQualifiedPath, expandStablePath, UnstablePathError, expandPath } from "../../utils/path.js";
import {
  getErrnoCode,
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { hm } from "../../utils/pathPrefix.js";
import { isDiskless, onProcessRootHost, getPermissionScreenAnchor } from "../../bootstrap/state.js";
import { Mn } from "../../utils/pathClassification.js";
import {
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  entryReachesForeignNetwork,
} from "../../utils/fsOperations.js";
import { getCwd } from "../../utils/cwd.js";
import { cH, tei, NF } from "../../utils/permissions/pathVetting.js";
import { uniq } from "../../utils/collections.js";
import {
  allWorkingDirectories,
  isWorkingDirPathHeldAsNamed,
  pathInWorkingPath,
  checkReadableInternalPath,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { withDeadline } from "../../utils/sleep.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isDifferentNetworkLocation } from "../../utils/networkPaths.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isPathAllowed } from "../../utils/permissions/pathValidation.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logEvent } from "../analytics/index.js";
import { getFileExtensionForAnalytics } from "../analytics/metadata.js";

//@ chunk-es7wzebn.js:1096-1115 placement
var re = 512,
  ie = 4096;
//@ chunk-es7wzebn.js:1115-1201 placement
function N(e) {
  return Array.isArray(e) && e.length > 0 && e.length <= re && e.every(oe) ? e : void 0;
}
//@ chunk-es7wzebn.js:1201-1297 placement
function oe(e) {
  return (
    typeof e === "string" &&
    e.length <= ie &&
    !e.includes("\x00") &&
    isFullyQualifiedPath(e) &&
    normalize_2(e) === e
  );
}
//@ chunk-es7wzebn.js:1297-1426 placement
function isUnderAnyRoot(e, r) {
  return e.some((n) => {
    let o = n.endsWith(sep) && parse(n).root !== n ? n.slice(0, -sep.length) : n;
    return r === o || r.startsWith(o + sep);
  });
}
//@ chunk-es7wzebn.js:1551-1569 placement
var ae = 32,
  de = 4096;
/**
 * 解析远程读取的目标路径
 */
//@ chunk-es7wzebn.js:1569-2853 placement
async function resolveRemoteReadPath(
  e,
  {
    directories: directories,
    unprobedDirectories: unprobedDirectories = [],
    gate: gate,
    heldFiles: heldFiles,
  },
) {
  try {
    if (
      e === "" ||
      e !== e.trim() ||
      e.length > de ||
      e.includes("\x00") ||
      /^~(?:\/|$)/.test(e) ||
      (parse_2(e).root !== "" && !isFullyQualifiedPath(e))
    )
      return { path: null, why: "unfit_text" };
    let filtered = directories.filter((d) => isFullyQualifiedPath(d)),
      filtered_2 = unprobedDirectories.filter((d) => isFullyQualifiedPath(d)),
      m = new Set((isAbsolute(e) ? [e] : filtered).map((d) => expandStablePath(e, d))),
      l = await groupByResolvedPath([...m], e, gate);
    if (l === null) return { path: null, why: "too_many" };
    let u = new Set(heldFiles()),
      h = new Set(l.flat());
    if ([...m, ...filtered_2.map((d) => expandStablePath(e, d))].some((d) => u.has(d) && !h.has(d)))
      return { path: null, why: "held_file_unreadable" };
    let filtered_3 = l.filter((d) => d.some((y) => u.has(y)));
    if (l.length > 0) return pickUniqueFile(filtered_3.length > 0 ? filtered_3 : l, "directories");
    let _ = normalize_3(e);
    if (
      filtered.length === 0 ||
      isAbsolute(e) ||
      _.length !== e.length ||
      _.split(sep_2).some((d) => ["", ".", ".."].includes(d))
    )
      return { path: null, why: "no_file" };
    let w = matchingCandidatePaths(sep_2 + _, u, filtered),
      S = new Set(w);
    if (matchingCandidatePaths(sep_2 + _, u, filtered_2).some((d) => !S.has(d)))
      return { path: null, why: "held_file_unreadable" };
    if (w.length === 0) return { path: null, why: "needs_file_search" };
    let R = await groupByResolvedPath(w, e, gate);
    return R !== null && R.flat().length < w.length
      ? { path: null, why: "held_file_unreadable" }
      : pickUniqueFile(R, "file_state");
  } catch (error) {
    if (error instanceof UnstablePathError) return { path: null, why: "unfit_text" };
    try {
      let p = getErrnoCode(error),
        m = error instanceof Error ? error.name : typeof error;
      logForDebugging(`resolveAsWrittenPath failed: ${p === void 0 ? m : `${m}/${p}`}`, { level: "error" });
    } catch {}
    return { path: null, why: "fault" };
  }
}
/**
 * 按解析路径分组
 */
//@ chunk-es7wzebn.js:2853-3016 placement
async function groupByResolvedPath(e, r, n) {
  if (e.length > ae) return null;
  let o = new Map();
  for (let s of e) {
    let i = await n(s, r);
    if (i !== null) o.set(i, [...(o.get(i) ?? []), s]);
  }
  return [...o.values()];
}
/**
 * 唯一匹配结果
 */
//@ chunk-es7wzebn.js:3016-3186 placement
function pickUniqueFile(e, r) {
  if (e === null) return { path: null, why: "too_many" };
  let n = e[0]?.[0];
  return n === void 0
    ? { path: null, why: "no_file" }
    : e.length > 1
      ? { path: null, why: "tie" }
      : { path: n, step: r };
}
//@ chunk-es7wzebn.js:3186-3315 placement
function matchingCandidatePaths(e, r, n) {
  let o = new Set();
  for (let s of r)
    if (s.endsWith(e) && isFullyQualifiedPath(s) && normalize_3(s) === s && n.some((i) => hm(i, s, !1)))
      o.add(s);
  return [...o];
}
/**
 * 找 .git 所在目录
 */
//@ chunk-es7wzebn.js:3315-3625 placement
async function findGitRootBelow(e, r, n) {
  if (isDiskless()) return null;
  let o = resolve(e);
  if (r.unresolved || r.landing !== Mn(o)) return null;
  let s = getFsImplementation();
  for (let i = o; !n(); i = dirname(i)) {
    let p = await s.lstat(join(i, ".git")).catch(() => {
      return;
    });
    if (p?.isDirectory() === !0 || p?.isFile() === !0 || p?.isSymbolicLink() === !0) return Mn(i);
    if (dirname(i) === i) return null;
  }
  return null;
}
/**
 * 在时限内搜索文件
 */
//@ chunk-es7wzebn.js:3625-4457 placement
async function searchHeldFile(
  e,
  { heldFiles: heldFiles, timeLimitMs: timeLimitMs, stranded: stranded, whyNotBegin: whyNotBegin },
  i,
  p,
) {
  if (stranded.probes > 0) return { path: null, why: "stranded" };
  let m = whyNotBegin();
  if (m !== void 0) return { path: null, why: m };
  let l = getCwd(),
    u = (y) => cH(y, i.trustedNetworkDirectories) === void 0,
    h = performance.now() + timeLimitMs,
    f = !1,
    _ = () => f || performance.now() >= h,
    w = 0,
    S = (y) => (
      w++,
      y.finally(() => {
        (w--, (stranded.probes -= f ? 1 : 0));
      })
    ),
    R = { path: null, why: "no_file" },
    d = async () => {
      let y = null;
      if (u(l)) {
        let g = await S(walkPermissionCheckPathsAsync(resolve(l)));
        if (_()) return R;
        y = await S(findGitRootBelow(l, g, _));
      }
      if (_()) return R;
      let E = uniq([l, y ?? l, ...allWorkingDirectories(i)]),
        filtered = E.filter(u);
      for (let g of filtered) {
        if (_()) return R;
        if (g !== l) await S(walkPermissionCheckPathsAsync(g));
      }
      if (_()) return R;
      return resolveRemoteReadPath(e, {
        directories: filtered,
        unprobedDirectories: E.filter((g) => !u(g)),
        gate: (g, P) => (_() ? Promise.resolve(null) : S(p(g, P, i))),
        heldFiles: heldFiles,
      });
    };
  try {
    let y = await withDeadline(d(), timeLimitMs);
    return y === void 0 || _() ? { path: null, why: "time_limit" } : y;
  } finally {
    ((f = !0), (stranded.probes += w));
  }
}
/**
 * 远程读文件的上限与常量：最大字符数、打开标志、文件系统操作、最大字节数和用户数据根目录缓存。
 */
//@ chunk-es7wzebn.js:4457-4597 placement
var REMOTE_READ_MAX_CHARS = 1e6,
  REMOTE_READ_OPEN_FLAGS =
    constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOCTTY ?? 0) | READ_LIMITS,
  realFsOps = { realpath: realpath, lstat: lstat, readlink: readlink },
  REMOTE_READ_MAX_BYTES = 1e7,
  userDataRootsCache = new HostScoped(() => ({ promise: void 0 }));
/**
 * 加载用户数据根目录
 */
//@ chunk-es7wzebn.js:4597-4830 placement
function loadUserDataRoots() {
  let e = onProcessRootHost(userDataRootsCache);
  return (
    (e.promise ??= Promise.all([import("./chunk-r9zhhmsv.js"), import("./chunk-2s3tfbmy.js")])
      .then(([r, n]) => [...r.FIXED_USER_DATA_ROOTS, n.SYNCED_FILE_ROOT])
      .catch((r) => {
        throw ((e.promise = void 0), r);
      })),
    e.promise
  );
}
//@ chunk-es7wzebn.js:4830-4933 placement
function isInAnyGroup(e, r) {
  if (!r || r.size === 0) return !1;
  for (let n of r.values()) if (n.includes(e)) return !0;
  return !1;
}
//@ chunk-es7wzebn.js:4933-5406 placement
async function isCanonicalPathContained(e, r) {
  let n = [];
  try {
    n = await loadUserDataRoots();
  } catch {}
  for (let o of allWorkingDirectories(r)) {
    if (
      r.additionalWorkingDirectories.has(o) &&
      !isInAnyGroup(o, r.trustedNetworkDirectories) &&
      (await entryReachesForeignNetwork(o, getPermissionScreenAnchor()))
    )
      continue;
    let s;
    try {
      s = isWorkingDirPathHeldAsNamed(o) ? o : await realpath(o);
    } catch {
      continue;
    }
    if (isDifferentNetworkLocation(o, s, getPermissionScreenAnchor())) continue;
    if (pathInWorkingPath(e, s, { caseFold: !1, skipPrivateAlias: !0, uncShapeParity: !0 })) return !0;
  }
  for (let o of n)
    if (pathInWorkingPath(e, o, { caseFold: !1, skipPrivateAlias: !0, uncShapeParity: !0 })) return !0;
  return checkReadableInternalPath(e, {}, [e], { remoteSurface: !0 }).behavior === "allow";
}
/**
 * 远程读取拒绝的遥测文案
 */
//@ chunk-es7wzebn.js:5406-6957 placement
var REMOTE_READ_REFUSAL_MESSAGES = {
  nt_namespace: "read_file: NT-namespace path rejected before filesystem access",
  untrusted_unc: "read_file: untrusted UNC path rejected before filesystem access",
  untrusted_automount: "read_file: automount path rejected before filesystem access",
  unvettable_chain: "read_file: unvettable path ancestry rejected before filesystem access",
  link_text_climbs:
    'read_file: path through a symlink whose target has ".." past its leading "../" segments rejected',
  suspicious_windows_spelling_nt_device_namespace:
    "read_file: suspicious Windows path spelling rejected (NT device namespace)",
  suspicious_windows_spelling_colon_past_drive_position:
    "read_file: suspicious Windows path spelling rejected (colon past the drive-letter position)",
  suspicious_windows_spelling_tilde_digit:
    "read_file: suspicious Windows path spelling rejected (tilde followed by a digit)",
  suspicious_windows_spelling_device_path_prefix:
    "read_file: suspicious Windows path spelling rejected (device-path prefix)",
  suspicious_windows_spelling_trailing_dot_or_whitespace:
    "read_file: suspicious Windows path spelling rejected (trailing dot or whitespace in a segment)",
  suspicious_windows_spelling_dos_device_suffix:
    "read_file: suspicious Windows path spelling rejected (DOS device-name suffix)",
  suspicious_windows_spelling_dot_run_segment:
    "read_file: suspicious Windows path spelling rejected (dot-run segment)",
  suspicious_windows_spelling_unc_or_webdav_form:
    "read_file: suspicious Windows path spelling rejected (UNC-like form: doubled or mixed separators, embedded NT root, or WebDAV marker)",
};
//@ chunk-es7wzebn.js:6957-7035 placement
function b(e, r = "remote read denied") {
  return new WireSafeControlError(`read denied: ${sanitizeTelemetryString(e)}`, r);
}
//@ chunk-es7wzebn.js:7035-7132 placement
var A = { refused: !0, telemetryMessage: void 0, unsettled: !1, openFailure: void 0 },
  Y = { ...A, unsettled: !0 };
/**
 * 检查并打开路径
 */
//@ chunk-es7wzebn.js:7132-7966 placement
async function openVettedPath(e, r, n, o, s, i) {
  let p = i ? await tei(e, r, n.trustedNetworkDirectories) : NF(e, r, n.trustedNetworkDirectories);
  if (!p.ok) {
    let l =
      p.reason === "suspicious_windows_spelling" ? `suspicious_windows_spelling_${p.spelling}` : p.reason;
    return { ...A, telemetryMessage: REMOTE_READ_REFUSAL_MESSAGES[l] };
  }
  for (let l of p.pathsToCheck)
    if (!isPathAllowed(l, n, "read").allowed || matchingRuleForInput(l, n, "read", "ask") !== null) return A;
  let m;
  try {
    m = await open(r, REMOTE_READ_OPEN_FLAGS);
  } catch (error) {
    return { ...A, openFailure: { error: error } };
  }
  try {
    let stats = await m.stat({ bigint: !0 });
    if (!stats.isFile()) return A;
    let u;
    try {
      u = await o.realpath(r);
    } catch {
      return Y;
    }
    let h = await bindCanonicalPathToHandle(m, stats, u, o);
    if (h === void 0) return Y;
    if (((u = h), !isPathAllowed(u, n, "read").allowed || matchingRuleForInput(u, n, "read", "ask") !== null))
      return A;
    if (cH(u, n.trustedNetworkDirectories) !== void 0) return A;
    if (!(await isCanonicalPathContained(u, n))) return A;
    return { refused: !1, value: await s({ handle: m, openedStat: stats, canonicalPath: u }) };
  } finally {
    await m.close();
  }
}
//@ chunk-es7wzebn.js:7966-8010 placement
function G(e) {
  return e === void 0 ? void 0 : fromEnum(e);
}
/**
 * 为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 */
//@ chunk-es7wzebn.js:8010-9717 placement
async function readFileForRemote(
  e,
  r,
  n,
  {
    encoding: o = "utf-8",
    anchor: s,
    telemetrySource: i,
    containmentFs: p = realFsOps,
    asWrittenSources: m,
  } = {},
) {
  let min = Math.min(r && r > 0 ? r : REMOTE_READ_MAX_CHARS, REMOTE_READ_MAX_BYTES),
    u = s?.kind === "as_written",
    h = u ? "not_served" : void 0;
  try {
    let f =
      s === void 0 || u ? void 0 : await (await import("./chunk-qa2d1m12.js")).resolveAnchoredReadPath(e, s);
    if (f === null) throw b(e);
    let _ = () => {
        let F = m?.whyNotServed();
        if (F !== void 0) throw ((h = F), b(e));
      },
      w;
    if (u) {
      if (m === void 0) throw b(e);
      _();
      let F = N(s.within);
      if (F === void 0) throw ((h = "unfit_within"), b(e));
      h = "fault";
      let g = await searchHeldFile(e, m, typeof n === "function" ? n() : n, (P, q, ee) =>
        resolveCanonicalReadPath(P, q, ee, p),
      );
      if (((h = g.path === null ? g.why : g.step), g.path === null)) throw b(e);
      if (!isUnderAnyRoot(F, g.path)) throw ((h = "outside"), b(e));
      w = g.path;
    }
    let S = typeof n === "function" ? n() : n,
      R = f?.absPath ?? w ?? expandPath(e),
      d = await openVettedPath(
        e,
        R,
        S,
        p,
        ({ handle: handle, openedStat: openedStat }) => readHandleBounded(handle, min, openedStat.size),
        u,
      );
    if (d.refused) throw d.openFailure === void 0 ? b(e, d.telemetryMessage) : d.openFailure.error;
    let { bytes: bytes, overLimit: overLimit } = d.value;
    if (w !== void 0) _();
    if (i)
      logEvent("tengu_bridge_read_file_served", {
        success: !0,
        source: fromEnum(i),
        size_bytes: bytes.length,
        requested_max_bytes: min,
        truncated: overLimit,
        ext: getFileExtensionForAnalytics(R),
        as_written_lookup: G(h),
      });
    return {
      contents: bytes.toString(o === "base64" ? "base64" : "utf-8"),
      absPath: R,
      ...(overLimit && { truncated: overLimit }),
      ...(o === "base64" && { encoding: o }),
      ...(f !== void 0 && { anchor: f.kind }),
      ...(w !== void 0 && { anchor: "as_written" }),
    };
  } catch (error) {
    try {
      let _ =
        error instanceof Error
          ? "code" in error && typeof error.code === "string"
            ? `${error.name}/${error.code}`
            : error.name
          : typeof error;
      logForDebugging(
        `readFileForRemote failed pre-deny: ${_}${h === void 0 ? "" : `, as_written look-up: ${h}`}`,
        { level: "error" },
      );
    } catch {}
    try {
      if (i)
        logEvent("tengu_bridge_read_file_served", {
          success: !1,
          source: fromEnum(i),
          as_written_lookup: G(h),
        });
    } catch {}
    try {
      if (h !== void 0) m?.onRefusal(h);
    } catch {}
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      error.message.startsWith("read denied: ")
    )
      throw error;
    throw b(e);
  }
}
//@ chunk-es7wzebn.js:9717-9862 placement
class UnsettledRemoteFileError extends Error {
  constructor() {
    super("probeFileForRemote: cannot tell whether the path names a file");
    this.name = "UnsettledRemoteFileError";
  }
}
/**
 * 解析规范读取路径
 */
//@ chunk-es7wzebn.js:9862-10204 placement
async function resolveCanonicalReadPath(e, r, n, o = realFsOps) {
  if (!isFullyQualifiedPath(e) || normalize(e) !== e) return null;
  let s = await openVettedPath(
    r,
    e,
    n,
    o,
    ({ canonicalPath: canonicalPath }) => Promise.resolve(canonicalPath),
    !0,
  );
  if (!s.refused) return s.value;
  if (s.openFailure !== void 0) {
    let { error: error } = s.openFailure;
    if (
      isFsInaccessible(error) ||
      ["EISDIR", "ENXIO", "ENOTSUP", "EOPNOTSUPP"].includes(getErrnoCode(error) ?? "")
    )
      return null;
    throw error;
  }
  if (s.unsettled) throw new UnsettledRemoteFileError();
  return null;
}

export { REMOTE_READ_MAX_BYTES, readFileForRemote, REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained };
