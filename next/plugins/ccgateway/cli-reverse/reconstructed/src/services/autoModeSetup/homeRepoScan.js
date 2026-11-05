/**
 * services/autoModeSetup/homeRepoScan.ts
 *
 * 扫描 home 下的仓库（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fta1hp2w.js (20)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fta1hp2w.js:1867-2629 placement
function redactRemoteUrl(remoteUrl) {
  if (remoteUrl.length > 2048) return "(unparseable remote URL redacted)";
  if (hasUnsafeRemoteUrlChars(remoteUrl)) return "(unparseable remote URL redacted)";
  if (remoteUrl.startsWith("//") && remoteUrl.includes("@")) {
    let redactedWithPrefix = redactRemoteUrl(`redacted:${remoteUrl}`);
    return redactedWithPrefix.startsWith("redacted:") ? redactedWithPrefix.slice(9) : redactedWithPrefix;
  }
  if (!remoteUrl.includes("://")) {
    let index = remoteUrl.indexOf("@");
    if (index !== -1) {
      let sliced = remoteUrl.slice(index + 1);
      if (sliced.includes("@")) return "(unparseable remote URL redacted)";
      remoteUrl = sliced;
    }
    return /^[\w.~/][\w.:/~-]*$/.test(remoteUrl) && !/[:/@]-/.test(remoteUrl)
      ? remoteUrl
      : "(unparseable remote URL redacted)";
  }
  try {
    let parsedUrl = new URL(remoteUrl);
    let joined = parsedUrl.pathname
      .split("/")
      .filter((segment) => segment.length > 0 && /^[\w.][\w.-]*$/.test(segment))
      .slice(-2)
      .join("/");
    if (!/^[\w.[][\w.:[\]-]*$/.test(parsedUrl.host)) return "(unparseable remote URL redacted)";
    return `${parsedUrl.protocol}//${parsedUrl.host}${joined ? `/${joined}` : ""}`;
  } catch {
    return "(unparseable remote URL redacted)";
  }
}
//@ chunk-fta1hp2w.js:2629-2713 placement
/**
 * 判断远程 URL 是否含不可解析字符（控制字符、非 ASCII 可印区、反斜杠、百分号），用于脱敏输出。
 */
function hasUnsafeRemoteUrlChars(remoteUrl) {
  for (let char of remoteUrl) if (char <= " " || char > "~" || char === "\\" || char === "%") return true;
  return false;
}
//@ chunk-fta1hp2w.js:2741-2886 placement
function isExcludedUnderEitherHome(filePath, homeDir, realHomeDir, isExcluded, platform = getPlatform()) {
  if (isExcluded(filePath)) return true;
  if (homeDir === realHomeDir) return false;
  for (let [fromHome, toHome] of [
    [homeDir, realHomeDir],
    [realHomeDir, homeDir],
  ]) {
    let rebasedPath = rebasePath(filePath, fromHome, toHome, platform);
    if (rebasedPath !== null && isExcluded(rebasedPath)) return true;
  }
  return false;
}
//@ chunk-fta1hp2w.js:2886-3069 placement
function rebasePath(filePath, fromHome, toHome, platform) {
  let normalizeCase = (pathValue) => (platform === "windows" ? pathValue.toLowerCase() : pathValue);
  let normalizedFilePath = normalizeCase(filePath);
  let normalizedFromHome = normalizeCase(fromHome);
  if (normalizedFilePath === normalizedFromHome) return toHome;
  let normalizedFromHomeWithSep = normalizedFromHome.endsWith(sep)
    ? normalizedFromHome
    : normalizedFromHome + sep;
  if (!normalizedFilePath.startsWith(normalizedFromHomeWithSep)) return null;
  return toHome + filePath.slice(fromHome.length);
}
//@ chunk-fta1hp2w.js:3069-3409 placement
/**
 * 遍历主目录查找 git 仓库的限制与规则：深度、目录访问预算、仓库数上限、超时、读取上限、托管主机集合、跳过的目录名与云同步/系统目录名。
 */
var DEFAULT_MAX_REPO_DEPTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_MAX_DIRS_VISITED;
var DEFAULT_MAX_REPOS;
var MAX_REMOTES_PER_REPO;
var DEFAULT_SCAN_TIMEOUT_MS;
var MAX_GITDIR_FILE_BYTES;
var MAX_GIT_CONFIG_BYTES;
var KNOWN_GIT_HOSTS;
var SKIPPED_HOME_DIRS;
var CLOUD_SYNC_DIR_NAMES;
var WINDOWS_APPDATA_DIRS;
var MAC_LIBRARY_DIRS;
deferInit("chunk-fta1hp2w.js:3069", () => {
  DEFAULT_MAX_REPO_DEPTH = 2;
  DEFAULT_MAX_DIRS_VISITED = 4000;
  DEFAULT_MAX_REPOS = 20;
  MAX_REMOTES_PER_REPO = 5;
  DEFAULT_SCAN_TIMEOUT_MS = 8000;
  MAX_GITDIR_FILE_BYTES = 4096;
  MAX_GIT_CONFIG_BYTES = 128000;
  KNOWN_GIT_HOSTS = new Set([GITHUB_HOST, "gitlab.com", "bitbucket.org"]);
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
  ]);
  CLOUD_SYNC_DIR_NAMES = ["onedrive", "dropbox", "google drive"];
  WINDOWS_APPDATA_DIRS = new Set(["appdata", "application data"]);
  MAC_LIBRARY_DIRS = new Set(["library"]);
});
//@ chunk-fta1hp2w.js:3409-4725 placement
async function walkHomeRepos(options) {
  let platform = options?.platform ?? getPlatform();
  let homeDir = options?.home ?? getHomeDirOrNull();
  if (homeDir === null)
    return {
      repos: [],
      limit: "home-unreadable",
    };
  let isReadDenied = options?.isReadDenied ?? (() => false);
  let thisRepoHost = options?.thisRepoHost ?? null;
  let maxDirsVisited = options?.maxDirsVisited ?? DEFAULT_MAX_DIRS_VISITED;
  let maxRepos = options?.maxRepos ?? DEFAULT_MAX_REPOS;
  let maxRepoDepth = options?.maxRepoDepth ?? DEFAULT_MAX_REPO_DEPTH;
  let timeoutMs = options?.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
  if (isNetworkHomePath(homeDir))
    return {
      repos: [],
      limit: "network-home",
    };
  let repos = [];
  let limitReason = "none";
  let aborted = false;
  let abortController = new AbortController();
  let runScan = async () => {
    let realHomeDir = await fsPromisesModule_2
      .realpath(homeDir)
      .catch((error) => (isMissingPathError(error) ? homeDir : null));
    if (realHomeDir === null) {
      limitReason = "home-unreadable";
      return;
    }
    if (isNetworkHomePath(realHomeDir)) {
      limitReason = "network-home";
      return;
    }
    let isExcluded = (pathToCheck) =>
      isExcludedUnderEitherHome(pathToCheck, realHomeDir, homeDir, isReadDenied, platform);
    let visitedNormalized = new Set([normalizeCaseForPlatform(realHomeDir, platform)]);
    let stack = [
      {
        dir: realHomeDir,
        depth: 0,
      },
    ];
    let dirsVisited = 0;
    while (stack.length > 0) {
      if (aborted) return;
      if (dirsVisited >= maxDirsVisited) {
        limitReason = "visit-budget";
        return;
      }
      let { dir, depth } = stack.pop();
      dirsVisited++;
      let entries;
      try {
        entries = await fsPromisesModule_2.readdir(dir, {
          withFileTypes: true,
        });
      } catch {
        if (dir === realHomeDir) {
          limitReason = "home-unreadable";
          return;
        }
        continue;
      }
      for (let entry of entries) {
        if (entry.isSymbolicLink()) continue;
        if (entry.name === ".git") {
          if ((entry.isDirectory() || entry.isFile()) && !isExcluded(dir)) {
            let repoRemotes = await readRepoRemotes(
              join(dir, ".git"),
              entry.isFile(),
              realHomeDir,
              platform,
              isExcluded,
              thisRepoHost,
            );
            if (aborted) return;
            if (repoRemotes !== null) {
              repos.push({
                path: tildePath(dir, realHomeDir, platform),
                ...repoRemotes,
              });
              if (repos.length >= maxRepos) {
                limitReason = "repo-cap";
                return;
              }
            }
          }
          continue;
        }
        if (!entry.isDirectory() || isReservedName(entry.name, platform)) continue;
        if (depth + 1 > maxRepoDepth) continue;
        let childPath = join(dir, entry.name);
        if (isExcluded(childPath)) continue;
        let normalizedChild = normalizeCaseForPlatform(childPath, platform);
        if (visitedNormalized.has(normalizedChild)) continue;
        visitedNormalized.add(normalizedChild);
        stack.push({
          dir: childPath,
          depth: depth + 1,
        });
      }
    }
  };
  try {
    await Promise.race([
      runScan(),
      sleep(timeoutMs, abortController.signal).then(() => {
        if (!abortController.signal.aborted) {
          aborted = true;
          limitReason = "timeout";
        }
      }),
    ]);
  } finally {
    abortController.abort();
  }
  return {
    repos,
    limit: limitReason,
  };
}
//@ chunk-fta1hp2w.js:4725-5704 placement
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
    let gitdirPointer = fileGuarded === null ? null : parseGitdirFile(fileGuarded);
    if (gitdirPointer === null || isUnsafeGitPointerPath(gitdirPointer, dirname(gitPath))) return null;
    gitDir = resolve(dirname(gitPath), gitdirPointer);
    if (!isInsideDir(gitDir, home, platform))
      return {
        remotes: [],
        note: "gitdir-outside-home",
      };
    if (isExcluded(gitDir))
      return {
        remotes: [],
      };
    let realpathStatus = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
    if (realpathStatus === "missing") return null;
    if (realpathStatus === "refused")
      return {
        remotes: [],
      };
    let fileGuarded_2 = await readFileGuarded(join(gitDir, "commondir"), MAX_GITDIR_FILE_BYTES, {
      noFollow: true,
      requireNlink1: true,
    });
    if (fileGuarded_2 === "") return null;
    let commonDirPointer = fileGuarded_2 === null ? "" : fileGuarded_2.replace(/[\r\n]+$/, "");
    if (commonDirPointer !== "") {
      if (isUnsafeGitPointerPath(commonDirPointer, gitDir)) return null;
      gitDir = resolve(gitDir, commonDirPointer);
      if (!isInsideDir(gitDir, home, platform))
        return {
          remotes: [],
          note: "gitdir-outside-home",
        };
      if (isExcluded(gitDir))
        return {
          remotes: [],
        };
      let realpathStatus = await checkGitDirRealpath(gitDir, home, platform, isExcluded);
      if (realpathStatus === "missing") return null;
      if (realpathStatus === "refused")
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
//@ chunk-fta1hp2w.js:5704-5841 placement
function remotesFromGitConfig(text, extraHost = null) {
  let hosts = [];
  for (let entry of gitConfigEntries(text)) {
    let host = normalizeHostedRemote(entry, extraHost);
    if (host !== null && !hosts.includes(host)) {
      hosts.push(host);
      if (hosts.length >= MAX_REMOTES_PER_REPO) break;
    }
  }
  return hosts;
}
//@ chunk-fta1hp2w.js:5841-6068 placement
function tildePath(dir, homeDir, platform) {
  let isWindows = platform === "windows";
  let normalizeCase = (value) => (isWindows ? value.toLowerCase() : value);
  if (normalizeCase(dir) === normalizeCase(homeDir)) return "~";
  let pathSep = isWindows ? "\\" : "/";
  let homeWithSep = homeDir.endsWith(pathSep) ? homeDir : homeDir + pathSep;
  let relativePath = normalizeCase(dir).startsWith(normalizeCase(homeWithSep))
    ? dir.slice(homeWithSep.length)
    : dir;
  let posixRelative = isWindows ? relativePath.replaceAll("\\", "/") : relativePath;
  return relativePath === dir ? posixRelative : `~/${posixRelative}`;
}
//@ chunk-fta1hp2w.js:6068-6137 placement
/**
 * 取用户主目录，取不到（空串或抛错）返回 null。
 */
function getHomeDirOrNull() {
  try {
    let home = homedir();
    return home === "" ? null : home;
  } catch {
    return null;
  }
}
//@ chunk-fta1hp2w.js:6137-6181 placement
/**
 * 判断路径是否落在网络主目录（WSL UNC 之外的网络挂载）。
 */
function isNetworkHomePath(pathToCheck) {
  return (isUncOrDevicePath(pathToCheck) && !isWslUncPath(pathToCheck)) || isNetworkMountRoot(pathToCheck);
}
//@ chunk-fta1hp2w.js:6181-6242 placement
/**
 * 判断 .git 指针文件里的路径是否不安全：指向符号链接、对外挂载点或无法解析的原始指针。
 */
function isUnsafeGitPointerPath(pointerPath, baseDir) {
  return (
    isNetworkMountRoot(pointerPath) ||
    isNetworkMountRoot(resolve(baseDir, pointerPath)) ||
    isOnForeignMount(pointerPath, baseDir) ||
    rawPointerPathIsUnsafe(pointerPath, baseDir)
  );
}
//@ chunk-fta1hp2w.js:6242-6365 placement
function isInsideDir(candidatePath, home, platform) {
  let relativePath = relative(home, candidatePath);
  let normalizedRelative = platform === "windows" ? relativePath.toLowerCase() : relativePath;
  return (
    normalizedRelative !== "" &&
    normalizedRelative !== ".." &&
    !normalizedRelative.startsWith(".." + sep) &&
    !isAbsolute(normalizedRelative)
  );
}
//@ chunk-fta1hp2w.js:6365-6536 placement
async function checkGitDirRealpath(gitDir, home, platform, isExcluded) {
  try {
    let realGitDir = await fsPromisesModule_2.realpath(gitDir);
    if (
      !isInsideDir(realGitDir, home, platform) ||
      isExcluded(realGitDir) ||
      isExcluded(join(realGitDir, "config"))
    )
      return "refused";
    return "allowed";
  } catch (error) {
    return isENOENT(error) ? "missing" : "refused";
  }
}
//@ chunk-fta1hp2w.js:6536-6717 placement (2.1.88 match: getReservedShortcuts, 1)
function isReservedName(name, platform) {
  if (SKIPPED_HOME_DIRS.has(name)) return true;
  let lower = name.toLowerCase();
  if (CLOUD_SYNC_DIR_NAMES.some((dirName) => lower === dirName || lower.startsWith(dirName + " ")))
    return true;
  if (platform === "windows" && WINDOWS_APPDATA_DIRS.has(lower)) return true;
  return platform === "macos" && MAC_LIBRARY_DIRS.has(lower);
}
//@ chunk-fta1hp2w.js:6717-6773 placement
/**
 * Windows 平台上把路径转小写再比较，其他平台原样返回。
 */
function normalizeCaseForPlatform(value, platform) {
  return platform === "windows" ? value.toLowerCase() : value;
}
//@ chunk-fta1hp2w.js:6773-6890 placement
function parseGitdirFile(fileGuarded) {
  if (!fileGuarded.startsWith("gitdir: ")) return null;
  let replaced = fileGuarded.slice(8).replace(/[\r\n]+$/, "");
  return replaced === "" ? null : replaced;
}
//@ chunk-fta1hp2w.js:6890-6978 placement
/**
 * 校验单个远程路径段（owner/repo 名）：非空、≤100 字符、只含字母数字与 ._- 且至少一个字母数字。
 */
function isValidRemotePathSegment(segment) {
  return segment.length > 0 && segment.length <= 100 && /^[\w.][\w.-]*$/.test(segment) && /\w/.test(segment);
}
//@ chunk-fta1hp2w.js:6978-7815 placement
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
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return null;
    }
    if (parsedUrl.password !== "") return null;
    if (parsedUrl.protocol === "https:") {
      if (parsedUrl.username !== "") return null;
    } else if (parsedUrl.protocol === "ssh:" || parsedUrl.protocol === "git:") {
      if (parsedUrl.username !== "" && parsedUrl.username !== "git") return null;
    } else return null;
    if (parsedUrl.port !== "") return null;
    host = parsedUrl.hostname;
    path = parsedUrl.pathname;
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
  let [owner, repoName] = sliced;
  return `${host.toLowerCase()}/${owner}/${repoName}`;
}
//@ chunk-fta1hp2w.js:7815-7857 placement
/**
 * 去掉结尾的单个换行。
 */
function stripTrailingNewline(stdout) {
  return stdout.replace(/\n$/, "");
}
export {
  isNetworkHomePath,
  stripTrailingNewline,
  normalizeHostedRemote,
  isValidRemotePathSegment,
  redactRemoteUrl,
  getHomeDirOrNull,
  isExcludedUnderEitherHome,
  normalizeCaseForPlatform,
  walkHomeRepos,
};
