/**
 * utils/managedEnv.ts
 *
 * 把设置中的 env 应用到 process.env（信任前只用安全来源与安全变量；托管设置优先），宿主托管提供方时剥离提供方变量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/managedEnv.ts
 * pieces: chunk-2jdf5m4m.js (1), chunk-30p0tvt0.js (1), chunk-aepeg2w5.js (1), chunk-q4qb1h08.js (1)
 * attribution: fingerprint 4
 */
import { env } from "./env.js";
import { hasProviderEnvFlag } from "./auth/launcherHostLogin.js";
import { isGatewayLoginForced } from "./auth.js";
import { lockHolderSocketSlot } from "./auth/lockHolderLiveness.js";
import { getRootSession } from "../bootstrap/state.js";
import { isSshPlaceholderAuth } from "./subprocessEnv.js";
import { isGatewayBackedPolicyDisable, warnHostSuppliedEnv } from "./managedEnvSafety.js";
import { TLS_CERT_ENV_VARS } from "./managedEnvConstants.js";
import { isPolicySlotAdminOrParentComposed } from "./settings/settings.js";
import { logForDebugging } from "./debug.js";
import { escapeForDisplay } from "./envValidation.js";

//@ chunk-30p0tvt0.js:918-991 fingerprint (2.1.88 match: withoutHostManagedProviderVars, 1)
function withoutHostManagedProviderVars() {
  return !env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && !hasProviderEnvFlag() && isGatewayLoginForced();
}
//@ chunk-aepeg2w5.js:314368-314663 fingerprint (2.1.88 match: withoutSSHTunnelVars, 0.802)
function withoutSSHTunnelVars() {
  let socketSlot = lockHolderSocketSlot.of(getRootSession().host);
  if (socketSlot.socket === undefined) {
    let ANTHROPIC_UNIX_SOCKET = env.ANTHROPIC_UNIX_SOCKET;
    socketSlot.socket =
      ANTHROPIC_UNIX_SOCKET &&
      isSshPlaceholderAuth({
        ANTHROPIC_UNIX_SOCKET,
        CLAUDE_CODE_OAUTH_TOKEN: env.CLAUDE_CODE_OAUTH_TOKEN,
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        ANTHROPIC_AUTH_TOKEN: env.ANTHROPIC_AUTH_TOKEN,
      })
        ? ANTHROPIC_UNIX_SOCKET
        : null;
  }
  return socketSlot.socket ?? undefined;
}
//@ chunk-q4qb1h08.js:20486-20921 fingerprint (2.1.88 match: applySafeConfigEnvironmentVariables, 0.34)
/**
 * 把设置中的 env 写入 process.env：信任前只应用安全来源（user/flag/policy）与安全变量，托管设置的值优先并在覆盖时警告。
 */
function applySafeConfigEnvironmentVariables_2(
  configEnv,
  source,
  hostSpawnEnvKeys,
  desktopHost,
  warnOnOverride,
) {
  if (!configEnv || !hostSpawnEnvKeys) return configEnv || {};
  let result = {};
  let overriddenKeys = [];
  for (let [key, value] of Object.entries(configEnv)) {
    if (!hostSpawnEnvKeys.has(key.toUpperCase()) || isGatewayBackedPolicyDisable(key, value, source)) {
      result[key] = value;
      continue;
    }
    let currentValue = process.env[key];
    if (
      desktopHost &&
      source === "policySettings" &&
      TLS_CERT_ENV_VARS.some((certVarName) => certVarName === key.toUpperCase()) &&
      isPolicySlotAdminOrParentComposed()
    ) {
      result[key] = value;
      if (warnOnOverride && currentValue !== undefined && currentValue !== value)
        logForDebugging(
          `Using ${escapeForDisplay(key)} from managed settings in place of the value this session had.`,
          {
            level: "warn",
          },
        );
      continue;
    }
    if (warnOnOverride && currentValue !== value) overriddenKeys.push(key);
  }
  if (warnOnOverride && overriddenKeys.length > 0)
    warnHostSuppliedEnv(overriddenKeys, source, warnOnOverride);
  return result;
}
//@ chunk-2jdf5m4m.js:1741-1796 fingerprint (2.1.88 match: TRUSTED_SETTING_SOURCES, 1)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
export {
  withoutSSHTunnelVars,
  withoutHostManagedProviderVars,
  TRUSTED_SETTING_SOURCES,
  applySafeConfigEnvironmentVariables_2,
};
