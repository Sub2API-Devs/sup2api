/**
 * commands/mobile/mobile.tsx
 *
 * 并入已有模块：/mobile 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mobile/mobile.tsx
 * pieces: chunk-3q7pey4p.js (5)
 * attribution: placement 4, fingerprint 1
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * Claude in Chrome 的会话级状态（桥接绑定、浏览器提示、标签页、断连回答、设置提示等），reset 清空并让浏览器列表版本加一。
 */
//@ chunk-3q7pey4p.js:297-2093 placement
class ClaudeInChromeSessionState {
  bridgeBinding = void 0;
  browserHints = void 0;
  lastSentPreferredDeviceId = void 0;
  resolvedHostByToolUseId = new Map();
  shouldAutoEnable = void 0;
  wiredThisSession = !1;
  systemPromptSection = "";
  attachedInstructions = "";
  installUpsellResolution = void 0;
  installUpsellBypassSuppressionCounted = !1;
  trackedTabIds = new Set();
  tabGroupCleanupRegistered = !1;
  unsubscribeSessionSwitch = void 0;
  unregisterExitCleanup = void 0;
  closesInFlight = new Map();
  lastExecutedTabUrlByScope = new Map();
  resolvedUrlByToolUseId = new Map();
  browserRosterVersion = 0;
  browserRosterChanged = createSignal();
  noBrowserFound = void 0;
  relayConnectFailed = void 0;
  disconnectedAnswerCount = 0;
  disconnectedAnswerTexts = new Set();
  notConnectedSeenByPriorWorker = !1;
  notConnectedMirrored = !1;
  chromeSetupOfferArm = void 0;
  chromeSetupOfferArmMirrored = !1;
  chromeSetupOfferStateUnread = !1;
  lastTurnClientPlatform = void 0;
  reset() {
    ((this.bridgeBinding = void 0),
      (this.browserHints = void 0),
      (this.lastSentPreferredDeviceId = void 0),
      (this.resolvedHostByToolUseId = new Map()),
      (this.shouldAutoEnable = void 0),
      (this.wiredThisSession = !1),
      (this.systemPromptSection = ""),
      (this.attachedInstructions = ""),
      (this.installUpsellResolution = void 0),
      (this.installUpsellBypassSuppressionCounted = !1),
      (this.trackedTabIds = new Set()),
      (this.tabGroupCleanupRegistered = !1),
      this.unsubscribeSessionSwitch?.(),
      (this.unsubscribeSessionSwitch = void 0),
      this.unregisterExitCleanup?.(),
      (this.unregisterExitCleanup = void 0),
      (this.closesInFlight = new Map()),
      (this.lastExecutedTabUrlByScope = new Map()),
      (this.resolvedUrlByToolUseId = new Map()),
      this.browserRosterVersion++,
      (this.noBrowserFound = void 0),
      (this.relayConnectFailed = void 0),
      (this.disconnectedAnswerCount = 0),
      (this.notConnectedSeenByPriorWorker = !1),
      (this.notConnectedMirrored = !1),
      (this.chromeSetupOfferArm = void 0),
      (this.chromeSetupOfferArmMirrored = !1),
      (this.chromeSetupOfferStateUnread = !1),
      (this.lastTurnClientPlatform = void 0),
      (this.disconnectedAnswerTexts = new Set()));
  }
}
//@ chunk-3q7pey4p.js:2093-2141 fingerprint = _temp2 (1)
function Wvn(prev) {
  return prev === "ios" || prev === "android";
}
//@ chunk-3q7pey4p.js:2141-2166 placement
var EXr = new HostScoped(() => new ClaudeInChromeSessionState());
//@ chunk-3q7pey4p.js:2166-2204 placement
function Yi() {
  return EXr.of(getRootSession().host);
}
//@ chunk-3q7pey4p.js:2204-2293 placement
function vfi(e) {
  let n = Yi().resolvedHostByToolUseId.get(e);
  if (n !== void 0) n.keepHostPin = !0;
}

export { Yi, vfi, EXr, Wvn };
