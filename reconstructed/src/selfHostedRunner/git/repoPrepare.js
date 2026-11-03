/**
 * selfHostedRunner/git/repoPrepare.ts
 *
 * BYOC 准备仓库：访问校验、remote 配置、fetch/checkout（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (30)
 * attribution: placement 30
 */
import { join } from "path";
import { mkdir, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { outcomeBranchesByRepo } from "./sessionWorktrees.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { resolveRepositoryUrl, withTokenInUrl, repoCheckoutDir } from "./repoSources.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import {
  resolveFetchDepth,
  resolveServerProgressCap,
  Oe,
  se,
  H0r,
  ae,
  $e,
  classifyFetchRefusal,
  Ht,
  de,
  LVn,
  Je,
  Yt,
  V,
  nt,
  Mt,
  tt,
  Vt,
  Bt,
  xt,
  xe,
  We,
  ie,
  oe,
  isCurlTimeoutOnly,
  NVn,
  FetchRefNotFoundError,
  FetchThrottledError,
} from "./fetchErrors.js";
import { runGit } from "./fetchRun.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { G, redactUrlCredentials } from "./tokenRedact.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { sleep } from "../../utils/sleep.js";
import { FVn, httpsProxyFromEnv } from "./gitCredentials.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { rDn } from "../../utils/gitSafeExec.js";
import { truncateToLength, takeLastChars } from "../../utils/stringUtils.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";

//@ chunk-t3sg9e26.js:1004-1014 placement
var me = 50;
/**
 * BYOC 会话开始前逐个准备代码仓库：跳过不支持的来源类型，按 outcome 里给出的目标分支调用 prepareRepository（默认跳过 reset），记录耗时遥测。
 */
//@ chunk-t3sg9e26.js:10294-10757 placement
async function prepareRepositories(e) {
  let {
      baseDir: baseDir,
      sources: sources,
      outcomes: outcomes,
      skipValidation: skipValidation,
      alwaysFetch: alwaysFetch,
      skipReset: skipReset,
      initWithoutTemplate: initWithoutTemplate,
      onDebug: onDebug,
      onPhase: onPhase,
      onProgress: onProgress,
      signal: signal,
    } = e,
    f = outcomeBranchesByRepo(outcomes ?? []);
  for (let R of sources) {
    if (!$0r(R.type)) {
      onDebug(`[byoc:git] Skipping unsupported source type: ${R.type}`);
      continue;
    }
    await prepareRepositoryTimed({
      baseDir: baseDir,
      source: R,
      targetBranch: f.get(R.repo),
      skipValidation: skipValidation ?? !1,
      alwaysFetch: alwaysFetch ?? !1,
      skipReset: skipReset ?? !0,
      initWithoutTemplate: initWithoutTemplate ?? !1,
      onDebug: onDebug,
      onPhase: onPhase,
      onProgress: onProgress,
      signal: signal,
    });
  }
}
//@ chunk-t3sg9e26.js:10757-10828 placement
function $0r(e) {
  return e === "github" || e === "github-ssh" || e === "test-file";
}
//@ chunk-t3sg9e26.js:10828-11050 placement
async function prepareRepositoryTimed(e) {
  let now = Date.now();
  try {
    let { repoExisted: repoExisted } = await prepareRepository(e);
    logFeatureOk("byoc_git_prepare_repo", { repo_existed: repoExisted, duration_ms: Date.now() - now });
  } catch (error) {
    throw (logFeatureBad("byoc_git_prepare_repo", "error", { duration_ms: Date.now() - now }), error);
  }
}
/**
 * BYOC 准备仓库：解析目录/引用/目标分支，读取进度上限配置
 */
//@ chunk-t3sg9e26.js:11050-13156 placement
async function prepareRepository(e) {
  let {
      baseDir: baseDir,
      source: source,
      targetBranch: targetBranch,
      skipValidation: skipValidation,
      alwaysFetch: alwaysFetch,
      skipReset: skipReset,
      initWithoutTemplate: initWithoutTemplate,
      onDebug: onDebug,
      onPhase: onPhase,
      onProgress: onProgress,
      signal: signal,
    } = e,
    f = resolveRepositoryUrl(source),
    R = source.getAuthToken ? f : withTokenInUrl(f, source.token),
    b = repoCheckoutDir(baseDir, source);
  if (!b) throw Error(`Could not determine repository directory for: ${source.repo}`);
  if (source.ref && !isSafeRefName(source.ref)) throw Error(`Invalid ref: ${source.ref}`);
  if (targetBranch && !isSafeRefName(targetBranch)) throw Error(`Invalid target branch: ${targetBranch}`);
  let now = Date.now();
  onDebug(
    `[byoc:git] Preparing ${source.repo} at ${b} (ref=${source.ref ?? "HEAD"}, auth=${source.getAuthToken ? "git-proxy" : R !== f})`,
  );
  let { invalid: invalid } = resolveFetchDepth();
  if (invalid !== void 0)
    onDebug(
      `[byoc:git] Ignoring CLAUDE_RUNNER_FETCH_DEPTH='${invalid}' \u2014 expected 'full', '0', or a positive integer; using default ${me}`,
    );
  let A = resolveServerProgressCap();
  if (A.invalid !== void 0)
    onDebug(
      `[byoc:git] Ignoring CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS='${A.invalid}' \u2014 expected a positive integer (milliseconds), '0' or 'off'; using default ${Oe}`,
    );
  else if (A.clamped !== void 0)
    onDebug(
      `[byoc:git] CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS='${A.clamped}' is ${A.capMs === se ? "above the thirty-minute ceiling" : "below the two-minute floor"}; using ${A.capMs} ms`,
    );
  let E = {
      repoPath: b,
      gitURL: f,
      authURL: R,
      originURL: H0r(source) ?? R,
      token: source.token,
      getAuthToken: source.getAuthToken,
      governedMount: source.governedMount,
      gitEnvironment: source.gitEnvironment,
      sanitized: source.sanitized,
      initWithoutTemplate: initWithoutTemplate,
      onDebug: onDebug,
      onPhase: onPhase,
      onProgress: onProgress,
      signal: signal,
    },
    l = void 0;
  if (!skipValidation)
    await ke(E, "validateAccess", () =>
      validateRepositoryAccess(E, source.repo, source.skippedIfThrottled === !0),
    );
  let T = await ke(E, "ensureRepository", () => configureRemoteCredentials(E, baseDir, l !== void 0));
  if (alwaysFetch) await fetchAndCheckout(E, source.ref, skipReset, T, l);
  else if (T && !source.ref) onDebug("[byoc:git] Using prefetched repo as-is (no ref requested)");
  else if (T && source.ref) {
    if (targetBranch && (await remoteBranchExists(E, targetBranch)))
      return (
        onDebug(`[byoc:git] Task branch ${targetBranch} exists on remote, fetching it`),
        await fetchAndForceCheckout(E, targetBranch, T),
        onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`),
        { repoExisted: T }
      );
    if (await localRefExists(E, source.ref))
      (onDebug(`[byoc:git] Ref ${source.ref} resolves locally, skipping fetch`),
        await runGit(E, E.repoPath, ["checkout", "--progress", "--force", source.ref]));
    else await fetchAndCheckout(E, source.ref, !1, T);
  } else await fetchAndCheckout(E, source.ref, !1, T);
  if (targetBranch) await checkoutTargetBranch(E, targetBranch, T);
  return (onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`), { repoExisted: T });
}
//@ chunk-t3sg9e26.js:13156-13323 placement
function reportGitPhase(e, n, t, r) {
  e.onDebug(`[byoc:git] phase ${n} ${t}ms${r ? " " + jsonStringify(r) : ""}`);
  try {
    e.onPhase?.(n, t, r);
  } catch (error) {
    e.onDebug(`[byoc:git] onPhase callback threw: ${G(error)}`);
  }
}
//@ chunk-t3sg9e26.js:13323-13410 placement
async function ke(e, n, t, r) {
  let now = Date.now(),
    o = await t();
  return (reportGitPhase(e, n, Date.now() - now, r), o);
}
/**
 * 仓库访问失败分类：原因代码到可读说明的映射、git 错误行到原因的正则表，以及"其他 HTTP 状态码"排除规则。
 */
//@ chunk-t3sg9e26.js:13410-14310 placement
var REPO_ACCESS_FAILURE_LABELS = {
    repo_not_found_or_no_permission: "repository not found or no permission",
    no_credentials: "no credentials for the repository's git host",
    authentication_failed: "authentication failed",
    blocked_by_git_proxy: "blocked by the git proxy",
  },
  REPO_ACCESS_FAILURE_PATTERNS = [
    [/^fatal: repository '.*' not found$/, "repo_not_found_or_no_permission"],
    [
      /^fatal: unable to access '.*': the requested url returned error: 404$/,
      "repo_not_found_or_no_permission",
    ],
    [/^error: repository not found\.?$/, "repo_not_found_or_no_permission"],
    [/^fatal: could not read (username|password) for /, "no_credentials"],
    [/^fatal: authentication failed for /, "authentication_failed"],
    [/^fatal: unable to access '.*': the requested url returned error: 401$/, "authentication_failed"],
    [/^\S+@\S+: permission denied \(publickey(,[a-z0-9,-]+)?\)\.?$/, "authentication_failed"],
  ],
  OTHER_HTTP_ERROR_REGEX = /^fatal: unable to access '.*': the requested url returned error: (?!40[14]$)\d+$/;
/**
 * 把仓库访问失败的 git 错误输出归类：经 git 代理时识别"代理拒绝访问"，否则按已知错误行模式匹配原因（看门狗超时、输出过长或含排除行时不归类）。
 */
//@ chunk-t3sg9e26.js:14310-14694 placement
function classifyRepoAccessFailure(e, n) {
  if (/^git \S+ failed \(watchdog:/.test(e)) return;
  let replaced = e.replace(/^git \S+ failed: /, "");
  if (replaced.length >= ae) return;
  let mapped = replaced
    .toLowerCase()
    .split(
      `
`,
    )
    .map((s) => s.trim());
  if (n)
    return mapped.some((s) => s.startsWith("remote: access denied by the git proxy"))
      ? "blocked_by_git_proxy"
      : void 0;
  if (mapped.some((s) => OTHER_HTTP_ERROR_REGEX.test(s))) return;
  for (let [s, o] of REPO_ACCESS_FAILURE_PATTERNS) if (mapped.some((a) => s.test(a))) return o;
  return;
}
//@ chunk-t3sg9e26.js:14694-15255 placement
class RepositoryAccessError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  denial;
  throttle;
  repository;
  constructor(e, n, t) {
    super(
      `Repository access validation failed after ${$e} attempts: ${G(e)}`,
      "Repository access validation failed",
    );
    this.name = "RepositoryAccessError";
    let r = URL.canParse(t.gitURL) ? new URL(t.gitURL) : void 0;
    ((this.repository = {
      repo: t.repo,
      address:
        r !== void 0 && (r.protocol === "https:" || r.protocol === "http:") && r.hostname !== ""
          ? { scheme: r.protocol.slice(0, -1), host: r.hostname, port: r.port || void 0 }
          : void 0,
    }),
      (this.denial = classifyRepoAccessFailure(G(e), n)),
      (this.throttle =
        this.denial === void 0 ? classifyFetchRefusal(G(e), t.lastAttemptExitCode, t.gitURL) : void 0));
  }
}
//@ chunk-t3sg9e26.js:15255-15808 placement
async function validateRepositoryAccess(e, n, t) {
  let r = 2000 + Math.random() * 2000,
    s,
    o = {};
  for (let a = 0; a < $e; a++) {
    if (a > 0) {
      let c = t && classifyFetchRefusal(G(s), o.exitCode, e.gitURL) !== void 0,
        d = r * (1 << (a - 1)) * (c ? Ht : 1);
      (e.onDebug(`[byoc:git] Validation retry ${a + 1}/${$e}, backing off ${Math.round(d)}ms`),
        await sleep(d, e.signal, { throwOnAbort: !0 }));
    }
    o = {};
    try {
      if ((await runGit(e, "", ["ls-remote", "--heads", e.authURL, "HEAD"], void 0, void 0, o), a > 0))
        e.onDebug(`[byoc:git] Validation succeeded on attempt ${a + 1}`);
      return;
    } catch (error) {
      s = error;
    }
  }
  throw new RepositoryAccessError(s, e.getAuthToken !== void 0, {
    repo: n,
    gitURL: e.gitURL,
    lastAttemptExitCode: o.exitCode,
  });
}
//@ chunk-t3sg9e26.js:15808-16080 placement
function staleMountPushInsteadOfKey(e) {
  let match = e.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.pushinsteadof) (\S+)$/i);
  if (!match) return;
  let [, t, r, s] = match,
    o = s.match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1],
    a;
  try {
    a = new URL(r).pathname;
  } catch {
    return;
  }
  if (o === void 0 || !a.endsWith(`/${o}`)) return;
  return t;
}
//@ chunk-t3sg9e26.js:16080-16122 placement
var CLAUDE_CODE_SESSION_ACCESS_TOKEN = "CLAUDE_CODE_SESSION_ACCESS_TOKEN";
//@ chunk-t3sg9e26.js:16122-16299 placement
function sessionTokenCredentialHelper(e) {
  let match = e.trim().match(/^(credential\.(https?:\/\/[^\s@]+)\.helper) (.+)$/i);
  if (!match) return;
  let [, t, r, s] = match;
  return s === FVn(CLAUDE_CODE_SESSION_ACCESS_TOKEN) ? { key: t, base: r.replace(/\/+$/, "") } : void 0;
}
//@ chunk-t3sg9e26.js:16299-16564 placement
function staleMountInsteadOfKey(e, n) {
  let match = e.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.insteadof) (\S+)$/i);
  if (!match) return;
  let [, r, s, o] = match,
    a = o.replace(/\.git$/i, "").match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1];
  if (a === void 0) return;
  return n.some((c) => s === `${c}/${a}`) ? r : void 0;
}
/**
 * 配置远程凭据助手，删除过期的 git-mount 凭据助手
 */
//@ chunk-t3sg9e26.js:16564-18738 placement
async function configureRemoteCredentials(e, n, t) {
  let r = {};
  if (
    e.originURL === e.authURL
      ? await runGit(
          e,
          e.repoPath,
          ["--git-dir", join(e.repoPath, ".git"), "remote", "set-url", "origin", e.authURL],
          void 0,
          void 0,
          r,
        ).then(
          () => !0,
          () => !1,
        )
      : await writeRemoteOriginUrl(e)
  ) {
    await runGit(e, e.repoPath, [
      "--git-dir",
      join(e.repoPath, ".git"),
      "config",
      "--unset-all",
      "remote.origin.pushurl",
    ]).catch(() => {});
    let o = await runGit(e, e.repoPath, [
      "--git-dir",
      join(e.repoPath, ".git"),
      "config",
      "--local",
      "--get-regexp",
      "^url\\..*\\.pushinsteadof$",
    ]).catch(() => "");
    for (let u of o.split(`
`)) {
      let h = staleMountPushInsteadOfKey(u);
      if (h === void 0) continue;
      (await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        h,
      ]).catch(() => {}),
        e.onDebug(
          `[byoc:git] Dropped a stale git-mount push rewrite (${redactUrlCredentials(h)}) from ${e.repoPath}`,
        ));
    }
    let a = await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--get-regexp",
        "^credential\\..*\\.helper$",
      ]).catch(() => ""),
      c = new Set(),
      d = [];
    for (let u of a.split(`
`)) {
      let h = sessionTokenCredentialHelper(u);
      if (h !== void 0 && !c.has(h.key)) (c.add(h.key), d.push(h.base));
    }
    if (d.length > 0) {
      let u = await runGit(e, e.repoPath, [
          "--git-dir",
          join(e.repoPath, ".git"),
          "config",
          "--local",
          "--get-regexp",
          "^url\\..*\\.insteadof$",
        ]).catch(() => ""),
        h = new Set();
      for (let y of u.split(`
`)) {
        let f = staleMountInsteadOfKey(y, d);
        if (f === void 0 || h.has(f)) continue;
        (h.add(f),
          await runGit(e, e.repoPath, [
            "--git-dir",
            join(e.repoPath, ".git"),
            "config",
            "--local",
            "--unset-all",
            f,
          ]).catch(() => {}),
          e.onDebug(
            `[byoc:git] Dropped a stale git-mount fetch rewrite (${redactUrlCredentials(f)}) from ${e.repoPath}`,
          ));
      }
    }
    for (let u of c)
      (await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        u,
      ]).catch(() => {}),
        e.onDebug(
          `[byoc:git] Dropped a stale git-mount credential helper (${redactUrlCredentials(u)}) from ${e.repoPath}`,
        ));
    return (
      await normalizeRemoteOriginFetch(e),
      e.onDebug(`[byoc:git] Prefetched repo found at ${e.repoPath}`),
      !0
    );
  }
  return (
    e.onDebug(`[byoc:git] No prefetched repo, fresh init at ${e.repoPath}`),
    await withBoundedTimeout(
      mkdir(n, { recursive: !0 }),
      de,
      `[runner:stuck] mkdir ${n} (check NFS/CSI mount health)`,
    ),
    await runGit(e, "", ["init", ...(e.initWithoutTemplate ? ["--template="] : []), e.repoPath]),
    await runGit(e, e.repoPath, ["config", "gc.auto", "0"]).catch(() => {}),
    await runGit(e, e.repoPath, ["remote", "add", "origin", e.originURL]).catch(() =>
      runGit(e, e.repoPath, ["remote", "set-url", "origin", e.originURL]),
    ),
    await normalizeRemoteOriginFetch(e),
    !1
  );
}
/**
 * 写 origin URL 的重试次数与间隔，以及隔离用户/系统 git 配置的环境变量组合。
 */
//@ chunk-t3sg9e26.js:18738-18946 placement
var ORIGIN_URL_WRITE_TRIES = 7,
  ORIGIN_URL_RETRY_BASE_MS = 100,
  HERMETIC_GIT_CONFIG_ENV = {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_PARAMETERS: "",
  },
  ISOLATED_HOME_ENV = { GIT_CONFIG_GLOBAL: "/dev/null", HOME: rDn(), XDG_CONFIG_HOME: rDn() },
  HERMETIC_GIT_ENV = { ...HERMETIC_GIT_CONFIG_ENV, ...ISOLATED_HOME_ENV };
/**
 * 读取裸仓库配置项（如 remote.origin.url）：键不存在返回 undefined，其他失败抛出带修复建议的错误。
 */
//@ chunk-t3sg9e26.js:18946-19377 placement
async function readGitConfigOrThrow(e, n, t, r) {
  let s = {};
  return runGit(e, "", ["--git-dir", n, "config", ...t], r, void 0, s).catch((o) => {
    if (s.exitCode === 1) return;
    if (e.signal?.aborted) throw o;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not read remote.origin.url from ${n}/config (${G(o)}). The clone was left as it is: repair that file, or remove the clone when no session is using it; the next session will clone it again.`,
      "Could not read remote.origin.url of the repository's clone",
    );
  });
}
//@ chunk-t3sg9e26.js:19377-20581 placement
async function writeRemoteOriginUrl(e) {
  let n = join(e.repoPath, ".git"),
    t = await readGitConfigOrThrow(e, n, ["--get-all", "remote.origin.url"]);
  if (t === void 0) {
    if (
      (await readGitConfigOrThrow(e, n, ["--get-regexp", "^remote\\.origin\\."], HERMETIC_GIT_CONFIG_ENV)) ===
      void 0
    )
      return !1;
    let o = {};
    if (
      !(await runGit(
        e,
        "",
        ["--git-dir", n, "config", "--get-regexp", "^remote\\.origin\\."],
        HERMETIC_GIT_ENV,
        void 0,
        o,
      ).then(
        () => !0,
        (c) => {
          if (e.signal?.aborted) throw c;
          return o.exitCode !== 1 || o.wroteStderr !== !1;
        },
      ))
    )
      return !1;
  }
  let filtered = (t ?? "")
    .split(
      `
`,
    )
    .filter((s) => s.length > 0);
  if (filtered.length === 1 && filtered[0] === e.originURL) return !0;
  for (let s = 1; ; s++) {
    let o = await runGit(e, e.repoPath, [
      "--git-dir",
      n,
      "config",
      "--replace-all",
      "remote.origin.url",
      e.originURL,
    ]).then(
      () => {
        return;
      },
      (a) => a ?? Error("git config failed"),
    );
    if (o === void 0)
      return (
        e.onDebug(
          `[byoc:git] remote.origin.url in ${e.repoPath} did not hold the upstream address; corrected`,
        ),
        !0
      );
    if (e.signal?.aborted) throw o;
    if (s === ORIGIN_URL_WRITE_TRIES)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not correct remote.origin.url in ${n}/config after ${ORIGIN_URL_WRITE_TRIES} tries over about six seconds (${G(o)}). The clone was left as it is; if that error says "could not lock config file" and "File exists", and no git is running there, remove ${n}/config.lock.`,
        "Could not write remote.origin.url of the repository's clone",
      );
    await sleep(ORIGIN_URL_RETRY_BASE_MS * 2 ** (s - 1), e.signal, { throwOnAbort: !0 });
  }
}
//@ chunk-t3sg9e26.js:20581-21060 placement
async function normalizeRemoteOriginFetch(e) {
  if (e.originURL !== e.authURL) {
    let filtered = (
      await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--get-all",
        "remote.origin.fetch",
      ]).catch(() => "")
    )
      .split(
        `
`,
      )
      .filter((t) => /^\+?refs\/heads\//.test(t));
    if (filtered.length > 0 && filtered.every((t) => t === LVn)) return;
  }
  await runGit(e, e.repoPath, [
    "--git-dir",
    join(e.repoPath, ".git"),
    "config",
    "--replace-all",
    "remote.origin.fetch",
    LVn,
    "^\\+?refs/heads/",
  ]).catch((n) => e.onDebug(`[byoc:git] Could not normalize remote.origin.fetch: ${G(n)}`));
}
//@ chunk-t3sg9e26.js:21060-21320 placement
function prepFetchRemote(e) {
  if (e.originURL === e.authURL) return { configArgs: [], remote: "origin" };
  let n = `claude-runner-prep-${randomUUID()}`,
    t = httpsProxyFromEnv();
  return {
    configArgs: [
      "-c",
      `remote.${n}.url=${e.authURL}`,
      "-c",
      `remote.${n}.fetch=${LVn}`,
      ...(t ? ["-c", `remote.${n}.proxy=${t}`] : []),
    ],
    remote: n,
  };
}
//@ chunk-t3sg9e26.js:21320-22981 placement
async function fetchAndCheckout(e, n, t, r, s) {
  let o = n || "HEAD",
    a = () => {
      let b = prepFetchRemote(e);
      return [...b.configArgs, "fetch", ...Je(r), "--progress", "--no-tags", ...[], b.remote, o];
    },
    c = !t && Yt(),
    d = !1,
    u =
      c &&
      !d &&
      (await runGit(e, e.repoPath, ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], { ...V }).then(
        () => !0,
        () => !1,
      )),
    h = !1,
    y = await fetchWithRetry(e, a, async () => ((h = await isRemoteEmpty(e)), !h), r && nt());
  if (h) {
    if ((e.onDebug("[byoc:git] Repository is empty, skipping checkout"), e.sanitized)) {
      let b = join(e.repoPath, ".git"),
        P = {};
      await runGit(e, e.repoPath, ["--git-dir", b, "read-tree", "HEAD"], { ...V }, Mt, P).then(
        e.sanitized.onIndexFromHead,
        async (v) => {
          if (
            (e.signal?.throwIfAborted(),
            e.onDebug(`[byoc:git] Could not read HEAD into the index: ${G(v)}`),
            typeof P.exitCode !== "number" || P.exitCode > 128)
          )
            await unlink(join(b, "index.lock")).catch(() => {});
        },
      );
    }
    return;
  }
  if (!y) throw Error(`git fetch failed for ${e.gitURL}`);
  if (
    (await runGit(e, e.repoPath, ["update-ref", "refs/remotes/origin/HEAD", "FETCH_HEAD^{commit}"], {
      ...V,
    }).catch((b) => e.onDebug(`[byoc:git] Could not set origin/HEAD: ${G(b)}`)),
    t)
  ) {
    e.onDebug("[byoc:git] Fetched to FETCH_HEAD, skipping reset-hard (worktree mode)");
    return;
  }
  let f = () => runGit(e, e.repoPath, ["update-ref", "--no-deref", "HEAD", "HEAD"], { ...V }).catch(() => {}),
    R = () =>
      runGit(e, e.repoPath, [
        "-c",
        "core.checkStat=minimal",
        "-c",
        "core.trustctime=false",
        "reset",
        "--hard",
        "FETCH_HEAD^{commit}",
      ]);
  if (!u) await f();
  await ke(
    e,
    "reset",
    async () => {
      if (u)
        try {
          await runGit(e, e.repoPath, [
            "-c",
            "core.checkStat=minimal",
            "-c",
            "core.trustctime=false",
            "checkout",
            "-q",
            "--progress",
            "--detach",
            "FETCH_HEAD^{commit}",
          ]);
          return;
        } catch (error) {
          if (e.signal?.aborted) throw error;
          (e.onDebug(`[byoc:git] Delta reset failed, falling back to reset --hard: ${G(error)}`), await f());
        }
      await R();
    },
    d ? { delta_reset: "withheld" } : void 0,
  );
}
//@ chunk-t3sg9e26.js:22981-23143 placement
function slowFetchConfigArgs(e, n) {
  let t = [];
  if (n && e < tt) t.push("-c", `http.lowSpeedLimit=${Vt}`, "-c", `http.lowSpeedTime=${Bt}`);
  if (e >= 3) t.push("-c", "http.version=HTTP/1.1");
  return t;
}
//@ chunk-t3sg9e26.js:23143-23197 placement
function un(e, n, t, r, s) {
  return runGit(e, e.repoPath, n, t, r, s);
}
/**
 * 带重试与总时长上限的 git fetch
 */
//@ chunk-t3sg9e26.js:23197-25534 placement
async function fetchWithRetry(e, n, t, r = !1, s = un) {
  let now = Date.now(),
    a = 4000 + Math.random() * 4000,
    c = r && xt(),
    d = 0,
    u,
    h,
    y = [],
    f = (l) => (l.length <= xe ? l : truncateToLength(l, We) + "\u2026" + takeLastChars(l, xe - We - 1)),
    R = () => (y.length > 0 ? { attempt_errors: jsonStringify(y) } : {}),
    b = 0,
    P = 0,
    v = (l) => ({
      failfast_aborts: String(b),
      client_aborts: String(P),
      ...(l?.transferBytes !== void 0 && { pack_bytes: String(l.transferBytes) }),
      ...(l?.sawServerProgress === !0 && { server_progress: "true" }),
    });
  for (let l = 0; l < ie; l++) {
    if (l > 0) {
      let N = a * (1 << (l - 1));
      (e.onDebug(`[byoc:git] Fetch retry ${l + 1}/${ie}, backing off ${Math.round(N)}ms`),
        await sleep(N, e.signal, { throwOnAbort: !0 }));
    }
    let T = [...slowFetchConfigArgs(l, r), ...(typeof n === "function" ? n() : n)],
      z = l === ie - 1 || (c && l === oe - 1 && d === oe - 1) ? { GIT_TRACE_PACKET: "1" } : void 0,
      k = {};
    try {
      let N = se - (Date.now() - now);
      if ((await s(e, T, z, Math.max(1, N), k), l > 0))
        e.onDebug(`[byoc:git] Fetch succeeded on attempt ${l + 1}`);
      return (reportGitPhase(e, "fetch", Date.now() - now, { attempts: String(l + 1), ...v(k), ...R() }), !0);
    } catch (error) {
      ((u = error), (h = k.exitCode));
      let O = G(error);
      (e.onDebug(`[byoc:git] Fetch attempt ${l + 1} failed: ${O}`), y.push(f(redactSecretsInText(O))));
      let Q = r && l < tt && isCurlTimeoutOnly(O);
      if (k.killReason !== void 0) P++;
      else if (Q) b++;
      if (
        ((d =
          (Q || k.killReason === "silence" || k.killReason === "escalated") &&
          !k.sawClientProgress &&
          !k.sawRemoteActivity
            ? d + 1
            : 0),
        Date.now() - now >= se)
      ) {
        if (
          (e.onDebug(
            `[byoc:git] Fetch cumulative wall-clock ${Date.now() - now}ms \u2265 hard cap \u2014 not retrying`,
          ),
          reportGitPhase(e, "fetch", Date.now() - now, {
            attempts: String(l + 1),
            hard_cap: "true",
            ...v(),
            ...R(),
          }),
          NVn(O))
        )
          throw new FetchRefNotFoundError(O);
        throw Error(`git fetch failed (cumulative hard cap after ${l + 1} attempts): ${O}`);
      }
      if (t && NVn(O) && !(await t())) return !1;
      if (NVn(O))
        throw (
          e.onDebug(
            "[byoc:git] Fetch error is permanent (ref not found on a non-empty remote) \u2014 skipping remaining retries",
          ),
          reportGitPhase(e, "fetch", Date.now() - now, {
            attempts: String(l + 1),
            permanent: "true",
            ...v(),
            ...R(),
          }),
          new FetchRefNotFoundError(O)
        );
      if (c && l === oe - 1 && d === oe)
        throw (
          e.onDebug(
            `[byoc:git] Fetch remote mute on all ${oe} attempts (no progress, no remote activity) \u2014 giving up so the session can be reassigned`,
          ),
          reportGitPhase(e, "fetch", Date.now() - now, {
            attempts: String(l + 1),
            exhausted: "true",
            giveup: "mute",
            ...v(),
            ...R(),
          }),
          Error(
            `git fetch failed after ${l + 1} mute attempts (no progress, no remote activity; giving up early for reassignment): ${O}`,
          )
        );
    }
  }
  reportGitPhase(e, "fetch", Date.now() - now, { attempts: String(ie), exhausted: "true", ...v(), ...R() });
  let A = `git fetch failed after ${ie} attempts: ${G(u)}`,
    E = classifyFetchRefusal(G(u), h, e.gitURL);
  if (E !== void 0) throw new FetchThrottledError(A, E);
  throw Error(A);
}
//@ chunk-t3sg9e26.js:25534-25999 placement
async function checkoutTargetBranch(e, n, t) {
  if ((await runGit(e, e.repoPath, ["branch", "--show-current"]).catch(() => "")).trim() === n) {
    e.onDebug(`[byoc:git] Already on target branch ${n}`);
    return;
  }
  if (await remoteBranchExists(e, n))
    (e.onDebug("[byoc:git] Target branch exists on remote, fetching"), await fetchAndForceCheckout(e, n, t));
  else
    (e.onDebug(`[byoc:git] Creating local branch ${n} from HEAD`),
      await runGit(e, e.repoPath, ["checkout", "-B", n]),
      await runGit(e, e.repoPath, ["update-ref", `refs/remotes/origin/${n}`, "HEAD"], { ...V }).catch(
        () => {},
      ));
}
//@ chunk-t3sg9e26.js:25999-26212 placement
async function fetchAndForceCheckout(e, n, t) {
  (await fetchWithRetry(
    e,
    () => {
      let r = prepFetchRemote(e);
      return [...r.configArgs, "fetch", ...Je(t), "--progress", r.remote, n];
    },
    void 0,
    t && nt(),
  ),
    await runGit(e, e.repoPath, ["checkout", "--progress", "--force", "-B", n, "FETCH_HEAD"]));
}
//@ chunk-t3sg9e26.js:26212-26353 placement
async function remoteBranchExists(e, n) {
  try {
    return (
      (await runGit(e, e.repoPath, ["ls-remote", "--heads", e.authURL, `refs/heads/${n}`])).trim().length > 0
    );
  } catch {
    return !1;
  }
}
//@ chunk-t3sg9e26.js:26353-26472 placement
async function localRefExists(e, n) {
  try {
    return (await runGit(e, e.repoPath, ["rev-parse", "--verify", "--quiet", n], { ...V }), !0);
  } catch {
    return !1;
  }
}
//@ chunk-t3sg9e26.js:26472-26597 placement
async function isRemoteEmpty(e) {
  try {
    return (await runGit(e, e.repoPath, ["ls-remote", "--symref", e.authURL, "HEAD"])).trim() === "";
  } catch {
    return !1;
  }
}

export { $0r, prepareRepositories, RepositoryAccessError, REPO_ACCESS_FAILURE_LABELS, ISOLATED_HOME_ENV, me };
