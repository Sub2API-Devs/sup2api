/**
 * utils/plugins/pluginScopedWrite.ts
 *
 * 2.1.316 新增：插件范围写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mt0bfz4z.js (3)
 * attribution: placement 3
 */
import { logError } from "../log.js";
import { withTelemetryMessage, toError } from "../errors.js";
import { isManagedConfigScope } from "../../services/mcp/types.js";
import { isManagedOrPolicyBlocked } from "./managedPlugins.js";
import { withHostEnvRestored } from "../settings/managedSettingsFiles.js";
import { nfcLower } from "../stringUtils.js";

//@ chunk-mt0bfz4z.js:376-408 placement
/**
 * logPluginScopedError：记录托管作用域插件错误。
 */
function logPluginScopedError(r, o) {
  logError(withTelemetryMessage(toError(r), o));
}
//@ chunk-mt0bfz4z.js:408-518 placement
/**
 * 托管作用域或受管插件来源。
 */
function isManagedPluginScope(config) {
  if (config.scope !== undefined && isManagedConfigScope(config.scope)) return true;
  return config.pluginSource !== undefined && isManagedOrPolicyBlocked(config.pluginSource);
}
//@ chunk-mt0bfz4z.js:518-638 placement
/**
 * 受管插件时在限定写权限的作用域中执行。
 */
function runWithPluginWriteScope(r, o) {
  if (!isManagedPluginScope(r)) return o();
  let { pluginSource } = r;
  return withHostEnvRestored(
    o,
    pluginSource === undefined
      ? {}
      : {
          keepsWrite: (n) => nfcLower(n) === nfcLower(pluginSource),
        },
  );
}
export { isManagedPluginScope, runWithPluginWriteScope, logPluginScopedError };
