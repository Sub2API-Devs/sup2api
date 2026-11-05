/**
 * commands/cloud-plugins/index.ts
 *
 * 2.1.316 新增：/cloud-plugins 命令对象：管理 claude.ai 同步的插件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCloudPluginForwardingEnabledCached } from "../../services/analytics/violinGates.js";
import { env } from "../../utils/env.js";

//@ chunk-5xgkngpb.js:1759290-1759515 placement
/**
 * /cloud-plugins 命令对象（local-jsx）；描述：Choose whether cloud sessions use the plugins enabled on this machine；isEnabled: ()=>YTn()&&!i.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING；实现 chunk-n30mmv2p.js 的 No。
 */
var cloudPluginsCommand = {
  type: "local-jsx",
  name: "cloud-plugins",
  description: "Choose whether cloud sessions use the plugins enabled on this machine",
  requires: {
    workspace: false,
    ink: true,
  },
  isEnabled: () => isCloudPluginForwardingEnabledCached() && !env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
};
export { cloudPluginsCommand };
