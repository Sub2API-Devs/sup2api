/**
 * utils/detectRepository.ts
 *
 * 从 origin 远程 URL 解析当前仓库 host/owner/name（GitHub、GitLab MR 引用解析），按 cwd 缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/detectRepository.ts
 * pieces: chunk-vkh471k3.js (31)
 * attribution: placement 3, layout 7, facade-majority 20, callgraph-witnessed 1
 */
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { gl, getCwd } from "./cwd.js";
import { env } from "./env.js";
import { findGitRoot, gitExe, redactGitRemoteCredentials } from "./git.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { Plo } from "./git/gitFilesystem.js";
import { getRootSession } from "../bootstrap/state.js";
import { freeze } from "./git/gitSafeEnv.js";
import { firstLineOf, wh } from "./stringUtils.js";
import { logForDebugging } from "./debug.js";
import { ghIsDangerousCallback, getGitHostKind } from "./gitHosts.js";
import { describeUrlScheme } from "./resultError.js";
import { isSuspiciousUrl } from "./fsBoundRead.js";

//@ chunk-vkh471k3.js:611-1012 placement
var REPO_NAME_PATTERN = String.raw`(?!\.{1,2}(?:/|$))[A-Za-z0-9_.][\w.-]*`,
  _Sr = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*`,
  Ths = `(?:${REPO_NAME_PATTERN}/)+${REPO_NAME_PATTERN}/-/merge_requests`,
  Ahs = String.raw`[a-z0-9-]+-review\.googlesource\.com`,
  regExp = new RegExp(
    String.raw`^https://${Ahs}/c/(?:${REPO_NAME_PATTERN}/)*${REPO_NAME_PATTERN}/\+/\d{1,9}$`,
  ),
  regExp_2 = new RegExp(`^https?://${_Sr}(?::\\d{1,5})?/${Ths}/\\d+$`),
  L8e = 2048;
//@ chunk-vkh471k3.js:1012-1068 placement
function vhe(e) {
  return /\/-\/merge_requests\/\d/.test(e);
}
//@ chunk-vkh471k3.js:1068-1083 layout
var DEFAULT_INVOCATION_ENCODING = void 0;
/**
 * 按 {file, args, cwd, env} 执行一次调用（不继承环境、默认编码），属于外部命令调用工具，误归 shellConfig（旧版名 readFileLines 错配）。
 */
//@ chunk-vkh471k3.js:1083-1199 placement = readFileLines (0.607)
function runInvocation({ file: file, args: args, cwd: cwd, env: env }, u) {
  return execFileNoThrowWithCwd(file, args, {
    ...u,
    encoding: u.encoding ?? DEFAULT_INVOCATION_ENCODING,
    cwd: cwd,
    env: env,
    extendEnv: !1,
  });
}
//@ chunk-vkh471k3.js:1199-1208 layout
var C = 21;
//@ chunk-vkh471k3.js:1208-1252 facade-majority
function isNestedGitLabProject(e) {
  return e.owner.includes("/");
}
//@ chunk-vkh471k3.js:1252-1325 facade-majority
function clearRepositoryCaches() {
  (getGitRepoCache().repositoryByCwd.clear(), getGitRepoCache().remoteHostByCwd.clear());
}
//@ chunk-vkh471k3.js:1325-1403 facade-majority
function primeCurrentRepository() {
  let e = gl();
  if (e === null) return;
  if (env.GIT_DIR || findGitRoot(e) !== null) detectCurrentRepositoryWithHost(e);
}
//@ chunk-vkh471k3.js:1403-1515 facade-majority = detectCurrentRepository (0.395)
async function detectCurrentRepository() {
  let result = await detectCurrentRepositoryWithHost();
  if (!result) return null;
  if (!isGithubDotCom(result.host)) return null;
  return `${result.owner}/${result.name}`;
}
//@ chunk-vkh471k3.js:1515-1554 facade-majority
function repoDetectionGuards() {
  return Plo.of(getRootSession().host);
}
//@ chunk-vkh471k3.js:1554-1589 facade-majority
function setRepoDetectionGuards(e) {
  repoDetectionGuards().setGuards(e);
}
//@ chunk-vkh471k3.js:1589-2094 facade-majority
async function resolveRemote(e, o) {
  if (repoDetectionGuards().blocked()) return null;
  let r = o ?? gitExe(),
    n = (...h) => {
      let g = [...freeze, ...h],
        d = { preserveOutputOnError: !1 };
      return typeof r === "string" ? execFileNoThrowWithCwd(r, g, { ...d, cwd: e }) : runInvocation(r(g), d);
    },
    u = await n("remote", "get-url", "origin");
  if (u.code === 0 && u.stdout.trim()) return { name: "origin", url: u.stdout.trim() };
  let s = await n("remote"),
    a =
      s.code === 0
        ? firstLineOf(
            s.stdout.trim(),
            `
`,
          ).trim()
        : void 0;
  if (!a) return null;
  let c = await n("remote", "get-url", a),
    l = c.code === 0 ? c.stdout.trim() : "";
  if (!l) return null;
  return { name: wh(a), url: l };
}
//@ chunk-vkh471k3.js:2094-2148 facade-majority
async function resolveRemoteUrl(e) {
  return (await resolveRemote(e))?.url ?? null;
}
//@ chunk-vkh471k3.js:2148-2193 facade-majority
async function resolvePushRemoteUrl(e) {
  return (await getOriginPushUrl(e)).url;
}
//@ chunk-vkh471k3.js:2193-2453 layout
async function getOriginPushUrl(e) {
  if (repoDetectionGuards().blocked()) return { url: null, answered: !1 };
  let {
      stdout: stdout,
      code: code,
      exitCode: exitCode,
    } = await execFileNoThrowWithCwd(gitExe(), [...freeze, "remote", "get-url", "--push", "origin"], {
      cwd: e,
      preserveOutputOnError: !1,
    }),
    u = code === 0 ? stdout.trim() || null : null;
  return { url: u, answered: u !== null || exitCode === 2 };
}
/**
 * 从 origin URL 解析当前仓库 {host, owner, name}，按 cwd 缓存。
 */
//@ chunk-vkh471k3.js:2453-3470 facade-majority = detectCurrentRepositoryWithHost (0.702)
async function detectCurrentRepositoryWithHost(e, o) {
  let r = e ?? getCwd(),
    repositoryByCwd = getGitRepoCache().repositoryByCwd;
  if (!o?.skipCache && repositoryByCwd.has(r)) {
    let s = repositoryByCwd.get(r) ?? null;
    if (!s || !isNestedGitLabProject(s)) return s;
  }
  let u = () => {
    let s = repositoryByCwd.get(r);
    if (s && isNestedGitLabProject(s)) repositoryByCwd.delete(r);
  };
  try {
    let s = await resolveRemoteUrl(r);
    if ((logForDebugging(`Git remote URL: ${redactGitRemoteCredentials(s)}`), !s))
      return (
        logForDebugging("No git remote URL found"),
        getGitRepoCache().remoteHostByCwd.delete(r),
        u(),
        null
      );
    let a = null,
      l = ((d) => {
        let parsed = parseGitRemote(d);
        if (parsed && isNestedGitLabProject(parsed)) return ((a ??= parsed), null);
        return parsed;
      })(s),
      h = !1;
    if (!l) {
      let {
          stdout: stdout,
          code: code,
          exitCode: exitCode,
        } = await execFileNoThrowWithCwd(gitExe(), [...freeze, "config", "--get", "remote.origin.url"], {
          cwd: r,
          preserveOutputOnError: !1,
        }),
        m = code === 0 ? stdout.trim() : null,
        E = m !== null || exitCode === 1;
      if (m && m !== s) {
        if (((l = parseGitRemote(m)), l && isNestedGitLabProject(l))) ((a ??= l), (l = null));
      }
      if (!l) {
        let y = await getOriginPushUrl(r),
          url = y.url;
        if (url && url !== s && url !== m) {
          if (((l = parseGitRemote(url)), l && isNestedGitLabProject(l))) ((a ??= l), (l = null));
        }
        h = E && y.answered;
      }
    }
    ((l ??= a),
      logForDebugging(
        `Parsed repository: ${l ? `${l.host}/${l.owner}/${l.name}` : null} from URL: ${redactGitRemoteCredentials(s)}`,
      ));
    let g = l?.host ?? ghIsDangerousCallback(s);
    if (g) getGitRepoCache().remoteHostByCwd.set(r, g);
    else getGitRepoCache().remoteHostByCwd.delete(r);
    if (l) repositoryByCwd.set(r, l);
    else if (h) repositoryByCwd.delete(r);
    return l;
  } catch (error) {
    return (logForDebugging(`Error detecting repository: ${error}`), u(), null);
  }
}
//@ chunk-vkh471k3.js:3470-3582 facade-majority = getCachedRepository (0.302)
function getCachedRepository() {
  let parsed = getGitRepoCache().repositoryByCwd.get(getCwd());
  if (!parsed || !isGithubDotCom(parsed.host)) return null;
  return `${parsed.owner}/${parsed.name}`;
}
//@ chunk-vkh471k3.js:3582-3647 facade-majority
function getCachedRepositoryHost() {
  return getGitRepoCache().repositoryByCwd.get(getCwd())?.host ?? null;
}
//@ chunk-vkh471k3.js:3647-3782 facade-majority
function isGitLabMrTarget(e) {
  if (vhe(e) || /^!\d+$/.test(e)) return !0;
  if (/^https?:\/\//i.test(e)) return !1;
  let o = getCachedRepositoryHost();
  return o !== null && getGitHostKind(o) === "gitlab";
}
//@ chunk-vkh471k3.js:3782-3926 facade-majority
function glabMrId(e) {
  let r = /\/-\/merge_requests\/(\d+)/.exec(e)?.[1] ?? e.replace(/^!(\d+)$/, "$1");
  return /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(r) ? r : "";
}
//@ chunk-vkh471k3.js:3926-4017 layout
var GITLAB_MR_URL_PATTERN = new RegExp(
  `^(https?://${_Sr}(?::\\d{1,5})?/(?:${REPO_NAME_PATTERN}/)+${REPO_NAME_PATTERN})/-/merge_requests/\\d`,
);
//@ chunk-vkh471k3.js:4017-4061 facade-majority
function glabMrProjectUrl(e) {
  return GITLAB_MR_URL_PATTERN.exec(e)?.[1] ?? null;
}
//@ chunk-vkh471k3.js:4061-4120 facade-majority
function getCachedRemoteHost() {
  return getGitRepoCache().remoteHostByCwd.get(getCwd()) ?? null;
}
//@ chunk-vkh471k3.js:4120-4226 facade-majority
function isCachedGitHubRepo() {
  let e = getCwd(),
    repositoryByCwd = getGitRepoCache().repositoryByCwd;
  if (!repositoryByCwd.has(e)) return;
  let r = repositoryByCwd.get(e);
  return !!r && isGithubDotCom(r.host);
}
/**
 * 解析 git 远程 URL（ssh/https/git 协议）为 host/owner/name。
 */
//@ chunk-vkh471k3.js:4226-4771 facade-majority = parseGitRemote (1)
function parseGitRemote(input) {
  let trimmed = input.trim();
  if (describeUrlScheme(trimmed) || isSuspiciousUrl(trimmed)) return null;
  let sshMatch = trimmed.match(/^git@([^:/@]+):([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (sshMatch?.[1] && sshMatch[2] && sshMatch[3]) {
    if (!looksLikeRealHostname(sshMatch[1])) return null;
    if (!isValidRepoSegment(sshMatch[2]) || !isValidRepoSegment(sshMatch[3])) return null;
    return { host: sshMatch[1], owner: sshMatch[2], name: sshMatch[3] };
  }
  let urlMatch = trimmed.match(
    /^(https?|ssh|git):\/\/(?:[^@/?#]*@)?([^/:?#@]+(?::\d+)?)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  );
  if (urlMatch?.[1] && urlMatch[2] && urlMatch[3] && urlMatch[4]) {
    let u = urlMatch[1],
      s = urlMatch[2],
      a = firstLineOf(s, ":");
    if (!looksLikeRealHostname(a)) return null;
    let host = u === "https" || u === "http" ? s : a;
    if (!isValidRepoSegment(urlMatch[3]) || !isValidRepoSegment(urlMatch[4])) return null;
    return { host: host, owner: urlMatch[3], name: urlMatch[4] };
  }
  return parseGitRemote_2(trimmed);
}
//@ chunk-vkh471k3.js:4771-5243 layout = parseGitRemote (0.793)
function parseGitRemote_2(input) {
  let o,
    r,
    n,
    sshMatch = input.match(/^git@([^:/@]+):(.+?)(?:\.git)?\/?$/);
  if (sshMatch?.[1] && sshMatch[2]) ((r = sshMatch[1]), (n = sshMatch[2]));
  else {
    let urlMatch = input.match(
      /^(https?|ssh|git):\/\/(?:[^@/?#]*@)?([^/:?#@]+(?::\d+)?)\/(.+?)(?:\.git)?\/?$/,
    );
    if (!urlMatch?.[1] || !urlMatch[2] || !urlMatch[3]) return null;
    ((o = urlMatch[1]), (r = urlMatch[2]), (n = urlMatch[3]));
  }
  let s = firstLineOf(r, ":");
  if (!looksLikeRealHostname(s) || getGitHostKind(s) !== "gitlab") return null;
  let parts = n.split("/");
  if (parts.length < 3 || parts.length > C + 1 || !parts.every(isValidRepoSegment)) return null;
  return {
    host: o === "https" || o === "http" ? r : s,
    owner: parts.slice(0, -1).join("/"),
    name: parts.at(-1),
  };
}
/**
 * 从任意远程 URL 末尾提取 owner/name（去掉 .git），校验段名合法。
 */
//@ chunk-vkh471k3.js:5243-5480 facade-majority
function parseRepoSlug(e) {
  let match = e
    .trim()
    .replace(/\/+$/, "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
    .match(/(?:[:/]|^)([^/:]+)\/([^/:]+?)(?:\.git)?$/);
  if (!match?.[1] || !match[2]) return null;
  if (!isValidRepoSegment(match[1]) || !isValidRepoSegment(match[2])) return null;
  return { owner: match[1], name: match[2] };
}
//@ chunk-vkh471k3.js:5480-5827 facade-majority = parseGitHubRepository (0.809)
function parseGitHubRepository(input) {
  let trimmed = input.trim(),
    parsed = parseGitRemote(trimmed);
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
  return (logForDebugging(`Could not parse repository from: ${trimmed}`), null);
}
//@ chunk-vkh471k3.js:5827-5853 layout
var REPO_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
//@ chunk-vkh471k3.js:5853-5923 layout
function isValidRepoSegment(e) {
  return REPO_SEGMENT_PATTERN.test(e) && !e.startsWith("-") && e !== "." && e !== "..";
}
//@ chunk-vkh471k3.js:5923-6082 callgraph-witnessed = looksLikeRealHostname (1)
function looksLikeRealHostname(host) {
  if (!/^[A-Za-z0-9.-]+$/.test(host) || host.startsWith("-") || !host.includes(".")) return !1;
  let lastSegment = host.split(".").pop();
  if (!lastSegment) return !1;
  return /^[a-zA-Z]+$/.test(lastSegment);
}

export {
  detectCurrentRepository,
  parseGitHubRepository,
  isCachedGitHubRepo,
  L8e,
  vhe,
  parseGitRemote,
  detectCurrentRepositoryWithHost,
  isNestedGitLabProject,
  resolveRemoteUrl,
  parseRepoSlug,
  resolvePushRemoteUrl,
  resolveRemote,
  repoDetectionGuards,
  clearRepositoryCaches,
  getCachedRemoteHost,
  runInvocation,
  getCachedRepository,
  setRepoDetectionGuards,
  primeCurrentRepository,
  glabMrId,
  glabMrProjectUrl,
  isGitLabMrTarget,
  DEFAULT_INVOCATION_ENCODING,
  regExp_2,
  regExp,
  REPO_NAME_PATTERN,
  Ahs,
  _Sr,
  Ths,
  getCachedRepositoryHost,
};
