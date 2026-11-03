/**
 * utils/teleport/sessionCreate.ts
 *
 * 2.1.316 新增：teleport/桥接云会话的创建请求体、事件 URL 与错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (23)
 * attribution: placement 23
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import {
  validateBridgeId,
  toInfraSessionId,
  isUsableCreatedSessionId,
} from "../../bridge/sessionIdCompat.js";
import { isPlainObject } from "../objectUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { uniq } from "../collections.js";
import { REMOTE_DEVICE_TOOLS } from "../../services/mcp/firstPartyServerIds.js";
import { err, ok } from "../resultError.js";
import { sanitizeSessionTitle } from "../stringUtils.js";

//@ chunk-f25sswmp.js:19944-20228 placement
var PENDING_PROMPT_DESCRIPTIONS = {
  refusal_fallback_prompt: "choose: retry on fallback model or edit prompt",
  auto_mode_server_fallback: "acknowledge the classifier billing notice (Enter continues in auto mode)",
  auto_mode_outside_reads: "choose: keep allowing reads outside the working directories, or block them",
};
//@ chunk-f25sswmp.js:20228-20305 placement
function Isr(e, n) {
  return e === ENUM_PROMPT && typeof n.source === "string" ? n.source : void 0;
}
//@ chunk-f25sswmp.js:20305-20338 placement
var MCP_ELICITATION_DIALOG_TOOL = "dialog:mcp_elicitation";
//@ chunk-f25sswmp.js:20338-20630 placement
function dialogPermissionRequest(e, n, r, s) {
  return {
    tool_name: `dialog:${e}`,
    display_tool_name: "Claude needs your input",
    action_description:
      PENDING_PROMPT_DESCRIPTIONS[e] ??
      (e === ENUM_PROMPT && typeof n.title === "string" ? n.title : `Respond to the ${e} dialog to continue`),
    raw_command: void 0,
    tool_use_id: s ?? "",
    request_id: r,
    input: { dialog_kind: e, payload: n },
  };
}
//@ chunk-f25sswmp.js:20667-20973 placement
function sessionEventsUrl(e, n, r, s, i) {
  if ((validateBridgeId(n, "sessionId"), !s))
    return { url: `${e}/v1/sessions/${n}/events`, body: { events: r } };
  let y = toInfraSessionId(n);
  return {
    url: `${e}/v1/code/sessions/${encodeURIComponent(y)}/events`,
    body: {
      events: r.map((h) => ({
        payload: typeof h.uuid === "string" && h.uuid ? h : { ...h, uuid: randomUUID() },
        ...(i && { device_attestation: i }),
      })),
    },
  };
}
//@ chunk-f25sswmp.js:21010-21102 placement
var TENGU_WOVEN_HARBOR = "tengu_woven_harbor",
  TENGU_DRIFTING_TWILIGHT = "tengu_drifting_twilight",
  i9o = !0,
  TENGU_BUZZING_RIVER = "tengu_buzzing_river";
//@ chunk-f25sswmp.js:21102-21112 placement
var xe = 16;
//@ chunk-f25sswmp.js:21112-21330 placement
function setModeControlEvent(e, { ultraplan: n, isFromSettings: r = !1 } = {}) {
  return {
    type: "event",
    data: {
      type: "control_request",
      request_id: `set-mode-${randomUUID_2()}`,
      request: { subtype: "set_permission_mode", mode: e, ultraplan: n, ...(r && { from_settings: !0 }) },
    },
  };
}
//@ chunk-f25sswmp.js:21330-21455 placement
function summarizeSessionCreateBody(e) {
  return {
    envVars: Object.keys(e.environmentVariables ?? {}).length > 0,
    events: e.events.filter((event) => !Oe(event)).map(St),
  };
}
//@ chunk-f25sswmp.js:21455-21474 placement
var W = "<redacted>";
//@ chunk-f25sswmp.js:21474-21742 placement
function redactSeedFields(e) {
  if (!isPlainObject(e)) return;
  let { seed_bundle_file_id: seed_bundle_file_id, environment_variables: environment_variables } = e;
  if (seed_bundle_file_id === void 0 && environment_variables === void 0) return;
  return {
    ...e,
    ...(seed_bundle_file_id !== void 0 && { seed_bundle_file_id: W }),
    ...(environment_variables !== void 0 && {
      environment_variables: isPlainObject(environment_variables)
        ? Object.fromEntries(Object.keys(environment_variables).map((s) => [s, W]))
        : W,
    }),
  };
}
//@ chunk-f25sswmp.js:21742-21985 placement
function redactSessionCreateBody(e) {
  let bind_attestation = e.bind_attestation,
    r = redactSeedFields(e),
    s = redactSeedFields(e.session_context),
    i = redactSeedFields(e.config);
  if (!r && !s && !i && bind_attestation === void 0) return e;
  return {
    ...(r ?? e),
    ...(s && { session_context: s }),
    ...(i && { config: i }),
    ...(bind_attestation !== void 0 && {
      bind_attestation: isPlainObject(bind_attestation) ? { ...bind_attestation, signature: W } : W,
    }),
  };
}
//@ chunk-f25sswmp.js:21985-22099 placement
var PERMISSION_CONTROL_SUBTYPES = new Set([
  "set_permission_mode",
  "set_mcp_permission_mode_override",
  "set_max_thinking_tokens",
  "mcp_toggle",
]);
//@ chunk-f25sswmp.js:22099-22221 placement
function controlRequestSubtype(e) {
  let request = e.data.request;
  return e.data.type === "control_request" && typeof request?.subtype === "string" ? request.subtype : void 0;
}
//@ chunk-f25sswmp.js:22221-22310 placement
function Oe(e) {
  if (e.data.type === "user") return !0;
  let n = controlRequestSubtype(e);
  return n !== void 0 && PERMISSION_CONTROL_SUBTYPES.has(n);
}
//@ chunk-f25sswmp.js:22310-22359 placement
function St(e) {
  return controlRequestSubtype(e) ?? String(e.data.type);
}
/**
 * 构造 teleport/桥接云会话的创建请求体：初始事件（≤上限）、设备绑定、权限模式事件、来源与标签。
 */
//@ chunk-f25sswmp.js:22359-24252 placement
function buildSessionCreateBody(e) {
  let deviceBinding = e.deviceBinding,
    r = deviceBinding
      ? e.events.filter((event) => Oe(event) && !(e.deferFirstPrompt && event.data.type === "user"))
      : e.events;
  if (deviceBinding && r.length > xe)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `session create allows at most ${xe} initial events, got ${r.length}`,
      "session create: too many initial events",
    );
  let s = deviceBinding ? {} : (e.environmentVariables ?? {}),
    i = uniq([...(e.disallowedTools ?? []), ...(deviceBinding ? REMOTE_DEVICE_TOOLS : [])]);
  return {
    ...(e.title && { title: e.title }),
    ...e.worker,
    ...l9o(e.persistentVolume, e.persistentVolumeFromSessionId),
    events: r.map((y) => ({ payload: y.data })),
    ...(e.tags && { tags: e.tags }),
    ...(!deviceBinding && e.sessionGroupingId && { session_grouping_id: e.sessionGroupingId }),
    ...(!deviceBinding && e.agentId && { agent_id: e.agentId }),
    ...(Object.keys(s).length > 0 && { environment_variables: s }),
    ...(deviceBinding && {
      target_device_id: deviceBinding.deviceUUID,
      bind_attestation: { kid: deviceBinding.kid, signature: deviceBinding.signature },
      bind_attestation_issued_at: deviceBinding.issuedAt,
      ...(e.requestElevatedTier && { security_tier: "elevated" }),
      ...(e.repositoriesTrusted && { repositories_trusted: !0 }),
    }),
    config: {
      sources: e.sources.map(Et),
      outcomes: e.outcomes,
      ...(e.model && { model: e.model }),
      ...(e.cwd && { cwd: e.cwd }),
      ...(e.effortLevel && { effort_level: e.effortLevel }),
      ...(e.seedBundleFileId && { seed_bundle_file_id: e.seedBundleFileId }),
      ...(e.reuseOutcomeBranches && { reuse_outcome_branches: !0 }),
      ...(e.appendSystemPrompt && { append_system_prompt: e.appendSystemPrompt }),
      ...(e.customSystemPrompt && { custom_system_prompt: e.customSystemPrompt }),
      ...(e.appendSubagentSystemPrompt && { append_subagent_system_prompt: e.appendSubagentSystemPrompt }),
      ...(e.fallbackModel && { fallback_model: e.fallbackModel }),
      ...(e.maxTurns !== void 0 && { max_turns: e.maxTurns }),
      ...(e.maxBudgetUsd !== void 0 && e.maxBudgetUsd > 0 && { max_budget_usd: e.maxBudgetUsd }),
      ...(e.allowedTools && e.allowedTools.length > 0 && { allowed_tools: e.allowedTools }),
      ...(e.outputSchema && { output_schema: e.outputSchema }),
      ...(!deviceBinding && e.correlationId && { correlation_id: e.correlationId }),
      ...(i.length > 0 && { disallowed_tools: i }),
      ...(e.builtinTools && e.builtinTools.length > 0 && { builtin_tools: [...e.builtinTools] }),
    },
  };
}
//@ chunk-f25sswmp.js:24252-24277 placement
function l9o(e, n) {
  return;
}
//@ chunk-f25sswmp.js:24277-24508 placement
function sessionIdFromCreateResponse(e, n) {
  let r = e === "v1alpha2" ? n?.session : n;
  if (typeof r?.id !== "string" || r.id === "") return err("no_session_id");
  if (!isUsableCreatedSessionId(r.id)) return err("unusable_session_id");
  return ok({ ...r, title: typeof r.title === "string" ? sanitizeSessionTitle(r.title) : null });
}
//@ chunk-f25sswmp.js:24508-24548 placement
function sessionTitleOf(e, n) {
  return e.title || sanitizeSessionTitle(n);
}
//@ chunk-f25sswmp.js:24548-24614 placement
function Et(e) {
  let { allow_unrestricted_git_push: allow_unrestricted_git_push, ...r } = e;
  return r;
}
//@ chunk-f25sswmp.js:24614-24724 placement
function loginRejectedMessage(e, n) {
  if (e === 401) return `${n || "Claude login not accepted"} \xB7 Run /login, then try again`;
  return;
}
//@ chunk-f25sswmp.js:24724-25264 placement
function projectNotFoundMessage(e, n) {
  if (n?.type === "not_found_error" && n.resource_type === "session_grouping")
    return `Project not found: ${e}. Check the id \u2014 a Project you don't have access to looks the same as one that doesn't exist.`;
  switch (n?.reason) {
    case "public_grouping_hosted_only":
      return `${e} is a public Project, and public Projects run on Anthropic-hosted infrastructure only. Drop --environment (and any self-hosted target), or use a private Project.`;
    case "feature_disabled":
      return "Projects are not available for your organization.";
    default:
      return;
  }
}

export {
  MCP_ELICITATION_DIALOG_TOOL,
  setModeControlEvent,
  i9o,
  TENGU_DRIFTING_TWILIGHT,
  TENGU_BUZZING_RIVER,
  TENGU_WOVEN_HARBOR,
  buildSessionCreateBody,
  summarizeSessionCreateBody,
  projectNotFoundMessage,
  loginRejectedMessage,
  sessionIdFromCreateResponse,
  sessionTitleOf,
  l9o,
  redactSessionCreateBody,
  sessionEventsUrl,
  dialogPermissionRequest,
  Isr,
};
