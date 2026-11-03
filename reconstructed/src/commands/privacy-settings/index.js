/**
 * commands/privacy-settings/index.ts
 *
 * /privacy-settings 命令对象（claude.ai 订阅可用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/privacy-settings/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isConsumerSubscriber } from "../../utils/auth.js";

//@ chunk-e6aww6q8.js:2028028-2028176 fingerprint = privacySettings (0.848)
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
