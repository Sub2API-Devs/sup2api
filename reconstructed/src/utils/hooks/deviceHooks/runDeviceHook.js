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
import { realpath } from "fs/promises";
import { dirname } from "path";
import { devNull } from "os";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { expandPath } from "../../path.js";
import { isAbsolutePlatformPath, findGitRootUncached } from "../../git.js";
import { uniq } from "../../collections.js";
import { collectStickyRoots, stickyRootsFor, anyPairMatches } from "../../settings/stickyRoots.js";
import { logForDebugging } from "../../debug.js";
import { scriptFileReaderDeps, replaceCommandProgram } from "../servedHooks/hookSandbox.js";
import {
  collectBaseReachRoots,
  settingsReachRootsForSource,
  collectSettingsWriteRoots,
} from "../../git/builderGit/sandboxReach.js";
import { getSettingsFilePathForSource, parseSettingsFileUncached } from "../../settings/settings.js";
import {
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getAdditionalDirectoriesForClaudeMd,
} from "../../../bootstrap/state.js";
import { POSIX_SEP_2, isPosixPathUnder } from "../hookCommandAnalysis.js";
import { cloudPluginsConsentFilePath } from "../../../cli/headlessCloud/cloudPlugins.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { commandReachRoots } from "./commandReach.js";
import { probeWritability } from "./consent.js";
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
import { EMPTY_PATH_DIR, mergeHookEnv } from "../hookCommandResolution.js";
import {
  ALTERNATE_REFS_COMMAND,
  buildGitConfigEnv,
  LOG_SAFETY_CONFIG,
  MAINTENANCE_OFF_CONFIG,
  DIFF_SAFETY_CONFIG,
} from "../../gitSafeExec.js";
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
import {
  stripTrailingSlashes,
  HOOK_INPUT_TOP_FIELDS,
  unescapeJsonPointerPath,
  toolPathFieldInput,
} from "../hookInputPaths.js";
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
//@ chunk-mthxbav8.js:6852-8309 placement
/**
 * 创建设备钩子执行器：准备可达性基线、依赖，执行钩子并归纳结果。
 */
function createDeviceHookRunner(e) {
  let n = {
    ...defaultReachDeps(e.launchDir),
    ...e.deps,
  };
  let { memory } = e;
  memory.reachBaseline ??= new Map(SETTING_SOURCES.map((y) => [y, n.scopeWriteEntries(y)]));
  memory.commonRoots ??= n.commonWriteRoots();
  let { reachBaseline, commonRoots, syncRoots, stickyRoots } = memory;
  let noteSyncRoot = (y) => {
    syncRoots.add(y);
    n.realpath(y).then(
      (C) => syncRoots.add(C),
      () => {},
    );
  };
  let v = async () => {
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
    noteSyncRoot,
    async current() {
      let y = false;
      let C = (T) =>
        n.realpath(T).then(
          (P) => (isAbsolutePlatformPath(P) ? P : T),
          () => {
            y = true;
            return T;
          },
        );
      let launchDirReal = await C(e.launchDir);
      let projectDirReal = await C(e.projectDir);
      let R = null;
      try {
        R = e.syncRoot();
      } catch {
        y = true;
      }
      if (R !== null) {
        syncRoots.add(R);
        syncRoots.add(await C(R));
      }
      let j =
        R === null
          ? undefined
          : {
              rootReal: await C(R),
              root: R,
            };
      let M = uniq([
        ...(e.repoRoot !== null ? [e.repoRoot, await C(e.repoRoot)] : []),
        ...syncRoots,
        ...(await v()),
      ]);
      let configHomeReal = await C(e.configHome);
      await collectStickyRoots({
        stickyRoots,
        pinnedScopes: memory.pinnedScopes,
        pinnedRoots: memory.pinnedRoots,
        baseRoots: [
          ...stickyRootsFor({
            launchDir: e.launchDir,
            launchDirReal,
          }),
          ...M,
        ],
        reachBaseline,
        scopeSettingsFile: n.scopeSettingsFile,
        realpath: n.realpath,
        commonRoots: () => commonRoots,
        scopeRoots: n.scopeWriteRoots,
      }).catch(() => {
        y = true;
      });
      if (y)
        logForDebugging(
          "cloud session reach: a base root did not resolve (or sync state could not be read); every hook is treated as in reach for this answer",
          {
            level: "warn",
          },
        );
      return {
        launchDir: e.launchDir,
        launchDirReal,
        configHomeReal,
        projectDir: e.projectDir,
        projectDirReal,
        ...(j !== undefined && {
          sync: j,
        }),
        extraReach: y ? ["/"] : uniq([...M, ...stickyRoots]),
      };
    },
  };
}
//@ chunk-mthxbav8.js:8309-8900 placement
function defaultReachDeps(launchDir) {
  return {
    realpath: scriptFileReaderDeps().realpath,
    commonWriteRoots: () => collectBaseReachRoots(launchDir),
    scopeWriteRoots: (n, r) => settingsReachRootsForSource(launchDir, n, r),
    scopeWriteEntries: (n) => {
      let settingsWriteRoots = collectSettingsWriteRoots(n, launchDir);
      let settingsFilePathForSource = getSettingsFilePathForSource(n);
      if (n === "policySettings" || !settingsFilePathForSource) return settingsWriteRoots;
      let settingsFileUncached = parseSettingsFileUncached(
        settingsFilePathForSource,
        n === "flagSettings"
          ? (getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent())
          : undefined,
      );
      if (settingsFileUncached.errors.some((error) => (error.severity ?? "fatal") === "fatal")) {
        logForDebugging(
          `cloud session reach: the ${n} settings file could not be read or parsed at attach; its write grants are unknown, so every hook counts as in the session's reach`,
          {
            level: "warn",
          },
        );
        return [POSIX_SEP_2];
      }
      return uniq([
        ...collectSettingsWriteRoots(n, launchDir, settingsFileUncached.settings),
        ...settingsWriteRoots,
      ]);
    },
    scopeSettingsFile: (n) => getSettingsFilePathForSource(n) ?? null,
    addedDirectories: () => getAdditionalDirectoriesForClaudeMd(),
  };
}
//@ chunk-mthxbav8.js:8900-9927 placement
function createDeviceHookDecider(e) {
  let n = {
    realpath,
    repoRootOf: findGitRootUncached,
    consentPath: cloudPluginsConsentFilePath,
    configHome: getClaudeConfigDir,
    ...e.deps,
  };
  let { launchDir, memory } = e;
  let u = null;
  let S = () =>
    (u ??= (async () => {
      let w = (launchDir) => n.realpath(launchDir).catch(() => launchDir);
      let h = await w(launchDir);
      let v = uniq([launchDir, h].map((x) => n.repoRootOf(x)).filter((x) => x !== null));
      let y = uniq((await Promise.all(v.map(w))).concat(v));
      let [C = null] = v;
      return {
        tracker: createDeviceHookRunner({
          launchDir,
          projectDir: launchDir,
          repoRoot: C,
          configHome: n.configHome(),
          syncRoot: e.syncRoot,
          memory,
          ...(n.tracker !== undefined && {
            deps: n.tracker,
          }),
        }),
        launchRoots: uniq([launchDir, h, ...y]),
        repoRoots: y,
      };
    })());
  return {
    async judge() {
      try {
        let { tracker, launchRoots, repoRoots } = await S();
        let y = await tracker.current();
        if (e.syncElsewhere !== false) return "unknown";
        let C = [...commandReachRoots(y), ...repoRoots];
        if (C.some((j) => j === POSIX_SEP_2 || !isAbsolutePlatformPath(j))) return "unknown";
        let O = n.consentPath();
        if (!O.startsWith("/")) return "unknown";
        let x = await probeWritability(O, C, n.realpath);
        if (x === false) return "outside";
        if (x === "unresolvable") return "unknown";
        let R = [O, await n.realpath(O).catch(() => O)];
        if (anyPairMatches(R, launchRoots)) return "in_launch_dir";
        return anyPairMatches(R, [...memory.syncRoots]) ? "in_sync_root" : "in_other_root";
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
      if (r !== undefined) return r;
      let reachState = createReachState();
      e.set(n, reachState);
      return reachState;
    },
  };
}
//@ chunk-mthxbav8.js:10045-10063 placement
/**
 * 宿主隔离的可达范围状态注册表。
 */
var reachStateRegistry = new HostScoped(createReachStateRegistry);
//@ chunk-mthxbav8.js:10170-10616 placement
/**
 * 设备钩子执行器映射、缺失项目目录标记、传给钩子 git 的安全配置与替代 ref 命令参数。
 */
var DEVICE_HOOK_EXECUTORS = {
  execCommand: execCommandHookForDevice,
  execHttp: execHttpHook,
};
var MISSING_PROJECT_DIR_MARKER = `${EMPTY_PATH_DIR}/project-folder-not-given-to-this-hook`;
var SAFE_GIT_CONFIG_FOR_HOOKS = [
  ["safe.bareRepository", "explicit"],
  ["core.hooksPath", "/dev/null"],
  ["core.fsmonitor", "false"],
  ["protocol.ext.allow", "never"],
  ["submodule.recurse", "false"],
  ["diff.ignoreSubmodules", "all"],
  ["status.submoduleSummary", "false"],
  ["fetch.recurseSubmodules", "false"],
  ["push.recurseSubmodules", "no"],
];
var TENGU_TRANQUIL_CROWN = "tengu_tranquil_crown";
var ALTERNATE_REFS_CONFIG_ARG = ["core.alternateRefsCommand", ALTERNATE_REFS_COMMAND];
//@ chunk-mthxbav8.js:10616-10785 placement
function withShellPrefix(e) {
  if (e.omit.includes("CLAUDE_CODE_SHELL_PREFIX")) return;
  let n = e.base.CLAUDE_CODE_SHELL_PREFIX?.trim() || undefined;
  return n !== undefined && n.startsWith("/") ? n : undefined;
}
//@ chunk-mthxbav8.js:10785-11892 placement
async function runDeviceHook({ hook, event, input, timeoutMs, env, startDirectory }, w, h, v) {
  if (v.aborted)
    return hook.type === "http"
      ? {
          kind: "http",
          ok: false,
          body: "",
          aborted: true,
        }
      : {
          kind: "command",
          stdout: "",
          stderr: "",
          status: 1,
          aborted: true,
        };
  let y = jsonStringify(input);
  if (hook.type === "http")
    try {
      return {
        kind: "http",
        ...(await h.execHttp(
          {
            ...hook,
            timeout: undefined,
          },
          event,
          y,
          v,
          timeoutMs,
          mergeHookEnv(env),
        )),
      };
    } catch (error) {
      return {
        kind: "http",
        ok: false,
        body: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  let { signal, cleanup } = createCombinedAbortSignal(v, {
    timeoutMs,
  });
  try {
    return {
      kind: "command",
      ...(await h.execCommand({
        hook: {
          ...hook,
          timeout: Math.ceil(timeoutMs / 1000) + 30,
        },
        hookEvent: event,
        jsonInput: y,
        envContext: claudeEnvContextFrom(input),
        project:
          startDirectory === undefined
            ? {
                originalCwd: w.launchDir,
                projectRoot: w.projectRoot,
              }
            : {
                originalCwd: startDirectory,
                projectRoot: MISSING_PROJECT_DIR_MARKER,
              },
        cwd: startDirectory ?? input.cwd,
        startsOutsideProject: startDirectory !== undefined,
        signal,
        envBase: env.base,
        envOmit: env.omit,
        shellPrefix: withShellPrefix(env),
        envExtra: {
          ...env.extra,
          CLAUDE_CODE_CLOUD_SESSION_ID: w.cloudSessionId,
          ...buildGitConfigEnv(
            undefined,
            readFlagWithOverride(TENGU_TRANQUIL_CROWN, {
              safe: true,
            })
              ? [
                  ...SAFE_GIT_CONFIG_FOR_HOOKS,
                  ...LOG_SAFETY_CONFIG,
                  ...MAINTENANCE_OFF_CONFIG,
                  ...DIFF_SAFETY_CONFIG,
                  ALTERNATE_REFS_CONFIG_ARG,
                ]
              : SAFE_GIT_CONFIG_FOR_HOOKS,
          ),
          ...(startDirectory !== undefined && {
            GIT_CEILING_DIRECTORIES: dirname(startDirectory),
          }),
        },
      })),
    };
  } catch (error) {
    return {
      kind: "command",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      status: 1,
      spawnFailed: true,
    };
  } finally {
    cleanup();
  }
}
//@ chunk-mthxbav8.js:11892-11944 placement
function sanitizeOrFallback(stderr, n) {
  return (
    sanitizeDisplayText(stderr, {
      maxCodeUnits: 400,
    }) || n
  );
}
//@ chunk-mthxbav8.js:11944-12319 placement
function blockDecision(event, n, r = {}) {
  let s = "async" in r ? {} : r;
  if (event !== "PreToolUse")
    return {
      ...s,
      decision: "block",
      reason: n,
    };
  let hookSpecificOutput = "hookSpecificOutput" in s ? s.hookSpecificOutput : undefined;
  let additionalContext =
    hookSpecificOutput?.hookEventName === "PreToolUse" ? hookSpecificOutput.additionalContext : undefined;
  return {
    ...s,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: n,
      ...(additionalContext !== undefined && {
        additionalContext,
      }),
    },
  };
}
//@ chunk-mthxbav8.js:12319-12647 placement
function interpretHookResult(e, n) {
  let r = classifyHookOutput(e, n);
  if (r.answer === null) return r;
  let { answer } = parseHookJsonOutput(r.answer, n.event);
  if (r.exitClass === "2" && r.blocked && !isDenyingHookOutput(answer) && e.kind === "command") {
    let u = blockDecision(n.event, `[${n.label}]: ${e.stderr || "No stderr output"}`, answer);
    return {
      ...r,
      answer: parseHookJsonOutput(u, n.event).answer,
      exitClass: "2",
      blocked: true,
    };
  }
  return {
    ...r,
    answer,
    blocked: isBlockingHookOutput(answer),
  };
}
//@ chunk-mthxbav8.js:12647-16511 placement
/**
 * 把钩子执行结果（退出码、超时、输出 JSON）归类为答复，处理超时是否默认拒绝。
 */
function classifyHookOutput(e, { event, label, timedOut, timeoutMs, timeoutFailsClosed = false }) {
  if (e.aborted && !timedOut)
    return {
      answer: null,
      exitClass: "cancelled",
      blocked: false,
    };
  if (e.aborted) {
    let rounded = Math.round(timeoutMs / 1000);
    let j = `[${label}]: timed out after ${rounded}s on the attached machine`;
    if (
      timeoutFailsClosed &&
      (event === "PreToolUse" || event === "UserPromptSubmit" || event === "UserPromptExpansion")
    )
      return {
        answer: blockDecision(event, j, buildPromptBlockOutput(event, j) ?? {}),
        exitClass: "timeout",
        blocked: true,
      };
    return {
      answer: {},
      exitClass: "timeout",
      localWarning: `[${label}]: timed out after ${rounded}s \u2014 output discarded; raise the hook's "timeout" to allow more time`,
      blocked: false,
    };
  }
  if (e.kind === "http") {
    if (e.error !== undefined || !e.ok) {
      let M = sanitizeOrFallback(e.error ?? `HTTP ${e.statusCode ?? "request failed"}`, "request failed");
      let q =
        e.error !== undefined
          ? "the request to it could not be made from this machine"
          : `it answered HTTP ${e.statusCode ?? "with an error"}`;
      let T = denyPreToolUseOutput(event, `[${label}]: not run \u2014 ${q}; retry`);
      return {
        answer: T,
        exitClass: "other",
        localWarning: `[${label}]: ${M}`,
        blocked: isBlockingHookOutput(T),
      };
    }
    let { json, validationError } = parseHttpHookOutput(e.body);
    if (validationError !== undefined || json === undefined)
      return {
        answer: {},
        exitClass: "other",
        localWarning: `[${label}]: ${sanitizeOrFallback(validationError ?? "", "no JSON in the response")}`,
        blocked: false,
      };
    return {
      answer: json,
      exitClass: "0",
      blocked: isBlockingHookOutput(json),
    };
  }
  if (e.spawnFailed) {
    let R = denyPreToolUseOutput(
      event,
      `[${label}]: not run \u2014 it could not be started on this machine; retry`,
    );
    return {
      answer: R,
      exitClass: "spawn_failed",
      localWarning: `[${label}]: ${sanitizeOrFallback(e.stderr, "failed to start")}`,
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
  if (e.status === 2 && (e.stdioIncomplete === true || e.stdioClosedWithoutEnd === true)) {
    let promptBlockOutput = buildPromptBlockOutput(event, `[${label}]: ${e.stderr || "No stderr output"}`);
    if (promptBlockOutput !== undefined)
      return {
        answer: promptBlockOutput,
        exitClass: "2",
        blocked: true,
      };
  }
  let h = event !== "Stop" && event !== "SubagentStop" && event !== "StopFailure";
  if (announcedAsync(e.stdout)) {
    if (e.status === 2 && !w && h)
      return {
        answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
        exitClass: "2",
        blocked: true,
      };
    return e.status === 0
      ? {
          answer: {},
          exitClass: "0",
          blocked: false,
        }
      : {
          answer: {},
          exitClass: e.status === 2 ? "2" : "other",
          localWarning: `[${label}]: announced async, then failed with status code ${e.status}: ${sanitizeOrFallback(e.stderr, "No stderr output")}`,
          blocked: false,
        };
  }
  let { json, plainText, validationError } = parseHookOutput(e.stdout);
  let O = dropSuspectCaptureJson(e, event, json);
  let untrustedCaptureReason = getUntrustedCaptureReason(
    e,
    event,
    e.stdout,
    O,
    (R) => parseHookOutput(R).json,
  );
  if (untrustedCaptureReason !== undefined) {
    let R = `[${label}]: output incomplete \u2014 its stdio was cut before end-of-stream on this machine; retry`;
    let j = PROMPT_GUARD_EVENTS.has(event)
      ? blockDecision(event, R, buildPromptBlockOutput(event, R) ?? {})
      : {};
    return {
      answer: j,
      exitClass: "0",
      localWarning: `[${label}]: ${sanitizeOrFallback(untrustedCaptureReason, "stdio incomplete")}`,
      blocked: isBlockingHookOutput(j),
    };
  }
  if (validationError !== undefined && e.status !== 2)
    return {
      answer: {},
      exitClass: e.status === 0 ? "0" : "other",
      localWarning: `[${label}]: ${sanitizeOrFallback(withHookStderr(validationError, e.status, e.stderr), "hook JSON output failed validation")}`,
      blocked: false,
    };
  if (O !== undefined) {
    if ("async" in O)
      return e.status === 2 && !w && h
        ? {
            answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
            exitClass: "2",
            blocked: true,
          }
        : e.status === 0
          ? {
              answer: {},
              exitClass: "0",
              blocked: false,
            }
          : {
              answer: {},
              exitClass: e.status === 2 ? "2" : "other",
              localWarning: `[${label}]: announced async, then failed with status code ${e.status}: ${sanitizeOrFallback(e.stderr, "No stderr output")}`,
              blocked: false,
            };
    let R = O;
    if (e.status === 2 && !isDenyingHookOutput(R))
      return {
        answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`, R),
        exitClass: "2",
        blocked: true,
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
          answer: {
            hookSpecificOutput: {
              hookEventName: event,
              additionalContext: trimmed,
            },
          },
          exitClass: "0",
          blocked: false,
        }
      : {
          answer: {},
          exitClass: "0",
          blocked: false,
        };
  }
  if (e.status === 2) {
    if (w)
      return {
        answer: {},
        exitClass: "2",
        localWarning: `[${label}]: the hook script appears to be missing (${sanitizeOrFallback(e.stderr, "no such file")})`,
        blocked: false,
      };
    return {
      answer: blockDecision(event, `[${label}]: ${e.stderr || "No stderr output"}`),
      exitClass: "2",
      blocked: true,
    };
  }
  return {
    answer: {},
    exitClass: "other",
    localWarning: `[${label}]: failed with non-blocking status code ${e.status}: ${sanitizeOrFallback(e.stderr, "No stderr output")}`,
    blocked: false,
  };
}
//@ chunk-mthxbav8.js:16511-16658 placement
function denyPreToolUseOutput(event, permissionDecisionReason) {
  return event === "PreToolUse"
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason,
        },
      }
    : {};
}
//@ chunk-mthxbav8.js:16658-16739 placement
var answeredOnDeps = {
  isAnsweredOn: () => isCloudClientToolServingAnsweredOn(),
  isAnsweredOff: () =>
    getToolServingFlagAnsweredOff({
      cloudClient: true,
    }) !== undefined,
};
//@ chunk-mthxbav8.js:16739-16877 placement
function createAnsweredOnLatch(e = answeredOnDeps) {
  let n = false;
  return () => {
    if (e.isAnsweredOff()) return "answered_off";
    n ||= e.isAnsweredOn();
    return n ? "answered_on" : "unanswered";
  };
}
//@ chunk-mthxbav8.js:17001-17424 placement
/**
 * 设备钩子的宽限、重试、体积与标识长度等常量，以及空目录提示与无法担保发送者的文案。
 */
var DEVICE_HOOK_GRACE_MS = 30000;
var MAX_TRANSPORT_RETRIES = 8;
var MAX_HOOKS_PER_EVENT = 64;
var MAX_HOOK_BODY_BYTES = 1048576;
var REQUEST_TIMEOUT_MS = 2000;
var MIN_WAIT_BEFORE_ACQUIRE_MS = 1000;
var MAX_LABEL_CHARS = 256;
var MAX_COLLECTED_PATHS = 256;
var MAX_LINK_HOPS = 64;
var MAX_PATH_DEPTH = 8;
var MAX_REQUEST_ID_CHARS = 256;
var NULL_DEVICE = devNull;
var EMPTY_FOLDER_HINT = 'started in an empty folder \xB7 mark it "cloud": "device" if it needs the project';
var SAFE_IDENTIFIER_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
var EFFORT_LEVEL_RE = /^[a-z]{1,16}$/;
var SENDER_UNVOUCHED_TEXT =
  "Not running your hooks for the cloud session: the service could not vouch for the sender of its hook requests under your organization's trusted-device policy. The session goes on without them.";
//@ chunk-mthxbav8.js:17424-17513 placement
function isPastDeadline(e) {
  return (
    e.deadlineMs !== undefined && (e.ageMs === undefined || e.ageMs > e.deadlineMs + DEVICE_HOOK_GRACE_MS)
  );
}
//@ chunk-mthxbav8.js:17513-17572 placement
function safeLabel(requestId) {
  return SAFE_IDENTIFIER_RE.test(requestId)
    ? requestId
    : sanitizeDisplayText(requestId, {
        maxCodeUnits: 64,
      });
}
//@ chunk-mthxbav8.js:17572-17734 placement
function permissionDecisionOutput(event, wire, r) {
  return event === "PreToolUse"
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `[${wire}]: ${r}`,
        },
      }
    : {};
}
//@ chunk-mthxbav8.js:17734-17792 placement
function rewritePathInInput(e, n, r) {
  return n.rawPath === r ? e : replaceCommandProgram(e, n.site, r);
}
//@ chunk-mthxbav8.js:17792-18056 placement
function isPlausibleAbsolutePath(atPath, roots) {
  if (typeof atPath !== "string" || roots === null || !atPath.startsWith("/")) return false;
  if (atPath.trim() !== atPath || /^\/(?:proc|dev|net|network)(?:\/|$)/i.test(atPath)) return false;
  if (
    atPath
      .split("/")
      .slice(1)
      .some((s) => s === "" || s === "." || s === "..")
  )
    return false;
  return !isPosixPathUnder(atPath, stripTrailingSlashes(roots.containerProjectDir));
}
//@ chunk-mthxbav8.js:18056-18067 placement
var isHookInputTopField = HOOK_INPUT_TOP_FIELDS;
//@ chunk-mthxbav8.js:18067-18317 placement
function isRewritablePath(e, n) {
  if (isHookInputTopField(e)) return true;
  let r = unescapeJsonPointerPath(e);
  let s = r[0] === "tool_calls" ? 2 : 0;
  if (r[s] !== "tool_response") return false;
  let reduced = r.slice(0, s + 1).reduce((acc, w) => (isObjectLike(acc) ? acc[w] : undefined), n);
  for (let S of r.slice(s + 1)) {
    if (Array.isArray(reduced)) return false;
    reduced = isObjectLike(reduced) ? reduced[S] : undefined;
  }
  return true;
}
//@ chunk-mthxbav8.js:18317-18620 placement
function isToolResponsePath(e, n, r) {
  let s = unescapeJsonPointerPath(e);
  let u = s[0] === "tool_calls";
  let S = u ? s.slice(2) : s;
  if (S[0] === "tool_response") return true;
  if (S[0] !== "tool_input" || S.length !== 2 || !isObjectLike(n)) return false;
  let toolCalls = n.tool_calls;
  let h = u ? (isObjectLike(toolCalls) ? toolCalls[s[1] ?? ""] : undefined) : n;
  let toolName = isObjectLike(h) ? h.tool_name : undefined;
  let y = typeof toolName === "string" ? toolPathFieldInput(toolName, r) : undefined;
  return y !== undefined && S[1] === y;
}
//@ chunk-mthxbav8.js:18620-18729 layout
var PERMISSION_MODE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
var DEVICE_HOOKS_DISCONNECT = Symbol("deviceHooks.disconnect");
var DEVICE_HOOKS_DEADLINE = Symbol("deviceHooks.deadline");
//@ chunk-mthxbav8.js:18729-19107 placement = createBaseHookInput (0.526)
/**
 * 校验钩子输入里的 session_id/agent_id/prompt_id/tool_use_id 不含路径穿越、permission_mode/effort/agent_type 合法，用于设备钩子转发。旧版名 createBaseHookInput 配错。
 */
function isSafeHookInputIds(e) {
  let n = [e.session_id, e.agent_id, e.prompt_id];
  if ("tool_use_id" in e && typeof e.tool_use_id === "string") n.push(e.tool_use_id);
  return (
    n.every((r) => r === undefined || (SAFE_IDENTIFIER_RE.test(r) && !r.includes(".."))) &&
    (e.permission_mode === undefined || PERMISSION_MODE_ID_RE.test(e.permission_mode)) &&
    (e.effort === undefined || EFFORT_LEVEL_RE.test(e.effort.level)) &&
    (e.agent_type === undefined ||
      sanitizeDisplayText(e.agent_type, {
        maxCodeUnits: 64,
      }) === e.agent_type)
  );
}
export {
  createDeviceHookDecider,
  reachStateRegistry,
  MAX_HOOKS_PER_EVENT,
  MAX_COLLECTED_PATHS,
  MAX_PATH_DEPTH,
  isHookInputTopField,
  MAX_LINK_HOPS,
  MAX_TRANSPORT_RETRIES,
  REQUEST_TIMEOUT_MS,
  MAX_LABEL_CHARS,
  permissionDecisionOutput,
  rewritePathInInput,
  isPastDeadline,
  MAX_HOOK_BODY_BYTES,
  isSafeHookInputIds,
  safeLabel,
  isRewritablePath,
  isToolResponsePath,
  isPlausibleAbsolutePath,
  NULL_DEVICE,
  MIN_WAIT_BEFORE_ACQUIRE_MS,
  withShellPrefix,
  interpretHookResult,
  EMPTY_FOLDER_HINT,
  MAX_REQUEST_ID_CHARS,
  SENDER_UNVOUCHED_TEXT,
  DEVICE_HOOKS_DISCONNECT,
  DEVICE_HOOKS_DEADLINE,
  runDeviceHook,
  DEVICE_HOOK_EXECUTORS,
  createAnsweredOnLatch,
};
