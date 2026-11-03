/**
 * commands/status/status.tsx
 *
 * /status 实现：打开 Settings 面板 Status 页
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/status/status.tsx
 * pieces: chunk-gwbvvmmk.js (1)
 * attribution: fingerprint 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Settings } from "../../components/Settings/Settings.js";

/**
 * /status 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-gwbvvmmk.js:17175-17397 fingerprint = call (0.818)
async function call(onDone, context) {
  return e(Settings, {
    onClose: onDone,
    storageV5: context.storageV5,
    credentials: context.credentials,
    messages: context.messages,
    mcpClients: context.options.mcpClients,
    ideInstallationStatus: context.options.ideInstallationStatus,
    defaultTab: "Status",
  });
}
