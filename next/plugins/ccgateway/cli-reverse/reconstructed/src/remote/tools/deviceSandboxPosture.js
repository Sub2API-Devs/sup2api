/**
 * remote/tools/deviceSandboxPosture.ts
 *
 * 读取本机设备沙箱快照（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SandboxManager, getEffectiveFilesystemPolicy } from "../../utils/sandbox/sandbox-adapter.js";
import { getPlatform as getPlatform_2 } from "../../utils/platform.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { getApplySeccompBinaryPath } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { weakensSandboxIsolation } from "./servedCallLog.js";
import {
  readPolicySandboxSetting,
  sandboxSettingsChain,
} from "../../utils/sandbox/sandboxSettingsSources.js";

//@ chunk-7jxyna5q.js:452297-452577 placement
function classifyDeviceSandboxPosture(snapshot, { requireStarted }) {
  let unavailableReason = sandboxUnavailableReason(snapshot);
  if (unavailableReason !== undefined)
    return {
      confined: false,
      reason: unavailableReason,
    };
  if (!requireStarted)
    return {
      confined: true,
    };
  if (snapshot.started !== true || snapshot.config === undefined)
    return {
      confined: false,
      reason: "sandbox_failed_to_start",
    };
  let weaknessReason = sandboxWeaknessReason(snapshot.config);
  return weaknessReason === undefined
    ? {
        confined: true,
      }
    : {
        confined: false,
        reason: weaknessReason,
      };
}
//@ chunk-7jxyna5q.js:452577-452820 placement
/**
 * 根据设备沙箱快照判断本机能否安全地提供远程工具：未启用时区分 unavailable/failed_to_start/unsupported，文件系统策略非 strict 或 scrub 模式为 unconfined，其他返回 undefined。
 */
function sandboxUnavailableReason(snapshot) {
  if (!snapshot.sandboxingEnabled) {
    if (!snapshot.enabledInSettings) return "sandbox_unavailable";
    return snapshot.supportedHere ? "sandbox_failed_to_start" : "sandbox_unsupported";
  }
  if (snapshot.filesystemPolicy !== "strict" || snapshot.scrubMode) return "sandbox_unconfined";
  return;
}
//@ chunk-7jxyna5q.js:452820-453089 placement
function sandboxWeaknessReason(config) {
  if (config.weakensIsolation || config.ripgrepOverridden) return "sandbox_weakened";
  if (config.allowsUnixSockets) return "sandbox_allows_unix_sockets";
  if (config.seccompUnavailable) return "sandbox_seccomp_unavailable";
  if (config.injectsCredentials) return "sandbox_injects_credentials";
  return;
}
//@ chunk-7jxyna5q.js:453089-453843 placement
function readDeviceSandboxSnapshot() {
  let sandboxingEnabled = SandboxManager.isSandboxingEnabled();
  let sandbox = SandboxManager.getConfig();
  let platform = getPlatform_2();
  return {
    sandboxingEnabled,
    enabledInSettings: SandboxManager.isSandboxEnabledInSettings(),
    supportedHere: SandboxManager.passesCheapSandboxGates(),
    filesystemPolicy: getEffectiveFilesystemPolicy(),
    scrubMode: isScrubEnabled(),
    ...(sandbox !== undefined && {
      config: {
        allowsUnixSockets:
          sandbox.network?.allowAllUnixSockets === true ||
          (sandbox.network?.allowUnixSockets?.length ?? 0) > 0,
        seccompUnavailable:
          sandboxingEnabled &&
          platform !== "macos" &&
          platform !== "windows" &&
          !sandbox.seccomp?.argv0 &&
          getApplySeccompBinaryPath(sandbox.seccomp?.applyPath) === null,
        injectsCredentials: [
          ...(sandbox.credentials?.envVars ?? []),
          ...(sandbox.credentials?.files ?? []),
        ].some(
          (credentialEntry) =>
            credentialEntry.mode === "mask" &&
            (credentialEntry.injectHosts === undefined || credentialEntry.injectHosts.length > 0),
        ),
        weakensIsolation: weakensSandboxIsolation(sandbox, platform),
        ripgrepOverridden:
          platform !== "macos" &&
          platform !== "windows" &&
          readPolicySandboxSetting(["ripgrep"]) === undefined &&
          sandboxSettingsChain().some((settingsLayer) => settingsLayer?.sandbox?.ripgrep !== undefined),
      },
    }),
  };
}
//@ chunk-7jxyna5q.js:453843-453962 placement
async function warmDeviceSandbox() {
  if (!SandboxManager.isSandboxingEnabled()) return;
  await SandboxManager.initialize();
  await SandboxManager.waitForNetworkInitialization();
}
//@ chunk-7jxyna5q.js:453962-454163 placement
async function ensureDeviceSandboxPosture() {
  let unavailableReason = sandboxUnavailableReason(readDeviceSandboxSnapshot());
  if (unavailableReason !== undefined)
    return {
      confined: false,
      reason: unavailableReason,
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
export {
  ensureDeviceSandboxPosture,
  warmDeviceSandbox,
  classifyDeviceSandboxPosture,
  readDeviceSandboxSnapshot,
};
