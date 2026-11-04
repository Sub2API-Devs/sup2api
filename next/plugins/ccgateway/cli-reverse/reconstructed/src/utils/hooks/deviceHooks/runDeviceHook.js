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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
function createDeviceHookRunner(options) {
  let deps = {
    ...defaultReachDeps(options.launchDir),
    ...options.deps,
  };
  let { memory } = options;
  memory.reachBaseline ??= new Map(SETTING_SOURCES.map((source) => [source, deps.scopeWriteEntries(source)]));
  memory.commonRoots ??= deps.commonWriteRoots();
  let { reachBaseline, commonRoots, syncRoots, stickyRoots } = memory;
  let noteSyncRoot = (root) => {
    syncRoots.add(root);
    deps.realpath(root).then(
      (realRoot) => syncRoots.add(realRoot),
      () => {},
    );
  };
  let addedRoots = async () => {
    let flattened = deps.addedDirectories().flatMap((directory) => {
      try {
        return [expandPath(directory, options.launchDir)];
      } catch {
        return [];
      }
    });
    return [
      ...flattened,
      ...(await Promise.all(flattened.map((directory) => deps.realpath(directory).catch(() => directory)))),
    ];
  };
  return {
    noteSyncRoot,
    async current() {
      let unresolved = false;
      let realpathOrSelf = (path) =>
        deps.realpath(path).then(
          (realPath) => (isAbsolutePlatformPath(realPath) ? realPath : path),
          () => {
            unresolved = true;
            return path;
          },
        );
      let launchDirReal = await realpathOrSelf(options.launchDir);
      let projectDirReal = await realpathOrSelf(options.projectDir);
      let syncRoot = null;
      try {
        syncRoot = options.syncRoot();
      } catch {
        unresolved = true;
      }
      if (syncRoot !== null) {
        syncRoots.add(syncRoot);
        syncRoots.add(await realpathOrSelf(syncRoot));
      }
      let sync =
        syncRoot === null
          ? undefined
          : {
              rootReal: await realpathOrSelf(syncRoot),
              root: syncRoot,
            };
      let extra = uniq([
        ...(options.repoRoot !== null ? [options.repoRoot, await realpathOrSelf(options.repoRoot)] : []),
        ...syncRoots,
        ...(await addedRoots()),
      ]);
      let configHomeReal = await realpathOrSelf(options.configHome);
      await collectStickyRoots({
        stickyRoots,
        pinnedScopes: memory.pinnedScopes,
        pinnedRoots: memory.pinnedRoots,
        baseRoots: [
          ...stickyRootsFor({
            launchDir: options.launchDir,
            launchDirReal,
          }),
          ...extra,
        ],
        reachBaseline,
        scopeSettingsFile: deps.scopeSettingsFile,
        realpath: deps.realpath,
        commonRoots: () => commonRoots,
        scopeRoots: deps.scopeWriteRoots,
      }).catch(() => {
        unresolved = true;
      });
      if (unresolved)
        logForDebugging(
          "cloud session reach: a base root did not resolve (or sync state could not be read); every hook is treated as in reach for this answer",
          {
            level: "warn",
          },
        );
      return {
        launchDir: options.launchDir,
        launchDirReal,
        configHomeReal,
        projectDir: options.projectDir,
        projectDirReal,
        ...(sync !== undefined && {
          sync,
        }),
        extraReach: unresolved ? ["/"] : uniq([...extra, ...stickyRoots]),
      };
    },
  };
}
//@ chunk-mthxbav8.js:8309-8900 placement
function defaultReachDeps(launchDir) {
  return {
    realpath: scriptFileReaderDeps().realpath,
    commonWriteRoots: () => collectBaseReachRoots(launchDir),
    scopeWriteRoots: (source, scope) => settingsReachRootsForSource(launchDir, source, scope),
    scopeWriteEntries: (source) => {
      let settingsWriteRoots = collectSettingsWriteRoots(source, launchDir);
      let settingsFilePathForSource = getSettingsFilePathForSource(source);
      if (source === "policySettings" || !settingsFilePathForSource) return settingsWriteRoots;
      let settingsFileUncached = parseSettingsFileUncached(
        settingsFilePathForSource,
        source === "flagSettings"
          ? (getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent())
          : undefined,
      );
      if (settingsFileUncached.errors.some((error) => (error.severity ?? "fatal") === "fatal")) {
        logForDebugging(
          `cloud session reach: the ${source} settings file could not be read or parsed at attach; its write grants are unknown, so every hook counts as in the session's reach`,
          {
            level: "warn",
          },
        );
        return [POSIX_SEP_2];
      }
      return uniq([
        ...collectSettingsWriteRoots(source, launchDir, settingsFileUncached.settings),
        ...settingsWriteRoots,
      ]);
    },
    scopeSettingsFile: (source) => getSettingsFilePathForSource(source) ?? null,
    addedDirectories: () => getAdditionalDirectoriesForClaudeMd(),
  };
}
//@ chunk-mthxbav8.js:8900-9927 placement
function createDeviceHookDecider(options) {
  let deps = {
    realpath,
    repoRootOf: findGitRootUncached,
    consentPath: cloudPluginsConsentFilePath,
    configHome: getClaudeConfigDir,
    ...options.deps,
  };
  let { launchDir, memory } = options;
  let prepared = null;
  let getPrepared = () =>
    (prepared ??= (async () => {
      let realpathOrSelf = (launchDir) => deps.realpath(launchDir).catch(() => launchDir);
      let launchDirReal = await realpathOrSelf(launchDir);
      let repoRoots = uniq(
        [launchDir, launchDirReal].map((root) => deps.repoRootOf(root)).filter((root) => root !== null),
      );
      let extraRoots = uniq((await Promise.all(repoRoots.map(realpathOrSelf))).concat(repoRoots));
      let [repoRoot = null] = repoRoots;
      return {
        tracker: createDeviceHookRunner({
          launchDir,
          projectDir: launchDir,
          repoRoot,
          configHome: deps.configHome(),
          syncRoot: options.syncRoot,
          memory,
          ...(deps.tracker !== undefined && {
            deps: deps.tracker,
          }),
        }),
        launchRoots: uniq([launchDir, launchDirReal, ...extraRoots]),
        repoRoots: extraRoots,
      };
    })());
  return {
    async judge() {
      try {
        let { tracker, launchRoots, repoRoots } = await getPrepared();
        let reach = await tracker.current();
        if (options.syncElsewhere !== false) return "unknown";
        let roots = [...commandReachRoots(reach), ...repoRoots];
        if (roots.some((root) => root === POSIX_SEP_2 || !isAbsolutePlatformPath(root))) return "unknown";
        let consentPath = deps.consentPath();
        if (!consentPath.startsWith("/")) return "unknown";
        let probe = await probeWritability(consentPath, roots, deps.realpath);
        if (probe === false) return "outside";
        if (probe === "unresolvable") return "unknown";
        let pairs = [consentPath, await deps.realpath(consentPath).catch(() => consentPath)];
        if (anyPairMatches(pairs, launchRoots)) return "in_launch_dir";
        return anyPairMatches(pairs, [...memory.syncRoots]) ? "in_sync_root" : "in_other_root";
      } catch {
        return "unknown";
      }
    },
  };
}
//@ chunk-mthxbav8.js:9927-10045 placement
function createReachStateRegistry() {
  let byLaunchDir = new Map();
  return {
    reachFor(launchDir) {
      let existing = byLaunchDir.get(launchDir);
      if (existing !== undefined) return existing;
      let reachState = createReachState();
      byLaunchDir.set(launchDir, reachState);
      return reachState;
    },
  };
}
//@ chunk-mthxbav8.js:10045-10063 placement
/**
 * 宿主隔离的可达范围状态注册表。
 */
var reachStateRegistry; // deferred: uses createReachStateRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mthxbav8.js:10045", () => {
  reachStateRegistry = new HostScoped(createReachStateRegistry);
});
//@ chunk-mthxbav8.js:10170-10616 placement
/**
 * 设备钩子执行器映射、缺失项目目录标记、传给钩子 git 的安全配置与替代 ref 命令参数。
 */
var DEVICE_HOOK_EXECUTORS; // deferred: uses ALTERNATE_REFS_COMMAND (../../gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var MISSING_PROJECT_DIR_MARKER;
var SAFE_GIT_CONFIG_FOR_HOOKS;
var TENGU_TRANQUIL_CROWN;
var ALTERNATE_REFS_CONFIG_ARG;
deferInit("chunk-mthxbav8.js:10170", () => {
  DEVICE_HOOK_EXECUTORS = {
    execCommand: execCommandHookForDevice,
    execHttp: execHttpHook,
  };
  MISSING_PROJECT_DIR_MARKER = `${EMPTY_PATH_DIR}/project-folder-not-given-to-this-hook`;
  SAFE_GIT_CONFIG_FOR_HOOKS = [
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
  TENGU_TRANQUIL_CROWN = "tengu_tranquil_crown";
  ALTERNATE_REFS_CONFIG_ARG = ["core.alternateRefsCommand", ALTERNATE_REFS_COMMAND];
});
//@ chunk-mthxbav8.js:10616-10785 placement
function withShellPrefix(env) {
  if (env.omit.includes("CLAUDE_CODE_SHELL_PREFIX")) return;
  let trimmed = env.base.CLAUDE_CODE_SHELL_PREFIX?.trim() || undefined;
  return trimmed !== undefined && trimmed.startsWith("/") ? trimmed : undefined;
}
//@ chunk-mthxbav8.js:10785-11892 placement
async function runDeviceHook(
  { hook, event, input, timeoutMs, env, startDirectory },
  context,
  executors,
  signal,
) {
  if (signal.aborted)
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
  let jsonInput = jsonStringify(input);
  if (hook.type === "http")
    try {
      return {
        kind: "http",
        ...(await executors.execHttp(
          {
            ...hook,
            timeout: undefined,
          },
          event,
          jsonInput,
          signal,
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
  let { signal: signal_2, cleanup } = createCombinedAbortSignal(signal, {
    timeoutMs,
  });
  try {
    return {
      kind: "command",
      ...(await executors.execCommand({
        hook: {
          ...hook,
          timeout: Math.ceil(timeoutMs / 1000) + 30,
        },
        hookEvent: event,
        jsonInput,
        envContext: claudeEnvContextFrom(input),
        project:
          startDirectory === undefined
            ? {
                originalCwd: context.launchDir,
                projectRoot: context.projectRoot,
              }
            : {
                originalCwd: startDirectory,
                projectRoot: MISSING_PROJECT_DIR_MARKER,
              },
        cwd: startDirectory ?? input.cwd,
        startsOutsideProject: startDirectory !== undefined,
        signal: signal_2,
        envBase: env.base,
        envOmit: env.omit,
        shellPrefix: withShellPrefix(env),
        envExtra: {
          ...env.extra,
          CLAUDE_CODE_CLOUD_SESSION_ID: context.cloudSessionId,
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
function sanitizeOrFallback(stderr, fallback) {
  return (
    sanitizeDisplayText(stderr, {
      maxCodeUnits: 400,
    }) || fallback
  );
}
//@ chunk-mthxbav8.js:11944-12319 placement
function blockDecision(event, reason, answer = {}) {
  let base = "async" in answer ? {} : answer;
  if (event !== "PreToolUse")
    return {
      ...base,
      decision: "block",
      reason,
    };
  let hookSpecificOutput = "hookSpecificOutput" in base ? base.hookSpecificOutput : undefined;
  let additionalContext =
    hookSpecificOutput?.hookEventName === "PreToolUse" ? hookSpecificOutput.additionalContext : undefined;
  return {
    ...base,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      ...(additionalContext !== undefined && {
        additionalContext,
      }),
    },
  };
}
//@ chunk-mthxbav8.js:12319-12647 placement
function interpretHookResult(result, context) {
  let classified = classifyHookOutput(result, context);
  if (classified.answer === null) return classified;
  let { answer } = parseHookJsonOutput(classified.answer, context.event);
  if (
    classified.exitClass === "2" &&
    classified.blocked &&
    !isDenyingHookOutput(answer) &&
    result.kind === "command"
  ) {
    let decision = blockDecision(
      context.event,
      `[${context.label}]: ${result.stderr || "No stderr output"}`,
      answer,
    );
    return {
      ...classified,
      answer: parseHookJsonOutput(decision, context.event).answer,
      exitClass: "2",
      blocked: true,
    };
  }
  return {
    ...classified,
    answer,
    blocked: isBlockingHookOutput(answer),
  };
}
//@ chunk-mthxbav8.js:12647-16511 placement
/**
 * 把钩子执行结果（退出码、超时、输出 JSON）归类为答复，处理超时是否默认拒绝。
 */
function classifyHookOutput(result, { event, label, timedOut, timeoutMs, timeoutFailsClosed = false }) {
  if (result.aborted && !timedOut)
    return {
      answer: null,
      exitClass: "cancelled",
      blocked: false,
    };
  if (result.aborted) {
    let rounded = Math.round(timeoutMs / 1000);
    let timeoutText = `[${label}]: timed out after ${rounded}s on the attached machine`;
    if (
      timeoutFailsClosed &&
      (event === "PreToolUse" || event === "UserPromptSubmit" || event === "UserPromptExpansion")
    )
      return {
        answer: blockDecision(event, timeoutText, buildPromptBlockOutput(event, timeoutText) ?? {}),
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
  if (result.kind === "http") {
    if (result.error !== undefined || !result.ok) {
      let reasonText = sanitizeOrFallback(
        result.error ?? `HTTP ${result.statusCode ?? "request failed"}`,
        "request failed",
      );
      let why =
        result.error !== undefined
          ? "the request to it could not be made from this machine"
          : `it answered HTTP ${result.statusCode ?? "with an error"}`;
      let answer = denyPreToolUseOutput(event, `[${label}]: not run \u2014 ${why}; retry`);
      return {
        answer,
        exitClass: "other",
        localWarning: `[${label}]: ${reasonText}`,
        blocked: isBlockingHookOutput(answer),
      };
    }
    let { json, validationError } = parseHttpHookOutput(result.body);
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
  if (result.spawnFailed) {
    let answer = denyPreToolUseOutput(
      event,
      `[${label}]: not run \u2014 it could not be started on this machine; retry`,
    );
    return {
      answer,
      exitClass: "spawn_failed",
      localWarning: `[${label}]: ${sanitizeOrFallback(result.stderr, "failed to start")}`,
      blocked: isBlockingHookOutput(answer),
    };
  }
  let scriptMissing =
    result.status === 2 &&
    exitTwoMeansMissingScript({
      hookEvent: event,
      stdout: result.stdout,
      stderr: result.stderr,
      stdioIncomplete: result.stdioIncomplete,
      stdioClosedWithoutEnd: result.stdioClosedWithoutEnd,
    });
  if (result.status === 2 && (result.stdioIncomplete === true || result.stdioClosedWithoutEnd === true)) {
    let promptBlockOutput = buildPromptBlockOutput(
      event,
      `[${label}]: ${result.stderr || "No stderr output"}`,
    );
    if (promptBlockOutput !== undefined)
      return {
        answer: promptBlockOutput,
        exitClass: "2",
        blocked: true,
      };
  }
  let canBlock = event !== "Stop" && event !== "SubagentStop" && event !== "StopFailure";
  if (announcedAsync(result.stdout)) {
    if (result.status === 2 && !scriptMissing && canBlock)
      return {
        answer: blockDecision(event, `[${label}]: ${result.stderr || "No stderr output"}`),
        exitClass: "2",
        blocked: true,
      };
    return result.status === 0
      ? {
          answer: {},
          exitClass: "0",
          blocked: false,
        }
      : {
          answer: {},
          exitClass: result.status === 2 ? "2" : "other",
          localWarning: `[${label}]: announced async, then failed with status code ${result.status}: ${sanitizeOrFallback(result.stderr, "No stderr output")}`,
          blocked: false,
        };
  }
  let { json, plainText, validationError } = parseHookOutput(result.stdout);
  let json_2 = dropSuspectCaptureJson(result, event, json);
  let untrustedCaptureReason = getUntrustedCaptureReason(
    result,
    event,
    result.stdout,
    json_2,
    (text) => parseHookOutput(text).json,
  );
  if (untrustedCaptureReason !== undefined) {
    let text = `[${label}]: output incomplete \u2014 its stdio was cut before end-of-stream on this machine; retry`;
    let answer = PROMPT_GUARD_EVENTS.has(event)
      ? blockDecision(event, text, buildPromptBlockOutput(event, text) ?? {})
      : {};
    return {
      answer,
      exitClass: "0",
      localWarning: `[${label}]: ${sanitizeOrFallback(untrustedCaptureReason, "stdio incomplete")}`,
      blocked: isBlockingHookOutput(answer),
    };
  }
  if (validationError !== undefined && result.status !== 2)
    return {
      answer: {},
      exitClass: result.status === 0 ? "0" : "other",
      localWarning: `[${label}]: ${sanitizeOrFallback(withHookStderr(validationError, result.status, result.stderr), "hook JSON output failed validation")}`,
      blocked: false,
    };
  if (json_2 !== undefined) {
    if ("async" in json_2)
      return result.status === 2 && !scriptMissing && canBlock
        ? {
            answer: blockDecision(event, `[${label}]: ${result.stderr || "No stderr output"}`),
            exitClass: "2",
            blocked: true,
          }
        : result.status === 0
          ? {
              answer: {},
              exitClass: "0",
              blocked: false,
            }
          : {
              answer: {},
              exitClass: result.status === 2 ? "2" : "other",
              localWarning: `[${label}]: announced async, then failed with status code ${result.status}: ${sanitizeOrFallback(result.stderr, "No stderr output")}`,
              blocked: false,
            };
    let captured = json_2;
    if (result.status === 2 && !isDenyingHookOutput(captured))
      return {
        answer: blockDecision(event, `[${label}]: ${result.stderr || "No stderr output"}`, captured),
        exitClass: "2",
        blocked: true,
      };
    return {
      answer: captured,
      exitClass: result.status === 0 ? "0" : result.status === 2 ? "2" : "other",
      blocked: isBlockingHookOutput(captured),
    };
  }
  if (result.status === 0) {
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
  if (result.status === 2) {
    if (scriptMissing)
      return {
        answer: {},
        exitClass: "2",
        localWarning: `[${label}]: the hook script appears to be missing (${sanitizeOrFallback(result.stderr, "no such file")})`,
        blocked: false,
      };
    return {
      answer: blockDecision(event, `[${label}]: ${result.stderr || "No stderr output"}`),
      exitClass: "2",
      blocked: true,
    };
  }
  return {
    answer: {},
    exitClass: "other",
    localWarning: `[${label}]: failed with non-blocking status code ${result.status}: ${sanitizeOrFallback(result.stderr, "No stderr output")}`,
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
function createAnsweredOnLatch(deps = answeredOnDeps) {
  let latched = false;
  return () => {
    if (deps.isAnsweredOff()) return "answered_off";
    latched ||= deps.isAnsweredOn();
    return latched ? "answered_on" : "unanswered";
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
function isPastDeadline(result) {
  return (
    result.deadlineMs !== undefined &&
    (result.ageMs === undefined || result.ageMs > result.deadlineMs + DEVICE_HOOK_GRACE_MS)
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
function permissionDecisionOutput(event, wire, detail) {
  return event === "PreToolUse"
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `[${wire}]: ${detail}`,
        },
      }
    : {};
}
//@ chunk-mthxbav8.js:17734-17792 placement
function rewritePathInInput(command, analysis, rawPath) {
  return analysis.rawPath === rawPath ? command : replaceCommandProgram(command, analysis.site, rawPath);
}
//@ chunk-mthxbav8.js:17792-18056 placement
function isPlausibleAbsolutePath(path, roots) {
  if (typeof path !== "string" || roots === null || !path.startsWith("/")) return false;
  if (path.trim() !== path || /^\/(?:proc|dev|net|network)(?:\/|$)/i.test(path)) return false;
  if (
    path
      .split("/")
      .slice(1)
      .some((segment) => segment === "" || segment === "." || segment === "..")
  )
    return false;
  return !isPosixPathUnder(path, stripTrailingSlashes(roots.containerProjectDir));
}
//@ chunk-mthxbav8.js:18056-18067 placement
var isHookInputTopField = HOOK_INPUT_TOP_FIELDS;
//@ chunk-mthxbav8.js:18067-18317 placement
function isRewritablePath(pointer, input) {
  if (isHookInputTopField(pointer)) return true;
  let segments = unescapeJsonPointerPath(pointer);
  let baseIndex = segments[0] === "tool_calls" ? 2 : 0;
  if (segments[baseIndex] !== "tool_response") return false;
  let reduced = segments
    .slice(0, baseIndex + 1)
    .reduce((acc, segment) => (isObjectLike(acc) ? acc[segment] : undefined), input);
  for (let segment of segments.slice(baseIndex + 1)) {
    if (Array.isArray(reduced)) return false;
    reduced = isObjectLike(reduced) ? reduced[segment] : undefined;
  }
  return true;
}
//@ chunk-mthxbav8.js:18317-18620 placement
function isToolResponsePath(pointer, input, toolPathFields) {
  let segments = unescapeJsonPointerPath(pointer);
  let isNested = segments[0] === "tool_calls";
  let rest = isNested ? segments.slice(2) : segments;
  if (rest[0] === "tool_response") return true;
  if (rest[0] !== "tool_input" || rest.length !== 2 || !isObjectLike(input)) return false;
  let toolCalls = input.tool_calls;
  let toolCall = isNested ? (isObjectLike(toolCalls) ? toolCalls[segments[1] ?? ""] : undefined) : input;
  let toolName = isObjectLike(toolCall) ? toolCall.tool_name : undefined;
  let pathField = typeof toolName === "string" ? toolPathFieldInput(toolName, toolPathFields) : undefined;
  return pathField !== undefined && rest[1] === pathField;
}
//@ chunk-mthxbav8.js:18620-18729 layout
var PERMISSION_MODE_ID_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_HOOKS_DISCONNECT;
var DEVICE_HOOKS_DEADLINE;
deferInit("chunk-mthxbav8.js:18620", () => {
  PERMISSION_MODE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
  DEVICE_HOOKS_DISCONNECT = Symbol("deviceHooks.disconnect");
  DEVICE_HOOKS_DEADLINE = Symbol("deviceHooks.deadline");
});
//@ chunk-mthxbav8.js:18729-19107 placement (2.1.88 match: createBaseHookInput, 0.526)
/**
 * 校验钩子输入里的 session_id/agent_id/prompt_id/tool_use_id 不含路径穿越、permission_mode/effort/agent_type 合法，用于设备钩子转发。旧版名 createBaseHookInput 配错。
 */
function isSafeHookInputIds(input) {
  let ids = [input.session_id, input.agent_id, input.prompt_id];
  if ("tool_use_id" in input && typeof input.tool_use_id === "string") ids.push(input.tool_use_id);
  return (
    ids.every((id) => id === undefined || (SAFE_IDENTIFIER_RE.test(id) && !id.includes(".."))) &&
    (input.permission_mode === undefined || PERMISSION_MODE_ID_RE.test(input.permission_mode)) &&
    (input.effort === undefined || EFFORT_LEVEL_RE.test(input.effort.level)) &&
    (input.agent_type === undefined ||
      sanitizeDisplayText(input.agent_type, {
        maxCodeUnits: 64,
      }) === input.agent_type)
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
