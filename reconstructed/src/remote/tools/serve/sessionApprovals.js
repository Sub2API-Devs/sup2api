/**
 * remote/tools/serve/sessionApprovals.ts
 *
 * 2.1.316 新增：会话级批准的保留与需要批准/已确认信封
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (1), chunk-ad2e1aj6.js (9)
 * attribution: placement 10
 */
import { N6 } from "../../../utils/stableHash.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { $r, DEVICE_2 } from "../../../bridge/deviceRegistration.js";
import { clipText, autoModeRulesForWire, ANTHROPIC_REMOTETOOLEXECUTION } from "../protocolSchemas.js";
import { REMOTE_CALL_SESSION_ANSWER } from "./servedPermissionDecision.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import {
  sanitizePermissionUpdates,
  persistPermissionUpdates,
} from "../../../utils/permissions/PermissionUpdate.js";
import { permissionUpdateSchema } from "../../../utils/hooks/hookSpecificOutput.js";
import { dNt } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { Tn, tr, isWindowsSandboxPolicyViolation } from "./servingState.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { isRepoTierFreezeHeld, getAutoModeConfig } from "../../../utils/settings/settings.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { singlePrefixRuleFor } from "../../../tools/PowerShellTool/PowerShellTool.js";

//@ chunk-ad2e1aj6.js:6505-6593 placement
function matchesApprovedCall(e, n, s) {
  return n === e.toolName && N6(n, Uo(s, [$r, DEVICE_2])) === N6(n, e.evaluatedInput);
}
//@ chunk-ad2e1aj6.js:6593-6809 placement
function sessionDeclineDenial(e) {
  return {
    behavior: "deny",
    message:
      e !== void 0 && e.trim() !== ""
        ? clipText(e)
        : "The person declined this call in the session \u2014 it did not run.",
    decisionReason: { type: "other", reason: REMOTE_CALL_SESSION_ANSWER },
    decideLocation: "ask-path",
  };
}
//@ chunk-ad2e1aj6.js:6809-8223 placement
async function keepStandingApprovals(e, n, s, h) {
  if (n === void 0 || n.length === 0 || !shouldShowAlwaysAllowOptions()) return;
  let r = sanitizePermissionUpdates(
    n.flatMap((C) => {
      let safeParse = permissionUpdateSchema().safeParse(C),
        [x, ...Y] =
          safeParse.success && safeParse.data.type === "addRules" && safeParse.data.behavior === "allow"
            ? safeParse.data.rules
            : [];
      return x !== void 0 &&
        Y.length === 0 &&
        (x.ruleContent?.length ?? 0) <= dNt &&
        matchesOfferedWindowsSandboxRule(x, h)
        ? [{ type: "addRules", behavior: "allow", destination: "session", rules: [x] }]
        : [];
    }),
  );
  if (r.length > 0)
    ((e.offeredStandingUpdates = [...e.offeredStandingUpdates, ...r].slice(-Tn)),
      logRemoteTools(s.callId, "offered standing rule held", { rules: r.length }));
  let flattened = n.flatMap((C) => {
      let safeParse = permissionUpdateSchema().safeParse(C);
      return safeParse.success &&
        safeParse.data.type === "addRules" &&
        safeParse.data.behavior === "allow" &&
        safeParse.data.rules.length > 0 &&
        safeParse.data.rules.length <= tr &&
        safeParse.data.rules.every(
          (rule) =>
            rule.toolName.length <= dNt &&
            (rule.ruleContent?.length ?? 0) <= dNt &&
            isExactCommandRule(rule, h),
        )
        ? [safeParse.data]
        : [];
    }),
    y = sanitizePermissionUpdates(
      flattened.map((C) =>
        C.destination === "session" || C.destination === "localSettings"
          ? C
          : { ...C, destination: "session" },
      ),
    ),
    filtered = y.filter((C) => C.destination === "session"),
    filtered_2 = y.filter((C) => C.destination === "localSettings");
  if (y.length > 0 && flattened.some((C) => C.destination !== "session" && C.destination !== "localSettings"))
    s.destinationDowngraded = !0;
  let w = isRepoTierFreezeHeld() ? filtered_2.map((C) => ({ ...C, destination: "session" })) : [];
  if (filtered.length + w.length > 0)
    e.sessionPermissionUpdates = [...e.sessionPermissionUpdates, ...filtered, ...w].slice(-Tn);
  if (filtered_2.length > 0) await persistPermissionUpdates(filtered_2);
  if (y.length > 0)
    logRemoteTools(s.callId, "standing approval kept", {
      session_rules: filtered.length,
      local_settings_rules: filtered_2.length,
      downgraded: s.destinationDowngraded,
    });
}
//@ chunk-ad2e1aj6.js:8223-8394 placement
function isExactCommandRule(e, n) {
  let command = n.input.command;
  return (
    e.toolName === n.toolName &&
    typeof command === "string" &&
    e.ruleContent !== void 0 &&
    e.ruleContent === command.trim() &&
    !e.ruleContent.includes("*")
  );
}
//@ chunk-ad2e1aj6.js:8394-8552 placement
function autoModeRulesField(e) {
  if (e === "none") return;
  let n = rr(getAutoModeConfig()),
    s = autoModeRulesForWire(e === "full" ? n : { soft_deny: n?.soft_deny, hard_deny: n?.hard_deny });
  return s === void 0 ? void 0 : { auto_mode: s };
}
//@ chunk-ad2e1aj6.js:8552-8576 placement
function rr(e) {
  return e;
}
//@ chunk-ad2e1aj6.js:8576-9732 placement
function needsApprovalEnvelope(e) {
  let n = clipText(e.ask.message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "needs_approval",
      ...(e.facts.envelope && { call_id: e.facts.envelope.call_id }),
      target: e.target,
      ask_id: e.askId,
      tool: e.toolName,
      input: e.ask.input,
      message: n,
      ...(e.ask.decisionReason !== void 0 && { decision_reason: e.ask.decisionReason }),
      ...(e.ask.suggestions.length > 0 && { suggestions: [...e.ask.suggestions] }),
      classifier_eligible: e.ask.classifierEligible,
      prior_answer_ok: e.ask.priorAnswerOk,
      ...(e.notes.length > 0 && { notes: [...e.notes] }),
      ...(e.ask.classifierEligible && autoModeRulesField(e.hostRules)),
      elicitation: {
        mode: "form",
        message: n,
        requestedSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["allow", "deny"],
              description: `Whether ${e.toolName} may run this call on ${e.target.name}`,
            },
            feedback: { type: "string", description: "Optional words for Claude with the decision" },
          },
          required: ["decision"],
        },
        _meta: {
          [ANTHROPIC_REMOTETOOLEXECUTION]: {
            ask_id: e.askId,
            ...(e.facts.envelope && { call_id: e.facts.envelope.call_id }),
            input_fingerprint: e.inputFingerprint,
            classifier_eligible: e.ask.classifierEligible,
            prior_answer_ok: e.ask.priorAnswerOk,
          },
        },
      },
    },
    content: [
      {
        type: "text",
        text: `${e.toolName} on ${e.target.name} needs approval in this session before it runs: ${n}`,
      },
    ],
  };
}
//@ chunk-ad2e1aj6.js:9732-9949 placement
function acknowledgedEnvelope(e, n, s) {
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "acknowledged",
      ...(n.envelope && { call_id: n.envelope.call_id }),
      target: e,
      ask_id: s,
    },
    content: [{ type: "text", text: `The refusal was recorded on ${e.name} \u2014 nothing ran.` }],
  };
}
//@ chunk-ad2e1aj6.js:9949-9982 placement
var ASK_WAIT_SCHEMA = DoctorLazy(() => u({ askWaitMs: E() }));
/**
 * （切分错误，权限 UI）规则是否就是当前提供的常驻规则。
 */
//@ chunk-5ghnps9r.js:1078-1209 placement
function matchesOfferedWindowsSandboxRule(e, o) {
  let t = singlePrefixRuleFor(o.offered, o.toolName);
  return (
    isWindowsSandboxPolicyViolation() &&
    t !== void 0 &&
    e.toolName === t.toolName &&
    e.ruleContent === t.ruleContent
  );
}

export {
  sessionDeclineDenial,
  acknowledgedEnvelope,
  keepStandingApprovals,
  needsApprovalEnvelope,
  ASK_WAIT_SCHEMA,
  matchesApprovedCall,
};
