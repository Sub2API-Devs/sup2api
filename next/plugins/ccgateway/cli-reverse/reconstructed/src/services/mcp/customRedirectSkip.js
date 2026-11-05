/**
 * services/mcp/customRedirectSkip.ts
 *
 * 2.1.316 新增：MCP OAuth：服务器支持动态客户端注册时跳过宿主自定义回调 URI（tengu_sharded_globe）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createCommitAttributionState } from "../../utils/commitAttribution.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import { getServerKey } from "./auth.js";
import { isRegistrationPendingEntry, isFreshTimestamp } from "./registrationStatus.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  sanitizeErrorName,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nh1pvp1m.js:128578-128590 placement
/**
 * 提交归因状态的实例（当前未使用）。
 */
var commitAttributionState; // deferred: uses createCommitAttributionState (../../utils/commitAttribution.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nh1pvp1m.js:128578", () => {
  commitAttributionState = createCommitAttributionState();
});
//@ chunk-nh1pvp1m.js:128590-128675 placement
/**
 * 按宿主保存的自定义重定向探测状态（probe、pathProbe）。
 */
class CustomRedirectProbeState {
  probe = null;
  pathProbe = null;
  setProbe(probe, pathProbe = null) {
    this.probe = probe;
    this.pathProbe = pathProbe;
  }
}
//@ chunk-nh1pvp1m.js:128675-128700 placement
/**
 * 上述状态的宿主作用域单例（当前未使用）。
 */
var customRedirectProbeState; // deferred: uses CustomRedirectProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nh1pvp1m.js:128675", () => {
  customRedirectProbeState = new HostScoped(() => new CustomRedirectProbeState());
});
//@ chunk-nh1pvp1m.js:128700-128729 placement
var TENGU_SHARDED_GLOBE = "tengu_sharded_globe";
//@ chunk-nh1pvp1m.js:128729-129562 placement
/**
 * 判断 MCP 服务器可否跳过宿主自定义 redirect URI 改走默认登录（读凭据存储失败时不跳过）。
 */
async function shouldSkipCustomRedirect(serverName, config) {
  if (
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHARDED_GLOBE, false) !== true ||
    config.oauth?.authServerMetadataUrl
  )
    return false;
  try {
    let storedEntry = (await readMcpOAuthStore())?.[getServerKey(serverName, config)];
    let registrationNotOffered =
      isRegistrationPendingEntry(storedEntry) &&
      !storedEntry.clientId &&
      isFreshTimestamp(storedEntry.discoveryState?.registrationNotOfferedAt);
    if (registrationNotOffered) {
      logFeatureOk("mcp_authenticate_custom_redirect_skip");
      logForDebugging(
        `MCP server ${serverName}: skipping the host's custom redirect URI and signing in through localhost, because its authorization server offered no client registration when last checked`,
      );
    }
    return registrationNotOffered;
  } catch (error) {
    logForDebugging(
      `Could not read the credentials store to check whether ${serverName} offers client registration, so the host's custom redirect URI is tried first: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    let errorName = sanitizeErrorName(error);
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `shouldSkipCustomRedirect: credentials store read failed (${errorName ?? "unnamed error"})`,
        "shouldSkipCustomRedirect: credentials store read failed",
      ),
    );
    logFeatureSad("mcp_authenticate_custom_redirect_skip", "store_read_failed");
    return false;
  }
}
export { shouldSkipCustomRedirect };
