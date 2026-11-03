/**
 * utils/sessionTranscriptLocator.ts
 *
 * 2.1.316 新增：会话记录文件定位
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dmh8arxx.js (7)
 * attribution: placement 7
 */
import { lstat, realpath, readdir } from "fs/promises";
import { dirname, resolve, join } from "path";
import { getErrnoCode, isENOENT, errorMessage } from "./errors.js";
import { dpt } from "../cli/headlessCloud/sessionRecords.js";
import { toInfraSessionId } from "../bridge/sessionIdCompat.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { findGitRoot } from "./git.js";
import { rc, ZEr } from "./pathClassification.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { C$s, CMr, resolveTranscriptLocation, kAo } from "./transcriptIds.js";
import { getProjectsDir } from "./sessionStoragePortable.js";
import { getFileKind } from "./fileKind.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";

//@ chunk-dmh8arxx.js:3727-3825 placement
var T = 4000,
  g = 16,
  b = { kind: "elsewhere" },
  y = { kind: "nowhere" },
  E = { kind: "nowhere", hasOwnSessionRecord: !0 };
//@ chunk-dmh8arxx.js:3825-3983 placement
async function pathKindExists(n, r) {
  return lstat(n).then(
    (o) => ((r === "file" ? o.isFile() : o.isDirectory()) ? !0 : void 0),
    (o) => {
      let s = getErrnoCode(o);
      return s === "ENOENT" || s === "ENOTDIR" ? !1 : void 0;
    },
  );
}
//@ chunk-dmh8arxx.js:3983-4016 placement
function N(n) {
  return pathKindExists(n, "file");
}
//@ chunk-dmh8arxx.js:4016-4083 placement
async function O(n) {
  let r = await pathKindExists(dirname(n), "dir");
  return r === !0 ? N(n) : r;
}
/**
 * 查找会话记录文件位置（本地或 v5 存储），返回未知原因或路径。
 */
//@ chunk-dmh8arxx.js:4083-5065 placement
async function locateSessionTranscript(n, r, o = T) {
  if (!dpt()) return { kind: "unknown", why: "not_looked" };
  let s = toInfraSessionId(n),
    c = getOriginalCwd(),
    l = findGitRoot(c) ?? resolve(c);
  if (rc(l) || ZEr() || rc(await realpath(l).catch(() => l))) return { kind: "unknown", why: "path_misread" };
  if (isStorageV5Enabled() && r !== void 0) return findTranscriptPathSafe(r, l, s, o);
  let h = await C$s(l, s, r),
    u = getProjectsDir(),
    m = CMr(s);
  try {
    let e = await O(h);
    if (e !== !1) return e ? E : { kind: "unknown", why: "here_unreadable" };
    let i = await readdir(u, { withFileTypes: !0 }),
      results = await Promise.all(i.map((a) => getFileKind(a, join(u, a.name), "unknown"))),
      filtered = i.filter((a, R) => results[R] === "dir"),
      sliced = filtered.slice(0, o),
      any = results.some((a) => a === "symlink" || a === "unknown");
    for (let a = 0; a < sliced.length; a += g) {
      let results = await Promise.all(sliced.slice(a, a + g).map((F) => N(join(u, F.name, m))));
      if (results.includes(!0)) return b;
      any ||= results.includes(void 0);
    }
    return any
      ? { kind: "unknown", why: "probe_failed" }
      : filtered.length > sliced.length
        ? { kind: "unknown", why: "listing_capped" }
        : y;
  } catch (error) {
    if (isENOENT(error)) return y;
    return (
      logForDebugging(
        `[sessionRecord] could not tell whether another project folder holds this session's record: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      { kind: "unknown", why: "listing_failed" }
    );
  }
}
//@ chunk-dmh8arxx.js:5065-5293 placement
async function findTranscriptPathSafe(n, r, o, s) {
  try {
    return await findTranscriptPath(n, r, o, s);
  } catch (error) {
    return (
      logForDebugging(
        `[sessionRecord] could not tell whether another project folder holds this session's record: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      { kind: "unknown", why: "listing_failed" }
    );
  }
}
//@ chunk-dmh8arxx.js:5293-6635 placement
async function findTranscriptPath(n, r, o, s) {
  let c = await resolveTranscriptLocation(r, o, n);
  if (c.v5 === void 0) {
    let e = await O(c.path);
    if (e !== !1) return e ? E : { kind: "unknown", why: "here_unreadable" };
  } else {
    let scopeKind = await n.scopeKind({ namespace: "transcript", projectKey: c.projectKey });
    if (!scopeKind.ok || scopeKind.value.kind === "link" || scopeKind.value.kind === "other")
      return { kind: "unknown", why: "here_unreadable" };
    if (scopeKind.value.kind === "directory") {
      let statMeta = await n.statMeta(c.v5.key);
      if (statMeta.ok) return E;
      if (statMeta.error.code !== "NotFound") return { kind: "unknown", why: "here_unreadable" };
    }
  }
  let l = [],
    h;
  do {
    let listEntries = await n.listEntries(
      { namespace: "transcript" },
      { cursor: h, skipScopeStats: !0, skipKeyStats: !0 },
    );
    if (!listEntries.ok)
      return (
        logForDebugging(
          `[sessionRecord] could not tell whether another project folder holds this session's record: ${formatStorageError(listEntries.error)}`,
          { level: "warn" },
        ),
        { kind: "unknown", why: "listing_failed" }
      );
    for (let item of listEntries.value.items)
      if (item.kind === "scope" && item.scope.namespace === "transcript") {
        let projectKey = item.scope.projectKey;
        if (projectKey !== void 0) l.push(projectKey);
      }
    h = listEntries.value.cursor;
  } while (h !== void 0 && l.length < s);
  let sliced = l.slice(0, s),
    m = !1;
  for (let e = 0; e < sliced.length; e += g) {
    let results = await Promise.all(
      sliced.slice(e, e + g).map(async (f) => {
        let p = kAo(f, o);
        if (p === void 0) return;
        let statMeta = await n.statMeta(p);
        return statMeta.ok ? !0 : statMeta.error.code === "NotFound" ? !1 : void 0;
      }),
    );
    if (results.includes(!0)) return b;
    m ||= results.includes(void 0);
  }
  return m
    ? { kind: "unknown", why: "probe_failed" }
    : h !== void 0 || l.length > sliced.length
      ? { kind: "unknown", why: "listing_capped" }
      : y;
}
