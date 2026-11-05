/**
 * utils/plugins/pluginScopedWrite.ts
 *
 * 2.1.316 新增：插件范围写入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-16wzckdk.js (3)
 * attribution: placement 3
 */
import { logError } from "../log.js";
import { withTelemetryMessage, toError } from "../errors.js";
import { isManagedConfigScope } from "../../services/mcp/types.js";
import { isManagedOrPolicyBlocked } from "./managedPlugins.js";
import { withHostEnvRestored } from "../settings/hostEnvWrites.js";
import { nfcLower } from "../stringUtils.js";

//@ chunk-16wzckdk.js:377-409 placement
/**
 * logPluginScopedError：记录托管作用域插件错误。
 */
function logPluginScopedError(error, message) {
  logError(withTelemetryMessage(toError(error), message));
}
//@ chunk-16wzckdk.js:409-519 placement
/**
 * 托管作用域或受管插件来源。
 */
function isManagedPluginScope(config) {
  if (config.scope !== undefined && isManagedConfigScope(config.scope)) return true;
  return config.pluginSource !== undefined && isManagedOrPolicyBlocked(config.pluginSource);
}
//@ chunk-16wzckdk.js:519-640 placement
/**
 * 受管插件时在限定写权限的作用域中执行。
 */
function runWithPluginWriteScope(scope, fn) {
  if (!isManagedPluginScope(scope)) return fn();
  let { pluginSource } = scope;
  return withHostEnvRestored(
    fn,
    pluginSource === undefined
      ? {}
      : {
          keepsWrite: (name) => nfcLower(name) === nfcLower(pluginSource),
        },
  );
}
export { runWithPluginWriteScope, logPluginScopedError, isManagedPluginScope };
