/**
 * utils/teleport/sessionCreate.ts
 *
 * 2.1.316 新增：teleport/桥接云会话的创建请求体、事件 URL 与错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vr5v4gzz.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import {
  validateBridgeId,
  toInfraSessionId,
  isUsableCreatedSessionId,
} from "../../bridge/sessionIdCompat.js";
import { isPlainObject } from "../objectUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { REMOTE_DEVICE_TOOLS } from "../../services/mcp/firstPartyServerIds.js";
import { err, ok } from "../resultError.js";
import { sanitizeSessionTitle } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr5v4gzz.js:20591-20875 placement
var PENDING_PROMPT_DESCRIPTIONS = {
  refusal_fallback_prompt: "choose: retry on fallback model or edit prompt",
  auto_mode_server_fallback: "acknowledge the classifier billing notice (Enter continues in auto mode)",
  auto_mode_outside_reads: "choose: keep allowing reads outside the working directories, or block them",
};
//@ chunk-vr5v4gzz.js:20875-20952 placement
/**
 * 取对话框事件里的来源字段。
 */
function dialogSourceOf(kind, options) {
  return kind === ENUM_PROMPT && typeof options.source === "string" ? options.source : undefined;
}
//@ chunk-vr5v4gzz.js:20952-20985 placement
var MCP_ELICITATION_DIALOG_TOOL = "dialog:mcp_elicitation";
//@ chunk-vr5v4gzz.js:20985-21277 placement
function dialogPermissionRequest(kind, options, requestId, toolUseId) {
  return {
    tool_name: `dialog:${kind}`,
    display_tool_name: "Claude needs your input",
    action_description:
      PENDING_PROMPT_DESCRIPTIONS[kind] ??
      (kind === ENUM_PROMPT && typeof options.title === "string"
        ? options.title
        : `Respond to the ${kind} dialog to continue`),
    raw_command: undefined,
    tool_use_id: toolUseId ?? "",
    request_id: requestId,
    input: {
      dialog_kind: kind,
      payload: options,
    },
  };
}
//@ chunk-vr5v4gzz.js:21314-21620 placement
function sessionEventsUrl(sessionId, compatSessionId, opts, extra, deviceAttestation) {
  validateBridgeId(compatSessionId, "sessionId");
  if (!extra)
    return {
      url: `${sessionId}/v1/sessions/${compatSessionId}/events`,
      body: {
        events: opts,
      },
    };
  let infraSessionId = toInfraSessionId(compatSessionId);
  return {
    url: `${sessionId}/v1/code/sessions/${encodeURIComponent(infraSessionId)}/events`,
    body: {
      events: opts.map((event) => ({
        payload:
          typeof event.uuid === "string" && event.uuid
            ? event
            : {
                ...event,
                uuid: randomUUID(),
              },
        ...(deviceAttestation && {
          device_attestation: deviceAttestation,
        }),
      })),
    },
  };
}
//@ chunk-vr5v4gzz.js:21657-21749 placement
/**
 * 云会话创建相关 GrowthBook 开关名与启用标志。
 */
var TENGU_WOVEN_HARBOR = "tengu_woven_harbor";
var TENGU_DRIFTING_TWILIGHT = "tengu_drifting_twilight";
var DEVICE_BINDING_CREATE_ENABLED = true;
var TENGU_BUZZING_RIVER = "tengu_buzzing_river";
//@ chunk-vr5v4gzz.js:21749-21759 placement
var MAX_INITIAL_EVENTS = 16;
//@ chunk-vr5v4gzz.js:21759-21977 placement
function setModeControlEvent(mode, { ultraplan: options, isFromSettings: fromSettings = false } = {}) {
  return {
    type: "event",
    data: {
      type: "control_request",
      request_id: `set-mode-${randomUUID()}`,
      request: {
        subtype: "set_permission_mode",
        mode,
        ultraplan: options,
        ...(fromSettings && {
          from_settings: true,
        }),
      },
    },
  };
}
//@ chunk-vr5v4gzz.js:21977-22102 placement
function summarizeSessionCreateBody(body) {
  return {
    envVars: Object.keys(body.environmentVariables ?? {}).length > 0,
    events: body.events.filter((event) => !isPromptOrPermissionEvent(event)).map(eventKindOf),
  };
}
//@ chunk-vr5v4gzz.js:22102-22121 placement
var REDACTED_PLACEHOLDER = "<redacted>";
//@ chunk-vr5v4gzz.js:22121-22389 placement
function redactSeedFields(body) {
  if (!isPlainObject(body)) return;
  let { seed_bundle_file_id: seedBundleFileId, environment_variables: environmentVariables } = body;
  if (seedBundleFileId === undefined && environmentVariables === undefined) return;
  return {
    ...body,
    ...(seedBundleFileId !== undefined && {
      seed_bundle_file_id: REDACTED_PLACEHOLDER,
    }),
    ...(environmentVariables !== undefined && {
      environment_variables: isPlainObject(environmentVariables)
        ? Object.fromEntries(Object.keys(environmentVariables).map((key) => [key, REDACTED_PLACEHOLDER]))
        : REDACTED_PLACEHOLDER,
    }),
  };
}
//@ chunk-vr5v4gzz.js:22389-22632 placement
function redactSessionCreateBody(body) {
  let bindAttestation = body.bind_attestation;
  let seedFields = redactSeedFields(body);
  let environmentVariables = redactSeedFields(body.session_context);
  let configRedacted = redactSeedFields(body.config);
  if (!seedFields && !environmentVariables && !configRedacted && bindAttestation === undefined) return body;
  return {
    ...(seedFields ?? body),
    ...(environmentVariables && {
      session_context: environmentVariables,
    }),
    ...(configRedacted && {
      config: configRedacted,
    }),
    ...(bindAttestation !== undefined && {
      bind_attestation: isPlainObject(bindAttestation)
        ? {
            ...bindAttestation,
            signature: REDACTED_PLACEHOLDER,
          }
        : REDACTED_PLACEHOLDER,
    }),
  };
}
//@ chunk-vr5v4gzz.js:22632-22746 placement
var PERMISSION_CONTROL_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr5v4gzz.js:22632", () => {
  PERMISSION_CONTROL_SUBTYPES = new Set([
    "set_permission_mode",
    "set_mcp_permission_mode_override",
    "set_max_thinking_tokens",
    "mcp_toggle",
  ]);
});
//@ chunk-vr5v4gzz.js:22746-22868 placement
function controlRequestSubtype(event) {
  let request = event.data.request;
  return event.data.type === "control_request" && typeof request?.subtype === "string"
    ? request.subtype
    : undefined;
}
//@ chunk-vr5v4gzz.js:22868-22957 placement
function isPromptOrPermissionEvent(event) {
  if (event.data.type === "user") return true;
  let subtype = controlRequestSubtype(event);
  return subtype !== undefined && PERMISSION_CONTROL_SUBTYPES.has(subtype);
}
//@ chunk-vr5v4gzz.js:22957-23006 placement
function eventKindOf(event) {
  return controlRequestSubtype(event) ?? String(event.data.type);
}
//@ chunk-vr5v4gzz.js:23006-24963 placement
/**
 * 构造 teleport/桥接云会话的创建请求体：初始事件（≤上限）、设备绑定、权限模式事件、来源与标签。
 */
function buildSessionCreateBody(options) {
  let deviceBinding = options.deviceBinding;
  let events = deviceBinding
    ? options.events.filter(
        (event) =>
          isPromptOrPermissionEvent(event) && !(options.deferFirstPrompt && event.data.type === "user"),
      )
    : options.events;
  if (deviceBinding && events.length > MAX_INITIAL_EVENTS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `session create allows at most ${MAX_INITIAL_EVENTS} initial events, got ${events.length}`,
      "session create: too many initial events",
    );
  let environmentVariables = deviceBinding ? {} : (options.environmentVariables ?? {});
  let disallowedTools = normalizeCaseForComparison_2([
    ...(options.disallowedTools ?? []),
    ...(deviceBinding ? REMOTE_DEVICE_TOOLS : []),
  ]);
  return {
    ...(options.title && {
      title: options.title,
    }),
    ...options.worker,
    ...noopSessionTag(options.persistentVolume, options.persistentVolumeFromSessionId),
    events: events.map((event) => ({
      payload: event.data,
    })),
    ...(options.tags && {
      tags: options.tags,
    }),
    ...(!deviceBinding &&
      options.sessionGroupingId && {
        session_grouping_id: options.sessionGroupingId,
      }),
    ...(!deviceBinding &&
      options.agentId && {
        agent_id: options.agentId,
      }),
    ...(Object.keys(environmentVariables).length > 0 && {
      environment_variables: environmentVariables,
    }),
    ...(deviceBinding && {
      target_device_id: deviceBinding.deviceUUID,
      bind_attestation: {
        kid: deviceBinding.kid,
        signature: deviceBinding.signature,
      },
      bind_attestation_issued_at: deviceBinding.issuedAt,
      ...(options.requestElevatedTier && {
        security_tier: "elevated",
      }),
      ...(options.repositoriesTrusted && {
        repositories_trusted: true,
      }),
    }),
    config: {
      sources: options.sources.map(stripUnrestrictedGitPush),
      outcomes: options.outcomes,
      ...(options.model && {
        model: options.model,
      }),
      ...(options.cwd && {
        cwd: options.cwd,
      }),
      ...(options.effortLevel && {
        effort_level: options.effortLevel,
      }),
      ...(options.programUseCaseId && {
        program_use_case_id: options.programUseCaseId,
      }),
      ...(options.seedBundleFileId && {
        seed_bundle_file_id: options.seedBundleFileId,
      }),
      ...(options.reuseOutcomeBranches && {
        reuse_outcome_branches: true,
      }),
      ...(options.appendSystemPrompt && {
        append_system_prompt: options.appendSystemPrompt,
      }),
      ...(options.customSystemPrompt && {
        custom_system_prompt: options.customSystemPrompt,
      }),
      ...(options.appendSubagentSystemPrompt && {
        append_subagent_system_prompt: options.appendSubagentSystemPrompt,
      }),
      ...(options.fallbackModel && {
        fallback_model: options.fallbackModel,
      }),
      ...(options.maxTurns !== undefined && {
        max_turns: options.maxTurns,
      }),
      ...(options.maxBudgetUsd !== undefined &&
        options.maxBudgetUsd > 0 && {
          max_budget_usd: options.maxBudgetUsd,
        }),
      ...(options.allowedTools &&
        options.allowedTools.length > 0 && {
          allowed_tools: options.allowedTools,
        }),
      ...(options.outputSchema && {
        output_schema: options.outputSchema,
      }),
      ...(!deviceBinding &&
        options.correlationId && {
          correlation_id: options.correlationId,
        }),
      ...(disallowedTools.length > 0 && {
        disallowed_tools: disallowedTools,
      }),
      ...(options.builtinTools &&
        options.builtinTools.length > 0 && {
          builtin_tools: [...options.builtinTools],
        }),
    },
  };
}
//@ chunk-vr5v4gzz.js:24963-24988 placement
/**
 * 记录会话创建的空实现（外部构建）。
 */
function noopSessionTag(persistentVolume, persistentVolumeFromSessionId) {
  return;
}
//@ chunk-vr5v4gzz.js:24988-25219 placement
function sessionIdFromCreateResponse(apiVersion, body) {
  let session = apiVersion === "v1alpha2" ? body?.session : body;
  if (typeof session?.id !== "string" || session.id === "") return err("no_session_id");
  if (!isUsableCreatedSessionId(session.id)) return err("unusable_session_id");
  return ok({
    ...session,
    title: typeof session.title === "string" ? sanitizeSessionTitle(session.title) : null,
  });
}
//@ chunk-vr5v4gzz.js:25219-25259 placement
function sessionTitleOf(body, fallbackTitle) {
  return body.title || sanitizeSessionTitle(fallbackTitle);
}
//@ chunk-vr5v4gzz.js:25259-25325 placement
function stripUnrestrictedGitPush(body) {
  let { allow_unrestricted_git_push: allowUnrestrictedGitPush, ...rest } = body;
  return rest;
}
//@ chunk-vr5v4gzz.js:25325-25435 placement
function loginRejectedMessage(status, message) {
  if (status === 401) return `${message || "Claude login not accepted"} \xB7 Run /login, then try again`;
  return;
}
//@ chunk-vr5v4gzz.js:25435-25975 placement
function projectNotFoundMessage(sessionGroupingId, error) {
  if (error?.type === "not_found_error" && error.resource_type === "session_grouping")
    return `Project not found: ${sessionGroupingId}. Check the id \u2014 a Project you don't have access to looks the same as one that doesn't exist.`;
  switch (error?.reason) {
    case "public_grouping_hosted_only":
      return `${sessionGroupingId} is a public Project, and public Projects run on Anthropic-hosted infrastructure only. Drop --environment (and any self-hosted target), or use a private Project.`;
    case "feature_disabled":
      return "Projects are not available for your organization.";
    default:
      return;
  }
}
export {
  MCP_ELICITATION_DIALOG_TOOL,
  dialogPermissionRequest,
  dialogSourceOf,
  setModeControlEvent,
  DEVICE_BINDING_CREATE_ENABLED,
  TENGU_DRIFTING_TWILIGHT,
  TENGU_BUZZING_RIVER,
  TENGU_WOVEN_HARBOR,
  buildSessionCreateBody,
  summarizeSessionCreateBody,
  projectNotFoundMessage,
  loginRejectedMessage,
  sessionIdFromCreateResponse,
  sessionTitleOf,
  noopSessionTag,
  redactSessionCreateBody,
  sessionEventsUrl,
};
