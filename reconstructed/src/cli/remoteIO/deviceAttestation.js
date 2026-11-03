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

//@ chunk-z4g2ta8k.js:33187-33316 placement
/**
 * 判断一条入站帧是否落在需要设备证明的类别上（远程工具、钩子、插件、主机询问、界面），按 control_request 子类型或 control_response 对应的请求类别查表。
 */
function isAttestationGatedFrame(payload, n, r = DEFAULT_ATTESTATION_CATEGORIES) {
  let s = attestedRequestSubtype(payload);
  if (s !== undefined) return r[attestationCategoryOfRequest(s)];
  let controlResponse = extractControlResponse(payload);
  let y = controlResponse === undefined ? undefined : n(controlResponse);
  return y !== undefined && r[attestationCategoryOfResponse(y)];
}
//@ chunk-z4g2ta8k.js:33316-33618 placement
/**
 * 把入站帧映射为证明裁决后的处理动作：register / template / plugin_patch / answer；远程工具声明和 ui_surface 返回 undefined。
 */
function classifyAttestationAction(payload, n) {
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
      return controlResponse !== undefined && n(controlResponse) === "hook" ? "answer" : undefined;
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
function judgeAttestationAction(e, n) {
  switch (e) {
    case "answer":
      return dropServiceVouchedAttestation(n);
    case "register":
    case "template":
    case "plugin_patch":
      return judgeDeviceAttestationLevel(n);
  }
}
//@ chunk-z4g2ta8k.js:33815-34030 placement
var DEFAULT_ATTESTATION_CATEGORIES = {
  remoteTools: true,
  hooks: true,
  plugins: true,
  hostAsks: true,
  surfaces: true,
};
var ACCEPTED_ATTESTATION_STATUSES = new Set([
  "ABSENT",
  "VERIFIED",
  "VERIFIED_KEYLESS_DEVICE",
  "VERIFIED_BY_GATE",
]);
var DEFAULT_ATTESTATION_DEPS = {
  policy: undefined,
  leaves: () => false,
  sessionWriters: undefined,
  now: Date.now,
};
//@ chunk-z4g2ta8k.js:34030-34341 placement
/**
 * 根据设备证明状态和策略给出结论：未接受的状态、无策略（stands）、策略不可读、低于下限（强制时 below_floor，否则 observed_below_floor）。
 */
function judgeAttestationStanding(e, policy) {
  let r = normalizeAttestationStatus(e);
  if (!(e === undefined || e === null) && !ACCEPTED_ATTESTATION_STATUSES.has(r)) return "unaccepted_status";
  if (policy === undefined) return "stands";
  if (policy === "unreadable") return "unreadable_policy";
  let { meetsLevel, configException } = resolveEffectiveAttestation(r, policy, {
    isCloudWorker: true,
  });
  if (meetsLevel || configException) return "stands";
  return policy.enforce ? "below_floor" : "observed_below_floor";
}
//@ chunk-z4g2ta8k.js:34341-34360 placement
var UI_DETACH = "ui_detach";
//@ chunk-z4g2ta8k.js:34360-34525 placement
function detachingClientIdOnFailure(payload, n, r) {
  let s = asPlainObject(payload.request);
  let clientId = s?.client_id;
  return (n === "below_floor" || n === "unreadable_policy") &&
    s?.subtype === UI_DETACH &&
    typeof clientId === "string" &&
    r.leaves(clientId)
    ? clientId
    : undefined;
}
//@ chunk-z4g2ta8k.js:34525-34751 placement
function attestationCategoryOfRequest(e) {
  switch (e) {
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
function attestationCategoryOfResponse(e) {
  switch (e) {
    case "served_call":
      return "remoteTools";
    case "hook":
      return "hooks";
    case "host_ask":
      return "hostAsks";
  }
}
//@ chunk-z4g2ta8k.js:34872-36382 placement
function judgeDeviceAttestation(e, n, r = DEFAULT_ATTESTATION_CATEGORIES, s = DEFAULT_ATTESTATION_DEPS) {
  let payload = e.payload;
  let y = attestedRequestSubtype(payload);
  if (y !== undefined) {
    if (!r[attestationCategoryOfRequest(y)])
      return {
        kind: "pass",
      };
    let { verdict, status } = judgeDeviceAttestationLevel(e);
    if (y === "ui_surface") {
      let T =
        e.source === "client"
          ? judgeAttestationStanding(e.device_attestation_status, s.policy)
          : "not_client_written";
      if (T === "stands")
        return {
          kind: "pass",
        };
      if (T === "observed_below_floor")
        return {
          kind: "observe_surface_request",
          status,
        };
      let controlRequestSubtype = getControlRequestSubtype_2(payload);
      let z = detachingClientIdOnFailure(payload, T, s);
      return z !== undefined && controlRequestSubtype !== undefined
        ? {
            kind: "admit_leaving",
            requestId: controlRequestSubtype,
            clientId: z,
            status,
          }
        : {
            kind: "refuse_surface_request",
            requestId: controlRequestSubtype,
            wireSubtype: String(asPlainObject(payload.request)?.subtype),
            status,
            refusal: T,
          };
    }
    if (verdict === "pass")
      return {
        kind: "pass",
      };
    let M = y === "apply_flag_settings" ? useSettings(payload) : undefined;
    return M !== undefined
      ? {
          kind: "strip_forwarded_plugins",
          requestId: getControlRequestSubtype_2(payload),
          status,
          remainder: M,
        }
      : {
          kind: "refuse_request",
          subtype: y,
          status,
        };
  }
  let controlResponse = extractControlResponse(payload);
  let k = controlResponse === undefined ? undefined : n(controlResponse);
  if (controlResponse === undefined || k === undefined || !r[attestationCategoryOfResponse(k)])
    return {
      kind: "pass",
    };
  let { verdict, status } = dropServiceVouchedAttestation(e);
  if (k === "host_ask") {
    let x =
      e.source === "client"
        ? judgeAttestationStanding(e.device_attestation_status, s.policy)
        : "not_client_written";
    let U = x === "stands" || x === "observed_below_floor" ? undefined : x;
    let M =
      U === undefined
        ? frameAgeVerdict(
            {
              createdAt: controlResponseCreatedAt(e),
              sessionWriters: s.sessionWriters,
            },
            s.now(),
          )
        : undefined;
    let T = U ?? M;
    return T === undefined
      ? {
          kind: "pass",
        }
      : {
          kind: "drop_answer",
          requestId: controlResponse,
          answers: k,
          status,
          why: T,
        };
  }
  if (verdict === "pass") {
    let x = asPlainObject(asPlainObject(payload.response)?.response);
    if (x !== undefined && SENDER_BELOW_FLOOR in x) delete x[SENDER_BELOW_FLOOR];
    return {
      kind: "pass",
    };
  }
  let A = k === "served_call" ? unverifiedRefusalResult(payload) : undefined;
  return A === undefined
    ? {
        kind: "drop_answer",
        requestId: controlResponse,
        answers: k,
        status,
      }
    : {
        kind: "admit_refusal",
        requestId: controlResponse,
        status,
        result: A,
      };
}
//@ chunk-z4g2ta8k.js:36382-36537 placement
function controlResponseCreatedAt(e) {
  let n =
    e.event_type === "control_response" && typeof e.created_at === "string"
      ? Date.parse(e.created_at)
      : Number.NaN;
  return Number.isNaN(n) ? undefined : n;
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
