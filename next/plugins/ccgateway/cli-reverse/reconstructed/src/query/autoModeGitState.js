/**
 * query/autoModeGitState.ts
 *
 * 2.1.316 新增：收集工作目录的 git 状态（根、分支、默认分支、状态、远程可见性）；读取 git 远程配置（url、pushurl、pushdefault、分支远程）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (15)
 * attribution: placement 15
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { loadBundledText } from "../utils/bundledText.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import {
  sanitizeCacheKey,
  effectiveVisibility,
  repoVisibilityStore,
  isRepoVisibilityCheckEnabled,
  checkCurrentRepoVisibility,
} from "../utils/github/repoVisibility.js";
import {
  runGitReadOnly,
  findGitRootRecheckingNegative,
  autoModeGitStatusSettingValue,
  autoModeGitStatusUploadsValue,
  autoModeGitStatusLimitValue,
  truncateLinesToChars,
  countPorcelainStatus,
} from "../utils/git.js";
import { IGNORE_SUBMODULES_DIRTY_FLAG } from "../utils/git/gitSafeEnv.js";
import { parseGitRemote } from "../utils/detectRepository.js";
import {
  MAX_PLATFORM_LENGTH,
  MAX_PERMISSION_MODE_LENGTH,
  MAX_AUTO_MODE_LINE_LENGTH,
} from "../utils/permissions/serverClassifier/schemas.js";
import { isDiskless } from "../bootstrap/state.js";
import { identity } from "../utils/identity.js";
import { listProvidedTabs } from "../utils/claudeInChrome/tabsProvider.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:115869-116368 placement
/**
 * 从 auto mode 规则文本中读取"Scheduled-Task Fires"行（缓存）。
 */
var getScheduledTaskFiresRule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-ha3km179.js:115869", () => {
  getScheduledTaskFiresRule = DoctorLazy(() => {
    let caughtError;
    try {
      let sliced = loadBundledText(() => require("../skills/bundled/default.lazy.js"))
        .replace(/<user_allow_rules_to_replace>[\s\S]*?<\/user_allow_rules_to_replace>/, "")
        .split(/\r?\n/)
        .find((line) => line.startsWith("- Scheduled-Task Fires:"))
        ?.slice(2);
      if (sliced !== undefined)
        return {
          rule: sliced,
        };
    } catch (error) {
      caughtError = error;
    }
    logError(
      withTelemetryMessage(
        toError(caughtError ?? "no such line outside the allow slot"),
        'Auto mode could not read the "Scheduled-Task Fires" rule from its template, so an allow list that replaces the defaults goes to the platform without it',
      ),
    );
    return {
      rule: undefined,
    };
  });
});
//@ chunk-ha3km179.js:116368-116399 placement
/**
 * 定时任务触发规则
 */
function scheduledTaskRule() {
  return getScheduledTaskFiresRule().rule;
}
//@ chunk-ha3km179.js:116399-116434 placement
/**
 * 取仓库 slug
 */
function repoSlugOrNull(slug) {
  return sanitizeCacheKey(slug) || null;
}
//@ chunk-ha3km179.js:116434-116655 placement
async function readGitStatusPair(cwd, includeUntrackedAll, abortSignal) {
  let readStatus = (untrackedMode) =>
    runGitReadOnly(
      cwd,
      ["status", "--porcelain", IGNORE_SUBMODULES_DIRTY_FLAG, `--untracked-files=${untrackedMode}`],
      {
        abortSignal,
        userLocale: true,
      },
    );
  let [normalResult, allResult] = await Promise.all([
    readStatus("normal"),
    includeUntrackedAll ? readStatus("all") : Promise.resolve(null),
  ]);
  return {
    normal: normalResult,
    all: allResult,
  };
}
//@ chunk-ha3km179.js:116655-117349 placement
/**
 * 读取 git 远程配置（url、pushurl、pushdefault、分支远程）。
 */
async function readGitRemoteConfig(cwd, abortSignal) {
  let result = await runGitReadOnly(
    cwd,
    [
      "config",
      "-z",
      "--get-regexp",
      "^(remote\\..+\\.(url|pushurl)|remote\\.pushdefault|branch\\..+\\.remote)$",
    ],
    {
      abortSignal,
    },
  );
  let remoteConfig = {
    remotes: new Map(),
    branchRemotes: new Map(),
    pushDefault: undefined,
  };
  if (!result.ok) return result.code === 1 && !result.timedOut && !result.overflowed ? remoteConfig : null;
  for (let line of result.stdout.split("\x00")) {
    let index = line.indexOf(`
`);
    if (index < 0) continue;
    let sliced = line.slice(0, index);
    let sliced_2 = line.slice(index + 1);
    if (sliced === "remote.pushdefault") {
      remoteConfig.pushDefault = sliced_2;
      continue;
    }
    let match = sliced.match(/^remote\.(.+)\.(url|pushurl)$/);
    if (match !== null) {
      let remoteName = match[1];
      let remoteEntry = remoteConfig.remotes.get(remoteName) ?? {
        url: [],
        pushurl: [],
      };
      remoteEntry[match[2]].push(sliced_2);
      remoteConfig.remotes.set(remoteName, remoteEntry);
      continue;
    }
    let match_2 = sliced.match(/^branch\.(.+)\.remote$/);
    if (match_2 !== null) remoteConfig.branchRemotes.set(match_2[1], sliced_2);
  }
  return remoteConfig;
}
//@ chunk-ha3km179.js:117349-117450 placement
function pushRemoteForBranch(remoteConfig, branch) {
  return (
    (branch !== null && branch !== "HEAD" ? remoteConfig.branchRemotes.get(branch) : undefined) ??
    remoteConfig.pushDefault ??
    "origin"
  );
}
//@ chunk-ha3km179.js:117450-117514 placement
/**
 * unverified 记 unknown
 */
function visibilityOrUnknown(visibilityEntry) {
  let visibility = effectiveVisibility(visibilityEntry);
  return visibility === "unverified" ? "unknown" : visibility;
}
//@ chunk-ha3km179.js:117514-117562 placement
/**
 * 非空字符串或 null
 */
function nonEmptyStringOrNull(value) {
  return sanitizeCacheKey(value) === value && value !== "" ? value : null;
}
//@ chunk-ha3km179.js:117562-118044 placement
/**
 * 把远程 URL 解析为 owner/name 列表（去重）。
 */
function listRemoteRepos(remoteConfig) {
  let repos = [];
  for (let [remoteName, remoteUrls] of remoteConfig.remotes) {
    let name = nonEmptyStringOrNull(remoteName);
    if (name === null) continue;
    let pushUrls = remoteUrls.pushurl.length > 0 ? remoteUrls.pushurl : remoteUrls.url;
    let seenRemotes = new Set();
    for (let url of pushUrls) {
      let gitRemote = parseGitRemote(url);
      if (gitRemote === null) continue;
      let slug = `${gitRemote.owner}/${gitRemote.name}`;
      if (seenRemotes.has(`${gitRemote.host}/${slug}`)) continue;
      seenRemotes.add(`${gitRemote.host}/${slug}`);
      repos.push({
        name,
        host: gitRemote.host,
        remote: sanitizeCacheKey(slug),
        visibility: visibilityOrUnknown({
          slug,
          host: gitRemote.host,
          visibility: repoVisibilityStore.lookup(gitRemote.host, slug) ?? "unknown",
        }),
      });
    }
  }
  repos.sort((left, right) => left.name.localeCompare(right.name) || left.remote.localeCompare(right.remote));
  return repos;
}
//@ chunk-ha3km179.js:118044-118168 placement
function knownRemoteVisibilities() {
  return repoVisibilityStore
    .entries()
    .map((entry) => ({
      host: entry.host,
      remote: sanitizeCacheKey(entry.slug),
      visibility: visibilityOrUnknown(entry),
    }))
    .filter((repo) => repo.remote !== "");
}
//@ chunk-ha3km179.js:118168-119751 placement
/**
 * 收集工作目录的 git 状态（根、分支、默认分支、状态、远程可见性）。
 */
async function collectGitState(cwdOrNull, abortSignal, visibilityCache) {
  let visibilityEnabled = (() => {
    try {
      return isRepoVisibilityCheckEnabled();
    } catch {
      return false;
    }
  })();
  let emptyState = (error) => ({
    cwd: cwdOrNull,
    root: null,
    branch: null,
    default_branch: null,
    status: null,
    visibility: visibilityEnabled
      ? {
          origin: null,
          push_remote: null,
          remotes: [],
          visibility_cache: knownRemoteVisibilities().slice(0, MAX_PLATFORM_LENGTH),
        }
      : null,
    error,
  });
  if (cwdOrNull === null || isDiskless()) return emptyState("error");
  try {
    let gitRootRecheckingNegative = findGitRootRecheckingNegative(cwdOrNull);
    if (gitRootRecheckingNegative === null) return emptyState("not_a_repo");
    let cacheSlots = {};
    if (visibilityCache !== undefined && visibilityEnabled) visibilityCache.visibility = cacheSlots;
    let countStatus = autoModeGitStatusSettingValue();
    let includeAllUntracked = autoModeGitStatusUploadsValue();
    let [statusPair, branchResult, originCheck, remoteConfig] = await Promise.all([
      countStatus || includeAllUntracked
        ? readGitStatusPair(cwdOrNull, includeAllUntracked, abortSignal)
        : null,
      runGitReadOnly(cwdOrNull, ["rev-parse", "--abbrev-ref", "HEAD"], {
        abortSignal,
      }),
      visibilityEnabled ? checkCurrentRepoVisibility(cwdOrNull, cacheSlots) : null,
      visibilityEnabled ? readGitRemoteConfig(cwdOrNull, abortSignal) : null,
    ]);
    let branchName = branchResult.ok ? branchResult.stdout.trim() : null;
    let branchSlug = branchName === null ? null : repoSlugOrNull(branchName);
    let remotes = remoteConfig === null ? [] : listRemoteRepos(remoteConfig);
    let cachedVisibilities = visibilityEnabled ? knownRemoteVisibilities() : [];
    let isTruncated =
      remotes.length > MAX_PERMISSION_MODE_LENGTH ||
      cachedVisibilities.length > MAX_PLATFORM_LENGTH ||
      branchSlug !== branchName;
    let state = {
      cwd: cwdOrNull,
      root: gitRootRecheckingNegative,
      branch: branchSlug,
      default_branch: null,
      visibility: visibilityEnabled
        ? {
            origin:
              originCheck === null
                ? null
                : {
                    host: originCheck.host,
                    remote: sanitizeCacheKey(originCheck.slug),
                    visibility: visibilityOrUnknown(originCheck),
                  },
            push_remote:
              remoteConfig === null
                ? null
                : nonEmptyStringOrNull(pushRemoteForBranch(remoteConfig, branchName)),
            remotes: remotes.slice(0, MAX_PERMISSION_MODE_LENGTH),
            visibility_cache: cachedVisibilities.slice(0, MAX_PLATFORM_LENGTH),
          }
        : null,
      ...(isTruncated && {
        truncated: true,
      }),
    };
    if (statusPair === null)
      return {
        ...state,
        status: null,
      };
    let { normal, all } = statusPair;
    let chosenStatus = all?.ok ? all : normal.ok ? normal : null;
    if (chosenStatus === null)
      return {
        ...state,
        status: null,
        error:
          (!normal.ok && normal.timedOut) || (all !== null && !all.ok && all.timedOut) ? "timeout" : "error",
      };
    let filtered = chosenStatus.stdout
      .split(
        `
`,
      )
      .filter((line) => line.length > 0);
    let text = [
      ...filtered.filter((untrackedLine) => untrackedLine.startsWith("??")),
      ...filtered.filter((trackedLine) => !trackedLine.startsWith("??")),
    ].join(`
`);
    let charLimit = autoModeGitStatusLimitValue();
    let porcelain = includeAllUntracked
      ? truncateLinesToChars(
          text,
          charLimit > 0 ? Math.min(charLimit, MAX_AUTO_MODE_LINE_LENGTH) : MAX_AUTO_MODE_LINE_LENGTH,
        )
      : null;
    let counts = countPorcelainStatus(chosenStatus.stdout);
    return {
      ...state,
      status: {
        clean: filtered.length === 0,
        counts: countStatus
          ? {
              staged: counts.staged,
              modified: counts.modified,
              untracked: all?.ok ? counts.untracked : null,
              untracked_normal: normal.ok ? countPorcelainStatus(normal.stdout).untracked : null,
            }
          : null,
        porcelain,
        truncated: porcelain !== null && (chosenStatus !== all || porcelain !== text),
      },
    };
  } catch {
    return emptyState("error");
  }
}
//@ chunk-ha3km179.js:119751-119823 placement
/**
 * 标签页列举开关名
 */
var TENGU_VELVET_MARBLE_2 = "tengu_velvet_marble";
var TENGU_VELVET_MARBLE = 300;
var MAX_TAB_COUNT = 128;
var MAX_TAB_NAME_CHARS = 32;
var MAX_TAB_LIST_WAIT_MS = 300;
var MAX_GIT_FACTS_BYTES = 2000;
var TAB_WAIT_MS = 1024;
//@ chunk-ha3km179.js:119823-119971 placement
function withTimeoutDefault(promise, timeoutMs, timeoutValue) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout((resolveWith, value) => resolveWith(value), timeoutMs, resolve, timeoutValue);
    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
//@ chunk-ha3km179.js:119971-120028 placement
/**
 * git 环境缓存
 */
var gitEnvCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:119971", () => {
  gitEnvCache = identity({}, (envCache) => {
    delete envCache.whole;
    delete envCache.rulesUnread;
  });
});
//@ chunk-ha3km179.js:120028-120069 placement
/**
 * 带超时列标签页
 */
function listTabsWithTimeout() {
  return withTimeoutDefault(listProvidedTabs(), MAX_TAB_LIST_WAIT_MS, undefined);
}
export {
  TENGU_VELVET_MARBLE_2,
  scheduledTaskRule,
  listTabsWithTimeout,
  MAX_TAB_NAME_CHARS,
  MAX_TAB_COUNT,
  withTimeoutDefault,
  MAX_GIT_FACTS_BYTES,
  gitEnvCache,
  TAB_WAIT_MS,
  collectGitState,
  TENGU_VELVET_MARBLE,
};
