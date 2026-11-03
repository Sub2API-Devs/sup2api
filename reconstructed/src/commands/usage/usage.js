/**
 * commands/usage/usage.tsx
 *
 * /usage 交互实现：打开 Settings 面板 Usage 或 Stats 页（按调用名）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/usage/usage.tsx
 * pieces: chunk-b8fqh6y9.js (1)
 * attribution: fingerprint 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Settings } from "../../components/Settings/Settings.js";

/**
 * /usage 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-b8fqh6y9.js:17175-17426 fingerprint = call (0.584)
var call = async (onDone, context, args, invokedName) => {
  let l = invokedName === "stats" ? "Stats" : "Usage";
  return e(Settings, {
    onClose: onDone,
    storageV5: context.storageV5,
    credentials: context.credentials,
    messages: context.messages,
    mcpClients: context.options.mcpClients,
    ideInstallationStatus: context.options.ideInstallationStatus,
    defaultTab: l,
  });
};
