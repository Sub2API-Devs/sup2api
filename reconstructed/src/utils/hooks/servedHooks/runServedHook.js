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
function runServedHookProcess(e, n, r) {
  if (e.aborted === true) return sandboxFallbackAsk(n, "timeout", e.stderr);
  if (e.spawnFailed === true) return sandboxFallbackAsk(n, "spawn_failed", e.stderr);
  if (e.status === 2) return sandboxedHookBlocked(n, e.stderr, [], r);
  if (e.status !== 0) return sandboxFallbackAsk(n, "exit", e.stderr, e.status);
  let { json, validationError } = e.parsed;
  if (validationError !== undefined) return sandboxFallbackAsk(n, "malformed", e.stderr);
  if (json === undefined || !isSyncHookJSONOutput(json)) return sandboxedSuccessResult([]);
  let hookSpecificOutput =
    json.hookSpecificOutput?.hookEventName === "PreToolUse" ? json.hookSpecificOutput : undefined;
  if (json.hookSpecificOutput !== undefined && hookSpecificOutput === undefined)
    return sandboxFallbackAsk(n, "malformed", e.stderr);
  let notes =
    hookSpecificOutput?.additionalContext === undefined || hookSpecificOutput.additionalContext === ""
      ? []
      : [hookCheckOutputNote(n, "context", clipHookOutputText(hookSpecificOutput.additionalContext))];
  let permissionDecision = hookSpecificOutput?.permissionDecision;
  let L = hookSpecificOutput?.permissionDecisionReason ?? json.reason ?? "";
  if (permissionDecision === "deny" || json.decision === "block" || json.continue === false)
    return sandboxedHookBlocked(n, L || (json.stopReason ?? ""), notes, r);
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
      notes: L === "" ? notes : [...notes, hookCheckOutputNote(n, "asked", clipHookOutputText(L))],
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
function sandboxedHookBlocked(e, n, notes, s) {
  return {
    outcome: "ran_sandboxed",
    askedPerson: false,
    result: {
      outcome: "blocking",
      permissionBehavior: "deny",
      hookPermissionDecisionReason: hookBlockedMessage(e, clipHookOutputText(n) || "it gave no reason", s),
    },
    notes,
  };
}
//@ chunk-e6aww6q8.js:915761-916187 placement
/**
 * 沙箱运行 hook 失败（超时、退出、格式错误等）时改为询问，并生成原因说明。
 */
function sandboxFallbackAsk(e, n, stderr, status) {
  let h = n === "timeout" || n === "exit" || n === "malformed" ? n : "wrap_failed";
  let y = {
    timeout: "timed out",
    exit: `exited ${status ?? 1}`,
    wrap_failed: "couldn't start",
    malformed: "gave an answer this computer could not read",
  };
  let S = truncateToLength(printableText(getFirstLine(stderr.trim())), MAX_SEEN_HOOK_PINS);
  return {
    outcome: `fallback_${h}`,
    cause: n,
    askedPerson: true,
    result: {
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: hookCheckUnfinishedQuestion(y[h]),
    },
    notes: S === "" ? [] : [hookCheckOutputNote(e, "stderr", S)],
  };
}
//@ chunk-e6aww6q8.js:916187-916305 placement
function clipHookOutputText(e) {
  let trimmed = printableText(e.replace(/\s+/g, " ")).trim();
  let r = truncateToLength(trimmed, MAX_PINNED_SCRIPT_BYTES);
  return r.length < trimmed.length ? `${r}\u2026(truncated)` : r;
}
//@ chunk-e6aww6q8.js:916305-917711 placement
/**
 * 运行服务端下发的钩子并解释结果（问用户、改写输入、在沙箱中运行等）。
 */
function runServedHook(e, projectHooks, r, s, mode, y, S) {
  let { cause } = S;
  if (cause !== undefined)
    logForDebugging(
      `[remote-tools] a project hook's run ended in a question to the person (fallback_cause=${cause} sandbox_mode=${mode})`,
      {
        level: "error",
      },
    );
  let L = y && cause !== undefined && cause !== "rewrite" && !projectHooks.declinedSetAside.has(r);
  if (L) {
    let q = (projectHooks.setAsideAsked.get(r) ?? 0) + 1;
    projectHooks.setAsideAsked.set(r, q);
    if (q >= MAX_SET_ASIDE_ASKS) projectHooks.declinedSetAside.add(r);
  }
  let G = [...S.notes];
  if (y && !projectHooks.said.has("keeps_recorded_note")) {
    projectHooks.said.add("keeps_recorded_note");
    G.unshift(HOOK_CHANGED_ON_DISK_NOTE);
  }
  logServedHookHeld_2(e, y && S.outcome === "ran_sandboxed" ? "ran_recorded_after_change" : S.outcome, {
    cause,
    mode,
    ...(L && {
      key: r,
    }),
  });
  if (projectHooks.acceptedUpdated.has(r) && !projectHooks.said.has("updated_accepted_note")) {
    projectHooks.said.add("updated_accepted_note");
    G.unshift(HOOK_UPDATED_ACCEPTED_NOTE);
  }
  if (S.outcome === "ran_sandboxed" && !projectHooks.said.has("sandbox_note")) {
    projectHooks.said.add("sandbox_note");
    G.unshift(HOOKS_SANDBOXED_NOTE);
  }
  if (S.outcome === "ran_sandboxed" && !projectHooks.said.has("feature_ok")) {
    projectHooks.said.add("feature_ok");
    logFeatureOk("remote_tool_serve_project_hook");
  }
  if (cause !== undefined && !projectHooks.said.has("feature_sad")) {
    projectHooks.said.add("feature_sad");
    logFeatureSad("remote_tool_serve_project_hook", S.outcome);
  }
  if (L)
    return {
      hook: e.hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: HOOK_STOPPED_WORKING_QUESTION,
      heldForServedCall: true,
      ...(G.length > 0 && {
        additionalContext: G.join(`

`),
      }),
    };
  if (S.askedPerson) {
    let q = (projectHooks.strikes.get(r) ?? 0) + 1;
    projectHooks.strikes.set(r, q);
    if (q >= MAX_PROJECT_PIN_STRIKES) {
      projectHooks.stopped.add(r);
      G.push(hookStruckOutNotice(s));
    }
  } else projectHooks.strikes.delete(r);
  return {
    ...S.result,
    hook: e.hook,
    ...(G.length > 0 && {
      additionalContext: G.join(`

`),
    }),
  };
}
//@ chunk-e6aww6q8.js:917711-918176 placement
/**
 * 上报服务端 hook 被搁置的遥测事件。
 */
function logServedHookHeld_2(e, n, { cause, key, mode }) {
  e.onOutcome?.(n, key);
  logEvent("tengu_remote_tool_serve_hook_held", {
    event: fromEnum("PreToolUse"),
    hook_type: fromEnum("command"),
    reason: fromEnum(e.held),
    outcome: fromEnum(
      n === "ran_sandboxed" ||
        n === "ran_recorded_after_change" ||
        n === "set_aside_after_change" ||
        n === "held_changed_since_attach" ||
        n === "held_changed_since_last_serve"
        ? n
        : n === "fallback_rewrite"
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
function projectHookUnavailable(e, projectHooks, unavailable) {
  if (!projectHooks.said.has("feature_sad")) {
    projectHooks.said.add("feature_sad");
    logFeatureSad("remote_tool_serve_project_hook", `unavailable_${unavailable}`);
  }
  return onUnavailableNoop(e, unavailable);
}
export {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
};
