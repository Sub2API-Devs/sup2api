/**
 * remote/tools/deviceSandboxPosture.ts
 *
 * 读取本机设备沙箱快照（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (6)
 * attribution: placement 6
 */
import { SandboxManager, getEffectiveFilesystemPolicy } from "../../utils/sandbox/sandbox-adapter.js";
import { getPlatform as getPlatform_2 } from "../../utils/platform.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { vor } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { weakensSandboxIsolation } from "./servedCallLog.js";
import { readPolicySandboxSetting, bqt } from "../../utils/sandbox/sandboxSettingsSources.js";

//@ chunk-s61vbvea.js:535191-535471 placement
function classifyDeviceSandboxPosture(e, { requireStarted: requireStarted }) {
  let r = sandboxUnavailableReason(e);
  if (r !== void 0) return { confined: !1, reason: r };
  if (!requireStarted) return { confined: !0 };
  if (e.started !== !0 || e.config === void 0) return { confined: !1, reason: "sandbox_failed_to_start" };
  let s = sandboxWeaknessReason(e.config);
  return s === void 0 ? { confined: !0 } : { confined: !1, reason: s };
}
/**
 * 根据设备沙箱快照判断本机能否安全地提供远程工具：未启用时区分 unavailable/failed_to_start/unsupported，文件系统策略非 strict 或 scrub 模式为 unconfined，其他返回 undefined。
 */
//@ chunk-s61vbvea.js:535471-535714 placement
function sandboxUnavailableReason(e) {
  if (!e.sandboxingEnabled) {
    if (!e.enabledInSettings) return "sandbox_unavailable";
    return e.supportedHere ? "sandbox_failed_to_start" : "sandbox_unsupported";
  }
  if (e.filesystemPolicy !== "strict" || e.scrubMode) return "sandbox_unconfined";
  return;
}
//@ chunk-s61vbvea.js:535714-535983 placement
function sandboxWeaknessReason(e) {
  if (e.weakensIsolation || e.ripgrepOverridden) return "sandbox_weakened";
  if (e.allowsUnixSockets) return "sandbox_allows_unix_sockets";
  if (e.seccompUnavailable) return "sandbox_seccomp_unavailable";
  if (e.injectsCredentials) return "sandbox_injects_credentials";
  return;
}
//@ chunk-s61vbvea.js:535983-536737 placement
function readDeviceSandboxSnapshot() {
  let isSandboxingEnabled = SandboxManager.isSandboxingEnabled(),
    config = SandboxManager.getConfig(),
    r = getPlatform_2();
  return {
    sandboxingEnabled: isSandboxingEnabled,
    enabledInSettings: SandboxManager.isSandboxEnabledInSettings(),
    supportedHere: SandboxManager.passesCheapSandboxGates(),
    filesystemPolicy: getEffectiveFilesystemPolicy(),
    scrubMode: isScrubEnabled(),
    ...(config !== void 0 && {
      config: {
        allowsUnixSockets:
          config.network?.allowAllUnixSockets === !0 || (config.network?.allowUnixSockets?.length ?? 0) > 0,
        seccompUnavailable:
          isSandboxingEnabled &&
          r !== "macos" &&
          r !== "windows" &&
          !config.seccomp?.argv0 &&
          vor(config.seccomp?.applyPath) === null,
        injectsCredentials: [
          ...(config.credentials?.envVars ?? []),
          ...(config.credentials?.files ?? []),
        ].some((s) => s.mode === "mask" && (s.injectHosts === void 0 || s.injectHosts.length > 0)),
        weakensIsolation: weakensSandboxIsolation(config, r),
        ripgrepOverridden:
          r !== "macos" &&
          r !== "windows" &&
          readPolicySandboxSetting(["ripgrep"]) === void 0 &&
          bqt().some((s) => s?.sandbox?.ripgrep !== void 0),
      },
    }),
  };
}
//@ chunk-s61vbvea.js:536737-536856 placement
async function warmDeviceSandbox() {
  if (!SandboxManager.isSandboxingEnabled()) return;
  (await SandboxManager.initialize(), await SandboxManager.waitForNetworkInitialization());
}
//@ chunk-s61vbvea.js:536856-537057 placement
async function ensureDeviceSandboxPosture() {
  let e = sandboxUnavailableReason(readDeviceSandboxSnapshot());
  if (e !== void 0) return { confined: !1, reason: e };
  await SandboxManager.initialize();
  let waitForNetworkInitialization = await SandboxManager.waitForNetworkInitialization();
  return classifyDeviceSandboxPosture(
    { ...readDeviceSandboxSnapshot(), started: waitForNetworkInitialization },
    { requireStarted: !0 },
  );
}

export { ensureDeviceSandboxPosture, warmDeviceSandbox };
