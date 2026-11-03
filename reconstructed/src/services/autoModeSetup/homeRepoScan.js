/**
 * services/autoModeSetup/homeRepoScan.ts
 *
 * 扫描 home 下的仓库（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2a8yx6fc.js (20)
 * attribution: placement 20
 */
import {
  sep,
  sep as sep_2,
  join,
  join as join_2,
  dirname,
  resolve,
  resolve as resolve_2,
  relative,
  relative as relative_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
} from "path";
import * as fsPromisesModule from "fs/promises";
import * as fsPromisesModule_2 from "fs/promises";
import { homedir } from "os";
import { getPlatform } from "../../utils/platform.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { isMissingPathError, readFileGuarded } from "../../utils/fsSafety/guardedFileRead.js";
import { sleep } from "../../utils/sleep.js";
import { gitConfigEntries } from "../../utils/git/gitConfigParser.js";
import { Qn } from "../../utils/pathClassification.js";
import { isWslUncPath, yl, isOnForeignMount } from "../../utils/networkPaths.js";
import { rawPointerPathIsUnsafe } from "../../utils/git/gitFilesystem.js";
import { isENOENT } from "../../utils/errors.js";

//@ chunk-2a8yx6fc.js:1801-2563 placement
function redactRemoteUrl(e) {
  if (e.length > 2048) return "(unparseable remote URL redacted)";
  if (dt(e)) return "(unparseable remote URL redacted)";
  if (e.startsWith("//") && e.includes("@")) {
    let n = redactRemoteUrl(`redacted:${e}`);
    return n.startsWith("redacted:") ? n.slice(9) : n;
  }
  if (!e.includes("://")) {
    let index = e.indexOf("@");
    if (index !== -1) {
      let sliced = e.slice(index + 1);
      if (sliced.includes("@")) return "(unparseable remote URL redacted)";
      e = sliced;
    }
    return /^[\w.~/][\w.:/~-]*$/.test(e) && !/[:/@]-/.test(e) ? e : "(unparseable remote URL redacted)";
  }
  try {
    let n = new URL(e),
      joined = n.pathname
        .split("/")
        .filter((o) => o.length > 0 && /^[\w.][\w.-]*$/.test(o))
        .slice(-2)
        .join("/");
    if (!/^[\w.[][\w.:[\]-]*$/.test(n.host)) return "(unparseable remote URL redacted)";
    return `${n.protocol}//${n.host}${joined ? `/${joined}` : ""}`;
  } catch {
    return "(unparseable remote URL redacted)";
  }
}
//@ chunk-2a8yx6fc.js:2563-2647 placement
function dt(e) {
  for (let n of e) if (n <= " " || n > "~" || n === "\\" || n === "%") return !0;
  return !1;
}
//@ chunk-2a8yx6fc.js:2675-2820 placement
function isExcludedUnderEitherHome(e, n, r, o, s = getPlatform()) {
  if (o(e)) return !0;
  if (n === r) return !1;
  for (let [l, a] of [
    [n, r],
    [r, n],
  ]) {
    let d = rebasePath(e, l, a, s);
    if (d !== null && o(d)) return !0;
  }
  return !1;
}
//@ chunk-2a8yx6fc.js:2820-3003 placement
function rebasePath(e, n, r, o) {
  let s = (h) => (o === "windows" ? h.toLowerCase() : h),
    l = s(e),
    a = s(n);
  if (l === a) return r;
  let d = a.endsWith(sep_2) ? a : a + sep_2;
  if (!l.startsWith(d)) return null;
  return r + e.slice(n.length);
}
/**
 * 遍历主目录查找 git 仓库的限制与规则：深度、目录访问预算、仓库数上限、超时、读取上限、托管主机集合、跳过的目录名与云同步/系统目录名。
 */
//@ chunk-2a8yx6fc.js:3003-3343 placement
var DEFAULT_MAX_REPO_DEPTH = 2,
  DEFAULT_MAX_DIRS_VISITED = 4000,
  DEFAULT_MAX_REPOS = 20,
  MAX_REMOTES_PER_REPO = 5,
  DEFAULT_SCAN_TIMEOUT_MS = 8000,
  MAX_GITDIR_FILE_BYTES = 4096,
  MAX_GIT_CONFIG_BYTES = 128000,
  KNOWN_GIT_HOSTS = new Set([GITHUB_HOST, "gitlab.com", "bitbucket.org"]),
  SKIPPED_HOME_DIRS = new Set([
    ".git",
    "node_modules",
    ".oh-my-zsh",
    ".vim",
    ".tmux",
    ".nvm",
    ".rustup",
    ".cargo",
    ".local",
    ".cache",
    ".npm",
    ".gem",
    ".claude",
  ]),
  CLOUD_SYNC_DIR_NAMES = ["onedrive", "dropbox", "google drive"],
  WINDOWS_APPDATA_DIRS = new Set(["appdata", "application data"]),
  MAC_LIBRARY_DIRS = new Set(["library"]);
//@ chunk-2a8yx6fc.js:3343-4659 placement
async function walkHomeRepos(e) {
  let n = e?.platform ?? getPlatform(),
    r = e?.home ?? pt();
  if (r === null) return { repos: [], limit: "home-unreadable" };
  let o = e?.isReadDenied ?? (() => !1),
    s = e?.thisRepoHost ?? null,
    l = e?.maxDirsVisited ?? DEFAULT_MAX_DIRS_VISITED,
    a = e?.maxRepos ?? DEFAULT_MAX_REPOS,
    d = e?.maxRepoDepth ?? DEFAULT_MAX_REPO_DEPTH,
    h = e?.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
  if (H7e(r)) return { repos: [], limit: "network-home" };
  let c = [],
    y = "none",
    u = !1,
    abortController = new AbortController(),
    E = async () => {
      let S = await fsPromisesModule.realpath(r).catch((D) => (isMissingPathError(D) ? r : null));
      if (S === null) {
        y = "home-unreadable";
        return;
      }
      if (H7e(S)) {
        y = "network-home";
        return;
      }
      let A = (D) => isExcludedUnderEitherHome(D, S, r, o, n),
        T = new Set([Xe(S, n)]),
        v = [{ dir: S, depth: 0 }],
        j = 0;
      while (v.length > 0) {
        if (u) return;
        if (j >= l) {
          y = "visit-budget";
          return;
        }
        let { dir: dir, depth: depth } = v.pop();
        j++;
        let R;
        try {
          R = await fsPromisesModule.readdir(dir, { withFileTypes: !0 });
        } catch {
          if (dir === S) {
            y = "home-unreadable";
            return;
          }
          continue;
        }
        for (let x of R) {
          if (x.isSymbolicLink()) continue;
          if (x.name === ".git") {
            if ((x.isDirectory() || x.isFile()) && !A(dir)) {
              let Y = await readRepoRemotes(join(dir, ".git"), x.isFile(), S, n, A, s);
              if (u) return;
              if (Y !== null) {
                if ((c.push({ path: tildePath(dir, S, n), ...Y }), c.length >= a)) {
                  y = "repo-cap";
                  return;
                }
              }
            }
            continue;
          }
          if (!x.isDirectory() || isReservedName(x.name, n)) continue;
          if (depth + 1 > d) continue;
          let C = join(dir, x.name);
          if (A(C)) continue;
          let q = Xe(C, n);
          if (T.has(q)) continue;
          (T.add(q), v.push({ dir: C, depth: depth + 1 }));
        }
      }
    };
  try {
    await Promise.race([
      E(),
      sleep(h, abortController.signal).then(() => {
        if (!abortController.signal.aborted) ((u = !0), (y = "timeout"));
      }),
    ]);
  } finally {
    abortController.abort();
  }
  return { repos: c, limit: y };
}
/**
 * 读取一个仓库的远程地址：.git 是文件时解析 gitdir/commondir 并确认都在 home 内且未被排除，再读 config 取出已知托管平台的远程（最多 5 个）。
 */
//@ chunk-2a8yx6fc.js:4659-5638 placement
async function readRepoRemotes(gitPath, isGitFile, home, platform, isExcluded, extraHost = null) {
  let gitDir = gitPath;
  if (isGitFile) {
    if (isExcluded(gitPath)) return { remotes: [] };
    let y = await readFileGuarded(gitPath, MAX_GITDIR_FILE_BYTES, { noFollow: !0, requireNlink1: !0 }),
      u = y === null ? null : parseGitdirFile(y);
    if (u === null || Lt(u, dirname(gitPath))) return null;
    if (((gitDir = resolve(dirname(gitPath), u)), !isInsideDir(gitDir, home, platform)))
      return { remotes: [], note: "gitdir-outside-home" };
    if (isExcluded(gitDir)) return { remotes: [] };
    let w = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
    if (w === "missing") return null;
    if (w === "refused") return { remotes: [] };
    let E = await readFileGuarded(join(gitDir, "commondir"), MAX_GITDIR_FILE_BYTES, {
      noFollow: !0,
      requireNlink1: !0,
    });
    if (E === "") return null;
    let S = E === null ? "" : E.replace(/[\r\n]+$/, "");
    if (S !== "") {
      if (Lt(S, gitDir)) return null;
      if (((gitDir = resolve(gitDir, S)), !isInsideDir(gitDir, home, platform)))
        return { remotes: [], note: "gitdir-outside-home" };
      if (isExcluded(gitDir)) return { remotes: [] };
      let A = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
      if (A === "missing") return null;
      if (A === "refused") return { remotes: [] };
    }
  }
  let configPath = join(gitDir, "config");
  if (isExcluded(gitDir) || isExcluded(configPath)) return { remotes: [] };
  let configText = await readFileGuarded(configPath, MAX_GIT_CONFIG_BYTES, {
    noFollow: !0,
    requireNlink1: !0,
  });
  if (configText === null) return isGitFile ? null : { remotes: [] };
  let remotes = remotesFromGitConfig(configText, extraHost);
  if (remotes.length === 0 && gitConfigEntries(configText).length === 0)
    return { remotes: remotes, note: "no-remote" };
  return { remotes: remotes };
}
//@ chunk-2a8yx6fc.js:5638-5775 placement
function remotesFromGitConfig(e, n = null) {
  let r = [];
  for (let o of gitConfigEntries(e)) {
    let s = normalizeHostedRemote(o, n);
    if (s !== null && !r.includes(s)) {
      if ((r.push(s), r.length >= MAX_REMOTES_PER_REPO)) break;
    }
  }
  return r;
}
//@ chunk-2a8yx6fc.js:5775-6002 placement
function tildePath(e, n, r) {
  let o = r === "windows",
    s = (c) => (o ? c.toLowerCase() : c);
  if (s(e) === s(n)) return "~";
  let l = o ? "\\" : "/",
    a = n.endsWith(l) ? n : n + l,
    d = s(e).startsWith(s(a)) ? e.slice(a.length) : e,
    h = o ? d.replaceAll("\\", "/") : d;
  return d === e ? h : `~/${h}`;
}
//@ chunk-2a8yx6fc.js:6002-6071 placement
function pt() {
  try {
    let e = homedir();
    return e === "" ? null : e;
  } catch {
    return null;
  }
}
//@ chunk-2a8yx6fc.js:6071-6115 placement
function H7e(e) {
  return (Qn(e) && !isWslUncPath(e)) || yl(e);
}
//@ chunk-2a8yx6fc.js:6115-6176 placement
function Lt(e, n) {
  return yl(e) || yl(resolve(n, e)) || isOnForeignMount(e, n) || rawPointerPathIsUnsafe(e, n);
}
//@ chunk-2a8yx6fc.js:6176-6299 placement
function isInsideDir(e, n, r) {
  let o = relative(n, e),
    s = r === "windows" ? o.toLowerCase() : o;
  return s !== "" && s !== ".." && !s.startsWith(".." + sep) && !isAbsolute(s);
}
//@ chunk-2a8yx6fc.js:6299-6470 placement
async function checkGitDirRealpath(e, n, r, o) {
  try {
    let realpath = await fsPromisesModule.realpath(e);
    if (!isInsideDir(realpath, n, r) || o(realpath) || o(join(realpath, "config"))) return "refused";
    return "allowed";
  } catch (error) {
    return isENOENT(error) ? "missing" : "refused";
  }
}
//@ chunk-2a8yx6fc.js:6470-6651 placement = getReservedShortcuts (1)
function isReservedName(e, n) {
  if (SKIPPED_HOME_DIRS.has(e)) return !0;
  let lower = e.toLowerCase();
  if (CLOUD_SYNC_DIR_NAMES.some((o) => lower === o || lower.startsWith(o + " "))) return !0;
  if (n === "windows" && WINDOWS_APPDATA_DIRS.has(lower)) return !0;
  return n === "macos" && MAC_LIBRARY_DIRS.has(lower);
}
//@ chunk-2a8yx6fc.js:6651-6707 placement
function Xe(e, n) {
  return n === "windows" ? e.toLowerCase() : e;
}
//@ chunk-2a8yx6fc.js:6707-6824 placement
function parseGitdirFile(e) {
  if (!e.startsWith("gitdir: ")) return null;
  let replaced = e.slice(8).replace(/[\r\n]+$/, "");
  return replaced === "" ? null : replaced;
}
//@ chunk-2a8yx6fc.js:6824-6912 placement
function Qe(e) {
  return e.length > 0 && e.length <= 100 && /^[\w.][\w.-]*$/.test(e) && /\w/.test(e);
}
/**
 * 把 git 远程 URL（https/ssh/git 或 git@host:path）规范化为 "host/owner/repo"；只接受已知托管平台（可加一个额外主机）、无凭据无端口的地址，其他返回 null。
 */
//@ chunk-2a8yx6fc.js:6912-7749 placement
function normalizeHostedRemote(url, extraHost) {
  if (dt(url)) return null;
  let allowedHosts =
      extraHost !== null && Qe(extraHost)
        ? new Set([...KNOWN_GIT_HOSTS, extraHost.toLowerCase()])
        : KNOWN_GIT_HOSTS,
    host,
    path;
  if (url.includes("://")) {
    let y;
    try {
      y = new URL(url);
    } catch {
      return null;
    }
    if (y.password !== "") return null;
    if (y.protocol === "https:") {
      if (y.username !== "") return null;
    } else if (y.protocol === "ssh:" || y.protocol === "git:") {
      if (y.username !== "" && y.username !== "git") return null;
    } else return null;
    if (y.port !== "") return null;
    ((host = y.hostname), (path = y.pathname));
  } else {
    let index = url.indexOf(":");
    if (index <= 0) return null;
    let sliced = url.slice(0, index);
    if (!sliced.startsWith("git@")) return null;
    host = sliced.slice(4);
    let sliced_2 = url.slice(index + 1);
    path = sliced_2.startsWith("/") ? sliced_2 : `/${sliced_2}`;
  }
  if (!allowedHosts.has(host.toLowerCase())) return null;
  let trimmed = path.replace(/\.git\/?$/i, ""),
    segments = (trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed).split("/");
  if (segments.length !== 3 || segments[0] !== "") return null;
  let sliced = segments.slice(1);
  if (!sliced.every(Qe)) return null;
  let [h, c] = sliced;
  return `${host.toLowerCase()}/${h}/${c}`;
}
//@ chunk-2a8yx6fc.js:7749-7791 placement
function et(e) {
  return e.replace(/\n$/, "");
}

export {
  et,
  normalizeHostedRemote,
  redactRemoteUrl,
  pt,
  H7e,
  isExcludedUnderEitherHome,
  Xe,
  walkHomeRepos,
  Qe,
};
