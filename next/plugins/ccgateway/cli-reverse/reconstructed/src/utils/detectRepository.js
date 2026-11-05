/**
 * utils/detectRepository.ts
 *
 * 从 origin 远程 URL 解析当前仓库 host/owner/name（GitHub、GitLab MR 引用解析），按 cwd 缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/detectRepository.ts
 * pieces: chunk-s06bcw1p.js (31)
 * attribution: placement 3, layout 7, facade-majority 20, callgraph-witnessed 1
 */
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { getCwdOrNull, getCwd } from "./cwd.js";
import { env } from "./env.js";
import { findGitRoot, gitExe, redactGitRemoteCredentials } from "./git.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { trustGuardRegistry } from "./git/gitFilesystem.js";
import { getRootSession } from "../bootstrap/state.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./git/gitSafeEnv.js";
import { firstLineOf, printableText } from "./stringUtils.js";
import { logForDebugging } from "./debug.js";
import { ghIsDangerousCallback, getGitHostKind } from "./gitHosts.js";
import { describeUrlScheme } from "./resultError.js";
import { isSuspiciousUrl } from "./fsBoundRead.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s06bcw1p.js:645-1046 placement
/**
 * 主机名正则片段（标签由字母数字与连字符组成）。
 */
var REPO_NAME_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOSTNAME_PATTERN;
var GITLAB_MR_PATH_PATTERN;
var GOOGLESOURCE_HOST_PATTERN;
var regExp;
var regExp_2;
var MAX_REPO_URL_CHARS;
deferInit("chunk-s06bcw1p.js:645", () => {
  REPO_NAME_PATTERN = String.raw`(?!\.{1,2}(?:/|$))[A-Za-z0-9_.][\w.-]*`;
  HOSTNAME_PATTERN = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*`;
  GITLAB_MR_PATH_PATTERN = `(?:${REPO_NAME_PATTERN}/)+${REPO_NAME_PATTERN}/-/merge_requests`;
  GOOGLESOURCE_HOST_PATTERN = String.raw`[a-z0-9-]+-review\.googlesource\.com`;
  regExp = new RegExp(
    String.raw`^https://${GOOGLESOURCE_HOST_PATTERN}/c/(?:${REPO_NAME_PATTERN}/)*${REPO_NAME_PATTERN}/\+/\d{1,9}$`,
  );
  regExp_2 = new RegExp(`^https?://${HOSTNAME_PATTERN}(?::\\d{1,5})?/${GITLAB_MR_PATH_PATTERN}/\\d+$`);
  MAX_REPO_URL_CHARS = 2048;
});
//@ chunk-s06bcw1p.js:1046-1102 placement
/**
 * 判断 URL 是否含 “/-/merge_requests/数字” 路径。
 */
function isGitLabMergeRequestUrl(url) {
  return /\/-\/merge_requests\/\d/.test(url);
}
//@ chunk-s06bcw1p.js:1102-1117 layout
var DEFAULT_INVOCATION_ENCODING = undefined;
//@ chunk-s06bcw1p.js:1117-1233 placement (2.1.88 match: readFileLines, 0.606)
/**
 * 按 {file, args, cwd, env} 执行一次调用（不继承环境、默认编码），属于外部命令调用工具，误归 shellConfig（旧版名 readFileLines 错配）。
 */
function runInvocation({ file, args, cwd, env }, options) {
  return execFileNoThrowWithCwd(file, args, {
    ...options,
    encoding: options.encoding ?? DEFAULT_INVOCATION_ENCODING,
    cwd,
    env,
    extendEnv: false,
  });
}
//@ chunk-s06bcw1p.js:1233-1242 layout
/**
 * 仓库路径段数的上限（21）。
 */
var MAX_REPO_PATH_SEGMENTS = 21;
//@ chunk-s06bcw1p.js:1242-1286 facade-majority
function isNestedGitLabProject(repo) {
  return repo.owner.includes("/");
}
//@ chunk-s06bcw1p.js:1286-1359 facade-majority
function clearRepositoryCaches() {
  getGitRepoCache().repositoryByCwd.clear();
  getGitRepoCache().remoteHostByCwd.clear();
}
//@ chunk-s06bcw1p.js:1359-1437 facade-majority
function primeCurrentRepository() {
  let cwdOrNull = getCwdOrNull();
  if (cwdOrNull === null) return;
  if (env.GIT_DIR || findGitRoot(cwdOrNull) !== null) detectCurrentRepositoryWithHost(cwdOrNull);
}
//@ chunk-s06bcw1p.js:1437-1549 facade-majority (2.1.88 match: detectCurrentRepository, 0.391)
async function detectCurrentRepository() {
  let result = await detectCurrentRepositoryWithHost();
  if (!result) return null;
  if (!isGithubDotCom(result.host)) return null;
  return `${result.owner}/${result.name}`;
}
//@ chunk-s06bcw1p.js:1549-1588 facade-majority
function repoDetectionGuards() {
  return trustGuardRegistry.of(getRootSession().host);
}
//@ chunk-s06bcw1p.js:1588-1623 facade-majority
function setRepoDetectionGuards(guards) {
  repoDetectionGuards().setGuards(guards);
}
//@ chunk-s06bcw1p.js:1623-2128 facade-majority
async function resolveRemote(cwd, gitTool) {
  if (repoDetectionGuards().blocked()) return null;
  let exe = gitTool ?? gitExe();
  let run = (...args) => {
    let fullArgs = [...GIT_SAFE_GLOBAL_ARGS, ...args];
    let options = {
      preserveOutputOnError: false,
    };
    return typeof exe === "string"
      ? execFileNoThrowWithCwd(exe, fullArgs, {
          ...options,
          cwd,
        })
      : runInvocation(exe(fullArgs), options);
  };
  let originResult = await run("remote", "get-url", "origin");
  if (originResult.code === 0 && originResult.stdout.trim())
    return {
      name: "origin",
      url: originResult.stdout.trim(),
    };
  let remotes = await run("remote");
  let remoteName =
    remotes.code === 0
      ? firstLineOf(
          remotes.stdout.trim(),
          `
`,
        ).trim()
      : undefined;
  if (!remoteName) return null;
  let urlResult = await run("remote", "get-url", remoteName);
  let url = urlResult.code === 0 ? urlResult.stdout.trim() : "";
  if (!url) return null;
  return {
    name: printableText(remoteName),
    url,
  };
}
//@ chunk-s06bcw1p.js:2128-2182 facade-majority
async function resolveRemoteUrl(cwd) {
  return (await resolveRemote(cwd))?.url ?? null;
}
//@ chunk-s06bcw1p.js:2182-2227 facade-majority
async function resolvePushRemoteUrl(cwd) {
  return (await getOriginPushUrl(cwd)).url;
}
//@ chunk-s06bcw1p.js:2227-2487 layout
async function getOriginPushUrl(cwd) {
  if (repoDetectionGuards().blocked())
    return {
      url: null,
      answered: false,
    };
  let { stdout, code, exitCode } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "remote", "get-url", "--push", "origin"],
    {
      cwd,
      preserveOutputOnError: false,
    },
  );
  let url = code === 0 ? stdout.trim() || null : null;
  return {
    url,
    answered: url !== null || exitCode === 2,
  };
}
//@ chunk-s06bcw1p.js:2487-3504 facade-majority (2.1.88 match: detectCurrentRepositoryWithHost, 0.702)
/**
 * 从 origin URL 解析当前仓库 {host, owner, name}，按 cwd 缓存。
 */
async function detectCurrentRepositoryWithHost(cwd, options) {
  let cwd_2 = cwd ?? getCwd();
  let repositoryByCwd = getGitRepoCache().repositoryByCwd;
  if (!options?.skipCache && repositoryByCwd.has(cwd_2)) {
    let cached = repositoryByCwd.get(cwd_2) ?? null;
    if (!cached || !isNestedGitLabProject(cached)) return cached;
  }
  let invalidateNested = () => {
    let cached = repositoryByCwd.get(cwd_2);
    if (cached && isNestedGitLabProject(cached)) repositoryByCwd.delete(cwd_2);
  };
  try {
    let remoteUrl = await resolveRemoteUrl(cwd_2);
    logForDebugging(`Git remote URL: ${redactGitRemoteCredentials(remoteUrl)}`);
    if (!remoteUrl) {
      logForDebugging("No git remote URL found");
      getGitRepoCache().remoteHostByCwd.delete(cwd_2);
      invalidateNested();
      return null;
    }
    let nestedRepo = null;
    let repo = ((remoteUrl) => {
      let parsed = parseGitRemote(remoteUrl);
      if (parsed && isNestedGitLabProject(parsed)) {
        nestedRepo ??= parsed;
        return null;
      }
      return parsed;
    })(remoteUrl);
    let pushAnswered = false;
    if (!repo) {
      let { stdout, code, exitCode } = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "--get", "remote.origin.url"],
        {
          cwd: cwd_2,
          preserveOutputOnError: false,
        },
      );
      let pushUrl = code === 0 ? stdout.trim() : null;
      let pushKnown = pushUrl !== null || exitCode === 1;
      if (pushUrl && pushUrl !== remoteUrl) {
        repo = parseGitRemote(pushUrl);
        if (repo && isNestedGitLabProject(repo)) {
          nestedRepo ??= repo;
          repo = null;
        }
      }
      if (!repo) {
        let originPushUrl = await getOriginPushUrl(cwd_2);
        let url = originPushUrl.url;
        if (url && url !== remoteUrl && url !== pushUrl) {
          repo = parseGitRemote(url);
          if (repo && isNestedGitLabProject(repo)) {
            nestedRepo ??= repo;
            repo = null;
          }
        }
        pushAnswered = pushKnown && originPushUrl.answered;
      }
    }
    repo ??= nestedRepo;
    logForDebugging(
      `Parsed repository: ${repo ? `${repo.host}/${repo.owner}/${repo.name}` : null} from URL: ${redactGitRemoteCredentials(remoteUrl)}`,
    );
    let host = repo?.host ?? ghIsDangerousCallback(remoteUrl);
    if (host) getGitRepoCache().remoteHostByCwd.set(cwd_2, host);
    else getGitRepoCache().remoteHostByCwd.delete(cwd_2);
    if (repo) repositoryByCwd.set(cwd_2, repo);
    else if (pushAnswered) repositoryByCwd.delete(cwd_2);
    return repo;
  } catch (error) {
    logForDebugging(`Error detecting repository: ${error}`);
    invalidateNested();
    return null;
  }
}
//@ chunk-s06bcw1p.js:3504-3616 facade-majority (2.1.88 match: getCachedRepository, 0.299)
function getCachedRepository() {
  let parsed = getGitRepoCache().repositoryByCwd.get(getCwd());
  if (!parsed || !isGithubDotCom(parsed.host)) return null;
  return `${parsed.owner}/${parsed.name}`;
}
//@ chunk-s06bcw1p.js:3616-3681 facade-majority
function getCachedRepositoryHost() {
  return getGitRepoCache().repositoryByCwd.get(getCwd())?.host ?? null;
}
//@ chunk-s06bcw1p.js:3681-3816 facade-majority
function isGitLabMrTarget(target) {
  if (isGitLabMergeRequestUrl(target) || /^!\d+$/.test(target)) return true;
  if (/^https?:\/\//i.test(target)) return false;
  let cachedRepositoryHost = getCachedRepositoryHost();
  return cachedRepositoryHost !== null && getGitHostKind(cachedRepositoryHost) === "gitlab";
}
//@ chunk-s06bcw1p.js:3816-3960 facade-majority
function glabMrId(target) {
  let mrId = /\/-\/merge_requests\/(\d+)/.exec(target)?.[1] ?? target.replace(/^!(\d+)$/, "$1");
  return /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(mrId) ? mrId : "";
}
//@ chunk-s06bcw1p.js:3960-4051 layout
var GITLAB_MR_URL_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s06bcw1p.js:3960", () => {
  GITLAB_MR_URL_PATTERN = new RegExp(
    `^(https?://${HOSTNAME_PATTERN}(?::\\d{1,5})?/(?:${REPO_NAME_PATTERN}/)+${REPO_NAME_PATTERN})/-/merge_requests/\\d`,
  );
});
//@ chunk-s06bcw1p.js:4051-4095 facade-majority
function glabMrProjectUrl(target) {
  return GITLAB_MR_URL_PATTERN.exec(target)?.[1] ?? null;
}
//@ chunk-s06bcw1p.js:4095-4154 facade-majority
function getCachedRemoteHost() {
  return getGitRepoCache().remoteHostByCwd.get(getCwd()) ?? null;
}
//@ chunk-s06bcw1p.js:4154-4260 facade-majority
function isCachedGitHubRepo() {
  let cwd = getCwd();
  let repositoryByCwd = getGitRepoCache().repositoryByCwd;
  if (!repositoryByCwd.has(cwd)) return;
  let cached = repositoryByCwd.get(cwd);
  return !!cached && isGithubDotCom(cached.host);
}
//@ chunk-s06bcw1p.js:4260-4806 facade-majority (2.1.88 match: parseGitRemote, 1)
/**
 * 解析 git 远程 URL（ssh/https/git 协议）为 host/owner/name。
 */
function parseGitRemote(input) {
  let trimmed = input.trim();
  if (describeUrlScheme(trimmed) || isSuspiciousUrl(trimmed)) return null;
  let sshMatch = trimmed.match(/^git@([^:/@]+):([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (sshMatch?.[1] && sshMatch[2] && sshMatch[3]) {
    if (!looksLikeRealHostname(sshMatch[1])) return null;
    if (!isValidRepoSegment(sshMatch[2]) || !isValidRepoSegment(sshMatch[3])) return null;
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      name: sshMatch[3],
    };
  }
  let urlMatch = trimmed.match(
    /^(https?|ssh|git):\/\/(?:[^@/?#]*@)?([^/:?#@]+(?::\d+)?)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  );
  if (urlMatch?.[1] && urlMatch[2] && urlMatch[3] && urlMatch[4]) {
    let protocol = urlMatch[1];
    let hostWithPort = urlMatch[2];
    let hostWithoutPort = firstLineOf(hostWithPort, ":");
    if (!looksLikeRealHostname(hostWithoutPort)) return null;
    let host = protocol === "https" || protocol === "http" ? hostWithPort : hostWithoutPort;
    if (!isValidRepoSegment(urlMatch[3]) || !isValidRepoSegment(urlMatch[4])) return null;
    return {
      host,
      owner: urlMatch[3],
      name: urlMatch[4],
    };
  }
  return parseGitRemote_2(trimmed);
}
//@ chunk-s06bcw1p.js:4806-5278 layout (2.1.88 match: parseGitRemote, 0.793)
function parseGitRemote_2(input) {
  let protocol;
  let hostPart;
  let pathPart;
  let sshMatch = input.match(/^git@([^:/@]+):(.+?)(?:\.git)?\/?$/);
  if (sshMatch?.[1] && sshMatch[2]) {
    hostPart = sshMatch[1];
    pathPart = sshMatch[2];
  } else {
    let urlMatch = input.match(
      /^(https?|ssh|git):\/\/(?:[^@/?#]*@)?([^/:?#@]+(?::\d+)?)\/(.+?)(?:\.git)?\/?$/,
    );
    if (!urlMatch?.[1] || !urlMatch[2] || !urlMatch[3]) return null;
    protocol = urlMatch[1];
    hostPart = urlMatch[2];
    pathPart = urlMatch[3];
  }
  let hostWithoutPort = firstLineOf(hostPart, ":");
  if (!looksLikeRealHostname(hostWithoutPort) || getGitHostKind(hostWithoutPort) !== "gitlab") return null;
  let parts = pathPart.split("/");
  if (parts.length < 3 || parts.length > MAX_REPO_PATH_SEGMENTS + 1 || !parts.every(isValidRepoSegment))
    return null;
  return {
    host: protocol === "https" || protocol === "http" ? hostPart : hostWithoutPort,
    owner: parts.slice(0, -1).join("/"),
    name: parts.at(-1),
  };
}
//@ chunk-s06bcw1p.js:5278-5515 facade-majority
/**
 * 从任意远程 URL 末尾提取 owner/name（去掉 .git），校验段名合法。
 */
function parseRepoSlug(input) {
  let match = input
    .trim()
    .replace(/\/+$/, "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
    .match(/(?:[:/]|^)([^/:]+)\/([^/:]+?)(?:\.git)?$/);
  if (!match?.[1] || !match[2]) return null;
  if (!isValidRepoSegment(match[1]) || !isValidRepoSegment(match[2])) return null;
  return {
    owner: match[1],
    name: match[2],
  };
}
//@ chunk-s06bcw1p.js:5515-5862 facade-majority (2.1.88 match: parseGitHubRepository, 0.809)
function parseGitHubRepository(input) {
  let trimmed = input.trim();
  let parsed = parseGitRemote(trimmed);
  if (parsed) {
    if (!isGithubDotCom(parsed.host)) return null;
    return `${parsed.owner}/${parsed.name}`;
  }
  if (!trimmed.includes("://") && !trimmed.includes("@") && trimmed.includes("/")) {
    let parts = trimmed.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      let repo = parts[1].replace(/\.git$/, "");
      if (!isValidRepoSegment(parts[0]) || !isValidRepoSegment(repo)) return null;
      return `${parts[0]}/${repo}`;
    }
  }
  logForDebugging(`Could not parse repository from: ${trimmed}`);
  return null;
}
//@ chunk-s06bcw1p.js:5862-5888 layout
var REPO_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
//@ chunk-s06bcw1p.js:5888-5958 layout
function isValidRepoSegment(repo) {
  return REPO_SEGMENT_PATTERN.test(repo) && !repo.startsWith("-") && repo !== "." && repo !== "..";
}
//@ chunk-s06bcw1p.js:5958-6117 callgraph-witnessed (2.1.88 match: looksLikeRealHostname, 1)
function looksLikeRealHostname(host) {
  if (!/^[A-Za-z0-9.-]+$/.test(host) || host.startsWith("-") || !host.includes(".")) return false;
  let lastSegment = host.split(".").pop();
  if (!lastSegment) return false;
  return /^[a-zA-Z]+$/.test(lastSegment);
}
export {
  runInvocation,
  getCachedRepository,
  parseGitHubRepository,
  isCachedGitHubRepo,
  isGitLabMergeRequestUrl,
  detectCurrentRepository,
  detectCurrentRepositoryWithHost,
  isNestedGitLabProject,
  resolveRemoteUrl,
  parseGitRemote,
  getCachedRemoteHost,
  parseRepoSlug,
  resolvePushRemoteUrl,
  resolveRemote,
  repoDetectionGuards,
  setRepoDetectionGuards,
  MAX_REPO_URL_CHARS,
  regExp_2,
  regExp,
  REPO_NAME_PATTERN,
  GOOGLESOURCE_HOST_PATTERN,
  HOSTNAME_PATTERN,
  GITLAB_MR_PATH_PATTERN,
  clearRepositoryCaches,
  primeCurrentRepository,
  DEFAULT_INVOCATION_ENCODING,
  glabMrId,
  glabMrProjectUrl,
  isGitLabMrTarget,
  getCachedRepositoryHost,
};
