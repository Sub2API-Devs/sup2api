/**
 * remote/tools/serve/servingState.ts
 *
 * 2.1.316 新增：服务状态键、通告构建与准入闸门
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (1), chunk-ad2e1aj6.js (11)
 * attribution: placement 12
 */
import { hostname, platform, arch, homedir } from "os";
import { basename } from "path";
import { isViolinTableFlagOn } from "../../../tools/PowerShellTool/PowerShellTool.js";
import { getSettingsWithErrors_2 } from "../../../utils/settings/settings.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import {
  deviceSlugOrFallback,
  MAX_MACHINE_NAME_CHARS,
  isValidMachineSlug,
} from "../../../bridge/deviceRegistration.js";
import { firstLineOf } from "../../../utils/stringUtils.js";
import { attestationMode } from "../../../services/remoteTools/toolHostAttestation.js";
import { MINIMAL_INTERFACE_VERSION } from "../protocolNegotiation.js";
import { getPlatform } from "../../../utils/platform.js";
import { shellCapabilityTag, shellCapabilityFor } from "../../../services/remoteTools/shellForwarding.js";
import { getResolvedPowerShellEdition } from "../../../utils/shell/powershellDetection.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { getResolvedBashShellPath } from "../../../utils/shell/shellPaths.js";
import { MAX_TRUNCATED_LINES } from "../protocolSchemas.js";
import { warmDeviceSandbox } from "../deviceSandboxPosture.js";
import { createAdmissionGate } from "../../../services/remoteTools/remoteToolAdmission.js";

//@ chunk-5ghnps9r.js:935-1078 placement (2.1.88 match: isWindowsSandboxPolicyViolation, 0.526)
/**
 * （切分错误，权限 UI）当前设置无错误且沙箱未启用时返回 true，此时可提供常驻权限更新。
 */
function isWindowsSandboxPolicyViolation() {
  if (!isViolinTableFlagOn()) return false;
  try {
    return (
      getSettingsWithErrors_2().errors.length === 0 &&
      !SandboxManager.isSandboxEnabledInSettings() &&
      !SandboxManager.isSandboxingEnabled()
    );
  } catch {
    return false;
  }
}
//@ chunk-ad2e1aj6.js:4093-5099 placement
/**
 * 本机对云会话的服务公告：服务状态键、Claude Code 版本、机器名、进程姿态与常驻批准限额。
 */
var SERVING_STATE_KEY = "machine";
var CLAUDE_CODE_VERSION =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
//@ chunk-ad2e1aj6.js:5099-5162 placement
function servingMachineName(getHostname = hostname) {
  let slug = deviceSlugOrFallback(firstLineOf(getHostname(), "."), MAX_MACHINE_NAME_CHARS);
  return isValidMachineSlug(slug) ? slug : SERVING_STATE_KEY;
}
//@ chunk-ad2e1aj6.js:5162-5899 placement
/**
 * 组装本机对云会话的服务公告：策略、启动目录、项目同步、设备 id、文件夹关系与可同步状态。
 */
function buildServingAnnouncement({
  policy,
  launchDir,
  epoch,
  deviceId,
  getHostname,
  projectSync = "unknown",
  syncRoot,
  folderRelation,
  readyToSyncAtAttach = false,
  servedToolNames = [],
  inventory,
}) {
  let notes = policy.notes();
  let shellLabel = servedShellLabel(servedToolNames);
  let attestationCaps = attestationMode() === "off" ? [] : ["vouched_calls"];
  let standingCaps =
    policy.capabilities?.includes("standing_approvals") === true && isWindowsSandboxPolicyViolation()
      ? ["standing_offered_rules"]
      : [];
  let capabilities = withSyncAtAttach(
    [...(policy.capabilities ?? []), ...standingCaps, ...attestationCaps],
    readyToSyncAtAttach,
  );
  return {
    name: servingMachineName(getHostname),
    kind: policy.kind,
    platform: platform(),
    arch: arch(),
    ...(shellLabel !== undefined && {
      shell: shellLabel,
    }),
    home_dir: homedir(),
    working_dir: launchDir,
    project_sync: projectSync,
    ...(syncRoot !== undefined &&
      isSyncingFolder(projectSync) && {
        sync_root: syncRoot,
      }),
    ...folderRelationField(projectSync, folderRelation),
    limits: policy.limits,
    claude_code_version: CLAUDE_CODE_VERSION,
    tool_host_interface: MINIMAL_INTERFACE_VERSION,
    ...(capabilities.length > 0 && {
      capabilities,
    }),
    ...(notes && {
      notes,
    }),
    ...(epoch !== undefined && {
      epoch,
    }),
    ...(deviceId !== undefined && {
      device_id: deviceId,
    }),
    ...(inventory !== undefined && {
      inventory,
    }),
  };
}
//@ chunk-ad2e1aj6.js:5899-5965 placement
function withSyncAtAttach(capabilities, atAttach) {
  let filtered = capabilities.filter((capability) => capability !== SYNC_AT_ATTACH);
  return atAttach ? [...filtered, SYNC_AT_ATTACH] : filtered;
}
//@ chunk-ad2e1aj6.js:5965-5989 placement
var SYNC_AT_ATTACH = "sync_at_attach";
//@ chunk-ad2e1aj6.js:5989-6142 placement
function servedShellLabel(toolNames) {
  if (getPlatform() === "windows")
    return shellCapabilityTag(shellCapabilityFor(toolNames, getResolvedPowerShellEdition()));
  let bashPath = toolNames.includes(BASH_TOOL_NAME) ? getResolvedBashShellPath() : undefined;
  let name = bashPath === undefined ? "" : basename(bashPath);
  return name !== "" && name.length <= MAX_TRUNCATED_LINES ? name : undefined;
}
//@ chunk-ad2e1aj6.js:6142-6197 placement
function isSyncingFolder(projectSync) {
  return projectSync === "two_way" || projectSync === "upload_only";
}
//@ chunk-ad2e1aj6.js:6197-6266 placement
function folderRelationField(projectSync, folderRelation) {
  return projectSync === "off" && folderRelation !== undefined
    ? {
        folder_relation: folderRelation,
      }
    : {};
}
//@ chunk-ad2e1aj6.js:6266-6324 placement
var readProcessPosture = async () => {
  await warmDeviceSandbox().catch(() => {});
  return {
    confined: true,
  };
};
//@ chunk-ad2e1aj6.js:6324-6467 placement
function admissionGateFor(config, options) {
  switch (config.admission) {
    case "none":
      return;
    case "device_binding":
      return createAdmissionGate({
        ...options,
        readPosture: readProcessPosture,
      });
    case "device_gate":
      return createAdmissionGate(options);
  }
}
//@ chunk-ad2e1aj6.js:6467-6505 placement
/**
 * 会话常驻批准的限额：有效期 30 分钟、最多 256 条、单批 16 条。
 */
var SESSION_APPROVAL_LIMITS = 1800000;
var SESSION_APPROVAL_STALE_MS = 300000;
var MAX_SESSION_APPROVALS = 256;
var MAX_SESSION_APPROVAL_BATCH = 16;
export {
  isWindowsSandboxPolicyViolation,
  MAX_SESSION_APPROVALS,
  MAX_SESSION_APPROVAL_BATCH,
  SESSION_APPROVAL_STALE_MS,
  SESSION_APPROVAL_LIMITS,
  buildServingAnnouncement,
  admissionGateFor,
  folderRelationField,
  withSyncAtAttach,
  isSyncingFolder,
};
