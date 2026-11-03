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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  sep,
  sep as sep_2,
  sep as sep_3,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  readdir,
  readdir as readdir_2,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  writeFile,
  writeFile as writeFile_2,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  chmod,
} from "fs/promises";
import { spawn } from "child_process";
import { normalizeGovernedHost } from "./handleSession.js";
import { plural } from "../../utils/stringUtils.js";
import { normalizeHost, isGithubDotCom, GITHUB_HOST, Nut, jMt } from "../../utils/git/githubUrl.js";
import { isEnvAssignmentFree } from "./governedGitTrust.js";
import { getRemoteHostname, getRemoteRepoPath } from "./outcomeBranches.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { antEnv } from "../../utils/env.js";
import { envPositiveMs, tagFailureStage, Dr, Qd } from "./launcherHooks.js";
import { LVn, SAFE_GIT_CONFIG_ARGS } from "../../selfHostedRunner/git/fetchErrors.js";
import { Wo } from "./hostConfigSnapshot.js";
import { getRelativeSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { Nd } from "../../utils/toolCgroup.js";
import { fMo, FVn } from "../../selfHostedRunner/git/gitCredentials.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isRetryableRunnerError } from "../../selfHostedRunner/runnerApiErrors.js";
import { sleep } from "../../utils/sleep.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { resolveInside } from "./repoSettingsConfinement.js";

//@ chunk-hm0ce8vc.js:170087-170855 placement
function pluralizeEntries(e, n) {
  let r = (p) => (Array.isArray(p) ? p : []),
    s = r(e?.governed_hosts),
    a = r(e?.direct_hosts);
  if (s.length === 0 && a.length === 0) return;
  let o = 0,
    l = (p) => {
      let S = [];
      for (let T of p) {
        let y = normalizeGovernedHost(T);
        if (y === void 0) {
          o++;
          continue;
        }
        if (!S.includes(y)) S.push(y);
      }
      return S;
    },
    u = l(s),
    filtered = l(a).filter((p) => !u.includes(p));
  if (o > 0)
    n(
      `[runner:warn] the work item's governed-git per-host routing carried ${o} host ${plural(o, "entry", "entries")} that ${plural(o, "is", "are")} not a bare canonical hostname; ${plural(o, "it was", "they were")} ignored (a host the runner cannot validate is served directly with this machine's own git credentials). No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.`,
    );
  return { governed: u, direct: filtered };
}
//@ chunk-hm0ce8vc.js:170855-170974 placement
function isGovernedHost(e, n) {
  if (!e) return !0;
  if (!n) return !1;
  let r = normalizeHost(n);
  return isGithubDotCom(r) ? e.governed.includes(GITHUB_HOST) : e.governed.includes(r);
}
/**
 * 按 NO_PROXY 列表筛出受管 git 主机中应直连的主机。
 */
//@ chunk-hm0ce8vc.js:170974-171275 placement
function governedNoProxyHosts(e, n) {
  if (!e || !n) return [];
  let filtered = n
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  if (filtered.includes("*")) return [...e.governed];
  let filtered_2 = filtered
    .map((a) =>
      a
        .replace(/^\*?\./, "")
        .replace(/:\d+$/, "")
        .replace(/\.$/, ""),
    )
    .filter((a) => a !== "");
  return e.governed.filter((a) => filtered_2.some((o) => a === o || a.endsWith(`.${o}`)));
}
//@ chunk-hm0ce8vc.js:171275-172132 placement
function formatAskpassWarning(e, n) {
  if (!e || !n) return;
  let filtered = e.governed.filter((s) => s !== GITHUB_HOST);
  if (filtered.length === 0) return;
  return `[runner:warn] governed git: GIT_ASKPASS is set on this runner and the server governs ${plural(filtered.length, "host")} ${filtered.join(", ")}. An askpass program answers for every host. The session's own git config tells git to give up rather than ask for a credential for ${plural(filtered.length, "that host", "those hosts")}, because the session relay supplies it. Do not leave it to that alone: git config read after the session's own (a repository's, the command line, GIT_CONFIG_* variables) can switch that off, and if the program were then asked, this machine's credential would pass through Anthropic's relay. Make the program answer only for the hosts you mean (git passes it the URL in its prompt) or unset it; the same goes for core.askPass in git config and for SSH_ASKPASS.`;
}
//@ chunk-hm0ce8vc.js:172132-172992 placement
function formatSourcesOnHostWarning(e, n, r) {
  if (!e || !n) return;
  let s = [];
  for (let a of r) {
    if (a === void 0 || isGovernedHost(e, a)) continue;
    let o = normalizeHost(a);
    if (o === "" || o.length > 255 || !Nut.test(o) || s.includes(o)) continue;
    s.push(o);
  }
  if (s.length === 0) return;
  return `[runner:warn] governed git: this session has ${plural(s.length, "a source", "sources")} on ${s.join(", ")}, which the server does not route through Anthropic-managed git; ${plural(s.length, "it is", "they are")} cloned with this machine's own git credentials. This runner was started with --use-anthropic-git-proxy, which deletes and replaces the runner account's HOME-level git config at startup and before every session, so a credential for ${plural(s.length, "that host", "those hosts")} must live where that flag does not reach (for example /etc/gitconfig, GIT_ASKPASS, or an SSH key with --git-ssh-rewrite). Without one, the clone of a private repository there fails.`;
}
//@ chunk-hm0ce8vc.js:172992-174354 placement
function isLoopbackHttpUrl(e, n, r, s) {
  if (!e) return;
  let git_mount_base_url = e.git_mount_base_url,
    o;
  try {
    o = git_mount_base_url ? new URL(git_mount_base_url) : void 0;
  } catch {
    o = void 0;
  }
  let l =
    o?.protocol === "http:" &&
    (o.hostname === "localhost" || o.hostname === "127.0.0.1" || o.hostname === "[::1]");
  if (!o || (o.protocol !== "https:" && !l) || !isEnvAssignmentFree(o.href)) {
    r(
      "[runner:warn] the work item's governed-git configuration carried an unusable git mount URL, so this session continues with the legacy git flow. No operator action is needed for the session to work; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  let u = isLoopbackUrl(e.git_mount_push_base_url, r),
    h = isLoopbackUrl(e.rest_mount_base_url, r, BAD_REST_MOUNT_WARNING),
    p = e.tool_config?.git_config === !0,
    replaced = o.href.replace(/\/+$/, ""),
    T =
      s !== void 0 &&
      !p &&
      o.username === "" &&
      o.password === "" &&
      o.href === o.origin + o.pathname &&
      replaced !== o.origin;
  if (s !== void 0 && !p && !T)
    r(
      "[runner:warn] governed git: a direct-upstreams list is set but the git mount URL's shape cannot be kept as a session remote, so every source keeps its upstream URL as origin and no in-session fetches are routed through the git mount",
    );
  let y = pluralizeEntries(e.tool_config, r),
    v = p && (!y || y.governed.length > 0),
    w = !y || y.governed.includes(GITHUB_HOST),
    E = e.tool_config?.gh_path_shim === !0 && w;
  return {
    mountBaseUrl: replaced,
    toolConfig: { gitConfig: v, ghPathShim: E, ...(y && { hostSplit: y }) },
    getSessionToken: n,
    ...(u !== void 0 && { pushBaseUrl: u }),
    ...(T && { directUpstreams: s }),
    ...(h !== void 0 && w && { restMountBaseUrl: h }),
  };
}
/**
 * 受管 git 配置携带了不可用的 GitHub REST 挂载地址时的警告文字。
 */
//@ chunk-hm0ce8vc.js:174354-174688 placement
var BAD_REST_MOUNT_WARNING =
  "[runner:warn] the work item's governed-git configuration carried an unusable GitHub REST mount URL, so this session's gh keeps this machine's own GitHub access (the clone through the mount is unaffected). No operator action is needed; please report this warning to Anthropic support so the server-side delivery can be fixed.";
//@ chunk-hm0ce8vc.js:174688-174814 placement
function matchesRepoList(e, n) {
  let lower = `${e.host}/${e.owner}`.toLowerCase(),
    s = `${lower}/${e.repo.toLowerCase()}`;
  return n.some((a) => a === lower || a === s);
}
//@ chunk-hm0ce8vc.js:174814-174919 placement
function splitMountRouting(e, n, r, s) {
  let a = new Set(),
    o = new Set();
  return { throughMount: [...a].sort(), keptDirect: [...o].sort() };
}
/**
 * 按服务器的逐主机路由判断源是 direct 还是 customer-managed。
 */
//@ chunk-hm0ce8vc.js:174919-177235 placement
function classifySourceRouting(e, n = [], r = [], s, a, o, l) {
  let u = new Set(n.map((T) => T.toLowerCase())),
    h = new Set(),
    p = new Map(r.map(([T, y]) => [T.toLowerCase(), y])),
    S = [];
  for (let T of e) {
    if (T.type !== "git_repository" || !T.url) continue;
    let y = getRemoteHostname(T.url),
      v = o?.toolConfig.hostSplit,
      w = isGovernedHost(v, y);
    if (o && v && !w) {
      let L = y !== void 0 && v.direct.includes(normalizeHost(y));
      s?.(
        L
          ? `[runner:git] governed git: source ${T.url} is on a direct-class host (server per-host routing); customer-managed handling for this source`
          : `[runner:git] governed git: source ${T.url} is on a host not named in the ` +
              "server's per-host routing (unlisted); treating it as direct \u2014 " +
              "customer-managed handling for this source",
      );
    }
    if (o && w) {
      let L = buildGovernedGitUrl(T.url, o.mountBaseUrl, s);
      if (L) {
        let D = formatNoPushUrlWarning(L, o.pushBaseUrl, s),
          oe = o.directUpstreams !== void 0 && !matchesRepoList(L, o.directUpstreams);
        S.push({
          type: "github",
          repo: `${L.owner}/${L.repo}`,
          ref: T.revision,
          url: L.url,
          getAuthToken: o.getSessionToken,
          governedMount: !0,
          upstreamUrl: L.upstreamUrl,
          ...(D !== void 0 && { governedPushUrl: D }),
          ...(oe && { fetchViaMount: oe }),
        });
        continue;
      }
      if (
        (s?.(
          `[runner:git] governed git: source ${T.url} is not mount-routable; using legacy handling for this source`,
        ),
        v && y !== void 0)
      ) {
        let D = normalizeHost(y);
        if (!h.has(D))
          (h.add(D),
            l?.(
              `[runner:warn] governed git: a source on governed host ${D} could not be routed through the git mount (its URL is not in a form the mount serves, for example a nonstandard port). It takes this machine's own git path instead, so it needs this machine's own credentials for that host although the host is listed as governed. Use the https://host/owner/repo form on the standard port, or keep a credential on this machine that answers only for that URL (for example one scoped to its port, or an SSH key).`,
            ));
      }
    }
    let E = buildGitProxyUrl(T.url, a, s);
    if (E) {
      S.push({
        type: "github",
        repo: `${E.owner}/${E.repo}`,
        ref: T.revision,
        url: E.url,
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
    let A = rewriteHostUrl(T.url, p, s),
      G = rewriteSshUrl(A, u, s),
      K = getRemoteRepoPath(G);
    if (!K)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mapSources: cannot extract repo slug from source URL '${T.url}' \u2014 not scp-form (user@host:path) and not a parseable URL`,
        "mapSources: cannot extract repo slug from source URL",
      );
    S.push({ type: isSshRemote(G) ? "github-ssh" : "github", repo: K, ref: T.revision, url: G });
  }
  return S;
}
/**
 * 由源 URL 解析 owner/repo 生成 session_ingress git 代理地址。
 */
//@ chunk-hm0ce8vc.js:177235-177897 placement
function buildGitProxyUrl(e, n, r) {
  if (!n) return;
  let match = e.match(/^https:\/\/[^/@]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (e.startsWith("https://"))
      r?.(
        `[runner:git] git proxy: could not parse owner/repo from ${e}; falling back to customer git auth for this source`,
      );
    return;
  }
  let a = match[1],
    o = match[2];
  if (!jMt.test(a) || !jMt.test(o)) {
    r?.(
      `[runner:git] git proxy: rejecting unsafe owner/repo in ${e}; falling back to customer git auth for this source`,
    );
    return;
  }
  let u = `${n.apiBaseUrl.replace(/\/+$/, "")}/v1/session_ingress/session/${n.sessionId}/git_proxy/${a}/${o}.git`;
  return (
    r?.(`[runner:git] rewrote ${e} -> git_proxy/${a}/${o}.git (--use-anthropic-git-proxy)`),
    { url: u, owner: a, repo: o }
  );
}
//@ chunk-hm0ce8vc.js:177897-178655 placement
function buildGovernedGitUrl(e, n, r) {
  let match = e.match(/^https:\/\/([^/@:]+)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    if (e.startsWith("https://")) r?.(`[runner:git] governed git: could not parse host/owner/repo from ${e}`);
    return;
  }
  let lower = match[1].toLowerCase(),
    o = match[2],
    l = match[3];
  if (!/^(?!\.{1,2}$)[a-z0-9.-]+$/.test(lower) || lower.length > 255) {
    r?.(
      `[runner:git] governed git: rejecting unsafe host in ${e}; falling back to legacy handling for this source`,
    );
    return;
  }
  if (!jMt.test(o) || !jMt.test(l)) {
    r?.(
      `[runner:git] governed git: rejecting unsafe owner/repo in ${e}; falling back to legacy handling for this source`,
    );
    return;
  }
  let u = `${n}/${lower}/${o}/${l}`;
  return (
    r?.(`[runner:git] rewrote ${e} -> git mount /${lower}/${o}/${l} (governed git)`),
    { url: u, host: lower, owner: o, repo: l, upstreamUrl: `https://${lower}/${o}/${l}` }
  );
}
//@ chunk-hm0ce8vc.js:178655-178939 placement
function formatNoPushUrlWarning(e, n, r) {
  if (n === void 0) return;
  if (!isGithubDotCom(e.host)) {
    r?.(
      `[runner:git] governed git: no push URL for ${e.upstreamUrl} \u2014 the git mount accepts pushes for github.com repositories only; this source keeps its current push path`,
    );
    return;
  }
  return `${n}/${e.host}/${e.owner}/${e.repo}`;
}
//@ chunk-hm0ce8vc.js:178939-179038 placement
function hf(e, n) {
  if (e === void 0 || e.size > (e.has(n) ? 1 : 0)) return "another";
  return e.size > 0 ? "own" : "none";
}
//@ chunk-hm0ce8vc.js:179038-179174 placement
function getDrainGraceMs(e, n) {
  return (
    antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM === !0 &&
    envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") === 0 &&
    (e === "none" || e === n)
  );
}
//@ chunk-hm0ce8vc.js:179174-179649 placement
function shouldSanitizeCanonical(e, n, r) {
  if (!antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM) return !0;
  if (!getDrainGraceMs(r, "own")) {
    let s = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS");
    return (
      e(
        `[runner:warn] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM ignored: drain-grace is ${s}ms (> 0), so a prior session ` +
          "could have written to the canonical \u2014 sanitizing anyway",
      ),
      !0
    );
  }
  return (
    e(
      "[runner:session] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM \u2014 skipping " +
        `sanitizeCanonicalGitState for ${n} (trusted one-shot prewarm)`,
    ),
    !1
  );
}
//@ chunk-hm0ce8vc.js:179649-179758 placement
var REPO_SANITIZE_ENTRIES = new Map([
  ["objects", "dir"],
  ["refs", "dir"],
  ["packed-refs", "file"],
  ["HEAD", "file"],
  ["shallow", "file"],
]);
/**
 * 准备前清洗 canonical 仓库（objects、refs、packed-refs 等）。
 */
//@ chunk-hm0ce8vc.js:179758-182117 placement
async function sanitizeCanonicalRepo(e, n, r) {
  let s = join_4(e, ".git"),
    a;
  try {
    a = await lstat_3(s);
  } catch (error) {
    let h = getErrnoCode(error);
    if (h === "ENOENT" || h === "ENOTDIR") return;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${e} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
  if (!a.isDirectory()) {
    (await rm_3(s, { force: !0 }),
      n(
        `[runner:session] sanitized canonical at ${e}: .git was not a directory (gitlink/symlink) \u2014 removed, will fresh-init`,
      ));
    return;
  }
  let o = r?.replace(/^(https?:\/\/)[^/@]*@/, "$1");
  if (o && /[\x00-\x1f]/.test(o))
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
    (o
      ? `[remote "origin"]
	url = ${o}
	fetch = ${LVn}
`
      : "");
  try {
    let u = await readdir_2(s);
    for (let v of u) {
      let w = REPO_SANITIZE_ENTRIES.get(v);
      if (w) {
        let E = await lstat_3(join_4(s, v)).catch(() => {
          return;
        });
        if (E && !E.isSymbolicLink() && (w === "dir" ? E.isDirectory() : E.isFile())) continue;
        n(`[runner:session] sanitize: kept entry .git/${v} has unexpected type \u2014 removing`);
      }
      await rm_3(join_4(s, v), { recursive: !0, force: !0 });
    }
    try {
      (await rm_3(join_4(s, "refs", "heads")),
        n(
          "[runner:session] sanitize: .git/refs/heads was not a directory \u2014 removed (a reftable repository leaves a placeholder file there)",
        ));
    } catch (error) {
      let w = getErrnoCode(error);
      if (w !== "ENOENT" && w !== "ERR_FS_EISDIR") throw error;
    }
    (await removeSymlinksIn(join_4(s, "refs"), !0),
      await removeSymlinksIn(join_4(s, "objects"), !1),
      await rm_3(join_4(s, "objects", "info"), { recursive: !0, force: !0 }),
      await rm_3(join_4(s, "objects", "pack", "multi-pack-index"), { recursive: !0, force: !0 }));
    let h = join_4(s, "HEAD"),
      p = await lstat_3(h).catch(() => {
        return;
      }),
      S = p && p.size <= 1024 ? await readFile_3(h, "utf-8").catch(() => "") : "",
      match = /^ref: (refs\/[A-Za-z0-9._/-]+)\n?$/.exec(S),
      y =
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
    if (/^ref: refs\/heads\/\.invalid\n?$/.test(S))
      (await rm_3(h, { force: !0 }),
        await writeFile_2(
          h,
          `ref: refs/heads/main
`,
          { flag: "wx", mode: 420 },
        ));
    else if (!y && !/^[0-9a-f]{40}([0-9a-f]{24})?\n?$/.test(S)) await rm_3(h, { force: !0 });
    (await writeFile_2(join_4(s, "config"), l, { mode: 420 }),
      n(`[runner:session] sanitized canonical .git/ at ${e} (git-proxy cross-session isolation)`));
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git-proxy: could not sanitize canonical ${e} before prep \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "git-proxy: could not sanitize canonical before prep",
    );
  }
}
/**
 * 删除目录中的符号链接（可递归子目录）。
 */
//@ chunk-hm0ce8vc.js:182117-182441 placement
async function removeSymlinksIn(e, n) {
  let r;
  try {
    r = await readdir_2(e);
  } catch (error) {
    let a = getErrnoCode(error);
    if (a === "ENOENT" || a === "ENOTDIR") return;
    throw error;
  }
  for (let s of r) {
    let a = join_4(e, s),
      o;
    try {
      o = await lstat_3(a);
    } catch (error) {
      let u = getErrnoCode(error);
      if (u === "ENOENT" || u === "ENOTDIR") continue;
      throw error;
    }
    if (o.isSymbolicLink()) {
      await rm_3(a, { force: !0 });
      continue;
    }
    if (n && o.isDirectory()) await removeSymlinksIn(a, !0);
  }
}
//@ chunk-hm0ce8vc.js:182441-182558 placement
async function writeNewFile(e, n, r) {
  let s = await open_3(e, "wx", r);
  try {
    (await s.writeFile(n), await s.chmod(r));
  } finally {
    await s.close();
  }
}
//@ chunk-hm0ce8vc.js:182558-182687 placement = convertDirectoryToZipInPlace (1)
async function rewriteFileWithMode(e, n, r) {
  (await rm_3(e, { recursive: !0, force: !0 }),
    await mkdir_4(dirname_4(e), { recursive: !0 }),
    await writeFile_2(e, n, { mode: r }),
    await chmod(e, r));
}
/**
 * 清空并重写会话间隔离用的 git 钩子桩。
 */
//@ chunk-hm0ce8vc.js:182687-183435 placement
async function restoreHookStubs(e, n, r) {
  if (e.length === 0) return;
  let s = dirname_4(e[0].path),
    a = dirname_4(s);
  try {
    let o = await lstat_3(a).catch(() => {
      return;
    });
    if (!o) await mkdir_4(a, { recursive: !0 });
    else if (!o.isDirectory() || o.isSymbolicLink())
      (await rm_3(a, { recursive: !0, force: !0 }), await mkdir_4(a, { recursive: !0 }));
    if (n) for (let l of n) await rewriteFileWithMode(l.path, l.content, l.mode);
    (await rm_3(s, { recursive: !0, force: !0 }), await mkdir_4(s, { recursive: !0 }));
    for (let l of e) await rewriteFileWithMode(l.path, l.content, 493);
    r(`[runner:session] clean-slated ${s} and rewrote ${e.length} hook stubs (cross-session isolation)`);
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
/**
 * 写 info/exclude 让 git 忽略 .claude/settings.local.json。
 */
//@ chunk-hm0ce8vc.js:183435-184848 placement
async function ignoreLocalSettingsInGit(e, n, r) {
  try {
    await rm_3(dirname_4(e.xdgConfigPath), { recursive: !0, force: !0 });
    let s = [dirname_4(e.xdgConfigPath)],
      a = e.homeGitconfigPath && Wo(dirname_4(e.homeGitconfigPath));
    if (a && a !== dirname_4(e.xdgConfigPath)) (await rm_3(a, { recursive: !0, force: !0 }), s.push(a));
    for (let o of s) {
      let l = join_4(o, "ignore");
      await rewriteFileWithMode(
        l,
        `**/${getRelativeSettingsFilePathForSource("localSettings").replaceAll("\\", "/")}
`,
        420,
      ).catch((u) =>
        r(
          `[runner:warn] could not write ${l}, so git may not ignore .claude/settings.local.json in this session and "git add -A" may commit it: ${errorMessage(u)}`,
        ),
      );
    }
    if (e.homeGitconfigPath && e.homeGitconfigPath !== e.globalConfigPath)
      await rm_3(e.homeGitconfigPath, { recursive: !0, force: !0 });
    if ((await rewriteFileWithMode(e.globalConfigPath, e.globalConfigSnapshot, 420), e.credHelper)) {
      let o = dirname_4(e.credHelper.path),
        l = await lstat_3(o).catch(() => {
          return;
        });
      if (!l) await mkdir_4(o, { recursive: !0 });
      else if (!l.isDirectory() || l.isSymbolicLink())
        (await rm_3(o, { recursive: !0, force: !0 }), await mkdir_4(o, { recursive: !0 }));
      if (e.signingArtifacts)
        for (let signingArtifact of e.signingArtifacts)
          await rewriteFileWithMode(signingArtifact.path, signingArtifact.content, signingArtifact.mode);
      await rewriteFileWithMode(e.credHelper.path, e.credHelper.content, 448);
    }
    n(
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
async function runGitConfigLocal(e, n, r) {
  if (r) await rm_3(join_4(e, ".git", "config.lock"), { force: !0 }).catch(() => {});
  await new Promise((s) => {
    let a = spawn("git", ["-C", e, "config", "--local", "--unset-all", "credential.helper", "^$"], {
        cwd: void 0,
        stdio: "ignore",
        windowsHide: !0,
        ...Nd("helper"),
      }),
      o = setTimeout((u) => u.kill("SIGKILL"), Dr, a),
      l = (u) => {
        if ((clearTimeout(o), u !== 0 && u !== 5 && u !== null))
          n(`[runner:session] stale git-proxy reset sweep in ${e} exited ${u}`);
        s();
      };
    (a.on("close", l), a.on("error", () => l(null)));
  });
}
/**
 * 配置会话凭据助手（使用 CLAUDE_CODE_SESSION_ACCESS_TOKEN）。
 */
//@ chunk-hm0ce8vc.js:185317-185874 placement
async function setCredentialHelper(e, n, r, s) {
  let origin = new URL(n).origin,
    o = [
      [["credential.helper", ""], ["--replace-all"]],
      [[`credential.${origin}.helper`, ""], ["--replace-all"]],
      [[`credential.${origin}.helper`, fMo("CLAUDE_CODE_SESSION_ACCESS_TOKEN")], ["--add"]],
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
  r(`[runner:session] git proxy: wired repo-local credential helper for ${origin} in ${e}`);
}
//@ chunk-hm0ce8vc.js:185874-186523 placement
async function runGitWithAbort(e, n, r, s = spawn, a = Dr, o) {
  await new Promise((l, u) => {
    let h = !1,
      p = "",
      S = (w) => {
        if (h) return;
        if (((h = !0), clearTimeout(v), r?.removeEventListener("abort", y), w)) u(w);
        else l();
      },
      T = s("git", e, {
        cwd: void 0,
        stdio: ["ignore", o ? "pipe" : "ignore", "pipe"],
        windowsHide: !0,
        ...Nd("helper"),
      });
    (T.stdout?.on("data", (w) => o?.(String(w))), T.stderr?.on("data", (w) => (p += String(w))));
    let y = () => {
        (T.kill("SIGKILL"), S(n({ code: null, stderr: p.trim() })));
      },
      v = setTimeout(
        (w, E) => {
          (w.kill("SIGKILL"), E(n({ code: null, stderr: p.trim() })));
        },
        a,
        T,
        S,
      );
    if (r?.aborted) y();
    else r?.addEventListener("abort", y, { once: !0 });
    (T.on("close", (w) => S(w === 0 ? void 0 : n({ code: w, stderr: p.trim() }))),
      T.on("error", (w) => S(w)));
  });
}
//@ chunk-hm0ce8vc.js:186523-187108 placement
async function getRemoteOriginUrls(e, n, r, s, a, o) {
  let l = "",
    u = { code: null },
    h = await runGitWithAbort(
      ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--get-all", "remote.origin.url"],
      (S) => ((u.code = S.code), Error("git config --get-all remote.origin.url failed")),
      s,
      a,
      o,
      (S) => {
        l += S;
      },
    ).then(
      () => !0,
      () => !1,
    );
  if (!h && u.code !== 1) return "read_failed";
  let filtered = l
    .split(
      `
`,
    )
    .filter((S) => S.length > 0);
  if (h && filtered.length === 1 && filtered[0] === n) return "ok";
  return (
    r(
      `[runner:session] governed git: remote.origin.url in ${e} is not the upstream URL after prep; the runner changed nothing here; the next preparation of this repository rewrites origin or fails`,
    ),
    "not_upstream"
  );
}
//@ chunk-hm0ce8vc.js:187108-187741 placement
async function setHostCredentialHelper(e, n, r, s, a, o) {
  let l = `credential.${s}.helper`,
    u = r.endsWith(".git") ? r.slice(0, -4) : `${r}.git`,
    h = [
      [l, "", "--replace-all"],
      [l, FVn("CLAUDE_CODE_SESSION_ACCESS_TOKEN"), "--add"],
      [`url.${n}.insteadOf`, r, "--replace-all"],
      [`url.${n}.insteadOf`, u, "--add"],
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
  a(
    `[runner:session] governed git: fetches of ${r} rewritten to the mount (${n}) with a session-token credential helper scoped to ${s} in ${e}`,
  );
}
//@ chunk-hm0ce8vc.js:187741-188276 placement
async function setUrlInsteadOf(e, n, r, s, a = Qd) {
  let o = Date.now() + a;
  for (let l of [`url.${n}.insteadOf`, `credential.${r}.helper`])
    if (
      !(await runGitWithAbort(
        ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", l],
        (h) =>
          h.code === yi
            ? new Qr()
            : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `governed git mount read: 'git config --unset-all ${l}' in ${e} exited ${h.code}: ${h.stderr}`,
                "governed git mount read: repo-local git config cleanup failed",
              ),
        void 0,
        void 0,
        Math.max(1, o - Date.now()),
      ).then(
        () => !0,
        (h) => {
          if (h instanceof Qr) return !0;
          return (s(`[runner:session] governed git: ${errorMessage(h)} (best-effort cleanup)`), !1);
        },
      ))
    )
      return;
}
//@ chunk-hm0ce8vc.js:188276-189001 placement
function isLoopbackUrl(e, n, r) {
  let s = e?.trim() ?? "";
  if (s === "") return;
  let a;
  try {
    a = new URL(s);
  } catch {
    a = void 0;
  }
  let o =
      a?.protocol === "http:" &&
      (a.hostname === "localhost" || a.hostname === "127.0.0.1" || a.hostname === "[::1]"),
    l =
      a !== void 0 &&
      (a.username !== "" ||
        a.password !== "" ||
        a.href !== a.origin + a.pathname ||
        !isEnvAssignmentFree(a.href));
  if (!a || (a.protocol !== "https:" && !o) || l) {
    n(
      r ??
        "[runner:warn] the work item's governed-git configuration carried an unusable git mount push URL, so this session's git pushes keep going to the upstream remote instead of the git mount (the clone through the mount is unaffected). No operator action is needed; please report this warning to Anthropic support so the server-side delivery can be fixed.",
    );
    return;
  }
  return a.href.replace(/\/+$/, "");
}
/**
 * 设置/清除 remote.origin.pushurl 让推送走受管路径。
 */
//@ chunk-hm0ce8vc.js:189001-189986 placement
async function configureGovernedPushUrl(e, n, r, s, a, o) {
  await runGitWithAbort(
    ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", "remote.origin.pushurl"],
    (h) =>
      h.code === yi
        ? new Qr()
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `governed git push URL: 'git config --unset-all remote.origin.pushurl' in ${e} exited ${h.code}: ${h.stderr}`,
            "governed git push URL: repo-local git config unset failed",
          ),
    o,
  ).catch((h) => {
    if (!(h instanceof Qr)) throw h;
  });
  let l = s.endsWith(".git") ? s.slice(0, -4) : `${s}.git`,
    u = [
      [[_i(n), s], ["--replace-all"]],
      [[_i(n), l], ["--add"]],
      [[`credential.${r}.helper`, ""], ["--replace-all"]],
      [[`credential.${r}.helper`, FVn("CLAUDE_CODE_SESSION_ACCESS_TOKEN")], ["--add"]],
    ];
  for (let [[h, p], S] of u)
    await runGitWithAbort(
      ["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", ...S, h, p],
      (T) =>
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `governed git push URL: 'git config ${h}' in ${e} exited ${T.code}: ${T.stderr}`,
          "governed git push URL: repo-local git config write failed",
        ),
      o,
    );
  a(
    `[runner:session] governed git: pushes to ${s} rewritten to ${n} (url.<pushUrl>.pushInsteadOf) with a session-token credential helper scoped to ${r} in ${e}`,
  );
}
//@ chunk-hm0ce8vc.js:189986-190032 placement
function _i(e) {
  return `url.${e}.pushInsteadOf`;
}
//@ chunk-hm0ce8vc.js:190032-190510 placement
async function unsetCredentialHelper(e, n, r, s) {
  let a = !0;
  for (let o of [_i(n), `credential.${r}.helper`])
    await runGitWithAbort(["-C", e, ...SAFE_GIT_CONFIG_ARGS, "config", "--local", "--unset-all", o], (l) =>
      l.code === yi
        ? new Qr()
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `governed git push URL: 'git config --unset-all ${o}' in ${e} exited ${l.code}: ${l.stderr}`,
            "governed git push URL: repo-local git config unset failed",
          ),
    ).catch((l) => {
      if (l instanceof Qr) return;
      ((a = !1),
        s(
          `[runner:session] governed git: ${errorMessage(l)} (best-effort; retried at the next reconcile / cleanup)`,
        ));
    });
  return a;
}
//@ chunk-hm0ce8vc.js:190510-190519 placement
var yi = 5;
//@ chunk-hm0ce8vc.js:190519-190543 placement
class Qr extends Error {}
/**
 * 对每个源核对推送 URL，失败则在下次 /remote 读取时再协调。
 */
//@ chunk-hm0ce8vc.js:190543-193231 placement
function reconcileGovernedPushUrls(e) {
  let { sessionId: sessionId, wirings: wirings, onStatus: onStatus, onDebug: onDebug, signal: signal } = e,
    l,
    u = new Set(),
    h = !1,
    p = !1,
    resolved = Promise.resolve();
  async function T(A) {
    let origin = new URL(A).origin;
    (u.add(A), (h = !1));
    for (let K of wirings)
      await configureGovernedPushUrl(
        K.canonicalPath,
        `${A}/${K.mountPath}`,
        origin,
        K.upstreamUrl,
        onDebug,
        signal,
      );
    l = A;
  }
  async function y(A) {
    let origin = new URL(A).origin,
      K = !0;
    for (let L of wirings)
      if (!(await unsetCredentialHelper(L.canonicalPath, `${A}/${L.mountPath}`, origin, onDebug))) K = !1;
    if (K) u.delete(A);
    return K;
  }
  async function v() {
    for (let A of [...u]) await y(A);
    return ((l = void 0), u.size === 0);
  }
  async function w() {
    let A = l,
      G = !1;
    for (let K of [...u]) if (K !== A) (await y(K), (G = !0));
    if (G && A !== void 0) await T(A);
  }
  function E(A, G) {
    return (
      (resolved = resolved.then(G).catch((K) => {
        onStatus(
          `[runner:warn] governed git: ${A} the push URL for ${sessionId} failed: ${errorMessage(K)} \u2014 ` +
            "session pushes may be refused until the next /remote read reconciles again",
        );
      })),
      resolved
    );
  }
  return {
    apply: () => {
      let A = resolved.then(() => T(e.pushBaseUrl));
      return ((resolved = A.catch(() => {})), A);
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
        if (A !== void 0 && A.git_mount_push_base_url === void 0) {
          onDebug(
            `[runner:session] governed git: a /remote read for ${sessionId} carried no git_mount_push_base_url key (server predates the field); push URL wiring left as is`,
          );
          return;
        }
        let K = isLoopbackUrl(A?.git_mount_push_base_url, onDebug),
          any = [...u].some((oe) => oe !== l);
        if (K === l && !any) return;
        if (K !== void 0 && K === l) {
          await w();
          return;
        }
        if (K === void 0) {
          let oe = l !== void 0 || h;
          if (!(await v())) {
            ((h = oe),
              onStatus(
                `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} ` +
                  "(a git config unset failed \u2014 see the debug log); it is retried at the next /remote read and at session end",
              ));
            return;
          }
          if (((h = !1), oe))
            (onStatus(
              `[runner:session] governed git: push URL WITHDRAWN for ${sessionId} \u2014 the session token no longer carries ` +
                "the git-mount push capability; session git pushes now go to the remote's fetch URL",
            ),
              logFeatureSad("self_hosted_governed_push_url", "capability_withdrawn"));
          return;
        }
        let D = l === void 0;
        await v();
        try {
          await T(K);
        } catch (error) {
          throw (logFeatureBad("self_hosted_governed_push_url", "config_write_failed"), error);
        }
        if (
          (onStatus(
            D
              ? `[runner:session] governed git: push URL RESTORED for ${sessionId} \u2014 session git pushes go through the git mount again`
              : `[runner:session] governed git: push URL base changed for ${sessionId}; repo-local push wiring rewritten`,
          ),
          D)
        )
          logFeatureSad("self_hosted_governed_push_url", "capability_restored");
      }),
    cleanup: () =>
      E("removing", async () => {
        if (((p = !0), !(await v())))
          onStatus(
            `[runner:warn] governed git: could not fully remove the push URL wiring for ${sessionId} at session end (a git config unset failed); the residue is token-free and the next session's prep clears it`,
          );
      }),
    get active() {
      return l !== void 0;
    },
  };
}
//@ chunk-hm0ce8vc.js:193231-193915 placement
async function retryGitOperation(e) {
  let n = e.isTransient ?? isRetryableRunnerError,
    r = e.nowMs ?? Date.now,
    s = r() + e.deadlineMs,
    a = void 0;
  for (let o = 1; ; o++) {
    if (e.signal?.aborted) return { outcome: "failed", reason: "aborted", error: a };
    try {
      return { outcome: "presented", config: await e.represent() };
    } catch (error) {
      if (((a = error), e.signal?.aborted)) return { outcome: "failed", reason: "aborted", error: error };
      let u = n(error);
      if (
        (e.onDebug(
          `[runner:session] governed git: re-presenting the refreshed session token on /remote failed (attempt ${o}, ${u ? "transient" : "permanent"}): ${errorMessage(error)}`,
        ),
        !u)
      )
        return { outcome: "failed", reason: "permanent", error: error };
      let h = e.retryDelayMs * o;
      if (r() + h >= s) return { outcome: "failed", reason: "budget", error: error };
      await sleep(h, e.signal, { unref: !0 }).catch(() => {});
    }
  }
}
//@ chunk-hm0ce8vc.js:193915-193942 placement
var Nf = 15000,
  $f = 4,
  Mf = 30000;
//@ chunk-hm0ce8vc.js:193942-194195 placement
function rewriteSshUrl(e, n, r) {
  if (n.size === 0) return e;
  let match = e.match(/^https:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match || !n.has(match[1].toLowerCase())) return e;
  let [a] = match[1].split(":"),
    o = `git@${a}:${match[2]}`;
  return (r?.(`[runner:git] rewrote ${e} -> ${o} (--git-ssh-rewrite)`), o);
}
//@ chunk-hm0ce8vc.js:194195-194450 placement
function rewriteHostUrl(e, n, r) {
  if (n.size === 0) return e;
  let match = e.match(/^https:\/\/([^/]+)\/(.+)$/);
  if (!match) return e;
  let a = n.get(match[1].toLowerCase());
  if (a === void 0) return e;
  let o = `https://${a}/${match[2]}`;
  return (r?.(`[runner:git] rewrote ${e} -> ${o} (--git-host-rewrite)`), o);
}
//@ chunk-hm0ce8vc.js:194450-194553 placement
function isSshRemote(e) {
  if (e.startsWith("ssh://")) return !0;
  return !e.includes("://") && /^[^@]+@[^:]+:.+$/.test(e);
}
//@ chunk-hm0ce8vc.js:194553-194723 placement
function gitRepositorySources(e) {
  let n = [];
  for (let r of e) {
    if (r.type !== "git_repository" || !r.git_info?.repo) continue;
    n.push({ repo: r.git_info.repo, branches: r.git_info.branches ?? [] });
  }
  return n;
}
//@ chunk-hm0ce8vc.js:194723-194900 placement
function branchesByRepo(e) {
  let n = new Map();
  for (let r of e) {
    let s = Si(r.repo),
      a = n.get(s) ?? [];
    for (let o of r.branches ?? []) if (o && isSafeRefName(o) && !a.includes(o)) a.push(o);
    if (a.length > 0) n.set(s, a);
  }
  return n;
}
//@ chunk-hm0ce8vc.js:194900-194938 placement
function Si(e) {
  return e.toLowerCase();
}
//@ chunk-hm0ce8vc.js:194938-195214 placement
function chooseChildCwd(e, n, r, s = !1) {
  let a = s ? [] : n;
  if (r) {
    let o = resolveInside(e, r);
    if (o !== null) return { childCwd: o, addDirs: [...a, e] };
  }
  if (n.length === 1) return { childCwd: n[0], addDirs: [...a, e] };
  if (n.length > 1) return { childCwd: n.every((l) => l.startsWith(e + sep_3)) ? e : n[0], addDirs: [...a] };
  return { childCwd: e, addDirs: [] };
}

export {
  Nf,
  splitMountRouting,
  hf,
  restoreHookStubs,
  ignoreLocalSettingsInGit,
  isLoopbackHttpUrl,
  formatSourcesOnHostWarning,
  formatAskpassWarning,
  governedNoProxyHosts,
  classifySourceRouting,
  branchesByRepo,
  gitRepositorySources,
  Si,
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
  $f,
  Mf,
  retryGitOperation,
  setUrlInsteadOf,
  writeNewFile,
};
