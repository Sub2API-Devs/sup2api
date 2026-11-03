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
var E = {},
  b = {};
//@ chunk-4wmk8g5n.js:3714-4129 placement
async function assertRemoteControlSettingsValid() {
  let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js"),
    { getSettingsWithErrors: getSettingsWithErrors } = await import("./chunk-0crvnfjy.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === !0)
    exitWithError(`Error: ${REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE}`);
  let [{ hasStoredOAuthToken: t }, { BRIDGE_LOGIN_ERROR: r }, { getBridgeAuthDebugInfo: i }] =
    await Promise.all([
      import("./chunk-7v0gj88m.js"),
      import("./chunk-t64res1y.js"),
      import("./chunk-zke21f1q.js"),
    ]);
  if (!t()) exitWithError(r + i());
  return E;
}
//@ chunk-4wmk8g5n.js:4129-4795 placement
async function diagnoseBridgeDisabled(e) {
  let {
      getBridgeDisabledDiagnosis: getBridgeDisabledDiagnosis,
      getBridgeAuthDebugInfo: getBridgeAuthDebugInfo,
      ensurePolicyLimitsLoadedForDiagnostic: ensurePolicyLimitsLoadedForDiagnostic,
      remoteControlPolicyDeniedReason: remoteControlPolicyDeniedReason,
    } = await import("./chunk-zke21f1q.js"),
    { checkBridgeMinVersion: checkBridgeMinVersion } = await import("./chunk-9z591zgb.js"),
    { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js"),
    { logOrgPolicyDeniedAsync: logOrgPolicyDeniedAsync } = await import("./chunk-g8qt1yya.js"),
    n = await getBridgeDisabledDiagnosis();
  if (n) {
    if (n.orgPolicyDenied) await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag");
    (await logRemoteControlEntryBad(n.code), exitWithError(`Error: ${n.reason}` + getBridgeAuthDebugInfo()));
  }
  let c = checkBridgeMinVersion();
  if (c) (await logRemoteControlEntryBad("version_floor"), exitWithError(c));
  await ensurePolicyLimitsLoadedForDiagnostic();
  let d = remoteControlPolicyDeniedReason();
  if (d !== null)
    (await logOrgPolicyDeniedAsync("allow_remote_control", "cli_flag"),
      await logRemoteControlEntryBad("policy_denied"),
      exitWithError(`Error: ${d}`));
  return b;
}
//@ chunk-4wmk8g5n.js:4795-4997 placement
async function logRemoteControlEntryBad(reason) {
  let [{ logFeatureBadAsync: o }, { flushAnalyticsBeforeExit: t }] = await Promise.all([
    import("./chunk-53at0fec.js"),
    import("./chunk-kahpc3cs.js"),
  ]);
  (await o("remote_control_entry", reason), await t());
}
/**
 * 远程控制启动前检查：可信设备、自动登记提示、策略限制等。
 */
//@ chunk-4wmk8g5n.js:4997-6116 placement
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
    (h(error), await logRemoteControlEntryBad("temp_dir_unusable"), c(R(error)));
  }
  g().catch((a) => {
    f(
      `[remote-control] GrowthBook init failed (${a instanceof Error ? a.name : typeof a}); feature gates keep serving the disk cache`,
      { level: "error" },
    );
  });
  let p = await i(r);
  if ((l(), p))
    (await y("remote_control_entry", "trusted_device_unenrolled"),
      await Promise.race([Promise.all([s(), u()]), n(500, void 0, { unref: !0 })]).catch(() => {}),
      c(`Error: ${p}`));
  await d(o, t, r);
}
//@ chunk-4wmk8g5n.js:6116-6186 placement
async function B(e, o, t) {
  let r = await assertRemoteControlSettingsValid(),
    i = await diagnoseBridgeDisabled(r);
  await preflightRemoteControl(i, e, o, t);
}
//@ chunk-4wmk8g5n.js:6186-6857 placement
var REMOTE_CONTROL_ALLOWED_FLAGS = new Map([
  ["verbose", () => !0],
  ["debug", () => !0],
  ["debugToStderr", () => !0],
  ["debugFile", () => !0],
  ["axScreenReader", () => !0],
  ["workload", () => !0],
  ["sessionId", () => !0],
  ["name", () => !0],
  ["remoteControlSessionNamePrefix", () => !0],
  ["pluginDir", () => !0],
  ["pluginDirNoMcp", () => !0],
  ["pluginUrl", () => !0],
  ["addDir", () => !0],
  ["ide", () => !0],
  ["chrome", (e) => e === !0],
  ["model", () => !0],
  ["effort", () => !0],
  ["fallbackModel", () => !0],
  ["betas", () => !0],
  ["thinking", () => !0],
  ["thinkingDisplay", () => !0],
  ["maxThinkingTokens", () => !0],
  ["autocompact", () => !0],
  ["allowedTools", () => !0],
  ["dangerouslySkipPermissions", () => !0],
  ["allowDangerouslySkipPermissions", () => !0],
  ["enableAutoMode", () => !0],
  ["bare", () => !0],
]);
//@ chunk-4wmk8g5n.js:6857-6941 placement
function P(e) {
  return e
    .filter(({ key: key, value: t }) => !REMOTE_CONTROL_ALLOWED_FLAGS.get(key)?.(t))
    .map(({ flag: flag }) => flag);
}
//@ chunk-4wmk8g5n.js:6941-7439 placement
function unsupportedFlagsMessage(e) {
  let joined = e.map((l) => `\`${l}\``).join(", "),
    [t, r] = e.length === 1 ? ["it", "is"] : ["them", "are"],
    i = e.includes("--permission-mode")
      ? " Set the permission mode with `claude remote-control --permission-mode <mode>`."
      : "";
  return (
    `Error: ${joined} before \`remote-control\` ${r} not carried over to the sessions Remote Control starts, so Remote Control refuses to start rather than drop ${t} \u2014 remove ${t}, and give Remote Control's own options after the verb (see \`claude remote-control --help\`).` +
    i
  );
}
