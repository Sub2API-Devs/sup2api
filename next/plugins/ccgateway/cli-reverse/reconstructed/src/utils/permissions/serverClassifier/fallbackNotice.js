/**
 * utils/permissions/serverClassifier/fallbackNotice.ts
 *
 * 2.1.316 新增：分类器回退提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (40)
 * attribution: placement 40
 */
import { env, antEnv } from "../../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { hasBackgroundBashWork } from "../../../tools/AgentTool/backgroundGates.js";
import { logError } from "../../log.js";
import { endActivity, startSessionActivity } from "../../sessionActivity.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { toError } from "../../errors.js";
import { enqueueTaskNotification } from "../../task/taskNotifications.js";
import {
  getIsNonInteractiveSession,
  takeNoServerCheckAnnouncement,
  takeNoServerCheckStoppedTurn,
  isThirdPartyServerClassifierRefused,
  takeServerClassifierFallbackAnnouncement,
  isDiskless,
  getObservedGateway,
  getGatewayAuth,
  getServerClassifierFallbackChoice,
  clearServerClassifierFallbackChoice,
  setServerClassifierFallbackChoice,
  isSdkDialogHostActive,
  getSdkSupportedDialogKinds,
} from "../../../bootstrap/state.js";
import { logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { getSubscriptionType, isClaudeAISubscriber } from "../../auth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../config.js";
import {
  providerEndpointVariables,
  isProviderServiceUrl,
  getAPIProvider,
  configuredApiProxyHost,
} from "../../model/providers.js";
import { stripNonPrintable } from "../../truncateGraphemes.js";
import { isHostEntrypoint } from "../../entrypointKinds.js";
import { getUserServerClassifierSwitch } from "./flags.js";
import { withHideWhile } from "../../../components/dialogs/dialogRequests.js";
import { AUTO_MODE_SERVER_FALLBACK } from "../../../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, stringSchema, array, _enum } from "../../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  MCP_TOOL_PREFIX,
} from "../../../services/mcp/mcpStringUtils.js";
import { isChromeToolName, isBrowserPreviewToolName } from "../../claudeInChrome/chromeToolNames.js";
import { isAutoClassifierActive } from "../autoModeState.js";
import { isAutoAllowedInMode } from "../browserToolNames.js";
import { isServerArbiterActive } from "./arbiter.js";
import { getAutoModeConfigOrDefault } from "../permissionSetup.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1297550-1297645 placement
var CLASSIFIER_CHECK_HOLD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLASSIFIER_CHECK_HOLD_MS;
var merged;
deferInit("chunk-5xgkngpb.js:1297550", () => {
  CLASSIFIER_CHECK_HOLD = "classifier-check-hold";
  CLASSIFIER_CHECK_HOLD_MS = 1200000;
  merged = Object.assign(() => {}, {
    restartDeadline: () => {},
  });
});
//@ chunk-5xgkngpb.js:1297645-1298137 placement
/**
 * 远程会话开启保活时，在分类器检查期间维持一段会话活动（超时自动结束）；返回结束函数，附带 restartDeadline 以续期。
 */
function startClassifierKeepalive() {
  try {
    if (
      !env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES ||
      (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_classifier_keepalive_enabled", false) &&
        !hasBackgroundBashWork())
    )
      return merged;
  } catch (error) {
    logError(error);
    return merged;
  }
  let active = true;
  let rearmed = false;
  let timer;
  let stop = () => {
    if (!active) return;
    active = false;
    try {
      clearTimeout(timer);
      endActivity("api_call", CLASSIFIER_CHECK_HOLD);
    } catch (error) {
      logError(error);
    }
  };
  let armTimer = () => {
    timer = setTimeout(onClassifierHoldExpired, CLASSIFIER_CHECK_HOLD_MS, stop);
    timer.unref();
  };
  let startHold = () => {
    try {
      startSessionActivity("api_call", CLASSIFIER_CHECK_HOLD);
      armTimer();
    } catch (error) {
      logError(error);
      stop();
    }
  };
  let merged_2 = Object.assign(
    () => {
      rearmed = true;
      stop();
    },
    {
      restartDeadline: () => {
        if (rearmed) return;
        if (!active) {
          active = true;
          startHold();
          return;
        }
        try {
          clearTimeout(timer);
          armTimer();
        } catch (error) {
          logError(error);
          stop();
        }
      },
    },
  );
  startHold();
  return merged_2;
}
//@ chunk-5xgkngpb.js:1298137-1298223 placement
function onClassifierHoldExpired(stop) {
  stop();
  logForDiagnosticsNoPII("warn", "session_activity_classifier_hold_expired", {
    max_ms: CLASSIFIER_CHECK_HOLD_MS,
  });
}
//@ chunk-5xgkngpb.js:1298223-1298236 placement
var PERMISSION_CHECK_STATUS_DELAY_MS = 4000;
//@ chunk-5xgkngpb.js:1298236-1299199 placement
class enqueuePermissionCheckStatus {
  toolUseID;
  agentId;
  holds = 0;
  timer;
  announced = false;
  failed = false;
  constructor(toolUseID, agentId) {
    this.toolUseID = toolUseID;
    this.agentId = agentId;
  }
  hold() {
    this.holds++;
    if (this.holds === 1) this.arm();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds--;
      if (this.holds === 0) this.settle();
    };
  }
  arm() {
    try {
      this.timer = setTimeout(() => this.announce(), PERMISSION_CHECK_STATUS_DELAY_MS);
      this.timer.unref();
    } catch (error) {
      logError(toError(error));
    }
  }
  announce() {
    this.timer = undefined;
    if (this.holds === 0 || this.announced) return;
    this.announced = true;
    this.send("checking");
  }
  settle() {
    try {
      clearTimeout(this.timer);
    } catch (error) {
      logError(toError(error));
    }
    this.timer = undefined;
    if (!this.announced) return;
    this.announced = false;
    this.send("done");
  }
  send(status) {
    try {
      enqueueTaskNotification({
        type: "system",
        subtype: "permission_check_status",
        tool_use_id: this.toolUseID,
        ...(this.agentId !== undefined && {
          agent_id: this.agentId,
        }),
        status,
      });
    } catch (error) {
      this.failed = true;
      logError(toError(error));
    }
    if (status === "done") this.record();
  }
  record() {
    let failed = this.failed;
    this.failed = false;
    try {
      if (!getIsNonInteractiveSession()) return;
      if (failed) logFeatureBad("permission_check_notice", "enqueue_failed");
      else logFeatureOk("permission_check_notice");
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-5xgkngpb.js:1299199-1299437 placement
var CLASSIFIER_BILLING_DOCS_URL = "https://code.claude.com/docs/en/auto-mode-classifier-billing";
var SERVER_CLASSIFIER_DOCS_URL =
  "https://code.claude.com/docs/en/permission-modes#server-side-classifier-review";
var GATEWAY_AUTO_MODE_DOCS_URL =
  "https://claude.com/docs/third-party/claude-desktop/gateway#auto-mode-checks";
//@ chunk-5xgkngpb.js:1299437-1300832 placement
/**
 * 生成自动模式切换到内置安全检查时的提示。
 */
function buildClassifierFallbackNotice(notice) {
  if (notice.gatewayHost !== undefined && notice.desktopTurnedCheckOn)
    return {
      title: "Auto mode switched to its built-in safety check for this session",
      paragraphs: [
        `Auto mode is set to have actions checked through ${notice.gatewayHost}, the server that connects you to Claude. In this session those checks aren't working.`,
        "You can keep working. The built-in check reviews actions before they run. It sends extra requests to Claude, which are paid for like the rest of your work.",
        `This guide says how to find out why. If an administrator manages Claude for you, share it with them: ${GATEWAY_AUTO_MODE_DOCS_URL}`,
      ],
      helpUrl: GATEWAY_AUTO_MODE_DOCS_URL,
    };
  if (notice.gatewayHost !== undefined)
    return {
      title: "We're changing auto mode to no longer charge for classifier requests in Claude Code.",
      paragraphs: [
        `However, this session isn't eligible because your requests go through ${notice.gatewayHost}, which isn't compatible with this update.`,
        "Nothing breaks: auto mode keeps working, and its classifier requests are billed as before.",
        `To fix it and access the new version of auto mode, ask your gateway to implement: ${CLASSIFIER_BILLING_DOCS_URL}`,
      ],
      helpUrl: CLASSIFIER_BILLING_DOCS_URL,
    };
  return {
    title: "We're changing auto mode to no longer charge for classifier requests in Claude Code.",
    paragraphs: [
      "However, this session isn't eligible.",
      "Nothing breaks: auto mode keeps working, and its classifier requests are billed as before.",
      `If this keeps happening, contact support or your company's admin: ${CLASSIFIER_BILLING_DOCS_URL}`,
    ],
    helpUrl: CLASSIFIER_BILLING_DOCS_URL,
  };
}
//@ chunk-5xgkngpb.js:1300832-1300881 placement
function isVelvetHeronOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_heron", true);
}
//@ chunk-5xgkngpb.js:1300881-1300898 placement
var BILLING_NOTICE_ACK_TTL_MS = 86400000;
//@ chunk-5xgkngpb.js:1300898-1301114 placement (2.1.88 match: hasOpusAccess, 0.768)
function hasOpusAccess() {
  let subscriptionType = getSubscriptionType();
  if (
    !isVelvetHeronOn() ||
    subscriptionType === "pro" ||
    subscriptionType === "max" ||
    subscriptionType === "team" ||
    (subscriptionType === null && isClaudeAISubscriber())
  )
    return false;
  if (gatewayDisplayName() === undefined) return true;
  let acknowledgedAt = getGlobalConfig().autoModeClassifierBillingNoticeAcknowledgedAt;
  return acknowledgedAt === undefined || Date.now() - acknowledgedAt >= BILLING_NOTICE_ACK_TTL_MS;
}
//@ chunk-5xgkngpb.js:1301114-1301273 placement
var NO_CHECK_FOR_SESSION_TITLE =
  "Auto mode can't check actions in this session, so this one needs your approval";
var NO_CHECK_FOR_ACTION_TITLE = "Auto mode couldn't check this action, so it needs your approval";
//@ chunk-5xgkngpb.js:1301273-1303802 placement
/**
 * 说明服务端分类器不可用的原因（未提供、未请求、需要实验 beta）。
 */
function describeServerClassifierUnavailable({ why, asks, heldByDenyRules = false }) {
  let gateway = why === "not_served" || why === "not_requested" ? gatewayDisplayName() : undefined;
  let supportLine = `If this keeps happening, contact support or your company's admin: ${SERVER_CLASSIFIER_DOCS_URL}`;
  let cause;
  let nextStep;
  switch (why) {
    case "betas_off":
      cause =
        "Its safety check runs on the server and needs experimental betas, which are turned off here (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, or your organization's policy).";
      nextStep = `If a setting of yours or of this project turns them off, remove it and start a new session. If your organization's policy does, auto mode can't check actions here: ${SERVER_CLASSIFIER_DOCS_URL}`;
      break;
    case "switched_off":
      cause = "Its safety check runs on the server, and Anthropic has turned it off for now.";
      nextStep = "It comes back on its own.";
      break;
    case "own_switch_off":
      cause =
        "Its safety check runs on the server, and CLAUDE_CODE_AUTO_MODE_SERVER turns that check off here. Claude Code no longer has a check of its own to use instead.";
      nextStep =
        "To use auto mode, set CLAUDE_CODE_AUTO_MODE_SERVER to 1 or remove it, in your shell or in the settings file that sets it, then start a new session. If your organization's settings set it, only your admin can change it.";
      break;
    case "feature_not_covered":
      cause = "Its safety check runs on the server, and the server isn't running it for this session.";
      nextStep = supportLine;
      break;
    case "not_requested":
      cause = `Its safety check runs on the server, and Claude Code's requests in this conversation don't ask for it${gateway !== undefined ? `, which can happen after ${gateway} rejects one that does` : ""}.`;
      nextStep = `A new conversation may bring the check back. ${gateway !== undefined ? `If it doesn't, ask whoever runs ${gateway} to pass Claude Code's server-side safety check through: ${SERVER_CLASSIFIER_DOCS_URL}` : supportLine}`;
      break;
    case "not_served":
      cause =
        gateway !== undefined
          ? `Its safety check runs on the server, and your requests go through ${gateway}, which doesn't pass it through.`
          : "Its safety check runs on the server, and the server isn't running it for this session.";
      nextStep =
        gateway !== undefined
          ? `To use auto mode, ask whoever runs ${gateway} to pass Claude Code's server-side safety check through: ${SERVER_CLASSIFIER_DOCS_URL}`
          : supportLine;
      break;
  }
  return [
    "Auto mode can't check actions in this session.",
    cause,
    asks
      ? "Actions that need the check now ask for your approval. To work without these prompts, switch permission mode with Shift+Tab."
      : heldByDenyRules
        ? "The settings here hold auto mode deny rules, which only the automatic check applies, so every action that needs the check is refused and you are not asked. To run these actions, use another permission mode."
        : "Nobody can be asked to approve actions in this session, so every action that needs the check is refused. To run these actions, use another permission mode.",
    nextStep,
  ].join(" ");
}
//@ chunk-5xgkngpb.js:1303802-1303898 placement
/**
 * takeNoServerCheckNotice：取一次性的无服务端检查说明。
 */
function takeNoServerCheckNotice(asks, heldByDenyRules = false) {
  let why = takeNoServerCheckAnnouncement();
  return why === undefined
    ? undefined
    : describeServerClassifierUnavailable({
        why,
        asks,
        heldByDenyRules,
      });
}
//@ chunk-5xgkngpb.js:1303898-1304094 placement
/**
 * 会话因无服务端检查而停止时，给出一次性说明文字。
 */
function getNoServerCheckStoppedNotice() {
  return takeNoServerCheckStoppedTurn()
    ? "Auto mode can't check actions in this session, so Claude stopped after a run of responses whose actions were refused. Use another permission mode to continue."
    : undefined;
}
//@ chunk-5xgkngpb.js:1304094-1304160 placement
/**
 * takeServerFallbackAnnouncement：取一次性的回退公告。
 */
function takeServerFallbackAnnouncement(hasOpus) {
  return isThirdPartyServerClassifierRefused() &&
    !hasOpus() &&
    hasOpusAccess() &&
    takeServerClassifierFallbackAnnouncement()
    ? fallbackNoticeText(getGatewayNoticeInfo())
    : undefined;
}
//@ chunk-5xgkngpb.js:1304160-1304420 placement
var KNOWN_GATEWAY_NAMES = {
  litellm: "a LiteLLM gateway",
  helicone: "a Helicone gateway",
  portkey: "a Portkey gateway",
  "cloudflare-ai-gateway": "Cloudflare AI Gateway",
  kong: "a Kong gateway",
  braintrust: "a Braintrust proxy",
  bifrost: "a Bifrost gateway",
  databricks: "a Databricks gateway",
};
//@ chunk-5xgkngpb.js:1304420-1304550 placement
function getNonAnthropicHost(url) {
  if (!url) return;
  try {
    let { host, hostname } = new URL(url);
    return host && !hostname.endsWith(".anthropic.com") ? host : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:1304550-1304693 placement
function getProviderEndpointHost(provider) {
  let envVarName = providerEndpointVariables(provider)[0]?.name;
  let url = envVarName === undefined ? undefined : env[envVarName] || undefined;
  if (!url || isProviderServiceUrl(provider, url)) return;
  try {
    return new URL(url).host || undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:1304693-1304751 placement
/**
 * gatewayDisplayName：网关显示名。
 */
function gatewayDisplayName() {
  let gatewayHost = getGatewayHost();
  return gatewayHost === undefined ? knownGatewayName() : truncateGatewayHost(gatewayHost);
}
//@ chunk-5xgkngpb.js:1304751-1304762 placement
var MAX_GATEWAY_NAME_LENGTH = 80;
//@ chunk-5xgkngpb.js:1304762-1304841 placement
/**
 * truncateGatewayHost：截断网关主机名。
 */
function truncateGatewayHost(gatewayHost) {
  let cleaned = stripNonPrintable(gatewayHost);
  return cleaned.length <= MAX_GATEWAY_NAME_LENGTH
    ? cleaned
    : `${cleaned.slice(0, MAX_GATEWAY_NAME_LENGTH - 1)}\u2026`;
}
//@ chunk-5xgkngpb.js:1304841-1304911 placement
function knownGatewayName() {
  let observed = isDiskless() ? undefined : getObservedGateway();
  return observed === undefined ? undefined : KNOWN_GATEWAY_NAMES[observed];
}
//@ chunk-5xgkngpb.js:1304911-1305173 placement
function getGatewayHost() {
  let apiProvider = getAPIProvider();
  switch (apiProvider) {
    case "firstParty": {
      let proxyHost = configuredApiProxyHost();
      return proxyHost === undefined ? undefined : getNonAnthropicHost(`https://${proxyHost}`);
    }
    case "bedrock":
    case "mantle":
    case "vertex":
    case "foundry":
    case "anthropicAws":
    case "anthropicGoogleCloud":
      return getProviderEndpointHost(apiProvider);
    case "gateway":
      return getNonAnthropicHost(getGatewayAuth()?.url);
  }
}
//@ chunk-5xgkngpb.js:1305173-1305359 placement
function getGatewayNoticeInfo() {
  let name = gatewayDisplayName();
  if (name === undefined) return {};
  return isHostEntrypoint() &&
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
    configuredApiProxyHost() !== undefined &&
    getUserServerClassifierSwitch() === true
    ? {
        gatewayHost: name,
        desktopTurnedCheckOn: true,
      }
    : {
        gatewayHost: name,
      };
}
//@ chunk-5xgkngpb.js:1305359-1305448 placement
/**
 * withGatewayHost：公告带上网关主机。
 */
function withGatewayHost(info) {
  return {
    ...(info.gatewayHost !== undefined && {
      gatewayHost: info.gatewayHost,
    }),
    ...buildClassifierFallbackNotice(info),
  };
}
//@ chunk-5xgkngpb.js:1305448-1305546 placement
function fallbackNoticeText(notice) {
  let { title, paragraphs } = buildClassifierFallbackNotice(notice);
  return [title.endsWith(".") ? title : `${title}.`, ...paragraphs].join(" ");
}
//@ chunk-5xgkngpb.js:1305546-1305772 placement
function resolveServerFallbackChoice(askDialog) {
  let serverClassifierFallbackChoice = getServerClassifierFallbackChoice();
  if (serverClassifierFallbackChoice !== undefined) return serverClassifierFallbackChoice;
  if (!hasOpusAccess()) return Promise.resolve("continue");
  let choice = askDialog().then((answer) => {
    if (answer === "continue_unacknowledged") {
      clearServerClassifierFallbackChoice();
      return "continue";
    }
    if (answer === "interrupt") clearServerClassifierFallbackChoice();
    return answer;
  });
  setServerClassifierFallbackChoice(choice);
  return choice;
}
//@ chunk-5xgkngpb.js:1305772-1306038 placement
function raceChoiceWithAbort(choice, signal) {
  if (signal.aborted) return Promise.resolve("interrupt");
  return new Promise((resolve) => {
    let onAbort = () => resolve("interrupt");
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    choice.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve("interrupt");
      },
    );
  });
}
//@ chunk-5xgkngpb.js:1306038-1306222 placement
/**
 * 服务端分类器回退提示对话框的宿主请求规格：载荷含网关主机、标题、段落与帮助链接，结果为 continue/interrupt/cancelled。
 */
var serverFallbackNoticeSpec; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1306038", () => {
  serverFallbackNoticeSpec = withHideWhile({
    kind: AUTO_MODE_SERVER_FALLBACK,
    payload: DoctorLazy(() =>
      objectSchema({
        gatewayHost: stringSchema().optional(),
        title: stringSchema(),
        paragraphs: array(stringSchema()),
        helpUrl: stringSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["continue", "interrupt", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-5xgkngpb.js:1306222-1306276 placement
/**
 * sdkSupportsFallbackDialog：SDK 宿主支持回退对话框。
 */
function sdkSupportsFallbackDialog() {
  return isSdkDialogHostActive() && (getSdkSupportedDialogKinds() ?? []).includes(AUTO_MODE_SERVER_FALLBACK);
}
//@ chunk-5xgkngpb.js:1306276-1306296 placement
var INTERRUPT = "interrupt";
//@ chunk-5xgkngpb.js:1306296-1306787 placement
/**
 * 展示服务端分类器回退提示并记 tengu_auto_mode_server_fallback_notice_closed；继续且经网关时记下计费提示已确认时间；未作答且用户已继续时返回 continue_unacknowledged。
 */
async function showServerFallbackNotice(requestDialog, info, context) {
  let unansweredReason;
  let answer = await requestDialog(serverFallbackNoticeSpec, withGatewayHost(info), {
    signal: context.signal,
    armInputGrace: true,
    onSettledUnanswered: (reason) => {
      unansweredReason = reason;
    },
  });
  switch (
    (logEvent("tengu_auto_mode_server_fallback_notice_closed", {
      choice: fromEnum(answer),
      ...(answer === "cancelled" && {
        unanswered: fromEnum(unansweredReason ?? "closed"),
      }),
    }),
    answer)
  ) {
    case "continue":
      if (info.gatewayHost !== undefined)
        saveGlobalConfig(
          (config) => ({
            ...config,
            autoModeClassifierBillingNoticeAcknowledgedAt: Date.now(),
          }),
          context.storageV5,
        );
      return "continue";
    case "interrupt":
      return "interrupt";
    case "cancelled":
      return unansweredReason === "moved_on" ? "continue_unacknowledged" : INTERRUPT;
  }
}
//@ chunk-5xgkngpb.js:1306787-1306887 placement
function isChromeClassifierFloorTool(tool, toolPermissionContext) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_4(tool);
  if (!isChromeToolName(toolNameForPermissionCheck)) return false;
  return (
    isBrowserPreviewToolName(toolNameForPermissionCheck) ||
    toolPermissionContext.chromeClassifierFloorEnabled === true
  );
}
//@ chunk-5xgkngpb.js:1306887-1306950 placement
/**
 * isChromeClassifierFloorCall：浏览器工具且分类器可跑。
 */
function isChromeClassifierFloorCall(tool, toolPermissionContext) {
  return (
    isChromeClassifierFloorTool(tool, toolPermissionContext) &&
    toolPermissionContext.canAutoClassifierRun === true
  );
}
//@ chunk-5xgkngpb.js:1306950-1307170 placement
var UNREVIEWED_ACTION_NOTICE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_AUTO_MODES;
deferInit("chunk-5xgkngpb.js:1306950", () => {
  UNREVIEWED_ACTION_NOTICE =
    "Claude Code's automatic safety check couldn't review this action, so the action hasn't run. Allow it only if you expected Claude to do this.";
  NON_AUTO_MODES = new Set(["default", "acceptEdits", "dontAsk", "bypassPermissions"]);
});
//@ chunk-5xgkngpb.js:1307170-1307204 placement
/**
 * isNonAutoMode：是否非 auto 模式。
 */
function isNonAutoMode(mode) {
  return NON_AUTO_MODES.has(mode);
}
//@ chunk-5xgkngpb.js:1307204-1307319 placement
/**
 * 非 auto 模式下 MCP 工具是否仍经分类器审阅（服务端分类器启用时）。
 */
function isMcpReviewedOutsideAuto(tool, toolPermissionContext) {
  return (
    NON_AUTO_MODES.has(toolPermissionContext.mode) &&
    toolPermissionContext.servedCall !== true &&
    (isAutoClassifierActive(isAutoAllowedInMode(tool, toolPermissionContext)) ||
      isChromeClassifierFloorCall(tool, toolPermissionContext)) &&
    tool.name.startsWith(MCP_TOOL_PREFIX) &&
    isServerArbiterActive()
  );
}
//@ chunk-5xgkngpb.js:1307319-1307353 placement
/**
 * priorAssistantContextEnabled：是否附带先前助手上下文。
 */
function priorAssistantContextEnabled() {
  return resolvePriorAssistantContextFlag().value;
}
//@ chunk-5xgkngpb.js:1307353-1307630 placement
function resolvePriorAssistantContextFlag() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_PRIOR_ASSISTANT_CONTEXT !== undefined)
    return {
      value: antEnv.CLAUDE_CODE_AUTO_MODE_PRIOR_ASSISTANT_CONTEXT,
      src: "env",
    };
  let autoModeConfigOrDefault = getAutoModeConfigOrDefault();
  return typeof autoModeConfigOrDefault?.priorAssistantContext === "boolean"
    ? {
        value: autoModeConfigOrDefault.priorAssistantContext,
        src: "gb",
      }
    : {
        value: false,
        src: "default",
      };
}
//@ chunk-5xgkngpb.js:1307630-1307715 placement
/**
 * listsHumanReplies：是否列出人类回复（含开关来源）。
 */
function listsHumanReplies() {
  let priorAssistantContextFlag = resolvePriorAssistantContextFlag();
  return (
    priorAssistantContextFlag.value ||
    (priorAssistantContextFlag.src !== "env" && getAutoModeConfigOrDefault().listHumanReplies === true)
  );
}
export {
  priorAssistantContextEnabled,
  raceChoiceWithAbort,
  hasOpusAccess,
  sdkSupportsFallbackDialog,
  resolveServerFallbackChoice,
  getGatewayNoticeInfo,
  showServerFallbackNotice,
  takeNoServerCheckNotice,
  isChromeClassifierFloorCall,
  isChromeClassifierFloorTool,
  enqueuePermissionCheckStatus,
  isMcpReviewedOutsideAuto,
  startClassifierKeepalive,
  gatewayDisplayName,
  NO_CHECK_FOR_SESSION_TITLE,
  NO_CHECK_FOR_ACTION_TITLE,
  UNREVIEWED_ACTION_NOTICE,
  takeServerFallbackAnnouncement,
  listsHumanReplies,
  serverFallbackNoticeSpec,
  truncateGatewayHost,
  withGatewayHost,
  getNoServerCheckStoppedNotice,
  isNonAutoMode,
};
