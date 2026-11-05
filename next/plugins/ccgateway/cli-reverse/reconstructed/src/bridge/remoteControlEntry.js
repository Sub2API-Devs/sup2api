/**
 * bridge/remoteControlEntry.ts
 *
 * 2.1.316 新增：remote-control 入口的设置校验、禁用诊断、启动前检查与不支持参数提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mq1acyeg.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "./remoteControlPolicy.js";

//@ chunk-mq1acyeg.js:4035-4049 placement
var SETTINGS_VALID_SENTINEL = {};
var BRIDGE_NOT_DISABLED_SENTINEL = {};
//@ chunk-mq1acyeg.js:4049-4463 placement
async function assertRemoteControlSettingsValid() {
  let { exitWithError } = await import("../utils/process.js");
  let { getSettingsWithErrors } = await import("../utils/settings/settings.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === true)
    exitWithError(`Error: ${REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE}`);
  let [{ hasStoredOAuthToken }, { BRIDGE_LOGIN_ERROR: loginErrorMessage }, { getBridgeAuthDebugInfo }] =
    await Promise.all([
      import("../utils/auth.js"),
      import("./types.js"),
      import("./applyRemoteControlToAppState.lazy.js"),
    ]);
  if (!hasStoredOAuthToken()) exitWithError(loginErrorMessage + getBridgeAuthDebugInfo());
  return SETTINGS_VALID_SENTINEL;
}
//@ chunk-mq1acyeg.js:4463-5129 placement
async function diagnoseBridgeDisabled(settingsSentinel) {
  let {
    getBridgeDisabledDiagnosis,
    getBridgeAuthDebugInfo,
    ensurePolicyLimitsLoadedForDiagnostic,
    remoteControlPolicyDeniedReason,
  } = await import("./applyRemoteControlToAppState.lazy.js");
  let { checkBridgeMinVersion } = await import("./bridgeEnabled.js");
  let { exitWithError } = await import("../utils/process.js");
  let { logOrgPolicyDeniedAsync } = await import("../services/policyLimits/orgPolicyDeniedEvent.js");
  let bridgeDisabledDiagnosis = await getBridgeDisabledDiagnosis();
  if (bridgeDisabledDiagnosis) {
    if (bridgeDisabledDiagnosis.orgPolicyDenied)
      await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag");
    await logRemoteControlEntryBad(bridgeDisabledDiagnosis.code);
    exitWithError(`Error: ${bridgeDisabledDiagnosis.reason}` + getBridgeAuthDebugInfo());
  }
  let versionRefusal = checkBridgeMinVersion();
  if (versionRefusal) {
    await logRemoteControlEntryBad("version_floor");
    exitWithError(versionRefusal);
  }
  await ensurePolicyLimitsLoadedForDiagnostic();
  let policyDeniedReason = remoteControlPolicyDeniedReason();
  if (policyDeniedReason !== null) {
    await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag");
    await logRemoteControlEntryBad("policy_denied");
    exitWithError(`Error: ${policyDeniedReason}`);
  }
  return BRIDGE_NOT_DISABLED_SENTINEL;
}
//@ chunk-mq1acyeg.js:5129-5331 placement
async function logRemoteControlEntryBad(reason) {
  let [{ logFeatureBadAsync }, { flushAnalyticsBeforeExit }] = await Promise.all([
    import("../services/analytics/featureTelemetry.js"),
    import("../cli/exit.js"),
  ]);
  await logFeatureBadAsync("remote_control_entry", reason);
  await flushAnalyticsBeforeExit();
}
//@ chunk-mq1acyeg.js:5331-6450 placement
/**
 * 远程控制启动前检查：可信设备、自动登记提示、策略限制等。
 */
async function preflightRemoteControl(diagnoseSentinel, args, storageV5, credentials) {
  let [
    { preflightTrustedDeviceBlocking, sayHeldAutomaticEnrollmentNoticeOnStderr },
    { shutdown1PEventLogging },
    { shutdownDatadog },
    { sleep },
    { exitWithError },
    { bridgeMain },
    { initializeGrowthBook },
    { logForDebugging },
    { logFeatureBadAsync },
    { claudeTempDir },
    { errorMessage },
    { logError },
  ] = await Promise.all([
    import("./trustedDevice.js"),
    import("../services/analytics/firstPartyEventLogger.js"),
    import("../services/analytics/datadog.js"),
    import("../utils/sleep.js"),
    import("../utils/process.js"),
    import("./bridgeMain.js"),
    import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
    import("../utils/debug.js"),
    import("../services/analytics/featureTelemetry.js"),
    import("../utils/tempDir.js"),
    import("../utils/errors.js"),
    import("../utils/log.js"),
  ]);
  try {
    claudeTempDir();
  } catch (error) {
    logError(error);
    await logRemoteControlEntryBad("temp_dir_unusable");
    exitWithError(errorMessage(error));
  }
  initializeGrowthBook().catch((error) => {
    logForDebugging(
      `[remote-control] GrowthBook init failed (${error instanceof Error ? error.name : typeof error}); feature gates keep serving the disk cache`,
      {
        level: "error",
      },
    );
  });
  let trustedDeviceBlock = await preflightTrustedDeviceBlocking(credentials);
  sayHeldAutomaticEnrollmentNoticeOnStderr();
  if (trustedDeviceBlock) {
    await logFeatureBadAsync("remote_control_entry", "trusted_device_unenrolled");
    await Promise.race([
      Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
      sleep(500, undefined, {
        unref: true,
      }),
    ]).catch(() => {});
    exitWithError(`Error: ${trustedDeviceBlock}`);
  }
  await bridgeMain(args, storageV5, credentials);
}
//@ chunk-mq1acyeg.js:6450-6520 placement
async function runRemoteControlCli(args, storageV5, credentials) {
  let settingsSentinel = await assertRemoteControlSettingsValid();
  let diagnoseSentinel = await diagnoseBridgeDisabled(settingsSentinel);
  await preflightRemoteControl(diagnoseSentinel, args, storageV5, credentials);
}
//@ chunk-mq1acyeg.js:6520-7191 placement
var REMOTE_CONTROL_ALLOWED_FLAGS = new Map([
  ["verbose", () => true],
  ["debug", () => true],
  ["debugToStderr", () => true],
  ["debugFile", () => true],
  ["axScreenReader", () => true],
  ["workload", () => true],
  ["sessionId", () => true],
  ["name", () => true],
  ["remoteControlSessionNamePrefix", () => true],
  ["pluginDir", () => true],
  ["pluginDirNoMcp", () => true],
  ["pluginUrl", () => true],
  ["addDir", () => true],
  ["ide", () => true],
  ["chrome", (value) => value === true],
  ["model", () => true],
  ["effort", () => true],
  ["fallbackModel", () => true],
  ["betas", () => true],
  ["thinking", () => true],
  ["thinkingDisplay", () => true],
  ["maxThinkingTokens", () => true],
  ["autocompact", () => true],
  ["allowedTools", () => true],
  ["dangerouslySkipPermissions", () => true],
  ["allowDangerouslySkipPermissions", () => true],
  ["enableAutoMode", () => true],
  ["bare", () => true],
]);
//@ chunk-mq1acyeg.js:7191-7275 placement
function filterUnsupportedFlags(flags) {
  return flags
    .filter(({ key, value }) => !REMOTE_CONTROL_ALLOWED_FLAGS.get(key)?.(value))
    .map(({ flag }) => flag);
}
//@ chunk-mq1acyeg.js:7275-7773 placement
function unsupportedFlagsMessage(flags) {
  let joined = flags.map((flag) => `\`${flag}\``).join(", ");
  let [pronounObject, pronounVerb] = flags.length === 1 ? ["it", "is"] : ["them", "are"];
  let permissionModeHint = flags.includes("--permission-mode")
    ? " Set the permission mode with `claude remote-control --permission-mode <mode>`."
    : "";
  return (
    `Error: ${joined} before \`remote-control\` ${pronounVerb} not carried over to the sessions Remote Control starts, so Remote Control refuses to start rather than drop ${pronounObject} \u2014 remove ${pronounObject}, and give Remote Control's own options after the verb (see \`claude remote-control --help\`).` +
    permissionModeHint
  );
}
export {
  runRemoteControlCli,
  diagnoseBridgeDisabled,
  assertRemoteControlSettingsValid,
  unsupportedFlagsMessage,
  filterUnsupportedFlags,
  preflightRemoteControl,
};
