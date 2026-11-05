/**
 * cli/headlessCloud/hostPermissions.ts
 *
 * 2.1.316 新增：无头云会话的宿主权限桥：拼创建选项、初始消息与宿主允许。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-keyy05re.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-keyy05re.js:36767-36901 placement
async function isServingConnected(args) {
  let session = await args.readSession().catch(() => {
    return;
  });
  return (
    isConnectedAndResumed(parseToolHostStatus(session?.tool_host_status, args)) &&
    isSameDevice(session?.bound_device_uuid, args)
  );
}
//@ chunk-keyy05re.js:36901-36966 placement
function isConnectedAndResumed(toolHostStatus) {
  return toolHostStatus?.state === "connected" && toolHostStatus.resumed_at != null;
}
//@ chunk-keyy05re.js:36966-37034 placement
function isSameDevice(boundDeviceUuid, uuid) {
  return boundDeviceUuid?.toLowerCase() === uuid.deviceId.toLowerCase();
}
//@ chunk-keyy05re.js:37034-38112 placement
/**
 * 根据启动参数、宿主设置与权限模式拼出云会话创建/附加时转发的配置（模型、权限、子进程环境）。
 */
function buildCloudCreateOptions(
  options,
  {
    settingsToCloudEnabled,
    launchConsent = hostConsentToMode(options.homeSettingsConsent),
    settings,
    hostFillsDefault,
    typedLevel,
    carriedMode,
    model = getMainLoopModel(),
    settingsNeverForwarded = false,
  },
  implied = {},
) {
  let gateOn =
    canForwardHomeSettings(settingsToCloudEnabled) &&
    options.forwardHomeSettings !== false &&
    !isLaunchConsentBlocked(launchConsent) &&
    (launchConsent !== undefined || storedForwardMode() === "forward");
  let startupModeTelemetry = getStartupModeTelemetry({
    gateOn,
    permissionModeTyped: options.permissionModeCli !== undefined,
    dangerouslySkipPermissions: false,
    scrubbed: isScrubEnabled(),
    settings,
    effort: undefined,
  });
  let internalModel = (implied.internalModel ?? isRestrictedModelAllowed)(model);
  let explicitMode = cloudPermissionModeFrom(options.permissionModeCli);
  let modeInfo = describeSelfHostedModeNotice({
    model,
    internal: internalModel,
    explicitMode,
    droppedMode: options.permissionModeCli !== undefined && explicitMode === undefined,
    pinnedDefault: hostFillsDefault && options.permissionModeCli !== PERMISSION_MODE_MANUAL_ALIAS,
    settingsMode: startupModeTelemetry.settingsDefault,
    settingsModeForwardable: gateOn,
    settingsNeverForwarded,
    ...getAutoSeedFactors({
      settings,
      scrubbed: isScrubEnabled(),
      typedLevel,
      carriedMode,
    }),
    repositoryModel: internalModel
      ? (implied.repositoryModel ?? resolveStartupModel)({
          model,
          modelCli: options.modelCli,
          agent: options.mainThreadAgentDefinition,
          agentSelectedByCli: options.agentCli !== undefined,
          agents: options.agentDefinitions.allAgents,
          effectiveModel: options.effectiveModel,
          initialMainLoopModel: options.initialMainLoopModel,
          restrictedModel: options.restrictedModel,
        })
      : undefined,
  });
  return {
    model,
    explicitMode,
    ...modeInfo,
  };
}
//@ chunk-keyy05re.js:38112-38477 placement
function buildInitialMessageOptions(openArgs) {
  let branch = openArgs.poolOnBranch ?? openArgs.poolRef ?? undefined;
  return {
    initialMessage: openArgs.prompt,
    initialMessageUuid: openArgs.promptUuid,
    signal: openArgs.signal,
    source: "remote",
    branchName: (branch ?? openArgs.currentBranch) || undefined,
    branchFromHead: branch === undefined,
    title: openArgs.title,
    reuseOutcomeBranch: openArgs.poolOnBranch ?? undefined,
    explicitRef: branch,
    permissionMode: openArgs.permissionMode,
    model: openArgs.model,
    allowBundle: true,
    staysAttached: false,
  };
}
//@ chunk-keyy05re.js:38551-38639 placement
var FINAL_ANSWER_STATES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-keyy05re.js:38551", () => {
  FINAL_ANSWER_STATES = new Set(["answered", "failed_host_error", "failed_invalid_reply", "answer_failed"]);
});
//@ chunk-keyy05re.js:38639-38673 placement
function truncateForDisplay(requestId) {
  return sanitizeCloudText(truncateToLength(requestId, 64));
}
//@ chunk-keyy05re.js:38673-41465 placement
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
  passPermissionRequest(request, context, requestId) {
    return this.pass({
      subtype: "can_use_tool",
      requestId,
      ask: (signal, requestId) =>
        this.ports.io.passControlRequestToHost(context, {
          requestId,
          schema: permissionPromptResultSchemaRefusing(),
          signal,
        }),
      answer: (signal) => request.respondToPermissionRequest(requestId, completeHostAllow(signal, context)),
      answerOnError: (answer) =>
        request.respondToPermissionRequest(requestId, {
          behavior: "deny",
          message: answer ? CAN_USE_TOOL_INVALID_RESULT_REASON : CAN_USE_TOOL_REQUEST_FAILED_REASON,
          toolUseID: context.tool_use_id,
        }),
    });
  }
  passUserDialogRequest(request, context, requestId) {
    this.pass({
      subtype: "request_user_dialog",
      requestId,
      ask: (signal, requestId) =>
        this.ports.io.passControlRequestToHost(context, {
          requestId,
          schema: UserDialogResponseSchema(),
          signal,
        }),
      answer: (signal) => request.respondToUserDialogRequest(requestId, signal),
      answerOnError: () =>
        request.respondToUserDialogRequest(requestId, {
          behavior: "cancelled",
        }),
    });
  }
  cancel(answer) {
    this.retiredIds.add(answer);
    this.inFlight.get(answer)?.abort();
  }
  reinstate(requestId) {
    this.retiredIds.delete(requestId);
    if (this.inFlight.get(requestId)?.signal.aborted === true) this.inFlight.delete(requestId);
    if (this.askedOfHost.has(requestId))
      this.reaskGeneration.set(requestId, (this.reaskGeneration.get(requestId) ?? 0) + 1);
  }
  cancelAll() {
    this.tearingDown = true;
    for (let requestId of this.inFlight.values()) requestId.abort();
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
    let controller = this.reaskGeneration.get(requestId);
    let reask = controller === undefined ? requestId : `${requestId}-reask-${controller}-${randomUUID()}`;
    if (controller === undefined) this.askedOfHost.add(requestId);
    else this.derivedIds.add(reask);
    let hostRequestId = () =>
      this.inFlight.get(requestId) === abortController && this.inFlight.delete(requestId);
    let forget = this.ports.clock.now();
    let startedAt = false;
    let didFinish = (finish) => {
      startedAt = true;
      this.settledTotal += 1;
      if (FINAL_ANSWER_STATES.has(finish)) this.retiredIds.add(requestId);
      this.log(subtype, finish, forget, controller !== undefined);
    };
    this.ports.track(
      ask(abortController.signal, reask)
        .then(
          (outcome) => {
            if (!hostRequestId() || abortController.signal.aborted) {
              didFinish("dropped");
              return;
            }
            answer(outcome);
            didFinish("answered");
          },
          (error) => {
            let stillLive = hostRequestId();
            if (error instanceof StreamClosedAbortError) {
              didFinish("stream_closed");
              return;
            }
            if (error instanceof AbortError) {
              didFinish(
                !abortController.signal.aborted ? "dropped" : this.tearingDown ? "teardown" : "cancelled",
              );
              return;
            }
            if (!stillLive || abortController.signal.aborted) {
              didFinish("dropped");
              return;
            }
            let wasLive = !(error instanceof Error) || error instanceof ZodError;
            let errorText = wasLive
              ? truncateToLength(errorMessage(error), 2000)
              : truncateToLength(getFirstLine(errorMessage(error)), 200);
            logForDebugging(
              `[headlessCloudClient] host could not answer ${subtype} ${truncateForDisplay(requestId)}: ${errorText}`,
              {
                level: "error",
              },
            );
            answerOnError(wasLive);
            didFinish(wasLive ? "failed_invalid_reply" : "failed_host_error");
          },
        )
        .catch((error) => {
          logError(error);
          if (!startedAt) didFinish("answer_failed");
        }),
    );
    return true;
  }
  log(error, subtype, outcome, reasked = false) {
    logEvent("tengu_remote_headless_client_agent_request", {
      subtype: fromEnum(error),
      outcome: fromEnum(subtype),
      latency_ms: this.ports.clock.now() - outcome,
      reasked,
    });
  }
}
//@ chunk-keyy05re.js:41465-41807 placement
function completeHostAllow(result, context) {
  let toolUseID = context.tool_use_id ?? result.toolUseID;
  if (result.behavior === "deny")
    return {
      ...result,
      toolUseID,
    };
  let toolUseId =
    !(result.updatedInput !== undefined && Object.keys(result.updatedInput).length > 0) &&
    isPlainObject(context.input);
  if (toolUseId) logForDebugging("[headlessCloudClient] completing the host's allow with the shown input");
  return {
    ...result,
    toolUseID,
    updatedInput: toolUseId ? stripHostOwnedInputKeys(context.tool_name, context.input) : result.updatedInput,
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
