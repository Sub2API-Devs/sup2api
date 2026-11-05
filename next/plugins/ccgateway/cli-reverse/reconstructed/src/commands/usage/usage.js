/**
 * commands/usage/usage.tsx
 *
 * /usage 交互实现：打开 Settings 面板 Usage 或 Stats 页（按调用名）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/usage/usage.tsx
 * pieces: chunk-66cjap1m.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Settings } from "../../components/Settings/Settings.js";

//@ chunk-66cjap1m.js:18407-18658 fingerprint (2.1.88 match: call, 0.585)
/**
 * /usage 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context, args, invokedName) => {
  let defaultTab = invokedName === "stats" ? "Stats" : "Usage";
  return jsxProd_default(Settings, {
    onClose: onDone,
    storageV5: context.storageV5,
    credentials: context.credentials,
    messages: context.messages,
    mcpClients: context.options.mcpClients,
    ideInstallationStatus: context.options.ideInstallationStatus,
    defaultTab,
  });
};
export { call };
