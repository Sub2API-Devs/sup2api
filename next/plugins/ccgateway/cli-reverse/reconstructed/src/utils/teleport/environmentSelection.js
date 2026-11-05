/**
 * utils/teleport/environmentSelection.ts
 *
 * 计算云端会话可用环境与当前选择。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/environmentSelection.ts
 * pieces: chunk-vr5v4gzz.js (9)
 * attribution: placement 7, layout 1, fingerprint 1
 */
import { getEnabledSettingSources } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-vr5v4gzz.js:15426-15478 placement
function isSelfHostedPoolEnv(environment) {
  return environment?.kind === "self_hosted_pool";
}
//@ chunk-vr5v4gzz.js:15478-15555 placement
function isSelfHostedPool(selection) {
  return selection.kind === "self_hosted_pool" ? selection.pool_id : selection.environment_id;
}
//@ chunk-vr5v4gzz.js:15555-15613 placement
function isCcpoolId(value) {
  return value !== undefined && value.startsWith("ccpool_");
}
//@ chunk-vr5v4gzz.js:15613-15662 placement
var CLOUD_ENVIRONMENT_KINDS = ["anthropic_cloud", "bridge", "snap", "ccs"];
//@ chunk-vr5v4gzz.js:15662-15869 placement
function selfHostedEnvironmentKind(environment) {
  let nonEmpty = (nonEmpty) => nonEmpty !== undefined && nonEmpty !== null && nonEmpty !== "";
  if (nonEmpty(environment.self_hosted_runner_pool_id)) return "pool";
  let environmentKind = environment.environment_kind;
  if (!nonEmpty(environmentKind) || CLOUD_ENVIRONMENT_KINDS.includes(environmentKind)) return null;
  return environmentKind === "byoc" ? "byoc" : "unlisted_kind";
}
//@ chunk-vr5v4gzz.js:15869-15906 placement
/**
 * 是否自托管环境。
 */
function isSelfHostedEnvironment(environment) {
  return selfHostedEnvironmentKind(environment) !== null;
}
//@ chunk-vr5v4gzz.js:15906-15941 placement
/**
 * 按谓词查找第一个匹配项。
 */
function findFirst(list, predicate) {
  return list.find(predicate);
}
//@ chunk-vr5v4gzz.js:15941-15997 layout (2.1.88 match: TRUSTED_SETTING_SOURCES, 1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
//@ chunk-vr5v4gzz.js:15997-16300 fingerprint (2.1.88 match: getEnvironmentSelectionInfo, 0.447)
/**
 * 计算可用云环境与当前选择。
 */
function getEnvironmentSelectionInfo() {
  let selection;
  let mergedSettings = getEnabledSettingSources();
  for (let j = mergedSettings.length - 1; j >= 0; j--) {
    let source = mergedSettings[j];
    let defaultEnvironmentId = getSettingsForSource(source)?.remote?.defaultEnvironmentId;
    if (defaultEnvironmentId === undefined) continue;
    if (isCcpoolId(defaultEnvironmentId) && !TRUSTED_SETTING_SOURCES.includes(source)) {
      selection ??= {
        id: defaultEnvironmentId,
        source,
      };
      continue;
    }
    return {
      id: defaultEnvironmentId,
      source,
      ignoredUntrustedPool: selection?.id === defaultEnvironmentId ? undefined : selection,
    };
  }
  return {
    id: undefined,
    source: undefined,
    ignoredUntrustedPool: selection,
  };
}
export {
  isCcpoolId,
  getEnvironmentSelectionInfo,
  findFirst,
  selfHostedEnvironmentKind,
  isSelfHostedPoolEnv,
  isSelfHostedPool,
  isSelfHostedEnvironment,
};
