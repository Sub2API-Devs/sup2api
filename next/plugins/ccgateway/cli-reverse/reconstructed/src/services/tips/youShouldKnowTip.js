/**
 * services/tips/youShouldKnowTip.ts
 *
 * 推荐插件提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wj968rvb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { color } from "../../components/design-system/color.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { isBuiltinPluginAvailable, getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { findEnabledSettingForPlugin } from "../../utils/plugins/managedPlugins.js";

//@ chunk-wj968rvb.js:307-343 placement
var CC_PLUGIN_YOU_SHOULD_KNOW = "cc-plugin-you-should-know";
//@ chunk-wj968rvb.js:343-717 placement
var YOU_SHOULD_KNOW_PLUGIN_TIP = {
  id: "you-should-know-plugin",
  providerAgnostic: true,
  advertisedCommand: "plugin",
  cooldownSessions: 10,
  maxLifetimeShows: 3,
  content: async (ctx) => `Want a side agent watching your back while Claude works? Turn on You should know:
${color("suggestion", ctx.theme)(`/plugin enable ${CC_PLUGIN_YOU_SHOULD_KNOW}@${BUILTIN}`)}`,
  isRelevant: async () =>
    isBuiltinPluginAvailable(CC_PLUGIN_YOU_SHOULD_KNOW) &&
    getBuiltinPlugin(CC_PLUGIN_YOU_SHOULD_KNOW)?.defaultEnabled === false &&
    findEnabledSettingForPlugin(`${CC_PLUGIN_YOU_SHOULD_KNOW}@${BUILTIN}`) === undefined,
};
export { YOU_SHOULD_KNOW_PLUGIN_TIP, CC_PLUGIN_YOU_SHOULD_KNOW };
