/**
 * bridge/remoteControlEntry.ts
 *
 * 2.1.316 新增：remote-control 入口的设置校验、禁用诊断、启动前检查与不支持参数提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4wmk8g5n.js (9)
 * attribution: placement 9
 */
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "./remoteControlPolicy.js";

//@ chunk-4wmk8g5n.js:3700-3714 placement
var SETTINGS_VALID_SENTINEL = {};
var BRIDGE_NOT_DISABLED_SENTINEL = {};
//@ chunk-4wmk8g5n.js:3714-4129 placement
async function assertRemoteControlSettingsValid() {
  let { exitWithError } = await import("./chunk-a3ex6w41.js");
  let { getSettingsWithErrors } = await import("./chunk-0crvnfjy.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === true)
    exitWithError(`Error: ${REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE}`);
  let [{ hasStoredOAuthToken: t }, { BRIDGE_LOGIN_ERROR: r }, { getBridgeAuthDebugInfo: i }] =
    await Promise.all([
      import("./chunk-7v0gj88m.js"),
      import("./chunk-t64res1y.js"),
      import("./chunk-zke21f1q.js"),
    ]);
  if (!t()) exitWithError(r + i());
  return SETTINGS_VALID_SENTINEL;
}
//@ chunk-4wmk8g5n.js:4129-4795 placement
async function diagnoseBridgeDisabled(e) {
  let {
    getBridgeDisabledDiagnosis,
    getBridgeAuthDebugInfo,
    ensurePolicyLimitsLoadedForDiagnostic,
    remoteControlPolicyDeniedReason,
  } = await import("./chunk-zke21f1q.js");
  let { checkBridgeMinVersion } = await import("./chunk-9z591zgb.js");
  let { exitWithError } = await import("./chunk-a3ex6w41.js");
  let { logOrgPolicyDeniedAsync } = await import("./chunk-g8qt1yya.js");
  let bridgeDisabledDiagnosis = await getBridgeDisabledDiagnosis();
  if (bridgeDisabledDiagnosis) {
    if (bridgeDisabledDiagnosis.orgPolicyDenied)
      await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag");
    await logRemoteControlEntryBad(bridgeDisabledDiagnosis.code);
    exitWithError(`Error: ${bridgeDisabledDiagnosis.reason}` + getBridgeAuthDebugInfo());
  }
  let c = checkBridgeMinVersion();
  if (c) {
    await logRemoteControlEntryBad("version_floor");
    exitWithError(c);
  }
  await ensurePolicyLimitsLoadedForDiagnostic();
  let d = remoteControlPolicyDeniedReason();
  if (d !== null) {
    await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag");
    await logRemoteControlEntryBad("policy_denied");
    exitWithError(`Error: ${d}`);
  }
  return BRIDGE_NOT_DISABLED_SENTINEL;
}
//@ chunk-4wmk8g5n.js:4795-4997 placement
async function logRemoteControlEntryBad(reason) {
  let [{ logFeatureBadAsync: o }, { flushAnalyticsBeforeExit: t }] = await Promise.all([
    import("./chunk-53at0fec.js"),
    import("./chunk-kahpc3cs.js"),
  ]);
  await o("remote_control_entry", reason);
  await t();
}
//@ chunk-4wmk8g5n.js:4997-6116 placement
/**
 * 远程控制启动前检查：可信设备、自动登记提示、策略限制等。
 */
async function preflightRemoteControl(e, o, t, r) {
  let [
    { preflightTrustedDeviceBlocking: i, sayHeldAutomaticEnrollmentNoticeOnStderr: l },
    { shutdown1PEventLogging: s },
    { shutdownDatadog: u },
    { sleep: n },
    { exitWithError: c },
    { bridgeMain: d },
    { initializeGrowthBook: g },
    { logForDebugging: f },
    { logFeatureBadAsync: y },
    { claudeTempDir: w },
    { errorMessage: R },
    { logError: h },
  ] = await Promise.all([
    import("./chunk-3kb57csj.js"),
    import("./chunk-3x77zjqp.js"),
    import("./chunk-195bxx7h.js"),
    import("./chunk-c1wxfrj3.js"),
    import("./chunk-a3ex6w41.js"),
    import("./chunk-wbbfk060.js"),
    import("./chunk-6df1d6re.js"),
    import("./chunk-cgjee2k6.js"),
    import("./chunk-53at0fec.js"),
    import("./chunk-pfe4mpd9.js"),
    import("./chunk-8j2cv8nm.js"),
    import("./chunk-ytv7p2hj.js"),
  ]);
  try {
    w();
  } catch (error) {
    h(error);
    await logRemoteControlEntryBad("temp_dir_unusable");
    c(R(error));
  }
  g().catch((error) => {
    f(
      `[remote-control] GrowthBook init failed (${error instanceof Error ? error.name : typeof error}); feature gates keep serving the disk cache`,
      {
        level: "error",
      },
    );
  });
  let p = await i(r);
  l();
  if (p) {
    await y("remote_control_entry", "trusted_device_unenrolled");
    await Promise.race([
      Promise.all([s(), u()]),
      n(500, undefined, {
        unref: true,
      }),
    ]).catch(() => {});
    c(`Error: ${p}`);
  }
  await d(o, t, r);
}
//@ chunk-4wmk8g5n.js:6116-6186 placement
async function runRemoteControlCli(e, o, t) {
  let r = await assertRemoteControlSettingsValid();
  let i = await diagnoseBridgeDisabled(r);
  await preflightRemoteControl(i, e, o, t);
}
//@ chunk-4wmk8g5n.js:6186-6857 placement
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
  ["chrome", (e) => e === true],
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
//@ chunk-4wmk8g5n.js:6857-6941 placement
function filterUnsupportedFlags(e) {
  return e.filter(({ key, value: t }) => !REMOTE_CONTROL_ALLOWED_FLAGS.get(key)?.(t)).map(({ flag }) => flag);
}
//@ chunk-4wmk8g5n.js:6941-7439 placement
function unsupportedFlagsMessage(e) {
  let joined = e.map((l) => `\`${l}\``).join(", ");
  let [t, r] = e.length === 1 ? ["it", "is"] : ["them", "are"];
  let i = e.includes("--permission-mode")
    ? " Set the permission mode with `claude remote-control --permission-mode <mode>`."
    : "";
  return (
    `Error: ${joined} before \`remote-control\` ${r} not carried over to the sessions Remote Control starts, so Remote Control refuses to start rather than drop ${t} \u2014 remove ${t}, and give Remote Control's own options after the verb (see \`claude remote-control --help\`).` +
    i
  );
}
