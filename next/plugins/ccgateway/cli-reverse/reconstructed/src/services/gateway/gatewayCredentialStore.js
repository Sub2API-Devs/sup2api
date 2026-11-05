/**
 * services/gateway/gatewayCredentialStore.ts
 *
 * 2.1.316 新增：保存新的网关凭据（失败时报告原因）；托管设置强制的网关登录 URL 与内网列表等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (11)
 * attribution: placement 11
 */
import {
  setGatewayAuth,
  getParentManagedSettings,
  getParentManagedSettingsInvalid,
} from "../../bootstrap/state.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { hostOf } from "./internalNetworks.js";
import { replaceAllowlistEntry } from "./gatewayAuth.js";
import { errorMessage } from "../../utils/errors.js";
import {
  waitForBgAuthSnapshot,
  hasBgAuthSnapshotPending,
  consumeBgAuthSnapshot as consumeBgAuthSnapshot_2,
} from "../../utils/authFileDescriptor.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../analytics/safeMetadata.js";
import {
  getMachineAdminPolicyTier,
  isMachineAdminDocumentUnreadable,
  getSettingsForSource,
  getHostPolicyLoginPins,
  getInitialSettings,
  getSettingsForSourceTightenOnly,
  getMachineAdminDocumentTier,
} from "../../utils/settings/settings.js";
import {
  providerBlockedMessage,
  sameGatewayUrl,
  isGatewayLoginUrl,
} from "../../utils/model/allowedProviders.js";
import { isGatewayLoginForced } from "../../utils/auth.js";
import { hasRemoteHelperState } from "../../utils/settings/policyHelper/helperRemote.js";
import { hasPolicyHelperConfig } from "../../utils/settings/policyHelper/helperPayload.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:510903-511417 placement
/**
 * 保存新的网关凭据（失败时报告原因）。
 */
async function saveGatewayCredential(credential, credentials, allowlistEntry) {
  setGatewayAuth(credential);
  let wrote = false;
  let replaced;
  let replacedAllowlistEntry;
  let toFailure = (message) =>
    wrote
      ? {
          outcome: "failed",
          replaced,
          replacedAllowlistEntry,
          message,
        }
      : {
          outcome: "untouched",
          message,
        };
  try {
    let mutateResult = await getSecureStorage().mutate((stored) => {
      let hostKey = hostOf(new URL(credential.url));
      let { enterpriseGateway, gatewayAllowlistEntries, ...rest } = stored;
      replaced = enterpriseGateway;
      replacedAllowlistEntry = gatewayAllowlistEntries?.[hostKey];
      wrote = true;
      return {
        ...rest,
        enterpriseGateway: credential,
        ...replaceAllowlistEntry(gatewayAllowlistEntries, hostKey, allowlistEntry),
      };
    }, credentials);
    if (!mutateResult.success)
      return toFailure(
        `Failed to persist gateway credential${mutateResult.warning ? `: ${mutateResult.warning}` : ""}`,
      );
  } catch (error) {
    return toFailure(errorMessage(error));
  }
  return {
    outcome: "saved",
    replaced,
    replacedAllowlistEntry,
  };
}
//@ chunk-exfmq47h.js:511417-511475 placement
/**
 * 等待并取后台进程的认证快照（没有则 undefined）。
 */
async function consumeBgAuthSnapshot() {
  await waitForBgAuthSnapshot();
  return hasBgAuthSnapshotPending() ? consumeBgAuthSnapshot_2() : undefined;
}
//@ chunk-exfmq47h.js:511475-511513 placement
/**
 * 判断错误码是否为权限被拒（EPERM、EACCES）。
 */
var isPermissionDeniedCode = (code) => code === "EPERM" || code === "EACCES";
//@ chunk-exfmq47h.js:511513-511613 placement
var SECURE_STORAGE_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FALLBACK_STORAGE_RE;
deferInit("chunk-exfmq47h.js:511513", () => {
  SECURE_STORAGE_KINDS = new Set(["keychain", "plaintext", "windows-credman"]);
  FALLBACK_STORAGE_RE = /^([a-z-]+)-with-([a-z-]+)-fallback$/;
});
//@ chunk-exfmq47h.js:511613-511725 placement
function storageKindForTelemetry_2(name) {
  if (SECURE_STORAGE_KINDS.has(name)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(name);
  let match = FALLBACK_STORAGE_RE.exec(name);
  return match && SECURE_STORAGE_KINDS.has(match[1]) && SECURE_STORAGE_KINDS.has(match[2])
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name)
    : lit("other");
}
//@ chunk-exfmq47h.js:511725-511809 placement
/**
 * 取用户设置里强制网关登录的地址。
 */
function forcedLoginGatewayUrl(settings) {
  return settings?.forceLoginMethod === "gateway" ? settings.forceLoginGatewayUrl : undefined;
}
//@ chunk-exfmq47h.js:511809-511855 placement
/**
 * 是否受机器管理员策略管理（或文档不可读）。
 */
function isMachineAdminManaged() {
  return (
    getMachineAdminPolicyTier() !== null || isMachineAdminDocumentUnreadable() || hasManagedForceLoginOrg()
  );
}
//@ chunk-exfmq47h.js:511855-511916 placement
/**
 * 托管设置里是否指定 forceLoginOrgUUID 或托管设置无效。
 */
function hasManagedForceLoginOrg() {
  return getParentManagedSettings()?.forceLoginOrgUUID !== undefined || getParentManagedSettingsInvalid();
}
//@ chunk-exfmq47h.js:511916-512030 placement
/**
 * 读取 userSettings 中的网关配置。
 */
function getUserSettingsGateway() {
  {
    let url = forcedLoginGatewayUrl(getSettingsForSource("userSettings"));
    if (!url || isMachineAdminManaged()) return;
    if (providerBlockedMessage("gateway") !== undefined) return;
    return url;
  }
  return;
}
//@ chunk-exfmq47h.js:512030-512306 placement
/**
 * 托管设置强制的网关登录 URL 与内网列表。
 */
function getForcedGatewayLogin(developerUrl) {
  if (isGatewayLoginForced()) {
    let { forceLoginGatewayUrl, gatewayInternalNetworks } = getHostPolicyLoginPins();
    return forceLoginGatewayUrl === undefined
      ? {
          url: forceLoginGatewayUrl,
        }
      : {
          url: forceLoginGatewayUrl,
          namedBy: "administrator",
          internalNetworks: gatewayInternalNetworks,
        };
  }
  let forceLoginMethod = getInitialSettings().forceLoginMethod;
  if (developerUrl === undefined || forceLoginMethod === "claudeai" || forceLoginMethod === "console") return;
  return {
    url: developerUrl,
    namedBy: "developer",
  };
}
//@ chunk-exfmq47h.js:512306-512584 placement
function isGatewayLoginRequired(url) {
  {
    let settings = getMachineAdminPolicyTier();
    let rules =
      settings?.forceLoginGatewayUrl === undefined &&
      !hasRemoteHelperState() &&
      (settings?.policyHelper != null || hasPolicyHelperConfig(settings));
    let reason = settings?.forceLoginGatewayUrl === undefined && settings?.forceLoginMethod === "gateway";
    return (
      (rules || reason
        ? hasManagedForceLoginOrg() ||
          sameGatewayUrl(forcedLoginGatewayUrl(getSettingsForSourceTightenOnly("userSettings")), url)
        : isMachineAdminManaged()) &&
      !isGatewayLoginUrl(url) &&
      !sameGatewayUrl(getMachineAdminDocumentTier()?.forceLoginGatewayUrl, url)
    );
  }
  return false;
}
export {
  consumeBgAuthSnapshot,
  isPermissionDeniedCode,
  isGatewayLoginRequired,
  storageKindForTelemetry_2,
  getForcedGatewayLogin,
  getUserSettingsGateway,
  saveGatewayCredential,
};
