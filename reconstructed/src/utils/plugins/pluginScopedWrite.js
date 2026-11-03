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
import { sdr } from "./managedPlugins.js";
import { AQ } from "../settings/managedSettingsFiles.js";
import { nfcLower } from "../stringUtils.js";

//@ chunk-mt0bfz4z.js:376-408 placement
function Wee(r, o) {
  logError(withTelemetryMessage(toError(r), o));
}
/**
 * 托管作用域或受管插件来源。
 */
//@ chunk-mt0bfz4z.js:408-518 placement
function isManagedPluginScope(r) {
  if (r.scope !== void 0 && isManagedConfigScope(r.scope)) return !0;
  return r.pluginSource !== void 0 && sdr(r.pluginSource);
}
/**
 * 受管插件时在限定写权限的作用域中执行。
 */
//@ chunk-mt0bfz4z.js:518-638 placement
function runWithPluginWriteScope(r, o) {
  if (!isManagedPluginScope(r)) return o();
  let { pluginSource: pluginSource } = r;
  return AQ(o, pluginSource === void 0 ? {} : { keepsWrite: (n) => nfcLower(n) === nfcLower(pluginSource) });
}

export { isManagedPluginScope, runWithPluginWriteScope, Wee };
