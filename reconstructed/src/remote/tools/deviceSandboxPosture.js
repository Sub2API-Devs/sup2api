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
import {
  readPolicySandboxSetting,
  sandboxSettingsChain,
} from "../../utils/sandbox/sandboxSettingsSources.js";

//@ chunk-s61vbvea.js:535191-535471 placement
function classifyDeviceSandboxPosture(e, { requireStarted }) {
  let r = sandboxUnavailableReason(e);
  if (r !== undefined)
    return {
      confined: false,
      reason: r,
    };
  if (!requireStarted)
    return {
      confined: true,
    };
  if (e.started !== true || e.config === undefined)
    return {
      confined: false,
      reason: "sandbox_failed_to_start",
    };
  let s = sandboxWeaknessReason(e.config);
  return s === undefined
    ? {
        confined: true,
      }
    : {
        confined: false,
        reason: s,
      };
}
//@ chunk-s61vbvea.js:535471-535714 placement
/**
 * 根据设备沙箱快照判断本机能否安全地提供远程工具：未启用时区分 unavailable/failed_to_start/unsupported，文件系统策略非 strict 或 scrub 模式为 unconfined，其他返回 undefined。
 */
function sandboxUnavailableReason(e) {
  if (!e.sandboxingEnabled) {
    if (!e.enabledInSettings) return "sandbox_unavailable";
    return e.supportedHere ? "sandbox_failed_to_start" : "sandbox_unsupported";
  }
  if (e.filesystemPolicy !== "strict" || e.scrubMode) return "sandbox_unconfined";
  return;
}
//@ chunk-s61vbvea.js:535714-535983 placement
function sandboxWeaknessReason(config) {
  if (config.weakensIsolation || config.ripgrepOverridden) return "sandbox_weakened";
  if (config.allowsUnixSockets) return "sandbox_allows_unix_sockets";
  if (config.seccompUnavailable) return "sandbox_seccomp_unavailable";
  if (config.injectsCredentials) return "sandbox_injects_credentials";
  return;
}
//@ chunk-s61vbvea.js:535983-536737 placement
function readDeviceSandboxSnapshot() {
  let e = SandboxManager.isSandboxingEnabled();
  let config = SandboxManager.getConfig();
  let platform = getPlatform_2();
  return {
    sandboxingEnabled: e,
    enabledInSettings: SandboxManager.isSandboxEnabledInSettings(),
    supportedHere: SandboxManager.passesCheapSandboxGates(),
    filesystemPolicy: getEffectiveFilesystemPolicy(),
    scrubMode: isScrubEnabled(),
    ...(config !== undefined && {
      config: {
        allowsUnixSockets:
          config.network?.allowAllUnixSockets === true || (config.network?.allowUnixSockets?.length ?? 0) > 0,
        seccompUnavailable:
          e &&
          platform !== "macos" &&
          platform !== "windows" &&
          !config.seccomp?.argv0 &&
          vor(config.seccomp?.applyPath) === null,
        injectsCredentials: [
          ...(config.credentials?.envVars ?? []),
          ...(config.credentials?.files ?? []),
        ].some((s) => s.mode === "mask" && (s.injectHosts === undefined || s.injectHosts.length > 0)),
        weakensIsolation: weakensSandboxIsolation(config, platform),
        ripgrepOverridden:
          platform !== "macos" &&
          platform !== "windows" &&
          readPolicySandboxSetting(["ripgrep"]) === undefined &&
          sandboxSettingsChain().some((s) => s?.sandbox?.ripgrep !== undefined),
      },
    }),
  };
}
//@ chunk-s61vbvea.js:536737-536856 placement
async function warmDeviceSandbox() {
  if (!SandboxManager.isSandboxingEnabled()) return;
  await SandboxManager.initialize();
  await SandboxManager.waitForNetworkInitialization();
}
//@ chunk-s61vbvea.js:536856-537057 placement
async function ensureDeviceSandboxPosture() {
  let e = sandboxUnavailableReason(readDeviceSandboxSnapshot());
  if (e !== undefined)
    return {
      confined: false,
      reason: e,
    };
  await SandboxManager.initialize();
  let started = await SandboxManager.waitForNetworkInitialization();
  return classifyDeviceSandboxPosture(
    {
      ...readDeviceSandboxSnapshot(),
      started,
    },
    {
      requireStarted: true,
    },
  );
}
export { ensureDeviceSandboxPosture, warmDeviceSandbox };
