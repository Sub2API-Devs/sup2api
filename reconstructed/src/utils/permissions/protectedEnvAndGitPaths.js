/**
 * utils/permissions/protectedEnvAndGitPaths.ts
 *
 * 2.1.316 新增：收集 git 相关受保护路径（GIT_DIR、hooks、config 等）；路径是否落在受保护位置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7wdbg1ct.js (52)
 * attribution: placement 52
 */
import {
  sep,
  join,
  join as join_2,
  resolve,
  isAbsolute,
  dirname,
  basename,
  basename as basename_2,
  win32,
  posix,
  parse,
  relative,
} from "path";
import { homedir } from "os";
import { realpath, lstat, stat, readlink, access } from "fs/promises";
import { constants } from "fs";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { getPlatform } from "../platform.js";
import { uniq } from "../collections.js";
import { claudeTempDir, childProcessTmpDir } from "../tempDir.js";
import {
  BP,
  Nqt,
  oD,
  Kot,
  Ad,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { rc, isForeignNetworkPath, isMacSpecialPath, Qn } from "../pathClassification.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import {
  isOpaqueLinkText,
  findIntermediateUncJunctionAsync,
  NodeFsOperations,
  findIntermediateUncJunction,
  UNVERIFIED_ANCESTRY,
  OPAQUE_LINK_TEXT,
} from "../fsOperations.js";
import { ai, networkMountRoots, isOtherHomeMount, isNetDir, Qg, yl } from "../networkPaths.js";

/**
 * 受保护的环境变量（GIT_EXEC_PATH、LD_PRELOAD 等）。
 */
//@ chunk-7wdbg1ct.js:933-1347 placement
var PROTECTED_ENV_VARS = [
  "GIT_EXEC_PATH",
  "DEVELOPER_DIR",
  "GIT_TEXTDOMAINDIR",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "GCONV_PATH",
  "NLSPATH",
  "LOCPATH",
  "PSMODULEPATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "DYLD_FALLBACK_LIBRARY_PATH",
  "DYLD_FALLBACK_FRAMEWORK_PATH",
  "DYLD_VERSIONED_LIBRARY_PATH",
  "DYLD_VERSIONED_FRAMEWORK_PATH",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "OPENSSL_ENGINES",
];
/**
 * 列出会影响 git 的配置文件路径：额外路径、系统配置、GIT_CONFIG_GLOBAL、各主目录下的 XDG 与 ~/.gitconfig，按 cwd 解析为绝对路径。
 */
//@ chunk-7wdbg1ct.js:1652-1909 placement
function getGitConfigPaths(n, e, o, r = process.env) {
  let i = getEnvCaseInsensitive(r, "GIT_CONFIG_GLOBAL"),
    s = getEnvCaseInsensitive(r, "XDG_CONFIG_HOME");
  return [
    ...n.filter((u) => u !== ""),
    ...getSystemGitConfigPaths(o, r),
    ...(i ? [i] : []),
    ...getHomeDirCandidates(r).flatMap((u) => [
      `${s || `${u}${sep}.config`}${sep}git${sep}config`,
      `${u}${sep}.gitconfig`,
    ]),
  ].map((u) => resolveRelative(e, u));
}
//@ chunk-7wdbg1ct.js:1909-1994 placement
function Yii(n, e, o, r) {
  return [...n.filter((i) => i !== ""), ...getSystemGitConfigPaths(o, r)].map((i) => resolveRelative(e, i));
}
//@ chunk-7wdbg1ct.js:1994-2256 placement
function getSystemGitConfigPaths(n, e) {
  if (parseGitBoolEnv(getEnvCaseInsensitive(e, "GIT_CONFIG_NOSYSTEM"))) return [];
  let o = getEnvCaseInsensitive(e, "GIT_CONFIG_SYSTEM"),
    r = getEnvCaseInsensitive(e, "PROGRAMDATA"),
    i = getPlatform() === "windows";
  return [
    ...(o ? [o] : []),
    ...(i ? [] : ["/etc/gitconfig"]),
    ...(n === null ? [] : [`${n}${sep}etc${sep}gitconfig`]),
    ...(i && r ? [`${r}${sep}Git${sep}config`] : []),
  ];
}
/**
 * 按 git 的布尔解析规则解析环境变量值（true/yes/on 或非零整数为真）。
 */
//@ chunk-7wdbg1ct.js:2256-2448 placement
function parseGitBoolEnv(n) {
  let e = n?.trim().toLowerCase();
  if (e === void 0 || ["", "false", "no", "off"].includes(e)) return !1;
  if (["true", "yes", "on"].includes(e)) return !0;
  return /^[-+]?\d+$/.test(e) && Number(e) !== 0;
}
//@ chunk-7wdbg1ct.js:2448-2552 placement
function getProtectedTempDirs() {
  return uniq([
    claudeTempDir(),
    childProcessTmpDir(),
    ...BP().map((n) => (n === "~" || n.startsWith("~/") ? join_2(homedir(), n.slice(1)) : n)),
  ]);
}
//@ chunk-7wdbg1ct.js:2552-2637 placement
function un(n, e, o) {
  return o.find((r) => !dn(r) && aqt(r, e).verdict === "foreign" && isPathInside(r, n));
}
/**
 * 外部路径拼写尝试解析为本地落点。
 */
//@ chunk-7wdbg1ct.js:2637-2788 placement
function resolveForeignSpelling(n, e, o, { pattern: r = !1 } = {}) {
  if (n.verdict !== "foreign") return n;
  let i = un(n.spelling, e, o);
  return i === void 0 ? n : classifySpellingWithJunction(n.spelling, i, getPlatform() === "windows", r);
}
/**
 * 异步解析外部路径拼写。
 */
//@ chunk-7wdbg1ct.js:2788-2926 placement
async function resolveForeignSpellingAsync(n, e, o) {
  if (n.verdict !== "foreign") return n;
  let r = un(n.spelling, e, o);
  return r === void 0 ? n : classifySpellingWithJunctionAsync(n.spelling, r, getPlatform() === "windows");
}
/**
 * 主目录候选：HOME、Windows 的 HOMEDRIVE+HOMEPATH、os.homedir()，去重。
 */
//@ chunk-7wdbg1ct.js:2926-3095 placement
function getHomeDirCandidates(n = process.env) {
  let e = getEnvCaseInsensitive(n, "HOME"),
    o = getEnvCaseInsensitive(n, "HOMEDRIVE"),
    r = getEnvCaseInsensitive(n, "HOMEPATH");
  return uniq(
    [e, getPlatform() === "windows" && o && r ? `${o}${r}` : void 0, homedir()].filter((i) => Boolean(i)),
  );
}
/**
 * 收集 git 相关受保护路径（GIT_DIR、hooks、config 等）。
 */
//@ chunk-7wdbg1ct.js:3095-5111 placement
async function collectGitProtectedPaths(n, e, o, r = [], i = []) {
  let s = e.GIT_DIR ?? join_2(o, ".git"),
    u = e.GIT_COMMON_DIR ?? s,
    l = async (a) => (rc(a) ? null : realpath(a).catch((g) => (getErrnoCode(g) === "ENOENT" ? a : null))),
    results = await Promise.all(
      [[o, resolve(n)], [s], [u]].map(async (a) => [...a, ...(await Promise.all(a.map(l)))]),
    );
  if (results.some((a) => a.includes(null))) return null;
  let [y, R, m] = results.map((a) => uniq(a.filter((g) => g !== null))),
    S = async (a) => {
      if (Dn(a)) return { derived: [a] };
      let g = await resolveForeignSpellingAsync(await classifyPathSpelling_2(a, o), o, i);
      if (g.verdict === "foreign")
        return {
          unexamined: a,
          detail: "it names another host than this checkout\u2019s or the owner\u2019s home and temp server",
        };
      if (g.verdict !== "local")
        return { unexamined: a, detail: `its route cannot be vouched for (${g.verdict})` };
      return D(g.spelling);
    },
    D = (a) =>
      realpath(a).then(
        (g) => ({ resolved: g }),
        async (g) => {
          let O = getErrnoCode(g);
          if (O === "ENOENT" || O === "ENOTDIR") return deriveRealpathSpellings(a, o);
          let E = await lstat(a).catch(() => null);
          if (E === null || E.isDirectory()) return { unexamined: a, detail: O ?? errorMessage(g) };
          return E.isSymbolicLink() ? deriveRealpathSpellings(a, o) : { derived: [a] };
        },
      ),
    results_2 = await Promise.all(r.map(S)),
    found = results_2.find((a) => "unexamined" in a);
  if (found !== void 0) return found;
  let filtered = results_2.flatMap((a) => ("resolved" in a ? [a.resolved] : [])).filter((a) => isAbsolute(a)),
    filtered_2 = results_2.flatMap((a) => ("derived" in a ? a.derived : [])).filter((a) => isAbsolute(a)),
    v = uniq([...r, ...filtered, ...filtered_2]),
    A = uniq([...y, ...R, ...m, ...v]),
    x = getPlatform() === "windows" ? [] : await Promise.all(uniq([...y, ...R, ...m]).map(l));
  if (x.includes(null)) return null;
  let Z = (a, g) =>
      stat(a, { bigint: !0 }).then(
        (O) => {
          let E = getFileIdentity(O);
          return E === void 0 ? [] : [[E, a]];
        },
        async (O) => {
          let E = getErrnoCode(O);
          if (E === "ENOENT" || (E === "ENOTDIR" && !g)) return [];
          if (g) return null;
          let nn = await lstat(a).catch(() => null);
          return nn !== null && !nn.isDirectory() ? [] : { unexamined: a, detail: E ?? errorMessage(O) };
        },
      ),
    results_3 = await Promise.all([
      ...uniq(x.filter((a) => a !== null)).map((a) => Z(a, !0)),
      ...(getPlatform() === "windows" ? [] : uniq(filtered).map((a) => Z(a, !1))),
    ]);
  if (results_3.includes(null)) return null;
  let found_2 = results_3.find((a) => a !== null && !Array.isArray(a));
  if (found_2 !== void 0) return found_2;
  return {
    ids: new Map(results_3.filter((a) => Array.isArray(a)).flat()),
    roots: A,
    trees: y,
    fixed: uniq([
      ...R.flatMap((a) => [a, join_2(a, "config"), join_2(a, "config.worktree"), join_2(a, "commondir")]),
      ...m.flatMap((a) => [a, join_2(a, "config"), join_2(a, "worktrees")]),
    ]),
  };
}
//@ chunk-7wdbg1ct.js:5111-5247 placement
async function deriveRealpathSpellings(n, e) {
  let o = await realpathOrAncestor(n, e);
  return o === null
    ? { unexamined: n, detail: "it is too deep or too long to resolve" }
    : { derived: [n, o] };
}
//@ chunk-7wdbg1ct.js:5247-5256 placement
var Pn = 8;
/**
 * 解析真实路径，失败时按祖先回退（深度限制）。
 */
//@ chunk-7wdbg1ct.js:5256-5616 placement
async function realpathOrAncestor(n, e, o = Pn, r = 0) {
  if (isPathTooDeep(n, r)) return null;
  let i = await realpath(n).catch(() => null);
  if (i !== null) return i;
  let s = o > 0 ? await readlink(n).catch(() => null) : null;
  if (s !== null) {
    let c = await realpath(dirname(n)).catch(() => dirname(n)),
      { spelling: spelling, verdict: verdict } = await classifyPathSpelling(s, c, e);
    return verdict === "local" ? realpathOrAncestor(spelling, e, o - 1, r) : n;
  }
  let u = dirname(n);
  if (u === n) return n;
  let l = await realpathOrAncestor(u, e, o, r + 1);
  return l === null ? null : join_2(l, basename_2(n));
}
//@ chunk-7wdbg1ct.js:5616-5628 placement
var e3o = 256;
/**
 * 路径是否过深或过长。
 */
//@ chunk-7wdbg1ct.js:5628-5675 placement
function isPathTooDeep(n, e) {
  return e > e3o || n.length > 32767;
}
//@ chunk-7wdbg1ct.js:5675-5728 placement
function Dn(n) {
  return getPlatform() === "macos" && isPathInside("/dev/fd", n);
}
/**
 * 并行检查候选路径是否可达受保护路径：返回第一个可达的路径；有无法判断的返回 null；都不可达返回 undefined。
 */
//@ chunk-7wdbg1ct.js:5728-5968 placement
async function findReachableProtectedPath(n, e) {
  let results = await Promise.all(
      uniq(e.filter((i) => i !== null)).map(async (i) => ({
        path: i,
        reachable: await isProtectedPath(i, n),
      })),
    ),
    found = results.find(({ reachable: reachable }) => reachable === !0);
  if (found !== void 0) return found.path;
  return results.some(({ reachable: reachable }) => reachable === null) ? null : void 0;
}
//@ chunk-7wdbg1ct.js:5968-6021 placement
function bn(n) {
  return /^[A-Za-z]:[\\/][^:]*$/.test(n);
}
/**
 * Windows 上非盘符路径。
 */
//@ chunk-7wdbg1ct.js:6021-6068 placement
function isWindowsNonDrivePath(n) {
  return getPlatform() === "windows" && !bn(n);
}
//@ chunk-7wdbg1ct.js:6068-6150 placement
function aqt(n, e, { pattern: o = !1 } = {}) {
  let r = getPlatform() === "windows";
  return classifySpellingWithJunction(an(n, r), e, r, o);
}
//@ chunk-7wdbg1ct.js:6150-6224 placement
function an(n, e) {
  return e ? Nqt(collapseDeviceNamespace(oD(Kot(n)))) : Nqt(n).replace(/^\/\/+/, "/");
}
/**
 * 同步判定路径拼写的落点：不透明链接文本为 opaque；否则规范为绝对路径后检查中间 UNC 联接点。
 */
//@ chunk-7wdbg1ct.js:6224-6388 placement
function classifyPathSpellingSync(n, e, o) {
  let r = getPlatform() === "windows";
  if (isOpaqueLinkText(n, r)) return { spelling: n, verdict: "opaque" };
  let { isAbsolute: isAbsolute, join: join } = r ? win32 : posix,
    u = isAbsolute(n) ? n : join(e, n);
  return classifySpellingWithJunction(r ? collapseDeviceNamespace(oD(u)) : u, o, r);
}
//@ chunk-7wdbg1ct.js:6388-6558 placement
async function classifyPathSpelling(n, e, o) {
  let r = getPlatform() === "windows";
  if (isOpaqueLinkText(n, r)) return { spelling: n, verdict: "opaque" };
  let { isAbsolute: isAbsolute, join: join } = r ? win32 : posix,
    u = isAbsolute(n) ? n : join(e, n);
  return classifySpellingWithJunctionAsync(r ? collapseDeviceNamespace(oD(u)) : u, o, r);
}
//@ chunk-7wdbg1ct.js:6558-6676 placement
async function classifySpellingWithJunctionAsync(n, e, o) {
  let r = classifySpellingSync(n, e, o);
  return "verdict" in r
    ? r
    : spellingVerdict(
        r.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, r.spelling, { anchor: e, ...Y }),
        e,
      );
}
//@ chunk-7wdbg1ct.js:6676-6788 placement
function classifySpellingWithJunction(n, e, o, r = !1) {
  let i = classifySpellingSync(n, e, o, r);
  return "verdict" in i
    ? i
    : spellingVerdict(
        i.spelling,
        findIntermediateUncJunction(NodeFsOperations, i.spelling, { anchor: e, ...Y }),
        e,
      );
}
/**
 * 判断路径拼写的落点与裁定。
 */
//@ chunk-7wdbg1ct.js:6788-6929 placement
async function classifyPathSpelling_2(n, e) {
  let o = getPlatform() === "windows",
    r = classifySpellingSync(an(n, o), e, o);
  return "verdict" in r
    ? r
    : spellingVerdict(
        r.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, r.spelling, { anchor: e, ...Y }),
        e,
      );
}
//@ chunk-7wdbg1ct.js:6929-6994 placement
var Y = { unreadableAncestry: "unverified", literalLinkText: "opaque" };
/**
 * 同步判断路径拼写（设备命名空间、UNC 等）。
 */
//@ chunk-7wdbg1ct.js:6994-7450 placement
function classifySpellingSync(n, e, o, r = !1) {
  if (o) {
    let normalized = win32.normalize(n);
    if (/^[\\/]{2}[.?](?:[\\/]|$)/.test(normalized)) return { spelling: normalized, verdict: "opaque" };
    if (ai(normalized) && isForeignNetworkPath(normalized, e))
      return { spelling: normalized, verdict: "foreign" };
  }
  let resolved = (o ? win32 : posix).resolve(n);
  if (!o && isMacSpecialPath(resolved)) return { spelling: resolved, verdict: "opaque" };
  if (isForeignSpelling(resolved, e)) return { spelling: resolved, verdict: "foreign" };
  let parts = resolved.split("/"),
    u = r ? parts.findIndex((c) => Ad(c)) : -1,
    l = u === -1 ? resolved : parts.slice(0, u).join("/");
  return !o && l.includes("\\") ? { spelling: resolved, verdict: "opaque" } : { spelling: resolved };
}
/**
 * 判断路径拼写是否指向锚点之外的"外部"位置（Windows 走 UNC 判定；POSIX 检查双斜杠、挂载点差异、互不包含等）。
 */
//@ chunk-7wdbg1ct.js:7450-7650 placement
function isForeignSpelling(n, e, o = !1) {
  if (getPlatform() === "windows") return ai(n) && isForeignNetworkPath(n, e);
  let replaced = n.replace(/^\/{2,}/, "/"),
    i = networkMountRoots(e);
  return (
    Qn(replaced) ||
    networkMountRoots(replaced).some((s) => !i.includes(s)) ||
    (In(replaced) && ((o && dn(replaced)) || (!isPathInside(replaced, e) && !isPathInside(e, replaced)))) ||
    isOtherHomeMount(replaced, e)
  );
}
//@ chunk-7wdbg1ct.js:7650-7946 placement
function spellingVerdict(n, e, o) {
  if (e === void 0) return { spelling: n, verdict: "local" };
  if (e === n)
    return isForeignSpelling(n, o)
      ? { spelling: n, verdict: "foreign" }
      : { spelling: n, verdict: "unreadable" };
  if (e === UNVERIFIED_ANCESTRY) return { spelling: n, verdict: "unreadable" };
  if (e === OPAQUE_LINK_TEXT) return { spelling: n, verdict: "opaque" };
  return { spelling: n, verdict: "linked", via: e };
}
/**
 * 需要检查的路径拼写集合。
 */
//@ chunk-7wdbg1ct.js:7946-8110 placement
function spellingsToCheck({ spelling: spelling, verdict: verdict, via: via }, r) {
  if (verdict === "foreign") return [spelling];
  return getPlatform() === "windows"
    ? uniq([...list, ...[spelling, r, via ?? ""].filter(Qn).map((i) => win32.parse(i).root)])
    : ["/"];
}
//@ chunk-7wdbg1ct.js:8110-8191 placement
function dn(n) {
  return isNetDir(n) || /^\/network(?:\/servers)?$/i.test(posix.resolve("/", n));
}
//@ chunk-7wdbg1ct.js:8191-8227 placement
function In(n) {
  return Qg(n) && !yl(n);
}
//@ chunk-7wdbg1ct.js:8227-8290 placement
var list = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (n) => `${n}:\\`);
/**
 * 规范化 \\.\ 设备命名空间路径。
 */
//@ chunk-7wdbg1ct.js:8290-8653 placement
function collapseDeviceNamespace(n) {
  let match = /^[\\/]{2}\.(?:[\\/](.*))?$/s.exec(n);
  if (match === null) return n;
  let reduced = (match[1] ?? "").split(/[\\/]+/).reduce((s, u) => {
      if (u === "..") s.pop();
      else if (u !== "" && u !== ".") s.push(u);
      return s;
    }, []),
    [r = "", ...i] = reduced;
  if (/^[A-Za-z]:$/.test(r)) return `${r}\\${i.join("\\")}`;
  if (r.toUpperCase() === "UNC" && i.length >= 2) return `\\\\${i.join("\\")}`;
  return `\\\\.\\${reduced.join("\\")}`;
}
//@ chunk-7wdbg1ct.js:8653-8721 placement
function fn(n) {
  return process.getuid === void 0 || n === process.getuid();
}
//@ chunk-7wdbg1ct.js:8721-8828 placement
async function isPossiblyWritable(n) {
  return access(n, constants.W_OK).then(
    () => !0,
    (e) => !["EACCES", "EROFS", "EPERM"].includes(getErrnoCode(e) ?? ""),
  );
}
//@ chunk-7wdbg1ct.js:8828-8912 placement
async function Jii(n, e) {
  return !e.isDirectory() && e.nlink > 1 && (fn(e.uid) || (await isPossiblyWritable(n)));
}
//@ chunk-7wdbg1ct.js:8912-8989 placement = getFileIdentity (0.794)
function getFileIdentity(filePath) {
  return filePath.isDirectory() && filePath.ino !== 0n ? `${filePath.dev}:${filePath.ino}` : void 0;
}
//@ chunk-7wdbg1ct.js:8989-8999 placement
var xn = 40;
/**
 * 路径是否落在受保护位置。
 */
//@ chunk-7wdbg1ct.js:8999-9850 placement
async function isProtectedPath(n, e, o = xn, r = { secondNames: !0 }) {
  let {
    nestedRoot: nestedRoot,
    replaceable: replaceable,
    lands: lands,
    asksForAnotherHost: asksForAnotherHost,
  } = protectedRootMatchers(e);
  if (hn(n, e)) return !0;
  if (getPlatform() === "windows" && n !== resolve(n)) return isProtectedPath(resolve(n), e, o, r);
  let { root: root } = parse(n),
    R = relativeSegments(n, root),
    m = root,
    S = !1;
  for (let [D, T] of R.entries()) {
    if (T === "..") {
      if (S) return !0;
      m = dirname(m);
      continue;
    }
    let f = join_2(m, T);
    if (replaceable(f) || asksForAnotherHost(f)) return !0;
    let { entry: entry, alias: alias } = await statProtectedEntry(f, e, r.secondNames);
    switch (entry) {
      case null:
        return null;
      case "device":
        return nestedRoot(f);
      case "shared":
        return !0;
      case "shared_if_writable":
        if (await isPossiblyWritable(f)) return !0;
        ((S = alias !== void 0 && alias !== f), (m = alias ?? f));
        break;
      case "sealed":
        ((S = !1), (m = f));
        break;
      case "absent":
        return lands(resolve(f, ...R.slice(D + 1)));
      case "link": {
        if (nestedRoot(f)) return !0;
        let v = await readlink(f).catch(() => null);
        if (v === null || o === 0) return null;
        let A = normalizeGitdirPointer(f, v);
        if (A === null) return !0;
        let x = [resolveRelative(m, A), ...R.slice(D + 1)];
        return isProtectedPath(x.join(sep), e, o - 1, r);
      }
      case "entry":
        ((S = alias !== void 0 && alias !== f), (m = alias ?? f));
    }
  }
  return lands(m);
}
//@ chunk-7wdbg1ct.js:9850-9951 placement
function relativeSegments(n, e) {
  return n
    .slice(e.length)
    .split(sep === "/" ? /\/+/ : /[\\/]+/)
    .filter((o) => o !== "" && o !== ".");
}
/**
 * 受保护根的匹配器（内部、相等、固定）。
 */
//@ chunk-7wdbg1ct.js:9951-10276 placement
function protectedRootMatchers(n) {
  let e = (i) => n.roots.some((root) => isPathInside(root, i)),
    o = (i) => n.roots.some((root) => isPathInside(root, i) && isPathInside(i, root)),
    r = (i) => n.fixed.includes(i);
  return {
    inside: e,
    kept: r,
    nestedRoot: (i) =>
      o(i) && !r(i) && n.roots.some((root) => isPathInside(root, i) && !isPathInside(i, root)),
    replaceable: (i) => e(i) && !o(i) && !r(i),
    lands: (i) => e(i) && !r(i),
    asksForAnotherHost: (i) => n.roots.every((root) => isForeignSpelling(i, root)),
  };
}
//@ chunk-7wdbg1ct.js:10276-10368 placement
function hn(n, e) {
  return (
    !isAbsolute(n) ||
    isWindowsNonDrivePath(n) ||
    e.roots.every((root) => isForeignSpelling(n, root, !0)) ||
    n.includes("\uFFFD")
  );
}
/**
 * 读取受保护条目状态与身份。
 */
//@ chunk-7wdbg1ct.js:10368-10765 placement
async function statProtectedEntry(n, e, o) {
  let r;
  return {
    entry: await lstat(n, { bigint: !0 }).then(
      (s) => {
        let u = getFileIdentity(s);
        return (
          (r = u === void 0 ? void 0 : e.ids.get(u)),
          s.isSymbolicLink()
            ? "link"
            : s.isCharacterDevice()
              ? "device"
              : o && !s.isDirectory() && s.nlink > 1n
                ? fn(Number(s.uid))
                  ? "shared"
                  : "shared_if_writable"
                : "entry"
        );
      },
      (s) => {
        let u = getErrnoCode(s);
        return u === "ENOENT" || u === "ENOTDIR"
          ? "absent"
          : ["EACCES", "EPERM"].includes(u ?? "")
            ? "sealed"
            : null;
      },
    ),
    alias: r,
  };
}
//@ chunk-7wdbg1ct.js:10765-10981 placement
function normalizeGitdirPointer(n, e) {
  let o = getPlatform() === "windows",
    r = o ? /^[A-Za-z]:/.exec(n)?.[0] : void 0;
  if (o && /^[A-Za-z]:(?![\\/])/.test(e)) return null;
  let i = r !== void 0 && /^[\\/](?![\\/])/.test(e) ? `${r}${e}` : e;
  return i.includes("\uFFFD") ? null : i;
}
/**
 * 解析 .git 文件中的 gitdir 指针。
 */
//@ chunk-7wdbg1ct.js:10981-11064 placement
function readGitdirPointer(n) {
  let e = cleanSingleLine(n);
  return e === null ? void 0 : /^gitdir: (.+)$/s.exec(e)?.[1];
}
/**
 * 去掉末尾换行并拒绝含控制字符的值。
 */
//@ chunk-7wdbg1ct.js:11064-11184 placement
function cleanSingleLine(n) {
  if (n === void 0) return null;
  let replaced = n.replace(/[\r\n]+$/, "");
  return replaced === "" || /[\r\n\0\uFFFD]/.test(replaced) ? null : replaced;
}
/**
 * 相对路径基于目录解析。
 */
//@ chunk-7wdbg1ct.js:11184-11231 placement
function resolveRelative(n, e) {
  return isAbsolute(e) ? e : `${n}${sep}${e}`;
}
/**
 * 路径是否在目录内（大小写不敏感平台归一）。
 */
//@ chunk-7wdbg1ct.js:11231-11446 placement
function isPathInside(n, e) {
  if (!isAbsolute(e)) return !1;
  let o = getPlatform(),
    r = o === "macos" || o === "windows",
    i = (l) => (r ? l.normalize("NFC").toLowerCase() : l),
    s = relative(i(n), i(e)),
    u = s === ".." || s.startsWith(`..${sep}`) || s.startsWith("../");
  return s === "" || (!u && !isAbsolute(s));
}
//@ chunk-7wdbg1ct.js:11446-11743 placement
var PROJECT_SETTING_SOURCES = ["projectSettings", "localSettings"],
  TMPDIR_ENV_VARS = ["CLAUDE_CODE_TMPDIR", "TMPDIR", "TEMP", "TMP"],
  HOME_ENV_VARS = [
    "CLAUDE_CONFIG_DIR",
    "HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "CLAUDE_CODE_USE_COWORK_PLUGINS",
  ],
  GIT_CONFIG_ENV_VARS = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"],
  PROTECTED_ENV_VARS_2 = [
    ...GIT_CONFIG_ENV_VARS,
    ...HOME_ENV_VARS,
    ...TMPDIR_ENV_VARS,
    "XDG_CONFIG_HOME",
    "PATH",
    ...PROTECTED_ENV_VARS,
  ];

export {
  PROJECT_SETTING_SOURCES,
  HOME_ENV_VARS,
  getProtectedTempDirs,
  aqt,
  isPathInside,
  readGitdirPointer,
  PROTECTED_ENV_VARS_2,
  resolveForeignSpellingAsync,
  classifyPathSpelling_2,
  spellingsToCheck,
  resolveForeignSpelling,
  isPathTooDeep,
  e3o,
  classifyPathSpellingSync,
  isForeignSpelling,
  isWindowsNonDrivePath,
  PROTECTED_ENV_VARS,
  GIT_CONFIG_ENV_VARS,
  parseGitBoolEnv,
  collectGitProtectedPaths,
  getGitConfigPaths,
  Yii,
  findReachableProtectedPath,
  getHomeDirCandidates,
  resolveRelative,
  cleanSingleLine,
  Jii,
};
