/**
 * commands/bridge/index.ts
 *
 * /remote-control（别名 rc）命令对象，描述随连接状态在连接/断开之间切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/bridge/index.ts
 * pieces: chunk-51vbfcc3.js (2)
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
import { C4E_UPSELL_REGISTRY } from "./c4eUpsellRegistry.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";

//@ chunk-51vbfcc3.js:3908-4107 file-last-pair
function isEnabled() {
  if (isBridgeEnabled() || isBridgeOffByAnOptInAlone()) return true;
  try {
    return (
      isBridgeFirstParty() &&
      !isRunningInRemoteEnvironment() &&
      !isRemoteControlHardDisabled() &&
      getAuthTokenSource().source === "none" &&
      getAnthropicApiKeyWithSourceSafe({
        skipRetrievingKeyFromApiKeyHelper: true,
      }).source === "none" &&
      !C4E_UPSELL_REGISTRY.isC4EUpsellCommandEnabled()
    );
  } catch {
    return false;
  }
}
//@ chunk-51vbfcc3.js:4107-4390 fingerprint (2.1.88 match: bridge, 0.769)
/**
 * /remote-control 命令对象（local-jsx）；描述：{return Wc()?"Disconnect Remote Control":"Control this session from your phone or claude.ai/code"}；别名 ["rc"]；isEnabled: e；isHidden: {return!wH()}；实现 chunk-k7ve8htw.js 的 Br。
 */
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
    return isReplBridgeActive() ? undefined : "[name]";
  },
  isEnabled,
  get isHidden() {
    return !isBridgeEnabled();
  },
  immediate: true,
};
var remoteControlCommand = remoteControlCommandDefinition;
export { remoteControlCommand };
