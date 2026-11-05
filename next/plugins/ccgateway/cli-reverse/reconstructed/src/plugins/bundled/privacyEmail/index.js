/**
 * plugins/bundled/privacyEmail/index.ts
 *
 * 内置插件 privacyEmail：shell/网页类工具的参数里出现登录账号邮箱时改为询问，插件注册与 hooks 入口（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8b3c8k70.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
import { CC_PLUGIN_PRIVACY } from "../../hooksModules/privacyPluginName.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

//@ chunk-8b3c8k70.js:3813-3913 placement
var hooksModule = __commonJS(function (mod, exportsObj) {
  exportsObj.exports = {
    scan: {
      hooks: ["tool.check"],
      calls: ["session.identity"],
    },
    files: {},
  };
});
//@ chunk-8b3c8k70.js:3913-3922 placement
/**
 * privacyEmail 插件的默认导出对象。
 */
var pluginExports = {};
//@ chunk-8b3c8k70.js:3922-4003 placement
__export(pluginExports, {
  PLUGIN_NAME: () => CC_PLUGIN_PRIVACY,
  default: () => pluginExports,
  isAvailable: () => isAvailable,
  registerPlugin: () => registerPlugin,
});
//@ chunk-8b3c8k70.js:4003-4012 placement
var hooksNamespace = {};
//@ chunk-8b3c8k70.js:4012-4049 placement
__export(hooksNamespace, {
  default: () => hooksNamespace,
  register: () => register,
});
//@ chunk-8b3c8k70.js:4049-4058 placement
var DEFAULT_AVAILABLE = true;
//@ chunk-8b3c8k70.js:4058-4102 placement
/**
 * 插件可用性开关（tengu_wise_newt）。
 */
function isAvailable() {
  return getFeatureValue_SESSION_PINNED("tengu_wise_newt", DEFAULT_AVAILABLE);
}
//@ chunk-8b3c8k70.js:4102-4324 placement
var WEB_TOOLS = ["WebBrowser", "WebFetch", "WebSearch"];
var SHELL_TOOLS = ["Bash", "Monitor", "PowerShell", "Tmux"];
var NETWORK_COMMAND_PATTERN =
  /\b(curl|wget|https?|httpie|xh|nc|ncat|socat|telnet|ssh|scp|sftp|rsync|ftp|lftp|rclone|iwr|irm|invoke-webrequest|invoke-restmethod)\b/;
//@ chunk-8b3c8k70.js:4324-4460 placement
var _ =
  "This call's input holds your account email address, which may leave this machine. If nobody asked to send it, go on without it.";
//@ chunk-8b3c8k70.js:4460-4976 placement
/**
 * tool.check hook：工具输入里出现登录账号邮箱且调用可能出网时改为 ask，给出隐私说明。
 */
function register(on) {
  on(
    "tool.check",
    {
      tool: [...WEB_TOOLS, ...SHELL_TOOLS],
    },
    async (context, event, next) => {
      let decision = await next(event);
      if (decision.decision === "deny") return decision;
      let lower = JSON.stringify(event.input).toLowerCase();
      let replaced = lower.replace(/%([0-9a-f]{2})/g, (whole, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
      let lower_2 = `${lower}
${replaced}`.toLowerCase();
      if (!lower_2.includes("@")) return decision;
      let { email } = await context.session.identity();
      let accountEmail = email?.toLowerCase() ?? "";
      if (accountEmail === "" || !lower_2.includes(accountEmail)) return decision;
      let replaced_2 = lower_2.replaceAll(accountEmail, " ").replace(/\\(?:\\|[nrt])/g, " ");
      return WEB_TOOLS.includes(event.tool) || NETWORK_COMMAND_PATTERN.test(replaced_2)
        ? {
            decision: "ask",
            reason: _,
          }
        : decision;
    },
  );
}
//@ chunk-8b3c8k70.js:4976-5252 placement
/**
 * 注册 privacyEmail 插件（默认启用、仅信任设置可启、带 hooks 模块）。
 */
function registerPlugin() {
  registerBuiltinPlugin({
    name: CC_PLUGIN_PRIVACY,
    description:
      "Privacy: asks before a shell or web tool runs with the signed-in account's email address in a call that may leave the machine",
    defaultEnabled: true,
    enabledFromTrustedSettingsOnly: true,
    isAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, hooksNamespace, () => hooksModule()),
  });
}
export { pluginExports, isAvailable, registerPlugin };
