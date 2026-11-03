/**
 * utils/hooks/deviceHooks/runDeviceHook.ts
 *
 * 2.1.316 新增：设备钩子执行与结果归类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (27)
 * attribution: placement 26, layout 1
 */
import { realpath, realpath as realpath_2 } from "fs/promises";
import { dirname, dirname as dirname_2 } from "path";
import { devNull } from "os";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { expandPath } from "../../path.js";
import { isAbsolutePlatformPath, findGitRootUncached } from "../../git.js";
import { uniq } from "../../collections.js";
import { collectStickyRoots, stickyRootsFor, m_ } from "../../settings/stickyRoots.js";
import { logForDebugging } from "../../debug.js";
import { scriptFileReaderDeps, replaceCommandProgram } from "../servedHooks/hookSandbox.js";
import { collectBaseReachRoots, dSe, collectSettingsWriteRoots } from "../../git/builderGit/sandboxReach.js";
import { getSettingsFilePathForSource, parseSettingsFileUncached } from "../../settings/settings.js";
import {
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getAdditionalDirectoriesForClaudeMd,
} from "../../../bootstrap/state.js";
import { POSIX_SEP, isPosixPathUnder } from "../hookCommandAnalysis.js";
import { wWe } from "../../../cli/headlessCloud/cloudPlugins.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { commandReachRoots } from "./commandReach.js";
import { mKt } from "./consent.js";
import { HostScoped } from "../../hostScoped.js";
import {
  execCommandHookForDevice,
  buildPromptBlockOutput,
  parseHttpHookOutput,
  exitTwoMeansMissingScript,
  announcedAsync,
  parseHookOutput,
  dropSuspectCaptureJson,
  getUntrustedCaptureReason,
  PROMPT_GUARD_EVENTS,
  withHookStderr,
} from "../../hooks.js";
import { execHttpHook } from "../execHttpHook.js";
import { $2e, pjt } from "../hookCommandResolution.js";
import { HMt, buildGitConfigEnv, Mys, Dys, Lys } from "../../gitSafeExec.js";
import { jsonStringify } from "../../slowOperations.js";
import { createCombinedAbortSignal } from "../../combinedAbortSignal.js";
import { claudeEnvContextFrom } from "../../claudeSubprocessEnv.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { parseHookJsonOutput, isDenyingHookOutput, isBlockingHookOutput } from "../hookSpecificOutput.js";
import {
  isCloudClientToolServingAnsweredOn,
  getToolServingFlagAnsweredOff,
} from "../../../services/analytics/violinWillowGate.js";
import { stripTrailingSlashes, HOOK_INPUT_TOP_FIELDS, rtn, j$n } from "../hookInputPaths.js";
import { isObjectLike } from "./hookInputPaths.js";

//@ chunk-mthxbav8.js:6715-6852 placement
function createReachState() {
  return {
    stickyRoots: new Set(),
    pinnedScopes: new Set(),
    pinnedRoots: new Map(),
    syncRoots: new Set(),
    reachBaseline: null,
    commonRoots: null,
  };
}
/**
 * 创建设备钩子执行器：准备可达性基线、依赖，执行钩子并归纳结果。
 */
//@ chunk-mthxbav8.js:6852-8309 placement
function createDeviceHookRunner(e) {
  let n = { ...defaultReachDeps(e.launchDir), ...e.deps },
    { memory: memory } = e;
  ((memory.reachBaseline ??= new Map(SETTING_SOURCES.map((y) => [y, n.scopeWriteEntries(y)]))),
    (memory.commonRoots ??= n.commonWriteRoots()));
  let {
      reachBaseline: reachBaseline,
      commonRoots: commonRoots,
      syncRoots: syncRoots,
      stickyRoots: stickyRoots,
    } = memory,
    h = (y) => {
      (syncRoots.add(y),
        n.realpath(y).then(
          (C) => syncRoots.add(C),
          () => {},
        ));
    },
    v = async () => {
      let flattened = n.addedDirectories().flatMap((C) => {
        try {
          return [expandPath(C, e.launchDir)];
        } catch {
          return [];
        }
      });
      return [...flattened, ...(await Promise.all(flattened.map((C) => n.realpath(C).catch(() => C))))];
    };
  return {
    noteSyncRoot: h,
    async current() {
      let y = !1,
        C = (T) =>
          n.realpath(T).then(
            (P) => (isAbsolutePlatformPath(P) ? P : T),
            () => ((y = !0), T),
          ),
        O = await C(e.launchDir),
        x = await C(e.projectDir),
        R = null;
      try {
        R = e.syncRoot();
      } catch {
        y = !0;
      }
      if (R !== null) (syncRoots.add(R), syncRoots.add(await C(R)));
      let j = R === null ? void 0 : { rootReal: await C(R), root: R },
        M = uniq([
          ...(e.repoRoot !== null ? [e.repoRoot, await C(e.repoRoot)] : []),
          ...syncRoots,
          ...(await v()),
        ]),
        q = await C(e.configHome);
      if (
        (await collectStickyRoots({
          stickyRoots: stickyRoots,
          pinnedScopes: memory.pinnedScopes,
          pinnedRoots: memory.pinnedRoots,
          baseRoots: [...stickyRootsFor({ launchDir: e.launchDir, launchDirReal: O }), ...M],
          reachBaseline: reachBaseline,
          scopeSettingsFile: n.scopeSettingsFile,
          realpath: n.realpath,
          commonRoots: () => commonRoots,
          scopeRoots: n.scopeWriteRoots,
        }).catch(() => {
          y = !0;
        }),
        y)
      )
        logForDebugging(
          "cloud session reach: a base root did not resolve (or sync state could not be read); every hook is treated as in reach for this answer",
          { level: "warn" },
        );
      return {
        launchDir: e.launchDir,
        launchDirReal: O,
        configHomeReal: q,
        projectDir: e.projectDir,
        projectDirReal: x,
        ...(j !== void 0 && { sync: j }),
        extraReach: y ? ["/"] : uniq([...M, ...stickyRoots]),
      };
    },
  };
}
//@ chunk-mthxbav8.js:8309-8900 placement
function defaultReachDeps(e) {
  return {
    realpath: scriptFileReaderDeps().realpath,
    commonWriteRoots: () => collectBaseReachRoots(e),
    scopeWriteRoots: (n, r) => dSe(e, n, r),
    scopeWriteEntries: (n) => {
      let r = collectSettingsWriteRoots(n, e),
        s = getSettingsFilePathForSource(n);
      if (n === "policySettings" || !s) return r;
      let u = parseSettingsFileUncached(
        s,
        n === "flagSettings"
          ? (getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent())
          : void 0,
      );
      if (u.errors.some((error) => (error.severity ?? "fatal") === "fatal"))
        return (
          logForDebugging(
            `cloud session reach: the ${n} settings file could not be read or parsed at attach; its write grants are unknown, so every hook counts as in the session's reach`,
            { level: "warn" },
          ),
          [POSIX_SEP]
        );
      return uniq([...collectSettingsWriteRoots(n, e, u.settings), ...r]);
    },
    scopeSettingsFile: (n) => getSettingsFilePathForSource(n) ?? null,
    addedDirectories: () => getAdditionalDirectoriesForClaudeMd(),
  };
}
//@ chunk-mthxbav8.js:8900-9927 placement
function createDeviceHookDecider(e) {
  let n = {
      realpath: realpath,
      repoRootOf: findGitRootUncached,
      consentPath: wWe,
      configHome: getClaudeConfigDir,
      ...e.deps,
    },
    { launchDir: launchDir, memory: memory } = e,
    u = null,
    S = () =>
      (u ??= (async () => {
        let w = (x) => n.realpath(x).catch(() => x),
          h = await w(launchDir),
          v = uniq([launchDir, h].map((x) => n.repoRootOf(x)).filter((x) => x !== null)),
          y = uniq((await Promise.all(v.map(w))).concat(v)),
          [C = null] = v;
        return {
          tracker: createDeviceHookRunner({
            launchDir: launchDir,
            projectDir: launchDir,
            repoRoot: C,
            configHome: n.configHome(),
            syncRoot: e.syncRoot,
            memory: memory,
            ...(n.tracker !== void 0 && { deps: n.tracker }),
          }),
          launchRoots: uniq([launchDir, h, ...y]),
          repoRoots: y,
        };
      })());
  return {
    async judge() {
      try {
        let { tracker: tracker, launchRoots: launchRoots, repoRoots: repoRoots } = await S(),
          y = await tracker.current();
        if (e.syncElsewhere !== !1) return "unknown";
        let C = [...commandReachRoots(y), ...repoRoots];
        if (C.some((j) => j === POSIX_SEP || !isAbsolutePlatformPath(j))) return "unknown";
        let consentPath = n.consentPath();
        if (!consentPath.startsWith("/")) return "unknown";
        let x = await mKt(consentPath, C, n.realpath);
        if (x === !1) return "outside";
        if (x === "unresolvable") return "unknown";
        let R = [consentPath, await n.realpath(consentPath).catch(() => consentPath)];
        if (m_(R, launchRoots)) return "in_launch_dir";
        return m_(R, [...memory.syncRoots]) ? "in_sync_root" : "in_other_root";
      } catch {
        return "unknown";
      }
    },
  };
}
//@ chunk-mthxbav8.js:9927-10045 placement
function createReachStateRegistry() {
  let e = new Map();
  return {
    reachFor(n) {
      let r = e.get(n);
      if (r !== void 0) return r;
      let s = createReachState();
      return (e.set(n, s), s);
    },
  };
}
//@ chunk-mthxbav8.js:10045-10063 placement
var xNn = new HostScoped(createReachStateRegistry);
//@ chunk-mthxbav8.js:10170-10616 placement
var DEVICE_HOOK_EXECUTORS = { execCommand: execCommandHookForDevice, execHttp: execHttpHook },
  Cr = `${$2e}/project-folder-not-given-to-this-hook`,
  $n = [
    ["safe.bareRepository", "explicit"],
    ["core.hooksPath", "/dev/null"],
    ["core.fsmonitor", "false"],
    ["protocol.ext.allow", "never"],
    ["submodule.recurse", "false"],
    ["diff.ignoreSubmodules", "all"],
    ["status.submoduleSummary", "false"],
    ["fetch.recurseSubmodules", "false"],
    ["push.recurseSubmodules", "no"],
  ],
  TENGU_TRANQUIL_CROWN = "tengu_tranquil_crown",
  Tr = ["core.alternateRefsCommand", HMt];
//@ chunk-mthxbav8.js:10616-10785 placement
function withShellPrefix(e) {
  if (e.omit.includes("CLAUDE_CODE_SHELL_PREFIX")) return;
  let n = e.base.CLAUDE_CODE_SHELL_PREFIX?.trim() || void 0;
  return n !== void 0 && n.startsWith("/") ? n : void 0;
}
//@ chunk-mthxbav8.js:10785-11892 placement
async function runDeviceHook(
  { hook: hook, event: event, input: input, timeoutMs: timeoutMs, env: env, startDirectory: startDirectory },
  w,
  h,
  v,
) {
  if (v.aborted)
    return hook.type === "http"
      ? { kind: "http", ok: !1, body: "", aborted: !0 }
      : { kind: "command", stdout: "", stderr: "", status: 1, aborted: !0 };
  let y = jsonStringify(input);
  if (hook.type === "http")
    try {
      return {
        kind: "http",
        ...(await h.execHttp({ ...hook, timeout: void 0 }, event, y, v, timeoutMs, pjt(env))),
      };
    } catch (error) {
      return {
        kind: "http",
        ok: !1,
        body: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  let { signal: signal, cleanup: cleanup } = createCombinedAbortSignal(v, { timeoutMs: timeoutMs });
  try {
    return {
      kind: "command",
      ...(await h.execCommand({
        hook: { ...hook, timeout: Math.ceil(timeoutMs / 1000) + 30 },
        hookEvent: event,
        jsonInput: y,
        envContext: claudeEnvContextFrom(input),
        project:
          startDirectory === void 0
            ? { originalCwd: w.launchDir, projectRoot: w.projectRoot }
            : { originalCwd: startDirectory, projectRoot: Cr },
        cwd: startDirectory ?? input.cwd,
        startsOutsideProject: startDirectory !== void 0,
        signal: signal,
        envBase: env.base,
        envOmit: env.omit,
        shellPrefix: withShellPrefix(env),
        envExtra: {
          ...env.extra,
          CLAUDE_CODE_CLOUD_SESSION_ID: w.cloudSessionId,
          ...buildGitConfigEnv(
            void 0,
            readFlagWithOverride(TENGU_TRANQUIL_CROWN, { safe: !0 })
              ? [...$n, ...Mys, ...Dys, ...Lys, Tr]
              : $n,
          ),
          ...(startDirectory !== void 0 && { GIT_CEILING_DIRECTORIES: dirname(startDirectory) }),
        },
      })),
    };
  } catch (error) {
    return {
      kind: "command",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      status: 1,
      spawnFailed: !0,
    };
  } finally {
    cleanup();
  }
}
//@ chunk-mthxbav8.js:11892-11944 placement
function Oe(e, n) {
  return sanitizeDisplayText(e, { maxCodeUnits: 400 }) || n;
}
//@ chunk-mthxbav8.js:11944-12319 placement
function blockDecision(e, n, r = {}) {
  let s = "async" in r ? {} : r;
  if (e !== "PreToolUse") return { ...s, decision: "block", reason: n };
  let u = "hookSpecificOutput" in s ? s.hookSpecificOutput : void 0,
    S = u?.hookEventName === "PreToolUse" ? u.additionalContext : void 0;
  return {
    ...s,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: n,
      ...(S !== void 0 && { additionalContext: S }),
    },
  };
}
//@ chunk-mthxbav8.js:12319-12647 placement
function interpretHookResult(e, n) {
  let r = classifyHookOutput(e, n);
  if (r.answer === null) return r;
  let { answer: answer } = parseHookJsonOutput(r.answer, n.event);
  if (r.exitClass === "2" && r.blocked && !isDenyingHookOutput(answer) && e.kind === "command") {
    let u = blockDecision(n.event, `[${n.label}]: ${e.stderr || "No stderr output"}`, answer);
    return { ...r, answer: parseHookJsonOutput(u, n.event).answer, exitClass: "2", blocked: !0 };
  }
  return { ...r, answer: answer, blocked: isBlockingHookOutput(answer) };
}
/**
 * 把钩子执行结果（退出码、超时、输出 JSON）归类为答复，处理超时是否默认拒绝。
 */
//@ chunk-mthxbav8.js:12647-16511 placement
function classifyHookOutput(
  e,
  {
    event: event,
    label: label,
    timedOut: timedOut,
    timeoutMs: timeoutMs,
    timeoutFailsClosed: timeoutFailsClosed = !1,
  },
) {
  if (e.aborted && !timedOut) return { answer: null, exitClass: "cancelled", blocked: !1 };
  if (e.aborted) {
    let rounded = Math.round(timeoutMs / 1000),
      j = `[${label}]: timed out after ${rounded}s on the attached machine`;
    if (
      timeoutFailsClosed &&
      (event === "PreToolUse" || event === "UserPromptSubmit" || event === "UserPromptExpansion")
    )
      return {
        answer: blockDecision(event, j, buildPromptBlockOutput(event, j) ?? {}),
        exitClass: "timeout",
        blocked: !0,
      };
    return {
      answer: {},
      exitClass: "timeout",
      localWarning: `[${label}]: timed out after ${rounded}s \u2014 output discarded; raise the hook's "timeout" to allow more time`,
      blocked: !1,
    };
  }
  if (e.kind === "http") {
    if (e.error !== void 0 || !e.ok) {
      let M = Oe(e.error ?? `HTTP ${e.statusCode ?? "request failed"}`, "request failed"),
        q =
          e.error !== void 0
            ? "the request to it could not be made from this machine"
            : `it answered HTTP ${e.statusCode ?? "with an error"}`,
        T = denyPreToolUseOutput(event, `[${label}]: not run \u2014 ${q}; retry`);
      return {
        answer: T,
        exitClass: "other",
        localWarning: `[${label}]: ${M}`,
        blocked: isBlockingHookOutput(T),
      };
    }
    let { json: json, validationError: validationError } = parseHttpHookOutput(e.body);
    if (validationError !== void 0 || json === void 0)
      return {
        answer: {},
        exitClass: "other",
        localWarning: `[${label}]: ${Oe(validationError ?? "", "no JSON in the response")}`,
        blocked: !1,
      };
    return { answer: json, exitClass: "0", blocked: isBlockingHookOutput(json) };
  }
  if (e.spawnFailed) {
    let R = denyPreToolUseOutput(
      event,
      `[${label}]: not run \u2014 it could not be started on this machine; retry`,
    );
    return {
      answer: R,
      exitClass: "spawn_failed",
      localWarning: `[${label}]: ${Oe(e.stderr, "failed to start")}`,
      blocked: isBlockingHookOutput(R),
    };
  }
  let w =
    e.status === 2 &&
    exitTwoMeansMissingScript({
      hookEvent: event,
      stdout: e.stdout,
      stderr: e.stderr,
      stdioIncomplete: e.stdioIncomplete,
      stdioClosedWithoutEnd: e.stdioClosedWithoutEnd,
    });
  if (e.status === 2 && (e.stdioIncomplete === !0 || e.stdioClosedWithoutEnd === !0)) {
    let R = buildPromptBlockOutput(event, `[${label}]: ${e.stderr || "No stderr output"}`);
    if (R !== void 0) return { answer: R, exitClass: "2", blocked: !0 };
  }
  let h = event !== "Stop" && event !== "SubagentStop" && event !== "StopFailure";
  if (announcedAsync(e.stdout)) {
    if (e.status === 2 && !w && h)
      return {
        answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
        exitClass: "2",
        blocked: !0,
      };
    return e.status === 0
      ? { answer: {}, exitClass: "0", blocked: !1 }
      : {
          answer: {},
          exitClass: e.status === 2 ? "2" : "other",
          localWarning: `[${label}]: announced async, then failed with status code ${e.status}: ${Oe(e.stderr, "No stderr output")}`,
          blocked: !1,
        };
  }
  let { json: json, plainText: plainText, validationError: validationError } = parseHookOutput(e.stdout),
    O = dropSuspectCaptureJson(e, event, json),
    x = getUntrustedCaptureReason(e, event, e.stdout, O, (R) => parseHookOutput(R).json);
  if (x !== void 0) {
    let R = `[${label}]: output incomplete \u2014 its stdio was cut before end-of-stream on this machine; retry`,
      j = PROMPT_GUARD_EVENTS.has(event)
        ? blockDecision(event, R, buildPromptBlockOutput(event, R) ?? {})
        : {};
    return {
      answer: j,
      exitClass: "0",
      localWarning: `[${label}]: ${Oe(x, "stdio incomplete")}`,
      blocked: isBlockingHookOutput(j),
    };
  }
  if (validationError !== void 0 && e.status !== 2)
    return {
      answer: {},
      exitClass: e.status === 0 ? "0" : "other",
      localWarning: `[${label}]: ${Oe(withHookStderr(validationError, e.status, e.stderr), "hook JSON output failed validation")}`,
      blocked: !1,
    };
  if (O !== void 0) {
    if ("async" in O)
      return e.status === 2 && !w && h
        ? {
            answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
            exitClass: "2",
            blocked: !0,
          }
        : e.status === 0
          ? { answer: {}, exitClass: "0", blocked: !1 }
          : {
              answer: {},
              exitClass: e.status === 2 ? "2" : "other",
              localWarning: `[${label}]: announced async, then failed with status code ${e.status}: ${Oe(e.stderr, "No stderr output")}`,
              blocked: !1,
            };
    let R = O;
    if (e.status === 2 && !isDenyingHookOutput(R))
      return {
        answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`, R),
        exitClass: "2",
        blocked: !0,
      };
    return {
      answer: R,
      exitClass: e.status === 0 ? "0" : e.status === 2 ? "2" : "other",
      blocked: isBlockingHookOutput(R),
    };
  }
  if (e.status === 0) {
    let trimmed = (plainText ?? "").trim();
    return (event === "UserPromptSubmit" || event === "UserPromptExpansion") && trimmed !== ""
      ? {
          answer: { hookSpecificOutput: { hookEventName: event, additionalContext: trimmed } },
          exitClass: "0",
          blocked: !1,
        }
      : { answer: {}, exitClass: "0", blocked: !1 };
  }
  if (e.status === 2) {
    if (w)
      return {
        answer: {},
        exitClass: "2",
        localWarning: `[${label}]: the hook script appears to be missing (${Oe(e.stderr, "no such file")})`,
        blocked: !1,
      };
    return {
      answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
      exitClass: "2",
      blocked: !0,
    };
  }
  return {
    answer: {},
    exitClass: "other",
    localWarning: `[${label}]: failed with non-blocking status code ${e.status}: ${Oe(e.stderr, "No stderr output")}`,
    blocked: !1,
  };
}
//@ chunk-mthxbav8.js:16511-16658 placement
function denyPreToolUseOutput(e, n) {
  return e === "PreToolUse"
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: n,
        },
      }
    : {};
}
//@ chunk-mthxbav8.js:16658-16739 placement
var Hr = {
  isAnsweredOn: () => isCloudClientToolServingAnsweredOn(),
  isAnsweredOff: () => getToolServingFlagAnsweredOff({ cloudClient: !0 }) !== void 0,
};
//@ chunk-mthxbav8.js:16739-16877 placement
function createAnsweredOnLatch(e = Hr) {
  let n = !1;
  return () => {
    if (e.isAnsweredOff()) return "answered_off";
    return ((n ||= e.isAnsweredOn()), n ? "answered_on" : "unanswered");
  };
}
//@ chunk-mthxbav8.js:17001-17424 placement
var DEVICE_HOOK_GRACE_MS = 30000,
  $r = 8,
  Kt = 64,
  Nr = 1048576,
  Gt = 2000,
  qn = 1000,
  Lr = 256,
  pt = 256,
  Mr = 64,
  Fr = 8,
  jn = 256,
  Wr = devNull,
  Ur = 'started in an empty folder \xB7 mark it "cloud": "device" if it needs the project',
  Yn = /^[A-Za-z0-9_.:-]{1,128}$/,
  qr = /^[a-z]{1,16}$/,
  jr =
    "Not running your hooks for the cloud session: the service could not vouch for the sender of its hook requests under your organization's trusted-device policy. The session goes on without them.";
//@ chunk-mthxbav8.js:17424-17513 placement
function isPastDeadline(e) {
  return e.deadlineMs !== void 0 && (e.ageMs === void 0 || e.ageMs > e.deadlineMs + DEVICE_HOOK_GRACE_MS);
}
//@ chunk-mthxbav8.js:17513-17572 placement
function safeLabel(e) {
  return Yn.test(e) ? e : sanitizeDisplayText(e, { maxCodeUnits: 64 });
}
//@ chunk-mthxbav8.js:17572-17734 placement
function permissionDecisionOutput(e, n, r) {
  return e === "PreToolUse"
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `[${n}]: ${r}`,
        },
      }
    : {};
}
//@ chunk-mthxbav8.js:17734-17792 placement
function rewritePathInInput(e, n, r) {
  return n.rawPath === r ? e : replaceCommandProgram(e, n.site, r);
}
//@ chunk-mthxbav8.js:17792-18056 placement
function isPlausibleAbsolutePath(e, n) {
  if (typeof e !== "string" || n === null || !e.startsWith("/")) return !1;
  if (e.trim() !== e || /^\/(?:proc|dev|net|network)(?:\/|$)/i.test(e)) return !1;
  if (
    e
      .split("/")
      .slice(1)
      .some((s) => s === "" || s === "." || s === "..")
  )
    return !1;
  return !isPosixPathUnder(e, stripTrailingSlashes(n.containerProjectDir));
}
//@ chunk-mthxbav8.js:18056-18067 placement
var isHookInputTopField = HOOK_INPUT_TOP_FIELDS;
//@ chunk-mthxbav8.js:18067-18317 placement
function isRewritablePath(e, n) {
  if (isHookInputTopField(e)) return !0;
  let r = rtn(e),
    s = r[0] === "tool_calls" ? 2 : 0;
  if (r[s] !== "tool_response") return !1;
  let reduced = r.slice(0, s + 1).reduce((S, w) => (isObjectLike(S) ? S[w] : void 0), n);
  for (let S of r.slice(s + 1)) {
    if (Array.isArray(reduced)) return !1;
    reduced = isObjectLike(reduced) ? reduced[S] : void 0;
  }
  return !0;
}
//@ chunk-mthxbav8.js:18317-18620 placement
function isToolResponsePath(e, n, r) {
  let s = rtn(e),
    u = s[0] === "tool_calls",
    S = u ? s.slice(2) : s;
  if (S[0] === "tool_response") return !0;
  if (S[0] !== "tool_input" || S.length !== 2 || !isObjectLike(n)) return !1;
  let tool_calls = n.tool_calls,
    h = u ? (isObjectLike(tool_calls) ? tool_calls[s[1] ?? ""] : void 0) : n,
    v = isObjectLike(h) ? h.tool_name : void 0,
    y = typeof v === "string" ? j$n(v, r) : void 0;
  return y !== void 0 && S[1] === y;
}
//@ chunk-mthxbav8.js:18620-18729 layout
var PERMISSION_MODE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/,
  DEVICE_HOOKS_DISCONNECT = Symbol("deviceHooks.disconnect"),
  DEVICE_HOOKS_DEADLINE = Symbol("deviceHooks.deadline");
/**
 * 校验钩子输入里的 session_id/agent_id/prompt_id/tool_use_id 不含路径穿越、permission_mode/effort/agent_type 合法，用于设备钩子转发。旧版名 createBaseHookInput 配错。
 */
//@ chunk-mthxbav8.js:18729-19107 placement = createBaseHookInput (0.526)
function isSafeHookInputIds(e) {
  let n = [e.session_id, e.agent_id, e.prompt_id];
  if ("tool_use_id" in e && typeof e.tool_use_id === "string") n.push(e.tool_use_id);
  return (
    n.every((r) => r === void 0 || (Yn.test(r) && !r.includes(".."))) &&
    (e.permission_mode === void 0 || PERMISSION_MODE_ID_RE.test(e.permission_mode)) &&
    (e.effort === void 0 || qr.test(e.effort.level)) &&
    (e.agent_type === void 0 || sanitizeDisplayText(e.agent_type, { maxCodeUnits: 64 }) === e.agent_type)
  );
}

export {
  createDeviceHookDecider,
  xNn,
  Kt,
  pt,
  Fr,
  isHookInputTopField,
  Mr,
  $r,
  Gt,
  Lr,
  permissionDecisionOutput,
  rewritePathInInput,
  isPastDeadline,
  Nr,
  isSafeHookInputIds,
  safeLabel,
  isRewritablePath,
  isToolResponsePath,
  isPlausibleAbsolutePath,
  Wr,
  qn,
  withShellPrefix,
  interpretHookResult,
  Ur,
  jn,
  jr,
  DEVICE_HOOKS_DISCONNECT,
  DEVICE_HOOKS_DEADLINE,
  runDeviceHook,
  DEVICE_HOOK_EXECUTORS,
  createAnsweredOnLatch,
};
