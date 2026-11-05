/**
 * utils/caCertsConfig.ts
 *
 * 从设置或 ~/.claude.json 的 env 中读取 NODE_EXTRA_CA_CERTS 并注入 process.env。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/caCertsConfig.ts
 * pieces: chunk-qzajzc00.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { logForDebugging } from "./debug.js";
import { isHostEntrypoint } from "./entrypointKinds.js";
import { isTlsOrCertEnvVar } from "./managedEnvConstants.js";
import { hasManagedSettings } from "./settings/managedRestrictionKeys.js";
import { isStoredLoginPinned } from "../cli/headlessCloud/attachServe.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { getGlobalConfig } from "./config.js";
import { withoutInvalidSettingsEnv } from "./managedEnvApply.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import { getSettingsForSource } from "./settings/settings.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";

//@ chunk-qzajzc00.js:556-728 fingerprint (2.1.88 match: applyExtraCACertsFromConfig, 1)
/**
 * 未设置 NODE_EXTRA_CA_CERTS 时，从 settings.env 或 ~/.claude.json env 读取并写入 process.env。
 */
function applyExtraCACertsFromConfig() {
  if (env.NODE_EXTRA_CA_CERTS) return;
  let configPath = getExtraCertsPathFromConfig();
  if (configPath) {
    process.env.NODE_EXTRA_CA_CERTS = configPath;
    logForDebugging(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${configPath}`);
  }
}
//@ chunk-qzajzc00.js:728-1463 fingerprint (2.1.88 match: getExtraCertsPathFromConfig, 0.675)
/**
 * 从用户设置或全局配置的 env 中找 NODE_EXTRA_CA_CERTS；宿主托管提供方、远程、diskless 时跳过。
 */
function getExtraCertsPathFromConfig() {
  try {
    if (
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
      !isHostEntrypoint() &&
      isTlsOrCertEnvVar("NODE_EXTRA_CA_CERTS")
    ) {
      logForDebugging("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");
      return;
    }
    if (hasManagedSettings()) return;
    if (isStoredLoginPinned() || isHttpMcpServeInvocation()) return;
    let globalConfig = getGlobalConfig();
    let globalEnv = withoutInvalidSettingsEnv(globalConfig?.env, "globalConfig");
    let settings = isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : undefined;
    let settingsEnv = withoutInvalidSettingsEnv(settings?.env, "userSettings");
    logForDebugging(
      `CA certs: Config fallback - globalEnv keys: ${globalEnv ? Object.keys(globalEnv).join(",") : "none"}, settingsEnv keys: ${settingsEnv ? Object.keys(settingsEnv).join(",") : "none"}`,
    );
    let path = settingsEnv?.NODE_EXTRA_CA_CERTS || globalEnv?.NODE_EXTRA_CA_CERTS;
    if (path) logForDebugging(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${path}`);
    return path;
  } catch (error) {
    logForDebugging(`CA certs: Config fallback failed: ${error}`, {
      level: "error",
    });
    logFeatureSad("ca_certs_load", "config_read_failed");
    return;
  }
}
export { applyExtraCACertsFromConfig };
