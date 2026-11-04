/**
 * utils/git/gitLanes.ts
 *
 * 2.1.316 新增：在自己的 worktree 里安全运行 git：校验 remote、关闭递归子模块、处理 partial clone 配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (35)
 * attribution: placement 35
 */
import { resolve } from "path";
import {
  getEnvVarCaseInsensitiveOnWindows,
  buildGitConfigEnv,
  buildBatchSshCommand,
  wrapWithCdCommand,
  homeDirOrDefault,
  resolveSshVariant,
} from "../gitSafeExec.js";
import { effectiveEnvSnapshot } from "../settings/envSources.js";
import { pickByHelper, GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { buildGitEnvVarsForRepo, resolveGitDirsOrPlaceholder } from "./gitDirResolution.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import {
  listGitFilters,
  describeGitConfigUnreadable,
  runGitQuietStdin,
  isFilterConfigKey,
  filterDriverNames,
  foldForCompare,
  summarizeGitConfigKeys,
  UNSAFE_CONFIG_HINT,
  readGitConfigScoped,
} from "./gitConfigFilters.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../execFileNoThrow.js";
import { getPlatform } from "../platform.js";
import { isAbsolutePathEntry, whichOnPath, sanitizePathEnv } from "../which.js";
import { buildSafeGitInvocation } from "./gitSafeInvocation.js";
import { import_sortedIndex_2, partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { runInvocation } from "../detectRepository.js";
import { gitExe, findGitRoot } from "../git.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { isCleanupStarted } from "../cleanupRegistry.js";
import { logForDebugging } from "../debug.js";
import { printableLabel } from "../printableName.js";
import { redactSshUserinfo, redactUrlsTracked } from "../redaction/urlRedaction.js";
import { isEnvTruthy } from "../envUtils.js";
import { urlPatternToRegex } from "../stringUtils.js";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6vnxsn99.js:5777-5843 placement
function ownProperty(object, key) {
  return object !== undefined && Object.hasOwn(object, key) ? object[key] : undefined;
}
//@ chunk-6vnxsn99.js:5875-6326 placement
function gitConfigEnvOf(env) {
  let out = {};
  for (let varName of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, varName);
    if (envVarCaseInsensitiveOnWindows !== undefined) out[varName] = envVarCaseInsensitiveOnWindows;
  }
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_CONFIG_COUNT");
  let count = Number(envVarCaseInsensitiveOnWindows);
  if (envVarCaseInsensitiveOnWindows === undefined || !Number.isInteger(count) || count <= 0)
    return {
      env: out,
      count: undefined,
    };
  out.GIT_CONFIG_COUNT = envVarCaseInsensitiveOnWindows;
  for (let j = 0; j < count; j++) {
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, `GIT_CONFIG_KEY_${j}`);
    if (envVarCaseInsensitiveOnWindows === undefined) break;
    out[`GIT_CONFIG_KEY_${j}`] = envVarCaseInsensitiveOnWindows;
    let envVarCaseInsensitiveOnWindows_2 = getEnvVarCaseInsensitiveOnWindows(env, `GIT_CONFIG_VALUE_${j}`);
    if (envVarCaseInsensitiveOnWindows_2 !== undefined)
      out[`GIT_CONFIG_VALUE_${j}`] = envVarCaseInsensitiveOnWindows_2;
  }
  return {
    env: out,
    count: envVarCaseInsensitiveOnWindows,
  };
}
//@ chunk-6vnxsn99.js:6326-6481 placement
var HTTP_SSL_CONFIG_KEY_RE =
  /^http\.(?:.*\.)?(?:ssl(?:cainfo|capath|verify|version|cipherlist|backend|try)|schannel(?:checkrevoke|usesslcainfo)|pinnedpubkey|proxysslcainfo)$/i;
//@ chunk-6vnxsn99.js:6481-6738 placement
function safeGitConfigEnv() {
  let { env, count } = gitConfigEnvOf(effectiveEnvSnapshot());
  let pairs = [];
  for (let j = 0; j < Number(count ?? 0); j++) {
    let key = env[`GIT_CONFIG_KEY_${j}`];
    let value = env[`GIT_CONFIG_VALUE_${j}`];
    if (key === undefined) break;
    if (value !== undefined && HTTP_SSL_CONFIG_KEY_RE.test(key)) pairs.push([key, value]);
  }
  return pairs.length === 0
    ? {}
    : pickByHelper(buildGitConfigEnv(undefined, pairs), (value) => value !== undefined);
}
//@ chunk-6vnxsn99.js:6738-6785 placement
function withSafeGitConfig(worktreePath, extraEnv) {
  return buildGitEnvVarsForRepo(worktreePath, {
    ...safeGitConfigEnv(),
    ...extraEnv,
  });
}
//@ chunk-6vnxsn99.js:6785-8208 placement
/**
 * 在自身 worktree 里运行 git（materializeWorkTree）：校验 remote 名、关闭递归子模块、处理 partial-clone 懒加载与 promisor remote，返回 stdout/stderr/code 与 lane 信息。
 */
async function runGitInOwnWorkTree(
  dir,
  args,
  envPins = {},
  {
    timeout,
    abortSignal,
    withoutControllingTerminal,
    waitForExitAfterKill,
    maxBuffer,
    stripFinalNewline,
    programs,
    input,
    lazyFetch,
    fetchesFrom,
    ownConfigAsJudged,
    afterEachRead,
    repository,
  } = {},
) {
  let remoteName = fetchesFrom === undefined ? undefined : normalizeRemoteName(fetchesFrom);
  if (remoteName === null)
    return notStartedResult(
      "remote_name_not_plain",
      "the remote's name must begin with a letter or a digit and contain only letters, digits, '.', '_' and '-'",
    );
  let gitArgs = [...args];
  let ownConfigAsJudged_2 = ownConfigAsJudged?.map(([key, value]) => [key, value]);
  if (remoteName !== undefined && !isSafeFetchArgs(gitArgs, remoteName))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `materializeWorkTree: with fetchesFrom, the arguments must be -c pairs if any, then fetch or ls-remote, then options, then --end-of-options, then that remote's name. Each option must carry its value after '=' (--depth=1), begin with --no-, or be one of ${[...SAFE_FETCH_FLAGS].join(", ")}. A fetch needs --no-recurse-submodules. No option may begin with --rec.`,
      "partial-clone lane called with fetchesFrom and a command that is not in the form it requires",
    );
  let repository_2 = repository ?? resolveGitDirsOrPlaceholder(dir);
  let checkedPrograms = programs === undefined ? undefined : wrapCheckedPrograms(programs);
  let movedFlag = {
    value: false,
  };
  let filters = await listGitFilters(dir, {
    envPins,
    pin: repository_2,
    ...guardRunner(checkedPrograms, afterEachRead, movedFlag),
  });
  if (movedFlag.value) return notStartedResult("repository_moved_between_reads", GIT_DIRS_CHANGED);
  if (!filters.ok) return notStartedResult(filters.reason, describeGitConfigUnreadable(filters));
  if (abortSignal?.aborted) return notStartedResult("aborted", CANCELLED_BEFORE_START);
  return runGitInLane(
    execFileNoThrowWithCwd,
    dir,
    gitArgs,
    envPins,
    filters.entries,
    {
      timeout,
      abortSignal,
      withoutControllingTerminal,
      waitForExitAfterKill,
      maxBuffer,
      stripFinalNewline,
      repository: repository_2,
    },
    {
      programs: checkedPrograms,
      input,
      lazyFetch,
      fetchesFrom: remoteName,
      ownConfigAsJudged: ownConfigAsJudged_2,
      ...(afterEachRead !== undefined && {
        afterEachRead,
      }),
    },
  );
}
//@ chunk-6vnxsn99.js:8208-8442 placement
function gitReadInOwnWorkTree(dir, args, envPins = {}, runOptions = {}) {
  let subcommand = args[gitSubcommandIndex(args)];
  if (subcommand === undefined || !ALLOWED_REMOTE_SUBCOMMANDS.has(subcommand))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gitInOwnWorkTree runs reads only, not git ${subcommand ?? "(no subcommand)"}`,
      "gitInOwnWorkTree called with a non-read git subcommand",
    );
  return runGitInLane(execFileNoThrow, dir, args, envPins, null, runOptions);
}
//@ chunk-6vnxsn99.js:8442-8527 placement
function gitSubcommandIndex(args) {
  return args.findIndex((arg, index) => !arg.startsWith("-") && (index === 0 || args[index - 1] !== "-c"));
}
//@ chunk-6vnxsn99.js:8527-8599 placement
var ALLOWED_REMOTE_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ALLOWED_GIT_URL_SCHEMES;
deferInit("chunk-6vnxsn99.js:8527", () => {
  ALLOWED_REMOTE_SUBCOMMANDS = new Set(["diff", "format-patch", "log", "show"]);
  ALLOWED_GIT_URL_SCHEMES = ["https", "ssh"];
});
//@ chunk-6vnxsn99.js:8599-8641 placement
function isNetworkGitUrl(url) {
  return ALLOWED_GIT_URL_SCHEMES.includes(gitUrlScheme(url));
}
//@ chunk-6vnxsn99.js:8641-8962 placement
function gitUrlScheme(gitUrl) {
  let scheme = /^[A-Za-z0-9][A-Za-z0-9+.-]*(?=::)/.exec(gitUrl)?.[0];
  if (scheme !== undefined) return scheme;
  let scheme_2 = /^([a-z][a-z0-9+.-]*):\/\//i.exec(gitUrl)?.[1];
  if (scheme_2 !== undefined) return scheme_2 === "git+ssh" || scheme_2 === "ssh+git" ? "ssh" : scheme_2;
  let index = gitUrl.indexOf(":");
  let index_2 = gitUrl.indexOf("/");
  return index === -1 ||
    (index_2 !== -1 && index_2 < index) ||
    (getPlatform() === "windows" && /^[A-Za-z]:[\\/]/.test(gitUrl))
    ? "file"
    : "ssh";
}
//@ chunk-6vnxsn99.js:8962-9036 placement
var TRANSPORT_NOT_ALLOWED_RE = /^fatal: transport '([A-Za-z][A-Za-z0-9+.-]{0,31})' not allowed$/m;
//@ chunk-6vnxsn99.js:9036-9103 placement
function normalizeRemoteName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) ? name : null;
}
//@ chunk-6vnxsn99.js:9103-9179 placement
var SAFE_FETCH_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6vnxsn99.js:9103", () => {
  SAFE_FETCH_FLAGS = new Set(["--stdin", "--negotiate-only", "--refs", "--heads", "--quiet"]);
});
//@ chunk-6vnxsn99.js:9179-9531 placement
/**
 * 参数是否为只读 fetch/ls-remote 且关闭递归子模块。
 */
function isSafeFetchArgs(args, remoteName) {
  let subcommandIndex = gitSubcommandIndex(args);
  let index = args.indexOf("--end-of-options");
  let sliced = args.slice(subcommandIndex + 1, index);
  return (
    args.slice(0, subcommandIndex).every((arg, index) => index % 2 === 1 || arg === "-c") &&
    ["fetch", "ls-remote"].includes(args[subcommandIndex] ?? "") &&
    index > subcommandIndex &&
    sliced.every((flag) => /^--no-[a-z]|^--[a-z][a-z-]*=/.test(flag) || SAFE_FETCH_FLAGS.has(flag)) &&
    (args[subcommandIndex] === "ls-remote" || sliced.includes("--no-recurse-submodules")) &&
    !sliced.some((flag) => flag.startsWith("--rec")) &&
    args[index + 1] === remoteName
  );
}
//@ chunk-6vnxsn99.js:9531-9702 placement
var FAILED_RESULT = {
  stdout: "",
  stderr: "",
  code: 1,
};
var CANCELLED_BEFORE_START = "the operation was cancelled before it started";
var GIT_DIRS_CHANGED = "the repository's git directories changed while Claude Code read its git config";
//@ chunk-6vnxsn99.js:9702-9809 placement
function notStartedResult(why, reason) {
  return {
    stdout: "",
    stderr: `git was not run: ${reason}.
`,
    code: 1,
    lane: {
      kind: "not_started",
      why,
    },
  };
}
//@ chunk-6vnxsn99.js:9809-10799 placement
/**
 * 校验 programs.buildInvocation 只返回指向 git 的绝对路径且不改参数/环境。
 */
function wrapCheckedPrograms(programs) {
  return {
    base: programs.base,
    buildInvocation: (args, scope) => {
      let invocation = programs.buildInvocation([...args], {
        dir: scope.dir,
        env: {
          ...scope.env,
        },
      });
      let invocation_2 = {
        file: invocation.file,
        args: [...invocation.args],
        cwd: invocation.cwd,
        env: {
          ...invocation.env,
        },
      };
      if (
        !isAbsolutePathEntry(invocation_2.file) ||
        buildSafeGitInvocation(invocation_2.file, [], invocation_2.env) === null
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "programs.buildInvocation must return an absolute path to a file named git",
          "partial-clone lane called with programs whose file is not an absolute path to git",
        );
      if (
        ![[], ["-C", scope.dir], ["-C", resolve(scope.dir)]].some((prefixArgs) =>
          import_sortedIndex_2(invocation_2.args, [...prefixArgs, ...args]),
        ) ||
        Object.keys(scope.env).some((key) =>
          Object.hasOwn(invocation_2.env, key)
            ? invocation_2.env[key] !== scope.env[key]
            : !/^(?:OLD)?PWD$/i.test(key),
        ) ||
        Object.keys(invocation_2.env).some((key) => !Object.hasOwn(scope.env, key))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "programs.buildInvocation must return the environment it was handed, less at most PWD and OLDPWD, and the arguments it was handed, with nothing before them but -C and the directory it was handed; it changed the environment or the arguments",
          "partial-clone lane called with programs that do not keep the environment and arguments handed to them",
        );
      return invocation_2;
    },
  };
}
//@ chunk-6vnxsn99.js:10799-10904 placement
function buildLaneInvocation(programs, gitExe, args, scope) {
  return programs === undefined
    ? {
        file: gitExe(),
        args: [...args],
        cwd: scope.dir,
        env: scope.env,
      }
    : programs.buildInvocation(args, scope);
}
//@ chunk-6vnxsn99.js:10904-11092 placement
function guardRunner(programs, afterEachRead, movedFlag) {
  let runner = toRunner(programs);
  let run = runner.run ?? runGitQuietStdin;
  return afterEachRead === undefined
    ? runner
    : {
        ...runner,
        run: async (args, options) => {
          if (movedFlag.value)
            return {
              code: 1,
              stdout: "",
              stderr: "",
            };
          let result = await run(args, options);
          if (!(await afterEachRead())) movedFlag.value = true;
          return result;
        },
      };
}
//@ chunk-6vnxsn99.js:11092-11244 placement
function toRunner(programs) {
  return programs === undefined
    ? {}
    : {
        base: programs.base,
        run: (args, { cwd, env, extendEnv, ...runOptions }) =>
          runInvocation(
            programs.buildInvocation(args, {
              dir: cwd,
              env,
            }),
            {
              ...runOptions,
              stdin: "ignore",
            },
          ),
      };
}
//@ chunk-6vnxsn99.js:11244-14477 placement
/**
 * 先按给定环境运行一次 git，成功即返回；失败且原因可能是 partial clone 缺对象时，检查 promisor 远端与配置， 必要时在受控配置下再试一次，返回结果与 lane（说明走了哪条路径）。
 */
async function runGitInLane(
  execFn,
  dir,
  args,
  envPins,
  repoFilters,
  { repository, ...runOptions },
  { programs, input, lazyFetch, fetchesFrom, ownConfigAsJudged, afterEachRead } = {},
) {
  let stdinOption =
    input === undefined
      ? {
          stdin: "ignore",
        }
      : {
          input,
        };
  let firstResult =
    fetchesFrom === undefined
      ? await (() => {
          let laneInvocation = buildLaneInvocation(programs, gitExe, args, {
            dir,
            env: getRemoteHostSessionCount(
              {
                ...envPins,
                ...definedEnvEntries(repoFilters === null ? [] : laneConfigPairs([], repoFilters, [])),
              },
              {
                repository,
                base: programs?.base,
                userLocale: true,
              },
            ),
          });
          return execFn(laneInvocation.file, laneInvocation.args, {
            ...runOptions,
            cwd: laneInvocation.cwd,
            env: laneInvocation.env,
            ...(programs !== undefined && {
              extendEnv: false,
            }),
            ...stdinOption,
          });
        })()
      : FAILED_RESULT;
  if (firstResult.code === 0)
    return {
      ...firstResult,
      lane: {
        kind: "first_attempt_succeeded",
      },
    };
  let cutResult = () =>
    fetchesFrom === undefined
      ? {
          ...firstResult,
          lane: {
            kind: "first_attempt_cut",
          },
        }
      : notStartedResult("aborted", CANCELLED_BEFORE_START);
  if (
    firstResult.timedOut ||
    firstResult.maxBufferExceeded ||
    runOptions.abortSignal?.aborted ||
    (runOptions.withoutControllingTerminal === true && isCleanupStarted())
  )
    return cutResult();
  let repository_2 = repository ?? resolveGitDirsOrPlaceholder(findGitRoot(dir) ?? dir);
  let plan = await planLazyFetchRetry(dir, envPins, {
    repoFiltersOff: repoFilters !== null,
    repository: repository_2,
    programs,
    lazyFetch,
    fetchesFrom,
    ownConfigAsJudged,
    afterEachRead,
  });
  if (repoFilters !== null && runOptions.abortSignal?.aborted) return cutResult();
  if (!plan.retry)
    return {
      ...(plan.forgone === undefined
        ? firstResult
        : appendStderrLine(
            firstResult,
            fetchesFrom === undefined
              ? `No lazy fetch from the promisor remote was attempted: ${plan.forgone}.`
              : `The remote ${fetchesFrom} was not contacted: ${plan.forgone}.`,
          )),
      lane: {
        kind: "forgone",
        why: plan.why,
      },
    };
  logForDebugging(
    fetchesFrom === undefined
      ? `[git] ${dir} is a partial clone: retrying with ${lazyFetch === "off" ? `lazy fetch off, over ${plan.transports.join(" or ")}` : "a constrained lazy fetch"}`
      : `[git] ${dir}: contacting the remote ${fetchesFrom}, over ${plan.transports.join(" or ")}`,
  );
  let laneInvocation = buildLaneInvocation(programs, () => plan.git, args, {
    dir,
    env: getRemoteHostSessionCount(
      {
        ...envPins,
        ...plan.env,
      },
      {
        base: plan.operatorEnv,
        repository: repository_2,
      },
    ),
  });
  let retryResult = {
    ...(await execFn(laneInvocation.file, laneInvocation.args, {
      ...runOptions,
      cwd: laneInvocation.cwd,
      env: laneInvocation.env,
      extendEnv: false,
      ...stdinOption,
    })),
    lane: {
      kind: "retried",
    },
  };
  if (retryResult.code === 0) return retryResult;
  let promisorLabel =
    plan.promisorUrl === undefined
      ? undefined
      : printableLabel(redactSshUserinfo(redactUrlsTracked(plan.promisorUrl)), LABEL_HEAD_TAIL);
  let mergedResult = retryResult;
  let rejectedTransport = TRANSPORT_NOT_ALLOWED_RE.exec(retryResult.stderr)?.[1];
  if (rejectedTransport !== undefined && !plan.transports.includes(rejectedTransport)) {
    let joined = plan.transports.join(" or ");
    mergedResult = appendStderrLine(
      mergedResult,
      fetchesFrom === undefined
        ? `Nothing was fetched: a partial clone's lazy fetch runs over ${joined} only, and the promisor remote the repository's own config names, ${promisorLabel ?? "one it does not spell out"}, is reached over ${rejectedTransport}${plan.promisorUrl !== undefined && plan.transports.includes(gitUrlScheme(plan.promisorUrl)) ? ", not the transport that URL spells \u2014 a url.<base>.insteadOf rule in your git configuration, or a second promisor URL in the repository's, would account for that" : ""}.`
        : `The remote ${fetchesFrom} was not contacted: this command runs over ${joined} only, and the URL the repository's own config gives it, ${promisorLabel ?? "one it does not spell out"}, is reached over ${rejectedTransport}${plan.promisorUrl !== undefined && plan.transports.includes(gitUrlScheme(plan.promisorUrl)) ? `, not the transport that URL spells. A url.<base>.insteadOf rule, or a remote.${fetchesFrom}.url, in your own git configuration would account for that` : ""}.`,
    );
  }
  if (plan.userUnscopedExtraHeader)
    mergedResult = appendStderrLine(
      mergedResult,
      fetchesFrom === undefined
        ? `The lazy fetch did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config names as its promisor remote, here ${promisorLabel ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`
        : `The command did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config gives for the remote ${fetchesFrom}, here ${promisorLabel ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`,
    );
  return {
    ...mergedResult,
    stderrOfGitAlone: retryResult.stderr,
  };
}
//@ chunk-6vnxsn99.js:14477-14925 placement (2.1.88 match: readHeadAndTail, 0.802)
/**
 * 危险 git 配置键正则（http/url/remote 代理与凭证、ssh 命令、bundle、gpg 等），用于拒绝不安全配置。
 */
var DANGEROUS_GIT_CONFIG_KEYS_2 =
  /^(?:http\..*|url\..*\.(?:insteadof|pushinsteadof)|remote\..*\.(?:proxy|proxyauthmethod|uploadpack|receivepack|vcs)|credential\..*|core\.(?:sshcommand|askpass|gitproxy|alternaterefscommand|alternaterefsprefixes)|protocol\..*|fetch\.bundleuri|transfer\.bundleuri|bundle\..*|gpg\..*|ssh\..*)$/s;
var DANGEROUS_GIT_CONFIG_KEYS =
  /^(?:http\.(?:postbuffer|version|lowspeedlimit|lowspeedtime|maxrequests|minsessions|maxrequestbuffer)|protocol\.version)$/s;
var LABEL_HEAD_TAIL = {
  head: 70,
  tail: 20,
};
//@ chunk-6vnxsn99.js:14925-15024 placement
function appendStderrLine(result, line) {
  let replaced = result.stderr.replace(/\n*$/, "");
  return {
    ...result,
    stderr: `${replaced}${
      replaced === ""
        ? ""
        : `
`
    }${line}
`,
  };
}
//@ chunk-6vnxsn99.js:15024-15194 placement
function laneConfigPairs(extraPairs, filterEntries, tailPairs) {
  return [
    ["credential.helper", ""],
    ...extraPairs,
    ["http.extraheader", ""],
    ["core.protectNTFS", "true"],
    ["core.protectHFS", "true"],
    ...tailPairs,
    ...isFilterConfigKey(filterDriverNames(filterEntries.map(([key]) => key))),
  ];
}
//@ chunk-6vnxsn99.js:15194-15262 placement
function definedEnvEntries(pairs, count) {
  return pairs.length === 0
    ? {}
    : pickByHelper(buildGitConfigEnv(count, pairs), (value) => value !== undefined);
}
//@ chunk-6vnxsn99.js:15262-19110 placement
/**
 * 判断能否以懒加载方式重试（promisor 远端、PATH、GIT_NO_LAZY_FETCH 等）。
 */
async function planLazyFetchRetry(
  dir,
  envPins,
  { repoFiltersOff, repository, programs, lazyFetch, fetchesFrom, ownConfigAsJudged, afterEachRead },
) {
  let movedFlag = {
    value: false,
  };
  let movedResult = {
    retry: false,
    why: "repository_moved_between_reads",
    forgone: GIT_DIRS_CHANGED,
  };
  let promisorRemote = fetchesFrom ?? (await findPromisorRemote(dir, repository, programs));
  if (fetchesFrom === undefined && afterEachRead !== undefined && !(await afterEachRead()))
    return movedResult;
  if (promisorRemote === null || promisorRemote === undefined)
    return {
      retry: false,
      why: promisorRemote === null ? "no_promisor_remote" : "promisor_remote_unread",
    };
  let operatorEnv = sanitizedPathEnv(programs?.base ?? effectiveEnvSnapshot());
  let gitOnPath = programs === undefined ? whichOnPath("git", operatorEnv.PATH ?? "") : "";
  if (gitOnPath === null)
    return {
      retry: false,
      why: "no_git_on_absolute_path",
      forgone:
        "no git executable is on an absolute PATH entry of the environment Claude Code was launched with",
    };
  let env = process.env;
  let lazyFetchSetting =
    getEnvVarCaseInsensitiveOnWindows(env, "GIT_NO_LAZY_FETCH") ??
    getEnvVarCaseInsensitiveOnWindows(operatorEnv, "GIT_NO_LAZY_FETCH");
  if (
    [env, operatorEnv].some((env) => {
      let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_NO_LAZY_FETCH");
      return envVarCaseInsensitiveOnWindows !== undefined && isEnvTruthy(envVarCaseInsensitiveOnWindows);
    })
  )
    return {
      retry: false,
      why: "lazy_fetch_switched_off",
      forgone:
        fetchesFrom === undefined
          ? "GIT_NO_LAZY_FETCH is set"
          : "GIT_NO_LAZY_FETCH is set, which switches this command off too",
    };
  let reduced = [env, operatorEnv].reduce((acc, env) => {
    let parts = getEnvVarCaseInsensitiveOnWindows(env, "GIT_ALLOW_PROTOCOL")?.split(":");
    return parts === undefined ? acc : acc.filter((transport) => parts.includes(transport));
  }, ALLOWED_GIT_URL_SCHEMES);
  if (reduced.length === 0)
    return {
      retry: false,
      why: "no_transport_admitted",
      forgone: "GIT_ALLOW_PROTOCOL admits neither https nor ssh",
    };
  let configEnv = gitConfigEnvOf(operatorEnv);
  let configRead = await gitConfigRead(
    dir,
    [
      "--get-regexp",
      fetchesFrom === undefined
        ? "^remote\\..*\\.(uploadpack|vcs)$"
        : `^(remote\\..*\\.(uploadpack|vcs)|remotes\\.${urlPatternToRegex(fetchesFrom)})$`,
    ],
    repository,
    configEnv.env,
    operatorEnv,
    programs,
  );
  if (afterEachRead !== undefined && !(await afterEachRead())) return movedResult;
  if (!(
    configRead.exitCode === 1 &&
    configRead.error === undefined &&
    !configRead.timedOut &&
    !configRead.maxBufferExceeded
  )) {
    if (
      fetchesFrom !== undefined &&
      configRead.stdout.split("\x00").some((line) => line.startsWith("remotes."))
    )
      return remoteIsGroupResult(fetchesFrom);
    return {
      retry: false,
      why: configRead.code === 0 ? "remote_names_a_program" : "remote_programs_unread",
      forgone:
        configRead.code === 0
          ? "a remote names an upload-pack or vcs program"
          : "git's configuration could not be read for a remote's upload-pack or vcs program",
    };
  }
  let filters = await listGitFilters(dir, {
    envPins,
    pin: repository,
    ...guardRunner(programs, afterEachRead, movedFlag),
  });
  if (movedFlag.value) return movedResult;
  if (!filters.ok)
    return {
      retry: false,
      why: filters.reason,
      forgone: describeGitConfigUnreadable(filters),
    };
  if (
    ownConfigAsJudged !== undefined &&
    ![ownConfigAsJudged, [...ownConfigAsJudged, ...ownConfigAsJudged]].some((candidate) =>
      import_sortedIndex_2(filters.entries, candidate),
    )
  )
    return {
      retry: false,
      why: "config_changed_after_checks",
      forgone: "the repository's git config changed after Claude Code checked it",
    };
  let found = filters.entries.find(([key]) => {
    let foldedKey = foldForCompare(key);
    return DANGEROUS_GIT_CONFIG_KEYS_2.test(foldedKey) && !DANGEROUS_GIT_CONFIG_KEYS.test(foldedKey);
  });
  if (found !== undefined)
    return {
      retry: false,
      why: "repository_steers_the_fetch",
      forgone: `the repository's own git config sets ${summarizeGitConfigKeys(found[0])} (${UNSAFE_CONFIG_HINT})`,
    };
  if (
    fetchesFrom !== undefined &&
    filters.entries.some(([key]) => foldForCompare(key) === foldForCompare(`remotes.${fetchesFrom}`))
  )
    return remoteIsGroupResult(fetchesFrom);
  let remoteUrl = fetchesFrom === undefined ? undefined : singleRemoteUrl(filters.entries, fetchesFrom);
  if (remoteUrl === null)
    return {
      retry: false,
      why: "named_remote_without_url",
      forgone: `the repository's own git config must set remote.${fetchesFrom}.url, and to no empty value`,
    };
  let gitConfigScoped = await readGitConfigScoped(
    dir,
    "^(credential\\.(.*\\.)?helper|core\\.sshcommand|ssh\\.variant|http\\.extraheader)$",
    {
      envPins: {
        ...envPins,
        ...configEnv.env,
      },
      base: operatorEnv,
      repository,
      buildInvocation: programs?.buildInvocation,
    },
  );
  if (afterEachRead !== undefined && !(await afterEachRead())) return movedResult;
  if (gitConfigScoped === null)
    return {
      retry: false,
      why: "user_config_unread",
      forgone: "your own git configuration could not be read",
    };
  let [sshCommand, remaining] = partitionAlias(gitConfigScoped, ([key]) => key === "core.sshcommand");
  let [variantEntries, remaining_2] = partitionAlias(remaining, ([key]) => key === "ssh.variant");
  let [extraHeaderEntries, remaining_3] = partitionAlias(remaining_2, ([key]) => key === "http.extraheader");
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(operatorEnv, "GIT_SSH_VARIANT");
  let configVariant = variantEntries.at(-1)?.[1];
  let sshVariant = envVarCaseInsensitiveOnWindows ?? configVariant;
  let batchSshCommand = buildBatchSshCommand(
    envVarCaseInsensitiveOnWindows === undefined && configVariant !== undefined
      ? {
          ...operatorEnv,
          GIT_SSH_VARIANT: configVariant,
        }
      : operatorEnv,
    sshCommand.at(-1)?.[1],
  );
  let recheck = await listGitFilters(dir, {
    envPins,
    pin: repository,
    ...guardRunner(programs, afterEachRead, movedFlag),
  });
  if (movedFlag.value) return movedResult;
  if (!recheck.ok || !import_sortedIndex_2(recheck.entries, filters.entries))
    return {
      retry: false,
      why: recheck.ok ? "config_changed_during_vet" : recheck.reason,
      forgone: "the repository's git config changed while it was being vetted",
    };
  return {
    retry: true,
    operatorEnv,
    git: gitOnPath,
    transports: reduced,
    env: {
      GIT_NO_LAZY_FETCH: lazyFetch === "off" || fetchesFrom !== undefined ? "1" : (lazyFetchSetting ?? "0"),
      GIT_ALLOW_PROTOCOL: reduced.join(":"),
      GIT_SSH_COMMAND: wrapWithCdCommand(homeDirOrDefault(), batchSshCommand.command),
      GIT_SSH_VARIANT: resolveSshVariant(sshVariant, batchSshCommand.command),
      GIT_ASKPASS: envPins.GIT_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(operatorEnv, "GIT_ASKPASS") ?? "",
      SSH_ASKPASS: envPins.SSH_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(operatorEnv, "SSH_ASKPASS") ?? "",
      ...configEnv.env,
      ...definedEnvEntries(
        laneConfigPairs(remaining_3, repoFiltersOff ? recheck.entries : [], [
          ["core.alternateRefsCommand", ":"],
        ]),
        configEnv.count,
      ),
    },
    userUnscopedExtraHeader: extraHeaderEntries.length > 0,
    promisorUrl:
      remoteUrl ??
      recheck.entries.findLast(([key]) => key === `remote.${promisorRemote}.url`)?.[1] ??
      undefined,
  };
}
//@ chunk-6vnxsn99.js:19110-19262 placement
function remoteIsGroupResult(fetchesFrom) {
  return {
    retry: false,
    why: "named_remote_is_a_group",
    forgone: `git's configuration sets remotes.${fetchesFrom}, which makes that name a group of remotes`,
  };
}
//@ chunk-6vnxsn99.js:19262-19393 placement
function singleRemoteUrl(entries, fetchesFrom) {
  let mapped = entries.filter(([key]) => key === `remote.${fetchesFrom}.url`).map(([, value]) => value);
  return mapped.every((url) => url !== null && url !== "") ? (mapped[0] ?? null) : null;
}
//@ chunk-6vnxsn99.js:19393-19449 placement
var PARTIAL_CLONE_CONFIG_KEY_RE = /^remote\.(.*)\.(promisor|partialclonefilter)$/s;
//@ chunk-6vnxsn99.js:19449-19559 placement
async function findPromisorRemote(dir, repository, programs) {
  let partialCloneConfig = await readPartialCloneConfig(dir, repository, programs);
  return partialCloneConfig === null || partialCloneConfig === undefined
    ? partialCloneConfig
    : (partialCloneConfig.extension ?? partialCloneConfig.remotes[0] ?? null);
}
//@ chunk-6vnxsn99.js:19559-20127 placement
async function readPartialCloneConfig(dir, repository = resolveGitDirsOrPlaceholder(dir), programs) {
  let result = await gitConfigRead(
    dir,
    ["--get-regexp", "^(extensions\\.partialclone|remote\\..*\\.(promisor|partialclonefilter))$"],
    repository,
    {},
    programs?.base,
    programs,
  );
  if (result.code !== 0) return result.exitCode === 1 ? null : undefined;
  let extensionRemote = null;
  let promisorRemotes = [];
  for (let line of result.stdout.split("\x00")) {
    let index = line.indexOf(`
`);
    let key = index === -1 ? line : line.slice(0, index);
    let value = index === -1 ? "true" : line.slice(index + 1);
    if (key === "extensions.partialclone") {
      extensionRemote = value === "" ? extensionRemote : value;
      continue;
    }
    let [, remoteName, field] = PARTIAL_CLONE_CONFIG_KEY_RE.exec(key) ?? [];
    if (
      remoteName !== undefined &&
      !promisorRemotes.includes(remoteName) &&
      (field === "partialclonefilter" || !["false", "no", "off", "0", ""].includes(value.toLowerCase()))
    )
      promisorRemotes.push(remoteName);
  }
  return {
    extension: extensionRemote,
    remotes: promisorRemotes,
  };
}
//@ chunk-6vnxsn99.js:20127-20381 placement
function gitConfigRead(dir, args, repository, envPins, operatorEnv, programs) {
  let laneInvocation = buildLaneInvocation(
    programs,
    gitExe,
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--includes", "--null", ...args],
    {
      dir,
      env: getRemoteHostSessionCount(envPins, {
        base: operatorEnv,
        repository,
      }),
    },
  );
  return execFileNoThrowWithCwd(laneInvocation.file, laneInvocation.args, {
    cwd: laneInvocation.cwd,
    env: laneInvocation.env,
    ...(operatorEnv !== undefined && {
      extendEnv: false,
    }),
    timeout: 5000,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
}
//@ chunk-6vnxsn99.js:20381-20548 placement
function sanitizedPathEnv(env) {
  let out = {
    ...env,
  };
  let isWindows = getPlatform() === "windows";
  for (let key of Object.keys(out))
    if (key === "PATH" || (isWindows && key.toUpperCase() === "PATH")) delete out[key];
  out.PATH = sanitizePathEnv(getEnvCaseInsensitive(env, "PATH") ?? "");
  return out;
}
//@ chunk-6vnxsn99.js:20548-20588 placement
var GIT_FILES_REF_BACKEND_ENV = {
  GIT_REFERENCE_BACKEND: "files",
};
export {
  runGitInOwnWorkTree,
  isNetworkGitUrl,
  ownProperty,
  gitReadInOwnWorkTree,
  GIT_FILES_REF_BACKEND_ENV,
  withSafeGitConfig,
  gitConfigEnvOf,
  readPartialCloneConfig,
};
