/**
 * selfHostedRunner/git/repoPrepare.ts
 *
 * BYOC 准备仓库：访问校验、remote 配置、fetch/checkout（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rzkdv0c6.js (30)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rzkdv0c6.js:1003-1013 placement
var REPOSITORY_PREPARE_CONCURRENCY = 50;
//@ chunk-rzkdv0c6.js:10293-10756 placement
/**
 * BYOC 会话开始前逐个准备代码仓库：跳过不支持的来源类型，按 outcome 里给出的目标分支调用 prepareRepository（默认跳过 reset），记录耗时遥测。
 */
async function prepareRepositories(options) {
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
  } = options;
  let branchesByRepo = outcomeBranchesByRepo(outcomes ?? []);
  for (let source of sources) {
    if (!isPreparableRepoType(source.type)) {
      onDebug(`[byoc:git] Skipping unsupported source type: ${source.type}`);
      continue;
    }
    await prepareRepositoryTimed({
      baseDir,
      source,
      targetBranch: branchesByRepo.get(source.repo),
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
//@ chunk-rzkdv0c6.js:10756-10827 placement
/**
 * 导出函数 `isPreparableRepoType`：参数 e，返回 e === "github" || e === "github-ssh" || e === "test-file"。
 */
function isPreparableRepoType(type) {
  return type === "github" || type === "github-ssh" || type === "test-file";
}
//@ chunk-rzkdv0c6.js:10827-11049 placement
async function prepareRepositoryTimed(options) {
  let now = Date.now();
  try {
    let { repoExisted } = await prepareRepository(options);
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
//@ chunk-rzkdv0c6.js:11049-13155 placement
/**
 * BYOC 准备仓库：解析目录/引用/目标分支，读取进度上限配置
 */
async function prepareRepository(options) {
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
  } = options;
  let url = resolveRepositoryUrl(source);
  let authUrl = source.getAuthToken ? url : withTokenInUrl(url, source.token);
  let repoPath = repoCheckoutDir(baseDir, source);
  if (!repoPath) throw Error(`Could not determine repository directory for: ${source.repo}`);
  if (source.ref && !isSafeRefName(source.ref)) throw Error(`Invalid ref: ${source.ref}`);
  if (targetBranch && !isSafeRefName(targetBranch)) throw Error(`Invalid target branch: ${targetBranch}`);
  let now = Date.now();
  onDebug(
    `[byoc:git] Preparing ${source.repo} at ${repoPath} (ref=${source.ref ?? "HEAD"}, auth=${source.getAuthToken ? "git-proxy" : authUrl !== url})`,
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
  let gitEnv = {
    repoPath,
    gitURL: url,
    authURL: authUrl,
    originURL: getUpstreamUrl(source) ?? authUrl,
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
  let fetchError = undefined;
  if (!skipValidation)
    await measureGitPhase(gitEnv, "validateAccess", () =>
      validateRepositoryAccess(gitEnv, source.repo, source.skippedIfThrottled === true),
    );
  let prepareResult = await measureGitPhase(gitEnv, "ensureRepository", () =>
    configureRemoteCredentials(gitEnv, baseDir, fetchError !== undefined),
  );
  if (alwaysFetch) await fetchAndCheckout(gitEnv, source.ref, skipReset, prepareResult, fetchError);
  else if (prepareResult && !source.ref) onDebug("[byoc:git] Using prefetched repo as-is (no ref requested)");
  else if (prepareResult && source.ref) {
    if (targetBranch && (await remoteBranchExists(gitEnv, targetBranch))) {
      onDebug(`[byoc:git] Task branch ${targetBranch} exists on remote, fetching it`);
      await fetchAndForceCheckout(gitEnv, targetBranch, prepareResult);
      onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`);
      return {
        repoExisted: prepareResult,
      };
    }
    if (await localRefExists(gitEnv, source.ref)) {
      onDebug(`[byoc:git] Ref ${source.ref} resolves locally, skipping fetch`);
      await runGit(gitEnv, gitEnv.repoPath, ["checkout", "--progress", "--force", source.ref]);
    } else await fetchAndCheckout(gitEnv, source.ref, false, prepareResult);
  } else await fetchAndCheckout(gitEnv, source.ref, false, prepareResult);
  if (targetBranch) await checkoutTargetBranch(gitEnv, targetBranch, prepareResult);
  onDebug(`[byoc:git] Ready: ${source.repo} (${Date.now() - now}ms)`);
  return {
    repoExisted: prepareResult,
  };
}
//@ chunk-rzkdv0c6.js:13155-13322 placement
function reportGitPhase(ctx, phase, durationMs, details) {
  ctx.onDebug(`[byoc:git] phase ${phase} ${durationMs}ms${details ? " " + jsonStringify(details) : ""}`);
  try {
    ctx.onPhase?.(phase, durationMs, details);
  } catch (error) {
    ctx.onDebug(`[byoc:git] onPhase callback threw: ${errorText(error)}`);
  }
}
//@ chunk-rzkdv0c6.js:13322-13409 placement
async function measureGitPhase(ctx, phase, run, details) {
  let now = Date.now();
  let result = await run();
  reportGitPhase(ctx, phase, Date.now() - now, details);
  return result;
}
//@ chunk-rzkdv0c6.js:13409-14309 placement
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
//@ chunk-rzkdv0c6.js:14309-14693 placement
/**
 * 把仓库访问失败的 git 错误输出归类：经 git 代理时识别"代理拒绝访问"，否则按已知错误行模式匹配原因（看门狗超时、输出过长或含排除行时不归类）。
 */
function classifyRepoAccessFailure(text, checkProxyDenial) {
  if (/^git \S+ failed \(watchdog:/.test(text)) return;
  let replaced = text.replace(/^git \S+ failed: /, "");
  if (replaced.length >= MAX_GIT_OUTPUT_TAIL_CHARS) return;
  let mapped = replaced
    .toLowerCase()
    .split(
      `
`,
    )
    .map((line) => line.trim());
  if (checkProxyDenial)
    return mapped.some((line) => line.startsWith("remote: access denied by the git proxy"))
      ? "blocked_by_git_proxy"
      : undefined;
  if (mapped.some((line) => OTHER_HTTP_ERROR_REGEX.test(line))) return;
  for (let [pattern, reason] of REPO_ACCESS_FAILURE_PATTERNS)
    if (mapped.some((line) => pattern.test(line))) return reason;
  return;
}
//@ chunk-rzkdv0c6.js:14693-15254 placement
let RepositoryAccessError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rzkdv0c6.js:14693", () => {
  RepositoryAccessError = class RepositoryAccessError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    denial;
    throttle;
    repository;
    constructor(cause, denial, repository) {
      super(
        `Repository access validation failed after ${VALIDATION_MAX_ATTEMPTS} attempts: ${errorText(cause)}`,
        "Repository access validation failed",
      );
      this.name = "RepositoryAccessError";
      let repoUrl = URL.canParse(repository.gitURL) ? new URL(repository.gitURL) : undefined;
      this.repository = {
        repo: repository.repo,
        address:
          repoUrl !== undefined &&
          (repoUrl.protocol === "https:" || repoUrl.protocol === "http:") &&
          repoUrl.hostname !== ""
            ? {
                scheme: repoUrl.protocol.slice(0, -1),
                host: repoUrl.hostname,
                port: repoUrl.port || undefined,
              }
            : undefined,
      };
      this.denial = classifyRepoAccessFailure(errorText(cause), denial);
      this.throttle =
        this.denial === undefined
          ? classifyFetchRefusal(errorText(cause), repository.lastAttemptExitCode, repository.gitURL)
          : undefined;
    }
  };
});
//@ chunk-rzkdv0c6.js:15254-15807 placement
async function validateRepositoryAccess(ctx, repo, checkRefusal) {
  let baseDelayMs = 2000 + Math.random() * 2000;
  let lastError;
  let lastInfo = {};
  for (let j = 0; j < VALIDATION_MAX_ATTEMPTS; j++) {
    if (j > 0) {
      let throttled =
        checkRefusal &&
        classifyFetchRefusal(errorText(lastError), lastInfo.exitCode, ctx.gitURL) !== undefined;
      let delayMs = baseDelayMs * (1 << (j - 1)) * (throttled ? THROTTLE_BACKOFF_MULTIPLIER : 1);
      ctx.onDebug(
        `[byoc:git] Validation retry ${j + 1}/${VALIDATION_MAX_ATTEMPTS}, backing off ${Math.round(delayMs)}ms`,
      );
      await sleep(delayMs, ctx.signal, {
        throwOnAbort: true,
      });
    }
    lastInfo = {};
    try {
      await runGit(ctx, "", ["ls-remote", "--heads", ctx.authURL, "HEAD"], undefined, undefined, lastInfo);
      if (j > 0) ctx.onDebug(`[byoc:git] Validation succeeded on attempt ${j + 1}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw new RepositoryAccessError(lastError, ctx.getAuthToken !== undefined, {
    repo,
    gitURL: ctx.gitURL,
    lastAttemptExitCode: lastInfo.exitCode,
  });
}
//@ chunk-rzkdv0c6.js:15807-16079 placement
function staleMountPushInsteadOfKey(line) {
  let match = line.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.pushinsteadof) (\S+)$/i);
  if (!match) return;
  let [, key, url, value] = match;
  let pathPart = value.match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1];
  let urlPath;
  try {
    urlPath = new URL(url).pathname;
  } catch {
    return;
  }
  if (pathPart === undefined || !urlPath.endsWith(`/${pathPart}`)) return;
  return key;
}
//@ chunk-rzkdv0c6.js:16079-16121 placement
var CLAUDE_CODE_SESSION_ACCESS_TOKEN = "CLAUDE_CODE_SESSION_ACCESS_TOKEN";
//@ chunk-rzkdv0c6.js:16121-16298 placement
function sessionTokenCredentialHelper(line) {
  let match = line.trim().match(/^(credential\.(https?:\/\/[^\s@]+)\.helper) (.+)$/i);
  if (!match) return;
  let [, key, url, value] = match;
  return value === tokenCredentialHelperArgs(CLAUDE_CODE_SESSION_ACCESS_TOKEN)
    ? {
        key,
        base: url.replace(/\/+$/, ""),
      }
    : undefined;
}
//@ chunk-rzkdv0c6.js:16298-16563 placement
function staleMountInsteadOfKey(line, mountBases) {
  let match = line.trim().match(/^(url\.(https?:\/\/[^\s@]+)\.insteadof) (\S+)$/i);
  if (!match) return;
  let [, key, url, value] = match;
  let pathPart = value.replace(/\.git$/i, "").match(/^https?:\/\/([^/@\s]+\/[^/\s]+\/[^/\s]+)$/i)?.[1];
  if (pathPart === undefined) return;
  return mountBases.some((base) => url === `${base}/${pathPart}`) ? key : undefined;
}
//@ chunk-rzkdv0c6.js:16563-18737 placement
/**
 * 配置远程凭据助手，删除过期的 git-mount 凭据助手
 */
async function configureRemoteCredentials(ctx, baseDir, options) {
  let env = {};
  if (
    ctx.originURL === ctx.authURL
      ? await runGit(
          ctx,
          ctx.repoPath,
          ["--git-dir", join(ctx.repoPath, ".git"), "remote", "set-url", "origin", ctx.authURL],
          undefined,
          undefined,
          env,
        ).then(
          () => true,
          () => false,
        )
      : await writeRemoteOriginUrl(ctx)
  ) {
    await runGit(ctx, ctx.repoPath, [
      "--git-dir",
      join(ctx.repoPath, ".git"),
      "config",
      "--unset-all",
      "remote.origin.pushurl",
    ]).catch(() => {});
    let pushInsteadOfList = await runGit(ctx, ctx.repoPath, [
      "--git-dir",
      join(ctx.repoPath, ".git"),
      "config",
      "--local",
      "--get-regexp",
      "^url\\..*\\.pushinsteadof$",
    ]).catch(() => "");
    for (let line of pushInsteadOfList.split(`
`)) {
      let staleKey = staleMountPushInsteadOfKey(line);
      if (staleKey === undefined) continue;
      await runGit(ctx, ctx.repoPath, [
        "--git-dir",
        join(ctx.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        staleKey,
      ]).catch(() => {});
      ctx.onDebug(
        `[byoc:git] Dropped a stale git-mount push rewrite (${redactUrlCredentials(staleKey)}) from ${ctx.repoPath}`,
      );
    }
    let helperList = await runGit(ctx, ctx.repoPath, [
      "--git-dir",
      join(ctx.repoPath, ".git"),
      "config",
      "--local",
      "--get-regexp",
      "^credential\\..*\\.helper$",
    ]).catch(() => "");
    let helperKeys = new Set();
    let helperBases = [];
    for (let line of helperList.split(`
`)) {
      let helper = sessionTokenCredentialHelper(line);
      if (helper !== undefined && !helperKeys.has(helper.key)) {
        helperKeys.add(helper.key);
        helperBases.push(helper.base);
      }
    }
    if (helperBases.length > 0) {
      let insteadOfList = await runGit(ctx, ctx.repoPath, [
        "--git-dir",
        join(ctx.repoPath, ".git"),
        "config",
        "--local",
        "--get-regexp",
        "^url\\..*\\.insteadof$",
      ]).catch(() => "");
      let droppedKeys = new Set();
      for (let line of insteadOfList.split(`
`)) {
        let staleKey = staleMountInsteadOfKey(line, helperBases);
        if (staleKey === undefined || droppedKeys.has(staleKey)) continue;
        droppedKeys.add(staleKey);
        await runGit(ctx, ctx.repoPath, [
          "--git-dir",
          join(ctx.repoPath, ".git"),
          "config",
          "--local",
          "--unset-all",
          staleKey,
        ]).catch(() => {});
        ctx.onDebug(
          `[byoc:git] Dropped a stale git-mount fetch rewrite (${redactUrlCredentials(staleKey)}) from ${ctx.repoPath}`,
        );
      }
    }
    for (let helperKey of helperKeys) {
      await runGit(ctx, ctx.repoPath, [
        "--git-dir",
        join(ctx.repoPath, ".git"),
        "config",
        "--local",
        "--unset-all",
        helperKey,
      ]).catch(() => {});
      ctx.onDebug(
        `[byoc:git] Dropped a stale git-mount credential helper (${redactUrlCredentials(helperKey)}) from ${ctx.repoPath}`,
      );
    }
    await normalizeRemoteOriginFetch(ctx);
    ctx.onDebug(`[byoc:git] Prefetched repo found at ${ctx.repoPath}`);
    return true;
  }
  ctx.onDebug(`[byoc:git] No prefetched repo, fresh init at ${ctx.repoPath}`);
  await withBoundedTimeout(
    mkdir(baseDir, {
      recursive: true,
    }),
    FILESYSTEM_OP_TIMEOUT_MS,
    `[runner:stuck] mkdir ${baseDir} (check NFS/CSI mount health)`,
  );
  await runGit(ctx, "", ["init", ...(ctx.initWithoutTemplate ? ["--template="] : []), ctx.repoPath]);
  await runGit(ctx, ctx.repoPath, ["config", "gc.auto", "0"]).catch(() => {});
  await runGit(ctx, ctx.repoPath, ["remote", "add", "origin", ctx.originURL]).catch(() =>
    runGit(ctx, ctx.repoPath, ["remote", "set-url", "origin", ctx.originURL]),
  );
  await normalizeRemoteOriginFetch(ctx);
  return false;
}
//@ chunk-rzkdv0c6.js:18737-18945 placement
/**
 * 写 origin URL 的重试次数与间隔，以及隔离用户/系统 git 配置的环境变量组合。
 */
var ORIGIN_URL_WRITE_TRIES; // deferred: uses nullDevicePath (../../utils/gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var ORIGIN_URL_RETRY_BASE_MS;
var HERMETIC_GIT_CONFIG_ENV;
var ISOLATED_HOME_ENV;
var HERMETIC_GIT_ENV;
deferInit("chunk-rzkdv0c6.js:18737", () => {
  ORIGIN_URL_WRITE_TRIES = 7;
  ORIGIN_URL_RETRY_BASE_MS = 100;
  HERMETIC_GIT_CONFIG_ENV = {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_PARAMETERS: "",
  };
  ISOLATED_HOME_ENV = {
    GIT_CONFIG_GLOBAL: "/dev/null",
    HOME: nullDevicePath(),
    XDG_CONFIG_HOME: nullDevicePath(),
  };
  HERMETIC_GIT_ENV = {
    ...HERMETIC_GIT_CONFIG_ENV,
    ...ISOLATED_HOME_ENV,
  };
});
//@ chunk-rzkdv0c6.js:18945-19376 placement
/**
 * 读取裸仓库配置项（如 remote.origin.url）：键不存在返回 undefined，其他失败抛出带修复建议的错误。
 */
async function readGitConfigOrThrow(ctx, gitDir, args, env) {
  let target = {};
  return runGit(ctx, "", ["--git-dir", gitDir, "config", ...args], env, undefined, target).catch((error) => {
    if (target.exitCode === 1) return;
    if (ctx.signal?.aborted) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not read remote.origin.url from ${gitDir}/config (${errorText(error)}). The clone was left as it is: repair that file, or remove the clone when no session is using it; the next session will clone it again.`,
      "Could not read remote.origin.url of the repository's clone",
    );
  });
}
//@ chunk-rzkdv0c6.js:19376-20580 placement
async function writeRemoteOriginUrl(ctx) {
  let gitDir = join(ctx.repoPath, ".git");
  let gitConfigOrThrow = await readGitConfigOrThrow(ctx, gitDir, ["--get-all", "remote.origin.url"]);
  if (gitConfigOrThrow === undefined) {
    if (
      (await readGitConfigOrThrow(
        ctx,
        gitDir,
        ["--get-regexp", "^remote\\.origin\\."],
        HERMETIC_GIT_CONFIG_ENV,
      )) === undefined
    )
      return false;
    let configEntries = {};
    if (
      !(await runGit(
        ctx,
        "",
        ["--git-dir", gitDir, "config", "--get-regexp", "^remote\\.origin\\."],
        HERMETIC_GIT_ENV,
        undefined,
        configEntries,
      ).then(
        () => true,
        (error) => {
          if (ctx.signal?.aborted) throw error;
          return configEntries.exitCode !== 1 || configEntries.wroteStderr !== false;
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
  if (filtered.length === 1 && filtered[0] === ctx.originURL) return true;
  for (let j = 1; ; j++) {
    let readResult = await runGit(ctx, ctx.repoPath, [
      "--git-dir",
      gitDir,
      "config",
      "--replace-all",
      "remote.origin.url",
      ctx.originURL,
    ]).then(
      () => {
        return;
      },
      (error) => error ?? Error("git config failed"),
    );
    if (readResult === undefined) {
      ctx.onDebug(
        `[byoc:git] remote.origin.url in ${ctx.repoPath} did not hold the upstream address; corrected`,
      );
      return true;
    }
    if (ctx.signal?.aborted) throw readResult;
    if (j === ORIGIN_URL_WRITE_TRIES)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not correct remote.origin.url in ${gitDir}/config after ${ORIGIN_URL_WRITE_TRIES} tries over about six seconds (${errorText(readResult)}). The clone was left as it is; if that error says "could not lock config file" and "File exists", and no git is running there, remove ${gitDir}/config.lock.`,
        "Could not write remote.origin.url of the repository's clone",
      );
    await sleep(ORIGIN_URL_RETRY_BASE_MS * 2 ** (j - 1), ctx.signal, {
      throwOnAbort: true,
    });
  }
}
//@ chunk-rzkdv0c6.js:20580-21059 placement
async function normalizeRemoteOriginFetch(ctx) {
  if (ctx.originURL !== ctx.authURL) {
    let filtered = (
      await runGit(ctx, ctx.repoPath, [
        "--git-dir",
        join(ctx.repoPath, ".git"),
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
    if (filtered.length > 0 && filtered.every((refspec) => refspec === DEFAULT_FETCH_REFSPEC)) return;
  }
  await runGit(ctx, ctx.repoPath, [
    "--git-dir",
    join(ctx.repoPath, ".git"),
    "config",
    "--replace-all",
    "remote.origin.fetch",
    DEFAULT_FETCH_REFSPEC,
    "^\\+?refs/heads/",
  ]).catch((error) => ctx.onDebug(`[byoc:git] Could not normalize remote.origin.fetch: ${errorText(error)}`));
}
//@ chunk-rzkdv0c6.js:21059-21319 placement
function prepFetchRemote(ctx) {
  if (ctx.originURL === ctx.authURL)
    return {
      configArgs: [],
      remote: "origin",
    };
  let remote = `claude-runner-prep-${randomUUID()}`;
  let proxy = httpsProxyFromEnv();
  return {
    configArgs: [
      "-c",
      `remote.${remote}.url=${ctx.authURL}`,
      "-c",
      `remote.${remote}.fetch=${DEFAULT_FETCH_REFSPEC}`,
      ...(proxy ? ["-c", `remote.${remote}.proxy=${proxy}`] : []),
    ],
    remote,
  };
}
//@ chunk-rzkdv0c6.js:21319-22980 placement
async function fetchAndCheckout(ctx, ref, full, skipFirst, options) {
  let targetRef = ref || "HEAD";
  let buildArgs = () => {
    let remoteSpec = prepFetchRemote(ctx);
    return [
      ...remoteSpec.configArgs,
      "fetch",
      ...fetchDepthArgs(skipFirst),
      "--progress",
      "--no-tags",
      ...[],
      remoteSpec.remote,
      targetRef,
    ];
  };
  let deltaReset = !full && isDeltaResetEnabled();
  let resetDone = false;
  let ensureRemoteReady =
    deltaReset &&
    !resetDone &&
    (await runGit(ctx, ctx.repoPath, ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], {
      ...LOCKED_GIT_ENV,
    }).then(
      () => true,
      () => false,
    ));
  let remoteEmpty = false;
  let fetchResult = await fetchWithRetry(
    ctx,
    buildArgs,
    async () => {
      remoteEmpty = await isRemoteEmpty(ctx);
      return !remoteEmpty;
    },
    skipFirst && isFailFastFetchEnabled(),
  );
  if (remoteEmpty) {
    ctx.onDebug("[byoc:git] Repository is empty, skipping checkout");
    if (ctx.sanitized) {
      let gitDir = join(ctx.repoPath, ".git");
      let env = {};
      await runGit(
        ctx,
        ctx.repoPath,
        ["--git-dir", gitDir, "read-tree", "HEAD"],
        {
          ...LOCKED_GIT_ENV,
        },
        READ_TREE_TIMEOUT_MS,
        env,
      ).then(ctx.sanitized.onIndexFromHead, async (error) => {
        ctx.signal?.throwIfAborted();
        ctx.onDebug(`[byoc:git] Could not read HEAD into the index: ${errorText(error)}`);
        if (typeof env.exitCode !== "number" || env.exitCode > 128)
          await unlink(join(gitDir, "index.lock")).catch(() => {});
      });
    }
    return;
  }
  if (!fetchResult) throw Error(`git fetch failed for ${ctx.gitURL}`);
  await runGit(ctx, ctx.repoPath, ["update-ref", "refs/remotes/origin/HEAD", "FETCH_HEAD^{commit}"], {
    ...LOCKED_GIT_ENV,
  }).catch((error) => ctx.onDebug(`[byoc:git] Could not set origin/HEAD: ${errorText(error)}`));
  if (full) {
    ctx.onDebug("[byoc:git] Fetched to FETCH_HEAD, skipping reset-hard (worktree mode)");
    return;
  }
  let onReset = () =>
    runGit(ctx, ctx.repoPath, ["update-ref", "--no-deref", "HEAD", "HEAD"], {
      ...LOCKED_GIT_ENV,
    }).catch(() => {});
  let onFetch = () =>
    runGit(ctx, ctx.repoPath, [
      "-c",
      "core.checkStat=minimal",
      "-c",
      "core.trustctime=false",
      "reset",
      "--hard",
      "FETCH_HEAD^{commit}",
    ]);
  if (!ensureRemoteReady) await onReset();
  await measureGitPhase(
    ctx,
    "reset",
    async () => {
      if (ensureRemoteReady)
        try {
          await runGit(ctx, ctx.repoPath, [
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
          if (ctx.signal?.aborted) throw error;
          ctx.onDebug(`[byoc:git] Delta reset failed, falling back to reset --hard: ${errorText(error)}`);
          await onReset();
        }
      await onFetch();
    },
    resetDone
      ? {
          delta_reset: "withheld",
        }
      : undefined,
  );
}
//@ chunk-rzkdv0c6.js:22980-23142 placement
function slowFetchConfigArgs(attempt, enabled) {
  let args = [];
  if (enabled && attempt < SLOW_FETCH_CONFIG_AFTER_ATTEMPT)
    args.push(
      "-c",
      `http.lowSpeedLimit=${HTTP_LOW_SPEED_LIMIT_BPS}`,
      "-c",
      `http.lowSpeedTime=${HTTP_LOW_SPEED_TIME_S}`,
    );
  if (attempt >= 3) args.push("-c", "http.version=HTTP/1.1");
  return args;
}
//@ chunk-rzkdv0c6.js:23142-23196 placement
function runGitInRepo(ctx, args, options, capMs, extra) {
  return runGit(ctx, ctx.repoPath, args, options, capMs, extra);
}
//@ chunk-rzkdv0c6.js:23196-25535 placement
/**
 * 带重试与总时长上限的 git fetch
 */
async function fetchWithRetry(ctx, buildArgs, options, stallGiveUp = false, run = runGitInRepo) {
  let now = Date.now();
  let baseDelayMs = 4000 + Math.random() * 4000;
  let giveUpOnStall = stallGiveUp && isStallGiveUpEnabled();
  let attempt = 0;
  let progress;
  let lastError;
  let notes = [];
  let clip = (text) =>
    text.length <= MAX_ERROR_TEXT_CHARS
      ? text
      : truncateToLength(text, ERROR_TEXT_HEAD_CHARS) +
        "\u2026" +
        takeLastChars(text, MAX_ERROR_TEXT_CHARS - ERROR_TEXT_HEAD_CHARS - 1);
  let extraProps = () =>
    notes.length > 0
      ? {
          attempt_errors: jsonStringify(notes),
        }
      : {};
  let attempt_2 = 0;
  let throttleCount = 0;
  let buildThrottle = (throttle) => ({
    failfast_aborts: String(attempt_2),
    client_aborts: String(throttleCount),
    ...(throttle?.transferBytes !== undefined && {
      pack_bytes: String(throttle.transferBytes),
    }),
    ...(throttle?.sawServerProgress === true && {
      server_progress: "true",
    }),
  });
  for (let j = 0; j < FETCH_MAX_ATTEMPTS; j++) {
    if (j > 0) {
      let delayMs = baseDelayMs * (1 << (j - 1));
      ctx.onDebug(
        `[byoc:git] Fetch retry ${j + 1}/${FETCH_MAX_ATTEMPTS}, backing off ${Math.round(delayMs)}ms`,
      );
      await sleep(delayMs, ctx.signal, {
        throwOnAbort: true,
      });
    }
    let args = [
      ...slowFetchConfigArgs(j, stallGiveUp),
      ...(typeof buildArgs === "function" ? buildArgs() : buildArgs),
    ];
    let runOptions =
      j === FETCH_MAX_ATTEMPTS - 1 ||
      (giveUpOnStall && j === MUTE_GIVEUP_ATTEMPTS - 1 && attempt === MUTE_GIVEUP_ATTEMPTS - 1)
        ? {
            GIT_TRACE_PACKET: "1",
          }
        : undefined;
    let fetchOptions = {};
    try {
      let remainingCapMs = MAX_SERVER_PROGRESS_CAP_MS - (Date.now() - now);
      await run(ctx, args, runOptions, Math.max(1, remainingCapMs), fetchOptions);
      if (j > 0) ctx.onDebug(`[byoc:git] Fetch succeeded on attempt ${j + 1}`);
      reportGitPhase(ctx, "fetch", Date.now() - now, {
        attempts: String(j + 1),
        ...buildThrottle(fetchOptions),
        ...extraProps(),
      });
      return true;
    } catch (error) {
      progress = error;
      lastError = fetchOptions.exitCode;
      let detail = errorText(error);
      ctx.onDebug(`[byoc:git] Fetch attempt ${j + 1} failed: ${detail}`);
      notes.push(clip(redactSecretsInText(detail)));
      let retryWithSlowConfig =
        stallGiveUp && j < SLOW_FETCH_CONFIG_AFTER_ATTEMPT && isCurlTimeoutOnly(detail);
      if (fetchOptions.killReason !== undefined) throttleCount++;
      else if (retryWithSlowConfig) attempt_2++;
      attempt =
        (retryWithSlowConfig ||
          fetchOptions.killReason === "silence" ||
          fetchOptions.killReason === "escalated") &&
        !fetchOptions.sawClientProgress &&
        !fetchOptions.sawRemoteActivity
          ? attempt + 1
          : 0;
      if (Date.now() - now >= MAX_SERVER_PROGRESS_CAP_MS) {
        ctx.onDebug(
          `[byoc:git] Fetch cumulative wall-clock ${Date.now() - now}ms \u2265 hard cap \u2014 not retrying`,
        );
        reportGitPhase(ctx, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          hard_cap: "true",
          ...buildThrottle(),
          ...extraProps(),
        });
        if (isFetchRefNotFound(detail)) throw new FetchRefNotFoundError(detail);
        throw Error(`git fetch failed (cumulative hard cap after ${j + 1} attempts): ${detail}`);
      }
      if (options && isFetchRefNotFound(detail) && !(await options())) return false;
      if (isFetchRefNotFound(detail)) {
        ctx.onDebug(
          "[byoc:git] Fetch error is permanent (ref not found on a non-empty remote) \u2014 skipping remaining retries",
        );
        reportGitPhase(ctx, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          permanent: "true",
          ...buildThrottle(),
          ...extraProps(),
        });
        throw new FetchRefNotFoundError(detail);
      }
      if (giveUpOnStall && j === MUTE_GIVEUP_ATTEMPTS - 1 && attempt === MUTE_GIVEUP_ATTEMPTS) {
        ctx.onDebug(
          `[byoc:git] Fetch remote mute on all ${MUTE_GIVEUP_ATTEMPTS} attempts (no progress, no remote activity) \u2014 giving up so the session can be reassigned`,
        );
        reportGitPhase(ctx, "fetch", Date.now() - now, {
          attempts: String(j + 1),
          exhausted: "true",
          giveup: "mute",
          ...buildThrottle(),
          ...extraProps(),
        });
        throw Error(
          `git fetch failed after ${j + 1} mute attempts (no progress, no remote activity; giving up early for reassignment): ${detail}`,
        );
      }
    }
  }
  reportGitPhase(ctx, "fetch", Date.now() - now, {
    attempts: String(FETCH_MAX_ATTEMPTS),
    exhausted: "true",
    ...buildThrottle(),
    ...extraProps(),
  });
  let message = `git fetch failed after ${FETCH_MAX_ATTEMPTS} attempts: ${errorText(progress)}`;
  let throttle = classifyFetchRefusal(errorText(progress), lastError, ctx.gitURL);
  if (throttle !== undefined) throw new FetchThrottledError(message, throttle);
  throw Error(message);
}
//@ chunk-rzkdv0c6.js:25535-26000 placement
async function checkoutTargetBranch(ctx, targetBranch, options) {
  if (
    (await runGit(ctx, ctx.repoPath, ["branch", "--show-current"]).catch(() => "")).trim() === targetBranch
  ) {
    ctx.onDebug(`[byoc:git] Already on target branch ${targetBranch}`);
    return;
  }
  if (await remoteBranchExists(ctx, targetBranch)) {
    ctx.onDebug("[byoc:git] Target branch exists on remote, fetching");
    await fetchAndForceCheckout(ctx, targetBranch, options);
  } else {
    ctx.onDebug(`[byoc:git] Creating local branch ${targetBranch} from HEAD`);
    await runGit(ctx, ctx.repoPath, ["checkout", "-B", targetBranch]);
    await runGit(ctx, ctx.repoPath, ["update-ref", `refs/remotes/origin/${targetBranch}`, "HEAD"], {
      ...LOCKED_GIT_ENV,
    }).catch(() => {});
  }
}
//@ chunk-rzkdv0c6.js:26000-26213 placement
async function fetchAndForceCheckout(ctx, ref, full) {
  await fetchWithRetry(
    ctx,
    () => {
      let remoteSpec = prepFetchRemote(ctx);
      return [
        ...remoteSpec.configArgs,
        "fetch",
        ...fetchDepthArgs(full),
        "--progress",
        remoteSpec.remote,
        ref,
      ];
    },
    undefined,
    full && isFailFastFetchEnabled(),
  );
  await runGit(ctx, ctx.repoPath, ["checkout", "--progress", "--force", "-B", ref, "FETCH_HEAD"]);
}
//@ chunk-rzkdv0c6.js:26213-26354 placement
async function remoteBranchExists(ctx, branch) {
  try {
    return (
      (await runGit(ctx, ctx.repoPath, ["ls-remote", "--heads", ctx.authURL, `refs/heads/${branch}`])).trim()
        .length > 0
    );
  } catch {
    return false;
  }
}
//@ chunk-rzkdv0c6.js:26354-26473 placement
async function localRefExists(ctx, ref) {
  try {
    await runGit(ctx, ctx.repoPath, ["rev-parse", "--verify", "--quiet", ref], {
      ...LOCKED_GIT_ENV,
    });
    return true;
  } catch {
    return false;
  }
}
//@ chunk-rzkdv0c6.js:26473-26598 placement
async function isRemoteEmpty(ctx) {
  try {
    return (await runGit(ctx, ctx.repoPath, ["ls-remote", "--symref", ctx.authURL, "HEAD"])).trim() === "";
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
