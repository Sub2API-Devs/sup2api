/**
 * utils/auth/gatewayAuthFastPath.ts
 *
 * 2.1.316 新增。快速路径恢复网关认证（CA 证书、mTLS、托管环境）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mf4z1bxv.js (1)
 * attribution: placement 1
 */
import { applyExtraCACertsFromConfig } from "../caCertsConfig.js";
import { loadExtraCACerts } from "../caCerts.js";
import { loadMTLSClientMaterial } from "../mtls.js";
import {
  setGatewayRequiredByHostPolicyReader,
  getGatewayAuth,
  isGatewayRequiredByHostPolicy,
} from "../../bootstrap/state.js";
import { withoutHostManagedProviderVars } from "../managedEnv.js";
import { restoreGatewayAuth } from "../auth.js";
import { resetRemoteSettingsSyncCache } from "../../services/cloudSessions/eligibility.js";

//@ chunk-mf4z1bxv.js:422-528 placement
/**
 * 快速路径恢复网关认证（CA 证书、mTLS、托管环境）。
 */
async function restoreGatewayAuthForFastPath(e, t) {
  applyExtraCACertsFromConfig();
  await Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()]);
  setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars);
  await restoreGatewayAuth(e, t);
  if (getGatewayAuth() || isGatewayRequiredByHostPolicy()) resetRemoteSettingsSyncCache();
}
export { restoreGatewayAuthForFastPath };
