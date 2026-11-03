/**
 * cli/headlessCloud/hostPermissions.ts
 *
 * 2.1.316 新增：无头云会话的宿主权限桥：拼创建选项、初始消息与宿主允许。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (9)
 * attribution: placement 9
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
import { parseToolHostStatus } from "./attachServe.js";
import { kBo, oN, mwt } from "../../utils/teleport/homeSettingsMode.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { canForwardHomeSettings } from "../../services/analytics/violinGates.js";
import { getStartupModeTelemetry, getAutoSeedFactors } from "../../utils/permissions/permissionSetup.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import {
  RZt,
  describeSelfHostedModeNotice,
  resolveStartupModel,
} from "../../utils/model/startupModelResolution.js";
import { cloudPermissionModeFrom } from "../cloudSession/launchFlags.js";
import {
  PERMISSION_MODE_MANUAL_ALIAS,
  CAN_USE_TOOL_INVALID_RESULT_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_REASON,
} from "../../types/permissions.js";
import { sanitizeCloudText } from "../cloudSession/headlessCloudClient.js";
import { truncateToLength, getFirstLine } from "../../utils/stringUtils.js";
import { permissionPromptResultSchemaRefusing } from "../../utils/permissions/PermissionPromptToolResultSchema.js";
import { Uxn } from "../../entrypoints/sdk/controlSchemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { StreamClosedAbortError, AbortError, errorMessage } from "../../utils/errors.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { stripHostOwnedInputKeys } from "../../utils/permissions/permissionAnswer.js";

//@ chunk-fe6rs39h.js:36483-36617 placement
async function isServingConnected(e) {
  let n = await e.readSession().catch(() => {
    return;
  });
  return (
    isConnectedAndResumed(parseToolHostStatus(n?.tool_host_status, e)) &&
    isSameDevice(n?.bound_device_uuid, e)
  );
}
//@ chunk-fe6rs39h.js:36617-36682 placement
function isConnectedAndResumed(e) {
  return e?.state === "connected" && e.resumed_at != null;
}
//@ chunk-fe6rs39h.js:36682-36750 placement
function isSameDevice(e, n) {
  return e?.toLowerCase() === n.deviceId.toLowerCase();
}
/**
 * 根据启动参数、宿主设置与权限模式拼出云会话创建/附加时转发的配置（模型、权限、子进程环境）。
 */
//@ chunk-fe6rs39h.js:36750-37828 placement
function buildCloudCreateOptions(
  e,
  {
    settingsToCloudEnabled: settingsToCloudEnabled,
    launchConsent: launchConsent = kBo(e.homeSettingsConsent),
    settings: settings,
    hostFillsDefault: hostFillsDefault,
    typedLevel: typedLevel,
    carriedMode: carriedMode,
    model: model = getMainLoopModel(),
    settingsNeverForwarded: settingsNeverForwarded = !1,
  },
  k = {},
) {
  let I =
      canForwardHomeSettings(settingsToCloudEnabled) &&
      e.forwardHomeSettings !== !1 &&
      !oN(launchConsent) &&
      (launchConsent !== void 0 || mwt() === "forward"),
    O = getStartupModeTelemetry({
      gateOn: I,
      permissionModeTyped: e.permissionModeCli !== void 0,
      dangerouslySkipPermissions: !1,
      scrubbed: isScrubEnabled(),
      settings: settings,
      effort: void 0,
    }),
    P = (k.internalModel ?? RZt)(model),
    N = cloudPermissionModeFrom(e.permissionModeCli),
    L = describeSelfHostedModeNotice({
      model: model,
      internal: P,
      explicitMode: N,
      droppedMode: e.permissionModeCli !== void 0 && N === void 0,
      pinnedDefault: hostFillsDefault && e.permissionModeCli !== PERMISSION_MODE_MANUAL_ALIAS,
      settingsMode: O.settingsDefault,
      settingsModeForwardable: I,
      settingsNeverForwarded: settingsNeverForwarded,
      ...getAutoSeedFactors({
        settings: settings,
        scrubbed: isScrubEnabled(),
        typedLevel: typedLevel,
        carriedMode: carriedMode,
      }),
      repositoryModel: P
        ? (k.repositoryModel ?? resolveStartupModel)({
            model: model,
            modelCli: e.modelCli,
            agent: e.mainThreadAgentDefinition,
            agentSelectedByCli: e.agentCli !== void 0,
            agents: e.agentDefinitions.allAgents,
            effectiveModel: e.effectiveModel,
            initialMainLoopModel: e.initialMainLoopModel,
            restrictedModel: e.restrictedModel,
          })
        : void 0,
    });
  return { model: model, explicitMode: N, ...L };
}
//@ chunk-fe6rs39h.js:37828-38193 placement
function buildInitialMessageOptions(e) {
  let n = e.poolOnBranch ?? e.poolRef ?? void 0;
  return {
    initialMessage: e.prompt,
    initialMessageUuid: e.promptUuid,
    signal: e.signal,
    source: "remote",
    branchName: (n ?? e.currentBranch) || void 0,
    branchFromHead: n === void 0,
    title: e.title,
    reuseOutcomeBranch: e.poolOnBranch ?? void 0,
    explicitRef: n,
    permissionMode: e.permissionMode,
    model: e.model,
    allowBundle: !0,
    staysAttached: !1,
  };
}
//@ chunk-fe6rs39h.js:38267-38355 placement
var FINAL_ANSWER_STATES = new Set(["answered", "failed_host_error", "failed_invalid_reply", "answer_failed"]);
//@ chunk-fe6rs39h.js:38355-38390 placement
function truncateForDisplay(e) {
  return sanitizeCloudText(truncateToLength(e, 64));
}
/**
 * 把云会话 worker 发来的 can_use_tool / 对话请求转给 SDK 宿主回答，处理重复 request_id、重问与撤回。
 */
//@ chunk-fe6rs39h.js:38390-41184 placement
class HostPermissionBridge {
  ports;
  inFlight = new Map();
  askedOfHost = new Set();
  reaskGeneration = new Map();
  derivedIds = new Set();
  retiredIds = new Set();
  settledTotal = 0;
  tearingDown = !1;
  constructor(e) {
    this.ports = e;
  }
  get pendingCount() {
    return this.inFlight.size;
  }
  get settledCount() {
    return this.settledTotal;
  }
  passPermissionRequest(e, n, s) {
    return this.pass({
      subtype: "can_use_tool",
      requestId: s,
      ask: (r, h) =>
        this.ports.io.passControlRequestToHost(n, {
          requestId: h,
          schema: permissionPromptResultSchemaRefusing(),
          signal: r,
        }),
      answer: (r) => e.respondToPermissionRequest(s, completeHostAllow(r, n)),
      answerOnError: (r) =>
        e.respondToPermissionRequest(s, {
          behavior: "deny",
          message: r ? CAN_USE_TOOL_INVALID_RESULT_REASON : CAN_USE_TOOL_REQUEST_FAILED_REASON,
          toolUseID: n.tool_use_id,
        }),
    });
  }
  passUserDialogRequest(e, n, s) {
    this.pass({
      subtype: "request_user_dialog",
      requestId: s,
      ask: (r, h) => this.ports.io.passControlRequestToHost(n, { requestId: h, schema: Uxn(), signal: r }),
      answer: (r) => e.respondToUserDialogRequest(s, r),
      answerOnError: () => e.respondToUserDialogRequest(s, { behavior: "cancelled" }),
    });
  }
  cancel(e) {
    (this.retiredIds.add(e), this.inFlight.get(e)?.abort());
  }
  reinstate(e) {
    if ((this.retiredIds.delete(e), this.inFlight.get(e)?.signal.aborted === !0)) this.inFlight.delete(e);
    if (this.askedOfHost.has(e)) this.reaskGeneration.set(e, (this.reaskGeneration.get(e) ?? 0) + 1);
  }
  cancelAll() {
    this.tearingDown = !0;
    for (let e of this.inFlight.values()) e.abort();
  }
  pass({ subtype: e, requestId: n, ask: s, answer: r, answerOnError: h }) {
    if (this.tearingDown) return (this.log(e, "teardown", this.ports.clock.now()), !1);
    if (this.inFlight.has(n)) return (this.log(e, "duplicate_ignored", this.ports.clock.now()), !1);
    if (this.retiredIds.has(n) || this.derivedIds.has(n))
      return (
        logForDebugging(
          `[headlessCloudClient] agent ${e} reuses finished request_id ${truncateForDisplay(n)}; not passed to the host again`,
          { level: "warn" },
        ),
        this.log(e, "reused_id_ignored", this.ports.clock.now()),
        !1
      );
    let abortController = new AbortController();
    this.inFlight.set(n, abortController);
    let S = this.reaskGeneration.get(n),
      w = S === void 0 ? n : `${n}-reask-${S}-${randomUUID_3()}`;
    if (S === void 0) this.askedOfHost.add(n);
    else this.derivedIds.add(w);
    let R = () => this.inFlight.get(n) === abortController && this.inFlight.delete(n),
      now = this.ports.clock.now(),
      I = !1,
      O = (P) => {
        if (((I = !0), (this.settledTotal += 1), FINAL_ANSWER_STATES.has(P))) this.retiredIds.add(n);
        this.log(e, P, now, S !== void 0);
      };
    return (
      this.ports.track(
        s(abortController.signal, w)
          .then(
            (P) => {
              if (!R() || abortController.signal.aborted) {
                O("dropped");
                return;
              }
              (r(P), O("answered"));
            },
            (P) => {
              let N = R();
              if (P instanceof StreamClosedAbortError) {
                O("stream_closed");
                return;
              }
              if (P instanceof AbortError) {
                O(!abortController.signal.aborted ? "dropped" : this.tearingDown ? "teardown" : "cancelled");
                return;
              }
              if (!N || abortController.signal.aborted) {
                O("dropped");
                return;
              }
              let L = !(P instanceof Error) || P instanceof kR,
                z = L
                  ? truncateToLength(errorMessage(P), 2000)
                  : truncateToLength(getFirstLine(errorMessage(P)), 200);
              (logForDebugging(
                `[headlessCloudClient] host could not answer ${e} ${truncateForDisplay(n)}: ${z}`,
                { level: "error" },
              ),
                h(L),
                O(L ? "failed_invalid_reply" : "failed_host_error"));
            },
          )
          .catch((P) => {
            if ((logError(P), !I)) O("answer_failed");
          }),
      ),
      !0
    );
  }
  log(e, n, s, r = !1) {
    logEvent("tengu_remote_headless_client_agent_request", {
      subtype: fromEnum(e),
      outcome: fromEnum(n),
      latency_ms: this.ports.clock.now() - s,
      reasked: r,
    });
  }
}
//@ chunk-fe6rs39h.js:41184-41526 placement
function completeHostAllow(e, n) {
  let s = n.tool_use_id ?? e.toolUseID;
  if (e.behavior === "deny") return { ...e, toolUseID: s };
  let h = !(e.updatedInput !== void 0 && Object.keys(e.updatedInput).length > 0) && isPlainObject(n.input);
  if (h) logForDebugging("[headlessCloudClient] completing the host's allow with the shown input");
  return {
    ...e,
    toolUseID: s,
    updatedInput: h ? stripHostOwnedInputKeys(n.tool_name, n.input) : e.updatedInput,
  };
}

export {
  isSameDevice,
  isConnectedAndResumed,
  isServingConnected,
  HostPermissionBridge,
  buildCloudCreateOptions,
  buildInitialMessageOptions,
};
