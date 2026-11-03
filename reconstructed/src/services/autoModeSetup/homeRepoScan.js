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
import { sep, join, dirname, resolve, relative, isAbsolute } from "path";
import "fs/promises";
import * as fsPromisesModule_2 from "fs/promises";
import { homedir } from "os";
import { getPlatform } from "../../utils/platform.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { isMissingPathError, readFileGuarded } from "../../utils/fsSafety/guardedFileRead.js";
import { sleep } from "../../utils/sleep.js";
import { gitConfigEntries } from "../../utils/git/gitConfigParser.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { isWslUncPath, isNetworkMountRoot, isOnForeignMount } from "../../utils/networkPaths.js";
import { rawPointerPathIsUnsafe } from "../../utils/git/gitFilesystem.js";
import { isENOENT } from "../../utils/errors.js";

//@ chunk-2a8yx6fc.js:1801-2563 placement
function redactRemoteUrl(e) {
  if (e.length > 2048) return "(unparseable remote URL redacted)";
  if (hasUnsafeRemoteUrlChars(e)) return "(unparseable remote URL redacted)";
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
    let n = new URL(e);
    let joined = n.pathname
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
/**
 * 判断远程 URL 是否含不可解析字符（控制字符、非 ASCII 可印区、反斜杠、百分号），用于脱敏输出。
 */
function hasUnsafeRemoteUrlChars(e) {
  for (let n of e) if (n <= " " || n > "~" || n === "\\" || n === "%") return true;
  return false;
}
//@ chunk-2a8yx6fc.js:2675-2820 placement
function isExcludedUnderEitherHome(e, n, r, o, platform = getPlatform()) {
  if (o(e)) return true;
  if (n === r) return false;
  for (let [l, a] of [
    [n, r],
    [r, n],
  ]) {
    let d = rebasePath(e, l, a, platform);
    if (d !== null && o(d)) return true;
  }
  return false;
}
//@ chunk-2a8yx6fc.js:2820-3003 placement
function rebasePath(e, n, r, o) {
  let s = (h) => (o === "windows" ? h.toLowerCase() : h);
  let l = s(e);
  let a = s(n);
  if (l === a) return r;
  let d = a.endsWith(sep) ? a : a + sep;
  if (!l.startsWith(d)) return null;
  return r + e.slice(n.length);
}
//@ chunk-2a8yx6fc.js:3003-3343 placement
/**
 * 遍历主目录查找 git 仓库的限制与规则：深度、目录访问预算、仓库数上限、超时、读取上限、托管主机集合、跳过的目录名与云同步/系统目录名。
 */
var DEFAULT_MAX_REPO_DEPTH = 2;
var DEFAULT_MAX_DIRS_VISITED = 4000;
var DEFAULT_MAX_REPOS = 20;
var MAX_REMOTES_PER_REPO = 5;
var DEFAULT_SCAN_TIMEOUT_MS = 8000;
var MAX_GITDIR_FILE_BYTES = 4096;
var MAX_GIT_CONFIG_BYTES = 128000;
var KNOWN_GIT_HOSTS = new Set([GITHUB_HOST, "gitlab.com", "bitbucket.org"]);
var SKIPPED_HOME_DIRS = new Set([
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
]);
var CLOUD_SYNC_DIR_NAMES = ["onedrive", "dropbox", "google drive"];
var WINDOWS_APPDATA_DIRS = new Set(["appdata", "application data"]);
var MAC_LIBRARY_DIRS = new Set(["library"]);
//@ chunk-2a8yx6fc.js:3343-4659 placement
async function walkHomeRepos(e) {
  let platform = e?.platform ?? getPlatform();
  let r = e?.home ?? getHomeDirOrNull();
  if (r === null)
    return {
      repos: [],
      limit: "home-unreadable",
    };
  let o = e?.isReadDenied ?? (() => false);
  let thisRepoHost = e?.thisRepoHost ?? null;
  let maxDirsVisited = e?.maxDirsVisited ?? DEFAULT_MAX_DIRS_VISITED;
  let maxRepos = e?.maxRepos ?? DEFAULT_MAX_REPOS;
  let maxRepoDepth = e?.maxRepoDepth ?? DEFAULT_MAX_REPO_DEPTH;
  let timeoutMs = e?.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
  if (isNetworkHomePath(r))
    return {
      repos: [],
      limit: "network-home",
    };
  let c = [];
  let y = "none";
  let u = false;
  let abortController = new AbortController();
  let E = async () => {
    let home = await fsPromisesModule_2.realpath(r).catch((error) => (isMissingPathError(error) ? r : null));
    if (home === null) {
      y = "home-unreadable";
      return;
    }
    if (isNetworkHomePath(home)) {
      y = "network-home";
      return;
    }
    let isExcluded = (D) => isExcludedUnderEitherHome(D, home, r, o, platform);
    let T = new Set([normalizeCaseForPlatform(home, platform)]);
    let v = [
      {
        dir: home,
        depth: 0,
      },
    ];
    let j = 0;
    while (v.length > 0) {
      if (u) return;
      if (j >= maxDirsVisited) {
        y = "visit-budget";
        return;
      }
      let { dir, depth } = v.pop();
      j++;
      let R;
      try {
        R = await fsPromisesModule_2.readdir(dir, {
          withFileTypes: true,
        });
      } catch {
        if (dir === home) {
          y = "home-unreadable";
          return;
        }
        continue;
      }
      for (let x of R) {
        if (x.isSymbolicLink()) continue;
        if (x.name === ".git") {
          if ((x.isDirectory() || x.isFile()) && !isExcluded(dir)) {
            let repoRemotes = await readRepoRemotes(
              join(dir, ".git"),
              x.isFile(),
              home,
              platform,
              isExcluded,
              thisRepoHost,
            );
            if (u) return;
            if (repoRemotes !== null) {
              c.push({
                path: tildePath(dir, home, platform),
                ...repoRemotes,
              });
              if (c.length >= maxRepos) {
                y = "repo-cap";
                return;
              }
            }
          }
          continue;
        }
        if (!x.isDirectory() || isReservedName(x.name, platform)) continue;
        if (depth + 1 > maxRepoDepth) continue;
        let C = join(dir, x.name);
        if (isExcluded(C)) continue;
        let q = normalizeCaseForPlatform(C, platform);
        if (T.has(q)) continue;
        T.add(q);
        v.push({
          dir: C,
          depth: depth + 1,
        });
      }
    }
  };
  try {
    await Promise.race([
      E(),
      sleep(timeoutMs, abortController.signal).then(() => {
        if (!abortController.signal.aborted) {
          u = true;
          y = "timeout";
        }
      }),
    ]);
  } finally {
    abortController.abort();
  }
  return {
    repos: c,
    limit: y,
  };
}
//@ chunk-2a8yx6fc.js:4659-5638 placement
/**
 * 读取一个仓库的远程地址：.git 是文件时解析 gitdir/commondir 并确认都在 home 内且未被排除，再读 config 取出已知托管平台的远程（最多 5 个）。
 */
async function readRepoRemotes(gitPath, isGitFile, home, platform, isExcluded, extraHost = null) {
  let gitDir = gitPath;
  if (isGitFile) {
    if (isExcluded(gitPath))
      return {
        remotes: [],
      };
    let fileGuarded = await readFileGuarded(gitPath, MAX_GITDIR_FILE_BYTES, {
      noFollow: true,
      requireNlink1: true,
    });
    let u = fileGuarded === null ? null : parseGitdirFile(fileGuarded);
    if (u === null || isUnsafeGitPointerPath(u, dirname(gitPath))) return null;
    gitDir = resolve(dirname(gitPath), u);
    if (!isInsideDir(gitDir, home, platform))
      return {
        remotes: [],
        note: "gitdir-outside-home",
      };
    if (isExcluded(gitDir))
      return {
        remotes: [],
      };
    let w = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
    if (w === "missing") return null;
    if (w === "refused")
      return {
        remotes: [],
      };
    let fileGuarded_2 = await readFileGuarded(join(gitDir, "commondir"), MAX_GITDIR_FILE_BYTES, {
      noFollow: true,
      requireNlink1: true,
    });
    if (fileGuarded_2 === "") return null;
    let S = fileGuarded_2 === null ? "" : fileGuarded_2.replace(/[\r\n]+$/, "");
    if (S !== "") {
      if (isUnsafeGitPointerPath(S, gitDir)) return null;
      gitDir = resolve(gitDir, S);
      if (!isInsideDir(gitDir, home, platform))
        return {
          remotes: [],
          note: "gitdir-outside-home",
        };
      if (isExcluded(gitDir))
        return {
          remotes: [],
        };
      let A = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
      if (A === "missing") return null;
      if (A === "refused")
        return {
          remotes: [],
        };
    }
  }
  let configPath = join(gitDir, "config");
  if (isExcluded(gitDir) || isExcluded(configPath))
    return {
      remotes: [],
    };
  let configText = await readFileGuarded(configPath, MAX_GIT_CONFIG_BYTES, {
    noFollow: true,
    requireNlink1: true,
  });
  if (configText === null)
    return isGitFile
      ? null
      : {
          remotes: [],
        };
  let remotes = remotesFromGitConfig(configText, extraHost);
  if (remotes.length === 0 && gitConfigEntries(configText).length === 0)
    return {
      remotes,
      note: "no-remote",
    };
  return {
    remotes,
  };
}
//@ chunk-2a8yx6fc.js:5638-5775 placement
function remotesFromGitConfig(configText, extraHost = null) {
  let r = [];
  for (let o of gitConfigEntries(configText)) {
    let s = normalizeHostedRemote(o, extraHost);
    if (s !== null && !r.includes(s)) {
      r.push(s);
      if (r.length >= MAX_REMOTES_PER_REPO) break;
    }
  }
  return r;
}
//@ chunk-2a8yx6fc.js:5775-6002 placement
function tildePath(dir, n, r) {
  let o = r === "windows";
  let s = (c) => (o ? c.toLowerCase() : c);
  if (s(dir) === s(n)) return "~";
  let l = o ? "\\" : "/";
  let a = n.endsWith(l) ? n : n + l;
  let d = s(dir).startsWith(s(a)) ? dir.slice(a.length) : dir;
  let h = o ? d.replaceAll("\\", "/") : d;
  return d === dir ? h : `~/${h}`;
}
//@ chunk-2a8yx6fc.js:6002-6071 placement
/**
 * 取用户主目录，取不到（空串或抛错）返回 null。
 */
function getHomeDirOrNull() {
  try {
    let e = homedir();
    return e === "" ? null : e;
  } catch {
    return null;
  }
}
//@ chunk-2a8yx6fc.js:6071-6115 placement
/**
 * 判断路径是否落在网络主目录（WSL UNC 之外的网络挂载）。
 */
function isNetworkHomePath(e) {
  return (isUncOrDevicePath(e) && !isWslUncPath(e)) || isNetworkMountRoot(e);
}
//@ chunk-2a8yx6fc.js:6115-6176 placement
/**
 * 判断 .git 指针文件里的路径是否不安全：指向符号链接、对外挂载点或无法解析的原始指针。
 */
function isUnsafeGitPointerPath(e, n) {
  return (
    isNetworkMountRoot(e) ||
    isNetworkMountRoot(resolve(n, e)) ||
    isOnForeignMount(e, n) ||
    rawPointerPathIsUnsafe(e, n)
  );
}
//@ chunk-2a8yx6fc.js:6176-6299 placement
function isInsideDir(gitDir, home, platform) {
  let o = relative(home, gitDir);
  let s = platform === "windows" ? o.toLowerCase() : o;
  return s !== "" && s !== ".." && !s.startsWith(".." + sep) && !isAbsolute(s);
}
//@ chunk-2a8yx6fc.js:6299-6470 placement
async function checkGitDirRealpath(gitDir, home, platform, isExcluded) {
  try {
    let s = await fsPromisesModule_2.realpath(gitDir);
    if (!isInsideDir(s, home, platform) || isExcluded(s) || isExcluded(join(s, "config"))) return "refused";
    return "allowed";
  } catch (error) {
    return isENOENT(error) ? "missing" : "refused";
  }
}
//@ chunk-2a8yx6fc.js:6470-6651 placement = getReservedShortcuts (1)
function isReservedName(name, n) {
  if (SKIPPED_HOME_DIRS.has(name)) return true;
  let lower = name.toLowerCase();
  if (CLOUD_SYNC_DIR_NAMES.some((o) => lower === o || lower.startsWith(o + " "))) return true;
  if (n === "windows" && WINDOWS_APPDATA_DIRS.has(lower)) return true;
  return n === "macos" && MAC_LIBRARY_DIRS.has(lower);
}
//@ chunk-2a8yx6fc.js:6651-6707 placement
/**
 * Windows 平台上把路径转小写再比较，其他平台原样返回。
 */
function normalizeCaseForPlatform(e, n) {
  return n === "windows" ? e.toLowerCase() : e;
}
//@ chunk-2a8yx6fc.js:6707-6824 placement
function parseGitdirFile(fileGuarded) {
  if (!fileGuarded.startsWith("gitdir: ")) return null;
  let replaced = fileGuarded.slice(8).replace(/[\r\n]+$/, "");
  return replaced === "" ? null : replaced;
}
//@ chunk-2a8yx6fc.js:6824-6912 placement
/**
 * 校验单个远程路径段（owner/repo 名）：非空、≤100 字符、只含字母数字与 ._- 且至少一个字母数字。
 */
function isValidRemotePathSegment(e) {
  return e.length > 0 && e.length <= 100 && /^[\w.][\w.-]*$/.test(e) && /\w/.test(e);
}
//@ chunk-2a8yx6fc.js:6912-7749 placement
/**
 * 把 git 远程 URL（https/ssh/git 或 git@host:path）规范化为 "host/owner/repo"；只接受已知托管平台（可加一个额外主机）、无凭据无端口的地址，其他返回 null。
 */
function normalizeHostedRemote(url, extraHost) {
  if (hasUnsafeRemoteUrlChars(url)) return null;
  let allowedHosts =
    extraHost !== null && isValidRemotePathSegment(extraHost)
      ? new Set([...KNOWN_GIT_HOSTS, extraHost.toLowerCase()])
      : KNOWN_GIT_HOSTS;
  let host;
  let path;
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
    host = y.hostname;
    path = y.pathname;
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
  let trimmed = path.replace(/\.git\/?$/i, "");
  let segments = (trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed).split("/");
  if (segments.length !== 3 || segments[0] !== "") return null;
  let sliced = segments.slice(1);
  if (!sliced.every(isValidRemotePathSegment)) return null;
  let [h, c] = sliced;
  return `${host.toLowerCase()}/${h}/${c}`;
}
//@ chunk-2a8yx6fc.js:7749-7791 placement
/**
 * 去掉结尾的单个换行。
 */
function stripTrailingNewline(stdout) {
  return stdout.replace(/\n$/, "");
}
export {
  stripTrailingNewline,
  normalizeHostedRemote,
  redactRemoteUrl,
  getHomeDirOrNull,
  isNetworkHomePath,
  isExcludedUnderEitherHome,
  normalizeCaseForPlatform,
  walkHomeRepos,
  isValidRemotePathSegment,
};
