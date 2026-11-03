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
  DEFAULT_SERVER_PROGRESS_CAP_MS,
  MAX_SERVER_PROGRESS_CAP_MS,
  getUpstreamUrl,
  MAX_GIT_OUTPUT_TAIL_CHARS,
  VALIDATION_MAX_ATTEMPTS,
  classifyFetchRefusal,
  THROTTLE_BACKOFF_MULTIPLIER,
  FILESYSTEM_OP_TIMEOUT_MS,
  DEFAULT_FETCH_REFSPEC,
  fetchDepthArgs,
  isDeltaResetEnabled,
  LOCKED_GIT_ENV,
  isFailFastFetchEnabled,
  READ_TREE_TIMEOUT_MS,
  SLOW_FETCH_CONFIG_AFTER_ATTEMPT,
  HTTP_LOW_SPEED_LIMIT_BPS,
  HTTP_LOW_SPEED_TIME_S,
  isStallGiveUpEnabled,
  MAX_ERROR_TEXT_CHARS,
  ERROR_TEXT_HEAD_CHARS,
  FETCH_MAX_ATTEMPTS,
  MUTE_GIVEUP_ATTEMPTS,
  isCurlTimeoutOnly,
  isFetchRefNotFound,
  FetchRefNotFoundError,
  FetchThrottledError,
} from "./fetchErrors.js";
import { runGit } from "./fetchRun.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorText, redactUrlCredentials } from "./tokenRedact.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { sleep } from "../../utils/sleep.js";
import { tokenCredentialHelperArgs, httpsProxyFromEnv } from "./gitCredentials.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { nullDevicePath } from "../../utils/gitSafeExec.js";
import { truncateToLength, takeLastChars } from "../../utils/stringUtils.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";

//@ chunk-t3sg9e26.js:1004-1014 placement
var REPOSITORY_PREPARE_CONCURRENCY = 50;
//@ chunk-t3sg9e26.js:10294-10757 placement
/**
 * BYOC 会话开始前逐个准备代码仓库：跳过不支持的来源类型，按 outcome 里给出的目标分支调用 prepareRepository（默认跳过 reset），记录耗时遥测。
 */
async function prepareRepositories(e) {
  let {
    baseDir,
    sources,
    outcomes,
    skipValidation,
    alwaysFetch,
    skipReset,
    initWithoutTemplate,
    onDebug,
    onPhase,
    onProgress,
    signal,
  } = e;
  let f = outcomeBranchesByRepo(outcomes ?? []);
  for (let source of sources) {
    if (!isPreparableRepoType(source.type)) {
      onDebug(`[byoc:git] Skipping unsupported source type: ${source.type}`);
      continue;
    }
    await prepareRepositoryTimed({
      baseDir,
      source,
      targetBranch: f.get(source.repo),
      skipValidation: skipValidation ?? false,
      alwaysFetch: alwaysFetch ?? false,
      skipReset: skipReset ?? true,
      initWithoutTemplate: initWithoutTemplate ?? false,
      onDebug,
      onPhase,
      onProgress,
      signal,
    });
  }
}
//@ chunk-t3sg9e26.js:10757-10828 placement
/**
 * 导出函数 `isPreparableRepoType`：参数 e，返回 e === "github" || e === "github-ssh" || e === "test-file"。
 */
function isPreparableRepoType(type) {
  return type === "github" || type === "github-ssh" || type === "test-file";
}
//@ chunk-t3sg9e26.js:10828-11050 placement
async function prepareRepositoryTimed(e) {
  let now = Date.now();
  try {
    let { repoExisted } = await prepareRepository(e);
    logFeatureOk("byoc_git_prepare_repo", {
      repo_existed: repoExisted,
      duration_ms: Date.now() - now,
    });
  } catch (error) {
    logFeatureBad("byoc_git_prepare_repo", "error", {
      duration_ms: Date.now() - now,
    });
    throw error;
  }
}
//@ chunk-t3sg9e26.js:11050-13156 placement
/**
 * BYOC 准备仓库：解析目录/引用/目标分支，读取进度上限配置
 */
async function prepareRepository(e) {
  let {
    baseDir,
    source,
    targetBranch,
    skipValidation,
    alwaysFetch,
    skipReset,
    initWithoutTemplate,
    onDebug,
    onPhase,
    onProgress,
    signal,
  } = e;
  let repositoryUrl = resolveRepositoryUrl(source);
  let R = source.getAuthToken ? repositoryUrl : withTokenInUrl(repositoryUrl, source.token);
  let b = repoCheckoutDir(baseDir, source);
  if (!b) throw Error(`Could not determine repository directory for: ${source.repo}`);
  if (source.ref && !isSafeRefName(source.ref)) throw Error(`Invalid ref: ${source.ref}`);
  if (targetBranch && !isSafeRefName(targetBranch)) throw Error(`Invalid target branch: ${targetBranch}`);
  let now = Date.now();
  onDebug(
    `[byoc:git] Preparing ${source.repo} at ${b} (ref=${source.ref ?? "HEAD"}, auth=${source.getAuthToken ? "git-proxy" : R !== repositoryUrl})`,
  );
  let { invalid } = resolveFetchDepth();
  if (invalid !== undefined)
    onDebug(
      `[byoc:git] Ignoring CLAUDE_RUNNER_FETCH_DEPTH='${invalid}' \u2014 expected 'full', '0', or a positive integer; using default ${REPOSITORY_PREPARE_CONCURRENCY}`,
    );
  let serverProgressCap = resolveServerProgressCap();
  if (serverProgressCap.invalid !== undefined)
    onDebug(
      `[byoc:git] Ignoring CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS='${serverProgressCap.invalid}' \u2014 expected a positive integer (milliseconds), '0' or 'off'; using default ${DEFAULT_SERVER_PROGRESS_CAP_MS}`,
    );
  else if (serverProgressCap.clamped !== undefined)
    onDebug(
      `[byoc:git] CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS='${serverProgressCap.clamped}' is ${serverProgressCap.capMs === MAX_SERVER_PROGRESS_CAP_MS ? "above the thirty-minute ceiling" : "below the two-minute floor"}; using ${serverProgressCap.capMs} ms`,
    );
  let E = {
    repoPath: b,
    gitURL: repositoryUrl,
    authURL: R,
    originURL: getUpstreamUrl(source) ?? R,
    token: source.token,
    getAuthToken: source.getAuthToken,
    governedMount: source.governedMount,
    gitEnvironment: source.gitEnvironment,
    sanitized: source.sanitized,
    initWithoutTemplate,
    onDebug,
    onPhase,
    onProgress,
    signal,
  };
  let l = undefined;
  if (!skipValidation)
    await measureGitPhase(E, "validateAccess", () =>
      validateRepositoryAccess(E, source.repo, source.skippedIfThrottled === true),
    );
  let T = await measureGitPhase(E, "ensureRepository", () =>
    configureRemoteCredentials(E, baseDir, l !== undefined),
  );
  if (alwaysFetch) await fetchAndCheckout(E, source.ref, skipReset, T, l);
  else if (T && !source.ref) onDebug("[byoc:git] Using prefetched repo as-is (no ref requested)");
  else if (T && source.ref) {
    if (targetBranch && (await remoteBranchExists(E, targetBranch))) {
      onDebug(`[byoc:git] Task branch ${targetBranch} exists on remote, fetching it`);
      await fetchAndForceCheckout(E, targetBranch, T);
      onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`);
      return {
        repoExisted: T,
      };
    }
    if (await localRefExists(E, source.ref)) {
      onDebug(`[byoc:git] Ref ${source.ref} resolves locally, skipping fetch`);
      await runGit(E, E.repoPath, ["checkout", "--progress", "--force", source.ref]);
    } else await fetchAndCheckout(E, source.ref, false, T);
  } else await fetchAndCheckout(E, source.ref, false, T);
  if (targetBranch) await checkoutTargetBranch(E, targetBranch, T);
  onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`);
  return {
    repoExisted: T,
  };
}
//@ chunk-t3sg9e26.js:13156-13323 placement
function reportGitPhase(e, n, t, r) {
  e.onDebug(`[byoc:git] phase ${n} ${t}ms${r ? " " + jsonStringify(r) : ""}`);
  try {
    e.onPhase?.(n, t, r);
  } catch (error) {
    e.onDebug(`[byoc:git] onPhase callback threw: ${errorText(error)}`);
  }
}
//@ chunk-t3sg9e26.js:13323-13410 placement
async function measureGitPhase(e, n, t, r) {
  let now = Date.now();
  let o = await t();
  reportGitPhase(e, n, Date.now() - now, r);
  return o;
}
//@ chunk-t3sg9e26.js:13410-14310 placement
/**
 * 仓库访问失败分类：原因代码到可读说明的映射、git 错误行到原因的正则表，以及"其他 HTTP 状态码"排除规则。
 */
var REPO_ACCESS_FAILURE_LABELS = {
  repo_not_found_or_no_permission: "repository not found or no permission",
  no_credentials: "no credentials for the repository's git host",
  authentication_failed: "authentication failed",
  blocked_by_git_proxy: "blocked by the git proxy",
};
var REPO_ACCESS_FAILURE_PATTERNS = [
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
];
var OTHER_HTTP_ERROR_REGEX =
  /^fatal: unable to access '.*': the requested url returned error: (?!40[14]$)\d+$/;
//@ chunk-t3sg9e26.js:14310-14694 placement
/**
 * 把仓库访问失败的 git 错误输出归类：经 git 代理时识别"代理拒绝访问"，否则按已知错误行模式匹配原因（看门狗超时、输出过长或含排除行时不归类）。
 */
function classifyRepoAccessFailure(e, n) {
  if (/^git \S+ failed \(watchdog:/.test(e)) return;
  let replaced = e.replace(/^git \S+ failed: /, "");
  if (replaced.length >= MAX_GIT_OUTPUT_TAIL_CHARS) return;
  let mapped = replaced
    .toLowerCase()
    .split(
      `
`,
    )
    .map((line) => line.trim());
  if (n)
    return mapped.some((s) => s.startsWith("remote: access denied by the git proxy"))
      ? "blocked_by_git_proxy"
      : undefined;
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
      `Repository access validation failed after ${VALIDATION_MAX_ATTEMPTS} attempts: ${errorText(e)}`,
      "Repository access validation failed",
    );
    this.name = "RepositoryAccessError";
    let r = URL.canParse(t.gitURL) ? new URL(t.gitURL) : undefined;
    this.repository = {
      repo: t.repo,
      address:
        r !== undefined && (r.protocol === "https:" || r.protocol === "http:") && r.hostname !== ""
          ? {
              scheme: r.protocol.slice(0, -1),
              host: r.hostname,
              port: r.port || undefined,
            }
          : undefined,
    };
    this.denial = classifyRepoAccessFailure(errorText(e), n);
    this.throttle =
      this.denial === undefined
        ? classifyFetchRefusal(errorText(e), t.lastAttemptExitCode, t.gitURL)
        : undefined;
  }
}
//@ chunk-t3sg9e26.js:15255-15808 placement
async function validateRepositoryAccess(e, repo, t) {
  let r = 2000 + Math.random() * 2000;
  let s;
  let o = {};
  for (let j = 0; j < VALIDATION_MAX_ATTEMPTS; j++) {
    if (j > 0) {
      let c = t && classifyFetchRefusal(errorText(s), o.exitCode, e.gitURL) !== undefined;
      let d = r * (1 << (j - 1)) * (c ? THROTTLE_BACKOFF_MULTIPLIER : 1);
      e.onDebug(
        `[byoc:git] Validation retry ${j + 1}/${VALIDATION_MAX_ATTEMPTS}, backing off ${Math.round(d)}ms`,
      );
      await sleep(d, e.signal, {
        throwOnAbort: true,
      });
    }
    o = {};
    try {
      await runGit(e, "", ["ls-remote", "--heads", e.authURL, "HEAD"], undefined, undefined, o);
      if (j > 0) e.onDebug(`[byoc:git] Validation succeeded on attempt ${j + 1}`);
      return;
    } catch (error) {
      s = error;
    }
  }
  throw new RepositoryAccessError(s, e.getAuthToken !== undefined, {
    repo,
    gitURL: e.gitURL,
    lastAttemptExitCode: o.exitCode,
  });
}
//@ chunk-t3sg9e26.js:15808-16080 placement
function staleMountPushInsteadOfKey(line) {
  let match = line.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.pushinsteadof) (\S+)$/i);
  if (!match) return;
  let [, t, r, s] = match;
  let o = s.match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1];
  let a;
  try {
    a = new URL(r).pathname;
  } catch {
    return;
  }
  if (o === undefined || !a.endsWith(`/${o}`)) return;
  return t;
}
//@ chunk-t3sg9e26.js:16080-16122 placement
var CLAUDE_CODE_SESSION_ACCESS_TOKEN = "CLAUDE_CODE_SESSION_ACCESS_TOKEN";
//@ chunk-t3sg9e26.js:16122-16299 placement
function sessionTokenCredentialHelper(line) {
  let match = line.trim().match(/^(credential\.(https?:\/\/[^\s@]+)\.helper) (.+)$/i);
  if (!match) return;
  let [, t, r, s] = match;
  return s === tokenCredentialHelperArgs(CLAUDE_CODE_SESSION_ACCESS_TOKEN)
    ? {
        key: t,
        base: r.replace(/\/+$/, ""),
      }
    : undefined;
}
//@ chunk-t3sg9e26.js:16299-16564 placement
function staleMountInsteadOfKey(line, n) {
  let match = line.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.insteadof) (\S+)$/i);
  if (!match) return;
  let [, r, s, o] = match;
  let a = o.replace(/\.git$/i, "").match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1];
  if (a === undefined) return;
  return n.some((c) => s === `${c}/${a}`) ? r : undefined;
}
//@ chunk-t3sg9e26.js:16564-18738 placement
/**
 * 配置远程凭据助手，删除过期的 git-mount 凭据助手
 */
async function configureRemoteCredentials(e, baseDir, t) {
  let r = {};
  if (
    e.originURL === e.authURL
      ? await runGit(
          e,
          e.repoPath,
          ["--git-dir", join(e.repoPath, ".git"), "remote", "set-url", "origin", e.authURL],
          undefined,
          undefined,
          r,
        ).then(
          () => true,
          () => false,
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
    for (let line of o.split(`
`)) {
      let h = staleMountPushInsteadOfKey(line);
      if (h === undefined) continue;
      await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        h,
      ]).catch(() => {});
      e.onDebug(
        `[byoc:git] Dropped a stale git-mount push rewrite (${redactUrlCredentials(h)}) from ${e.repoPath}`,
      );
    }
    let a = await runGit(e, e.repoPath, [
      "--git-dir",
      join(e.repoPath, ".git"),
      "config",
      "--local",
      "--get-regexp",
      "^credential\\..*\\.helper$",
    ]).catch(() => "");
    let c = new Set();
    let d = [];
    for (let line of a.split(`
`)) {
      let h = sessionTokenCredentialHelper(line);
      if (h !== undefined && !c.has(h.key)) {
        c.add(h.key);
        d.push(h.base);
      }
    }
    if (d.length > 0) {
      let u = await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--get-regexp",
        "^url\\..*\\.insteadof$",
      ]).catch(() => "");
      let h = new Set();
      for (let line of u.split(`
`)) {
        let f = staleMountInsteadOfKey(line, d);
        if (f === undefined || h.has(f)) continue;
        h.add(f);
        await runGit(e, e.repoPath, [
          "--git-dir",
          join(e.repoPath, ".git"),
          "config",
          "--local",
          "--unset-all",
          f,
        ]).catch(() => {});
        e.onDebug(
          `[byoc:git] Dropped a stale git-mount fetch rewrite (${redactUrlCredentials(f)}) from ${e.repoPath}`,
        );
      }
    }
    for (let u of c) {
      await runGit(e, e.repoPath, [
        "--git-dir",
        join(e.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        u,
      ]).catch(() => {});
      e.onDebug(
        `[byoc:git] Dropped a stale git-mount credential helper (${redactUrlCredentials(u)}) from ${e.repoPath}`,
      );
    }
    await normalizeRemoteOriginFetch(e);
    e.onDebug(`[byoc:git] Prefetched repo found at ${e.repoPath}`);
    return true;
  }
  e.onDebug(`[byoc:git] No prefetched repo, fresh init at ${e.repoPath}`);
  await withBoundedTimeout(
    mkdir(baseDir, {
      recursive: true,
    }),
    FILESYSTEM_OP_TIMEOUT_MS,
    `[runner:stuck] mkdir ${baseDir} (check NFS/CSI mount health)`,
  );
  await runGit(e, "", ["init", ...(e.initWithoutTemplate ? ["--template="] : []), e.repoPath]);
  await runGit(e, e.repoPath, ["config", "gc.auto", "0"]).catch(() => {});
  await runGit(e, e.repoPath, ["remote", "add", "origin", e.originURL]).catch(() =>
    runGit(e, e.repoPath, ["remote", "set-url", "origin", e.originURL]),
  );
  await normalizeRemoteOriginFetch(e);
  return false;
}
//@ chunk-t3sg9e26.js:18738-18946 placement
/**
 * 写 origin URL 的重试次数与间隔，以及隔离用户/系统 git 配置的环境变量组合。
 */
var ORIGIN_URL_WRITE_TRIES = 7;
var ORIGIN_URL_RETRY_BASE_MS = 100;
var HERMETIC_GIT_CONFIG_ENV = {
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_COUNT: "0",
  GIT_CONFIG_PARAMETERS: "",
};
var ISOLATED_HOME_ENV = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  HOME: nullDevicePath(),
  XDG_CONFIG_HOME: nullDevicePath(),
};
var HERMETIC_GIT_ENV = {
  ...HERMETIC_GIT_CONFIG_ENV,
  ...ISOLATED_HOME_ENV,
};
//@ chunk-t3sg9e26.js:18946-19377 placement
/**
 * 读取裸仓库配置项（如 remote.origin.url）：键不存在返回 undefined，其他失败抛出带修复建议的错误。
 */
async function readGitConfigOrThrow(e, n, t, r) {
  let s = {};
  return runGit(e, "", ["--git-dir", n, "config", ...t], r, undefined, s).catch((error) => {
    if (s.exitCode === 1) return;
    if (e.signal?.aborted) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not read remote.origin.url from ${n}/config (${errorText(error)}). The clone was left as it is: repair that file, or remove the clone when no session is using it; the next session will clone it again.`,
      "Could not read remote.origin.url of the repository's clone",
    );
  });
}
//@ chunk-t3sg9e26.js:19377-20581 placement
async function writeRemoteOriginUrl(e) {
  let n = join(e.repoPath, ".git");
  let gitConfigOrThrow = await readGitConfigOrThrow(e, n, ["--get-all", "remote.origin.url"]);
  if (gitConfigOrThrow === undefined) {
    if (
      (await readGitConfigOrThrow(e, n, ["--get-regexp", "^remote\\.origin\\."], HERMETIC_GIT_CONFIG_ENV)) ===
      undefined
    )
      return false;
    let o = {};
    if (
      !(await runGit(
        e,
        "",
        ["--git-dir", n, "config", "--get-regexp", "^remote\\.origin\\."],
        HERMETIC_GIT_ENV,
        undefined,
        o,
      ).then(
        () => true,
        (error) => {
          if (e.signal?.aborted) throw error;
          return o.exitCode !== 1 || o.wroteStderr !== false;
        },
      ))
    )
      return false;
  }
  let filtered = (gitConfigOrThrow ?? "")
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.length === 1 && filtered[0] === e.originURL) return true;
  for (let j = 1; ; j++) {
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
      (error) => error ?? Error("git config failed"),
    );
    if (o === undefined) {
      e.onDebug(`[byoc:git] remote.origin.url in ${e.repoPath} did not hold the upstream address; corrected`);
      return true;
    }
    if (e.signal?.aborted) throw o;
    if (j === ORIGIN_URL_WRITE_TRIES)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not correct remote.origin.url in ${n}/config after ${ORIGIN_URL_WRITE_TRIES} tries over about six seconds (${errorText(o)}). The clone was left as it is; if that error says "could not lock config file" and "File exists", and no git is running there, remove ${n}/config.lock.`,
        "Could not write remote.origin.url of the repository's clone",
      );
    await sleep(ORIGIN_URL_RETRY_BASE_MS * 2 ** (j - 1), e.signal, {
      throwOnAbort: true,
    });
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
      .filter((line) => /^\+?refs\/heads\//.test(line));
    if (filtered.length > 0 && filtered.every((t) => t === DEFAULT_FETCH_REFSPEC)) return;
  }
  await runGit(e, e.repoPath, [
    "--git-dir",
    join(e.repoPath, ".git"),
    "config",
    "--replace-all",
    "remote.origin.fetch",
    DEFAULT_FETCH_REFSPEC,
    "^\\+?refs/heads/",
  ]).catch((error) => e.onDebug(`[byoc:git] Could not normalize remote.origin.fetch: ${errorText(error)}`));
}
//@ chunk-t3sg9e26.js:21060-21320 placement
function prepFetchRemote(e) {
  if (e.originURL === e.authURL)
    return {
      configArgs: [],
      remote: "origin",
    };
  let n = `claude-runner-prep-${randomUUID()}`;
  let t = httpsProxyFromEnv();
  return {
    configArgs: [
      "-c",
      `remote.${n}.url=${e.authURL}`,
      "-c",
      `remote.${n}.fetch=${DEFAULT_FETCH_REFSPEC}`,
      ...(t ? ["-c", `remote.${n}.proxy=${t}`] : []),
    ],
    remote: n,
  };
}
//@ chunk-t3sg9e26.js:21320-22981 placement
async function fetchAndCheckout(e, ref, t, r, s) {
  let o = ref || "HEAD";
  let a = () => {
    let b = prepFetchRemote(e);
    return [...b.configArgs, "fetch", ...fetchDepthArgs(r), "--progress", "--no-tags", ...[], b.remote, o];
  };
  let c = !t && isDeltaResetEnabled();
  let d = false;
  let u =
    c &&
    !d &&
    (await runGit(e, e.repoPath, ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], {
      ...LOCKED_GIT_ENV,
    }).then(
      () => true,
      () => false,
    ));
  let h = false;
  let y = await fetchWithRetry(
    e,
    a,
    async () => {
      h = await isRemoteEmpty(e);
      return !h;
    },
    r && isFailFastFetchEnabled(),
  );
  if (h) {
    e.onDebug("[byoc:git] Repository is empty, skipping checkout");
    if (e.sanitized) {
      let b = join(e.repoPath, ".git");
      let P = {};
      await runGit(
        e,
        e.repoPath,
        ["--git-dir", b, "read-tree", "HEAD"],
        {
          ...LOCKED_GIT_ENV,
        },
        READ_TREE_TIMEOUT_MS,
        P,
      ).then(e.sanitized.onIndexFromHead, async (error) => {
        e.signal?.throwIfAborted();
        e.onDebug(`[byoc:git] Could not read HEAD into the index: ${errorText(error)}`);
        if (typeof P.exitCode !== "number" || P.exitCode > 128)
          await unlink(join(b, "index.lock")).catch(() => {});
      });
    }
    return;
  }
  if (!y) throw Error(`git fetch failed for ${e.gitURL}`);
  await runGit(e, e.repoPath, ["update-ref", "refs/remotes/origin/HEAD", "FETCH_HEAD^{commit}"], {
    ...LOCKED_GIT_ENV,
  }).catch((error) => e.onDebug(`[byoc:git] Could not set origin/HEAD: ${errorText(error)}`));
  if (t) {
    e.onDebug("[byoc:git] Fetched to FETCH_HEAD, skipping reset-hard (worktree mode)");
    return;
  }
  let f = () =>
    runGit(e, e.repoPath, ["update-ref", "--no-deref", "HEAD", "HEAD"], {
      ...LOCKED_GIT_ENV,
    }).catch(() => {});
  let R = () =>
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
  await measureGitPhase(
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
          e.onDebug(`[byoc:git] Delta reset failed, falling back to reset --hard: ${errorText(error)}`);
          await f();
        }
      await R();
    },
    d
      ? {
          delta_reset: "withheld",
        }
      : undefined,
  );
}
//@ chunk-t3sg9e26.js:22981-23143 placement
function slowFetchConfigArgs(e, n) {
  let t = [];
  if (n && e < SLOW_FETCH_CONFIG_AFTER_ATTEMPT)
    t.push(
      "-c",
      `http.lowSpeedLimit=${HTTP_LOW_SPEED_LIMIT_BPS}`,
      "-c",
      `http.lowSpeedTime=${HTTP_LOW_SPEED_TIME_S}`,
    );
  if (e >= 3) t.push("-c", "http.version=HTTP/1.1");
  return t;
}
//@ chunk-t3sg9e26.js:23143-23197 placement
function runGitInRepo(e, n, t, r, s) {
  return runGit(e, e.repoPath, n, t, r, s);
}
//@ chunk-t3sg9e26.js:23197-25534 placement
/**
 * 带重试与总时长上限的 git fetch
 */
async function fetchWithRetry(e, n, t, r = false, s = runGitInRepo) {
  let now = Date.now();
  let a = 4000 + Math.random() * 4000;
  let c = r && isStallGiveUpEnabled();
  let d = 0;
  let u;
  let h;
  let y = [];
  let f = (l) =>
    l.length <= MAX_ERROR_TEXT_CHARS
      ? l
      : truncateToLength(l, ERROR_TEXT_HEAD_CHARS) +
        "\u2026" +
        takeLastChars(l, MAX_ERROR_TEXT_CHARS - ERROR_TEXT_HEAD_CHARS - 1);
  let R = () =>
    y.length > 0
      ? {
          attempt_errors: jsonStringify(y),
        }
      : {};
  let b = 0;
  let P = 0;
  let v = (l) => ({
    failfast_aborts: String(b),
    client_aborts: String(P),
    ...(l?.transferBytes !== undefined && {
      pack_bytes: String(l.transferBytes),
    }),
    ...(l?.sawServerProgress === true && {
      server_progress: "true",
    }),
  });
  for (let j = 0; j < FETCH_MAX_ATTEMPTS; j++) {
    if (j > 0) {
      let N = a * (1 << (j - 1));
      e.onDebug(`[byoc:git] Fetch retry ${j + 1}/${FETCH_MAX_ATTEMPTS}, backing off ${Math.round(N)}ms`);
      await sleep(N, e.signal, {
        throwOnAbort: true,
      });
    }
    let T = [...slowFetchConfigArgs(j, r), ...(typeof n === "function" ? n() : n)];
    let z =
      j === FETCH_MAX_ATTEMPTS - 1 || (c && j === MUTE_GIVEUP_ATTEMPTS - 1 && d === MUTE_GIVEUP_ATTEMPTS - 1)
        ? {
            GIT_TRACE_PACKET: "1",
          }
        : undefined;
    let k = {};
    try {
      let N = MAX_SERVER_PROGRESS_CAP_MS - (Date.now() - now);
      await s(e, T, z, Math.max(1, N), k);
      if (j > 0) e.onDebug(`[byoc:git] Fetch succeeded on attempt ${j + 1}`);
      reportGitPhase(e, "fetch", Date.now() - now, {
        attempts: String(j + 1),
        ...v(k),
        ...R(),
      });
      return true;
    } catch (error) {
      u = error;
      h = k.exitCode;
      let O = errorText(error);
      e.onDebug(`[byoc:git] Fetch attempt ${j + 1} failed: ${O}`);
      y.push(f(redactSecretsInText(O)));
      let Q = r && j < SLOW_FETCH_CONFIG_AFTER_ATTEMPT && isCurlTimeoutOnly(O);
      if (k.killReason !== undefined) P++;
      else if (Q) b++;
      d =
        (Q || k.killReason === "silence" || k.killReason === "escalated") &&
        !k.sawClientProgress &&
        !k.sawRemoteActivity
          ? d + 1
          : 0;
      if (Date.now() - now >= MAX_SERVER_PROGRESS_CAP_MS) {
        e.onDebug(
          `[byoc:git] Fetch cumulative wall-clock ${Date.now() - now}ms \u2265 hard cap \u2014 not retrying`,
        );
        reportGitPhase(e, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          hard_cap: "true",
          ...v(),
          ...R(),
        });
        if (isFetchRefNotFound(O)) throw new FetchRefNotFoundError(O);
        throw Error(`git fetch failed (cumulative hard cap after ${j + 1} attempts): ${O}`);
      }
      if (t && isFetchRefNotFound(O) && !(await t())) return false;
      if (isFetchRefNotFound(O)) {
        e.onDebug(
          "[byoc:git] Fetch error is permanent (ref not found on a non-empty remote) \u2014 skipping remaining retries",
        );
        reportGitPhase(e, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          permanent: "true",
          ...v(),
          ...R(),
        });
        throw new FetchRefNotFoundError(O);
      }
      if (c && j === MUTE_GIVEUP_ATTEMPTS - 1 && d === MUTE_GIVEUP_ATTEMPTS) {
        e.onDebug(
          `[byoc:git] Fetch remote mute on all ${MUTE_GIVEUP_ATTEMPTS} attempts (no progress, no remote activity) \u2014 giving up so the session can be reassigned`,
        );
        reportGitPhase(e, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          exhausted: "true",
          giveup: "mute",
          ...v(),
          ...R(),
        });
        throw Error(
          `git fetch failed after ${j + 1} mute attempts (no progress, no remote activity; giving up early for reassignment): ${O}`,
        );
      }
    }
  }
  reportGitPhase(e, "fetch", Date.now() - now, {
    attempts: String(FETCH_MAX_ATTEMPTS),
    exhausted: "true",
    ...v(),
    ...R(),
  });
  let A = `git fetch failed after ${FETCH_MAX_ATTEMPTS} attempts: ${errorText(u)}`;
  let throttle = classifyFetchRefusal(errorText(u), h, e.gitURL);
  if (throttle !== undefined) throw new FetchThrottledError(A, throttle);
  throw Error(A);
}
//@ chunk-t3sg9e26.js:25534-25999 placement
async function checkoutTargetBranch(e, targetBranch, t) {
  if ((await runGit(e, e.repoPath, ["branch", "--show-current"]).catch(() => "")).trim() === targetBranch) {
    e.onDebug(`[byoc:git] Already on target branch ${targetBranch}`);
    return;
  }
  if (await remoteBranchExists(e, targetBranch)) {
    e.onDebug("[byoc:git] Target branch exists on remote, fetching");
    await fetchAndForceCheckout(e, targetBranch, t);
  } else {
    e.onDebug(`[byoc:git] Creating local branch ${targetBranch} from HEAD`);
    await runGit(e, e.repoPath, ["checkout", "-B", targetBranch]);
    await runGit(e, e.repoPath, ["update-ref", `refs/remotes/origin/${targetBranch}`, "HEAD"], {
      ...LOCKED_GIT_ENV,
    }).catch(() => {});
  }
}
//@ chunk-t3sg9e26.js:25999-26212 placement
async function fetchAndForceCheckout(e, n, t) {
  await fetchWithRetry(
    e,
    () => {
      let r = prepFetchRemote(e);
      return [...r.configArgs, "fetch", ...fetchDepthArgs(t), "--progress", r.remote, n];
    },
    undefined,
    t && isFailFastFetchEnabled(),
  );
  await runGit(e, e.repoPath, ["checkout", "--progress", "--force", "-B", n, "FETCH_HEAD"]);
}
//@ chunk-t3sg9e26.js:26212-26353 placement
async function remoteBranchExists(e, n) {
  try {
    return (
      (await runGit(e, e.repoPath, ["ls-remote", "--heads", e.authURL, `refs/heads/${n}`])).trim().length > 0
    );
  } catch {
    return false;
  }
}
//@ chunk-t3sg9e26.js:26353-26472 placement
async function localRefExists(e, ref) {
  try {
    await runGit(e, e.repoPath, ["rev-parse", "--verify", "--quiet", ref], {
      ...LOCKED_GIT_ENV,
    });
    return true;
  } catch {
    return false;
  }
}
//@ chunk-t3sg9e26.js:26472-26597 placement
async function isRemoteEmpty(e) {
  try {
    return (await runGit(e, e.repoPath, ["ls-remote", "--symref", e.authURL, "HEAD"])).trim() === "";
  } catch {
    return false;
  }
}
export {
  isPreparableRepoType,
  prepareRepositories,
  RepositoryAccessError,
  REPO_ACCESS_FAILURE_LABELS,
  ISOLATED_HOME_ENV,
  REPOSITORY_PREPARE_CONCURRENCY,
};
