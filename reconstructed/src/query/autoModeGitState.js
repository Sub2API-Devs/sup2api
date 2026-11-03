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

//@ chunk-ha3km179.js:115869-116368 placement
/**
 * 从 auto mode 规则文本中读取"Scheduled-Task Fires"行（缓存）。
 */
var getScheduledTaskFiresRule = DoctorLazy(() => {
  let e;
  try {
    let sliced = loadBundledText(() => require("./chunk-cgwxv58n.js"))
      .replace(/<user_allow_rules_to_replace>[\s\S]*?<\/user_allow_rules_to_replace>/, "")
      .split(/\r?\n/)
      .find((line) => line.startsWith("- Scheduled-Task Fires:"))
      ?.slice(2);
    if (sliced !== undefined)
      return {
        rule: sliced,
      };
  } catch (error) {
    e = error;
  }
  logError(
    withTelemetryMessage(
      toError(e ?? "no such line outside the allow slot"),
      'Auto mode could not read the "Scheduled-Task Fires" rule from its template, so an allow list that replaces the defaults goes to the platform without it',
    ),
  );
  return {
    rule: undefined,
  };
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
function repoSlugOrNull(e) {
  return sanitizeCacheKey(e) || null;
}
//@ chunk-ha3km179.js:116434-116655 placement
async function readGitStatusPair(e, n, abortSignal) {
  let s = (S) =>
    runGitReadOnly(e, ["status", "--porcelain", IGNORE_SUBMODULES_DIRTY_FLAG, `--untracked-files=${S}`], {
      abortSignal,
      userLocale: true,
    });
  let [h, y] = await Promise.all([s("normal"), n ? s("all") : Promise.resolve(null)]);
  return {
    normal: h,
    all: y,
  };
}
//@ chunk-ha3km179.js:116655-117349 placement
/**
 * 读取 git 远程配置（url、pushurl、pushdefault、分支远程）。
 */
async function readGitRemoteConfig(e, abortSignal) {
  let r = await runGitReadOnly(
    e,
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
  let s = {
    remotes: new Map(),
    branchRemotes: new Map(),
    pushDefault: undefined,
  };
  if (!r.ok) return r.code === 1 && !r.timedOut && !r.overflowed ? s : null;
  for (let h of r.stdout.split("\x00")) {
    let index = h.indexOf(`
`);
    if (index < 0) continue;
    let sliced = h.slice(0, index);
    let sliced_2 = h.slice(index + 1);
    if (sliced === "remote.pushdefault") {
      s.pushDefault = sliced_2;
      continue;
    }
    let match = sliced.match(/^remote\.(.+)\.(url|pushurl)$/);
    if (match !== null) {
      let w = match[1];
      let P = s.remotes.get(w) ?? {
        url: [],
        pushurl: [],
      };
      P[match[2]].push(sliced_2);
      s.remotes.set(w, P);
      continue;
    }
    let match_2 = sliced.match(/^branch\.(.+)\.remote$/);
    if (match_2 !== null) s.branchRemotes.set(match_2[1], sliced_2);
  }
  return s;
}
//@ chunk-ha3km179.js:117349-117450 placement
function pushRemoteForBranch(e, n) {
  return (n !== null && n !== "HEAD" ? e.branchRemotes.get(n) : undefined) ?? e.pushDefault ?? "origin";
}
//@ chunk-ha3km179.js:117450-117514 placement
/**
 * unverified 记 unknown
 */
function visibilityOrUnknown(e) {
  let n = effectiveVisibility(e);
  return n === "unverified" ? "unknown" : n;
}
//@ chunk-ha3km179.js:117514-117562 placement
/**
 * 非空字符串或 null
 */
function nonEmptyStringOrNull(e) {
  return sanitizeCacheKey(e) === e && e !== "" ? e : null;
}
//@ chunk-ha3km179.js:117562-118044 placement
/**
 * 把远程 URL 解析为 owner/name 列表（去重）。
 */
function listRemoteRepos(e) {
  let n = [];
  for (let [r, s] of e.remotes) {
    let h = nonEmptyStringOrNull(r);
    if (h === null) continue;
    let y = s.pushurl.length > 0 ? s.pushurl : s.url;
    let S = new Set();
    for (let M of y) {
      let gitRemote = parseGitRemote(M);
      if (gitRemote === null) continue;
      let T = `${gitRemote.owner}/${gitRemote.name}`;
      if (S.has(`${gitRemote.host}/${T}`)) continue;
      S.add(`${gitRemote.host}/${T}`);
      n.push({
        name: h,
        host: gitRemote.host,
        remote: sanitizeCacheKey(T),
        visibility: visibilityOrUnknown({
          slug: T,
          host: gitRemote.host,
          visibility: repoVisibilityStore.lookup(gitRemote.host, T) ?? "unknown",
        }),
      });
    }
  }
  n.sort((r, s) => r.name.localeCompare(s.name) || r.remote.localeCompare(s.remote));
  return n;
}
//@ chunk-ha3km179.js:118044-118168 placement
function knownRemoteVisibilities() {
  return repoVisibilityStore
    .entries()
    .map((e) => ({
      host: e.host,
      remote: sanitizeCacheKey(e.slug),
      visibility: visibilityOrUnknown(e),
    }))
    .filter((e) => e.remote !== "");
}
//@ chunk-ha3km179.js:118168-119751 placement
/**
 * 收集工作目录的 git 状态（根、分支、默认分支、状态、远程可见性）。
 */
async function collectGitState(cwdOrNull, abortSignal, r) {
  let s = (() => {
    try {
      return isRepoVisibilityCheckEnabled();
    } catch {
      return false;
    }
  })();
  let h = (error) => ({
    cwd: cwdOrNull,
    root: null,
    branch: null,
    default_branch: null,
    status: null,
    visibility: s
      ? {
          origin: null,
          push_remote: null,
          remotes: [],
          visibility_cache: knownRemoteVisibilities().slice(0, MAX_PLATFORM_LENGTH),
        }
      : null,
    error,
  });
  if (cwdOrNull === null || isDiskless()) return h("error");
  try {
    let gitRootRecheckingNegative = findGitRootRecheckingNegative(cwdOrNull);
    if (gitRootRecheckingNegative === null) return h("not_a_repo");
    let S = {};
    if (r !== undefined && s) r.visibility = S;
    let M = autoModeGitStatusSettingValue();
    let R = autoModeGitStatusUploadsValue();
    let [T, w, P, Q] = await Promise.all([
      M || R ? readGitStatusPair(cwdOrNull, R, abortSignal) : null,
      runGitReadOnly(cwdOrNull, ["rev-parse", "--abbrev-ref", "HEAD"], {
        abortSignal,
      }),
      s ? checkCurrentRepoVisibility(cwdOrNull, S) : null,
      s ? readGitRemoteConfig(cwdOrNull, abortSignal) : null,
    ]);
    let D = w.ok ? w.stdout.trim() : null;
    let L = D === null ? null : repoSlugOrNull(D);
    let z = Q === null ? [] : listRemoteRepos(Q);
    let G = s ? knownRemoteVisibilities() : [];
    let ee = z.length > MAX_PERMISSION_MODE_LENGTH || G.length > MAX_PLATFORM_LENGTH || L !== D;
    let V = {
      cwd: cwdOrNull,
      root: gitRootRecheckingNegative,
      branch: L,
      default_branch: null,
      visibility: s
        ? {
            origin:
              P === null
                ? null
                : {
                    host: P.host,
                    remote: sanitizeCacheKey(P.slug),
                    visibility: visibilityOrUnknown(P),
                  },
            push_remote: Q === null ? null : nonEmptyStringOrNull(pushRemoteForBranch(Q, D)),
            remotes: z.slice(0, MAX_PERMISSION_MODE_LENGTH),
            visibility_cache: G.slice(0, MAX_PLATFORM_LENGTH),
          }
        : null,
      ...(ee && {
        truncated: true,
      }),
    };
    if (T === null)
      return {
        ...V,
        status: null,
      };
    let { normal, all } = T;
    let Z = all?.ok ? all : normal.ok ? normal : null;
    if (Z === null)
      return {
        ...V,
        status: null,
        error:
          (!normal.ok && normal.timedOut) || (all !== null && !all.ok && all.timedOut) ? "timeout" : "error",
      };
    let filtered = Z.stdout
      .split(
        `
`,
      )
      .filter((line) => line.length > 0);
    let joined = [
      ...filtered.filter((nt) => nt.startsWith("??")),
      ...filtered.filter((nt) => !nt.startsWith("??")),
    ].join(`
`);
    let se = autoModeGitStatusLimitValue();
    let Te = R
      ? truncateLinesToChars(
          joined,
          se > 0 ? Math.min(se, MAX_AUTO_MODE_LINE_LENGTH) : MAX_AUTO_MODE_LINE_LENGTH,
        )
      : null;
    let U = countPorcelainStatus(Z.stdout);
    return {
      ...V,
      status: {
        clean: filtered.length === 0,
        counts: M
          ? {
              staged: U.staged,
              modified: U.modified,
              untracked: all?.ok ? U.untracked : null,
              untracked_normal: normal.ok ? countPorcelainStatus(normal.stdout).untracked : null,
            }
          : null,
        porcelain: Te,
        truncated: Te !== null && (Z !== all || Te !== joined),
      },
    };
  } catch {
    return h("error");
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
function withTimeoutDefault(e, n, r) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout((S, M) => S(M), n, resolve, r);
    e.then(
      (S) => {
        clearTimeout(timer);
        resolve(S);
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
var gitEnvCache = identity({}, (e) => {
  delete e.whole;
  delete e.rulesUnread;
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
