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
import { wcn } from "../../utils/claudeInChrome/phoneAnswer.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { ebe } from "../../utils/permissions/permissions.js";
import { Yi, EXr, Wvn } from "../../commands/mobile/mobile.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { Die } from "../../bridge/inboundMessageOrigin.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { isToolSearchEnabledOptimistic, getNonDeferrableBuiltins } from "../../utils/toolSearch.js";
import {
  OFFER_CHROME_SETUP_TOOL_NAME,
  esi,
  tsi,
  nsi,
  ssi,
  isi,
  rsi,
  osi,
} from "../ReadNotificationsTool/ReadNotificationsTool.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { yW } from "../../services/api/logging.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { checkChromeSetupAnswer } from "../RolePickerTool/RolePickerTool.js";

//@ chunk-kxyd0g16.js:13687-13740 placement
var TENGU_BRASS_KITE = "tengu_brass_kite",
  TENGU_GENTLE_DIJKSTRA = "tengu_gentle_dijkstra";
//@ chunk-kxyd0g16.js:13740-13772 placement
function $n() {
  return isClaudeAiChatCowork() ? TENGU_GENTLE_DIJKSTRA : TENGU_BRASS_KITE;
}
//@ chunk-kxyd0g16.js:13772-13832 placement
function dIr() {
  return (
    getHostRendersChromeSetupOffer() &&
    wcn() &&
    isFirstPartyProvider() &&
    ebe() &&
    Wn() &&
    isChromeSetupOfferArmed()
  );
}
//@ chunk-kxyd0g16.js:13832-14104 placement
function isChromeSetupOfferArmed() {
  let e = Yi();
  if (e.chromeSetupOfferArm !== void 0) return e.chromeSetupOfferArm;
  if (e.chromeSetupOfferStateUnread || !isClientPlatformEligible()) return !1;
  let { value: r, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE($n(), !1);
  if (source === "fallback" || source === "disabled") return !1;
  return ((e.chromeSetupOfferArm = r === !0), e.chromeSetupOfferArm);
}
/**
 * 记录本回合客户端平台（用于决定是否提供 Chrome 设置），未知时记为 null。
 */
//@ chunk-kxyd0g16.js:14104-14264 placement
function noteTurnClientPlatform(e, r) {
  let of = EXr.of(e.host);
  if (r !== void 0 && Die(r)) of.lastTurnClientPlatform = r;
  else if (of.lastTurnClientPlatform === void 0) of.lastTurnClientPlatform = null;
}
//@ chunk-kxyd0g16.js:14264-14352 placement
function Jt(e, r) {
  return Wvn(r !== void 0 && Die(r) ? r : EXr.of(e.host).lastTurnClientPlatform);
}
//@ chunk-kxyd0g16.js:14352-14378 placement
function ft() {
  return isClaudeAiChatCowork();
}
//@ chunk-kxyd0g16.js:14378-14481 placement
function isClientPlatformEligible() {
  if (!ft()) return !0;
  let lastTurnClientPlatform = Yi().lastTurnClientPlatform;
  return lastTurnClientPlatform !== void 0 && lastTurnClientPlatform !== null && !Wvn(lastTurnClientPlatform);
}
//@ chunk-kxyd0g16.js:14481-14514 placement
function eo() {
  return Un() || wcn();
}
//@ chunk-kxyd0g16.js:14514-14567 placement
function Wn() {
  return (
    isFoamySpringEnabled() &&
    isToolSearchEnabledOptimistic() &&
    !getNonDeferrableBuiltins().includes(OFFER_CHROME_SETUP_TOOL_NAME)
  );
}
//@ chunk-kxyd0g16.js:14567-14616 placement
function Un() {
  return getChromeAvailabilityStagesLogged().has("tool_attempted");
}
//@ chunk-kxyd0g16.js:14616-14647 placement
var qn = new SessionRootSlot(() => ({ calls: 0 }));
//@ chunk-kxyd0g16.js:14647-14898 placement
function logChromeSetupOffered(e, r, n) {
  let of = qn.of(e);
  (of.calls++,
    logEvent("tengu_chrome_setup_offered", {
      outcome: fromEnum(r),
      nth_call: of.calls,
      chrome_tool_attempted: getChromeAvailabilityStagesLogged().has("tool_attempted"),
      isRemoteSession: Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID),
      ...(n && { messageClientPlatform: yW(n) }),
    }));
}
//@ chunk-kxyd0g16.js:14898-15098 placement
var chromeSetupOfferInputSchema = DoctorLazy(() =>
    zodStrictObject({
      reason: o()
        .max(200)
        .optional()
        .describe("A short phrase naming what the task needs the user's own browser for."),
    }),
  ),
  chromeSetupOfferOutputSchema = DoctorLazy(() =>
    u({ outcome: U(["connected", "not_now", "no_attempt_yet"]) }),
  );
//@ chunk-kxyd0g16.js:15098-15161 placement
function Yn(e) {
  let { reason: reason } = e;
  return reason === void 0 ? {} : { reason: reason };
}
/**
 * 向用户提供 Claude in Chrome 设置的工具。
 */
//@ chunk-kxyd0g16.js:15161-16347 placement
var ChromeSetupOfferTool = buildTool({
  name: OFFER_CHROME_SETUP_TOOL_NAME,
  searchHint: "offer the user Claude in Chrome setup for their own browser",
  shouldDefer: !0,
  whenToUse: esi,
  backgrounding: "never",
  maxResultSizeChars: 2000,
  get inputSchema() {
    return chromeSetupOfferInputSchema();
  },
  get outputSchema() {
    return chromeSetupOfferOutputSchema();
  },
  isEnabled: dIr,
  isConcurrencySafe() {
    return !1;
  },
  isReadOnly() {
    return !0;
  },
  requiresUserInteraction() {
    return !0;
  },
  admitCardAnswer: checkChromeSetupAnswer,
  async description() {
    return tsi;
  },
  async prompt() {
    return nsi;
  },
  toAutoClassifierInput(e) {
    return e.reason ? `offer Claude in Chrome setup: ${e.reason}` : "offer Claude in Chrome setup";
  },
  create({ messageClientPlatform: e, session: r }) {
    return {
      async validateInput() {
        if (ft() && Jt(r, e))
          return (logChromeSetupOffered(r, "phone", e), { result: !1, message: ssi, errorCode: 2 });
        if (eo()) return { result: !0 };
        return (logChromeSetupOffered(r, "no_attempt_yet", e), { result: !1, message: isi, errorCode: 1 });
      },
      async checkPermissions(n) {
        return {
          behavior: "ask",
          message: "Set up Claude in Chrome?",
          suppressAlwaysAllowRule: !0,
          updatedInput: Yn(n),
        };
      },
      async call(n) {
        let { outcome: outcome } = n,
          f = outcome === "connected" ? "connected" : "not_now";
        return (logChromeSetupOffered(r, f, e), { data: { outcome: f } });
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, r) {
    return { tool_use_id: r, type: "tool_result", content: e.outcome === "connected" ? rsi : osi };
  },
  renderToolUseMessage(e) {
    return e.reason ?? null;
  },
});

export { noteTurnClientPlatform, ChromeSetupOfferTool, dIr };
