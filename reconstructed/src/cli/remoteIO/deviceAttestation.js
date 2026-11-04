/**
 * cli/remoteIO/deviceAttestation.ts
 *
 * 2.1.316 新增。云 worker 的可信设备证明判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (12)
 * attribution: placement 12
 */
import {
  attestedRequestSubtype,
  dropServiceVouchedAttestation,
  judgeDeviceAttestationLevel,
} from "./turnHandoff.js";
import { extractControlResponse } from "../../entrypoints/sdk/controlSchemas.js";
import { normalizeAttestationStatus } from "../../bridge/deviceAttestation.js";
import { resolveEffectiveAttestation } from "../../bridge/attestationGate.js";
import { asPlainObject, unverifiedRefusalResult } from "./servedCalls.js";
import { getControlRequestSubtype as getControlRequestSubtype_2 } from "../../bridge/controlRequests.js";
import { useSettings } from "../../hooks/useSettings.js";
import { frameAgeVerdict } from "../sdkMcpManifests.js";
import { SENDER_BELOW_FLOOR } from "../../remote/tools/protocolSchemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z4g2ta8k.js:33187-33316 placement
/**
 * 判断一条入站帧是否落在需要设备证明的类别上（远程工具、钩子、插件、主机询问、界面），按 control_request 子类型或 control_response 对应的请求类别查表。
 */
function isAttestationGatedFrame(payload, kindOf, categories = DEFAULT_ATTESTATION_CATEGORIES) {
  let subtype = attestedRequestSubtype(payload);
  if (subtype !== undefined) return categories[attestationCategoryOfRequest(subtype)];
  let controlResponse = extractControlResponse(payload);
  let kind = controlResponse === undefined ? undefined : kindOf(controlResponse);
  return kind !== undefined && categories[attestationCategoryOfResponse(kind)];
}
//@ chunk-z4g2ta8k.js:33316-33618 placement
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
      return "plugin_patch";
    case "remote_tools_announce":
    case "ui_surface":
      return;
    case undefined: {
      let controlResponse = extractControlResponse(payload);
      return controlResponse !== undefined && kindOf(controlResponse) === "hook" ? "answer" : undefined;
    }
  }
}
//@ chunk-z4g2ta8k.js:33618-33699 placement
var ATTESTATION_ACTION_GROUPS = {
  register: "hooks",
  template: "hooks",
  answer: "hooks",
  plugin_patch: "plugins",
};
//@ chunk-z4g2ta8k.js:33699-33815 placement
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
//@ chunk-z4g2ta8k.js:33815-34030 placement
var DEFAULT_ATTESTATION_CATEGORIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ACCEPTED_ATTESTATION_STATUSES;
var DEFAULT_ATTESTATION_DEPS;
deferInit("chunk-z4g2ta8k.js:33815", () => {
  DEFAULT_ATTESTATION_CATEGORIES = {
    remoteTools: true,
    hooks: true,
    plugins: true,
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
//@ chunk-z4g2ta8k.js:34030-34341 placement
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
//@ chunk-z4g2ta8k.js:34341-34360 placement
var UI_DETACH = "ui_detach";
//@ chunk-z4g2ta8k.js:34360-34525 placement
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
//@ chunk-z4g2ta8k.js:34525-34751 placement
function attestationCategoryOfRequest(subtype) {
  switch (subtype) {
    case "remote_tools_announce":
      return "remoteTools";
    case "register_device_hooks":
    case "upload_device_hook_template":
      return "hooks";
    case "apply_flag_settings":
      return "plugins";
    case "ui_surface":
      return "surfaces";
  }
}
//@ chunk-z4g2ta8k.js:34751-34872 placement
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
//@ chunk-z4g2ta8k.js:34872-36382 placement
function judgeDeviceAttestation(
  frame,
  kindOf,
  categories = DEFAULT_ATTESTATION_CATEGORIES,
  deps = DEFAULT_ATTESTATION_DEPS,
) {
  let payload = frame.payload;
  let subtype = attestedRequestSubtype(payload);
  if (subtype !== undefined) {
    if (!categories[attestationCategoryOfRequest(subtype)])
      return {
        kind: "pass",
      };
    let { verdict, status } = judgeDeviceAttestationLevel(frame);
    if (subtype === "ui_surface") {
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
    if (verdict === "pass")
      return {
        kind: "pass",
      };
    let settings = subtype === "apply_flag_settings" ? useSettings(payload) : undefined;
    return settings !== undefined
      ? {
          kind: "strip_forwarded_plugins",
          requestId: getControlRequestSubtype_2(payload),
          status,
          remainder: settings,
        }
      : {
          kind: "refuse_request",
          subtype,
          status,
        };
  }
  let controlResponse = extractControlResponse(payload);
  let kind = controlResponse === undefined ? undefined : kindOf(controlResponse);
  if (controlResponse === undefined || kind === undefined || !categories[attestationCategoryOfResponse(kind)])
    return {
      kind: "pass",
    };
  let { verdict, status } = dropServiceVouchedAttestation(frame);
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
  if (verdict === "pass") {
    let response = asPlainObject(asPlainObject(payload.response)?.response);
    if (response !== undefined && SENDER_BELOW_FLOOR in response) delete response[SENDER_BELOW_FLOOR];
    return {
      kind: "pass",
    };
  }
  let result = kind === "served_call" ? unverifiedRefusalResult(payload) : undefined;
  return result === undefined
    ? {
        kind: "drop_answer",
        requestId: controlResponse,
        answers: kind,
        status,
      }
    : {
        kind: "admit_refusal",
        requestId: controlResponse,
        status,
        result,
      };
}
//@ chunk-z4g2ta8k.js:36382-36537 placement
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
