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
import { waitForBgAuthSnapshot, K1e, consumeBgAuthSnapshot } from "../../utils/authFileDescriptor.js";
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
import { providerBlockedMessage, tu, vf } from "../../utils/model/allowedProviders.js";
import { isGatewayLoginForced } from "../../utils/auth.js";
import { Ole } from "../../utils/settings/policyHelper/helperRemote.js";
import { hasPolicyHelperConfig } from "../../utils/settings/policyHelper/helperPayload.js";

/**
 * 保存新的网关凭据（失败时报告原因）。
 */
//@ chunk-aepeg2w5.js:498909-499423 placement
async function saveGatewayCredential(e, n, r) {
  setGatewayAuth(e);
  let s = !1,
    h,
    y,
    S = (w) =>
      s
        ? { outcome: "failed", replaced: h, replacedAllowlistEntry: y, message: w }
        : { outcome: "untouched", message: w };
  try {
    let mutate = await getSecureStorage().mutate((R) => {
      let x = hostOf(new URL(e.url)),
        { enterpriseGateway: enterpriseGateway, gatewayAllowlistEntries: gatewayAllowlistEntries, ...L } = R;
      return (
        (h = enterpriseGateway),
        (y = gatewayAllowlistEntries?.[x]),
        (s = !0),
        { ...L, enterpriseGateway: e, ...replaceAllowlistEntry(gatewayAllowlistEntries, x, r) }
      );
    }, n);
    if (!mutate.success)
      return S(`Failed to persist gateway credential${mutate.warning ? `: ${mutate.warning}` : ""}`);
  } catch (error) {
    return S(errorMessage(error));
  }
  return { outcome: "saved", replaced: h, replacedAllowlistEntry: y };
}
//@ chunk-aepeg2w5.js:499423-499481 placement
async function CA() {
  return (await waitForBgAuthSnapshot(), K1e() ? consumeBgAuthSnapshot() : void 0);
}
//@ chunk-aepeg2w5.js:499481-499519 placement
var RA = (e) => e === "EPERM" || e === "EACCES";
//@ chunk-aepeg2w5.js:499519-499619 placement
var SECURE_STORAGE_KINDS = new Set(["keychain", "plaintext", "windows-credman"]),
  FALLBACK_STORAGE_RE = /^([a-z-]+)-with-([a-z-]+)-fallback$/;
//@ chunk-aepeg2w5.js:499619-499731 placement
function storageKindForTelemetry(e) {
  if (SECURE_STORAGE_KINDS.has(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  let match = FALLBACK_STORAGE_RE.exec(e);
  return match && SECURE_STORAGE_KINDS.has(match[1]) && SECURE_STORAGE_KINDS.has(match[2])
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("other");
}
//@ chunk-aepeg2w5.js:499731-499815 placement
function OA(e) {
  return e?.forceLoginMethod === "gateway" ? e.forceLoginGatewayUrl : void 0;
}
//@ chunk-aepeg2w5.js:499815-499861 placement
function PA() {
  return getMachineAdminPolicyTier() !== null || isMachineAdminDocumentUnreadable() || MA();
}
//@ chunk-aepeg2w5.js:499861-499923 placement
function MA() {
  return getParentManagedSettings()?.forceLoginOrgUUID !== void 0 || getParentManagedSettingsInvalid();
}
/**
 * 读取 userSettings 中的网关配置。
 */
//@ chunk-aepeg2w5.js:499923-500037 placement
function getUserSettingsGateway() {
  {
    let e = OA(getSettingsForSource("userSettings"));
    if (!e || PA()) return;
    if (providerBlockedMessage("gateway") !== void 0) return;
    return e;
  }
  return;
}
/**
 * 托管设置强制的网关登录 URL 与内网列表。
 */
//@ chunk-aepeg2w5.js:500037-500313 placement
function getForcedGatewayLogin(e) {
  if (isGatewayLoginForced()) {
    let { forceLoginGatewayUrl: forceLoginGatewayUrl, gatewayInternalNetworks: gatewayInternalNetworks } =
      getHostPolicyLoginPins();
    return forceLoginGatewayUrl === void 0
      ? { url: forceLoginGatewayUrl }
      : { url: forceLoginGatewayUrl, namedBy: "administrator", internalNetworks: gatewayInternalNetworks };
  }
  let forceLoginMethod = getInitialSettings_2().forceLoginMethod;
  if (e === void 0 || forceLoginMethod === "claudeai" || forceLoginMethod === "console") return;
  return { url: e, namedBy: "developer" };
}
//@ chunk-aepeg2w5.js:500313-500590 placement
function isGatewayLoginRequired(e) {
  {
    let n = getMachineAdminPolicyTier(),
      r =
        n?.forceLoginGatewayUrl === void 0 && !Ole() && (n?.policyHelper != null || hasPolicyHelperConfig(n)),
      s = n?.forceLoginGatewayUrl === void 0 && n?.forceLoginMethod === "gateway";
    return (
      (r || s ? MA() || tu(OA(getSettingsForSourceTightenOnly("userSettings")), e) : PA()) &&
      !vf(e) &&
      !tu(getMachineAdminDocumentTier()?.forceLoginGatewayUrl, e)
    );
  }
  return !1;
}

export {
  CA,
  RA,
  isGatewayLoginRequired,
  storageKindForTelemetry,
  getUserSettingsGateway,
  saveGatewayCredential,
  getForcedGatewayLogin,
};
