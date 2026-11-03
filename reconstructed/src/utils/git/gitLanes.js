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
import { En, SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-6vnxsn99.js:5777-5843 placement
function ownProperty(e, n) {
  return e !== undefined && Object.hasOwn(e, n) ? e[n] : undefined;
}
//@ chunk-6vnxsn99.js:5875-6326 placement
function gitConfigEnvOf(e) {
  let n = {};
  for (let s of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, s);
    if (envVarCaseInsensitiveOnWindows !== undefined) n[s] = envVarCaseInsensitiveOnWindows;
  }
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, "GIT_CONFIG_COUNT");
  let o = Number(envVarCaseInsensitiveOnWindows);
  if (envVarCaseInsensitiveOnWindows === undefined || !Number.isInteger(o) || o <= 0)
    return {
      env: n,
      count: undefined,
    };
  n.GIT_CONFIG_COUNT = envVarCaseInsensitiveOnWindows;
  for (let j = 0; j < o; j++) {
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, `GIT_CONFIG_KEY_${j}`);
    if (envVarCaseInsensitiveOnWindows === undefined) break;
    n[`GIT_CONFIG_KEY_${j}`] = envVarCaseInsensitiveOnWindows;
    let envVarCaseInsensitiveOnWindows_2 = getEnvVarCaseInsensitiveOnWindows(e, `GIT_CONFIG_VALUE_${j}`);
    if (envVarCaseInsensitiveOnWindows_2 !== undefined)
      n[`GIT_CONFIG_VALUE_${j}`] = envVarCaseInsensitiveOnWindows_2;
  }
  return {
    env: n,
    count: envVarCaseInsensitiveOnWindows,
  };
}
//@ chunk-6vnxsn99.js:6326-6481 placement
var HTTP_SSL_CONFIG_KEY_RE =
  /^http\.(?:.*\.)?(?:ssl(?:cainfo|capath|verify|version|cipherlist|backend|try)|schannel(?:checkrevoke|usesslcainfo)|pinnedpubkey|proxysslcainfo)$/i;
//@ chunk-6vnxsn99.js:6481-6738 placement
function safeGitConfigEnv() {
  let { env, count } = gitConfigEnvOf(effectiveEnvSnapshot());
  let r = [];
  for (let j = 0; j < Number(count ?? 0); j++) {
    let s = env[`GIT_CONFIG_KEY_${j}`];
    let a = env[`GIT_CONFIG_VALUE_${j}`];
    if (s === undefined) break;
    if (a !== undefined && HTTP_SSL_CONFIG_KEY_RE.test(s)) r.push([s, a]);
  }
  return r.length === 0 ? {} : pickByHelper(buildGitConfigEnv(undefined, r), (o) => o !== undefined);
}
//@ chunk-6vnxsn99.js:6738-6785 placement
function withSafeGitConfig(worktreePath, n) {
  return buildGitEnvVarsForRepo(worktreePath, {
    ...safeGitConfigEnv(),
    ...n,
  });
}
//@ chunk-6vnxsn99.js:6785-8208 placement
/**
 * 在自身 worktree 里运行 git（materializeWorkTree）：校验 remote 名、关闭递归子模块、处理 partial-clone 懒加载与 promisor remote，返回 stdout/stderr/code 与 lane 信息。
 */
async function runGitInOwnWorkTree(
  cloneDir,
  n,
  r = {},
  {
    timeout: o,
    abortSignal: s,
    withoutControllingTerminal: a,
    waitForExitAfterKill: u,
    maxBuffer: h,
    stripFinalNewline: p,
    programs: S,
    input: y,
    lazyFetch: T,
    fetchesFrom: b,
    ownConfigAsJudged: w,
    afterEachRead: E,
    repository: A,
  } = {},
) {
  let x = b === undefined ? undefined : normalizeRemoteName(b);
  if (x === null)
    return notStartedResult(
      "remote_name_not_plain",
      "the remote's name must begin with a letter or a digit and contain only letters, digits, '.', '_' and '-'",
    );
  let O = [...n];
  let ownConfigAsJudged = w?.map(([G, B]) => [G, B]);
  if (x !== undefined && !isSafeFetchArgs(O, x))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `materializeWorkTree: with fetchesFrom, the arguments must be -c pairs if any, then fetch or ls-remote, then options, then --end-of-options, then that remote's name. Each option must carry its value after '=' (--depth=1), begin with --no-, or be one of ${[...SAFE_FETCH_FLAGS].join(", ")}. A fetch needs --no-recurse-submodules. No option may begin with --rec.`,
      "partial-clone lane called with fetchesFrom and a command that is not in the form it requires",
    );
  let F = A ?? resolveGitDirsOrPlaceholder(cloneDir);
  let P = S === undefined ? undefined : wrapCheckedPrograms(S);
  let D = {
    value: false,
  };
  let M = await listGitFilters(cloneDir, {
    envPins: r,
    pin: F,
    ...guardRunner(P, E, D),
  });
  if (D.value) return notStartedResult("repository_moved_between_reads", GIT_DIRS_CHANGED);
  if (!M.ok) return notStartedResult(M.reason, describeGitConfigUnreadable(M));
  if (s?.aborted) return notStartedResult("aborted", CANCELLED_BEFORE_START);
  return runGitInLane(
    execFileNoThrowWithCwd,
    cloneDir,
    O,
    r,
    M.entries,
    {
      timeout: o,
      abortSignal: s,
      withoutControllingTerminal: a,
      waitForExitAfterKill: u,
      maxBuffer: h,
      stripFinalNewline: p,
      repository: F,
    },
    {
      programs: P,
      input: y,
      lazyFetch: T,
      fetchesFrom: x,
      ownConfigAsJudged,
      ...(E !== undefined && {
        afterEachRead: E,
      }),
    },
  );
}
//@ chunk-6vnxsn99.js:8208-8442 placement
function gitReadInOwnWorkTree(e, n, r = {}, o = {}) {
  let s = n[gitSubcommandIndex(n)];
  if (s === undefined || !ALLOWED_REMOTE_SUBCOMMANDS.has(s))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gitInOwnWorkTree runs reads only, not git ${s ?? "(no subcommand)"}`,
      "gitInOwnWorkTree called with a non-read git subcommand",
    );
  return runGitInLane(execFileNoThrow, e, n, r, null, o);
}
//@ chunk-6vnxsn99.js:8442-8527 placement
function gitSubcommandIndex(e) {
  return e.findIndex((n, r) => !n.startsWith("-") && (r === 0 || e[r - 1] !== "-c"));
}
//@ chunk-6vnxsn99.js:8527-8599 placement
var ALLOWED_REMOTE_SUBCOMMANDS = new Set(["diff", "format-patch", "log", "show"]);
var ALLOWED_GIT_URL_SCHEMES = ["https", "ssh"];
//@ chunk-6vnxsn99.js:8599-8641 placement
function isNetworkGitUrl(e) {
  return ALLOWED_GIT_URL_SCHEMES.includes(gitUrlScheme(e));
}
//@ chunk-6vnxsn99.js:8641-8962 placement
function gitUrlScheme(promisorUrl) {
  let n = /^[A-Za-z0-9][A-Za-z0-9+.-]*(?=::)/.exec(promisorUrl)?.[0];
  if (n !== undefined) return n;
  let r = /^([a-z][a-z0-9+.-]*):\/\//i.exec(promisorUrl)?.[1];
  if (r !== undefined) return r === "git+ssh" || r === "ssh+git" ? "ssh" : r;
  let index = promisorUrl.indexOf(":");
  let index_2 = promisorUrl.indexOf("/");
  return index === -1 ||
    (index_2 !== -1 && index_2 < index) ||
    (getPlatform() === "windows" && /^[A-Za-z]:[\\/]/.test(promisorUrl))
    ? "file"
    : "ssh";
}
//@ chunk-6vnxsn99.js:8962-9036 placement
var TRANSPORT_NOT_ALLOWED_RE = /^fatal: transport '([A-Za-z][A-Za-z0-9+.-]{0,31})' not allowed$/m;
//@ chunk-6vnxsn99.js:9036-9103 placement
function normalizeRemoteName(e) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(e) ? e : null;
}
//@ chunk-6vnxsn99.js:9103-9179 placement
var SAFE_FETCH_FLAGS = new Set(["--stdin", "--negotiate-only", "--refs", "--heads", "--quiet"]);
//@ chunk-6vnxsn99.js:9179-9531 placement
/**
 * 参数是否为只读 fetch/ls-remote 且关闭递归子模块。
 */
function isSafeFetchArgs(e, n) {
  let r = gitSubcommandIndex(e);
  let index = e.indexOf("--end-of-options");
  let sliced = e.slice(r + 1, index);
  return (
    e.slice(0, r).every((a, u) => u % 2 === 1 || a === "-c") &&
    ["fetch", "ls-remote"].includes(e[r] ?? "") &&
    index > r &&
    sliced.every((a) => /^--no-[a-z]|^--[a-z][a-z-]*=/.test(a) || SAFE_FETCH_FLAGS.has(a)) &&
    (e[r] === "ls-remote" || sliced.includes("--no-recurse-submodules")) &&
    !sliced.some((a) => a.startsWith("--rec")) &&
    e[index + 1] === n
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
function notStartedResult(why, n) {
  return {
    stdout: "",
    stderr: `git was not run: ${n}.
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
function wrapCheckedPrograms(e) {
  return {
    base: e.base,
    buildInvocation: (n, r) => {
      let invocation = e.buildInvocation([...n], {
        dir: r.dir,
        env: {
          ...r.env,
        },
      });
      let s = {
        file: invocation.file,
        args: [...invocation.args],
        cwd: invocation.cwd,
        env: {
          ...invocation.env,
        },
      };
      if (!isAbsolutePathEntry(s.file) || buildSafeGitInvocation(s.file, [], s.env) === null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "programs.buildInvocation must return an absolute path to a file named git",
          "partial-clone lane called with programs whose file is not an absolute path to git",
        );
      if (
        ![[], ["-C", r.dir], ["-C", resolve(r.dir)]].some((a) => En(s.args, [...a, ...n])) ||
        Object.keys(r.env).some((key) =>
          Object.hasOwn(s.env, key) ? s.env[key] !== r.env[key] : !/^(?:OLD)?PWD$/i.test(key),
        ) ||
        Object.keys(s.env).some((key) => !Object.hasOwn(r.env, key))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "programs.buildInvocation must return the environment it was handed, less at most PWD and OLDPWD, and the arguments it was handed, with nothing before them but -C and the directory it was handed; it changed the environment or the arguments",
          "partial-clone lane called with programs that do not keep the environment and arguments handed to them",
        );
      return s;
    },
  };
}
//@ chunk-6vnxsn99.js:10799-10904 placement
function buildLaneInvocation(e, gitExe, r, o) {
  return e === undefined
    ? {
        file: gitExe(),
        args: [...r],
        cwd: o.dir,
        env: o.env,
      }
    : e.buildInvocation(r, o);
}
//@ chunk-6vnxsn99.js:10904-11092 placement
function guardRunner(programs, afterEachRead, r) {
  let runner = toRunner(programs);
  let run = runner.run ?? runGitQuietStdin;
  return afterEachRead === undefined
    ? runner
    : {
        ...runner,
        run: async (a, u) => {
          if (r.value)
            return {
              code: 1,
              stdout: "",
              stderr: "",
            };
          let h = await run(a, u);
          if (!(await afterEachRead())) r.value = true;
          return h;
        },
      };
}
//@ chunk-6vnxsn99.js:11092-11244 placement
function toRunner(e) {
  return e === undefined
    ? {}
    : {
        base: e.base,
        run: (n, { cwd, env, extendEnv, ...a }) =>
          runInvocation(
            e.buildInvocation(n, {
              dir: cwd,
              env,
            }),
            {
              ...a,
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
  e,
  n,
  r,
  o,
  s,
  { repository, ...u },
  { programs: h, input: p, lazyFetch: S, fetchesFrom: y, ownConfigAsJudged: T, afterEachRead: b } = {},
) {
  let w =
    p === undefined
      ? {
          stdin: "ignore",
        }
      : {
          input: p,
        };
  let A =
    y === undefined
      ? await (() => {
          let laneInvocation = buildLaneInvocation(h, gitExe, r, {
            dir: n,
            env: getRemoteHostSessionCount(
              {
                ...o,
                ...definedEnvEntries(s === null ? [] : laneConfigPairs([], s, [])),
              },
              {
                repository,
                base: h?.base,
                userLocale: true,
              },
            ),
          });
          return e(laneInvocation.file, laneInvocation.args, {
            ...u,
            cwd: laneInvocation.cwd,
            env: laneInvocation.env,
            ...(h !== undefined && {
              extendEnv: false,
            }),
            ...w,
          });
        })()
      : FAILED_RESULT;
  if (A.code === 0)
    return {
      ...A,
      lane: {
        kind: "first_attempt_succeeded",
      },
    };
  let x = () =>
    y === undefined
      ? {
          ...A,
          lane: {
            kind: "first_attempt_cut",
          },
        }
      : notStartedResult("aborted", CANCELLED_BEFORE_START);
  if (
    A.timedOut ||
    A.maxBufferExceeded ||
    u.abortSignal?.aborted ||
    (u.withoutControllingTerminal === true && isCleanupStarted())
  )
    return x();
  let repository_2 = repository ?? resolveGitDirsOrPlaceholder(findGitRoot(n) ?? n);
  let R = await planLazyFetchRetry(n, o, {
    repoFiltersOff: s !== null,
    repository: repository_2,
    programs: h,
    lazyFetch: S,
    fetchesFrom: y,
    ownConfigAsJudged: T,
    afterEachRead: b,
  });
  if (s !== null && u.abortSignal?.aborted) return x();
  if (!R.retry)
    return {
      ...(R.forgone === undefined
        ? A
        : appendStderrLine(
            A,
            y === undefined
              ? `No lazy fetch from the promisor remote was attempted: ${R.forgone}.`
              : `The remote ${y} was not contacted: ${R.forgone}.`,
          )),
      lane: {
        kind: "forgone",
        why: R.why,
      },
    };
  logForDebugging(
    y === undefined
      ? `[git] ${n} is a partial clone: retrying with ${S === "off" ? `lazy fetch off, over ${R.transports.join(" or ")}` : "a constrained lazy fetch"}`
      : `[git] ${n}: contacting the remote ${y}, over ${R.transports.join(" or ")}`,
  );
  let laneInvocation = buildLaneInvocation(h, () => R.git, r, {
    dir: n,
    env: getRemoteHostSessionCount(
      {
        ...o,
        ...R.env,
      },
      {
        base: R.operatorEnv,
        repository: repository_2,
      },
    ),
  });
  let P = {
    ...(await e(laneInvocation.file, laneInvocation.args, {
      ...u,
      cwd: laneInvocation.cwd,
      env: laneInvocation.env,
      extendEnv: false,
      ...w,
    })),
    lane: {
      kind: "retried",
    },
  };
  if (P.code === 0) return P;
  let D =
    R.promisorUrl === undefined
      ? undefined
      : printableLabel(redactSshUserinfo(redactUrlsTracked(R.promisorUrl)), LABEL_HEAD_TAIL);
  let M = P;
  let G = TRANSPORT_NOT_ALLOWED_RE.exec(P.stderr)?.[1];
  if (G !== undefined && !R.transports.includes(G)) {
    let joined = R.transports.join(" or ");
    M = appendStderrLine(
      M,
      y === undefined
        ? `Nothing was fetched: a partial clone's lazy fetch runs over ${joined} only, and the promisor remote the repository's own config names, ${D ?? "one it does not spell out"}, is reached over ${G}${R.promisorUrl !== undefined && R.transports.includes(gitUrlScheme(R.promisorUrl)) ? ", not the transport that URL spells \u2014 a url.<base>.insteadOf rule in your git configuration, or a second promisor URL in the repository's, would account for that" : ""}.`
        : `The remote ${y} was not contacted: this command runs over ${joined} only, and the URL the repository's own config gives it, ${D ?? "one it does not spell out"}, is reached over ${G}${R.promisorUrl !== undefined && R.transports.includes(gitUrlScheme(R.promisorUrl)) ? `, not the transport that URL spells. A url.<base>.insteadOf rule, or a remote.${y}.url, in your own git configuration would account for that` : ""}.`,
    );
  }
  if (R.userUnscopedExtraHeader)
    M = appendStderrLine(
      M,
      y === undefined
        ? `The lazy fetch did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config names as its promisor remote, here ${D ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`
        : `The command did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config gives for the remote ${y}, here ${D ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`,
    );
  return {
    ...M,
    stderrOfGitAlone: P.stderr,
  };
}
//@ chunk-6vnxsn99.js:14477-14925 placement = readHeadAndTail (0.802)
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
function appendStderrLine(e, n) {
  let replaced = e.stderr.replace(/\n*$/, "");
  return {
    ...e,
    stderr: `${replaced}${
      replaced === ""
        ? ""
        : `
`
    }${n}
`,
  };
}
//@ chunk-6vnxsn99.js:15024-15194 placement
function laneConfigPairs(e, n, r) {
  return [
    ["credential.helper", ""],
    ...e,
    ["http.extraheader", ""],
    ["core.protectNTFS", "true"],
    ["core.protectHFS", "true"],
    ...r,
    ...isFilterConfigKey(filterDriverNames(n.map(([o]) => o))),
  ];
}
//@ chunk-6vnxsn99.js:15194-15262 placement
function definedEnvEntries(e, count) {
  return e.length === 0 ? {} : pickByHelper(buildGitConfigEnv(count, e), (r) => r !== undefined);
}
//@ chunk-6vnxsn99.js:15262-19110 placement
/**
 * 判断能否以懒加载方式重试（promisor 远端、PATH、GIT_NO_LAZY_FETCH 等）。
 */
async function planLazyFetchRetry(
  dir,
  n,
  { repoFiltersOff, repository, programs, lazyFetch, fetchesFrom, ownConfigAsJudged, afterEachRead },
) {
  let S = {
    value: false,
  };
  let y = {
    retry: false,
    why: "repository_moved_between_reads",
    forgone: GIT_DIRS_CHANGED,
  };
  let T = fetchesFrom ?? (await findPromisorRemote(dir, repository, programs));
  if (fetchesFrom === undefined && afterEachRead !== undefined && !(await afterEachRead())) return y;
  if (T === null || T === undefined)
    return {
      retry: false,
      why: T === null ? "no_promisor_remote" : "promisor_remote_unread",
    };
  let b = sanitizedPathEnv(programs?.base ?? effectiveEnvSnapshot());
  let w = programs === undefined ? whichOnPath("git", b.PATH ?? "") : "";
  if (w === null)
    return {
      retry: false,
      why: "no_git_on_absolute_path",
      forgone:
        "no git executable is on an absolute PATH entry of the environment Claude Code was launched with",
    };
  let env = process.env;
  let A =
    getEnvVarCaseInsensitiveOnWindows(env, "GIT_NO_LAZY_FETCH") ??
    getEnvVarCaseInsensitiveOnWindows(b, "GIT_NO_LAZY_FETCH");
  if (
    [env, b].some((L) => {
      let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(L, "GIT_NO_LAZY_FETCH");
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
  let reduced = [env, b].reduce((acc, z) => {
    let parts = getEnvVarCaseInsensitiveOnWindows(z, "GIT_ALLOW_PROTOCOL")?.split(":");
    return parts === undefined ? acc : acc.filter((ie) => parts.includes(ie));
  }, ALLOWED_GIT_URL_SCHEMES);
  if (reduced.length === 0)
    return {
      retry: false,
      why: "no_transport_admitted",
      forgone: "GIT_ALLOW_PROTOCOL admits neither https nor ssh",
    };
  let O = gitConfigEnvOf(b);
  let R = await gitConfigRead(
    dir,
    [
      "--get-regexp",
      fetchesFrom === undefined
        ? "^remote\\..*\\.(uploadpack|vcs)$"
        : `^(remote\\..*\\.(uploadpack|vcs)|remotes\\.${urlPatternToRegex(fetchesFrom)})$`,
    ],
    repository,
    O.env,
    b,
    programs,
  );
  if (afterEachRead !== undefined && !(await afterEachRead())) return y;
  if (!(R.exitCode === 1 && R.error === undefined && !R.timedOut && !R.maxBufferExceeded)) {
    if (fetchesFrom !== undefined && R.stdout.split("\x00").some((L) => L.startsWith("remotes.")))
      return remoteIsGroupResult(fetchesFrom);
    return {
      retry: false,
      why: R.code === 0 ? "remote_names_a_program" : "remote_programs_unread",
      forgone:
        R.code === 0
          ? "a remote names an upload-pack or vcs program"
          : "git's configuration could not be read for a remote's upload-pack or vcs program",
    };
  }
  let P = await listGitFilters(dir, {
    envPins: n,
    pin: repository,
    ...guardRunner(programs, afterEachRead, S),
  });
  if (S.value) return y;
  if (!P.ok)
    return {
      retry: false,
      why: P.reason,
      forgone: describeGitConfigUnreadable(P),
    };
  if (
    ownConfigAsJudged !== undefined &&
    ![ownConfigAsJudged, [...ownConfigAsJudged, ...ownConfigAsJudged]].some((L) => En(P.entries, L))
  )
    return {
      retry: false,
      why: "config_changed_after_checks",
      forgone: "the repository's git config changed after Claude Code checked it",
    };
  let found = P.entries.find(([L]) => {
    let z = foldForCompare(L);
    return DANGEROUS_GIT_CONFIG_KEYS_2.test(z) && !DANGEROUS_GIT_CONFIG_KEYS.test(z);
  });
  if (found !== undefined)
    return {
      retry: false,
      why: "repository_steers_the_fetch",
      forgone: `the repository's own git config sets ${summarizeGitConfigKeys(found[0])} (${UNSAFE_CONFIG_HINT})`,
    };
  if (
    fetchesFrom !== undefined &&
    P.entries.some(([L]) => foldForCompare(L) === foldForCompare(`remotes.${fetchesFrom}`))
  )
    return remoteIsGroupResult(fetchesFrom);
  let M = fetchesFrom === undefined ? undefined : singleRemoteUrl(P.entries, fetchesFrom);
  if (M === null)
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
        ...n,
        ...O.env,
      },
      base: b,
      repository,
      buildInvocation: programs?.buildInvocation,
    },
  );
  if (afterEachRead !== undefined && !(await afterEachRead())) return y;
  if (gitConfigScoped === null)
    return {
      retry: false,
      why: "user_config_unread",
      forgone: "your own git configuration could not be read",
    };
  let [B, me] = SS(gitConfigScoped, ([L]) => L === "core.sshcommand");
  let [se, N] = SS(me, ([L]) => L === "ssh.variant");
  let [q, K] = SS(N, ([L]) => L === "http.extraheader");
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(b, "GIT_SSH_VARIANT");
  let j = se.at(-1)?.[1];
  let Z = envVarCaseInsensitiveOnWindows ?? j;
  let batchSshCommand = buildBatchSshCommand(
    envVarCaseInsensitiveOnWindows === undefined && j !== undefined
      ? {
          ...b,
          GIT_SSH_VARIANT: j,
        }
      : b,
    B.at(-1)?.[1],
  );
  let Y = await listGitFilters(dir, {
    envPins: n,
    pin: repository,
    ...guardRunner(programs, afterEachRead, S),
  });
  if (S.value) return y;
  if (!Y.ok || !En(Y.entries, P.entries))
    return {
      retry: false,
      why: Y.ok ? "config_changed_during_vet" : Y.reason,
      forgone: "the repository's git config changed while it was being vetted",
    };
  return {
    retry: true,
    operatorEnv: b,
    git: w,
    transports: reduced,
    env: {
      GIT_NO_LAZY_FETCH: lazyFetch === "off" || fetchesFrom !== undefined ? "1" : (A ?? "0"),
      GIT_ALLOW_PROTOCOL: reduced.join(":"),
      GIT_SSH_COMMAND: wrapWithCdCommand(homeDirOrDefault(), batchSshCommand.command),
      GIT_SSH_VARIANT: resolveSshVariant(Z, batchSshCommand.command),
      GIT_ASKPASS: n.GIT_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(b, "GIT_ASKPASS") ?? "",
      SSH_ASKPASS: n.SSH_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(b, "SSH_ASKPASS") ?? "",
      ...O.env,
      ...definedEnvEntries(
        laneConfigPairs(K, repoFiltersOff ? Y.entries : [], [["core.alternateRefsCommand", ":"]]),
        O.count,
      ),
    },
    userUnscopedExtraHeader: q.length > 0,
    promisorUrl: M ?? Y.entries.findLast(([L]) => L === `remote.${T}.url`)?.[1] ?? undefined,
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
  let mapped = entries.filter(([o]) => o === `remote.${fetchesFrom}.url`).map(([, o]) => o);
  return mapped.every((o) => o !== null && o !== "") ? (mapped[0] ?? null) : null;
}
//@ chunk-6vnxsn99.js:19393-19449 placement
var PARTIAL_CLONE_CONFIG_KEY_RE = /^remote\.(.*)\.(promisor|partialclonefilter)$/s;
//@ chunk-6vnxsn99.js:19449-19559 placement
async function findPromisorRemote(e, repository, programs) {
  let partialCloneConfig = await readPartialCloneConfig(e, repository, programs);
  return partialCloneConfig === null || partialCloneConfig === undefined
    ? partialCloneConfig
    : (partialCloneConfig.extension ?? partialCloneConfig.remotes[0] ?? null);
}
//@ chunk-6vnxsn99.js:19559-20127 placement
async function readPartialCloneConfig(dir, repository = resolveGitDirsOrPlaceholder(dir), r) {
  let o = await gitConfigRead(
    dir,
    ["--get-regexp", "^(extensions\\.partialclone|remote\\..*\\.(promisor|partialclonefilter))$"],
    repository,
    {},
    r?.base,
    r,
  );
  if (o.code !== 0) return o.exitCode === 1 ? null : undefined;
  let s = null;
  let a = [];
  for (let u of o.stdout.split("\x00")) {
    let index = u.indexOf(`
`);
    let p = index === -1 ? u : u.slice(0, index);
    let S = index === -1 ? "true" : u.slice(index + 1);
    if (p === "extensions.partialclone") {
      s = S === "" ? s : S;
      continue;
    }
    let [, y, T] = PARTIAL_CLONE_CONFIG_KEY_RE.exec(p) ?? [];
    if (
      y !== undefined &&
      !a.includes(y) &&
      (T === "partialclonefilter" || !["false", "no", "off", "0", ""].includes(S.toLowerCase()))
    )
      a.push(y);
  }
  return {
    extension: s,
    remotes: a,
  };
}
//@ chunk-6vnxsn99.js:20127-20381 placement
function gitConfigRead(dir, n, repository, o, s, a) {
  let laneInvocation = buildLaneInvocation(
    a,
    gitExe,
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--includes", "--null", ...n],
    {
      dir,
      env: getRemoteHostSessionCount(o, {
        base: s,
        repository,
      }),
    },
  );
  return execFileNoThrowWithCwd(laneInvocation.file, laneInvocation.args, {
    cwd: laneInvocation.cwd,
    env: laneInvocation.env,
    ...(s !== undefined && {
      extendEnv: false,
    }),
    timeout: 5000,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
}
//@ chunk-6vnxsn99.js:20381-20548 placement
function sanitizedPathEnv(e) {
  let n = {
    ...e,
  };
  let r = getPlatform() === "windows";
  for (let key of Object.keys(n)) if (key === "PATH" || (r && key.toUpperCase() === "PATH")) delete n[key];
  n.PATH = sanitizePathEnv(getEnvCaseInsensitive(e, "PATH") ?? "");
  return n;
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
