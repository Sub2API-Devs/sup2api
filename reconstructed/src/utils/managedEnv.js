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

//@ chunk-2jdf5m4m.js:1741-1796 fingerprint = TRUSTED_SETTING_SOURCES (1)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
//@ chunk-30p0tvt0.js:918-991 fingerprint = withoutHostManagedProviderVars (1)
function withoutHostManagedProviderVars() {
  return !env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && !hasProviderEnvFlag() && isGatewayLoginForced();
}
//@ chunk-aepeg2w5.js:314368-314663 fingerprint = withoutSSHTunnelVars (0.802)
function withoutSSHTunnelVars() {
  let e = lockHolderSocketSlot.of(getRootSession().host);
  if (e.socket === undefined) {
    let ANTHROPIC_UNIX_SOCKET = env.ANTHROPIC_UNIX_SOCKET;
    e.socket =
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
  return e.socket ?? undefined;
}
//@ chunk-q4qb1h08.js:20486-20921 fingerprint = applySafeConfigEnvironmentVariables (0.34)
/**
 * 把设置中的 env 写入 process.env：信任前只应用安全来源（user/flag/policy）与安全变量，托管设置的值优先并在覆盖时警告。
 */
function applySafeConfigEnvironmentVariables_2(e, n, hostSpawnEnvKeys, desktopHost, s) {
  if (!e || !hostSpawnEnvKeys) return e || {};
  let C = {};
  let _ = [];
  for (let [key, value] of Object.entries(e)) {
    if (!hostSpawnEnvKeys.has(key.toUpperCase()) || isGatewayBackedPolicyDisable(key, value, n)) {
      C[key] = value;
      continue;
    }
    let D = process.env[key];
    if (
      desktopHost &&
      n === "policySettings" &&
      TLS_CERT_ENV_VARS.some((S) => S === key.toUpperCase()) &&
      isPolicySlotAdminOrParentComposed()
    ) {
      C[key] = value;
      if (s && D !== undefined && D !== value)
        logForDebugging(
          `Using ${escapeForDisplay(key)} from managed settings in place of the value this session had.`,
          {
            level: "warn",
          },
        );
      continue;
    }
    if (s && D !== value) _.push(key);
  }
  if (s && _.length > 0) warnHostSuppliedEnv(_, n, s);
  return C;
}
export {
  withoutSSHTunnelVars,
  withoutHostManagedProviderVars,
  TRUSTED_SETTING_SOURCES,
  applySafeConfigEnvironmentVariables_2,
};
