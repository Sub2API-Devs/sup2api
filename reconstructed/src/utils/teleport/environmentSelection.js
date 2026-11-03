/**
 * utils/teleport/environmentSelection.ts
 *
 * 计算云端会话可用环境与当前选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/environmentSelection.ts
 * pieces: chunk-f25sswmp.js (9)
 * attribution: placement 7, layout 1, fingerprint 1
 */
import { getEnabledSettingSources } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-f25sswmp.js:14776-14828 placement
function isSelfHostedPoolEnv(e) {
  return e?.kind === "self_hosted_pool";
}
//@ chunk-f25sswmp.js:14828-14905 placement
function isSelfHostedPool(e) {
  return e.kind === "self_hosted_pool" ? e.pool_id : e.environment_id;
}
//@ chunk-f25sswmp.js:14905-14964 placement
function isCcpoolId(e) {
  return e !== void 0 && e.startsWith("ccpool_");
}
//@ chunk-f25sswmp.js:14964-15013 placement
var ut = ["anthropic_cloud", "bridge", "snap", "ccs"];
//@ chunk-f25sswmp.js:15013-15220 placement
function selfHostedEnvironmentKind(e) {
  let n = (s) => s !== void 0 && s !== null && s !== "";
  if (n(e.self_hosted_runner_pool_id)) return "pool";
  let environment_kind = e.environment_kind;
  if (!n(environment_kind) || ut.includes(environment_kind)) return null;
  return environment_kind === "byoc" ? "byoc" : "unlisted_kind";
}
//@ chunk-f25sswmp.js:15220-15257 placement
function Hsr(e) {
  return selfHostedEnvironmentKind(e) !== null;
}
//@ chunk-f25sswmp.js:15257-15292 placement
function tPe(e, n) {
  return e.find(n);
}
//@ chunk-f25sswmp.js:15292-15348 layout = TRUSTED_SETTING_SOURCES (1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
/**
 * 计算可用云环境与当前选择。
 */
//@ chunk-f25sswmp.js:15348-15653 fingerprint = getEnvironmentSelectionInfo (0.447)
function getEnvironmentSelectionInfo() {
  let e,
    mergedSettings = getEnabledSettingSources();
  for (let r = mergedSettings.length - 1; r >= 0; r--) {
    let source = mergedSettings[r],
      i = getSettingsForSource(source)?.remote?.defaultEnvironmentId;
    if (i === void 0) continue;
    if (isCcpoolId(i) && !TRUSTED_SETTING_SOURCES.includes(source)) {
      e ??= { id: i, source: source };
      continue;
    }
    return { id: i, source: source, ignoredUntrustedPool: e?.id === i ? void 0 : e };
  }
  return { id: void 0, source: void 0, ignoredUntrustedPool: e };
}

export {
  isSelfHostedPoolEnv,
  isSelfHostedPool,
  getEnvironmentSelectionInfo,
  isCcpoolId,
  tPe,
  selfHostedEnvironmentKind,
  Hsr,
};
