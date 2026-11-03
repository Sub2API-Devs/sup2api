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
import { resolve, resolve as resolve_2 } from "path";
import {
  getEnvVarCaseInsensitiveOnWindows,
  buildGitConfigEnv,
  buildBatchSshCommand,
  wrapWithCdCommand,
  xut,
  resolveSshVariant,
} from "../gitSafeExec.js";
import { cte } from "../settings/envSources.js";
import { Do, freeze } from "./gitSafeEnv.js";
import { buildGitEnvVarsForRepo, resolveGitDirsOrPlaceholder } from "./gitDirResolution.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import {
  listGitFilters,
  describeGitConfigUnreadable,
  P8o,
  isFilterConfigKey,
  filterDriverNames,
  Mwn,
  summarizeGitConfigKeys,
  x8o,
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
  return e !== void 0 && Object.hasOwn(e, n) ? e[n] : void 0;
}
//@ chunk-6vnxsn99.js:5875-6326 placement
function gitConfigEnvOf(e) {
  let n = {};
  for (let s of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let a = getEnvVarCaseInsensitiveOnWindows(e, s);
    if (a !== void 0) n[s] = a;
  }
  let r = getEnvVarCaseInsensitiveOnWindows(e, "GIT_CONFIG_COUNT"),
    o = Number(r);
  if (r === void 0 || !Number.isInteger(o) || o <= 0) return { env: n, count: void 0 };
  n.GIT_CONFIG_COUNT = r;
  for (let s = 0; s < o; s++) {
    let a = getEnvVarCaseInsensitiveOnWindows(e, `GIT_CONFIG_KEY_${s}`);
    if (a === void 0) break;
    n[`GIT_CONFIG_KEY_${s}`] = a;
    let u = getEnvVarCaseInsensitiveOnWindows(e, `GIT_CONFIG_VALUE_${s}`);
    if (u !== void 0) n[`GIT_CONFIG_VALUE_${s}`] = u;
  }
  return { env: n, count: r };
}
//@ chunk-6vnxsn99.js:6326-6481 placement
var HTTP_SSL_CONFIG_KEY_RE =
  /^http\.(?:.*\.)?(?:ssl(?:cainfo|capath|verify|version|cipherlist|backend|try)|schannel(?:checkrevoke|usesslcainfo)|pinnedpubkey|proxysslcainfo)$/i;
//@ chunk-6vnxsn99.js:6481-6738 placement
function safeGitConfigEnv() {
  let { env: env, count: count } = gitConfigEnvOf(cte()),
    r = [];
  for (let o = 0; o < Number(count ?? 0); o++) {
    let s = env[`GIT_CONFIG_KEY_${o}`],
      a = env[`GIT_CONFIG_VALUE_${o}`];
    if (s === void 0) break;
    if (a !== void 0 && HTTP_SSL_CONFIG_KEY_RE.test(s)) r.push([s, a]);
  }
  return r.length === 0 ? {} : Do(buildGitConfigEnv(void 0, r), (o) => o !== void 0);
}
//@ chunk-6vnxsn99.js:6738-6785 placement
function withSafeGitConfig(e, n) {
  return buildGitEnvVarsForRepo(e, { ...safeGitConfigEnv(), ...n });
}
/**
 * 在自身 worktree 里运行 git（materializeWorkTree）：校验 remote 名、关闭递归子模块、处理 partial-clone 懒加载与 promisor remote，返回 stdout/stderr/code 与 lane 信息。
 */
//@ chunk-6vnxsn99.js:6785-8208 placement
async function runGitInOwnWorkTree(
  e,
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
  let x = b === void 0 ? void 0 : Fn(b);
  if (x === null)
    return notStartedResult(
      "remote_name_not_plain",
      "the remote's name must begin with a letter or a digit and contain only letters, digits, '.', '_' and '-'",
    );
  let O = [...n],
    R = w?.map(([G, B]) => [G, B]);
  if (x !== void 0 && !isSafeFetchArgs(O, x))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `materializeWorkTree: with fetchesFrom, the arguments must be -c pairs if any, then fetch or ls-remote, then options, then --end-of-options, then that remote's name. Each option must carry its value after '=' (--depth=1), begin with --no-, or be one of ${[...ft].join(", ")}. A fetch needs --no-recurse-submodules. No option may begin with --rec.`,
      "partial-clone lane called with fetchesFrom and a command that is not in the form it requires",
    );
  let F = A ?? resolveGitDirsOrPlaceholder(e),
    P = S === void 0 ? void 0 : wrapCheckedPrograms(S),
    D = { value: !1 },
    M = await listGitFilters(e, { envPins: r, pin: F, ...guardRunner(P, E, D) });
  if (D.value) return notStartedResult("repository_moved_between_reads", GIT_DIRS_CHANGED);
  if (!M.ok) return notStartedResult(M.reason, describeGitConfigUnreadable(M));
  if (s?.aborted) return notStartedResult("aborted", CANCELLED_BEFORE_START);
  return runGitInLane(
    execFileNoThrowWithCwd,
    e,
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
      ownConfigAsJudged: R,
      ...(E !== void 0 && { afterEachRead: E }),
    },
  );
}
//@ chunk-6vnxsn99.js:8208-8442 placement
function gitReadInOwnWorkTree(e, n, r = {}, o = {}) {
  let s = n[lt(n)];
  if (s === void 0 || !Ln.has(s))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gitInOwnWorkTree runs reads only, not git ${s ?? "(no subcommand)"}`,
      "gitInOwnWorkTree called with a non-read git subcommand",
    );
  return runGitInLane(execFileNoThrow, e, n, r, null, o);
}
//@ chunk-6vnxsn99.js:8442-8527 placement
function lt(e) {
  return e.findIndex((n, r) => !n.startsWith("-") && (r === 0 || e[r - 1] !== "-c"));
}
//@ chunk-6vnxsn99.js:8527-8599 placement
var Ln = new Set(["diff", "format-patch", "log", "show"]),
  ct = ["https", "ssh"];
//@ chunk-6vnxsn99.js:8599-8641 placement
function isNetworkGitUrl(e) {
  return ct.includes(gitUrlScheme(e));
}
//@ chunk-6vnxsn99.js:8641-8962 placement
function gitUrlScheme(e) {
  let n = /^[A-Za-z0-9][A-Za-z0-9+.-]*(?=::)/.exec(e)?.[0];
  if (n !== void 0) return n;
  let r = /^([a-z][a-z0-9+.-]*):\/\//i.exec(e)?.[1];
  if (r !== void 0) return r === "git+ssh" || r === "ssh+git" ? "ssh" : r;
  let index = e.indexOf(":"),
    index_2 = e.indexOf("/");
  return index === -1 ||
    (index_2 !== -1 && index_2 < index) ||
    (getPlatform() === "windows" && /^[A-Za-z]:[\\/]/.test(e))
    ? "file"
    : "ssh";
}
//@ chunk-6vnxsn99.js:8962-9036 placement
var Mn = /^fatal: transport '([A-Za-z][A-Za-z0-9+.-]{0,31})' not allowed$/m;
//@ chunk-6vnxsn99.js:9036-9103 placement
function Fn(e) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(e) ? e : null;
}
//@ chunk-6vnxsn99.js:9103-9179 placement
var ft = new Set(["--stdin", "--negotiate-only", "--refs", "--heads", "--quiet"]);
/**
 * 参数是否为只读 fetch/ls-remote 且关闭递归子模块。
 */
//@ chunk-6vnxsn99.js:9179-9531 placement
function isSafeFetchArgs(e, n) {
  let r = lt(e),
    index = e.indexOf("--end-of-options"),
    sliced = e.slice(r + 1, index);
  return (
    e.slice(0, r).every((a, u) => u % 2 === 1 || a === "-c") &&
    ["fetch", "ls-remote"].includes(e[r] ?? "") &&
    index > r &&
    sliced.every((a) => /^--no-[a-z]|^--[a-z][a-z-]*=/.test(a) || ft.has(a)) &&
    (e[r] === "ls-remote" || sliced.includes("--no-recurse-submodules")) &&
    !sliced.some((a) => a.startsWith("--rec")) &&
    e[index + 1] === n
  );
}
//@ chunk-6vnxsn99.js:9531-9702 placement
var FAILED_RESULT = { stdout: "", stderr: "", code: 1 },
  CANCELLED_BEFORE_START = "the operation was cancelled before it started",
  GIT_DIRS_CHANGED = "the repository's git directories changed while Claude Code read its git config";
//@ chunk-6vnxsn99.js:9702-9809 placement
function notStartedResult(e, n) {
  return {
    stdout: "",
    stderr: `git was not run: ${n}.
`,
    code: 1,
    lane: { kind: "not_started", why: e },
  };
}
/**
 * 校验 programs.buildInvocation 只返回指向 git 的绝对路径且不改参数/环境。
 */
//@ chunk-6vnxsn99.js:9809-10799 placement
function wrapCheckedPrograms(e) {
  return {
    base: e.base,
    buildInvocation: (n, r) => {
      let invocation = e.buildInvocation([...n], { dir: r.dir, env: { ...r.env } }),
        s = {
          file: invocation.file,
          args: [...invocation.args],
          cwd: invocation.cwd,
          env: { ...invocation.env },
        };
      if (!isAbsolutePathEntry(s.file) || buildSafeGitInvocation(s.file, [], s.env) === null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "programs.buildInvocation must return an absolute path to a file named git",
          "partial-clone lane called with programs whose file is not an absolute path to git",
        );
      if (
        ![[], ["-C", r.dir], ["-C", resolve(r.dir)]].some((a) => En(s.args, [...a, ...n])) ||
        Object.keys(r.env).some((a) =>
          Object.hasOwn(s.env, a) ? s.env[a] !== r.env[a] : !/^(?:OLD)?PWD$/i.test(a),
        ) ||
        Object.keys(s.env).some((a) => !Object.hasOwn(r.env, a))
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
function buildLaneInvocation(e, n, r, o) {
  return e === void 0 ? { file: n(), args: [...r], cwd: o.dir, env: o.env } : e.buildInvocation(r, o);
}
//@ chunk-6vnxsn99.js:10904-11092 placement
function guardRunner(e, n, r) {
  let o = toRunner(e),
    s = o.run ?? P8o;
  return n === void 0
    ? o
    : {
        ...o,
        run: async (a, u) => {
          if (r.value) return { code: 1, stdout: "", stderr: "" };
          let h = await s(a, u);
          if (!(await n())) r.value = !0;
          return h;
        },
      };
}
//@ chunk-6vnxsn99.js:11092-11244 placement
function toRunner(e) {
  return e === void 0
    ? {}
    : {
        base: e.base,
        run: (n, { cwd: cwd, env: env, extendEnv: extendEnv, ...a }) =>
          runInvocation(e.buildInvocation(n, { dir: cwd, env: env }), { ...a, stdin: "ignore" }),
      };
}
/**
 * 先按给定环境运行一次 git，成功即返回；失败且原因可能是 partial clone 缺对象时，检查 promisor 远端与配置， 必要时在受控配置下再试一次，返回结果与 lane（说明走了哪条路径）。
 */
//@ chunk-6vnxsn99.js:11244-14477 placement
async function runGitInLane(
  e,
  n,
  r,
  o,
  s,
  { repository: repository, ...u },
  { programs: h, input: p, lazyFetch: S, fetchesFrom: y, ownConfigAsJudged: T, afterEachRead: b } = {},
) {
  let w = p === void 0 ? { stdin: "ignore" } : { input: p },
    A =
      y === void 0
        ? await (() => {
            let B = buildLaneInvocation(h, gitExe, r, {
              dir: n,
              env: getRemoteHostSessionCount(
                { ...o, ...St(s === null ? [] : laneConfigPairs([], s, [])) },
                { repository: repository, base: h?.base, userLocale: !0 },
              ),
            });
            return e(B.file, B.args, {
              ...u,
              cwd: B.cwd,
              env: B.env,
              ...(h !== void 0 && { extendEnv: !1 }),
              ...w,
            });
          })()
        : FAILED_RESULT;
  if (A.code === 0) return { ...A, lane: { kind: "first_attempt_succeeded" } };
  let x = () =>
    y === void 0
      ? { ...A, lane: { kind: "first_attempt_cut" } }
      : notStartedResult("aborted", CANCELLED_BEFORE_START);
  if (
    A.timedOut ||
    A.maxBufferExceeded ||
    u.abortSignal?.aborted ||
    (u.withoutControllingTerminal === !0 && isCleanupStarted())
  )
    return x();
  let O = repository ?? resolveGitDirsOrPlaceholder(findGitRoot(n) ?? n),
    R = await planLazyFetchRetry(n, o, {
      repoFiltersOff: s !== null,
      repository: O,
      programs: h,
      lazyFetch: S,
      fetchesFrom: y,
      ownConfigAsJudged: T,
      afterEachRead: b,
    });
  if (s !== null && u.abortSignal?.aborted) return x();
  if (!R.retry)
    return {
      ...(R.forgone === void 0
        ? A
        : xe(
            A,
            y === void 0
              ? `No lazy fetch from the promisor remote was attempted: ${R.forgone}.`
              : `The remote ${y} was not contacted: ${R.forgone}.`,
          )),
      lane: { kind: "forgone", why: R.why },
    };
  logForDebugging(
    y === void 0
      ? `[git] ${n} is a partial clone: retrying with ${S === "off" ? `lazy fetch off, over ${R.transports.join(" or ")}` : "a constrained lazy fetch"}`
      : `[git] ${n}: contacting the remote ${y}, over ${R.transports.join(" or ")}`,
  );
  let F = buildLaneInvocation(h, () => R.git, r, {
      dir: n,
      env: getRemoteHostSessionCount({ ...o, ...R.env }, { base: R.operatorEnv, repository: O }),
    }),
    P = {
      ...(await e(F.file, F.args, { ...u, cwd: F.cwd, env: F.env, extendEnv: !1, ...w })),
      lane: { kind: "retried" },
    };
  if (P.code === 0) return P;
  let D =
      R.promisorUrl === void 0
        ? void 0
        : printableLabel(redactSshUserinfo(redactUrlsTracked(R.promisorUrl)), $n),
    M = P,
    G = Mn.exec(P.stderr)?.[1];
  if (G !== void 0 && !R.transports.includes(G)) {
    let joined = R.transports.join(" or ");
    M = xe(
      M,
      y === void 0
        ? `Nothing was fetched: a partial clone's lazy fetch runs over ${joined} only, and the promisor remote the repository's own config names, ${D ?? "one it does not spell out"}, is reached over ${G}${R.promisorUrl !== void 0 && R.transports.includes(gitUrlScheme(R.promisorUrl)) ? ", not the transport that URL spells \u2014 a url.<base>.insteadOf rule in your git configuration, or a second promisor URL in the repository's, would account for that" : ""}.`
        : `The remote ${y} was not contacted: this command runs over ${joined} only, and the URL the repository's own config gives it, ${D ?? "one it does not spell out"}, is reached over ${G}${R.promisorUrl !== void 0 && R.transports.includes(gitUrlScheme(R.promisorUrl)) ? `, not the transport that URL spells. A url.<base>.insteadOf rule, or a remote.${y}.url, in your own git configuration would account for that` : ""}.`,
    );
  }
  if (R.userUnscopedExtraHeader)
    M = xe(
      M,
      y === void 0
        ? `The lazy fetch did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config names as its promisor remote, here ${D ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`
        : `The command did not send your unscoped http.extraHeader: it would go to whichever host the repository's own config gives for the remote ${y}, here ${D ?? "one it does not spell out"}. Only if you recognize and trust that host, scope the header to it (http.<that url>.extraHeader); otherwise leave it as it is.`,
    );
  return { ...M, stderrOfGitAlone: P.stderr };
}
//@ chunk-6vnxsn99.js:14477-14925 placement = readHeadAndTail (0.802)
var DANGEROUS_GIT_CONFIG_KEYS =
    /^(?:http\..*|url\..*\.(?:insteadof|pushinsteadof)|remote\..*\.(?:proxy|proxyauthmethod|uploadpack|receivepack|vcs)|credential\..*|core\.(?:sshcommand|askpass|gitproxy|alternaterefscommand|alternaterefsprefixes)|protocol\..*|fetch\.bundleuri|transfer\.bundleuri|bundle\..*|gpg\..*|ssh\..*)$/s,
  Hn =
    /^(?:http\.(?:postbuffer|version|lowspeedlimit|lowspeedtime|maxrequests|minsessions|maxrequestbuffer)|protocol\.version)$/s,
  $n = { head: 70, tail: 20 };
//@ chunk-6vnxsn99.js:14925-15024 placement
function xe(e, n) {
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
function St(e, n) {
  return e.length === 0 ? {} : Do(buildGitConfigEnv(n, e), (r) => r !== void 0);
}
/**
 * 判断能否以懒加载方式重试（promisor 远端、PATH、GIT_NO_LAZY_FETCH 等）。
 */
//@ chunk-6vnxsn99.js:15262-19110 placement
async function planLazyFetchRetry(
  e,
  n,
  {
    repoFiltersOff: repoFiltersOff,
    repository: repository,
    programs: programs,
    lazyFetch: lazyFetch,
    fetchesFrom: fetchesFrom,
    ownConfigAsJudged: ownConfigAsJudged,
    afterEachRead: afterEachRead,
  },
) {
  let S = { value: !1 },
    y = { retry: !1, why: "repository_moved_between_reads", forgone: GIT_DIRS_CHANGED },
    T = fetchesFrom ?? (await findPromisorRemote(e, repository, programs));
  if (fetchesFrom === void 0 && afterEachRead !== void 0 && !(await afterEachRead())) return y;
  if (T === null || T === void 0)
    return { retry: !1, why: T === null ? "no_promisor_remote" : "promisor_remote_unread" };
  let b = sanitizedPathEnv(programs?.base ?? cte()),
    w = programs === void 0 ? whichOnPath("git", b.PATH ?? "") : "";
  if (w === null)
    return {
      retry: !1,
      why: "no_git_on_absolute_path",
      forgone:
        "no git executable is on an absolute PATH entry of the environment Claude Code was launched with",
    };
  let env = process.env,
    A =
      getEnvVarCaseInsensitiveOnWindows(env, "GIT_NO_LAZY_FETCH") ??
      getEnvVarCaseInsensitiveOnWindows(b, "GIT_NO_LAZY_FETCH");
  if (
    [env, b].some((L) => {
      let z = getEnvVarCaseInsensitiveOnWindows(L, "GIT_NO_LAZY_FETCH");
      return z !== void 0 && isEnvTruthy(z);
    })
  )
    return {
      retry: !1,
      why: "lazy_fetch_switched_off",
      forgone:
        fetchesFrom === void 0
          ? "GIT_NO_LAZY_FETCH is set"
          : "GIT_NO_LAZY_FETCH is set, which switches this command off too",
    };
  let reduced = [env, b].reduce((L, z) => {
    let ee = getEnvVarCaseInsensitiveOnWindows(z, "GIT_ALLOW_PROTOCOL")?.split(":");
    return ee === void 0 ? L : L.filter((ie) => ee.includes(ie));
  }, ct);
  if (reduced.length === 0)
    return {
      retry: !1,
      why: "no_transport_admitted",
      forgone: "GIT_ALLOW_PROTOCOL admits neither https nor ssh",
    };
  let O = gitConfigEnvOf(b),
    R = await gitConfigRead(
      e,
      [
        "--get-regexp",
        fetchesFrom === void 0
          ? "^remote\\..*\\.(uploadpack|vcs)$"
          : `^(remote\\..*\\.(uploadpack|vcs)|remotes\\.${urlPatternToRegex(fetchesFrom)})$`,
      ],
      repository,
      O.env,
      b,
      programs,
    );
  if (afterEachRead !== void 0 && !(await afterEachRead())) return y;
  if (!(R.exitCode === 1 && R.error === void 0 && !R.timedOut && !R.maxBufferExceeded)) {
    if (fetchesFrom !== void 0 && R.stdout.split("\x00").some((L) => L.startsWith("remotes.")))
      return remoteIsGroupResult(fetchesFrom);
    return {
      retry: !1,
      why: R.code === 0 ? "remote_names_a_program" : "remote_programs_unread",
      forgone:
        R.code === 0
          ? "a remote names an upload-pack or vcs program"
          : "git's configuration could not be read for a remote's upload-pack or vcs program",
    };
  }
  let P = await listGitFilters(e, {
    envPins: n,
    pin: repository,
    ...guardRunner(programs, afterEachRead, S),
  });
  if (S.value) return y;
  if (!P.ok) return { retry: !1, why: P.reason, forgone: describeGitConfigUnreadable(P) };
  if (
    ownConfigAsJudged !== void 0 &&
    ![ownConfigAsJudged, [...ownConfigAsJudged, ...ownConfigAsJudged]].some((L) => En(P.entries, L))
  )
    return {
      retry: !1,
      why: "config_changed_after_checks",
      forgone: "the repository's git config changed after Claude Code checked it",
    };
  let found = P.entries.find(([L]) => {
    let z = Mwn(L);
    return DANGEROUS_GIT_CONFIG_KEYS.test(z) && !Hn.test(z);
  });
  if (found !== void 0)
    return {
      retry: !1,
      why: "repository_steers_the_fetch",
      forgone: `the repository's own git config sets ${summarizeGitConfigKeys(found[0])} (${x8o})`,
    };
  if (fetchesFrom !== void 0 && P.entries.some(([L]) => Mwn(L) === Mwn(`remotes.${fetchesFrom}`)))
    return remoteIsGroupResult(fetchesFrom);
  let M = fetchesFrom === void 0 ? void 0 : singleRemoteUrl(P.entries, fetchesFrom);
  if (M === null)
    return {
      retry: !1,
      why: "named_remote_without_url",
      forgone: `the repository's own git config must set remote.${fetchesFrom}.url, and to no empty value`,
    };
  let G = await readGitConfigScoped(
    e,
    "^(credential\\.(.*\\.)?helper|core\\.sshcommand|ssh\\.variant|http\\.extraheader)$",
    {
      envPins: { ...n, ...O.env },
      base: b,
      repository: repository,
      buildInvocation: programs?.buildInvocation,
    },
  );
  if (afterEachRead !== void 0 && !(await afterEachRead())) return y;
  if (G === null)
    return { retry: !1, why: "user_config_unread", forgone: "your own git configuration could not be read" };
  let [B, me] = SS(G, ([L]) => L === "core.sshcommand"),
    [se, N] = SS(me, ([L]) => L === "ssh.variant"),
    [q, K] = SS(N, ([L]) => L === "http.extraheader"),
    U = getEnvVarCaseInsensitiveOnWindows(b, "GIT_SSH_VARIANT"),
    j = se.at(-1)?.[1],
    Z = U ?? j,
    Q = buildBatchSshCommand(U === void 0 && j !== void 0 ? { ...b, GIT_SSH_VARIANT: j } : b, B.at(-1)?.[1]),
    Y = await listGitFilters(e, { envPins: n, pin: repository, ...guardRunner(programs, afterEachRead, S) });
  if (S.value) return y;
  if (!Y.ok || !En(Y.entries, P.entries))
    return {
      retry: !1,
      why: Y.ok ? "config_changed_during_vet" : Y.reason,
      forgone: "the repository's git config changed while it was being vetted",
    };
  return {
    retry: !0,
    operatorEnv: b,
    git: w,
    transports: reduced,
    env: {
      GIT_NO_LAZY_FETCH: lazyFetch === "off" || fetchesFrom !== void 0 ? "1" : (A ?? "0"),
      GIT_ALLOW_PROTOCOL: reduced.join(":"),
      GIT_SSH_COMMAND: wrapWithCdCommand(xut(), Q.command),
      GIT_SSH_VARIANT: resolveSshVariant(Z, Q.command),
      GIT_ASKPASS: n.GIT_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(b, "GIT_ASKPASS") ?? "",
      SSH_ASKPASS: n.SSH_ASKPASS ?? getEnvVarCaseInsensitiveOnWindows(b, "SSH_ASKPASS") ?? "",
      ...O.env,
      ...St(
        laneConfigPairs(K, repoFiltersOff ? Y.entries : [], [["core.alternateRefsCommand", ":"]]),
        O.count,
      ),
    },
    userUnscopedExtraHeader: q.length > 0,
    promisorUrl: M ?? Y.entries.findLast(([L]) => L === `remote.${T}.url`)?.[1] ?? void 0,
  };
}
//@ chunk-6vnxsn99.js:19110-19262 placement
function remoteIsGroupResult(e) {
  return {
    retry: !1,
    why: "named_remote_is_a_group",
    forgone: `git's configuration sets remotes.${e}, which makes that name a group of remotes`,
  };
}
//@ chunk-6vnxsn99.js:19262-19393 placement
function singleRemoteUrl(e, n) {
  let mapped = e.filter(([o]) => o === `remote.${n}.url`).map(([, o]) => o);
  return mapped.every((o) => o !== null && o !== "") ? (mapped[0] ?? null) : null;
}
//@ chunk-6vnxsn99.js:19393-19449 placement
var Kn = /^remote\.(.*)\.(promisor|partialclonefilter)$/s;
//@ chunk-6vnxsn99.js:19449-19559 placement
async function findPromisorRemote(e, n, r) {
  let o = await readPartialCloneConfig(e, n, r);
  return o === null || o === void 0 ? o : (o.extension ?? o.remotes[0] ?? null);
}
//@ chunk-6vnxsn99.js:19559-20127 placement
async function readPartialCloneConfig(e, n = resolveGitDirsOrPlaceholder(e), r) {
  let o = await gitConfigRead(
    e,
    ["--get-regexp", "^(extensions\\.partialclone|remote\\..*\\.(promisor|partialclonefilter))$"],
    n,
    {},
    r?.base,
    r,
  );
  if (o.code !== 0) return o.exitCode === 1 ? null : void 0;
  let s = null,
    a = [];
  for (let u of o.stdout.split("\x00")) {
    let index = u.indexOf(`
`),
      p = index === -1 ? u : u.slice(0, index),
      S = index === -1 ? "true" : u.slice(index + 1);
    if (p === "extensions.partialclone") {
      s = S === "" ? s : S;
      continue;
    }
    let [, y, T] = Kn.exec(p) ?? [];
    if (
      y !== void 0 &&
      !a.includes(y) &&
      (T === "partialclonefilter" || !["false", "no", "off", "0", ""].includes(S.toLowerCase()))
    )
      a.push(y);
  }
  return { extension: s, remotes: a };
}
//@ chunk-6vnxsn99.js:20127-20381 placement
function gitConfigRead(e, n, r, o, s, a) {
  let u = buildLaneInvocation(a, gitExe, [...freeze, "config", "--includes", "--null", ...n], {
    dir: e,
    env: getRemoteHostSessionCount(o, { base: s, repository: r }),
  });
  return execFileNoThrowWithCwd(u.file, u.args, {
    cwd: u.cwd,
    env: u.env,
    ...(s !== void 0 && { extendEnv: !1 }),
    timeout: 5000,
    preserveOutputOnError: !1,
    stdin: "ignore",
  });
}
//@ chunk-6vnxsn99.js:20381-20548 placement
function sanitizedPathEnv(e) {
  let n = { ...e },
    r = getPlatform() === "windows";
  for (let o of Object.keys(n)) if (o === "PATH" || (r && o.toUpperCase() === "PATH")) delete n[o];
  return ((n.PATH = sanitizePathEnv(getEnvCaseInsensitive(e, "PATH") ?? "")), n);
}
//@ chunk-6vnxsn99.js:20548-20588 placement
var GIT_FILES_REF_BACKEND_ENV = { GIT_REFERENCE_BACKEND: "files" };

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
