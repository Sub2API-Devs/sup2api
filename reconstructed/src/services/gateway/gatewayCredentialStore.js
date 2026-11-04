/**
 * services/gateway/gatewayCredentialStore.ts
 *
 * 2.1.316 新增：保存新的网关凭据（失败时报告原因）；托管设置强制的网关登录 URL 与内网列表等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (11)
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
  getInitialSettings_2,
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

//@ chunk-aepeg2w5.js:498909-499423 placement
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
//@ chunk-aepeg2w5.js:499423-499481 placement
/**
 * 等待并取后台进程的认证快照（没有则 undefined）。
 */
async function consumeBgAuthSnapshot() {
  await waitForBgAuthSnapshot();
  return hasBgAuthSnapshotPending() ? consumeBgAuthSnapshot_2() : undefined;
}
//@ chunk-aepeg2w5.js:499481-499519 placement
/**
 * 判断错误码是否为权限被拒（EPERM、EACCES）。
 */
var isPermissionDeniedCode = (code) => code === "EPERM" || code === "EACCES";
//@ chunk-aepeg2w5.js:499519-499619 placement
var SECURE_STORAGE_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FALLBACK_STORAGE_RE;
deferInit("chunk-aepeg2w5.js:499519", () => {
  SECURE_STORAGE_KINDS = new Set(["keychain", "plaintext", "windows-credman"]);
  FALLBACK_STORAGE_RE = /^([a-z-]+)-with-([a-z-]+)-fallback$/;
});
//@ chunk-aepeg2w5.js:499619-499731 placement
function storageKindForTelemetry_2(name) {
  if (SECURE_STORAGE_KINDS.has(name)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(name);
  let match = FALLBACK_STORAGE_RE.exec(name);
  return match && SECURE_STORAGE_KINDS.has(match[1]) && SECURE_STORAGE_KINDS.has(match[2])
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name)
    : lit("other");
}
//@ chunk-aepeg2w5.js:499731-499815 placement
/**
 * 取用户设置里强制网关登录的地址。
 */
function forcedLoginGatewayUrl(settings) {
  return settings?.forceLoginMethod === "gateway" ? settings.forceLoginGatewayUrl : undefined;
}
//@ chunk-aepeg2w5.js:499815-499861 placement
/**
 * 是否受机器管理员策略管理（或文档不可读）。
 */
function isMachineAdminManaged() {
  return (
    getMachineAdminPolicyTier() !== null || isMachineAdminDocumentUnreadable() || hasManagedForceLoginOrg()
  );
}
//@ chunk-aepeg2w5.js:499861-499923 placement
/**
 * 托管设置里是否指定 forceLoginOrgUUID 或托管设置无效。
 */
function hasManagedForceLoginOrg() {
  return getParentManagedSettings()?.forceLoginOrgUUID !== undefined || getParentManagedSettingsInvalid();
}
//@ chunk-aepeg2w5.js:499923-500037 placement
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
//@ chunk-aepeg2w5.js:500037-500313 placement
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
  let forceLoginMethod = getInitialSettings_2().forceLoginMethod;
  if (developerUrl === undefined || forceLoginMethod === "claudeai" || forceLoginMethod === "console") return;
  return {
    url: developerUrl,
    namedBy: "developer",
  };
}
//@ chunk-aepeg2w5.js:500313-500590 placement
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
  getUserSettingsGateway,
  saveGatewayCredential,
  getForcedGatewayLogin,
};
