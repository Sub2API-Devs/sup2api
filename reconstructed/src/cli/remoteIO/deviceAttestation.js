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
import { attestedRequestSubtype, Zt, judgeDeviceAttestationLevel } from "./turnHandoff.js";
import { extractControlResponse } from "../../entrypoints/sdk/controlSchemas.js";
import { normalizeAttestationStatus } from "../../bridge/deviceAttestation.js";
import { resolveEffectiveAttestation } from "../../bridge/attestationGate.js";
import { Re, unverifiedRefusalResult } from "./servedCalls.js";
import { getControlRequestSubtype as getControlRequestSubtype_2 } from "../../bridge/controlRequests.js";
import { useSettings } from "../../hooks/useSettings.js";
import { frameAgeVerdict } from "../sdkMcpManifests.js";
import { SENDER_BELOW_FLOOR } from "../../remote/tools/protocolSchemas.js";

/**
 * 判断一条入站帧是否落在需要设备证明的类别上（远程工具、钩子、插件、主机询问、界面），按 control_request 子类型或 control_response 对应的请求类别查表。
 */
//@ chunk-z4g2ta8k.js:33187-33316 placement
function isAttestationGatedFrame(e, n, r = DEFAULT_ATTESTATION_CATEGORIES) {
  let s = attestedRequestSubtype(e);
  if (s !== void 0) return r[attestationCategoryOfRequest(s)];
  let h = extractControlResponse(e),
    y = h === void 0 ? void 0 : n(h);
  return y !== void 0 && r[attestationCategoryOfResponse(y)];
}
/**
 * 把入站帧映射为证明裁决后的处理动作：register / template / plugin_patch / answer；远程工具声明和 ui_surface 返回 undefined。
 */
//@ chunk-z4g2ta8k.js:33316-33618 placement
function classifyAttestationAction(e, n) {
  switch (attestedRequestSubtype(e)) {
    case "register_device_hooks":
      return "register";
    case "upload_device_hook_template":
      return "template";
    case "apply_flag_settings":
      return "plugin_patch";
    case "remote_tools_announce":
    case "ui_surface":
      return;
    case void 0: {
      let r = extractControlResponse(e);
      return r !== void 0 && n(r) === "hook" ? "answer" : void 0;
    }
  }
}
//@ chunk-z4g2ta8k.js:33618-33699 placement
var nn = { register: "hooks", template: "hooks", answer: "hooks", plugin_patch: "plugins" };
/**
 * 按 tn 给出的动作选裁决函数：answer 走 Zt，注册/模板/插件补丁走 ut（设备证明等级检查）。
 */
//@ chunk-z4g2ta8k.js:33699-33815 placement
function judgeAttestationAction(e, n) {
  switch (e) {
    case "answer":
      return Zt(n);
    case "register":
    case "template":
    case "plugin_patch":
      return judgeDeviceAttestationLevel(n);
  }
}
//@ chunk-z4g2ta8k.js:33815-34030 placement
var DEFAULT_ATTESTATION_CATEGORIES = { remoteTools: !0, hooks: !0, plugins: !0, hostAsks: !0, surfaces: !0 },
  ACCEPTED_ATTESTATION_STATUSES = new Set([
    "ABSENT",
    "VERIFIED",
    "VERIFIED_KEYLESS_DEVICE",
    "VERIFIED_BY_GATE",
  ]),
  DEFAULT_ATTESTATION_DEPS = { policy: void 0, leaves: () => !1, sessionWriters: void 0, now: Date.now };
/**
 * 根据设备证明状态和策略给出结论：未接受的状态、无策略（stands）、策略不可读、低于下限（强制时 below_floor，否则 observed_below_floor）。
 */
//@ chunk-z4g2ta8k.js:34030-34341 placement
function judgeAttestationStanding(e, n) {
  let r = normalizeAttestationStatus(e);
  if (!(e === void 0 || e === null) && !ACCEPTED_ATTESTATION_STATUSES.has(r)) return "unaccepted_status";
  if (n === void 0) return "stands";
  if (n === "unreadable") return "unreadable_policy";
  let { meetsLevel: meetsLevel, configException: configException } = resolveEffectiveAttestation(r, n, {
    isCloudWorker: !0,
  });
  if (meetsLevel || configException) return "stands";
  return n.enforce ? "below_floor" : "observed_below_floor";
}
//@ chunk-z4g2ta8k.js:34341-34360 placement
var UI_DETACH = "ui_detach";
//@ chunk-z4g2ta8k.js:34360-34525 placement
function detachingClientIdOnFailure(e, n, r) {
  let s = Re(e.request),
    h = s?.client_id;
  return (n === "below_floor" || n === "unreadable_policy") &&
    s?.subtype === UI_DETACH &&
    typeof h === "string" &&
    r.leaves(h)
    ? h
    : void 0;
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
  let payload = e.payload,
    y = attestedRequestSubtype(payload);
  if (y !== void 0) {
    if (!r[attestationCategoryOfRequest(y)]) return { kind: "pass" };
    let { verdict: verdict, status: status } = judgeDeviceAttestationLevel(e);
    if (y === "ui_surface") {
      let T =
        e.source === "client"
          ? judgeAttestationStanding(e.device_attestation_status, s.policy)
          : "not_client_written";
      if (T === "stands") return { kind: "pass" };
      if (T === "observed_below_floor") return { kind: "observe_surface_request", status: status };
      let q = getControlRequestSubtype_2(payload),
        z = detachingClientIdOnFailure(payload, T, s);
      return z !== void 0 && q !== void 0
        ? { kind: "admit_leaving", requestId: q, clientId: z, status: status }
        : {
            kind: "refuse_surface_request",
            requestId: q,
            wireSubtype: String(Re(payload.request)?.subtype),
            status: status,
            refusal: T,
          };
    }
    if (verdict === "pass") return { kind: "pass" };
    let M = y === "apply_flag_settings" ? useSettings(payload) : void 0;
    return M !== void 0
      ? {
          kind: "strip_forwarded_plugins",
          requestId: getControlRequestSubtype_2(payload),
          status: status,
          remainder: M,
        }
      : { kind: "refuse_request", subtype: y, status: status };
  }
  let S = extractControlResponse(payload),
    k = S === void 0 ? void 0 : n(S);
  if (S === void 0 || k === void 0 || !r[attestationCategoryOfResponse(k)]) return { kind: "pass" };
  let { verdict: verdict, status: status } = Zt(e);
  if (k === "host_ask") {
    let x =
        e.source === "client"
          ? judgeAttestationStanding(e.device_attestation_status, s.policy)
          : "not_client_written",
      U = x === "stands" || x === "observed_below_floor" ? void 0 : x,
      M =
        U === void 0
          ? frameAgeVerdict(
              { createdAt: controlResponseCreatedAt(e), sessionWriters: s.sessionWriters },
              s.now(),
            )
          : void 0,
      T = U ?? M;
    return T === void 0
      ? { kind: "pass" }
      : { kind: "drop_answer", requestId: S, answers: k, status: status, why: T };
  }
  if (verdict === "pass") {
    let x = Re(Re(payload.response)?.response);
    if (x !== void 0 && SENDER_BELOW_FLOOR in x) delete x[SENDER_BELOW_FLOOR];
    return { kind: "pass" };
  }
  let A = k === "served_call" ? unverifiedRefusalResult(payload) : void 0;
  return A === void 0
    ? { kind: "drop_answer", requestId: S, answers: k, status: status }
    : { kind: "admit_refusal", requestId: S, status: status, result: A };
}
//@ chunk-z4g2ta8k.js:36382-36537 placement
function controlResponseCreatedAt(e) {
  let n =
    e.event_type === "control_response" && typeof e.created_at === "string"
      ? Date.parse(e.created_at)
      : Number.NaN;
  return Number.isNaN(n) ? void 0 : n;
}

export {
  UI_DETACH,
  judgeAttestationStanding,
  isAttestationGatedFrame,
  judgeDeviceAttestation,
  classifyAttestationAction,
  judgeAttestationAction,
  nn,
};
