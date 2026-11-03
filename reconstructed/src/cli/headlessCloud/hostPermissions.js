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
import { randomUUID } from "crypto";
import { parseToolHostStatus } from "./attachServe.js";
import {
  hostConsentToMode,
  isLaunchConsentBlocked,
  storedForwardMode,
} from "../../utils/teleport/homeSettingsMode.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { canForwardHomeSettings } from "../../services/analytics/violinGates.js";
import { getStartupModeTelemetry, getAutoSeedFactors } from "../../utils/permissions/permissionSetup.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import {
  isRestrictedModelAllowed,
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
import { UserDialogResponseSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { StreamClosedAbortError, AbortError, errorMessage } from "../../utils/errors.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
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
function isConnectedAndResumed(toolHostStatus) {
  return toolHostStatus?.state === "connected" && toolHostStatus.resumed_at != null;
}
//@ chunk-fe6rs39h.js:36682-36750 placement
function isSameDevice(boundDeviceUuid, n) {
  return boundDeviceUuid?.toLowerCase() === n.deviceId.toLowerCase();
}
//@ chunk-fe6rs39h.js:36750-37828 placement
/**
 * 根据启动参数、宿主设置与权限模式拼出云会话创建/附加时转发的配置（模型、权限、子进程环境）。
 */
function buildCloudCreateOptions(
  e,
  {
    settingsToCloudEnabled,
    launchConsent = hostConsentToMode(e.homeSettingsConsent),
    settings,
    hostFillsDefault,
    typedLevel,
    carriedMode,
    model = getMainLoopModel(),
    settingsNeverForwarded = false,
  },
  k = {},
) {
  let I =
    canForwardHomeSettings(settingsToCloudEnabled) &&
    e.forwardHomeSettings !== false &&
    !isLaunchConsentBlocked(launchConsent) &&
    (launchConsent !== undefined || storedForwardMode() === "forward");
  let startupModeTelemetry = getStartupModeTelemetry({
    gateOn: I,
    permissionModeTyped: e.permissionModeCli !== undefined,
    dangerouslySkipPermissions: false,
    scrubbed: isScrubEnabled(),
    settings,
    effort: undefined,
  });
  let P = (k.internalModel ?? isRestrictedModelAllowed)(model);
  let N = cloudPermissionModeFrom(e.permissionModeCli);
  let L = describeSelfHostedModeNotice({
    model,
    internal: P,
    explicitMode: N,
    droppedMode: e.permissionModeCli !== undefined && N === undefined,
    pinnedDefault: hostFillsDefault && e.permissionModeCli !== PERMISSION_MODE_MANUAL_ALIAS,
    settingsMode: startupModeTelemetry.settingsDefault,
    settingsModeForwardable: I,
    settingsNeverForwarded,
    ...getAutoSeedFactors({
      settings,
      scrubbed: isScrubEnabled(),
      typedLevel,
      carriedMode,
    }),
    repositoryModel: P
      ? (k.repositoryModel ?? resolveStartupModel)({
          model,
          modelCli: e.modelCli,
          agent: e.mainThreadAgentDefinition,
          agentSelectedByCli: e.agentCli !== undefined,
          agents: e.agentDefinitions.allAgents,
          effectiveModel: e.effectiveModel,
          initialMainLoopModel: e.initialMainLoopModel,
          restrictedModel: e.restrictedModel,
        })
      : undefined,
  });
  return {
    model,
    explicitMode: N,
    ...L,
  };
}
//@ chunk-fe6rs39h.js:37828-38193 placement
function buildInitialMessageOptions(e) {
  let n = e.poolOnBranch ?? e.poolRef ?? undefined;
  return {
    initialMessage: e.prompt,
    initialMessageUuid: e.promptUuid,
    signal: e.signal,
    source: "remote",
    branchName: (n ?? e.currentBranch) || undefined,
    branchFromHead: n === undefined,
    title: e.title,
    reuseOutcomeBranch: e.poolOnBranch ?? undefined,
    explicitRef: n,
    permissionMode: e.permissionMode,
    model: e.model,
    allowBundle: true,
    staysAttached: false,
  };
}
//@ chunk-fe6rs39h.js:38267-38355 placement
var FINAL_ANSWER_STATES = new Set(["answered", "failed_host_error", "failed_invalid_reply", "answer_failed"]);
//@ chunk-fe6rs39h.js:38355-38390 placement
function truncateForDisplay(requestId) {
  return sanitizeCloudText(truncateToLength(requestId, 64));
}
//@ chunk-fe6rs39h.js:38390-41184 placement
/**
 * 把云会话 worker 发来的 can_use_tool / 对话请求转给 SDK 宿主回答，处理重复 request_id、重问与撤回。
 */
class HostPermissionBridge {
  ports;
  inFlight = new Map();
  askedOfHost = new Set();
  reaskGeneration = new Map();
  derivedIds = new Set();
  retiredIds = new Set();
  settledTotal = 0;
  tearingDown = false;
  constructor(ports) {
    this.ports = ports;
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
      ask: (signal, requestId) =>
        this.ports.io.passControlRequestToHost(n, {
          requestId,
          schema: permissionPromptResultSchemaRefusing(),
          signal,
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
      ask: (signal, requestId) =>
        this.ports.io.passControlRequestToHost(n, {
          requestId,
          schema: UserDialogResponseSchema(),
          signal,
        }),
      answer: (r) => e.respondToUserDialogRequest(s, r),
      answerOnError: () =>
        e.respondToUserDialogRequest(s, {
          behavior: "cancelled",
        }),
    });
  }
  cancel(e) {
    this.retiredIds.add(e);
    this.inFlight.get(e)?.abort();
  }
  reinstate(e) {
    this.retiredIds.delete(e);
    if (this.inFlight.get(e)?.signal.aborted === true) this.inFlight.delete(e);
    if (this.askedOfHost.has(e)) this.reaskGeneration.set(e, (this.reaskGeneration.get(e) ?? 0) + 1);
  }
  cancelAll() {
    this.tearingDown = true;
    for (let e of this.inFlight.values()) e.abort();
  }
  pass({ subtype, requestId, ask, answer, answerOnError }) {
    if (this.tearingDown) {
      this.log(subtype, "teardown", this.ports.clock.now());
      return false;
    }
    if (this.inFlight.has(requestId)) {
      this.log(subtype, "duplicate_ignored", this.ports.clock.now());
      return false;
    }
    if (this.retiredIds.has(requestId) || this.derivedIds.has(requestId)) {
      logForDebugging(
        `[headlessCloudClient] agent ${subtype} reuses finished request_id ${truncateForDisplay(requestId)}; not passed to the host again`,
        {
          level: "warn",
        },
      );
      this.log(subtype, "reused_id_ignored", this.ports.clock.now());
      return false;
    }
    let abortController = new AbortController();
    this.inFlight.set(requestId, abortController);
    let S = this.reaskGeneration.get(requestId);
    let w = S === undefined ? requestId : `${requestId}-reask-${S}-${randomUUID()}`;
    if (S === undefined) this.askedOfHost.add(requestId);
    else this.derivedIds.add(w);
    let R = () => this.inFlight.get(requestId) === abortController && this.inFlight.delete(requestId);
    let k = this.ports.clock.now();
    let I = false;
    let O = (P) => {
      I = true;
      this.settledTotal += 1;
      if (FINAL_ANSWER_STATES.has(P)) this.retiredIds.add(requestId);
      this.log(subtype, P, k, S !== undefined);
    };
    this.ports.track(
      ask(abortController.signal, w)
        .then(
          (P) => {
            if (!R() || abortController.signal.aborted) {
              O("dropped");
              return;
            }
            answer(P);
            O("answered");
          },
          (error) => {
            let N = R();
            if (error instanceof StreamClosedAbortError) {
              O("stream_closed");
              return;
            }
            if (error instanceof AbortError) {
              O(!abortController.signal.aborted ? "dropped" : this.tearingDown ? "teardown" : "cancelled");
              return;
            }
            if (!N || abortController.signal.aborted) {
              O("dropped");
              return;
            }
            let L = !(error instanceof Error) || error instanceof ZodError;
            let z = L
              ? truncateToLength(errorMessage(error), 2000)
              : truncateToLength(getFirstLine(errorMessage(error)), 200);
            logForDebugging(
              `[headlessCloudClient] host could not answer ${subtype} ${truncateForDisplay(requestId)}: ${z}`,
              {
                level: "error",
              },
            );
            answerOnError(L);
            O(L ? "failed_invalid_reply" : "failed_host_error");
          },
        )
        .catch((error) => {
          logError(error);
          if (!I) O("answer_failed");
        }),
    );
    return true;
  }
  log(e, n, s, reasked = false) {
    logEvent("tengu_remote_headless_client_agent_request", {
      subtype: fromEnum(e),
      outcome: fromEnum(n),
      latency_ms: this.ports.clock.now() - s,
      reasked,
    });
  }
}
//@ chunk-fe6rs39h.js:41184-41526 placement
function completeHostAllow(e, n) {
  let toolUseID = n.tool_use_id ?? e.toolUseID;
  if (e.behavior === "deny")
    return {
      ...e,
      toolUseID,
    };
  let h = !(e.updatedInput !== undefined && Object.keys(e.updatedInput).length > 0) && isPlainObject(n.input);
  if (h) logForDebugging("[headlessCloudClient] completing the host's allow with the shown input");
  return {
    ...e,
    toolUseID,
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
