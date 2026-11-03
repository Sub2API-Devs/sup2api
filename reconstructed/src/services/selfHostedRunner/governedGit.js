/**
 * services/selfHostedRunner/governedGit.ts
 *
 * 2.1.316 新增：自托管 runner 为会话仓库配置受管 git（凭据助手、推送 URL、git 代理、主机路由与 canonical 仓库清洗）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (45)
 * attribution: placement 45
 */
import { join, dirname, sep } from "path";
import { lstat, rm, readdir, readFile, writeFile, open, mkdir, chmod } from "fs/promises";
import { spawn } from "child_process";
import { normalizeGovernedHost } from "./handleSession.js";
import { plural } from "../../utils/stringUtils.js";
import {
  normalizeHost,
  isGithubDotCom,
  GITHUB_HOST,
  HOST_LABEL_RE,
  REPO_NAME_RE,
} from "../../utils/git/githubUrl.js";
import { isEnvAssignmentFree } from "./governedGitTrust.js";
import { getRemoteHostname, getRemoteRepoPath } from "./outcomeBranches.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { antEnv } from "../../utils/env.js";
import { envPositiveMs, tagFailureStage, SIGKILL_DELAY_MS, SETUP_STEP_DEADLINE_MS } from "./launcherHooks.js";
import { DEFAULT_FETCH_REFSPEC, SAFE_GIT_CONFIG_ARGS } from "../../selfHostedRunner/git/fetchErrors.js";
import { extraGitDir } from "./hostConfigSnapshot.js";
import { getRelativeSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import {
  anonCredentialHelperArgs,
  tokenCredentialHelperArgs,
} from "../../selfHostedRunner/git/gitCredentials.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isRetryableRunnerError } from "../../selfHostedRunner/runnerApiErrors.js";
import { sleep } from "../../utils/sleep.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { resolveInside } from "./repoSettingsConfinement.js";

//@ chunk-hm0ce8vc.js:170087-170855 placement
function pluralizeEntries(toolConfig, n) {
  let r = (p) => (Array.isArray(p) ? p : []);
  let s = r(toolConfig?.governed_hosts);
  let a = r(toolConfig?.direct_hosts);
  if (s.length === 0 && a.length === 0) return;
  let o = 0;
  let l = (p) => {
    let S = [];
    for (let T of p) {
      let y = normalizeGovernedHost(T);
      if (y === undefined) {
        o++;
        continue;
      }
      if (!S.includes(y)) S.push(y);
    }
    return S;
  };
  let u = l(s);
  let direct = l(a).filter((p) => !u.includes(p));
  if (o > 0)
    n(
      `[runner:warn] the work item's governed-git per-host routing carried ${o} host ${plural(o, "entry", "entries")} that ${plural(o, "is", "are")} not a bare canonical hostname; ${plural(o, "it was", "they were")} ignored (a host the runner cannot validate is served directly with this machine's own git credentials). No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.`,
    );
  return {
    governed: u,
    direct,
  };
}
//@ chunk-hm0ce8vc.js:170855-170974 placement
function isGovernedHost(e, n) {
  if (!e) return true;
  if (!n) return false;
  let r = normalizeHost(n);
  return isGithubDotCom(r) ? e.governed.includes(GITHUB_HOST) : e.governed.includes(r);
}
//@ chunk-hm0ce8vc.js:170974-171275 placement
/**
 * 按 NO_PROXY 列表筛出受管 git 主机中应直连的主机。
 */
function governedNoProxyHosts(hostSplit, noProxy) {
  if (!hostSplit || !noProxy) return [];
  let filtered = noProxy
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  if (filtered.includes("*")) return [...hostSplit.governed];
  let filtered_2 = filtered
    .map((a) =>
      a
        .replace(/^\*?\./, "")
        .replace(/:\d+$/, "")
        .replace(/\.$/, ""),
    )
    .filter((a) => a !== "");
  return hostSplit.governed.filter((a) => filtered_2.some((o) => a === o || a.endsWith(`.${o}`)));
}
//@ chunk-hm0ce8vc.js:171275-172132 placement
function formatAskpassWarning(hostSplit, n) {
  if (!hostSplit || !n) return;
  let filtered = hostSplit.governed.filter((s) => s !== GITHUB_HOST);
  if (filtered.length === 0) return;
  return `[runner:warn] governed git: GIT_ASKPASS is set on this runner and the server governs ${plural(filtered.length, "host")} ${filtered.join(", ")}. An askpass program answers for every host. The session's own git config tells git to give up rather than ask for a credential for ${plural(filtered.length, "that host", "those hosts")}, because the session relay supplies it. Do not leave it to that alone: git config read after the session's own (a repository's, the command line, GIT_CONFIG_* variables) can switch that off, and if the program were then asked, this machine's credential would pass through Anthropic's relay. Make the program answer only for the hosts you mean (git passes it the URL in its prompt) or unset it; the same goes for core.askPass in git config and for SSH_ASKPASS.`;
}
//@ chunk-hm0ce8vc.js:172132-172992 placement
function formatSourcesOnHostWarning(hostSplit, n, r) {
  if (!hostSplit || !n) return;
  let s = [];
  for (let a of r) {
    if (a === undefined || isGovernedHost(hostSplit, a)) continue;
    let o = normalizeHost(a);
    if (o === "" || o.length > 255 || !HOST_LABEL_RE.test(o) || s.includes(o)) continue;
    s.push(o);
  }
  if (s.length === 0) return;
  return `[runner:warn] governed git: this session has ${plural(s.length, "a source", "sources")} on ${s.join(", ")}, which the server does not route through Anthropic-managed git; ${plural(s.length, "it is", "they are")} cloned with this machine's own git credentials. This runner was started with --use-anthropic-git-proxy, which deletes and replaces the runner account's HOME-level git config at startup and before every session, so a credential for ${plural(s.length, "that host", "those hosts")} must live where that flag does not reach (for example /etc/gitconfig, GIT_ASKPASS, or an SSH key with --git-ssh-rewrite). Without one, the clone of a private repository there fails.`;
}
//@ chunk-hm0ce8vc.js:172992-174354 placement
function isLoopbackHttpUrl(governedGit, getSessionToken, onStatus, s) {
  if (!governedGit) return;
  let gitMountBaseUrl = governedGit.git_mount_base_url;
  let o;
  try {
    o = gitMountBaseUrl ? new URL(gitMountBaseUrl) : undefined;
  } catch {
    o = undefined;
  }
  let l =
    o?.protocol === "http:" &&
    (o.hostname === "localhost" || o.hostname === "127.0.0.1" || o.hostname === "[::1]");
  if (!o || (o.protocol !== "https:" && !l) || !isEnvAssignmentFree(o.href)) {
    onStatus(
      "[runner:warn] the work item's governed-git configuration carried an unusable git mount URL, so this session continues with the legacy git flow. No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  let u = isLoopbackUrl(governedGit.git_mount_push_base_url, onStatus);
  let h = isLoopbackUrl(governedGit.rest_mount_base_url, onStatus, BAD_REST_MOUNT_WARNING);
  let p = governedGit.tool_config?.git_config === true;
  let replaced = o.href.replace(/\/+$/, "");
  let T =
    s !== undefined &&
    !p &&
    o.username === "" &&
    o.password === "" &&
    o.href === o.origin + o.pathname &&
    replaced !== o.origin;
  if (s !== undefined && !p && !T)
    onStatus(
      "[runner:warn] governed git: a direct-upstreams list is set but the git mount URL's shape cannot be kept as a session remote, so every source keeps its upstream URL as origin and no in-session fetches are routed through the git mount",
    );
  let y = pluralizeEntries(governedGit.tool_config, onStatus);
  let gitConfig = p && (!y || y.governed.length > 0);
  let w = !y || y.governed.includes(GITHUB_HOST);
  let ghPathShim = governedGit.tool_config?.gh_path_shim === true && w;
  return {
    mountBaseUrl: replaced,
    toolConfig: {
      gitConfig,
      ghPathShim,
      ...(y && {
        hostSplit: y,
      }),
    },
    getSessionToken,
    ...(u !== undefined && {
      pushBaseUrl: u,
    }),
    ...(T && {
      directUpstreams: s,
    }),
    ...(h !== undefined &&
      w && {
        restMountBaseUrl: h,
      }),
  };
}
//@ chunk-hm0ce8vc.js:174354-174688 placement
/**
 * 受管 git 配置携带了不可用的 GitHub REST 挂载地址时的警告文字。
 */
var BAD_REST_MOUNT_WARNING =
  "[runner:warn] the work item's governed-git configuration carried an unusable GitHub REST mount URL, so this session's gh keeps this machine's own GitHub access (the clone through the mount is unaffected). No operator action is needed; please report this warning to Anthropic support so the server-side delivery can be fixed.";
//@ chunk-hm0ce8vc.js:174688-174814 placement
function matchesRepoList(governedGitUrl, directUpstreams) {
  let lower = `${governedGitUrl.host}/${governedGitUrl.owner}`.toLowerCase();
  let s = `${lower}/${governedGitUrl.repo.toLowerCase()}`;
  return directUpstreams.some((a) => a === lower || a === s);
}
//@ chunk-hm0ce8vc.js:174814-174919 placement
function splitMountRouting(e, n, r, s) {
  let a = new Set();
  let o = new Set();
  return {
    throughMount: [...a].sort(),
    keptDirect: [...o].sort(),
  };
}
//@ chunk-hm0ce8vc.js:174919-177235 placement
/**
 * 按服务器的逐主机路由判断源是 direct 还是 customer-managed。
 */
function classifySourceRouting(
  sources,
  gitSshRewriteHosts = [],
  gitHostRewrites = [],
  onDebug,
  a,
  o,
  onStatus,
) {
  let u = new Set(gitSshRewriteHosts.map((T) => T.toLowerCase()));
  let h = new Set();
  let p = new Map(gitHostRewrites.map(([T, y]) => [T.toLowerCase(), y]));
  let S = [];
  for (let T of sources) {
    if (T.type !== "git_repository" || !T.url) continue;
    let remoteHostname = getRemoteHostname(T.url);
    let hostSplit = o?.toolConfig.hostSplit;
    let w = isGovernedHost(hostSplit, remoteHostname);
    if (o && hostSplit && !w) {
      let L = remoteHostname !== undefined && hostSplit.direct.includes(normalizeHost(remoteHostname));
      onDebug?.(
        L
          ? `[runner:git] governed git: source ${T.url} is on a direct-class host (server per-host routing); customer-managed handling for this source`
          : `[runner:git] governed git: source ${T.url} is on a host not named in the ` +
              "server's per-host routing (unlisted); treating it as direct \u2014 " +
              "customer-managed handling for this source",
      );
    }
    if (o && w) {
      let governedGitUrl = buildGovernedGitUrl(T.url, o.mountBaseUrl, onDebug);
      if (governedGitUrl) {
        let D = formatNoPushUrlWarning(governedGitUrl, o.pushBaseUrl, onDebug);
        let oe = o.directUpstreams !== undefined && !matchesRepoList(governedGitUrl, o.directUpstreams);
        S.push({
          type: "github",
          repo: `${governedGitUrl.owner}/${governedGitUrl.repo}`,
          ref: T.revision,
          url: governedGitUrl.url,
          getAuthToken: o.getSessionToken,
          governedMount: true,
          upstreamUrl: governedGitUrl.upstreamUrl,
          ...(D !== undefined && {
            governedPushUrl: D,
          }),
          ...(oe && {
            fetchViaMount: oe,
          }),
        });
        continue;
      }
      onDebug?.(
        `[runner:git] governed git: source ${T.url} is not mount-routable; using legacy handling for this source`,
      );
      if (hostSplit && remoteHostname !== undefined) {
        let D = normalizeHost(remoteHostname);
        if (!h.has(D)) {
          h.add(D);
          onStatus?.(
            `[runner:warn] governed git: a source on governed host ${D} could not be routed through the git mount (its URL is not in a form the mount serves, for example a nonstandard port). It takes this machine's own git path instead, so it needs this machine's own credentials for that host although the host is listed as governed. Use the https://host/owner/repo form on the standard port, or keep a credential on this machine that answers only for that URL (for example one scoped to its port, or an SSH key).`,
          );
        }
      }
    }
    let gitProxyUrl = buildGitProxyUrl(T.url, a, onDebug);
    if (gitProxyUrl) {
      S.push({
        type: "github",
        repo: `${gitProxyUrl.owner}/${gitProxyUrl.repo}`,
        ref: T.revision,
        url: gitProxyUrl.url,
        getAuthToken: () => {
          let envClaudeCodeSessionAccessToken = process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
          if (!envClaudeCodeSessionAccessToken)
            throw Error(
              "git-proxy credential requested but CLAUDE_CODE_SESSION_ACCESS_TOKEN is unset \u2014 token issue/refresh failed?",
            );
          return envClaudeCodeSessionAccessToken;
        },
      });
      continue;
    }
    let A = rewriteHostUrl(T.url, p, onDebug);
    let G = rewriteSshUrl(A, u, onDebug);
    let remoteRepoPath = getRemoteRepoPath(G);
    if (!remoteRepoPath)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mapSources: cannot extract repo slug from source URL '${T.url}' \u2014 not scp-form (user@host:path) and not a parseable URL`,
        "mapSources: cannot extract repo slug from source URL",
      );
    S.push({
      type: isSshRemote(G) ? "github-ssh" : "github",
      repo: remoteRepoPath,
      ref: T.revision,
      url: G,
    });
  }
  return S;
}
//@ chunk-hm0ce8vc.js:177235-177897 placement
/**
 * 由源 URL 解析 owner/repo 生成 session_ingress git 代理地址。
 */
function buildGitProxyUrl(url, n, r) {
  if (!n) return;
  let match = url.match(/^https:\/\/[^/@]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (url.startsWith("https://"))
      r?.(
        `[runner:git] git proxy: could not parse owner/repo from ${url}; falling back to customer git auth for this source`,
      );
    return;
  }
  let a = match[1];
  let o = match[2];
  if (!REPO_NAME_RE.test(a) || !REPO_NAME_RE.test(o)) {
    r?.(
      `[runner:git] git proxy: rejecting unsafe owner/repo in ${url}; falling back to customer git auth for this source`,
    );
    return;
  }
  let url_2 = `${n.apiBaseUrl.replace(/\/+$/, "")}/v1/session_ingress/session/${n.sessionId}/git_proxy/${a}/${o}.git`;
  r?.(`[runner:git] rewrote ${url} -> git_proxy/${a}/${o}.git (--use-anthropic-git-proxy)`);
  return {
    url: url_2,
    owner: a,
    repo: o,
  };
}
//@ chunk-hm0ce8vc.js:177897-178655 placement
function buildGovernedGitUrl(url, mountBaseUrl, r) {
  let match = url.match(/^https:\/\/([^/@:]+)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (url.startsWith("https://"))
      r?.(`[runner:git] governed git: could not parse host/owner/repo from ${url}`);
    return;
  }
  let lower = match[1].toLowerCase();
  let o = match[2];
  let l = match[3];
  if (!/^(?!\.{1,2}$)[a-z0-9.-]+$/.test(lower) || lower.length > 255) {
    r?.(
      `[runner:git] governed git: rejecting unsafe host in ${url}; falling back to legacy handling for this source`,
    );
    return;
  }
  if (!REPO_NAME_RE.test(o) || !REPO_NAME_RE.test(l)) {
    r?.(
      `[runner:git] governed git: rejecting unsafe owner/repo in ${url}; falling back to legacy handling for this source`,
    );
    return;
  }
  let url_2 = `${mountBaseUrl}/${lower}/${o}/${l}`;
  r?.(`[runner:git] rewrote ${url} -> git mount /${lower}/${o}/${l} (governed git)`);
  return {
    url: url_2,
    host: lower,
    owner: o,
    repo: l,
    upstreamUrl: `https://${lower}/${o}/${l}`,
  };
}
//@ chunk-hm0ce8vc.js:178655-178939 placement
function formatNoPushUrlWarning(governedGitUrl, pushBaseUrl, r) {
  if (pushBaseUrl === undefined) return;
  if (!isGithubDotCom(governedGitUrl.host)) {
    r?.(
      `[runner:git] governed git: no push URL for ${governedGitUrl.upstreamUrl} \u2014 the git mount accepts pushes for github.com repositories only; this source keeps its current push path`,
    );
    return;
  }
  return `${pushBaseUrl}/${governedGitUrl.host}/${governedGitUrl.owner}/${governedGitUrl.repo}`;
}
//@ chunk-hm0ce8vc.js:178939-179038 placement
/**
 * 判断仓库本地 git 配置属于本会话（own）、属于别的会话（another）或没有。
 */
function gitConfigOwnershipLabel(spawnedSessionIds, n) {
  if (spawnedSessionIds === undefined || spawnedSessionIds.size > (spawnedSessionIds.has(n) ? 1 : 0))
    return "another";
  return spawnedSessionIds.size > 0 ? "own" : "none";
}
//@ chunk-hm0ce8vc.js:179038-179174 placement
function getDrainGraceMs(e, n) {
  return (
    antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM === true &&
    envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") === 0 &&
    (e === "none" || e === n)
  );
}
//@ chunk-hm0ce8vc.js:179174-179649 placement
function shouldSanitizeCanonical(onStatus, n, r) {
  if (!antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM) return true;
  if (!getDrainGraceMs(r, "own")) {
    let s = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS");
    onStatus(
      `[runner:warn] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM ignored: drain-grace is ${s}ms (> 0), so a prior session ` +
        "could have written to the canonical \u2014 sanitizing anyway",
    );
    return true;
  }
  onStatus(
    "[runner:session] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM \u2014 skipping " +
      `sanitizeCanonicalGitState for ${n} (trusted one-shot prewarm)`,
  );
  return false;
}
//@ chunk-hm0ce8vc.js:179649-179758 placement
var REPO_SANITIZE_ENTRIES = new Map([
  ["objects", "dir"],
  ["refs", "dir"],
  ["packed-refs", "file"],
  ["HEAD", "file"],
  ["shallow", "file"],
]);
//@ chunk-hm0ce8vc.js:179758-182117 placement
/**
 * 准备前清洗 canonical 仓库（objects、refs、packed-refs 等）。
 */
async function sanitizeCanonicalRepo(e, onDebug, r) {
  let s = join(e, ".git");
  let a;
  try {
    a = await lstat(s);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${e} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
  if (!a.isDirectory()) {
    await rm(s, {
      force: true,
    });
    onDebug(
      `[runner:session] sanitized canonical at ${e}: .git was not a directory (gitlink/symlink) \u2014 removed, will fresh-init`,
    );
    return;
  }
  let replaced = r?.replace(/^(https?:\/\/)[^/@]*@/, "$1");
  if (replaced && /[\x00-\x1f]/.test(replaced))
    throw Error("git-proxy: sanitize refused \u2014 control char in origin URL");
  let l =
    `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
	checkStat = minimal
	trustctime = false
` +
    (replaced
      ? `[remote "origin"]
	url = ${replaced}
	fetch = ${DEFAULT_FETCH_REFSPEC}
`
      : "");
  try {
    let u = await readdir(s);
    for (let v of u) {
      let w = REPO_SANITIZE_ENTRIES.get(v);
      if (w) {
        let E = await lstat(join(s, v)).catch(() => {
          return;
        });
        if (E && !E.isSymbolicLink() && (w === "dir" ? E.isDirectory() : E.isFile())) continue;
        onDebug(`[runner:session] sanitize: kept entry .git/${v} has unexpected type \u2014 removing`);
      }
      await rm(join(s, v), {
        recursive: true,
        force: true,
      });
    }
    try {
      await rm(join(s, "refs", "heads"));
      onDebug(
        "[runner:session] sanitize: .git/refs/heads was not a directory \u2014 removed (a reftable repository leaves a placeholder file there)",
      );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ERR_FS_EISDIR") throw error;
    }
    await removeSymlinksIn(join(s, "refs"), true);
    await removeSymlinksIn(join(s, "objects"), false);
    await rm(join(s, "objects", "info"), {
      recursive: true,
      force: true,
    });
    await rm(join(s, "objects", "pack", "multi-pack-index"), {
      recursive: true,
      force: true,
    });
    let h = join(s, "HEAD");
    let p = await lstat(h).catch(() => {
      return;
    });
    let S = p && p.size <= 1024 ? await readFile(h, "utf-8").catch(() => "") : "";
    let match = /^ref: (refs\/[A-Za-z0-9._/-]+)\n?$/.exec(S);
    let y =
      match &&
      match[1]
        .split("/")
        .every(
          (v) =>
            v.length > 0 &&
            !v.startsWith(".") &&
            !v.endsWith(".") &&
            !v.endsWith(".lock") &&
            !v.includes(".."),
        );
    if (/^ref: refs\/heads\/\.invalid\n?$/.test(S)) {
      await rm(h, {
        force: true,
      });
      await writeFile(
        h,
        `ref: refs/heads/main
`,
        {
          flag: "wx",
          mode: 420,
        },
      );
    } else if (!y && !/^[0-9a-f]{40}([0-9a-f]{24})?\n?$/.test(S))
      await rm(h, {
        force: true,
      });
    await writeFile(join(s, "config"), l, {
      mode: 420,
    });
    onDebug(`[runner:session] sanitized canonical .git/ at ${e} (git-proxy cross-session isolation)`);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${e} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
}
//@ chunk-hm0ce8vc.js:182117-182441 placement
/**
 * 删除目录中的符号链接（可递归子目录）。
 */
async function removeSymlinksIn(e, n) {
  let r;
  try {
    r = await readdir(e);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  for (let s of r) {
    let a = join(e, s);
    let o;
    try {
      o = await lstat(a);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      throw error;
    }
    if (o.isSymbolicLink()) {
      await rm(a, {
        force: true,
      });
      continue;
    }
    if (n && o.isDirectory()) await removeSymlinksIn(a, true);
  }
}
//@ chunk-hm0ce8vc.js:182441-182558 placement
async function writeNewFile(path, content, mode) {
  let s = await open(path, "wx", mode);
  try {
    await s.writeFile(content);
    await s.chmod(mode);
  } finally {
    await s.close();
  }
}
//@ chunk-hm0ce8vc.js:182558-182687 placement = convertDirectoryToZipInPlace (1)
async function rewriteFileWithMode(path, content, r) {
  await rm(path, {
    recursive: true,
    force: true,
  });
  await mkdir(dirname(path), {
    recursive: true,
  });
  await writeFile(path, content, {
    mode: r,
  });
  await chmod(path, r);
}
//@ chunk-hm0ce8vc.js:182687-183435 placement
/**
 * 清空并重写会话间隔离用的 git 钩子桩。
 */
async function restoreHookStubs(configureGitHookStubs, configureGitSigningArtifacts, onDebug) {
  if (configureGitHookStubs.length === 0) return;
  let s = dirname(configureGitHookStubs[0].path);
  let a = dirname(s);
  try {
    let o = await lstat(a).catch(() => {
      return;
    });
    if (!o)
      await mkdir(a, {
        recursive: true,
      });
    else if (!o.isDirectory() || o.isSymbolicLink()) {
      await rm(a, {
        recursive: true,
        force: true,
      });
      await mkdir(a, {
        recursive: true,
      });
    }
    if (configureGitSigningArtifacts)
      for (let l of configureGitSigningArtifacts) await rewriteFileWithMode(l.path, l.content, l.mode);
    await rm(s, {
      recursive: true,
      force: true,
    });
    await mkdir(s, {
      recursive: true,
    });
    for (let l of configureGitHookStubs) await rewriteFileWithMode(l.path, l.content, 493);
    onDebug(
      `[runner:session] clean-slated ${s} and rewrote ${configureGitHookStubs.length} hook stubs (cross-session isolation)`,
    );
  } catch (error) {
    throw tagFailureStage(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: could not restore hook stubs under ${s} \u2014 ${error instanceof Error ? error.message : String(error)}`,
        "--configure-git: could not restore git hook stubs",
      ),
      "SETUP_FAILURE_KIND_FILESYSTEM_ERROR",
    );
  }
}
//@ chunk-hm0ce8vc.js:183435-184848 placement
/**
 * 写 info/exclude 让 git 忽略 .claude/settings.local.json。
 */
async function ignoreLocalSettingsInGit(e, onDebug, onStatus) {
  try {
    await rm(dirname(e.xdgConfigPath), {
      recursive: true,
      force: true,
    });
    let s = [dirname(e.xdgConfigPath)];
    let a = e.homeGitconfigPath && extraGitDir(dirname(e.homeGitconfigPath));
    if (a && a !== dirname(e.xdgConfigPath)) {
      await rm(a, {
        recursive: true,
        force: true,
      });
      s.push(a);
    }
    for (let o of s) {
      let l = join(o, "ignore");
      await rewriteFileWithMode(
        l,
        `**/${getRelativeSettingsFilePathForSource("localSettings").replaceAll("\\", "/")}
`,
        420,
      ).catch((error) =>
        onStatus(
          `[runner:warn] could not write ${l}, so git may not ignore .claude/settings.local.json in this session and "git add -A" may commit it: ${errorMessage(error)}`,
        ),
      );
    }
    if (e.homeGitconfigPath && e.homeGitconfigPath !== e.globalConfigPath)
      await rm(e.homeGitconfigPath, {
        recursive: true,
        force: true,
      });
    await rewriteFileWithMode(e.globalConfigPath, e.globalConfigSnapshot, 420);
    if (e.credHelper) {
      let o = dirname(e.credHelper.path);
      let l = await lstat(o).catch(() => {
        return;
      });
      if (!l)
        await mkdir(o, {
          recursive: true,
        });
      else if (!l.isDirectory() || l.isSymbolicLink()) {
        await rm(o, {
          recursive: true,
          force: true,
        });
        await mkdir(o, {
          recursive: true,
        });
      }
      if (e.signingArtifacts)
        for (let signingArtifact of e.signingArtifacts)
          await rewriteFileWithMode(signingArtifact.path, signingArtifact.content, signingArtifact.mode);
      await rewriteFileWithMode(e.credHelper.path, e.credHelper.content, 448);
    }
    onDebug(
      "[runner:session] restored ~/.gitconfig and git-proxy-cred to startup snapshot (git-proxy cross-session isolation)",
    );
  } catch (error) {
    throw tagFailureStage(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git-proxy: could not sanitize runner HOME-level git state before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
        "git-proxy: could not sanitize runner HOME-level git state before prep",
      ),
      "SETUP_FAILURE_KIND_FILESYSTEM_ERROR",
    );
  }
}
//@ chunk-hm0ce8vc.js:184848-185317 placement
async function runGitConfigLocal(e, onDebug, r) {
  if (r)
    await rm(join(e, ".git", "config.lock"), {
      force: true,
    }).catch(() => {});
  await new Promise((resolve) => {
    let a = spawn("git", ["-C", e, "config", "--local", "--unset-all", "credential.helper", "^$"], {
      cwd: undefined,
      stdio: "ignore",
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    let timer = setTimeout((u) => u.kill("SIGKILL"), SIGKILL_DELAY_MS, a);
    let l = (u) => {
      clearTimeout(timer);
      if (u !== 0 && u !== 5 && u !== null)
        onDebug(`[runner:session] stale git-proxy reset sweep in ${e} exited ${u}`);
      resolve();
    };
    a.on("close", l);
    a.on("error", () => l(null));
  });
}
//@ chunk-hm0ce8vc.js:185317-185874 placement
/**
 * 配置会话凭据助手（使用 CLAUDE_CODE_SESSION_ACCESS_TOKEN）。
 */
async function setCredentialHelper(e, n, onDebug, s) {
  let origin = new URL(n).origin;
  let o = [
    [["credential.helper", ""], ["--replace-all"]],
    [[`credential.${origin}.helper`, ""], ["--replace-all"]],
    [
      [`credential.${origin}.helper`, anonCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN")],
      ["--add"],
    ],
  ];
  for (let [[l, u], h] of o)
    await runGitWithAbort(
      ["-C", e, "config", "--local", ...h, l, u],
      (p) =>
        tagFailureStage(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `git proxy: 'git config ${l}' in ${e} exited ${p.code}: ${p.stderr}`,
            "git proxy: repo-local git config write failed",
          ),
          "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED",
        ),
      s,
    );
  onDebug(`[runner:session] git proxy: wired repo-local credential helper for ${origin} in ${e}`);
}
//@ chunk-hm0ce8vc.js:185874-186523 placement
async function runGitWithAbort(e, n, r, s = spawn, a = SIGKILL_DELAY_MS, o) {
  await new Promise((resolve, reject) => {
    let h = false;
    let p = "";
    let S = (w) => {
      if (h) return;
      h = true;
      clearTimeout(timer);
      r?.removeEventListener("abort", y);
      if (w) reject(w);
      else resolve();
    };
    let T = s("git", e, {
      cwd: undefined,
      stdio: ["ignore", o ? "pipe" : "ignore", "pipe"],
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    T.stdout?.on("data", (w) => o?.(String(w)));
    T.stderr?.on("data", (w) => (p += String(w)));
    let y = () => {
      T.kill("SIGKILL");
      S(
        n({
          code: null,
          stderr: p.trim(),
        }),
      );
    };
    let timer = setTimeout(
      (w, E) => {
        w.kill("SIGKILL");
        E(
          n({
            code: null,
            stderr: p.trim(),
          }),
        );
      },
      a,
      T,
      S,
    );
    if (r?.aborted) y();
    else
      r?.addEventListener("abort", y, {
        once: true,
      });
    T.on("close", (w) =>
      S(
        w === 0
          ? undefined
          : n({
              code: w,
              stderr: p.trim(),
            }),
      ),
    );
    T.on("error", (w) => S(w));
  });
}
//@ chunk-hm0ce8vc.js:186523-187108 placement
async function getRemoteOriginUrls(e, n, onDebug, s, a, o) {
  let l = "";
  let u = {
    code: null,
  };
  let h = await runGitWithAbort(
    ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--get-all", "remote.origin.url"],
    (S) => {
      u.code = S.code;
      return Error("git config --get-all remote.origin.url failed");
    },
    s,
    a,
    o,
    (S) => {
      l += S;
    },
  ).then(
    () => true,
    () => false,
  );
  if (!h && u.code !== 1) return "read_failed";
  let filtered = l
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (h && filtered.length === 1 && filtered[0] === n) return "ok";
  onDebug(
    `[runner:session] governed git: remote.origin.url in ${e} is not the upstream URL after prep; the runner changed nothing here; the next preparation of this repository rewrites origin or fails`,
  );
  return "not_upstream";
}
//@ chunk-hm0ce8vc.js:187108-187741 placement
async function setHostCredentialHelper(e, url, r, mountBaseUrl, onDebug, o) {
  let l = `credential.${mountBaseUrl}.helper`;
  let u = r.endsWith(".git") ? r.slice(0, -4) : `${r}.git`;
  let h = [
    [l, "", "--replace-all"],
    [l, tokenCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN"), "--add"],
    [`url.${url}.insteadOf`, r, "--replace-all"],
    [`url.${url}.insteadOf`, u, "--add"],
  ];
  for (let [p, S, T] of h)
    await runGitWithAbort(
      ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", T, p, S],
      (y) =>
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `governed git mount read: 'git config ${p}' in ${e} exited ${y.code}: ${y.stderr}`,
          "governed git mount read: repo-local git config write failed",
        ),
      o,
    );
  onDebug(
    `[runner:session] governed git: fetches of ${r} rewritten to the mount (${url}) with a session-token credential helper scoped to ${mountBaseUrl} in ${e}`,
  );
}
//@ chunk-hm0ce8vc.js:187741-188276 placement
async function setUrlInsteadOf(path, mountUrl, mountBaseUrl, onDebug, a = SETUP_STEP_DEADLINE_MS) {
  let o = Date.now() + a;
  for (let l of [`url.${mountUrl}.insteadOf`, `credential.${mountBaseUrl}.helper`])
    if (
      !(await runGitWithAbort(
        ["-C", path, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", l],
        (h) =>
          h.code === GIT_CONFIG_MISSING_EXIT_CODE
            ? new GovernedGitError()
            : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `governed git mount read: 'git config --unset-all ${l}' in ${path} exited ${h.code}: ${h.stderr}`,
                "governed git mount read: repo-local git config cleanup failed",
              ),
        undefined,
        undefined,
        Math.max(1, o - Date.now()),
      ).then(
        () => true,
        (error) => {
          if (error instanceof GovernedGitError) return true;
          onDebug(`[runner:session] governed git: ${errorMessage(error)} (best-effort cleanup)`);
          return false;
        },
      ))
    )
      return;
}
//@ chunk-hm0ce8vc.js:188276-189001 placement
function isLoopbackUrl(e, onDebug, r) {
  let s = e?.trim() ?? "";
  if (s === "") return;
  let a;
  try {
    a = new URL(s);
  } catch {
    a = undefined;
  }
  let o =
    a?.protocol === "http:" &&
    (a.hostname === "localhost" || a.hostname === "127.0.0.1" || a.hostname === "[::1]");
  let l =
    a !== undefined &&
    (a.username !== "" ||
      a.password !== "" ||
      a.href !== a.origin + a.pathname ||
      !isEnvAssignmentFree(a.href));
  if (!a || (a.protocol !== "https:" && !o) || l) {
    onDebug(
      r ??
        "[runner:warn] the work item's governed-git configuration carried an unusable git mount push URL, so this session's git pushes keep going to the upstream remote instead of the git mount (the clone through the mount is unaffected). No operator action is needed; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  return a.href.replace(/\/+$/, "");
}
//@ chunk-hm0ce8vc.js:189001-189986 placement
/**
 * 设置/清除 remote.origin.pushurl 让推送走受管路径。
 */
async function configureGovernedPushUrl(canonicalPath, n, origin, upstreamUrl, onDebug, signal) {
  await runGitWithAbort(
    [
      "-C",
      canonicalPath,
      ...SAFE_GIT_CONFIG_ARGS,
      "config",
      "--local",
      "--unset-all",
      "remote.origin.pushurl",
    ],
    (h) =>
      h.code === GIT_CONFIG_MISSING_EXIT_CODE
        ? new GovernedGitError()
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `governed git push URL: 'git config --unset-all remote.origin.pushurl' in ${canonicalPath} exited ${h.code}: ${h.stderr}`,
            "governed git push URL: repo-local git config unset failed",
          ),
    signal,
  ).catch((error) => {
    if (!(error instanceof GovernedGitError)) throw error;
  });
  let l = upstreamUrl.endsWith(".git") ? upstreamUrl.slice(0, -4) : `${upstreamUrl}.git`;
  let u = [
    [[pushInsteadOfKey(n), upstreamUrl], ["--replace-all"]],
    [[pushInsteadOfKey(n), l], ["--add"]],
    [[`credential.${origin}.helper`, ""], ["--replace-all"]],
    [
      [`credential.${origin}.helper`, tokenCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN")],
      ["--add"],
    ],
  ];
  for (let [[h, p], S] of u)
    await runGitWithAbort(
      ["-C", canonicalPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", ...S, h, p],
      (T) =>
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `governed git push URL: 'git config ${h}' in ${canonicalPath} exited ${T.code}: ${T.stderr}`,
          "governed git push URL: repo-local git config write failed",
        ),
      signal,
    );
  onDebug(
    `[runner:session] governed git: pushes to ${upstreamUrl} rewritten to ${n} (url.<pushUrl>.pushInsteadOf) with a session-token credential helper scoped to ${origin} in ${canonicalPath}`,
  );
}
//@ chunk-hm0ce8vc.js:189986-190032 placement
/**
 * 拼出 url.<url>.pushInsteadOf 配置键名。
 */
function pushInsteadOfKey(e) {
  return `url.${e}.pushInsteadOf`;
}
//@ chunk-hm0ce8vc.js:190032-190510 placement
async function unsetCredentialHelper(canonicalPath, n, origin, onDebug) {
  let a = true;
  for (let o of [pushInsteadOfKey(n), `credential.${origin}.helper`])
    await runGitWithAbort(
      ["-C", canonicalPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", o],
      (l) =>
        l.code === GIT_CONFIG_MISSING_EXIT_CODE
          ? new GovernedGitError()
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `governed git push URL: 'git config --unset-all ${o}' in ${canonicalPath} exited ${l.code}: ${l.stderr}`,
              "governed git push URL: repo-local git config unset failed",
            ),
    ).catch((error) => {
      if (error instanceof GovernedGitError) return;
      a = false;
      onDebug(
        `[runner:session] governed git: ${errorMessage(error)} (best-effort; retried at the next reconcile / cleanup)`,
      );
    });
  return a;
}
//@ chunk-hm0ce8vc.js:190510-190519 placement
var GIT_CONFIG_MISSING_EXIT_CODE = 5;
//@ chunk-hm0ce8vc.js:190519-190543 placement
/**
 * 受管 git 配置读取/清理失败时使用的错误类型（可被判为可忽略）。
 */
class GovernedGitError extends Error {}
//@ chunk-hm0ce8vc.js:190543-193231 placement
/**
 * 对每个源核对推送 URL，失败则在下次 /remote 读取时再协调。
 */
function reconcileGovernedPushUrls(e) {
  let { sessionId, wirings, onStatus, onDebug, signal } = e;
  let l;
  let u = new Set();
  let h = false;
  let p = false;
  let resolved = Promise.resolve();
  async function T(A) {
    let origin = new URL(A).origin;
    u.add(A);
    h = false;
    for (let wiring of wirings)
      await configureGovernedPushUrl(
        wiring.canonicalPath,
        `${A}/${wiring.mountPath}`,
        origin,
        wiring.upstreamUrl,
        onDebug,
        signal,
      );
    l = A;
  }
  async function y(A) {
    let origin = new URL(A).origin;
    let K = true;
    for (let wiring of wirings)
      if (!(await unsetCredentialHelper(wiring.canonicalPath, `${A}/${wiring.mountPath}`, origin, onDebug)))
        K = false;
    if (K) u.delete(A);
    return K;
  }
  async function v() {
    for (let A of [...u]) await y(A);
    l = undefined;
    return u.size === 0;
  }
  async function w() {
    let A = l;
    let G = false;
    for (let K of [...u])
      if (K !== A) {
        await y(K);
        G = true;
      }
    if (G && A !== undefined) await T(A);
  }
  function E(A, G) {
    resolved = resolved.then(G).catch((error) => {
      onStatus(
        `[runner:warn] governed git: ${A} the push URL for ${sessionId} failed: ${errorMessage(error)} \u2014 ` +
          "session pushes may be refused until the next /remote read reconciles again",
      );
    });
    return resolved;
  }
  return {
    apply: () => {
      let A = resolved.then(() => T(e.pushBaseUrl));
      resolved = A.catch(() => {});
      return A;
    },
    reconcile: (A, G) =>
      E("reconciling", async () => {
        if (p) return;
        if (G !== e.getCurrentToken()) {
          onDebug(
            `[runner:session] governed git: ignoring a /remote read for ${sessionId} made with a superseded session token (push URL reconcile follows the current token only)`,
          );
          return;
        }
        if (A !== undefined && A.git_mount_push_base_url === undefined) {
          onDebug(
            `[runner:session] governed git: a /remote read for ${sessionId} carried no git_mount_push_base_url key (server predates the field); push URL wiring left as is`,
          );
          return;
        }
        let K = isLoopbackUrl(A?.git_mount_push_base_url, onDebug);
        let any = [...u].some((oe) => oe !== l);
        if (K === l && !any) return;
        if (K !== undefined && K === l) {
          await w();
          return;
        }
        if (K === undefined) {
          let oe = l !== undefined || h;
          if (!(await v())) {
            h = oe;
            onStatus(
              `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} ` +
                "(a git config unset failed \u2014 see the debug log); it is retried at the next /remote read and at session end",
            );
            return;
          }
          h = false;
          if (oe) {
            onStatus(
              `[runner:session] governed git: push URL WITHDRAWN for ${sessionId} \u2014 the session token no longer carries ` +
                "the git-mount push capability; session git pushes now go to the remote's fetch URL",
            );
            logFeatureSad("self_hosted_governed_push_url", "capability_withdrawn");
          }
          return;
        }
        let D = l === undefined;
        await v();
        try {
          await T(K);
        } catch (error) {
          logFeatureBad("self_hosted_governed_push_url", "config_write_failed");
          throw error;
        }
        onStatus(
          D
            ? `[runner:session] governed git: push URL RESTORED for ${sessionId} \u2014 session git pushes go through the git mount again`
            : `[runner:session] governed git: push URL base changed for ${sessionId}; repo-local push wiring rewritten`,
        );
        if (D) logFeatureSad("self_hosted_governed_push_url", "capability_restored");
      }),
    cleanup: () =>
      E("removing", async () => {
        p = true;
        if (!(await v()))
          onStatus(
            `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} at session end (a git config unset failed); the residue is token-free and the next session's prep clears it`,
          );
      }),
    get active() {
      return l !== undefined;
    },
  };
}
//@ chunk-hm0ce8vc.js:193231-193915 placement
async function retryGitOperation(e) {
  let isTransient = e.isTransient ?? isRetryableRunnerError;
  let r = e.nowMs ?? Date.now;
  let s = r() + e.deadlineMs;
  let error = undefined;
  for (let j = 1; ; j++) {
    if (e.signal?.aborted)
      return {
        outcome: "failed",
        reason: "aborted",
        error,
      };
    try {
      return {
        outcome: "presented",
        config: await e.represent(),
      };
    } catch (error_2) {
      error = error_2;
      if (e.signal?.aborted)
        return {
          outcome: "failed",
          reason: "aborted",
          error: error_2,
        };
      let u = isTransient(error_2);
      e.onDebug(
        `[runner:session] governed git: re-presenting the refreshed session token on /remote failed (attempt ${j}, ${u ? "transient" : "permanent"}): ${errorMessage(error_2)}`,
      );
      if (!u)
        return {
          outcome: "failed",
          reason: "permanent",
          error: error_2,
        };
      let h = e.retryDelayMs * j;
      if (r() + h >= s)
        return {
          outcome: "failed",
          reason: "budget",
          error: error_2,
        };
      await sleep(h, e.signal, {
        unref: true,
      }).catch(() => {});
    }
  }
}
//@ chunk-hm0ce8vc.js:193915-193942 placement
var GOVERNED_REPRESENT_RETRY_MS = 15000;
var GOVERNED_REPRESENT_RETRY_STEPS = 4;
var GOVERNED_REPRESENT_RETRY_SLACK_MS = 30000;
//@ chunk-hm0ce8vc.js:193942-194195 placement
function rewriteSshUrl(e, n, r) {
  if (n.size === 0) return e;
  let match = e.match(/^https:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match || !n.has(match[1].toLowerCase())) return e;
  let [a] = match[1].split(":");
  let o = `git@${a}:${match[2]}`;
  r?.(`[runner:git] rewrote ${e} -> ${o} (--git-ssh-rewrite)`);
  return o;
}
//@ chunk-hm0ce8vc.js:194195-194450 placement
function rewriteHostUrl(url, n, r) {
  if (n.size === 0) return url;
  let match = url.match(/^https:\/\/([^/]+)\/(.+)$/);
  if (!match) return url;
  let a = n.get(match[1].toLowerCase());
  if (a === undefined) return url;
  let o = `https://${a}/${match[2]}`;
  r?.(`[runner:git] rewrote ${url} -> ${o} (--git-host-rewrite)`);
  return o;
}
//@ chunk-hm0ce8vc.js:194450-194553 placement
function isSshRemote(e) {
  if (e.startsWith("ssh://")) return true;
  return !e.includes("://") && /^[^@]+@[^:]+:.+$/.test(e);
}
//@ chunk-hm0ce8vc.js:194553-194723 placement
function gitRepositorySources(pushTargets) {
  let n = [];
  for (let r of pushTargets) {
    if (r.type !== "git_repository" || !r.git_info?.repo) continue;
    n.push({
      repo: r.git_info.repo,
      branches: r.git_info.branches ?? [],
    });
  }
  return n;
}
//@ chunk-hm0ce8vc.js:194723-194900 placement
function branchesByRepo(e) {
  let n = new Map();
  for (let r of e) {
    let s = lowercaseRepoName(r.repo);
    let a = n.get(s) ?? [];
    for (let o of r.branches ?? []) if (o && isSafeRefName(o) && !a.includes(o)) a.push(o);
    if (a.length > 0) n.set(s, a);
  }
  return n;
}
//@ chunk-hm0ce8vc.js:194900-194938 placement
/**
 * 把仓库名转小写，用于不区分大小写的比较。
 */
function lowercaseRepoName(repo) {
  return repo.toLowerCase();
}
//@ chunk-hm0ce8vc.js:194938-195214 placement
function chooseChildCwd(e, n, r, s = false) {
  let a = s ? [] : n;
  if (r) {
    let inside = resolveInside(e, r);
    if (inside !== null)
      return {
        childCwd: inside,
        addDirs: [...a, e],
      };
  }
  if (n.length === 1)
    return {
      childCwd: n[0],
      addDirs: [...a, e],
    };
  if (n.length > 1)
    return {
      childCwd: n.every((l) => l.startsWith(e + sep)) ? e : n[0],
      addDirs: [...a],
    };
  return {
    childCwd: e,
    addDirs: [],
  };
}
export {
  GOVERNED_REPRESENT_RETRY_MS,
  splitMountRouting,
  gitConfigOwnershipLabel,
  restoreHookStubs,
  ignoreLocalSettingsInGit,
  isLoopbackHttpUrl,
  formatSourcesOnHostWarning,
  formatAskpassWarning,
  governedNoProxyHosts,
  classifySourceRouting,
  branchesByRepo,
  gitRepositorySources,
  lowercaseRepoName,
  shouldSanitizeCanonical,
  sanitizeCanonicalRepo,
  runGitConfigLocal,
  setCredentialHelper,
  getRemoteOriginUrls,
  setHostCredentialHelper,
  reconcileGovernedPushUrls,
  chooseChildCwd,
  isLoopbackUrl,
  BAD_REST_MOUNT_WARNING,
  GOVERNED_REPRESENT_RETRY_STEPS,
  GOVERNED_REPRESENT_RETRY_SLACK_MS,
  retryGitOperation,
  setUrlInsteadOf,
  writeNewFile,
};
