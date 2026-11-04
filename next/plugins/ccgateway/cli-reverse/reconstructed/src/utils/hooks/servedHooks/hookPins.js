/**
 * utils/hooks/servedHooks/hookPins.ts
 *
 * 2.1.316 新增：钩子命令固定（pin）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { join, dirname, relative, isAbsolute, basename } from "path";
import { realpath, open, lstat, mkdtemp, writeFile, rm as rm_2 } from "fs/promises";
import { constants } from "fs";
import { tmpdir as tmpdir_2 } from "os";
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  record,
  discriminatedUnion,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { servedCallsDir } from "../../../remote/tools/servedCallLog.js";
import { computeContentHash } from "../../commitAttribution.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT, errorMessage } from "../../errors.js";
import { jsonParseRaw, toJsonLine, jsonStringify } from "../../slowOperations.js";
import {
  isViolinPegOn,
  isViolinOverstandOn,
  resolveHookSandboxMode,
  checkHookSandboxAvailable,
  isPathWithinNormalizedCase,
  replaceCommandProgram,
  buildHookSandboxDevices,
  buildSandboxedHookEnv,
  wrapLinuxHookCommand,
  wrapProjectHookInSandbox,
} from "./hookSandbox.js";
import { resolveOptions, EMPTY_PATH_DIR, mergeHookEnv } from "../hookCommandResolution.js";
import { logForDebugging } from "../../debug.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSource } from "../../settings/settings.js";
import { sortKeysDeep } from "../../settings/settingsSourceTrust.js";
import { foldPathSegments } from "../../plugins/pluginCachePaths.js";
import { truncateToLength, printableText } from "../../stringUtils.js";
import { READ_LIMITS, O_NOFOLLOW_FLAG } from "../../fsBoundRead.js";
import { getProjectConfigRoot } from "../../../bootstrap/state.js";
import { analyzeHookCommand, checkScriptFile } from "../hookCommandAnalysis.js";
import { pathsOverlapForPlatform, anyPairMatches } from "../../settings/stickyRoots.js";
import { verifyOpenedPath } from "../../fsSafety/hardenedRead.js";
import { onUnavailableNoop } from "./hostPaths.js";
import {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
} from "./runServedHook.js";
import { uniq } from "../../collections.js";
import {
  HOOK_NOT_RECORDED_QUESTION,
  hookScriptChangedQuestion,
  HOOK_CHANGED_QUESTION,
  HOOK_UPDATED_NOT_ACCEPTED_QUESTION,
  HOOK_CHANGED_ASKING_PERSON,
  HOOK_CHANGED_ASKS_INSTEAD,
} from "./notices.js";
import { claudeTempDir, tmpdir } from "../../tempDir.js";
import { getPlatform } from "../../platform.js";
import { createCombinedAbortSignal } from "../../combinedAbortSignal.js";
import { shellQuoteArgs } from "../../bash/bashPipeCommand.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:906646-906863 placement
var HOOK_PINS_VERSION; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var hookPinsFileSchema;
deferInit("chunk-e6aww6q8.js:906646", () => {
  HOOK_PINS_VERSION = 1;
  hookPinsFileSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(HOOK_PINS_VERSION),
      project: stringSchema(),
      pins: record(
        stringSchema().regex(/^[0-9a-f]{64}$/),
        discriminatedUnion("kind", [
          objectSchema({
            kind: literal("script"),
            path: stringSchema(),
            sha256: stringSchema().regex(/^[0-9a-f]{64}$/),
          }),
          objectSchema({
            kind: literal("inline"),
          }),
          objectSchema({
            kind: literal("unpinnable"),
          }),
        ]),
      ),
    }),
  );
});
//@ chunk-e6aww6q8.js:906863-906935 placement
function hookPinsPath(projectDir) {
  return join(servedCallsDir(), `hook-pins-${computeContentHash(projectDir).slice(0, 32)}.jsonl`);
}
//@ chunk-e6aww6q8.js:906935-907173 placement
async function readAcceptedHookPins(projectDir) {
  let rawText;
  try {
    rawText = await getFileReader().read(hookPinsPath(projectDir));
  } catch (error) {
    return isENOENT(error) ? undefined : new Map();
  }
  try {
    let parsed = hookPinsFileSchema().safeParse(jsonParseRaw(rawText.trim()));
    return parsed.success && parsed.data.project === projectDir
      ? new Map(Object.entries(parsed.data.pins))
      : new Map();
  } catch {
    return new Map();
  }
}
//@ chunk-e6aww6q8.js:907173-907314 placement
async function writeAcceptedHookPins(projectDir, pins) {
  await getFileReader().mkdir(servedCallsDir(), 448);
  await getFileReader().atomicWrite(
    hookPinsPath(projectDir),
    toJsonLine({
      version: HOOK_PINS_VERSION,
      project: projectDir,
      pins: Object.fromEntries(pins),
    }),
    384,
  );
}
//@ chunk-e6aww6q8.js:907314-907377 placement
/**
 * 项目钩子固定状态的附带临时目录与各类上限（超时、文件大小、标签字符数、重试次数）。
 */
var EXTRA_TMP_DIR = "/var/tmp";
var DEFAULT_PINNED_HOOK_TIMEOUT = 10;
var MAX_PINNED_SCRIPT_BYTES = 2048;
var MAX_SEEN_HOOK_PINS = 256;
var MAX_INLINE_CHECK_LABEL_CHARS = 120;
var MAX_PROJECT_PIN_STRIKES = 3;
var MAX_SET_ASIDE_ASKS = 3;
//@ chunk-e6aww6q8.js:907377-907868 placement
/**
 * 接入时创建项目 hook 固定状态：记录项目命令 hook，失败时记录日志。
 */
function createProjectHookPinsState(projectAttach) {
  if (!isViolinPegOn()) return;
  return {
    pinned: pinProjectCommandHooks(
      projectAttach.projectDir,
      projectAttach.launchDir,
      resolveOptions(projectAttach.envAtAttach),
    ).catch((error) => {
      logForDebugging(
        `[remote-tools] could not record this project's command hooks at attach (${errorMessage(error)}); none is run`,
      );
      return {
        current: new Map(),
        accepted: new Map(),
      };
    }),
    strikes: new Map(),
    stopped: new Set(),
    changedSinceAttach: new Set(),
    setAside: new Set(),
    setAsideAsked: new Map(),
    declinedSetAside: new Set(),
    seen: new Set(),
    shownChanged: new Set(),
    acceptedUpdated: new Set(),
    updatedAsks: new Map(),
    declinedChangedSinceLast: new Set(),
    said: new Set(),
  };
}
//@ chunk-e6aww6q8.js:907868-908202 placement
/**
 * 汇总各设置源的 PreToolUse 命令 hook 并固定其脚本摘要。
 */
async function pinProjectCommandHooks(projectDir, launchDir, home) {
  let flattened = SETTING_SOURCES.flatMap((settingSource) =>
    (getSettingsForSource(settingSource)?.hooks?.PreToolUse ?? []).flatMap((matcherEntry) =>
      matcherEntry.hooks.flatMap((hook) =>
        hook.type === "command"
          ? [
              {
                key: hookPinKey(matcherEntry.matcher ?? "", hook),
                hook,
              },
            ]
          : [],
      ),
    ),
  );
  let results = await Promise.all([projectDir, launchDir].map((dir) => realpath(dir).catch(() => dir)));
  let pins = new Map();
  for (let { key, hook } of flattened) pins.set(key, await pinCommandHook(hook, projectDir, home, results));
  return {
    current: pins,
    accepted: await readAcceptedHookPins(projectDir),
  };
}
//@ chunk-e6aww6q8.js:908202-908576 placement
/**
 * 保存本次会话已见过的 hook 固定项。
 */
async function saveSeenHookPins(reach) {
  let projectHooks = reach.projectHooks;
  if (projectHooks === undefined) return;
  try {
    let { current: currentPins, accepted } = await projectHooks.pinned;
    if (projectHooks.seen.size === 0) return;
    let keysToPin = accepted === undefined ? projectHooks.seen : projectHooks.shownChanged;
    let pins = new Map(accepted);
    for (let key of keysToPin) {
      let pin = currentPins.get(key)?.pin;
      if (pin !== undefined) pins.set(key, pin);
    }
    await writeAcceptedHookPins(reach.projectDir, pins);
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record this project's command hooks for next time (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:908576-908631 placement
function hookPinKey(matcher, hook) {
  return computeContentHash(
    jsonStringify(
      sortKeysDeep({
        matcher,
        hook,
      }),
    ),
  );
}
//@ chunk-e6aww6q8.js:908631-908777 placement
function isSameHookPin(left, right) {
  return (
    (left.kind === "inline" && right.kind === "inline") ||
    (left.kind === "script" &&
      right.kind === "script" &&
      left.sha256 === right.sha256 &&
      foldPathSegments(left.path) === foldPathSegments(right.path))
  );
}
//@ chunk-e6aww6q8.js:908777-908933 placement
function describeHookPin(pin) {
  if (pin === undefined) return "none";
  switch (pin.kind) {
    case "script":
      return truncateToLength(pin.sha256, 12);
    case "inline":
      return "inline";
    case "unpinnable":
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:908933-909023 placement
function openPinnedScript(scriptPath) {
  return open(
    scriptPath,
    constants.O_RDONLY |
      constants.O_NONBLOCK |
      READ_LIMITS |
      (O_NOFOLLOW_FLAG === 0 ? constants.O_NOFOLLOW : O_NOFOLLOW_FLAG),
  );
}
//@ chunk-e6aww6q8.js:909023-909459 placement
/**
 * 为一个项目 PreToolUse 命令钩子计算"固定标识"：无法分析的命令记为 inline；能解析到脚本且脚本在允许目录内、是唯一硬链接的稳定文件时记录路径与 sha256，否则 unpinnable。
 */
async function pinCommandHook(hook, projectDir, home, projectRealPaths) {
  let projectRoot = getProjectConfigRoot() ?? projectDir;
  let analysis = analyzeHookCommand(hook, {
    home,
    projectDir: projectRoot,
    hookCwd: projectRoot,
    defaultShell: "bash",
    shellPrefix: undefined,
  });
  if (analysis.kind === "opaque")
    return {
      pin: {
        kind: "inline",
      },
    };
  let resolvedPath;
  try {
    resolvedPath = await realpath(analysis.resolvedPath);
  } catch {
    return {
      pin: {
        kind: "unpinnable",
      },
    };
  }
  if (!pathsOverlapForPlatform([resolvedPath], projectRealPaths))
    return {
      pin: {
        kind: "unpinnable",
      },
    };
  let hashed = await hashStableScriptFile(resolvedPath);
  return hashed === undefined
    ? {
        pin: {
          kind: "unpinnable",
        },
      }
    : {
        pin: {
          kind: "script",
          path: resolvedPath,
          sha256: hashed.sha256,
        },
        script: {
          bytes: hashed.bytes,
          site: analysis.site,
        },
      };
}
//@ chunk-e6aww6q8.js:909459-909916 placement
/**
 * 对稳定的脚本文件计算哈希：只接受无硬链接的普通文件且目录无符号链接。
 */
async function hashStableScriptFile(
  scriptPath,
  deps = {
    lstat: (targetPath) =>
      lstat(targetPath, {
        bigint: true,
      }),
    open: openPinnedScript,
  },
) {
  try {
    let stats = await deps.lstat(scriptPath);
    if (
      !stats.isFile() ||
      stats.nlink !== 1n ||
      (await realpath(dirname(scriptPath))) !== dirname(scriptPath)
    )
      return;
    let handle = await deps.open(scriptPath);
    let isVerified = false;
    try {
      let stats_2 = await handle.stat({
        bigint: true,
      });
      let verification =
        stats_2.ino === stats.ino && stats_2.dev === stats.dev
          ? await verifyOpenedPath(handle, scriptPath)
          : undefined;
      isVerified = verification?.ok === true && verification.value === true;
    } finally {
      if (!isVerified) await handle.close().catch(() => {});
    }
    if (!isVerified) return;
    let checked = await checkScriptFile(scriptPath, {
      open: async () => handle,
    });
    return checked.ok
      ? {
          sha256: checked.sha256,
          bytes: checked.bytes,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:909916-914278 placement
/**
 * 固定（pin）钩子命令：确定程序与脚本内容，Windows 下无法解析时标记。
 */
async function pinHookCommand(request) {
  let projectHooks = request.reach.projectHooks;
  if (
    !isViolinPegOn() ||
    projectHooks === undefined ||
    !request.fromSettingsFile ||
    request.held === "windows_unparsed"
  )
    return;
  if (request.held === "unreadable") return onUnavailableNoop(request, "unpinnable");
  if ((request.hook.shell ?? "bash") !== "bash") return onUnavailableNoop(request, "shell");
  if (request.shellPrefix !== undefined && request.shellPrefix !== "")
    return onUnavailableNoop(request, "shell_prefix");
  let mapped = request.matcherTexts.map((matcherText) => hookPinKey(matcherText, request.hook));
  if (mapped.some((pinKey) => projectHooks.stopped.has(pinKey))) return onUnavailableNoop(request, "stopped");
  let setAsideMode = isViolinOverstandOn();
  if (setAsideMode && mapped.some((setAsideKey) => projectHooks.setAside.has(setAsideKey))) {
    logServedHookHeld_2(request, "set_aside_after_change", {});
    return {
      hook: request.hook,
      outcome: "success",
    };
  }
  let { hook } = request;
  let reachPath = await request.reach.current();
  let sandboxMode = reachPath.includes("/")
    ? {
        unavailable: "unknown_reach",
      }
    : resolveHookSandboxMode(request.readRules);
  if ("unavailable" in sandboxMode)
    return projectHookUnavailable(request, projectHooks, sandboxMode.unavailable);
  let { mode } = sandboxMode;
  let readableDirs = uniq([
    ...request.readableDirs,
    ...(await Promise.all(
      request.readableDirs.map((readableDir) => realpath(readableDir).catch(() => readableDir)),
    )),
  ]);
  let { current: currentPins, accepted } = await projectHooks.pinned;
  let found = mapped.find((currentKey) => currentPins.has(currentKey));
  let seenPin = found === undefined ? undefined : currentPins.get(found);
  let freshPin =
    seenPin === undefined || (found !== undefined && projectHooks.changedSinceAttach.has(found))
      ? undefined
      : await pinCommandHook(hook, request.reach.projectDir, request.home, readableDirs);
  if (found === undefined || seenPin === undefined) return;
  if (seenPin.pin.kind === "unpinnable") return onUnavailableNoop(request, "unpinnable");
  projectHooks.seen.add(found);
  let pinChanged = freshPin === undefined || !isSameHookPin(seenPin.pin, freshPin.pin);
  if (pinChanged && !setAsideMode) {
    projectHooks.changedSinceAttach.add(found);
    logServedHookHeld_2(request, "held_changed_since_attach", {});
    return {
      hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: HOOK_NOT_RECORDED_QUESTION,
      heldForServedCall: true,
    };
  }
  let effectivePin = pinChanged ? seenPin : freshPin;
  let acceptedPin = accepted?.get(found);
  if (
    accepted !== undefined &&
    (acceptedPin === undefined || !isSameHookPin(acceptedPin, seenPin.pin)) &&
    !(setAsideMode && projectHooks.acceptedUpdated.has(found))
  ) {
    let updatedAsk =
      !setAsideMode || projectHooks.declinedChangedSinceLast.has(found)
        ? undefined
        : (projectHooks.updatedAsks.get(found) ?? {
            question: hookScriptChangedQuestion(describeHookPin(acceptedPin), describeHookPin(seenPin.pin)),
            puts: 0,
          });
    if (updatedAsk !== undefined) projectHooks.updatedAsks.set(found, updatedAsk);
    logServedHookHeld_2(
      request,
      "held_changed_since_last_serve",
      setAsideMode && updatedAsk === undefined
        ? {}
        : {
            key: found,
          },
    );
    let firstChangedNotice = !projectHooks.said.has("changed_note");
    projectHooks.said.add("changed_note");
    return {
      hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: !setAsideMode
        ? HOOK_CHANGED_QUESTION
        : (updatedAsk?.question ?? HOOK_UPDATED_NOT_ACCEPTED_QUESTION),
      heldForServedCall: true,
      ...(firstChangedNotice && {
        additionalContext: setAsideMode ? HOOK_CHANGED_ASKING_PERSON : HOOK_CHANGED_ASKS_INSTEAD,
      }),
    };
  }
  let projectRealDir = await realpath(request.reach.projectDir);
  if (
    (effectivePin.pin.kind === "script" && !pathsOverlapForPlatform([effectivePin.pin.path], readableDirs)) ||
    !pathsOverlapForPlatform([projectRealDir], readableDirs)
  )
    return onUnavailableNoop(request, "outside_readable");
  let sandboxAvailability =
    mode === "linux"
      ? await checkHookSandboxAvailable({
          pathValue: request.environment.extra.PATH ?? EMPTY_PATH_DIR,
          reach: reachPath,
          home: request.home,
          readableDirs: request.readableDirs,
        })
      : undefined;
  if (sandboxAvailability !== undefined && "unavailable" in sandboxAvailability)
    return projectHookUnavailable(request, projectHooks, sandboxAvailability.unavailable);
  let scriptRelPath =
    effectivePin.pin.kind === "script" ? relative(projectRealDir, effectivePin.pin.path) : "";
  let checkLabel =
    scriptRelPath === "" || scriptRelPath.startsWith("..")
      ? "an inline check"
      : truncateToLength(printableText(scriptRelPath), MAX_INLINE_CHECK_LABEL_CHARS);
  let hookEnv = mergeHookEnv(request.environment);
  let allowedRoots = [
    ...reachPath,
    request.home,
    await realpath(request.home).catch(() => request.home),
    claudeTempDir(),
    ...(sandboxAvailability?.homes ?? []),
  ];
  let isOutsideAllowedRoots = (...paths) =>
    anyPairMatches(paths, allowedRoots) ||
    (sandboxAvailability !== undefined &&
      paths.some((candidatePath) =>
        allowedRoots.some((allowedRoot) => isPathWithinNormalizedCase(candidatePath, allowedRoot)),
      ));
  let isLinux = getPlatform() === "linux";
  let tempDirChoice;
  for (let candidateDir of [hookEnv.TMPDIR, tmpdir_2(), ...(isLinux ? [EXTRA_TMP_DIR] : [])]) {
    if (candidateDir === undefined || !isAbsolute(candidateDir)) continue;
    let realCandidateDir = await realpath(candidateDir).catch(() => {
      return;
    });
    if (realCandidateDir !== undefined && !isOutsideAllowedRoots(candidateDir, realCandidateDir)) {
      tempDirChoice = {
        spelled: candidateDir,
        real: realCandidateDir,
      };
      break;
    }
  }
  let privateTmpDir;
  let effectiveHook;
  try {
    if (tempDirChoice === undefined)
      throw Error("no temp directory here lies outside what the session can write");
    privateTmpDir = await realpath(await mkdtemp(join(tempDirChoice.real, "hook-")));
  } catch (error) {
    logForDebugging(`[remote-tools] no private temp directory for a project hook (${errorMessage(error)})`, {
      level: "error",
    });
    return runServedHook(
      request,
      projectHooks,
      found,
      checkLabel,
      mode,
      pinChanged,
      sandboxFallbackAsk(checkLabel, "no_private_tmp", ""),
    );
  }
  let min = Math.min(hook.timeout ?? DEFAULT_PINNED_HOOK_TIMEOUT, DEFAULT_PINNED_HOOK_TIMEOUT);
  let combinedAbortSignal = createCombinedAbortSignal(request.signal, {
    timeoutMs: min * 1000,
  });
  let wrapFailed = false;
  try {
    if (isOutsideAllowedRoots(privateTmpDir))
      return runServedHook(
        request,
        projectHooks,
        found,
        checkLabel,
        mode,
        pinChanged,
        sandboxFallbackAsk(checkLabel, "private_tmp_in_reach", ""),
      );
    if (effectivePin.script === undefined) effectiveHook = hook;
    else {
      let stagedCheckPath = join(
        privateTmpDir,
        basename(scriptRelPath).replace(/[^A-Za-z0-9._-]/g, "_") || "check",
      );
      await writeFile(stagedCheckPath, effectivePin.script.bytes, {
        mode: 320,
        flag: "wx",
      });
      effectiveHook = replaceCommandProgram(hook, effectivePin.script.site, stagedCheckPath);
    }
    let sandboxConfig =
      mode === "linux"
        ? undefined
        : {
            mode,
            config: await buildHookSandboxDevices({
              mode,
              projectRoots: readableDirs,
              home: request.home,
              privateTmp: privateTmpDir,
              tempRoots: [tempDirChoice.spelled, tmpdir_2(), tmpdir()].flatMap((tempRoot) =>
                basename(tempRoot) === "T" ? [tempRoot, dirname(tempRoot)] : [tempRoot],
              ),
            }),
          };
    let match = await request.exec({
      hook: {
        ...effectiveHook,
        timeout: min,
      },
      cwd: request.reach.projectDir,
      base: buildSandboxedHookEnv({
        judged: hookEnv,
        pathValue: request.environment.extra.PATH ?? EMPTY_PATH_DIR,
        home: sandboxAvailability === undefined ? request.home : privateTmpDir,
        privateTmp: privateTmpDir,
      }),
      signal: combinedAbortSignal.signal,
      wrap: async (command) => {
        let wrappedCommand;
        if (sandboxAvailability !== undefined)
          wrappedCommand = wrapLinuxHookCommand(
            command,
            {
              ...sandboxAvailability,
              privateTmp: privateTmpDir,
              cwd: projectRealDir,
            },
            request.readRules,
          );
        else if (sandboxConfig !== undefined)
          wrappedCommand = await wrapProjectHookInSandbox(
            `export TMPDIR=${shellQuoteArgs([privateTmpDir])}; ${command}`,
            sandboxConfig.config,
            combinedAbortSignal.signal,
            request.readRules,
            {
              mode: sandboxConfig.mode,
              commandId: `served-hook:${randomUUID()}`,
            },
          );
        wrapFailed = wrappedCommand === undefined;
        return wrappedCommand;
      },
    });
    if (request.signal?.aborted === true)
      return {
        hook,
        outcome: "cancelled",
      };
    return runServedHook(
      request,
      projectHooks,
      found,
      checkLabel,
      mode,
      pinChanged,
      wrapFailed
        ? sandboxFallbackAsk(checkLabel, combinedAbortSignal.signal.aborted ? "timeout" : "not_wrapped", "")
        : runServedHookProcess(match, checkLabel, pinChanged),
    );
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be run in the sandbox (${errorMessage(error)})`,
      {
        level: "error",
      },
    );
    return runServedHook(
      request,
      projectHooks,
      found,
      checkLabel,
      mode,
      pinChanged,
      sandboxFallbackAsk(checkLabel, "wrap_failed", ""),
    );
  } finally {
    combinedAbortSignal.cleanup();
    await rm_2(privateTmpDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
export {
  pinHookCommand,
  saveSeenHookPins,
  MAX_SEEN_HOOK_PINS,
  MAX_PINNED_SCRIPT_BYTES,
  MAX_SET_ASIDE_ASKS,
  MAX_PROJECT_PIN_STRIKES,
  createProjectHookPinsState,
};
