/**
 * commands/bridge/index.ts
 *
 * /remote-control（别名 rc）命令对象，描述随连接状态在连接/断开之间切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/bridge/index.ts
 * pieces: chunk-53mky9yr.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import {
  isBridgeEnabled,
  isBridgeOffByAnOptInAlone,
  isRemoteControlHardDisabled,
} from "../../bridge/bridgeEntitlement.js";
import { isBridgeFirstParty } from "../../bridge/bridgeEnabled.js";
import { isRunningInRemoteEnvironment } from "../../bridge/bridgeGates.js";
import { getAuthTokenSource, getAnthropicApiKeyWithSourceSafe } from "../../utils/auth.js";
import { wYo } from "./c4eUpsellRegistry.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";

//@ chunk-53mky9yr.js:3600-3799 file-last-pair
function isEnabled() {
  if (isBridgeEnabled() || isBridgeOffByAnOptInAlone()) return !0;
  try {
    return (
      isBridgeFirstParty() &&
      !isRunningInRemoteEnvironment() &&
      !isRemoteControlHardDisabled() &&
      getAuthTokenSource().source === "none" &&
      getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "none" &&
      !wYo.isC4EUpsellCommandEnabled()
    );
  } catch {
    return !1;
  }
}
/**
 * /remote-control 命令对象（local-jsx）；描述：{return Wc()?"Disconnect Remote Control":"Control this session from your phone or claude.ai/code"}；别名 ["rc"]；isEnabled: e；isHidden: {return!wH()}；实现 chunk-k7ve8htw.js 的 Br。
 */
//@ chunk-53mky9yr.js:3799-4082 fingerprint = bridge (0.769)
var remoteControlCommandDefinition = {
    type: "local-jsx",
    name: "remote-control",
    aliases: ["rc"],
    get description() {
      return isReplBridgeActive()
        ? "Disconnect Remote Control"
        : "Control this session from your phone or claude.ai/code";
    },
    get argumentHint() {
      return isReplBridgeActive() ? void 0 : "[name]";
    },
    isEnabled: isEnabled,
    get isHidden() {
      return !isBridgeEnabled();
    },
    immediate: !0,
  },
  remoteControlCommand = remoteControlCommandDefinition;
