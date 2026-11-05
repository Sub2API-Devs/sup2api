/**
 * commands/privacy-settings/index.ts
 *
 * /privacy-settings 命令对象（claude.ai 订阅可用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/privacy-settings/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
import { isConsumerSubscriber } from "../../utils/auth.js";

//@ chunk-5xgkngpb.js:2083845-2083993 fingerprint (2.1.88 match: privacySettings, 0.848)
/**
 * /privacy-settings 命令对象（local-jsx）；描述：View and update your privacy settings；isEnabled: ()=>_G()；实现 chunk-p3x5wbde.js 的 _。
 */
var privacySettingsCommandDefinition = {
  type: "local-jsx",
  name: "privacy-settings",
  description: "View and update your privacy settings",
  isEnabled: () => isConsumerSubscriber(),
  requires: {
    ink: true,
  },
};
var privacySettingsCommand = privacySettingsCommandDefinition;
export { privacySettingsCommand };
