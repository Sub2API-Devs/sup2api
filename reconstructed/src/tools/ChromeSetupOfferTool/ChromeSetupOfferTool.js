/**
 * tools/ChromeSetupOfferTool/ChromeSetupOfferTool.ts
 *
 * 2.1.316 新增：向用户提供 Claude in Chrome 设置的工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (16)
 * attribution: placement 16
 */
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { getHostRendersChromeSetupOffer, getChromeAvailabilityStagesLogged } from "../../bootstrap/state.js";
import { hasDisconnectedChromeAnswer } from "../../utils/claudeInChrome/phoneAnswer.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { canPromptUserForPermission } from "../../utils/permissions/permissions.js";
import {
  claudeInChromeSession,
  CLAUDE_IN_CHROME_SESSION_SLOT,
  isMobilePlatform,
} from "../../commands/mobile/mobile.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isDefinedHumanClientPlatform } from "../../bridge/inboundMessageOrigin.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { isToolSearchEnabledOptimistic, getNonDeferrableBuiltins } from "../../utils/toolSearch.js";
import {
  OFFER_CHROME_SETUP_TOOL_NAME,
  OFFER_CHROME_SETUP_SHORT_DESCRIPTION,
  OFFER_CHROME_SETUP_DESCRIPTION,
  OFFER_CHROME_SETUP_PROMPT,
  OFFER_CHROME_SETUP_PHONE_REFUSAL,
  OFFER_CHROME_SETUP_NOT_ATTEMPTED,
  OFFER_CHROME_SETUP_CONNECTED_TEXT,
  OFFER_CHROME_SETUP_NOT_NOW_TEXT,
} from "../ReadNotificationsTool/ReadNotificationsTool.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { entrypointForTelemetry } from "../../services/api/logging.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { checkChromeSetupAnswer } from "../RolePickerTool/RolePickerTool.js";

//@ chunk-kxyd0g16.js:13687-13740 placement
var TENGU_BRASS_KITE = "tengu_brass_kite";
var TENGU_GENTLE_DIJKSTRA = "tengu_gentle_dijkstra";
//@ chunk-kxyd0g16.js:13740-13772 placement
/**
 * 选择 Chrome 设置提议的开关名：聊天协作模式用 tengu_gentle_dijkstra，否则 tengu_brass_kite。
 */
function chromeSetupOfferFlagName() {
  return isClaudeAiChatCowork() ? TENGU_GENTLE_DIJKSTRA : TENGU_BRASS_KITE;
}
//@ chunk-kxyd0g16.js:13772-13832 placement
/**
 * 是否启用 Claude in Chrome 设置工具：宿主渲染、首方供应商、工具搜索、非延迟内建与开关全部满足。
 */
function isChromeSetupOfferEnabled() {
  return (
    getHostRendersChromeSetupOffer() &&
    hasDisconnectedChromeAnswer() &&
    isFirstPartyProvider() &&
    canPromptUserForPermission() &&
    isChromeSetupToolEligible() &&
    isChromeSetupOfferArmed()
  );
}
//@ chunk-kxyd0g16.js:13832-14104 placement
function isChromeSetupOfferArmed() {
  let e = claudeInChromeSession();
  if (e.chromeSetupOfferArm !== undefined) return e.chromeSetupOfferArm;
  if (e.chromeSetupOfferStateUnread || !isClientPlatformEligible()) return false;
  let { value: r, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(chromeSetupOfferFlagName(), false);
  if (source === "fallback" || source === "disabled") return false;
  e.chromeSetupOfferArm = r === true;
  return e.chromeSetupOfferArm;
}
//@ chunk-kxyd0g16.js:14104-14264 placement
/**
 * 记录本回合客户端平台（用于决定是否提供 Chrome 设置），未知时记为 null。
 */
function noteTurnClientPlatform(session, clientPlatform) {
  let n = CLAUDE_IN_CHROME_SESSION_SLOT.of(session.host);
  if (clientPlatform !== undefined && isDefinedHumanClientPlatform(clientPlatform))
    n.lastTurnClientPlatform = clientPlatform;
  else if (n.lastTurnClientPlatform === undefined) n.lastTurnClientPlatform = null;
}
//@ chunk-kxyd0g16.js:14264-14352 placement
/**
 * 判断本回合客户端平台是否为手机（协作模式下手机端不提供设置）。
 */
function isPhoneClientTurn(session, messageClientPlatform) {
  return isMobilePlatform(
    messageClientPlatform !== undefined && isDefinedHumanClientPlatform(messageClientPlatform)
      ? messageClientPlatform
      : CLAUDE_IN_CHROME_SESSION_SLOT.of(session.host).lastTurnClientPlatform,
  );
}
//@ chunk-kxyd0g16.js:14352-14378 placement
/**
 * 是否处于 Claude.ai 聊天协作模式。
 */
function isCoworkChatMode() {
  return isClaudeAiChatCowork();
}
//@ chunk-kxyd0g16.js:14378-14481 placement
function isClientPlatformEligible() {
  if (!isCoworkChatMode()) return true;
  let lastTurnClientPlatform = claudeInChromeSession().lastTurnClientPlatform;
  return (
    lastTurnClientPlatform !== undefined &&
    lastTurnClientPlatform !== null &&
    !isMobilePlatform(lastTurnClientPlatform)
  );
}
//@ chunk-kxyd0g16.js:14481-14514 placement
/**
 * Chrome 工具已被尝试过，或当前已可用。
 */
function hasChromeToolBeenTriedOrAvailable() {
  return hasChromeToolBeenAttempted() || hasDisconnectedChromeAnswer();
}
//@ chunk-kxyd0g16.js:14514-14567 placement
/**
 * Chrome 设置工具是否合格：开关开启、工具搜索可用，且该工具不在必须立即加载的内建列表中。
 */
function isChromeSetupToolEligible() {
  return (
    isFoamySpringEnabled() &&
    isToolSearchEnabledOptimistic() &&
    !getNonDeferrableBuiltins().includes(OFFER_CHROME_SETUP_TOOL_NAME)
  );
}
//@ chunk-kxyd0g16.js:14567-14616 placement
/**
 * 本会话是否已尝试使用 Chrome 工具（来自可用性阶段记录）。
 */
function hasChromeToolBeenAttempted() {
  return getChromeAvailabilityStagesLogged().has("tool_attempted");
}
//@ chunk-kxyd0g16.js:14616-14647 placement
/**
 * 按会话根记录 Chrome 设置提议已出现的次数，用于遥测。
 */
var chromeSetupOfferCallsByRoot = new SessionRootSlot(() => ({
  calls: 0,
}));
//@ chunk-kxyd0g16.js:14647-14898 placement
function logChromeSetupOffered(session, r, messageClientPlatform) {
  let s = chromeSetupOfferCallsByRoot.of(session);
  s.calls++;
  logEvent("tengu_chrome_setup_offered", {
    outcome: fromEnum(r),
    nth_call: s.calls,
    chrome_tool_attempted: getChromeAvailabilityStagesLogged().has("tool_attempted"),
    isRemoteSession: Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID),
    ...(messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(messageClientPlatform),
    }),
  });
}
//@ chunk-kxyd0g16.js:14898-15098 placement
var chromeSetupOfferInputSchema = DoctorLazy(() =>
  zodStrictObject({
    reason: string()
      .max(200)
      .optional()
      .describe("A short phrase naming what the task needs the user's own browser for."),
  }),
);
var chromeSetupOfferOutputSchema = DoctorLazy(() =>
  u({
    outcome: _enum(["connected", "not_now", "no_attempt_yet"]),
  }),
);
//@ chunk-kxyd0g16.js:15098-15161 placement
/**
 * 把工具输入规整成只含 reason 的对象。
 */
function chromeSetupUpdatedInput(e) {
  let { reason } = e;
  return reason === undefined
    ? {}
    : {
        reason,
      };
}
//@ chunk-kxyd0g16.js:15161-16347 placement
/**
 * 向用户提供 Claude in Chrome 设置的工具。
 */
var ChromeSetupOfferTool = buildTool({
  name: OFFER_CHROME_SETUP_TOOL_NAME,
  searchHint: "offer the user Claude in Chrome setup for their own browser",
  shouldDefer: true,
  whenToUse: OFFER_CHROME_SETUP_SHORT_DESCRIPTION,
  backgrounding: "never",
  maxResultSizeChars: 2000,
  get inputSchema() {
    return chromeSetupOfferInputSchema();
  },
  get outputSchema() {
    return chromeSetupOfferOutputSchema();
  },
  isEnabled: isChromeSetupOfferEnabled,
  isConcurrencySafe() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  requiresUserInteraction() {
    return true;
  },
  admitCardAnswer: checkChromeSetupAnswer,
  async description() {
    return OFFER_CHROME_SETUP_DESCRIPTION;
  },
  async prompt() {
    return OFFER_CHROME_SETUP_PROMPT;
  },
  toAutoClassifierInput(e) {
    return e.reason ? `offer Claude in Chrome setup: ${e.reason}` : "offer Claude in Chrome setup";
  },
  create({ messageClientPlatform, session }) {
    return {
      async validateInput() {
        if (isCoworkChatMode() && isPhoneClientTurn(session, messageClientPlatform)) {
          logChromeSetupOffered(session, "phone", messageClientPlatform);
          return {
            result: false,
            message: OFFER_CHROME_SETUP_PHONE_REFUSAL,
            errorCode: 2,
          };
        }
        if (hasChromeToolBeenTriedOrAvailable())
          return {
            result: true,
          };
        logChromeSetupOffered(session, "no_attempt_yet", messageClientPlatform);
        return {
          result: false,
          message: OFFER_CHROME_SETUP_NOT_ATTEMPTED,
          errorCode: 1,
        };
      },
      async checkPermissions(n) {
        return {
          behavior: "ask",
          message: "Set up Claude in Chrome?",
          suppressAlwaysAllowRule: true,
          updatedInput: chromeSetupUpdatedInput(n),
        };
      },
      async call(n) {
        let { outcome } = n;
        let f = outcome === "connected" ? "connected" : "not_now";
        logChromeSetupOffered(session, f, messageClientPlatform);
        return {
          data: {
            outcome: f,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content:
        e.outcome === "connected" ? OFFER_CHROME_SETUP_CONNECTED_TEXT : OFFER_CHROME_SETUP_NOT_NOW_TEXT,
    };
  },
  renderToolUseMessage(e) {
    return e.reason ?? null;
  },
});
export { noteTurnClientPlatform, ChromeSetupOfferTool, isChromeSetupOfferEnabled };
