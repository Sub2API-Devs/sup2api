/**
 * cli/remoteIO/deviceAttestation.ts
 *
 * 2.1.316 新增。云 worker 的可信设备证明判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (14)
 * attribution: placement 11, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  attestedRequestSubtype,
  unapprovedSettingsKeys,
  dropServiceVouchedAttestation,
  judgeDeviceAttestationLevel,
  TENGU_STRUCTURED_BLOSSOM,
} from "./turnHandoff.js";
import { extractControlResponse } from "../../entrypoints/sdk/controlSchemas.js";
import {
  asPlainObject,
  extraBodyEnvKeys,
  stripUnattestedSettings,
  unverifiedRefusalResult,
} from "./servedCalls.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../../utils/plugins/cloudPluginForwarding.js";
import { normalizeAttestationStatus } from "../../bridge/deviceAttestation.js";
import { resolveEffectiveAttestation } from "../../bridge/attestationGate.js";
import { getControlRequestSubtype as getControlRequestSubtype_2 } from "../../bridge/controlRequests.js";
import { frameAgeVerdict } from "../sdkMcpManifests.js";
import { SENDER_BELOW_FLOOR } from "../../remote/tools/protocolSchemas.js";
import { isOwnerAccountOnlyWriters } from "../transports/streamEventCoalescing.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:34361-34570 placement
/**
 * 判断一条入站帧是否落在需要设备证明的类别上（远程工具、钩子、插件、主机询问、界面），按 control_request 子类型或 control_response 对应的请求类别查表。
 */
function isAttestationGatedFrame(payload, kindOf, categories = DEFAULT_ATTESTATION_CATEGORIES) {
  let subtype = attestedRequestSubtype(payload);
  if (subtype === "apply_flag_settings") {
    let wrappedAndBeyond = attestationCoverageOfPayload(payload, categories);
    return wrappedAndBeyond.wrapped || wrappedAndBeyond.beyond.length > 0;
  }
  if (subtype !== undefined) return categories[attestationCategoryOfRequest(subtype)];
  let controlResponse = extractControlResponse(payload);
  let kind = controlResponse === undefined ? undefined : kindOf(controlResponse);
  return kind !== undefined && categories[attestationCategoryOfResponse(kind)];
}
//@ chunk-1kk50rk6.js:34570-34783 layout
function attestationCoverageOfPayload(payload, categories) {
  let settings = asPlainObject(asPlainObject(payload.request)?.settings) ?? {};
  return {
    wrapped: categories.plugins && Object.hasOwn(settings, CLOUD_PLUGINS_FORWARDED_KEY),
    beyond:
      categories.settings === "list"
        ? unapprovedSettingsKeys(settings).filter((settingKey) => settingKey !== CLOUD_PLUGINS_FORWARDED_KEY)
        : categories.settings === "extra_body"
          ? extraBodyEnvKeys(settings).map((envKey) => `env.${envKey}`)
          : [],
  };
}
//@ chunk-1kk50rk6.js:34783-35144 placement
/**
 * 把入站帧映射为证明裁决后的处理动作：register / template / plugin_patch / answer；远程工具声明和 ui_surface 返回 undefined。
 */
function classifyAttestationAction(payload, kindOf) {
  switch (attestedRequestSubtype(payload)) {
    case "register_device_hooks":
      return "register";
    case "upload_device_hook_template":
      return "template";
    case "apply_flag_settings":
      return Object.hasOwn(
        asPlainObject(asPlainObject(payload.request)?.settings) ?? {},
        CLOUD_PLUGINS_FORWARDED_KEY,
      )
        ? "plugin_patch"
        : undefined;
    case "remote_tools_announce":
    case "ui_surface":
      return;
    case undefined: {
      let controlResponse = extractControlResponse(payload);
      return controlResponse !== undefined && kindOf(controlResponse) === "hook" ? "answer" : undefined;
    }
  }
}
//@ chunk-1kk50rk6.js:35144-35225 placement
var ATTESTATION_ACTION_GROUPS = {
  register: "hooks",
  template: "hooks",
  answer: "hooks",
  plugin_patch: "plugins",
};
//@ chunk-1kk50rk6.js:35225-35341 placement
/**
 * 按 tn 给出的动作选裁决函数：answer 走 Zt，注册/模板/插件补丁走 ut（设备证明等级检查）。
 */
function judgeAttestationAction(action, frame) {
  switch (action) {
    case "answer":
      return dropServiceVouchedAttestation(frame);
    case "register":
    case "template":
    case "plugin_patch":
      return judgeDeviceAttestationLevel(frame);
  }
}
//@ chunk-1kk50rk6.js:35341-35572 placement
var DEFAULT_ATTESTATION_CATEGORIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ACCEPTED_ATTESTATION_STATUSES;
var DEFAULT_ATTESTATION_DEPS;
deferInit("chunk-1kk50rk6.js:35341", () => {
  DEFAULT_ATTESTATION_CATEGORIES = {
    remoteTools: true,
    hooks: true,
    plugins: true,
    settings: "list",
    hostAsks: true,
    surfaces: true,
  };
  ACCEPTED_ATTESTATION_STATUSES = new Set([
    "ABSENT",
    "VERIFIED",
    "VERIFIED_KEYLESS_DEVICE",
    "VERIFIED_BY_GATE",
  ]);
  DEFAULT_ATTESTATION_DEPS = {
    policy: undefined,
    leaves: () => false,
    sessionWriters: undefined,
    now: Date.now,
  };
});
//@ chunk-1kk50rk6.js:35572-35883 placement
/**
 * 根据设备证明状态和策略给出结论：未接受的状态、无策略（stands）、策略不可读、低于下限（强制时 below_floor，否则 observed_below_floor）。
 */
function judgeAttestationStanding(status, policy) {
  let normalized = normalizeAttestationStatus(status);
  if (!(status === undefined || status === null) && !ACCEPTED_ATTESTATION_STATUSES.has(normalized))
    return "unaccepted_status";
  if (policy === undefined) return "stands";
  if (policy === "unreadable") return "unreadable_policy";
  let { meetsLevel, configException } = resolveEffectiveAttestation(normalized, policy, {
    isCloudWorker: true,
  });
  if (meetsLevel || configException) return "stands";
  return policy.enforce ? "below_floor" : "observed_below_floor";
}
//@ chunk-1kk50rk6.js:35883-35902 placement
var UI_DETACH = "ui_detach";
//@ chunk-1kk50rk6.js:35902-36067 placement
function detachingClientIdOnFailure(payload, standing, deps) {
  let request = asPlainObject(payload.request);
  let clientId = request?.client_id;
  return (standing === "below_floor" || standing === "unreadable_policy") &&
    request?.subtype === UI_DETACH &&
    typeof clientId === "string" &&
    deps.leaves(clientId)
    ? clientId
    : undefined;
}
//@ chunk-1kk50rk6.js:36067-36251 layout
function attestationCategoryOfRequest(payload) {
  switch (payload) {
    case "remote_tools_announce":
      return "remoteTools";
    case "register_device_hooks":
    case "upload_device_hook_template":
      return "hooks";
    case "ui_surface":
      return "surfaces";
  }
}
//@ chunk-1kk50rk6.js:36251-36372 placement
function attestationCategoryOfResponse(kind) {
  switch (kind) {
    case "served_call":
      return "remoteTools";
    case "hook":
      return "hooks";
    case "host_ask":
      return "hostAsks";
  }
}
//@ chunk-1kk50rk6.js:36372-38881 placement
function judgeDeviceAttestation(
  frame,
  kindOf,
  categories = DEFAULT_ATTESTATION_CATEGORIES,
  deps = DEFAULT_ATTESTATION_DEPS,
) {
  let payload = frame.payload;
  let verdict = attestedRequestSubtype(payload);
  if (verdict === "apply_flag_settings") {
    let { wrapped, beyond } = attestationCoverageOfPayload(payload, categories);
    if (!wrapped && beyond.length === 0)
      return {
        kind: "pass",
      };
    let { verdict: verdict_2, status } = judgeDeviceAttestationLevel(frame);
    let requestId = getControlRequestSubtype_2(payload);
    let settings = asPlainObject(asPlainObject(payload.request)?.settings) ?? {};
    let remainder = {
      ...settings,
    };
    let env = asPlainObject(settings.env);
    if (env !== undefined)
      remainder.env = {
        ...env,
      };
    if (wrapped) delete remainder[CLOUD_PLUGINS_FORWARDED_KEY];
    if (verdict_2 !== "pass") {
      if (!wrapped)
        return {
          kind: "pass",
        };
      return Object.keys(remainder).length > 0
        ? {
            kind: "strip_forwarded_plugins",
            requestId,
            status,
            remainder,
          }
        : {
            kind: "refuse_request",
            subtype: verdict,
            status,
          };
    }
    let withEnv = attestationGapReason(deps);
    if (withEnv === undefined)
      return {
        kind: "pass",
      };
    let why = categories.settings === false ? [] : stripUnattestedSettings(remainder, categories.settings);
    let remainderObj = Object.keys(remainder).length > 0 ? remainder : undefined;
    if (!wrapped)
      return {
        kind: "strip_unlisted_settings",
        requestId,
        status,
        remainder: remainderObj ?? {},
        removed: why,
        forwardedPlugins: false,
        why: withEnv,
      };
    if (remainderObj === undefined)
      return {
        kind: "refuse_request",
        subtype: verdict,
        status,
        why: withEnv,
      };
    return why.length > 0
      ? {
          kind: "strip_unlisted_settings",
          requestId,
          status,
          remainder: remainderObj,
          removed: why,
          forwardedPlugins: true,
          why: withEnv,
        }
      : {
          kind: "strip_forwarded_plugins",
          requestId,
          status,
          remainder: remainderObj,
          why: withEnv,
        };
  }
  if (verdict !== undefined) {
    if (!categories[attestationCategoryOfRequest(verdict)])
      return {
        kind: "pass",
      };
    let { verdict: verdict_2, status } = judgeDeviceAttestationLevel(frame);
    if (verdict === "ui_surface") {
      let standing =
        frame.source === "client"
          ? judgeAttestationStanding(frame.device_attestation_status, deps.policy)
          : "not_client_written";
      if (standing === "stands")
        return {
          kind: "pass",
        };
      if (standing === "observed_below_floor")
        return {
          kind: "observe_surface_request",
          status,
        };
      let controlRequestSubtype = getControlRequestSubtype_2(payload);
      let clientId = detachingClientIdOnFailure(payload, standing, deps);
      return clientId !== undefined && controlRequestSubtype !== undefined
        ? {
            kind: "admit_leaving",
            requestId: controlRequestSubtype,
            clientId,
            status,
          }
        : {
            kind: "refuse_surface_request",
            requestId: controlRequestSubtype,
            wireSubtype: String(asPlainObject(payload.request)?.subtype),
            status,
            refusal: standing,
          };
    }
    let why =
      verdict_2 === "pass" && verdict === "remote_tools_announce" ? attestationGapReason(deps) : undefined;
    if (verdict_2 === "pass" && why === undefined)
      return {
        kind: "pass",
      };
    return {
      kind: "refuse_request",
      subtype: verdict,
      status,
      ...(why !== undefined && {
        why,
      }),
    };
  }
  let controlResponse = extractControlResponse(payload);
  let kind = controlResponse === undefined ? undefined : kindOf(controlResponse);
  if (controlResponse === undefined || kind === undefined || !categories[attestationCategoryOfResponse(kind)])
    return {
      kind: "pass",
    };
  let { verdict: verdict_2, status } = dropServiceVouchedAttestation(frame);
  if (kind === "host_ask") {
    let standing =
      frame.source === "client"
        ? judgeAttestationStanding(frame.device_attestation_status, deps.policy)
        : "not_client_written";
    let failure = standing === "stands" || standing === "observed_below_floor" ? undefined : standing;
    let stale =
      failure === undefined
        ? frameAgeVerdict(
            {
              createdAt: controlResponseCreatedAt(frame),
              sessionWriters: deps.sessionWriters,
            },
            deps.now(),
          )
        : undefined;
    let why = failure ?? stale;
    return why === undefined
      ? {
          kind: "pass",
        }
      : {
          kind: "drop_answer",
          requestId: controlResponse,
          answers: kind,
          status,
          why,
        };
  }
  let why = verdict_2 === "pass" && kind === "served_call" ? attestationGapReason(deps) : undefined;
  if (verdict_2 === "pass" && why === undefined) {
    let response = asPlainObject(asPlainObject(payload.response)?.response);
    if (response !== undefined && SENDER_BELOW_FLOOR in response) delete response[SENDER_BELOW_FLOOR];
    return {
      kind: "pass",
    };
  }
  let refusalResult = kind === "served_call" ? unverifiedRefusalResult(payload) : undefined;
  let whyField =
    why !== undefined
      ? {
          why,
        }
      : {};
  return refusalResult !== undefined
    ? {
        kind: "admit_refusal",
        requestId: controlResponse,
        status,
        result: refusalResult,
        ...whyField,
      }
    : {
        kind: "drop_answer",
        requestId: controlResponse,
        answers: kind,
        status,
        ...whyField,
      };
}
//@ chunk-1kk50rk6.js:38881-39040 layout
function attestationGapReason(deps) {
  if (
    isOwnerAccountOnlyWriters(deps.sessionWriters?.writers) ||
    !readFlagWithOverride(TENGU_STRUCTURED_BLOSSOM, {
      safe: true,
    })
  )
    return;
  return deps.sessionWriters === undefined ? "session_writers_unknown" : "session_not_owner_only";
}
//@ chunk-1kk50rk6.js:39040-39195 placement
function controlResponseCreatedAt(frame) {
  let createdAt =
    frame.event_type === "control_response" && typeof frame.created_at === "string"
      ? Date.parse(frame.created_at)
      : Number.NaN;
  return Number.isNaN(createdAt) ? undefined : createdAt;
}
export {
  UI_DETACH,
  judgeAttestationStanding,
  isAttestationGatedFrame,
  judgeDeviceAttestation,
  classifyAttestationAction,
  judgeAttestationAction,
  ATTESTATION_ACTION_GROUPS,
};
