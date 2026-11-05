/**
 * utils/hooks/deviceHooks/vouching.ts
 *
 * 2.1.316 新增：钩子担保（vouching）判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, resolve, delimiter } from "path";
import {
  createSemaphore,
  realpathWithLinks,
  hookDisplayHost,
  hookWireLabel,
  collectInputPaths,
  filterPathsInRoots,
  getAtPath,
  withTranscriptPath,
} from "./hookInputPaths.js";
import { isMatcherEvent } from "../hookEventSets.js";
import {
  REQUEST_TIMEOUT_MS,
  MAX_LABEL_CHARS,
  permissionDecisionOutput,
  rewritePathInInput,
  isPastDeadline,
  MAX_HOOK_BODY_BYTES,
  isSafeHookInputIds,
  safeLabel,
  isRewritablePath,
  MAX_COLLECTED_PATHS,
  isHookInputTopField,
  isToolResponsePath,
  isPlausibleAbsolutePath,
  NULL_DEVICE,
  MIN_WAIT_BEFORE_ACQUIRE_MS,
  withShellPrefix,
  interpretHookResult,
  EMPTY_FOLDER_HINT,
  MAX_REQUEST_ID_CHARS,
  SENDER_UNVOUCHED_TEXT,
  MAX_HOOKS_PER_EVENT,
  DEVICE_HOOKS_DISCONNECT,
  DEVICE_HOOKS_DEADLINE,
} from "./runDeviceHook.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
import { verifyPinnedScript, replaceCommandProgram } from "../servedHooks/hookSandbox.js";
import { isBlockingHookOutput, isAskOnlyHookOutput } from "../hookSpecificOutput.js";
import { jsonStringify } from "../../slowOperations.js";
import { HookInputUnionSchema } from "../../../entrypoints/sdk/coreSchemas.js";
import { hookMatcherMatches } from "../../hooks.js";
import { PATH_POINTERS_BY_EVENT } from "../hookInputPaths.js";
import { isPathUnderForPlatform, POSIX_SEP_2, isReachableOrSamePath } from "../hookCommandAnalysis.js";
import { getErrnoCode } from "../../errors.js";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../git.js";
import { getPlatform } from "../../platform.js";
import { omitAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { EMPTY_PATH_DIR } from "../hookCommandResolution.js";
import { stripInvisibleChars } from "../../invisibleChars.js";
import { parseDeviceHookId } from "../deviceHookId.js";
import { computeContentHash } from "../../commitAttribution.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { DEVICE_HOOK_DEFAULT_S } from "../deviceHookForwarder.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:22565-45998 placement
/**
 * 为钩子建立担保（vouching）：比对本地钩子与模板摘要、超时、事件，决定能否代用户在设备上执行。
 */
function createHookVouching(deps) {
  let inFlight = new Map();
  let translated = new Map();
  let semaphore = createSemaphore(deps);
  let deadlineIn = (request, entry, receivedAt) => {
    let timeoutMs =
      entry.local.hook.timeout !== undefined && entry.local.hook.timeout > 0
        ? entry.local.hook.timeout * 1000
        : deps.defaultTimeoutMs(isMatcherEvent(entry.local.event) ? entry.local.event : "Stop");
    return (
      (request.deadlineMs ?? 2 * timeoutMs + 2 * REQUEST_TIMEOUT_MS) -
      (deps.now() - receivedAt) -
      REQUEST_TIMEOUT_MS / 2
    );
  };
  let noticed = new Set();
  let lastWarnAt = new Map();
  let { repinned, everInReach, answered, withdrawn } = deps.memory;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let trimOldest = (map) => {
    if (map.size > MAX_LABEL_CHARS) {
      let oldestKey = map.keys().next().value;
      if (oldestKey !== undefined) map.delete(oldestKey);
    }
  };
  let rememberAnswer = (requestId, callbackId, answer) => {
    answered.delete(requestId);
    answered.set(requestId, {
      callbackId,
      answer,
    });
    trimOldest(answered);
  };
  let markWithdrawn = (requestId) => {
    withdrawn.delete(requestId);
    withdrawn.add(requestId);
    trimOldest(withdrawn);
  };
  let noteOnce = (key, line, level) => {
    if (noticed.has(key)) return;
    noticed.add(key);
    deps.onLine(line, level);
  };
  let warnThrottled = (key, line) => {
    let now = deps.now();
    if (now - (lastWarnAt.get(key) ?? Number.NEGATIVE_INFINITY) < 60000) return;
    lastWarnAt.set(key, now);
    deps.onLine(line, "warning");
  };
  let report = (info, startedAt, attestation) =>
    deps.telemetry({
      outcome: info.outcome,
      event: info.event ?? null,
      kind: info.kind ?? null,
      exitClass: info.exitClass ?? null,
      translatedPaths: info.translatedPaths ?? 0,
      replay: info.replay ?? false,
      blocked: info.blocked ?? false,
      staged: info.staged ?? false,
      projectFrame: info.projectFrame ?? false,
      repinned: info.repinned ?? false,
      waitedMs: info.waitedMs ?? 0,
      durationMs: Math.max(0, deps.now() - startedAt),
      attestation,
    });
  let vouchCommand = async (entry, hook, analysis, site, event, state) => {
    let pinnedTarget = entry.local.pinnedTarget;
    let denyOutput = (message) => permissionDecisionOutput(event, site.wire, message);
    if (pinnedTarget === undefined) {
      if (analysis !== null && analysis.kind === "script") {
        let realPath = await realpathWithLinks(analysis.resolvedPath, deps.pin);
        if (realPath === null) {
          noteOnce(
            `unvouched:unjudgeable:${entry.wire.id}`,
            `Not running ${site.local} for the cloud session: its file cannot be found or judged on this machine.`,
            "warning",
          );
          return {
            kind: "refuse",
            answer: denyOutput(`not run \u2014 its file cannot be found or judged on ${state.displayName}`),
            outcome: "pin_unreadable",
          };
        }
        let inReach =
          everInReach.has(entry.wire.id) ||
          anyPairMatches(
            [analysis.resolvedPath, realPath],
            [...state.cloudWritableRoots, ...deps.extraWritableRoots()],
          );
        if (inReach) everInReach.add(entry.wire.id);
        if (inReach && entry.local.cloudOptIn !== true) {
          noteOnce(
            `reach:${entry.wire.id}`,
            `Not running ${site.local} for the cloud session: its file now sits where the session can write on this machine, and it is not marked cloud: "device".`,
            "info",
          );
          return {
            kind: "refuse",
            answer: denyOutput(
              `not run \u2014 its file now sits where the cloud session can write on ${state.displayName} and it is not marked cloud: "device"`,
            ),
            outcome: "in_reach_refused",
          };
        }
        if (inReach) {
          noteOnce(
            `unvouched:in_reach:${entry.wire.id}`,
            `Not running ${site.local} for the cloud session: it could not be pinned when this session started and now sits where the session can write; review the file, then restart claude --cloud to offer it again.`,
            "warning",
          );
          return {
            kind: "refuse",
            answer: denyOutput(
              `not run \u2014 its file could not be pinned on ${state.displayName} and sits where the cloud session can write; review it there`,
            ),
            outcome: "in_reach_refused",
          };
        }
      }
      return {
        kind: "run",
        hook:
          analysis !== null && analysis.kind === "script"
            ? rewritePathInInput(hook, analysis, analysis.resolvedPath)
            : hook,
        staged: null,
        repinned: false,
      };
    }
    let pinnedSha = repinned.get(entry.wire.id) ?? pinnedTarget.sha256;
    let verification = await verifyPinnedScript(
      {
        ...pinnedTarget,
        sha256: pinnedSha,
      },
      deps.pin,
    );
    let inReach =
      everInReach.has(entry.wire.id) ||
      anyPairMatches(
        [
          pinnedTarget.path,
          pinnedTarget.realPath,
          ...(verification.realPath !== undefined ? [verification.realPath] : []),
        ],
        [...state.cloudWritableRoots, ...deps.extraWritableRoots()],
      );
    if (inReach) everInReach.add(entry.wire.id);
    if (inReach && entry.local.cloudOptIn !== true) {
      noteOnce(
        `reach:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: its file now sits where the session can write on this machine, and it is not marked cloud: "device".`,
        "info",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 its file now sits where the cloud session can write on ${state.displayName} and it is not marked cloud: "device"; move it under ~/.claude or mark the entry`,
        ),
        outcome: "in_reach_refused",
      };
    }
    let bytes;
    let sha256 = pinnedSha;
    let repinned_2 = repinned.has(entry.wire.id);
    if (verification.ok) bytes = verification.bytes;
    else if (verification.reason === "changed" && !inReach && state.repinChangedScripts) {
      repinned.set(entry.wire.id, verification.current.sha256);
      repinned_2 = true;
      bytes = verification.current.bytes;
      sha256 = verification.current.sha256;
      noteOnce(
        `repin:${entry.wire.id}:${verification.current.sha256}`,
        `${site.local} changed on this machine since it was registered; the cloud session's runs use the current version.`,
        "info",
      );
    } else if (verification.reason === "changed" && !inReach) {
      let any = state.inventory.forwarded.some(
        (forwarded) =>
          forwarded.wire.event === "PreToolUse" && forwarded.local.pinnedTarget?.path === pinnedTarget.path,
      );
      noteOnce(
        `changed:${pinnedTarget.path}${any ? ":guard" : ""}`,
        `${site.local} changed since it was registered for this cloud session, so it won't run.${any ? " Matching tool calls are blocked." : ""} If you edited it, restart claude --cloud. If not, check the file.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 its file changed on ${state.displayName} since it was registered; it runs again once that machine re-registers it`,
        ),
        outcome: "pin_changed",
      };
    } else if (verification.reason === "changed") {
      noteOnce(
        `pin:changed:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: its file changed while the session could write to it on this machine \u2014 review the file before trusting it again.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 its file changed on ${state.displayName} while the cloud session could write to it; review the file there before trusting it again`,
        ),
        outcome: "pin_refused",
      };
    } else if (verification.reason === "multiply_linked" || verification.reason === "relocated") {
      let why =
        verification.reason === "multiply_linked"
          ? "it now has more than one hard link"
          : "its path now leads to a different file than the one registered";
      noteOnce(
        `pin:${verification.reason}:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: ${why} on this machine \u2014 look at the file; if you re-linked or moved it yourself, relaunch claude --cloud here to register it again.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(`not run \u2014 ${why} on ${state.displayName}; review it there`),
        outcome: "pin_refused",
      };
    } else {
      let replaced = verification.reason.replace("_", " ");
      noteOnce(
        `pin:${verification.reason}:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: the file it runs can no longer be read on this machine (${replaced}).`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 its file on ${state.displayName} can no longer be read (${replaced}); it runs again once that machine re-registers it`,
        ),
        outcome: inReach ? "pin_refused" : "pin_unreadable",
      };
    }
    if (analysis?.kind !== "script" || analysis.resolvedPath !== pinnedTarget.path) {
      noteOnce(
        `pin:parse:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: its command no longer reads as the script that was registered.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 its command on ${state.displayName} no longer names the script that was registered`,
        ),
        outcome: "pin_refused",
      };
    }
    if (!(state.stageVerifiedBytes === "always" || (state.stageVerifiedBytes === "in_reach" && inReach)))
      return {
        kind: "run",
        hook: rewritePathInInput(hook, analysis, pinnedTarget.path),
        staged: null,
        repinned: repinned_2,
      };
    try {
      let staged = await deps.staging.stage(sha256, bytes, basename(pinnedTarget.path));
      return {
        kind: "run",
        hook: replaceCommandProgram(hook, analysis.site, staged.path),
        staged,
        repinned: repinned_2,
      };
    } catch {
      noteOnce(
        `stage:${entry.wire.id}`,
        `Not running ${site.local} for the cloud session: couldn't save a private copy of it.${event === "PreToolUse" ? " Matching tool calls are blocked." : ""} If the cloud session can write your temporary folder, set CLAUDE_CODE_TMPDIR to a folder it can't write to and restart claude --cloud.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: denyOutput(
          `not run \u2014 ${state.displayName} couldn't save a private copy of it. If this session can write the temporary folder on that machine, set CLAUDE_CODE_TMPDIR there to a folder it can't write to and restart claude --cloud.`,
        ),
        outcome: "staging_failed",
      };
    }
  };
  let serve = async (request, state, entry, receivedAt, signal) => {
    let event = entry.local.event;
    if (!isMatcherEvent(event))
      return {
        answer: {},
        telemetry: {
          outcome: "event_mismatch",
        },
      };
    let hook = entry.local.hook;
    if (hook.type !== "command" && hook.type !== "http") {
      let answer = permissionDecisionOutput(
        event,
        `hook on ${state.displayName}`,
        "not run \u2014 it is not a kind of hook that machine can run for a cloud session; retry",
      );
      return {
        answer,
        telemetry: {
          event,
          outcome: "unsupported_kind",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    let baseReport = {
      event,
      kind: hook.type,
    };
    let analysis = hook.type === "command" ? deps.parseTarget(hook) : null;
    let labels = {
      local: hookDisplayHost(hook, analysis),
      wire: hookWireLabel(hook, analysis, state),
    };
    if (isPastDeadline(request)) {
      noteOnce(
        "stale",
        'A hook request from the cloud session arrived already past its deadline (this machine was asleep, offline, or its stream was running behind). A guard answered "retry"; anything else had no opinion.',
        "warning",
      );
      let answer = permissionDecisionOutput(
        event,
        labels.wire,
        `not run \u2014 the request reached ${state.displayName} already past its deadline (that machine was asleep or its stream ran behind); retry`,
      );
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "stale",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    let inputBytes = 0;
    try {
      let json = jsonStringify(request.input);
      inputBytes = typeof json === "string" ? Buffer.byteLength(json, "utf8") : 0;
    } catch {
      inputBytes = 0;
    }
    if (inputBytes > MAX_HOOK_BODY_BYTES) {
      let answer = vouchPreToolUse(entry, state, deps, "too_large");
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "input_too_large",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    let parsed = HookInputUnionSchema().safeParse(request.input);
    if (!parsed.success || !isSafeHookInputIds(parsed.data)) {
      let answer = permissionDecisionOutput(
        event,
        labels.wire,
        `not run \u2014 the event could not be read on ${state.displayName}; retry`,
      );
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "invalid_input",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    if (parsed.data.hook_event_name !== event) {
      let answer = permissionDecisionOutput(
        event,
        labels.wire,
        `not run \u2014 the event does not match the hook it names on ${state.displayName}; retry`,
      );
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "event_name_mismatch",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    if (state.roots === null) {
      let answer = permissionDecisionOutput(
        event,
        labels.wire,
        `not run \u2014 ${state.displayName} does not know this session's directories yet; retry`,
      );
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "no_roots",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    if (!deps.trustAccepted()) {
      let answer = permissionDecisionOutput(
        event,
        labels.wire,
        `not run \u2014 its folder is no longer marked trusted on ${state.displayName}`,
      );
      return {
        answer,
        telemetry: {
          ...baseReport,
          outcome: "untrusted",
          blocked: isBlockingHookOutput(answer),
        },
      };
    }
    let toolAliases = deps.toolAliases?.();
    if (!hookMatcherMatches(parsed.data, entry.local.matcher, toolAliases))
      return {
        answer: {},
        telemetry: {
          ...baseReport,
          outcome: "event_mismatch",
        },
      };
    let translation = PATH_POINTERS_BY_EVENT(
      parsed.data,
      state.roots,
      {
        cloudSessionId: state.cloudSessionId,
      },
      toolAliases,
    );
    let input = translation.input;
    let keys = Object.keys(input.cloud_session.original.paths);
    let translatedPaths = keys.length;
    let launch = {
      dir: state.frame.launchDir,
      real: state.launchDirReal,
    };
    let cwdVerdict = async (cwd) => {
      let isInside = (path) =>
        isPathUnderForPlatform(path, launch.real) || isPathUnderForPlatform(path, launch.dir);
      try {
        return isInside(await deps.pin.realpath(cwd)) ? "inside" : "unjudgeable";
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") return "unjudgeable";
        let realPath = await realpathWithLinks(cwd, deps.pin);
        return realPath !== null && isInside(realPath) ? "missing" : "unjudgeable";
      }
    };
    let verdict = await cwdVerdict(input.cwd);
    if (verdict !== "inside") {
      deps.debug(
        `[deviceHooks] ${safeLabel(request.requestId)}: translated cwd is ${verdict === "missing" ? "not an existing directory" : "not judgeable as a directory inside the launch directory"}; running from the launch directory`,
      );
      input = {
        ...input,
        cwd: launch.dir,
      };
    }
    let inputPaths = collectInputPaths(input, toolAliases);
    let pathPointers = [...keys.filter((pointer) => isRewritablePath(pointer, input)), ...inputPaths];
    let walkedOutside =
      pathPointers.length > MAX_COLLECTED_PATHS
        ? pathPointers
        : await filterPathsInRoots(pathPointers, input, launch, deps.pin);
    let cwdMoved =
      (translation.untranslated.includes("/cwd") || verdict === "unjudgeable") && inputPaths.length > 0;
    let flattened = translation.untranslated.flatMap((pointer) => {
      let atPath = getAtPath(parsed.data, pointer);
      return isHookInputTopField(pointer) &&
        !isToolResponsePath(pointer, parsed.data, toolAliases) &&
        typeof atPath === "string" &&
        isPlausibleAbsolutePath(atPath, state.roots)
        ? [
            {
              pointer,
              value: atPath,
            },
          ]
        : [];
    });
    let classifyUntranslated = async (items) => {
      if (items.length > MAX_COLLECTED_PATHS)
        return {
          waived: [],
          namingFilesHere: items.map((item) => item.pointer),
        };
      let results = await Promise.all(
        items.map(async ({ pointer, value: pathValue }) => {
          let realPath = await realpathWithLinks(pathValue, deps.pin);
          let insideProject =
            realPath !== null &&
            (isPathUnderForPlatform(realPath, launch.real) || isPathUnderForPlatform(realPath, launch.dir));
          let missingHere =
            realPath !== null &&
            !insideProject &&
            (await deps.pin.realpath(pathValue).then(
              () => false,
              (error) => getErrnoCode(error) === "ENOENT",
            ));
          return {
            pointer,
            waived: insideProject || missingHere,
          };
        }),
      );
      return {
        waived: results.filter((result) => result.waived).map((item) => item.pointer),
        namingFilesHere: results.filter((item) => !item.waived).map((item) => item.pointer),
      };
    };
    let judged = await classifyUntranslated(flattened);
    let namingFilesHere = judged.namingFilesHere;
    let waived = state.denyUnjudgeablePaths ? [] : judged.waived;
    let untranslated = [
      ...translation.untranslated.filter(
        (pointer) => isHookInputTopField(pointer) && !waived.includes(pointer),
      ),
      ...(cwdMoved ? ["/cwd"] : []),
      ...walkedOutside,
    ];
    if (untranslated.length > 0) {
      let containerOnly =
        !cwdMoved &&
        walkedOutside.length === 0 &&
        namingFilesHere.length === 0 &&
        pathPointers.length <= MAX_COLLECTED_PATHS &&
        untranslated.every((pointer) =>
          isPlausibleAbsolutePath(getAtPath(parsed.data, pointer), state.roots),
        );
      if (!(containerOnly && state.runWithUntranslatedPaths)) {
        noteOnce(
          `untranslated:${entry.wire.id}:${containerOnly ? "container" : "unjudgeable"}`,
          containerOnly
            ? `Skipped ${labels.local} for the cloud session: the file it would look at exists only in the cloud, not in the synced project on this machine.`
            : `Not running ${labels.local} for the cloud session: the event names a path this machine could not map to its own files.`,
          "info",
        );
        let answer =
          !containerOnly || state.denyUnjudgeablePaths
            ? permissionDecisionOutput(
                event,
                labels.wire,
                containerOnly
                  ? "not run \u2014 the event names a file that exists only in the cloud, so this machine could not judge it"
                  : "not run \u2014 the event names a path this machine could not map to its own files; retry with a plain path inside the project",
              )
            : {};
        return {
          answer,
          telemetry: {
            ...baseReport,
            outcome: "untranslated_skipped",
            translatedPaths,
            blocked: isBlockingHookOutput(answer),
          },
        };
      }
    }
    let input_2 = withTranscriptPath(input, await deps.emptyTranscriptPath().catch(() => NULL_DEVICE));
    if (hook.if) {
      let condition;
      try {
        condition = await deps.evaluateCondition(hook.if, input_2);
      } catch {
        condition = null;
      }
      if (condition === null) {
        let answer = permissionDecisionOutput(
          event,
          labels.wire,
          "not run \u2014 its condition could not be evaluated on this machine; retry",
        );
        return {
          answer,
          telemetry: {
            ...baseReport,
            outcome: "condition_error",
            translatedPaths,
            blocked: isBlockingHookOutput(answer),
          },
        };
      }
      if (!condition)
        return {
          answer: {},
          telemetry: {
            ...baseReport,
            outcome: "condition_false",
            translatedPaths,
          },
        };
    }
    let vouched =
      hook.type === "command"
        ? await vouchCommand(entry, hook, analysis, labels, event, state)
        : {
            kind: "run",
            hook,
            staged: null,
            repinned: false,
          };
    if (vouched.kind === "refuse")
      return {
        answer: vouched.answer,
        telemetry: {
          ...baseReport,
          outcome: vouched.outcome,
          translatedPaths,
          blocked: isBlockingHookOutput(vouched.answer),
        },
      };
    let runDir = null;
    try {
      if (signal.aborted)
        return {
          answer: null,
          telemetry: {
            ...baseReport,
            outcome: "cancelled",
          },
        };
      let hookTimeoutMs =
        hook.timeout !== undefined && hook.timeout > 0 ? hook.timeout * 1000 : deps.defaultTimeoutMs(event);
      let remainingMs = () =>
        request.deadlineMs !== undefined
          ? request.deadlineMs - (deps.now() - receivedAt) - REQUEST_TIMEOUT_MS
          : hookTimeoutMs;
      let budget = remainingMs();
      let waitStart = deps.now();
      let releaseSlot = await semaphore.acquire(budget, signal);
      let waitedMs = Math.max(0, deps.now() - waitStart);
      let tooLate = releaseSlot !== null && remainingMs() < MIN_WAIT_BEFORE_ACQUIRE_MS;
      if (tooLate && releaseSlot !== null) {
        releaseSlot();
        releaseSlot = null;
      }
      if (releaseSlot === null) {
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...baseReport,
              outcome: "cancelled",
              waitedMs,
            },
          };
        if (!tooLate && deps.now() - NEGATIVE_INFINITY >= 60000) {
          NEGATIVE_INFINITY = deps.now();
          deps.onLine(
            'The cloud session is asking for more hooks at once than this machine can run in time; some were answered "retry" (guards) or with no opinion.',
            "warning",
          );
        }
        let answer = permissionDecisionOutput(
          event,
          labels.wire,
          tooLate
            ? `not run \u2014 too little time was left before the cloud session stops waiting for ${state.displayName}; retry`
            : `not run \u2014 ${state.displayName} is running too many hooks for the cloud session at once; retry`,
        );
        return {
          answer,
          telemetry: {
            ...baseReport,
            outcome: tooLate ? "too_late" : "no_slot",
            translatedPaths,
            blocked: isBlockingHookOutput(answer),
            waitedMs,
          },
        };
      }
      let release = releaseSlot;
      try {
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...baseReport,
              outcome: "cancelled",
              waitedMs,
            },
          };
        let cwdVerdict_2 = input_2.cwd === launch.dir ? "inside" : await cwdVerdict(input_2.cwd);
        let runInput = input_2;
        if (cwdVerdict_2 !== "inside")
          runInput = {
            ...input_2,
            cwd: launch.dir,
          };
        let movedOutside =
          (cwdVerdict_2 === "unjudgeable" && inputPaths.length > 0) ||
          (pathPointers.length <= MAX_COLLECTED_PATHS &&
            (await filterPathsInRoots(pathPointers, runInput, launch, deps.pin)).length > 0);
        let namingHere =
          !movedOutside &&
          flattened.length > 0 &&
          (await classifyUntranslated(flattened)).namingFilesHere.length > 0;
        if (movedOutside || namingHere) {
          let answer = permissionDecisionOutput(
            event,
            labels.wire,
            `not run \u2014 a path the event names moved outside the project on ${state.displayName} while it waited; retry`,
          );
          return {
            answer,
            telemetry: {
              ...baseReport,
              outcome: "untranslated_skipped",
              translatedPaths,
              blocked: isBlockingHookOutput(answer),
              waitedMs,
            },
          };
        }
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...baseReport,
              outcome: "cancelled",
              waitedMs,
            },
          };
        let min = Math.min(hookTimeoutMs, remainingMs());
        if (remainingMs() < MIN_WAIT_BEFORE_ACQUIRE_MS) {
          let answer = permissionDecisionOutput(
            event,
            labels.wire,
            `not run \u2014 too little time was left before the cloud session stops waiting for ${state.displayName}; retry`,
          );
          return {
            answer,
            telemetry: {
              ...baseReport,
              outcome: "too_late",
              translatedPaths,
              blocked: isBlockingHookOutput(answer),
              waitedMs,
            },
          };
        }
        let hostEnv = deps.hostEnv();
        let reachInputs = [
          state.frame.launchDir,
          state.launchDirReal,
          ...state.cloudWritableRoots,
          ...deps.extraWritableRoots(),
        ];
        let isBadRoot = (path) => path !== POSIX_SEP_2 && !isAbsolutePlatformPath(path);
        let reachRoots =
          getPlatform() === "windows" && reachInputs.some(isBadRoot)
            ? [POSIX_SEP_2]
            : reachInputs
                .filter((path) => !isBadRoot(path))
                .map((path) => (path === POSIX_SEP_2 ? path : normalizeCommandForPlatform(resolve(path))));
        let childEnv = await deps.childEnvironment(reachRoots, hostEnv);
        let isInReach = (candidate) =>
          reachRoots.some((root) =>
            isReachableOrSamePath(normalizeCommandForPlatform(resolve(candidate)), root),
          ) ||
          (getPlatform() === "windows" && anyPathMatches(candidate, reachRoots));
        let prefixWords = tokenizeCommandLine(hostEnv.CLAUDE_CODE_SHELL_PREFIX ?? "", {
          home: hostEnv.HOME,
          launchDir: state.frame.launchDir,
        });
        let results = await Promise.all(
          prefixWords.map((word) =>
            deps
              .placePath(word)
              .then((placed) =>
                placed === "unreadable" ? UNPLACEABLE_MARKER : placed === "absent" ? word : placed,
              ),
          ),
        );
        let envScrubbed =
          (results.includes(UNPLACEABLE_MARKER) || [...prefixWords, ...results].some(isInReach)) &&
          !childEnv.omit.includes("CLAUDE_CODE_SHELL_PREFIX")
            ? {
                ...childEnv,
                omit: [...childEnv.omit, "CLAUDE_CODE_SHELL_PREFIX"],
                extra: omitAlias(childEnv.extra, "CLAUDE_CODE_SHELL_PREFIX"),
              }
            : childEnv;
        if (
          hostEnv.CLAUDE_CODE_SHELL_PREFIX?.trim() &&
          vouched.hook.type === "command" &&
          vouched.hook.args === undefined &&
          withShellPrefix(envScrubbed) === undefined
        )
          noteOnce(
            "prefix-unwrapped",
            'Hooks marked cloud: "device" run for the cloud session WITHOUT your CLAUDE_CODE_SHELL_PREFIX here: this machine cannot vouch for that wrapper (it is not an absolute path outside what the session can write).',
            "warning",
          );
        let PATH = envScrubbed.extra.PATH;
        let runEnv =
          PATH === undefined || PATH === ""
            ? {
                ...envScrubbed,
                extra: {
                  ...envScrubbed.extra,
                  PATH: EMPTY_PATH_DIR,
                },
              }
            : envScrubbed;
        let keptPathEntries = new Set((runEnv.extra.PATH ?? "").split(delimiter));
        let filtered = (hostEnv.PATH ?? "")
          .split(delimiter)
          .filter((entry) => entry !== "" && !keptPathEntries.has(entry));
        if (runEnv.omit.length > 0)
          deps.debug(
            `[deviceHooks] ${safeLabel(request.requestId)}: not passing on ${runEnv.omit.join(", ")}`,
          );
        if (filtered.length > 0)
          noteOnce(
            "search-path-trimmed",
            `Hooks the cloud session forwards here run without ${filtered.length} PATH entr${filtered.length === 1 ? "y" : "ies"} the session can write to or that cannot be resolved on this machine (${filtered
              .slice(0, 3)
              .map((entry) => stripInvisibleChars(entry))
              .join(
                ", ",
              )}${filtered.length > 3 ? ", \u2026" : ""}); a tool installed only there is "not found" for them.`,
            "debug",
          );
        let interpreter =
          analysis?.kind === "script" && analysis.interpreter !== null ? analysis.interpreter : undefined;
        let program =
          vouched.hook.type !== "command"
            ? undefined
            : vouched.hook.args !== undefined
              ? vouched.hook.command.includes("/")
                ? undefined
                : vouched.hook.command
              : interpreter;
        if (program !== undefined) {
          if ((await deps.resolveProgram(program, runEnv.extra.PATH ?? "", reachRoots)) === "in_reach") {
            noteOnce(
              `program:${program}`,
              `Not running hooks through ${program} for the cloud session: on this machine that name leads to a file the session can write.`,
              "warning",
            );
            let answer = permissionDecisionOutput(
              event,
              labels.wire,
              `not run \u2014 ${program === interpreter ? program : "its program"} on ${state.displayName} leads to a file the cloud session can write`,
            );
            return {
              answer,
              telemetry: {
                ...baseReport,
                outcome: "in_reach_refused",
                translatedPaths,
                blocked: isBlockingHookOutput(answer),
                waitedMs,
              },
            };
          }
        }
        if (
          vouched.hook.type === "command" &&
          entry.local.cloudOptIn !== true &&
          state.unmarkedStartFolder === "private"
        ) {
          runDir = await deps.staging.runDirectory().catch(() => null);
          if (runDir === null) {
            noteOnce(
              `run-folder:${entry.wire.id}`,
              `Not running ${labels.local} for the cloud session: this machine has no private folder to start it in.`,
              "warning",
            );
            let answer = permissionDecisionOutput(
              event,
              labels.wire,
              `not run \u2014 ${state.displayName} has no private folder to start it in`,
            );
            return {
              answer,
              telemetry: {
                ...baseReport,
                outcome: "staging_failed",
                translatedPaths,
                blocked: isBlockingHookOutput(answer),
                waitedMs,
              },
            };
          }
        }
        let runStart = deps.now();
        let runResult = await deps.run(
          {
            hook: vouched.hook,
            event,
            input: runInput,
            timeoutMs: min,
            env: runEnv,
            ...(runDir !== null && {
              startDirectory: runDir.path,
            }),
          },
          state.frame,
          signal,
        );
        let timedOut = runResult.aborted === true && !signal.aborted;
        let interpreted =
          timedOut && min < hookTimeoutMs
            ? {
                answer: permissionDecisionOutput(
                  event,
                  labels.wire,
                  `not run to completion \u2014 too little time was left before the cloud session stops waiting for ${state.displayName}; retry`,
                ),
                exitClass: "timeout",
                blocked: event === "PreToolUse",
                localWarning: undefined,
              }
            : interpretHookResult(runResult, {
                event,
                label: labels.wire,
                localLabel: labels.local,
                timedOut,
                timeoutMs: min,
                timeoutFailsClosed: state.timeoutFailsClosed,
              });
        let elapsedMs = deps.now() - runStart;
        if (interpreted.localWarning !== undefined)
          warnThrottled(
            `${entry.wire.id}:${interpreted.exitClass}`,
            `cloud \u25B8 ${event} \u25B8 ${interpreted.localWarning}${runDir !== null && interpreted.exitClass === "other" ? ` \xB7 ${EMPTY_FOLDER_HINT}` : ""}`,
          );
        else if (interpreted.answer !== null && interpreted.blocked)
          deps.onLine(
            `cloud \u25B8 ${event}${formatToolNameSuffix(input_2)} \u25B8 ${labels.local} \u25B8 ${isAskOnlyHookOutput(interpreted.answer) ? "asked" : "blocked"} (${elapsedMs} ms)`,
            "info",
          );
        else if (interpreted.answer !== null && hasVouchedContext(interpreted.answer))
          deps.onLine(
            `cloud \u25B8 ${event}${formatToolNameSuffix(input_2)} \u25B8 ${labels.local} \u25B8 added context (${elapsedMs} ms)`,
            "debug",
          );
        return {
          answer: interpreted.answer,
          telemetry: {
            ...baseReport,
            outcome:
              interpreted.answer === null
                ? "cancelled"
                : interpreted.exitClass === "spawn_failed" ||
                    (interpreted.exitClass === "other" && interpreted.localWarning !== undefined)
                  ? "run_error"
                  : "answered",
            exitClass: interpreted.exitClass,
            translatedPaths,
            blocked: interpreted.blocked,
            staged: vouched.staged !== null,
            projectFrame: vouched.hook.type === "command" && runDir === null,
            repinned: vouched.repinned,
            waitedMs,
          },
        };
      } finally {
        release();
      }
    } finally {
      await Promise.all([vouched.staged?.release(), runDir?.release()]);
    }
  };
  return {
    async serve(request, state) {
      let startedAt = deps.now();
      if (state === null)
        return {
          kind: "silent",
          reason: "no_state",
        };
      if (
        request.requestId.length > MAX_REQUEST_ID_CHARS ||
        request.callbackId.length > MAX_REQUEST_ID_CHARS
      ) {
        report(
          {
            outcome: "not_mine",
          },
          startedAt,
          undefined,
        );
        return {
          kind: "silent",
          reason: "not_mine",
        };
      }
      let deviceHookId = parseDeviceHookId(request.callbackId);
      let instanceId = deviceHookId?.instanceId;
      let retired = instanceId !== undefined && state.retiredInstanceIds.has(instanceId);
      if (!retired && instanceId !== state.instanceId) {
        report(
          {
            outcome: "not_mine",
          },
          startedAt,
          undefined,
        );
        return {
          kind: "silent",
          reason: "not_mine",
        };
      }
      let verdict = deps.judgeSender(request.attestationStatus);
      let report_2 = (info, startedAt) => report(info, startedAt, verdict?.attestation);
      if (verdict?.heldBack === true) {
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: held back for its sender (attestation ${verdict.attestation.status}) \u2014 no opinion, nothing run`,
        );
        noteOnce("unattested", SENDER_UNVOUCHED_TEXT, "warning");
        report_2(
          {
            outcome: "unattested",
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer: {},
        };
      }
      if (deps.isMuted?.() === true) {
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: serving is switched off (emergency switch) \u2014 no opinion`,
        );
        report_2(
          {
            outcome: "muted",
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer: {},
        };
      }
      if (withdrawn.has(request.requestId)) {
        deps.debug(`[deviceHooks] ${safeLabel(request.requestId)}: withdrawn earlier \u2014 staying silent`);
        report_2(
          {
            outcome: "withdrawn_replay",
            replay: true,
          },
          startedAt,
        );
        return {
          kind: "silent",
          reason: "withdrawn",
        };
      }
      let previous = answered.get(request.requestId);
      if (previous !== undefined && previous.callbackId === request.callbackId) {
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: replay \u2014 resending the earlier answer`,
        );
        report_2(
          {
            outcome: "cached",
            replay: true,
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer: previous.answer,
        };
      }
      if (previous !== undefined) {
        let answer = permissionDecisionOutput(
          deviceHookId?.event === "PreToolUse" ? "PreToolUse" : "Stop",
          `hook on ${state.displayName}`,
          "not run \u2014 its request id was already used for another hook; retry",
        );
        report_2(
          {
            outcome: "replay_mismatch",
            blocked: isBlockingHookOutput(answer),
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer,
        };
      }
      if (inFlight.has(request.requestId))
        return {
          kind: "silent",
          reason: "running",
        };
      let entry = retired
        ? undefined
        : state.inventory.forwarded.find((forwarded) => forwarded.wire.id === request.callbackId);
      if (entry === undefined) {
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: ${retired ? "retired instance" : "not in the current inventory"} \u2014 ${deviceHookId?.event === "PreToolUse" ? "holding the guard" : "no opinion"}`,
        );
        let answer = permissionDecisionOutput(
          deviceHookId?.event === "PreToolUse" ? "PreToolUse" : "Stop",
          `hook on ${state.displayName}`,
          "not run \u2014 it belongs to a registration that machine has since replaced; retry",
        );
        report_2(
          {
            outcome: "unknown_id",
            blocked: isBlockingHookOutput(answer),
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer,
        };
      }
      if (inFlight.size >= MAX_HOOKS_PER_EVENT) {
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: too many requests in hand \u2014 refusing`,
        );
        let answer = vouchPreToolUse(entry, state, deps);
        report_2(
          {
            outcome: "overloaded",
            blocked: isBlockingHookOutput(answer),
          },
          startedAt,
        );
        return {
          kind: "answer",
          answer,
        };
      }
      let dedupeKey = vouchedOutput(entry, request.input, deps.defaultShell());
      let previous_2 = dedupeKey === null ? undefined : translated.get(dedupeKey.key);
      if (previous_2 !== undefined && previous_2.requestId !== request.requestId) {
        let abortController = new AbortController();
        inFlight.set(request.requestId, abortController);
        let answer = null;
        try {
          answer = await new Promise((resolve) => {
            let timer = deps.setTimer(
              () => resolve("too_late"),
              Math.max(0, deadlineIn(request, entry, startedAt)),
            );
            abortController.signal.addEventListener(
              "abort",
              () => {
                timer.clear();
                resolve(null);
              },
              {
                once: true,
              },
            );
            previous_2.answer.then((answer) => {
              timer.clear();
              resolve(answer);
            });
          });
        } finally {
          inFlight.delete(request.requestId);
        }
        if (abortController.signal.aborted) {
          if (abortController.signal.reason !== DEVICE_HOOKS_DISCONNECT) markWithdrawn(request.requestId);
          report_2(
            {
              outcome: "cancelled",
              blocked: false,
            },
            startedAt,
          );
          return {
            kind: "silent",
            reason: "cancelled",
          };
        }
        if (answer === "too_late") {
          let answer = permissionDecisionOutput(
            isMatcherEvent(entry.local.event) ? entry.local.event : "Stop",
            `hook on ${state.displayName}`,
            `not run \u2014 ${state.displayName} could not decide it before the cloud session stops waiting; retry`,
          );
          rememberAnswer(request.requestId, request.callbackId, answer);
          report_2(
            {
              outcome: "too_late",
              blocked: isBlockingHookOutput(answer),
            },
            startedAt,
          );
          return {
            kind: "answer",
            answer,
          };
        }
        if (answer !== null) {
          rememberAnswer(request.requestId, request.callbackId, answer);
          deps.debug(
            `[deviceHooks] ${safeLabel(request.requestId)}: the same hook and invocation as ${safeLabel(previous_2.requestId)} \u2014 answered from its run`,
          );
          report_2(
            {
              outcome: "same_invocation",
              blocked: isBlockingHookOutput(answer),
            },
            startedAt,
          );
          return {
            kind: "answer",
            answer,
          };
        }
      }
      let resolveShared = () => {};
      if (dedupeKey !== null) {
        let answer = new Promise((resolve) => {
          resolveShared = resolve;
        });
        translated.delete(dedupeKey.key);
        translated.set(dedupeKey.key, {
          requestId: request.requestId,
          answer,
        });
        trimOldest(translated);
      }
      let sharedAnswer = null;
      let abortController = new AbortController();
      inFlight.set(request.requestId, abortController);
      let settled = false;
      let decision = serve(request, state, entry, startedAt, abortController.signal).catch((error) => {
        deps.logError(error);
        let answer = permissionDecisionOutput(
          isMatcherEvent(entry.local.event) ? entry.local.event : "Stop",
          `hook on ${state.displayName}`,
          "not run \u2014 an internal error while deciding it; retry",
        );
        return {
          answer,
          telemetry: {
            outcome: "decide_error",
            blocked: isBlockingHookOutput(answer),
          },
        };
      });
      decision.finally(() => {
        settled = true;
      });
      try {
        let { answer, telemetry } = await new Promise((resolve) => {
          let budget = deadlineIn(request, entry, startedAt);
          let timer = deps.setTimer(
            () => {
              if (abortController.signal.aborted) {
                resolve({
                  answer: null,
                  telemetry: {
                    outcome: "cancelled",
                    blocked: false,
                  },
                });
                return;
              }
              abortController.abort(DEVICE_HOOKS_DEADLINE);
              let answer = permissionDecisionOutput(
                isMatcherEvent(entry.local.event) ? entry.local.event : "Stop",
                `hook on ${state.displayName}`,
                `not run \u2014 ${state.displayName} could not decide it before the cloud session stops waiting; retry`,
              );
              resolve({
                answer,
                telemetry: {
                  outcome: "too_late",
                  blocked: isBlockingHookOutput(answer),
                },
              });
            },
            Math.max(0, budget),
          );
          decision.then((decided) => {
            timer.clear();
            resolve(decided);
          });
        });
        if (
          abortController.signal.reason !== DEVICE_HOOKS_DEADLINE &&
          (answer === null || abortController.signal.aborted)
        ) {
          if (abortController.signal.reason !== DEVICE_HOOKS_DISCONNECT) markWithdrawn(request.requestId);
          else if (answer !== null) rememberAnswer(request.requestId, request.callbackId, answer);
          deps.debug(
            `[deviceHooks] ${safeLabel(request.requestId)}: ${entry.wire.id} withdrawn \u2014 nothing sent`,
          );
          report_2(
            {
              ...telemetry,
              outcome: "cancelled",
            },
            startedAt,
          );
          return {
            kind: "silent",
            reason: "cancelled",
          };
        }
        let answer_2 = answer ?? {};
        sharedAnswer = answer_2;
        rememberAnswer(request.requestId, request.callbackId, answer_2);
        deps.debug(
          `[deviceHooks] ${safeLabel(request.requestId)}: ${entry.wire.id} \u2192 ${telemetry.outcome}`,
        );
        report_2(telemetry, startedAt);
        return {
          kind: "answer",
          answer: answer_2,
        };
      } finally {
        resolveShared(sharedAnswer);
        if (dedupeKey !== null && translated.get(dedupeKey.key)?.requestId === request.requestId)
          translated.delete(dedupeKey.key);
        if (settled) inFlight.delete(request.requestId);
        else decision.finally(() => inFlight.delete(request.requestId));
      }
    },
    cancel(requestId, origin = "worker") {
      let controller = inFlight.get(requestId);
      if (controller === undefined) return false;
      if (origin === "worker") {
        markWithdrawn(requestId);
        controller.abort();
      } else controller.abort(DEVICE_HOOKS_DISCONNECT);
      return true;
    },
    cancelAll() {
      let size = inFlight.size;
      for (let controller of inFlight.values()) controller.abort(DEVICE_HOOKS_DISCONNECT);
      semaphore.refuseAll();
      return size;
    },
    inFlight: () => inFlight.size,
  };
}
//@ chunk-4z1ntdgk.js:45998-46415 placement
function vouchedOutput(entry, input, defaultShell) {
  if (typeof input !== "object" || input === null) return null;
  let hook = entry.local.hook;
  let hookKey =
    hook.type === "command"
      ? `command\x00${hook.shell ?? defaultShell}\x00${hook.command}\x00${jsonStringify(hook.args ?? null)}\x00${hook.if ?? ""}`
      : hook.type === "http"
        ? `http\x00${hook.url}\x00${hook.if ?? ""}`
        : null;
  if (hookKey === null) return null;
  let invocationKey =
    "tool_use_id" in input && typeof input.tool_use_id === "string"
      ? `tool\x00${input.tool_use_id}`
      : `input\x00${computeContentHash(jsonStringify(input))}`;
  return {
    key: `${entry.local.event}\x00${invocationKey}\x00${hookKey}`,
  };
}
//@ chunk-4z1ntdgk.js:46415-46852 placement
function vouchPreToolUse(entry, state, deps, reason = "in_hand") {
  let hook = entry.local.hook;
  if (entry.local.event !== "PreToolUse" || (hook.type !== "command" && hook.type !== "http")) return {};
  let analysis = null;
  try {
    analysis = hook.type === "command" ? deps.parseTarget(hook) : null;
  } catch {}
  return permissionDecisionOutput(
    "PreToolUse",
    hookWireLabel(hook, analysis, state),
    reason === "too_large"
      ? `not run \u2014 the event was too large to judge on ${state.displayName}; retry with less`
      : `not run \u2014 ${state.displayName} has too many hook requests from the cloud session in hand at once; retry`,
  );
}
//@ chunk-4z1ntdgk.js:46852-46963 placement (2.1.88 match: isToolReferenceWithName, 0.847)
function formatToolNameSuffix(obj) {
  return "tool_name" in obj && typeof obj.tool_name === "string"
    ? `:${sanitizeDisplayText(obj.tool_name, {
        maxCodeUnits: 48,
      })}`
    : "";
}
//@ chunk-4z1ntdgk.js:46963-47135 placement
function hasVouchedContext(answer) {
  if (isBlockingHookOutput(answer) || "async" in answer) return false;
  let hookSpecificOutput = answer.hookSpecificOutput;
  return (
    answer.systemMessage !== undefined ||
    (hookSpecificOutput !== undefined &&
      "additionalContext" in hookSpecificOutput &&
      hookSpecificOutput.additionalContext !== undefined)
  );
}
//@ chunk-4z1ntdgk.js:47135-47169 placement
function deviceHookTimeoutMs(event) {
  return DEVICE_HOOK_DEFAULT_S[event] * 1000;
}
//@ chunk-4z1ntdgk.js:47169-47327 placement
var PATH_LIKE_ENV_RE =
  /^(?:PATH|CDPATH|PYTHONPATH|PYTHONHOME|NODE_PATH|RUBYLIB|PERL5LIB|PERLLIB|GEM_PATH|GEM_HOME|CLASSPATH|LD_LIBRARY_PATH|DYLD_\w+)$/;
var UNPLACEABLE_MARKER = "\x00unplaceable";
//@ chunk-4z1ntdgk.js:47327-48788 placement
function tokenizeCommandLine(commandLine, { home, launchDir }) {
  let words = [];
  let raw = "";
  let text = "";
  let quote = null;
  let flush = () => {
    if (raw !== "")
      words.push({
        raw,
        text,
      });
    raw = "";
    text = "";
  };
  for (let char of commandLine.trim())
    if (quote !== null) {
      raw += char;
      if (char === quote) quote = null;
      else text += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      raw += char;
    } else if (char === " " || char === "\t") flush();
    else {
      raw += char;
      text += char;
    }
  flush();
  let isWindows = getPlatform() === "windows";
  let hasSlash = (value) => (isWindows ? /[\\/]/.test(value) : value.includes("/"));
  let isAbsolute = (value) => (isWindows ? /^(?:[A-Za-z]:[\\/]|[\\/])/.test(value) : value.startsWith("/"));
  let isDriveRelative = (value) => isWindows && /^[A-Za-z]:(?![\\/])/.test(value);
  return words.flatMap(({ raw, text }) => {
    if (isWindows && raw.replace(/'[^']*'|"[^"]*"/g, "").includes("\\")) return [launchDir];
    let replaced = text.replace(/^\$(?:HOME\b|\{HOME\})/, "");
    let replaced_2 = raw.replace(/'[^']*'/g, "").replace(/^"?\$\{HOME\}/, "");
    if (/[`$;|&<>]/.test(replaced) || /[*?[{]/.test(replaced_2)) return [launchDir];
    let match = text.match(/^(--?[\w-]+|[A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      let value = match[2];
      let matches = PATH_LIKE_ENV_RE.test(isWindows ? match[1].toUpperCase() : match[1]);
      let pathLikeEnv = isDriveRelative(value)
        ? [launchDir]
        : isAbsolute(value)
          ? [value]
          : hasSlash(value)
            ? [`${launchDir}/${value}`]
            : [];
      let flattened = (
        isWindows && !matches
          ? value.split(":").reduce((acc, part) => {
              let last = acc.at(-1);
              if (last !== undefined && /^[A-Za-z]$/.test(last)) acc[acc.length - 1] = `${last}:${part}`;
              else acc.push(part);
              return acc;
            }, [])
          : value.split(":")
      ).flatMap((entry) =>
        entry === ""
          ? matches || value.includes(":")
            ? [launchDir]
            : []
          : isDriveRelative(entry)
            ? [launchDir]
            : isAbsolute(entry)
              ? [entry]
              : hasSlash(entry) || matches || entry === "." || entry === ".."
                ? [`${launchDir}/${entry}`]
                : [],
      );
      return normalizeCaseForComparison_2([...pathLikeEnv, ...flattened]);
    }
    let text_2 = text;
    if (home !== undefined && home !== "") {
      if (raw === "~" || raw.startsWith("~/")) text_2 = home + text.slice(1);
      else if (/^"?\$\{HOME\}(?=[/"]|$)/.test(raw) && (text === "${HOME}" || text.startsWith("${HOME}/")))
        text_2 = home + text.slice(7);
      else if (/^"?\$HOME(?=[/"]|$)/.test(raw) && (text === "$HOME" || text.startsWith("$HOME/")))
        text_2 = home + text.slice(5);
    }
    if (isDriveRelative(text_2)) return [launchDir];
    if (isAbsolute(text_2)) return [text_2];
    return hasSlash(text_2) ? [`${launchDir}/${text_2}`] : [];
  });
}
//@ chunk-4z1ntdgk.js:48788-48838 placement
function anyPathMatches(commandLine, roots) {
  return roots.some((root) => isReachableOrSamePath(normalizeCommandForPlatform(commandLine), root));
}
//@ chunk-4z1ntdgk.js:48898-50479 placement
/**
 * 命令包装器名单（env/nice/timeout/sudo/xargs 等），以及各包装器的带值选项与可超时包装器集合。
 */
var COMMAND_WRAPPERS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMMAND_WRAPPERS;
var WRAPPER_VALUE_OPTIONS;
var WRAPPERS_WITH_TIMEOUT;
deferInit("chunk-4z1ntdgk.js:48898", () => {
  COMMAND_WRAPPERS_2 = new Set([
    "env",
    "nice",
    "nohup",
    "exec",
    "time",
    "caffeinate",
    "builtin",
    "command",
    "xargs",
    "sudo",
    "doas",
    "runuser",
    "coproc",
    "timeout",
    "gtimeout",
    "flock",
    "arch",
    "setsid",
    "stdbuf",
    "unbuffer",
    "chronic",
    "busybox",
    "strace",
    "ltrace",
    "entr",
  ]);
  COMMAND_WRAPPERS = new Set(["-w", "--wait", "--timeout", "-E", "--conflict-exit-code"]);
  WRAPPER_VALUE_OPTIONS = {
    nice: new Set(["-n", "--adjustment"]),
    timeout: new Set(["-s", "--signal", "-k", "--kill-after"]),
    gtimeout: new Set(["-s", "--signal", "-k", "--kill-after"]),
    sudo: new Set([
      "-u",
      "-g",
      "-C",
      "-D",
      "-h",
      "-p",
      "-R",
      "-T",
      "-U",
      "--user",
      "--group",
      "--host",
      "--prompt",
      "--close-from",
      "--chdir",
      "--role",
      "--type",
      "--other-user",
    ]),
    doas: new Set(["-u", "-C"]),
    runuser: new Set([
      "-u",
      "-g",
      "-G",
      "--user",
      "--group",
      "--supp-group",
      "-w",
      "--whitelist-environment",
    ]),
    xargs: new Set([
      "-n",
      "-P",
      "-I",
      "-L",
      "-s",
      "-d",
      "-E",
      "-a",
      "--arg-file",
      "--max-args",
      "--max-procs",
      "--delimiter",
    ]),
    env: new Set(["-u", "-C", "-P", "--unset", "--chdir"]),
    caffeinate: new Set(["-t", "-w"]),
    exec: new Set(["-a"]),
    flock: new Set([...COMMAND_WRAPPERS, "-c", "--command"]),
    arch: new Set(["-arch", "-e", "-d"]),
    stdbuf: new Set(["-i", "-o", "-e", "--input", "--output", "--error"]),
    strace: new Set(["-e", "-o", "-p", "-s", "-P", "-E", "-u", "-a", "-X"]),
    ltrace: new Set(["-e", "-o", "-p", "-s", "-n", "-u", "-a", "-F"]),
    ionice: new Set(["-c", "--class", "-n", "--classdata", "-p", "--pid", "-P", "--pgid", "-u", "--uid"]),
    chrt: new Set(["-T", "--sched-runtime", "-P", "--sched-period", "-D", "--sched-deadline"]),
    "xvfb-run": new Set([
      "-n",
      "--server-num",
      "-s",
      "--server-args",
      "-f",
      "--auth-file",
      "-e",
      "--error-file",
      "-w",
      "--wait",
      "-p",
      "--xauth-protocol",
    ]),
  };
  WRAPPERS_WITH_TIMEOUT = {
    timeout: 1,
    gtimeout: 1,
    flock: 1,
    chrt: 1,
    taskset: 1,
  };
});
export {
  COMMAND_WRAPPERS,
  COMMAND_WRAPPERS_2,
  WRAPPERS_WITH_TIMEOUT,
  WRAPPER_VALUE_OPTIONS,
  createHookVouching,
  deviceHookTimeoutMs,
};
