/**
 * utils/hooks/servedHooks/runServedHook.ts
 *
 * 2.1.316 新增：运行服务端下发的钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { isSyncHookJSONOutput } from "../../../types/hooks.js";
import {
  hookCheckOutputNote,
  HOOK_REWRITE_REFUSED_QUESTION,
  HOOK_WANTS_CONFIRM_QUESTION,
  hookBlockedMessage,
  hookCheckUnfinishedQuestion,
  HOOK_CHANGED_ON_DISK_NOTE,
  HOOK_UPDATED_ACCEPTED_NOTE,
  HOOKS_SANDBOXED_NOTE,
  HOOK_STOPPED_WORKING_QUESTION,
  hookStruckOutNotice,
} from "./notices.js";
import { truncateToLength, printableText, getFirstLine } from "../../stringUtils.js";
import {
  MAX_SEEN_HOOK_PINS,
  MAX_PINNED_SCRIPT_BYTES,
  MAX_SET_ASIDE_ASKS,
  MAX_PROJECT_PIN_STRIKES,
} from "./hookPins.js";
import { logForDebugging } from "../../debug.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { onUnavailableNoop } from "./hostPaths.js";

//@ chunk-e6aww6q8.js:914278-915466 placement
/**
 * 运行一个服务端下发的钩子进程，处理超时、启动失败、输出格式错误。
 */
function runServedHookProcess(match, checkLabel, pinChanged) {
  if (match.aborted === true) return sandboxFallbackAsk(checkLabel, "timeout", match.stderr);
  if (match.spawnFailed === true) return sandboxFallbackAsk(checkLabel, "spawn_failed", match.stderr);
  if (match.status === 2) return sandboxedHookBlocked(checkLabel, match.stderr, [], pinChanged);
  if (match.status !== 0) return sandboxFallbackAsk(checkLabel, "exit", match.stderr, match.status);
  let { json, validationError } = match.parsed;
  if (validationError !== undefined) return sandboxFallbackAsk(checkLabel, "malformed", match.stderr);
  if (json === undefined || !isSyncHookJSONOutput(json)) return sandboxedSuccessResult([]);
  let hookSpecificOutput =
    json.hookSpecificOutput?.hookEventName === "PreToolUse" ? json.hookSpecificOutput : undefined;
  if (json.hookSpecificOutput !== undefined && hookSpecificOutput === undefined)
    return sandboxFallbackAsk(checkLabel, "malformed", match.stderr);
  let notes =
    hookSpecificOutput?.additionalContext === undefined || hookSpecificOutput.additionalContext === ""
      ? []
      : [
          hookCheckOutputNote(
            checkLabel,
            "context",
            clipHookOutputText(hookSpecificOutput.additionalContext),
          ),
        ];
  let permissionDecision = hookSpecificOutput?.permissionDecision;
  let reasonText = hookSpecificOutput?.permissionDecisionReason ?? json.reason ?? "";
  if (permissionDecision === "deny" || json.decision === "block" || json.continue === false)
    return sandboxedHookBlocked(checkLabel, reasonText || (json.stopReason ?? ""), notes, pinChanged);
  if (hookSpecificOutput?.updatedInput !== undefined)
    return {
      outcome: "fallback_rewrite",
      cause: "rewrite",
      askedPerson: true,
      result: {
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: HOOK_REWRITE_REFUSED_QUESTION,
      },
      notes,
    };
  if (permissionDecision === "ask" || permissionDecision === "defer")
    return {
      outcome: "ran_sandboxed",
      askedPerson: true,
      result: {
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: HOOK_WANTS_CONFIRM_QUESTION,
      },
      notes:
        reasonText === ""
          ? notes
          : [...notes, hookCheckOutputNote(checkLabel, "asked", clipHookOutputText(reasonText))],
    };
  return sandboxedSuccessResult(notes);
}
//@ chunk-e6aww6q8.js:915466-915564 placement
function sandboxedSuccessResult(notes) {
  return {
    outcome: "ran_sandboxed",
    askedPerson: false,
    result: {
      outcome: "success",
    },
    notes,
  };
}
//@ chunk-e6aww6q8.js:915564-915761 placement
function sandboxedHookBlocked(checkLabel, reasonText, notes, isStale) {
  return {
    outcome: "ran_sandboxed",
    askedPerson: false,
    result: {
      outcome: "blocking",
      permissionBehavior: "deny",
      hookPermissionDecisionReason: hookBlockedMessage(
        checkLabel,
        clipHookOutputText(reasonText) || "it gave no reason",
        isStale,
      ),
    },
    notes,
  };
}
//@ chunk-e6aww6q8.js:915761-916187 placement
/**
 * 沙箱运行 hook 失败（超时、退出、格式错误等）时改为询问，并生成原因说明。
 */
function sandboxFallbackAsk(checkLabel, cause, stderr, status) {
  let outcomeKind = cause === "timeout" || cause === "exit" || cause === "malformed" ? cause : "wrap_failed";
  let causeTexts = {
    timeout: "timed out",
    exit: `exited ${status ?? 1}`,
    wrap_failed: "couldn't start",
    malformed: "gave an answer this computer could not read",
  };
  let stderrLine = truncateToLength(printableText(getFirstLine(stderr.trim())), MAX_SEEN_HOOK_PINS);
  return {
    outcome: `fallback_${outcomeKind}`,
    cause,
    askedPerson: true,
    result: {
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: hookCheckUnfinishedQuestion(causeTexts[outcomeKind]),
    },
    notes: stderrLine === "" ? [] : [hookCheckOutputNote(checkLabel, "stderr", stderrLine)],
  };
}
//@ chunk-e6aww6q8.js:916187-916305 placement
function clipHookOutputText(text) {
  let trimmed = printableText(text.replace(/\s+/g, " ")).trim();
  let clipped = truncateToLength(trimmed, MAX_PINNED_SCRIPT_BYTES);
  return clipped.length < trimmed.length ? `${clipped}\u2026(truncated)` : clipped;
}
//@ chunk-e6aww6q8.js:916305-917711 placement
/**
 * 运行服务端下发的钩子并解释结果（问用户、改写输入、在沙箱中运行等）。
 */
function runServedHook(request, projectHooks, hookKey, checkLabel, mode, pinChanged, outcome) {
  let { cause } = outcome;
  if (cause !== undefined)
    logForDebugging(
      `[remote-tools] a project hook's run ended in a question to the person (fallback_cause=${cause} sandbox_mode=${mode})`,
      {
        level: "error",
      },
    );
  let shouldStop =
    pinChanged && cause !== undefined && cause !== "rewrite" && !projectHooks.declinedSetAside.has(hookKey);
  if (shouldStop) {
    let askCount = (projectHooks.setAsideAsked.get(hookKey) ?? 0) + 1;
    projectHooks.setAsideAsked.set(hookKey, askCount);
    if (askCount >= MAX_SET_ASIDE_ASKS) projectHooks.declinedSetAside.add(hookKey);
  }
  let notes = [...outcome.notes];
  if (pinChanged && !projectHooks.said.has("keeps_recorded_note")) {
    projectHooks.said.add("keeps_recorded_note");
    notes.unshift(HOOK_CHANGED_ON_DISK_NOTE);
  }
  logServedHookHeld_2(
    request,
    pinChanged && outcome.outcome === "ran_sandboxed" ? "ran_recorded_after_change" : outcome.outcome,
    {
      cause,
      mode,
      ...(shouldStop && {
        key: hookKey,
      }),
    },
  );
  if (projectHooks.acceptedUpdated.has(hookKey) && !projectHooks.said.has("updated_accepted_note")) {
    projectHooks.said.add("updated_accepted_note");
    notes.unshift(HOOK_UPDATED_ACCEPTED_NOTE);
  }
  if (outcome.outcome === "ran_sandboxed" && !projectHooks.said.has("sandbox_note")) {
    projectHooks.said.add("sandbox_note");
    notes.unshift(HOOKS_SANDBOXED_NOTE);
  }
  if (outcome.outcome === "ran_sandboxed" && !projectHooks.said.has("feature_ok")) {
    projectHooks.said.add("feature_ok");
    logFeatureOk("remote_tool_serve_project_hook");
  }
  if (cause !== undefined && !projectHooks.said.has("feature_sad")) {
    projectHooks.said.add("feature_sad");
    logFeatureSad("remote_tool_serve_project_hook", outcome.outcome);
  }
  if (shouldStop)
    return {
      hook: request.hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: HOOK_STOPPED_WORKING_QUESTION,
      heldForServedCall: true,
      ...(notes.length > 0 && {
        additionalContext: notes.join(`

`),
      }),
    };
  if (outcome.askedPerson) {
    let strikeCount = (projectHooks.strikes.get(hookKey) ?? 0) + 1;
    projectHooks.strikes.set(hookKey, strikeCount);
    if (strikeCount >= MAX_PROJECT_PIN_STRIKES) {
      projectHooks.stopped.add(hookKey);
      notes.push(hookStruckOutNotice(checkLabel));
    }
  } else projectHooks.strikes.delete(hookKey);
  return {
    ...outcome.result,
    hook: request.hook,
    ...(notes.length > 0 && {
      additionalContext: notes.join(`

`),
    }),
  };
}
//@ chunk-e6aww6q8.js:917711-918176 placement
/**
 * 上报服务端 hook 被搁置的遥测事件。
 */
function logServedHookHeld_2(request, outcomeKind, { cause, key, mode }) {
  request.onOutcome?.(outcomeKind, key);
  logEvent("tengu_remote_tool_serve_hook_held", {
    event: fromEnum("PreToolUse"),
    hook_type: fromEnum("command"),
    reason: fromEnum(request.held),
    outcome: fromEnum(
      outcomeKind === "ran_sandboxed" ||
        outcomeKind === "ran_recorded_after_change" ||
        outcomeKind === "set_aside_after_change" ||
        outcomeKind === "held_changed_since_attach" ||
        outcomeKind === "held_changed_since_last_serve"
        ? outcomeKind
        : outcomeKind === "fallback_rewrite"
          ? "rewrite_refused"
          : "sandbox_fallback_ask",
    ),
    ...(cause !== undefined && {
      fallback_cause: fromEnum(cause),
    }),
    ...(mode !== undefined && {
      sandbox_mode: fromEnum(mode),
    }),
  });
}
//@ chunk-e6aww6q8.js:918176-918322 placement
function projectHookUnavailable(request, projectHooks, unavailable) {
  if (!projectHooks.said.has("feature_sad")) {
    projectHooks.said.add("feature_sad");
    logFeatureSad("remote_tool_serve_project_hook", `unavailable_${unavailable}`);
  }
  return onUnavailableNoop(request, unavailable);
}
export {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
};
