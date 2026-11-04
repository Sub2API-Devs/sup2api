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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hm0ce8vc.js:170087-170855 placement
function pluralizeEntries(toolConfig, onStatus) {
  let asArray = (list) => (Array.isArray(list) ? list : []);
  let governedEntries = asArray(toolConfig?.governed_hosts);
  let directEntries = asArray(toolConfig?.direct_hosts);
  if (governedEntries.length === 0 && directEntries.length === 0) return;
  let droppedCount = 0;
  let normalizeList = (entries) => {
    let normalized = [];
    for (let entry of entries) {
      let host = normalizeGovernedHost(entry);
      if (host === undefined) {
        droppedCount++;
        continue;
      }
      if (!normalized.includes(host)) normalized.push(host);
    }
    return normalized;
  };
  let governedHosts = normalizeList(governedEntries);
  let direct = normalizeList(directEntries).filter((host) => !governedHosts.includes(host));
  if (droppedCount > 0)
    onStatus(
      `[runner:warn] the work item's governed-git per-host routing carried ${droppedCount} host ${plural(droppedCount, "entry", "entries")} that ${plural(droppedCount, "is", "are")} not a bare canonical hostname; ${plural(droppedCount, "it was", "they were")} ignored (a host the runner cannot validate is served directly with this machine's own git credentials). No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.`,
    );
  return {
    governed: governedHosts,
    direct,
  };
}
//@ chunk-hm0ce8vc.js:170855-170974 placement
function isGovernedHost(hostSplit, remoteHostname) {
  if (!hostSplit) return true;
  if (!remoteHostname) return false;
  let host = normalizeHost(remoteHostname);
  return isGithubDotCom(host) ? hostSplit.governed.includes(GITHUB_HOST) : hostSplit.governed.includes(host);
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
    .map((noProxyEntry) =>
      noProxyEntry
        .replace(/^\*?\./, "")
        .replace(/:\d+$/, "")
        .replace(/\.$/, ""),
    )
    .filter((host) => host !== "");
  return hostSplit.governed.filter((governedHost) =>
    filtered_2.some(
      (noProxyHost) => governedHost === noProxyHost || governedHost.endsWith(`.${noProxyHost}`),
    ),
  );
}
//@ chunk-hm0ce8vc.js:171275-172132 placement
function formatAskpassWarning(hostSplit, hasAskpass) {
  if (!hostSplit || !hasAskpass) return;
  let filtered = hostSplit.governed.filter((host) => host !== GITHUB_HOST);
  if (filtered.length === 0) return;
  return `[runner:warn] governed git: GIT_ASKPASS is set on this runner and the server governs ${plural(filtered.length, "host")} ${filtered.join(", ")}. An askpass program answers for every host. The session's own git config tells git to give up rather than ask for a credential for ${plural(filtered.length, "that host", "those hosts")}, because the session relay supplies it. Do not leave it to that alone: git config read after the session's own (a repository's, the command line, GIT_CONFIG_* variables) can switch that off, and if the program were then asked, this machine's credential would pass through Anthropic's relay. Make the program answer only for the hosts you mean (git passes it the URL in its prompt) or unset it; the same goes for core.askPass in git config and for SSH_ASKPASS.`;
}
//@ chunk-hm0ce8vc.js:172132-172992 placement
function formatSourcesOnHostWarning(hostSplit, hasPushBaseUrl, sourceHosts) {
  if (!hostSplit || !hasPushBaseUrl) return;
  let hosts = [];
  for (let sourceHost of sourceHosts) {
    if (sourceHost === undefined || isGovernedHost(hostSplit, sourceHost)) continue;
    let host = normalizeHost(sourceHost);
    if (host === "" || host.length > 255 || !HOST_LABEL_RE.test(host) || hosts.includes(host)) continue;
    hosts.push(host);
  }
  if (hosts.length === 0) return;
  return `[runner:warn] governed git: this session has ${plural(hosts.length, "a source", "sources")} on ${hosts.join(", ")}, which the server does not route through Anthropic-managed git; ${plural(hosts.length, "it is", "they are")} cloned with this machine's own git credentials. This runner was started with --use-anthropic-git-proxy, which deletes and replaces the runner account's HOME-level git config at startup and before every session, so a credential for ${plural(hosts.length, "that host", "those hosts")} must live where that flag does not reach (for example /etc/gitconfig, GIT_ASKPASS, or an SSH key with --git-ssh-rewrite). Without one, the clone of a private repository there fails.`;
}
//@ chunk-hm0ce8vc.js:172992-174354 placement
function isLoopbackHttpUrl(governedGit, getSessionToken, onStatus, directUpstreams) {
  if (!governedGit) return;
  let gitMountBaseUrl = governedGit.git_mount_base_url;
  let mountUrl;
  try {
    mountUrl = gitMountBaseUrl ? new URL(gitMountBaseUrl) : undefined;
  } catch {
    mountUrl = undefined;
  }
  let isLoopbackHttp =
    mountUrl?.protocol === "http:" &&
    (mountUrl.hostname === "localhost" || mountUrl.hostname === "127.0.0.1" || mountUrl.hostname === "[::1]");
  if (
    !mountUrl ||
    (mountUrl.protocol !== "https:" && !isLoopbackHttp) ||
    !isEnvAssignmentFree(mountUrl.href)
  ) {
    onStatus(
      "[runner:warn] the work item's governed-git configuration carried an unusable git mount URL, so this session continues with the legacy git flow. No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  let pushBaseUrl = isLoopbackUrl(governedGit.git_mount_push_base_url, onStatus);
  let restBaseUrl = isLoopbackUrl(governedGit.rest_mount_base_url, onStatus, BAD_REST_MOUNT_WARNING);
  let wantsGitConfig = governedGit.tool_config?.git_config === true;
  let replaced = mountUrl.href.replace(/\/+$/, "");
  let canKeepMountShape =
    directUpstreams !== undefined &&
    !wantsGitConfig &&
    mountUrl.username === "" &&
    mountUrl.password === "" &&
    mountUrl.href === mountUrl.origin + mountUrl.pathname &&
    replaced !== mountUrl.origin;
  if (directUpstreams !== undefined && !wantsGitConfig && !canKeepMountShape)
    onStatus(
      "[runner:warn] governed git: a direct-upstreams list is set but the git mount URL's shape cannot be kept as a session remote, so every source keeps its upstream URL as origin and no in-session fetches are routed through the git mount",
    );
  let hostSplit = pluralizeEntries(governedGit.tool_config, onStatus);
  let gitConfig = wantsGitConfig && (!hostSplit || hostSplit.governed.length > 0);
  let includesGithub = !hostSplit || hostSplit.governed.includes(GITHUB_HOST);
  let ghPathShim = governedGit.tool_config?.gh_path_shim === true && includesGithub;
  return {
    mountBaseUrl: replaced,
    toolConfig: {
      gitConfig,
      ghPathShim,
      ...(hostSplit && {
        hostSplit,
      }),
    },
    getSessionToken,
    ...(pushBaseUrl !== undefined && {
      pushBaseUrl,
    }),
    ...(canKeepMountShape && {
      directUpstreams,
    }),
    ...(restBaseUrl !== undefined &&
      includesGithub && {
        restMountBaseUrl: restBaseUrl,
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
  let ownerPath = `${lower}/${governedGitUrl.repo.toLowerCase()}`;
  return directUpstreams.some((candidate) => candidate === lower || candidate === ownerPath);
}
//@ chunk-hm0ce8vc.js:174814-174919 placement
function splitMountRouting(governedRepo, gitProxyRepo, directUpstreams, hasDirectUpstreams) {
  let throughMount = new Set();
  let keptDirect = new Set();
  return {
    throughMount: [...throughMount].sort(),
    keptDirect: [...keptDirect].sort(),
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
  gitProxyConfig,
  mountRouting,
  onStatus,
) {
  let sshRewriteHosts = new Set(gitSshRewriteHosts.map((host) => host.toLowerCase()));
  let unmountedHosts = new Set();
  let hostRewrites = new Map(gitHostRewrites.map(([host, replacement]) => [host.toLowerCase(), replacement]));
  let mappedSources = [];
  for (let source of sources) {
    if (source.type !== "git_repository" || !source.url) continue;
    let remoteHostname = getRemoteHostname(source.url);
    let hostSplit = mountRouting?.toolConfig.hostSplit;
    let isGoverned = isGovernedHost(hostSplit, remoteHostname);
    if (mountRouting && hostSplit && !isGoverned) {
      let isDirectHost =
        remoteHostname !== undefined && hostSplit.direct.includes(normalizeHost(remoteHostname));
      onDebug?.(
        isDirectHost
          ? `[runner:git] governed git: source ${source.url} is on a direct-class host (server per-host routing); customer-managed handling for this source`
          : `[runner:git] governed git: source ${source.url} is on a host not named in the ` +
              "server's per-host routing (unlisted); treating it as direct \u2014 " +
              "customer-managed handling for this source",
      );
    }
    if (mountRouting && isGoverned) {
      let governedGitUrl = buildGovernedGitUrl(source.url, mountRouting.mountBaseUrl, onDebug);
      if (governedGitUrl) {
        let pushUrl = formatNoPushUrlWarning(governedGitUrl, mountRouting.pushBaseUrl, onDebug);
        let fetchViaMount =
          mountRouting.directUpstreams !== undefined &&
          !matchesRepoList(governedGitUrl, mountRouting.directUpstreams);
        mappedSources.push({
          type: "github",
          repo: `${governedGitUrl.owner}/${governedGitUrl.repo}`,
          ref: source.revision,
          url: governedGitUrl.url,
          getAuthToken: mountRouting.getSessionToken,
          governedMount: true,
          upstreamUrl: governedGitUrl.upstreamUrl,
          ...(pushUrl !== undefined && {
            governedPushUrl: pushUrl,
          }),
          ...(fetchViaMount && {
            fetchViaMount,
          }),
        });
        continue;
      }
      onDebug?.(
        `[runner:git] governed git: source ${source.url} is not mount-routable; using legacy handling for this source`,
      );
      if (hostSplit && remoteHostname !== undefined) {
        let host = normalizeHost(remoteHostname);
        if (!unmountedHosts.has(host)) {
          unmountedHosts.add(host);
          onStatus?.(
            `[runner:warn] governed git: a source on governed host ${host} could not be routed through the git mount (its URL is not in a form the mount serves, for example a nonstandard port). It takes this machine's own git path instead, so it needs this machine's own credentials for that host although the host is listed as governed. Use the https://host/owner/repo form on the standard port, or keep a credential on this machine that answers only for that URL (for example one scoped to its port, or an SSH key).`,
          );
        }
      }
    }
    let gitProxyUrl = buildGitProxyUrl(source.url, gitProxyConfig, onDebug);
    if (gitProxyUrl) {
      mappedSources.push({
        type: "github",
        repo: `${gitProxyUrl.owner}/${gitProxyUrl.repo}`,
        ref: source.revision,
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
    let rewrittenHostUrl = rewriteHostUrl(source.url, hostRewrites, onDebug);
    let rewrittenUrl = rewriteSshUrl(rewrittenHostUrl, sshRewriteHosts, onDebug);
    let remoteRepoPath = getRemoteRepoPath(rewrittenUrl);
    if (!remoteRepoPath)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mapSources: cannot extract repo slug from source URL '${source.url}' \u2014 not scp-form (user@host:path) and not a parseable URL`,
        "mapSources: cannot extract repo slug from source URL",
      );
    mappedSources.push({
      type: isSshRemote(rewrittenUrl) ? "github-ssh" : "github",
      repo: remoteRepoPath,
      ref: source.revision,
      url: rewrittenUrl,
    });
  }
  return mappedSources;
}
//@ chunk-hm0ce8vc.js:177235-177897 placement
/**
 * 由源 URL 解析 owner/repo 生成 session_ingress git 代理地址。
 */
function buildGitProxyUrl(url, gitProxyConfig, onDebug) {
  if (!gitProxyConfig) return;
  let match = url.match(/^https:\/\/[^/@]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (url.startsWith("https://"))
      onDebug?.(
        `[runner:git] git proxy: could not parse owner/repo from ${url}; falling back to customer git auth for this source`,
      );
    return;
  }
  let owner = match[1];
  let repo = match[2];
  if (!REPO_NAME_RE.test(owner) || !REPO_NAME_RE.test(repo)) {
    onDebug?.(
      `[runner:git] git proxy: rejecting unsafe owner/repo in ${url}; falling back to customer git auth for this source`,
    );
    return;
  }
  let url_2 = `${gitProxyConfig.apiBaseUrl.replace(/\/+$/, "")}/v1/session_ingress/session/${gitProxyConfig.sessionId}/git_proxy/${owner}/${repo}.git`;
  onDebug?.(`[runner:git] rewrote ${url} -> git_proxy/${owner}/${repo}.git (--use-anthropic-git-proxy)`);
  return {
    url: url_2,
    owner,
    repo,
  };
}
//@ chunk-hm0ce8vc.js:177897-178655 placement
function buildGovernedGitUrl(url, mountBaseUrl, onDebug) {
  let match = url.match(/^https:\/\/([^/@:]+)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (url.startsWith("https://"))
      onDebug?.(`[runner:git] governed git: could not parse host/owner/repo from ${url}`);
    return;
  }
  let lower = match[1].toLowerCase();
  let owner = match[2];
  let repo = match[3];
  if (!/^(?!\.{1,2}$)[a-z0-9.-]+$/.test(lower) || lower.length > 255) {
    onDebug?.(
      `[runner:git] governed git: rejecting unsafe host in ${url}; falling back to legacy handling for this source`,
    );
    return;
  }
  if (!REPO_NAME_RE.test(owner) || !REPO_NAME_RE.test(repo)) {
    onDebug?.(
      `[runner:git] governed git: rejecting unsafe owner/repo in ${url}; falling back to legacy handling for this source`,
    );
    return;
  }
  let url_2 = `${mountBaseUrl}/${lower}/${owner}/${repo}`;
  onDebug?.(`[runner:git] rewrote ${url} -> git mount /${lower}/${owner}/${repo} (governed git)`);
  return {
    url: url_2,
    host: lower,
    owner,
    repo,
    upstreamUrl: `https://${lower}/${owner}/${repo}`,
  };
}
//@ chunk-hm0ce8vc.js:178655-178939 placement
function formatNoPushUrlWarning(governedGitUrl, pushBaseUrl, onDebug) {
  if (pushBaseUrl === undefined) return;
  if (!isGithubDotCom(governedGitUrl.host)) {
    onDebug?.(
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
function gitConfigOwnershipLabel(spawnedSessionIds, sessionId) {
  if (spawnedSessionIds === undefined || spawnedSessionIds.size > (spawnedSessionIds.has(sessionId) ? 1 : 0))
    return "another";
  return spawnedSessionIds.size > 0 ? "own" : "none";
}
//@ chunk-hm0ce8vc.js:179038-179174 placement
function getDrainGraceMs(role, otherRole) {
  return (
    antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM === true &&
    envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") === 0 &&
    (role === "none" || role === otherRole)
  );
}
//@ chunk-hm0ce8vc.js:179174-179649 placement
function shouldSanitizeCanonical(onStatus, sessionId, role) {
  if (!antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM) return true;
  if (!getDrainGraceMs(role, "own")) {
    let graceMs = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS");
    onStatus(
      `[runner:warn] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM ignored: drain-grace is ${graceMs}ms (> 0), so a prior session ` +
        "could have written to the canonical \u2014 sanitizing anyway",
    );
    return true;
  }
  onStatus(
    "[runner:session] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM \u2014 skipping " +
      `sanitizeCanonicalGitState for ${sessionId} (trusted one-shot prewarm)`,
  );
  return false;
}
//@ chunk-hm0ce8vc.js:179649-179758 placement
var REPO_SANITIZE_ENTRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hm0ce8vc.js:179649", () => {
  REPO_SANITIZE_ENTRIES = new Map([
    ["objects", "dir"],
    ["refs", "dir"],
    ["packed-refs", "file"],
    ["HEAD", "file"],
    ["shallow", "file"],
  ]);
});
//@ chunk-hm0ce8vc.js:179758-182117 placement
/**
 * 准备前清洗 canonical 仓库（objects、refs、packed-refs 等）。
 */
async function sanitizeCanonicalRepo(canonicalPath, onDebug, originUrl) {
  let gitDir = join(canonicalPath, ".git");
  let gitDirStats;
  try {
    gitDirStats = await lstat(gitDir);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${canonicalPath} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
  if (!gitDirStats.isDirectory()) {
    await rm(gitDir, {
      force: true,
    });
    onDebug(
      `[runner:session] sanitized canonical at ${canonicalPath}: .git was not a directory (gitlink/symlink) \u2014 removed, will fresh-init`,
    );
    return;
  }
  let replaced = originUrl?.replace(/^(https?:\/\/)[^/@]*@/, "$1");
  if (replaced && /[\x00-\x1f]/.test(replaced))
    throw Error("git-proxy: sanitize refused \u2014 control char in origin URL");
  let configText =
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
    let entries = await readdir(gitDir);
    for (let entryName of entries) {
      let expectedKind = REPO_SANITIZE_ENTRIES.get(entryName);
      if (expectedKind) {
        let entryStats = await lstat(join(gitDir, entryName)).catch(() => {
          return;
        });
        if (
          entryStats &&
          !entryStats.isSymbolicLink() &&
          (expectedKind === "dir" ? entryStats.isDirectory() : entryStats.isFile())
        )
          continue;
        onDebug(
          `[runner:session] sanitize: kept entry .git/${entryName} has unexpected type \u2014 removing`,
        );
      }
      await rm(join(gitDir, entryName), {
        recursive: true,
        force: true,
      });
    }
    try {
      await rm(join(gitDir, "refs", "heads"));
      onDebug(
        "[runner:session] sanitize: .git/refs/heads was not a directory \u2014 removed (a reftable repository leaves a placeholder file there)",
      );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ERR_FS_EISDIR") throw error;
    }
    await removeSymlinksIn(join(gitDir, "refs"), true);
    await removeSymlinksIn(join(gitDir, "objects"), false);
    await rm(join(gitDir, "objects", "info"), {
      recursive: true,
      force: true,
    });
    await rm(join(gitDir, "objects", "pack", "multi-pack-index"), {
      recursive: true,
      force: true,
    });
    let headPath = join(gitDir, "HEAD");
    let headStats = await lstat(headPath).catch(() => {
      return;
    });
    let headText =
      headStats && headStats.size <= 1024 ? await readFile(headPath, "utf-8").catch(() => "") : "";
    let match = /^ref: (refs\/[A-Za-z0-9._/-]+)\n?$/.exec(headText);
    let isValidRef =
      match &&
      match[1]
        .split("/")
        .every(
          (segment) =>
            segment.length > 0 &&
            !segment.startsWith(".") &&
            !segment.endsWith(".") &&
            !segment.endsWith(".lock") &&
            !segment.includes(".."),
        );
    if (/^ref: refs\/heads\/\.invalid\n?$/.test(headText)) {
      await rm(headPath, {
        force: true,
      });
      await writeFile(
        headPath,
        `ref: refs/heads/main
`,
        {
          flag: "wx",
          mode: 420,
        },
      );
    } else if (!isValidRef && !/^[0-9a-f]{40}([0-9a-f]{24})?\n?$/.test(headText))
      await rm(headPath, {
        force: true,
      });
    await writeFile(join(gitDir, "config"), configText, {
      mode: 420,
    });
    onDebug(
      `[runner:session] sanitized canonical .git/ at ${canonicalPath} (git-proxy cross-session isolation)`,
    );
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${canonicalPath} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
}
//@ chunk-hm0ce8vc.js:182117-182441 placement
/**
 * 删除目录中的符号链接（可递归子目录）。
 */
async function removeSymlinksIn(dirPath, recurse) {
  let names;
  try {
    names = await readdir(dirPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  for (let entryName of names) {
    let entryPath = join(dirPath, entryName);
    let entryStats;
    try {
      entryStats = await lstat(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      throw error;
    }
    if (entryStats.isSymbolicLink()) {
      await rm(entryPath, {
        force: true,
      });
      continue;
    }
    if (recurse && entryStats.isDirectory()) await removeSymlinksIn(entryPath, true);
  }
}
//@ chunk-hm0ce8vc.js:182441-182558 placement
async function writeNewFile(path, content, mode) {
  let handle = await open(path, "wx", mode);
  try {
    await handle.writeFile(content);
    await handle.chmod(mode);
  } finally {
    await handle.close();
  }
}
//@ chunk-hm0ce8vc.js:182558-182687 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
async function rewriteFileWithMode(filePath, content, mode) {
  await rm(filePath, {
    recursive: true,
    force: true,
  });
  await mkdir(dirname(filePath), {
    recursive: true,
  });
  await writeFile(filePath, content, {
    mode,
  });
  await chmod(filePath, mode);
}
//@ chunk-hm0ce8vc.js:182687-183435 placement
/**
 * 清空并重写会话间隔离用的 git 钩子桩。
 */
async function restoreHookStubs(configureGitHookStubs, configureGitSigningArtifacts, onDebug) {
  if (configureGitHookStubs.length === 0) return;
  let hooksDir = dirname(configureGitHookStubs[0].path);
  let runnerDir = dirname(hooksDir);
  try {
    let runnerStats = await lstat(runnerDir).catch(() => {
      return;
    });
    if (!runnerStats)
      await mkdir(runnerDir, {
        recursive: true,
      });
    else if (!runnerStats.isDirectory() || runnerStats.isSymbolicLink()) {
      await rm(runnerDir, {
        recursive: true,
        force: true,
      });
      await mkdir(runnerDir, {
        recursive: true,
      });
    }
    if (configureGitSigningArtifacts)
      for (let artifact of configureGitSigningArtifacts)
        await rewriteFileWithMode(artifact.path, artifact.content, artifact.mode);
    await rm(hooksDir, {
      recursive: true,
      force: true,
    });
    await mkdir(hooksDir, {
      recursive: true,
    });
    for (let stub of configureGitHookStubs) await rewriteFileWithMode(stub.path, stub.content, 493);
    onDebug(
      `[runner:session] clean-slated ${hooksDir} and rewrote ${configureGitHookStubs.length} hook stubs (cross-session isolation)`,
    );
  } catch (error) {
    throw tagFailureStage(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: could not restore hook stubs under ${hooksDir} \u2014 ${error instanceof Error ? error.message : String(error)}`,
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
async function ignoreLocalSettingsInGit(options, onDebug, onStatus) {
  try {
    await rm(dirname(options.xdgConfigPath), {
      recursive: true,
      force: true,
    });
    let ignoreDirs = [dirname(options.xdgConfigPath)];
    let homeExtraDir = options.homeGitconfigPath && extraGitDir(dirname(options.homeGitconfigPath));
    if (homeExtraDir && homeExtraDir !== dirname(options.xdgConfigPath)) {
      await rm(homeExtraDir, {
        recursive: true,
        force: true,
      });
      ignoreDirs.push(homeExtraDir);
    }
    for (let ignoreDir of ignoreDirs) {
      let ignoreFile = join(ignoreDir, "ignore");
      await rewriteFileWithMode(
        ignoreFile,
        `**/${getRelativeSettingsFilePathForSource("localSettings").replaceAll("\\", "/")}
`,
        420,
      ).catch((error) =>
        onStatus(
          `[runner:warn] could not write ${ignoreFile}, so git may not ignore .claude/settings.local.json in this session and "git add -A" may commit it: ${errorMessage(error)}`,
        ),
      );
    }
    if (options.homeGitconfigPath && options.homeGitconfigPath !== options.globalConfigPath)
      await rm(options.homeGitconfigPath, {
        recursive: true,
        force: true,
      });
    await rewriteFileWithMode(options.globalConfigPath, options.globalConfigSnapshot, 420);
    if (options.credHelper) {
      let helperDir = dirname(options.credHelper.path);
      let helperDirStats = await lstat(helperDir).catch(() => {
        return;
      });
      if (!helperDirStats)
        await mkdir(helperDir, {
          recursive: true,
        });
      else if (!helperDirStats.isDirectory() || helperDirStats.isSymbolicLink()) {
        await rm(helperDir, {
          recursive: true,
          force: true,
        });
        await mkdir(helperDir, {
          recursive: true,
        });
      }
      if (options.signingArtifacts)
        for (let signingArtifact of options.signingArtifacts)
          await rewriteFileWithMode(signingArtifact.path, signingArtifact.content, signingArtifact.mode);
      await rewriteFileWithMode(options.credHelper.path, options.credHelper.content, 448);
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
async function runGitConfigLocal(repoPath, onDebug, resetFirst) {
  if (resetFirst)
    await rm(join(repoPath, ".git", "config.lock"), {
      force: true,
    }).catch(() => {});
  await new Promise((resolve) => {
    let child = spawn(
      "git",
      ["-C", repoPath, "config", "--local", "--unset-all", "credential.helper", "^$"],
      {
        cwd: undefined,
        stdio: "ignore",
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
      },
    );
    let timer = setTimeout((spawned) => spawned.kill("SIGKILL"), SIGKILL_DELAY_MS, child);
    let onExit = (exitCode) => {
      clearTimeout(timer);
      if (exitCode !== 0 && exitCode !== 5 && exitCode !== null)
        onDebug(`[runner:session] stale git-proxy reset sweep in ${repoPath} exited ${exitCode}`);
      resolve();
    };
    child.on("close", onExit);
    child.on("error", () => onExit(null));
  });
}
//@ chunk-hm0ce8vc.js:185317-185874 placement
/**
 * 配置会话凭据助手（使用 CLAUDE_CODE_SESSION_ACCESS_TOKEN）。
 */
async function setCredentialHelper(repoPath, remoteUrl, onDebug, signal) {
  let origin = new URL(remoteUrl).origin;
  let configEntries = [
    [["credential.helper", ""], ["--replace-all"]],
    [[`credential.${origin}.helper`, ""], ["--replace-all"]],
    [
      [`credential.${origin}.helper`, anonCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN")],
      ["--add"],
    ],
  ];
  for (let [[configKey, configValue], flags] of configEntries)
    await runGitWithAbort(
      ["-C", repoPath, "config", "--local", ...flags, configKey, configValue],
      (failure) =>
        tagFailureStage(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `git proxy: 'git config ${configKey}' in ${repoPath} exited ${failure.code}: ${failure.stderr}`,
            "git proxy: repo-local git config write failed",
          ),
          "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED",
        ),
      signal,
    );
  onDebug(`[runner:session] git proxy: wired repo-local credential helper for ${origin} in ${repoPath}`);
}
//@ chunk-hm0ce8vc.js:185874-186523 placement
async function runGitWithAbort(
  args,
  onFailure,
  signal,
  spawnFn = spawn,
  timeoutMs = SIGKILL_DELAY_MS,
  onStdout,
) {
  await new Promise((resolve, reject) => {
    let settled = false;
    let stderrText = "";
    let finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    let child = spawnFn("git", args, {
      cwd: undefined,
      stdio: ["ignore", onStdout ? "pipe" : "ignore", "pipe"],
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    child.stdout?.on("data", (chunk) => onStdout?.(String(chunk)));
    child.stderr?.on("data", (chunk) => (stderrText += String(chunk)));
    let onAbort = () => {
      child.kill("SIGKILL");
      finish(
        onFailure({
          code: null,
          stderr: stderrText.trim(),
        }),
      );
    };
    let timer = setTimeout(
      (spawned, finish) => {
        spawned.kill("SIGKILL");
        finish(
          onFailure({
            code: null,
            stderr: stderrText.trim(),
          }),
        );
      },
      timeoutMs,
      child,
      finish,
    );
    if (signal?.aborted) onAbort();
    else
      signal?.addEventListener("abort", onAbort, {
        once: true,
      });
    child.on("close", (exitCode) =>
      finish(
        exitCode === 0
          ? undefined
          : onFailure({
              code: exitCode,
              stderr: stderrText.trim(),
            }),
      ),
    );
    child.on("error", (error) => finish(error));
  });
}
//@ chunk-hm0ce8vc.js:186523-187108 placement
async function getRemoteOriginUrls(repoPath, upstreamUrl, onDebug, signal, spawnFn, onStdout) {
  let stdoutText = "";
  let failureInfo = {
    code: null,
  };
  let succeeded = await runGitWithAbort(
    ["-C", repoPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--get-all", "remote.origin.url"],
    (failure) => {
      failureInfo.code = failure.code;
      return Error("git config --get-all remote.origin.url failed");
    },
    signal,
    spawnFn,
    onStdout,
    (chunk) => {
      stdoutText += chunk;
    },
  ).then(
    () => true,
    () => false,
  );
  if (!succeeded && failureInfo.code !== 1) return "read_failed";
  let filtered = stdoutText
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (succeeded && filtered.length === 1 && filtered[0] === upstreamUrl) return "ok";
  onDebug(
    `[runner:session] governed git: remote.origin.url in ${repoPath} is not the upstream URL after prep; the runner changed nothing here; the next preparation of this repository rewrites origin or fails`,
  );
  return "not_upstream";
}
//@ chunk-hm0ce8vc.js:187108-187741 placement
async function setHostCredentialHelper(repoPath, url, upstreamUrl, mountBaseUrl, onDebug, signal) {
  let helperKey = `credential.${mountBaseUrl}.helper`;
  let dottedUrl = upstreamUrl.endsWith(".git") ? upstreamUrl.slice(0, -4) : `${upstreamUrl}.git`;
  let configEntries = [
    [helperKey, "", "--replace-all"],
    [helperKey, tokenCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN"), "--add"],
    [`url.${url}.insteadOf`, upstreamUrl, "--replace-all"],
    [`url.${url}.insteadOf`, dottedUrl, "--add"],
  ];
  for (let [configKey, configValue, flags] of configEntries)
    await runGitWithAbort(
      ["-C", repoPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", flags, configKey, configValue],
      (failure) =>
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `governed git mount read: 'git config ${configKey}' in ${repoPath} exited ${failure.code}: ${failure.stderr}`,
          "governed git mount read: repo-local git config write failed",
        ),
      signal,
    );
  onDebug(
    `[runner:session] governed git: fetches of ${upstreamUrl} rewritten to the mount (${url}) with a session-token credential helper scoped to ${mountBaseUrl} in ${repoPath}`,
  );
}
//@ chunk-hm0ce8vc.js:187741-188276 placement
async function setUrlInsteadOf(path, mountUrl, mountBaseUrl, onDebug, deadlineMs = SETUP_STEP_DEADLINE_MS) {
  let deadline = Date.now() + deadlineMs;
  for (let configKey of [`url.${mountUrl}.insteadOf`, `credential.${mountBaseUrl}.helper`])
    if (
      !(await runGitWithAbort(
        ["-C", path, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", configKey],
        (failure) =>
          failure.code === GIT_CONFIG_MISSING_EXIT_CODE
            ? new GovernedGitError()
            : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `governed git mount read: 'git config --unset-all ${configKey}' in ${path} exited ${failure.code}: ${failure.stderr}`,
                "governed git mount read: repo-local git config cleanup failed",
              ),
        undefined,
        undefined,
        Math.max(1, deadline - Date.now()),
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
function isLoopbackUrl(rawUrl, onDebug, unusableMessage) {
  let trimmed = rawUrl?.trim() ?? "";
  if (trimmed === "") return;
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    parsedUrl = undefined;
  }
  let isLoopbackHttp =
    parsedUrl?.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "[::1]");
  let isUnusable =
    parsedUrl !== undefined &&
    (parsedUrl.username !== "" ||
      parsedUrl.password !== "" ||
      parsedUrl.href !== parsedUrl.origin + parsedUrl.pathname ||
      !isEnvAssignmentFree(parsedUrl.href));
  if (!parsedUrl || (parsedUrl.protocol !== "https:" && !isLoopbackHttp) || isUnusable) {
    onDebug(
      unusableMessage ??
        "[runner:warn] the work item's governed-git configuration carried an unusable git mount push URL, so this session's git pushes keep going to the upstream remote instead of the git mount (the clone through the mount is unaffected). No operator action is needed; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  return parsedUrl.href.replace(/\/+$/, "");
}
//@ chunk-hm0ce8vc.js:189001-189986 placement
/**
 * 设置/清除 remote.origin.pushurl 让推送走受管路径。
 */
async function configureGovernedPushUrl(canonicalPath, pushBaseUrl, origin, upstreamUrl, onDebug, signal) {
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
    (failure) =>
      failure.code === GIT_CONFIG_MISSING_EXIT_CODE
        ? new GovernedGitError()
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `governed git push URL: 'git config --unset-all remote.origin.pushurl' in ${canonicalPath} exited ${failure.code}: ${failure.stderr}`,
            "governed git push URL: repo-local git config unset failed",
          ),
    signal,
  ).catch((error) => {
    if (!(error instanceof GovernedGitError)) throw error;
  });
  let dottedUrl = upstreamUrl.endsWith(".git") ? upstreamUrl.slice(0, -4) : `${upstreamUrl}.git`;
  let configEntries = [
    [[pushInsteadOfKey(pushBaseUrl), upstreamUrl], ["--replace-all"]],
    [[pushInsteadOfKey(pushBaseUrl), dottedUrl], ["--add"]],
    [[`credential.${origin}.helper`, ""], ["--replace-all"]],
    [
      [`credential.${origin}.helper`, tokenCredentialHelperArgs("CLAUDE_CODE_SESSION_ACCESS_TOKEN")],
      ["--add"],
    ],
  ];
  for (let [[configKey, configValue], flags] of configEntries)
    await runGitWithAbort(
      ["-C", canonicalPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", ...flags, configKey, configValue],
      (failure) =>
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `governed git push URL: 'git config ${configKey}' in ${canonicalPath} exited ${failure.code}: ${failure.stderr}`,
          "governed git push URL: repo-local git config write failed",
        ),
      signal,
    );
  onDebug(
    `[runner:session] governed git: pushes to ${upstreamUrl} rewritten to ${pushBaseUrl} (url.<pushUrl>.pushInsteadOf) with a session-token credential helper scoped to ${origin} in ${canonicalPath}`,
  );
}
//@ chunk-hm0ce8vc.js:189986-190032 placement
/**
 * 拼出 url.<url>.pushInsteadOf 配置键名。
 */
function pushInsteadOfKey(pushBaseUrl) {
  return `url.${pushBaseUrl}.pushInsteadOf`;
}
//@ chunk-hm0ce8vc.js:190032-190510 placement
async function unsetCredentialHelper(canonicalPath, pushBaseUrl, origin, onDebug) {
  let allUnset = true;
  for (let configKey of [pushInsteadOfKey(pushBaseUrl), `credential.${origin}.helper`])
    await runGitWithAbort(
      ["-C", canonicalPath, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", configKey],
      (failure) =>
        failure.code === GIT_CONFIG_MISSING_EXIT_CODE
          ? new GovernedGitError()
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `governed git push URL: 'git config --unset-all ${configKey}' in ${canonicalPath} exited ${failure.code}: ${failure.stderr}`,
              "governed git push URL: repo-local git config unset failed",
            ),
    ).catch((error) => {
      if (error instanceof GovernedGitError) return;
      allUnset = false;
      onDebug(
        `[runner:session] governed git: ${errorMessage(error)} (best-effort; retried at the next reconcile / cleanup)`,
      );
    });
  return allUnset;
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
function reconcileGovernedPushUrls(options) {
  let { sessionId, wirings, onStatus, onDebug, signal } = options;
  let activeBase;
  let activeBases = new Set();
  let withdrawnSeen = false;
  let closed = false;
  let resolved = Promise.resolve();
  async function applyPushBase(baseUrl) {
    let origin = new URL(baseUrl).origin;
    activeBases.add(baseUrl);
    withdrawnSeen = false;
    for (let wiring of wirings)
      await configureGovernedPushUrl(
        wiring.canonicalPath,
        `${baseUrl}/${wiring.mountPath}`,
        origin,
        wiring.upstreamUrl,
        onDebug,
        signal,
      );
    activeBase = baseUrl;
  }
  async function removeBase(baseUrl) {
    let origin = new URL(baseUrl).origin;
    let removedCleanly = true;
    for (let wiring of wirings)
      if (
        !(await unsetCredentialHelper(
          wiring.canonicalPath,
          `${baseUrl}/${wiring.mountPath}`,
          origin,
          onDebug,
        ))
      )
        removedCleanly = false;
    if (removedCleanly) activeBases.delete(baseUrl);
    return removedCleanly;
  }
  async function removeAll() {
    for (let baseUrl of [...activeBases]) await removeBase(baseUrl);
    activeBase = undefined;
    return activeBases.size === 0;
  }
  async function removeOthers() {
    let keepBase = activeBase;
    let removedAny = false;
    for (let baseUrl of [...activeBases])
      if (baseUrl !== keepBase) {
        await removeBase(baseUrl);
        removedAny = true;
      }
    if (removedAny && keepBase !== undefined) await applyPushBase(keepBase);
  }
  function queueTask(label, task) {
    resolved = resolved.then(task).catch((error) => {
      onStatus(
        `[runner:warn] governed git: ${label} the push URL for ${sessionId} failed: ${errorMessage(error)} \u2014 ` +
          "session pushes may be refused until the next /remote read reconciles again",
      );
    });
    return resolved;
  }
  return {
    apply: () => {
      let applyPromise = resolved.then(() => applyPushBase(options.pushBaseUrl));
      resolved = applyPromise.catch(() => {});
      return applyPromise;
    },
    reconcile: (remoteState, token) =>
      queueTask("reconciling", async () => {
        if (closed) return;
        if (token !== options.getCurrentToken()) {
          onDebug(
            `[runner:session] governed git: ignoring a /remote read for ${sessionId} made with a superseded session token (push URL reconcile follows the current token only)`,
          );
          return;
        }
        if (remoteState !== undefined && remoteState.git_mount_push_base_url === undefined) {
          onDebug(
            `[runner:session] governed git: a /remote read for ${sessionId} carried no git_mount_push_base_url key (server predates the field); push URL wiring left as is`,
          );
          return;
        }
        let pushBaseUrl = isLoopbackUrl(remoteState?.git_mount_push_base_url, onDebug);
        let any = [...activeBases].some((baseUrl) => baseUrl !== activeBase);
        if (pushBaseUrl === activeBase && !any) return;
        if (pushBaseUrl !== undefined && pushBaseUrl === activeBase) {
          await removeOthers();
          return;
        }
        if (pushBaseUrl === undefined) {
          let hadWiring = activeBase !== undefined || withdrawnSeen;
          if (!(await removeAll())) {
            withdrawnSeen = hadWiring;
            onStatus(
              `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} ` +
                "(a git config unset failed \u2014 see the debug log); it is retried at the next /remote read and at session end",
            );
            return;
          }
          withdrawnSeen = false;
          if (hadWiring) {
            onStatus(
              `[runner:session] governed git: push URL WITHDRAWN for ${sessionId} \u2014 the session token no longer carries ` +
                "the git-mount push capability; session git pushes now go to the remote's fetch URL",
            );
            logFeatureSad("self_hosted_governed_push_url", "capability_withdrawn");
          }
          return;
        }
        let wasAbsent = activeBase === undefined;
        await removeAll();
        try {
          await applyPushBase(pushBaseUrl);
        } catch (error) {
          logFeatureBad("self_hosted_governed_push_url", "config_write_failed");
          throw error;
        }
        onStatus(
          wasAbsent
            ? `[runner:session] governed git: push URL RESTORED for ${sessionId} \u2014 session git pushes go through the git mount again`
            : `[runner:session] governed git: push URL base changed for ${sessionId}; repo-local push wiring rewritten`,
        );
        if (wasAbsent) logFeatureSad("self_hosted_governed_push_url", "capability_restored");
      }),
    cleanup: () =>
      queueTask("removing", async () => {
        closed = true;
        if (!(await removeAll()))
          onStatus(
            `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} at session end (a git config unset failed); the residue is token-free and the next session's prep clears it`,
          );
      }),
    get active() {
      return activeBase !== undefined;
    },
  };
}
//@ chunk-hm0ce8vc.js:193231-193915 placement
async function retryGitOperation(options) {
  let isTransient = options.isTransient ?? isRetryableRunnerError;
  let now = options.nowMs ?? Date.now;
  let deadline = now() + options.deadlineMs;
  let error = undefined;
  for (let j = 1; ; j++) {
    if (options.signal?.aborted)
      return {
        outcome: "failed",
        reason: "aborted",
        error,
      };
    try {
      return {
        outcome: "presented",
        config: await options.represent(),
      };
    } catch (error_2) {
      error = error_2;
      if (options.signal?.aborted)
        return {
          outcome: "failed",
          reason: "aborted",
          error: error_2,
        };
      let isTransientError = isTransient(error_2);
      options.onDebug(
        `[runner:session] governed git: re-presenting the refreshed session token on /remote failed (attempt ${j}, ${isTransientError ? "transient" : "permanent"}): ${errorMessage(error_2)}`,
      );
      if (!isTransientError)
        return {
          outcome: "failed",
          reason: "permanent",
          error: error_2,
        };
      let delayMs = options.retryDelayMs * j;
      if (now() + delayMs >= deadline)
        return {
          outcome: "failed",
          reason: "budget",
          error: error_2,
        };
      await sleep(delayMs, options.signal, {
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
function rewriteSshUrl(url, sshHosts, onDebug) {
  if (sshHosts.size === 0) return url;
  let match = url.match(/^https:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match || !sshHosts.has(match[1].toLowerCase())) return url;
  let [host] = match[1].split(":");
  let sshUrl = `git@${host}:${match[2]}`;
  onDebug?.(`[runner:git] rewrote ${url} -> ${sshUrl} (--git-ssh-rewrite)`);
  return sshUrl;
}
//@ chunk-hm0ce8vc.js:194195-194450 placement
function rewriteHostUrl(url, hostRewrites, onDebug) {
  if (hostRewrites.size === 0) return url;
  let match = url.match(/^https:\/\/([^/]+)\/(.+)$/);
  if (!match) return url;
  let replacement = hostRewrites.get(match[1].toLowerCase());
  if (replacement === undefined) return url;
  let rewrittenUrl = `https://${replacement}/${match[2]}`;
  onDebug?.(`[runner:git] rewrote ${url} -> ${rewrittenUrl} (--git-host-rewrite)`);
  return rewrittenUrl;
}
//@ chunk-hm0ce8vc.js:194450-194553 placement
function isSshRemote(url) {
  if (url.startsWith("ssh://")) return true;
  return !url.includes("://") && /^[^@]+@[^:]+:.+$/.test(url);
}
//@ chunk-hm0ce8vc.js:194553-194723 placement
function gitRepositorySources(pushTargets) {
  let results = [];
  for (let pushTarget of pushTargets) {
    if (pushTarget.type !== "git_repository" || !pushTarget.git_info?.repo) continue;
    results.push({
      repo: pushTarget.git_info.repo,
      branches: pushTarget.git_info.branches ?? [],
    });
  }
  return results;
}
//@ chunk-hm0ce8vc.js:194723-194900 placement
function branchesByRepo(sources) {
  let byRepo = new Map();
  for (let source of sources) {
    let repoName = lowercaseRepoName(source.repo);
    let branches = byRepo.get(repoName) ?? [];
    for (let branch of source.branches ?? [])
      if (branch && isSafeRefName(branch) && !branches.includes(branch)) branches.push(branch);
    if (branches.length > 0) byRepo.set(repoName, branches);
  }
  return byRepo;
}
//@ chunk-hm0ce8vc.js:194900-194938 placement
/**
 * 把仓库名转小写，用于不区分大小写的比较。
 */
function lowercaseRepoName(repo) {
  return repo.toLowerCase();
}
//@ chunk-hm0ce8vc.js:194938-195214 placement
function chooseChildCwd(baseDir, sourceDirs, preferredDir, isSessionHook = false) {
  let addDirs = isSessionHook ? [] : sourceDirs;
  if (preferredDir) {
    let inside = resolveInside(baseDir, preferredDir);
    if (inside !== null)
      return {
        childCwd: inside,
        addDirs: [...addDirs, baseDir],
      };
  }
  if (sourceDirs.length === 1)
    return {
      childCwd: sourceDirs[0],
      addDirs: [...addDirs, baseDir],
    };
  if (sourceDirs.length > 1)
    return {
      childCwd: sourceDirs.every((sourceDir) => sourceDir.startsWith(baseDir + sep))
        ? baseDir
        : sourceDirs[0],
      addDirs: [...addDirs],
    };
  return {
    childCwd: baseDir,
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
