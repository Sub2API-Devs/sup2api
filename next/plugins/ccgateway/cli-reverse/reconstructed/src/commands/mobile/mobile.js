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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3q7pey4p.js:297-2093 placement
/**
 * Claude in Chrome 的会话级状态（桥接绑定、浏览器提示、标签页、断连回答、设置提示等），reset 清空并让浏览器列表版本加一。
 */
class ClaudeInChromeSessionState {
  bridgeBinding = undefined;
  browserHints = undefined;
  lastSentPreferredDeviceId = undefined;
  resolvedHostByToolUseId = new Map();
  shouldAutoEnable = undefined;
  wiredThisSession = false;
  systemPromptSection = "";
  attachedInstructions = "";
  installUpsellResolution = undefined;
  installUpsellBypassSuppressionCounted = false;
  trackedTabIds = new Set();
  tabGroupCleanupRegistered = false;
  unsubscribeSessionSwitch = undefined;
  unregisterExitCleanup = undefined;
  closesInFlight = new Map();
  lastExecutedTabUrlByScope = new Map();
  resolvedUrlByToolUseId = new Map();
  browserRosterVersion = 0;
  browserRosterChanged = createSignal();
  noBrowserFound = undefined;
  relayConnectFailed = undefined;
  disconnectedAnswerCount = 0;
  disconnectedAnswerTexts = new Set();
  notConnectedSeenByPriorWorker = false;
  notConnectedMirrored = false;
  chromeSetupOfferArm = undefined;
  chromeSetupOfferArmMirrored = false;
  chromeSetupOfferStateUnread = false;
  lastTurnClientPlatform = undefined;
  reset() {
    this.bridgeBinding = undefined;
    this.browserHints = undefined;
    this.lastSentPreferredDeviceId = undefined;
    this.resolvedHostByToolUseId = new Map();
    this.shouldAutoEnable = undefined;
    this.wiredThisSession = false;
    this.systemPromptSection = "";
    this.attachedInstructions = "";
    this.installUpsellResolution = undefined;
    this.installUpsellBypassSuppressionCounted = false;
    this.trackedTabIds = new Set();
    this.tabGroupCleanupRegistered = false;
    this.unsubscribeSessionSwitch?.();
    this.unsubscribeSessionSwitch = undefined;
    this.unregisterExitCleanup?.();
    this.unregisterExitCleanup = undefined;
    this.closesInFlight = new Map();
    this.lastExecutedTabUrlByScope = new Map();
    this.resolvedUrlByToolUseId = new Map();
    this.browserRosterVersion++;
    this.noBrowserFound = undefined;
    this.relayConnectFailed = undefined;
    this.disconnectedAnswerCount = 0;
    this.notConnectedSeenByPriorWorker = false;
    this.notConnectedMirrored = false;
    this.chromeSetupOfferArm = undefined;
    this.chromeSetupOfferArmMirrored = false;
    this.chromeSetupOfferStateUnread = false;
    this.lastTurnClientPlatform = undefined;
    this.disconnectedAnswerTexts = new Set();
  }
}
//@ chunk-3q7pey4p.js:2093-2141 fingerprint (2.1.88 match: _temp2, 1)
/**
 * 判断持久化的平台是否为移动端（ios/android）。
 */
function isMobilePlatform(prev) {
  return prev === "ios" || prev === "android";
}
//@ chunk-3q7pey4p.js:2141-2166 placement
/**
 * 按宿主缓存的 ClaudeInChromeSessionState。
 */
var CLAUDE_IN_CHROME_SESSION_SLOT; // deferred: uses ClaudeInChromeSessionState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3q7pey4p.js:2141", () => {
  CLAUDE_IN_CHROME_SESSION_SLOT = new HostScoped(() => new ClaudeInChromeSessionState());
});
//@ chunk-3q7pey4p.js:2166-2204 placement
/**
 * 取当前会话的 ClaudeInChrome 会话状态（按 tool_use_id 记录已解析 host 等），50 多处调用。
 */
function claudeInChromeSession() {
  return CLAUDE_IN_CHROME_SESSION_SLOT.of(getRootSession().host);
}
//@ chunk-3q7pey4p.js:2204-2293 placement
/**
 * 把某 tool_use_id 已解析的 host 标记为 keepHostPin（保持宿主固定）。
 */
function keepResolvedHostPin(toolUseID) {
  let pin = claudeInChromeSession().resolvedHostByToolUseId.get(toolUseID);
  if (pin !== undefined) pin.keepHostPin = true;
}
export { claudeInChromeSession, keepResolvedHostPin, CLAUDE_IN_CHROME_SESSION_SLOT, isMobilePlatform };
