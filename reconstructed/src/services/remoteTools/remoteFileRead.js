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
import { normalize, sep, parse, isAbsolute, resolve, dirname, join } from "path";
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
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { isDiskless, onProcessRootHost, getPermissionScreenAnchor } from "../../bootstrap/state.js";
import { identity } from "../../utils/pathClassification.js";
import {
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  entryReachesForeignNetwork,
} from "../../utils/fsOperations.js";
import { getCwd } from "../../utils/cwd.js";
import {
  pathVettingReason,
  vetPathSpellingsOrChainAsync,
  vetPathSpellingsOrChain,
} from "../../utils/permissions/pathVetting.js";
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
var MAX_CANDIDATE_PATHS = 512;
var MAX_CANDIDATE_PATH_CHARS = 4096;
//@ chunk-es7wzebn.js:1115-1201 placement
function validCandidatePaths(within) {
  return Array.isArray(within) &&
    within.length > 0 &&
    within.length <= MAX_CANDIDATE_PATHS &&
    within.every(isCanonicalAbsolutePath)
    ? within
    : undefined;
}
//@ chunk-es7wzebn.js:1201-1297 placement
function isCanonicalAbsolutePath(e) {
  return (
    typeof e === "string" &&
    e.length <= MAX_CANDIDATE_PATH_CHARS &&
    !e.includes("\x00") &&
    isFullyQualifiedPath(e) &&
    normalize(e) === e
  );
}
//@ chunk-es7wzebn.js:1297-1426 placement
function isUnderAnyRoot(e, path) {
  return e.some((n) => {
    let o = n.endsWith(sep) && parse(n).root !== n ? n.slice(0, -sep.length) : n;
    return path === o || path.startsWith(o + sep);
  });
}
//@ chunk-es7wzebn.js:1551-1569 placement
var MAX_AMBIGUOUS_CANDIDATES = 32;
var MAX_WIRE_MESSAGE_CHARS = 4096;
//@ chunk-es7wzebn.js:1569-2853 placement
/**
 * 解析远程读取的目标路径
 */
async function resolveRemoteReadPath(e, { directories, unprobedDirectories = [], gate, heldFiles }) {
  try {
    if (
      e === "" ||
      e !== e.trim() ||
      e.length > MAX_WIRE_MESSAGE_CHARS ||
      e.includes("\x00") ||
      /^~(?:\/|$)/.test(e) ||
      (parse(e).root !== "" && !isFullyQualifiedPath(e))
    )
      return {
        path: null,
        why: "unfit_text",
      };
    let filtered = directories.filter((directory) => isFullyQualifiedPath(directory));
    let filtered_2 = unprobedDirectories.filter((unprobedDirectory) =>
      isFullyQualifiedPath(unprobedDirectory),
    );
    let m = new Set((isAbsolute(e) ? [e] : filtered).map((d) => expandStablePath(e, d)));
    let l = await groupByResolvedPath([...m], e, gate);
    if (l === null)
      return {
        path: null,
        why: "too_many",
      };
    let u = new Set(heldFiles());
    let h = new Set(l.flat());
    if ([...m, ...filtered_2.map((d) => expandStablePath(e, d))].some((d) => u.has(d) && !h.has(d)))
      return {
        path: null,
        why: "held_file_unreadable",
      };
    let filtered_3 = l.filter((d) => d.some((y) => u.has(y)));
    if (l.length > 0) return pickUniqueFile(filtered_3.length > 0 ? filtered_3 : l, "directories");
    let _ = normalize(e);
    if (
      filtered.length === 0 ||
      isAbsolute(e) ||
      _.length !== e.length ||
      _.split(sep).some((d) => ["", ".", ".."].includes(d))
    )
      return {
        path: null,
        why: "no_file",
      };
    let w = matchingCandidatePaths(sep + _, u, filtered);
    let S = new Set(w);
    if (matchingCandidatePaths(sep + _, u, filtered_2).some((d) => !S.has(d)))
      return {
        path: null,
        why: "held_file_unreadable",
      };
    if (w.length === 0)
      return {
        path: null,
        why: "needs_file_search",
      };
    let R = await groupByResolvedPath(w, e, gate);
    return R !== null && R.flat().length < w.length
      ? {
          path: null,
          why: "held_file_unreadable",
        }
      : pickUniqueFile(R, "file_state");
  } catch (error) {
    if (error instanceof UnstablePathError)
      return {
        path: null,
        why: "unfit_text",
      };
    try {
      let errnoCode = getErrnoCode(error);
      let m = error instanceof Error ? error.name : typeof error;
      logForDebugging(`resolveAsWrittenPath failed: ${errnoCode === undefined ? m : `${m}/${errnoCode}`}`, {
        level: "error",
      });
    } catch {}
    return {
      path: null,
      why: "fault",
    };
  }
}
//@ chunk-es7wzebn.js:2853-3016 placement
/**
 * 按解析路径分组
 */
async function groupByResolvedPath(e, r, gate) {
  if (e.length > MAX_AMBIGUOUS_CANDIDATES) return null;
  let o = new Map();
  for (let s of e) {
    let i = await gate(s, r);
    if (i !== null) o.set(i, [...(o.get(i) ?? []), s]);
  }
  return [...o.values()];
}
//@ chunk-es7wzebn.js:3016-3186 placement
/**
 * 唯一匹配结果
 */
function pickUniqueFile(e, step) {
  if (e === null)
    return {
      path: null,
      why: "too_many",
    };
  let n = e[0]?.[0];
  return n === undefined
    ? {
        path: null,
        why: "no_file",
      }
    : e.length > 1
      ? {
          path: null,
          why: "tie",
        }
      : {
          path: n,
          step,
        };
}
//@ chunk-es7wzebn.js:3186-3315 placement
function matchingCandidatePaths(e, r, n) {
  let o = new Set();
  for (let s of r)
    if (
      s.endsWith(e) &&
      isFullyQualifiedPath(s) &&
      normalize(s) === s &&
      n.some((i) => isSubpathOf(i, s, false))
    )
      o.add(s);
  return [...o];
}
//@ chunk-es7wzebn.js:3315-3625 placement
/**
 * 找 .git 所在目录
 */
async function findGitRootBelow(cwd, r, n) {
  if (isDiskless()) return null;
  let o = resolve(cwd);
  if (r.unresolved || r.landing !== identity(o)) return null;
  let fsImplementation = getFsImplementation();
  for (let i = o; !n(); i = dirname(i)) {
    let p = await fsImplementation.lstat(join(i, ".git")).catch(() => {
      return;
    });
    if (p?.isDirectory() === true || p?.isFile() === true || p?.isSymbolicLink() === true) return identity(i);
    if (dirname(i) === i) return null;
  }
  return null;
}
//@ chunk-es7wzebn.js:3625-4457 placement
/**
 * 在时限内搜索文件
 */
async function searchHeldFile(e, { heldFiles, timeLimitMs, stranded, whyNotBegin }, i, p) {
  if (stranded.probes > 0)
    return {
      path: null,
      why: "stranded",
    };
  let m = whyNotBegin();
  if (m !== undefined)
    return {
      path: null,
      why: m,
    };
  let cwd = getCwd();
  let u = (y) => pathVettingReason(y, i.trustedNetworkDirectories) === undefined;
  let h = performance.now() + timeLimitMs;
  let f = false;
  let _ = () => f || performance.now() >= h;
  let w = 0;
  let S = (y) => {
    w++;
    return y.finally(() => {
      w--;
      stranded.probes -= f ? 1 : 0;
    });
  };
  let R = {
    path: null,
    why: "no_file",
  };
  let d = async () => {
    let y = null;
    if (u(cwd)) {
      let g = await S(walkPermissionCheckPathsAsync(resolve(cwd)));
      if (_()) return R;
      y = await S(findGitRootBelow(cwd, g, _));
    }
    if (_()) return R;
    let E = uniq([cwd, y ?? cwd, ...allWorkingDirectories(i)]);
    let filtered = E.filter(u);
    for (let g of filtered) {
      if (_()) return R;
      if (g !== cwd) await S(walkPermissionCheckPathsAsync(g));
    }
    if (_()) return R;
    return resolveRemoteReadPath(e, {
      directories: filtered,
      unprobedDirectories: E.filter((g) => !u(g)),
      gate: (g, P) => (_() ? Promise.resolve(null) : S(p(g, P, i))),
      heldFiles,
    });
  };
  try {
    let y = await withDeadline(d(), timeLimitMs);
    return y === undefined || _()
      ? {
          path: null,
          why: "time_limit",
        }
      : y;
  } finally {
    f = true;
    stranded.probes += w;
  }
}
//@ chunk-es7wzebn.js:4457-4597 placement
/**
 * 远程读文件的上限与常量：最大字符数、打开标志、文件系统操作、最大字节数和用户数据根目录缓存。
 */
var REMOTE_READ_MAX_CHARS = 1e6;
var REMOTE_READ_OPEN_FLAGS =
  constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOCTTY ?? 0) | READ_LIMITS;
var realFsOps = {
  realpath,
  lstat,
  readlink,
};
var REMOTE_READ_MAX_BYTES = 1e7;
var userDataRootsCache = new HostScoped(() => ({
  promise: undefined,
}));
//@ chunk-es7wzebn.js:4597-4830 placement
/**
 * 加载用户数据根目录
 */
function loadUserDataRoots() {
  let e = onProcessRootHost(userDataRootsCache);
  e.promise ??= Promise.all([import("./chunk-r9zhhmsv.js"), import("./chunk-2s3tfbmy.js")])
    .then(([r, n]) => [...r.FIXED_USER_DATA_ROOTS, n.SYNCED_FILE_ROOT])
    .catch((error) => {
      e.promise = undefined;
      throw error;
    });
  return e.promise;
}
//@ chunk-es7wzebn.js:4830-4933 placement
function isInAnyGroup(e, trustedNetworkDirectories) {
  if (!trustedNetworkDirectories || trustedNetworkDirectories.size === 0) return false;
  for (let n of trustedNetworkDirectories.values()) if (n.includes(e)) return true;
  return false;
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
    if (
      pathInWorkingPath(e, s, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      })
    )
      return true;
  }
  for (let o of n)
    if (
      pathInWorkingPath(e, o, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      })
    )
      return true;
  return (
    checkReadableInternalPath(e, {}, [e], {
      remoteSurface: true,
    }).behavior === "allow"
  );
}
//@ chunk-es7wzebn.js:5406-6957 placement
/**
 * 远程读取拒绝的遥测文案
 */
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
function remoteReadDenied(e, telemetryMessage = "remote read denied") {
  return new WireSafeControlError(`read denied: ${sanitizeTelemetryString(e)}`, telemetryMessage);
}
//@ chunk-es7wzebn.js:7035-7132 placement
/**
 * 远端读取的两种否定结果：路径被拒（refused）与身份无法确认（unsettled）。
 */
var REMOTE_READ_REFUSED = {
  refused: true,
  telemetryMessage: undefined,
  unsettled: false,
  openFailure: undefined,
};
var REMOTE_READ_UNSETTLED = {
  ...REMOTE_READ_REFUSED,
  unsettled: true,
};
//@ chunk-es7wzebn.js:7132-7966 placement
/**
 * 检查并打开路径
 */
async function openVettedPath(e, r, n, o, s, i) {
  let p = i
    ? await vetPathSpellingsOrChainAsync(e, r, n.trustedNetworkDirectories)
    : vetPathSpellingsOrChain(e, r, n.trustedNetworkDirectories);
  if (!p.ok) {
    let l =
      p.reason === "suspicious_windows_spelling" ? `suspicious_windows_spelling_${p.spelling}` : p.reason;
    return {
      ...REMOTE_READ_REFUSED,
      telemetryMessage: REMOTE_READ_REFUSAL_MESSAGES[l],
    };
  }
  for (let l of p.pathsToCheck)
    if (!isPathAllowed(l, n, "read").allowed || matchingRuleForInput(l, n, "read", "ask") !== null)
      return REMOTE_READ_REFUSED;
  let m;
  try {
    m = await open(r, REMOTE_READ_OPEN_FLAGS);
  } catch (error) {
    return {
      ...REMOTE_READ_REFUSED,
      openFailure: {
        error,
      },
    };
  }
  try {
    let stats = await m.stat({
      bigint: true,
    });
    if (!stats.isFile()) return REMOTE_READ_REFUSED;
    let u;
    try {
      u = await o.realpath(r);
    } catch {
      return REMOTE_READ_UNSETTLED;
    }
    let h = await bindCanonicalPathToHandle(m, stats, u, o);
    if (h === undefined) return REMOTE_READ_UNSETTLED;
    u = h;
    if (!isPathAllowed(u, n, "read").allowed || matchingRuleForInput(u, n, "read", "ask") !== null)
      return REMOTE_READ_REFUSED;
    if (pathVettingReason(u, n.trustedNetworkDirectories) !== undefined) return REMOTE_READ_REFUSED;
    if (!(await isCanonicalPathContained(u, n))) return REMOTE_READ_REFUSED;
    return {
      refused: false,
      value: await s({
        handle: m,
        openedStat: stats,
        canonicalPath: u,
      }),
    };
  } finally {
    await m.close();
  }
}
//@ chunk-es7wzebn.js:7966-8010 placement
function enumOrUndefined(e) {
  return e === undefined ? undefined : fromEnum(e);
}
//@ chunk-es7wzebn.js:8010-9717 placement
/**
 * 为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 */
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
  let min = Math.min(r && r > 0 ? r : REMOTE_READ_MAX_CHARS, REMOTE_READ_MAX_BYTES);
  let u = s?.kind === "as_written";
  let h = u ? "not_served" : undefined;
  try {
    let f =
      s === undefined || u
        ? undefined
        : await (await import("./chunk-qa2d1m12.js")).resolveAnchoredReadPath(e, s);
    if (f === null) throw remoteReadDenied(e);
    let _ = () => {
      let F = m?.whyNotServed();
      if (F !== undefined) {
        h = F;
        throw remoteReadDenied(e);
      }
    };
    let w;
    if (u) {
      if (m === undefined) throw remoteReadDenied(e);
      _();
      let F = validCandidatePaths(s.within);
      if (F === undefined) {
        h = "unfit_within";
        throw remoteReadDenied(e);
      }
      h = "fault";
      let g = await searchHeldFile(e, m, typeof n === "function" ? n() : n, (P, q, ee) =>
        resolveCanonicalReadPath(P, q, ee, p),
      );
      h = g.path === null ? g.why : g.step;
      if (g.path === null) throw remoteReadDenied(e);
      if (!isUnderAnyRoot(F, g.path)) {
        h = "outside";
        throw remoteReadDenied(e);
      }
      w = g.path;
    }
    let S = typeof n === "function" ? n() : n;
    let R = f?.absPath ?? w ?? expandPath(e);
    let vettedPath = await openVettedPath(
      e,
      R,
      S,
      p,
      ({ handle, openedStat }) => readHandleBounded(handle, min, openedStat.size),
      u,
    );
    if (vettedPath.refused)
      throw vettedPath.openFailure === undefined
        ? remoteReadDenied(e, vettedPath.telemetryMessage)
        : vettedPath.openFailure.error;
    let { bytes, overLimit } = vettedPath.value;
    if (w !== undefined) _();
    if (i)
      logEvent("tengu_bridge_read_file_served", {
        success: true,
        source: fromEnum(i),
        size_bytes: bytes.length,
        requested_max_bytes: min,
        truncated: overLimit,
        ext: getFileExtensionForAnalytics(R),
        as_written_lookup: enumOrUndefined(h),
      });
    return {
      contents: bytes.toString(o === "base64" ? "base64" : "utf-8"),
      absPath: R,
      ...(overLimit && {
        truncated: overLimit,
      }),
      ...(o === "base64" && {
        encoding: o,
      }),
      ...(f !== undefined && {
        anchor: f.kind,
      }),
      ...(w !== undefined && {
        anchor: "as_written",
      }),
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
        `readFileForRemote failed pre-deny: ${_}${h === undefined ? "" : `, as_written look-up: ${h}`}`,
        {
          level: "error",
        },
      );
    } catch {}
    try {
      if (i)
        logEvent("tengu_bridge_read_file_served", {
          success: false,
          source: fromEnum(i),
          as_written_lookup: enumOrUndefined(h),
        });
    } catch {}
    try {
      if (h !== undefined) m?.onRefusal(h);
    } catch {}
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      error.message.startsWith("read denied: ")
    )
      throw error;
    throw remoteReadDenied(e);
  }
}
//@ chunk-es7wzebn.js:9717-9862 placement
class UnsettledRemoteFileError extends Error {
  constructor() {
    super("probeFileForRemote: cannot tell whether the path names a file");
    this.name = "UnsettledRemoteFileError";
  }
}
//@ chunk-es7wzebn.js:9862-10204 placement
/**
 * 解析规范读取路径
 */
async function resolveCanonicalReadPath(e, r, n, o = realFsOps) {
  if (!isFullyQualifiedPath(e) || normalize(e) !== e) return null;
  let vettedPath = await openVettedPath(
    r,
    e,
    n,
    o,
    ({ canonicalPath }) => Promise.resolve(canonicalPath),
    true,
  );
  if (!vettedPath.refused) return vettedPath.value;
  if (vettedPath.openFailure !== undefined) {
    let { error } = vettedPath.openFailure;
    if (
      isFsInaccessible(error) ||
      ["EISDIR", "ENXIO", "ENOTSUP", "EOPNOTSUPP"].includes(getErrnoCode(error) ?? "")
    )
      return null;
    throw error;
  }
  if (vettedPath.unsettled) throw new UnsettledRemoteFileError();
  return null;
}
export { REMOTE_READ_MAX_BYTES, readFileForRemote, REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained };
