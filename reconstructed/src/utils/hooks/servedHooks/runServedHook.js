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
  QWe,
  hookStruckOutNotice,
} from "./notices.js";
import { truncateToLength, wh, getFirstLine } from "../../stringUtils.js";
import { AAo, CAo, MAo, PAo } from "./hookPins.js";
import { logForDebugging } from "../../debug.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { z0 } from "./hostPaths.js";

/**
 * 运行一个服务端下发的钩子进程，处理超时、启动失败、输出格式错误。
 */
//@ chunk-e6aww6q8.js:914278-915466 placement
function runServedHookProcess(e, n, r) {
  if (e.aborted === !0) return sandboxFallbackAsk(n, "timeout", e.stderr);
  if (e.spawnFailed === !0) return sandboxFallbackAsk(n, "spawn_failed", e.stderr);
  if (e.status === 2) return sandboxedHookBlocked(n, e.stderr, [], r);
  if (e.status !== 0) return sandboxFallbackAsk(n, "exit", e.stderr, e.status);
  let { json: json, validationError: validationError } = e.parsed;
  if (validationError !== void 0) return sandboxFallbackAsk(n, "malformed", e.stderr);
  if (json === void 0 || !isSyncHookJSONOutput(json)) return FBt([]);
  let y = json.hookSpecificOutput?.hookEventName === "PreToolUse" ? json.hookSpecificOutput : void 0;
  if (json.hookSpecificOutput !== void 0 && y === void 0) return sandboxFallbackAsk(n, "malformed", e.stderr);
  let S =
      y?.additionalContext === void 0 || y.additionalContext === ""
        ? []
        : [hookCheckOutputNote(n, "context", clipHookOutputText(y.additionalContext))],
    w = y?.permissionDecision,
    L = y?.permissionDecisionReason ?? json.reason ?? "";
  if (w === "deny" || json.decision === "block" || json.continue === !1)
    return sandboxedHookBlocked(n, L || (json.stopReason ?? ""), S, r);
  if (y?.updatedInput !== void 0)
    return {
      outcome: "fallback_rewrite",
      cause: "rewrite",
      askedPerson: !0,
      result: {
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: HOOK_REWRITE_REFUSED_QUESTION,
      },
      notes: S,
    };
  if (w === "ask" || w === "defer")
    return {
      outcome: "ran_sandboxed",
      askedPerson: !0,
      result: {
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: HOOK_WANTS_CONFIRM_QUESTION,
      },
      notes: L === "" ? S : [...S, hookCheckOutputNote(n, "asked", clipHookOutputText(L))],
    };
  return FBt(S);
}
//@ chunk-e6aww6q8.js:915466-915564 placement
function FBt(e) {
  return { outcome: "ran_sandboxed", askedPerson: !1, result: { outcome: "success" }, notes: e };
}
//@ chunk-e6aww6q8.js:915564-915761 placement
function sandboxedHookBlocked(e, n, r, s) {
  return {
    outcome: "ran_sandboxed",
    askedPerson: !1,
    result: {
      outcome: "blocking",
      permissionBehavior: "deny",
      hookPermissionDecisionReason: hookBlockedMessage(e, clipHookOutputText(n) || "it gave no reason", s),
    },
    notes: r,
  };
}
/**
 * 沙箱运行 hook 失败（超时、退出、格式错误等）时改为询问，并生成原因说明。
 */
//@ chunk-e6aww6q8.js:915761-916187 placement
function sandboxFallbackAsk(e, n, r, s) {
  let h = n === "timeout" || n === "exit" || n === "malformed" ? n : "wrap_failed",
    y = {
      timeout: "timed out",
      exit: `exited ${s ?? 1}`,
      wrap_failed: "couldn't start",
      malformed: "gave an answer this computer could not read",
    },
    S = truncateToLength(wh(getFirstLine(r.trim())), AAo);
  return {
    outcome: `fallback_${h}`,
    cause: n,
    askedPerson: !0,
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
  let trimmed = wh(e.replace(/\s+/g, " ")).trim(),
    r = truncateToLength(trimmed, CAo);
  return r.length < trimmed.length ? `${r}\u2026(truncated)` : r;
}
/**
 * 运行服务端下发的钩子并解释结果（问用户、改写输入、在沙箱中运行等）。
 */
//@ chunk-e6aww6q8.js:916305-917711 placement
function runServedHook(e, n, r, s, h, y, S) {
  let { cause: cause } = S;
  if (cause !== void 0)
    logForDebugging(
      `[remote-tools] a project hook's run ended in a question to the person (fallback_cause=${cause} sandbox_mode=${h})`,
      { level: "error" },
    );
  let L = y && cause !== void 0 && cause !== "rewrite" && !n.declinedSetAside.has(r);
  if (L) {
    let q = (n.setAsideAsked.get(r) ?? 0) + 1;
    if ((n.setAsideAsked.set(r, q), q >= MAo)) n.declinedSetAside.add(r);
  }
  let G = [...S.notes];
  if (y && !n.said.has("keeps_recorded_note"))
    (n.said.add("keeps_recorded_note"), G.unshift(HOOK_CHANGED_ON_DISK_NOTE));
  if (
    (logServedHookHeld_2(e, y && S.outcome === "ran_sandboxed" ? "ran_recorded_after_change" : S.outcome, {
      cause: cause,
      mode: h,
      ...(L && { key: r }),
    }),
    n.acceptedUpdated.has(r) && !n.said.has("updated_accepted_note"))
  )
    (n.said.add("updated_accepted_note"), G.unshift(HOOK_UPDATED_ACCEPTED_NOTE));
  if (S.outcome === "ran_sandboxed" && !n.said.has("sandbox_note"))
    (n.said.add("sandbox_note"), G.unshift(HOOKS_SANDBOXED_NOTE));
  if (S.outcome === "ran_sandboxed" && !n.said.has("feature_ok"))
    (n.said.add("feature_ok"), logFeatureOk("remote_tool_serve_project_hook"));
  if (cause !== void 0 && !n.said.has("feature_sad"))
    (n.said.add("feature_sad"), logFeatureSad("remote_tool_serve_project_hook", S.outcome));
  if (L)
    return {
      hook: e.hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: QWe,
      heldForServedCall: !0,
      ...(G.length > 0 && {
        additionalContext: G.join(`

`),
      }),
    };
  if (S.askedPerson) {
    let q = (n.strikes.get(r) ?? 0) + 1;
    if ((n.strikes.set(r, q), q >= PAo)) (n.stopped.add(r), G.push(hookStruckOutNotice(s)));
  } else n.strikes.delete(r);
  return {
    ...S.result,
    hook: e.hook,
    ...(G.length > 0 && {
      additionalContext: G.join(`

`),
    }),
  };
}
/**
 * 上报服务端 hook 被搁置的遥测事件。
 */
//@ chunk-e6aww6q8.js:917711-918176 placement
function logServedHookHeld_2(e, n, { cause: cause, key: key, mode: mode }) {
  (e.onOutcome?.(n, key),
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
      ...(cause !== void 0 && { fallback_cause: fromEnum(cause) }),
      ...(mode !== void 0 && { sandbox_mode: fromEnum(mode) }),
    }));
}
//@ chunk-e6aww6q8.js:918176-918322 placement
function projectHookUnavailable(e, n, r) {
  if (!n.said.has("feature_sad"))
    (n.said.add("feature_sad"), logFeatureSad("remote_tool_serve_project_hook", `unavailable_${r}`));
  return z0(e, r);
}

export {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
};
