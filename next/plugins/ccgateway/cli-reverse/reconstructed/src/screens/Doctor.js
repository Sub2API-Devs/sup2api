/**
 * screens/Doctor.tsx
 *
 * /doctor 诊断屏幕：安装方式、版本、更新、配置/设置校验、keybinding 等检查项汇总。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/screens/Doctor.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-cckh1dq3.js (1), chunk-ejn7s5p2.js (1), chunk-exfmq47h.js (1)
 * attribution: fingerprint 4
 */
import { getModelMaxOutputTokens } from "../utils/context.js";
import { identity as identity_2 } from "../utils/identity.js";
import { deserializePermissionContext } from "../utils/permissions/permissionContextSerialization.js";
import { holdUnresolvedWorkingDirPathAsNamed } from "../utils/permissions/filesystem.js";
import { composeRepoDenyAskRules } from "../utils/permissions/repoRules.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:486591-486634 fingerprint (2.1.88 match: _temp8, 1)
/**
 * 导出函数 `maxOutputTokensMinusOne`：参数 v，返回 getModelMaxOutputTokens(v).upperLimit - 1。
 */
function maxOutputTokensMinusOne(v) {
  return getModelMaxOutputTokens(v).upperLimit - 1;
}
//@ chunk-5xgkngpb.js:247001-247051 fingerprint (2.1.88 match: _temp5, 0.612)
var latestDiagnosticsStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:247001", () => {
  latestDiagnosticsStore = identity_2(
    {
      latest: undefined,
    },
    (store) => {
      store.latest = undefined;
    },
  );
});
//@ chunk-cckh1dq3.js:362-452 fingerprint (2.1.88 match: _temp7, 0.509)
/**
 * 导出函数 `isReportableDiagnostic`：参数 error，返回 error.filter((r) => !r.mcpErrorMetadata && !r.statusOnly && !r.startupFatal)。
 */
function isReportableDiagnostic(error) {
  return error.filter(
    (diagnostics) => !diagnostics.mcpErrorMetadata && !diagnostics.statusOnly && !diagnostics.startupFatal,
  );
}
//@ chunk-ejn7s5p2.js:534-684 fingerprint (2.1.88 match: _temp6, 0.473)
function buildNativeDoctorDiagnostics(serialized, launchRules, repoRoot, mergeOptions) {
  let storedRules = deserializePermissionContext(serialized);
  for (let [path, { source }] of storedRules.additionalWorkingDirectories)
    if (source !== "cliArg") holdUnresolvedWorkingDirPathAsNamed(path);
  return {
    ...storedRules,
    ...composeRepoDenyAskRules(storedRules, launchRules, repoRoot, mergeOptions, "native"),
  };
}
export {
  maxOutputTokensMinusOne,
  isReportableDiagnostic,
  latestDiagnosticsStore,
  buildNativeDoctorDiagnostics,
};
