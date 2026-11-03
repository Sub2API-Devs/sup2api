/**
 * utils/permissions/serverClassifier/fallbackNotice.ts
 *
 * 2.1.316 新增：分类器回退提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (40)
 * attribution: placement 40
 */
import { env, antEnv } from "../../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { S7r } from "../../../tools/AgentTool/backgroundGates.js";
import { logError } from "../../log.js";
import { endActivity, startSessionActivity } from "../../sessionActivity.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { toError } from "../../errors.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../../task/taskNotifications.js";
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
import { u, o, A, U } from "../../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  MCP_TOOL_PREFIX,
} from "../../../services/mcp/mcpStringUtils.js";
import { isChromeToolName, E5t } from "../../claudeInChrome/chromeToolNames.js";
import { isAutoClassifierActive } from "../autoModeState.js";
import { isAutoAllowedInMode } from "../browserToolNames.js";
import { iye } from "./arbiter.js";
import { getAutoModeConfigOrDefault } from "../permissionSetup.js";

//@ chunk-e6aww6q8.js:1298626-1298721 placement
var CLASSIFIER_CHECK_HOLD = "classifier-check-hold",
  H6t = 1200000,
  merged = Object.assign(() => {}, { restartDeadline: () => {} });
/**
 * 远程会话开启保活时，在分类器检查期间维持一段会话活动（超时自动结束）；返回结束函数，附带 restartDeadline 以续期。
 */
//@ chunk-e6aww6q8.js:1298721-1299213 placement
function startClassifierKeepalive() {
  try {
    if (
      !env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES ||
      (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_classifier_keepalive_enabled", !1) && !S7r())
    )
      return merged;
  } catch (error) {
    return (logError(error), merged);
  }
  let e = !0,
    n = !1,
    r,
    s = () => {
      if (!e) return;
      e = !1;
      try {
        (clearTimeout(r), endActivity("api_call", CLASSIFIER_CHECK_HOLD));
      } catch (error) {
        logError(error);
      }
    },
    h = () => {
      ((r = setTimeout(c0o, H6t, s)), r.unref());
    },
    y = () => {
      try {
        (startSessionActivity("api_call", CLASSIFIER_CHECK_HOLD), h());
      } catch (error) {
        (logError(error), s());
      }
    },
    merged_2 = Object.assign(
      () => {
        ((n = !0), s());
      },
      {
        restartDeadline: () => {
          if (n) return;
          if (!e) {
            ((e = !0), y());
            return;
          }
          try {
            (clearTimeout(r), h());
          } catch (error) {
            (logError(error), s());
          }
        },
      },
    );
  return (y(), merged_2);
}
//@ chunk-e6aww6q8.js:1299213-1299299 placement
function c0o(e) {
  (e(), logForDiagnosticsNoPII("warn", "session_activity_classifier_hold_expired", { max_ms: H6t }));
}
//@ chunk-e6aww6q8.js:1299299-1299312 placement
var f0o = 4000;
//@ chunk-e6aww6q8.js:1299312-1300275 placement
class enqueuePermissionCheckStatus {
  toolUseID;
  agentId;
  holds = 0;
  timer;
  announced = !1;
  failed = !1;
  constructor(e, n) {
    ((this.toolUseID = e), (this.agentId = n));
  }
  hold() {
    if ((this.holds++, this.holds === 1)) this.arm();
    let e = !1;
    return () => {
      if (e) return;
      if (((e = !0), this.holds--, this.holds === 0)) this.settle();
    };
  }
  arm() {
    try {
      ((this.timer = setTimeout(() => this.announce(), f0o)), this.timer.unref());
    } catch (error) {
      logError(toError(error));
    }
  }
  announce() {
    if (((this.timer = void 0), this.holds === 0 || this.announced)) return;
    ((this.announced = !0), this.send("checking"));
  }
  settle() {
    try {
      clearTimeout(this.timer);
    } catch (error) {
      logError(toError(error));
    }
    if (((this.timer = void 0), !this.announced)) return;
    ((this.announced = !1), this.send("done"));
  }
  send(e) {
    try {
      enqueueTaskNotification_2({
        type: "system",
        subtype: "permission_check_status",
        tool_use_id: this.toolUseID,
        ...(this.agentId !== void 0 && { agent_id: this.agentId }),
        status: e,
      });
    } catch (error) {
      ((this.failed = !0), logError(toError(error)));
    }
    if (e === "done") this.record();
  }
  record() {
    let failed = this.failed;
    this.failed = !1;
    try {
      if (!getIsNonInteractiveSession()) return;
      if (failed) logFeatureBad("permission_check_notice", "enqueue_failed");
      else logFeatureOk("permission_check_notice");
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-e6aww6q8.js:1300275-1300513 placement
var CLASSIFIER_BILLING_DOCS_URL = "https://code.claude.com/docs/en/auto-mode-classifier-billing",
  SERVER_CLASSIFIER_DOCS_URL =
    "https://code.claude.com/docs/en/permission-modes#server-side-classifier-review",
  GATEWAY_AUTO_MODE_DOCS_URL = "https://claude.com/docs/third-party/claude-desktop/gateway#auto-mode-checks";
/**
 * 生成自动模式切换到内置安全检查时的提示。
 */
//@ chunk-e6aww6q8.js:1300513-1301908 placement
function buildClassifierFallbackNotice(e) {
  if (e.gatewayHost !== void 0 && e.desktopTurnedCheckOn)
    return {
      title: "Auto mode switched to its built-in safety check for this session",
      paragraphs: [
        `Auto mode is set to have actions checked through ${e.gatewayHost}, the server that connects you to Claude. In this session those checks aren't working.`,
        "You can keep working. The built-in check reviews actions before they run. It sends extra requests to Claude, which are paid for like the rest of your work.",
        `This guide says how to find out why. If an administrator manages Claude for you, share it with them: ${GATEWAY_AUTO_MODE_DOCS_URL}`,
      ],
      helpUrl: GATEWAY_AUTO_MODE_DOCS_URL,
    };
  if (e.gatewayHost !== void 0)
    return {
      title: "We're changing auto mode to no longer charge for classifier requests in Claude Code.",
      paragraphs: [
        `However, this session isn't eligible because your requests go through ${e.gatewayHost}, which isn't compatible with this update.`,
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
//@ chunk-e6aww6q8.js:1301908-1301957 placement
function p0o() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_heron", !0);
}
//@ chunk-e6aww6q8.js:1301957-1301974 placement
var m0o = 86400000;
//@ chunk-e6aww6q8.js:1301974-1302190 placement = hasOpusAccess (0.768)
function hasOpusAccess() {
  let subscriptionType = getSubscriptionType();
  if (
    !p0o() ||
    subscriptionType === "pro" ||
    subscriptionType === "max" ||
    subscriptionType === "team" ||
    (subscriptionType === null && isClaudeAISubscriber())
  )
    return !1;
  if (ntt() === void 0) return !0;
  let n = getGlobalConfig().autoModeClassifierBillingNoticeAcknowledgedAt;
  return n === void 0 || Date.now() - n >= m0o;
}
//@ chunk-e6aww6q8.js:1302190-1302349 placement
var NO_CHECK_FOR_SESSION_TITLE =
    "Auto mode can't check actions in this session, so this one needs your approval",
  NO_CHECK_FOR_ACTION_TITLE = "Auto mode couldn't check this action, so it needs your approval";
/**
 * 说明服务端分类器不可用的原因（未提供、未请求、需要实验 beta）。
 */
//@ chunk-e6aww6q8.js:1302349-1304878 placement
function describeServerClassifierUnavailable({
  why: why,
  asks: asks,
  heldByDenyRules: heldByDenyRules = !1,
}) {
  let s = why === "not_served" || why === "not_requested" ? ntt() : void 0,
    h = `If this keeps happening, contact support or your company's admin: ${SERVER_CLASSIFIER_DOCS_URL}`,
    y,
    S;
  switch (why) {
    case "betas_off":
      ((y =
        "Its safety check runs on the server and needs experimental betas, which are turned off here (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, or your organization's policy)."),
        (S = `If a setting of yours or of this project turns them off, remove it and start a new session. If your organization's policy does, auto mode can't check actions here: ${SERVER_CLASSIFIER_DOCS_URL}`));
      break;
    case "switched_off":
      ((y = "Its safety check runs on the server, and Anthropic has turned it off for now."),
        (S = "It comes back on its own."));
      break;
    case "own_switch_off":
      ((y =
        "Its safety check runs on the server, and CLAUDE_CODE_AUTO_MODE_SERVER turns that check off here. Claude Code no longer has a check of its own to use instead."),
        (S =
          "To use auto mode, set CLAUDE_CODE_AUTO_MODE_SERVER to 1 or remove it, in your shell or in the settings file that sets it, then start a new session. If your organization's settings set it, only your admin can change it."));
      break;
    case "feature_not_covered":
      ((y = "Its safety check runs on the server, and the server isn't running it for this session."),
        (S = h));
      break;
    case "not_requested":
      ((y = `Its safety check runs on the server, and Claude Code's requests in this conversation don't ask for it${s !== void 0 ? `, which can happen after ${s} rejects one that does` : ""}.`),
        (S = `A new conversation may bring the check back. ${s !== void 0 ? `If it doesn't, ask whoever runs ${s} to pass Claude Code's server-side safety check through: ${SERVER_CLASSIFIER_DOCS_URL}` : h}`));
      break;
    case "not_served":
      ((y =
        s !== void 0
          ? `Its safety check runs on the server, and your requests go through ${s}, which doesn't pass it through.`
          : "Its safety check runs on the server, and the server isn't running it for this session."),
        (S =
          s !== void 0
            ? `To use auto mode, ask whoever runs ${s} to pass Claude Code's server-side safety check through: ${SERVER_CLASSIFIER_DOCS_URL}`
            : h));
      break;
  }
  return [
    "Auto mode can't check actions in this session.",
    y,
    asks
      ? "Actions that need the check now ask for your approval. To work without these prompts, switch permission mode with Shift+Tab."
      : heldByDenyRules
        ? "The settings here hold auto mode deny rules, which only the automatic check applies, so every action that needs the check is refused and you are not asked. To run these actions, use another permission mode."
        : "Nobody can be asked to approve actions in this session, so every action that needs the check is refused. To run these actions, use another permission mode.",
    S,
  ].join(" ");
}
//@ chunk-e6aww6q8.js:1304878-1304974 placement
function qjr(e, n = !1) {
  let r = takeNoServerCheckAnnouncement();
  return r === void 0 ? void 0 : describeServerClassifierUnavailable({ why: r, asks: e, heldByDenyRules: n });
}
/**
 * 会话因无服务端检查而停止时，给出一次性说明文字。
 */
//@ chunk-e6aww6q8.js:1304974-1305170 placement
function getNoServerCheckStoppedNotice() {
  return takeNoServerCheckStoppedTurn()
    ? "Auto mode can't check actions in this session, so Claude stopped after a run of responses whose actions were refused. Use another permission mode to continue."
    : void 0;
}
//@ chunk-e6aww6q8.js:1305170-1305236 placement
function z5s(e) {
  return isThirdPartyServerClassifierRefused() &&
    !e() &&
    hasOpusAccess() &&
    takeServerClassifierFallbackAnnouncement()
    ? k0o(getGatewayNoticeInfo())
    : void 0;
}
//@ chunk-e6aww6q8.js:1305236-1305496 placement
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
//@ chunk-e6aww6q8.js:1305496-1305626 placement
function getNonAnthropicHost(e) {
  if (!e) return;
  try {
    let { host: host, hostname: hostname } = new URL(e);
    return host && !hostname.endsWith(".anthropic.com") ? host : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1305626-1305769 placement
function getProviderEndpointHost(e) {
  let n = providerEndpointVariables(e)[0]?.name,
    r = n === void 0 ? void 0 : env[n] || void 0;
  if (!r || isProviderServiceUrl(e, r)) return;
  try {
    return new URL(r).host || void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1305769-1305827 placement
function ntt() {
  let e = getGatewayHost();
  return e === void 0 ? _0o() : hBo(e);
}
//@ chunk-e6aww6q8.js:1305827-1305838 placement
var W6t = 80;
//@ chunk-e6aww6q8.js:1305838-1305917 placement
function hBo(e) {
  let n = stripNonPrintable(e);
  return n.length <= W6t ? n : `${n.slice(0, W6t - 1)}\u2026`;
}
//@ chunk-e6aww6q8.js:1305917-1305987 placement
function _0o() {
  let e = isDiskless() ? void 0 : getObservedGateway();
  return e === void 0 ? void 0 : KNOWN_GATEWAY_NAMES[e];
}
//@ chunk-e6aww6q8.js:1305987-1306249 placement
function getGatewayHost() {
  let e = getAPIProvider();
  switch (e) {
    case "firstParty": {
      let n = configuredApiProxyHost();
      return n === void 0 ? void 0 : getNonAnthropicHost(`https://${n}`);
    }
    case "bedrock":
    case "mantle":
    case "vertex":
    case "foundry":
    case "anthropicAws":
    case "anthropicGoogleCloud":
      return getProviderEndpointHost(e);
    case "gateway":
      return getNonAnthropicHost(getGatewayAuth()?.url);
  }
}
//@ chunk-e6aww6q8.js:1306249-1306434 placement
function getGatewayNoticeInfo() {
  let e = ntt();
  if (e === void 0) return {};
  return isHostEntrypoint() &&
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
    configuredApiProxyHost() !== void 0 &&
    getUserServerClassifierSwitch() === !0
    ? { gatewayHost: e, desktopTurnedCheckOn: !0 }
    : { gatewayHost: e };
}
//@ chunk-e6aww6q8.js:1306434-1306523 placement
function Yjr(e) {
  return {
    ...(e.gatewayHost !== void 0 && { gatewayHost: e.gatewayHost }),
    ...buildClassifierFallbackNotice(e),
  };
}
//@ chunk-e6aww6q8.js:1306523-1306621 placement
function k0o(e) {
  let { title: title, paragraphs: paragraphs } = buildClassifierFallbackNotice(e);
  return [title.endsWith(".") ? title : `${title}.`, ...paragraphs].join(" ");
}
//@ chunk-e6aww6q8.js:1306621-1306847 placement
function resolveServerFallbackChoice(e) {
  let n = getServerClassifierFallbackChoice();
  if (n !== void 0) return n;
  if (!hasOpusAccess()) return Promise.resolve("continue");
  let r = e().then((s) => {
    if (s === "continue_unacknowledged") return (clearServerClassifierFallbackChoice(), "continue");
    if (s === "interrupt") clearServerClassifierFallbackChoice();
    return s;
  });
  return (setServerClassifierFallbackChoice(r), r);
}
//@ chunk-e6aww6q8.js:1306847-1307113 placement
function raceChoiceWithAbort(e, n) {
  if (n.aborted) return Promise.resolve("interrupt");
  return new Promise((r) => {
    let s = () => r("interrupt");
    (n.addEventListener("abort", s, { once: !0 }),
      e.then(
        (h) => {
          (n.removeEventListener("abort", s), r(h));
        },
        () => {
          (n.removeEventListener("abort", s), r("interrupt"));
        },
      ));
  });
}
/**
 * 服务端分类器回退提示对话框的宿主请求规格：载荷含网关主机、标题、段落与帮助链接，结果为 continue/interrupt/cancelled。
 */
//@ chunk-e6aww6q8.js:1307113-1307297 placement
var serverFallbackNoticeSpec = withHideWhile({
  kind: AUTO_MODE_SERVER_FALLBACK,
  payload: DoctorLazy(() => u({ gatewayHost: o().optional(), title: o(), paragraphs: A(o()), helpUrl: o() })),
  result: DoctorLazy(() => U(["continue", "interrupt", "cancelled"])),
  default: "cancelled",
});
//@ chunk-e6aww6q8.js:1307297-1307351 placement
function Xjr() {
  return isSdkDialogHostActive() && (getSdkSupportedDialogKinds() ?? []).includes(AUTO_MODE_SERVER_FALLBACK);
}
//@ chunk-e6aww6q8.js:1307351-1307371 placement
var INTERRUPT = "interrupt";
/**
 * 展示服务端分类器回退提示并记 tengu_auto_mode_server_fallback_notice_closed；继续且经网关时记下计费提示已确认时间；未作答且用户已继续时返回 continue_unacknowledged。
 */
//@ chunk-e6aww6q8.js:1307371-1307862 placement
async function showServerFallbackNotice(e, n, r) {
  let s,
    h = await e(serverFallbackNoticeSpec, Yjr(n), {
      signal: r.signal,
      armInputGrace: !0,
      onSettledUnanswered: (y) => {
        s = y;
      },
    });
  switch (
    (logEvent("tengu_auto_mode_server_fallback_notice_closed", {
      choice: fromEnum(h),
      ...(h === "cancelled" && { unanswered: fromEnum(s ?? "closed") }),
    }),
    h)
  ) {
    case "continue":
      if (n.gatewayHost !== void 0)
        saveGlobalConfig(
          (y) => ({ ...y, autoModeClassifierBillingNoticeAcknowledgedAt: Date.now() }),
          r.storageV5,
        );
      return "continue";
    case "interrupt":
      return "interrupt";
    case "cancelled":
      return s === "moved_on" ? "continue_unacknowledged" : INTERRUPT;
  }
}
//@ chunk-e6aww6q8.js:1307862-1307962 placement
function isChromeClassifierFloorTool(e, n) {
  let r = getToolNameForPermissionCheck_4(e);
  if (!isChromeToolName(r)) return !1;
  return E5t(r) || n.chromeClassifierFloorEnabled === !0;
}
//@ chunk-e6aww6q8.js:1307962-1308025 placement
function S2e(e, n) {
  return isChromeClassifierFloorTool(e, n) && n.canAutoClassifierRun === !0;
}
//@ chunk-e6aww6q8.js:1308025-1308245 placement
var UNREVIEWED_ACTION_NOTICE =
    "Claude Code's automatic safety check couldn't review this action, so the action hasn't run. Allow it only if you expected Claude to do this.",
  NON_AUTO_MODES = new Set(["default", "acceptEdits", "dontAsk", "bypassPermissions"]);
//@ chunk-e6aww6q8.js:1308245-1308279 placement
function K5s(e) {
  return NON_AUTO_MODES.has(e);
}
/**
 * 非 auto 模式下 MCP 工具是否仍经分类器审阅（服务端分类器启用时）。
 */
//@ chunk-e6aww6q8.js:1308279-1308394 placement
function isMcpReviewedOutsideAuto(e, n) {
  return (
    NON_AUTO_MODES.has(n.mode) &&
    n.servedCall !== !0 &&
    (isAutoClassifierActive(isAutoAllowedInMode(e, n)) || S2e(e, n)) &&
    e.name.startsWith(MCP_TOOL_PREFIX) &&
    iye()
  );
}
//@ chunk-e6aww6q8.js:1308394-1308428 placement
function c_e() {
  return resolvePriorAssistantContextFlag().value;
}
//@ chunk-e6aww6q8.js:1308428-1308705 placement
function resolvePriorAssistantContextFlag() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_PRIOR_ASSISTANT_CONTEXT !== void 0)
    return { value: antEnv.CLAUDE_CODE_AUTO_MODE_PRIOR_ASSISTANT_CONTEXT, src: "env" };
  let e = getAutoModeConfigOrDefault();
  return typeof e?.priorAssistantContext === "boolean"
    ? { value: e.priorAssistantContext, src: "gb" }
    : { value: !1, src: "default" };
}
//@ chunk-e6aww6q8.js:1308705-1308790 placement
function Z6t() {
  let e = resolvePriorAssistantContextFlag();
  return e.value || (e.src !== "env" && getAutoModeConfigOrDefault().listHumanReplies === !0);
}

export {
  c_e,
  raceChoiceWithAbort,
  hasOpusAccess,
  Xjr,
  resolveServerFallbackChoice,
  getGatewayNoticeInfo,
  showServerFallbackNotice,
  qjr,
  S2e,
  isChromeClassifierFloorTool,
  isMcpReviewedOutsideAuto,
  enqueuePermissionCheckStatus,
  startClassifierKeepalive,
  ntt,
  NO_CHECK_FOR_SESSION_TITLE,
  NO_CHECK_FOR_ACTION_TITLE,
  UNREVIEWED_ACTION_NOTICE,
  serverFallbackNoticeSpec,
  hBo,
  Yjr,
  z5s,
  Z6t,
  K5s,
  getNoServerCheckStoppedNotice,
};
